import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const distDir = path.join(root, "dist", "buyer-content-pack");

async function readText(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

function compact(value, fallback = "") {
  return String(value || fallback).replace(/\s+/g, " ").trim();
}

function sentence(value) {
  return compact(value).replace(/[.。]+$/g, "");
}

function firstMatch(text, pattern, fallback = "") {
  return compact(text.match(pattern)?.[1], fallback);
}

function extractFullScriptMeta(script) {
  return {
    title: firstMatch(script, /^# Full Episode Script: (.+)$/m, "Full Episode Script"),
    source: firstMatch(script, /^Source: \[(.+?)\]\((.+?)\)$/m, "Source link"),
    sourceUrl: compact(script.match(/^Source: \[(.+?)\]\((.+?)\)$/m)?.[2], ""),
    bilibiliTitle: firstMatch(script, /^- Bilibili title: (.+)$/m, "Proof-first creator workflow"),
    youtubeTitle: firstMatch(script, /^- YouTube title: (.+)$/m, "Proof-first creator workflow"),
    proofAsset: firstMatch(script, /^- Primary proof asset: (.+)$/m, "Proof-first recording asset"),
    safetyLine: firstMatch(script, /^- Safety line: (.+)$/m, "State the limitation before the CTA")
  };
}

function markdownTable(rows) {
  const header = "| File | Buyer value | Use first when |";
  const divider = "| --- | --- | --- |";
  const body = rows.map((row) => `| ${row.file} | ${row.value} | ${row.use} |`);
  return [header, divider, ...body].join("\n");
}

const [fullScript, workbench, audit, evidencePack] = await Promise.all([
  readText("docs/full-episode-script.md"),
  readText("docs/episode-workbench.md"),
  readText("docs/content-editorial-audit.md"),
  readText("docs/content-evidence-pack.md")
]);
const latest = JSON.parse(await readText("data/latest.json"));
const meta = extractFullScriptMeta(fullScript);

const deliverables = [
  {
    file: "full-episode-script.md",
    value: "A complete 6-8 minute proof-first episode script with scenes, narration, recording checklist, shorts hooks, and publishing metadata.",
    use: "The buyer wants one script they can record immediately."
  },
  {
    file: "episode-workbench.md",
    value: "Five ready episode candidates with Bilibili opening plan, YouTube opening, recording proof, and buyer handoff notes.",
    use: "The buyer wants to choose between several video ideas."
  },
  {
    file: "content-evidence-pack.md",
    value: "A source-backed fact-check checklist with public URLs, claim types, proof assets, verification steps, and limitation lines.",
    use: "The buyer wants to verify claims before recording or delegating production."
  },
  {
    file: "content-editorial-audit.md",
    value: "Editorial quality gate showing evidence, recordability, specificity, commercial handoff, risk, and rewrite queue state.",
    use: "The buyer wants to know why the queue is trustworthy."
  }
];

const buyerIndex = `# TrendFoundry Buyer Content Pack

Generated: ${new Date().toISOString()}

Dataset: ${latest.generatedAt}

This pack is the buyer-facing content delivery layer for the current TrendFoundry issue. It packages one complete proof-first script, a five-item episode queue, a source-backed evidence pack, and the editorial quality gate into a reviewable delivery bundle.

## Primary Episode

- Episode: ${meta.title}
- Source: [${meta.source}](${meta.sourceUrl})
- Bilibili title: ${meta.bilibiliTitle}
- YouTube title: ${meta.youtubeTitle}
- Proof asset: ${meta.proofAsset}
- Safety line: ${meta.safetyLine}

## Included Deliverables

${markdownTable(deliverables)}

## Delivery Boundary

- Buyer-facing files: ${deliverables.map((item) => item.file).join(", ")}.
- Seller-only files excluded: prospects.csv, outreach-board.md, data/latest.json, raw source snapshots, local lead pipeline, private order notes, sensitive payment data, account data.
- The pack does not promise views, subscribers, revenue, platform growth, or buyer outcomes.
- The buyer should record the proof asset before polishing title, thumbnail, or CTA.
- The buyer should use \`content-evidence-pack.md\` to re-check source URLs and visible metadata before recording.

## Suggested Delivery Email

Subject: TrendFoundry content pack - ${meta.title}

Hi,

Here is the current TrendFoundry buyer content pack.

Start with \`full-episode-script.md\` if you want one video to record now. Use \`episode-workbench.md\` if you want to choose from the broader queue. Use \`content-evidence-pack.md\` to verify sources, claims, proof assets, and limitations before recording. Use \`content-editorial-audit.md\` to see the quality gate behind the choices.

The main proof asset is: ${sentence(meta.proofAsset)}.

Safety note: ${meta.safetyLine}

This pack is built for proof-first content planning. It does not promise views, subscribers, revenue, platform growth, or buyer outcomes.

Best,
TrendFoundry

## Operator Checklist

1. Attach or copy the four buyer-facing files.
2. Do not attach seller-only files or raw source snapshots.
3. Ask the buyer to re-check visible source metadata on recording day.
4. If the buyer wants a custom niche, regenerate the queue from updated sources before writing a custom script.
5. Keep the safety line in the first minute of the video.
6. Ask for external payment confirmation before preparing a paid order delivery folder.
`;

const deliveryEmail = `Subject: TrendFoundry content pack - ${meta.title}

Hi,

Here is the current TrendFoundry buyer content pack.

Start with full-episode-script.md if you want one video to record now. Use episode-workbench.md if you want to choose from the broader queue. Use content-evidence-pack.md to verify the sources and proof assets before recording. Use content-editorial-audit.md to see the quality gate behind the choices.

Main proof asset: ${sentence(meta.proofAsset)}

Safety note: ${meta.safetyLine}

This pack is built for proof-first content planning. It does not promise views, subscribers, revenue, platform growth, or buyer outcomes.

Best,
TrendFoundry
`;

const manifest = {
  generatedAt: new Date().toISOString(),
  dataGeneratedAt: latest.generatedAt,
  primaryEpisode: meta,
  buyerDeliverables: deliverables.map((item) => item.file),
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
  ],
  safety: {
    noRevenuePromise: true,
    noViewPromise: true,
    noCredentialRequest: true,
    manualPaymentConfirmationRequired: true
  }
};

await mkdir(docsDir, { recursive: true });
await mkdir(distDir, { recursive: true });
await writeFile(path.join(docsDir, "buyer-content-pack.md"), buyerIndex, "utf8");
await writeFile(path.join(distDir, "README.md"), buyerIndex, "utf8");
await writeFile(path.join(distDir, "delivery-email.md"), deliveryEmail, "utf8");
await writeFile(path.join(distDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
await writeFile(path.join(distDir, "full-episode-script.md"), fullScript, "utf8");
await writeFile(path.join(distDir, "episode-workbench.md"), workbench, "utf8");
await writeFile(path.join(distDir, "content-evidence-pack.md"), evidencePack, "utf8");
await writeFile(path.join(distDir, "content-editorial-audit.md"), audit, "utf8");

console.log(`Wrote ${path.join(docsDir, "buyer-content-pack.md")}`);
console.log(`Wrote ${path.join(distDir, "manifest.json")}`);
console.log(`Buyer content pack: ${deliverables.length} buyer deliverables.`);
