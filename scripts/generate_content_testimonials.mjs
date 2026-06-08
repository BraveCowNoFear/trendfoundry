import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const outDir = path.join(root, "dist", "content-testimonials");
const privateDir = path.join(root, "data", "content-sales-crm");

const riskyOutcomePatterns = [
  /\bviews?\b/i,
  /\bsubscribers?\b/i,
  /\brevenue\b/i,
  /\bincome\b/i,
  /\bsales\b/i,
  /\bgrowth\b/i,
  /\bviral\b/i,
  /\bROI\b/i,
  /\bMRR\b/i,
  /\bconversion\b/i
];

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

function hasRiskyOutcomeClaim(text) {
  return riskyOutcomePatterns.some((pattern) => pattern.test(text));
}

function hasSensitiveData(text) {
  return /password|card number|private id|wallet seed|seed phrase|api key|secret/i.test(text);
}

function reviewStatus(row) {
  const quote = compact(row.quote);
  if (row.permission === "declined" || row.stage === "declined") return "do_not_publish";
  if (!quote) return "missing_quote";
  if (hasSensitiveData(quote)) return "blocked_sensitive_data";
  if (row.permission !== "explicit") return "needs_permission";
  if (row.stage !== "publish_ready") return "needs_review";
  if (hasRiskyOutcomeClaim(quote)) return "needs_outcome_claim_review";
  return "publish_candidate";
}

function enrichRows(rows) {
  return rows.map((row, index) => {
    const status = reviewStatus(row);
    return {
      testimonial_id: `tm-${String(index + 1).padStart(2, "0")}`,
      source: compact(row.source, "unknown"),
      creator: compact(row.creator, "unknown"),
      quote: compact(row.quote, ""),
      permission: compact(row.permission, "not_requested"),
      stage: compact(row.stage, "needs_review"),
      context: compact(row.context, "not-provided"),
      next_due: compact(row.next_due, ""),
      review_status: status,
      usable_in_public: status === "publish_candidate" ? "yes_after_final_review" : "no",
      notes: compact(row.notes, "")
    };
  });
}

function privateMarkdown({ rows, candidates, permissionRows }) {
  return `# TrendFoundry Testimonial Bank

Generated: ${new Date().toISOString()}

Private local testimonial bank. Do not publish this file.

## Publish Candidates

| ID | Creator | Source | Context | Quote |
| --- | --- | --- | --- | --- |
${candidates.map((row) => `| ${row.testimonial_id} | ${row.creator.replace(/\|/g, "/")} | ${row.source} | ${row.context.replace(/\|/g, "/")} | ${row.quote.replace(/\|/g, "/")} |`).join("\n") || "| - | - | - | - | No permissioned publish candidates. |"}

## Needs Permission Or Review

| ID | Creator | Permission | Stage | Status | Next due |
| --- | --- | --- | --- | --- | --- |
${permissionRows.map((row) => `| ${row.testimonial_id} | ${row.creator.replace(/\|/g, "/")} | ${row.permission} | ${row.stage} | ${row.review_status} | ${row.next_due || "-"} |`).join("\n") || "| - | - | - | - | - | No pending testimonial rows. |"}

## Safety

- Publish only after explicit permission and final human review.
- Do not publish contact details, private buyer identity, account data, or payment details.
- Do not publish claims about views, subscribers, revenue, platform growth, or buyer outcomes without separate evidence and legal review.
- This script does not post testimonials or update the public site.
`;
}

function publicDoc({ rows, candidates, permissionRows }) {
  const statusCounts = Object.fromEntries([...new Set(rows.map((row) => row.review_status))].map((status) => [status, rows.filter((row) => row.review_status === status).length]));
  return `# TrendFoundry Content Testimonials

Generated: ${new Date().toISOString()}

This step turns private buyer feedback into a local social-proof review queue. Private buyer names, quotes, and contacts stay in ignored \`dist/content-testimonials/\` and \`data/content-sales-crm/testimonials.csv\`.

## Current Counts

- Private testimonial rows: ${rows.length}
- Publish candidates after final review: ${candidates.length}
- Needs permission or review: ${permissionRows.length}
- Status mix: ${Object.entries(statusCounts).map(([status, count]) => `${status}=${count}`).join(", ") || "none"}

## Operator Workflow

1. Ask for quote permission through \`dist/content-customer-success/followup-drafts.md\`.
2. Record permission and quote locally:

\`\`\`bash
npm run record-content-testimonial -- --source="youtube" --creator="Creator Name" --quote="Short approved quote" --permission="explicit" --stage="publish_ready" --context="After proof script delivery"
\`\`\`

3. Run \`npm run content-testimonials\` or full \`npm run content-ops\`.
4. Review private \`dist/content-testimonials/testimonial-bank.md\`.
5. Publish only after final manual review and explicit permission.

## Safety Boundary

- Does not send messages.
- Does not post testimonials.
- Does not collect payment.
- Does not expose private buyer rows in public docs.
- Blocks sensitive data and routes outcome claims to review.
- Does not promise views, subscribers, revenue, platform growth, or buyer outcomes.
`;
}

const rawRows = await readCsvMaybe(path.join(privateDir, "testimonials.csv"));
const rows = enrichRows(rawRows);
const candidates = rows.filter((row) => row.review_status === "publish_candidate");
const permissionRows = rows.filter((row) => row.review_status !== "publish_candidate" && row.review_status !== "do_not_publish");
const blockedRows = rows.filter((row) => row.review_status.startsWith("blocked") || row.review_status.includes("outcome_claim"));
const manifest = {
  generatedAt: new Date().toISOString(),
  testimonialRows: rows.length,
  publishCandidateCount: candidates.length,
  permissionOrReviewCount: permissionRows.length,
  blockedCount: blockedRows.length,
  statusCounts: Object.fromEntries([...new Set(rows.map((row) => row.review_status))].map((status) => [status, rows.filter((row) => row.review_status === status).length])),
  safety: {
    sendsMessages: false,
    postsTestimonials: false,
    collectsPayment: false,
    exposesPrivateBuyersInDocs: false,
    requiresExplicitPermissionBeforePublishing: true,
    blocksSensitiveData: true,
    routesOutcomeClaimsToReview: true,
    noRevenuePromise: true,
    noViewPromise: true
  }
};

await mkdir(docsDir, { recursive: true });
await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
await writeFile(path.join(outDir, "testimonials.csv"), toCsv(rows, [
  "testimonial_id",
  "source",
  "creator",
  "quote",
  "permission",
  "stage",
  "context",
  "next_due",
  "review_status",
  "usable_in_public",
  "notes"
]), "utf8");
await writeFile(path.join(outDir, "publish-candidates.md"), candidates.map((row) => `## ${row.testimonial_id}\n\n${row.quote}\n\n- Source: ${row.source}\n- Context: ${row.context}\n- Permission: ${row.permission}\n`).join("\n") || "No publish candidates.\n", "utf8");
await writeFile(path.join(outDir, "testimonial-bank.md"), privateMarkdown({ rows, candidates, permissionRows }), "utf8");
await writeFile(path.join(docsDir, "content-testimonials.md"), publicDoc({ rows, candidates, permissionRows }), "utf8");

console.log(`Wrote ${path.join(docsDir, "content-testimonials.md")}`);
console.log(`Testimonial rows: ${rows.length}`);
