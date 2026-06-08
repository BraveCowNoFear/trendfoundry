import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const outDir = path.join(root, "dist", "content-evidence-pack");

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

function compact(value, fallback = "") {
  return String(value || fallback).replace(/\s+/g, " ").trim();
}

function sentence(value, fallback = "") {
  return compact(value, fallback).replace(/[.。]+$/g, "");
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows, columns) {
  return [columns.join(","), ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))].join("\n");
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

function sourceSignal(item) {
  if (item.source === "github") {
    return `Repository signal: ${compact(item.language, "unknown language")}, ${item.stars ?? "unknown"} stars, ${item.comments ?? "unknown"} open issues/comments, updated ${compact(item.updatedAt, "unknown")}.`;
  }
  if (item.source === "bilibili" || item.source === "youtube") {
    return `Creator-platform signal: ${compact(item.author, "unknown creator")}, ${item.views ?? item.score ?? "unknown"} visible engagement score, published or updated ${compact(item.publishedAt || item.updatedAt, "unknown")}.`;
  }
  if (item.source === "hn") {
    return `Discussion signal: ${item.points ?? item.score ?? "unknown"} points/score and ${item.comments ?? "unknown"} comments.`;
  }
  if (item.source === "arxiv") {
    return `Research signal: arXiv/public paper item, updated ${compact(item.updatedAt || item.createdAt, "unknown")}.`;
  }
  return `Public signal from ${sourceLabel(item)} with score ${item.score ?? "unknown"}.`;
}

function proofToRecord(item) {
  if (item.source === "github") return "README promise, install or quickstart command, first output, dependency friction, and one blocker note.";
  if (item.source === "bilibili" || item.source === "youtube") return "Source claim, tiny reproduction input, before/after comparison, and skip-condition slide.";
  if (item.source === "hn") return "Thread URL, three comment clusters, one do/don't checklist, and one counterexample.";
  if (item.source === "arxiv") return "Abstract, one toy example, one plain-language mechanism slide, and research-to-product gap.";
  return "Source page, one small input/output proof, and one limitation.";
}

function verificationSteps(item) {
  const demo = item.deliverables?.demoSteps || [];
  const fallback = [
    `Open the source URL and keep it visible: ${item.url}`,
    `Record the proof asset: ${proofToRecord(item)}`,
    "State the limitation before any recommendation."
  ];
  return (demo.length ? demo : fallback).slice(0, 4);
}

function claimRowsFor(item, rank, role) {
  return [
    {
      rank,
      role,
      claim_type: "source_exists",
      claim: `${sourceLabel(item)} source exists and is the basis for this episode.`,
      evidence: item.url,
      verification_step: "Open URL before recording; keep the address visible in the capture.",
      risk: "low",
      buyer_use: "Use as source citation."
    },
    {
      rank,
      role,
      claim_type: "timeliness",
      claim: compact(item.deliverables?.whyNow, sourceSignal(item)),
      evidence: sourceSignal(item),
      verification_step: "Re-check visible date, update, stars/views/comments, or thread/paper metadata on recording day.",
      risk: item.stale ? "medium" : "low",
      buyer_use: "Use as why-now line after manual recency check."
    },
    {
      rank,
      role,
      claim_type: "recordable_proof",
      claim: `The episode can be framed around this proof: ${proofToRecord(item)}`,
      evidence: (verificationSteps(item)).join(" | "),
      verification_step: "Record the smallest proof before polishing title, thumbnail, or CTA.",
      risk: "medium",
      buyer_use: "Use as recording checklist."
    },
    {
      rank,
      role,
      claim_type: "limitation",
      claim: compact(item.deliverables?.limitation, "State who should skip this workflow before the CTA."),
      evidence: "Editorial limitation line generated from source type and risk flags.",
      verification_step: "Say this before recommendation language; downgrade if proof fails.",
      risk: item.qualityRisk === "normal" ? "low" : "medium",
      buyer_use: "Use as trust/safety line."
    }
  ];
}

function evidenceRows(items, primaryUrl) {
  return items.map((item, index) => ({
    rank: index + 1,
    role: item.url === primaryUrl ? "primary_episode" : "backup_episode",
    title: item.title,
    source: sourceLabel(item),
    url: item.url,
    score: item.score ?? "",
    quality_risk: item.qualityRisk || "",
    monetization_fit: item.monetizationFit || "",
    source_signal: sourceSignal(item),
    proof_to_record: proofToRecord(item),
    verification_steps: verificationSteps(item).join(" | "),
    limitation: compact(item.deliverables?.limitation)
  }));
}

function markdownTable(rows) {
  return [
    "| Rank | Role | Source | Episode | Proof to Record | Risk |",
    "| --- | --- | --- | --- | --- | --- |",
    ...rows.map((row) => `| ${row.rank} | ${row.role} | ${row.source} | [${row.title.replace(/\|/g, "/")}](${row.url}) | ${row.proof_to_record.replace(/\|/g, "/")} | ${row.quality_risk || "unknown"} |`)
  ].join("\n");
}

const latest = await readJson("data/latest.json");
const fullScript = await readJson("dist/full-episode-script/latest.json");
const workbench = await readJson("dist/episode-workbench/latest.json");
const workbenchUrls = new Set((workbench.episodes || []).map((episode) => episode.url));
const selected = (latest.items || [])
  .filter((item) => item.url === fullScript.url || workbenchUrls.has(item.url))
  .sort((a, b) => (a.url === fullScript.url ? -1 : b.url === fullScript.url ? 1 : (b.score ?? 0) - (a.score ?? 0)));
const rows = evidenceRows(selected, fullScript.url);
const claimRows = rows.flatMap((row) => {
  const item = selected.find((candidate) => candidate.url === row.url);
  return claimRowsFor(item, row.rank, row.role);
});

const markdown = `# TrendFoundry Content Evidence Pack

Generated: ${new Date().toISOString()}

Dataset: ${latest.generatedAt}

This buyer-facing evidence pack turns the current script and episode queue into a fact-check and recording-proof checklist. It is designed to make the paid pack more trustworthy: every recommendation should point to a public source, a proof asset, a verification step, and a limitation.

## Primary Evidence Table

${markdownTable(rows)}

## Claim Checklist

${claimRows.map((row) => `### ${row.rank}. ${row.claim_type} (${row.role})

- Claim: ${row.claim}
- Evidence: ${row.evidence}
- Verification: ${row.verification_step}
- Risk: ${row.risk}
- Buyer use: ${row.buyer_use}
`).join("\n")}

## Recording Rules

1. Open the source URL before recording.
2. Re-check recency or visible engagement on recording day.
3. Capture the smallest proof before polishing title or thumbnail.
4. Keep the limitation line before recommendation language.
5. Downgrade any item to watchlist if the proof cannot be recorded in one session.

## Safety Boundary

- Does not send messages.
- Does not collect payment.
- Does not upload files.
- Does not include private prospects, raw source snapshots, leads, payment data, or account data.
- Does not promise views, subscribers, revenue, platform growth, or buyer outcomes.
`;

const manifest = {
  generatedAt: new Date().toISOString(),
  dataGeneratedAt: latest.generatedAt,
  primaryEpisodeUrl: fullScript.url,
  evidenceItemCount: rows.length,
  claimCount: claimRows.length,
  buyerDeliverable: "content-evidence-pack.md",
  files: ["content-evidence-pack.md", "evidence.csv", "claim-checklist.csv"],
  safety: {
    sendsMessages: false,
    collectsPayment: false,
    uploadsFiles: false,
    includesPrivateProspects: false,
    noRevenuePromise: true,
    noViewPromise: true
  }
};

await mkdir(docsDir, { recursive: true });
await mkdir(outDir, { recursive: true });
await writeFile(path.join(docsDir, "content-evidence-pack.md"), markdown, "utf8");
await writeFile(path.join(outDir, "content-evidence-pack.md"), markdown, "utf8");
await writeFile(
  path.join(outDir, "evidence.csv"),
  toCsv(rows, ["rank", "role", "title", "source", "url", "score", "quality_risk", "monetization_fit", "source_signal", "proof_to_record", "verification_steps", "limitation"]),
  "utf8"
);
await writeFile(
  path.join(outDir, "claim-checklist.csv"),
  toCsv(claimRows, ["rank", "role", "claim_type", "claim", "evidence", "verification_step", "risk", "buyer_use"]),
  "utf8"
);
await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

console.log(`Wrote ${path.join(docsDir, "content-evidence-pack.md")}`);
console.log(`Wrote ${path.join(outDir, "manifest.json")}`);
console.log(`Evidence items: ${rows.length}, claims: ${claimRows.length}.`);
