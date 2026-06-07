import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const contactEmail = "rivan_Britain@outlook.com";

export const deliverables = [
  "daily-brief.md",
  "ready-to-record-script.md",
  "opportunities.csv",
  "public-sample.md",
  "public-sample.csv"
];

export const sellerOnlyFiles = [
  "prospects.csv",
  "outreach-board.md",
  "latest.json"
];

export function argValue(name, fallback = "") {
  const prefix = `--${name}=`;
  const arg = process.argv.slice(2).find((value) => value.startsWith(prefix));
  const envName = name.toUpperCase().replace(/-/g, "_");
  return arg ? arg.slice(prefix.length) : process.env[envName] || fallback;
}

export function slug(value) {
  return String(value || "manual-order")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "manual-order";
}

async function copyFirstAvailable(root, sourcePackDir, file, targetDir) {
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

export async function prepareOrder({
  root = process.cwd(),
  buyerName = "buyer",
  buyerContact = "not-provided",
  orderType = "sample-issue",
  channel = "not-provided",
  orderId = `${new Date().toISOString().slice(0, 10)}-${slug(buyerName)}-${slug(orderType)}`
} = {}) {
  const distDir = path.join(root, "dist");
  const sourcePackDir = path.join(distDir, "trendfoundry-sample-pack");
  const ordersDir = path.join(distDir, "orders");
  const orderDir = path.join(ordersDir, orderId);

  await mkdir(orderDir, { recursive: true });

  const copiedFrom = {};
  for (const file of deliverables) {
    copiedFrom[file] = await copyFirstAvailable(root, sourcePackDir, file, orderDir);
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
    excludedSellerOnlyFiles: sellerOnlyFiles,
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

  return {
    orderDir,
    manifest,
    files: [...deliverables, "manifest.json", "delivery-email.md", "fulfillment-checklist.md"]
  };
}
