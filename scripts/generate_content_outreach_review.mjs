import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const outDir = path.join(root, "dist", "content-outreach-review");
const packsDir = path.join(outDir, "send-packs");

function compact(value, fallback = "") {
  return String(value || fallback).replace(/\s+/g, " ").trim() || fallback;
}

function cleanDisplayText(value) {
  const replacements = [
    [String.fromCodePoint(0x9225, 0x6a9a), "'s"],
    [`${String.fromCodePoint(0x9225, 0x6a9d)}e`, "'ve"],
    [`${String.fromCodePoint(0x9225, 0x6a99)}e`, "'re"],
    [`${String.fromCodePoint(0x9225, 0x6a92)}l`, "'ll"],
    [String.fromCodePoint(0x9225, 0x6a87), "'d"],
    [String.fromCodePoint(0x9225, 0x6a9b), "'t"],
    [String.fromCodePoint(0x9225), "'"],
    [String.fromCodePoint(0x00e2, 0x20ac, 0x2122), "'"],
    [String.fromCodePoint(0x00e2, 0x20ac, 0x0153), "\""],
    [String.fromCodePoint(0x00e2, 0x20ac, 0x009d), "\""],
    [String.fromCodePoint(0x00e2, 0x20ac, 0x201c), "-"],
    [String.fromCodePoint(0x00e2, 0x20ac, 0x201d), "-"]
  ];
  let text = compact(value);
  for (const [from, to] of replacements) text = text.split(from).join(to);
  return text.replace(/\s+/g, " ").trim();
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

async function readJsonMaybe(relativePath, fallback = {}) {
  try {
    return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
  } catch {
    return fallback;
  }
}

function safeFileName(value, fallback = "prospect") {
  return compact(value, fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || fallback;
}

function withTracking(url, params) {
  const raw = compact(url);
  if (!raw) return raw;
  try {
    const parsed = new URL(raw);
    for (const [key, value] of Object.entries(params)) {
      parsed.searchParams.set(key, compact(value));
    }
    return parsed.toString();
  } catch {
    const separator = raw.includes("?") ? "&" : "?";
    const query = Object.entries(params)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(compact(value))}`)
      .join("&");
    return `${raw}${separator}${query}`;
  }
}

function addDaysIso(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function productBySku(products, sku) {
  return products.find((product) => product.sku === sku) || products[0] || {};
}

function variantFor(row, product, index) {
  const sku = compact(product.sku || row.offer_sku);
  if (sku.includes("weekly")) {
    return {
      variant_id: "weekly-calendar",
      variant_hypothesis: "Recurring creators may prefer a simple weekly proof queue over one-off scripts."
    };
  }
  if (sku.includes("custom")) {
    return {
      variant_id: index % 2 === 0 ? "custom-proof-niche" : "custom-proof-sample-first",
      variant_hypothesis: index % 2 === 0
        ? "Niche-specific proof packs should convert creators with narrow audience needs."
        : "A tracked free sample before the custom offer should reduce risk for custom-pack prospects."
    };
  }
  return {
    variant_id: "script-pack-low-risk",
    variant_hypothesis: "A low-price one-off script pack should work as the first paid test."
  };
}

function sourceNoun(source) {
  if (source === "youtube") return "YouTube channel";
  if (source === "bilibili") return "Bilibili channel";
  if (source === "github") return "GitHub project";
  return "creator channel";
}

function subjectLine(row, product) {
  const topic = cleanDisplayText(row.topic) || "your next proof-first episode";
  if (row.offer_sku === "trendfoundry-proof-custom") return `Proof pack idea for ${topic}`;
  if (row.offer_sku === "trendfoundry-proof-weekly") return `A weekly proof-first episode queue for ${topic}`;
  return `One proof-first script idea for ${topic}`;
}

function makePack(row, product, index) {
  const creator = cleanDisplayText(row.creator) || "creator";
  const topic = cleanDisplayText(row.topic) || "AI/developer creator workflow";
  const source = compact(row.source, "public source");
  const proofUrl = compact(row.proof_url, product.product_url || "https://bravecownofear.github.io/trendfoundry/");
  const freeSampleUrl = compact(product.free_sample_url, "https://bravecownofear.github.io/trendfoundry/trendfoundry-free-sample-pack.zip");
  const orderUrl = compact(product.order_url, "https://bravecownofear.github.io/trendfoundry/order/");
  const reviewId = `outreach-${String(index + 1).padStart(2, "0")}-${safeFileName(creator)}`;
  const campaignId = `tf-${reviewId}`;
  const variant = variantFor(row, product, index);
  const tracking = {
    tf_campaign: campaignId,
    tf_source: "content_outreach",
    tf_offer: product.sku || row.offer_sku || "trendfoundry-proof-script-pack",
    tf_variant: variant.variant_id
  };
  const trackedFreeSampleUrl = withTracking(freeSampleUrl, tracking);
  const trackedOrderUrl = withTracking(orderUrl, tracking);
  const question = cleanDisplayText(row.feedback_question) || "Which proof asset would you actually record this week?";
  const subject = subjectLine(row, product);
  const followUpDate = addDaysIso(index < 3 ? 3 : 5);
  const body = [
    `Hi ${creator},`,
    `I noticed your ${sourceNoun(source)} work around "${topic}". I prepared a proof-first TrendFoundry sample that turns public AI/dev signals into a recordable episode outline, with a source link and a concrete recording angle instead of generic trend text.`,
    `Free sample: ${trackedFreeSampleUrl}`,
    `Order/review page: ${trackedOrderUrl}`,
    `The most relevant paid option would be ${product.title || "TrendFoundry Proof-First Script Pack"} at USD ${product.price_usd || 9} (${product.billing || "one_time"}), but only after you review the sample and decide it is useful.`,
    `One feedback question: ${question}`,
    `Reference I used for this draft: ${proofUrl}`,
    "No promises about views, subscribers, revenue, platform growth, or outcomes. This is only a creator planning and production aid."
  ].join("\n\n");
  return {
    review_id: reviewId,
    campaign_id: campaignId,
    variant_id: variant.variant_id,
    variant_hypothesis: variant.variant_hypothesis,
    close_rank: row.close_rank,
    creator,
    source,
    topic,
    proof_url: proofUrl,
    offer_sku: product.sku || row.offer_sku,
    offer_title: product.title || "TrendFoundry Proof-First Script Pack",
    offer_price_usd: product.price_usd || row.offer_price_usd || 9,
    billing: product.billing || "one_time",
    text_quality: compact(row.text_quality, "unknown"),
    review_action: compact(row.review_action, "review_personalize_then_send_manually"),
    subject,
    follow_up_date: followUpDate,
    feedback_question: question,
    reply_capture: compact(row.reply_capture, `${source},${creator},<summary>,<objection>,replied_needs_response,<notes>`),
    free_sample_url: freeSampleUrl,
    order_url: orderUrl,
    tracked_free_sample_url: trackedFreeSampleUrl,
    tracked_order_url: trackedOrderUrl,
    body
  };
}

function sendPackMarkdown(pack) {
  return `# Outreach Review Pack: ${pack.creator}

Private local review pack. Do not publish. Do not send without human review.

## Decision

- Review ID: ${pack.review_id}
- Campaign ID: ${pack.campaign_id}
- Variant: ${pack.variant_id}
- Variant hypothesis: ${pack.variant_hypothesis}
- Source: ${pack.source}
- Topic: ${pack.topic}
- Proof URL: ${pack.proof_url}
- Offer: ${pack.offer_title} (${pack.offer_sku})
- Price: USD ${pack.offer_price_usd} / ${pack.billing}
- Text quality: ${pack.text_quality}
- Review action: ${pack.review_action}
- Follow-up date after manual send: ${pack.follow_up_date}

## Subject

\`\`\`text
${pack.subject}
\`\`\`

## Draft

\`\`\`text
${pack.body}
\`\`\`

## Review Checklist

- [ ] Public source URL still opens and matches the topic.
- [ ] First sentence is personalized and not spammy.
- [ ] Offer matches the creator need.
- [ ] No promise of views, subscribers, revenue, platform growth, or buyer outcomes.
- [ ] No request for password, card number, private ID, wallet seed, or sensitive account data.
- [ ] Free sample and order links include the campaign tracking parameter.
- [ ] Reply capture row is ready if the creator responds.

## Reply Capture Row

\`\`\`csv
${pack.reply_capture}
\`\`\`
`;
}

function reviewBoardMarkdown(packs) {
  return `# TrendFoundry Outreach Review Board

Generated: ${new Date().toISOString()}

Private local board. Review one send pack at a time.

| Rank | Creator | Source | Offer | Subject | Follow-up |
| --- | --- | --- | --- | --- | --- |
${packs.map((pack) => `| ${pack.close_rank} | ${pack.creator.replace(/\|/g, "/")} | ${pack.source} | ${pack.offer_sku} | ${pack.subject.replace(/\|/g, "/")} | ${pack.follow_up_date} |`).join("\n") || "| - | - | - | - | - | - |"}

## Safety

- No automatic sending.
- No automatic posting.
- No payment collection.
- No private prospect rows in tracked docs.
- No sensitive data requests.
- No outcome promises.
`;
}

function publicDoc({ packs, products }) {
  const offerCounts = Object.fromEntries([...new Set(packs.map((pack) => pack.offer_sku))].map((sku) => [sku, packs.filter((pack) => pack.offer_sku === sku).length]));
  return `# TrendFoundry Content Outreach Review

Generated: ${new Date().toISOString()}

This step turns the private daily close queue into reviewer-ready send packs. Detailed prospect rows stay in ignored \`dist/content-outreach-review/\`.

## Current Counts

- Review packs: ${packs.length}
- Campaigns with tracked URLs: ${packs.filter((pack) => pack.tracked_free_sample_url.includes("tf_campaign=") && pack.tracked_order_url.includes("tf_campaign=")).length}
- Variants active: ${[...new Set(packs.map((pack) => pack.variant_id))].join(", ") || "none"}
- Products available: ${products.length}
- Offer mix: ${Object.entries(offerCounts).map(([sku, count]) => `${sku}=${count}`).join(", ") || "none"}

## Operator Workflow

1. Open \`dist/content-outreach-review/review-board.md\`.
2. Open one file under \`dist/content-outreach-review/send-packs/\`.
3. Verify the public source URL.
4. Personalize the first sentence.
5. Send manually only after review.
6. If a reply arrives, append the safe summary to ignored \`data/content-sales-crm/replies.csv\`.
7. Run \`npm run content-ops\` again to update feedback, revenue assumptions, CRM, close queue, and review packs.

## Safety Boundary

- Does not send messages.
- Does not post content.
- Does not collect payment.
- Does not request sensitive payment or account data.
- Does not publish private prospect rows.
- Does not promise views, subscribers, revenue, platform growth, or buyer outcomes.
`;
}

const closeRows = await readCsvMaybe("dist/content-close-pack/today-close-queue.csv");
const { products = [] } = await readJsonMaybe("dist/content-listing/products.json", { products: [] });
const packs = closeRows
  .filter((row) => compact(row.review_action) !== "fix_text_then_review")
  .map((row, index) => makePack(row, productBySku(products, row.offer_sku), index));

await mkdir(docsDir, { recursive: true });
await mkdir(outDir, { recursive: true });
await rm(packsDir, { recursive: true, force: true });
await mkdir(packsDir, { recursive: true });

for (const pack of packs) {
  await writeFile(path.join(packsDir, `${pack.review_id}.md`), sendPackMarkdown(pack), "utf8");
}

const manifest = {
  generatedAt: new Date().toISOString(),
  sourceQueue: "dist/content-close-pack/today-close-queue.csv",
  reviewPackCount: packs.length,
  skippedNeedsCleanupCount: closeRows.filter((row) => compact(row.review_action) === "fix_text_then_review").length,
  offerSkus: [...new Set(packs.map((pack) => pack.offer_sku))],
  campaignCount: packs.length,
  trackedUrlCount: packs.filter((pack) => pack.tracked_free_sample_url.includes("tf_campaign=") && pack.tracked_order_url.includes("tf_campaign=")).length,
  variantIds: [...new Set(packs.map((pack) => pack.variant_id))],
  followUpDates: [...new Set(packs.map((pack) => pack.follow_up_date))],
  safety: {
    sendsMessages: false,
    postsContent: false,
    collectsPayment: false,
    exposesPrivateProspectsInDocs: false,
    requestsSensitiveData: false,
    noRevenuePromise: true,
    noViewPromise: true
  }
};

await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
await writeFile(path.join(outDir, "review-board.csv"), toCsv(packs, [
  "review_id",
  "campaign_id",
  "variant_id",
  "variant_hypothesis",
  "close_rank",
  "creator",
  "source",
  "topic",
  "proof_url",
  "offer_sku",
  "offer_title",
  "offer_price_usd",
  "billing",
  "text_quality",
  "review_action",
  "subject",
  "follow_up_date",
  "feedback_question",
  "reply_capture",
  "free_sample_url",
  "order_url",
  "tracked_free_sample_url",
  "tracked_order_url"
]), "utf8");
await writeFile(path.join(outDir, "review-board.md"), reviewBoardMarkdown(packs), "utf8");
await writeFile(path.join(docsDir, "content-outreach-review.md"), publicDoc({ packs, products }), "utf8");

console.log(`Wrote ${path.join(docsDir, "content-outreach-review.md")}`);
console.log(`Review packs: ${packs.length}`);
