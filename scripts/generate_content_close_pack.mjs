import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const outDir = path.join(root, "dist", "content-close-pack");
const today = new Date().toISOString().slice(0, 10);
const maxRows = Number(process.env.CONTENT_CLOSE_LIMIT || 5);

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

async function readCsv(relativePath) {
  return parseCsv(await readFile(path.join(root, relativePath), "utf8"));
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

function hasMojibake(row) {
  const text = Object.values(row).join(" ");
  const markerPattern = new RegExp([
    "\\uFFFD", "\\u9225", "\\u9286", "\\u9365", "\\u5287", "\\u6553",
    "\\u7459", "\\u55DB", "\\u5BB8", "\\u7D94", "\\u5A34", "\\u7ED4",
    "\\u6A5D", "\\u9428", "\\u52EB", "\\u6093", "\\u701B", "\\u6A9A",
    "\\uFF1F"
  ].join("|"));
  return markerPattern.test(text) || new RegExp("\\?{2,}").test(text);
}

function isDue(row) {
  return !row.next_due || row.next_due <= today || row.priority_band === "today";
}

function productOffer(row, products) {
  const fit = compact(row.product_fit || "trendfoundry-proof-script-pack");
  if (fit === "custom-proof-pack") {
    return products.find((product) => product.sku === "trendfoundry-proof-custom") || products.at(-1);
  }
  if (fit === "weekly-proof-pack") {
    return products.find((product) => product.sku === "trendfoundry-proof-weekly") || products[1];
  }
  return products.find((product) => product.sku === "trendfoundry-proof-script-pack") || products[0];
}

function firstSentence(text) {
  return compact(text).split(/[.!?。！？]/).find(Boolean)?.trim() || compact(text);
}

function chooseRows(pipelineRows) {
  const due = pipelineRows.filter(isDue);
  const clean = pipelineRows.filter((row) => !hasMojibake(row));
  const dueClean = due.filter((row) => !hasMojibake(row));
  const selected = [
    ...dueClean.filter((row) => row.source === "youtube"),
    ...clean.filter((row) => row.source === "youtube" && row.priority_band === "next_48h"),
    ...clean.filter((row) => row.source === "youtube"),
    ...dueClean.filter((row) => row.source !== "youtube"),
    ...pipelineRows.filter(hasMojibake)
  ]
    .filter((row, index, rows) => rows.findIndex((candidate) => candidate.creator === row.creator && candidate.proof_url === row.proof_url) === index)
    .slice(0, maxRows);
  return selected.map((row, index) => ({ ...row, close_rank: index + 1, text_quality: hasMojibake(row) ? "needs_manual_cleanup" : "clean" }));
}

function makeCloseRows({ selected, questions, products }) {
  return selected.map((row, index) => {
    const product = productOffer(row, products);
    const question = questions[index % questions.length] || {};
    const topic = compact(row.topic, "AI/developer creator workflow");
    const opener = `I noticed your ${row.source} work around "${firstSentence(topic)}" and prepared a proof-first sample that turns public AI/dev signals into a recordable episode outline.`;
    const ask = question.question || "Which proof asset would you actually record this week?";
    const draft = [
      opener,
      `Free sample: ${product.free_sample_url || "https://bravecownofear.github.io/trendfoundry/trendfoundry-free-sample-pack.zip"}`,
      `Most relevant offer: ${product.title || "TrendFoundry Proof-First Script Pack"} at USD ${product.price_usd || 9} (${product.billing || "one_time"}), only if the sample looks useful after review.`,
      `One feedback question: ${ask}`
    ].join("\n\n");
    return {
      close_rank: row.close_rank,
      creator: row.creator,
      source: row.source,
      topic,
      proof_url: row.proof_url,
      priority_score: row.priority_score,
      product_fit: row.product_fit,
      offer_sku: product.sku,
      offer_price_usd: product.price_usd,
      text_quality: row.text_quality,
      review_action: row.text_quality === "clean" ? "review_personalize_then_send_manually" : "fix_text_then_review",
      feedback_question: ask,
      reply_capture: `${row.source},${row.creator},<summary>,<objection>,replied_needs_response,<notes>`,
      draft
    };
  });
}

function closeQueueMarkdown(rows) {
  return `# TrendFoundry Daily Close Queue

Generated: ${new Date().toISOString()}

This is a private local operator queue. Review one row at a time, personalize the draft, then manually decide whether to send outside this script.

| Rank | Creator | Source | Offer | Text quality | Review action |
| --- | --- | --- | --- | --- | --- |
${rows.map((row) => `| ${row.close_rank} | ${row.creator.replace(/\|/g, "/")} | ${row.source} | ${row.offer_sku} | ${row.text_quality} | ${row.review_action} |`).join("\n")}

## Drafts

${rows.map((row) => `### ${row.close_rank}. ${row.creator}

- Source: ${row.source}
- Topic: ${row.topic}
- Proof URL: ${row.proof_url}
- Feedback question: ${row.feedback_question}
- Reply capture row: \`${row.reply_capture.replace(/`/g, "'")}\`

\`\`\`text
${row.draft}
\`\`\`
`).join("\n")}

## Safety

- No automatic sending.
- No automatic posting.
- No payment collection.
- No request for sensitive payment or account data.
- No promise of views, subscribers, revenue, platform growth, or buyer outcomes.
`;
}

function publicDoc({ dueRows, closeRows, questions }) {
  const cleanCount = closeRows.filter((row) => row.text_quality === "clean").length;
  return `# TrendFoundry Content Close Pack

Generated: ${new Date().toISOString()}

This document describes the daily close workflow without publishing the private prospect table. Detailed review rows stay in ignored \`dist/content-close-pack/\`.

## Current Queue

- Selected review rows: ${closeRows.length}
- Clean text rows: ${cleanCount}
- Rows needing manual text cleanup: ${closeRows.length - cleanCount}
- Due prospect rows considered: ${dueRows.length}
- Feedback questions available: ${questions.length}

## Operator Workflow

1. Open \`dist/content-close-pack/today-close-queue.md\`.
2. Review only one prospect at a time.
3. Check the public source URL before sending anything.
4. Personalize the draft and keep the feedback question.
5. After any reply, append a safe summary row to ignored \`data/content-sales-crm/replies.csv\`.
6. Run \`npm run content-ops\` again to refresh CRM, feedback, revenue assumptions, and this close pack.

## Reply Capture Columns

\`\`\`csv
source,creator,summary,objection,stage,notes
youtube,Example Creator,Asked for narrower niche,too broad,replied_needs_response,Send custom pack outline
\`\`\`

## Safety Boundary

- Does not send messages.
- Does not post content.
- Does not collect payment.
- Does not request sensitive payment or account data.
- Does not publish private prospect rows.
- Does not promise views, subscribers, revenue, platform growth, or buyer outcomes.
`;
}

const pipelineRows = await readCsv("dist/content-sales-crm/pipeline.csv");
const questions = await readCsv("dist/content-feedback-loop/questions.csv");
const { products } = await readJson("dist/content-listing/products.json");
const selected = chooseRows(pipelineRows);
const closeRows = makeCloseRows({ selected, questions, products });
const dueRows = pipelineRows.filter(isDue);
const skippedMojibake = dueRows.filter(hasMojibake).length - closeRows.filter((row) => row.text_quality === "needs_manual_cleanup").length;
const manifest = {
  generatedAt: new Date().toISOString(),
  selectedCount: closeRows.length,
  cleanTextCount: closeRows.filter((row) => row.text_quality === "clean").length,
  needsCleanupCount: closeRows.filter((row) => row.text_quality !== "clean").length,
  dueRowsConsidered: dueRows.length,
  skippedMojibakeRows: Math.max(0, skippedMojibake),
  questionCount: questions.length,
  offerSkus: [...new Set(closeRows.map((row) => row.offer_sku))],
  safety: {
    sendsMessages: false,
    postsContent: false,
    collectsPayment: false,
    exposesPrivateProspectsInDocs: false,
    requestsSensitiveData: false,
    noRevenuePromise: true,
    noViewPromise: true
  }
};

await mkdir(docsDir, { recursive: true });
await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, "today-close-queue.md"), closeQueueMarkdown(closeRows), "utf8");
await writeFile(path.join(outDir, "today-close-queue.csv"), toCsv(closeRows, ["close_rank", "creator", "source", "topic", "proof_url", "priority_score", "product_fit", "offer_sku", "offer_price_usd", "text_quality", "review_action", "feedback_question", "reply_capture", "draft"]), "utf8");
await writeFile(path.join(outDir, "reply-capture-template.csv"), "source,creator,summary,objection,stage,notes\n", "utf8");
await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
await writeFile(path.join(docsDir, "content-close-pack.md"), publicDoc({ dueRows, closeRows, questions }), "utf8");

console.log(`Wrote ${path.join(docsDir, "content-close-pack.md")}`);
console.log(`Close rows: ${closeRows.length}`);
