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

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDaysIso(value, days) {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  date.setUTCDate(date.getUTCDate() + days);
  return isoDate(date);
}

function parseOrderPath() {
  const orderPath = compact(argValue("order", argValue("order-dir", "")));
  const orderId = compact(argValue("order-id", ""));
  if (orderPath) return path.resolve(root, orderPath);
  if (orderId) return path.join(root, "dist", "content-subscriptions", orderId);
  console.error("Missing order reference. Pass --order=\"dist/content-subscriptions/<order-id>\" or --order-id=\"...\".");
  process.exit(1);
}

async function nextPlanDeliveryDate(currentWeek, fallbackDate) {
  const calendarText = await readTextMaybe(path.join(root, "dist", "content-subscription-plan", "calendar.csv"));
  const rows = parseCsv(calendarText);
  if (!rows.length) return addDaysIso(fallbackDate, 7);
  const nextWeek = Number.parseInt(String(currentWeek || "0"), 10) + 1;
  const planned = rows.find((row) => String(row.week) === String(nextWeek));
  if (planned?.delivery_date) return planned.delivery_date;
  return addDaysIso(fallbackDate, 7);
}

const today = process.env.TRENDFOUNDRY_TODAY || isoDate(new Date());
const orderDir = parseOrderPath();
const manifest = await readJson(path.join(orderDir, "manifest.json"));
const subscriber = manifest.subscriber || {};
const subscriberName = compact(argValue("subscriber", subscriber.name || ""));
const contact = compact(argValue("contact", subscriber.contact || ""));
const subscriberId = compact(argValue("subscriber-id", slug(contact || subscriberName || "subscriber")));
const deliveredWeek = compact(argValue("week", subscriber.week || ""));
const deliveryDate = compact(argValue("delivery-date", manifest.deliveryDate || today));
const nextDeliveryDate = compact(argValue("next-delivery-date", await nextPlanDeliveryDate(deliveredWeek, deliveryDate)));
const sentAt = compact(argValue("sent-at", new Date().toISOString()));
const paymentRef = compact(argValue("payment-ref", subscriber.paymentRef || ""));
const status = compact(argValue("status", "active")).toLowerCase();

if (!subscriberName && !contact) {
  console.error("Order manifest does not contain subscriber identity. Pass --subscriber or --contact.");
  process.exit(1);
}

await mkdir(privateDir, { recursive: true });

const existingRows = parseCsv(await readTextMaybe(subscribersFile));
const matchIndex = existingRows.findIndex((row) => compact(row.subscriber_id) === subscriberId || (contact && compact(row.contact).toLowerCase() === contact.toLowerCase()));
const previous = matchIndex >= 0 ? existingRows[matchIndex] : {};
const updated = {
  subscriber_id: compact(previous.subscriber_id, subscriberId),
  name: compact(previous.name, subscriberName || subscriberId),
  contact: compact(previous.contact, contact || "not-provided"),
  channel: compact(previous.channel, subscriber.channel || "not-provided"),
  product_sku: compact(previous.product_sku, manifest.productSku || "trendfoundry-proof-weekly"),
  status,
  start_date: compact(previous.start_date, today),
  last_delivered_week: deliveredWeek,
  next_delivery_date: nextDeliveryDate,
  paid_through: compact(previous.paid_through),
  payment_ref: compact(paymentRef, previous.payment_ref),
  last_sent_at: sentAt,
  notes: compact(previous.notes)
};

const rows = [...existingRows];
if (matchIndex >= 0) rows[matchIndex] = updated;
else rows.push(updated);
rows.sort((left, right) => compact(left.subscriber_id).localeCompare(compact(right.subscriber_id)));

await writeFile(subscribersFile, `${toCsv(rows, columns)}\n`, "utf8");

console.log(`Completed subscription delivery: ${orderDir}`);
console.log(`Subscriber: ${updated.subscriber_id}`);
console.log(`Delivered week: ${deliveredWeek}`);
console.log(`Next delivery: ${nextDeliveryDate}`);
console.log("Run npm run content-subscription-crm to refresh the due queue.");
