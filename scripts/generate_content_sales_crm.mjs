import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const outDir = path.join(root, "dist", "content-sales-crm");
const privateDir = path.join(root, "data", "content-sales-crm");

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

async function readCsvMaybe(file) {
  try {
    return parseCsv(await readFile(file, "utf8"));
  } catch {
    return [];
  }
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function stageFor(row, override) {
  return compact(override?.stage || row.status || "draft_review_before_sending");
}

function dueDateFor(index, stage, today, override) {
  if (override?.next_due) return override.next_due;
  if (stage === "sent_waiting_reply") return addDays(today, 3);
  if (stage === "replied_needs_response") return today.toISOString().slice(0, 10);
  if (stage === "paid_needs_fulfillment") return today.toISOString().slice(0, 10);
  if (stage === "not_fit" || stage === "closed_won") return "";
  return addDays(today, Math.floor(index / 5));
}

function recommendedAction(stage) {
  if (stage === "sent_waiting_reply") return "wait_then_follow_up";
  if (stage === "replied_needs_response") return "draft_personal_reply";
  if (stage === "paid_needs_fulfillment") return "run_fulfillment_after_external_confirmation";
  if (stage === "qualified_needs_custom_pack") return "run_custom_proof_pack";
  if (stage === "not_fit") return "archive";
  if (stage === "closed_won") return "record_learning";
  return "review_personalize_then_send";
}

function priorityBand(index) {
  if (index < 5) return "today";
  if (index < 10) return "next_48h";
  return "this_week";
}

function markdownTable(rows) {
  return [
    "| Rank | Creator | Source | Stage | Due | Action | Product fit |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...rows.map((row) => `| ${row.rank} | ${row.creator.replace(/\|/g, "/")} | ${row.source} | ${row.stage} | ${row.next_due} | ${row.recommended_action} | ${row.product_fit} |`)
  ].join("\n");
}

function docsMarkdown(rows, summary) {
  return `# TrendFoundry Content Sales CRM

Generated: ${new Date().toISOString()}

This is the local CRM layer for first-customer sales. It turns the ignored prospecting board into a weekly review and follow-up plan. It does not send messages, post content, collect payment, or expose the private prospect list in public docs.

## Current Summary

- Pipeline rows: ${rows.length}
- Due today: ${summary.dueToday}
- Due this week: ${summary.dueThisWeek}
- Drafts needing review: ${summary.needsReview}
- Private override input: \`data/content-sales-crm/overrides.csv\` (ignored)
- Private reply input: \`data/content-sales-crm/replies.csv\` (ignored)
- Local CRM output: \`dist/content-sales-crm/pipeline.md\`

## Weekly Sales Rule

Review 5 prospects per workday. Personalize the first sentence, send only after human review, then update the ignored override file with the new stage.

## Status Update Command

Use this after a message is manually sent, a reply arrives, payment is externally confirmed, or a buyer delivery is manually sent:

\`\`\`bash
npm run record-content-sale -- --source="youtube" --creator="Creator Name" --stage="sent_waiting_reply" --next-due="2026-06-11" --notes="Sent reviewed first message manually"
\`\`\`

Optional reply capture:

\`\`\`bash
npm run record-content-sale -- --source="youtube" --creator="Creator Name" --stage="replied_needs_response" --summary="Captured buyer reply summary" --objection="captured objection category" --reply-stage="qualified_needs_custom_pack"
\`\`\`

The command writes only ignored local CRM files under \`data/content-sales-crm/\`. It does not send messages, collect payment, or store sensitive payment/account data.

## Safety Boundary

- Local planning only.
- No automatic sending or posting.
- No private contact scraping.
- No payment collection.
- No sensitive payment or account data request.
- No promise of views, subscribers, revenue, platform growth, or buyer outcomes.
`;
}

const prospects = await readCsvMaybe(path.join(root, "dist", "content-prospecting", "prospects.csv"));
const overrides = await readCsvMaybe(path.join(privateDir, "overrides.csv"));
const replies = await readCsvMaybe(path.join(privateDir, "replies.csv"));
const overridesByKey = new Map(overrides.map((row) => [`${row.source}:${row.creator}`.toLowerCase(), row]));
const repliesByKey = new Map(replies.map((row) => [`${row.source}:${row.creator}`.toLowerCase(), row]));
const today = new Date();

const pipeline = prospects.map((row, index) => {
  const key = `${row.source}:${row.creator}`.toLowerCase();
  const override = overridesByKey.get(key) || {};
  const reply = repliesByKey.get(key) || {};
  const stage = stageFor(row, override);
  const nextDue = dueDateFor(index, stage, today, override);
  return {
    rank: row.rank,
    creator: row.creator,
    source: row.source,
    topic: row.topic,
    proof_url: row.proof_url,
    product_fit: row.product_fit,
    priority_score: row.priority_score,
    priority_band: priorityBand(index),
    stage,
    next_due: nextDue,
    recommended_action: recommendedAction(stage),
    draft_file: row.draft_file,
    last_reply_summary: compact(reply.summary),
    notes: compact(override.notes)
  };
});

const todayIso = today.toISOString().slice(0, 10);
const weekEnd = addDays(today, 7);
const summary = {
  generatedAt: new Date().toISOString(),
  count: pipeline.length,
  dueToday: pipeline.filter((row) => row.next_due && row.next_due <= todayIso).length,
  dueThisWeek: pipeline.filter((row) => row.next_due && row.next_due <= weekEnd).length,
  needsReview: pipeline.filter((row) => row.stage === "draft_review_before_sending").length,
  stages: Object.fromEntries([...new Set(pipeline.map((row) => row.stage))].map((stage) => [stage, pipeline.filter((row) => row.stage === stage).length])),
  safety: {
    sendsMessages: false,
    postsContent: false,
    collectsPayment: false,
    scrapesPrivateContactData: false,
    requestsSensitiveData: false,
    noRevenuePromise: true,
    noViewPromise: true
  }
};

const board = `# TrendFoundry Content Sales CRM

Generated: ${summary.generatedAt}

Private local board. Do not publish. Review before any outreach.

## Pipeline

${markdownTable(pipeline)}

## Today

${pipeline.filter((row) => row.next_due && row.next_due <= todayIso).slice(0, 5).map((row) => `- ${row.creator}: ${row.recommended_action} (${row.draft_file})`).join("\n") || "- No items due today."}

## Override Format

Create \`data/content-sales-crm/overrides.csv\` with columns:

\`\`\`csv
source,creator,stage,next_due,notes
youtube,Example Creator,sent_waiting_reply,2026-06-10,Sent first email manually
\`\`\`
`;

await mkdir(outDir, { recursive: true });
await mkdir(docsDir, { recursive: true });
await writeFile(path.join(outDir, "pipeline.csv"), toCsv(pipeline, [
  "rank",
  "creator",
  "source",
  "topic",
  "proof_url",
  "product_fit",
  "priority_score",
  "priority_band",
  "stage",
  "next_due",
  "recommended_action",
  "draft_file",
  "last_reply_summary",
  "notes"
]), "utf8");
await writeFile(path.join(outDir, "pipeline.md"), board, "utf8");
await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(summary, null, 2), "utf8");
await writeFile(path.join(docsDir, "content-sales-crm.md"), docsMarkdown(pipeline, summary), "utf8");

console.log(`Wrote ${path.join(docsDir, "content-sales-crm.md")}`);
console.log(`Content sales CRM rows: ${pipeline.length}`);
