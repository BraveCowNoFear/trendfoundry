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
const sellerOnly = ["prospects.csv", "outreach-board.md", "latest.json"];
const homeChineseTitle = "\u7ed9 AI \u548c\u5f00\u53d1\u8005\u89c6\u9891\u9891\u9053\u7684\u521b\u4f5c\u8005\u60c5\u62a5\u5305";
const zhLandingTitle = "\u7ed9 B \u7ad9\u548c\u4e2d\u6587\u6280\u672f\u9891\u9053\u7684 AI \u521b\u4f5c\u8005\u60c5\u62a5\u5305";
const emailOrderZh = "\u90ae\u4ef6\u4e0b\u5355";
const requiredScripts = [
  "daily",
  "operate",
  "commerce",
  "leads",
  "fulfill",
  "fulfill-ready",
  "draft-outreach",
  "ops-report",
  "launch-assets",
  "social",
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

  const latest = await readJson(path.join(root, "data", "latest.json"));
  const issueSlug = issueSlugFromGeneratedAt(latest.generatedAt);
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
  assertCheck("site card copy is localized", siteIndex.includes("为什么现在") && siteIndex.includes("制作大纲") && siteIndex.includes("B 站角度"));
  assertCheck("site has OG image metadata", siteIndex.includes('property="og:image"') && siteIndex.includes("og-image.png"));
  assertCheck("site has visual preview section", siteIndex.includes('class="visual-proof"'));
  assertCheck("site links ready-to-record script", siteIndex.includes("ready-to-record-script.md"));
  assertCheck("site has SEO hub", siteIndex.includes('class="seo-hub"') && siteIndex.includes("Search pages"));
  assertCheck("site has feed subscribe box", siteIndex.includes('class="feed-box"') && siteIndex.includes("RSS feed") && siteIndex.includes("JSON feed"));
  assertCheck("site has issue archive box", siteIndex.includes('class="archive-box"') && siteIndex.includes("Latest issue") && siteIndex.includes("Issue archive"));
  assertCheck("site has feed alternates", siteIndex.includes('type="application/rss+xml"') && siteIndex.includes('type="application/feed+json"'));
  assertCheck("site renders 12 cards", (siteIndex.match(/<article class="card"/g) || []).length === 12);
  assertCheck("site offers separate sample languages", siteIndex.includes("public-sample.en.md") && siteIndex.includes("public-sample.zh-CN.md") && siteIndex.includes("public-sample.en.csv") && siteIndex.includes("public-sample.zh-CN.csv"));
  const appJs = await readText(path.join(root, "site", "app.js"));
  assertCheck("site app persists language choice", appJs.includes("trendfoundry-language") && appJs.includes("setLanguage"));
  assertCheck("site app localizes result count", appJs.includes("个可见机会") && appJs.includes("visible opportunity"));
  assertCheck("site app supports forced Chinese landing page", appJs.includes("data-force-lang") || appJs.includes("forcedLanguage"));

  const zhIndex = await readText(path.join(root, "site", "zh", "index.html"));
  assertCheck("Chinese landing page exists", zhIndex.includes('<html lang="zh-CN">') && zhIndex.includes(zhLandingTitle));
  assertCheck("Chinese landing page has canonical", zhIndex.includes(`<link rel="canonical" href="${publicBase}zh/">`));
  assertCheck("Chinese landing page has 12 cards", (zhIndex.match(/<article class="card"/g) || []).length === 12);
  assertCheck("Chinese landing page links buyer actions", zhIndex.includes("在 GitHub 申请") && zhIndex.includes("邮件下单") && zhIndex.includes("../public-sample.zh-CN.md") && zhIndex.includes("../public-sample.en.md"));

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

  const opsReport = await readText(path.join(root, "dist", "ops-report", "ops-report.md"));
  assertCheck("ops report safety says no messages sent", opsReport.includes("No messages were sent."));
  assertCheck("ops report has commerce SKU count", /Commerce products:\s+3/.test(opsReport));
  assertCheck("ops report has launch asset count", /Launch asset files:\s+\d+/.test(opsReport));
  assertCheck("ops report has QA gate summary", opsReport.includes("## QA Gate") && /Latest online QA:\s+\d+\/\d+ passed/.test(opsReport));

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

  const zhIndex = await fetchText(`${publicBase}zh/?qa=${Date.now()}`);
  assertCheck("online Chinese landing page HTTP 200", zhIndex.status === 200, String(zhIndex.status));
  assertCheck("online Chinese landing page has Chinese copy", zhIndex.text.includes(zhLandingTitle) && zhIndex.text.includes(emailOrderZh));
  assertCheck("online Chinese landing page has 12 cards", (zhIndex.text.match(/<article class="card"/g) || []).length === 12);

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

  const sitemap = await fetchText(`${publicBase}sitemap.xml?qa=${Date.now()}`);
  assertCheck("online sitemap HTTP 200", sitemap.status === 200, String(sitemap.status));
  assertCheck("online sitemap has SEO topics", seoTopicSlugs.every((slug) => sitemap.text.includes(`${publicBase}topics/${slug}.html`)));
  assertCheck("online sitemap has Chinese landing page", sitemap.text.includes(`${publicBase}zh/`));
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
