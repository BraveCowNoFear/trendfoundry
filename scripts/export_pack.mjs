import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const siteDir = path.join(root, "site");
const dataDir = path.join(root, "data");
const distDir = path.join(root, "dist");
const packDir = path.join(distDir, "trendfoundry-sample-pack");

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

function outreachRows(items) {
  const tomorrow = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  return items
    .filter((item) => item.source === "youtube" || item.source === "bilibili")
    .slice(0, 20)
    .map((item, index) => ({
      priority: index + 1,
      source: item.source,
      creator_or_channel: item.author || (item.summary || "").split("/")[0]?.trim() || "unknown",
      topic: item.title,
      source_query: item.sourceQuery,
      proof_url: item.url,
      personalized_angle: item.deliverables?.whyNow || `${item.title} is a timely creator topic.`,
      message: `你好，我看到你最近关注「${item.title}」这类内容。我做了一个 TrendFoundry 样品包，可以把类似公开信号整理成可直接录制的标题、hook、demo 步骤和限制说明。如果你愿意，我可以发一份本周样品给你判断是否适合你的频道。`,
      status: "not_contacted",
      next_followup: tomorrow
    }));
}

function outreachMarkdown(rows) {
  return `# TrendFoundry First 20 Outreach Board

Goal: get 5 replies and 1 paid USD 9 sample order.

| # | Source | Creator | Topic | Status | Next Follow-Up |
|---|---|---|---|---|---|
${rows
  .map(
    (row) =>
      `| ${row.priority} | ${row.source} | ${String(row.creator_or_channel).replace(/\|/g, "/")} | ${String(row.topic).replace(/\|/g, "/")} | ${row.status} | ${row.next_followup} |`
  )
  .join("\n")}

## Message Template

${rows[0]?.message || "No prospects available."}

## Notes

- Personalize the first sentence before sending.
- Do not bulk-send identical messages.
- Track replies by changing status to contacted, replied, interested, paid, or not_fit.
`;
}

function compactHook(item) {
  if (item.source === "github") return "验证安装、输出和适用边界。";
  if (item.source === "bilibili" || item.source === "youtube") return "验证方法是否可复现，避免照搬原视频。";
  return "验证来源、证据和可讲边界。";
}

function opportunityRows(items) {
  return items.slice(0, 50).map((item, index) => ({
    rank: index + 1,
    score: item.score,
    source: item.source,
    freshness: item.stale ? "cached" : "fresh",
    fit: item.monetizationFit,
    title: item.title,
    target_creator: item.targetCreator,
    bilibili_title: item.deliverables?.bilibiliTitles?.[0] || "",
    youtube_title: item.deliverables?.youtubeTitles?.[0] || "",
    hook: compactHook(item),
    why_now: item.deliverables?.whyNow || "",
    demo_step: item.deliverables?.demoSteps?.[1] || "",
    thumbnail_prompt: item.deliverables?.thumbnailPrompt || "",
    limitation: item.deliverables?.limitation || "",
    quality_risk: item.qualityRisk || "normal",
    quality_flags: (item.qualityFlags || []).join("; "),
    url: item.url
  }));
}

const data = JSON.parse(await readFile(path.join(dataDir, "latest.json"), "utf8"));
await rm(packDir, { recursive: true, force: true });
await mkdir(packDir, { recursive: true });

const buyerDeliverables = [
  "daily-brief.md",
  "ready-to-record-script.md",
  "opportunities.csv",
  "public-sample.md",
  "public-sample.en.md",
  "public-sample.zh-CN.md",
  "public-sample.csv",
  "public-sample.en.csv",
  "public-sample.zh-CN.csv"
];

const sellerOnlyFiles = [
  "outreach-board.md",
  "prospects.csv",
  "latest.json"
];

const docs = [
  "daily-brief.md",
  "ready-to-record-script.md",
  "launch-plan.md",
  "sales-page-copy.md"
];
for (const doc of docs) {
  await cp(path.join(docsDir, doc), path.join(packDir, doc));
}
await cp(path.join(dataDir, "latest.json"), path.join(packDir, "latest.json"));
await cp(path.join(siteDir, "index.html"), path.join(packDir, "index.html"));
await cp(path.join(siteDir, "styles.css"), path.join(packDir, "styles.css"));
await cp(path.join(siteDir, "app.js"), path.join(packDir, "app.js"));
await cp(path.join(siteDir, "public-sample.md"), path.join(packDir, "public-sample.md"));
await cp(path.join(siteDir, "public-sample.en.md"), path.join(packDir, "public-sample.en.md"));
await cp(path.join(siteDir, "public-sample.zh-CN.md"), path.join(packDir, "public-sample.zh-CN.md"));
await cp(path.join(siteDir, "public-sample.csv"), path.join(packDir, "public-sample.csv"));
await cp(path.join(siteDir, "public-sample.en.csv"), path.join(packDir, "public-sample.en.csv"));
await cp(path.join(siteDir, "public-sample.zh-CN.csv"), path.join(packDir, "public-sample.zh-CN.csv"));

await writeFile(
  path.join(packDir, "opportunities.csv"),
  toCsv(opportunityRows(data.items || []), [
    "rank",
    "score",
    "source",
    "freshness",
    "fit",
    "title",
    "target_creator",
    "bilibili_title",
    "youtube_title",
    "hook",
    "why_now",
    "demo_step",
    "thumbnail_prompt",
    "limitation",
    "quality_risk",
    "quality_flags",
    "url"
  ]), 
  "utf8"
);

const prospects = outreachRows(data.items || []);

await writeFile(
  path.join(packDir, "prospects.csv"),
  toCsv(prospects, [
    "priority",
    "source",
    "creator_or_channel",
    "topic",
    "source_query",
    "proof_url",
    "personalized_angle",
    "message",
    "status",
    "next_followup"
  ]),
  "utf8"
);
await writeFile(path.join(packDir, "outreach-board.md"), outreachMarkdown(prospects), "utf8");
await writeFile(path.join(docsDir, "outreach-board.md"), outreachMarkdown(prospects), "utf8");

const manifest = {
  product: "TrendFoundry Sample Pack",
  generatedAt: new Date().toISOString(),
  sourceSnapshot: data.generatedAt,
  itemCount: data.totalItems,
  errorCount: data.errorCount || 0,
  buyerDeliverables,
  sellerOnlyFiles,
  files: [
    "index.html",
    "styles.css",
    "app.js",
    "public-sample.md",
    "public-sample.en.md",
    "public-sample.zh-CN.md",
    "public-sample.csv",
    "public-sample.en.csv",
    "public-sample.zh-CN.csv",
    "daily-brief.md",
    "ready-to-record-script.md",
    "launch-plan.md",
    "sales-page-copy.md",
    "outreach-board.md",
    "opportunities.csv",
    "prospects.csv",
    "latest.json"
  ],
  suggestedUse: [
    "Send only buyerDeliverables after payment or approved sample delivery.",
    "Use daily-brief.md and the scene-by-scene ready-to-record-script.md as the core buyer value.",
    "Use opportunities.csv for paid issue fulfillment.",
    "Use sellerOnlyFiles only for local operations and outreach preparation."
  ]
};
await writeFile(path.join(packDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
await writeFile(
  path.join(distDir, "README.md"),
  `# TrendFoundry Dist\n\nLatest sample pack: \`trendfoundry-sample-pack/\`.\n\nGenerated at: ${manifest.generatedAt}\n`,
  "utf8"
);

console.log(`Exported ${manifest.files.length} files to ${packDir}`);
