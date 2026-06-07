import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dataFile = path.join(root, "data", "latest.json");
const distDir = path.join(root, "dist", "outreach-drafts");
const publicUrl = "https://bravecownofear.github.io/trendfoundry/";
const sampleUrlEn = "https://bravecownofear.github.io/trendfoundry/public-sample.en.md";
const sampleUrlZh = "https://bravecownofear.github.io/trendfoundry/public-sample.zh-CN.md";
const contactEmail = "rivan_Britain@outlook.com";

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows, columns) {
  return [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))
  ].join("\n");
}

function slug(value) {
  return String(value || "creator")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "creator";
}

function clean(value, fallback = "") {
  return String(value || fallback).replace(/\s+/g, " ").trim();
}

function creatorName(item) {
  return clean(item.author || (item.summary || "").split("/")[0], "Unknown creator");
}

function selectProspects(items, limit) {
  const seen = new Set();
  const prospects = [];
  for (const item of items) {
    if (!["youtube", "bilibili"].includes(item.source)) continue;
    if ((item.qualityRisk || "normal") === "review") continue;
    const creator = creatorName(item);
    const key = `${item.source}:${creator.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    prospects.push({ item, creator });
    if (prospects.length >= limit) break;
  }
  return prospects;
}

function draftFor(prospect, index) {
  const { item, creator } = prospect;
  const topic = clean(item.title, "recent AI/dev creator topic");
  const angle = clean(item.deliverables?.whyNow, `${topic} is showing up as a fresh creator signal.`);
  const hook = clean(item.deliverables?.hook, "a source-backed hook and demo path");
  const isZh = item.source === "bilibili";
  const sampleUrl = isZh ? sampleUrlZh : sampleUrlEn;
  const nextFollowup = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  const subject = isZh
    ? `TrendFoundry：给 ${creator} 的本周 AI/开发者选题样品`
    : `TrendFoundry sample brief for ${creator}`;
  const message = isZh
    ? `你好 ${creator}，\n\n我看到你最近覆盖「${topic}」这类 AI/开发者内容。这个方向正在多源信号里升温：${angle}\n\n我做了一个 TrendFoundry 样品包，把 GitHub、B 站、YouTube、HN 和 arXiv 的公开信号整理成可直接录制的标题、hook、demo 步骤和限制说明。本周公开样品在这里：${sampleUrl}\n\n如果你觉得格式有用，我可以给你的频道做一份更窄主题的 $9 sample issue；不承诺播放量，只交付可验证来源和可录制结构。\n\n${contactEmail}`
    : `Hi ${creator},\n\nI noticed your recent work around "${topic}". That lane is showing up in current public signals: ${angle}\n\nI built TrendFoundry to turn GitHub, YouTube, Bilibili, Hacker News, and arXiv signals into source-backed titles, hooks, demo steps, and limitations for AI/dev video creators. A public sample is here: ${sampleUrl}\n\nIf the format is useful, I can make a narrower $9 sample issue for your channel. No view or revenue promises, just source-backed planning material that is ready to record.\n\nBest,\nTrendFoundry\n${contactEmail}`;
  return {
    priority: index + 1,
    source: item.source,
    creator,
    topic,
    proof_url: item.url,
    source_query: item.sourceQuery,
    subject,
    opener: isZh ? `看到你最近覆盖「${topic}」。` : `I noticed your recent work around "${topic}".`,
    hook,
    public_sample_url: sampleUrl,
    english_sample_url: sampleUrlEn,
    chinese_sample_url: sampleUrlZh,
    product_url: publicUrl,
    status: "drafted_review_before_sending",
    next_followup: nextFollowup,
    message
  };
}

function markdown(drafts, sourceSnapshot) {
  const cards = drafts
    .map(
      (draft) => `## ${draft.priority}. ${draft.creator}

- Source: ${draft.source}
- Topic: ${draft.topic}
- Proof: ${draft.proof_url}
- Subject: ${draft.subject}
- Status: ${draft.status}
- Next follow-up: ${draft.next_followup}

\`\`\`text
${draft.message}
\`\`\`
`
    )
    .join("\n");

  return `# TrendFoundry Outreach Drafts

Source snapshot: ${sourceSnapshot}

Review every draft before sending. Do not bulk-send identical messages, scrape private contact data, or promise views, subscribers, or revenue.

${cards}`;
}

const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = Number.parseInt(limitArg?.split("=")[1] || "20", 10);
const data = JSON.parse(await readFile(dataFile, "utf8"));
const drafts = selectProspects(data.items || [], Number.isFinite(limit) ? limit : 20).map(draftFor);

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });
await writeFile(path.join(distDir, "outreach-drafts.md"), markdown(drafts, data.generatedAt), "utf8");
await writeFile(
  path.join(distDir, "outreach-drafts.csv"),
  toCsv(drafts, [
    "priority",
    "source",
    "creator",
    "topic",
    "proof_url",
    "source_query",
    "subject",
    "opener",
    "hook",
    "public_sample_url",
    "product_url",
    "status",
    "next_followup"
  ]),
  "utf8"
);

for (const draft of drafts) {
  await writeFile(
    path.join(distDir, `${String(draft.priority).padStart(2, "0")}-${slug(draft.creator)}.md`),
    `# ${draft.creator}\n\nSubject: ${draft.subject}\n\n${draft.message}\n`,
    "utf8"
  );
}

console.log(`Prepared ${drafts.length} outreach drafts in ${distDir}`);
