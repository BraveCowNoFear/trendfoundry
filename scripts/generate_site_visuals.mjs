import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const data = JSON.parse(await readFile(path.join(root, "data", "latest.json"), "utf8"));
const siteDir = path.join(root, "site");
const distDir = path.join(root, "dist", "visuals");
const htmlPath = path.join(distDir, "signal-board.html");
const pngPath = path.join(siteDir, "signal-board.png");
const metaPath = path.join(siteDir, "signal-board.meta.json");
const demoPath = path.join(siteDir, "signal-demo.svg");
const htmlUrl = `file:///${htmlPath.replace(/\\/g, "/")}`;

const browserCandidates = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe"
];

function findBrowser() {
  return browserCandidates.find((candidate) => existsSync(candidate));
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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

function sourceLabel(source) {
  const labels = {
    github: "GitHub",
    bilibili: "Bilibili",
    youtube: "YouTube",
    hn: "Hacker News",
    arxiv: "arXiv"
  };
  return labels[source] || source || "Public";
}

const top = selectPortfolio(data.items || []);
const sourceCounts = top.reduce((acc, item) => {
  acc[item.source] = (acc[item.source] || 0) + 1;
  return acc;
}, {});
const highFit = top.filter((item) => item.monetizationFit === "high").length;
const generatedAt = new Date(data.generatedAt).toLocaleDateString("en-GB");

const sourceRows = Object.entries(sourceCounts)
  .map(
    ([source, count]) => `<div class="source-row">
      <span>${escapeHtml(sourceLabel(source))}</span>
      <strong>${count}</strong>
      <i style="width:${Math.max(12, Math.min(100, count * 18))}%"></i>
    </div>`
  )
  .join("");

const itemRows = top.slice(0, 8)
  .map(
    (item, index) => `<article>
      <span>#${index + 1}</span>
      <div>
        <strong>${escapeHtml(item.title)}</strong>
        <small>${escapeHtml(sourceLabel(item.source))} / score ${escapeHtml(item.score)} / ${escapeHtml(item.monetizationFit)}</small>
      </div>
    </article>`
  )
  .join("");

const demoItems = top.slice(0, 4);
const demoRows = demoItems
  .map((item, index) => {
    const y = 196 + index * 58;
    const delay = `${(index * 0.45).toFixed(2)}s`;
    const title = escapeHtml(item.title).slice(0, 58);
    return `<g class="demo-row" style="animation-delay:${delay}">
      <rect x="72" y="${y}" width="290" height="42" rx="7"></rect>
      <text x="90" y="${y + 17}">${escapeHtml(sourceLabel(item.source))} / score ${escapeHtml(item.score)}</text>
      <text x="90" y="${y + 33}" class="muted">${title}</text>
    </g>`;
  })
  .join("");

const demoSvg = `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title desc" viewBox="0 0 960 540" width="960" height="540">
  <title id="title">TrendFoundry workflow animation</title>
  <desc id="desc">Animated walkthrough showing public signals becoming ranked ideas, scripts, sample packs, and orders.</desc>
  <style>
    svg { background: #f7f8fa; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .panel { fill: #fff; stroke: #dfe3e8; stroke-width: 1.4; }
    .label { fill: #66717d; font-size: 13px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
    .title { fill: #15171a; font-size: 31px; font-weight: 860; }
    .body { fill: #4f5a66; font-size: 16px; }
    .muted { fill: #66717d; font-size: 12px; }
    .accent { fill: #0f6b5f; }
    .demo-row rect { fill: #fbfcfd; stroke: #dfe3e8; }
    .demo-row text { fill: #15171a; font-size: 13px; font-weight: 760; }
    .demo-row { opacity: .18; animation: rowPulse 4.8s ease-in-out infinite; }
    .node { fill: #fff; stroke: #dfe3e8; stroke-width: 1.3; }
    .node-title { fill: #15171a; font-size: 17px; font-weight: 850; }
    .node-small { fill: #66717d; font-size: 12px; }
    .pipe { fill: none; stroke: #b8c2cc; stroke-width: 3; stroke-linecap: round; stroke-dasharray: 16 16; animation: dash 2.4s linear infinite; }
    .dot { fill: #0f6b5f; animation: travel 4.8s ease-in-out infinite; }
    .metric { fill: #e8f2f0; stroke: #c8ddd8; }
    .metric text { fill: #0f6b5f; font-weight: 850; }
    @keyframes rowPulse {
      0%, 100% { opacity: .22; transform: translateX(0); }
      25%, 65% { opacity: 1; transform: translateX(7px); }
    }
    @keyframes dash { to { stroke-dashoffset: -32; } }
    @keyframes travel {
      0% { transform: translate(0, 0); opacity: 0; }
      12% { opacity: 1; }
      34% { transform: translate(170px, 0); }
      58% { transform: translate(350px, 0); }
      82% { transform: translate(528px, 0); opacity: 1; }
      100% { transform: translate(628px, 0); opacity: 0; }
    }
    @media (prefers-reduced-motion: reduce) {
      .demo-row, .pipe, .dot { animation: none; opacity: 1; }
    }
  </style>
  <rect x="0" y="0" width="960" height="540" fill="#f7f8fa"/>
  <rect class="panel" x="36" y="34" width="888" height="472" rx="12"/>
  <text class="label" x="72" y="80">TrendFoundry motion proof</text>
  <text class="title" x="72" y="122">Public signal to buyer-ready pack</text>
  <text class="body" x="72" y="154">The animated flow is generated from the same current issue as the signal board.</text>
  ${demoRows}
  <path class="pipe" d="M390 238 C450 210, 470 210, 526 238 S612 266, 672 238 S750 210, 820 238"/>
  <circle class="dot" cx="400" cy="238" r="9"/>
  <g transform="translate(480 172)">
    <rect class="node" width="128" height="92" rx="9"/>
    <text class="node-title" x="18" y="32">Rank</text>
    <text class="node-small" x="18" y="56">${top.length} signals</text>
    <text class="node-small" x="18" y="75">${highFit} high-fit</text>
  </g>
  <g transform="translate(650 172)">
    <rect class="node" width="128" height="92" rx="9"/>
    <text class="node-title" x="18" y="32">Shape</text>
    <text class="node-small" x="18" y="56">titles</text>
    <text class="node-small" x="18" y="75">demo steps</text>
  </g>
  <g transform="translate(780 310)">
    <rect class="metric" width="96" height="62" rx="9"/>
    <text x="18" y="28" font-size="22">${highFit}</text>
    <text x="18" y="47" font-size="12">high-fit</text>
  </g>
  <g transform="translate(650 310)">
    <rect class="node" width="128" height="92" rx="9"/>
    <text class="node-title" x="18" y="32">Pack</text>
    <text class="node-small" x="18" y="56">sample ZIP</text>
    <text class="node-small" x="18" y="75">recording script</text>
  </g>
  <g transform="translate(480 310)">
    <rect class="node" width="128" height="92" rx="9"/>
    <text class="node-title" x="18" y="32">Order</text>
    <text class="node-small" x="18" y="56">email draft</text>
    <text class="node-small" x="18" y="75">buyer delivery</text>
  </g>
</svg>`;

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <style>
    :root {
      --ink: #15171a;
      --muted: #66717d;
      --line: #dfe3e8;
      --paper: #f7f8fa;
      --panel: #ffffff;
      --accent: #0f6b5f;
      --warm: #8a5a18;
      --slate: #2e3842;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; width: 1200px; height: 760px; overflow: hidden; }
    body {
      display: grid;
      place-items: stretch;
      background: var(--paper);
      color: var(--ink);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .board {
      display: grid;
      grid-template-columns: 380px 1fr;
      gap: 24px;
      height: 760px;
      padding: 34px;
      background: linear-gradient(180deg, #ffffff 0%, #f6f8fa 100%);
      border: 1px solid var(--line);
    }
    .left,
    .list {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.94);
      box-shadow: 0 12px 28px rgba(21, 23, 26, 0.08);
    }
    .left {
      display: grid;
      align-content: space-between;
      padding: 26px;
    }
    .brand {
      color: var(--accent);
      font-size: 16px;
      font-weight: 850;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
    h1 {
      margin: 18px 0 0;
      font-size: 43px;
      line-height: 1.02;
      letter-spacing: 0;
    }
    p {
      margin: 16px 0 0;
      color: var(--muted);
      font-size: 18px;
      line-height: 1.42;
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-top: 26px;
    }
    .metric {
      border: 1px solid var(--line);
      border-radius: 7px;
      padding: 12px 10px;
      background: #fbfcfd;
      color: var(--muted);
      font-size: 13px;
    }
    .metric strong {
      display: block;
      color: var(--ink);
      font-size: 27px;
      line-height: 1;
    }
    .sources {
      display: grid;
      gap: 10px;
    }
    .sources h2,
    .list h2 {
      margin: 0 0 12px;
      font-size: 17px;
    }
    .source-row {
      position: relative;
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 10px;
      overflow: hidden;
      border: 1px solid var(--line);
      border-radius: 7px;
      padding: 10px 11px;
      color: var(--muted);
      font-size: 14px;
    }
    .source-row span,
    .source-row strong {
      position: relative;
      z-index: 1;
    }
    .source-row strong {
      color: var(--accent);
    }
    .source-row i {
      position: absolute;
      inset: 0 auto 0 0;
      display: block;
      background: rgba(15, 107, 95, 0.08);
    }
    .list {
      padding: 24px;
    }
    .list-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      margin-bottom: 16px;
    }
    .list-head span {
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 8px 11px;
      color: var(--muted);
      font-size: 13px;
      font-weight: 760;
    }
    article {
      display: grid;
      grid-template-columns: 44px minmax(0, 1fr);
      gap: 12px;
      align-items: start;
      min-height: 70px;
      border-top: 1px solid var(--line);
      padding: 13px 0;
    }
    article:first-of-type {
      border-top: 0;
    }
    article > span {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 7px;
      background: #e8f2f0;
      color: var(--accent);
      font-weight: 850;
    }
    article strong {
      display: -webkit-box;
      overflow: hidden;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      color: var(--ink);
      font-size: 18px;
      line-height: 1.2;
    }
    article small {
      display: block;
      margin-top: 6px;
      color: var(--muted);
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
  </style>
</head>
<body>
  <main class="board">
    <section class="left">
      <div>
        <div class="brand">TrendFoundry / Signal Board</div>
        <h1>Ranked creator opportunities, ready to inspect.</h1>
        <p>Current public signals are grouped by source, scored for creator fit, and shaped into recordable issue packs.</p>
        <div class="metrics">
          <div class="metric"><strong>${top.length}</strong> signals</div>
          <div class="metric"><strong>${highFit}</strong> high-fit</div>
          <div class="metric"><strong>${data.errorCount || 0}</strong> errors</div>
        </div>
      </div>
      <div class="sources">
        <h2>Source lanes</h2>
        ${sourceRows}
      </div>
    </section>
    <section class="list">
      <div class="list-head">
        <h2>Current issue / ${escapeHtml(generatedAt)}</h2>
        <span>No growth promises</span>
      </div>
      ${itemRows}
    </section>
  </main>
</body>
</html>`;

await mkdir(siteDir, { recursive: true });
await mkdir(distDir, { recursive: true });
await writeFile(htmlPath, html, "utf8");
await writeFile(demoPath, demoSvg, "utf8");
await writeFile(
  metaPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      dataGeneratedAt: data.generatedAt,
      image: "signal-board.png",
      demo: "signal-demo.svg",
      width: 1200,
      height: 760,
      topItems: top.slice(0, 8).map((item, index) => ({
        rank: index + 1,
        id: item.id || "",
        url: item.url || "",
        source: item.source || "",
        score: item.score,
        title: item.title || ""
      }))
    },
    null,
    2
  ),
  "utf8"
);

const browser = findBrowser();
if (!browser) {
  throw new Error("No Edge or Chrome executable found for visual rendering.");
}

const result = spawnSync(browser, [
  "--headless=new",
  "--disable-gpu",
  "--hide-scrollbars",
  "--window-size=1200,760",
  `--screenshot=${pngPath}`,
  htmlUrl
], { encoding: "utf8" });

if (result.status !== 0) {
  throw new Error(`Browser screenshot failed: ${result.stderr || result.stdout}`);
}

console.log(`Wrote ${pngPath}`);
console.log(`Wrote ${demoPath}`);
console.log(`Wrote ${metaPath}`);
console.log(`Source board: ${htmlPath}`);
