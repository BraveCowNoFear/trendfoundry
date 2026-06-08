import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { argValue, slug } from "./lib/fulfillment.mjs";

const root = process.cwd();
const privateDir = path.join(root, "data", "content-subscriptions");
const subscribersFile = path.join(privateDir, "subscribers.csv");
const docsDir = path.join(root, "docs");
const outDir = path.join(root, "dist", "email-subscription-sync");

const columns = [
  "subscriber_id",
  "name",
  "contact",
  "channel",
  "product_sku",
  "status",
  "start_date",
  "last_delivered_week",
  "next_delivery_date",
  "paid_through",
  "payment_ref",
  "last_sent_at",
  "notes"
];

function compact(value, fallback = "") {
  return String(value || fallback).replace(/\s+/g, " ").trim() || fallback;
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows, headerColumns) {
  return [headerColumns.join(","), ...rows.map((row) => headerColumns.map((column) => csvEscape(row[column])).join(","))].join("\n");
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

async function readTextMaybe(file) {
  try {
    return await readFile(file, "utf8");
  } catch {
    return "";
  }
}

async function readJsonMaybe(file, fallback) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function addMonthsIso(value, months) {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  date.setUTCMonth(date.getUTCMonth() + months);
  return isoDate(date);
}

function isPaidWeeklyOrder(order) {
  return order.stage === "paid_needs_fulfillment" && order.tier === "weekly-brief";
}

function subscriberFromOrder(order, todayIso, firstDeliveryDate) {
  const contact = compact(order.buyerContact, "not-provided");
  const name = compact(order.buyerName, contact);
  const subscriberId = slug(contact !== "not-provided" ? contact : `${order.orderId}-${name}`);
  return {
    subscriber_id: subscriberId,
    name,
    contact,
    channel: compact(order.channel, "not-provided"),
    product_sku: "trendfoundry-proof-weekly",
    status: "active",
    start_date: todayIso,
    last_delivered_week: "0",
    next_delivery_date: firstDeliveryDate,
    paid_through: addMonthsIso(todayIso, 1),
    payment_ref: compact(order.orderId, "email-order-paid"),
    last_sent_at: "",
    notes: `Synced from paid email order ${compact(order.orderId, "unknown")}; source ${compact(order.sourceFile, "unknown")}; niche ${compact(order.niche, "not-provided")}`
  };
}

function mergeSubscribers(existingRows, incomingRows) {
  const rows = [...existingRows];
  for (const row of incomingRows) {
    const matchIndex = rows.findIndex((existing) => compact(existing.subscriber_id) === row.subscriber_id || compact(existing.contact).toLowerCase() === row.contact.toLowerCase());
    if (matchIndex >= 0) rows[matchIndex] = { ...rows[matchIndex], ...row };
    else rows.push(row);
  }
  rows.sort((left, right) => compact(left.subscriber_id).localeCompare(compact(right.subscriber_id)));
  return rows;
}

function publicDoc({ generatedAt, totalOrders, paidWeeklyOrders, syncedCount, skippedCount }) {
  return `# TrendFoundry Email Subscription Sync

Generated: ${generatedAt}

This local automation turns paid email orders for the monthly weekly pack into ignored subscription CRM rows. It does not expose buyer contacts in tracked docs.

## Current Counts

- Email orders reviewed: ${totalOrders}
- Paid weekly orders: ${paidWeeklyOrders}
- Subscription rows synced: ${syncedCount}
- Skipped orders: ${skippedCount}

## Operator Flow

1. Put copied order emails in ignored \`data/email-orders/\`.
2. Run \`npm run intake-email-orders\`.
3. After external payment confirmation, ensure the order text includes \`Paid: yes\`, \`Payment confirmed\`, or \`Stage: paid\`.
4. Run \`npm run sync-email-subscriptions\`.
5. Run \`npm run content-subscription-crm\` and \`npm run content-subscription-due\`.

## Safety Boundary

- Does not connect to an inbox.
- Does not send messages.
- Does not collect payment.
- Does not upload files.
- Does not build or overwrite the frontend.
- Does not expose private subscriber rows in tracked docs.
- Requires paid email order stage before syncing.
- Does not request sensitive payment or account data.
- Does not promise views, subscribers, revenue, platform growth, or buyer outcomes.
`;
}

const todayIso = process.env.TRENDFOUNDRY_TODAY || isoDate(new Date());
const intakeFile = path.isAbsolute(argValue("intake-file", "")) ? argValue("intake-file") : path.join(root, argValue("intake-file", "dist/email-order-intake/orders.json"));
const intake = await readJsonMaybe(intakeFile, { orders: [] });
const orders = intake.orders || [];
const paidWeeklyOrders = orders.filter(isPaidWeeklyOrder);
const firstDeliveryDate = compact(argValue("first-delivery-date", todayIso));
const incomingRows = paidWeeklyOrders.map((order) => subscriberFromOrder(order, todayIso, firstDeliveryDate));
const existingRows = parseCsv(await readTextMaybe(subscribersFile));
const mergedRows = mergeSubscribers(existingRows, incomingRows);
const skippedOrders = orders.filter((order) => !isPaidWeeklyOrder(order));
const generatedAt = new Date().toISOString();
const manifest = {
  generatedAt,
  intakeFile: path.relative(root, intakeFile).replace(/\\/g, "/"),
  totalOrders: orders.length,
  paidWeeklyOrders: paidWeeklyOrders.length,
  syncedCount: incomingRows.length,
  skippedCount: skippedOrders.length,
  privateOutput: path.relative(root, subscribersFile).replace(/\\/g, "/"),
  safety: {
    sendsMessages: false,
    collectsPayment: false,
    uploadsFiles: false,
    buildsFrontend: false,
    exposesPrivateSubscribersInDocs: false,
    requiresPaidEmailOrder: true,
    noRevenuePromise: true,
    noViewPromise: true,
    noCredentialRequest: true
  }
};

await mkdir(docsDir, { recursive: true });
await mkdir(outDir, { recursive: true });
if (mergedRows.length) {
  await mkdir(privateDir, { recursive: true });
  await writeFile(subscribersFile, `${toCsv(mergedRows, columns)}\n`, "utf8");
} else {
  await rm(subscribersFile, { force: true });
}
await writeFile(path.join(outDir, "synced.csv"), toCsv(incomingRows.map((row) => ({
  subscriber_id: row.subscriber_id,
  status: row.status,
  product_sku: row.product_sku,
  next_delivery_date: row.next_delivery_date,
  paid_through: row.paid_through,
  payment_ref: row.payment_ref
})), ["subscriber_id", "status", "product_sku", "next_delivery_date", "paid_through", "payment_ref"]), "utf8");
await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
await writeFile(path.join(docsDir, "email-subscription-sync.md"), publicDoc({
  generatedAt,
  totalOrders: orders.length,
  paidWeeklyOrders: paidWeeklyOrders.length,
  syncedCount: incomingRows.length,
  skippedCount: skippedOrders.length
}), "utf8");

console.log(`Email subscription sync rows: ${incomingRows.length}`);
console.log(`Wrote ${path.join(docsDir, "email-subscription-sync.md")}`);
