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
  const portfolio = selectPortfolio(items);
  return portfolio.find((item) => item.qualityRisk === "normal" && item.monetizationFit === "high") || portfolio[0];
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
  const proofStep = sentence(steps[1] || steps[0] || proof.capture);
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
      narration: `Start with evidence, not hype: ${compact(item.deliverables?.whyNow)}`,
      purpose: "Explain why the episode is timely."
    },
    {
      time: "0:55-1:35",
      screen: "Workflow pain map with three boxes",
      narration: "Ask one practical question: which creator workflow step does this actually replace or improve: topic selection, research, scripting, demo capture, or packaging? If it cannot improve one step, treat it as a watchlist signal instead of a recommendation.",
      purpose: "Translate trend into a buyer problem."
    },
    {
      time: "1:35-3:55",
      screen: proof.screen,
      narration: `Main proof segment: ${proofStep}. Keep the input, output, setup friction, and failure boundary visible on screen. Do not edit it into a universal success story.`,
      purpose: "Create the core proof segment."
    },
    {
      time: "3:55-4:55",
      screen: "Before/after comparison table",
      narration: "Compare before and after: what time does it save, what new checks does it add, and what still needs human judgment? The buyer value is not the tool name; it is the repeatable decision table.",
      purpose: "Turn proof into reusable buyer value."
    },
    {
      time: "4:55-5:45",
      screen: "Episode packaging card",
      narration: `Package the episode around this title: ${primaryTitle(item)}. The promise is not views or revenue; it is a small workflow the audience can try and reject safely.`,
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
      narration: "If you want this kind of source, title, proof asset, limitation, and script structure each week, use the TrendFoundry sample pack. You do not need to chase every trend; you need one recordable proof that fits your channel.",
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
if (!item) throw new Error("No source items available for full episode script.");

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
- 0:55-1:10: I will use one smallest proof to judge it: can we record the input, output, setup friction, and failure boundary?

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
- Do not promise views, subscribers, revenue, platform growth, or buyer outcomes.

## Shorts / Clip Hooks

- 15s: The signal worth testing is not popularity; it is whether we can record one real input and output.
- 30s: I turn ${item.title} into a reproducible proof: source, command or claim, input, output, and failure boundary.
- 45s: If an AI tool cannot show who should skip it, it is not ready for a paid topic pack.

## Publishing Metadata

- Bilibili title: ${primaryTitle(item)}
- YouTube title: ${englishTitle(item)} (practical proof)
- Description opener: Proof-first review of ${item.title}: source, smallest reproducible workflow, tradeoff, and limitation.
- Tags: AI tools, creator workflow, GitHub, Bilibili, YouTube, TrendFoundry
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
