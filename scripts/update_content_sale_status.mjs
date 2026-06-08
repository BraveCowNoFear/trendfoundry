import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { argValue } from "./lib/fulfillment.mjs";

const root = process.cwd();
const privateDir = path.join(root, "data", "content-sales-crm");
const overridesFile = path.join(privateDir, "overrides.csv");
const repliesFile = path.join(privateDir, "replies.csv");
const allowedStages = new Set([
  "draft_review_before_sending",
  "sent_waiting_reply",
  "replied_needs_response",
  "qualified_needs_custom_pack",
  "paid_needs_fulfillment",
  "fulfilled_waiting_feedback",
  "closed_won",
  "not_fit"
]);

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
const stage = compact(argValue("stage", "replied_needs_response"));
const nextDue = compact(argValue("next-due", ""));
const notes = compact(argValue("notes", ""));
const summary = compact(argValue("summary", ""));
const objection = compact(argValue("objection", ""));
const replyStage = compact(argValue("reply-stage", stage));
const replyNotes = compact(argValue("reply-notes", ""));

if (!source || !creator) {
  console.error("Missing required --source and --creator.");
  process.exit(1);
}

if (!allowedStages.has(stage)) {
  console.error(`Unsupported stage "${stage}". Allowed: ${[...allowedStages].join(", ")}`);
  process.exit(1);
}

if (replyStage && !allowedStages.has(replyStage)) {
  console.error(`Unsupported reply stage "${replyStage}". Allowed: ${[...allowedStages].join(", ")}`);
  process.exit(1);
}

await mkdir(privateDir, { recursive: true });

const overrideColumns = ["source", "creator", "stage", "next_due", "notes"];
const replyColumns = ["source", "creator", "summary", "objection", "stage", "notes"];
const overrideRow = {
  source,
  creator,
  stage,
  next_due: nextDue,
  notes
};
const existingOverrides = await readCsvMaybe(overridesFile);
const overrideResult = upsert(existingOverrides, overrideRow, overrideColumns);
await writeFile(overridesFile, toCsv(overrideResult.rows, overrideColumns), "utf8");

let replyAction = "skipped";
let replyCount = 0;
if (summary || objection || replyNotes) {
  const replyRow = {
    source,
    creator,
    summary,
    objection,
    stage: replyStage,
    notes: replyNotes
  };
  const existingReplies = await readCsvMaybe(repliesFile);
  const replyResult = upsert(existingReplies, replyRow, replyColumns);
  await writeFile(repliesFile, toCsv(replyResult.rows, replyColumns), "utf8");
  replyAction = replyResult.action;
  replyCount = replyResult.rows.length;
}

const manifest = {
  source,
  creator,
  stage,
  next_due: nextDue,
  overrideAction: overrideResult.action,
  overrideCount: overrideResult.rows.length,
  replyAction,
  replyCount,
  files: [
    path.relative(root, overridesFile).replace(/\\/g, "/"),
    ...(replyAction === "skipped" ? [] : [path.relative(root, repliesFile).replace(/\\/g, "/")])
  ],
  safety: {
    sendsMessages: false,
    postsContent: false,
    collectsPayment: false,
    writesPrivateIgnoredCrmStateOnly: true,
    storesSensitivePaymentData: false
  }
};

console.log(JSON.stringify(manifest, null, 2));
