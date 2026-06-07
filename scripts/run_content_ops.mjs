import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const distDir = path.join(root, "dist", "content-ops");
const refresh = process.argv.includes("--refresh");

function runStep(name, command, args) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    shell: false
  });
  return {
    name,
    command: [command, ...args].join(" "),
    startedAt,
    finishedAt: new Date().toISOString(),
    status: result.status === 0 ? "success" : "failed",
    exitCode: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || ""
  };
}

function npmRun(scriptName, extra = []) {
  return runStep(scriptName, "cmd.exe", ["/d", "/s", "/c", "npm", "run", scriptName, ...extra]);
}

function compact(value, fallback = "") {
  return String(value || fallback).replace(/\s+/g, " ").trim();
}

async function readJson(relativePath, fallback) {
  try {
    return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
  } catch {
    return fallback;
  }
}

function stepSummary(steps) {
  return steps.map((step) => `| ${step.name} | ${step.status} | ${step.exitCode} |`).join("\n");
}

const steps = [];
if (refresh) steps.push(npmRun("collect"));
for (const scriptName of ["content-audit", "episode-workbench", "full-script", "buyer-pack", "custom-proof-pack", "content-listing", "content-subscription", "content-sales", "content-prospects", "content-crm", "content-revenue"]) {
  steps.push(npmRun(scriptName));
  if (steps.at(-1).status !== "success") break;
}

const latest = await readJson("data/latest.json", {});
const buyerManifest = await readJson("dist/buyer-content-pack/manifest.json", {});
const fullScript = await readJson("dist/full-episode-script/latest.json", {});
const audit = await readJson("dist/content-audit/latest.json", {});
const listing = await readJson("dist/content-listing/products.json", {});
const customManifest = await readJson("dist/custom-proof-pack/manifest.json", {});
const subscriptionManifest = await readJson("dist/content-subscription-plan/manifest.json", {});
const salesManifest = await readJson("dist/content-sales-sequence/manifest.json", {});
const prospectManifest = await readJson("dist/content-prospecting/manifest.json", {});
const crmManifest = await readJson("dist/content-sales-crm/manifest.json", {});
const revenueManifest = await readJson("dist/content-revenue-model/manifest.json", {});
const allSucceeded = steps.every((step) => step.status === "success");

const run = {
  generatedAt: new Date().toISOString(),
  refresh,
  status: allSucceeded ? "success" : "failed",
  dataGeneratedAt: latest.generatedAt,
  steps,
  contentState: {
    totalItems: latest.totalItems,
    errorCount: latest.errorCount,
    auditSummary: audit.summary || {},
    primaryEpisode: fullScript.title,
    buyerDeliverables: buyerManifest.buyerDeliverables || [],
    customPack: {
      niche: customManifest.niche,
      platform: customManifest.platform,
      deliverables: customManifest.buyerDeliverables || []
    },
    salesSequence: {
      count: salesManifest.count,
      channels: salesManifest.channels || []
    },
    subscriptionPlan: {
      weeks: subscriptionManifest.weeks,
      deliveryDates: subscriptionManifest.deliveryDates || []
    },
    prospecting: {
      count: prospectManifest.count,
      channels: prospectManifest.channels || [],
      productFits: prospectManifest.productFits || []
    },
    salesCrm: {
      count: crmManifest.count,
      dueToday: crmManifest.dueToday,
      dueThisWeek: crmManifest.dueThisWeek,
      needsReview: crmManifest.needsReview
    },
    revenueModel: {
      scenarios: (revenueManifest.scenarios || []).map((scenario) => ({
        name: scenario.scenario,
        newMrrUsd: scenario.new_mrr_usd,
        monthOneCashUsd: scenario.month_one_cash_usd
      }))
    },
    listingSkus: (listing.products || []).map((product) => product.sku),
    sellerOnlyExcluded: buyerManifest.sellerOnlyExcluded || []
  },
  safety: {
    sendsMessages: false,
    collectsPayment: false,
    buildsFrontend: false,
    includesSellerOnlyFiles: false
  }
};

const markdown = `# TrendFoundry Content Ops

Generated: ${run.generatedAt}

Status: ${run.status}

Refresh public sources: ${refresh ? "yes" : "no"}

Dataset: ${compact(latest.generatedAt, "unknown")}

This is the content-only operating lane. It refreshes editorial audit, episode workbench, full episode script, buyer content pack, custom proof pack, content product listing, weekly subscription plan, sales drafts, local prospecting drafts, local sales CRM, and revenue model without sending messages, collecting payment, or building the frontend.

## Steps

| Step | Status | Exit |
| --- | --- | --- |
${stepSummary(steps)}

## Current Content State

- Total source items: ${latest.totalItems ?? "unknown"}
- Source errors: ${latest.errorCount ?? "unknown"}
- Primary episode: ${compact(fullScript.title, "unknown")}
- Buyer deliverables: ${(buyerManifest.buyerDeliverables || []).join(", ") || "unknown"}
- Custom pack: ${compact(customManifest.niche, "unknown")} / ${compact(customManifest.platform, "unknown")} (${(customManifest.buyerDeliverables || []).join(", ") || "unknown"})
- Subscription plan: ${subscriptionManifest.weeks ?? "unknown"} weeks (${(subscriptionManifest.deliveryDates || []).join(", ") || "unknown"})
- Sales drafts: ${salesManifest.count ?? "unknown"} drafts across ${(salesManifest.channels || []).join(", ") || "unknown"}
- Prospects: ${prospectManifest.count ?? "unknown"} local drafts across ${(prospectManifest.channels || []).join(", ") || "unknown"}
- CRM: ${crmManifest.count ?? "unknown"} rows, ${crmManifest.dueToday ?? "unknown"} due today, ${crmManifest.dueThisWeek ?? "unknown"} due this week
- Revenue model: base new MRR USD ${((revenueManifest.scenarios || []).find((scenario) => scenario.scenario === "base")?.new_mrr_usd) ?? "unknown"}, base month-one cash USD ${((revenueManifest.scenarios || []).find((scenario) => scenario.scenario === "base")?.month_one_cash_usd) ?? "unknown"}
- Listing SKUs: ${((listing.products || []).map((product) => product.sku)).join(", ") || "unknown"}
- Seller-only exclusions: ${(buyerManifest.sellerOnlyExcluded || []).join(", ") || "unknown"}

## Safety Boundary

- Does not send messages.
- Does not collect payment.
- Does not build or overwrite the frontend.
- Does not include seller-only files in buyer deliverables.

## Next Operator Action

1. Review \`docs/buyer-content-pack.md\`.
2. Review \`docs/content-product-listing.md\` before publishing or copying payment-platform fields.
3. Review \`docs/content-subscription-plan.md\` for the weekly subscription promise.
4. Review \`docs/content-sales-sequence.md\` for publish/send drafts.
5. Review \`dist/content-prospecting/prospect-board.md\` for one-by-one outreach.
6. Review \`dist/content-sales-crm/pipeline.md\` for today's follow-up queue.
7. Review \`docs/content-revenue-model.md\` for weekly sales targets.
8. If approved, use \`dist/buyer-content-pack/delivery-email.md\` as the human-reviewed send draft.
9. If the buyer requests a custom niche, run \`npm run custom-proof-pack -- --niche="..." --platform="..." --buyer="..." --channel="..."\`.
`;

await mkdir(docsDir, { recursive: true });
await mkdir(distDir, { recursive: true });
await writeFile(path.join(distDir, "latest-run.json"), JSON.stringify(run, null, 2), "utf8");
await writeFile(path.join(docsDir, "content-ops.md"), markdown, "utf8");

if (!allSucceeded) {
  const failed = steps.find((step) => step.status !== "success");
  console.error(`Content ops failed at ${failed?.name || "unknown step"}`);
  process.exit(1);
}

console.log(`Wrote ${path.join(docsDir, "content-ops.md")}`);
console.log(`Wrote ${path.join(distDir, "latest-run.json")}`);
console.log("Content ops complete.");
