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
await writeFile(
  metaPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      dataGeneratedAt: data.generatedAt,
      image: "signal-board.png",
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
console.log(`Wrote ${metaPath}`);
console.log(`Source board: ${htmlPath}`);
