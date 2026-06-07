import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const distDir = path.join(root, "dist", "content-audit");
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

function compact(value, fallback = "") {
  return String(value || fallback).replace(/\s+/g, " ").trim();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function includesAny(text, needles) {
  const lower = String(text || "").toLowerCase();
  return needles.some((needle) => lower.includes(needle));
}

function sourceLabel(item) {
  const labels = {
    github: "GitHub",
    bilibili: "Bilibili",
    youtube: "YouTube",
    hn: "Hacker News",
    arxiv: "arXiv"
  };
  return labels[item.source] || item.source || "Public";
}

function primaryTitle(item) {
  return compact(item.deliverables?.bilibiliTitles?.[0] || item.deliverables?.youtubeTitles?.[0] || item.title);
}

function genericHook(item) {
  const hook = compact(item.deliverables?.hook);
  return !hook
    || hook === "验证来源、复现步骤和限制。"
    || hook === "验证安装、输出和适用边界。"
    || hook.includes("practical workflow test instead of a trend recap");
}

function genericWhyNow(item) {
  const text = compact(item.deliverables?.whyNow);
  return !text || /current .* signal|timely candidate|appearing in a current trend signal/i.test(text);
}

function weakDemo(item) {
  const steps = item.deliverables?.demoSteps || [];
  return steps.length < 3 || steps.every((step) => /summarize|smallest useful|core claim|compare/i.test(step));
}

function hasFreshness(item) {
  if (!item.updatedAt) return false;
  const updated = Date.parse(item.updatedAt);
  const generated = Date.parse(latest.generatedAt);
  if (!Number.isFinite(updated) || !Number.isFinite(generated)) return false;
  return generated - updated < 1000 * 60 * 60 * 24 * 45;
}

function scoreItem(item) {
  const issues = [];
  let evidence = 0;
  if (item.url) evidence += 8;
  if (compact(item.summary).length >= 36) evidence += 5;
  if (hasFreshness(item)) evidence += 5;
  if (item.stars || item.comments || item.views || item.points) evidence += 4;
  if (!item.stale) evidence += 3;

  let recordability = 0;
  const steps = item.deliverables?.demoSteps || [];
  if (steps.length >= 4) recordability += 8;
  if (steps.some((step) => includesAny(step, ["reproduce", "install", "run", "open", "verify"]))) recordability += 6;
  if (item.deliverables?.outline?.length >= 4) recordability += 5;
  if (item.targetCreator) recordability += 4;
  if (item.deliverables?.thumbnailPrompt) recordability += 2;

  let specificity = 0;
  if (!genericHook(item)) specificity += 8;
  if (!genericWhyNow(item)) specificity += 6;
  if (primaryTitle(item).toLowerCase().includes(String(item.title || "").toLowerCase().split("/").pop())) specificity += 3;
  if (compact(item.deliverables?.limitation).length >= 42) specificity += 5;
  if (compact(item.summary).length >= 80) specificity += 3;

  let commercial = 0;
  if (item.monetizationFit === "high") commercial += 8;
  if (item.monetizationFit === "medium") commercial += 5;
  if (includesAny(`${item.targetCreator} ${primaryTitle(item)}`, ["creator", "video", "workflow", "educator", "bilibili", "youtube"])) commercial += 6;
  if (item.deliverables?.outline?.some((line) => includesAny(line, ["变现", "template", "consulting", "toolkit", "paid"]))) commercial += 5;
  if (item.deliverables?.bilibiliTitles?.length >= 3 && item.deliverables?.youtubeTitles?.length >= 3) commercial += 3;

  let risk = 0;
  if (item.qualityRisk === "normal") risk += 10;
  if (!item.qualityFlags?.length) risk += 6;
  if (compact(item.deliverables?.limitation)) risk += 6;
  if (!includesAny(`${item.title} ${item.summary}`, ["leaked", "crack", "free download", "watermark", "pirated"])) risk += 3;

  if (genericHook(item)) issues.push("generic hook");
  if (genericWhyNow(item)) issues.push("generic why-now");
  if (weakDemo(item)) issues.push("demo not concrete enough");
  if (item.qualityFlags?.length) issues.push(`quality flags: ${item.qualityFlags.join(", ")}`);
  if (!compact(item.deliverables?.limitation)) issues.push("missing limitation");
  if (!item.targetCreator) issues.push("missing creator target");

  const total = clamp(evidence, 0, 25) + clamp(recordability, 0, 25) + clamp(specificity, 0, 25) + clamp(commercial, 0, 25) + clamp(risk, 0, 25);
  return {
    id: item.id || item.url || item.title,
    title: item.title,
    source: item.source,
    url: item.url,
    score: item.score,
    contentScore: total,
    dimensions: {
      evidence: clamp(evidence, 0, 25),
      recordability: clamp(recordability, 0, 25),
      specificity: clamp(specificity, 0, 25),
      commercial: clamp(commercial, 0, 25),
      risk: clamp(risk, 0, 25)
    },
    issues,
    titleOption: primaryTitle(item),
    hook: compact(item.deliverables?.hook),
    demo: compact(item.deliverables?.demoSteps?.[1] || item.deliverables?.demoSteps?.[0]),
    limitation: compact(item.deliverables?.limitation),
    targetCreator: item.targetCreator || "creator"
  };
}

function markdownTable(rows, columns) {
  const header = `| ${columns.map((column) => column.label).join(" | ")} |`;
  const divider = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = rows.map((row, index) => `| ${columns.map((column) => compact(column.value(row, index)).replace(/\|/g, "/")).join(" | ")} |`);
  return [header, divider, ...body].join("\n");
}

function actionFor(issue) {
  if (issue === "generic hook") return "Rewrite the first line around one measurable workflow pain.";
  if (issue === "generic why-now") return "Replace trend freshness with a concrete timing reason from the source.";
  if (issue === "demo not concrete enough") return "Name the exact install/run/input/output check before recording.";
  if (issue.startsWith("quality flags")) return "Keep it out of the paid sample unless the limitation angle is the story.";
  if (issue === "missing limitation") return "Add one sentence on who should skip it.";
  return "Tighten proof, demo, and buyer handoff.";
}

function episodeBrief(row, index) {
  return `### ${index + 1}. ${row.title}

- Source: ${sourceLabel(row)} / score ${row.score} / content score ${row.contentScore}
- Buyer-facing angle: ${row.titleOption}
- Opening hook: ${row.hook || "Turn this into a measurable workflow test before recommending it."}
- Proof segment: ${row.demo || "Open the source, reproduce the smallest workflow, and show the before/after."}
- Limitation segment: ${row.limitation || "State exactly who should skip this and why."}
- Paid-pack reason: this can become a reusable recording queue item for ${row.targetCreator}.
`;
}

const items = latest.items || [];
const portfolio = selectPortfolio(items);
const scored = portfolio.map(scoreItem).sort((a, b) => b.contentScore - a.contentScore || b.score - a.score);
const rewriteQueue = scored
  .filter((row) => row.issues.length)
  .sort((a, b) => b.issues.length - a.issues.length || a.contentScore - b.contentScore)
  .slice(0, 8);
const topEpisodes = scored.slice(0, 6);
const sourceMix = portfolio.reduce((acc, item) => {
  acc[item.source] = (acc[item.source] || 0) + 1;
  return acc;
}, {});
const issueCounts = scored.reduce((acc, row) => {
  for (const issue of row.issues) acc[issue] = (acc[issue] || 0) + 1;
  return acc;
}, {});

const summaryRows = [
  ["Portfolio items", String(portfolio.length)],
  ["High-fit items", String(portfolio.filter((item) => item.monetizationFit === "high").length)],
  ["Generic hooks", String(scored.filter((row) => row.issues.includes("generic hook")).length)],
  ["Generic why-now notes", String(scored.filter((row) => row.issues.includes("generic why-now")).length)],
  ["Weak demos", String(scored.filter((row) => row.issues.includes("demo not concrete enough")).length)],
  ["Normal quality items", String(portfolio.filter((item) => item.qualityRisk === "normal").length)]
];

const markdown = `# TrendFoundry Editorial Audit

Generated: ${new Date().toISOString()}

Dataset: ${latest.generatedAt}

This audit is the content-side control surface for TrendFoundry. It ranks the current issue by evidence, recordability, specificity, commercial handoff, and risk so the next work session improves the paid pack instead of only polishing the website.

## Executive Read

${summaryRows.map(([label, value]) => `- ${label}: ${value}`).join("\n")}

Source mix: ${Object.entries(sourceMix).map(([source, count]) => `${source} ${count}`).join(" / ")}

## Best Content Bets

${markdownTable(topEpisodes, [
  { label: "Rank", value: (_row, index) => String(index + 1) },
  { label: "Signal", value: (row) => row.title },
  { label: "Source", value: (row) => sourceLabel(row) },
  { label: "Content", value: (row) => `${row.contentScore}/125` },
  { label: "Editorial issue", value: (row) => row.issues[0] || "ready" }
])}

## Rewrite Queue

${rewriteQueue.length ? markdownTable(rewriteQueue, [
  { label: "Signal", value: (row) => row.title },
  { label: "Issue", value: (row) => row.issues.join("; ") },
  { label: "Action", value: (row) => actionFor(row.issues[0]) }
]) : "No rewrite queue items."}

## Episode Briefs

${topEpisodes.map(episodeBrief).join("\n")}

## Issue Pattern Counts

${Object.entries(issueCounts).length ? Object.entries(issueCounts).sort((a, b) => b[1] - a[1]).map(([issue, count]) => `- ${issue}: ${count}`).join("\n") : "- No content issues detected."}

## Next Content Workbench

1. Rewrite every generic hook in the top 6 into a measurable viewer pain.
2. Replace generic why-now notes with source-specific timing: release, update, benchmark, controversy, or adoption signal.
3. For each paid-pack candidate, name one exact screen recording or terminal capture.
4. Keep one limitation sentence in every episode before the CTA.
5. Turn the best episode brief into a stronger Bilibili opening and a separate YouTube opening.
6. Use the rewrite queue as the next buyer-facing sample improvement list.
7. After content edits, rerun \`npm run content-audit\` and compare generic hook / weak demo counts.
`;

const json = {
  generatedAt: new Date().toISOString(),
  dataGeneratedAt: latest.generatedAt,
  sourceMix,
  summary: Object.fromEntries(summaryRows),
  issueCounts,
  topEpisodes,
  rewriteQueue
};

await mkdir(docsDir, { recursive: true });
await mkdir(distDir, { recursive: true });
await writeFile(path.join(docsDir, "content-editorial-audit.md"), markdown, "utf8");
await writeFile(path.join(distDir, "latest.json"), JSON.stringify(json, null, 2), "utf8");

console.log(`Wrote ${path.join(docsDir, "content-editorial-audit.md")}`);
console.log(`Wrote ${path.join(distDir, "latest.json")}`);
console.log(`Content audit: ${topEpisodes.length} top briefs, ${rewriteQueue.length} rewrite queue items.`);
