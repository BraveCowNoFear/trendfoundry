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
for (const scriptName of ["content-audit", "episode-workbench", "full-script", "content-evidence", "buyer-pack", "content-delivery-gate", "custom-proof-pack", "content-listing", "content-subscription", "content-subscription-crm", "content-subscription-due", "content-subscription-retention", "content-sales", "content-prospects", "content-reply-intake", "content-crm", "content-revenue", "content-feedback", "content-close", "content-outreach-review", "content-outreach-sends", "content-deal-desk", "content-customer-success", "content-testimonials", "content-health"]) {
  steps.push(npmRun(scriptName));
  if (steps.at(-1).status !== "success") break;
}

const latest = await readJson("data/latest.json", {});
const buyerManifest = await readJson("dist/buyer-content-pack/manifest.json", {});
const evidenceManifest = await readJson("dist/content-evidence-pack/manifest.json", {});
const deliveryGateManifest = await readJson("dist/content-delivery-gate/manifest.json", {});
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
const replyIntakeManifest = await readJson("dist/content-reply-intake/manifest.json", {});
const crmManifest = await readJson("dist/content-sales-crm/manifest.json", {});
const revenueManifest = await readJson("dist/content-revenue-model/manifest.json", {});
const feedbackManifest = await readJson("dist/content-feedback-loop/manifest.json", {});
const closeManifest = await readJson("dist/content-close-pack/manifest.json", {});
const outreachReviewManifest = await readJson("dist/content-outreach-review/manifest.json", {});
const outreachSendsManifest = await readJson("dist/content-outreach-sends/manifest.json", {});
const dealDeskManifest = await readJson("dist/content-deal-desk/manifest.json", {});
const customerSuccessManifest = await readJson("dist/content-customer-success/manifest.json", {});
const testimonialManifest = await readJson("dist/content-testimonials/manifest.json", {});
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
    evidencePack: {
      evidenceItemCount: evidenceManifest.evidenceItemCount,
      claimCount: evidenceManifest.claimCount,
      buyerDeliverable: evidenceManifest.buyerDeliverable
    },
    buyerDeliverables: buyerManifest.buyerDeliverables || [],
    deliveryGate: {
      checkCount: deliveryGateManifest.checkCount,
      failedCount: deliveryGateManifest.failedCount,
      passedCount: deliveryGateManifest.passedCount
    },
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
    replyIntake: {
      parsedCount: replyIntakeManifest.parsedCount,
      skippedCount: replyIntakeManifest.skippedCount,
      stageCounts: replyIntakeManifest.stageCounts || {}
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
    outreachSends: {
      sendReceiptCount: outreachSendsManifest.sendReceiptCount,
      sentToday: outreachSendsManifest.sentTodayCount,
      waitingReply: outreachSendsManifest.waitingReplyCount
    },
    dealDesk: {
      activeDealCount: dealDeskManifest.activeDealCount,
      playbookCount: dealDeskManifest.playbookCount,
      actionCounts: dealDeskManifest.actionCounts || {},
      offerSkus: dealDeskManifest.offerSkus || []
    },
    customerSuccess: {
      completionReceiptCount: customerSuccessManifest.completionReceiptCount,
      followupCount: customerSuccessManifest.followupCount,
      dueNow: customerSuccessManifest.dueNowCount,
      waiting: customerSuccessManifest.waitingCount,
      upsellPaths: customerSuccessManifest.upsellPaths || {}
    },
    testimonials: {
      testimonialRows: testimonialManifest.testimonialRows,
      publishCandidateCount: testimonialManifest.publishCandidateCount,
      permissionOrReviewCount: testimonialManifest.permissionOrReviewCount,
      blockedCount: testimonialManifest.blockedCount,
      statusCounts: testimonialManifest.statusCounts || {}
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

This is the content-only operating lane. It refreshes editorial audit, episode workbench, full episode script, source evidence pack, buyer content pack, buyer delivery gate, custom proof pack, content product listing, weekly subscription plan, sales drafts, local prospecting drafts, reply intake, local sales CRM, revenue model, feedback learning loop, daily close pack, outreach review packs, outreach send receipts, deal desk, customer-success follow-ups, testimonial bank, and text health gate without sending messages, collecting payment, or building the frontend.

## Steps

| Step | Status | Exit |
| --- | --- | --- |
${stepSummary(steps)}

## Current Content State

- Total source items: ${latest.totalItems ?? "unknown"}
- Source errors: ${latest.errorCount ?? "unknown"}
- Primary episode: ${compact(fullScript.title, "unknown")}
- Evidence pack: ${evidenceManifest.evidenceItemCount ?? "unknown"} evidence items, ${evidenceManifest.claimCount ?? "unknown"} claims
- Buyer deliverables: ${(buyerManifest.buyerDeliverables || []).join(", ") || "unknown"}
- Delivery gate: ${deliveryGateManifest.passedCount ?? "unknown"} passed, ${deliveryGateManifest.failedCount ?? "unknown"} failed
- Custom pack: ${compact(customManifest.niche, "unknown")} / ${compact(customManifest.platform, "unknown")} (${(customManifest.buyerDeliverables || []).join(", ") || "unknown"})
- Subscription plan: ${subscriptionManifest.weeks ?? "unknown"} weeks (${(subscriptionManifest.deliveryDates || []).join(", ") || "unknown"})
- Subscription CRM: ${subscriptionCrmManifest.subscriberCount ?? "unknown"} subscribers, ${subscriptionCrmManifest.dueCount ?? "unknown"} ready today, ${subscriptionCrmManifest.blockedCount ?? "unknown"} needing payment review, ${subscriptionCrmManifest.renewalCount ?? "unknown"} renewal checks
- Subscription due fulfillment: ${subscriptionDueManifest.readyCount ?? "unknown"} ready, ${subscriptionDueManifest.preparedCount ?? "unknown"} prepared, ${subscriptionDueManifest.failedCount ?? "unknown"} failed
- Subscription retention: ${subscriptionRetentionManifest.draftCount ?? "unknown"} drafts, ${subscriptionRetentionManifest.paymentReviewCount ?? "unknown"} payment review, ${subscriptionRetentionManifest.renewalCount ?? "unknown"} renewal
- Sales drafts: ${salesManifest.count ?? "unknown"} drafts across ${(salesManifest.channels || []).join(", ") || "unknown"}
- Prospects: ${prospectManifest.count ?? "unknown"} local drafts across ${(prospectManifest.channels || []).join(", ") || "unknown"}
- Reply intake: ${replyIntakeManifest.parsedCount ?? "unknown"} parsed, ${replyIntakeManifest.skippedCount ?? "unknown"} skipped
- CRM: ${crmManifest.count ?? "unknown"} rows, ${crmManifest.dueToday ?? "unknown"} due today, ${crmManifest.dueThisWeek ?? "unknown"} due this week
- Revenue model: base new MRR USD ${((revenueManifest.scenarios || []).find((scenario) => scenario.scenario === "base")?.new_mrr_usd) ?? "unknown"}, base month-one cash USD ${((revenueManifest.scenarios || []).find((scenario) => scenario.scenario === "base")?.month_one_cash_usd) ?? "unknown"}
- Feedback loop: ${feedbackManifest.learningCount ?? "unknown"} learnings, ${feedbackManifest.questionCount ?? "unknown"} questions, ${feedbackManifest.privateReplyRows ?? "unknown"} private replies
- Close pack: ${closeManifest.selectedCount ?? "unknown"} selected, ${closeManifest.cleanTextCount ?? "unknown"} clean, ${closeManifest.needsCleanupCount ?? "unknown"} needing cleanup
- Outreach review: ${outreachReviewManifest.reviewPackCount ?? "unknown"} send packs, ${outreachReviewManifest.skippedNeedsCleanupCount ?? "unknown"} skipped for text cleanup
- Outreach sends: ${outreachSendsManifest.sendReceiptCount ?? "unknown"} receipts, ${outreachSendsManifest.sentTodayCount ?? "unknown"} sent today, ${outreachSendsManifest.waitingReplyCount ?? "unknown"} waiting reply
- Deal desk: ${dealDeskManifest.activeDealCount ?? "unknown"} active deals, ${dealDeskManifest.playbookCount ?? "unknown"} objection playbook rows
- Customer success: ${customerSuccessManifest.followupCount ?? "unknown"} follow-ups, ${customerSuccessManifest.dueNowCount ?? "unknown"} due now, ${customerSuccessManifest.completionReceiptCount ?? "unknown"} completion receipts
- Testimonials: ${testimonialManifest.testimonialRows ?? "unknown"} private rows, ${testimonialManifest.publishCandidateCount ?? "unknown"} publish candidates, ${testimonialManifest.permissionOrReviewCount ?? "unknown"} needing permission/review
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
2. Review \`docs/content-delivery-gate.md\` before fulfilling a paid buyer order.
3. Review \`docs/content-evidence-pack.md\` before recording or delivering fact-sensitive claims.
4. Review \`docs/content-product-listing.md\` before publishing or copying payment-platform fields.
5. Review \`docs/content-subscription-plan.md\` for the weekly subscription promise.
6. Review \`docs/content-subscription-crm.md\` and private \`dist/content-subscription-crm/due-queue.md\` for due subscribers.
7. Review \`docs/content-subscription-due.md\` and private \`dist/content-subscription-due/prepared.csv\` for prepared weekly deliveries.
8. Review \`docs/content-subscription-retention.md\` and private \`dist/content-subscription-retention/drafts.md\` for renewal/payment-review drafts.
9. Review \`docs/content-sales-sequence.md\` for publish/send drafts.
10. Review \`dist/content-prospecting/prospect-board.md\` for one-by-one outreach.
11. Drop copied replies into \`data/content-sales-crm/reply-inbox/\`, then review \`dist/content-reply-intake/parsed-replies.md\`.
12. Review \`dist/content-sales-crm/pipeline.md\` for today's follow-up queue.
13. Review \`docs/content-revenue-model.md\` for weekly sales targets.
14. Review \`docs/content-feedback-loop.md\` before editing product copy or sales objections.
15. Review \`dist/content-close-pack/today-close-queue.md\` for the five-row daily close queue.
16. Review \`dist/content-outreach-review/review-board.md\` and one send pack at a time under \`dist/content-outreach-review/send-packs/\`.
17. After a send pack is manually sent, run \`npm run complete-content-outreach-send -- --review-id="..."\`.
18. Review \`dist/content-deal-desk/deal-desk.md\` when a reply, invoice request, or payment confirmation arrives.
19. Review \`dist/content-customer-success/followup-drafts.md\` after any delivered order enters \`fulfilled_waiting_feedback\`.
20. Review \`dist/content-testimonials/testimonial-bank.md\` before reusing any quote in sales copy.
21. Review \`docs/content-health-gate.md\` before trusting console-rendered Chinese text.
22. If approved, use \`dist/buyer-content-pack/delivery-email.md\` as the human-reviewed send draft.
23. If the buyer requests a custom niche, run \`npm run custom-proof-pack -- --niche="..." --platform="..." --buyer="..." --channel="..."\`.
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
