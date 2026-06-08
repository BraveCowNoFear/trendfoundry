import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const outDir = path.join(root, "dist", "content-action-brief");

function compact(value, fallback = "") {
  return String(value || fallback).replace(/\s+/g, " ").trim() || fallback;
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows, columns) {
  return [columns.join(","), ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))].join("\n");
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

async function readText(relativePath) {
  try {
    return await readFile(path.join(root, relativePath), "utf8");
  } catch {
    return "";
  }
}

async function readJson(relativePath, fallback = {}) {
  try {
    return JSON.parse(await readText(relativePath));
  } catch {
    return fallback;
  }
}

function todayIso() {
  return (process.env.TRENDFOUNDRY_TODAY || new Date().toISOString().slice(0, 10)).slice(0, 10);
}

function reviewPackPath(reviewId) {
  return `dist/content-outreach-review/send-packs/${reviewId}.md`;
}

function action(row) {
  return {
    action_id: row.action_id,
    priority: row.priority,
    lane: row.lane,
    status: row.status || "ready_for_review",
    title: row.title,
    actor: row.actor || "private",
    offer_sku: row.offer_sku || "",
    campaign_id: row.campaign_id || "",
    variant_id: row.variant_id || "",
    source_ref: row.source_ref || "",
    next_action: row.next_action,
    review_file: row.review_file || "",
    command: row.command || "",
    safety_note: row.safety_note || "manual review required; no messages, payment action, or upload is automated"
  };
}

function fromFulfillment(rows) {
  return rows.map((row, index) => {
    const needsFix = row.status === "needs_delivery_fix";
    return action({
      action_id: `fulfillment-${index + 1}-${compact(row.order_id, "order")}`,
      priority: needsFix ? 100 : 95,
      lane: "fulfillment",
      status: row.status,
      title: needsFix ? `Fix delivery boundary before sending ${row.order_id}` : `Send prepared buyer delivery ${row.order_id}`,
      actor: compact(row.buyer || row.contact, "private buyer"),
      offer_sku: row.product,
      source_ref: row.order_dir,
      next_action: needsFix ? compact(row.issues, "fix deliverables before sending") : compact(row.next_action, "review and send manually"),
      review_file: row.order_dir,
      command: row.status === "prepared_waiting_manual_send" && row.type === "standard_content_order"
        ? `npm run complete-content-order-delivery -- --order="${row.order_dir}" --source="manual" --creator="${compact(row.buyer, "buyer")}" --next-due="${todayIso()}"`
        : "",
      safety_note: "send only concise-ready buyer deliverables; never attach manifest with private buyer details to a public channel"
    });
  });
}

function fromDeals(rows) {
  return rows.map((row, index) => action({
    action_id: `deal-${index + 1}-${compact(row.deal_id, "reply")}`,
    priority: row.stage === "paid_needs_fulfillment" ? 92 : 88,
    lane: "deal_desk",
    status: compact(row.stage, "active_deal"),
    title: row.stage === "paid_needs_fulfillment" ? `Verify payment then fulfill ${row.offer_sku}` : `Reply to active deal for ${row.offer_sku}`,
    actor: compact(row.creator, "private prospect"),
    offer_sku: row.offer_sku,
    source_ref: row.proof_url,
    next_action: compact(row.recommended_action, "review response and invoice drafts"),
    review_file: "dist/content-deal-desk/deal-desk.md",
    command: row.stage === "paid_needs_fulfillment" ? "review dist/content-deal-desk/fulfillment-commands.ps1 after external payment verification" : "",
    safety_note: "verify external payment before fulfillment; do not issue invoices or payment requests automatically"
  }));
}

function fromCustomerSuccess(rows) {
  return rows.map((row, index) => action({
    action_id: `customer-success-${index + 1}-${compact(row.followup_id, "followup")}`,
    priority: 82,
    lane: "customer_success",
    status: compact(row.recommended_action, "followup_due"),
    title: `Follow up after delivered order ${compact(row.order_id, "order")}`,
    actor: compact(row.creator, "private buyer"),
    offer_sku: compact(row.upsell_path, ""),
    source_ref: compact(row.order_dir, ""),
    next_action: "review feedback/testimonial/upsell draft and send manually only if appropriate",
    review_file: "dist/content-customer-success/followup-drafts.md",
    command: "",
    safety_note: "ask permission before quoting; do not publish testimonials automatically"
  }));
}

function fromRetention(rows) {
  return rows.map((row, index) => action({
    action_id: `retention-${index + 1}-${compact(row.subscriber_id, "subscriber")}`,
    priority: 78,
    lane: "subscription_retention",
    status: compact(row.action, "review_subscription"),
    title: compact(row.subject, "Review subscriber renewal/payment status"),
    actor: compact(row.subscriber_id || row.contact, "private subscriber"),
    offer_sku: "trendfoundry-proof-weekly",
    source_ref: "dist/content-subscription-retention/drafts.md",
    next_action: compact(row.next_operator_action, "review renewal/payment draft"),
    review_file: "dist/content-subscription-retention/drafts.md",
    command: "",
    safety_note: "do not deliver weekly pack until private CRM marks prepare_delivery"
  }));
}

function fromOutreachReview(rows, passedGateIds) {
  return rows.filter((row) => passedGateIds.has(compact(row.review_id))).map((row, index) => action({
    action_id: compact(row.review_id, `outreach-${index + 1}`),
    priority: 62 - index,
    lane: "outreach_review",
    status: compact(row.review_action, "review_before_send"),
    title: `Review one-to-one send pack: ${compact(row.subject, row.topic)}`,
    actor: compact(row.creator, "private prospect"),
    offer_sku: row.offer_sku,
    campaign_id: compact(row.campaign_id),
    variant_id: compact(row.variant_id),
    source_ref: compact(row.proof_url, ""),
    next_action: "review, personalize, and send manually only if safe",
    review_file: reviewPackPath(compact(row.review_id, "")),
    command: `npm run complete-content-outreach-send -- --review-id="${compact(row.review_id, "")}"`,
    safety_note: "send pack is reviewer-ready, not auto-send; record receipt only after manual send"
  }));
}

function fromSendBatch(rows) {
  return rows.map((row, index) => action({
    action_id: `send-batch-${index + 1}-${compact(row.review_id, "review")}`,
    priority: 72 - index,
    lane: "send_batch",
    status: compact(row.variant_match) === "yes" ? "recommended_variant" : "fallback_variant",
    title: `Review next send batch candidate: ${compact(row.subject, row.topic)}`,
    actor: compact(row.creator, "private prospect"),
    offer_sku: compact(row.offer_sku),
    campaign_id: compact(row.campaign_id),
    variant_id: compact(row.variant_id),
    source_ref: compact(row.review_file),
    next_action: compact(row.next_action, "review, personalize, and send manually only if safe"),
    review_file: compact(row.review_file),
    command: compact(row.command),
    safety_note: "selected from gate-passed unsent campaigns; send manually only after review and record receipt afterward"
  }));
}

function fromOutreachFollowups(rows) {
  return rows.map((row, index) => action({
    action_id: compact(row.followup_id, `followup-${index + 1}`),
    priority: 80 - index,
    lane: "outreach_followup",
    status: "due_followup",
    title: `Send reviewed follow-up: ${compact(row.subject, row.topic)}`,
    actor: compact(row.creator, "private prospect"),
    offer_sku: compact(row.offer_sku),
    campaign_id: compact(row.campaign_id),
    variant_id: compact(row.variant_id),
    source_ref: compact(row.review_file),
    next_action: "review follow-up draft, send manually if safe, then run the listed record-content-sale command",
    review_file: "dist/content-outreach-followups/followups.md",
    command: compact(row.command),
    safety_note: "follow-up is due and unreplied; manual review required before sending"
  }));
}

function fromCloseQueue(rows, existingOutreachIds) {
  return rows
    .filter((row) => !existingOutreachIds.has(`outreach-${String(row.close_rank).padStart(2, "0")}-${compact(row.creator).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`))
    .map((row, index) => action({
      action_id: `close-${compact(row.close_rank, String(index + 1))}`,
      priority: 50 - index,
      lane: "close_queue",
      status: compact(row.review_action, "review_close_queue"),
      title: `Prepare close draft for ${compact(row.topic, "current topic")}`,
      actor: compact(row.creator, "private prospect"),
      offer_sku: row.offer_sku,
      source_ref: row.proof_url,
      next_action: "turn close queue row into a reviewed outreach pack",
      review_file: "dist/content-close-pack/today-close-queue.md",
      command: "npm run content-outreach-review",
      safety_note: "do not expose prospect rows in public docs"
    }));
}

function fromTestimonials(manifest) {
  const count = Number(manifest.publishCandidateCount || 0);
  if (!count) return [];
  return [action({
    action_id: "testimonial-review",
    priority: 40,
    lane: "testimonial_review",
    status: "permission_review",
    title: `Review ${count} testimonial publish candidate(s)`,
    actor: "private buyers",
    offer_sku: "",
    source_ref: "dist/content-testimonials/publish-candidates.md",
    next_action: "verify explicit permission and remove outcome claims before reuse",
    review_file: "dist/content-testimonials/publish-candidates.md",
    command: "",
    safety_note: "never publish a quote without explicit permission and outcome-claim review"
  })];
}

function bucketCounts(actions) {
  return actions.reduce((acc, row) => {
    acc[row.lane] = (acc[row.lane] || 0) + 1;
    return acc;
  }, {});
}

function privateMarkdown({ generatedAt, actions }) {
  const top = actions.slice(0, 8);
  return `# TrendFoundry Content Action Brief

Generated: ${generatedAt}

Private local action brief. Do not publish buyer names, contacts, channels, prospect rows, or payment references from this file.

## Top Actions

| Priority | Lane | Status | Title | Actor | Variant | Campaign | Review File | Command |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- |
${top.map((row) => `| ${row.priority} | ${row.lane} | ${row.status} | ${row.title.replace(/\|/g, "/")} | ${row.actor.replace(/\|/g, "/")} | ${row.variant_id || "-"} | ${row.campaign_id || "-"} | ${row.review_file || "-"} | ${row.command ? `\`${row.command.replace(/\|/g, "/")}\`` : "-"} |`).join("\n") || "| - | - | - | No actions ready. | - | - | - | - | - |"}

## Full Queue

${actions.map((row) => `- [${row.priority}] ${row.lane}: ${row.title}\n  - Actor: ${row.actor}\n  - Campaign: ${row.campaign_id || "none"}\n  - Next: ${row.next_action}\n  - Review: ${row.review_file || "none"}\n  - Safety: ${row.safety_note}`).join("\n") || "- No content-side actions are due right now."}
`;
}

function publicMarkdown(manifest) {
  return `# TrendFoundry Content Action Brief

Generated: ${manifest.generatedAt}

This public report summarizes the private content-sales action queue. It does not expose buyer names, contacts, prospect rows, channels, private replies, or payment references.

## Current Counts

- Total private actions: ${manifest.actionCount}
- Top action lane: ${manifest.topActionLane || "none"}
- Needs manual send/review: ${manifest.manualReviewCount}
- Fulfillment-sensitive actions: ${manifest.fulfillmentSensitiveCount}
- Public-safe action rows exposed here: 0

## Lane Counts

| Lane | Count |
| --- | ---: |
${Object.entries(manifest.laneCounts).map(([lane, count]) => `| ${lane} | ${count} |`).join("\n") || "| none | 0 |"}

## Operator Flow

1. Review ignored \`dist/content-action-brief/action-brief.md\`.
2. Work from the highest priority row downward.
3. For outreach rows, only use send packs that passed \`content-outreach-gate\`; review before sending and record the send receipt afterward.
4. For fulfillment rows, verify external payment and attach only concise-ready buyer deliverables.

## Safety Boundary

- Does not send messages.
- Does not collect payment.
- Does not upload files.
- Does not build or overwrite the frontend.
- Does not expose private action rows in tracked docs.
- Does not promise views, subscribers, revenue, platform growth, or buyer outcomes.
`;
}

const generatedAt = new Date().toISOString();
const fulfillmentRows = parseCsv(await readText("dist/content-fulfillment-queue/fulfillment-queue.csv"));
const dealRows = parseCsv(await readText("dist/content-deal-desk/deal-desk.csv"));
const customerRows = parseCsv(await readText("dist/content-customer-success/followups.csv"));
const retentionRows = parseCsv(await readText("dist/content-subscription-retention/drafts.csv"));
const outreachRows = parseCsv(await readText("dist/content-outreach-review/review-board.csv"));
const outreachGateRows = parseCsv(await readText("dist/content-outreach-gate/checks.csv"));
const sendBatchRows = parseCsv(await readText("dist/content-send-batch/send-batch.csv"));
const outreachFollowupRows = parseCsv(await readText("dist/content-outreach-followups/followups.csv"));
const closeRows = parseCsv(await readText("dist/content-close-pack/today-close-queue.csv"));
const testimonialManifest = await readJson("dist/content-testimonials/manifest.json", {});

const outreachIds = new Set(outreachRows.map((row) => compact(row.review_id)));
const passedGateIds = new Set(outreachGateRows.filter((row) => row.status === "passed").map((row) => compact(row.review_id)));
const actions = [
  ...fromFulfillment(fulfillmentRows),
  ...fromDeals(dealRows),
  ...fromCustomerSuccess(customerRows),
  ...fromRetention(retentionRows),
  ...fromOutreachFollowups(outreachFollowupRows),
  ...fromSendBatch(sendBatchRows),
  ...fromOutreachReview(outreachRows, passedGateIds),
  ...fromCloseQueue(closeRows, outreachIds),
  ...fromTestimonials(testimonialManifest)
].sort((left, right) => Number(right.priority) - Number(left.priority) || left.action_id.localeCompare(right.action_id));

const manifest = {
  generatedAt,
  actionCount: actions.length,
  topActionLane: actions[0]?.lane || "",
  manualReviewCount: actions.filter((row) => row.next_action.toLowerCase().includes("review") || row.command).length,
  fulfillmentSensitiveCount: actions.filter((row) => row.lane === "fulfillment" || row.status.includes("paid")).length,
  laneCounts: bucketCounts(actions),
  inputs: {
    fulfillmentRows: fulfillmentRows.length,
    dealRows: dealRows.length,
    customerRows: customerRows.length,
    retentionRows: retentionRows.length,
    outreachFollowupRows: outreachFollowupRows.length,
    outreachRows: outreachRows.length,
    sendBatchRows: sendBatchRows.length,
    outreachGatePassedRows: passedGateIds.size,
    closeRows: closeRows.length,
    testimonialPublishCandidates: testimonialManifest.publishCandidateCount || 0
  },
  safety: {
    sendsMessages: false,
    collectsPayment: false,
    uploadsFiles: false,
    buildsFrontend: false,
    exposesPrivateActionRowsInDocs: false,
    noRevenuePromise: true,
    noViewPromise: true,
    noCredentialRequest: true
  }
};

await mkdir(docsDir, { recursive: true });
await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, "actions.csv"), toCsv(actions, [
  "action_id",
  "priority",
  "lane",
  "status",
  "title",
  "actor",
  "offer_sku",
  "campaign_id",
  "variant_id",
  "source_ref",
  "next_action",
  "review_file",
  "command",
  "safety_note"
]), "utf8");
await writeFile(path.join(outDir, "action-brief.md"), privateMarkdown({ generatedAt, actions }), "utf8");
await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
await writeFile(path.join(docsDir, "content-action-brief.md"), publicMarkdown(manifest), "utf8");

console.log(`Wrote ${path.join(docsDir, "content-action-brief.md")}`);
console.log(`Private actions: ${manifest.actionCount}`);
