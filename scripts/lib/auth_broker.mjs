import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { AUTH_PROVIDERS, providerById, providerEnvPrefix } from "./auth_providers.mjs";

const sessionCookie = "tf_session";
const defaultSessionTtlSeconds = 60 * 60 * 24 * 14;

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64url(input) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(input.length / 4) * 4, "=");
  return Buffer.from(padded, "base64").toString("utf8");
}

function authSecret(env = process.env) {
  return env.TRENDFOUNDRY_AUTH_SESSION_SECRET || env.SESSION_SECRET || "trendfoundry-local-dev-auth-secret";
}

function signPayload(payload, env = process.env) {
  const body = base64url(JSON.stringify(payload));
  const sig = createHmac("sha256", authSecret(env)).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifyPayload(value, env = process.env) {
  const [body, sig] = String(value || "").split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", authSecret(env)).update(body).digest("base64url");
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    return JSON.parse(fromBase64url(body));
  } catch {
    return null;
  }
}

function json(response, statusCode, payload, headers = {}) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...headers
  });
  response.end(JSON.stringify(payload, null, 2));
}

function redirect(response, location, headers = {}) {
  response.writeHead(302, {
    location,
    "cache-control": "no-store",
    ...headers
  });
  response.end();
}

function requestBaseUrl(request, env = process.env) {
  if (env.TRENDFOUNDRY_AUTH_PUBLIC_BASE_URL) return env.TRENDFOUNDRY_AUTH_PUBLIC_BASE_URL.replace(/\/+$/, "");
  const proto = request.headers["x-forwarded-proto"] || (request.socket.encrypted ? "https" : "http");
  const host = request.headers["x-forwarded-host"] || request.headers.host || "localhost:4173";
  return `${proto}://${host}`;
}

function readCookie(request, name) {
  const cookies = String(request.headers.cookie || "").split(/;\s*/);
  const prefix = `${name}=`;
  const match = cookies.find((cookie) => cookie.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : "";
}

function sessionHeaders(session, request, env = process.env) {
  const secure = requestBaseUrl(request, env).startsWith("https://");
  const value = encodeURIComponent(signPayload(session, env));
  return {
    "set-cookie": `${sessionCookie}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${defaultSessionTtlSeconds}${secure ? "; Secure" : ""}`
  };
}

function clearSessionHeaders() {
  return {
    "set-cookie": `${sessionCookie}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  };
}

function providerRuntimeConfig(provider, env = process.env) {
  const prefix = providerEnvPrefix(provider.id);
  return {
    clientId: env[`${prefix}_CLIENT_ID`] || env[`${prefix}_APP_ID`] || "",
    clientSecret: env[`${prefix}_CLIENT_SECRET`] || env[`${prefix}_APP_SECRET`] || "",
    scope: env[`${prefix}_SCOPE`] || provider.scope,
    authorizationEndpoint: env[`${prefix}_AUTH_URL`] || provider.authorizationEndpoint,
    tokenEndpoint: env[`${prefix}_TOKEN_URL`] || provider.tokenEndpoint,
    userInfoEndpoint: env[`${prefix}_USERINFO_URL`] || provider.userInfoEndpoint
  };
}

export function buildAuthClientConfig(request, env = process.env) {
  const baseUrl = requestBaseUrl(request, env);
  const brokerBaseUrl = `${baseUrl}/api/auth`;
  return {
    brokerBaseUrl,
    redirectUri: `${baseUrl}/auth/`,
    emailSignInEndpoint: `${brokerBaseUrl}/email`,
    providers: Object.fromEntries(
      AUTH_PROVIDERS.map((provider) => {
        const config = providerRuntimeConfig(provider, env);
        return [
          provider.id,
          {
            label: provider.label,
            authorizationEndpoint: config.authorizationEndpoint,
            clientId: config.clientId,
            scope: config.scope,
            enabled: Boolean(config.clientId),
            serverReady: Boolean(config.clientId && (config.clientSecret || provider.brokerOnly))
          }
        ];
      })
    )
  };
}

function appendQuery(url, params) {
  const next = new URL(url);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") next.searchParams.set(key, String(value));
  }
  return next.href;
}

function safeReturnTo(value, request, env = process.env) {
  const fallback = `${requestBaseUrl(request, env)}/auth/`;
  try {
    const parsed = new URL(value || fallback, fallback);
    const allowed = new URL(fallback);
    return parsed.origin === allowed.origin ? parsed.href : fallback;
  } catch {
    return fallback;
  }
}

function redirectAuthError(response, returnTo, providerId, message) {
  redirect(response, appendQuery(returnTo, {
    tf_auth: "error",
    provider: providerId,
    message
  }));
}

function pkceChallenge(verifier) {
  return createHash("sha256").update(verifier).digest("base64url");
}

function authorizationUrl(provider, config, request, returnTo, env = process.env) {
  const nonce = randomBytes(16).toString("hex");
  const codeVerifier = provider.pkce ? randomBytes(32).toString("base64url") : "";
  const state = signPayload({
    provider: provider.id,
    returnTo,
    nonce,
    codeVerifier,
    createdAt: Date.now()
  }, env);
  const baseUrl = requestBaseUrl(request, env);
  const redirectUri = `${baseUrl}/api/auth/oauth/callback/${provider.id}`;
  const authUrl = new URL(config.authorizationEndpoint);
  authUrl.searchParams.set(provider.clientIdParam || "client_id", config.clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", config.scope);
  authUrl.searchParams.set("state", state);
  if (provider.pkce) {
    authUrl.searchParams.set("code_challenge", pkceChallenge(codeVerifier));
    authUrl.searchParams.set("code_challenge_method", "S256");
  }
  return authUrl.href;
}

async function parseRequestBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return Object.fromEntries(new URLSearchParams(text));
  }
}

async function exchangeToken(provider, config, code, redirectUri, codeVerifier) {
  if (provider.brokerOnly) {
    throw new Error(`${provider.label} requires provider-specific signed token exchange in the broker.`);
  }
  if (!config.tokenEndpoint || !config.clientSecret) {
    throw new Error("Provider token endpoint or client secret is missing.");
  }
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: config.clientId,
    client_secret: config.clientSecret
  });
  if (codeVerifier) params.set("code_verifier", codeVerifier);
  const init = {
    method: provider.tokenMethod === "GET" ? "GET" : "POST",
    headers: { accept: "application/json" }
  };
  let url = config.tokenEndpoint;
  if (init.method === "GET") {
    url = `${url}${url.includes("?") ? "&" : "?"}${params}`;
  } else {
    init.headers["content-type"] = "application/x-www-form-urlencoded";
    init.body = params;
  }
  const response = await fetch(url, init);
  const text = await response.text();
  if (!response.ok) throw new Error(`Token exchange failed with HTTP ${response.status}.`);
  if (provider.tokenResponse === "query") return Object.fromEntries(new URLSearchParams(text));
  try {
    return JSON.parse(text);
  } catch {
    return Object.fromEntries(new URLSearchParams(text));
  }
}

function decodeJwtPayload(token) {
  const payload = String(token || "").split(".")[1];
  if (!payload) return {};
  try {
    return JSON.parse(fromBase64url(payload));
  } catch {
    return {};
  }
}

async function fetchProfile(provider, config, token) {
  const idProfile = decodeJwtPayload(token.id_token);
  if (!config.userInfoEndpoint && Object.keys(idProfile).length) return idProfile;
  if (!config.userInfoEndpoint) return idProfile;
  let url = config.userInfoEndpoint;
  const headers = { accept: "application/json" };
  if (provider.userInfoMode === "wechat") {
    url = appendQuery(url, {
      access_token: token.access_token,
      openid: token.openid,
      lang: "en"
    });
  } else if (provider.userInfoMode === "qq") {
    url = appendQuery(url, {
      access_token: token.access_token,
      oauth_consumer_key: config.clientId,
      openid: token.openid
    });
  } else if (provider.userInfoMode === "weibo") {
    url = appendQuery(url, {
      access_token: token.access_token,
      uid: token.uid
    });
  } else {
    headers.authorization = `Bearer ${token.access_token}`;
  }
  const response = await fetch(url, { headers });
  if (!response.ok) return idProfile;
  const profile = await response.json();
  return { ...idProfile, ...profile };
}

function normalizeProfile(provider, raw) {
  return {
    provider: provider.id,
    id: raw.sub || raw.id || raw.openid || raw.unionid || raw.uid || raw.login || "",
    name: raw.name || raw.displayName || raw.localizedDisplayName || raw.nickname || raw.login || raw.email || `${provider.label} user`,
    email: raw.email || raw.mail || raw.userPrincipalName || "",
    avatar: raw.picture || raw.avatar_url || raw.profile_image_url || raw.headimgurl || ""
  };
}

async function startOAuth(request, response, providerId, env = process.env) {
  const provider = providerById(providerId);
  const requestUrl = new URL(request.url, requestBaseUrl(request, env));
  const returnTo = safeReturnTo(requestUrl.searchParams.get("return_to"), request, env);
  if (!provider) {
    redirectAuthError(response, returnTo, providerId, "unknown_provider");
    return;
  }
  const config = providerRuntimeConfig(provider, env);
  if (!config.clientId) {
    redirectAuthError(response, returnTo, provider.id, "missing_client_id");
    return;
  }
  redirect(response, authorizationUrl(provider, config, request, returnTo, env));
}

async function callbackOAuth(request, response, providerId, env = process.env) {
  const provider = providerById(providerId);
  const requestUrl = new URL(request.url, requestBaseUrl(request, env));
  const state = verifyPayload(requestUrl.searchParams.get("state"), env);
  const returnTo = safeReturnTo(state?.returnTo, request, env);
  if (!provider || !state || state.provider !== providerId) {
    redirectAuthError(response, returnTo, providerId, "invalid_state");
    return;
  }
  if (Date.now() - Number(state.createdAt || 0) > 10 * 60 * 1000) {
    redirectAuthError(response, returnTo, provider.id, "expired_state");
    return;
  }
  const code = requestUrl.searchParams.get("code");
  if (!code) {
    redirectAuthError(response, returnTo, provider.id, requestUrl.searchParams.get("error") || "missing_code");
    return;
  }
  try {
    const config = providerRuntimeConfig(provider, env);
    const redirectUri = `${requestBaseUrl(request, env)}/api/auth/oauth/callback/${provider.id}`;
    const token = await exchangeToken(provider, config, code, redirectUri, state.codeVerifier);
    const rawProfile = await fetchProfile(provider, config, token);
    const profile = normalizeProfile(provider, rawProfile);
    const session = {
      ...profile,
      createdAt: new Date().toISOString()
    };
    redirect(response, appendQuery(returnTo, {
      tf_auth: "ok",
      provider: profile.provider,
      name: profile.name,
      email: profile.email
    }), sessionHeaders(session, request, env));
  } catch (error) {
    redirectAuthError(response, returnTo, provider.id, error.message.includes("signed token") ? "provider_specific_exchange_required" : "exchange_failed");
  }
}

function currentSession(request, env = process.env) {
  return verifyPayload(readCookie(request, sessionCookie), env);
}

export async function handleAuthApi(request, response, env = process.env) {
  const requestUrl = new URL(request.url, requestBaseUrl(request, env));
  const path = requestUrl.pathname.replace(/\/+$/, "");
  const startMatch = path.match(/^\/api\/auth\/oauth\/start\/([a-z0-9_-]+)$/i);
  if (startMatch) {
    await startOAuth(request, response, startMatch[1], env);
    return true;
  }
  const callbackMatch = path.match(/^\/api\/auth\/oauth\/callback\/([a-z0-9_-]+)$/i);
  if (callbackMatch) {
    await callbackOAuth(request, response, callbackMatch[1], env);
    return true;
  }
  if (path === "/api/auth/session") {
    const session = currentSession(request, env);
    json(response, 200, { authenticated: Boolean(session), profile: session || null });
    return true;
  }
  if (path === "/api/auth/logout") {
    json(response, 200, { ok: true }, clearSessionHeaders());
    return true;
  }
  if (path === "/api/auth/email") {
    const body = request.method === "POST" ? await parseRequestBody(request) : {};
    json(response, 202, {
      ok: false,
      email: body.email || "",
      message: "Email magic-link delivery is not configured. Set TRENDFOUNDRY_AUTH_EMAIL_ENDPOINT or connect a mailer in this broker."
    });
    return true;
  }
  return false;
}
