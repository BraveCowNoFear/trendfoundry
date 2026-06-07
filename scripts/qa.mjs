import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { prepareOrder } from "./lib/fulfillment.mjs";

const root = process.cwd();
const qaDir = path.join(root, "dist", "qa");
const online = process.argv.includes("--online");
const skipScheduler = process.argv.includes("--skip-scheduler");
const publicBase = "https://bravecownofear.github.io/trendfoundry/";
const sellerOnly = ["prospects.csv", "outreach-board.md", "latest.json"];
const requiredScripts = [
  "daily",
  "operate",
  "commerce",
  "leads",
  "fulfill",
  "fulfill-ready",
  "draft-outreach",
  "ops-report",
  "social",
  "qa"
];

const checks = [];

function pass(name, detail = "") {
  checks.push({ name, status: "pass", detail });
}

function fail(name, detail = "") {
  checks.push({ name, status: "fail", detail });
}

function assertCheck(name, condition, detail = "") {
  if (condition) pass(name, detail);
  else fail(name, detail);
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function readText(file) {
  return readFile(file, "utf8");
}

function pngSize(file) {
  const buffer = existsSync(file) ? Buffer.from(requireFsRead(file)) : null;
  if (!buffer) return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20), bytes: buffer.length };
}

function requireFsRead(file) {
  return spawnSync(process.execPath, ["-e", `process.stdout.write(require('fs').readFileSync(${JSON.stringify(file)}))`], {
    encoding: "buffer",
    maxBuffer: 10 * 1024 * 1024
  }).stdout;
}

function schtasks(taskName) {
  if (process.platform !== "win32") return { skipped: true, output: "" };
  const result = spawnSync("schtasks", ["/Query", "/TN", taskName, "/V", "/FO", "LIST"], {
    cwd: root,
    encoding: "utf8"
  });
  return { status: result.status, output: result.stdout || result.stderr || "" };
}

async function checkLocal() {
  const pkg = await readJson(path.join(root, "package.json"));
  for (const script of requiredScripts) {
    assertCheck(`package script: ${script}`, Boolean(pkg.scripts?.[script]), pkg.scripts?.[script] || "missing");
  }

  const latest = await readJson(path.join(root, "data", "latest.json"));
  assertCheck("latest data item count", (latest.totalItems || 0) >= 50, String(latest.totalItems || 0));
  assertCheck("latest displayed source errors <= 3", (latest.errorCount || 0) <= 3, String(latest.errorCount || 0));

  const siteIndex = await readText(path.join(root, "site", "index.html"));
  assertCheck("site has email order CTA", siteIndex.includes("Email order"));
  assertCheck("site has GitHub request CTA", siteIndex.includes("Request on GitHub"));
  assertCheck("site has OG image metadata", siteIndex.includes('property="og:image"') && siteIndex.includes("og-image.png"));
  assertCheck("site has visual preview section", siteIndex.includes('class="visual-proof"'));
  assertCheck("site links ready-to-record script", siteIndex.includes("ready-to-record-script.md"));
  assertCheck("site renders 12 cards", (siteIndex.match(/<article class="card"/g) || []).length === 12);

  const og = pngSize(path.join(root, "site", "og-image.png"));
  assertCheck("og image is 1200x630", og?.width === 1200 && og?.height === 630, og ? `${og.width}x${og.height}, ${og.bytes} bytes` : "missing");

  const packManifest = await readJson(path.join(root, "dist", "trendfoundry-sample-pack", "manifest.json"));
  assertCheck("sample pack manifest classifies buyer deliverables", sellerOnly.every((file) => !(packManifest.buyerDeliverables || []).includes(file)));
  assertCheck("sample pack manifest classifies seller-only files", sellerOnly.every((file) => (packManifest.sellerOnlyFiles || []).includes(file)));

  const scriptText = `${await readText(path.join(root, "docs", "ready-to-record-script.md"))}\n${await readText(path.join(root, "site", "ready-to-record-script.md"))}`;
  assertCheck("ready script has scene-by-scene section", scriptText.includes("## Scene-By-Scene Script"));
  assertCheck("ready script has asset checklist", scriptText.includes("## Asset Checklist"));
  assertCheck("ready script has fact safety notes", scriptText.includes("## Fact Safety Notes"));

  const salesCopy = `${await readText(path.join(root, "docs", "sales-page-copy.md"))}\n${await readText(path.join(root, "site", "sales-page-copy.md"))}`;
  assertCheck("sales copy has no PDF promise", !/PDF or Markdown|PDF brief/.test(salesCopy));
  assertCheck("sales copy does not deliver prospects.csv", !/Delivery:[\s\S]{0,220}prospects\.csv/.test(salesCopy));

  const commerce = await readJson(path.join(root, "dist", "commerce", "products.json"));
  assertCheck("commerce has 3 products", commerce.products?.length === 3, String(commerce.products?.length || 0));
  assertCheck("commerce mentions scene-by-scene script", JSON.stringify(commerce).includes("scene-by-scene ready-to-record script"));
  const badCommerce = (commerce.products || []).filter((product) => sellerOnly.some((file) => String(product.fulfillment || "").includes(file)));
  assertCheck("commerce fulfillment excludes seller-only files", badCommerce.length === 0, badCommerce.map((product) => product.sku).join(", "));

  const tempOrderId = "qa-boundary-check";
  const temp = await prepareOrder({
    root,
    buyerName: "QA Boundary",
    buyerContact: "qa@example.com",
    channel: "https://example.com/qa",
    orderType: "sample-issue",
    orderId: tempOrderId
  });
  const orderFiles = await readdir(temp.orderDir);
  const forbidden = orderFiles.filter((file) => sellerOnly.includes(file));
  assertCheck("fulfillment temp order excludes seller-only files", forbidden.length === 0, forbidden.join(", "));
  const tempManifest = await readJson(path.join(temp.orderDir, "manifest.json"));
  assertCheck("fulfillment manifest lists primary buyer value", (tempManifest.primaryValue || []).some((item) => item.includes("scene-by-scene script")));
  const tempEmail = await readText(path.join(temp.orderDir, "delivery-email.md"));
  assertCheck("fulfillment email mentions scene-by-scene script", tempEmail.includes("scene-by-scene script"));
  await rm(temp.orderDir, { recursive: true, force: true });

  const opsReport = await readText(path.join(root, "dist", "ops-report", "ops-report.md"));
  assertCheck("ops report safety says no messages sent", opsReport.includes("No messages were sent."));
  assertCheck("ops report has commerce SKU count", /Commerce products:\s+3/.test(opsReport));
  assertCheck("ops report has QA gate summary", opsReport.includes("## QA Gate") && /Latest online QA:\s+\d+\/\d+ passed/.test(opsReport));

  if (skipScheduler) {
    pass("scheduled task checks skipped", "--skip-scheduler");
  } else {
    const dailyTask = schtasks("TrendFoundryDaily");
    if (dailyTask.skipped) {
      pass("scheduled task: TrendFoundryDaily skipped", "non-Windows");
    } else {
      assertCheck("scheduled task: TrendFoundryDaily ready/existing", dailyTask.status === 0, `status ${dailyTask.status}`);
      assertCheck("scheduled task: TrendFoundryDaily uses run_daily.ps1", dailyTask.output.includes("scripts\\run_daily.ps1"));
      assertCheck("scheduled task: TrendFoundryDaily last result 0", /Last Result:\s+0/.test(dailyTask.output));
    }

    const leadTask = schtasks("TrendFoundryLeadSync");
    if (leadTask.skipped) {
      pass("scheduled task: TrendFoundryLeadSync skipped", "non-Windows");
    } else {
      assertCheck("scheduled task: TrendFoundryLeadSync ready/existing", leadTask.status === 0, `status ${leadTask.status}`);
      assertCheck("scheduled task: TrendFoundryLeadSync uses run_leads.ps1", leadTask.output.includes("scripts\\run_leads.ps1"));
      assertCheck("scheduled task: TrendFoundryLeadSync last result 0", /Last Result:\s+0/.test(leadTask.output));
    }
  }
}

async function fetchText(url) {
  const response = await fetch(url, { cache: "no-store" });
  const text = await response.text();
  return { status: response.status, text };
}

async function fetchBytes(url) {
  const response = await fetch(url, { cache: "no-store" });
  const bytes = Buffer.from(await response.arrayBuffer());
  return { status: response.status, bytes };
}

async function checkOnline() {
  const index = await fetchText(`${publicBase}?qa=${Date.now()}`);
  assertCheck("online index HTTP 200", index.status === 200, String(index.status));
  assertCheck("online index has OG image", index.text.includes("og-image.png"));
  assertCheck("online index has email CTA", index.text.includes("Email order"));

  const sample = await fetchText(`${publicBase}public-sample.md?qa=${Date.now()}`);
  assertCheck("online public sample HTTP 200", sample.status === 200, String(sample.status));
  assertCheck("online public sample has UTF-8 hook", sample.text.includes("\u8fd9\u671f\u4e0d\u8bb2\u6982\u5ff5"));

  const readyScript = await fetchText(`${publicBase}ready-to-record-script.md?qa=${Date.now()}`);
  assertCheck("online ready script HTTP 200", readyScript.status === 200, String(readyScript.status));
  assertCheck("online ready script has scene-by-scene section", readyScript.text.includes("## Scene-By-Scene Script"));
  assertCheck("online ready script has asset checklist", readyScript.text.includes("## Asset Checklist"));
  assertCheck("online ready script has fact safety notes", readyScript.text.includes("## Fact Safety Notes"));

  const image = await fetchBytes(`${publicBase}og-image.png?qa=${Date.now()}`);
  const width = image.bytes.length >= 24 ? image.bytes.readUInt32BE(16) : 0;
  const height = image.bytes.length >= 24 ? image.bytes.readUInt32BE(20) : 0;
  assertCheck("online OG image HTTP 200", image.status === 200, String(image.status));
  assertCheck("online OG image 1200x630", width === 1200 && height === 630, `${width}x${height}`);
}

function markdownReport() {
  const failed = checks.filter((check) => check.status === "fail");
  const rows = checks.map((check) => `| ${check.status === "pass" ? "PASS" : "FAIL"} | ${check.name} | ${String(check.detail || "").replace(/\|/g, "/")} |`);
  return `# TrendFoundry QA Report

Generated: ${new Date().toISOString()}

Mode: ${online ? "local + online" : "local"}${skipScheduler ? " / scheduler skipped" : ""}

Summary: ${checks.length - failed.length}/${checks.length} passed.

| Status | Check | Detail |
|---|---|---|
${rows.join("\n")}
`;
}

await mkdir(qaDir, { recursive: true });
await checkLocal();
if (online) await checkOnline();

const failed = checks.filter((check) => check.status === "fail");
const passed = checks.length - failed.length;
const qaPayload = {
  generatedAt: new Date().toISOString(),
  online,
  skipScheduler,
  passed,
  failed: failed.length,
  total: checks.length,
  checks
};
await writeFile(path.join(qaDir, "latest-qa.json"), JSON.stringify(qaPayload, null, 2), "utf8");
if (online) {
  await writeFile(path.join(qaDir, "latest-online-qa.json"), JSON.stringify(qaPayload, null, 2), "utf8");
} else if (skipScheduler) {
  await writeFile(path.join(qaDir, "latest-ops-qa.json"), JSON.stringify(qaPayload, null, 2), "utf8");
} else {
  await writeFile(path.join(qaDir, "latest-local-qa.json"), JSON.stringify(qaPayload, null, 2), "utf8");
}
await writeFile(path.join(qaDir, "latest-qa.md"), markdownReport(), "utf8");

console.log(`QA: ${passed}/${checks.length} passed`);
console.log(`Report: ${path.join(qaDir, "latest-qa.md")}`);

if (failed.length) {
  for (const check of failed) {
    console.error(`FAIL ${check.name}: ${check.detail}`);
  }
  process.exit(1);
}
