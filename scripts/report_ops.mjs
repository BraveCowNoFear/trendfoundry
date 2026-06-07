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

## Sales Pipeline

- Lead count: ${report.leads.total}
${leadCounts}

## Local Assets

- Outreach drafts: ${report.assets.outreachDraftCount}
- Commerce products: ${report.assets.commerceProductCount}
- Prepared order directories: ${report.assets.orderCount}
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
const publishing = publishingSummary(await readTextIfExists(path.join(root, "docs", "publishing.md")));
const outreachFiles = await listFilesIfExists(path.join(root, "dist", "outreach-drafts"));
const orderDirs = await listDirsIfExists(path.join(root, "dist", "orders"));

const items = latest.items || [];
const leads = leadsData.leads || [];
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
  leads: {
    total: leads.length,
    stageCounts: stageCounts(leads)
  },
  assets: {
    outreachDraftCount: outreachFiles.filter((file) => file.endsWith(".md") && file !== "outreach-drafts.md").length,
    commerceProductCount: commerceData.products?.length || 0,
    orderCount: orderDirs.length,
    latestOrders: orderDirs.slice(-5)
  },
  nextActions: [
    paidReadyCount ? `Run npm run fulfill-ready for ${paidReadyCount} paid lead(s).` : "No paid leads are waiting for fulfillment.",
    qualifiedCount ? `Review ${qualifiedCount} qualified lead(s); use npm run fulfill-ready -- --include-qualified only if sample delivery is approved.` : "No qualified leads require approval.",
    outreachFiles.length ? "Review dist/outreach-drafts/outreach-drafts.md before any one-to-one outreach." : "Run npm run daily to refresh outreach drafts.",
    commerceData.products?.length ? "Commerce SKU fields are ready in dist/commerce/." : "Run npm run commerce before setting up a hosted checkout page."
  ]
};

await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, "ops-report.json"), JSON.stringify(report, null, 2), "utf8");
await writeFile(path.join(outDir, "ops-report.md"), markdown(report), "utf8");

console.log(`Wrote ${path.join(outDir, "ops-report.md")}`);
