import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { contactEmail } from "./lib/fulfillment.mjs";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const outDir = path.join(root, "dist", "content-subscription-plan");
const samplePack = "https://bravecownofear.github.io/trendfoundry/trendfoundry-free-sample-pack.zip";
const orderPage = "https://bravecownofear.github.io/trendfoundry/order/";

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

function compact(value, fallback = "") {
  return String(value || fallback).replace(/\s+/g, " ").trim();
}

function sentence(value, fallback = "") {
  return compact(value, fallback).replace(/[.。]+$/g, "");
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows, columns) {
  return [columns.join(","), ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))].join("\n");
}

function nextMonday() {
  const date = new Date();
  const day = date.getUTCDay();
  const delta = day === 1 ? 7 : (8 - day) % 7 || 7;
  date.setUTCDate(date.getUTCDate() + delta);
  return date;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function sourceLabel(source) {
  return {
    github: "GitHub",
    bilibili: "Bilibili",
    youtube: "YouTube",
    hn: "Hacker News",
    arxiv: "arXiv"
  }[source] || source || "Public source";
}

function themeFor(item) {
  const text = `${item.title} ${item.summary} ${item.sourceQuery}`.toLowerCase();
  if (/comfy|video|prompt|film|workflow/.test(text)) return "AI video workflow proof";
  if (/agent|mcp|coding|github|developer/.test(text)) return "AI agent / developer workflow proof";
  if (/creator|economy|youtube|bilibili/.test(text)) return "creator economy signal proof";
  if (/paper|arxiv|research/.test(text)) return "research-to-product proof";
  return "AI/developer creator proof";
}

function selectWeeklyItems(items) {
  const selected = [];
  const usedThemes = new Set();
  const candidates = [...items]
    .filter((item) => (item.qualityRisk || "normal") === "normal")
    .filter((item) => ["high", "medium"].includes(item.monetizationFit || ""))
    .sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
  for (const item of candidates) {
    const theme = themeFor(item);
    if (usedThemes.has(theme) && selected.length < 3) continue;
    selected.push(item);
    usedThemes.add(theme);
    if (selected.length >= 4) break;
  }
  for (const item of candidates) {
    if (selected.length >= 4) break;
    if (!selected.some((chosen) => chosen.url === item.url)) selected.push(item);
  }
  return selected;
}

function proofAsset(item) {
  if (item.source === "github") return "README/quickstart capture, first output, and one blocker note";
  if (item.source === "bilibili" || item.source === "youtube") return "source claim, tiny reproduction input, before/after table, and skip-condition slide";
  if (item.source === "hn") return "thread URL, three comment clusters, one do/don't checklist, and one counterexample";
  if (item.source === "arxiv") return "abstract, toy example, mechanism slide, and product gap";
  return "source capture plus one input/output proof";
}

function titleFor(item) {
  return compact(item.deliverables?.youtubeTitles?.[0] || item.deliverables?.bilibiliTitles?.[0] || item.title);
}

function weekRows(items) {
  const start = nextMonday();
  return items.map((item, index) => {
    const weekStart = addDays(start, index * 7);
    const deliveryDate = addDays(weekStart, 2);
    return {
      week: index + 1,
      week_start: isoDate(weekStart),
      delivery_date: isoDate(deliveryDate),
      theme: themeFor(item),
      lead_episode: titleFor(item),
      source: sourceLabel(item.source),
      proof_url: item.url,
      proof_asset: proofAsset(item),
      subscriber_value: "one ready-to-record script, three backup candidates, one limitation card, and one recording checklist",
      retention_note: sentence(item.deliverables?.whyNow, "This week has enough public evidence to justify a proof-first episode"),
      safety_line: sentence(item.deliverables?.limitation, "State who should skip this workflow before the CTA")
    };
  });
}

function emailDraft(row) {
  return `## Week ${row.week}: ${row.theme}

Subject: TrendFoundry weekly proof pack - ${row.lead_episode}

Hi,

This week's TrendFoundry proof pack is ready.

Start with: ${row.lead_episode}
Source: ${row.proof_url}
Proof to record: ${row.proof_asset}

Why this week: ${row.retention_note}.

What you receive:
- one ready-to-record script
- three backup candidates
- one limitation card
- one recording checklist

Safety note: ${row.safety_line}.

This is a creator planning and production aid. It does not promise views, subscribers, revenue, platform growth, or buyer outcomes.

Best,
TrendFoundry
${contactEmail}
`;
}

function markdown(rows, weeklyProduct) {
  return `# TrendFoundry Weekly Subscription Plan

Generated: ${new Date().toISOString()}

This turns the USD ${weeklyProduct?.price_usd || 19}/month weekly proof pack into a repeatable four-week fulfillment plan. It creates reviewable delivery and retention drafts; it does not send messages, collect payment, or upload files.

## Subscription Promise

- One proof-first weekly script pack.
- One lead episode with proof asset and limitation line.
- Three backup candidates from the current signal pool.
- One subscriber email draft.
- No promise of views, subscribers, revenue, platform growth, or buyer outcomes.

## Four-Week Calendar

| Week | Week start | Delivery | Theme | Lead episode | Proof asset |
| --- | --- | --- | --- | --- | --- |
${rows.map((row) => `| ${row.week} | ${row.week_start} | ${row.delivery_date} | ${row.theme} | ${row.lead_episode.replace(/\|/g, "/")} | ${row.proof_asset.replace(/\|/g, "/")} |`).join("\n")}

## Subscriber Emails

${rows.map(emailDraft).join("\n")}

## Retention Checklist

1. Send only after external payment/subscription confirmation.
2. Deliver the weekly pack by the delivery date.
3. Ask one feedback question: which proof was easiest to record?
4. If a proof cannot be recorded, replace it with one backup candidate before delivery.
5. Track churn risk if the subscriber skips two consecutive weeks.

## Links

- Free sample pack: ${samplePack}
- Manual order page: ${orderPage}
`;
}

const latest = await readJson("data/latest.json");
const listing = await readJson("dist/content-listing/products.json");
const weeklyProduct = (listing.products || []).find((product) => product.sku === "trendfoundry-proof-weekly");
const rows = weekRows(selectWeeklyItems(latest.items || []));
const manifest = {
  generatedAt: new Date().toISOString(),
  dataGeneratedAt: latest.generatedAt,
  productSku: "trendfoundry-proof-weekly",
  priceUsd: weeklyProduct?.price_usd || 19,
  billing: weeklyProduct?.billing || "monthly",
  weeks: rows.length,
  deliveryDates: rows.map((row) => row.delivery_date),
  leadEpisodes: rows.map((row) => row.lead_episode),
  buyerDeliverables: ["weekly-proof-pack.md", "subscriber-email.md"],
  safety: {
    sendsMessages: false,
    collectsPayment: false,
    uploadsFiles: false,
    requiresExternalSubscriptionConfirmation: true,
    noRevenuePromise: true,
    noViewPromise: true,
    noCredentialRequest: true
  }
};

await mkdir(docsDir, { recursive: true });
await mkdir(outDir, { recursive: true });
await writeFile(path.join(docsDir, "content-subscription-plan.md"), markdown(rows, weeklyProduct), "utf8");
await writeFile(path.join(outDir, "calendar.csv"), toCsv(rows, [
  "week",
  "week_start",
  "delivery_date",
  "theme",
  "lead_episode",
  "source",
  "proof_url",
  "proof_asset",
  "subscriber_value",
  "retention_note",
  "safety_line"
]), "utf8");
await writeFile(path.join(outDir, "subscriber-emails.md"), rows.map(emailDraft).join("\n"), "utf8");
await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

console.log(`Wrote ${path.join(docsDir, "content-subscription-plan.md")}`);
console.log(`Weekly subscription plan: ${rows.length} weeks`);
