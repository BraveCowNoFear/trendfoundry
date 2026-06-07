import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const commerceDir = path.join(root, "dist", "commerce");
const contactEmail = "rivan_Britain@outlook.com";
const productUrl = "https://bravecownofear.github.io/trendfoundry/";
const sampleUrl = "https://bravecownofear.github.io/trendfoundry/public-sample.md";
const issueFormUrl = "https://github.com/BraveCowNoFear/trendfoundry/issues/new?template=order-sample-pack.yml&title=Sample%20pack%20request%3A%20";

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows, columns) {
  return [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))
  ].join("\n");
}

const deliverables = [
  "daily-brief.md",
  "ready-to-record-script.md",
  "opportunities.csv",
  "public-sample.md",
  "public-sample.csv"
];

const products = [
  {
    sku: "trendfoundry-sample-issue",
    name: "TrendFoundry Sample Issue",
    priceUsd: 9,
    billing: "one_time",
    shortDescription: "A one-off source-backed AI/developer video idea pack for creators testing fit.",
    bestFor: "Creators who want to test TrendFoundry before subscribing.",
    includes: [
      "12 ranked AI/developer video opportunities",
      "one ready-to-record script",
      "opportunities CSV",
      "quality-risk notes",
      "public sample files for quick review"
    ]
  },
  {
    sku: "trendfoundry-weekly-brief",
    name: "TrendFoundry Weekly Brief",
    priceUsd: 19,
    billing: "monthly",
    shortDescription: "Weekly source-backed creator intelligence for AI and developer video channels.",
    bestFor: "Creators who need a dependable weekly topic pipeline.",
    includes: [
      "weekly 12-item issue",
      "fresh GitHub, YouTube, Bilibili, HN, and arXiv source mix",
      "Bilibili and YouTube title angles",
      "hook and recording outline per item",
      "quality-risk notes"
    ]
  },
  {
    sku: "trendfoundry-custom-niche",
    name: "TrendFoundry Custom Niche",
    priceUsd: 49,
    billing: "monthly",
    shortDescription: "A narrower weekly brief tuned for one audience, topic lane, or technical vertical.",
    bestFor: "Teams focused on one narrow creator audience or technical vertical.",
    includes: [
      "custom source queries",
      "niche-specific ranking",
      "stricter quality filtering",
      "lead/outreach angle notes",
      "weekly buyer-ready brief"
    ]
  }
];

function longDescription(product) {
  return `${product.name}

${product.shortDescription}

Best for: ${product.bestFor}

Includes:
${product.includes.map((item) => `- ${item}`).join("\n")}

Delivery: Markdown brief, ready-to-record script, opportunities CSV, and public sample files by email or agreed delivery route.

Sample: ${sampleUrl}

Important: TrendFoundry is a creator planning aid. It does not promise views, subscribers, revenue, or platform growth.`;
}

function platformFields(product) {
  return {
    sku: product.sku,
    title: product.name,
    price_usd: product.priceUsd,
    billing: product.billing,
    short_description: product.shortDescription,
    long_description: longDescription(product),
    fulfillment: `Deliver ${deliverables.join(", ")} from the latest TrendFoundry pack.`,
    refund_policy: "If the first paid issue does not include at least three recordable ideas for the buyer's channel, email within 7 days for a refund.",
    tags: "AI tools, creator economy, YouTube, Bilibili, GitHub, video ideas, creator workflow",
    product_url: productUrl,
    public_sample_url: sampleUrl,
    request_form_url: issueFormUrl,
    support_email: contactEmail
  };
}

function manualInvoice(product) {
  return `# Manual Invoice Draft: ${product.name}

Buyer:
Contact:
Channel:

Item: ${product.name}
Price: USD ${product.priceUsd}${product.billing === "monthly" ? " / month" : ""}

Delivery:
${deliverables.map((file) => `- ${file}`).join("\n")}

Terms:
- This is a creator planning aid, not a guarantee of views, subscribers, revenue, or platform growth.
- Do not send payment card details by email.
- Refund policy: if the first paid issue does not include at least three recordable ideas for the buyer's channel, email within 7 days for a refund.

Public sample: ${sampleUrl}
Support: ${contactEmail}
`;
}

function markdownCatalog(rows) {
  return `# TrendFoundry Commerce Listings

Use these fields for payment platforms or manual invoice setup. Review platform-specific requirements before publishing.

${rows
  .map(
    (row) => `## ${row.title}

- SKU: ${row.sku}
- Price: USD ${row.price_usd}${row.billing === "monthly" ? "/month" : ""}
- Billing: ${row.billing}
- Product URL: ${row.product_url}
- Public sample: ${row.public_sample_url}

### Short Description

${row.short_description}

### Long Description

${row.long_description}
`
  )
  .join("\n")}
`;
}

await mkdir(commerceDir, { recursive: true });
const rows = products.map(platformFields);
await writeFile(path.join(commerceDir, "products.json"), JSON.stringify({ generatedAt: new Date().toISOString(), products: rows }, null, 2), "utf8");
await writeFile(
  path.join(commerceDir, "products.csv"),
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
    "public_sample_url",
    "request_form_url",
    "support_email"
  ]),
  "utf8"
);
await writeFile(path.join(commerceDir, "platform-listings.md"), markdownCatalog(rows), "utf8");
await writeFile(path.join(commerceDir, "manual-invoices.md"), products.map(manualInvoice).join("\n---\n"), "utf8");

console.log(`Exported ${products.length} commerce listings to ${commerceDir}`);
