import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { argValue, contactEmail, slug } from "./lib/fulfillment.mjs";

const root = process.cwd();

function compact(value, fallback = "") {
  return String(value || fallback).replace(/\s+/g, " ").trim();
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

const buyerName = argValue("buyer", "buyer");
const buyerContact = argValue("contact", "not-provided");
const channel = argValue("channel", "not-provided");
const product = argValue("product", "trendfoundry-proof-script-pack");
const paymentRef = argValue("payment-ref", "not-provided");
const orderId = argValue("order-id", `${new Date().toISOString().slice(0, 10)}-${slug(buyerName)}-${slug(product)}`);

const sourceDir = path.join(root, "dist", "buyer-content-pack");
const ordersDir = path.join(root, "dist", "content-orders");
const orderDir = path.join(ordersDir, orderId);
const sourceManifest = await readJson(path.join(sourceDir, "manifest.json"));
const buyerDeliverables = sourceManifest.buyerDeliverables || [
  "full-episode-script.md",
  "episode-workbench.md",
  "content-evidence-pack.md",
  "content-editorial-audit.md"
];

const manifestPath = path.join(orderDir, "manifest.json");
if (existsSync(manifestPath)) {
  const existingManifest = await readJson(manifestPath);
  console.log(`Content fulfillment order already prepared: ${orderDir}`);
  console.log(`Status: already_prepared`);
  console.log(`Files: ${(existingManifest.buyerDeliverables || buyerDeliverables).join(", ")}, manifest.json, delivery-email.md, fulfillment-checklist.md`);
  process.exit(0);
}

await mkdir(orderDir, { recursive: true });

const copiedFrom = {};
for (const file of buyerDeliverables) {
  const source = path.join(sourceDir, file);
  const target = path.join(orderDir, file);
  await cp(source, target);
  copiedFrom[file] = source;
}

const manifest = {
  product: "TrendFoundry Proof-First Content Pack",
  orderId,
  generatedAt: new Date().toISOString(),
  buyer: {
    name: buyerName,
    contact: buyerContact,
    channel,
    product,
    paymentRef
  },
  primaryEpisode: sourceManifest.primaryEpisode,
  buyerDeliverables,
  copiedFrom,
  excludedSellerOnlyFiles: sourceManifest.sellerOnlyExcluded,
  safety: {
    sendsMessages: false,
    chargesBuyer: false,
    paymentExternallyConfirmed: paymentRef !== "not-provided",
    noRevenuePromise: true,
    noViewPromise: true,
    noCredentialRequest: true
  },
  reviewBeforeSending: [
    "Confirm payment externally before sending.",
    "Attach only buyerDeliverables plus delivery-email.md if needed.",
    "Do not attach manifest.json if it contains buyer contact details and the channel is public.",
    "Do not attach seller-only files, lead files, raw snapshots, account data, or sensitive payment data.",
    "Do not promise views, subscribers, revenue, platform growth, or buyer outcomes."
  ]
};

const emailDraft = `# TrendFoundry Content Pack Delivery Email

To: ${buyerContact}
Subject: Your TrendFoundry proof-first content pack

Hi ${buyerName},

Thanks for ordering ${product} for ${channel}.

Your proof-first content pack is ready. It includes:

${buyerDeliverables.map((file) => `- ${file}`).join("\n")}

Start with \`full-episode-script.md\` if you want one video to record now. Use \`episode-workbench.md\` if you want alternate ideas, \`content-evidence-pack.md\` if you want to verify claims before recording, and \`content-editorial-audit.md\` if you want the quality gate behind the choices.

Primary episode: ${compact(sourceManifest.primaryEpisode?.title, "current TrendFoundry proof episode")}
Proof asset: ${compact(sourceManifest.primaryEpisode?.proofAsset, "proof-first recording asset")}

Safety note: this is a creator planning and production aid. It does not promise views, subscribers, revenue, platform growth, or buyer outcomes.

Best,
TrendFoundry
${contactEmail}
`;

const checklist = `# Content Fulfillment Checklist

- [ ] External payment confirmation checked: ${paymentRef}
- [ ] Buyer contact is correct: ${buyerContact}
- [ ] Buyer channel/context is correct: ${channel}
- [ ] Only buyer deliverables are attached.
- [ ] Seller-only files are not attached.
- [ ] Delivery email reviewed.
- [ ] Local order stage updated after sending.

Order directory: ${orderDir}
`;

await writeFile(path.join(orderDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
await writeFile(path.join(orderDir, "delivery-email.md"), emailDraft, "utf8");
await writeFile(path.join(orderDir, "fulfillment-checklist.md"), checklist, "utf8");

console.log(`Content fulfillment order prepared: ${orderDir}`);
console.log(`Files: ${[...buyerDeliverables, "manifest.json", "delivery-email.md", "fulfillment-checklist.md"].join(", ")}`);
