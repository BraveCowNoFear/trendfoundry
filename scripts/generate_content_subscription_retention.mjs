import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { contactEmail } from "./lib/fulfillment.mjs";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const outDir = path.join(root, "dist", "content-subscription-retention");
const queueFile = path.join(root, "dist", "content-subscription-crm", "due-queue.csv");
const orderPage = "https://bravecownofear.github.io/trendfoundry/order/";

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

async function readTextMaybe(file) {
  try {
    return await readFile(file, "utf8");
  } catch {
    return "";
  }
}

function draftType(row) {
  if (compact(row.action) === "payment_review_before_delivery") return "payment_review";
  if (compact(row.action) === "renewal_check") return "renewal_check";
  return "";
}

function draftFor(row) {
  const type = draftType(row);
  const name = compact(row.name, "there");
  const week = compact(row.week, "next");
  const deliveryDate = compact(row.delivery_date, "the next delivery date");
  const paidThrough = compact(row.paid_through, "not confirmed");
  const channel = compact(row.channel, "your channel");
  if (type === "payment_review") {
    return {
      subscriber_id: compact(row.subscriber_id),
      contact: compact(row.contact),
      action: compact(row.action),
      draft_type: type,
      subject: `TrendFoundry weekly pack - payment confirmation needed before week ${week}`,
      body: `Hi ${name},\n\nI have the next TrendFoundry weekly proof pack queued for ${channel}, but I do not have a current external subscription/payment confirmation for the week ${week} delivery.\n\nQueued delivery date: ${deliveryDate}\nPaid through on file: ${paidThrough}\n\nIf you still want this week's pack, please complete or confirm payment through the external order route before delivery. Do not send card numbers, passwords, private IDs, wallet seeds, or payment credentials by email.\n\nOrder page: ${orderPage}\n\nOnce payment is externally confirmed, I can prepare the buyer-only files:\n- weekly-proof-pack.md\n- subscriber-email.md\n\nThis is a creator planning and production aid. It does not promise views, subscribers, revenue, platform growth, or buyer outcomes.\n\nBest,\nTrendFoundry\n${contactEmail}`,
      next_operator_action: "Confirm external payment status, then run record-content-subscription and content-subscription-crm again."
    };
  }
  return {
    subscriber_id: compact(row.subscriber_id),
    contact: compact(row.contact),
    action: compact(row.action),
    draft_type: type,
    subject: "Keep the next TrendFoundry weekly proof pack active?",
    body: `Hi ${name},\n\nYour TrendFoundry weekly proof pack is coming up for renewal review.\n\nCurrent paid-through date on file: ${paidThrough}\nNext queued delivery: week ${week} on ${deliveryDate}\nChannel/context: ${channel}\n\nBefore I prepare the next issue, could you reply with one preference?\n\n1. Keep the same proof-first AI/dev creator lane.\n2. Narrow next week to one channel niche.\n3. Pause the weekly pack.\n\nIf renewing, please use the external order route and do not send card numbers, passwords, private IDs, wallet seeds, or payment credentials by email.\n\nOrder page: ${orderPage}\n\nThis is a creator planning and production aid. It does not promise views, subscribers, revenue, platform growth, or buyer outcomes.\n\nBest,\nTrendFoundry\n${contactEmail}`,
    next_operator_action: "If renewed externally, update paid_through/payment_ref; if paused, set status to inactive or cancelled."
  };
}

function privateDrafts(rows, generatedAt) {
  if (!rows.length) return `# TrendFoundry Subscription Retention Drafts\n\nGenerated: ${generatedAt}\n\nNo renewal or payment-review drafts are needed today.\n`;
  return `# TrendFoundry Subscription Retention Drafts

Generated: ${generatedAt}

These drafts may contain subscriber contacts and should stay inside ignored dist output.

${rows.map((row) => `## ${row.draft_type}: ${row.subscriber_id}

To: ${row.contact}
Subject: ${row.subject}

${row.body}

Operator action: ${row.next_operator_action}
`).join("\n")}
`;
}

function publicDoc({ generatedAt, queueCount, paymentReviewCount, renewalCount, draftCount }) {
  return `# TrendFoundry Content Subscription Retention

Generated: ${generatedAt}

This content-only step turns private subscription CRM actions into retention drafts for payment review and renewal checks. It does not send messages and does not expose subscriber contacts in tracked docs.

## Current Counts

- Queue rows reviewed: ${queueCount}
- Payment review drafts: ${paymentReviewCount}
- Renewal check drafts: ${renewalCount}
- Total private drafts: ${draftCount}

## Operator Flow

1. Run \`npm run content-subscription-crm\`.
2. Run \`npm run content-subscription-retention\`.
3. Review ignored \`dist/content-subscription-retention/drafts.md\`.
4. If payment is externally confirmed, run \`npm run record-content-subscription\` with the new \`--payment-ref\` and \`--paid-through\`.
5. If the subscriber pauses, update ignored subscriber status to \`inactive\` or \`cancelled\`.

## Safety Boundary

- Does not send messages.
- Does not collect payment.
- Does not upload files.
- Does not build or overwrite the frontend.
- Does not expose private subscriber rows in tracked docs.
- Does not request sensitive payment or account data.
- Does not promise views, subscribers, revenue, platform growth, or buyer outcomes.
`;
}

const generatedAt = new Date().toISOString();
const queueRows = parseCsv(await readTextMaybe(queueFile));
const draftRows = queueRows.map(draftFor).filter((row) => row.draft_type);
const paymentReviewRows = draftRows.filter((row) => row.draft_type === "payment_review");
const renewalRows = draftRows.filter((row) => row.draft_type === "renewal_check");
const manifest = {
  generatedAt,
  queueFile: path.relative(root, queueFile).replace(/\\/g, "/"),
  queueCount: queueRows.length,
  draftCount: draftRows.length,
  paymentReviewCount: paymentReviewRows.length,
  renewalCount: renewalRows.length,
  safety: {
    sendsMessages: false,
    collectsPayment: false,
    uploadsFiles: false,
    buildsFrontend: false,
    exposesPrivateSubscribersInDocs: false,
    requestsSensitiveData: false,
    noRevenuePromise: true,
    noViewPromise: true,
    noCredentialRequest: true
  }
};

await mkdir(docsDir, { recursive: true });
await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, "drafts.md"), privateDrafts(draftRows, generatedAt), "utf8");
await writeFile(path.join(outDir, "drafts.csv"), toCsv(draftRows, ["subscriber_id", "contact", "action", "draft_type", "subject", "body", "next_operator_action"]), "utf8");
await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
await writeFile(path.join(docsDir, "content-subscription-retention.md"), publicDoc({
  generatedAt,
  queueCount: queueRows.length,
  paymentReviewCount: paymentReviewRows.length,
  renewalCount: renewalRows.length,
  draftCount: draftRows.length
}), "utf8");

console.log(`Wrote ${path.join(docsDir, "content-subscription-retention.md")}`);
console.log(`Subscription retention drafts: ${draftRows.length}`);
