import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const outDir = path.join(root, "dist", "content-attribution");

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

function keyFor(row) {
  return `${compact(row.source).toLowerCase()}:${compact(row.creator || row.buyer).toLowerCase()}`;
}

function firstByKey(rows) {
  const map = new Map();
  for (const row of rows) {
    const key = keyFor(row);
    if (key !== ":" && !map.has(key)) map.set(key, row);
  }
  return map;
}

function mapBy(rows, field) {
  const map = new Map();
  for (const row of rows) {
    const value = compact(row[field]);
    if (value && !map.has(value)) map.set(value, row);
  }
  return map;
}

function countBy(rows, field) {
  return rows.reduce((acc, row) => {
    const value = compact(row[field], "unknown");
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function topEntry(counts) {
  return Object.entries(counts).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0] || ["none", 0];
}

function fulfillmentForCampaign(row, fulfillmentRows) {
  const creator = compact(row.creator).toLowerCase();
  const offer = compact(row.offer_sku).toLowerCase();
  return fulfillmentRows.find((item) => {
    const buyer = compact(item.buyer).toLowerCase();
    const product = compact(item.product).toLowerCase();
    return creator && buyer === creator && (!offer || !product || product === offer);
  }) || {};
}

function rowFromCampaign({ reviewRow, gateByReview, sendByReview, repliesByCampaign, repliesByReview, repliesByKey, dealsByKey, fulfillmentRows }) {
  const campaignId = compact(reviewRow.campaign_id, `tf-${compact(reviewRow.review_id, "unknown")}`);
  const reviewId = compact(reviewRow.review_id);
  const key = keyFor(reviewRow);
  const gate = gateByReview.get(reviewId) || {};
  const send = sendByReview.get(reviewId) || {};
  const reply = repliesByCampaign.get(campaignId) || repliesByReview.get(reviewId) || repliesByKey.get(key) || {};
  const deal = dealsByKey.get(key) || {};
  const fulfillment = fulfillmentForCampaign(reviewRow, fulfillmentRows);
  const sentStatus = send.review_id ? "manual_sent" : "not_sent";
  const replyStatus = compact(reply.stage, "");
  const dealStatus = compact(deal.stage, "");
  const fulfillmentStatus = compact(fulfillment.status, "");
  const actionStatus = fulfillmentStatus.includes("fulfilled")
    ? "fulfilled"
    : dealStatus === "paid_needs_fulfillment"
      ? "paid_needs_fulfillment"
      : dealStatus || replyStatus || sentStatus;
  return {
    campaign_id: campaignId,
    review_id: reviewId,
    source: compact(reviewRow.source),
    creator: compact(reviewRow.creator),
    offer_sku: compact(reviewRow.offer_sku),
    gate_status: compact(gate.status, "not_checked"),
    sent_status: sentStatus,
    sent_at: compact(send.sent_at),
    reply_stage: replyStatus,
    reply_objection: compact(reply.objection),
    deal_stage: dealStatus,
    deal_action: compact(deal.recommended_action),
    fulfillment_status: fulfillmentStatus,
    action_status: actionStatus,
    tracked_free_sample_url: compact(reviewRow.tracked_free_sample_url),
    tracked_order_url: compact(reviewRow.tracked_order_url),
    attribution_basis: reply.campaign_id ? "reply_campaign_id" : reply.review_id ? "reply_review_id" : send.review_id ? "send_review_id" : reply.stage || deal.stage ? "source_creator" : "campaign_generated"
  };
}

function privateMarkdown({ generatedAt, rows }) {
  return `# TrendFoundry Content Attribution Ledger

Generated: ${generatedAt}

Private local campaign ledger. Do not publish creator names, proof URLs, tracked URLs, buyer rows, or payment references from this file.

| Campaign | Review | Source | Creator | Offer | Gate | Sent | Reply | Deal | Fulfillment | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
${rows.map((row) => `| ${row.campaign_id} | ${row.review_id} | ${row.source} | ${row.creator.replace(/\|/g, "/")} | ${row.offer_sku} | ${row.gate_status} | ${row.sent_status} | ${row.reply_stage || "-"} | ${row.deal_stage || "-"} | ${row.fulfillment_status || "-"} | ${row.action_status} |`).join("\n") || "| - | - | - | - | - | - | - | - | - | - | No campaigns generated. |"}

## Tracked URLs

${rows.map((row) => `- ${row.campaign_id}: sample=${row.tracked_free_sample_url || "missing"} order=${row.tracked_order_url || "missing"}`).join("\n") || "- No tracked URLs."}
`;
}

function publicMarkdown(manifest) {
  return `# TrendFoundry Content Attribution

Generated: ${manifest.generatedAt}

This report summarizes the private campaign ledger for content outreach. Detailed creator rows and tracked URLs stay in ignored \`dist/content-attribution/\`.

## Current Counts

- Campaigns: ${manifest.campaignCount}
- Gate passed: ${manifest.gatePassedCount}
- Manually sent: ${manifest.manualSentCount}
- Replies attributed: ${manifest.repliesAttributedCount}
- Deals attributed: ${manifest.dealsAttributedCount}
- Fulfilled rows attributed: ${manifest.fulfilledAttributedCount}
- Active offers: ${manifest.activeOffers.join(", ") || "none"}
- Top offer by campaign count: ${manifest.topOfferByCampaignCount.offer} (${manifest.topOfferByCampaignCount.count})

## Operator Flow

1. Review \`dist/content-attribution/attribution-ledger.md\`.
2. Use the campaign ID when recording a manual send or copied reply.
3. Prefer tracked sample/order links from the reviewer send pack.
4. Compare reply/deal counts by offer before changing the next outreach batch.

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
const reviewRows = await readCsvMaybe("dist/content-outreach-review/review-board.csv");
const gateRows = await readCsvMaybe("dist/content-outreach-gate/checks.csv");
const sendRows = await readCsvMaybe("dist/content-outreach-sends/send-log.csv");
const replyRows = await readCsvMaybe("data/content-sales-crm/replies.csv");
const dealRows = await readCsvMaybe("dist/content-deal-desk/deal-desk.csv");
const fulfillmentRows = await readCsvMaybe("dist/content-fulfillment-queue/fulfillment-queue.csv");

const gateByReview = new Map(gateRows.map((row) => [compact(row.review_id), row]));
const sendByReview = new Map(sendRows.map((row) => [compact(row.review_id), row]));
const repliesByKey = firstByKey(replyRows);
const repliesByCampaign = mapBy(replyRows, "campaign_id");
const repliesByReview = mapBy(replyRows, "review_id");
const dealsByKey = firstByKey(dealRows);
const rows = reviewRows.map((reviewRow) => rowFromCampaign({
  reviewRow,
  gateByReview,
  sendByReview,
  repliesByCampaign,
  repliesByReview,
  repliesByKey,
  dealsByKey,
  fulfillmentRows
}));

const [topOffer, topOfferCount] = topEntry(countBy(rows, "offer_sku"));
const manifest = {
  generatedAt,
  campaignCount: rows.length,
  gatePassedCount: rows.filter((row) => row.gate_status === "passed").length,
  manualSentCount: rows.filter((row) => row.sent_status === "manual_sent").length,
  repliesAttributedCount: rows.filter((row) => row.reply_stage).length,
  dealsAttributedCount: rows.filter((row) => row.deal_stage).length,
  fulfilledAttributedCount: rows.filter((row) => row.fulfillment_status.includes("fulfilled")).length,
  activeOffers: [...new Set(rows.map((row) => row.offer_sku).filter(Boolean))],
  topOfferByCampaignCount: { offer: topOffer, count: topOfferCount },
  actionStatusCounts: countBy(rows, "action_status"),
  inputs: {
    reviewRows: reviewRows.length,
    gateRows: gateRows.length,
    sendRows: sendRows.length,
    replyRows: replyRows.length,
    dealRows: dealRows.length,
    fulfillmentRows: fulfillmentRows.length
  },
  safety: {
    sendsMessages: false,
    collectsPayment: false,
    uploadsFiles: false,
    buildsFrontend: false,
    exposesPrivateAttributionRowsInDocs: false,
    noRevenuePromise: true,
    noViewPromise: true,
    noCredentialRequest: true
  }
};

await mkdir(docsDir, { recursive: true });
await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, "attribution-ledger.csv"), toCsv(rows, [
  "campaign_id",
  "review_id",
  "source",
  "creator",
  "offer_sku",
  "gate_status",
  "sent_status",
  "sent_at",
  "reply_stage",
  "reply_objection",
  "deal_stage",
  "deal_action",
  "fulfillment_status",
  "action_status",
  "tracked_free_sample_url",
  "tracked_order_url",
  "attribution_basis"
]), "utf8");
await writeFile(path.join(outDir, "attribution-ledger.md"), privateMarkdown({ generatedAt, rows }), "utf8");
await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
await writeFile(path.join(docsDir, "content-attribution.md"), publicMarkdown(manifest), "utf8");

console.log(`Wrote ${path.join(docsDir, "content-attribution.md")}`);
console.log(`Attribution campaigns: ${manifest.campaignCount}`);
