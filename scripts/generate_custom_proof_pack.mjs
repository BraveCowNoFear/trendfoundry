import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { argValue, contactEmail, slug } from "./lib/fulfillment.mjs";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const outDir = path.join(root, "dist", "custom-proof-pack");

function compact(value, fallback = "") {
  return String(value || fallback).replace(/\s+/g, " ").trim();
}

function sentence(value, fallback = "") {
  return compact(value, fallback).replace(/[.。]+$/g, "");
}

function words(value) {
  return compact(value)
    .toLowerCase()
    .split(/[^a-z0-9\u4e00-\u9fff]+/u)
    .filter((word) => word.length >= 2)
    .filter((word) => !["the", "and", "for", "with", "from", "this", "that", "video", "creator"].includes(word));
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

function platformBoost(item, platform) {
  const normalized = platform.toLowerCase();
  if (normalized.includes("bilibili") && item.source === "bilibili") return 18;
  if (normalized.includes("youtube") && item.source === "youtube") return 18;
  if (normalized.includes("github") && item.source === "github") return 12;
  if (normalized.includes("developer") && item.source === "github") return 8;
  return 0;
}

function nicheScore(item, niche, platform) {
  const terms = words(niche);
  const text = [
    item.title,
    item.summary,
    item.targetCreator,
    item.deliverables?.hook,
    item.deliverables?.whyNow,
    ...(item.deliverables?.bilibiliTitles || []),
    ...(item.deliverables?.youtubeTitles || [])
  ].join(" ").toLowerCase();
  const hits = terms.filter((term) => text.includes(term)).length;
  const riskPenalty = item.qualityRisk === "normal" ? 0 : 25;
  const fitBoost = item.monetizationFit === "high" ? 15 : 0;
  return Number(item.score || 0) + hits * 16 + platformBoost(item, platform) + fitBoost - riskPenalty;
}

function selectItems(items, niche, platform) {
  return [...items]
    .sort((a, b) => nicheScore(b, niche, platform) - nicheScore(a, niche, platform))
    .slice(0, 6);
}

function proofAsset(item) {
  if (item.source === "github") {
    return "Record the repository README, install or quickstart command, first output, and one blocker note.";
  }
  if (item.source === "bilibili" || item.source === "youtube") {
    return "Record the source claim, a tiny reproduction input, before/after comparison, and a skip-condition slide.";
  }
  if (item.source === "hn") {
    return "Record the thread URL, three comment clusters, one do/don't checklist, and one counterexample.";
  }
  if (item.source === "arxiv") {
    return "Record the abstract, one toy example, one plain-language mechanism slide, and the product gap.";
  }
  return "Record the source, one input/output proof, and one limitation.";
}

function titleFor(item, platform) {
  if (platform.toLowerCase().includes("bilibili")) {
    return compact(item.deliverables?.bilibiliTitles?.[0] || item.title);
  }
  return compact(item.deliverables?.youtubeTitles?.[0] || item.title);
}

function episodeBlock(item, index, niche, platform) {
  const title = titleFor(item, platform);
  const demoSteps = item.deliverables?.demoSteps || [];
  return `## ${index + 1}. ${title}

- Source: ${sourceLabel(item)}
- URL: ${item.url}
- Fit score: ${nicheScore(item, niche, platform)}
- Why this fits: ${sentence(item.deliverables?.whyNow, "It has enough public evidence to frame as a proof-first episode")}.
- Opening hook: ${sentence(item.deliverables?.hook, "Start from the smallest visible proof, not a trend recap")}.
- Proof asset: ${proofAsset(item)}
- Limitation to say on camera: ${sentence(item.deliverables?.limitation, "State who should skip this workflow before the CTA")}.

### Recording Path

${(demoSteps.length ? demoSteps : [proofAsset(item)]).map((step) => `- ${sentence(step)}.`).join("\n")}

### Buyer Handoff

- Use this as a ${platform} episode for the ${niche} niche.
- Keep the proof asset visible before showing title or thumbnail ideas.
- Reuse the limitation line in the first minute.
- If the proof cannot be captured in one session, downgrade it to a watchlist item.
`;
}

function markdownTable(rows) {
  return [
    "| Rank | Episode | Source | Fit score | Proof asset |",
    "| --- | --- | --- | --- | --- |",
    ...rows.map((row, index) => `| ${index + 1} | ${titleFor(row, "youtube").replace(/\|/g, "/")} | ${sourceLabel(row)} | ${nicheScore(row, niche, platform)} | ${proofAsset(row).replace(/\|/g, "/")} |`)
  ].join("\n");
}

const niche = compact(argValue("niche", "AI video creators"));
const platform = compact(argValue("platform", "YouTube and Bilibili"));
const buyer = compact(argValue("buyer", "custom buyer"));
const channel = compact(argValue("channel", "not-provided"));
const orderId = compact(argValue("order-id", `${new Date().toISOString().slice(0, 10)}-${slug(niche)}-${slug(platform)}`));
const latest = JSON.parse(await readFile(path.join(root, "data", "latest.json"), "utf8"));
const selected = selectItems(latest.items || [], niche, platform);
const primary = selected[0];

const pack = `# TrendFoundry Custom Proof Pack

Generated: ${new Date().toISOString()}

Dataset: ${latest.generatedAt}

Buyer: ${buyer}

Channel/context: ${channel}

Niche: ${niche}

Platform target: ${platform}

This custom pack turns the current public signal set into a narrow, proof-first production plan for one creator niche. It is designed for a paid custom delivery review before sending.

## Custom Recommendation

- Start with: ${titleFor(primary, platform)}
- Source: [${primary.title}](${primary.url})
- Proof to record: ${proofAsset(primary)}
- Why now: ${sentence(primary.deliverables?.whyNow, "The source has enough public evidence to justify a timely proof-first episode")}.
- Safety line: ${sentence(primary.deliverables?.limitation, "State who should skip this workflow before the CTA")}.

## Episode Ladder

${markdownTable(selected)}

## Full Custom Episode Brief

${episodeBlock(primary, 0, niche, platform)}

## Backup Queue

${selected.slice(1).map((item, index) => episodeBlock(item, index + 1, niche, platform)).join("\n")}

## Visual Direction

- Thumbnail: one source screenshot, one proof output, one short verdict label.
- Motion asset: 4-step lane from source signal to proof capture to limitation to buyer handoff.
- Keep colors restrained and leave enough whitespace for mobile cropping.
- Do not use fake metrics, invented dashboards, or platform UI that was not captured from the source.

## Delivery Notes

- Buyer deliverable: custom-proof-pack.md.
- Optional attachments after review: full-episode-script.md, episode-workbench.md, content-evidence-pack.md, content-editorial-audit.md.
- External payment confirmation is required before delivery.
- This is a planning and production aid. It does not promise views, subscribers, revenue, platform growth, or buyer outcomes.
`;

const deliveryEmail = `Subject: TrendFoundry custom proof pack - ${niche}

Hi ${buyer},

Your custom TrendFoundry proof pack for ${niche} / ${platform} is ready.

Start with custom-proof-pack.md. The recommended first episode is:
${titleFor(primary, platform)}

Main proof to record:
${proofAsset(primary)}

Safety note:
${sentence(primary.deliverables?.limitation, "State who should skip this workflow before the CTA")}.

This is a creator planning and production aid. It does not promise views, subscribers, revenue, platform growth, or buyer outcomes.

Best,
TrendFoundry
${contactEmail}
`;

const manifest = {
  generatedAt: new Date().toISOString(),
  dataGeneratedAt: latest.generatedAt,
  orderId,
  buyer,
  channel,
  niche,
  platform,
  primaryEpisode: {
    title: primary.title,
    url: primary.url,
    source: primary.source,
    proofAsset: proofAsset(primary),
    whyNow: compact(primary.deliverables?.whyNow),
    limitation: compact(primary.deliverables?.limitation)
  },
  buyerDeliverables: ["custom-proof-pack.md"],
  optionalAttachments: ["full-episode-script.md", "episode-workbench.md", "content-evidence-pack.md", "content-editorial-audit.md"],
  selectedEpisodes: selected.map((item, index) => ({
    rank: index + 1,
    title: item.title,
    url: item.url,
    source: item.source,
    fitScore: nicheScore(item, niche, platform),
    proofAsset: proofAsset(item)
  })),
  safety: {
    sendsMessages: false,
    chargesBuyer: false,
    requiresExternalPaymentConfirmation: true,
    noRevenuePromise: true,
    noViewPromise: true,
    noCredentialRequest: true
  },
  sellerOnlyExcluded: [
    "prospects.csv",
    "outreach-board.md",
    "data/latest.json",
    "data/raw/",
    "data/leads.json",
    "docs/lead-pipeline.md",
    "docs/lead-replies.md",
    "sensitive payment data",
    "account data"
  ]
};

await mkdir(docsDir, { recursive: true });
await mkdir(outDir, { recursive: true });
await writeFile(path.join(docsDir, "custom-proof-pack.md"), pack, "utf8");
await writeFile(path.join(outDir, "custom-proof-pack.md"), pack, "utf8");
await writeFile(path.join(outDir, "README.md"), pack, "utf8");
await writeFile(path.join(outDir, "delivery-email.md"), deliveryEmail, "utf8");
await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

console.log(`Wrote ${path.join(docsDir, "custom-proof-pack.md")}`);
console.log(`Wrote ${path.join(outDir, "manifest.json")}`);
console.log(`Custom proof pack: ${niche} / ${platform}`);
