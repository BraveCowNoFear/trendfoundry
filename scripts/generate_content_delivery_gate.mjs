import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const outDir = path.join(root, "dist", "content-delivery-gate");
const packDir = path.join(root, "dist", "buyer-content-pack");
const expectedDeliverables = [
  "START-HERE.md",
  "full-episode-script.md",
  "episode-workbench.md",
  "content-evidence-pack.md",
  "content-editorial-audit.md"
];

function compact(value, fallback = "") {
  return String(value || fallback).replace(/\s+/g, " ").trim() || fallback;
}

async function readTextMaybe(file) {
  try {
    return await readFile(file, "utf8");
  } catch {
    return "";
  }
}

async function readJsonMaybe(file, fallback = {}) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows, columns) {
  return [columns.join(","), ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))].join("\n");
}

function tokenHits(text) {
  const hits = [];
  const tokens = [
    "\uFFFD",
    "\u9225",
    "\u9286",
    "\u9365",
    "\u7459\u55DB",
    "\u5BB8\u30E4",
    "\u7D94",
    "\u5A34",
    "\u6A5D",
    "\u9428",
    "\u52EB",
    "\u701B",
    "\u6A9A"
  ];
  for (const token of tokens) {
    const count = text.split(token).length - 1;
    if (count > 0) hits.push(`${token === "\uFFFD" ? "replacement-char" : `U+${token.codePointAt(0).toString(16).toUpperCase()}`}:${count}`);
  }
  const denseQuestionMarks = text.match(/\?{3,}/g) || [];
  if (denseQuestionMarks.length) hits.push(`dense-question-marks:${denseQuestionMarks.length}`);
  return hits;
}

function dangerousPromiseHits(text) {
  const patterns = [
    /\b(guarantee|guaranteed|promise|ensure|will get|will deliver)\b.{0,50}\b(views|subscribers|revenue|income|growth|sales|customers)\b/gi,
    /\b(views|subscribers|revenue|income|growth|sales|customers)\b.{0,50}\b(guarantee|guaranteed|promise|promised)\b/gi
  ];
  const hits = [];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const start = Math.max(0, match.index - 48);
      const end = Math.min(text.length, match.index + match[0].length + 48);
      const context = compact(text.slice(start, end)).slice(0, 220);
      if (/\b(no|not|never|without)\b.{0,60}\b(guarantee|guaranteed|promise|promised|ensure|views|subscribers|revenue|income|growth|sales|customers)\b/i.test(context)) continue;
      if (/\b(does not|do not|doesn't|don't|is not|not a)\b.{0,80}\b(guarantee|guaranteed|promise|promised|ensure|views|subscribers|revenue|income|growth|sales|customers)\b/i.test(context)) continue;
      hits.push(compact(match[0]).slice(0, 160));
    }
  }
  return hits;
}

function sensitiveRequestHits(text) {
  const patterns = [
    /\b(send|share|provide|email|submit)\b.{0,40}\b(password|card number|credit card|private key|seed phrase|wallet seed|2fa|passport|ssn|social security)\b/gi,
    /\b(password|card number|credit card|private key|seed phrase|wallet seed|2fa|passport|ssn|social security)\b.{0,40}\b(send|share|provide|email|submit)\b/gi
  ];
  return patterns.flatMap((pattern) => [...text.matchAll(pattern)].map((match) => compact(match[0]).slice(0, 160)));
}

function wordCount(text) {
  return compact(text).split(/\s+/).filter(Boolean).length;
}

function row(status, check, file, detail) {
  return { status, check, file, detail };
}

const generatedAt = new Date().toISOString();
const manifestPath = path.join(packDir, "manifest.json");
const manifest = await readJsonMaybe(manifestPath, {});
const buyerDeliverables = manifest.buyerDeliverables || [];
const checks = [];

checks.push(row(buyerDeliverables.length === expectedDeliverables.length ? "pass" : "fail", "deliverable_count", "manifest.json", `expected=${expectedDeliverables.length}; actual=${buyerDeliverables.length}`));
checks.push(row(buyerDeliverables.length <= 5 ? "pass" : "fail", "concise_deliverable_count", "manifest.json", `max=5; actual=${buyerDeliverables.length}`));
checks.push(row(buyerDeliverables[0] === "START-HERE.md" ? "pass" : "fail", "start_here_first", "manifest.json", `first=${buyerDeliverables[0] || "missing"}`));
for (const file of expectedDeliverables) {
  checks.push(row(buyerDeliverables.includes(file) ? "pass" : "fail", "expected_deliverable_manifest", "manifest.json", file));
}

for (const file of buyerDeliverables) {
  const filePath = path.join(packDir, file);
  const text = await readTextMaybe(filePath);
  checks.push(row(text ? "pass" : "fail", "deliverable_file_exists", file, text ? `${Buffer.byteLength(text, "utf8")} bytes` : "missing or empty"));
  const words = wordCount(text);
  if (file === "START-HERE.md") {
    checks.push(row(words > 0 && words <= 220 ? "pass" : "fail", "start_here_short", file, `words=${words}; max=220`));
    checks.push(row(/TL;DR/i.test(text) ? "pass" : "fail", "start_here_has_tldr", file, "requires TL;DR"));
    checks.push(row(/Next Action/i.test(text) ? "pass" : "fail", "start_here_has_next_action", file, "requires Next Action"));
  } else {
    checks.push(row(words <= 2600 ? "pass" : "fail", "reference_file_length", file, `words=${words}; max=2600`));
  }

  const mojibake = tokenHits(text);
  checks.push(row(mojibake.length ? "fail" : "pass", "no_mojibake_markers", file, mojibake.join("; ") || "clean"));

  const sellerOnlyHits = ["prospects.csv", "outreach-board.md", "data/latest.json", "data/raw/", "data/leads.json", "docs/lead-pipeline.md", "docs/lead-replies.md"]
    .filter((token) => text.includes(token));
  checks.push(row(sellerOnlyHits.length ? "fail" : "pass", "no_seller_only_references", file, sellerOnlyHits.join("; ") || "clean"));

  const promises = dangerousPromiseHits(text);
  checks.push(row(promises.length ? "fail" : "pass", "no_outcome_guarantees", file, promises.join(" | ") || "clean"));

  const sensitive = sensitiveRequestHits(text);
  checks.push(row(sensitive.length ? "fail" : "pass", "no_sensitive_data_requests", file, sensitive.join(" | ") || "clean"));
}

const sellerOnlyDeliverables = buyerDeliverables.filter((file) => (manifest.sellerOnlyExcluded || []).includes(file));
checks.push(row(sellerOnlyDeliverables.length ? "fail" : "pass", "manifest_excludes_seller_only_deliverables", "manifest.json", sellerOnlyDeliverables.join("; ") || "clean"));
checks.push(row(manifest.safety?.noRevenuePromise === true ? "pass" : "fail", "manifest_no_revenue_promise", "manifest.json", String(manifest.safety?.noRevenuePromise)));
checks.push(row(manifest.safety?.noViewPromise === true ? "pass" : "fail", "manifest_no_view_promise", "manifest.json", String(manifest.safety?.noViewPromise)));
checks.push(row(manifest.safety?.noCredentialRequest === true ? "pass" : "fail", "manifest_no_credential_request", "manifest.json", String(manifest.safety?.noCredentialRequest)));
checks.push(row(manifest.safety?.manualPaymentConfirmationRequired === true ? "pass" : "fail", "manifest_manual_payment_confirmation", "manifest.json", String(manifest.safety?.manualPaymentConfirmationRequired)));

const failed = checks.filter((check) => check.status === "fail");
const manifestOut = {
  generatedAt,
  buyerDeliverableCount: buyerDeliverables.length,
  expectedDeliverableCount: expectedDeliverables.length,
  checkCount: checks.length,
  failedCount: failed.length,
  passedCount: checks.length - failed.length,
  buyerDeliverables,
  safety: {
    sendsMessages: false,
    collectsPayment: false,
    uploadsFiles: false,
    buildsFrontend: false,
    blocksSellerOnlyLeakage: true,
    blocksSensitiveDataRequests: true,
    blocksOutcomeGuarantees: true
  }
};

const markdown = `# TrendFoundry Content Delivery Gate

Generated: ${generatedAt}

This gate checks the buyer content pack before paid delivery. It verifies START-HERE plus the four reference files, seller-only boundaries, sensitive-data wording, outcome guarantees, concise first-read guidance, and mojibake markers. It does not send messages, collect payment, upload files, or build the frontend.

## Summary

- Buyer deliverables: ${buyerDeliverables.join(", ") || "unknown"}
- Expected deliverables: ${expectedDeliverables.join(", ")}
- Checks: ${checks.length}
- Passed: ${checks.length - failed.length}
- Failed: ${failed.length}

## Checks

| Status | Check | File | Detail |
| --- | --- | --- | --- |
${checks.map((check) => `| ${check.status} | ${check.check} | ${check.file} | ${check.detail.replace(/\|/g, "/")} |`).join("\n")}

## Safety Boundary

- Does not send messages.
- Does not collect payment.
- Does not upload files.
- Does not build or overwrite the frontend.
- Blocks seller-only file references in buyer deliverables.
- Blocks sensitive payment/account data requests in buyer deliverables.
- Blocks view, subscriber, revenue, growth, sales, or customer outcome guarantees.
- Requires a short START-HERE.md with TL;DR and next action so buyer delivery stays easy to understand.
`;

await mkdir(docsDir, { recursive: true });
await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifestOut, null, 2), "utf8");
await writeFile(path.join(outDir, "checks.csv"), toCsv(checks, ["status", "check", "file", "detail"]), "utf8");
await writeFile(path.join(docsDir, "content-delivery-gate.md"), markdown, "utf8");

if (failed.length) {
  console.error(`Content delivery gate failed: ${failed.length} failed check(s).`);
  process.exit(1);
}

console.log(`Wrote ${path.join(docsDir, "content-delivery-gate.md")}`);
console.log(`Content delivery gate checks: ${checks.length}, failed: 0.`);
