import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const outDir = path.join(root, "dist", "content-outreach-gate");
const reviewDir = path.join(root, "dist", "content-outreach-review");

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

async function readTextMaybe(file) {
  try {
    return await readFile(file, "utf8");
  } catch {
    return "";
  }
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

function extractCodeBlock(markdown, heading) {
  const pattern = new RegExp(`## ${heading}\\s+\\x60\\x60\\x60text\\s+([\\s\\S]*?)\\x60\\x60\\x60`, "i");
  return markdown.match(pattern)?.[1]?.trim() || "";
}

function wordCount(text) {
  return compact(text).split(/\s+/).filter(Boolean).length;
}

function mojibakeHits(text) {
  const markers = [
    String.fromCodePoint(0xfffd),
    String.fromCodePoint(0x9225),
    String.fromCodePoint(0x00e2, 0x20ac),
    String.fromCodePoint(0x00c3),
    String.fromCodePoint(0x6a9a),
    String.fromCodePoint(0x6a9d),
    String.fromCodePoint(0x6a99),
    String.fromCodePoint(0x6a92),
    String.fromCodePoint(0x6a87),
    String.fromCodePoint(0x6a9b)
  ];
  const hits = [];
  for (const marker of markers) {
    const count = text.split(marker).length - 1;
    if (count > 0) hits.push(`${marker}:${count}`);
  }
  const denseQuestionMarks = text.match(/\?{3,}/g) || [];
  if (denseQuestionMarks.length) hits.push(`dense-question-marks:${denseQuestionMarks.length}`);
  return hits;
}

function checksFor(row) {
  const reviewId = compact(row.review_id);
  const packPath = path.join(reviewDir, "send-packs", `${reviewId}.md`);
  return { reviewId, packPath };
}

function riskHits(text) {
  const lower = text.toLowerCase();
  const hits = [];
  for (const pattern of [
    "guaranteed views",
    "guarantee views",
    "guaranteed subscribers",
    "guarantee subscribers",
    "guaranteed revenue",
    "guarantee revenue",
    "go viral",
    "make you money",
    "will grow your channel",
    "will increase your subscribers"
  ]) {
    if (lower.includes(pattern)) hits.push(pattern);
  }
  return hits;
}

function sensitiveHits(text) {
  const lower = text.toLowerCase();
  const hits = [];
  for (const pattern of ["password", "card number", "private id", "wallet seed", "seed phrase", "2fa code", "passport"]) {
    if (lower.includes(pattern)) hits.push(pattern);
  }
  return hits;
}

function rowChecks(row, packText, packExists) {
  const subject = compact(row.subject);
  const draft = extractCodeBlock(packText, "Draft");
  const hasCampaignId = Boolean(compact(row.campaign_id));
  const hasTracking = draft.includes("tf_campaign=") && draft.includes("tf_source=content_outreach") && draft.includes("tf_offer=");
  const failures = [];
  if (!packExists) failures.push("missing_send_pack");
  if (!subject) failures.push("missing_subject");
  if (!hasCampaignId) failures.push("missing_campaign_id");
  if (subject.length > 90) failures.push("subject_too_long");
  if (!draft) failures.push("missing_draft");
  if (wordCount(draft) > 180) failures.push("draft_too_long");
  if (!draft.includes("Free sample:")) failures.push("missing_free_sample_link");
  if (!hasTracking) failures.push("missing_campaign_tracking");
  if (!draft.includes("No promises about views, subscribers, revenue, platform growth, or outcomes.")) failures.push("missing_no_promise_sentence");
  if (!/I noticed your/i.test(draft)) failures.push("missing_personalized_opening");
  const mojibake = mojibakeHits(`${subject}\n${draft}`);
  if (mojibake.length) failures.push(`mojibake:${mojibake.join(";")}`);
  const risky = riskHits(draft);
  if (risky.length) failures.push(`outcome_risk:${risky.join(";")}`);
  const sensitive = sensitiveHits(draft);
  if (sensitive.length) failures.push(`sensitive_request:${sensitive.join(";")}`);
  return {
    review_id: compact(row.review_id),
    campaign_id: compact(row.campaign_id),
    offer_sku: compact(row.offer_sku),
    subject_length: subject.length,
    draft_words: wordCount(draft),
    has_free_sample: draft.includes("Free sample:") ? "yes" : "no",
    has_campaign_tracking: hasTracking ? "yes" : "no",
    has_no_promise_sentence: draft.includes("No promises about views, subscribers, revenue, platform growth, or outcomes.") ? "yes" : "no",
    pack_exists: packExists ? "yes" : "no",
    status: failures.length ? "failed" : "passed",
    failures: failures.join("; ")
  };
}

function publicDoc(manifest) {
  return `# TrendFoundry Content Outreach Gate

Generated: ${manifest.generatedAt}

This gate checks reviewer-ready outreach packs before they enter the private action queue. It keeps the public report to aggregate counts only.

## Current Counts

- Review packs checked: ${manifest.checkCount}
- Passed checks: ${manifest.passedCount}
- Failed checks: ${manifest.failedCount}
- Missing packs: ${manifest.missingPackCount}
- Average draft words: ${manifest.averageDraftWords}

## Gate Rules

- Each send pack must exist.
- Subject line must be 90 characters or shorter.
- Draft must be 180 words or shorter.
- Draft must include the free sample link and the no-promise sentence.
- Draft must include campaign tracking parameters on buyer-facing links.
- Draft must not contain mojibake markers.
- Draft must not request sensitive account/payment data.
- Draft must not promise views, subscribers, revenue, platform growth, virality, or outcomes.

## Safety Boundary

- Does not send messages.
- Does not post content.
- Does not collect payment.
- Does not upload files.
- Does not expose private prospect rows in tracked docs.
`;
}

const boardText = await readTextMaybe(path.join(reviewDir, "review-board.csv"));
const reviewRows = parseCsv(boardText);
const checks = [];
for (const row of reviewRows) {
  const { packPath } = checksFor(row);
  const packExists = await exists(packPath);
  const packText = packExists ? await readTextMaybe(packPath) : "";
  checks.push(rowChecks(row, packText, packExists));
}

const failed = checks.filter((row) => row.status === "failed");
const manifest = {
  generatedAt: new Date().toISOString(),
  checkCount: checks.length,
  passedCount: checks.filter((row) => row.status === "passed").length,
  failedCount: failed.length,
  missingPackCount: checks.filter((row) => row.pack_exists !== "yes").length,
  averageDraftWords: checks.length ? Math.round(checks.reduce((sum, row) => sum + Number(row.draft_words || 0), 0) / checks.length) : 0,
  safety: {
    sendsMessages: false,
    postsContent: false,
    collectsPayment: false,
    uploadsFiles: false,
    exposesPrivateProspectsInDocs: false,
    noRevenuePromise: true,
    noViewPromise: true,
    noCredentialRequest: true
  }
};

await mkdir(docsDir, { recursive: true });
await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, "checks.csv"), toCsv(checks, [
  "review_id",
  "campaign_id",
  "offer_sku",
  "subject_length",
  "draft_words",
  "has_free_sample",
  "has_campaign_tracking",
  "has_no_promise_sentence",
  "pack_exists",
  "status",
  "failures"
]), "utf8");
await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
await writeFile(path.join(docsDir, "content-outreach-gate.md"), publicDoc(manifest), "utf8");

if (manifest.failedCount) {
  console.error(`Content outreach gate failed for ${manifest.failedCount} pack(s).`);
  process.exit(1);
}

console.log(`Wrote ${path.join(docsDir, "content-outreach-gate.md")}`);
console.log(`Outreach gate passed: ${manifest.passedCount}/${manifest.checkCount}`);
