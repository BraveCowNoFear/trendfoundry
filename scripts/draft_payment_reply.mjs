import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { contactEmail, deliverables, sellerOnlyFiles, slug } from "./lib/fulfillment.mjs";

const root = process.cwd();
const outRoot = path.join(root, "dist", "payment-replies");
const sampleUrlEn = "https://bravecownofear.github.io/trendfoundry/public-sample.en.md";
const sampleUrlZh = "https://bravecownofear.github.io/trendfoundry/public-sample.zh-CN.md";

const products = [
  {
    tier: "sample-issue",
    sku: "trendfoundry-sample-issue",
    name: "TrendFoundry Sample Issue",
    priceUsd: 9,
    billing: "one-time",
    deliveryWindow: "within 24 hours after payment confirmation"
  },
  {
    tier: "weekly-brief",
    sku: "trendfoundry-weekly-brief",
    name: "TrendFoundry Weekly Brief",
    priceUsd: 19,
    billing: "monthly",
    deliveryWindow: "first issue within 24 hours after payment confirmation, then weekly"
  },
  {
    tier: "custom-niche",
    sku: "trendfoundry-custom-niche",
    name: "TrendFoundry Custom Niche",
    priceUsd: 49,
    billing: "monthly",
    deliveryWindow: "first niche issue within 48 hours after payment confirmation"
  }
];

function argValue(name, fallback = "") {
  const prefix = `--${name}=`;
  const arg = process.argv.slice(2).find((value) => value.startsWith(prefix));
  const envName = name.toUpperCase().replace(/-/g, "_");
  return arg ? arg.slice(prefix.length) : process.env[envName] || fallback;
}

function findProduct(value) {
  const normalized = slug(value || "sample-issue");
  return (
    products.find((product) => product.tier === normalized || product.sku === normalized || slug(product.name) === normalized) ||
    products[0]
  );
}

function money(product) {
  return `USD ${product.priceUsd}${product.billing === "monthly" ? " / month" : ""}`;
}

function markdownList(items) {
  return items.map((item) => `- ${item}`).join("\n");
}

const product = findProduct(argValue("tier", "sample-issue"));
const buyerName = argValue("buyer", "Buyer");
const buyerContact = argValue("contact", "buyer@example.com");
const channel = argValue("channel", "not provided");
const niche = argValue("niche", "not provided");
const deliveryRoute = argValue("delivery-route", "email");
const paymentMethod = argValue("payment-method", "verified hosted checkout link or manual invoice");
const paymentReference = argValue("payment-reference", "TBD-after-review");
const orderId = argValue("order-id", `${new Date().toISOString().slice(0, 10)}-${slug(buyerName)}-${product.tier}`);
const outDir = path.join(outRoot, orderId);

const paymentReply = `# TrendFoundry Payment Reply Draft

To: ${buyerContact}
Subject: TrendFoundry payment and delivery - ${product.name}

Hi ${buyerName},

Thanks for ordering ${product.name} for ${channel}.

Order summary:

- Product: ${product.name}
- SKU: ${product.sku}
- Price: ${money(product)}
- Billing: ${product.billing}
- Channel: ${channel}
- Niche preference: ${niche}
- Preferred delivery route: ${deliveryRoute}
- Delivery window: ${product.deliveryWindow}

Payment step:

- Payment method to use: ${paymentMethod}
- Payment reference or link to insert after review: ${paymentReference}
- Please do not send card numbers, private IDs, passwords, wallet seeds, or payment credentials by email or in a public GitHub issue.

After payment is confirmed, the delivery pack will include:

${markdownList(deliverables)}

The core value is the daily brief, one 6-8 minute scene-by-scene ready-to-record script, and the opportunities CSV. TrendFoundry is a creator planning aid. It does not promise views, subscribers, revenue, or platform growth.

Public samples for format review:

- English: ${sampleUrlEn}
- Chinese: ${sampleUrlZh}

Best,
TrendFoundry
${contactEmail}
`;

const invoiceDraft = `# Manual Invoice Draft

Invoice ID: ${orderId}
Seller: TrendFoundry
Support email: ${contactEmail}

Buyer:

- Name: ${buyerName}
- Contact: ${buyerContact}
- Channel: ${channel}

Line item:

- ${product.name}
- SKU: ${product.sku}
- Amount: ${money(product)}
- Billing: ${product.billing}
- Delivery: ${product.deliveryWindow}

Payment instructions:

- Insert a verified hosted checkout link, payment link, or manual invoice reference after review.
- Do not ask the buyer to send payment card details, private IDs, passwords, wallet seeds, or payment credentials in email.
- No payment action was attempted by this script.

Refund note:

If the first paid issue does not include at least three recordable ideas for the buyer's channel, the buyer can email within 7 days for a refund review.
`;

const checklist = `# Payment Reply Checklist

- [ ] Buyer contact checked: ${buyerContact}
- [ ] Product/tier checked: ${product.name}
- [ ] Amount checked: ${money(product)}
- [ ] Hosted checkout link or invoice reference inserted only after review.
- [ ] No card numbers, private IDs, passwords, wallet seeds, or payment credentials requested by email.
- [ ] Seller-only files are not attached: ${sellerOnlyFiles.join(", ")}
- [ ] Reply avoids promises about views, subscribers, revenue, or platform growth.
- [ ] After payment confirmation, run fulfillment for the same buyer and tier.

Suggested fulfillment command:

\`\`\`bash
npm run fulfill -- --buyer="${buyerName}" --contact="${buyerContact}" --channel="${channel}" --type="${product.tier}" --order-id="${orderId}"
\`\`\`
`;

const manifest = {
  generatedAt: new Date().toISOString(),
  orderId,
  product,
  buyer: {
    name: buyerName,
    contact: buyerContact,
    channel,
    niche,
    deliveryRoute
  },
  files: ["payment-reply.md", "invoice-draft.md", "payment-checklist.md", "manifest.json"],
  buyerDeliverablesAfterPayment: deliverables,
  excludedSellerOnlyFiles: sellerOnlyFiles,
  safety: [
    "No payment action was attempted.",
    "No message was sent.",
    "Do not request card numbers, private IDs, passwords, wallet seeds, or payment credentials by email or public issue.",
    "Do not promise views, subscribers, revenue, or platform growth."
  ]
};

await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, "payment-reply.md"), paymentReply, "utf8");
await writeFile(path.join(outDir, "invoice-draft.md"), invoiceDraft, "utf8");
await writeFile(path.join(outDir, "payment-checklist.md"), checklist, "utf8");
await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

console.log(`Wrote payment reply draft to ${outDir}`);
