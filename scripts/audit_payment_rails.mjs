import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const outDir = path.join(root, "dist", "payment-rails");
const privateConfigFile = path.join(root, "data", "payment-rails.json");
const exampleConfigFile = path.join(root, "data", "payment-rails.example.json");

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function readJson(file, fallback = {}) {
  try {
    return JSON.parse((await readFile(file, "utf8")).replace(/^\uFEFF/, ""));
  } catch {
    return fallback;
  }
}

function compact(value, fallback = "") {
  return String(value || fallback).replace(/\s+/g, " ").trim() || fallback;
}

function hasCheckoutUrl(value) {
  const text = compact(value);
  if (!text) return false;
  try {
    const parsed = new URL(text);
    return parsed.protocol === "https:" && parsed.hostname.includes(".");
  } catch {
    return false;
  }
}

function sensitiveConfigHits(text) {
  const hits = [];
  for (const pattern of [
    /client_secret/i,
    /secret[_-]?key/i,
    /api[_-]?key/i,
    /access[_-]?token/i,
    /refresh[_-]?token/i,
    /private[_-]?key/i,
    /password/i,
    /card[_-]?number/i,
    /cvv/i,
    /wallet[_-]?seed/i,
    /seed[_-]?phrase/i
  ]) {
    if (pattern.test(text)) hits.push(String(pattern));
  }
  return hits;
}

function publicDoc(readiness) {
  const statusLine = readiness.readyForHostedCheckout
    ? "Hosted checkout links are configured for every commerce SKU."
    : "Hosted checkout links are not fully configured yet; payment replies should stay manual-review only.";
  return `# TrendFoundry Payment Rail Readiness

Generated: ${readiness.generatedAt}

${statusLine}

## Current Counts

- Commerce products: ${readiness.productCount}
- Configured checkout links: ${readiness.configuredCount}
- Missing checkout links: ${readiness.missingCount}
- Config source: ${readiness.configSource}
- Provider: ${readiness.provider}
- Mode: ${readiness.mode}

## Safety Boundary

- Real payment configuration belongs in ignored \`data/payment-rails.json\`.
- The committed template is \`data/payment-rails.example.json\`.
- This audit does not collect payment.
- This audit does not send messages.
- This audit does not publish checkout URLs in tracked docs.
- Do not commit API keys, client secrets, access tokens, card numbers, private IDs, wallet seeds, or buyer payment credentials.
`;
}

const commerce = await readJson(path.join(root, "dist", "commerce", "products.json"), { products: [] });
const configFile = (await exists(privateConfigFile)) ? privateConfigFile : exampleConfigFile;
const configSource = configFile === privateConfigFile ? "private" : "example";
const configText = (await exists(configFile)) ? (await readFile(configFile, "utf8")).replace(/^\uFEFF/, "") : "{}";
const config = JSON.parse(configText || "{}");
const links = config.links || {};
const provider = compact(config.provider, "not_configured");
const mode = compact(config.mode, "manual_review");
const products = commerce.products || [];

const productRows = products.map((product) => {
  const link = links[product.sku] || "";
  const checkoutConfigured = hasCheckoutUrl(link);
  return {
    sku: product.sku,
    title: product.title,
    priceUsd: product.price_usd,
    billing: product.billing,
    checkoutConfigured,
    status: checkoutConfigured ? "configured" : "missing_checkout_link"
  };
});
const sensitiveHits = sensitiveConfigHits(configText);
const configuredCount = productRows.filter((row) => row.checkoutConfigured).length;
const missingCount = productRows.length - configuredCount;
const readyForHostedCheckout = productRows.length > 0 && missingCount === 0 && provider !== "not_configured" && !sensitiveHits.length;

const readiness = {
  generatedAt: new Date().toISOString(),
  provider,
  mode,
  configSource,
  productCount: productRows.length,
  configuredCount,
  missingCount,
  readyForHostedCheckout,
  products: productRows,
  safety: {
    readsPrivateIgnoredConfig: configSource === "private",
    publishesCheckoutUrlsInTrackedDocs: false,
    collectsPayment: false,
    sendsMessages: false,
    sensitiveConfigHits
  }
};

await mkdir(docsDir, { recursive: true });
await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, "readiness.json"), JSON.stringify(readiness, null, 2), "utf8");
await writeFile(path.join(docsDir, "payment-rail-readiness.md"), publicDoc(readiness), "utf8");

console.log(`Wrote ${path.join(docsDir, "payment-rail-readiness.md")}`);
console.log(`Payment rails configured: ${configuredCount}/${productRows.length}`);
