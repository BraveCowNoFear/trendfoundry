import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const outDir = path.join(root, "dist", "content-subscription-due");
const queueFile = path.join(root, "dist", "content-subscription-crm", "due-queue.csv");

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

async function readTextMaybe(file) {
  try {
    return await readFile(file, "utf8");
  } catch {
    return "";
  }
}

function runFulfillment(row) {
  const orderId = `${compact(row.delivery_date, new Date().toISOString().slice(0, 10))}-${compact(row.subscriber_id, "subscriber")}-week-${compact(row.week, "1")}`;
  const orderDir = path.join(root, "dist", "content-subscriptions", orderId);
  if (existsSync(path.join(orderDir, "manifest.json"))) {
    return {
      subscriber_id: compact(row.subscriber_id),
      order_id: orderId,
      week: compact(row.week),
      delivery_date: compact(row.delivery_date),
      status: "already_prepared",
      exit_code: 0,
      order_dir: orderDir,
      stdout: "",
      stderr: ""
    };
  }
  const args = [
    path.join(root, "scripts", "fulfill_content_subscription.mjs"),
    `--subscriber=${compact(row.name, row.subscriber_id)}`,
    `--contact=${compact(row.contact, "not-provided")}`,
    `--channel=${compact(row.channel, "not-provided")}`,
    `--week=${compact(row.week, "1")}`,
    `--payment-ref=${compact(row.payment_ref, "not-provided")}`,
    `--order-id=${orderId}`
  ];
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: "utf8",
    shell: false
  });
  return {
    subscriber_id: compact(row.subscriber_id),
    order_id: orderId,
    week: compact(row.week),
    delivery_date: compact(row.delivery_date),
    status: result.status === 0 ? "prepared" : "failed",
    exit_code: result.status,
    order_dir: orderDir,
    stdout: result.stdout || "",
    stderr: result.stderr || ""
  };
}

function publicDoc({ generatedAt, queueCount, readyCount, preparedCount, alreadyPreparedCount, failedCount }) {
  return `# TrendFoundry Content Subscription Due Fulfillment

Generated: ${generatedAt}

This content-only batch step prepares weekly subscription delivery directories for subscriber rows that the private CRM marked as \`prepare_delivery\`. It writes private order details under ignored \`dist/\` paths and does not expose subscriber contacts in tracked docs.

## Current Counts

- Queue rows reviewed: ${queueCount}
- Ready rows: ${readyCount}
- Prepared deliveries: ${preparedCount}
- Already prepared deliveries: ${alreadyPreparedCount}
- Failed deliveries: ${failedCount}

## Operator Flow

1. Run \`npm run content-subscription\`.
2. Run \`npm run content-subscription-crm\`.
3. Run \`npm run content-subscription-due\`.
4. Review ignored \`dist/content-subscription-due/prepared.csv\`.
5. Review each generated \`dist/content-subscriptions/<order-id>/weekly-proof-pack.md\` and \`subscriber-email.md\`.
6. After sending, run \`npm run complete-content-subscription-delivery -- --order="dist/content-subscriptions/<order-id>"\`.

## Safety Boundary

- Does not send messages.
- Does not collect payment.
- Does not upload files.
- Does not build or overwrite the frontend.
- Uses only rows already marked \`prepare_delivery\` by the private CRM.
- Does not expose private subscriber rows in tracked docs.
- Does not promise views, subscribers, revenue, platform growth, or buyer outcomes.
`;
}

const generatedAt = new Date().toISOString();
const queueRows = parseCsv(await readTextMaybe(queueFile));
const readyRows = queueRows.filter((row) => compact(row.action) === "prepare_delivery");
const preparedRows = readyRows.map(runFulfillment);
const failedRows = preparedRows.filter((row) => row.status === "failed");
const alreadyPreparedRows = preparedRows.filter((row) => row.status === "already_prepared");
const manifest = {
  generatedAt,
  queueFile: path.relative(root, queueFile).replace(/\\/g, "/"),
  queueCount: queueRows.length,
  readyCount: readyRows.length,
  preparedCount: preparedRows.filter((row) => row.status === "prepared").length,
  alreadyPreparedCount: alreadyPreparedRows.length,
  failedCount: failedRows.length,
  buyerDeliverables: ["weekly-proof-pack.md", "subscriber-email.md"],
  safety: {
    sendsMessages: false,
    collectsPayment: false,
    uploadsFiles: false,
    buildsFrontend: false,
    exposesPrivateSubscribersInDocs: false,
    requiresPrivateCrmPrepareDeliveryAction: true,
    noRevenuePromise: true,
    noViewPromise: true,
    noCredentialRequest: true
  },
  preparedRows
};

await mkdir(docsDir, { recursive: true });
await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
await writeFile(path.join(outDir, "prepared.csv"), toCsv(preparedRows, ["subscriber_id", "order_id", "week", "delivery_date", "status", "exit_code", "order_dir"]), "utf8");
await writeFile(path.join(outDir, "prepared.md"), preparedRows.length
  ? preparedRows.map((row) => `- ${row.status}: ${row.order_id} week ${row.week} (${row.delivery_date})`).join("\n")
  : "No due subscription deliveries were prepared today.\n", "utf8");
await writeFile(path.join(docsDir, "content-subscription-due.md"), publicDoc({
  generatedAt,
  queueCount: queueRows.length,
  readyCount: readyRows.length,
  preparedCount: manifest.preparedCount,
  alreadyPreparedCount: manifest.alreadyPreparedCount,
  failedCount: manifest.failedCount
}), "utf8");

if (manifest.failedCount) {
  console.error(`Due subscription fulfillment failed for ${failedRows.length} row(s).`);
  process.exit(1);
}

console.log(`Wrote ${path.join(docsDir, "content-subscription-due.md")}`);
console.log(`Prepared subscription deliveries: ${manifest.preparedCount}`);
console.log(`Already prepared subscription deliveries: ${manifest.alreadyPreparedCount}`);
