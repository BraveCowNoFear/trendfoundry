import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const outDir = path.join(root, "dist", "content-revenue-model");

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows, columns) {
  return [columns.join(","), ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))].join("\n");
}

function product(products, sku, fallbackPrice) {
  return products.find((item) => item.sku === sku) || { sku, price_usd: fallbackPrice, billing: "one_time" };
}

function money(value) {
  return `USD ${Math.round(value)}`;
}

function scenarioRows({ prospects, dueToday, products }) {
  const scriptPack = product(products, "trendfoundry-proof-script-pack", 9);
  const weekly = product(products, "trendfoundry-proof-weekly", 19);
  const custom = product(products, "trendfoundry-proof-custom", 49);
  const reviewPerWorkday = Math.max(5, dueToday || 0);
  const weeklyReviewCapacity = reviewPerWorkday * 5;
  const monthlyReviewCapacity = weeklyReviewCapacity * 4;
  const currentBatch = prospects || 0;
  const assumptions = [
    {
      scenario: "conservative",
      reviewed_per_month: Math.min(monthlyReviewCapacity, Math.max(currentBatch, 20)),
      reply_rate: 0.08,
      paid_rate: 0.02,
      mix_script: 0.65,
      mix_weekly: 0.25,
      mix_custom: 0.10
    },
    {
      scenario: "base",
      reviewed_per_month: monthlyReviewCapacity,
      reply_rate: 0.15,
      paid_rate: 0.05,
      mix_script: 0.50,
      mix_weekly: 0.35,
      mix_custom: 0.15
    },
    {
      scenario: "stretch",
      reviewed_per_month: monthlyReviewCapacity,
      reply_rate: 0.25,
      paid_rate: 0.10,
      mix_script: 0.35,
      mix_weekly: 0.45,
      mix_custom: 0.20
    }
  ];
  return assumptions.map((row) => {
    const replies = row.reviewed_per_month * row.reply_rate;
    const paid = row.reviewed_per_month * row.paid_rate;
    const scriptCustomers = paid * row.mix_script;
    const weeklyCustomers = paid * row.mix_weekly;
    const customCustomers = paid * row.mix_custom;
    const oneTimeRevenue = scriptCustomers * Number(scriptPack.price_usd || 9);
    const newMrr = weeklyCustomers * Number(weekly.price_usd || 19) + customCustomers * Number(custom.price_usd || 49);
    return {
      ...row,
      review_per_workday: reviewPerWorkday,
      weekly_review_capacity: weeklyReviewCapacity,
      expected_replies: Number(replies.toFixed(1)),
      expected_paid_customers: Number(paid.toFixed(1)),
      script_customers: Number(scriptCustomers.toFixed(1)),
      weekly_customers: Number(weeklyCustomers.toFixed(1)),
      custom_customers: Number(customCustomers.toFixed(1)),
      one_time_revenue_usd: Number(oneTimeRevenue.toFixed(2)),
      new_mrr_usd: Number(newMrr.toFixed(2)),
      month_one_cash_usd: Number((oneTimeRevenue + newMrr).toFixed(2))
    };
  });
}

function targets(products) {
  const weekly = Number(product(products, "trendfoundry-proof-weekly", 19).price_usd || 19);
  const custom = Number(product(products, "trendfoundry-proof-custom", 49).price_usd || 49);
  return [500, 2000].map((target) => ({
    target_mrr_usd: target,
    weekly_only_subscribers: Math.ceil(target / weekly),
    custom_only_subscribers: Math.ceil(target / custom),
    mixed_70_30_subscribers: Math.ceil(target / (weekly * 0.7 + custom * 0.3))
  }));
}

function markdown({ rows, targetRows, crm, prospecting, subscription }) {
  return `# TrendFoundry Content Revenue Model

Generated: ${new Date().toISOString()}

This is a planning model for the content product ladder. It uses current local prospecting, CRM, product listing, and subscription plan outputs. It is not a financial guarantee, performance promise, or investment advice.

## Current Inputs

- Local prospects: ${prospecting.count}
- CRM rows: ${crm.count}
- Due today: ${crm.dueToday}
- Due this week: ${crm.dueThisWeek}
- Weekly subscription delivery dates: ${(subscription.deliveryDates || []).join(", ")}

## Scenario Model

| Scenario | Reviewed/month | Reply rate | Paid rate | Paid customers | One-time cash | New MRR | Month-one cash |
| --- | --- | --- | --- | --- | --- | --- | --- |
${rows.map((row) => `| ${row.scenario} | ${row.reviewed_per_month} | ${(row.reply_rate * 100).toFixed(0)}% | ${(row.paid_rate * 100).toFixed(0)}% | ${row.expected_paid_customers} | ${money(row.one_time_revenue_usd)} | ${money(row.new_mrr_usd)} | ${money(row.month_one_cash_usd)} |`).join("\n")}

## MRR Targets

| Target MRR | Weekly-only subscribers | Custom-only subscribers | Mixed 70/30 subscribers |
| --- | --- | --- | --- |
${targetRows.map((row) => `| ${money(row.target_mrr_usd)} | ${row.weekly_only_subscribers} | ${row.custom_only_subscribers} | ${row.mixed_70_30_subscribers} |`).join("\n")}

## Next Sales Actions

1. Review 5 CRM rows today from \`dist/content-sales-crm/pipeline.md\`.
2. Send only after manual review and first-sentence personalization.
3. Push low-friction buyers to the USD 9 script pack.
4. Push recurring buyers to the USD 19 weekly plan only if they want a repeatable weekly pipeline.
5. Push custom buyers to the USD 49 pack only when they name a narrow niche.
6. Update \`data/content-sales-crm/overrides.csv\` after each manual action.

## Safety Boundary

- Planning model only.
- No automatic sending.
- No payment collection.
- No sensitive payment or account data request.
- No promise of views, subscribers, revenue, platform growth, or buyer outcomes.
`;
}

const listing = await readJson("dist/content-listing/products.json");
const prospecting = await readJson("dist/content-prospecting/manifest.json");
const crm = await readJson("dist/content-sales-crm/manifest.json");
const subscription = await readJson("dist/content-subscription-plan/manifest.json");
const products = listing.products || [];
const rows = scenarioRows({ prospects: prospecting.count, dueToday: crm.dueToday, products });
const targetRows = targets(products);
const manifest = {
  generatedAt: new Date().toISOString(),
  sourceProductsGeneratedAt: listing.generatedAt,
  prospectCount: prospecting.count,
  crmRows: crm.count,
  dueToday: crm.dueToday,
  dueThisWeek: crm.dueThisWeek,
  scenarios: rows,
  targets: targetRows,
  safety: {
    sendsMessages: false,
    collectsPayment: false,
    requestsSensitiveData: false,
    noFinancialGuarantee: true,
    noRevenuePromise: true,
    noViewPromise: true
  }
};

await mkdir(docsDir, { recursive: true });
await mkdir(outDir, { recursive: true });
await writeFile(path.join(docsDir, "content-revenue-model.md"), markdown({ rows, targetRows, crm, prospecting, subscription }), "utf8");
await writeFile(path.join(outDir, "scenarios.csv"), toCsv(rows, [
  "scenario",
  "review_per_workday",
  "weekly_review_capacity",
  "reviewed_per_month",
  "reply_rate",
  "paid_rate",
  "expected_replies",
  "expected_paid_customers",
  "script_customers",
  "weekly_customers",
  "custom_customers",
  "one_time_revenue_usd",
  "new_mrr_usd",
  "month_one_cash_usd"
]), "utf8");
await writeFile(path.join(outDir, "targets.csv"), toCsv(targetRows, [
  "target_mrr_usd",
  "weekly_only_subscribers",
  "custom_only_subscribers",
  "mixed_70_30_subscribers"
]), "utf8");
await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

console.log(`Wrote ${path.join(docsDir, "content-revenue-model.md")}`);
console.log(`Revenue scenarios: ${rows.length}`);
