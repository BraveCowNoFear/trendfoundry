import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const outDir = path.join(root, "dist", "launch-assets");
const docsDir = path.join(root, "docs");
const publicUrl = "https://bravecownofear.github.io/trendfoundry/";
const sampleUrl = `${publicUrl}public-sample.md`;
const sampleUrlEn = `${publicUrl}public-sample.en.md`;
const sampleUrlZh = `${publicUrl}public-sample.zh-CN.md`;
const scriptUrl = `${publicUrl}ready-to-record-script.md`;
const requestUrl = "https://github.com/BraveCowNoFear/trendfoundry/issues/new?template=order-sample-pack.yml&title=Sample%20pack%20request%3A%20";
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

function compact(value, fallback = "") {
  return String(value || fallback).replace(/\s+/g, " ").trim();
}

const latest = JSON.parse(await readFile(path.join(root, "data", "latest.json"), "utf8"));
function selectPortfolio(items) {
  const quotas = { github: 4, bilibili: 3, youtube: 2, hn: 2, arxiv: 1 };
  const selected = [];
  const used = new Set();
  for (const [source, quota] of Object.entries(quotas)) {
    const sourceItems = items
      .filter((candidate) => candidate.source === source)
      .sort((a, b) => Number(Boolean(a.qualityFlags?.length)) - Number(Boolean(b.qualityFlags?.length)) || b.score - a.score);
    for (const item of sourceItems.slice(0, quota)) {
      selected.push(item);
      used.add(item.url || item.id);
    }
  }
  for (const item of items) {
    if (selected.length >= 12) break;
    const key = item.url || item.id;
    if (!used.has(key)) {
      selected.push(item);
      used.add(key);
    }
  }
  return selected.sort((a, b) => b.score - a.score);
}

const portfolio = selectPortfolio(latest.items || []);
const top = portfolio[0] || latest.items?.[0] || {};
const sourceMix = portfolio.reduce((acc, item) => {
  acc[item.source] = (acc[item.source] || 0) + 1;
  return acc;
}, {});
const sourceMixText = Object.entries(sourceMix).map(([source, count]) => `${source} ${count}`).join(" / ");
const topTitle = compact(top.title, "the top AI/developer trend");
const topHook = "Verify the source, reproduction path, and limits before recording.";
const topLimitation = compact(top.deliverables?.limitation, "Each idea includes a limitation so it stays practical.");

const posts = [
  {
    channel: "x",
    title: "Launch thread",
    status: "draft_review_before_posting",
    body: `I built TrendFoundry: a tiny creator-intelligence pack for AI/dev video channels.

It turns public signals from GitHub, YouTube, Bilibili, HN, and arXiv into:
- 12 ranked video opportunities
- title angles
- demo steps
- one scene-by-scene ready-to-record script
- quality-risk notes

Free samples:
- English: ${sampleUrlEn}
- Chinese: ${sampleUrlZh}`
  },
  {
    channel: "linkedin",
    title: "Product launch",
    status: "draft_review_before_posting",
    body: `Most AI newsletters summarize what happened. TrendFoundry tries to answer a more useful creator question: what should I record next, and what proof do I need before recommending it?

This week's pack collected ${latest.totalItems || 0} public signals and shaped the top 12 into source-backed video opportunities. The top script is a 6-8 minute scene-by-scene plan around ${topTitle}.

Free samples:
- English: ${sampleUrlEn}
- Chinese: ${sampleUrlZh}
Request the paid pack: ${requestUrl}`
  },
  {
    channel: "bilibili_dynamic",
    title: "Bilibili creator note",
    status: "draft_review_before_posting",
    body: `\u6211\u505a\u4e86\u4e00\u4e2a\u7ed9 AI/\u5f00\u53d1\u8005\u89c6\u9891\u521b\u4f5c\u8005\u7528\u7684\u9009\u9898\u60c5\u62a5\u5305 TrendFoundry\u3002

\u5b83\u4e0d\u662f\u6279\u91cf AI \u704c\u6c34\uff0c\u800c\u662f\u628a\u516c\u5f00\u6765\u6e90\u6574\u7406\u6210\u53ef\u5f55\u5236\u8d44\u4ea7\uff1a
1. 12 \u4e2a\u5e26\u6765\u6e90\u7684\u9009\u9898\u673a\u4f1a
2. B \u7ad9 / YouTube \u6807\u9898\u89d2\u5ea6
3. demo \u6b65\u9aa4\u548c\u9650\u5236\u8bf4\u660e
4. 1 \u4efd 6-8 \u5206\u949f\u5206\u955c\u5f0f\u6210\u7247\u811a\u672c

\u672c\u671f source mix\uff1a${sourceMixText}
\u514d\u8d39\u6837\u54c1\uff1a${sampleUrlZh}
English sample: ${sampleUrlEn}`
  },
  {
    channel: "github_readme_pin",
    title: "GitHub pinned comment",
    status: "draft_review_before_posting",
    body: `TrendFoundry converts public AI/dev trend signals into buyer-ready creator planning assets.

Latest top opportunity: ${topTitle}
Hook: ${topHook}
Limitation: ${topLimitation}

Try the English sample: ${sampleUrlEn}
Chinese sample: ${sampleUrlZh}
Open the ready-to-record script: ${scriptUrl}`
  },
  {
    channel: "email",
    title: "Warm intro email",
    status: "draft_review_before_sending",
    body: `Subject: Source-backed AI/dev video ideas for your next recording queue

Hi,

I am testing TrendFoundry, a weekly AI/developer creator-intelligence pack. It turns public signals into 12 ranked video opportunities, title angles, demo steps, quality-risk notes, and one scene-by-scene ready-to-record script.

Free samples:
- English: ${sampleUrlEn}
- Chinese: ${sampleUrlZh}

If this fits your channel, the current sample issue is USD 9. You can request it here:
${requestUrl}

No promises about views or revenue; the value is a faster, source-backed planning queue.

Best,
TrendFoundry
${contactEmail}`
  }
];

function markdown(rows) {
  return `# TrendFoundry Launch Assets

Generated: ${new Date().toISOString()}

Safety: these are draft assets only. Review before posting or sending. Do not bulk-send identical messages, do not promise views/revenue, and do not ask for payment card details in public replies.

Source snapshot: ${latest.generatedAt}
Top opportunity: ${topTitle}
Source mix: ${sourceMixText}

${rows.map((post) => `## ${post.channel}: ${post.title}

Status: ${post.status}

\`\`\`text
${post.body}
\`\`\`
`).join("\n")}
`;
}

await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, "launch-posts.md"), markdown(posts), "utf8");
await writeFile(path.join(docsDir, "launch-posts.md"), markdown(posts), "utf8");
await writeFile(
  path.join(outDir, "launch-posts.csv"),
  toCsv(posts.map((post, index) => ({ priority: index + 1, ...post })), ["priority", "channel", "title", "status", "body"]),
  "utf8"
);

console.log(`Prepared ${posts.length} launch drafts in ${outDir}`);
