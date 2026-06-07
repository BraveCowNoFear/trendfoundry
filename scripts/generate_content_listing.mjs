import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const outDir = path.join(root, "dist", "content-listing");
const contactEmail = "rivan_Britain@outlook.com";
const publicSite = "https://bravecownofear.github.io/trendfoundry/";
const orderPage = "https://bravecownofear.github.io/trendfoundry/order/";
const samplePack = "https://bravecownofear.github.io/trendfoundry/trendfoundry-free-sample-pack.zip";

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

async function readText(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
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

function listingDescription(product, manifest) {
  return `${product.name}

${product.shortDescription}

What the buyer receives:
${manifest.buyerDeliverables.map((file) => `- ${file}`).join("\n")}

Primary episode:
- ${manifest.primaryEpisode.title}
- Source: ${manifest.primaryEpisode.sourceUrl}
- Proof asset: ${manifest.primaryEpisode.proofAsset}

Use it when you want a proof-first video script and recording checklist without spending hours scanning GitHub, YouTube, Bilibili, Hacker News, and arXiv.

Important: this is a creator planning and production aid. It does not promise views, subscribers, revenue, platform growth, or fully autonomous income.`;
}

const manifest = await readJson("dist/buyer-content-pack/manifest.json");
await readText("docs/buyer-content-pack.md");

const products = [
  {
    sku: "trendfoundry-proof-script-pack",
    name: "TrendFoundry Proof-First Script Pack",
    priceUsd: 9,
    billing: "one_time",
    shortDescription: "One complete proof-first AI/developer video script plus a five-item episode workbench and editorial audit.",
    bestFor: "Creators who want one recordable video idea today."
  },
  {
    sku: "trendfoundry-proof-weekly",
    name: "TrendFoundry Proof-First Weekly Pack",
    priceUsd: 19,
    billing: "monthly",
    shortDescription: "A weekly buyer-ready proof-first script pack for AI/developer creators.",
    bestFor: "Creators who need a repeatable weekly video pipeline."
  },
  {
    sku: "trendfoundry-proof-custom",
    name: "TrendFoundry Custom Proof Pack",
    priceUsd: 49,
    billing: "monthly",
    shortDescription: "A custom-niche proof-first script pack tuned to one creator audience or technical lane.",
    bestFor: "Teams or creators focused on one narrow niche."
  }
];

const rows = products.map((product) => ({
  sku: product.sku,
  title: product.name,
  price_usd: product.priceUsd,
  billing: product.billing,
  short_description: product.shortDescription,
  long_description: listingDescription(product, manifest),
  fulfillment: `Deliver ${manifest.buyerDeliverables.join(", ")} from dist/buyer-content-pack after payment is externally confirmed.`,
  refund_policy: "If the first delivered pack does not include one recordable proof-first script and at least three alternate episode candidates, email within 7 days for a refund.",
  tags: "AI tools, creator workflow, YouTube, Bilibili, GitHub, video script, content planning",
  product_url: publicSite,
  order_url: orderPage,
  free_sample_url: samplePack,
  support_email: contactEmail,
  safety: "No promise of views, subscribers, revenue, platform growth, or autonomous income. Do not request card numbers, passwords, wallet seeds, or private IDs by email."
}));

const markdown = `# TrendFoundry Content Product Listing

Generated: ${new Date().toISOString()}

This is the listing layer for the current buyer content pack. Use it to set up Gumroad, Ko-fi, Lemon Squeezy, Stripe Payment Links, Buy Me a Coffee, or manual invoice copy.

## Recommended First Product

- Product: ${rows[0].title}
- Price: USD ${rows[0].price_usd}
- Delivery: ${rows[0].fulfillment}
- Free sample: ${samplePack}
- Manual order page: ${orderPage}

## Platform Fields

${rows.map((row) => `### ${row.title}

- SKU: ${row.sku}
- Price: USD ${row.price_usd}${row.billing === "monthly" ? "/month" : ""}
- Billing: ${row.billing}
- Best use: ${products.find((product) => product.sku === row.sku)?.bestFor}
- Short description: ${row.short_description}
- Fulfillment: ${row.fulfillment}
- Refund policy: ${row.refund_policy}
- Safety: ${row.safety}

Long description:

${row.long_description}
`).join("\n")}

## Manual Invoice Template

Buyer:
Contact:
Channel:
Product: ${rows[0].title}
Price: USD ${rows[0].price_usd}
Delivery: ${manifest.buyerDeliverables.join(", ")}

Terms:
- External payment confirmation required before delivery.
- Do not send card numbers, private IDs, passwords, wallet seeds, or payment credentials by email.
- No promise of views, subscribers, revenue, platform growth, or autonomous income.
- Refund policy: ${rows[0].refund_policy}

## Short Outreach Copy

I put together a proof-first AI/developer video script pack: one complete 6-8 minute script, five ready episode candidates, and the editorial quality gate behind them. It is built for creators who want a recordable idea rather than a trend recap. Free sample: ${samplePack}
`;

const invoices = rows.map((row) => `# Manual Invoice Draft: ${row.title}

Buyer:
Contact:
Channel:

Item: ${row.title}
Price: USD ${row.price_usd}${row.billing === "monthly" ? " / month" : ""}

Delivery:
${manifest.buyerDeliverables.map((file) => `- ${file}`).join("\n")}

Terms:
- External payment confirmation required before delivery.
- Do not send card numbers, private IDs, passwords, wallet seeds, or payment credentials by email.
- No promise of views, subscribers, revenue, platform growth, or autonomous income.
- Refund policy: ${row.refund_policy}

Support: ${contactEmail}
`).join("\n---\n");

await mkdir(docsDir, { recursive: true });
await mkdir(outDir, { recursive: true });
await writeFile(path.join(docsDir, "content-product-listing.md"), markdown, "utf8");
await writeFile(path.join(outDir, "products.json"), JSON.stringify({ generatedAt: new Date().toISOString(), products: rows }, null, 2), "utf8");
await writeFile(
  path.join(outDir, "products.csv"),
  toCsv(rows, [
    "sku",
    "title",
    "price_usd",
    "billing",
    "short_description",
    "long_description",
    "fulfillment",
    "refund_policy",
    "tags",
    "product_url",
    "order_url",
    "free_sample_url",
    "support_email",
    "safety"
  ]),
  "utf8"
);
await writeFile(path.join(outDir, "platform-listings.md"), markdown, "utf8");
await writeFile(path.join(outDir, "manual-invoices.md"), invoices, "utf8");

console.log(`Wrote ${path.join(docsDir, "content-product-listing.md")}`);
console.log(`Wrote ${path.join(outDir, "products.json")}`);
console.log(`Content listings: ${rows.length} products.`);
