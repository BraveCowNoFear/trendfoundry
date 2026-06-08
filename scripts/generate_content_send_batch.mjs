import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const outDir = path.join(root, "dist", "content-send-batch");
const batchSize = Number.parseInt(process.env.TRENDFOUNDRY_SEND_BATCH_SIZE || "3", 10);

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

async function readJsonMaybe(relativePath, fallback = {}) {
  try {
    return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
  } catch {
    return fallback;
  }
}

function rankRows({ reviewRows, gateRows, sendRows, experiment }) {
  const passed = new Set(gateRows.filter((row) => row.status === "passed").map((row) => compact(row.review_id)));
  const sent = new Set(sendRows.map((row) => compact(row.review_id)));
  const recommendedVariant = compact(experiment.recommendedVariant);
  return reviewRows
    .filter((row) => passed.has(compact(row.review_id)) && !sent.has(compact(row.review_id)))
    .map((row) => {
      const variantMatch = recommendedVariant && compact(row.variant_id) === recommendedVariant;
      const closeRank = Number.parseInt(compact(row.close_rank, "999"), 10);
      return {
        review_id: compact(row.review_id),
        campaign_id: compact(row.campaign_id),
        variant_id: compact(row.variant_id, "unassigned"),
        variant_match: variantMatch ? "yes" : "no",
        close_rank: Number.isFinite(closeRank) ? closeRank : 999,
        creator: compact(row.creator, "private prospect"),
        source: compact(row.source),
        topic: compact(row.topic),
        offer_sku: compact(row.offer_sku),
        subject: compact(row.subject),
        review_file: `dist/content-outreach-review/send-packs/${compact(row.review_id)}.md`,
        command: `npm run complete-content-outreach-send -- --review-id="${compact(row.review_id)}"`,
        next_action: variantMatch
          ? "review, personalize, send manually if safe, then record the send receipt"
          : "backup send candidate if recommended variant queue is exhausted",
        selection_reason: variantMatch
          ? `matches recommended variant ${recommendedVariant}`
          : "gate passed and unsent fallback candidate"
      };
    })
    .sort((left, right) => {
      if (left.variant_match !== right.variant_match) return left.variant_match === "yes" ? -1 : 1;
      return left.close_rank - right.close_rank || left.review_id.localeCompare(right.review_id);
    });
}

function privateMarkdown({ generatedAt, rows, experiment }) {
  return `# TrendFoundry Content Send Batch

Generated: ${generatedAt}

Private local batch. Do not publish creator names, channels, tracked URLs, private replies, or payment references from this file.

## Batch Focus

- Recommended variant: ${experiment.recommendedVariant || "none"}
- Recommended action: ${experiment.recommendedAction || "none"}
- Batch size: ${rows.length}

## Next Sends

| Rank | Variant | Match | Creator | Source | Offer | Subject | Review File | Command |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- |
${rows.map((row, index) => `| ${index + 1} | ${row.variant_id} | ${row.variant_match} | ${row.creator.replace(/\|/g, "/")} | ${row.source} | ${row.offer_sku} | ${row.subject.replace(/\|/g, "/")} | ${row.review_file} | \`${row.command}\` |`).join("\n") || "| - | - | - | - | - | - | No unsent gate-passed campaigns. | - | - |"}

## Safety

- Review the source URL and first sentence before sending.
- No automatic sending.
- No payment action.
- No upload.
- No sensitive data request.
- No promise of views, subscribers, revenue, platform growth, or outcomes.
`;
}

function publicMarkdown(manifest) {
  return `# TrendFoundry Content Send Batch

Generated: ${manifest.generatedAt}

This report summarizes the private next-send batch selected from gate-passed outreach campaigns. Detailed creator rows stay in ignored \`dist/content-send-batch/\`.

## Current Counts

- Batch rows: ${manifest.batchCount}
- Gate-passed unsent candidates: ${manifest.unsentPassedCount}
- Recommended variant: ${manifest.recommendedVariant || "none"}
- Recommended-variant rows in batch: ${manifest.recommendedVariantBatchCount}
- Public-safe private rows exposed here: 0

## Operator Flow

1. Review ignored \`dist/content-send-batch/send-batch.md\`.
2. Open the first listed send pack.
3. Personalize and send manually only if safe.
4. Record the send receipt with the listed command.
5. Run \`npm run content-ops\` again so attribution and experiments update.

## Safety Boundary

- Does not send messages.
- Does not collect payment.
- Does not upload files.
- Does not build or overwrite the frontend.
- Does not expose private creator rows in tracked docs.
- Does not promise views, subscribers, revenue, platform growth, or buyer outcomes.
`;
}

const generatedAt = new Date().toISOString();
const reviewRows = await readCsvMaybe("dist/content-outreach-review/review-board.csv");
const gateRows = await readCsvMaybe("dist/content-outreach-gate/checks.csv");
const sendRows = await readCsvMaybe("dist/content-outreach-sends/send-log.csv");
const experiment = await readJsonMaybe("dist/content-experiments/manifest.json", {});
const ranked = rankRows({ reviewRows, gateRows, sendRows, experiment });
const rows = ranked.slice(0, Math.max(1, batchSize));
const manifest = {
  generatedAt,
  batchCount: rows.length,
  unsentPassedCount: ranked.length,
  recommendedVariant: compact(experiment.recommendedVariant),
  recommendedAction: compact(experiment.recommendedAction),
  recommendedVariantBatchCount: rows.filter((row) => row.variant_match === "yes").length,
  variantCounts: rows.reduce((acc, row) => {
    acc[row.variant_id] = (acc[row.variant_id] || 0) + 1;
    return acc;
  }, {}),
  safety: {
    sendsMessages: false,
    collectsPayment: false,
    uploadsFiles: false,
    buildsFrontend: false,
    exposesPrivateSendRowsInDocs: false,
    noRevenuePromise: true,
    noViewPromise: true,
    noCredentialRequest: true
  }
};

await mkdir(docsDir, { recursive: true });
await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, "send-batch.csv"), toCsv(rows, [
  "review_id",
  "campaign_id",
  "variant_id",
  "variant_match",
  "close_rank",
  "creator",
  "source",
  "topic",
  "offer_sku",
  "subject",
  "review_file",
  "command",
  "next_action",
  "selection_reason"
]), "utf8");
await writeFile(path.join(outDir, "send-batch.md"), privateMarkdown({ generatedAt, rows, experiment }), "utf8");
await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
await writeFile(path.join(docsDir, "content-send-batch.md"), publicMarkdown(manifest), "utf8");

console.log(`Wrote ${path.join(docsDir, "content-send-batch.md")}`);
console.log(`Send batch rows: ${manifest.batchCount}`);
