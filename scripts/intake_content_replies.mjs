import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const privateDir = path.join(root, "data", "content-sales-crm");
const inboxDir = path.join(privateDir, "reply-inbox");
const outDir = path.join(root, "dist", "content-reply-intake");
const repliesFile = path.join(privateDir, "replies.csv");
const overridesFile = path.join(privateDir, "overrides.csv");
const allowedStages = new Set([
  "replied_needs_response",
  "qualified_needs_custom_pack",
  "paid_needs_fulfillment",
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

async function listInboxFiles() {
  try {
    return (await readdir(inboxDir, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && /\.(txt|md|eml)$/i.test(entry.name))
      .map((entry) => path.join(inboxDir, entry.name))
      .sort();
  } catch {
    return [];
  }
}

function headerValue(text, name) {
  const pattern = new RegExp(`^${name}:\\s*(.+)$`, "im");
  return compact(text.match(pattern)?.[1] || "");
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function inferSource(text, file) {
  const explicit = headerValue(text, "Source");
  if (explicit) return explicit.toLowerCase();
  const combined = `${text} ${path.basename(file)}`.toLowerCase();
  if (combined.includes("bilibili")) return "bilibili";
  if (combined.includes("youtube") || combined.includes("youtu.be")) return "youtube";
  if (combined.includes("github")) return "github";
  return "";
}

function inferCreator(text, file) {
  return headerValue(text, "Creator") || headerValue(text, "Buyer") || headerValue(text, "From") || path.basename(file, path.extname(file)).replace(/[-_]+/g, " ");
}

function inferStage(text) {
  const explicit = headerValue(text, "Stage");
  if (allowedStages.has(explicit)) return explicit;
  const normalized = text.toLowerCase();
  if (/not interested|stop contacting|unsubscribe|not fit|irrelevant/.test(normalized)) return "not_fit";
  if (/custom|niche|specific|tailor|audience/.test(normalized)) return "qualified_needs_custom_pack";
  return "replied_needs_response";
}

function inferObjection(text) {
  const explicit = headerValue(text, "Objection");
  if (explicit) return explicit;
  const normalized = text.toLowerCase();
  if (/price|expensive|budget|cost|\$/.test(normalized)) return "price_sensitive";
  if (/custom|niche|specific|tailor|audience/.test(normalized)) return "wants_narrower_niche";
  if (/weekly|subscription|monthly|recurring/.test(normalized)) return "asks_for_recurring_help";
  if (/sample|proof|demo|example|quality/.test(normalized)) return "asks_for_more_proof";
  if (/not interested|stop contacting|unsubscribe|not fit|irrelevant/.test(normalized)) return "not_fit";
  return "uncategorized";
}

function summarize(text) {
  const explicit = headerValue(text, "Summary");
  if (explicit) return explicit;
  const body = text
    .split(/\r?\n/)
    .filter((line) => !/^(source|creator|buyer|from|stage|summary|objection|next-due|notes):/i.test(line.trim()))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  return body.slice(0, 260) || "Reply captured from local inbox.";
}

function safeId(file) {
  return path.basename(file).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90) || "reply";
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
    return normalized;
  }
  return [...normalized, nextRow];
}

function publicDoc({ parsed, skipped }) {
  const stages = Object.fromEntries([...new Set(parsed.map((row) => row.stage))].map((stage) => [stage, parsed.filter((row) => row.stage === stage).length]));
  return `# TrendFoundry Content Reply Intake

Generated: ${new Date().toISOString()}

This step parses copied creator/buyer replies from ignored \`data/content-sales-crm/reply-inbox/\` and updates ignored local CRM reply/status files. Private reply text stays in ignored data/dist folders.

## Current Counts

- Inbox replies parsed: ${parsed.length}
- Skipped files: ${skipped.length}
- Stage mix: ${Object.entries(stages).map(([stage, count]) => `${stage}=${count}`).join(", ") || "none"}
- Private output: \`dist/content-reply-intake/parsed-replies.md\`

## Inbox Format

Use a local \`.txt\` or \`.md\` file:

\`\`\`text
Source: youtube
Creator: Creator Name
Stage: replied_needs_response
Summary: Short safe summary of the reply
Objection: price_sensitive

Raw copied reply text...
\`\`\`

## Safety Boundary

- Does not send messages.
- Does not collect payment.
- Does not treat payment as confirmed unless the stage is explicitly set.
- Does not publish private reply text.
- Does not request sensitive payment or account data.
- Does not promise views, subscribers, revenue, platform growth, or buyer outcomes.
`;
}

function privateMarkdown(parsed, skipped) {
  return `# TrendFoundry Content Reply Intake

Generated: ${new Date().toISOString()}

Private local parsed reply log. Do not publish.

## Parsed Replies

| File | Source | Creator | Stage | Objection | Summary |
| --- | --- | --- | --- | --- | --- |
${parsed.map((row) => `| ${row.file} | ${row.source} | ${row.creator.replace(/\|/g, "/")} | ${row.stage} | ${row.objection} | ${row.summary.replace(/\|/g, "/")} |`).join("\n") || "| - | - | - | - | - | No inbox replies parsed. |"}

## Skipped

${skipped.map((row) => `- ${row.file}: ${row.reason}`).join("\n") || "- No skipped files."}
`;
}

await mkdir(docsDir, { recursive: true });
await mkdir(privateDir, { recursive: true });
await mkdir(outDir, { recursive: true });

const files = await listInboxFiles();
const parsed = [];
const skipped = [];

for (const file of files) {
  const text = await readFile(file, "utf8");
  const source = inferSource(text, file);
  const creator = inferCreator(text, file);
  if (!source || !creator) {
    skipped.push({ file: path.relative(root, file).replace(/\\/g, "/"), reason: "missing_source_or_creator" });
    continue;
  }
  const stage = inferStage(text);
  const summary = summarize(text);
  const objection = inferObjection(text);
  parsed.push({
    reply_id: safeId(file),
    file: path.relative(root, file).replace(/\\/g, "/"),
    source,
    creator,
    summary,
    objection,
    stage,
    next_due: headerValue(text, "Next-Due") || addDays(new Date(), stage === "not_fit" ? 0 : 0),
    notes: headerValue(text, "Notes") || `Parsed from ${path.basename(file)}`
  });
}

if (parsed.length) {
  const replyColumns = ["source", "creator", "summary", "objection", "stage", "notes"];
  const overrideColumns = ["source", "creator", "stage", "next_due", "notes"];
  let replies = await readCsvMaybe(repliesFile);
  let overrides = await readCsvMaybe(overridesFile);
  for (const row of parsed) {
    replies = upsert(replies, {
      source: row.source,
      creator: row.creator,
      summary: row.summary,
      objection: row.objection,
      stage: row.stage,
      notes: row.notes
    }, replyColumns);
    overrides = upsert(overrides, {
      source: row.source,
      creator: row.creator,
      stage: row.stage,
      next_due: row.stage === "not_fit" ? "" : row.next_due,
      notes: row.notes
    }, overrideColumns);
  }
  await writeFile(repliesFile, toCsv(replies, replyColumns), "utf8");
  await writeFile(overridesFile, toCsv(overrides, overrideColumns), "utf8");
}

const manifest = {
  generatedAt: new Date().toISOString(),
  inboxDir: path.relative(root, inboxDir).replace(/\\/g, "/"),
  parsedCount: parsed.length,
  skippedCount: skipped.length,
  stageCounts: Object.fromEntries([...new Set(parsed.map((row) => row.stage))].map((stage) => [stage, parsed.filter((row) => row.stage === stage).length])),
  wrotePrivateCrm: parsed.length > 0,
  safety: {
    sendsMessages: false,
    collectsPayment: false,
    confirmsPaymentAutomatically: false,
    exposesPrivateRepliesInDocs: false,
    requestsSensitiveData: false,
    noRevenuePromise: true,
    noViewPromise: true
  }
};

await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
await writeFile(path.join(outDir, "parsed-replies.csv"), toCsv(parsed, ["reply_id", "file", "source", "creator", "summary", "objection", "stage", "next_due", "notes"]), "utf8");
await writeFile(path.join(outDir, "parsed-replies.md"), privateMarkdown(parsed, skipped), "utf8");
await writeFile(path.join(docsDir, "content-reply-intake.md"), publicDoc({ parsed, skipped }), "utf8");

console.log(`Wrote ${path.join(docsDir, "content-reply-intake.md")}`);
console.log(`Parsed replies: ${parsed.length}`);
