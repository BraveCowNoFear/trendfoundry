import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const outDir = path.join(root, "dist", "content-outreach-followups");

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

async function readCsvMaybe(relativePath) {
  try {
    return parseCsv(await readFile(path.join(root, relativePath), "utf8"));
  } catch {
    return [];
  }
}

function todayIso() {
  return (process.env.TRENDFOUNDRY_TODAY || new Date().toISOString().slice(0, 10)).slice(0, 10);
}

function addDaysIso(dateText, days) {
  const base = dateText ? new Date(`${dateText.slice(0, 10)}T00:00:00.000Z`) : new Date();
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

function keyFor(row) {
  const campaign = compact(row.campaign_id);
  if (campaign) return `campaign:${campaign.toLowerCase()}`;
  return `${compact(row.source).toLowerCase()}:${compact(row.creator).toLowerCase()}`;
}

function mapBy(rows, field) {
  const map = new Map();
  for (const row of rows) {
    const value = compact(row[field]);
    if (value && !map.has(value)) map.set(value, row);
  }
  return map;
}

function sentHasReply(send, repliesByCampaign, repliesByReview, repliesByKey) {
  if (repliesByCampaign.has(compact(send.campaign_id))) return true;
  if (repliesByReview.has(compact(send.review_id))) return true;
  return repliesByKey.has(keyFor(send));
}

function followupDraft({ send, review, nextDueAfterFollowup }) {
  const creator = compact(send.creator, "there");
  const topic = compact(send.topic || review.topic, "your AI/developer creator workflow");
  const sample = compact(review.tracked_free_sample_url || review.free_sample_url, "https://bravecownofear.github.io/trendfoundry/trendfoundry-free-sample-pack.zip");
  const question = compact(review.feedback_question, "Which proof asset would you actually record this week?");
  return [
    `Hi ${creator},`,
    `Quick follow-up on the TrendFoundry sample I sent for "${topic}".`,
    `Free sample again: ${sample}`,
    `If this is not useful, no need to reply. If it is useful, the only question I need is: ${question}`,
    `I will wait until ${nextDueAfterFollowup} before following up again.`,
    "No promises about views, subscribers, revenue, platform growth, or outcomes."
  ].join("\n\n");
}

function buildRows({ sends, reviewRows, replies }) {
  const today = todayIso();
  const reviewById = mapBy(reviewRows, "review_id");
  const repliesByCampaign = mapBy(replies, "campaign_id");
  const repliesByReview = mapBy(replies, "review_id");
  const repliesByKey = new Map(replies.map((row) => [keyFor(row), row]));
  return sends
    .filter((send) => compact(send.stage) === "sent_waiting_reply")
    .filter((send) => compact(send.next_due) && compact(send.next_due).slice(0, 10) <= today)
    .filter((send) => !sentHasReply(send, repliesByCampaign, repliesByReview, repliesByKey))
    .map((send, index) => {
      const review = reviewById.get(compact(send.review_id)) || {};
      const nextDueAfterFollowup = addDaysIso(today, index < 2 ? 7 : 10);
      return {
        followup_id: `followup-${String(index + 1).padStart(2, "0")}-${compact(send.review_id, "review")}`,
        review_id: compact(send.review_id),
        campaign_id: compact(send.campaign_id),
        variant_id: compact(review.variant_id, "unassigned"),
        creator: compact(send.creator, "private prospect"),
        source: compact(send.source),
        topic: compact(send.topic || review.topic),
        offer_sku: compact(send.offer_sku || review.offer_sku),
        sent_at: compact(send.sent_at),
        due_date: compact(send.next_due).slice(0, 10),
        next_due_after_followup: nextDueAfterFollowup,
        subject: `Quick follow-up: ${compact(review.subject || send.topic, "TrendFoundry proof sample")}`.slice(0, 88),
        draft: followupDraft({ send, review, nextDueAfterFollowup }),
        command: `npm run record-content-sale -- --source="${compact(send.source)}" --creator="${compact(send.creator).replace(/"/g, "'")}" --stage="sent_waiting_reply" --campaign-id="${compact(send.campaign_id)}" --review-id="${compact(send.review_id)}" --next-due="${nextDueAfterFollowup}" --notes="Manual follow-up sent; waiting for reply."`,
        review_file: `dist/content-outreach-review/send-packs/${compact(send.review_id)}.md`,
        safety_note: "manual follow-up only; no auto-send, no payment request, no outcome promise"
      };
    });
}

function privateMarkdown({ generatedAt, rows }) {
  return `# TrendFoundry Content Outreach Follow-ups

Generated: ${generatedAt}

Private local follow-up queue. Do not publish creator names, channels, tracked URLs, private replies, or payment references from this file.

## Due Follow-ups

| Due | Campaign | Variant | Creator | Source | Subject | Command |
| --- | --- | --- | --- | --- | --- | --- |
${rows.map((row) => `| ${row.due_date} | ${row.campaign_id || "-"} | ${row.variant_id} | ${row.creator.replace(/\|/g, "/")} | ${row.source} | ${row.subject.replace(/\|/g, "/")} | \`${row.command.replace(/\|/g, "/")}\` |`).join("\n") || "| - | - | - | - | - | No due follow-ups. | - |"}

## Drafts

${rows.map((row) => `### ${row.followup_id}\n\n- Review file: ${row.review_file}\n- Next due after manual follow-up: ${row.next_due_after_followup}\n\n\`\`\`text\n${row.draft}\n\`\`\``).join("\n\n") || "No due follow-up drafts."}
`;
}

function publicMarkdown(manifest) {
  return `# TrendFoundry Content Outreach Follow-ups

Generated: ${manifest.generatedAt}

This report summarizes private follow-up drafts for sent outreach campaigns that are due and have no recorded reply. Detailed creator rows stay in ignored \`dist/content-outreach-followups/\`.

## Current Counts

- Send receipts checked: ${manifest.sendReceiptCount}
- Due follow-up drafts: ${manifest.followupCount}
- Due today or overdue: ${manifest.dueNowCount}
- Public-safe private rows exposed here: 0

## Operator Flow

1. Review ignored \`dist/content-outreach-followups/followups.md\`.
2. Send one follow-up manually only if the original send was safe and relevant.
3. Run the listed \`record-content-sale\` command after manual follow-up.
4. Run \`npm run content-ops\` again so CRM, attribution, experiments, and action brief update.

## Safety Boundary

- Does not send messages.
- Does not collect payment.
- Does not upload files.
- Does not expose private creator rows in tracked docs.
- Does not request sensitive account/payment data.
- Does not promise views, subscribers, revenue, platform growth, or buyer outcomes.
`;
}

const generatedAt = new Date().toISOString();
const sends = await readCsvMaybe("dist/content-outreach-sends/send-log.csv");
const reviewRows = await readCsvMaybe("dist/content-outreach-review/review-board.csv");
const replies = await readCsvMaybe("data/content-sales-crm/replies.csv");
const rows = buildRows({ sends, reviewRows, replies });
const manifest = {
  generatedAt,
  sendReceiptCount: sends.length,
  followupCount: rows.length,
  dueNowCount: rows.length,
  variantCounts: rows.reduce((acc, row) => {
    acc[row.variant_id] = (acc[row.variant_id] || 0) + 1;
    return acc;
  }, {}),
  safety: {
    sendsMessages: false,
    collectsPayment: false,
    uploadsFiles: false,
    exposesPrivateFollowupRowsInDocs: false,
    requestsSensitiveData: false,
    noRevenuePromise: true,
    noViewPromise: true
  }
};

await mkdir(docsDir, { recursive: true });
await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, "followups.csv"), toCsv(rows, [
  "followup_id",
  "review_id",
  "campaign_id",
  "variant_id",
  "creator",
  "source",
  "topic",
  "offer_sku",
  "sent_at",
  "due_date",
  "next_due_after_followup",
  "subject",
  "review_file",
  "command",
  "safety_note"
]), "utf8");
await writeFile(path.join(outDir, "followups.md"), privateMarkdown({ generatedAt, rows }), "utf8");
await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
await writeFile(path.join(docsDir, "content-outreach-followups.md"), publicMarkdown(manifest), "utf8");

console.log(`Wrote ${path.join(docsDir, "content-outreach-followups.md")}`);
console.log(`Due follow-ups: ${manifest.followupCount}`);
