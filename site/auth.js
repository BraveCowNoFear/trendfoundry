const providerGrid = document.querySelector(".provider-grid");
const notice = document.querySelector("#auth-notice");
const statusTitle = document.querySelector("#auth-status-title");
const statusCopy = document.querySelector("#auth-status-copy");
const accountName = document.querySelector("#account-name");
const accountProvider = document.querySelector("#account-provider");
const accountAvatar = document.querySelector("#account-avatar");
const signOutButton = document.querySelector("#sign-out-button");
const emailForm = document.querySelector("#email-login-form");
const providers = window.TRENDFOUNDRY_AUTH_PROVIDERS || [];
const sessionKey = "trendfoundry.auth.session";
let authConfig = { providers: {} };

function setNotice(message, tone) {
  notice.textContent = message;
  notice.dataset.tone = tone || "neutral";
}

function providerConfig(providerId) {
  return (authConfig.providers && authConfig.providers[providerId]) || {};
}

function providerReady(providerId) {
  const config = providerConfig(providerId);
  return Boolean(authConfig.brokerBaseUrl || (config.enabled && config.clientId && (config.authorizationEndpoint || config.authUrl)));
}

function authReturnUrl() {
  return authConfig.redirectUri || new URL("./", window.location.href).href;
}

function buildAuthUrl(provider) {
  const config = providerConfig(provider.id);
  if (authConfig.brokerBaseUrl) {
    const broker = authConfig.brokerBaseUrl.replace(/\/+$/, "");
    const url = new URL(broker + "/oauth/start/" + encodeURIComponent(provider.id), window.location.href);
    url.searchParams.set("return_to", authReturnUrl());
    return url.href;
  }
  const endpoint = config.authorizationEndpoint || config.authUrl || provider.authUrl;
  if (!config.enabled || !config.clientId || !endpoint) return "";
  const state = provider.id + "." + Math.random().toString(36).slice(2);
  sessionStorage.setItem("trendfoundry.auth.state", state);
  const url = new URL(endpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", authReturnUrl());
  url.searchParams.set("scope", config.scope || provider.scope || "openid email profile");
  url.searchParams.set("state", state);
  return url.href;
}

function saveSession(session) {
  localStorage.setItem(sessionKey, JSON.stringify({
    provider: session.provider || "account",
    name: session.name || "TrendFoundry member",
    email: session.email || "",
    mode: session.mode || "active",
    updatedAt: new Date().toISOString()
  }));
}

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(sessionKey) || "null");
  } catch {
    return null;
  }
}

function renderSession() {
  const session = readSession();
  if (!session) {
    statusTitle.textContent = "Not signed in.";
    statusCopy.textContent = "Choose a provider below. Configured providers redirect through the OAuth gateway; unconfigured providers explain what is missing.";
    accountName.textContent = "Guest visitor";
    accountProvider.textContent = "No active provider";
    accountAvatar.textContent = "TF";
    signOutButton.disabled = true;
    return;
  }
  const provider = providers.find((item) => item.id === session.provider);
  if (session.mode === "pending" && session.provider === "email") {
    statusTitle.textContent = "Email sign-in pending.";
    statusCopy.textContent = "Configure emailSignInEndpoint to send real magic links. This static preview only stores the requested email locally.";
  } else if (session.mode === "pending") {
    statusTitle.textContent = "Authorization code received.";
    statusCopy.textContent = "The provider returned to the static page. Complete backend token exchange in the OAuth broker to create a secure production session.";
  } else {
    statusTitle.textContent = "Signed in.";
    statusCopy.textContent = "Your account marker is stored locally for this static preview. Production sessions should be issued by the auth backend.";
  }
  accountName.textContent = session.name || session.email || "TrendFoundry member";
  accountProvider.textContent = provider ? provider.label : session.provider;
  accountAvatar.textContent = (session.name || provider?.label || "TF").slice(0, 2).toUpperCase();
  signOutButton.disabled = false;
}

function renderProviders() {
  for (const button of providerGrid.querySelectorAll("[data-provider]")) {
    const id = button.dataset.provider;
    const ready = providerReady(id);
    button.classList.toggle("configured", ready);
    button.dataset.ready = ready ? "true" : "false";
    button.title = ready ? "Start login" : "Set brokerBaseUrl or provider clientId in auth.config.json";
  }
}

function handleCallback() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("tf_auth") === "error") {
    const provider = params.get("provider") || "provider";
    const message = params.get("message") || "auth_error";
    window.history.replaceState({}, "", window.location.pathname);
    setNotice(provider + " login could not start: " + message.replace(/_/g, " ") + ".", "warning");
    return true;
  }
  if (params.get("tf_auth") === "ok") {
    saveSession({
      provider: params.get("provider") || "broker",
      name: params.get("name") || params.get("email") || "TrendFoundry member",
      email: params.get("email") || "",
      mode: "active"
    });
    window.history.replaceState({}, "", window.location.pathname);
    setNotice("Signed in through the configured auth gateway.", "success");
    return true;
  }
  if (params.get("code")) {
    const state = params.get("state") || "";
    const expected = sessionStorage.getItem("trendfoundry.auth.state") || "";
    const provider = state.split(".")[0] || "provider";
    saveSession({ provider, name: "Pending OAuth exchange", mode: "pending" });
    window.history.replaceState({}, "", window.location.pathname);
    setNotice(expected && state !== expected ? "State mismatch. Do not trust this callback until the backend validates it." : "Code received. A backend must exchange it for a secure session.", expected && state !== expected ? "danger" : "warning");
    return true;
  }
  return false;
}

async function loadConfig() {
  try {
    const response = await fetch("./auth.config.json", { cache: "no-store" });
    if (response.ok) authConfig = await response.json();
  } catch {
    authConfig = { providers: {} };
  }
  if (authConfig.brokerBaseUrl) {
    try {
      const sessionUrl = new URL(authConfig.brokerBaseUrl.replace(/\/+$/, "") + "/session", window.location.href);
      const sessionResponse = await fetch(sessionUrl, { cache: "no-store", credentials: "same-origin" });
      if (sessionResponse.ok) {
        const session = await sessionResponse.json();
        if (session.authenticated && session.profile) saveSession({ ...session.profile, mode: "active" });
      }
    } catch {
      // The static page can still render even when the broker is temporarily unavailable.
    }
  }
  const callbackHandled = handleCallback();
  renderProviders();
  renderSession();
  if (callbackHandled) {
    return;
  }
  if (authConfig.brokerBaseUrl) {
    setNotice("OAuth gateway configured. Provider buttons are ready.", "success");
  } else {
    const enabled = Object.values(authConfig.providers || {}).filter((item) => item.enabled && item.clientId).length;
    setNotice(enabled ? enabled + " direct provider(s) configured. Backend token exchange is still required." : "No OAuth gateway configured yet. Add brokerBaseUrl or provider client IDs in auth.config.json.", enabled ? "warning" : "neutral");
  }
}

providerGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-provider]");
  if (!button) return;
  const provider = providers.find((item) => item.id === button.dataset.provider);
  if (!provider) return;
  const url = buildAuthUrl(provider);
  if (!url) {
    setNotice(provider.label + " needs brokerBaseUrl or an enabled clientId in auth.config.json.", "warning");
    return;
  }
  window.location.href = url;
});

emailForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = new FormData(emailForm).get("email");
  if (!authConfig.emailSignInEndpoint) {
    saveSession({ provider: "email", name: String(email), email: String(email), mode: "pending" });
    renderSession();
    setNotice("Email captured locally. Configure emailSignInEndpoint to send real magic links.", "warning");
    return;
  }
  const response = await fetch(authConfig.emailSignInEndpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, returnTo: authReturnUrl() })
  });
  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }
  setNotice(response.ok ? (payload.message || "Sign-in link requested. Check your email.") : (payload.message || "Email endpoint returned an error."), response.ok && payload.ok !== false ? "success" : "warning");
});

signOutButton.addEventListener("click", () => {
  localStorage.removeItem(sessionKey);
  renderSession();
  setNotice("Signed out on this device.", "neutral");
});

loadConfig();
