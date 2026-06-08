import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { argValue } from "./lib/fulfillment.mjs";

const root = process.cwd();
const outDir = path.join(root, "dist", "content-outreach-sends");

function compact(value, fallback = "") {
  return String(value || fallback).replace(/\s+/g, " ").trim() || fallback;
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

function safeFileName(value, fallback = "outreach-send") {
  return compact(value, fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100) || fallback;
}

async function assertFile(file) {
  await access(file);
  return path.relative(root, file).replace(/\\/g, "/");
}

const reviewId = compact(argValue("review-id", ""));
if (!reviewId) {
  console.error("Missing required --review-id from dist/content-outreach-review/review-board.csv.");
  process.exit(1);
}

const reviewBoardFile = path.join(root, "dist", "content-outreach-review", "review-board.csv");
const rows = parseCsv(await readFile(reviewBoardFile, "utf8"));
const row = rows.find((item) => compact(item.review_id) === reviewId);
if (!row) {
  console.error(`Review ID not found: ${reviewId}`);
  process.exit(1);
}

const packFile = path.join(root, "dist", "content-outreach-review", "send-packs", `${reviewId}.md`);
await assertFile(packFile);

const sentAt = compact(argValue("sent-at", ""), new Date().toISOString());
const nextDue = compact(argValue("next-due", ""), compact(row.follow_up_date));
const notes = compact(argValue("notes", ""), `Reviewed send pack ${reviewId} was sent manually; waiting for reply.`);
const statusResult = spawnSync(process.execPath, [
  path.join(root, "scripts", "update_content_sale_status.mjs"),
  `--source=${compact(row.source)}`,
  `--creator=${compact(row.creator)}`,
  "--stage=sent_waiting_reply",
  `--next-due=${nextDue}`,
  `--notes=${notes}`
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

const receipt = {
  generatedAt: new Date().toISOString(),
  review_id: reviewId,
  creator: compact(row.creator),
  source: compact(row.source),
  topic: compact(row.topic),
  proof_url: compact(row.proof_url),
  offer_sku: compact(row.offer_sku),
  sent_at: sentAt,
  next_due: nextDue,
  stage: "sent_waiting_reply",
  reviewed_pack_file: path.relative(root, packFile).replace(/\\/g, "/"),
  statusRecorder: statusManifest,
  safety: {
    sendsMessages: false,
    postsContent: false,
    collectsPayment: false,
    recordsManualSendOnly: true,
    noRevenuePromise: true,
    noViewPromise: true
  }
};

const receiptName = `${safeFileName(reviewId)}.json`;
const markdown = `# TrendFoundry Content Outreach Send Receipt

Generated: ${receipt.generatedAt}

Private local receipt. Do not publish.

- Review ID: ${receipt.review_id}
- Creator: ${receipt.creator}
- Source: ${receipt.source}
- Sent at: ${receipt.sent_at}
- Next due: ${receipt.next_due}
- Stage recorded: ${receipt.stage}
- Reviewed pack: ${receipt.reviewed_pack_file}

## Safety

- Does not send messages.
- Records only a manual send that already happened.
- Does not collect payment.
- Does not publish private prospect rows.
`;

await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, receiptName), JSON.stringify(receipt, null, 2), "utf8");
await writeFile(path.join(outDir, `${safeFileName(reviewId)}.md`), markdown, "utf8");
await writeFile(path.join(outDir, "latest.json"), JSON.stringify(receipt, null, 2), "utf8");

const logResult = spawnSync(process.execPath, [path.join(root, "scripts", "generate_content_outreach_send_log.mjs")], {
  cwd: root,
  encoding: "utf8",
  shell: false
});
if (logResult.status !== 0) {
  console.error(logResult.stdout || "");
  console.error(logResult.stderr || "");
  process.exit(logResult.status || 1);
}

console.log(JSON.stringify({
  review_id: reviewId,
  stage: receipt.stage,
  next_due: nextDue,
  receipt: path.relative(root, path.join(outDir, receiptName)).replace(/\\/g, "/"),
  safety: receipt.safety
}, null, 2));
