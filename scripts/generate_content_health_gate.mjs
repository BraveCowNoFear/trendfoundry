import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const outDir = path.join(root, "dist", "content-health-gate");

const mojibakeTokens = [
  "\uFFFD",
  "\u9225",
  "\u9286",
  "\u9365",
  "\u7459\u55DB",
  "\u5BB8\u30E4",
  "\u7D94",
  "\u5A34",
  "\u6A5D",
  "\u9428",
  "\u52EB",
  "\u701B",
  "\u6A9A"
];

const publicDocs = [
  "docs/content-action-brief.md",
  "docs/buyer-content-pack.md",
  "docs/content-close-pack.md",
  "docs/content-customer-success.md",
  "docs/content-deal-desk.md",
  "docs/content-delivery-gate.md",
  "docs/content-editorial-audit.md",
  "docs/content-evidence-pack.md",
  "docs/content-feedback-loop.md",
  "docs/content-fulfillment-queue.md",
  "docs/content-reply-intake.md",
  "docs/content-testimonials.md",
  "docs/content-outreach-review.md",
  "docs/content-outreach-sends.md",
  "docs/content-ops.md",
  "docs/content-product-listing.md",
  "docs/content-prospecting.md",
  "docs/content-revenue-model.md",
  "docs/content-sales-crm.md",
  "docs/content-sales-sequence.md",
  "docs/content-subscription-crm.md",
  "docs/content-subscription-due.md",
  "docs/content-subscription-fulfillment.md",
  "docs/content-subscription-plan.md",
  "docs/content-subscription-retention.md",
  "docs/custom-proof-pack.md",
  "docs/custom-email-fulfillment.md",
  "docs/email-subscription-sync.md",
  "docs/email-order-routing.md",
  "docs/episode-workbench.md",
  "docs/full-episode-script.md"
];

const privateFiles = [
  "dist/content-action-brief/actions.csv",
  "dist/content-action-brief/action-brief.md",
  "dist/full-episode-script/latest.json",
  "dist/episode-workbench/latest.json",
  "dist/content-delivery-gate/checks.csv",
  "dist/content-evidence-pack/content-evidence-pack.md",
  "dist/content-evidence-pack/evidence.csv",
  "dist/content-evidence-pack/claim-checklist.csv",
  "dist/content-close-pack/today-close-queue.csv",
  "dist/content-subscription-crm/due-queue.csv",
  "dist/content-subscription-crm/due-queue.md",
  "dist/content-subscription-due/prepared.csv",
  "dist/content-subscription-due/prepared.md",
  "dist/content-subscription-retention/drafts.csv",
  "dist/content-subscription-retention/drafts.md",
  "dist/content-outreach-review/review-board.csv",
  "dist/content-outreach-review/review-board.md",
  "dist/content-deal-desk/deal-desk.csv",
  "dist/content-deal-desk/deal-desk.md",
  "dist/content-deal-desk/response-drafts.md",
  "dist/content-deal-desk/invoice-drafts.md",
  "dist/content-fulfillment-queue/fulfillment-queue.csv",
  "dist/content-fulfillment-queue/fulfillment-queue.md",
  "dist/content-customer-success/followups.csv",
  "dist/content-customer-success/followup-drafts.md",
  "dist/content-testimonials/testimonials.csv",
  "dist/content-testimonials/testimonial-bank.md",
  "dist/content-testimonials/publish-candidates.md",
  "dist/content-outreach-sends/send-log.csv",
  "dist/content-outreach-sends/send-log.md",
  "dist/content-reply-intake/parsed-replies.csv",
  "dist/content-reply-intake/parsed-replies.md",
  "dist/email-subscription-sync/synced.csv",
  "dist/custom-email-orders/custom-email-orders.md",
  "dist/email-order-routing/routes.csv",
  "dist/content-sales-crm/pipeline.csv",
  "dist/content-prospecting/prospects.csv"
];

const sourceFiles = [
  "scripts/generate_content_action_brief.mjs",
  "scripts/generate_full_episode_script.mjs",
  "scripts/generate_episode_workbench.mjs",
  "scripts/generate_content_evidence_pack.mjs",
  "scripts/generate_content_delivery_gate.mjs",
  "scripts/generate_content_customer_success.mjs",
  "scripts/generate_content_testimonials.mjs",
  "scripts/update_content_testimonial_status.mjs",
  "scripts/generate_content_outreach_send_log.mjs",
  "scripts/complete_content_outreach_send.mjs",
  "scripts/intake_content_replies.mjs",
  "scripts/generate_buyer_content_pack.mjs",
  "scripts/run_content_ops.mjs",
  "scripts/update_content_sale_status.mjs",
  "scripts/complete_content_order_delivery.mjs",
  "scripts/complete_custom_proof_delivery.mjs",
  "scripts/generate_content_fulfillment_queue.mjs"
];

function compact(value, fallback = "") {
  return String(value || fallback).replace(/\s+/g, " ").trim();
}

async function readTextMaybe(relativePath) {
  try {
    return await readFile(path.join(root, relativePath), "utf8");
  } catch {
    return "";
  }
}

async function readJsonMaybe(relativePath) {
  try {
    return JSON.parse(await readTextMaybe(relativePath));
  } catch {
    return {};
  }
}

function tokenHits(text) {
  const hits = [];
  for (const token of mojibakeTokens) {
    const count = text.split(token).length - 1;
    if (count > 0) hits.push({ token: token === "\uFFFD" ? "replacement-char" : `U+${token.codePointAt(0).toString(16).toUpperCase()}`, count });
  }
  const denseQuestionMarks = text.match(/\?{3,}/g) || [];
  if (denseQuestionMarks.length) hits.push({ token: "dense-question-marks", count: denseQuestionMarks.length });
  return hits;
}

function hasReadableChinese(text) {
  return /[\u4E00-\u9FFF]/.test(text);
}

function healthRows(files) {
  return files.map(({ path: filePath, text, scope }) => {
    const hits = tokenHits(text);
    return {
      file: filePath,
      scope,
      bytes: Buffer.byteLength(text, "utf8"),
      readable_chinese: hasReadableChinese(text) ? "yes" : "no",
      mojibake_hits: hits.reduce((sum, hit) => sum + hit.count, 0),
      hit_tokens: hits.map((hit) => `${hit.token}:${hit.count}`).join("; ")
    };
  });
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows, columns) {
  return [columns.join(","), ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))].join("\n");
}

function markdown({ generatedAt, rows, latest, closeManifest, publicLeakCount }) {
  const bilibiliItems = (latest.items || []).filter((item) => item.source === "bilibili");
  const readableBilibili = bilibiliItems.filter((item) => hasReadableChinese(`${item.title} ${item.summary} ${item.author || ""}`));
  const badRows = rows.filter((row) => row.mojibake_hits > 0);
  return `# TrendFoundry Content Health Gate

Generated: ${generatedAt}

This gate checks text integrity and sales-safety boundaries for the content-only operating lane. It uses UTF-8 file reads, so it is authoritative when PowerShell console output visually garbles Chinese text.

## Summary

- Checked files: ${rows.length}
- Files with mojibake markers: ${badRows.length}
- Bilibili items in latest dataset: ${bilibiliItems.length}
- Bilibili items with readable Chinese text: ${readableBilibili.length}
- Close pack selected rows: ${closeManifest.selectedCount ?? "unknown"}
- Public close doc prospect leaks: ${publicLeakCount}

## File Checks

| File | Scope | Readable Chinese | Mojibake hits | Hit tokens |
| --- | --- | --- | ---: | --- |
${rows.map((row) => `| ${row.file} | ${row.scope} | ${row.readable_chinese} | ${row.mojibake_hits} | ${row.hit_tokens || "none"} |`).join("\n")}

## Bilibili Sample

${readableBilibili.slice(0, 3).map((item) => `- ${compact(item.title, "untitled")} (${compact(item.author, "unknown creator")})`).join("\n") || "- No readable Bilibili sample available."}

## Safety Boundary

- Does not send messages.
- Does not post content.
- Does not collect payment.
- Does not build or overwrite the frontend.
- Does not publish private prospect rows.
`;
}

const generatedAt = new Date().toISOString();
const latest = await readJsonMaybe("data/latest.json");
const closeManifest = await readJsonMaybe("dist/content-close-pack/manifest.json");
const closeDoc = await readTextMaybe("docs/content-close-pack.md");
const closeQueue = await readTextMaybe("dist/content-close-pack/today-close-queue.csv");
const prospectLeakCandidates = closeQueue
  .split(/\r?\n/)
  .slice(1)
  .map((line) => line.split(",")[1])
  .filter(Boolean);
const publicLeakCount = prospectLeakCandidates.filter((candidate) => closeDoc.includes(candidate)).length;
const files = [];
for (const filePath of ["data/latest.json", ...sourceFiles, ...publicDocs, ...privateFiles]) {
  files.push({
    path: filePath,
    text: await readTextMaybe(filePath),
    scope: filePath.startsWith("dist/") ? "private-ignored" : filePath.startsWith("scripts/") ? "tracked-source" : "public-or-tracked"
  });
}
const rows = healthRows(files);
const manifest = {
  generatedAt,
  checkedFileCount: rows.length,
  filesWithMojibakeMarkers: rows.filter((row) => row.mojibake_hits > 0).length,
  bilibiliItemCount: (latest.items || []).filter((item) => item.source === "bilibili").length,
  readableBilibiliCount: (latest.items || []).filter((item) => item.source === "bilibili" && hasReadableChinese(`${item.title} ${item.summary} ${item.author || ""}`)).length,
  closePackSelectedCount: closeManifest.selectedCount,
  publicCloseDocProspectLeaks: publicLeakCount,
  safety: {
    sendsMessages: false,
    postsContent: false,
    collectsPayment: false,
    buildsFrontend: false,
    exposesPrivateProspectsInDocs: publicLeakCount > 0,
    noRevenuePromise: true,
    noViewPromise: true
  }
};

await mkdir(docsDir, { recursive: true });
await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, "checks.csv"), toCsv(rows, ["file", "scope", "bytes", "readable_chinese", "mojibake_hits", "hit_tokens"]), "utf8");
await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
await writeFile(path.join(docsDir, "content-health-gate.md"), markdown({ generatedAt, rows, latest, closeManifest, publicLeakCount }), "utf8");

if (manifest.filesWithMojibakeMarkers > 0 || publicLeakCount > 0) {
  console.error(`Content health gate failed: ${manifest.filesWithMojibakeMarkers} file(s) with mojibake markers, ${publicLeakCount} public leak(s).`);
  process.exit(1);
}

console.log(`Wrote ${path.join(docsDir, "content-health-gate.md")}`);
