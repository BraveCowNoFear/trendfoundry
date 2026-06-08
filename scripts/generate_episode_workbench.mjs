import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const distDir = path.join(root, "dist", "episode-workbench");
const latest = JSON.parse(await readFile(path.join(root, "data", "latest.json"), "utf8"));

function compact(value, fallback = "") {
  return String(value || fallback).replace(/\s+/g, " ").trim();
}

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

function sourceLabel(item) {
  return {
    github: "GitHub",
    bilibili: "Bilibili",
    youtube: "YouTube",
    hn: "Hacker News",
    arxiv: "arXiv"
  }[item.source] || item.source || "Public source";
}

function primaryAngle(item) {
  return compact(item.deliverables?.bilibiliTitles?.[0] || item.deliverables?.youtubeTitles?.[0] || item.title);
}

function englishAngle(item) {
  if (item.source === "github") return compact(item.title);
  if (item.source === "youtube") return compact(item.title);
  if (item.source === "bilibili" && /comfyui/i.test(`${item.title} ${item.summary}`)) return "ComfyUI AI video workflow";
  if (/prompt/i.test(`${item.title} ${item.summary}`) && /video/i.test(`${item.title} ${item.summary}`)) return "AI video prompt generator";
  if (/3 tools|tools you need/i.test(`${item.title} ${item.summary}`)) return "AI video tool stack";
  return compact(item.title);
}

function sentence(value) {
  return compact(value).replace(/[.。]+$/g, "");
}

function proofAsset(item) {
  if (item.source === "github") {
    return "terminal capture: README quickstart command, dependency install result, first successful output, and one failed/friction note";
  }
  if (item.source === "bilibili" || item.source === "youtube") {
    return "browser capture: source claim, tiny reproduction input, before/after comparison table, and skip-condition slide";
  }
  if (item.source === "hn") {
    return "browser capture: thread URL, three comment clusters, one do/don't checklist, and one counterexample";
  }
  if (item.source === "arxiv") {
    return "paper capture: title/abstract, one diagram or toy example, plain-language mechanism slide, and research-to-product gap";
  }
  return "source capture plus one small input/output proof";
}

function platformOpenings(item) {
  const angle = primaryAngle(item).replace(/[|#]/g, "");
  const english = englishAngle(item).replace(/[|#]/g, "");
  const hook = compact(item.deliverables?.hook);
  const why = compact(item.deliverables?.whyNow);
  const limit = compact(item.deliverables?.limitation);
  return {
    bilibili: [
      `0-8s: Open with the proof-first hook: ${hook}`,
      `8-18s: Say why the signal is worth testing now: ${why}`,
      "18-35s: Promise three deliverables: smallest reproduction, failure boundary, and who should keep using it.",
      "35-55s: Show that weak proof becomes a watchlist note, not a recommendation.",
      `55-70s: Close the opening with the boundary: ${limit}`,
      `Title card: ${angle}`
    ],
    youtube: [
      `0-7s: ${english} is only worth covering if the smallest proof can be recorded.`,
      `7-18s: The signal is specific: ${why}`,
      "18-32s: I will test the promise, show the smallest reproducible output, and mark the adoption blockers.",
      "32-48s: No view promises, no hype recap; this is a buyer-ready workflow check.",
      `48-60s: The boundary is simple: ${limit}`
    ]
  };
}

function buyerHandoff(item) {
  const steps = item.deliverables?.demoSteps || [];
  return [
    `Use this as a ${sourceLabel(item)} proof episode for ${item.targetCreator || "AI workflow creator"}.`,
    `Primary asset to record: ${proofAsset(item)}.`,
    `Minimum demo path: ${sentence(steps[1] || steps[0] || "open the source and capture one input/output proof")}.`,
    `Safety line to keep: ${compact(item.deliverables?.limitation, "State who should skip this workflow before the CTA.")}`
  ];
}

function markdownList(lines) {
  return lines.map((line) => `- ${line}`).join("\n");
}

function episodeSection(item, index) {
  const openings = platformOpenings(item);
  const demoSteps = item.deliverables?.demoSteps || [];
  return `## ${index + 1}. ${item.title}

- Source: ${sourceLabel(item)}
- URL: ${item.url}
- Score: ${item.score}
- Buyer-facing angle: ${primaryAngle(item)}
- Opening hook: ${compact(item.deliverables?.hook)}
- Why now: ${compact(item.deliverables?.whyNow)}

### Bilibili Opening Plan

${markdownList(openings.bilibili)}

### YouTube Opening

${markdownList(openings.youtube)}

### Recording Proof

${markdownList(demoSteps)}

### Buyer Handoff

${markdownList(buyerHandoff(item))}
`;
}

const portfolio = selectPortfolio(latest.items || []);
const ready = portfolio
  .filter((item) => item.qualityRisk === "normal" && item.monetizationFit === "high")
  .slice(0, 5);

const markdown = `# TrendFoundry Episode Workbench

Generated: ${new Date().toISOString()}

Dataset: ${latest.generatedAt}

This is the content-side production queue. It turns ready signals into platform-specific openings, recording proof, and buyer handoff notes without touching the frontend build.

## Production Queue

${ready.map((item, index) => episodeSection(item, index)).join("\n")}

## Operator Notes

1. Record the proof asset before polishing the thumbnail or title.
2. Keep the limitation line in the first minute; it is part of the paid-pack trust signal.
3. If a demo cannot produce one visible input/output proof, downgrade it to watchlist.
4. After replacing or editing the queue, rerun \`npm run content-audit\` and \`npm run episode-workbench\`.
`;

const json = {
  generatedAt: new Date().toISOString(),
  dataGeneratedAt: latest.generatedAt,
  count: ready.length,
  episodes: ready.map((item, index) => ({
    rank: index + 1,
    title: item.title,
    source: item.source,
    url: item.url,
    score: item.score,
    angle: primaryAngle(item),
    proofAsset: proofAsset(item),
    bilibiliOpening: platformOpenings(item).bilibili,
    youtubeOpening: platformOpenings(item).youtube,
    buyerHandoff: buyerHandoff(item)
  }))
};

await mkdir(docsDir, { recursive: true });
await mkdir(distDir, { recursive: true });
await writeFile(path.join(docsDir, "episode-workbench.md"), markdown, "utf8");
await writeFile(path.join(distDir, "latest.json"), JSON.stringify(json, null, 2), "utf8");

console.log(`Wrote ${path.join(docsDir, "episode-workbench.md")}`);
console.log(`Wrote ${path.join(distDir, "latest.json")}`);
console.log(`Episode workbench: ${ready.length} ready items.`);
