import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { argValue } from "./lib/fulfillment.mjs";

const root = process.cwd();
const privateDir = path.join(root, "data", "content-sales-crm");
const testimonialsFile = path.join(privateDir, "testimonials.csv");
const allowedPermissions = new Set(["not_requested", "requested", "explicit", "declined"]);
const allowedStages = new Set(["permission_requested", "needs_review", "publish_ready", "declined", "archived"]);

function compact(value, fallback = "") {
  return String(value || fallback).replace(/\s+/g, " ").trim() || fallback;
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

async function readCsvMaybe(file) {
  try {
    return parseCsv(await readFile(file, "utf8"));
  } catch {
    return [];
  }
}

function keyFor(row) {
  return `${compact(row.source).toLowerCase()}:${compact(row.creator).toLowerCase()}`;
}

function upsert(rows, nextRow, columns) {
  const key = keyFor(nextRow);
  const normalized = rows.map((row) => Object.fromEntries(columns.map((column) => [column, compact(row[column])])));
  const index = normalized.findIndex((row) => keyFor(row) === key);
  if (index >= 0) {
    normalized[index] = { ...normalized[index], ...nextRow };
    return { rows: normalized, action: "updated" };
  }
  return { rows: [...normalized, nextRow], action: "inserted" };
}

const source = compact(argValue("source", ""));
const creator = compact(argValue("creator", ""));
const quote = compact(argValue("quote", ""));
const permission = compact(argValue("permission", "requested"));
const stage = compact(argValue("stage", permission === "explicit" ? "needs_review" : "permission_requested"));
const context = compact(argValue("context", ""));
const nextDue = compact(argValue("next-due", ""));
const notes = compact(argValue("notes", ""));

if (!source || !creator) {
  console.error("Missing required --source and --creator.");
  process.exit(1);
}

if (!allowedPermissions.has(permission)) {
  console.error(`Unsupported permission "${permission}". Allowed: ${[...allowedPermissions].join(", ")}`);
  process.exit(1);
}

if (!allowedStages.has(stage)) {
  console.error(`Unsupported stage "${stage}". Allowed: ${[...allowedStages].join(", ")}`);
  process.exit(1);
}

await mkdir(privateDir, { recursive: true });

const columns = ["source", "creator", "quote", "permission", "stage", "context", "next_due", "notes", "updated_at"];
const row = {
  source,
  creator,
  quote,
  permission,
  stage,
  context,
  next_due: nextDue,
  notes,
  updated_at: new Date().toISOString()
};
const existing = await readCsvMaybe(testimonialsFile);
const result = upsert(existing, row, columns);
await writeFile(testimonialsFile, toCsv(result.rows, columns), "utf8");

console.log(JSON.stringify({
  source,
  creator,
  permission,
  stage,
  action: result.action,
  testimonialCount: result.rows.length,
  file: path.relative(root, testimonialsFile).replace(/\\/g, "/"),
  safety: {
    sendsMessages: false,
    postsTestimonials: false,
    collectsPayment: false,
    writesPrivateIgnoredCrmStateOnly: true,
    requiresExplicitPermissionBeforePublishing: true,
    storesSensitivePaymentData: false
  }
}, null, 2));
