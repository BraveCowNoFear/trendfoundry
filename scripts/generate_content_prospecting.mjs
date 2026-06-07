import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { contactEmail, slug } from "./lib/fulfillment.mjs";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const outDir = path.join(root, "dist", "content-prospecting");
const draftsDir = path.join(outDir, "drafts");
const samplePack = "https://bravecownofear.github.io/trendfoundry/trendfoundry-free-sample-pack.zip";
const orderPage = "https://bravecownofear.github.io/trendfoundry/order/";

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

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

function creatorName(item) {
  if (item.author) return compact(item.author);
  const summary = compact(item.summary);
  const first = summary.split(" / ")[0];
  return compact(first, "Unknown creator");
}

function sourceLabel(source) {
  return source === "bilibili" ? "Bilibili" : source === "youtube" ? "YouTube" : source;
}

function productFit(item) {
  const text = `${item.title} ${item.summary} ${item.sourceQuery}`.toLowerCase();
  if (/comfy|workflow|ai video|video generation|prompt/.test(text)) return "custom-proof-pack";
  if (/github|agent|developer|coding|mcp/.test(text)) return "proof-weekly";
  return "proof-script-pack";
}

function selectProspects(items, limit = 20) {
  const seen = new Set();
  const candidates = [];
  for (const item of items) {
    if (!["youtube", "bilibili"].includes(item.source)) continue;
    if ((item.qualityRisk || "normal") !== "normal") continue;
    if (!["high", "medium"].includes(item.monetizationFit || "")) continue;
    const creator = creatorName(item);
    if (!creator || creator === "Unknown creator" || creator === "-") continue;
    const key = `${item.source}:${creator.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const fit = productFit(item);
    const priorityScore = Number(item.score || 0) + (fit === "custom-proof-pack" ? 20 : 0) + (item.monetizationFit === "high" ? 10 : 0);
    candidates.push({ item, creator, fit, priorityScore });
  }
  return candidates.sort((a, b) => b.priorityScore - a.priorityScore).slice(0, limit);
}

function pitch(prospect) {
  const { item, creator, fit } = prospect;
  const topic = compact(item.title, "your recent AI/developer video");
  const whyNow = compact(item.deliverables?.whyNow, "the topic is showing up across current public AI/developer signals");
  const hook = compact(item.deliverables?.hook, "a source-backed proof path");
  const productLine = fit === "custom-proof-pack"
    ? "a custom proof pack for one narrow creator lane"
    : fit === "proof-weekly"
      ? "a weekly proof-first script pack"
      : "a proof-first script pack";
  return `Hi ${creator},

I noticed your recent ${sourceLabel(item.source)} video around "${topic}".

The reason I marked it as relevant: ${whyNow}

I built TrendFoundry to turn public AI/developer signals into ${productLine}: source link, recording hook, smallest proof to capture, limitation line, and buyer handoff notes.

Free sample: ${samplePack}
Manual order page: ${orderPage}

If the format is useful, I can narrow the next pack to your channel's lane. This is a planning and production aid; it does not promise views, subscribers, revenue, platform growth, or buyer outcomes.

Best,
TrendFoundry
${contactEmail}

Personalization note before sending: reference this hook in your own words: ${hook}`;
}

function boardMarkdown(rows, latestGeneratedAt) {
  return `# TrendFoundry Content Prospect Board

Generated: ${new Date().toISOString()}

Dataset: ${latestGeneratedAt}

This is a local seller-only board. Review every draft before sending. Do not bulk-send identical messages, scrape private contact data, or ask for sensitive payment or account data.

| Rank | Creator | Source | Product fit | Priority | Proof URL | Status |
| --- | --- | --- | --- | --- | --- | --- |
${rows.map((row) => `| ${row.rank} | ${row.creator.replace(/\|/g, "/")} | ${sourceLabel(row.source)} | ${row.product_fit} | ${row.priority_score} | ${row.proof_url} | ${row.status} |`).join("\n")}

## Review Checklist

1. Confirm the creator is a plausible buyer or feedback source.
2. Rewrite the first sentence so it is specific and human.
3. Send only after human review.
4. Track replies in the local CRM, not in public docs.
`;
}

function docsMarkdown(count, channels, productFits) {
  return `# TrendFoundry Content Prospecting

Generated: ${new Date().toISOString()}

This is the first-customers lane for TrendFoundry content products. It prepares local prospect lists and personalized outreach drafts, but it does not send messages, post content, collect payment, or scrape private contact data.

## Current Output

- Local prospect board: \`dist/content-prospecting/prospect-board.md\`
- Local CSV: \`dist/content-prospecting/prospects.csv\`
- Local draft directory: \`dist/content-prospecting/drafts/\`
- Prospects prepared: ${count}
- Channels: ${channels.join(", ")}
- Product fits: ${productFits.join(", ")}

## Operating Rule

Use this for one-by-one sales. Review each draft, personalize the first sentence, then send manually only when the recipient is a clear fit.

## Safety Boundary

- Public source URLs only.
- No private contact scraping.
- No automatic sending or posting.
- No payment collection.
- No sensitive payment or account data requests.
- No promise of views, subscribers, revenue, platform growth, or buyer outcomes.
`;
}

const latest = await readJson("data/latest.json");
const prospects = selectProspects(latest.items || [], 20);
const rows = prospects.map((prospect, index) => ({
  rank: index + 1,
  creator: prospect.creator,
  source: prospect.item.source,
  topic: compact(prospect.item.title),
  proof_url: prospect.item.url,
  source_query: compact(prospect.item.sourceQuery),
  product_fit: prospect.fit,
  priority_score: prospect.priorityScore,
  status: "draft_review_before_sending",
  next_action: "review_and_personalize",
  sample_pack: samplePack,
  order_page: orderPage,
  draft_file: `drafts/${String(index + 1).padStart(2, "0")}-${slug(prospect.creator)}.md`
}));

await rm(outDir, { recursive: true, force: true });
await mkdir(draftsDir, { recursive: true });
await mkdir(docsDir, { recursive: true });

for (const [index, prospect] of prospects.entries()) {
  const row = rows[index];
  await writeFile(
    path.join(outDir, row.draft_file),
    `# ${row.creator}\n\nSource: ${sourceLabel(row.source)}\nProof: ${row.proof_url}\nStatus: ${row.status}\n\n${pitch(prospect)}\n`,
    "utf8"
  );
}

const channels = [...new Set(rows.map((row) => sourceLabel(row.source)))];
const productFits = [...new Set(rows.map((row) => row.product_fit))];
const manifest = {
  generatedAt: new Date().toISOString(),
  dataGeneratedAt: latest.generatedAt,
  count: rows.length,
  channels,
  productFits,
  statuses: [...new Set(rows.map((row) => row.status))],
  safety: {
    sendsMessages: false,
    postsContent: false,
    collectsPayment: false,
    scrapesPrivateContactData: false,
    requestsSensitiveData: false,
    noRevenuePromise: true,
    noViewPromise: true
  }
};

await writeFile(path.join(outDir, "prospects.csv"), toCsv(rows, [
  "rank",
  "creator",
  "source",
  "topic",
  "proof_url",
  "source_query",
  "product_fit",
  "priority_score",
  "status",
  "next_action",
  "sample_pack",
  "order_page",
  "draft_file"
]), "utf8");
await writeFile(path.join(outDir, "prospect-board.md"), boardMarkdown(rows, latest.generatedAt), "utf8");
await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
await writeFile(path.join(docsDir, "content-prospecting.md"), docsMarkdown(rows.length, channels, productFits), "utf8");

console.log(`Prepared ${rows.length} content prospects in ${outDir}`);
console.log(`Wrote ${path.join(docsDir, "content-prospecting.md")}`);
