import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const outDir = path.join(root, "dist", "ops-report");

async function readJsonIfExists(file, fallback) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

async function readTextIfExists(file, fallback = "") {
  try {
    return await readFile(file, "utf8");
  } catch {
    return fallback;
  }
}

async function listDirsIfExists(dir) {
  try {
    return (await readdir(dir, { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  } catch {
    return [];
  }
}

async function listFilesIfExists(dir) {
  try {
    return (await readdir(dir, { withFileTypes: true })).filter((entry) => entry.isFile()).map((entry) => entry.name).sort();
  } catch {
    return [];
  }
}

function stageCounts(leads) {
  return leads.reduce((acc, lead) => {
    acc[lead.stage || "unknown"] = (acc[lead.stage || "unknown"] || 0) + 1;
    return acc;
  }, {});
}

function publishingSummary(text) {
  const run = text.match(/Latest verified Pages run: `([^`]+)`/)?.[1] || "unknown";
  const commit = text.match(/Latest verified commit: `([^`]+)`/)?.[1] || "unknown";
  return { run, commit };
}

function markdown(report) {
  const leadCounts = Object.entries(report.leads.stageCounts).map(([stage, count]) => `- ${stage}: ${count}`).join("\n") || "- no leads";
  const runSteps = report.operations.steps.map((step) => `- ${step.name}: ${step.status}`).join("\n") || "- no recorded operate run";
  const nextActions = report.nextActions.map((item) => `- ${item}`).join("\n");
  return `# TrendFoundry Ops Report

Generated: ${report.generatedAt}

## Public Status

- Site: ${report.public.site}
- Latest verified Pages run: ${report.public.latestPagesRun}
- Latest verified commit: ${report.public.latestCommit}

## Product Snapshot

- Source snapshot: ${report.product.sourceSnapshot}
- Total collected items: ${report.product.totalItems}
- Current cards: ${report.product.currentCards}
- Source errors: ${report.product.errorCount}
- Top opportunity: ${report.product.topOpportunity}

## QA Gate

- Latest online QA: ${report.qa.online.passed}/${report.qa.online.total} passed
- Online QA generated: ${report.qa.online.generatedAt}
- Latest QA run: ${report.qa.latest.passed}/${report.qa.latest.total} passed (${report.qa.latest.mode})
- Latest QA generated: ${report.qa.latest.generatedAt}

## Last Operations Run

- Generated: ${report.operations.generatedAt}
${runSteps}

## Sales Pipeline

- Lead count: ${report.leads.total}
${leadCounts}

## Local Assets

- Outreach drafts: ${report.assets.outreachDraftCount}
- Launch asset files: ${report.assets.launchAssetCount}
- Commerce products: ${report.assets.commerceProductCount}
- Payment reply packets: ${report.assets.paymentReplyCount}
- Email order intake records: ${report.assets.emailOrderCount}
- Email fulfillment prepared: ${report.assets.emailFulfillmentCount}
- Prepared order directories: ${report.assets.orderCount}
- Latest payment reply packets: ${report.assets.latestPaymentReplies.join(", ") || "none"}
- Latest order directories: ${report.assets.latestOrders.join(", ") || "none"}

## Next Actions

${nextActions}

## Safety

- No messages were sent.
- No payment action was attempted.
- Buyer delivery must exclude prospects.csv, outreach-board.md, and latest.json.
`;
}

const latest = await readJsonIfExists(path.join(root, "data", "latest.json"), {});
const leadsData = await readJsonIfExists(path.join(root, "data", "leads.json"), { leads: [] });
const commerceData = await readJsonIfExists(path.join(root, "dist", "commerce", "products.json"), { products: [] });
const qaData = await readJsonIfExists(path.join(root, "dist", "qa", "latest-qa.json"), { checks: [] });
const onlineQaData = await readJsonIfExists(path.join(root, "dist", "qa", "latest-online-qa.json"), qaData);
const runData = await readJsonIfExists(path.join(root, "dist", "ops-run", "latest-run.json"), { steps: [] });
const emailOrderData = await readJsonIfExists(path.join(root, "dist", "email-order-intake", "orders.json"), { orders: [] });
const emailFulfillmentData = await readJsonIfExists(path.join(root, "dist", "email-fulfillment", "email-orders.json"), { prepared: [] });
const publishing = publishingSummary(await readTextIfExists(path.join(root, "docs", "publishing.md")));
const outreachFiles = await listFilesIfExists(path.join(root, "dist", "outreach-drafts"));
const launchAssetFiles = await listFilesIfExists(path.join(root, "dist", "launch-assets"));
const orderDirs = await listDirsIfExists(path.join(root, "dist", "orders"));
const paymentReplyDirs = await listDirsIfExists(path.join(root, "dist", "payment-replies"));

const items = latest.items || [];
const leads = leadsData.leads || [];
function qaSummary(data) {
  const total = data.total ?? data.checks?.length ?? 0;
  const failed = data.failed ?? (data.checks || []).filter((check) => check.status === "fail").length;
  const passed = data.passed ?? Math.max(0, total - failed);
  return {
    generatedAt: data.generatedAt || "unknown",
    passed,
    failed,
    total,
    mode: data.online ? "local + online" : data.skipScheduler ? "local / scheduler skipped" : "local"
  };
}
const paidReadyCount = leads.filter((lead) => lead.stage === "paid").length;
const qualifiedCount = leads.filter((lead) => lead.stage === "qualified").length;
const report = {
  generatedAt: new Date().toISOString(),
  public: {
    site: "https://bravecownofear.github.io/trendfoundry/",
    latestPagesRun: publishing.run,
    latestCommit: publishing.commit
  },
  product: {
    sourceSnapshot: latest.generatedAt || "unknown",
    totalItems: latest.totalItems ?? items.length,
    currentCards: Math.min(12, items.length),
    errorCount: latest.errorCount ?? (latest.errors || []).length ?? 0,
    topOpportunity: items[0]?.title || "none"
  },
  qa: {
    latest: qaSummary(qaData),
    online: qaSummary(onlineQaData)
  },
  operations: {
    generatedAt: runData.generatedAt || "unknown",
    mode: runData.mode || "unknown",
    steps: (runData.steps || []).map((step) => ({ name: step.name, status: step.status }))
  },
  leads: {
    total: leads.length,
    stageCounts: stageCounts(leads)
  },
  assets: {
    outreachDraftCount: outreachFiles.filter((file) => file.endsWith(".md") && file !== "outreach-drafts.md").length,
    launchAssetCount: launchAssetFiles.length,
    commerceProductCount: commerceData.products?.length || 0,
    paymentReplyCount: paymentReplyDirs.length,
    emailOrderCount: emailOrderData.orders?.length || 0,
    emailFulfillmentCount: emailFulfillmentData.prepared?.length || 0,
    latestPaymentReplies: paymentReplyDirs.slice(-5),
    orderCount: orderDirs.length,
    latestOrders: orderDirs.slice(-5)
  },
  nextActions: [
    paidReadyCount ? `Run npm run fulfill-ready for ${paidReadyCount} paid lead(s).` : "No paid leads are waiting for fulfillment.",
    qualifiedCount ? `Review ${qualifiedCount} qualified lead(s); use npm run fulfill-ready -- --include-qualified only if sample delivery is approved.` : "No qualified leads require approval.",
    outreachFiles.length ? "Review dist/outreach-drafts/outreach-drafts.md before any one-to-one outreach." : "Run npm run daily to refresh outreach drafts.",
    launchAssetFiles.length ? "Review dist/launch-assets/launch-posts.md before any manual launch post." : "Run npm run launch-assets before manual launch posting.",
    commerceData.products?.length ? "Commerce SKU fields are ready in dist/commerce/." : "Run npm run commerce before setting up a hosted checkout page.",
    "Drop copied buyer email text into data/email-orders/ and run npm run intake-email-orders to generate local payment replies.",
    "For paid email orders, run npm run fulfill-email-orders after verifying payment externally.",
    "For no-login email orders, run npm run payment-reply before sending payment instructions."
  ]
};

await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, "ops-report.json"), JSON.stringify(report, null, 2), "utf8");
await writeFile(path.join(outDir, "ops-report.md"), markdown(report), "utf8");

console.log(`Wrote ${path.join(outDir, "ops-report.md")}`);
