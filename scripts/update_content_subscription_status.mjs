import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { argValue, slug } from "./lib/fulfillment.mjs";

const root = process.cwd();
const privateDir = path.join(root, "data", "content-subscriptions");
const subscribersFile = path.join(privateDir, "subscribers.csv");

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
  return String(value || fallback).replace(/\s+/g, " ").trim();
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

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function nextMonthIso(date) {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + 1);
  return isoDate(next);
}

async function firstPlanDeliveryDate(fallbackDate) {
  const calendarText = await readTextMaybe(path.join(root, "dist", "content-subscription-plan", "calendar.csv"));
  const rows = parseCsv(calendarText);
  return compact(rows[0]?.delivery_date, fallbackDate);
}

const today = process.env.TRENDFOUNDRY_TODAY || isoDate(new Date());
const subscriberName = compact(argValue("subscriber", argValue("buyer", "")));
const contact = compact(argValue("contact", ""));
const channel = compact(argValue("channel", "not-provided"));
const subscriberId = compact(argValue("subscriber-id", slug(contact || subscriberName || "subscriber")));
const status = compact(argValue("status", "active")).toLowerCase();
const productSku = compact(argValue("product", "trendfoundry-proof-weekly"));
const paymentRef = compact(argValue("payment-ref", ""));
const paidThrough = compact(argValue("paid-through", paymentRef ? nextMonthIso(new Date(`${today}T00:00:00Z`)) : ""));
const startDate = compact(argValue("start-date", today));
const lastDeliveredWeek = compact(argValue("last-delivered-week", "0"));
const nextDeliveryDate = compact(argValue("next-delivery-date", await firstPlanDeliveryDate(today)));
const lastSentAt = compact(argValue("last-sent-at", ""));
const notes = compact(argValue("notes", ""));

if (!subscriberName && !contact) {
  console.error("Missing subscriber identity. Pass --subscriber or --contact.");
  process.exit(1);
}

await mkdir(privateDir, { recursive: true });

const existingRows = parseCsv(await readTextMaybe(subscribersFile));
const row = {
  subscriber_id: subscriberId,
  name: subscriberName || subscriberId,
  contact: contact || "not-provided",
  channel,
  product_sku: productSku,
  status,
  start_date: startDate,
  last_delivered_week: lastDeliveredWeek,
  next_delivery_date: nextDeliveryDate,
  paid_through: paidThrough,
  payment_ref: paymentRef,
  last_sent_at: lastSentAt,
  notes
};

const matchIndex = existingRows.findIndex((existing) => compact(existing.subscriber_id) === subscriberId || (contact && compact(existing.contact).toLowerCase() === contact.toLowerCase()));
const rows = [...existingRows];
if (matchIndex >= 0) {
  rows[matchIndex] = { ...rows[matchIndex], ...row };
} else {
  rows.push(row);
}

rows.sort((left, right) => compact(left.subscriber_id).localeCompare(compact(right.subscriber_id)));
await writeFile(subscribersFile, `${toCsv(rows, columns)}\n`, "utf8");

console.log(`Updated private subscription status: ${subscribersFile}`);
console.log(`Subscriber: ${subscriberId}`);
console.log(`Status: ${status}`);
console.log(`Next delivery: ${nextDeliveryDate}`);
console.log("Run npm run content-subscription-crm to refresh the due queue.");
