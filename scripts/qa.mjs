import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { prepareOrder } from "./lib/fulfillment.mjs";

const root = process.cwd();
const qaDir = path.join(root, "dist", "qa");
const online = process.argv.includes("--online");
const skipScheduler = process.argv.includes("--skip-scheduler");
const publicBase = "https://bravecownofear.github.io/trendfoundry/";
const contactEmail = "rivan_Britain@outlook.com";
const sellerOnly = ["prospects.csv", "outreach-board.md", "latest.json"];
const homeChineseTitle = "AI/\u5f00\u53d1\u8005\u9009\u9898\u5305\uff0c\u76f4\u63a5\u5f00\u5f55\u3002";
const zhLandingTitle = "AI/\u5f00\u53d1\u8005\u9009\u9898\u5305\uff0c\u76f4\u63a5\u5f00\u5f55\u3002";
const emailOrderZh = "\u90ae\u4ef6\u4e0b\u5355";
const requiredScripts = [
  "daily",
  "operate",
  "commerce",
  "leads",
  "fulfill",
  "fulfill-ready",
  "fulfill-email-orders",
  "payment-reply",
  "payment-rails",
  "intake-email-orders",
  "draft-outreach",
  "content-outreach-export",
  "content-outreach-routes",
  "ops-report",
  "agent-watch",
  "launch-assets",
  "social",
  "visuals",
  "free-pack",
  "qa"
];
const seoTopicSlugs = [
  "ai-video-ideas",
  "github-ai-projects",
  "bilibili-ai-topics",
  "youtube-ai-workflows",
  "developer-trend-brief"
];

function issueSlugFromGeneratedAt(value) {
  return new Date(value).toISOString().slice(0, 10);
}

const checks = [];

function pass(name, detail = "") {
  checks.push({ name, status: "pass", detail });
}

function fail(name, detail = "") {
  checks.push({ name, status: "fail", detail });
}

function assertCheck(name, condition, detail = "") {
  if (condition) pass(name, detail);
  else fail(name, detail);
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function readText(file) {
  return readFile(file, "utf8");
}

function pngSize(file) {
  const buffer = existsSync(file) ? Buffer.from(requireFsRead(file)) : null;
  if (!buffer) return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20), bytes: buffer.length };
}

function zipEntries(file) {
  const buffer = existsSync(file) ? Buffer.from(requireFsRead(file)) : null;
  if (!buffer) return [];
  const names = [];
  for (let offset = 0; offset + 46 <= buffer.length;) {
    const signature = buffer.readUInt32LE(offset);
    if (signature === 0x02014b50) {
      const nameLength = buffer.readUInt16LE(offset + 28);
      const extraLength = buffer.readUInt16LE(offset + 30);
      const commentLength = buffer.readUInt16LE(offset + 32);
      names.push(buffer.slice(offset + 46, offset + 46 + nameLength).toString("utf8"));
      offset += 46 + nameLength + extraLength + commentLength;
    } else {
      offset += 1;
    }
  }
  return names;
}

function zipEntryNamesFromBytes(buffer) {
  const names = [];
  for (let offset = 0; offset + 46 <= buffer.length;) {
    const signature = buffer.readUInt32LE(offset);
    if (signature === 0x02014b50) {
      const nameLength = buffer.readUInt16LE(offset + 28);
      const extraLength = buffer.readUInt16LE(offset + 30);
      const commentLength = buffer.readUInt16LE(offset + 32);
      names.push(buffer.slice(offset + 46, offset + 46 + nameLength).toString("utf8"));
      offset += 46 + nameLength + extraLength + commentLength;
    } else {
      offset += 1;
    }
  }
  return names;
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

function requireFsRead(file) {
  return spawnSync(process.execPath, ["-e", `process.stdout.write(require('fs').readFileSync(${JSON.stringify(file)}))`], {
    encoding: "buffer",
    maxBuffer: 10 * 1024 * 1024
  }).stdout;
}

function schtasks(taskName) {
  if (process.platform !== "win32") return { skipped: true, output: "" };
  const result = spawnSync("schtasks", ["/Query", "/TN", taskName, "/V", "/FO", "LIST"], {
    cwd: root,
    encoding: "utf8"
  });
  return { status: result.status, output: result.stdout || result.stderr || "" };
}

async function checkLocal() {
  const pkg = await readJson(path.join(root, "package.json"));
  for (const script of requiredScripts) {
    assertCheck(`package script: ${script}`, Boolean(pkg.scripts?.[script]), pkg.scripts?.[script] || "missing");
  }
  assertCheck("daily regenerates visual board", pkg.scripts?.daily?.includes("generate_site_visuals.mjs") || pkg.scripts?.daily?.includes("npm run visuals"), pkg.scripts?.daily || "missing");
  assertCheck("daily regenerates free sample pack", pkg.scripts?.daily?.includes("export_public_sample_download.mjs") || pkg.scripts?.daily?.includes("npm run free-pack"), pkg.scripts?.daily || "missing");

  const readme = await readText(path.join(root, "README.md"));
  const readmeZh = await readText(path.join(root, "README.zh-CN.md"));
  assertCheck("README links feeds", readme.includes("/feed.xml") && readme.includes("/feed.json"));
  assertCheck("Chinese README is readable UTF-8", readmeZh.includes("自动化创作者情报产品") && !/[�鏄丅乊]/.test(readmeZh));
  assertCheck("Chinese README links feeds", readmeZh.includes("/feed.xml") && readmeZh.includes("/feed.json"));

  const dailyOpsWorkflow = await readText(path.join(root, ".github", "workflows", "daily-ops.yml"));
  assertCheck("daily ops workflow has schedule", dailyOpsWorkflow.includes("schedule:") && dailyOpsWorkflow.includes("15 7 * * *"));
  assertCheck("daily ops workflow has manual dispatch", dailyOpsWorkflow.includes("workflow_dispatch:"));
  assertCheck("daily ops workflow can commit tracked files", dailyOpsWorkflow.includes("contents: write") && dailyOpsWorkflow.includes("git add -u"));
  assertCheck("daily ops workflow can add issue archives", dailyOpsWorkflow.includes("git add docs/issues site/issues"));
  assertCheck("daily ops workflow can deploy pages", dailyOpsWorkflow.includes("pages: write") && dailyOpsWorkflow.includes("actions/deploy-pages"));
  assertCheck("daily ops workflow runs operate", dailyOpsWorkflow.includes("npm run operate"));
  assertCheck("daily ops workflow avoids ignored lead docs", !dailyOpsWorkflow.includes("git add ."));

  const runOperations = await readText(path.join(root, "scripts", "run_operations.mjs"));
  assertCheck("operate runs email order intake", runOperations.includes("intake-email-orders"));
  assertCheck("operate runs paid email fulfillment", runOperations.includes("fulfill-email-orders"));
  assertCheck("operate refreshes agent watch", runOperations.includes("agent-watch"));

  const latest = await readJson(path.join(root, "data", "latest.json"));
  const issueSlug = issueSlugFromGeneratedAt(latest.generatedAt);
  const currentTop = selectPortfolio(latest.items || []);
  assertCheck("latest data item count", (latest.totalItems || 0) >= 50, String(latest.totalItems || 0));
  assertCheck("latest displayed source errors <= 3", (latest.errorCount || 0) <= 3, String(latest.errorCount || 0));

  const issueTemplate = await readText(path.join(root, ".github", "ISSUE_TEMPLATE", "order-sample-pack.yml"));
  assertCheck("issue form has delivery route field", issueTemplate.includes("id: delivery_route"));
  assertCheck("issue form has safety acknowledgement", issueTemplate.includes("id: safety_acknowledgement"));
  assertCheck("issue form mentions scene-by-scene script", issueTemplate.includes("scene-by-scene ready-to-record script"));

  const syncLeads = await readText(path.join(root, "scripts", "sync_leads.mjs"));
  assertCheck("lead replies mention scene-by-scene script", syncLeads.includes("one scene-by-scene ready-to-record script"));

  const siteIndex = await readText(path.join(root, "site", "index.html"));
  assertCheck("site has email order CTA", siteIndex.includes("Email order"));
  assertCheck("site has GitHub request CTA", siteIndex.includes("Request on GitHub"));
  assertCheck("site has language switch", siteIndex.includes('data-language-toggle="en"') && siteIndex.includes('data-language-toggle="zh"'));
  assertCheck("site has Chinese product copy", siteIndex.includes(homeChineseTitle) && siteIndex.includes(emailOrderZh));
  assertCheck("site sample signal shelf is localized", siteIndex.includes('class="signal-shelf"') && siteIndex.includes("先看 3 条，再决定买哪一档。") && siteIndex.includes("单期 = 先试一包"));
  assertCheck("site has OG image metadata", siteIndex.includes('property="og:image"') && siteIndex.includes("og-image.png"));
  assertCheck("site has consolidated product proof", siteIndex.includes('id="product-proof"') && siteIndex.includes("Proof before purchase") && !siteIndex.includes('class="visual-proof"') && !siteIndex.includes('class="motion-proof"') && !siteIndex.includes('class="signal-runway"'));
  assertCheck("site has product signal board", siteIndex.includes("signal-board.png") && siteIndex.includes('class="product-visual"') && siteIndex.includes('class="signal-ticker"'));
  assertCheck("site links downloadable sample pack", siteIndex.includes("trendfoundry-free-sample-pack.zip") && siteIndex.includes("Download sample pack"));
  assertCheck("site links ready-to-record script", siteIndex.includes("ready-to-record-script.md"));
  assertCheck("site has simplified checkout close", siteIndex.includes('class="checkout-close"') && siteIndex.includes("Inspect first. Order when it fits."));
  assertCheck("site checkout close links order route", siteIndex.includes('class="checkout-close-card primary"') && siteIndex.includes("./order/"));
  assertCheck("site checkout close links custom brief", siteIndex.includes("Custom niche desk") && siteIndex.includes("TrendFoundry%20order%3A%20Custom%20niche%20desk"));
  assertCheck("site links no-login order page", siteIndex.includes("./order/") && siteIndex.includes("Order without login"));
  assertCheck("site has feed alternates", siteIndex.includes('type="application/rss+xml"') && siteIndex.includes('type="application/feed+json"'));
  assertCheck("site renders 3 sample signal cards", (siteIndex.match(/<article class="sample-signal-card card/g) || []).length === 3);
  assertCheck("site links full 12-signal issue from shelf", siteIndex.includes("Open all 12 signals") && siteIndex.includes("./issues/latest.html"));
  assertCheck("site offers separate sample languages", siteIndex.includes("public-sample.en.md") && siteIndex.includes("public-sample.zh-CN.md") && siteIndex.includes("public-sample.en.csv") && siteIndex.includes("public-sample.zh-CN.csv"));
  const appJs = await readText(path.join(root, "site", "app.js"));
  assertCheck("site app persists language choice", appJs.includes("trendfoundry-language") && appJs.includes("setLanguage"));
  assertCheck("site app localizes result count", appJs.includes("条机会") && appJs.includes("Showing"));
  assertCheck("site app supports forced Chinese landing page", appJs.includes("data-force-lang") || appJs.includes("forcedLanguage"));

  const zhIndex = await readText(path.join(root, "site", "zh", "index.html"));
  assertCheck("Chinese landing page exists", zhIndex.includes('<html lang="zh-CN">') && zhIndex.includes(zhLandingTitle));
  assertCheck("Chinese landing page has canonical", zhIndex.includes(`<link rel="canonical" href="${publicBase}zh/">`));
  assertCheck("Chinese landing page has 3 sample signal cards", (zhIndex.match(/<article class="sample-signal-card card/g) || []).length === 3);
  assertCheck("Chinese landing page explains product rules", zhIndex.includes("产品只按投入程度分三档") && zhIndex.includes("单期 = 先试一包") && zhIndex.includes("打开完整 12 条"));
  assertCheck("Chinese landing page links buyer actions", zhIndex.includes("在 GitHub 申请") && zhIndex.includes("邮件下单") && zhIndex.includes("../public-sample.zh-CN.md") && zhIndex.includes("../public-sample.en.md"));
  assertCheck("Chinese landing page links order page", zhIndex.includes("../order/") && zhIndex.includes("无登录下单"));
  assertCheck("Chinese landing page has product signal board", zhIndex.includes("../signal-board.png") && zhIndex.includes('class="product-visual"'));
  assertCheck("Chinese landing page has consolidated product proof", zhIndex.includes('id="product-proof"') && zhIndex.includes("购买前证明") && !zhIndex.includes('class="visual-proof"') && !zhIndex.includes('class="motion-proof"') && !zhIndex.includes('class="signal-runway"'));
  assertCheck("Chinese landing page links downloadable sample pack", zhIndex.includes("../trendfoundry-free-sample-pack.zip") && zhIndex.includes("下载样品包"));

  const orderIndex = await readText(path.join(root, "site", "order", "index.html"));
  assertCheck("order page exists", orderIndex.includes('<link rel="canonical" href="https://bravecownofear.github.io/trendfoundry/order/">') && orderIndex.includes("Order TrendFoundry"));
  assertCheck("order page has all tiers", ["Sample issue", "Weekly pipeline", "Custom niche desk"].every((tier) => orderIndex.includes(tier)));
  assertCheck("order page has email drafts", orderIndex.includes("Open English email") && orderIndex.includes("打开中文邮件") && orderIndex.includes(`mailto:${contactEmail}`));
  assertCheck("order page has copyable drafts", (orderIndex.match(/data-copy-order=/g) || []).length >= 5 && orderIndex.includes("navigator.clipboard") && orderIndex.includes("copy-fallback") && orderIndex.includes("Copy English draft") && orderIndex.includes("复制中文草稿"));
  assertCheck("order page links downloadable sample pack", orderIndex.includes("../trendfoundry-free-sample-pack.zip") && orderIndex.includes("Download sample pack"));
  assertCheck("order page has safety copy", orderIndex.includes("No card details") && orderIndex.includes("payment credentials"));
  assertCheck("order page explains payment reply packet", orderIndex.includes("payment reply packet") && orderIndex.includes("manual invoice reference"));

  const authIndex = await readText(path.join(root, "site", "auth", "index.html"));
  const authConfigText = await readText(path.join(root, "site", "auth", "auth.config.json"));
  const authConfig = JSON.parse(authConfigText);
  const authScript = await readText(path.join(root, "site", "auth.js"));
  assertCheck("auth page exists", authIndex.includes("Access the signal room.") && authIndex.includes("auth-provider-rail") && authIndex.includes("signal-board.png") && authIndex.includes("Google") && authIndex.includes("WeChat") && authIndex.includes("Alipay"));
  assertCheck("auth page keeps static safety copy", authIndex.includes("Secrets stay off the static site") && authIndex.includes("static site cannot complete OAuth token exchange"));
  assertCheck("auth config has empty broker defaults", authConfig.brokerBaseUrl === "" && authConfig.emailSignInEndpoint === "");
  assertCheck("auth config has providers disabled by default", Object.values(authConfig.providers || {}).every((provider) => provider.clientId === "" && provider.enabled === false));
  assertCheck("auth config avoids committed secrets", !/(client_secret|clientSecret|refreshToken|password|signingKey)/i.test(authConfigText));
  assertCheck("auth script blocks unconfigured providers", authScript.includes("needs brokerBaseUrl") && authScript.includes("emailSignInEndpoint"));

  const sampleEn = await readText(path.join(root, "site", "public-sample.en.md"));
  const sampleZh = await readText(path.join(root, "site", "public-sample.zh-CN.md"));
  const sampleCsvEn = await readText(path.join(root, "site", "public-sample.en.csv"));
  const sampleCsvZh = await readText(path.join(root, "site", "public-sample.zh-CN.csv"));
  assertCheck("English public sample exists", sampleEn.includes("Language: English") && sampleEn.includes("Chinese version:"));
  assertCheck("Chinese public sample exists", sampleZh.includes("语言：中文") && sampleZh.includes("English version:"));
  assertCheck("public sample CSVs are language-specific", sampleCsvEn.startsWith("rank,score,source") && sampleCsvZh.startsWith("排名,评分,来源"));

  for (const slug of seoTopicSlugs) {
    const topicFile = path.join(root, "site", "topics", `${slug}.html`);
    assertCheck(`SEO topic exists: ${slug}`, existsSync(topicFile), topicFile);
    if (existsSync(topicFile)) {
      const topicText = await readText(topicFile);
      assertCheck(`SEO topic has canonical: ${slug}`, topicText.includes(`<link rel="canonical" href="${publicBase}topics/${slug}.html">`));
      assertCheck(`SEO topic has paid CTA: ${slug}`, topicText.includes("Request current pack") && topicText.includes("Request sample"));
      assertCheck(`SEO topic has source cards: ${slug}`, (topicText.match(/class="topic-card"/g) || []).length >= 4);
    }
  }
  const robots = await readText(path.join(root, "site", "robots.txt"));
  const sitemap = await readText(path.join(root, "site", "sitemap.xml"));
  assertCheck("robots points to sitemap", robots.includes(`Sitemap: ${publicBase}sitemap.xml`));
  assertCheck("sitemap includes SEO topics", seoTopicSlugs.every((slug) => sitemap.includes(`${publicBase}topics/${slug}.html`)));
  assertCheck("sitemap includes Chinese landing page", sitemap.includes(`${publicBase}zh/`));
  assertCheck("sitemap includes order page", sitemap.includes(`${publicBase}order/`));
  assertCheck("sitemap includes auth page", sitemap.includes(`${publicBase}auth/`));
  assertCheck("sitemap includes downloadable sample pack", sitemap.includes(`${publicBase}trendfoundry-free-sample-pack.zip`) && sitemap.includes(`${publicBase}trendfoundry-free-sample-pack.json`));
  assertCheck("sitemap includes animated workflow preview", sitemap.includes(`${publicBase}signal-demo.svg`));
  assertCheck("sitemap includes feeds", sitemap.includes(`${publicBase}feed.xml`) && sitemap.includes(`${publicBase}feed.json`));
  assertCheck("sitemap includes issue archive", sitemap.includes(`${publicBase}issues/`) && sitemap.includes(`${publicBase}issues/latest.html`) && sitemap.includes(`${publicBase}issues/${issueSlug}.html`));

  const issueMarkdown = await readText(path.join(root, "docs", "issues", `${issueSlug}.md`));
  const issuePage = await readText(path.join(root, "site", "issues", `${issueSlug}.html`));
  const latestIssuePage = await readText(path.join(root, "site", "issues", "latest.html"));
  const issueIndexPage = await readText(path.join(root, "site", "issues", "index.html"));
  assertCheck("docs issue markdown exists", issueMarkdown.includes(`# TrendFoundry Issue ${issueSlug}`) && (issueMarkdown.match(/^### /gm) || []).length === 12);
  assertCheck("site issue page has 12 cards", (issuePage.match(/class="issue-card"/g) || []).length === 12);
  assertCheck("site latest issue mirrors issue page", latestIssuePage.includes(`TrendFoundry Issue ${issueSlug}`) && (latestIssuePage.match(/class="issue-card"/g) || []).length === 12);
  assertCheck("site issue archive index links current issue", issueIndexPage.includes(`./${issueSlug}.html`) && issueIndexPage.includes("Latest issue"));

  const rss = await readText(path.join(root, "site", "feed.xml"));
  const jsonFeed = await readJson(path.join(root, "site", "feed.json"));
  assertCheck("rss feed has channel", rss.includes("<rss") && rss.includes("<channel>") && rss.includes("TrendFoundry Creator Intelligence"));
  assertCheck("rss feed has 12 items", (rss.match(/<item>/g) || []).length === 12);
  assertCheck("rss feed includes order CTA", rss.includes("Order the current pack"));
  assertCheck("json feed has 12 items", jsonFeed.items?.length === 12, String(jsonFeed.items?.length || 0));
  assertCheck("json feed has source tags", (jsonFeed.items || []).every((item) => Array.isArray(item.tags) && item.tags.length >= 2));

  const og = pngSize(path.join(root, "site", "og-image.png"));
  assertCheck("og image is 1200x630", og?.width === 1200 && og?.height === 630, og ? `${og.width}x${og.height}, ${og.bytes} bytes` : "missing");
  const signalBoard = pngSize(path.join(root, "site", "signal-board.png"));
  assertCheck("signal board image is 1200x760", signalBoard?.width === 1200 && signalBoard?.height === 760, signalBoard ? `${signalBoard.width}x${signalBoard.height}, ${signalBoard.bytes} bytes` : "missing");
  const signalDemo = await readText(path.join(root, "site", "signal-demo.svg"));
  assertCheck("signal demo animation exists", signalDemo.includes("<svg") && signalDemo.includes("@keyframes") && signalDemo.includes("demo-row") && signalDemo.includes("Public signal to buyer-ready pack"), signalDemo.slice(0, 120));
  const signalBoardMeta = await readJson(path.join(root, "site", "signal-board.meta.json"));
  assertCheck("signal board meta matches latest data", signalBoardMeta.dataGeneratedAt === latest.generatedAt, `${signalBoardMeta.dataGeneratedAt || "missing"} vs ${latest.generatedAt}`);
  assertCheck(
    "signal board meta lists current top items",
    (signalBoardMeta.topItems || []).slice(0, 5).every((item, index) => item.url === (currentTop[index]?.url || "") && item.score === currentTop[index]?.score),
    JSON.stringify((signalBoardMeta.topItems || []).slice(0, 3))
  );
  const freePackManifest = await readJson(path.join(root, "site", "trendfoundry-free-sample-pack.json"));
  const freePackEntries = zipEntries(path.join(root, "site", "trendfoundry-free-sample-pack.zip"));
  const requiredFreePackFiles = ["README.txt", "order-instructions.md", "public-sample.en.md", "public-sample.zh-CN.md", "public-sample.en.csv", "public-sample.zh-CN.csv", "ready-to-record-script.md", "signal-board.png", "signal-demo.svg", "signal-board.meta.json", "manifest.json"];
  assertCheck("free sample pack manifest exists", freePackManifest.product === "TrendFoundry Free Sample Pack" && freePackManifest.zip === "trendfoundry-free-sample-pack.zip");
  assertCheck("free sample pack zip includes public files", requiredFreePackFiles.every((file) => freePackEntries.includes(file)), freePackEntries.join(", "));
  assertCheck("free sample pack excludes seller-only files", sellerOnly.every((file) => !freePackEntries.includes(file)) && (freePackManifest.excludedSellerOnlyFiles || []).includes("prospects.csv"), freePackEntries.join(", "));

  const packManifest = await readJson(path.join(root, "dist", "trendfoundry-sample-pack", "manifest.json"));
  assertCheck("sample pack manifest classifies buyer deliverables", sellerOnly.every((file) => !(packManifest.buyerDeliverables || []).includes(file)));
  assertCheck("sample pack manifest classifies seller-only files", sellerOnly.every((file) => (packManifest.sellerOnlyFiles || []).includes(file)));
  assertCheck("sample pack includes bilingual sample files", ["public-sample.en.md", "public-sample.zh-CN.md", "public-sample.en.csv", "public-sample.zh-CN.csv"].every((file) => (packManifest.buyerDeliverables || []).includes(file)));

  const scriptText = `${await readText(path.join(root, "docs", "ready-to-record-script.md"))}\n${await readText(path.join(root, "site", "ready-to-record-script.md"))}`;
  assertCheck("ready script has scene-by-scene section", scriptText.includes("## Scene-By-Scene Script"));
  assertCheck("ready script has asset checklist", scriptText.includes("## Asset Checklist"));
  assertCheck("ready script has fact safety notes", scriptText.includes("## Fact Safety Notes"));

  const salesCopy = `${await readText(path.join(root, "docs", "sales-page-copy.md"))}\n${await readText(path.join(root, "site", "sales-page-copy.md"))}`;
  assertCheck("sales copy has no PDF promise", !/PDF or Markdown|PDF brief/.test(salesCopy));
  assertCheck("sales copy does not deliver prospects.csv", !/Delivery:[\s\S]{0,220}prospects\.csv/.test(salesCopy));

  const launchPosts = `${await readText(path.join(root, "docs", "launch-posts.md"))}\n${await readText(path.join(root, "dist", "launch-assets", "launch-posts.md"))}`;
  assertCheck("launch assets are draft-only", launchPosts.includes("draft_review_before_posting") && launchPosts.includes("Review before posting or sending"));
  assertCheck("launch assets include bilingual public sample links", launchPosts.includes("https://bravecownofear.github.io/trendfoundry/public-sample.en.md") && launchPosts.includes("https://bravecownofear.github.io/trendfoundry/public-sample.zh-CN.md"));
  assertCheck("launch assets include no-guarantee warning", launchPosts.includes("do not promise views/revenue") || launchPosts.includes("No promises about views or revenue"));
  assertCheck("launch assets avoid positive view/revenue promises", !/guaranteed (views|revenue)|will get (views|revenue)|grow your (views|revenue)/i.test(launchPosts));

  const commerce = await readJson(path.join(root, "dist", "commerce", "products.json"));
  assertCheck("commerce has 3 products", commerce.products?.length === 3, String(commerce.products?.length || 0));
  assertCheck("commerce mentions scene-by-scene script", JSON.stringify(commerce).includes("scene-by-scene ready-to-record script"));
  const badCommerce = (commerce.products || []).filter((product) => sellerOnly.some((file) => String(product.fulfillment || "").includes(file)));
  assertCheck("commerce fulfillment excludes seller-only files", badCommerce.length === 0, badCommerce.map((product) => product.sku).join(", "));

  const paymentRailExampleText = await readText(path.join(root, "data", "payment-rails.example.json"));
  const paymentRailReadiness = await readJson(path.join(root, "dist", "payment-rails", "readiness.json"));
  const paymentRailDoc = await readText(path.join(root, "docs", "payment-rail-readiness.md"));
  assertCheck("payment rail template has all commerce SKUs", ["trendfoundry-sample-issue", "trendfoundry-weekly-brief", "trendfoundry-custom-niche"].every((sku) => paymentRailExampleText.includes(`\"${sku}\"`)));
  assertCheck("payment rail audit covers all products", paymentRailReadiness.productCount === commerce.products?.length, String(paymentRailReadiness.productCount));
  assertCheck("payment rail audit keeps links out of tracked docs", paymentRailDoc.includes("does not publish checkout URLs") && !/https:\/\/[^\s)]+checkout|payment-link/i.test(paymentRailDoc));
  assertCheck("payment rail config avoids committed secrets", !/(client_secret|secret[_-]?key|api[_-]?key|access[_-]?token|refresh[_-]?token|password|card[_-]?number|cvv|wallet[_-]?seed|seed[_-]?phrase)/i.test(paymentRailExampleText));

  const tempOrderId = "qa-boundary-check";
  const temp = await prepareOrder({
    root,
    buyerName: "QA Boundary",
    buyerContact: "qa@example.com",
    channel: "https://example.com/qa",
    orderType: "sample-issue",
    orderId: tempOrderId
  });
  const orderFiles = await readdir(temp.orderDir);
  const forbidden = orderFiles.filter((file) => sellerOnly.includes(file));
  assertCheck("fulfillment temp order excludes seller-only files", forbidden.length === 0, forbidden.join(", "));
  const tempManifest = await readJson(path.join(temp.orderDir, "manifest.json"));
  assertCheck("fulfillment manifest lists primary buyer value", (tempManifest.primaryValue || []).some((item) => item.includes("scene-by-scene script")));
  const tempEmail = await readText(path.join(temp.orderDir, "delivery-email.md"));
  assertCheck("fulfillment email mentions scene-by-scene script", tempEmail.includes("scene-by-scene script"));
  await rm(temp.orderDir, { recursive: true, force: true });

  const paymentReplyId = "qa-payment-reply";
  const paymentReplyDir = path.join(root, "dist", "payment-replies", paymentReplyId);
  await rm(paymentReplyDir, { recursive: true, force: true });
  const paymentReplyResult = spawnSync(process.execPath, [
    path.join(root, "scripts", "draft_payment_reply.mjs"),
    "--order-id=qa-payment-reply",
    "--tier=weekly-brief",
    "--buyer=QA Buyer",
    "--contact=qa@example.com",
    "--channel=https://example.com/qa",
    "--niche=AI developer tools",
    "--delivery-route=email"
  ], {
    cwd: root,
    encoding: "utf8"
  });
  assertCheck("payment reply script exits", paymentReplyResult.status === 0, paymentReplyResult.stderr || paymentReplyResult.stdout);
  const paymentReplyText = existsSync(path.join(paymentReplyDir, "payment-reply.md")) ? await readText(path.join(paymentReplyDir, "payment-reply.md")) : "";
  const paymentInvoiceText = existsSync(path.join(paymentReplyDir, "invoice-draft.md")) ? await readText(path.join(paymentReplyDir, "invoice-draft.md")) : "";
  const paymentManifest = existsSync(path.join(paymentReplyDir, "manifest.json")) ? await readJson(path.join(paymentReplyDir, "manifest.json")) : {};
  assertCheck("payment reply includes amount and buyer", paymentReplyText.includes("USD 19 / month") && paymentReplyText.includes("QA Buyer"));
  assertCheck("payment reply avoids credential collection", paymentReplyText.includes("Please do not send card numbers") && paymentInvoiceText.includes("No payment action was attempted"));
  assertCheck("payment reply manifest excludes seller-only files", sellerOnly.every((file) => (paymentManifest.excludedSellerOnlyFiles || []).includes(file)));
  assertCheck("payment reply manifest lists buyer deliverables", ["daily-brief.md", "ready-to-record-script.md", "opportunities.csv"].every((file) => (paymentManifest.buyerDeliverablesAfterPayment || []).includes(file)));
  assertCheck("payment reply records hosted checkout readiness", paymentManifest.payment?.hostedCheckoutConfigured === false || paymentManifest.payment?.hostedCheckoutConfigured === true);
  await rm(paymentReplyDir, { recursive: true, force: true });

  const intakeInboxDir = path.join(root, "dist", "qa", "email-order-inbox");
  const intakeOutDir = path.join(root, "dist", "qa", "email-order-intake");
  const intakePaymentDir = path.join(root, "dist", "qa", "email-payment-replies");
  await rm(intakeInboxDir, { recursive: true, force: true });
  await rm(intakeOutDir, { recursive: true, force: true });
  await rm(intakePaymentDir, { recursive: true, force: true });
  await mkdir(intakeInboxDir, { recursive: true });
  await writeFile(
    path.join(intakeInboxDir, "weekly-order.txt"),
    [
      "From: QA Buyer <qa@example.com>",
      "Tier: weekly brief",
      "Buyer: QA Buyer",
      "Contact: qa@example.com",
      "Channel: https://example.com/qa",
      "Niche: AI developer tools",
      "Delivery route: email"
    ].join("\n"),
    "utf8"
  );
  await writeFile(
    path.join(intakeInboxDir, "paid-custom-order.txt"),
    [
      "From: Paid Buyer <paid@example.com>",
      "Tier: custom niche",
      "Buyer: Paid Buyer",
      "Contact: paid@example.com",
      "Channel: https://example.com/paid",
      "Niche: robotics AI demos",
      "Delivery route: email",
      "Paid: yes"
    ].join("\n"),
    "utf8"
  );
  const intakeResult = spawnSync(process.execPath, [
    path.join(root, "scripts", "intake_email_orders.mjs"),
    `--inbox-dir=${intakeInboxDir}`,
    `--out-dir=${intakeOutDir}`,
    `--payment-replies-dir=${intakePaymentDir}`
  ], {
    cwd: root,
    encoding: "utf8"
  });
  assertCheck("email order intake exits", intakeResult.status === 0, intakeResult.stderr || intakeResult.stdout);
  const intakeJson = existsSync(path.join(intakeOutDir, "orders.json")) ? await readJson(path.join(intakeOutDir, "orders.json")) : {};
  const intakePipeline = existsSync(path.join(intakeOutDir, "pipeline.md")) ? await readText(path.join(intakeOutDir, "pipeline.md")) : "";
  const intakeOrder = intakeJson.orders?.[0] || {};
  const paidIntakeOrder = (intakeJson.orders || []).find((order) => order.stage === "paid_needs_fulfillment") || {};
  const intakeReply = intakeOrder.paymentReplyDir ? await readText(path.join(intakeOrder.paymentReplyDir, "payment-reply.md")) : "";
  assertCheck("email order intake parses weekly and paid orders", intakeJson.total === 2 && intakeOrder.tier === "custom-niche" && paidIntakeOrder.buyerContact === "paid@example.com");
  assertCheck("email order intake writes pipeline", intakePipeline.includes("Email Order Intake") && intakePipeline.includes("QA Buyer") && intakePipeline.includes("Paid Buyer"));
  assertCheck("email order intake generates payment reply", intakeReply.includes("USD 49 / month") && intakeReply.includes("Please do not send card numbers"));
  assertCheck("email order intake records no external actions", (intakeJson.safety || []).includes("No inbox connection was opened.") && (intakeJson.safety || []).includes("No payment action was attempted."));

  const emailFulfillmentOutDir = path.join(root, "dist", "qa", "email-fulfillment");
  await rm(emailFulfillmentOutDir, { recursive: true, force: true });
  const emailFulfillmentResult = spawnSync(process.execPath, [
    path.join(root, "scripts", "fulfill_email_orders.mjs"),
    `--intake-file=${path.join(intakeOutDir, "orders.json")}`,
    `--out-dir=${emailFulfillmentOutDir}`
  ], {
    cwd: root,
    encoding: "utf8"
  });
  assertCheck("email fulfillment exits", emailFulfillmentResult.status === 0, emailFulfillmentResult.stderr || emailFulfillmentResult.stdout);
  const emailFulfillment = existsSync(path.join(emailFulfillmentOutDir, "email-orders.json")) ? await readJson(path.join(emailFulfillmentOutDir, "email-orders.json")) : {};
  const preparedEmailOrder = emailFulfillment.prepared?.[0] || {};
  const preparedEmailOrderFiles = preparedEmailOrder.orderDir && existsSync(preparedEmailOrder.orderDir) ? await readdir(preparedEmailOrder.orderDir) : [];
  const forbiddenEmailOrderFiles = preparedEmailOrderFiles.filter((file) => sellerOnly.includes(file));
  assertCheck("email fulfillment prepares only paid order", emailFulfillment.prepared?.length === 1 && preparedEmailOrder.buyerContact === "paid@example.com" && emailFulfillment.skippedCount === 1);
  assertCheck("email fulfillment excludes seller-only files", forbiddenEmailOrderFiles.length === 0, forbiddenEmailOrderFiles.join(", "));
  if (preparedEmailOrder.orderDir) await rm(preparedEmailOrder.orderDir, { recursive: true, force: true });
  await rm(emailFulfillmentOutDir, { recursive: true, force: true });
  await rm(intakeInboxDir, { recursive: true, force: true });
  await rm(intakeOutDir, { recursive: true, force: true });
  await rm(intakePaymentDir, { recursive: true, force: true });

  const opsReport = await readText(path.join(root, "dist", "ops-report", "ops-report.md"));
  assertCheck("ops report safety says no messages sent", opsReport.includes("No messages were sent."));
  assertCheck("ops report has commerce SKU count", /Commerce products:\s+3/.test(opsReport));
  assertCheck("ops report has payment reply count", /Payment reply packets:\s+\d+/.test(opsReport));
  assertCheck("ops report has email order intake count", /Email order intake records:\s+\d+/.test(opsReport));
  assertCheck("ops report has email fulfillment count", /Email fulfillment prepared:\s+\d+/.test(opsReport));
  assertCheck("ops report has launch asset count", /Launch asset files:\s+\d+/.test(opsReport));
  assertCheck("ops report has outreach export count", /Outreach export drafts:\s+\d+/.test(opsReport));
  assertCheck("ops report has QA gate summary", opsReport.includes("## QA Gate") && /Latest online QA:\s+\d+\/\d+ passed/.test(opsReport));

  const agentWatchHtml = await readText(path.join(root, "dist", "agent-watch", "index.html"));
  const agentWatchJson = await readJson(path.join(root, "dist", "agent-watch", "agent-watch.json"));
  assertCheck("agent watch dashboard exists", agentWatchHtml.includes("Human-dependency control room.") && agentWatchHtml.includes("Human dependency queue"));
  assertCheck("agent watch has requirements", Array.isArray(agentWatchJson.requirements) && agentWatchJson.requirements.length >= 5);
  assertCheck("agent watch has human dependency queue", Array.isArray(agentWatchJson.humanQueue) && agentWatchJson.humanQueue.some((item) => item.type === "Payment rail"));
  assertCheck("agent watch has outreach send review row", Array.isArray(agentWatchJson.humanQueue) && agentWatchJson.humanQueue.some((item) => item.type === "Outreach send review"));
  assertCheck("agent watch avoids buyer contacts", !/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(agentWatchHtml.replace("rivan_Britain@outlook.com", "")));

  const outreachExportManifest = await readJson(path.join(root, "dist", "content-outreach-export", "manifest.json"));
  const outreachExportPublic = await readText(path.join(root, "docs", "content-outreach-export.md"));
  assertCheck("outreach export manifest avoids auto-send", outreachExportManifest.safety?.sendsMessages === false && outreachExportManifest.safety?.collectsPayment === false && outreachExportManifest.safety?.requiresManualRecipientEntry === true);
  assertCheck("outreach export public doc keeps draft bodies private", outreachExportPublic.includes("Public-safe draft bodies exposed here: 0") && !/```[\s\S]*?Hi /.test(outreachExportPublic));
  assertCheck("outreach export draft count matches send batch", typeof outreachExportManifest.draftCount === "number" && outreachExportManifest.draftCount <= outreachExportManifest.sourceBatchRows + 0);

  const outreachRoutesManifest = await readJson(path.join(root, "dist", "content-outreach-routes", "manifest.json"));
  const outreachRoutesJson = await readJson(path.join(root, "dist", "content-outreach-routes", "routes.json"));
  const outreachRoutesPublic = await readText(path.join(root, "docs", "content-outreach-routes.md"));
  const actionBriefManifest = await readJson(path.join(root, "dist", "content-action-brief", "manifest.json"));
  assertCheck("outreach routes avoid external actions", outreachRoutesManifest.safety?.sendsMessages === false && outreachRoutesManifest.safety?.logsIn === false && outreachRoutesManifest.safety?.collectsPrivateEmails === false && outreachRoutesManifest.safety?.guessesPrivateRecipients === false && outreachRoutesManifest.safety?.requiresVerifiedRecipientBeforeSend === true);
  assertCheck("outreach routes cover exported drafts", outreachRoutesManifest.rowsWithRoutes >= outreachExportManifest.draftCount && outreachRoutesManifest.routeCandidateCount >= outreachRoutesManifest.rowsWithRoutes);
  assertCheck("outreach routes public doc keeps details private", outreachRoutesPublic.includes("Detailed creator rows stay in ignored") && outreachRoutesPublic.includes("Verified recipient addresses exposed here: 0") && !/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(outreachRoutesPublic.replace(contactEmail, "")));
  assertCheck("outreach routes JSON has no private emails", !/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(JSON.stringify(outreachRoutesJson)));
  assertCheck("action brief prioritizes contact research before sending", actionBriefManifest.topActionLane === "contact_research" && actionBriefManifest.laneCounts?.contact_research >= 1);

  if (skipScheduler) {
    pass("scheduled task checks skipped", "--skip-scheduler");
  } else {
    const dailyTask = schtasks("TrendFoundryDaily");
    if (dailyTask.skipped) {
      pass("scheduled task: TrendFoundryDaily skipped", "non-Windows");
    } else {
      assertCheck("scheduled task: TrendFoundryDaily ready/existing", dailyTask.status === 0, `status ${dailyTask.status}`);
      assertCheck("scheduled task: TrendFoundryDaily uses run_daily.ps1", dailyTask.output.includes("scripts\\run_daily.ps1"));
      assertCheck("scheduled task: TrendFoundryDaily last result 0", /Last Result:\s+0/.test(dailyTask.output));
    }

    const leadTask = schtasks("TrendFoundryLeadSync");
    if (leadTask.skipped) {
      pass("scheduled task: TrendFoundryLeadSync skipped", "non-Windows");
    } else {
      assertCheck("scheduled task: TrendFoundryLeadSync ready/existing", leadTask.status === 0, `status ${leadTask.status}`);
      assertCheck("scheduled task: TrendFoundryLeadSync uses run_leads.ps1", leadTask.output.includes("scripts\\run_leads.ps1"));
      assertCheck("scheduled task: TrendFoundryLeadSync last result 0", /Last Result:\s+0/.test(leadTask.output));
    }
  }
}

async function fetchText(url) {
  const response = await fetch(url, { cache: "no-store" });
  const text = await response.text();
  return { status: response.status, text };
}

async function fetchBytes(url) {
  const response = await fetch(url, { cache: "no-store" });
  const bytes = Buffer.from(await response.arrayBuffer());
  return { status: response.status, bytes };
}

async function checkOnline() {
  const index = await fetchText(`${publicBase}?qa=${Date.now()}`);
  assertCheck("online index HTTP 200", index.status === 200, String(index.status));
  assertCheck("online index has OG image", index.text.includes("og-image.png"));
  assertCheck("online index has email CTA", index.text.includes("Email order"));
  assertCheck("online index has product signal board", index.text.includes("signal-board.png") && index.text.includes('class="product-visual"'));
  assertCheck("online index has consolidated product proof", index.text.includes('id="product-proof"') && index.text.includes("Proof before purchase") && !index.text.includes('class="visual-proof"') && !index.text.includes('class="motion-proof"') && !index.text.includes('class="signal-runway"'));
  assertCheck("online index links downloadable sample pack", index.text.includes("trendfoundry-free-sample-pack.zip"));

  const zhIndex = await fetchText(`${publicBase}zh/?qa=${Date.now()}`);
  assertCheck("online Chinese landing page HTTP 200", zhIndex.status === 200, String(zhIndex.status));
  assertCheck("online Chinese landing page has Chinese copy", zhIndex.text.includes(zhLandingTitle) && zhIndex.text.includes(emailOrderZh));
  assertCheck("online Chinese landing page has 12 cards", (zhIndex.text.match(/<article class="card"/g) || []).length === 12);

  const orderIndex = await fetchText(`${publicBase}order/?qa=${Date.now()}`);
  assertCheck("online order page HTTP 200", orderIndex.status === 200, String(orderIndex.status));
  assertCheck("online order page has email CTAs", orderIndex.text.includes("Order by email") && orderIndex.text.includes("Open English email") && orderIndex.text.includes("打开中文邮件"));
  assertCheck("online order page has copyable drafts", (orderIndex.text.match(/data-copy-order=/g) || []).length >= 5 && orderIndex.text.includes("navigator.clipboard") && orderIndex.text.includes("copy-fallback") && orderIndex.text.includes("Copy English draft"));
  assertCheck("online order page links downloadable sample pack", orderIndex.text.includes("../trendfoundry-free-sample-pack.zip") || orderIndex.text.includes("trendfoundry-free-sample-pack.zip"));
  assertCheck("online order page avoids public payment details", orderIndex.text.includes("No card details") && orderIndex.text.includes("payment credentials"));
  assertCheck("online order page explains payment reply packet", orderIndex.text.includes("payment reply packet") && orderIndex.text.includes("manual invoice reference"));

  const authIndex = await fetchText(`${publicBase}auth/?qa=${Date.now()}`);
  assertCheck("online auth page HTTP 200", authIndex.status === 200, String(authIndex.status));
  assertCheck("online auth page keeps static safety copy", authIndex.text.includes("Secrets stay off the static site") && authIndex.text.includes("Google") && authIndex.text.includes("WeChat"));

  const sampleEn = await fetchText(`${publicBase}public-sample.en.md?qa=${Date.now()}`);
  assertCheck("online English public sample HTTP 200", sampleEn.status === 200, String(sampleEn.status));
  assertCheck("online English public sample has language marker", sampleEn.text.includes("Language: English"));

  const sampleZh = await fetchText(`${publicBase}public-sample.zh-CN.md?qa=${Date.now()}`);
  assertCheck("online Chinese public sample HTTP 200", sampleZh.status === 200, String(sampleZh.status));
  assertCheck("online Chinese public sample has UTF-8 marker", sampleZh.text.includes("语言：中文"));

  const readyScript = await fetchText(`${publicBase}ready-to-record-script.md?qa=${Date.now()}`);
  assertCheck("online ready script HTTP 200", readyScript.status === 200, String(readyScript.status));
  assertCheck("online ready script has scene-by-scene section", readyScript.text.includes("## Scene-By-Scene Script"));
  assertCheck("online ready script has asset checklist", readyScript.text.includes("## Asset Checklist"));
  assertCheck("online ready script has fact safety notes", readyScript.text.includes("## Fact Safety Notes"));

  const image = await fetchBytes(`${publicBase}og-image.png?qa=${Date.now()}`);
  const width = image.bytes.length >= 24 ? image.bytes.readUInt32BE(16) : 0;
  const height = image.bytes.length >= 24 ? image.bytes.readUInt32BE(20) : 0;
  assertCheck("online OG image HTTP 200", image.status === 200, String(image.status));
  assertCheck("online OG image 1200x630", width === 1200 && height === 630, `${width}x${height}`);

  const signalImage = await fetchBytes(`${publicBase}signal-board.png?qa=${Date.now()}`);
  const signalWidth = signalImage.bytes.length >= 24 ? signalImage.bytes.readUInt32BE(16) : 0;
  const signalHeight = signalImage.bytes.length >= 24 ? signalImage.bytes.readUInt32BE(20) : 0;
  assertCheck("online signal board image HTTP 200", signalImage.status === 200, String(signalImage.status));
  assertCheck("online signal board image 1200x760", signalWidth === 1200 && signalHeight === 760, `${signalWidth}x${signalHeight}`);
  const signalMeta = await fetchText(`${publicBase}signal-board.meta.json?qa=${Date.now()}`);
  assertCheck("online signal board meta HTTP 200", signalMeta.status === 200, String(signalMeta.status));
  try {
    const parsedSignalMeta = JSON.parse(signalMeta.text);
    assertCheck("online signal board meta matches current data", parsedSignalMeta.dataGeneratedAt === (await readJson(path.join(root, "data", "latest.json"))).generatedAt, parsedSignalMeta.dataGeneratedAt || "missing");
  } catch (error) {
    assertCheck("online signal board meta parses", false, error.message);
  }

  const signalDemo = await fetchText(`${publicBase}signal-demo.svg?qa=${Date.now()}`);
  assertCheck("online signal demo HTTP 200", signalDemo.status === 200, String(signalDemo.status));
  assertCheck("online signal demo is animated SVG", signalDemo.text.includes("<svg") && signalDemo.text.includes("@keyframes") && signalDemo.text.includes("demo-row") && signalDemo.text.includes("Public signal to buyer-ready pack"));

  const freePack = await fetchBytes(`${publicBase}trendfoundry-free-sample-pack.zip?qa=${Date.now()}`);
  const freePackNames = zipEntryNamesFromBytes(freePack.bytes);
  assertCheck("online free sample pack HTTP 200", freePack.status === 200, String(freePack.status));
  assertCheck("online free sample pack includes public files", ["README.txt", "order-instructions.md", "public-sample.en.md", "public-sample.zh-CN.md", "signal-demo.svg", "manifest.json"].every((file) => freePackNames.includes(file)), freePackNames.join(", "));
  assertCheck("online free sample pack excludes seller-only files", sellerOnly.every((file) => !freePackNames.includes(file)), freePackNames.join(", "));

  const freePackManifest = await fetchText(`${publicBase}trendfoundry-free-sample-pack.json?qa=${Date.now()}`);
  assertCheck("online free sample pack manifest HTTP 200", freePackManifest.status === 200, String(freePackManifest.status));
  try {
    const parsedFreePackManifest = JSON.parse(freePackManifest.text);
    assertCheck("online free sample pack manifest has safety", parsedFreePackManifest.product === "TrendFoundry Free Sample Pack" && (parsedFreePackManifest.excludedSellerOnlyFiles || []).includes("prospects.csv"));
  } catch (error) {
    assertCheck("online free sample pack manifest parses", false, error.message);
  }

  const sitemap = await fetchText(`${publicBase}sitemap.xml?qa=${Date.now()}`);
  assertCheck("online sitemap HTTP 200", sitemap.status === 200, String(sitemap.status));
  assertCheck("online sitemap has SEO topics", seoTopicSlugs.every((slug) => sitemap.text.includes(`${publicBase}topics/${slug}.html`)));
  assertCheck("online sitemap has Chinese landing page", sitemap.text.includes(`${publicBase}zh/`));
  assertCheck("online sitemap has auth page", sitemap.text.includes(`${publicBase}auth/`));
  assertCheck("online sitemap has feeds", sitemap.text.includes(`${publicBase}feed.xml`) && sitemap.text.includes(`${publicBase}feed.json`));
  assertCheck("online sitemap has issue archive", sitemap.text.includes(`${publicBase}issues/`) && sitemap.text.includes(`${publicBase}issues/latest.html`));

  const topic = await fetchText(`${publicBase}topics/ai-video-ideas.html?qa=${Date.now()}`);
  assertCheck("online SEO topic HTTP 200", topic.status === 200, String(topic.status));
  assertCheck("online SEO topic has paid CTA", topic.text.includes("Request current pack") && topic.text.includes("Request sample"));

  const rss = await fetchText(`${publicBase}feed.xml?qa=${Date.now()}`);
  assertCheck("online RSS feed HTTP 200", rss.status === 200, String(rss.status));
  assertCheck("online RSS feed has 12 items", (rss.text.match(/<item>/g) || []).length === 12);

  const jsonFeed = await fetchText(`${publicBase}feed.json?qa=${Date.now()}`);
  assertCheck("online JSON feed HTTP 200", jsonFeed.status === 200, String(jsonFeed.status));
  try {
    const parsed = JSON.parse(jsonFeed.text);
    assertCheck("online JSON feed has 12 items", parsed.items?.length === 12, String(parsed.items?.length || 0));
  } catch (error) {
    assertCheck("online JSON feed parses", false, error.message);
  }

  const latestIssue = await fetchText(`${publicBase}issues/latest.html?qa=${Date.now()}`);
  assertCheck("online latest issue HTTP 200", latestIssue.status === 200, String(latestIssue.status));
  assertCheck("online latest issue has 12 cards", (latestIssue.text.match(/class="issue-card"/g) || []).length === 12);

  const issueIndex = await fetchText(`${publicBase}issues/?qa=${Date.now()}`);
  assertCheck("online issue archive index HTTP 200", issueIndex.status === 200, String(issueIndex.status));
  assertCheck("online issue archive index has latest link", issueIndex.text.includes("Latest issue") && issueIndex.text.includes("Public issue archive"));
}

function markdownReport() {
  const failed = checks.filter((check) => check.status === "fail");
  const rows = checks.map((check) => `| ${check.status === "pass" ? "PASS" : "FAIL"} | ${check.name} | ${String(check.detail || "").replace(/\|/g, "/")} |`);
  return `# TrendFoundry QA Report

Generated: ${new Date().toISOString()}

Mode: ${online ? "local + online" : "local"}${skipScheduler ? " / scheduler skipped" : ""}

Summary: ${checks.length - failed.length}/${checks.length} passed.

| Status | Check | Detail |
|---|---|---|
${rows.join("\n")}
`;
}

await mkdir(qaDir, { recursive: true });
await checkLocal();
if (online) await checkOnline();

const failed = checks.filter((check) => check.status === "fail");
const passed = checks.length - failed.length;
const qaPayload = {
  generatedAt: new Date().toISOString(),
  online,
  skipScheduler,
  passed,
  failed: failed.length,
  total: checks.length,
  checks
};
await writeFile(path.join(qaDir, "latest-qa.json"), JSON.stringify(qaPayload, null, 2), "utf8");
if (online) {
  await writeFile(path.join(qaDir, "latest-online-qa.json"), JSON.stringify(qaPayload, null, 2), "utf8");
} else if (skipScheduler) {
  await writeFile(path.join(qaDir, "latest-ops-qa.json"), JSON.stringify(qaPayload, null, 2), "utf8");
} else {
  await writeFile(path.join(qaDir, "latest-local-qa.json"), JSON.stringify(qaPayload, null, 2), "utf8");
}
await writeFile(path.join(qaDir, "latest-qa.md"), markdownReport(), "utf8");

console.log(`QA: ${passed}/${checks.length} passed`);
console.log(`Report: ${path.join(qaDir, "latest-qa.md")}`);

if (failed.length) {
  for (const check of failed) {
    console.error(`FAIL ${check.name}: ${check.detail}`);
  }
  process.exit(1);
}
