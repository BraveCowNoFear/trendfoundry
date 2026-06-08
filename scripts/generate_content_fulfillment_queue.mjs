import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const outDir = path.join(root, "dist", "content-fulfillment-queue");

function compact(value, fallback = "") {
  return String(value || fallback).replace(/\s+/g, " ").trim() || fallback;
}

function rel(file) {
  return path.relative(root, file).replace(/\\/g, "/");
}

async function readJsonMaybe(file, fallback = null) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

async function readTextMaybe(file) {
  try {
    return await readFile(file, "utf8");
  } catch {
    return "";
  }
}

async function listDirs(dir) {
  try {
    return (await readdir(dir, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(dir, entry.name))
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

async function listJsonFiles(dir) {
  try {
    return (await readdir(dir, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json") && entry.name !== "latest.json")
      .map((entry) => path.join(dir, entry.name))
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

async function fileExists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows, columns) {
  return [columns.join(","), ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))].join("\n");
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted && char === "\"" && next === "\"") {
      field += "\"";
      index += 1;
    } else if (char === "\"") {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      if (row.some((cell) => cell.length)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  row.push(field);
  if (row.some((cell) => cell.length)) rows.push(row);
  if (!rows.length) return [];
  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""])));
}

function statusCounts(rows) {
  return rows.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, {});
}

function typeCounts(rows) {
  return rows.reduce((acc, row) => {
    acc[row.type] = (acc[row.type] || 0) + 1;
    return acc;
  }, {});
}

function hasCompletedSubscription(manifest, subscriberRows) {
  const subscriber = manifest.subscriber || {};
  const contact = compact(subscriber.contact).toLowerCase();
  const week = compact(subscriber.week);
  const match = subscriberRows.find((row) => {
    const rowContact = compact(row.contact).toLowerCase();
    return contact && rowContact === contact;
  });
  if (!match) return false;
  const deliveredWeek = Number.parseInt(compact(match.last_delivered_week, "0"), 10);
  const manifestWeek = Number.parseInt(week || "0", 10);
  return Boolean(match.last_sent_at) && deliveredWeek >= manifestWeek;
}

function baseIdentity(manifest) {
  const buyer = manifest.buyer || {};
  const subscriber = manifest.subscriber || {};
  return {
    buyer: compact(buyer.name || manifest.buyer || subscriber.name || "private"),
    contact: compact(buyer.contact || subscriber.contact || "private"),
    channel: compact(buyer.channel || manifest.channel || subscriber.channel || "not-provided"),
    product: compact(buyer.product || manifest.productSku || manifest.product || "not-provided"),
    week: compact(subscriber.week || "")
  };
}

async function rowFromOrder({ type, orderDir, completionReceipts, subscriberRows }) {
  const manifestPath = path.join(orderDir, "manifest.json");
  const manifest = await readJsonMaybe(manifestPath, {});
  const orderId = compact(manifest.orderId, path.basename(orderDir));
  const deliverables = manifest.buyerDeliverables || [];
  const issues = [];
  const required = [];
  let completed = Boolean(completionReceipts.get(orderId));

  if (type === "standard_content_order") {
    required.push("START-HERE.md", "full-episode-script.md", "episode-workbench.md", "content-evidence-pack.md", "content-editorial-audit.md");
    if (deliverables.length > 5) issues.push("too_many_buyer_deliverables");
    if (deliverables[0] !== "START-HERE.md") issues.push("start_here_not_first");
    if (!deliverables.includes("START-HERE.md")) issues.push("missing_start_here");
  } else if (type === "custom_email_order") {
    required.push("custom-proof-pack.md");
    if (deliverables.length > 1) issues.push("custom_should_be_one_primary_file");
    if (!deliverables.includes("custom-proof-pack.md")) issues.push("missing_custom_proof_pack");
  } else if (type === "weekly_subscription_order") {
    required.push("weekly-proof-pack.md", "subscriber-email.md");
    if (deliverables.length > 2) issues.push("weekly_pack_should_be_two_files");
    if (!deliverables.includes("weekly-proof-pack.md")) issues.push("missing_weekly_proof_pack");
    if (!deliverables.includes("subscriber-email.md")) issues.push("missing_subscriber_email");
    completed = hasCompletedSubscription(manifest, subscriberRows);
  } else if (type === "standard_sample_order" && deliverables.length > 6) {
    issues.push("sample_order_too_many_files");
  }

  for (const file of required) {
    if (!(await fileExists(path.join(orderDir, file)))) issues.push(`missing_file:${file}`);
  }

  const status = issues.length
    ? "needs_delivery_fix"
    : completed
      ? type === "weekly_subscription_order" ? "fulfilled_subscription_next_due" : "fulfilled_waiting_feedback"
      : "prepared_waiting_manual_send";
  const identity = baseIdentity(manifest);

  return {
    type,
    order_id: orderId,
    status,
    concise_ready: issues.length ? "no" : "yes",
    deliverable_count: deliverables.length,
    buyer: identity.buyer,
    contact: identity.contact,
    channel: identity.channel,
    product: identity.product,
    week: identity.week,
    generated_at: compact(manifest.generatedAt),
    next_action: status === "prepared_waiting_manual_send"
      ? "review delivery files and send manually, then record completion if supported"
      : status === "needs_delivery_fix"
        ? "fix deliverable boundary before sending"
        : "review customer-success or next subscription due queue",
    issues: issues.join("; "),
    order_dir: rel(orderDir),
    completion_receipt: completionReceipts.get(orderId)?.file || ""
  };
}

async function completionReceipts() {
  const receipts = new Map();
  for (const file of await listJsonFiles(path.join(root, "dist", "content-order-completion"))) {
    const receipt = await readJsonMaybe(file, null);
    if (receipt?.orderId) receipts.set(String(receipt.orderId), { ...receipt, file: rel(file) });
  }
  return receipts;
}

async function rowsFor(type, dir, completionMap, subscriberRows) {
  const rows = [];
  for (const orderDir of await listDirs(dir)) {
    if (await fileExists(path.join(orderDir, "manifest.json"))) {
      rows.push(await rowFromOrder({ type, orderDir, completionReceipts: completionMap, subscriberRows }));
    }
  }
  return rows;
}

function privateMarkdown(rows, generatedAt) {
  return `# TrendFoundry Content Fulfillment Queue

Generated: ${generatedAt}

Private local queue. Do not publish buyer names, contacts, or channels from this file.

| Type | Order | Status | Buyer | Contact | Deliverables | Concise | Next Action | Issues |
| --- | --- | --- | --- | --- | ---: | --- | --- | --- |
${rows.map((row) => `| ${row.type} | ${row.order_id} | ${row.status} | ${row.buyer} | ${row.contact} | ${row.deliverable_count} | ${row.concise_ready} | ${row.next_action} | ${row.issues || "none"} |`).join("\n") || "| - | - | - | - | - | - | - | - | - |"}

## Safety

- This script does not send messages.
- This script does not collect payment.
- This script does not upload files.
- Public docs only receive aggregate counts.
`;
}

function publicMarkdown(manifest) {
  return `# TrendFoundry Content Fulfillment Queue

Generated: ${manifest.generatedAt}

This public report summarizes the local content delivery queue without exposing buyer names, contacts, channels, or payment references.

## Current Counts

- Queue rows: ${manifest.queueCount}
- Prepared, waiting manual send: ${manifest.statusCounts.prepared_waiting_manual_send || 0}
- Fulfilled, waiting feedback: ${manifest.statusCounts.fulfilled_waiting_feedback || 0}
- Fulfilled subscription, next due tracked: ${manifest.statusCounts.fulfilled_subscription_next_due || 0}
- Needs delivery fix: ${manifest.statusCounts.needs_delivery_fix || 0}
- Concise-ready rows: ${manifest.conciseReadyCount}
- Concise issue rows: ${manifest.conciseIssueCount}

## Order Types

| Type | Count |
| --- | ---: |
${Object.entries(manifest.typeCounts).map(([type, count]) => `| ${type} | ${count} |`).join("\n") || "| none | 0 |"}

## Operator Flow

1. Review ignored \`dist/content-fulfillment-queue/fulfillment-queue.md\`.
2. Send only rows marked \`concise_ready=yes\`.
3. For standard content orders, make \`START-HERE.md\` the first file the buyer sees.
4. After manual delivery, run the matching completion command so customer-success follow-ups can take over.

## Safety Boundary

- Does not send messages.
- Does not collect payment.
- Does not upload files.
- Does not build or overwrite the frontend.
- Does not expose private buyer rows in tracked docs.
- Does not promise views, subscribers, revenue, platform growth, or buyer outcomes.
`;
}

const generatedAt = new Date().toISOString();
const completionMap = await completionReceipts();
const subscriberRows = parseCsv(await readTextMaybe(path.join(root, "data", "content-subscriptions", "subscribers.csv")));
const rows = [
  ...await rowsFor("standard_content_order", path.join(root, "dist", "content-orders"), completionMap, subscriberRows),
  ...await rowsFor("custom_email_order", path.join(root, "dist", "custom-email-orders"), completionMap, subscriberRows),
  ...await rowsFor("weekly_subscription_order", path.join(root, "dist", "content-subscriptions"), completionMap, subscriberRows),
  ...await rowsFor("standard_sample_order", path.join(root, "dist", "orders"), completionMap, subscriberRows)
].sort((left, right) => `${left.status}:${left.type}:${left.order_id}`.localeCompare(`${right.status}:${right.type}:${right.order_id}`));

const manifest = {
  generatedAt,
  queueCount: rows.length,
  statusCounts: statusCounts(rows),
  typeCounts: typeCounts(rows),
  conciseReadyCount: rows.filter((row) => row.concise_ready === "yes").length,
  conciseIssueCount: rows.filter((row) => row.concise_ready !== "yes").length,
  preparedWaitingManualSendCount: rows.filter((row) => row.status === "prepared_waiting_manual_send").length,
  fulfilledWaitingFeedbackCount: rows.filter((row) => row.status === "fulfilled_waiting_feedback").length,
  fulfilledSubscriptionNextDueCount: rows.filter((row) => row.status === "fulfilled_subscription_next_due").length,
  needsDeliveryFixCount: rows.filter((row) => row.status === "needs_delivery_fix").length,
  safety: {
    sendsMessages: false,
    collectsPayment: false,
    uploadsFiles: false,
    buildsFrontend: false,
    exposesPrivateBuyerRowsInDocs: false,
    noRevenuePromise: true,
    noViewPromise: true,
    noCredentialRequest: true
  }
};

await mkdir(docsDir, { recursive: true });
await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, "fulfillment-queue.csv"), toCsv(rows, [
  "type",
  "order_id",
  "status",
  "concise_ready",
  "deliverable_count",
  "buyer",
  "contact",
  "channel",
  "product",
  "week",
  "generated_at",
  "next_action",
  "issues",
  "order_dir",
  "completion_receipt"
]), "utf8");
await writeFile(path.join(outDir, "fulfillment-queue.md"), privateMarkdown(rows, generatedAt), "utf8");
await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
await writeFile(path.join(docsDir, "content-fulfillment-queue.md"), publicMarkdown(manifest), "utf8");

if (manifest.needsDeliveryFixCount > 0) {
  console.error(`Content fulfillment queue has ${manifest.needsDeliveryFixCount} delivery fix row(s).`);
  process.exit(1);
}

console.log(`Wrote ${path.join(docsDir, "content-fulfillment-queue.md")}`);
console.log(`Queue rows: ${manifest.queueCount}`);
