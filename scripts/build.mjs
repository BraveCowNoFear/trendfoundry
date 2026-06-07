import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const data = JSON.parse(await readFile(path.join(root, "data", "latest.json"), "utf8"));
const siteDir = path.join(root, "site");
const docsDir = path.join(root, "docs");
const contactEmail = "rivan_Britain@outlook.com";
const publicSiteUrl = "https://bravecownofear.github.io/trendfoundry/";
const ogImageUrl = `${publicSiteUrl}og-image.png`;
const orderSubject = encodeURIComponent("TrendFoundry sample pack order");
const orderBody = encodeURIComponent("Hi, I want to order the TrendFoundry $9 sample pack. Please send the latest issue and payment instructions.");
const orderHref = `mailto:${contactEmail}?subject=${orderSubject}&body=${orderBody}`;
const issueOrderHref = "https://github.com/BraveCowNoFear/trendfoundry/issues/new?template=order-sample-pack.yml&title=Sample%20pack%20request%3A%20";
await mkdir(siteDir, { recursive: true });
await mkdir(docsDir, { recursive: true });

function selectPortfolio(items) {
  const quotas = { github: 4, bilibili: 3, youtube: 2, hn: 2, arxiv: 1 };
  const selected = [];
  const used = new Set();
  for (const [source, quota] of Object.entries(quotas)) {
    const sourceItems = items
      .filter((candidate) => candidate.source === source)
      .sort((a, b) => Number(Boolean(a.qualityFlags?.length)) - Number(Boolean(b.qualityFlags?.length)) || b.score - a.score);
    for (const item of sourceItems.slice(0, quota)) {
      selected.push(item);
      used.add(item.url || item.id);
    }
  }
  for (const item of items) {
    if (selected.length >= 12) break;
    const key = item.url || item.id;
    if (!used.has(key)) {
      selected.push(item);
      used.add(key);
    }
  }
  return selected.sort((a, b) => b.score - a.score);
}

const top = selectPortfolio(data.items);
const high = top.filter((item) => item.monetizationFit === "high");
const cached = top.filter((item) => item.stale);
const bySource = top.reduce((acc, item) => {
  acc[item.source] = (acc[item.source] || 0) + 1;
  return acc;
}, {});
const sourceMix = Object.entries(bySource)
  .map(([source, count]) => `${source} ${count}`)
  .join(" / ");
const sourceBars = Object.entries(bySource)
  .map(([source, count]) => `<span style="--w:${Math.max(8, (count / top.length) * 100).toFixed(2)}%" title="${escapeHtml(source)} ${count}"></span>`)
  .join("");
const publicSample = top.slice(0, 3);

const pricingTiers = [
  {
    name: "Sample issue",
    price: "$9",
    cadence: "one-off",
    bestFor: "Test whether the brief fits your channel before subscribing.",
    includes: ["12 ranked opportunities", "1 ready-to-record script", "CSV opportunity table", "Quality-risk notes"],
    action: "Request sample",
    href: issueOrderHref,
    featured: false
  },
  {
    name: "Weekly brief",
    price: "$19",
    cadence: "per month",
    bestFor: "Creators who need a dependable weekly topic pipeline.",
    includes: ["Weekly 12-item issue", "Fresh source mix", "Bilibili + YouTube title angles", "Recording outline per item"],
    action: "Start weekly",
    href: orderHref,
    featured: true
  },
  {
    name: "Custom niche",
    price: "$49",
    cadence: "per month",
    bestFor: "Teams focused on one narrow audience or technical vertical.",
    includes: ["Custom source queries", "Niche-specific ranking", "Stricter quality filtering", "Lead/outreach angle notes"],
    action: "Ask for custom",
    href: issueOrderHref,
    featured: false
  }
];

const pricingCards = pricingTiers
  .map(
    (tier) => `<article class="tier${tier.featured ? " featured" : ""}">
  <div>
    <p class="tier-kicker">${escapeHtml(tier.cadence)}</p>
    <h3>${escapeHtml(tier.name)}</h3>
    <p class="tier-price">${escapeHtml(tier.price)}</p>
    <p>${escapeHtml(tier.bestFor)}</p>
  </div>
  <ul>${tier.includes.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
  <a class="action${tier.featured ? " primary" : ""}" href="${tier.href}">${escapeHtml(tier.action)}</a>
</article>`
  )
  .join("");

const deliveryItems = [
  ["Proof links", "Every idea keeps the original public source attached."],
  ["Recordable angle", "Titles, hook, outline, demo step, and limitation are generated together."],
  ["Quality control", "Hype, rights-risk, and too-broad signals are flagged before they reach the display pack."],
  ["No-backend intake", "GitHub Issue Form and email order paths work before payment automation is connected."]
];
const deliveryChecklist = deliveryItems
  .map(([label, text]) => `<li><strong>${escapeHtml(label)}</strong><span>${escapeHtml(text)}</span></li>`)
  .join("");
const socialProof = `<section class="visual-proof" aria-label="Share preview">
      <div>
        <p class="section-label">Share preview</p>
        <h2>A cleaner link card for outreach, checkout pages, and social posts.</h2>
        <p>Every buyer-facing link should explain the product before anyone clicks through. This preview image carries the offer, source mix, and no-hype positioning.</p>
      </div>
      <img src="./og-image.png" alt="TrendFoundry social preview showing source-backed creator intelligence metrics" width="1200" height="630">
    </section>`;

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows, columns) {
  return [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))
  ].join("\n");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function mdLink(item) {
  return `[${item.title}](${item.url})`;
}

const publicSampleReport = `# TrendFoundry Public Sample

Generated: ${data.generatedAt}

This free sample shows the format and quality bar. The paid issue expands this into 12 ranked opportunities, one ready-to-record script, CSV tables, and delivery notes.

## Sample Opportunities

${publicSample
  .map(
    (item, index) => `### ${index + 1}. ${item.title}

- Score: ${item.score}
- Fit: ${item.monetizationFit}
- Source: ${item.source} / ${item.sourceQuery}
- Quality: ${item.qualityFlags?.length ? `review (${item.qualityFlags.join(", ")})` : "normal"}
- Link: ${item.url}
- Creator target: ${item.targetCreator}
- Why now: ${item.deliverables.whyNow}
- Hook: ${item.deliverables.hook}
- Demo: ${item.deliverables.demoSteps[1]}
- Limitation: ${item.deliverables.limitation}
`
  )
  .join("\n")}

## Upgrade

- Sample issue: USD 9 one-off.
- Weekly brief: USD 19/month.
- Custom niche: USD 49/month.

Request the current issue: ${issueOrderHref}

Email order: ${contactEmail}
`;

const publicSampleCsv = toCsv(
  publicSample.map((item, index) => ({
    rank: index + 1,
    score: item.score,
    source: item.source,
    fit: item.monetizationFit,
    quality: item.qualityFlags?.length ? `review: ${item.qualityFlags.join("; ")}` : "normal",
    title: item.title,
    hook: item.deliverables.hook,
    demo: item.deliverables.demoSteps[1],
    limitation: item.deliverables.limitation,
    url: item.url
  })),
  ["rank", "score", "source", "fit", "quality", "title", "hook", "demo", "limitation", "url"]
);

const report = `# TrendFoundry Daily Creator Intelligence

Generated: ${data.generatedAt}

## Executive Read

Today's best monetizable wedge is not generic AI video generation. It is a paid signal pack for creators who need trustworthy, technically grounded topics before everyone else copies the same demos. The strongest opportunities combine GitHub traction, current technical debate, and a clear creator workflow.

Portfolio source mix among the first 12 opportunities: ${Object.entries(bySource)
  .map(([source, count]) => `${source}: ${count}`)
  .join(", ")}.

High-fit opportunities: ${high.length}.

Collection health: ${data.errorCount || 0} fresh collection errors, ${cached.length} cached fallback items in the displayed portfolio.

## Top Opportunities

${top
  .map(
    (item, index) => `### ${index + 1}. ${item.title}

- Score: ${item.score}
- Fit: ${item.monetizationFit}
- Source: ${item.source} / ${item.sourceQuery}
- Freshness: ${item.stale ? "cached fallback" : "fresh"}
- Quality: ${item.qualityFlags?.length ? `review (${item.qualityFlags.join(", ")})` : "normal"}
- Link: ${item.url}
- Why it matters: ${item.summary || "No summary available."}
- Creator target: ${item.targetCreator}
- Why now: ${item.deliverables.whyNow}
- Bilibili title: ${item.deliverables.bilibiliTitles[0]}
- YouTube title: ${item.deliverables.youtubeTitles[0]}
- Hook: ${item.deliverables.hook}
- Demo steps:
${item.deliverables.demoSteps.map((step) => `  - ${step}`).join("\n")}
- Thumbnail prompt: ${item.deliverables.thumbnailPrompt}
- Limitation: ${item.deliverables.limitation}
`
  )
  .join("\n")}

## Sellable Product Package

The product should be sold as a weekly creator intelligence pack:

- 12 ranked video opportunities.
- For each opportunity: proof link, creator angle, Bilibili titles, YouTube titles, short outline, thumbnail prompt.
- Bonus: one ready-to-record script for the highest-scoring item.

Suggested initial price: USD 9 for a single pack, USD 19/month for weekly delivery, USD 49/month for a niche custom pack.

Manual order CTA: email ${contactEmail} with the subject "TrendFoundry sample pack order".

Public request form: ${issueOrderHref}

## Operating Rule

Avoid low-quality AI slop. Every idea must include a real source link, a reproducible demo angle, and an explicit limitation section.
`;

const winner = top[0];
const script = `# Ready-To-Record Script: ${winner.title}

Source: ${mdLink(winner)}

## Title Options

- ${winner.deliverables.bilibiliTitles[0]}
- ${winner.deliverables.youtubeTitles[0]}
- ${winner.deliverables.bilibiliTitles[3]}

## 60-Second Opening

今天这期我不做 AI 工具盘点，也不念 GitHub README。我们只验证一个问题：${winner.title} 到底能不能帮一个真实创作者省时间，还是只是又一个看起来很热闹的项目。

我会用三个标准判断它：第一，能不能在普通工作流里复现；第二，它替代的是哪一步，而不是笼统说提高效率；第三，如果把它做成内容或产品，观众为什么愿意收藏甚至付费。

## Main Structure

1. Show the source signal: ${winner.url}
2. Explain the problem it claims to solve: ${winner.summary || "Needs manual README review."}
3. Run or simulate a minimum viable demo.
4. Compare before/after workflow time.
5. Name the limits clearly.
6. Convert the finding into a creator asset: template, checklist, or paid mini-pack.

## Limitation Segment

不要把这类项目当万能自动赚钱机器。它真正的价值在于把一个低确定性的创作流程拆成可验证步骤：选题、证据、演示、脚本、发布资产。越具体，越可卖。

## Call To Action

如果你想要这类 AI/开发者创作选题包，我会每周整理 12 个有来源、有演示角度、有标题和脚本结构的机会。你只需要选择最适合自己频道的那一个开始录。
`;

const cards = top
  .map(
    (item, index) => `<article class="card" data-source="${escapeHtml(item.source)}" data-fit="${escapeHtml(item.monetizationFit)}" data-search="${escapeHtml(`${item.title} ${item.summary} ${item.sourceQuery} ${item.targetCreator}`.toLowerCase())}">
  <div class="meta"><span>${escapeHtml(item.source)}</span><span>Score ${item.score}</span><span>${escapeHtml(item.monetizationFit)}</span>${item.stale ? "<span>cached</span>" : ""}${item.qualityFlags?.length ? "<span>review</span>" : ""}</div>
  <h3>${index + 1}. <a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a></h3>
  <p>${escapeHtml(item.summary || "No summary available.")}</p>
  <p class="why"><strong>Why now:</strong> ${escapeHtml(item.deliverables.whyNow)}</p>
  <div class="idea">
    <strong>Bilibili:</strong> ${escapeHtml(item.deliverables.bilibiliTitles[0])}<br>
    <strong>YouTube:</strong> ${escapeHtml(item.deliverables.youtubeTitles[0])}
  </div>
  <details>
    <summary>Production outline</summary>
    <ol>${item.deliverables.outline.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ol>
    <p><strong>Demo:</strong> ${escapeHtml(item.deliverables.demoSteps[1])}</p>
    ${item.qualityFlags?.length ? `<p><strong>Quality flags:</strong> ${escapeHtml(item.qualityFlags.join(", "))}</p>` : ""}
    <p><strong>Thumbnail:</strong> ${escapeHtml(item.deliverables.thumbnailPrompt)}</p>
    <p><strong>Limitation:</strong> ${escapeHtml(item.deliverables.limitation)}</p>
  </details>
</article>`
  )
  .join("\n");

const sourceButtons = ["all", ...Object.keys(bySource)]
  .map((source) => `<button class="filter-button${source === "all" ? " active" : ""}" type="button" data-source-filter="${source}">${source === "all" ? "All" : source}</button>`)
  .join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Source-backed AI and developer video opportunities shaped into titles, hooks, demos, limitations, and buyer-ready weekly briefs.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${publicSiteUrl}">
  <meta property="og:title" content="TrendFoundry Creator Intelligence">
  <meta property="og:description" content="Source-backed video ideas before the demos get copied.">
  <meta property="og:image" content="${ogImageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="TrendFoundry Creator Intelligence">
  <meta name="twitter:description" content="AI and developer trend signals shaped into creator-ready weekly briefs.">
  <meta name="twitter:image" content="${ogImageUrl}">
  <title>TrendFoundry Creator Intelligence</title>
  <link rel="stylesheet" href="./styles.css">
  <script src="./app.js" defer></script>
</head>
<body>
  <header class="topbar">
    <div>
      <div class="brandline">
        <span>TrendFoundry</span>
        <span>Issue ${new Date(data.generatedAt).toLocaleDateString("en-GB")}</span>
      </div>
      <h1>Creator intelligence packs for AI and developer video channels</h1>
      <p class="sub">Source-backed opportunities from GitHub, YouTube, Bilibili, Hacker News, and arXiv, shaped into recordable titles, hooks, demos, limitations, and buyer-ready sample assets.</p>
      <div class="hero-actions">
        <a class="action primary" href="./public-sample.md">View free sample</a>
        <a class="action" href="./public-sample.csv">Download CSV sample</a>
        <a class="action" href="./ready-to-record-script.md">Open script</a>
        <a class="action strong" href="${issueOrderHref}">Request on GitHub</a>
        <a class="action" href="${orderHref}">Email order</a>
      </div>
    </div>
    <aside>
      <span><strong>${top.length}</strong> opportunities</span>
      <span><strong>${high.length}</strong> high-fit</span>
      <span><strong>${data.errorCount || 0}</strong> source errors</span>
      <span>${escapeHtml(sourceMix)}</span>
      <div class="source-bars" aria-label="Source mix">${sourceBars}</div>
    </aside>
  </header>
  <main>
    <section class="offer">
      <div>
        <p class="section-label">Current offer</p>
        <h2>Sell a source-backed weekly brief before building a heavier SaaS.</h2>
        <p>Start with a manual $9 sample order, prove demand, then convert repeat buyers into the $19/month weekly delivery.</p>
      </div>
      <div class="price">
        <span>$19/mo</span>
        <small><a href="${issueOrderHref}">GitHub request</a> / <a href="${orderHref}">email order</a></small>
      </div>
    </section>
    <section class="pricing" aria-label="Pricing tiers">
      <div class="section-head">
        <p class="section-label">Pricing</p>
        <h2>Three buyer paths, all deliverable without a backend.</h2>
        <p>Each tier sells the same core advantage: fewer weak topics, faster planning, and a clearer recording queue.</p>
      </div>
      <div class="tier-grid">${pricingCards}</div>
    </section>
    <section class="sample-preview" aria-label="Free public sample">
      <div>
        <p class="section-label">Free sample</p>
        <h2>Inspect three current opportunities before ordering.</h2>
        <p>The public sample reveals format, scoring, source links, and quality notes without exposing the full paid pack.</p>
      </div>
      <div class="sample-actions">
        <a class="action primary" href="./public-sample.md">Open sample</a>
        <a class="action" href="./public-sample.csv">CSV sample</a>
      </div>
    </section>
    ${socialProof}
    <section class="delivery" aria-label="What the buyer receives">
      <div>
        <p class="section-label">What arrives</p>
        <h2>A compact intelligence pack, not another AI news digest.</h2>
      </div>
      <ul>${deliveryChecklist}</ul>
    </section>
    <section class="toolbelt" aria-label="Opportunity controls">
      <div class="search-wrap">
        <label for="opportunity-search">Search opportunities</label>
        <input id="opportunity-search" type="search" placeholder="agent, video, workflow, arxiv...">
      </div>
      <div class="filters" aria-label="Source filters">${sourceButtons}</div>
      <p id="result-count" class="result-count">${top.length} visible opportunities</p>
    </section>
    <section class="grid" id="opportunity-grid">${cards}</section>
    <section class="handoff">
      <div>
        <p class="section-label">Handoff</p>
        <h2>Next buyer-facing action</h2>
        <p>Use the sample brief and ready-to-record script as the free proof asset, then sell weekly delivery from the launch plan.</p>
      </div>
      <div class="handoff-links">
        <a class="action primary" href="./launch-plan.md">Launch plan</a>
        <a class="action" href="./sales-page-copy.md">Sales copy</a>
        <a class="action strong" href="${issueOrderHref}">Request sample</a>
        <a class="action" href="${orderHref}">Email order</a>
      </div>
    </section>
  </main>
</body>
</html>`;

const css = `:root {
  color-scheme: light;
  --ink: #15171a;
  --muted: #666d75;
  --line: #dfe3e8;
  --paper: #f7f8fa;
  --panel: #ffffff;
  --accent: #0f6b5f;
  --accent-2: #8a5a18;
  --accent-soft: #e8f2f0;
  --shadow: 0 1px 2px rgba(21, 23, 26, 0.04);
}

* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: var(--paper);
  color: var(--ink);
  text-rendering: optimizeLegibility;
}
a { color: inherit; }
.topbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 260px;
  gap: clamp(28px, 5vw, 72px);
  padding: 40px clamp(20px, 5vw, 72px) 30px;
  border-bottom: 1px solid var(--line);
  background: #fff;
}
.brandline {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  margin: 0 0 18px;
  color: var(--accent);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
h1 {
  max-width: 1000px;
  margin: 0;
  font-size: clamp(34px, 5vw, 64px);
  line-height: 1;
  letter-spacing: 0;
}
.sub {
  max-width: 780px;
  margin: 20px 0 0;
  color: var(--muted);
  font-size: 17px;
  line-height: 1.6;
}
.hero-actions,
.handoff-links {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 22px;
}
.action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 38px;
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 8px 13px;
  background: #fff;
  color: var(--ink);
  font-weight: 700;
  text-decoration: none;
  box-shadow: var(--shadow);
}
.action.primary {
  border-color: var(--accent);
  background: var(--accent);
  color: #fff;
}
.action.strong {
  border-color: #b9c3cc;
  background: #15171a;
  color: #fff;
}
.topbar aside {
  align-self: end;
  display: grid;
  gap: 8px;
}
.topbar aside span,
.meta span {
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.72);
  border-radius: 6px;
  padding: 8px 10px;
  color: var(--muted);
  font-size: 13px;
}
.topbar aside strong {
  color: var(--ink);
}
.source-bars {
  display: flex;
  height: 7px;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: #f4f6f8;
}
.source-bars span {
  display: block;
  width: var(--w);
  background: var(--accent);
}
.source-bars span:nth-child(2) { background: #46515c; }
.source-bars span:nth-child(3) { background: #8a5a18; }
.source-bars span:nth-child(4) { background: #8b949e; }
.source-bars span:nth-child(5) { background: #b6bdc5; }
main {
  padding: 24px clamp(20px, 5vw, 72px) 60px;
}
.offer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 24px;
  align-items: center;
  border-bottom: 1px solid var(--line);
  padding: 4px 0 24px;
  margin-bottom: 22px;
}
.section-label {
  margin: 0 0 8px;
  color: var(--accent);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.offer h2 { max-width: 780px; margin: 0 0 8px; font-size: 26px; line-height: 1.18; }
.offer p { margin: 0; color: var(--muted); }
.price {
  text-align: right;
  color: var(--accent-2);
}
.price span { display: block; font-size: 32px; font-weight: 850; }
.price small { color: var(--muted); }
.pricing,
.sample-preview,
.visual-proof,
.delivery {
  border-bottom: 1px solid var(--line);
  padding: 2px 0 24px;
  margin-bottom: 22px;
}
.sample-preview {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 24px;
  align-items: center;
}
.visual-proof {
  display: grid;
  grid-template-columns: minmax(0, 0.64fr) minmax(280px, 0.36fr);
  gap: 24px;
  align-items: center;
}
.visual-proof h2 {
  margin: 0 0 8px;
  font-size: 24px;
  line-height: 1.2;
}
.visual-proof p:not(.section-label) {
  margin: 0;
  color: var(--muted);
  line-height: 1.5;
}
.visual-proof img {
  display: block;
  width: 100%;
  max-width: 420px;
  justify-self: end;
  height: auto;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
  box-shadow: var(--shadow);
}
.sample-preview h2 {
  margin: 0 0 8px;
  font-size: 24px;
  line-height: 1.2;
}
.sample-preview p:not(.section-label) {
  margin: 0;
  color: var(--muted);
  line-height: 1.5;
}
.sample-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}
.section-head {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(260px, 0.7fr);
  gap: 20px;
  align-items: end;
  margin-bottom: 14px;
}
.section-head h2,
.delivery h2 {
  margin: 0;
  font-size: 24px;
  line-height: 1.2;
}
.section-head p:not(.section-label) {
  margin: 0;
  color: var(--muted);
  line-height: 1.5;
}
.tier-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.tier {
  display: grid;
  gap: 14px;
  align-content: space-between;
  min-height: 330px;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 18px;
  background: #fff;
  box-shadow: var(--shadow);
}
.tier.featured {
  border-color: #94aaa5;
  background: #fbfdfc;
}
.tier-kicker {
  margin: 0 0 8px;
  color: var(--accent);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.tier h3 {
  margin: 0;
  font-size: 19px;
}
.tier-price {
  margin: 8px 0;
  color: var(--ink);
  font-size: 34px;
  line-height: 1;
  font-weight: 850;
}
.tier p:not(.tier-kicker):not(.tier-price) {
  margin: 0;
  color: var(--muted);
  line-height: 1.45;
}
.tier ul {
  margin: 0;
  padding-left: 18px;
  color: var(--muted);
}
.delivery {
  display: grid;
  grid-template-columns: minmax(260px, 0.55fr) minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}
.delivery ul {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 18px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.delivery li {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 0 0 10px;
  border-bottom: 1px solid var(--line);
}
.delivery li span {
  color: var(--muted);
  line-height: 1.45;
}
.toolbelt {
  display: grid;
  grid-template-columns: minmax(220px, 360px) minmax(0, 1fr) auto;
  gap: 14px;
  align-items: end;
  margin-bottom: 18px;
}
.search-wrap {
  display: grid;
  gap: 6px;
}
.search-wrap label {
  color: var(--muted);
  font-size: 13px;
  font-weight: 700;
}
input[type="search"] {
  min-height: 42px;
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 8px 11px;
  color: var(--ink);
  font: inherit;
  background: #fff;
}
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.filter-button {
  min-height: 42px;
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 8px 11px;
  background: #fff;
  color: var(--muted);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}
.filter-button.active {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
}
.result-count {
  margin: 0 0 10px;
  white-space: nowrap;
  color: var(--muted);
  font-size: 13px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}
.card {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 18px;
  min-height: 320px;
  box-shadow: var(--shadow);
}
.card.hidden {
  display: none;
}
.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}
.card h3 {
  margin: 0 0 10px;
  font-size: 17px;
  line-height: 1.34;
}
.card p {
  color: var(--muted);
  line-height: 1.5;
}
.card .why {
  color: var(--ink);
  background: #f5f7f9;
  border: 1px solid #edf0f3;
  border-radius: 6px;
  padding: 10px;
}
.idea {
  border-left: 3px solid var(--accent);
  padding-left: 12px;
  margin: 14px 0;
  line-height: 1.55;
}
summary { cursor: pointer; font-weight: 700; }
li { margin: 6px 0; }
.handoff {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 24px;
  align-items: center;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--line);
}
.handoff h2 {
  margin: 0 0 6px;
  font-size: 24px;
}
.handoff p {
  margin: 0;
  color: var(--muted);
}
@media (max-width: 960px) {
  .topbar,
  .offer,
  .sample-preview,
  .visual-proof,
  .section-head,
  .tier-grid,
  .delivery,
  .delivery ul,
  .toolbelt,
  .handoff,
  .grid {
    grid-template-columns: 1fr;
  }
  .price { text-align: left; }
  .sample-actions { justify-content: flex-start; }
  .visual-proof img { justify-self: start; max-width: 100%; }
  .result-count { margin: 0; white-space: normal; }
  .filter-button { flex: 1 1 auto; }
}
`;

const app = `const cards = [...document.querySelectorAll(".card")];
const buttons = [...document.querySelectorAll("[data-source-filter]")];
const search = document.querySelector("#opportunity-search");
const resultCount = document.querySelector("#result-count");
let activeSource = "all";

function applyFilters() {
  const query = (search.value || "").trim().toLowerCase();
  let visible = 0;
  for (const card of cards) {
    const sourceMatch = activeSource === "all" || card.dataset.source === activeSource;
    const textMatch = !query || card.dataset.search.includes(query);
    const show = sourceMatch && textMatch;
    card.classList.toggle("hidden", !show);
    if (show) visible += 1;
  }
  resultCount.textContent = visible === 1 ? "1 visible opportunity" : visible + " visible opportunities";
}

for (const button of buttons) {
  button.addEventListener("click", () => {
    activeSource = button.dataset.sourceFilter;
    for (const other of buttons) other.classList.toggle("active", other === button);
    applyFilters();
  });
}

search.addEventListener("input", applyFilters);
`;

await writeFile(path.join(docsDir, "daily-brief.md"), report, "utf8");
await writeFile(path.join(docsDir, "ready-to-record-script.md"), script, "utf8");
await writeFile(path.join(docsDir, "public-sample.md"), publicSampleReport, "utf8");
await writeFile(path.join(siteDir, "index.html"), html, "utf8");
await writeFile(path.join(siteDir, "styles.css"), css, "utf8");
await writeFile(path.join(siteDir, "app.js"), app, "utf8");
await writeFile(path.join(siteDir, "daily-brief.md"), report, "utf8");
await writeFile(path.join(siteDir, "ready-to-record-script.md"), script, "utf8");
await writeFile(path.join(siteDir, "public-sample.md"), publicSampleReport, "utf8");
await writeFile(path.join(siteDir, "public-sample.csv"), publicSampleCsv, "utf8");
await writeFile(path.join(siteDir, "launch-plan.md"), await readFile(path.join(docsDir, "launch-plan.md"), "utf8"), "utf8");
await writeFile(path.join(siteDir, "sales-page-copy.md"), await readFile(path.join(docsDir, "sales-page-copy.md"), "utf8"), "utf8");
console.log(`Built ${top.length} cards.`);
