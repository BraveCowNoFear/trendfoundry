import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const siteDir = path.join(root, "site");
const distDir = path.join(root, "dist", "social");
const htmlPath = path.join(distDir, "og-card.html");
const pngPath = path.join(siteDir, "og-image.png");
const pngUrl = `file:///${pngPath.replace(/\\/g, "/")}`;
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

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <style>
    :root {
      --ink: #15171a;
      --muted: #59636e;
      --line: #dfe3e8;
      --paper: #f7f8fa;
      --accent: #0f6b5f;
      --warm: #8a5a18;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; }
    body {
      display: grid;
      place-items: stretch;
      background: var(--paper);
      color: var(--ink);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .frame {
      display: grid;
      grid-template-columns: 1fr 330px;
      gap: 48px;
      height: 630px;
      padding: 58px 64px 52px;
      background:
        linear-gradient(90deg, rgba(15, 107, 95, 0.06), rgba(255, 255, 255, 0) 36%),
        #ffffff;
      border: 1px solid var(--line);
    }
    .brand {
      display: flex;
      gap: 16px;
      align-items: center;
      color: var(--accent);
      font-size: 18px;
      font-weight: 850;
      letter-spacing: 0.09em;
      text-transform: uppercase;
    }
    h1 {
      max-width: 760px;
      margin: 48px 0 22px;
      font-size: 74px;
      line-height: 0.96;
      letter-spacing: 0;
    }
    p {
      max-width: 720px;
      margin: 0;
      color: var(--muted);
      font-size: 26px;
      line-height: 1.38;
    }
    .metrics {
      align-self: end;
      display: grid;
      gap: 12px;
    }
    .metric {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 16px 18px;
      background: rgba(247, 248, 250, 0.88);
      color: var(--muted);
      font-size: 21px;
    }
    .metric strong {
      color: var(--ink);
      font-size: 28px;
    }
    .bars {
      display: flex;
      height: 12px;
      overflow: hidden;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: #f4f6f8;
    }
    .bars span:nth-child(1) { width: 33%; background: var(--accent); }
    .bars span:nth-child(2) { width: 17%; background: #46515c; }
    .bars span:nth-child(3) { width: 17%; background: var(--warm); }
    .bars span:nth-child(4) { width: 25%; background: #8b949e; }
    .bars span:nth-child(5) { width: 8%; background: #b6bdc5; }
    .footer {
      margin-top: 44px;
      display: flex;
      gap: 12px;
      color: var(--accent);
      font-size: 20px;
      font-weight: 760;
    }
  </style>
</head>
<body>
  <div class="frame">
    <main>
      <div class="brand"><span>TrendFoundry</span><span>Creator Intelligence</span></div>
      <h1>Source-backed video ideas before the demos get copied.</h1>
      <p>AI and developer trend signals shaped into titles, hooks, demo steps, limitations, and buyer-ready weekly briefs.</p>
      <div class="footer"><span>$9 sample</span><span>/</span><span>$19 monthly brief</span><span>/</span><span>no backend required</span></div>
    </main>
    <aside class="metrics">
      <div class="metric"><strong>12</strong> ranked opportunities</div>
      <div class="metric"><strong>5</strong> public source lanes</div>
      <div class="metric"><strong>0</strong> growth promises</div>
      <div class="bars" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div>
    </aside>
  </div>
</body>
</html>`;

await mkdir(siteDir, { recursive: true });
await mkdir(distDir, { recursive: true });
await writeFile(htmlPath, html, "utf8");

const browser = findBrowser();
if (!browser) {
  throw new Error("No Edge or Chrome executable found for social image rendering.");
}

const result = spawnSync(browser, [
  "--headless=new",
  "--disable-gpu",
  "--hide-scrollbars",
  "--window-size=1200,630",
  `--screenshot=${pngPath}`,
  htmlUrl
], { encoding: "utf8" });

if (result.status !== 0) {
  throw new Error(`Browser screenshot failed: ${result.stderr || result.stdout}`);
}

console.log(`Wrote ${pngPath}`);
console.log(`Source card: ${htmlPath}`);
