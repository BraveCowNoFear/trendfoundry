import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const outDir = path.join(root, "dist", "content-outreach-export");
const draftsDir = path.join(outDir, "drafts");

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

async function readTextMaybe(relativePath) {
  try {
    return await readFile(path.join(root, relativePath), "utf8");
  } catch {
    return "";
  }
}

function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function extractFencedBlock(text, heading) {
  const headingIndex = text.indexOf(`## ${heading}`);
  if (headingIndex < 0) return "";
  const fenceStart = text.indexOf("```", headingIndex);
  if (fenceStart < 0) return "";
  const afterFence = text.indexOf("\n", fenceStart);
  if (afterFence < 0) return "";
  const fenceEnd = text.indexOf("```", afterFence + 1);
  if (fenceEnd < 0) return "";
  return text.slice(afterFence + 1, fenceEnd).replace(/\s+$/g, "");
}

function normalizeSubject(value) {
  return compact(String(value).replace(/[\r\n]+/g, " ")).slice(0, 200);
}

function buildEml({ subject, body }) {
  const today = new Date().toUTCString();
  const safeSubject = subject.replace(/[\r\n]+/g, " ");
  const headers = [
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    `Date: ${today}`,
    "From: ",
    "To: ",
    `Subject: ${safeSubject}`,
    "X-TrendFoundry-Status: draft-review-before-sending"
  ];
  return `${headers.join("\r\n")}\r\n\r\n${body.replace(/\r?\n/g, "\r\n")}\r\n`;
}

function buildMailto({ subject, body }) {
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);
  return `mailto:?subject=${encodedSubject}&body=${encodedBody}\n`;
}

function buildRecordCommand(reviewId) {
  return `npm run complete-content-outreach-send -- --review-id="${reviewId}"\n`;
}

function privateMarkdown({ generatedAt, rows }) {
  const lines = [
    "# TrendFoundry Content Outreach Draft Export",
    "",
    `Generated: ${generatedAt}`,
    "",
    "Private local draft export. Do not publish creator names, channels, draft bodies, or tracked URLs from this file.",
    "",
    "## Drafts",
    "",
    "| Rank | Variant | Match | Creator | Source | Offer | Subject | EML | Mailto | Record Command |",
    "| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- |"
  ];
  if (!rows.length) {
    lines.push("| - | - | - | - | - | - | No gate-passed unsent drafts. | - | - | - |");
  } else {
    rows.forEach((row, index) => {
      lines.push(`| ${index + 1} | ${row.variant_id} | ${row.variant_match} | ${row.creator.replace(/\|/g, "/")} | ${row.source} | ${row.offer_sku} | ${row.subject.replace(/\|/g, "/")} | ${row.eml_file} | ${row.mailto_file} | \`${row.record_command_text}\` |`);
    });
  }
  lines.push("");
  lines.push("## Safety");
  lines.push("");
  lines.push("- Does not send messages.");
  lines.push("- Does not collect payment.");
  lines.push("- Does not upload files.");
  lines.push("- Does not build or overwrite the frontend.");
  lines.push("- Does not expose private draft bodies in tracked docs.");
  lines.push("- Does not promise views, subscribers, revenue, platform growth, or buyer outcomes.");
  lines.push("- Drafts have empty From/To headers; reviewer must add the verified recipient address before sending.");
  lines.push("");
  return lines.join("\n");
}

function publicMarkdown(manifest) {
  return `# TrendFoundry Content Outreach Draft Export

Generated: ${manifest.generatedAt}

This report summarizes the private draft export produced from the next-send batch. Detailed creator rows and draft bodies stay in ignored \`dist/content-outreach-export/\`.

## Current Counts

- Draft packets exported: ${manifest.draftCount}
- Recommended-variant packets: ${manifest.recommendedVariantCount}
- Fallback-variant packets: ${manifest.fallbackVariantCount}
- Source send-batch rows: ${manifest.sourceBatchRows}
- Public-safe draft bodies exposed here: 0

## Operator Flow

1. Review ignored \`dist/content-outreach-export/drafts.md\`.
2. For each draft, open the matching \`.eml\` file in your mail client, or use the \`.mailto.txt\` link.
3. Fill in the verified recipient address; the export never guesses an email.
4. Personalize, then send manually only if safe.
5. Record the send receipt with the listed command.
6. Re-run \`npm run content-ops\` so attribution, experiments, and the next batch update.

## Safety Boundary

- Does not send messages.
- Does not collect payment.
- Does not upload files.
- Does not build or overwrite the frontend.
- Does not expose private draft bodies in tracked docs.
- Does not promise views, subscribers, revenue, platform growth, or buyer outcomes.
- Drafts ship with empty From/To headers; the reviewer must add the verified recipient address before sending.
`;
}

const generatedAt = new Date().toISOString();
const batchCsv = stripBom(await readTextMaybe("dist/content-send-batch/send-batch.csv"));
const batchRows = parseCsv(batchCsv);

await rm(draftsDir, { recursive: true, force: true });
await mkdir(draftsDir, { recursive: true });
await mkdir(docsDir, { recursive: true });
await mkdir(outDir, { recursive: true });

const exportedRows = [];
const skippedRows = [];

for (const row of batchRows) {
  const reviewId = compact(row.review_id);
  if (!reviewId) continue;
  const packPath = compact(row.review_file) || `dist/content-outreach-review/send-packs/${reviewId}.md`;
  const packText = stripBom(await readTextMaybe(packPath));
  if (!packText) {
    skippedRows.push({ reviewId, reason: "missing-send-pack" });
    continue;
  }
  const subjectRaw = extractFencedBlock(packText, "Subject");
  const draftRaw = extractFencedBlock(packText, "Draft");
  if (!subjectRaw || !draftRaw) {
    skippedRows.push({ reviewId, reason: "missing-subject-or-draft" });
    continue;
  }
  const subject = normalizeSubject(subjectRaw || row.subject);
  const body = draftRaw.replace(/\s+$/g, "");
  const eml = buildEml({ subject, body });
  const mailto = buildMailto({ subject, body });
  const recordCommand = buildRecordCommand(reviewId);
  await writeFile(path.join(draftsDir, `${reviewId}.eml`), eml, "utf8");
  await writeFile(path.join(draftsDir, `${reviewId}.mailto.txt`), mailto, "utf8");
  await writeFile(path.join(draftsDir, `${reviewId}.record.txt`), recordCommand, "utf8");
  exportedRows.push({
    review_id: reviewId,
    campaign_id: compact(row.campaign_id),
    variant_id: compact(row.variant_id, "unassigned"),
    variant_match: compact(row.variant_match, "no"),
    creator: compact(row.creator, "private prospect"),
    source: compact(row.source),
    offer_sku: compact(row.offer_sku),
    subject,
    eml_file: `drafts/${reviewId}.eml`,
    mailto_file: `drafts/${reviewId}.mailto.txt`,
    record_command: `drafts/${reviewId}.record.txt`,
    record_command_text: recordCommand.trim()
  });
}

const recommendedVariantCount = exportedRows.filter((row) => row.variant_match === "yes").length;
const manifest = {
  generatedAt,
  draftCount: exportedRows.length,
  recommendedVariantCount,
  fallbackVariantCount: exportedRows.length - recommendedVariantCount,
  sourceBatchRows: batchRows.length,
  skippedCount: skippedRows.length,
  skippedRows,
  safety: {
    sendsMessages: false,
    collectsPayment: false,
    uploadsFiles: false,
    buildsFrontend: false,
    exposesPrivateDraftBodiesInDocs: false,
    noRevenuePromise: true,
    noViewPromise: true,
    noCredentialRequest: true,
    requiresManualRecipientEntry: true
  }
};

await writeFile(path.join(outDir, "drafts.csv"), toCsv(exportedRows, [
  "review_id",
  "campaign_id",
  "variant_id",
  "variant_match",
  "creator",
  "source",
  "offer_sku",
  "subject",
  "eml_file",
  "mailto_file",
  "record_command"
]), "utf8");
await writeFile(path.join(outDir, "drafts.md"), privateMarkdown({ generatedAt, rows: exportedRows }), "utf8");
await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
await writeFile(path.join(docsDir, "content-outreach-export.md"), publicMarkdown(manifest), "utf8");

console.log(`Wrote ${path.join(docsDir, "content-outreach-export.md")}`);
console.log(`Exported drafts: ${manifest.draftCount} (recommended ${manifest.recommendedVariantCount} / fallback ${manifest.fallbackVariantCount})`);
