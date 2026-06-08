import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const outDir = path.join(root, "dist", "content-experiments");

const variantCatalog = {
  "custom-proof-niche": {
    offer: "trendfoundry-proof-custom",
    hypothesis: "Niche-specific proof packs should convert creators with narrow audience needs.",
    nextTest: "Lead with the narrow niche and ask for exact niche wording."
  },
  "custom-proof-sample-first": {
    offer: "trendfoundry-proof-custom",
    hypothesis: "A tracked free sample before the custom offer should reduce risk for custom-pack prospects.",
    nextTest: "Put the free sample before any paid custom CTA."
  },
  "script-pack-low-risk": {
    offer: "trendfoundry-proof-script-pack",
    hypothesis: "A low-price one-off script pack should work as the first paid test.",
    nextTest: "Offer the USD 9 test as the smallest next step."
  },
  "weekly-calendar": {
    offer: "trendfoundry-proof-weekly",
    hypothesis: "Recurring creators may prefer a simple weekly proof queue over one-off scripts.",
    nextTest: "Show the weekly calendar before asking for commitment."
  },
  unassigned: {
    offer: "unknown",
    hypothesis: "Legacy campaign without variant metadata.",
    nextTest: "Regenerate outreach review packs before sending."
  }
};

function compact(value, fallback = "") {
  return String(value || fallback).replace(/\s+/g, " ").trim() || fallback;
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows, columns) {
  return [columns.join(","), ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))].join("\n");
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted && char === "\"" && next === "\"") {
      field += "\"";
      index += 1;
    } else if (char === "\"") {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      if (row.some((cell) => cell.length)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  row.push(field);
  if (row.some((cell) => cell.length)) rows.push(row);
  if (!rows.length) return [];
  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""])));
}

async function readCsvMaybe(relativePath) {
  try {
    return parseCsv(await readFile(path.join(root, relativePath), "utf8"));
  } catch {
    return [];
  }
}

function countRows(rows, predicate) {
  return rows.filter(predicate).length;
}

function summarizeVariant(rows, variantId) {
  const catalog = variantCatalog[variantId] || variantCatalog.unassigned;
  const variantRows = rows.filter((row) => compact(row.variant_id, "unassigned") === variantId);
  const sent = countRows(variantRows, (row) => row.sent_status === "manual_sent");
  const replies = countRows(variantRows, (row) => Boolean(compact(row.reply_stage)));
  const deals = countRows(variantRows, (row) => Boolean(compact(row.deal_stage)));
  const fulfilled = countRows(variantRows, (row) => compact(row.fulfillment_status).includes("fulfilled"));
  const campaignCount = variantRows.length;
  const replyRate = sent ? replies / sent : 0;
  const dealRate = sent ? deals / sent : 0;
  const recommendation = sent < 3
    ? "collect_more_manual_sends"
    : replies === 0
      ? "revise_first_sentence_or_offer_fit"
      : deals === 0
        ? "strengthen_reply_to_paid_test_bridge"
        : "keep_and_expand";
  return {
    variant_id: variantId,
    offer_sku: catalog.offer,
    campaign_count: campaignCount,
    manually_sent: sent,
    replies,
    deals,
    fulfilled,
    reply_rate: replyRate.toFixed(2),
    deal_rate: dealRate.toFixed(2),
    recommendation,
    hypothesis: catalog.hypothesis,
    next_test: catalog.nextTest
  };
}

function pickFocus(rows) {
  const underSampled = rows.filter((row) => Number(row.manually_sent) < 3 && row.variant_id !== "unassigned");
  if (underSampled.length) {
    return underSampled.sort((left, right) => Number(left.manually_sent) - Number(right.manually_sent) || left.variant_id.localeCompare(right.variant_id))[0];
  }
  return [...rows].sort((left, right) => Number(right.reply_rate) - Number(left.reply_rate) || Number(right.deal_rate) - Number(left.deal_rate))[0] || {};
}

function privateMarkdown({ generatedAt, rows, focus }) {
  return `# TrendFoundry Content Experiment Plan

Generated: ${generatedAt}

Private local experiment plan. Do not publish creator names, tracked URLs, private replies, or payment references from linked files.

## Next Focus

- Variant: ${focus.variant_id || "none"}
- Recommendation: ${focus.recommendation || "none"}
- Next test: ${focus.next_test || "none"}

## Variant Scoreboard

| Variant | Campaigns | Sent | Replies | Deals | Fulfilled | Reply Rate | Deal Rate | Recommendation |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
${rows.map((row) => `| ${row.variant_id} | ${row.campaign_count} | ${row.manually_sent} | ${row.replies} | ${row.deals} | ${row.fulfilled} | ${row.reply_rate} | ${row.deal_rate} | ${row.recommendation} |`).join("\n") || "| - | 0 | 0 | 0 | 0 | 0 | 0.00 | 0.00 | no_variants |"}

## Variant Notes

${rows.map((row) => `### ${row.variant_id}\n\n- Hypothesis: ${row.hypothesis}\n- Next test: ${row.next_test}`).join("\n\n") || "No variants yet. Regenerate outreach review packs."}

## Safety

- Does not send messages.
- Does not collect payment.
- Does not upload files.
- Does not expose private prospect rows.
- Does not promise views, subscribers, revenue, platform growth, or outcomes.
`;
}

function publicMarkdown(manifest) {
  return `# TrendFoundry Content Experiments

Generated: ${manifest.generatedAt}

This report summarizes the private outreach experiment plan. Detailed prospect rows and tracked URLs stay in ignored \`dist/content-experiments/\` and \`dist/content-attribution/\`.

## Current Counts

- Active variants: ${manifest.variantCount}
- Campaigns tracked: ${manifest.campaignCount}
- Manually sent: ${manifest.manuallySentCount}
- Replies attributed: ${manifest.replyCount}
- Deals attributed: ${manifest.dealCount}
- Recommended next variant: ${manifest.recommendedVariant || "none"}
- Recommended action: ${manifest.recommendedAction || "none"}

## Operator Flow

1. Review \`dist/content-experiments/experiment-plan.md\`.
2. Keep each variant at least 3 reviewed manual sends before judging it.
3. Use \`dist/content-attribution/attribution-ledger.md\` to inspect private campaign rows.
4. Change one element at a time: offer, first sentence, or CTA.

## Safety Boundary

- Does not send messages.
- Does not collect payment.
- Does not upload files.
- Does not build or overwrite the frontend.
- Does not expose private creator, buyer, or tracked URL rows in tracked docs.
- Does not promise views, subscribers, revenue, platform growth, or buyer outcomes.
`;
}

const generatedAt = new Date().toISOString();
const ledgerRows = await readCsvMaybe("dist/content-attribution/attribution-ledger.csv");
const activeVariantIds = [...new Set([
  ...Object.keys(variantCatalog).filter((variant) => variant !== "unassigned"),
  ...ledgerRows.map((row) => compact(row.variant_id, "unassigned"))
])];
const rows = activeVariantIds.map((variantId) => summarizeVariant(ledgerRows, variantId));
const focus = pickFocus(rows);
const manifest = {
  generatedAt,
  variantCount: rows.filter((row) => row.variant_id !== "unassigned").length,
  campaignCount: ledgerRows.length,
  manuallySentCount: countRows(ledgerRows, (row) => row.sent_status === "manual_sent"),
  replyCount: countRows(ledgerRows, (row) => Boolean(compact(row.reply_stage))),
  dealCount: countRows(ledgerRows, (row) => Boolean(compact(row.deal_stage))),
  recommendedVariant: focus.variant_id || "",
  recommendedAction: focus.recommendation || "",
  enoughDataToChooseWinner: rows.some((row) => Number(row.manually_sent) >= 10 && Number(row.replies) >= 3),
  inputs: {
    attributionRows: ledgerRows.length,
    variants: rows.map((row) => row.variant_id)
  },
  safety: {
    sendsMessages: false,
    collectsPayment: false,
    uploadsFiles: false,
    buildsFrontend: false,
    exposesPrivateExperimentRowsInDocs: false,
    noRevenuePromise: true,
    noViewPromise: true
  }
};

await mkdir(docsDir, { recursive: true });
await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, "experiments.csv"), toCsv(rows, [
  "variant_id",
  "offer_sku",
  "campaign_count",
  "manually_sent",
  "replies",
  "deals",
  "fulfilled",
  "reply_rate",
  "deal_rate",
  "recommendation",
  "hypothesis",
  "next_test"
]), "utf8");
await writeFile(path.join(outDir, "experiment-plan.md"), privateMarkdown({ generatedAt, rows, focus }), "utf8");
await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
await writeFile(path.join(docsDir, "content-experiments.md"), publicMarkdown(manifest), "utf8");

console.log(`Wrote ${path.join(docsDir, "content-experiments.md")}`);
console.log(`Experiment variants: ${manifest.variantCount}`);
