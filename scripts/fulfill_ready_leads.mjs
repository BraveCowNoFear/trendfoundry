import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { prepareOrder, slug } from "./lib/fulfillment.mjs";

const root = process.cwd();
const leadsFile = path.join(root, "data", "leads.json");
const reportDir = path.join(root, "dist", "lead-fulfillment");
const includeQualified = process.argv.includes("--include-qualified");

function safeLine(value, fallback = "not-provided") {
  return String(value || fallback).replace(/\r?\n/g, " ").trim();
}

function paidOrApproved(lead) {
  if (lead.stage === "paid") return true;
  if (includeQualified && lead.stage === "qualified") return true;
  return false;
}

function orderTypeFor(lead) {
  const pack = String(lead.packType || "").toLowerCase();
  if (pack.includes("49")) return "custom-niche";
  if (pack.includes("19")) return "weekly-brief";
  return "sample-issue";
}

function leadOrderId(lead) {
  return `issue-${lead.issueNumber}-${slug(lead.requester || lead.creatorChannel || "lead")}`;
}

function markdownReport(rows, skipped, generatedAt) {
  const readyRows = rows.map((row) => `| #${row.issueNumber} | ${row.stage} | ${row.buyerName} | ${row.buyerContact} | ${row.channel} | ${row.orderId} | ${row.orderDir} |`);
  const skippedRows = skipped.map((lead) => `| #${lead.issueNumber} | ${lead.stage} | ${safeLine(lead.creatorChannel)} | ${safeLine(lead.nextAction)} |`);
  return `# TrendFoundry Lead Fulfillment Report

Generated: ${generatedAt}

Only local directories were created. No messages were sent and no files were uploaded.

Eligible stages: ${includeQualified ? "`paid`, `qualified`" : "`paid` only"}

## Prepared Orders

| Issue | Stage | Buyer | Contact | Channel | Order ID | Order Dir |
|---|---|---|---|---|---|---|
${readyRows.length ? readyRows.join("\n") : "| - | - | - | - | - | - | No ready leads. |"}

## Skipped Leads

| Issue | Stage | Channel | Next Action |
|---|---|---|---|
${skippedRows.length ? skippedRows.join("\n") : "| - | - | - | No skipped leads. |"}
`;
}

const leadsData = JSON.parse(await readFile(leadsFile, "utf8"));
const leads = leadsData.leads || [];
const ready = leads.filter(paidOrApproved);
const skipped = leads.filter((lead) => !paidOrApproved(lead));
const prepared = [];

for (const lead of ready) {
  const buyerName = safeLine(lead.requester || lead.creatorChannel, "buyer");
  const buyerContact = safeLine(lead.contact, "not-provided");
  const channel = safeLine(lead.creatorChannel, "not-provided");
  const orderType = orderTypeFor(lead);
  const orderId = leadOrderId(lead);
  const result = await prepareOrder({ root, buyerName, buyerContact, channel, orderType, orderId });
  prepared.push({
    issueNumber: lead.issueNumber,
    issueUrl: lead.issueUrl,
    stage: lead.stage,
    buyerName,
    buyerContact,
    channel,
    orderType,
    orderId,
    orderDir: result.orderDir
  });
}

await mkdir(reportDir, { recursive: true });
const generatedAt = new Date().toISOString();
await writeFile(
  path.join(reportDir, "ready-orders.json"),
  JSON.stringify({ generatedAt, includeQualified, prepared, skippedCount: skipped.length }, null, 2),
  "utf8"
);
await writeFile(path.join(reportDir, "ready-orders.md"), markdownReport(prepared, skipped, generatedAt), "utf8");

console.log(`Prepared ${prepared.length} ready lead orders.`);
console.log(`Skipped ${skipped.length} non-ready leads.`);
console.log(`Report: ${path.join(reportDir, "ready-orders.md")}`);
