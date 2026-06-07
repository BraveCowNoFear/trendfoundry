import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const distDir = path.join(root, "dist");
const sourcePackDir = path.join(distDir, "trendfoundry-sample-pack");
const ordersDir = path.join(distDir, "orders");
const contactEmail = "rivan_Britain@outlook.com";

function argValue(name, fallback = "") {
  const prefix = `--${name}=`;
  const arg = process.argv.slice(2).find((value) => value.startsWith(prefix));
  const envName = name.toUpperCase().replace(/-/g, "_");
  return arg ? arg.slice(prefix.length) : process.env[envName] || fallback;
}

function slug(value) {
  return String(value || "manual-order")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "manual-order";
}

async function copyFirstAvailable(file, targetDir) {
  const candidates = [
    path.join(sourcePackDir, file),
    path.join(root, "site", file),
    path.join(root, "docs", file)
  ];
  let lastError;
  for (const candidate of candidates) {
    try {
      await cp(candidate, path.join(targetDir, file));
      return candidate;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

const buyerName = argValue("buyer", "buyer");
const buyerContact = argValue("contact", "not-provided");
const orderType = argValue("type", "sample-issue");
const channel = argValue("channel", "not-provided");
const orderId = argValue("order-id", `${new Date().toISOString().slice(0, 10)}-${slug(buyerName)}-${slug(orderType)}`);
const orderDir = path.join(ordersDir, orderId);

const deliverables = [
  "daily-brief.md",
  "ready-to-record-script.md",
  "opportunities.csv",
  "public-sample.md",
  "public-sample.csv"
];

await mkdir(orderDir, { recursive: true });

const copiedFrom = {};
for (const file of deliverables) {
  copiedFrom[file] = await copyFirstAvailable(file, orderDir);
}

const sourceManifest = await readJson(path.join(sourcePackDir, "manifest.json"));
const manifest = {
  product: "TrendFoundry",
  orderId,
  generatedAt: new Date().toISOString(),
  buyer: {
    name: buyerName,
    contact: buyerContact,
    channel,
    orderType
  },
  sourceSnapshot: sourceManifest.sourceSnapshot,
  files: deliverables,
  copiedFrom,
  excludedSellerOnlyFiles: [
    "prospects.csv",
    "outreach-board.md",
    "latest.json"
  ],
  reviewBeforeSending: [
    "Confirm buyer contact and payment status.",
    "Do not send prospects.csv or seller outreach notes to buyers.",
    "Do not promise views, revenue, or platform growth.",
    "Attach or link only the files listed in files."
  ]
};

const emailDraft = `# TrendFoundry Delivery Email

To: ${buyerContact}
Subject: Your TrendFoundry ${orderType} pack

Hi ${buyerName},

Thanks for ordering TrendFoundry for ${channel}.

Your delivery pack is ready. It includes:

- daily-brief.md
- ready-to-record-script.md
- opportunities.csv
- public-sample.md
- public-sample.csv

The brief includes source links, Bilibili/YouTube title angles, recording hooks, demo steps, quality-risk notes, and limitations. Please treat it as a creator planning aid, not a guarantee of views or revenue.

If you want the next issue to be more targeted, reply with the narrowest audience or topic lane you want optimized.

Best,
TrendFoundry
${contactEmail}
`;

const checklist = `# Fulfillment Checklist

- [ ] Payment or sample approval checked.
- [ ] Buyer contact is correct: ${buyerContact}
- [ ] Buyer channel/context is correct: ${channel}
- [ ] Seller-only files are not attached.
- [ ] Delivery email reviewed.
- [ ] GitHub issue or local lead stage updated after sending.

Order directory: ${orderDir}
`;

await writeFile(path.join(orderDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
await writeFile(path.join(orderDir, "delivery-email.md"), emailDraft, "utf8");
await writeFile(path.join(orderDir, "fulfillment-checklist.md"), checklist, "utf8");

console.log(`Fulfillment order prepared: ${orderDir}`);
console.log(`Files: ${manifest.files.join(", ")}, manifest.json, delivery-email.md, fulfillment-checklist.md`);
