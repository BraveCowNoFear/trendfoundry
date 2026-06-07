import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const distDir = path.join(root, "dist", "full-episode-script");
const latest = JSON.parse(await readFile(path.join(root, "data", "latest.json"), "utf8"));

function compact(value, fallback = "") {
  return String(value || fallback).replace(/\s+/g, " ").trim();
}

function sentence(value) {
  return compact(value).replace(/[.。]+$/g, "");
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

function primaryTitle(item) {
  return compact(item.deliverables?.bilibiliTitles?.[0] || item.title);
}

function englishTitle(item) {
  return compact(item.deliverables?.youtubeTitles?.[0] || item.title).replace(/\s+\(practical test\)$/i, "");
}

function firstReady(items) {
  return selectPortfolio(items).find((item) => item.qualityRisk === "normal" && item.monetizationFit === "high") || selectPortfolio(items)[0];
}

function proofAsset(item) {
  if (item.source === "github") {
    return {
      label: "Terminal proof",
      capture: "README quickstart, install command, first output, and one blocker note",
      screen: "Repository page on the left, terminal on the right, small note panel for blocker"
    };
  }
  if (item.source === "bilibili" || item.source === "youtube") {
    return {
      label: "Workflow proof",
      capture: "source claim, tiny input, before/after result, and skip-condition slide",
      screen: "Browser source tab, reproduction canvas, comparison table"
    };
  }
  if (item.source === "hn") {
    return {
      label: "Discussion proof",
      capture: "thread URL, three comment clusters, one do/don't checklist, and one counterexample",
      screen: "HN thread, clustered notes, final checklist"
    };
  }
  return {
    label: "Research proof",
    capture: "source abstract, one toy example, one limitation slide",
    screen: "Source page, diagram/toy example, limitation card"
  };
}

function sceneRows(item) {
  const steps = item.deliverables?.demoSteps || [];
  const proof = proofAsset(item);
  return [
    {
      time: "0:00-0:20",
      screen: "Title card + source URL visible",
      narration: compact(item.deliverables?.hook),
      purpose: "Set a proof-first frame."
    },
    {
      time: "0:20-0:55",
      screen: `${sourceLabel(item)} source page, score/evidence callouts`,
      narration: `先看证据，不看热闹：${compact(item.deliverables?.whyNow)}`,
      purpose: "Explain why the episode is timely."
    },
    {
      time: "0:55-1:35",
      screen: "Workflow pain map with three boxes",
      narration: "今天只问一个问题：它到底替代了创作者流程里的哪一步，是选题、资料整理、脚本，还是演示素材？如果替代不了，就不能把它卖成推荐。",
      purpose: "Translate trend into a buyer problem."
    },
    {
      time: "1:35-3:55",
      screen: proof.screen,
      narration: `主证明段：${sentence(steps[1] || steps[0] || proof.capture)}。录屏时必须留下输入、输出和失败边界，不用剪成万能成功案例。`,
      purpose: "Create the core proof segment."
    },
    {
      time: "3:55-4:55",
      screen: "Before/after comparison table",
      narration: "对比使用前后：它节省了哪一段时间，又新增了哪些检查成本。真正可卖的不是工具名字，而是这张可复制的判断表。",
      purpose: "Turn proof into reusable buyer value."
    },
    {
      time: "4:55-5:45",
      screen: "Episode packaging card",
      narration: `如果把它做成一期内容，标题可以是「${primaryTitle(item)}」。核心承诺不是播放量，而是给观众一个能照着试的小流程。`,
      purpose: "Package the creator angle."
    },
    {
      time: "5:45-6:35",
      screen: "Limitation slide",
      narration: compact(item.deliverables?.limitation),
      purpose: "Add trust and reduce overclaim risk."
    },
    {
      time: "6:35-7:15",
      screen: "TrendFoundry sample pack CTA",
      narration: "如果你想每周直接拿到这样的来源、标题、录屏证明、限制和脚本结构，可以索取 TrendFoundry 样品包。你不用追热点，只需要挑一个最适合自己频道的开始录。",
      purpose: "Move viewer to sample request."
    }
  ];
}

function markdownTable(rows) {
  const header = "| Time | Screen | Narration | Purpose |";
  const divider = "| --- | --- | --- | --- |";
  const body = rows.map((row) => `| ${row.time} | ${row.screen} | ${row.narration.replace(/\|/g, "/")} | ${row.purpose} |`);
  return [header, divider, ...body].join("\n");
}

function checklist(lines) {
  return lines.map((line, index) => `${index + 1}. ${line}`).join("\n");
}

const item = firstReady(latest.items || []);
const proof = proofAsset(item);
const scenes = sceneRows(item);
const demoSteps = item.deliverables?.demoSteps || [];

const markdown = `# Full Episode Script: ${item.title}

Generated: ${new Date().toISOString()}

Dataset: ${latest.generatedAt}

Source: [${item.title}](${item.url})

## Script Contract

- Target length: 6-8 minutes.
- Audience: ${item.targetCreator || "AI workflow creator"}.
- Core promise: turn one public signal into a practical proof-first creator workflow.
- Primary proof asset: ${proof.label} / ${proof.capture}.
- Safety line: ${compact(item.deliverables?.limitation)}

## Title Options

- ${primaryTitle(item)}
- ${englishTitle(item)} (practical proof)
- ${compact(item.deliverables?.bilibiliTitles?.[3] || primaryTitle(item))}

## 70-Second Cold Open

${scenes.slice(0, 2).map((scene) => `- ${scene.time}: ${scene.narration}`).join("\n")}
- 0:55-1:10: 我会用一个最小证明来判断它：能不能录出输入、输出和失败边界。

## Scene-By-Scene Script

${markdownTable(scenes)}

## Recording Checklist

${checklist([
  `Open source page and keep the URL visible: ${item.url}`,
  ...demoSteps,
  `Capture the primary proof asset: ${proof.capture}.`,
  "Record one failure/friction note even if the demo succeeds.",
  "Keep the limitation slide before the CTA."
])}

## Buyer Delivery Notes

- Deliver this as a proof-first episode, not as a tool endorsement.
- The buyer can reuse the title, cold open, recording checklist, comparison table, limitation slide, and CTA.
- If the proof cannot be recorded in one session, downgrade this item to a watchlist note and replace the main episode.
- Do not promise views, subscribers, revenue, or fully autonomous income.

## Shorts / Clip Hooks

- 15s: 这个信号最值得测的不是热度，而是它能不能录出一个真实输入和输出。
- 30s: 我把 ${item.title} 拆成了一个可复现证明：来源、命令/输入、输出、失败边界。
- 45s: 如果一个 AI 工具不能说明谁该跳过它，它就还不能进入你的付费选题包。

## Publishing Metadata

- Bilibili title: ${primaryTitle(item)}
- YouTube title: ${englishTitle(item)} (practical proof)
- Description opener: Proof-first review of ${item.title}: source, smallest reproducible workflow, tradeoff, and limitation.
- Tags: AI工具, 创作者工作流, GitHub, Bilibili, YouTube, TrendFoundry
`;

const json = {
  generatedAt: new Date().toISOString(),
  dataGeneratedAt: latest.generatedAt,
  title: item.title,
  url: item.url,
  source: item.source,
  score: item.score,
  proofAsset: proof,
  scenes,
  recordingChecklist: [
    `Open source page and keep the URL visible: ${item.url}`,
    ...demoSteps,
    `Capture the primary proof asset: ${proof.capture}.`,
    "Record one failure/friction note even if the demo succeeds.",
    "Keep the limitation slide before the CTA."
  ]
};

await mkdir(docsDir, { recursive: true });
await mkdir(distDir, { recursive: true });
await writeFile(path.join(docsDir, "full-episode-script.md"), markdown, "utf8");
await writeFile(path.join(distDir, "latest.json"), JSON.stringify(json, null, 2), "utf8");

console.log(`Wrote ${path.join(docsDir, "full-episode-script.md")}`);
console.log(`Wrote ${path.join(distDir, "latest.json")}`);
console.log(`Full episode script: ${item.title}`);
