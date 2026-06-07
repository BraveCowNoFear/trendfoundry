import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { contactEmail } from "./lib/fulfillment.mjs";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const outDir = path.join(root, "dist", "content-sales-sequence");
const orderPage = "https://bravecownofear.github.io/trendfoundry/order/";
const samplePack = "https://bravecownofear.github.io/trendfoundry/trendfoundry-free-sample-pack.zip";

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

function compact(value, fallback = "") {
  return String(value || fallback).replace(/\s+/g, " ").trim();
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows, columns) {
  return [columns.join(","), ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))].join("\n");
}

function productBySku(products, sku) {
  return products.find((product) => product.sku === sku) || products[0];
}

function shortProof(primary) {
  return compact(primary.proofAsset || "a visible source-to-proof recording path");
}

function messageRows({ sampleProduct, weeklyProduct, customProduct, customManifest }) {
  const primary = customManifest.primaryEpisode || {};
  const niche = compact(customManifest.niche, "AI/developer creators");
  const platform = compact(customManifest.platform, "YouTube and Bilibili");
  const proof = shortProof(primary);
  return [
    {
      day: 0,
      channel: "warm_email",
      audience: "creator who already makes AI/developer videos",
      status: "draft_review_before_sending",
      subject: "Proof-first video ideas for your next AI/dev episode",
      body: `I built a small proof-first script pack for AI/developer creators. It starts from public signals, then turns one signal into a recordable script, a five-episode workbench, and an editorial quality gate. Free sample: ${samplePack}\n\nIf you want one ready-to-record pack, the entry product is ${sampleProduct.title} at USD ${sampleProduct.price_usd}. Manual order page: ${orderPage}`,
      cta: "Ask whether they want the free sample or a narrow custom niche."
    },
    {
      day: 1,
      channel: "bilibili_dynamic",
      audience: "Chinese AI workflow creators",
      status: "draft_review_before_posting",
      subject: "Bilibili dynamic draft",
      body: `我把 AI/开发者视频选题拆成 proof-first 流程：来源信号 -> 最小复现 -> 失败边界 -> 可录脚本。免费样品包在这里：${samplePack}\n\n如果你想定制一个窄赛道，比如 ${niche}，custom pack 会交付 custom-proof-pack.md，先给你一条可录主线和 5 条备选。`,
      cta: "Invite reply with one niche and platform."
    },
    {
      day: 2,
      channel: "youtube_community",
      audience: "YouTube AI tools audience",
      status: "draft_review_before_posting",
      subject: "YouTube community draft",
      body: `New creator workflow experiment: instead of recapping AI tool news, TrendFoundry turns public signals into proof-first video packs.\n\nA paid pack includes a ready script, episode workbench, and editorial audit. The custom pack for ${niche} / ${platform} starts with this proof: ${proof}\n\nFree sample: ${samplePack}`,
      cta: "Ask viewers which niche should get the next custom pack."
    },
    {
      day: 3,
      channel: "linkedin_or_x",
      audience: "indie creators, AI builders, newsletter operators",
      status: "draft_review_before_posting",
      subject: "Proof-first content ops post",
      body: `Content idea markets are noisy because most trend lists stop at the headline. TrendFoundry packages the missing middle: source evidence, recordable proof, limitation, and buyer handoff.\n\nCurrent products: USD ${sampleProduct.price_usd} script pack, USD ${weeklyProduct.price_usd}/mo weekly pack, USD ${customProduct.price_usd}/mo custom proof pack.\n\nOrder page: ${orderPage}`,
      cta: "Point to the sample pack before asking for payment."
    },
    {
      day: 5,
      channel: "followup_email",
      audience: "sample downloader or warm lead",
      status: "draft_review_before_sending",
      subject: "Want this narrowed to one channel?",
      body: `If the free sample is useful but too broad, the custom pack narrows it to one creator lane.\n\nFor ${niche} on ${platform}, the current custom pack selects 6 proof-first episodes and recommends one lead episode with proof, recording path, limitation, and visual direction.\n\nReply with the narrowest audience you want covered. I can prepare the custom pack after external payment confirmation.`,
      cta: "Ask for niche, platform, and channel URL."
    },
    {
      day: 7,
      channel: "objection_reply",
      audience: "lead who says they already have ideas",
      status: "draft_review_before_sending",
      subject: "Reply: already have ideas",
      body: `Totally fair. TrendFoundry is not trying to replace your taste; it removes the research and proof-packaging work around it.\n\nThe useful part is the recording path: what source to show, what proof to capture, where the limitation goes, and what to avoid saying. That is the part most idea lists do not include.\n\nFree sample: ${samplePack}`,
      cta: "Offer the USD 9 pack as a low-friction test."
    }
  ];
}

function markdownFor(rows, products, customManifest) {
  const customProduct = productBySku(products, "trendfoundry-proof-custom");
  return `# TrendFoundry Content Sales Sequence

Generated: ${new Date().toISOString()}

This is a content-only sales sequence for the current proof-first script products. It creates reviewable drafts; it does not send messages, collect payment, upload files, or modify accounts.

## Product Ladder

- Entry: ${productBySku(products, "trendfoundry-proof-script-pack").title} / USD ${productBySku(products, "trendfoundry-proof-script-pack").price_usd}
- Weekly: ${productBySku(products, "trendfoundry-proof-weekly").title} / USD ${productBySku(products, "trendfoundry-proof-weekly").price_usd} per month
- Custom: ${customProduct.title} / USD ${customProduct.price_usd} per month
- Free proof asset: ${samplePack}
- Manual order page: ${orderPage}
- Contact: ${contactEmail}

## Current Custom Proof Angle

- Niche: ${compact(customManifest.niche)}
- Platform: ${compact(customManifest.platform)}
- Lead episode: ${compact(customManifest.primaryEpisode?.title)}
- Proof asset: ${shortProof(customManifest.primaryEpisode || {})}
- Buyer deliverable: ${(customManifest.buyerDeliverables || []).join(", ")}

## Sequence

${rows.map((row) => `### Day ${row.day}: ${row.channel}

- Audience: ${row.audience}
- Status: ${row.status}
- Subject: ${row.subject}

${row.body}

CTA: ${row.cta}
`).join("\n")}

## Objection Handling

- Too broad: offer custom niche narrowing and ask for one channel URL.
- I already have ideas: emphasize proof capture, limitation placement, and buyer handoff.
- Too expensive: point to the USD 9 script pack and the free sample.
- Does this promise growth: no; it is a planning and production aid, not a performance promise.
- Can you send payment details here: no; use external payment confirmation and do not send sensitive payment or account data by email.

## Safety Boundary

- Drafts only; no automatic sending or posting.
- No payment collection.
- No account access.
- No sensitive payment or account data request.
- No promise of views, subscribers, revenue, platform growth, or buyer outcomes.
`;
}

const listing = await readJson("dist/content-listing/products.json");
const customManifest = await readJson("dist/custom-proof-pack/manifest.json");
const products = listing.products || [];
const rows = messageRows({
  sampleProduct: productBySku(products, "trendfoundry-proof-script-pack"),
  weeklyProduct: productBySku(products, "trendfoundry-proof-weekly"),
  customProduct: productBySku(products, "trendfoundry-proof-custom"),
  customManifest
});
const markdown = markdownFor(rows, products, customManifest);
const manifest = {
  generatedAt: new Date().toISOString(),
  sourceProductsGeneratedAt: listing.generatedAt,
  customPackGeneratedAt: customManifest.generatedAt,
  channels: [...new Set(rows.map((row) => row.channel))],
  count: rows.length,
  statuses: [...new Set(rows.map((row) => row.status))],
  safety: {
    sendsMessages: false,
    postsContent: false,
    collectsPayment: false,
    requestsSensitiveData: false,
    noRevenuePromise: true,
    noViewPromise: true
  }
};

await mkdir(docsDir, { recursive: true });
await mkdir(outDir, { recursive: true });
await writeFile(path.join(docsDir, "content-sales-sequence.md"), markdown, "utf8");
await writeFile(path.join(outDir, "sequence.md"), markdown, "utf8");
await writeFile(
  path.join(outDir, "sequence.csv"),
  toCsv(rows, ["day", "channel", "audience", "status", "subject", "body", "cta"]),
  "utf8"
);
await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

console.log(`Wrote ${path.join(docsDir, "content-sales-sequence.md")}`);
console.log(`Wrote ${path.join(outDir, "manifest.json")}`);
console.log(`Content sales drafts: ${rows.length}`);
