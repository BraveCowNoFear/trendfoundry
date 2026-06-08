import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const outDir = path.join(root, "dist", "content-deal-desk");
const privateDir = path.join(root, "data", "content-sales-crm");

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

async function readCsvMaybe(file) {
  try {
    return parseCsv(await readFile(file, "utf8"));
  } catch {
    return [];
  }
}

async function readJsonMaybe(relativePath, fallback = {}) {
  try {
    return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
  } catch {
    return fallback;
  }
}

function safeId(value, fallback = "deal") {
  return compact(value, fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || fallback;
}

function productFor(row, products) {
  const fit = compact(row.product_fit || row.offer_sku || "");
  if (fit.includes("custom")) return products.find((product) => product.sku === "trendfoundry-proof-custom") || products.at(-1) || {};
  if (fit.includes("weekly")) return products.find((product) => product.sku === "trendfoundry-proof-weekly") || products[1] || {};
  return products.find((product) => product.sku === "trendfoundry-proof-script-pack") || products[0] || {};
}

function classifyReply(row) {
  const text = `${row.summary || ""} ${row.objection || ""} ${row.notes || ""}`.toLowerCase();
  if (/paid|bought|buy|invoice|order|receipt|payment/.test(text)) return "conversion";
  if (/price|expensive|budget|cost|\$/.test(text)) return "pricing";
  if (/niche|specific|custom|audience|channel|relevant/.test(text)) return "niche_focus";
  if (/weekly|subscription|monthly|recurring|calendar/.test(text)) return "subscription_fit";
  if (/sample|proof|demo|quality|example/.test(text)) return "proof_quality";
  if (/not interested|irrelevant|not fit|stop/.test(text)) return "not_fit";
  return "unclassified";
}

function stageFrom(row, reply) {
  return compact(reply?.stage || row.stage || "draft_review_before_sending");
}

function recommendedAction(stage, replyClass) {
  if (stage === "paid_needs_fulfillment" || replyClass === "conversion") return "verify_external_payment_then_fulfill";
  if (stage === "qualified_needs_custom_pack" || replyClass === "niche_focus") return "draft_custom_pack_offer";
  if (stage === "replied_needs_response") return "send_reviewed_reply";
  if (replyClass === "pricing") return "offer_usd_9_paid_test";
  if (replyClass === "subscription_fit") return "show_weekly_calendar";
  if (replyClass === "not_fit") return "archive_no_followup";
  return "ask_one_feedback_question";
}

function responseDraft({ row, reply, product, replyClass }) {
  const creator = compact(row.creator, "there");
  const topic = compact(row.topic, "your AI/developer creator workflow");
  const sampleUrl = compact(product.free_sample_url, "https://bravecownofear.github.io/trendfoundry/trendfoundry-free-sample-pack.zip");
  const orderUrl = compact(product.order_url, "https://bravecownofear.github.io/trendfoundry/order/");
  const replySummary = compact(reply?.summary, "your note");
  if (replyClass === "pricing") {
    return `Hi ${creator},\n\nThanks for the note. To keep the test low-risk, I would start with the USD 9 one-off proof-first script pack rather than a subscription. It gives you one recordable script plus the episode workbench and editorial audit.\n\nFree sample: ${sampleUrl}\nOrder/review page: ${orderUrl}\n\nNo promises about views, subscribers, revenue, platform growth, or outcomes.`;
  }
  if (replyClass === "niche_focus") {
    return `Hi ${creator},\n\nThanks. The cleanest next step is a custom proof pack for the narrow lane you named. I would tune it around "${topic}" and deliver one custom-proof-pack.md with concrete proof assets and recordable angles.\n\nIf you want it, reply with the exact niche wording you want used. I will only prepare delivery after external payment confirmation.\n\nNo promises about views, subscribers, revenue, platform growth, or outcomes.`;
  }
  if (replyClass === "subscription_fit") {
    return `Hi ${creator},\n\nMakes sense. The weekly option is best only if you want a recurring delivery calendar. The current product is USD 19/month and delivers one proof-first pack per week.\n\nI can start with one USD 9 paid test first, or set up the weekly pack after external payment confirmation.\n\nNo promises about views, subscribers, revenue, platform growth, or outcomes.`;
  }
  if (replyClass === "conversion") {
    return `Hi ${creator},\n\nThanks, I saw your message about ${replySummary}. Before delivery, I need the external payment confirmation reference recorded in the local order notes. After that I will prepare the buyer-only files for ${product.title || "TrendFoundry"}.\n\nI will not ask for card numbers, passwords, private IDs, wallet seeds, or sensitive account data by email.`;
  }
  return `Hi ${creator},\n\nThanks for replying. The useful next question is: which proof asset would you actually record this week for "${topic}"?\n\nIf the free sample is enough, no need to buy. If you want a paid test, the relevant option is ${product.title || "TrendFoundry Proof-First Script Pack"} at USD ${product.price_usd || 9}.\n\nNo promises about views, subscribers, revenue, platform growth, or outcomes.`;
}

function invoiceDraft({ row, product }) {
  return [
    `Invoice draft for ${compact(row.creator, "creator")}`,
    "",
    `Product: ${product.title || "TrendFoundry Proof-First Script Pack"}`,
    `SKU: ${product.sku || "trendfoundry-proof-script-pack"}`,
    `Amount: USD ${product.price_usd || 9}`,
    `Billing: ${product.billing || "one_time"}`,
    `Buyer/channel reference: ${compact(row.proof_url, "not-provided")}`,
    "",
    "Payment must be confirmed externally before fulfillment.",
    "Do not request card numbers, passwords, private IDs, wallet seeds, or sensitive account data by email.",
    "No promise of views, subscribers, revenue, platform growth, or buyer outcomes."
  ].join("\n");
}

function fulfillmentCommand({ row, product }) {
  const buyer = compact(row.creator, "buyer").replace(/"/g, "'");
  const channel = compact(row.proof_url, "not-provided").replace(/"/g, "'");
  const orderId = `${safeId(product.sku, "product")}-${safeId(row.source, "source")}-${safeId(row.creator, "buyer")}`;
  if (product.sku === "trendfoundry-proof-weekly") {
    return `npm run record-content-subscription -- --subscriber="${buyer}" --contact="<buyer-contact-after-review>" --channel="${channel}" --payment-ref="<external-confirmation-id>" --next-delivery-date="<YYYY-MM-DD>"\n` +
      "npm run content-subscription-crm\nnpm run content-subscription-due";
  }
  if (product.sku === "trendfoundry-proof-custom") {
    const niche = compact(row.topic, "AI video creators").replace(/"/g, "'");
    return `npm run custom-proof-pack -- --niche="${niche}" --platform="${compact(row.source, "YouTube")}" --buyer="${buyer}" --channel="${channel}"`;
  }
  return `npm run buyer-pack\nnpm run fulfill-content -- --buyer="${buyer}" --contact="<buyer-contact-after-review>" --channel="${channel}" --product="${product.sku || "trendfoundry-proof-script-pack"}" --payment-ref="<external-confirmation-id>" --order-id="${orderId}"`;
}

function mergeDeals({ pipeline, replies, products }) {
  const byKey = new Map(pipeline.map((row) => [`${row.source}:${row.creator}`.toLowerCase(), row]));
  const replyRows = replies.map((reply) => {
    const key = `${reply.source}:${reply.creator}`.toLowerCase();
    const row = byKey.get(key) || {
      source: reply.source,
      creator: reply.creator,
      topic: reply.summary,
      proof_url: "",
      product_fit: "proof-script-pack",
      stage: reply.stage || "replied_needs_response"
    };
    return { row, reply };
  });
  const pipelineRows = pipeline
    .filter((row) => ["replied_needs_response", "paid_needs_fulfillment", "qualified_needs_custom_pack"].includes(row.stage))
    .filter((row) => !replies.some((reply) => `${reply.source}:${reply.creator}`.toLowerCase() === `${row.source}:${row.creator}`.toLowerCase()))
    .map((row) => ({ row, reply: null }));
  return [...replyRows, ...pipelineRows].map(({ row, reply }, index) => {
    const product = productFor(row, products);
    const replyClass = reply ? classifyReply(reply) : "pipeline_stage";
    const stage = stageFrom(row, reply);
    const deal = {
      deal_id: `deal-${String(index + 1).padStart(2, "0")}-${safeId(row.creator, "creator")}`,
      creator: compact(row.creator, "unknown"),
      source: compact(row.source, "unknown"),
      topic: compact(row.topic || reply?.summary, "not-provided"),
      proof_url: compact(row.proof_url, "not-provided"),
      stage,
      reply_class: replyClass,
      recommended_action: recommendedAction(stage, replyClass),
      offer_sku: product.sku || "trendfoundry-proof-script-pack",
      offer_title: product.title || "TrendFoundry Proof-First Script Pack",
      offer_price_usd: product.price_usd || 9,
      billing: product.billing || "one_time",
      response_draft: "",
      invoice_draft: "",
      fulfillment_command: "",
      safety_review: "review_before_sending_or_fulfillment"
    };
    deal.response_draft = responseDraft({ row, reply, product, replyClass });
    deal.invoice_draft = invoiceDraft({ row, product });
    deal.fulfillment_command = fulfillmentCommand({ row, product });
    return deal;
  });
}

function playbookRows(products) {
  const script = products.find((product) => product.sku === "trendfoundry-proof-script-pack") || products[0] || {};
  const weekly = products.find((product) => product.sku === "trendfoundry-proof-weekly") || products[1] || script;
  const custom = products.find((product) => product.sku === "trendfoundry-proof-custom") || products[2] || script;
  return [
    {
      objection: "price_sensitive",
      recommended_offer: script.sku || "trendfoundry-proof-script-pack",
      response: `Start with the USD ${script.price_usd || 9} one-off proof-first script pack before any subscription.`
    },
    {
      objection: "wants_narrower_niche",
      recommended_offer: custom.sku || "trendfoundry-proof-custom",
      response: "Ask for the exact niche wording, then prepare a custom proof pack only after external payment confirmation."
    },
    {
      objection: "asks_for_recurring_help",
      recommended_offer: weekly.sku || "trendfoundry-proof-weekly",
      response: `Show the four-week delivery calendar before asking for USD ${weekly.price_usd || 19}/month.`
    },
    {
      objection: "asks_for_more_proof",
      recommended_offer: script.sku || "trendfoundry-proof-script-pack",
      response: "Send the free sample and ask which proof asset they would actually record this week."
    }
  ];
}

function markdown({ deals, playbook }) {
  return `# TrendFoundry Content Deal Desk

Generated: ${new Date().toISOString()}

Private local deal desk. Do not publish. Review every row before sending a reply, issuing an invoice, or preparing fulfillment.

## Active Deals

| Deal | Creator | Stage | Reply class | Action | Offer |
| --- | --- | --- | --- | --- | --- |
${deals.map((deal) => `| ${deal.deal_id} | ${deal.creator.replace(/\|/g, "/")} | ${deal.stage} | ${deal.reply_class} | ${deal.recommended_action} | ${deal.offer_sku} |`).join("\n") || "| - | - | - | - | - | No active reply or paid deal rows. |"}

## Deal Drafts

${deals.map((deal) => `### ${deal.deal_id}

- Creator: ${deal.creator}
- Source: ${deal.source}
- Topic: ${deal.topic}
- Proof URL: ${deal.proof_url}
- Offer: ${deal.offer_title} (${deal.offer_sku})
- Price: USD ${deal.offer_price_usd} / ${deal.billing}

#### Reviewed Reply Draft

\`\`\`text
${deal.response_draft}
\`\`\`

#### Invoice Draft

\`\`\`text
${deal.invoice_draft}
\`\`\`

#### Fulfillment Command After External Payment Confirmation

\`\`\`powershell
${deal.fulfillment_command}
\`\`\`
`).join("\n") || "No active deal drafts yet. Use the objection playbook below after a reply arrives."}

## Objection Playbook

| Objection | Offer | Response |
| --- | --- | --- |
${playbook.map((row) => `| ${row.objection} | ${row.recommended_offer} | ${row.response.replace(/\|/g, "/")} |`).join("\n")}

## Safety

- No automatic sending.
- No automatic invoicing or payment collection.
- No fulfillment before external payment confirmation.
- No request for card numbers, passwords, private IDs, wallet seeds, or sensitive account data.
- No promise of views, subscribers, revenue, platform growth, or buyer outcomes.
`;
}

function publicDoc({ deals, playbook }) {
  const actionCounts = Object.fromEntries([...new Set(deals.map((deal) => deal.recommended_action))].map((action) => [action, deals.filter((deal) => deal.recommended_action === action).length]));
  return `# TrendFoundry Content Deal Desk

Generated: ${new Date().toISOString()}

This step turns private replies and CRM deal stages into reviewer-ready replies, invoice drafts, and fulfillment commands. Detailed buyer/prospect rows stay in ignored \`dist/content-deal-desk/\`.

## Current Counts

- Active deal rows: ${deals.length}
- Objection playbook rows: ${playbook.length}
- Action mix: ${Object.entries(actionCounts).map(([action, count]) => `${action}=${count}`).join(", ") || "none"}

## Operator Workflow

1. Summarize real replies in ignored \`data/content-sales-crm/replies.csv\`.
2. Run \`npm run content-deal-desk\` or full \`npm run content-ops\`.
3. Review \`dist/content-deal-desk/deal-desk.md\`.
4. Send a reply manually only after checking the source, offer, and safety checklist.
5. Record external payment confirmation before running any fulfillment command.
6. After fulfillment, update the ignored CRM override/status files.

## Safety Boundary

- Does not send messages.
- Does not issue invoices automatically.
- Does not collect payment.
- Does not fulfill before external payment confirmation.
- Does not request sensitive payment or account data.
- Does not publish private buyer/prospect rows.
- Does not promise views, subscribers, revenue, platform growth, or buyer outcomes.
`;
}

const pipeline = await readCsvMaybe(path.join(root, "dist", "content-sales-crm", "pipeline.csv"));
const replies = await readCsvMaybe(path.join(privateDir, "replies.csv"));
const { products = [] } = await readJsonMaybe("dist/content-listing/products.json", { products: [] });
const deals = mergeDeals({ pipeline, replies, products });
const playbook = playbookRows(products);
const manifest = {
  generatedAt: new Date().toISOString(),
  privateReplyRows: replies.length,
  pipelineRows: pipeline.length,
  activeDealCount: deals.length,
  playbookCount: playbook.length,
  actionCounts: Object.fromEntries([...new Set(deals.map((deal) => deal.recommended_action))].map((action) => [action, deals.filter((deal) => deal.recommended_action === action).length])),
  offerSkus: [...new Set([...deals.map((deal) => deal.offer_sku), ...playbook.map((row) => row.recommended_offer)])],
  safety: {
    sendsMessages: false,
    issuesInvoicesAutomatically: false,
    collectsPayment: false,
    fulfillsBeforePaymentConfirmation: false,
    exposesPrivateDealsInDocs: false,
    requestsSensitiveData: false,
    noRevenuePromise: true,
    noViewPromise: true
  }
};

await mkdir(docsDir, { recursive: true });
await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
await writeFile(path.join(outDir, "deal-desk.csv"), toCsv(deals, [
  "deal_id",
  "creator",
  "source",
  "topic",
  "proof_url",
  "stage",
  "reply_class",
  "recommended_action",
  "offer_sku",
  "offer_title",
  "offer_price_usd",
  "billing",
  "safety_review"
]), "utf8");
await writeFile(path.join(outDir, "response-drafts.md"), deals.map((deal) => `## ${deal.deal_id}\n\n\`\`\`text\n${deal.response_draft}\n\`\`\`\n`).join("\n") || "No active response drafts.\n", "utf8");
await writeFile(path.join(outDir, "invoice-drafts.md"), deals.map((deal) => `## ${deal.deal_id}\n\n\`\`\`text\n${deal.invoice_draft}\n\`\`\`\n`).join("\n") || "No active invoice drafts.\n", "utf8");
await writeFile(path.join(outDir, "fulfillment-commands.ps1"), deals.map((deal) => `# ${deal.deal_id}\n# Run only after external payment confirmation.\n${deal.fulfillment_command}\n`).join("\n") || "# No active fulfillment commands.\n", "utf8");
await writeFile(path.join(outDir, "reply-template.csv"), "source,creator,summary,objection,stage,notes\n", "utf8");
await writeFile(path.join(outDir, "objection-playbook.csv"), toCsv(playbook, ["objection", "recommended_offer", "response"]), "utf8");
await writeFile(path.join(outDir, "deal-desk.md"), markdown({ deals, playbook }), "utf8");
await writeFile(path.join(docsDir, "content-deal-desk.md"), publicDoc({ deals, playbook }), "utf8");

console.log(`Wrote ${path.join(docsDir, "content-deal-desk.md")}`);
console.log(`Active deal rows: ${deals.length}`);
