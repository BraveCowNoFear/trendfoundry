import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const outDir = path.join(root, "dist", "custom-email-orders");

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

function platformFor(order) {
  const text = `${order.channel || ""} ${order.deliveryRoute || ""}`.toLowerCase();
  if (text.includes("bilibili")) return "Bilibili";
  if (text.includes("youtube") || text.includes("youtu.be")) return "YouTube";
  return "YouTube and Bilibili";
}

function runCustomPack(order) {
  const orderId = safeLine(order.orderId, `custom-${Date.now()}`);
  const args = [
    path.join(root, "scripts", "generate_custom_proof_pack.mjs"),
    `--niche=${safeLine(order.niche, "AI video creators")}`,
    `--platform=${platformFor(order)}`,
    `--buyer=${safeLine(order.buyerName, "custom buyer")}`,
    `--channel=${safeLine(order.channel, "not-provided")}`,
    `--order-id=${orderId}`
  ];
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: "utf8",
    shell: false
  });
  return { result, orderId };
}

function markdownReport({ generatedAt, prepared, skipped }) {
  const preparedRows = prepared.map((row) => `| ${row.orderId} | ${row.buyerName} | ${row.buyerContact} | ${row.niche} | ${row.platform} | ${row.orderDir} |`);
  const skippedRows = skipped.map((row) => `| ${row.orderId || "-"} | ${row.stage || "unknown"} | ${row.tier || "unknown"} | ${safeLine(row.skipReason, "not_custom_paid_order")} |`);
  return `# Custom Email Order Fulfillment

Generated: ${generatedAt}

This prepares buyer-only custom proof pack directories for paid email orders with \`tier=custom-niche\`. It does not send messages, collect payment, upload files, or build the frontend.

## Prepared Custom Orders

| Order ID | Buyer | Contact | Niche | Platform | Order Dir |
| --- | --- | --- | --- | --- | --- |
${preparedRows.length ? preparedRows.join("\n") : "| - | - | - | - | - | No paid custom email orders. |"}

## Skipped Orders

| Order ID | Stage | Tier | Reason |
| --- | --- | --- | --- |
${skippedRows.length ? skippedRows.join("\n") : "| - | - | - | No skipped orders. |"}

## Safety

- Verify payment externally before sending any delivery email.
- Attach only buyer deliverables from the custom order directory.
- Do not attach prospects, outreach notes, raw snapshots, account data, or sensitive payment data.
- Do not promise views, subscribers, revenue, platform growth, or buyer outcomes.
`;
}

const intakeFile = resolvePath(argValue("intake-file", "dist/email-order-intake/orders.json"));
const intake = JSON.parse(await readFile(intakeFile, "utf8"));
const orders = intake.orders || [];
const ready = orders.filter((order) => order.stage === "paid_needs_fulfillment" && order.tier === "custom-niche");
const skipped = orders
  .filter((order) => order.stage !== "paid_needs_fulfillment" || order.tier !== "custom-niche")
  .map((order) => ({
    ...order,
    skipReason: order.stage !== "paid_needs_fulfillment" ? "not_paid_needs_fulfillment" : "not_custom_niche"
  }));
const prepared = [];

await mkdir(outDir, { recursive: true });

for (const order of ready) {
  const { result, orderId } = runCustomPack(order);
  if (result.status !== 0) {
    throw new Error(`custom proof pack failed for ${orderId}: ${result.stderr || result.stdout}`);
  }
  const sourceDir = path.join(root, "dist", "custom-proof-pack");
  const orderDir = path.join(outDir, orderId);
  await mkdir(orderDir, { recursive: true });
  const files = ["custom-proof-pack.md", "delivery-email.md", "manifest.json"];
  for (const file of files) {
    const source = path.join(sourceDir, file);
    const target = path.join(orderDir, file);
    await writeFile(target, await readFile(source, "utf8"), "utf8");
  }
  const checklist = `# Custom Email Order Checklist

- [ ] External payment confirmation checked.
- [ ] Buyer contact is correct: ${safeLine(order.buyerContact)}
- [ ] Buyer channel/context is correct: ${safeLine(order.channel)}
- [ ] Niche is correct: ${safeLine(order.niche)}
- [ ] Only custom-proof-pack.md and reviewed delivery-email.md are sent.
- [ ] Seller-only files are not attached.
- [ ] No promises about views, subscribers, revenue, or platform growth.

Order directory: ${orderDir}
`;
  await writeFile(path.join(orderDir, "fulfillment-checklist.md"), checklist, "utf8");
  prepared.push({
    orderId,
    sourceFile: order.sourceFile,
    stage: order.stage,
    tier: order.tier,
    buyerName: safeLine(order.buyerName, "custom buyer"),
    buyerContact: safeLine(order.buyerContact, "not-provided"),
    channel: safeLine(order.channel, "not-provided"),
    niche: safeLine(order.niche, "not-provided"),
    platform: platformFor(order),
    orderDir,
    files: [...files, "fulfillment-checklist.md"]
  });
}

const generatedAt = new Date().toISOString();
const payload = {
  generatedAt,
  intakeFile,
  prepared,
  preparedCount: prepared.length,
  skipped,
  skippedCount: skipped.length,
  safety: {
    sendsMessages: false,
    collectsPayment: false,
    uploadsFiles: false,
    buildsFrontend: false,
    buyerDeliverables: ["custom-proof-pack.md", "delivery-email.md"],
    noRevenuePromise: true,
    noViewPromise: true,
    noCredentialRequest: true
  }
};

await mkdir(docsDir, { recursive: true });
await writeFile(path.join(outDir, "custom-email-orders.json"), JSON.stringify(payload, null, 2), "utf8");
await writeFile(path.join(outDir, "custom-email-orders.md"), markdownReport({ generatedAt, prepared, skipped }), "utf8");
await writeFile(path.join(docsDir, "custom-email-fulfillment.md"), markdownReport({
  generatedAt,
  prepared: prepared.map((row) => ({
    ...row,
    buyerName: "private",
    buyerContact: "private",
    channel: "private",
    niche: "private",
    orderDir: "private"
  })),
  skipped: skipped.map((row) => ({
    orderId: row.orderId,
    stage: row.stage,
    tier: row.tier,
    skipReason: row.skipReason
  }))
}), "utf8");

console.log(`Prepared ${prepared.length} paid custom email order(s).`);
console.log(`Skipped ${skipped.length} non-custom email order(s).`);
console.log(`Report: ${path.join(docsDir, "custom-email-fulfillment.md")}`);
