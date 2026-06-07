import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { prepareOrder } from "./lib/fulfillment.mjs";

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

function safeLine(value, fallback = "not-provided") {
  return String(value || fallback).replace(/\r?\n/g, " ").trim() || fallback;
}

function markdownReport(prepared, skipped, generatedAt) {
  const readyRows = prepared.map(
    (row) => `| ${row.orderId} | ${row.orderType} | ${row.buyerName} | ${row.buyerContact} | ${row.channel} | ${row.orderDir} |`
  );
  const skippedRows = skipped.map((order) => `| ${order.orderId || "-"} | ${order.stage || "unknown"} | ${safeLine(order.buyerName)} | ${safeLine(order.buyerContact)} |`);
  return `# Email Order Fulfillment Report

Generated: ${generatedAt}

Only local buyer delivery directories were created. No messages were sent, no files were uploaded, no payment action was attempted, and no GitHub state was changed.

Eligible stage: \`paid_needs_fulfillment\`

## Prepared Orders

| Order ID | Type | Buyer | Contact | Channel | Order Dir |
|---|---|---|---|---|---|
${readyRows.length ? readyRows.join("\n") : "| - | - | - | - | - | No paid email orders. |"}

## Skipped Orders

| Order ID | Stage | Buyer | Contact |
|---|---|---|---|
${skippedRows.length ? skippedRows.join("\n") : "| - | - | - | No skipped orders. |"}

## Safety

- Verify payment externally before sending any delivery email.
- Do not send prospects.csv, outreach-board.md, or latest.json to buyers.
- Do not promise views, subscribers, revenue, or platform growth.
`;
}

const intakeFile = resolvePath(argValue("intake-file", "dist/email-order-intake/orders.json"));
const reportDir = resolvePath(argValue("out-dir", "dist/email-fulfillment"));
const intake = JSON.parse(await readFile(intakeFile, "utf8"));
const orders = intake.orders || [];
const ready = orders.filter((order) => order.stage === "paid_needs_fulfillment");
const skipped = orders.filter((order) => order.stage !== "paid_needs_fulfillment");
const prepared = [];

for (const order of ready) {
  const buyerName = safeLine(order.buyerName, "buyer");
  const buyerContact = safeLine(order.buyerContact, "not-provided");
  const channel = safeLine(order.channel, "not-provided");
  const orderType = safeLine(order.tier, "sample-issue");
  const orderId = safeLine(order.orderId, `${new Date().toISOString().slice(0, 10)}-${orderType}`);
  const result = await prepareOrder({ root, buyerName, buyerContact, channel, orderType, orderId });
  prepared.push({
    orderId,
    sourceFile: order.sourceFile,
    stage: order.stage,
    buyerName,
    buyerContact,
    channel,
    orderType,
    orderDir: result.orderDir,
    files: result.files
  });
}

await mkdir(reportDir, { recursive: true });
const generatedAt = new Date().toISOString();
const payload = {
  generatedAt,
  intakeFile,
  prepared,
  skippedCount: skipped.length,
  safety: [
    "No messages were sent.",
    "No files were uploaded.",
    "No payment action was attempted.",
    "No GitHub state was changed.",
    "Buyer delivery excludes seller-only files through prepareOrder()."
  ]
};
await writeFile(path.join(reportDir, "email-orders.json"), JSON.stringify(payload, null, 2), "utf8");
await writeFile(path.join(reportDir, "email-orders.md"), markdownReport(prepared, skipped, generatedAt), "utf8");

console.log(`Prepared ${prepared.length} paid email order(s).`);
console.log(`Skipped ${skipped.length} non-paid email order(s).`);
console.log(`Report: ${path.join(reportDir, "email-orders.md")}`);
