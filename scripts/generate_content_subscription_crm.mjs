import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const outDir = path.join(root, "dist", "content-subscription-crm");
const privateDir = path.join(root, "data", "content-subscriptions");
const privateSubscribersFile = path.join(privateDir, "subscribers.csv");
const templateFile = path.join(outDir, "subscribers.template.csv");

const templateColumns = [
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
  return String(value || fallback).replace(/\s+/g, " ").trim();
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

async function readTextMaybe(file, fallback = "") {
  try {
    return await readFile(file, "utf8");
  } catch {
    return fallback;
  }
}

async function readJsonMaybe(relativePath, fallback = {}) {
  try {
    return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
  } catch {
    return fallback;
  }
}

async function readCsvMaybe(file) {
  const text = await readTextMaybe(file, "");
  return text ? parseCsv(text) : [];
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function parseDate(value) {
  const text = compact(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function compareIso(left, right) {
  return String(left || "").localeCompare(String(right || ""));
}

function numberValue(value, fallback = 0) {
  const number = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(number) ? number : fallback;
}

function planWeek(calendarRows, weekValue) {
  if (!calendarRows.length) return { week: String(weekValue || 1), delivery_date: isoDate(new Date()) };
  const weekNumber = Math.max(1, numberValue(weekValue, 1));
  const index = (weekNumber - 1) % calendarRows.length;
  return calendarRows[index] || calendarRows[0];
}

function shellQuote(value) {
  return `"${String(value ?? "").replace(/"/g, "`\"")}"`;
}

function nextWeek(row) {
  const explicit = numberValue(row.current_week, 0);
  if (explicit > 0) return explicit;
  const last = numberValue(row.last_delivered_week, 0);
  return Math.max(1, last + 1);
}

function normalizeSubscriber(row, calendarRows, todayIso) {
  const week = nextWeek(row);
  const planRow = planWeek(calendarRows, week);
  const deliveryDate = compact(row.next_delivery_date, planRow.delivery_date || todayIso);
  const paidThrough = compact(row.paid_through);
  const paymentRef = compact(row.payment_ref);
  const status = compact(row.status, "active").toLowerCase();
  const paymentCurrent = Boolean(paymentRef) && paidThrough && compareIso(paidThrough, deliveryDate) >= 0;
  const due = compareIso(deliveryDate, todayIso) <= 0;
  const renewalSoon = paidThrough && compareIso(paidThrough, todayIso) >= 0 && compareIso(paidThrough, isoDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))) <= 0;
  let action = "watch";
  if (["cancelled", "churned", "inactive"].includes(status)) action = "inactive";
  else if (due && paymentCurrent) action = "prepare_delivery";
  else if (due && !paymentCurrent) action = "payment_review_before_delivery";
  else if (renewalSoon) action = "renewal_check";
  else action = "upcoming";

  const subscriberId = compact(row.subscriber_id, compact(row.contact, row.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "subscriber");
  const command = action === "prepare_delivery"
    ? `npm run fulfill-content-subscription -- --subscriber=${shellQuote(compact(row.name, subscriberId))} --contact=${shellQuote(compact(row.contact, "not-provided"))} --channel=${shellQuote(compact(row.channel, "not-provided"))} --week=${shellQuote(String(week))} --payment-ref=${shellQuote(paymentRef)} --order-id=${shellQuote(`${deliveryDate}-${subscriberId}-week-${week}`)}`
    : "";

  return {
    subscriber_id: subscriberId,
    name: compact(row.name, subscriberId),
    contact: compact(row.contact, "not-provided"),
    channel: compact(row.channel, "not-provided"),
    product_sku: compact(row.product_sku, "trendfoundry-proof-weekly"),
    status,
    start_date: compact(row.start_date),
    week,
    delivery_date: deliveryDate,
    paid_through: paidThrough || "not-provided",
    payment_ref: paymentRef || "not-provided",
    last_sent_at: compact(row.last_sent_at),
    action,
    command,
    notes: compact(row.notes)
  };
}

function privatePipeline(rows, generatedAt) {
  return `# TrendFoundry Private Subscription Pipeline

Generated: ${generatedAt}

This file may contain subscriber contacts and should stay inside ignored dist output.

| Subscriber | Status | Week | Delivery | Paid through | Action |
| --- | --- | ---: | --- | --- | --- |
${rows.map((row) => `| ${row.name.replace(/\|/g, "/")} | ${row.status} | ${row.week} | ${row.delivery_date} | ${row.paid_through} | ${row.action} |`).join("\n") || "| none | none | 0 | none | none | none |"}

## Fulfillment Commands

${rows.filter((row) => row.command).map((row) => `\`\`\`powershell\n${row.command}\n\`\`\``).join("\n\n") || "No subscriber delivery is ready today."}
`;
}

function publicDoc({ generatedAt, subscriberCount, dueCount, blockedCount, renewalCount, upcomingCount, planManifest }) {
  return `# TrendFoundry Content Subscription CRM

Generated: ${generatedAt}

This is the content-only CRM for the USD ${planManifest.priceUsd || 19}/month weekly proof pack. It reads private subscriber status from ignored local files, then prepares due delivery queues and fulfillment commands without exposing subscriber contacts in tracked docs.

## Private Input

\`data/content-subscriptions/subscribers.csv\`

The file is ignored by Git. Use \`dist/content-subscription-crm/subscribers.template.csv\` as the schema. Keep contacts, payment references, subscriber notes, and delivery history out of tracked files.

## Current Counts

- Private subscriber rows: ${subscriberCount}
- Ready to prepare today: ${dueCount}
- Needs payment review before delivery: ${blockedCount}
- Renewal check due soon: ${renewalCount}
- Upcoming active deliveries: ${upcomingCount}

## Operator Flow

1. Run \`npm run content-subscription\` to refresh the four-week content calendar.
2. After external subscription/payment confirmation, run \`npm run record-content-subscription -- --subscriber="Buyer Name" --contact="buyer@example.com" --channel="https://youtube.com/@buyer" --payment-ref="external-confirmation-id"\`.
3. Run \`npm run content-subscription-crm\`.
4. Review \`dist/content-subscription-crm/due-queue.md\`.
5. Run only the fulfillment commands marked \`prepare_delivery\`.
6. Review each generated \`weekly-proof-pack.md\` and \`subscriber-email.md\` before sending.
7. After delivery, update \`last_delivered_week\`, \`last_sent_at\`, and \`next_delivery_date\` in the ignored subscriber file.

## Safety Boundary

- Does not send messages.
- Does not collect payment.
- Does not upload files.
- Does not build or overwrite the frontend.
- Does not expose private subscriber rows in tracked docs.
- Requires external subscription/payment confirmation before preparing buyer delivery.
- Does not promise views, subscribers, revenue, platform growth, or buyer outcomes.
`;
}

const generatedAt = new Date().toISOString();
const todayIso = process.env.TRENDFOUNDRY_TODAY || isoDate(new Date());
const calendarRows = parseCsv(await readTextMaybe(path.join(root, "dist", "content-subscription-plan", "calendar.csv"), ""));
const planManifest = await readJsonMaybe("dist/content-subscription-plan/manifest.json", {});
const privateRows = (await readCsvMaybe(privateSubscribersFile)).filter((row) => compact(row.name) || compact(row.contact) || compact(row.subscriber_id));
const rows = privateRows.map((row) => normalizeSubscriber(row, calendarRows, todayIso));
const dueRows = rows.filter((row) => row.action === "prepare_delivery");
const blockedRows = rows.filter((row) => row.action === "payment_review_before_delivery");
const renewalRows = rows.filter((row) => row.action === "renewal_check");
const upcomingRows = rows.filter((row) => row.action === "upcoming");
const inactiveRows = rows.filter((row) => row.action === "inactive");

const queueColumns = [
  "subscriber_id",
  "name",
  "contact",
  "channel",
  "product_sku",
  "status",
  "week",
  "delivery_date",
  "paid_through",
  "payment_ref",
  "action",
  "command",
  "notes"
];

const templateRows = [{
  subscriber_id: "example-weekly-buyer",
  name: "Example Buyer",
  contact: "buyer@example.com",
  channel: "https://youtube.com/@example",
  product_sku: "trendfoundry-proof-weekly",
  status: "active",
  start_date: todayIso,
  last_delivered_week: "0",
  next_delivery_date: todayIso,
  paid_through: todayIso,
  payment_ref: "external-confirmation-id",
  last_sent_at: "",
  notes: "Replace this row in the ignored private file."
}];

const manifest = {
  generatedAt,
  today: todayIso,
  privateInput: path.relative(root, privateSubscribersFile).replace(/\\/g, "/"),
  subscriberCount: rows.length,
  dueCount: dueRows.length,
  blockedCount: blockedRows.length,
  renewalCount: renewalRows.length,
  upcomingCount: upcomingRows.length,
  inactiveCount: inactiveRows.length,
  productSku: "trendfoundry-proof-weekly",
  planGeneratedAt: planManifest.generatedAt,
  buyerDeliverables: ["weekly-proof-pack.md", "subscriber-email.md"],
  safety: {
    sendsMessages: false,
    collectsPayment: false,
    uploadsFiles: false,
    buildsFrontend: false,
    exposesPrivateSubscribersInDocs: false,
    requiresExternalSubscriptionConfirmation: true,
    noRevenuePromise: true,
    noViewPromise: true,
    noCredentialRequest: true
  }
};

await mkdir(docsDir, { recursive: true });
await mkdir(outDir, { recursive: true });
await writeFile(templateFile, toCsv(templateRows, templateColumns), "utf8");
await writeFile(path.join(outDir, "due-queue.csv"), toCsv(rows, queueColumns), "utf8");
await writeFile(path.join(outDir, "due-queue.md"), privatePipeline(rows, generatedAt), "utf8");
await writeFile(path.join(outDir, "fulfillment-commands.ps1"), dueRows.map((row) => row.command).filter(Boolean).join("\n"), "utf8");
await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
await writeFile(path.join(docsDir, "content-subscription-crm.md"), publicDoc({
  generatedAt,
  subscriberCount: rows.length,
  dueCount: dueRows.length,
  blockedCount: blockedRows.length,
  renewalCount: renewalRows.length,
  upcomingCount: upcomingRows.length,
  planManifest
}), "utf8");

console.log(`Wrote ${path.join(docsDir, "content-subscription-crm.md")}`);
console.log(`Subscription CRM rows: ${rows.length}, ready today: ${dueRows.length}, payment review: ${blockedRows.length}`);
