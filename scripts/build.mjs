import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const data = JSON.parse(await readFile(path.join(root, "data", "latest.json"), "utf8"));
const siteDir = path.join(root, "site");
const docsDir = path.join(root, "docs");
await mkdir(siteDir, { recursive: true });
await mkdir(docsDir, { recursive: true });

function selectPortfolio(items) {
  const quotas = { github: 4, bilibili: 3, youtube: 2, hn: 2, arxiv: 1 };
  const selected = [];
  const used = new Set();
  for (const [source, quota] of Object.entries(quotas)) {
    for (const item of items.filter((candidate) => candidate.source === source).slice(0, quota)) {
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
- Link: ${item.url}
- Why it matters: ${item.summary || "No summary available."}
- Creator target: ${item.targetCreator}
- Bilibili title: ${item.deliverables.bilibiliTitles[0]}
- YouTube title: ${item.deliverables.youtubeTitles[0]}
- Hook: ${item.deliverables.hook}
`
  )
  .join("\n")}

## Sellable Product Package

The product should be sold as a weekly creator intelligence pack:

- 12 ranked video opportunities.
- For each opportunity: proof link, creator angle, Bilibili titles, YouTube titles, short outline, thumbnail prompt.
- Bonus: one ready-to-record script for the highest-scoring item.

Suggested initial price: USD 9 for a single pack, USD 19/month for weekly delivery, USD 49/month for a niche custom pack.

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
  <div class="meta"><span>${escapeHtml(item.source)}</span><span>Score ${item.score}</span><span>${escapeHtml(item.monetizationFit)}</span>${item.stale ? "<span>cached</span>" : ""}</div>
  <h3>${index + 1}. <a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a></h3>
  <p>${escapeHtml(item.summary || "No summary available.")}</p>
  <div class="idea">
    <strong>Bilibili:</strong> ${escapeHtml(item.deliverables.bilibiliTitles[0])}<br>
    <strong>YouTube:</strong> ${escapeHtml(item.deliverables.youtubeTitles[0])}
  </div>
  <details>
    <summary>Production outline</summary>
    <ol>${item.deliverables.outline.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ol>
    <p><strong>Thumbnail:</strong> ${escapeHtml(item.deliverables.thumbnailPrompt)}</p>
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
  <title>TrendFoundry Creator Intelligence</title>
  <link rel="stylesheet" href="./styles.css">
  <script src="./app.js" defer></script>
</head>
<body>
  <header class="topbar">
    <div>
      <p class="eyebrow">TrendFoundry</p>
      <h1>Creator intelligence packs for AI and developer video channels</h1>
      <p class="sub">Fresh public signals from GitHub, Hacker News, and arXiv converted into ranked Bilibili/YouTube ideas with titles, hooks, outlines, and thumbnail prompts.</p>
      <div class="hero-actions">
        <a class="action primary" href="./daily-brief.md">Download sample brief</a>
        <a class="action" href="./ready-to-record-script.md">Open script</a>
      </div>
    </div>
    <aside>
      <span>${top.length} opportunities</span>
      <span>${high.length} high-fit</span>
      <span>${data.errorCount || 0} source errors</span>
      <span>${new Date(data.generatedAt).toLocaleDateString("en-GB")}</span>
    </aside>
  </header>
  <main>
    <section class="offer">
      <div>
        <h2>Sell this first</h2>
        <p>Weekly paid brief for creators who want high-signal technical topics before they become recycled AI demos.</p>
      </div>
      <div class="price">
        <span>$19/mo</span>
        <small>starter subscription target</small>
      </div>
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
        <h2>Next buyer-facing action</h2>
        <p>Use the sample brief and ready-to-record script as the free proof asset, then sell weekly delivery from the launch plan.</p>
      </div>
      <div class="handoff-links">
        <a class="action primary" href="./launch-plan.md">Launch plan</a>
        <a class="action" href="./sales-page-copy.md">Sales copy</a>
      </div>
    </section>
  </main>
</body>
</html>`;

const css = `:root {
  color-scheme: light;
  --ink: #18212f;
  --muted: #526071;
  --line: #d8e0ea;
  --paper: #f7f8fb;
  --panel: #ffffff;
  --accent: #0f766e;
  --accent-2: #b45309;
  --accent-soft: #e7f4f2;
}

* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: var(--paper);
  color: var(--ink);
}
a { color: inherit; }
.topbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 220px;
  gap: 32px;
  padding: 44px clamp(20px, 5vw, 72px) 28px;
  border-bottom: 1px solid var(--line);
  background: #fff;
}
.eyebrow {
  margin: 0 0 12px;
  color: var(--accent);
  font-weight: 700;
  letter-spacing: 0;
}
h1 {
  max-width: 960px;
  margin: 0;
  font-size: clamp(32px, 5vw, 60px);
  line-height: 1.02;
  letter-spacing: 0;
}
.sub {
  max-width: 820px;
  margin: 18px 0 0;
  color: var(--muted);
  font-size: 18px;
  line-height: 1.55;
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
  padding: 8px 12px;
  background: #fff;
  color: var(--ink);
  font-weight: 700;
  text-decoration: none;
}
.action.primary {
  border-color: var(--accent);
  background: var(--accent);
  color: #fff;
}
.topbar aside {
  align-self: end;
  display: grid;
  gap: 10px;
}
.topbar aside span,
.meta span {
  border: 1px solid var(--line);
  background: #f9fbfd;
  border-radius: 6px;
  padding: 8px 10px;
  color: var(--muted);
  font-size: 13px;
}
main {
  padding: 24px clamp(20px, 5vw, 72px) 60px;
}
.offer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 24px;
  align-items: center;
  border-bottom: 1px solid var(--line);
  padding: 0 0 24px;
  margin-bottom: 24px;
}
.offer h2 { margin: 0 0 6px; font-size: 24px; }
.offer p { margin: 0; color: var(--muted); }
.price {
  text-align: right;
  color: var(--accent-2);
}
.price span { display: block; font-size: 30px; font-weight: 800; }
.price small { color: var(--muted); }
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
  gap: 16px;
}
.card {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 18px;
  min-height: 320px;
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
  font-size: 18px;
  line-height: 1.32;
}
.card p {
  color: var(--muted);
  line-height: 1.5;
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
  .toolbelt,
  .handoff,
  .grid {
    grid-template-columns: 1fr;
  }
  .price { text-align: left; }
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
await writeFile(path.join(siteDir, "index.html"), html, "utf8");
await writeFile(path.join(siteDir, "styles.css"), css, "utf8");
await writeFile(path.join(siteDir, "app.js"), app, "utf8");
await writeFile(path.join(siteDir, "daily-brief.md"), report, "utf8");
await writeFile(path.join(siteDir, "ready-to-record-script.md"), script, "utf8");
await writeFile(path.join(siteDir, "launch-plan.md"), await readFile(path.join(docsDir, "launch-plan.md"), "utf8"), "utf8");
await writeFile(path.join(siteDir, "sales-page-copy.md"), await readFile(path.join(docsDir, "sales-page-copy.md"), "utf8"), "utf8");
console.log(`Built ${top.length} cards.`);
