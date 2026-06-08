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

## Content Sales Lane

- Content ops status: ${report.content.status}
- Content ops steps: ${report.content.stepCount}
- Primary episode: ${report.content.primaryEpisode}
- Buyer deliverables: ${report.content.buyerDeliverables.join(", ") || "unknown"}
- Evidence pack: ${report.content.evidenceItems} items, ${report.content.evidenceClaims} claims (${report.content.evidenceDeliverable})
- Delivery gate: ${report.content.deliveryGatePassed} passed, ${report.content.deliveryGateFailed} failed
- Prospects: ${report.content.prospects}
- Reply intake parsed: ${report.content.replyIntakeParsed}
- Reply intake skipped: ${report.content.replyIntakeSkipped}
- CRM due today: ${report.content.crmDueToday}
- Close queue: ${report.content.closeSelected}
- Outreach review packs: ${report.content.outreachReviewPacks}
- Outreach gate passed: ${report.content.outreachGatePassed}
- Outreach gate failed: ${report.content.outreachGateFailed}
- Outreach send receipts: ${report.content.outreachSendReceipts}
- Outreach waiting reply: ${report.content.outreachWaitingReply}
- Deal desk active deals: ${report.content.activeDeals}
- Deal desk playbook rows: ${report.content.playbookRows}
- Fulfillment queue rows: ${report.content.fulfillmentQueueRows}
- Fulfillment waiting manual send: ${report.content.fulfillmentWaitingManualSend}
- Fulfillment needs delivery fix: ${report.content.fulfillmentNeedsFix}
- Fulfillment concise-ready: ${report.content.fulfillmentConciseReady}
- Customer success follow-ups: ${report.content.customerFollowups}
- Customer success due now: ${report.content.customerDueNow}
- Testimonial private rows: ${report.content.testimonialRows}
- Testimonial publish candidates: ${report.content.testimonialCandidates}
- Action brief rows: ${report.content.actionBriefRows}
- Action brief top lane: ${report.content.actionBriefTopLane}
- Action brief manual review: ${report.content.actionBriefManualReview}
- Health gate: ${report.content.healthFiles} files, ${report.content.healthMojibake} mojibake, ${report.content.healthLeaks} public leaks

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
const contentOpsData = await readJsonIfExists(path.join(root, "dist", "content-ops", "latest-run.json"), { contentState: {}, steps: [] });
const replyIntakeData = await readJsonIfExists(path.join(root, "dist", "content-reply-intake", "manifest.json"), {});
const dealDeskData = await readJsonIfExists(path.join(root, "dist", "content-deal-desk", "manifest.json"), {});
const fulfillmentQueueData = await readJsonIfExists(path.join(root, "dist", "content-fulfillment-queue", "manifest.json"), {});
const customerSuccessData = await readJsonIfExists(path.join(root, "dist", "content-customer-success", "manifest.json"), {});
const testimonialData = await readJsonIfExists(path.join(root, "dist", "content-testimonials", "manifest.json"), {});
const actionBriefData = await readJsonIfExists(path.join(root, "dist", "content-action-brief", "manifest.json"), {});
const outreachReviewData = await readJsonIfExists(path.join(root, "dist", "content-outreach-review", "manifest.json"), {});
const outreachGateData = await readJsonIfExists(path.join(root, "dist", "content-outreach-gate", "manifest.json"), {});
const outreachSendsData = await readJsonIfExists(path.join(root, "dist", "content-outreach-sends", "manifest.json"), {});
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
  content: {
    status: contentOpsData.status || "unknown",
    stepCount: contentOpsData.steps?.length || 0,
    primaryEpisode: contentOpsData.contentState?.primaryEpisode || "unknown",
    buyerDeliverables: contentOpsData.contentState?.buyerDeliverables || [],
    evidenceItems: contentOpsData.contentState?.evidencePack?.evidenceItemCount ?? "unknown",
    evidenceClaims: contentOpsData.contentState?.evidencePack?.claimCount ?? "unknown",
    evidenceDeliverable: contentOpsData.contentState?.evidencePack?.buyerDeliverable ?? "unknown",
    deliveryGatePassed: contentOpsData.contentState?.deliveryGate?.passedCount ?? "unknown",
    deliveryGateFailed: contentOpsData.contentState?.deliveryGate?.failedCount ?? "unknown",
    prospects: contentOpsData.contentState?.prospecting?.count ?? "unknown",
    replyIntakeParsed: replyIntakeData.parsedCount ?? contentOpsData.contentState?.replyIntake?.parsedCount ?? "unknown",
    replyIntakeSkipped: replyIntakeData.skippedCount ?? contentOpsData.contentState?.replyIntake?.skippedCount ?? "unknown",
    crmDueToday: contentOpsData.contentState?.salesCrm?.dueToday ?? "unknown",
    closeSelected: contentOpsData.contentState?.closePack?.selectedCount ?? "unknown",
    outreachReviewPacks: outreachReviewData.reviewPackCount ?? contentOpsData.contentState?.outreachReview?.reviewPackCount ?? "unknown",
    outreachGatePassed: outreachGateData.passedCount ?? contentOpsData.contentState?.outreachGate?.passedCount ?? "unknown",
    outreachGateFailed: outreachGateData.failedCount ?? contentOpsData.contentState?.outreachGate?.failedCount ?? "unknown",
    outreachSendReceipts: outreachSendsData.sendReceiptCount ?? contentOpsData.contentState?.outreachSends?.sendReceiptCount ?? "unknown",
    outreachWaitingReply: outreachSendsData.waitingReplyCount ?? contentOpsData.contentState?.outreachSends?.waitingReply ?? "unknown",
    activeDeals: dealDeskData.activeDealCount ?? contentOpsData.contentState?.dealDesk?.activeDealCount ?? "unknown",
    playbookRows: dealDeskData.playbookCount ?? contentOpsData.contentState?.dealDesk?.playbookCount ?? "unknown",
    fulfillmentQueueRows: fulfillmentQueueData.queueCount ?? contentOpsData.contentState?.fulfillmentQueue?.queueCount ?? "unknown",
    fulfillmentWaitingManualSend: fulfillmentQueueData.preparedWaitingManualSendCount ?? contentOpsData.contentState?.fulfillmentQueue?.preparedWaitingManualSend ?? "unknown",
    fulfillmentNeedsFix: fulfillmentQueueData.needsDeliveryFixCount ?? contentOpsData.contentState?.fulfillmentQueue?.needsDeliveryFix ?? "unknown",
    fulfillmentConciseReady: fulfillmentQueueData.conciseReadyCount ?? contentOpsData.contentState?.fulfillmentQueue?.conciseReady ?? "unknown",
    customerFollowups: customerSuccessData.followupCount ?? contentOpsData.contentState?.customerSuccess?.followupCount ?? "unknown",
    customerDueNow: customerSuccessData.dueNowCount ?? contentOpsData.contentState?.customerSuccess?.dueNow ?? "unknown",
    testimonialRows: testimonialData.testimonialRows ?? contentOpsData.contentState?.testimonials?.testimonialRows ?? "unknown",
    testimonialCandidates: testimonialData.publishCandidateCount ?? contentOpsData.contentState?.testimonials?.publishCandidateCount ?? "unknown",
    actionBriefRows: actionBriefData.actionCount ?? contentOpsData.contentState?.actionBrief?.actionCount ?? "unknown",
    actionBriefTopLane: actionBriefData.topActionLane ?? contentOpsData.contentState?.actionBrief?.topActionLane ?? "unknown",
    actionBriefManualReview: actionBriefData.manualReviewCount ?? contentOpsData.contentState?.actionBrief?.manualReviewCount ?? "unknown",
    healthFiles: contentOpsData.contentState?.healthGate?.checkedFileCount ?? "unknown",
    healthMojibake: contentOpsData.contentState?.healthGate?.filesWithMojibakeMarkers ?? "unknown",
    healthLeaks: contentOpsData.contentState?.healthGate?.publicCloseDocProspectLeaks ?? "unknown"
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
    contentOpsData.status === "success" ? "Review dist/content-action-brief/action-brief.md first, then open the specific private queue files it links for today's content sales work." : "Run npm run content-ops to refresh buyer packs, reply intake, outreach review, send receipts, deal desk, fulfillment queue, customer follow-ups, testimonial bank, and action brief.",
    "Drop copied buyer email text into data/email-orders/ and run npm run intake-email-orders to generate local payment replies.",
    "For paid email orders, run npm run fulfill-email-orders after verifying payment externally.",
    "For no-login email orders, run npm run payment-reply before sending payment instructions."
  ]
};

await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, "ops-report.json"), JSON.stringify(report, null, 2), "utf8");
await writeFile(path.join(outDir, "ops-report.md"), markdown(report), "utf8");

console.log(`Wrote ${path.join(outDir, "ops-report.md")}`);
