import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const outDir = path.join(root, "dist", "content-customer-success");

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

async function readJsonMaybe(file, fallback = {}) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

async function listJsonFiles(dir) {
  try {
    return (await readdir(dir, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json") && entry.name !== "latest.json")
      .map((entry) => path.join(dir, entry.name))
      .sort();
  } catch {
    return [];
  }
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function safeId(value, fallback = "customer") {
  return compact(value, fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || fallback;
}

function receiptKey(receipt) {
  return `${compact(receipt.source)}:${compact(receipt.creator)}`.toLowerCase();
}

function rowKey(row) {
  return `${compact(row.source)}:${compact(row.creator)}`.toLowerCase();
}

function draftFor(row, receipt) {
  const creator = compact(row.creator, compact(receipt?.creator, "there"));
  const topic = compact(row.topic, "the proof-first script pack");
  const orderId = compact(receipt?.orderId, "the delivered order");
  return `Hi ${creator},

Checking whether the delivered TrendFoundry pack was usable.

Order reference: ${orderId}
Topic: ${topic}

Three quick questions:
1. Which proof asset or scene would you actually record first?
2. What part was missing, unclear, or too hard to use?
3. May I quote one short line of feedback publicly without exposing private contact details?

If you want the next step, I can either prepare a narrower custom proof pack or move you to the weekly pack. I will only prepare paid delivery after external payment confirmation.

No promises about views, subscribers, revenue, platform growth, or buyer outcomes.`;
}

function buildRows({ pipeline, receipts }) {
  const receiptByKey = new Map(receipts.map((receipt) => [receiptKey(receipt), receipt]));
  const deliveredKeys = new Set();
  const today = new Date().toISOString().slice(0, 10);
  const delivered = pipeline.filter((row) => row.stage === "fulfilled_waiting_feedback");
  const crmRows = delivered.map((row, index) => {
    deliveredKeys.add(rowKey(row));
    const receipt = receiptByKey.get(rowKey(row)) || {};
    const dueDate = compact(row.next_due, addDays(new Date(), 2));
    const action = dueDate <= today ? "send_reviewed_feedback_followup" : "wait_until_followup_due";
    return {
      followup_id: `cs-${String(index + 1).padStart(2, "0")}-${safeId(row.creator, "creator")}`,
      creator: compact(row.creator, "unknown"),
      source: compact(row.source, "unknown"),
      topic: compact(row.topic, "not-provided"),
      proof_url: compact(row.proof_url, "not-provided"),
      order_id: compact(receipt.orderId, "not-linked"),
      order_dir: compact(receipt.orderDir, "not-linked"),
      next_due: dueDate,
      recommended_action: action,
      testimonial_permission_status: "ask_before_quoting",
      upsell_path: compact(row.product_fit).includes("weekly") ? "weekly_pack_continuation" : "custom_or_weekly_upgrade",
      draft: draftFor(row, receipt)
    };
  });
  const receiptOnlyRows = receipts
    .filter((receipt) => !deliveredKeys.has(receiptKey(receipt)))
    .map((receipt, index) => {
      const row = {
        creator: receipt.creator,
        source: receipt.source,
        topic: `Delivered order ${compact(receipt.orderId, "unknown")}`,
        proof_url: "",
        product_fit: "proof-script-pack",
        next_due: receipt.nextDue
      };
      const dueDate = compact(receipt.nextDue, addDays(new Date(), 2));
      const action = dueDate <= today ? "send_reviewed_feedback_followup" : "wait_until_followup_due";
      return {
        followup_id: `cs-${String(crmRows.length + index + 1).padStart(2, "0")}-${safeId(receipt.creator, "creator")}`,
        creator: compact(receipt.creator, "unknown"),
        source: compact(receipt.source, "manual"),
        topic: compact(row.topic, "not-provided"),
        proof_url: "not-provided",
        order_id: compact(receipt.orderId, "not-linked"),
        order_dir: compact(receipt.orderDir, "not-linked"),
        next_due: dueDate,
        recommended_action: action,
        testimonial_permission_status: "ask_before_quoting",
        upsell_path: "custom_or_weekly_upgrade",
        draft: draftFor(row, receipt)
      };
    });
  return [...crmRows, ...receiptOnlyRows];
}

function privateMarkdown(rows) {
  return `# TrendFoundry Content Customer Success

Generated: ${new Date().toISOString()}

Private local follow-up desk. Do not publish. Review every draft before sending.

## Follow-Up Queue

| ID | Creator | Source | Order | Due | Action | Upsell path |
| --- | --- | --- | --- | --- | --- | --- |
${rows.map((row) => `| ${row.followup_id} | ${row.creator.replace(/\|/g, "/")} | ${row.source} | ${row.order_id} | ${row.next_due} | ${row.recommended_action} | ${row.upsell_path} |`).join("\n") || "| - | - | - | - | - | - | No delivered content orders waiting for feedback. |"}

## Drafts

${rows.map((row) => `### ${row.followup_id}

- Creator: ${row.creator}
- Source: ${row.source}
- Topic: ${row.topic}
- Proof URL: ${row.proof_url}
- Order: ${row.order_id}

\`\`\`text
${row.draft}
\`\`\`
`).join("\n") || "No follow-up drafts yet."}

## Safety

- No automatic sending.
- No automatic posting.
- No payment collection.
- Ask permission before quoting feedback.
- Do not request card numbers, passwords, private IDs, wallet seeds, or sensitive account data.
- No promise of views, subscribers, revenue, platform growth, or buyer outcomes.
`;
}

function publicDoc({ rows, receiptCount }) {
  const dueNow = rows.filter((row) => row.recommended_action === "send_reviewed_feedback_followup").length;
  const waiting = rows.filter((row) => row.recommended_action === "wait_until_followup_due").length;
  return `# TrendFoundry Content Customer Success

Generated: ${new Date().toISOString()}

This step turns completed buyer deliveries into reviewer-ready feedback, testimonial-permission, and upgrade follow-up drafts. Private buyer rows stay in ignored \`dist/content-customer-success/\`.

## Current Counts

- Completed delivery receipts found: ${receiptCount}
- Follow-up rows: ${rows.length}
- Due now: ${dueNow}
- Waiting until due date: ${waiting}
- Draft destination: \`dist/content-customer-success/followup-drafts.md\`

## Operator Workflow

1. Run \`npm run complete-content-order-delivery\` after a buyer delivery is manually sent.
2. Run \`npm run content-customer-success\` or full \`npm run content-ops\`.
3. Review \`dist/content-customer-success/followup-drafts.md\`.
4. Send only after checking the buyer context and safety language.
5. Capture feedback in ignored \`data/content-sales-crm/replies.csv\` or with \`npm run record-content-sale\`.
6. Use testimonial quotes only after explicit permission.

## Safety Boundary

- Does not send messages.
- Does not post testimonials.
- Does not collect payment.
- Does not request sensitive payment or account data.
- Does not publish private buyer rows.
- Does not promise views, subscribers, revenue, platform growth, or buyer outcomes.
`;
}

const pipeline = await readCsvMaybe(path.join(root, "dist", "content-sales-crm", "pipeline.csv"));
const receiptFiles = await listJsonFiles(path.join(root, "dist", "content-order-completion"));
const receipts = [];
for (const file of receiptFiles) {
  receipts.push(await readJsonMaybe(file, {}));
}
const rows = buildRows({ pipeline, receipts });
const manifest = {
  generatedAt: new Date().toISOString(),
  pipelineRows: pipeline.length,
  completionReceiptCount: receipts.length,
  followupCount: rows.length,
  dueNowCount: rows.filter((row) => row.recommended_action === "send_reviewed_feedback_followup").length,
  waitingCount: rows.filter((row) => row.recommended_action === "wait_until_followup_due").length,
  upsellPaths: Object.fromEntries([...new Set(rows.map((row) => row.upsell_path))].map((pathName) => [pathName, rows.filter((row) => row.upsell_path === pathName).length])),
  safety: {
    sendsMessages: false,
    postsTestimonials: false,
    collectsPayment: false,
    requestsSensitiveData: false,
    exposesPrivateBuyersInDocs: false,
    asksPermissionBeforeQuoting: true,
    noRevenuePromise: true,
    noViewPromise: true
  }
};

await mkdir(docsDir, { recursive: true });
await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
await writeFile(path.join(outDir, "followups.csv"), toCsv(rows, [
  "followup_id",
  "creator",
  "source",
  "topic",
  "proof_url",
  "order_id",
  "order_dir",
  "next_due",
  "recommended_action",
  "testimonial_permission_status",
  "upsell_path"
]), "utf8");
await writeFile(path.join(outDir, "followup-drafts.md"), privateMarkdown(rows), "utf8");
await writeFile(path.join(docsDir, "content-customer-success.md"), publicDoc({ rows, receiptCount: receipts.length }), "utf8");

console.log(`Wrote ${path.join(docsDir, "content-customer-success.md")}`);
console.log(`Customer success follow-ups: ${rows.length}`);
