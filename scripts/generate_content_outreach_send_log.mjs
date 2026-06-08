import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const outDir = path.join(root, "dist", "content-outreach-sends");

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

async function listReceiptFiles() {
  try {
    return (await readdir(outDir, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json") && !["manifest.json", "latest.json"].includes(entry.name))
      .map((entry) => path.join(outDir, entry.name))
      .sort();
  } catch {
    return [];
  }
}

async function readJsonMaybe(file) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return {};
  }
}

function publicDoc({ rows }) {
  const sentToday = rows.filter((row) => compact(row.sent_at).slice(0, 10) === new Date().toISOString().slice(0, 10)).length;
  return `# TrendFoundry Content Outreach Sends

Generated: ${new Date().toISOString()}

This step summarizes private receipts for outreach messages that were manually reviewed and sent outside the script. Private prospect rows stay in ignored \`dist/content-outreach-sends/\`.

## Current Counts

- Send receipts: ${rows.length}
- Sent today: ${sentToday}
- Waiting for reply: ${rows.filter((row) => row.stage === "sent_waiting_reply").length}
- Private log: \`dist/content-outreach-sends/send-log.md\`

## Operator Workflow

1. Review a send pack under \`dist/content-outreach-review/send-packs/\`.
2. Send manually only after checking the source, personalization, offer, and safety language.
3. Record the send:

\`\`\`bash
npm run complete-content-outreach-send -- --review-id="outreach-01-example"
\`\`\`

4. Run \`npm run content-ops\` to refresh CRM due dates, deal desk, customer success, testimonials, and health gates.

## Safety Boundary

- Does not send messages.
- Does not post content.
- Does not collect payment.
- Does not publish private prospect rows.
- Does not request sensitive payment or account data.
- Does not promise views, subscribers, revenue, platform growth, or buyer outcomes.
`;
}

function privateMarkdown(rows) {
  return `# TrendFoundry Content Outreach Send Log

Generated: ${new Date().toISOString()}

Private local send receipt log. Do not publish.

| Review ID | Campaign | Creator | Source | Sent at | Next due | Stage | Receipt |
| --- | --- | --- | --- | --- | --- | --- | --- |
${rows.map((row) => `| ${row.review_id} | ${row.campaign_id || "-"} | ${row.creator.replace(/\|/g, "/")} | ${row.source} | ${row.sent_at} | ${row.next_due} | ${row.stage} | ${row.receipt_file} |`).join("\n") || "| - | - | - | - | - | - | - | No send receipts recorded. |"}
`;
}

await mkdir(docsDir, { recursive: true });
await mkdir(outDir, { recursive: true });

const files = await listReceiptFiles();
const rows = [];
for (const file of files) {
  const receipt = await readJsonMaybe(file);
  if (!receipt.review_id) continue;
  rows.push({
    review_id: compact(receipt.review_id),
    campaign_id: compact(receipt.campaign_id),
    creator: compact(receipt.creator, "unknown"),
    source: compact(receipt.source, "unknown"),
    topic: compact(receipt.topic, "not-provided"),
    offer_sku: compact(receipt.offer_sku, "not-provided"),
    sent_at: compact(receipt.sent_at, receipt.generatedAt),
    next_due: compact(receipt.next_due, ""),
    stage: compact(receipt.stage, "sent_waiting_reply"),
    receipt_file: path.relative(root, file).replace(/\\/g, "/")
  });
}

const manifest = {
  generatedAt: new Date().toISOString(),
  sendReceiptCount: rows.length,
  sentTodayCount: rows.filter((row) => row.sent_at.slice(0, 10) === new Date().toISOString().slice(0, 10)).length,
  waitingReplyCount: rows.filter((row) => row.stage === "sent_waiting_reply").length,
  safety: {
    sendsMessages: false,
    postsContent: false,
    collectsPayment: false,
    exposesPrivateProspectsInDocs: false,
    noRevenuePromise: true,
    noViewPromise: true
  }
};

await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
await writeFile(path.join(outDir, "send-log.csv"), toCsv(rows, ["review_id", "campaign_id", "creator", "source", "topic", "offer_sku", "sent_at", "next_due", "stage", "receipt_file"]), "utf8");
await writeFile(path.join(outDir, "send-log.md"), privateMarkdown(rows), "utf8");
await writeFile(path.join(docsDir, "content-outreach-sends.md"), publicDoc({ rows }), "utf8");

console.log(`Wrote ${path.join(docsDir, "content-outreach-sends.md")}`);
console.log(`Outreach send receipts: ${rows.length}`);
