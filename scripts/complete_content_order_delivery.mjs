import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { argValue } from "./lib/fulfillment.mjs";

const root = process.cwd();
const expectedDeliverables = [
  "full-episode-script.md",
  "episode-workbench.md",
  "content-evidence-pack.md",
  "content-editorial-audit.md"
];

function compact(value, fallback = "") {
  return String(value || fallback).replace(/\s+/g, " ").trim() || fallback;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function assertFile(file) {
  await access(file);
  return path.relative(root, file).replace(/\\/g, "/");
}

function resolveOrderDir(orderArg) {
  if (!orderArg) {
    console.error("Missing required --order=dist/content-orders/<order-id>.");
    process.exit(1);
  }
  const absolute = path.resolve(root, orderArg);
  const allowedRoot = path.resolve(root, "dist", "content-orders");
  if (!(absolute === allowedRoot || absolute.startsWith(`${allowedRoot}${path.sep}`))) {
    console.error(`Order path is outside dist/content-orders: ${absolute}`);
    process.exit(1);
  }
  return absolute;
}

const orderDir = resolveOrderDir(argValue("order", ""));
const manifestPath = path.join(orderDir, "manifest.json");
const manifest = await readJson(manifestPath);
const orderId = compact(manifest.orderId, path.basename(orderDir));
const source = compact(argValue("source", ""), "manual");
const creator = compact(argValue("creator", ""), compact(manifest.buyer?.name, "buyer"));
const nextDue = compact(argValue("next-due", ""), addDays(new Date(), 7));
const notes = compact(argValue("notes", ""), `Content order ${orderId} delivered manually; waiting for feedback.`);
const summary = compact(argValue("summary", ""), "Content order delivered; waiting for feedback.");
const buyerDeliverables = manifest.buyerDeliverables || [];

for (const file of expectedDeliverables) {
  if (!buyerDeliverables.includes(file)) {
    console.error(`Order manifest missing buyer deliverable: ${file}`);
    process.exit(1);
  }
  await assertFile(path.join(orderDir, file));
}

const statusResult = spawnSync(process.execPath, [
  path.join(root, "scripts", "update_content_sale_status.mjs"),
  `--source=${source}`,
  `--creator=${creator}`,
  "--stage=fulfilled_waiting_feedback",
  `--next-due=${nextDue}`,
  `--notes=${notes}`,
  `--summary=${summary}`,
  "--reply-stage=fulfilled_waiting_feedback"
], {
  cwd: root,
  encoding: "utf8",
  shell: false
});

if (statusResult.status !== 0) {
  console.error(statusResult.stdout || "");
  console.error(statusResult.stderr || "");
  process.exit(statusResult.status || 1);
}

let statusManifest = {};
try {
  statusManifest = JSON.parse(statusResult.stdout);
} catch {
  statusManifest = { raw: statusResult.stdout };
}

const outDir = path.join(root, "dist", "content-order-completion");
const receipt = {
  generatedAt: new Date().toISOString(),
  orderId,
  orderDir: path.relative(root, orderDir).replace(/\\/g, "/"),
  source,
  creator,
  stage: "fulfilled_waiting_feedback",
  nextDue,
  buyerDeliverables,
  checkedFiles: [
    path.relative(root, manifestPath).replace(/\\/g, "/"),
    ...expectedDeliverables.map((file) => path.relative(root, path.join(orderDir, file)).replace(/\\/g, "/"))
  ],
  statusRecorder: statusManifest,
  safety: {
    sendsMessages: false,
    collectsPayment: false,
    uploadsFiles: false,
    writesPrivateIgnoredCrmStateOnly: true,
    storesSensitivePaymentData: false,
    noRevenuePromise: true,
    noViewPromise: true
  }
};

const markdown = `# TrendFoundry Content Order Completion

Generated: ${receipt.generatedAt}

Private local receipt. Do not publish.

- Order: ${receipt.orderId}
- Stage recorded: ${receipt.stage}
- Next due: ${receipt.nextDue}
- Buyer deliverables checked: ${receipt.buyerDeliverables.join(", ")}
- CRM state file(s): ${(statusManifest.files || []).join(", ") || "unknown"}

## Safety

- Does not send messages.
- Does not collect payment.
- Does not upload files.
- Writes ignored local CRM state only.
- Does not store sensitive payment or account data.
`;

await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, `${orderId}.json`), JSON.stringify(receipt, null, 2), "utf8");
await writeFile(path.join(outDir, `${orderId}.md`), markdown, "utf8");
await writeFile(path.join(outDir, "latest.json"), JSON.stringify(receipt, null, 2), "utf8");

console.log(JSON.stringify({
  orderId,
  stage: receipt.stage,
  nextDue,
  checkedDeliverables: buyerDeliverables.length,
  completionReceipt: path.relative(root, path.join(outDir, `${orderId}.json`)).replace(/\\/g, "/"),
  safety: receipt.safety
}, null, 2));
