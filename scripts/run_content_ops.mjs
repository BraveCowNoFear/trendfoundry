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
for (const scriptName of ["content-audit", "episode-workbench", "full-script", "buyer-pack", "custom-proof-pack", "content-listing", "content-subscription", "content-subscription-crm", "content-subscription-due", "content-subscription-retention", "content-sales", "content-prospects", "content-crm", "content-revenue", "content-feedback", "content-close", "content-outreach-review", "content-health"]) {
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
const subscriptionCrmManifest = await readJson("dist/content-subscription-crm/manifest.json", {});
const subscriptionDueManifest = await readJson("dist/content-subscription-due/manifest.json", {});
const subscriptionRetentionManifest = await readJson("dist/content-subscription-retention/manifest.json", {});
const salesManifest = await readJson("dist/content-sales-sequence/manifest.json", {});
const prospectManifest = await readJson("dist/content-prospecting/manifest.json", {});
const crmManifest = await readJson("dist/content-sales-crm/manifest.json", {});
const revenueManifest = await readJson("dist/content-revenue-model/manifest.json", {});
const feedbackManifest = await readJson("dist/content-feedback-loop/manifest.json", {});
const closeManifest = await readJson("dist/content-close-pack/manifest.json", {});
const outreachReviewManifest = await readJson("dist/content-outreach-review/manifest.json", {});
const healthManifest = await readJson("dist/content-health-gate/manifest.json", {});
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
    subscriptionCrm: {
      count: subscriptionCrmManifest.subscriberCount,
      dueToday: subscriptionCrmManifest.dueCount,
      paymentReview: subscriptionCrmManifest.blockedCount,
      renewalSoon: subscriptionCrmManifest.renewalCount
    },
    subscriptionDue: {
      ready: subscriptionDueManifest.readyCount,
      prepared: subscriptionDueManifest.preparedCount,
      failed: subscriptionDueManifest.failedCount
    },
    subscriptionRetention: {
      drafts: subscriptionRetentionManifest.draftCount,
      paymentReview: subscriptionRetentionManifest.paymentReviewCount,
      renewal: subscriptionRetentionManifest.renewalCount
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
    feedbackLoop: {
      learningCount: feedbackManifest.learningCount,
      questionCount: feedbackManifest.questionCount,
      privateReplyRows: feedbackManifest.privateReplyRows,
      categories: feedbackManifest.categories || []
    },
    closePack: {
      selectedCount: closeManifest.selectedCount,
      cleanTextCount: closeManifest.cleanTextCount,
      needsCleanupCount: closeManifest.needsCleanupCount,
      offerSkus: closeManifest.offerSkus || []
    },
    outreachReview: {
      reviewPackCount: outreachReviewManifest.reviewPackCount,
      skippedNeedsCleanupCount: outreachReviewManifest.skippedNeedsCleanupCount,
      offerSkus: outreachReviewManifest.offerSkus || [],
      followUpDates: outreachReviewManifest.followUpDates || []
    },
    healthGate: {
      checkedFileCount: healthManifest.checkedFileCount,
      filesWithMojibakeMarkers: healthManifest.filesWithMojibakeMarkers,
      readableBilibiliCount: healthManifest.readableBilibiliCount,
      publicCloseDocProspectLeaks: healthManifest.publicCloseDocProspectLeaks
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

This is the content-only operating lane. It refreshes editorial audit, episode workbench, full episode script, buyer content pack, custom proof pack, content product listing, weekly subscription plan, sales drafts, local prospecting drafts, local sales CRM, revenue model, feedback learning loop, daily close pack, outreach review packs, and text health gate without sending messages, collecting payment, or building the frontend.

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
- Subscription CRM: ${subscriptionCrmManifest.subscriberCount ?? "unknown"} subscribers, ${subscriptionCrmManifest.dueCount ?? "unknown"} ready today, ${subscriptionCrmManifest.blockedCount ?? "unknown"} needing payment review, ${subscriptionCrmManifest.renewalCount ?? "unknown"} renewal checks
- Subscription due fulfillment: ${subscriptionDueManifest.readyCount ?? "unknown"} ready, ${subscriptionDueManifest.preparedCount ?? "unknown"} prepared, ${subscriptionDueManifest.failedCount ?? "unknown"} failed
- Subscription retention: ${subscriptionRetentionManifest.draftCount ?? "unknown"} drafts, ${subscriptionRetentionManifest.paymentReviewCount ?? "unknown"} payment review, ${subscriptionRetentionManifest.renewalCount ?? "unknown"} renewal
- Sales drafts: ${salesManifest.count ?? "unknown"} drafts across ${(salesManifest.channels || []).join(", ") || "unknown"}
- Prospects: ${prospectManifest.count ?? "unknown"} local drafts across ${(prospectManifest.channels || []).join(", ") || "unknown"}
- CRM: ${crmManifest.count ?? "unknown"} rows, ${crmManifest.dueToday ?? "unknown"} due today, ${crmManifest.dueThisWeek ?? "unknown"} due this week
- Revenue model: base new MRR USD ${((revenueManifest.scenarios || []).find((scenario) => scenario.scenario === "base")?.new_mrr_usd) ?? "unknown"}, base month-one cash USD ${((revenueManifest.scenarios || []).find((scenario) => scenario.scenario === "base")?.month_one_cash_usd) ?? "unknown"}
- Feedback loop: ${feedbackManifest.learningCount ?? "unknown"} learnings, ${feedbackManifest.questionCount ?? "unknown"} questions, ${feedbackManifest.privateReplyRows ?? "unknown"} private replies
- Close pack: ${closeManifest.selectedCount ?? "unknown"} selected, ${closeManifest.cleanTextCount ?? "unknown"} clean, ${closeManifest.needsCleanupCount ?? "unknown"} needing cleanup
- Outreach review: ${outreachReviewManifest.reviewPackCount ?? "unknown"} send packs, ${outreachReviewManifest.skippedNeedsCleanupCount ?? "unknown"} skipped for text cleanup
- Health gate: ${healthManifest.checkedFileCount ?? "unknown"} files checked, ${healthManifest.filesWithMojibakeMarkers ?? "unknown"} with mojibake markers, ${healthManifest.publicCloseDocProspectLeaks ?? "unknown"} public prospect leaks
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
4. Review \`docs/content-subscription-crm.md\` and private \`dist/content-subscription-crm/due-queue.md\` for due subscribers.
5. Review \`docs/content-subscription-due.md\` and private \`dist/content-subscription-due/prepared.csv\` for prepared weekly deliveries.
6. Review \`docs/content-subscription-retention.md\` and private \`dist/content-subscription-retention/drafts.md\` for renewal/payment-review drafts.
7. Review \`docs/content-sales-sequence.md\` for publish/send drafts.
8. Review \`dist/content-prospecting/prospect-board.md\` for one-by-one outreach.
9. Review \`dist/content-sales-crm/pipeline.md\` for today's follow-up queue.
10. Review \`docs/content-revenue-model.md\` for weekly sales targets.
11. Review \`docs/content-feedback-loop.md\` before editing product copy or sales objections.
12. Review \`dist/content-close-pack/today-close-queue.md\` for the five-row daily close queue.
13. Review \`dist/content-outreach-review/review-board.md\` and one send pack at a time under \`dist/content-outreach-review/send-packs/\`.
14. Review \`docs/content-health-gate.md\` before trusting console-rendered Chinese text.
15. If approved, use \`dist/buyer-content-pack/delivery-email.md\` as the human-reviewed send draft.
16. If the buyer requests a custom niche, run \`npm run custom-proof-pack -- --niche="..." --platform="..." --buyer="..." --channel="..."\`.
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
