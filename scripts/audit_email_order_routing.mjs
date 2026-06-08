import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const outDir = path.join(root, "dist", "email-order-routing");

function argValue(name, fallback = "") {
  const prefix = `--${name}=`;
  const arg = process.argv.slice(2).find((value) => value.startsWith(prefix));
  const envName = name.toUpperCase().replace(/-/g, "_");
  return arg ? arg.slice(prefix.length) : process.env[envName] || fallback;
}

function resolvePath(value) {
  return path.isAbsolute(value) ? value : path.join(root, value);
}

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

function routeFor(order) {
  if (order.stage !== "paid_needs_fulfillment") {
    return {
      route: "payment_reply_only",
      handler: "intake-email-orders",
      expectedOutput: "dist/payment-replies/<order-id>/",
      canFulfill: "no",
      reason: "not_paid_needs_fulfillment"
    };
  }
  if (order.tier === "weekly-brief") {
    return {
      route: "weekly_subscription",
      handler: "sync-email-subscriptions -> content-subscription-crm -> content-subscription-due",
      expectedOutput: "dist/content-subscriptions/<date>-<subscriber>-week-<n>/",
      canFulfill: "yes",
      reason: "paid_weekly_order"
    };
  }
  if (order.tier === "custom-niche") {
    return {
      route: "custom_proof_pack",
      handler: "fulfill-custom-email-orders",
      expectedOutput: "dist/custom-email-orders/<order-id>/",
      canFulfill: "yes",
      reason: "paid_custom_order"
    };
  }
  return {
    route: "standard_sample_pack",
    handler: "fulfill-email-orders",
    expectedOutput: "dist/orders/<order-id>/",
    canFulfill: "yes",
    reason: "paid_standard_order"
  };
}

function markdown({ generatedAt, rows, counts }) {
  const tableRows = rows.map((row) => `| ${row.order_id} | ${row.tier} | ${row.stage} | ${row.route} | ${row.handler} | ${row.can_fulfill} | ${row.reason} |`);
  return `# TrendFoundry Email Order Routing Audit

Generated: ${generatedAt}

This audit proves which local fulfillment path each email order should use. It does not send messages, collect payment, upload files, or build the frontend.

## Counts

- Orders reviewed: ${counts.total}
- Payment reply only: ${counts.paymentReply}
- Standard sample pack: ${counts.standard}
- Weekly subscription: ${counts.weekly}
- Custom proof pack: ${counts.custom}
- Unknown/blocked routes: ${counts.blocked}

## Routing Table

| Order ID | Tier | Stage | Route | Handler | Can fulfill | Reason |
| --- | --- | --- | --- | --- | --- | --- |
${tableRows.length ? tableRows.join("\n") : "| - | - | - | - | - | - | No email orders found. |"}

## Safety Boundary

- No messages are sent.
- No payment action is attempted.
- No files are uploaded.
- No frontend files are built or overwritten.
- Buyer contacts are not exposed in this tracked document.
- Weekly and custom paid orders are intentionally excluded from generic email fulfillment.
- No promise of views, subscribers, revenue, platform growth, or buyer outcomes.
`;
}

const intakeFile = resolvePath(argValue("intake-file", "dist/email-order-intake/orders.json"));
const intake = JSON.parse(await readFile(intakeFile, "utf8"));
const orders = intake.orders || [];
const rows = orders.map((order) => {
  const route = routeFor(order);
  return {
    order_id: compact(order.orderId, "unknown"),
    tier: compact(order.tier, "unknown"),
    stage: compact(order.stage, "unknown"),
    route: route.route,
    handler: route.handler,
    expected_output: route.expectedOutput,
    can_fulfill: route.canFulfill,
    reason: route.reason
  };
});
const counts = {
  total: rows.length,
  paymentReply: rows.filter((row) => row.route === "payment_reply_only").length,
  standard: rows.filter((row) => row.route === "standard_sample_pack").length,
  weekly: rows.filter((row) => row.route === "weekly_subscription").length,
  custom: rows.filter((row) => row.route === "custom_proof_pack").length,
  blocked: rows.filter((row) => !["payment_reply_only", "standard_sample_pack", "weekly_subscription", "custom_proof_pack"].includes(row.route)).length
};
const generatedAt = new Date().toISOString();
const manifest = {
  generatedAt,
  intakeFile: path.relative(root, intakeFile).replace(/\\/g, "/"),
  counts,
  routes: rows,
  safety: {
    sendsMessages: false,
    collectsPayment: false,
    uploadsFiles: false,
    buildsFrontend: false,
    exposesBuyerContactsInDocs: false,
    genericFulfillmentExcludesWeekly: true,
    genericFulfillmentExcludesCustom: true,
    noRevenuePromise: true,
    noViewPromise: true
  }
};

await mkdir(docsDir, { recursive: true });
await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, "routes.csv"), toCsv(rows, ["order_id", "tier", "stage", "route", "handler", "expected_output", "can_fulfill", "reason"]), "utf8");
await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
await writeFile(path.join(docsDir, "email-order-routing.md"), markdown({ generatedAt, rows, counts }), "utf8");

console.log(`Wrote ${path.join(docsDir, "email-order-routing.md")}`);
console.log(`Email order routes audited: ${rows.length}`);
