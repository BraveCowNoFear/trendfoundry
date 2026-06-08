import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { argValue, contactEmail, slug } from "./lib/fulfillment.mjs";

const root = process.cwd();

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

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function readCsv(file) {
  return parseCsv(await readFile(file, "utf8"));
}

function pickWeek(rows, value) {
  const week = String(value || "1").trim();
  return rows.find((row) => String(row.week) === week) || rows[0];
}

function markdownPack({ weekRow, subscriberName, channel, backupRows }) {
  return `# TrendFoundry Weekly Proof Pack

Subscriber: ${subscriberName}
Channel/context: ${channel}
Week: ${weekRow.week}
Delivery date: ${weekRow.delivery_date}

## Lead Episode

- Theme: ${weekRow.theme}
- Lead episode: ${weekRow.lead_episode}
- Source: ${weekRow.source}
- Proof URL: ${weekRow.proof_url}
- Proof asset: ${weekRow.proof_asset}
- Subscriber value: ${weekRow.subscriber_value}
- Retention note: ${weekRow.retention_note}
- Safety line: ${weekRow.safety_line}

## Recording Checklist

- [ ] Open the source URL and verify it still matches the title.
- [ ] Capture the proof asset listed above.
- [ ] Record one visible input and one visible output.
- [ ] Add one limitation card using the safety line.
- [ ] Keep the claim narrow; do not imply platform or revenue outcomes.

## Backup Candidates

${backupRows.map((row) => `- Week ${row.week}: ${row.lead_episode} (${row.source})`).join("\n")}

## Buyer Note

This is a creator planning and production aid. It does not promise views, subscribers, revenue, platform growth, or buyer outcomes.
`;
}

function emailDraft({ weekRow, subscriberName, subscriberContact, channel }) {
  return `# Subscriber Delivery Email

To: ${subscriberContact}
Subject: TrendFoundry weekly proof pack - Week ${weekRow.week}

Hi ${subscriberName},

This week's TrendFoundry proof pack is ready for ${channel}.

Start with: ${weekRow.lead_episode}
Source: ${weekRow.proof_url}
Proof to record: ${weekRow.proof_asset}

Why this week:
${weekRow.retention_note}

What is attached:
- weekly-proof-pack.md
- subscriber-email.md

Safety note: ${weekRow.safety_line}

This is a creator planning and production aid. It does not promise views, subscribers, revenue, platform growth, or buyer outcomes.

Best,
TrendFoundry
${contactEmail}
`;
}

const subscriberName = argValue("subscriber", argValue("buyer", "subscriber"));
const subscriberContact = argValue("contact", "not-provided");
const channel = argValue("channel", "not-provided");
const weekValue = argValue("week", "1");
const paymentRef = argValue("payment-ref", "not-provided");
const product = "trendfoundry-proof-weekly";
const orderId = argValue("order-id", `${new Date().toISOString().slice(0, 10)}-${slug(subscriberName)}-${product}-week-${slug(weekValue)}`);

const planDir = path.join(root, "dist", "content-subscription-plan");
const orderDir = path.join(root, "dist", "content-subscriptions", orderId);
const calendarRows = await readCsv(path.join(planDir, "calendar.csv"));
const planManifest = await readJson(path.join(planDir, "manifest.json"));
const weekRow = pickWeek(calendarRows, weekValue);
const backupRows = calendarRows.filter((row) => row.week !== weekRow.week).slice(0, 3);

await mkdir(orderDir, { recursive: true });

const buyerDeliverables = ["weekly-proof-pack.md", "subscriber-email.md"];
const manifest = {
  product: "TrendFoundry Proof-First Weekly Pack",
  productSku: product,
  orderId,
  generatedAt: new Date().toISOString(),
  subscriber: {
    name: subscriberName,
    contact: subscriberContact,
    channel,
    week: weekRow.week,
    paymentRef
  },
  planGeneratedAt: planManifest.generatedAt,
  deliveryDate: weekRow.delivery_date,
  buyerDeliverables,
  sourceFiles: {
    calendar: path.join(planDir, "calendar.csv"),
    planManifest: path.join(planDir, "manifest.json")
  },
  safety: {
    sendsMessages: false,
    chargesBuyer: false,
    uploadsFiles: false,
    paymentExternallyConfirmed: paymentRef !== "not-provided",
    noRevenuePromise: true,
    noViewPromise: true,
    noCredentialRequest: true
  },
  reviewBeforeSending: [
    "Confirm external subscription/payment status before sending.",
    "Attach only weekly-proof-pack.md and subscriber-email.md unless the buyer requested older issues.",
    "Do not attach manifest.json if the delivery channel is public.",
    "Do not attach CRM, prospecting, raw snapshots, account data, or sensitive payment data.",
    "Do not promise views, subscribers, revenue, platform growth, or buyer outcomes."
  ]
};

const checklist = `# Weekly Subscription Fulfillment Checklist

- [ ] External payment/subscription confirmation checked: ${paymentRef}
- [ ] Subscriber contact is correct: ${subscriberContact}
- [ ] Subscriber channel/context is correct: ${channel}
- [ ] Week selected: ${weekRow.week}
- [ ] Delivery date checked: ${weekRow.delivery_date}
- [ ] Only buyer deliverables are attached.
- [ ] Delivery email reviewed.
- [ ] Local subscriber status updated after sending.

Order directory: ${orderDir}
`;

await writeFile(path.join(orderDir, "weekly-proof-pack.md"), markdownPack({ weekRow, subscriberName, channel, backupRows }), "utf8");
await writeFile(path.join(orderDir, "subscriber-email.md"), emailDraft({ weekRow, subscriberName, subscriberContact, channel }), "utf8");
await writeFile(path.join(orderDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
await writeFile(path.join(orderDir, "fulfillment-checklist.md"), checklist, "utf8");
await writeFile(path.join(orderDir, "backup-candidates.csv"), toCsv(backupRows, ["week", "delivery_date", "theme", "lead_episode", "source", "proof_url", "proof_asset"]), "utf8");

console.log(`Weekly subscription delivery prepared: ${orderDir}`);
console.log(`Files: ${[...buyerDeliverables, "backup-candidates.csv", "manifest.json", "fulfillment-checklist.md"].join(", ")}`);
