import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { preparePaymentReply } from "./lib/payment_reply.mjs";
import { slug } from "./lib/fulfillment.mjs";

const root = process.cwd();

function argValue(name, fallback = "") {
  const prefix = `--${name}=`;
  const arg = process.argv.slice(2).find((value) => value.startsWith(prefix));
  const envName = name.toUpperCase().replace(/-/g, "_");
  return arg ? arg.slice(prefix.length) : process.env[envName] || fallback;
}

function resolvePath(value) {
  return path.isAbsolute(value) ? value : path.join(root, value);
}

function clean(value, fallback = "not provided") {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text || fallback;
}

function field(text, names, fallback = "") {
  for (const name of names) {
    const pattern = new RegExp(`^${name}\\s*:\\s*(.+)$`, "im");
    const match = text.match(pattern);
    if (match?.[1]) return clean(match[1], fallback);
  }
  return fallback;
}

function fromHeader(text) {
  const raw = field(text, ["From"], "");
  const email = raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
  const name = raw.replace(/<[^>]+>/g, "").replace(email, "").trim();
  return { name, email };
}

function inferTier(text) {
  const explicit = field(text, ["Tier", "Product", "Pack", "Order"], "");
  const haystack = `${explicit}\n${text}`.toLowerCase();
  if (/custom\s+niche|custom\s+brief|custom\s+pack|\$49|49\/month/.test(haystack)) return "custom-niche";
  if (/weekly\s+brief|weekly\s+pack|subscription|\$19|19\/month|per month/.test(haystack)) return "weekly-brief";
  return "sample-issue";
}

function parseOrder(fileName, text) {
  const header = fromHeader(text);
  const tier = inferTier(text);
  const buyerName = clean(field(text, ["Buyer", "Name", "Customer"], header.name || "Buyer"));
  const buyerContact = clean(field(text, ["Contact", "Email", "Reply-To"], header.email || "buyer@example.com"));
  const channel = clean(field(text, ["Channel", "Creator channel", "URL", "Link"], "not provided"));
  const niche = clean(field(text, ["Niche", "Topic", "Preference", "Audience"], "not provided"));
  const deliveryRoute = clean(field(text, ["Delivery route", "Delivery", "Preferred delivery route"], "email"));
  const stage = /payment\s+confirmed|paid\s*:\s*yes|stage\s*:\s*paid/i.test(text) ? "paid_needs_fulfillment" : "payment_reply_drafted";
  const sourceSlug = slug(path.basename(fileName, path.extname(fileName)));
  const orderId = `email-${sourceSlug}-${tier}`;
  return {
    orderId,
    sourceFile: fileName,
    tier,
    buyerName,
    buyerContact,
    channel,
    niche,
    deliveryRoute,
    stage,
    confidence: buyerContact === "buyer@example.com" || channel === "not provided" ? "review" : "normal"
  };
}

function markdownReport(orders, paymentRepliesDir) {
  const rows = orders.length
    ? orders
        .map(
          (order) => `| ${order.stage} | ${order.tier} | ${order.buyerName} | ${order.buyerContact} | ${order.channel} | ${order.paymentReplyDir} |`
        )
        .join("\n")
    : "| none | none | none | none | none | none |";
  return `# Email Order Intake

Generated: ${new Date().toISOString()}

Input files are local order emails or copied message text. This script does not connect to an inbox, send email, create payment links, charge buyers, upload files, or change GitHub state.

Payment reply packets: ${paymentRepliesDir}

| Stage | Tier | Buyer | Contact | Channel | Payment reply |
|---|---|---|---|---|---|
${rows}

## Review Rules

- Insert a verified hosted checkout link or manual invoice reference only after review.
- Do not request card numbers, private IDs, passwords, wallet seeds, or payment credentials by email or public issue.
- If an order is marked paid, verify payment externally before running fulfillment.
- Buyer delivery must still exclude prospects.csv, outreach-board.md, and latest.json.
`;
}

const inboxDir = resolvePath(argValue("inbox-dir", "data/email-orders"));
const outDir = resolvePath(argValue("out-dir", "dist/email-order-intake"));
const paymentRepliesDir = resolvePath(argValue("payment-replies-dir", "dist/payment-replies"));

await mkdir(inboxDir, { recursive: true });
await mkdir(outDir, { recursive: true });

const entries = existsSync(inboxDir)
  ? (await readdir(inboxDir, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && /\.(txt|md|eml)$/i.test(entry.name))
      .sort((a, b) => a.name.localeCompare(b.name))
  : [];

const orders = [];
for (const entry of entries) {
  const sourcePath = path.join(inboxDir, entry.name);
  const text = await readFile(sourcePath, "utf8");
  const order = parseOrder(entry.name, text);
  const reply = await preparePaymentReply({
    root,
    paymentRepliesDir,
    tier: order.tier,
    buyerName: order.buyerName,
    buyerContact: order.buyerContact,
    channel: order.channel,
    niche: order.niche,
    deliveryRoute: order.deliveryRoute,
    orderId: order.orderId
  });
  orders.push({
    ...order,
    paymentReplyDir: reply.outDir,
    generatedFiles: reply.files
  });
}

const payload = {
  generatedAt: new Date().toISOString(),
  inboxDir,
  outDir,
  paymentRepliesDir,
  total: orders.length,
  orders,
  safety: [
    "No inbox connection was opened.",
    "No message was sent.",
    "No payment action was attempted.",
    "No files were uploaded.",
    "No GitHub state was changed."
  ]
};

await writeFile(path.join(outDir, "orders.json"), JSON.stringify(payload, null, 2), "utf8");
await writeFile(path.join(outDir, "pipeline.md"), markdownReport(orders, paymentRepliesDir), "utf8");

console.log(`Processed ${orders.length} local email order file(s).`);
console.log(`Wrote ${path.join(outDir, "pipeline.md")}`);
