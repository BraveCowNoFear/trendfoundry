import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { AUTH_PROVIDERS, publicProvider } from "./lib/auth_providers.mjs";

const root = process.cwd();
const data = JSON.parse(await readFile(path.join(root, "data", "latest.json"), "utf8"));
const siteDir = path.join(root, "site");
const docsDir = path.join(root, "docs");
const topicsDir = path.join(siteDir, "topics");
const zhDir = path.join(siteDir, "zh");
const orderDir = path.join(siteDir, "order");
const authDir = path.join(siteDir, "auth");
const siteIssuesDir = path.join(siteDir, "issues");
const docsIssuesDir = path.join(docsDir, "issues");
const contactEmail = "rivan_Britain@outlook.com";
const publicSiteUrl = "https://bravecownofear.github.io/trendfoundry/";
const ogImageUrl = `${publicSiteUrl}og-image.png`;
const orderSubject = encodeURIComponent("TrendFoundry sample pack order");
const orderBody = encodeURIComponent("Hi, I want to order the TrendFoundry $9 sample pack. Please send the latest issue and payment instructions.");
const orderHref = `mailto:${contactEmail}?subject=${orderSubject}&body=${orderBody}`;
const issueOrderHref = "https://github.com/BraveCowNoFear/trendfoundry/issues/new?template=order-sample-pack.yml&title=Sample%20pack%20request%3A%20";
const authHref = `${publicSiteUrl}auth/`;
await mkdir(siteDir, { recursive: true });
await mkdir(docsDir, { recursive: true });
await mkdir(topicsDir, { recursive: true });
await mkdir(zhDir, { recursive: true });
await mkdir(orderDir, { recursive: true });
await mkdir(authDir, { recursive: true });
await mkdir(siteIssuesDir, { recursive: true });
await mkdir(docsIssuesDir, { recursive: true });

const authProviders = AUTH_PROVIDERS.map(publicProvider);

const providerAvatarMeta = {
  google: ["G", "#4285f4", "#34a853"],
  apple: ["A", "#111114", "#f5f5f7"],
  microsoft: ["M", "#7fba00", "#00a4ef"],
  github: ["GH", "#24292f", "#ffffff"],
  facebook: ["f", "#1877f2", "#ffffff"],
  x: ["X", "#050505", "#ffffff"],
  linkedin: ["in", "#0a66c2", "#ffffff"],
  wechat: ["微", "#07c160", "#ffffff"],
  qq: ["Q", "#12b7f5", "#ffffff"],
  weibo: ["微", "#e6162d", "#ffd54a"],
  alipay: ["支", "#1677ff", "#ffffff"],
  dingtalk: ["钉", "#2f88ff", "#ffffff"],
  feishu: ["飞", "#00b96b", "#4c6fff"],
  line: ["L", "#06c755", "#ffffff"],
  email: ["@", "#111114", "#f5f5f7"]
};

function brandLogo() {
  return `<span class="brand-lockup"><span class="brand-mark" aria-hidden="true"><span></span></span><span class="brand-word">TrendFoundry</span></span>`;
}

function providerAvatar(provider, extraClass = "") {
  const [glyph, colorA, colorB] = providerAvatarMeta[provider.id] || [provider.label.slice(0, 2), "#111114", "#f5f5f7"];
  return `<span class="provider-avatar ${extraClass}" style="--provider-a:${escapeHtml(colorA)};--provider-b:${escapeHtml(colorB)}" aria-hidden="true"><span>${escapeHtml(glyph)}</span></span>`;
}

const authProviderCards = authProviders
  .map(
    (provider) => `<button class="provider-button" type="button" data-provider="${provider.id}">
  ${providerAvatar(provider)}
  <span><strong>${escapeHtml(provider.label)}</strong><small>${escapeHtml(provider.description)}</small></span>
  <em>${escapeHtml(provider.region)}</em>
</button>`
  )
  .join("");
const authProviderOrbit = authProviders
  .map((provider, index) => `<span class="auth-orbit-avatar" data-auth-avatar="${escapeHtml(provider.id)}" style="--orbit-index:${index}">${providerAvatar(provider, "provider-avatar-small")}</span>`)
  .join("");
const emailAccessProvider = {
  id: "email",
  label: "Email",
  description: "Magic-link fallback",
  region: "Direct inbox"
};
const authPrimaryChoices = [
  authProviders.find((provider) => provider.id === "google"),
  authProviders.find((provider) => provider.id === "apple"),
  emailAccessProvider
].filter(Boolean);
const authQuickLogins = authPrimaryChoices
  .map(
    (provider, index) => `<button class="auth-quick-login${index === 0 ? " primary" : ""}" type="button" data-auth-choice="${escapeHtml(provider.id)}">
  ${providerAvatar(provider)}
  <span>${provider.id === "email" ? "Email access" : `Continue with ${escapeHtml(provider.label)}`}</span>
</button>`
  )
  .join("");
const authProviderRail = [...authProviders, emailAccessProvider]
  .map(
    (provider) => `<button class="auth-rail-avatar" type="button" data-auth-choice="${escapeHtml(provider.id)}" data-auth-avatar="${escapeHtml(provider.id)}">
  ${providerAvatar(provider)}
  <span>${escapeHtml(provider.label)}</span>
</button>`
  )
  .join("");

const authProviderConfig = Object.fromEntries(
  authProviders.map((provider) => [
    provider.id,
    {
      label: provider.label,
      authorizationEndpoint: provider.authUrl,
      clientId: "",
      scope: provider.scope,
      enabled: false
    }
  ])
);

const authConfigExample = JSON.stringify(
  {
    brokerBaseUrl: "",
    redirectUri: `${publicSiteUrl}auth/`,
    emailSignInEndpoint: "",
    providers: authProviderConfig
  },
  null,
  2
);

const authSetupDoc = `# TrendFoundry Auth Setup

The public site now includes a static account page at ${publicSiteUrl}auth/.

Supported account providers:

${authProviders.map((provider) => `- ${provider.label}: ${provider.description}`).join("\n")}

## Production model

This repository can run as static GitHub Pages or as a Node-served site. Static GitHub Pages cannot safely exchange OAuth codes for tokens by itself. The included \`npm start\` server now exposes a small OAuth broker at \`/api/auth\` for self-hosted deployments.

1. Static GitHub Pages: leave \`site/auth/auth.config.json\` public and empty, or point \`brokerBaseUrl\` to a hosted auth service.
2. Node/self-hosted: run \`npm start\`. The server dynamically serves \`/auth/auth.config.json\`, starts provider redirects at \`/api/auth/oauth/start/:provider\`, receives callbacks at \`/api/auth/oauth/callback/:provider\`, and exposes \`/api/auth/session\` plus \`/api/auth/logout\`.
3. Provider credentials: set environment variables with this shape: \`TRENDFOUNDRY_AUTH_GOOGLE_CLIENT_ID\`, \`TRENDFOUNDRY_AUTH_GOOGLE_CLIENT_SECRET\`, \`TRENDFOUNDRY_AUTH_WECHAT_CLIENT_ID\`, \`TRENDFOUNDRY_AUTH_WECHAT_CLIENT_SECRET\`, etc. Use the provider id in uppercase. Optional variables: \`TRENDFOUNDRY_AUTH_<PROVIDER>_SCOPE\`, \`TRENDFOUNDRY_AUTH_<PROVIDER>_AUTH_URL\`, \`TRENDFOUNDRY_AUTH_<PROVIDER>_TOKEN_URL\`, \`TRENDFOUNDRY_AUTH_<PROVIDER>_USERINFO_URL\`.
4. Session signing: set \`TRENDFOUNDRY_AUTH_SESSION_SECRET\` in production.
5. Email login: connect a mailer to \`/api/auth/email\` before promising real magic-link delivery.

Never commit provider client secrets, OAuth app secrets, signing keys, refresh tokens, or buyer private payment details to this repository.
`;

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
const sourceMixZh = Object.entries(bySource)
  .map(([source, count]) => `${source} ${count} 个`)
  .join(" / ");
const sourceLegend = Object.entries(bySource)
  .map(([source, count]) => `<button type="button" data-source-lens="${escapeHtml(source)}" aria-pressed="false"><span>${escapeHtml(sourceLabel({ source }))}</span><strong>${count}</strong></button>`)
  .join("");
const sourceMixPanel = `<div class="source-mix-panel">
        ${dual("Source mix", "来源组合", "p", ' class="source-mix-label"')}
        <div class="source-legend" aria-label="Source mix">
          <button class="active" type="button" data-source-lens="all" aria-pressed="true"><span>${dual("All", "全部")}</span><strong>${top.length}</strong></button>
          ${sourceLegend}
        </div>
      </div>`;
const publicSample = top.slice(0, 3);
const boardItems = top.slice(0, 5);
const boardRows = boardItems
  .map(
    (item, index) => `<li data-board-source="${escapeHtml(item.source)}">
      <span>#${index + 1}</span>
      <strong>${escapeHtml(sourceLabel(item))}</strong>
      <em>${escapeHtml(String(item.score))}</em>
    </li>`
  )
  .join("");
const boardTicker = boardItems
  .map(
    (item, index) => `<span style="--delay:${index * 0.55}s"><strong>${escapeHtml(sourceLabel(item))}</strong>${escapeHtml(englishSampleTitle(item))}</span>`
  )
  .join("");
const productVisual = `<div class="product-visual" aria-label="TrendFoundry signal board preview">
        <div class="product-screen">
          <img src="./signal-board.png" alt="TrendFoundry ranked signal board with source lanes and current creator opportunities" width="1200" height="760">
          <div class="signal-ticker" aria-hidden="true">${boardTicker}</div>
        </div>
        <ul class="board-summary">${boardRows}</ul>
        ${sourceMixPanel}
      </div>`;
const fitPersonaItems = {
  "sample-issue": top[0] || null,
  "weekly-pipeline": top.find((item) => item.source === "bilibili" || item.source === "youtube") || top[1] || top[0] || null,
  "custom-niche": top.find((item) => item.source === "github" || item.source === "arxiv") || top[2] || top[0] || null
};
const fitPersonas = [
  {
    id: "sample-issue",
    eyebrowEn: "Tier 01",
    eyebrowZh: "档 01",
    labelEn: "Sample issue",
    labelZh: "单期样品",
    shortEn: "Sample",
    shortZh: "单期",
    priceEn: "$9",
    priceZh: "$9",
    ruleEn: "Test one issue",
    ruleZh: "先试一份",
    titleEn: "Use when you want to test one issue before subscribing.",
    titleZh: "适合先买一份，确认格式和选题质量。",
    copyEn: "A one-time issue with 12 ranked ideas, CSV, risk notes, and one script.",
    copyZh: "一次交付 12 个排序选题、CSV、风险备注和一版脚本。",
    kitEn: "12 ideas + CSV + risk notes",
    kitZh: "12 个选题 + CSV + 风险备注",
    cadenceEn: "one-time",
    cadenceZh: "一次交付",
    progress: 72,
    strengthEn: "Lowest commitment",
    strengthZh: "最低投入",
    velocityEn: "first validation",
    velocityZh: "先验证质量",
    item: fitPersonaItems["sample-issue"]
  },
  {
    id: "weekly-pipeline",
    eyebrowEn: "Tier 02",
    eyebrowZh: "档 02",
    labelEn: "Weekly pipeline",
    labelZh: "周更情报",
    shortEn: "Weekly",
    shortZh: "周更",
    priceEn: "$19/mo",
    priceZh: "$19/月",
    ruleEn: "Keep the queue warm",
    ruleZh: "持续供题",
    titleEn: "Use when your channel needs a stable weekly topic queue.",
    titleZh: "适合需要稳定周更选题队列的创作者。",
    copyEn: "A fresh 12-idea issue every week with sources, angles, outlines, and notes.",
    copyZh: "每周补充 12 个可录制选题，附来源、角度、大纲和备注。",
    kitEn: "weekly 12-idea issue",
    kitZh: "每周 12 个新选题",
    cadenceEn: "weekly",
    cadenceZh: "每周更新",
    progress: 64,
    strengthEn: "Default subscription",
    strengthZh: "默认订阅档",
    velocityEn: "steady publishing",
    velocityZh: "稳定更新",
    item: fitPersonaItems["weekly-pipeline"]
  },
  {
    id: "custom-niche",
    eyebrowEn: "Tier 03",
    eyebrowZh: "档 03",
    labelEn: "Custom niche desk",
    labelZh: "垂直定制",
    shortEn: "Custom",
    shortZh: "定制",
    priceEn: "$49/mo",
    priceZh: "$49/月",
    ruleEn: "Only your niche",
    ruleZh: "只看你的赛道",
    titleEn: "Use when one niche needs its own sources and stricter filters.",
    titleZh: "适合只服务一个赛道，并需要专属来源和筛选规则。",
    copyEn: "Custom sources, niche scoring, stricter filters, and lead angles for one lane.",
    copyZh: "定制来源、垂类评分、严格过滤和只服务一个赛道的角度。",
    kitEn: "custom sources + niche scoring",
    kitZh: "定制来源 + 垂类评分",
    cadenceEn: "monthly custom",
    cadenceZh: "每月定制",
    progress: 81,
    strengthEn: "Highest focus",
    strengthZh: "最高聚焦",
    velocityEn: "own one lane",
    velocityZh: "占住一个赛道",
    item: fitPersonaItems["custom-niche"]
  }
];
const defaultFitPersona = fitPersonas[0];
const fitSources = [
  ["News", "新闻", "news"],
  ["Bilibili", "B 站", "bilibili"],
  ["YouTube", "YouTube", "youtube"],
  ["Hacker News", "Hacker News", "hn"],
  ["GitHub", "GitHub", "github"],
  ["arXiv", "arXiv", "arxiv"]
];
const fitSourceRows = fitSources
  .map(([labelEn, labelZh, source], index) => `<li data-fit-source-row="${escapeHtml(source)}" style="--row-index:${index}">
      <span>${escapeHtml(labelEn.slice(0, 2).toUpperCase())}</span>
      <strong data-i18n-en="${escapeHtml(labelEn)}" data-i18n-zh="${escapeHtml(labelZh)}">${escapeHtml(labelEn)}</strong>
      <em aria-hidden="true"></em>
    </li>`)
  .join("");
const fitPipelineStages = [
  ["Detect", "发现"],
  ["Validate", "验证"],
  ["Curate", "策划"],
  ["Package", "打包"]
];
const fitPipelineColumns = fitPipelineStages
  .map(([labelEn, labelZh], index) => `<div class="fit-pipeline-column" style="--stage-index:${index}">
      <p data-i18n-en="${escapeHtml(labelEn)}" data-i18n-zh="${escapeHtml(labelZh)}">${escapeHtml(labelEn)}</p>
      <span></span>
      <span></span>
    </div>`)
  .join("");
const fitMatrixRows = [
  {
    labelEn: "Signal summary",
    labelZh: "信号摘要",
    packs: ["youtube", "bilibili", "deeptech"]
  },
  {
    labelEn: "Source proof",
    labelZh: "来源证据",
    packs: ["youtube", "bilibili", "deeptech"]
  },
  {
    labelEn: "Publishing angles",
    labelZh: "发布角度",
    packs: ["youtube"]
  },
  {
    labelEn: "Reply angle",
    labelZh: "回复角度",
    packs: ["bilibili"]
  },
  {
    labelEn: "POV claim",
    labelZh: "观点主张",
    packs: ["deeptech"]
  }
];
const fitMatrixHeader = fitPersonas
  .map(persona => `<span data-matrix-column="${escapeHtml(persona.id)}" class="${persona.id === defaultFitPersona.id ? "active" : ""}" data-i18n-en="${escapeHtml(persona.shortEn)}" data-i18n-zh="${escapeHtml(persona.shortZh)}">${escapeHtml(persona.shortEn)}</span>`)
  .join("");
const fitMatrixBody = fitMatrixRows
  .map(row => `<div class="fit-matrix-row">
      <strong data-i18n-en="${escapeHtml(row.labelEn)}" data-i18n-zh="${escapeHtml(row.labelZh)}">${escapeHtml(row.labelEn)}</strong>
      ${fitPersonas.map(persona => `<span data-matrix-column="${escapeHtml(persona.id)}" class="${persona.id === defaultFitPersona.id ? "active" : ""}">${row.packs.includes(persona.id) ? "✓" : "–"}</span>`).join("")}
    </div>`)
  .join("");
const fitPersonaButtons = fitPersonas
  .map((persona, index) => `<button class="fit-persona${index === 0 ? " active" : ""}" type="button" data-fit-persona="${escapeHtml(persona.id)}" aria-pressed="${index === 0 ? "true" : "false"}"
    data-fit-pack-en="${escapeHtml(persona.labelEn)}" data-fit-pack-zh="${escapeHtml(persona.labelZh)}"
    data-fit-short-en="${escapeHtml(persona.shortEn)}" data-fit-short-zh="${escapeHtml(persona.shortZh)}"
    data-fit-price-en="${escapeHtml(persona.priceEn)}" data-fit-price-zh="${escapeHtml(persona.priceZh)}"
    data-fit-rule-en="${escapeHtml(persona.ruleEn)}" data-fit-rule-zh="${escapeHtml(persona.ruleZh)}"
    data-fit-title-en="${escapeHtml(persona.titleEn)}" data-fit-title-zh="${escapeHtml(persona.titleZh)}"
    data-fit-copy-en="${escapeHtml(persona.copyEn)}" data-fit-copy-zh="${escapeHtml(persona.copyZh)}"
    data-fit-kit-en="${escapeHtml(persona.kitEn)}" data-fit-kit-zh="${escapeHtml(persona.kitZh)}"
    data-fit-cadence-en="${escapeHtml(persona.cadenceEn)}" data-fit-cadence-zh="${escapeHtml(persona.cadenceZh)}"
    data-fit-strength-en="${escapeHtml(persona.strengthEn)}" data-fit-strength-zh="${escapeHtml(persona.strengthZh)}"
    data-fit-velocity-en="${escapeHtml(persona.velocityEn)}" data-fit-velocity-zh="${escapeHtml(persona.velocityZh)}"
    data-fit-progress="${escapeHtml(persona.progress)}"
    data-fit-source-en="When to choose" data-fit-source-zh="适用场景"
    data-fit-signal-en="${escapeHtml(persona.titleEn)}"
    data-fit-signal-zh="${escapeHtml(persona.titleZh)}"
    data-fit-url="#pricing">
      <span data-i18n-en="${escapeHtml(persona.eyebrowEn)}" data-i18n-zh="${escapeHtml(persona.eyebrowZh)}">${escapeHtml(persona.eyebrowEn)}</span>
      <strong data-i18n-en="${escapeHtml(persona.labelEn)}" data-i18n-zh="${escapeHtml(persona.labelZh)}">${escapeHtml(persona.labelEn)}</strong>
      <b data-i18n-en="${escapeHtml(persona.priceEn)}" data-i18n-zh="${escapeHtml(persona.priceZh)}">${escapeHtml(persona.priceEn)}</b>
      <small data-i18n-en="${escapeHtml(persona.ruleEn)}" data-i18n-zh="${escapeHtml(persona.ruleZh)}">${escapeHtml(persona.ruleEn)}</small>
    </button>`)
  .join("");
const fitStudio = `<section class="fit-studio product-rules" id="fit-studio" aria-label="Product pack rules">
      <div class="fit-copy">
        ${dual("How to choose", "怎么选档", "p", ' class="section-label"')}
        ${dual("Pick the tier by how often you need decisions.", "按你需要决策的频率选档。", "h2")}
        ${dual("Sample validates the format. Weekly keeps your queue supplied. Custom narrows the desk to your niche.", "单期先验证，周更保持队列，定制只看你的赛道。", "p")}
        <div class="fit-personas" aria-label="Product pack modes">${fitPersonaButtons}</div>
      </div>
      <div class="fit-device" data-fit-device="${escapeHtml(defaultFitPersona.id)}" style="--fit-progress:${escapeHtml(defaultFitPersona.progress)}%">
        <div class="fit-device-screen">
          <div class="fit-console-head">
            <div>
              <p class="fit-device-label" data-i18n-en="Selected tier" data-i18n-zh="已选档位">Selected tier</p>
              <strong id="fit-title" data-i18n-en="${escapeHtml(defaultFitPersona.labelEn)}" data-i18n-zh="${escapeHtml(defaultFitPersona.labelZh)}">${escapeHtml(defaultFitPersona.labelEn)}</strong>
            </div>
            <span class="fit-price" id="fit-price" data-i18n-en="${escapeHtml(defaultFitPersona.priceEn)}" data-i18n-zh="${escapeHtml(defaultFitPersona.priceZh)}">${escapeHtml(defaultFitPersona.priceEn)}</span>
          </div>
          <p class="fit-tier-rule" id="fit-strength" data-i18n-en="${escapeHtml(defaultFitPersona.ruleEn)}" data-i18n-zh="${escapeHtml(defaultFitPersona.ruleZh)}">${escapeHtml(defaultFitPersona.ruleEn)}</p>
          <a class="fit-signal-card fit-preview-card" id="fit-signal-link" href="#pricing">
            <span id="fit-source" data-i18n-en="When to choose" data-i18n-zh="适用场景">When to choose</span>
            <strong id="fit-signal" data-i18n-en="${escapeHtml(defaultFitPersona.titleEn)}" data-i18n-zh="${escapeHtml(defaultFitPersona.titleZh)}">${escapeHtml(defaultFitPersona.titleEn)}</strong>
            <p id="fit-preview-copy" data-i18n-en="${escapeHtml(defaultFitPersona.copyEn)}" data-i18n-zh="${escapeHtml(defaultFitPersona.copyZh)}">${escapeHtml(defaultFitPersona.copyEn)}</p>
          </a>
          <div class="fit-telemetry" aria-label="Tier summary facts">
            <span><strong data-i18n-en="Delivery" data-i18n-zh="交付">Delivery</strong><small id="fit-kit" data-i18n-en="${escapeHtml(defaultFitPersona.kitEn)}" data-i18n-zh="${escapeHtml(defaultFitPersona.kitZh)}">${escapeHtml(defaultFitPersona.kitEn)}</small></span>
            <span><strong data-i18n-en="Cadence" data-i18n-zh="节奏">Cadence</strong><small id="fit-cadence" data-i18n-en="${escapeHtml(defaultFitPersona.cadenceEn)}" data-i18n-zh="${escapeHtml(defaultFitPersona.cadenceZh)}">${escapeHtml(defaultFitPersona.cadenceEn)}</small></span>
            <span><strong data-i18n-en="Best for" data-i18n-zh="适合">Best for</strong><small id="fit-velocity" data-i18n-en="${escapeHtml(defaultFitPersona.velocityEn)}" data-i18n-zh="${escapeHtml(defaultFitPersona.velocityZh)}">${escapeHtml(defaultFitPersona.velocityEn)}</small></span>
          </div>
        </div>
      </div>
    </section>`;
const zhProductVisual = `<div class="product-visual" aria-label="TrendFoundry signal board preview">
        <div class="product-screen">
          <img src="../signal-board.png" alt="TrendFoundry 按来源和评分整理的当前创作者机会看板" width="1200" height="760">
          <div class="signal-ticker" aria-hidden="true">${boardTicker}</div>
        </div>
        <ul class="board-summary">${boardRows}</ul>
        ${sourceMixPanel}
      </div>`;
const runwayItem = top[0] || boardItems[0];
const runwayStages = [
  ["01", "Proof", "证据", "Keep the original public source attached to the opportunity.", "把原始公开来源一直附在机会旁边。"],
  ["02", "Score", "评分", "Compress novelty, creator fit, recordability, and risk into one decision signal.", "把新鲜度、创作者匹配、可录制性和风险压缩成一个决策信号。"],
  ["03", "Shape", "成型", "Turn the signal into title angles, hook, demo path, and limitation note.", "把信号变成标题角度、钩子、演示路径和限制说明。"],
  ["04", "Ship", "交付", "Package Markdown, CSV, script, and issue page so the buyer can record.", "打包 Markdown、CSV、脚本和期刊页，让买家可以开录。"]
];
const runwayStageButtons = runwayStages
  .map(([number, label, labelZh, text, textZh], index) => `<button class="runway-stage${index === 0 ? " active" : ""}" type="button" data-runway-stage="${index}" aria-pressed="${index === 0 ? "true" : "false"}">
          <span>${number}</span>
          <strong>${dual(label, labelZh)}</strong>
          ${dual(text, textZh, "em")}
        </button>`)
  .join("");
const zhRunwayStageButtons = runwayStages
  .map(([number, , labelZh, , textZh], index) => `<button class="runway-stage${index === 0 ? " active" : ""}" type="button" data-runway-stage="${index}" aria-pressed="${index === 0 ? "true" : "false"}">
          <span>${number}</span>
          <strong>${escapeHtml(labelZh)}</strong>
          <em>${escapeHtml(textZh)}</em>
        </button>`)
  .join("");
const runwayStagePanels = runwayStages
  .map(([number, label, labelZh, text, textZh], index) => `<article class="runway-panel${index === 0 ? " active" : ""}" data-runway-panel="${index}">
          <p>${number} / ${dual(label, labelZh)}</p>
          ${dual(text, textZh, "h3")}
        </article>`)
  .join("");
const zhRunwayStagePanels = runwayStages
  .map(([number, , labelZh, , textZh], index) => `<article class="runway-panel${index === 0 ? " active" : ""}" data-runway-panel="${index}">
          <p>${number} / ${escapeHtml(labelZh)}</p>
          <h3>${escapeHtml(textZh)}</h3>
        </article>`)
  .join("");
const runwayTitle = runwayItem ? englishSampleTitle(runwayItem) : "Ranked creator opportunity";
const zhRunwayTitle = runwayItem ? (runwayItem.deliverables?.bilibiliTitles?.[0] || runwayItem.title) : "已排序创作者机会";
const runwaySource = runwayItem ? sourceLabel(runwayItem) : "Public source";
const runwayScore = runwayItem ? String(runwayItem.score) : "0";
const signalRunway = `<section class="signal-runway" id="signal-runway" aria-label="Evidence runway">
      <div class="runway-copy">
        ${dual("Evidence runway", "证据跑道", "p", ' class="section-label"')}
        ${dual("One public signal becomes a recording decision.", "一条公开信号，变成一次录制决策。", "h2")}
        ${dual("The Apple-like moment here is restraint: fewer moving parts, but every step keeps the buyer confident that the opportunity can be traced, judged, shaped, and shipped.", "这里的苹果感来自克制：动作更少，但每一步都让买家确信机会可以追溯、判断、成型并交付。", "p")}
      </div>
      <div class="runway-console" style="--runway-progress:25%">
        <div class="runway-topline">
          <span>${escapeHtml(runwaySource)}</span>
          <strong>${dual("Score", "评分")} ${escapeHtml(runwayScore)}</strong>
        </div>
        <div class="runway-product">
          <div class="runway-card">
            ${dual("Current candidate", "当前候选", "p")}
            <h3>${escapeHtml(runwayTitle)}</h3>
            <a href="${escapeHtml(runwayItem?.url || "./issues/latest.html")}" target="_blank" rel="noreferrer">${dual("Open proof source", "打开来源")}</a>
          </div>
          <div class="runway-line" aria-hidden="true"><span></span></div>
          <div class="runway-panels">${runwayStagePanels}</div>
        </div>
        <div class="runway-stages" aria-label="Evidence stages">${runwayStageButtons}</div>
      </div>
    </section>`;
const zhSignalRunway = `<section class="signal-runway" id="signal-runway" aria-label="Evidence runway">
      <div class="runway-copy">
        <p class="section-label">证据跑道</p>
        <h2>一条公开信号，变成一次录制决策。</h2>
        <p>这里的苹果感来自克制：动作更少，但每一步都让买家确信机会可以追溯、判断、成型并交付。</p>
      </div>
      <div class="runway-console" style="--runway-progress:25%">
        <div class="runway-topline">
          <span>${escapeHtml(runwaySource)}</span>
          <strong>评分 ${escapeHtml(runwayScore)}</strong>
        </div>
        <div class="runway-product">
          <div class="runway-card">
            <p>当前候选</p>
            <h3>${escapeHtml(zhRunwayTitle)}</h3>
            <a href="${escapeHtml(runwayItem?.url || "../issues/latest.html")}" target="_blank" rel="noreferrer">打开来源</a>
          </div>
          <div class="runway-line" aria-hidden="true"><span></span></div>
          <div class="runway-panels">${zhRunwayStagePanels}</div>
        </div>
        <div class="runway-stages" aria-label="Evidence stages">${zhRunwayStageButtons}</div>
      </div>
    </section>`;

const pricingTiers = [
  {
    name: "Sample issue",
    nameZh: "单期样品",
    price: "$9",
    cadence: "one-time",
    cadenceZh: "一次性",
    commitment: "Test once",
    commitmentZh: "先试一次",
    bestFor: "A proof-backed pack for testing one channel before you subscribe.",
    bestForZh: "先买一份带证据的选题包，测试是否适合你的频道。",
    includes: ["12 ranked ideas", "1 ready-to-record script", "CSV signal table", "Risk notes"],
    includesZh: ["12 个排序选题", "1 份可直接录制的脚本", "CSV 信号表", "风险备注"],
    action: "Request sample",
    actionZh: "申请样品",
    href: issueOrderHref,
    featured: false
  },
  {
    name: "Weekly pipeline",
    nameZh: "周更情报",
    price: "$19",
    cadence: "monthly",
    cadenceZh: "每月",
    commitment: "Keep queue alive",
    commitmentZh: "保持选题队列",
    bestFor: "The default subscription for a steady recording queue every week.",
    bestForZh: "默认订阅档：每周补充一批可录制选题。",
    includes: ["Weekly 12-idea issue", "Fresh source mix", "Bilibili + YouTube angles", "Outline for each idea"],
    includesZh: ["每周 12 个选题", "新鲜来源组合", "B 站 + YouTube 角度", "每个选题配大纲"],
    action: "Start weekly",
    actionZh: "开始周更",
    href: orderHref,
    featured: true
  },
  {
    name: "Custom niche desk",
    nameZh: "垂直定制",
    price: "$49",
    cadence: "monthly",
    cadenceZh: "每月",
    commitment: "Own a niche",
    commitmentZh: "占住一个垂类",
    bestFor: "A focused desk for one audience, niche, or technical vertical.",
    bestForZh: "围绕一个受众、垂类或技术方向建立专属情报桌。",
    includes: ["Custom source queries", "Niche-specific ranking", "Stricter quality filters", "Lead/outreach angles"],
    includesZh: ["定制来源查询", "垂类专属排序", "更严格质量过滤", "线索/外联角度"],
    action: "Ask for custom",
    actionZh: "咨询定制",
    href: issueOrderHref,
    featured: false
  }
];

function dual(en, zh, tag = "span", attrs = "") {
  return `<${tag}${attrs} data-i18n-en="${escapeHtml(en)}" data-i18n-zh="${escapeHtml(zh)}">${escapeHtml(en)}</${tag}>`;
}

function langAttr(en, zh, name = "placeholder") {
  return `data-i18n-${name}-en="${escapeHtml(en)}" data-i18n-${name}-zh="${escapeHtml(zh)}" ${name}="${escapeHtml(en)}"`;
}

function heroTierSelector(lang = "en") {
  const isZh = lang === "zh";
  return `<div class="hero-metrics hero-tier-selector" aria-label="${isZh ? "产品分档选择器" : "Product tier selector"}">
    ${pricingTiers
      .map((tier, index) => {
        const selected = tier.featured ? " is-selected" : "";
        const name = isZh ? tier.nameZh : tier.name;
        const commitment = isZh ? tier.commitmentZh : tier.commitment;
        const cadence = isZh ? tier.cadenceZh : tier.cadence;
        const priceCadence = isZh
          ? (tier.cadenceZh === "每月" ? `${tier.price}/月` : `${tier.price} ${cadence}`)
          : (tier.cadence === "monthly" ? `${tier.price}/mo` : `${tier.price} ${cadence}`);
        return `<button class="hero-tier-card${selected}" type="button" data-hero-tier="${escapeHtml(tierSlug(tier))}" aria-pressed="${tier.featured ? "true" : "false"}">
      <span class="hero-tier-number">${String(index + 1).padStart(2, "0")}</span>
      <span class="hero-tier-copy">
        <strong data-i18n-en="${escapeHtml(tier.name)}" data-i18n-zh="${escapeHtml(tier.nameZh)}">${escapeHtml(name)}</strong>
        <small><b>${escapeHtml(priceCadence)}</b> · <span data-i18n-en="${escapeHtml(tier.commitment)}" data-i18n-zh="${escapeHtml(tier.commitmentZh)}">${escapeHtml(commitment)}</span></small>
      </span>
    </button>`;
      })
      .join("")}
  </div>`;
}

const heroTiers = heroTierSelector("en");
const zhHeroTiers = heroTierSelector("zh");

function tierSlug(tier) {
  return tier.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function tierOrderHref(tier, lang = "en") {
  const subject = encodeURIComponent(`TrendFoundry order: ${tier.name}`);
  const body = orderDraftBody(tier, lang);
  return `mailto:${contactEmail}?subject=${subject}&body=${encodeURIComponent(body)}`;
}

function tierDecisionMeta(tier) {
  if (tier.name === "Sample issue") {
    return {
      packEn: "One brief, CSV signal table, risk notes, and a recording script.",
      packZh: "一份情报简报、CSV 信号表、风险备注和录制脚本。",
      deliveryEn: "Delivered once after the request is reviewed.",
      deliveryZh: "请求审核后一次性交付。",
      routeEn: "Best for proving whether TrendFoundry fits your channel.",
      routeZh: "适合先验证 TrendFoundry 是否适合你的频道。"
    };
  }
  if (tier.name === "Custom niche desk") {
    return {
      packEn: "Custom source queries, niche scoring, strict filters, and lead angles.",
      packZh: "定制来源查询、垂类评分、严格过滤和线索角度。",
      deliveryEn: "A monthly desk shaped around one narrow audience.",
      deliveryZh: "每月围绕一个窄受众交付专属情报桌。",
      routeEn: "Best when focus matters more than broad discovery.",
      routeZh: "适合垂类聚焦比泛发现更重要的场景。"
    };
  }
  return {
    packEn: "A weekly 12-idea issue with sources, angles, and outlines.",
    packZh: "每周 12 个选题，包含来源、角度和录制大纲。",
    deliveryEn: "A new issue every week inside one monthly subscription.",
    deliveryZh: "按月订阅，每周收到新一期。",
    routeEn: "Best for keeping a reliable recording queue alive.",
    routeZh: "适合持续维护稳定录制队列。"
  };
}

function orderDraftBody(tier, lang = "en") {
  return lang === "zh"
    ? `你好，我想订购 TrendFoundry ${tier.nameZh}（${tier.price} ${tier.cadenceZh}）。\n\n我的频道：\n主要平台：Bilibili / YouTube / other\n我想要的主题方向：\n偏好交付方式：email / GitHub issue\n\n请发送付款说明和下一步交付流程。`
    : `Hi, I want to order TrendFoundry ${tier.name} (${tier.price} ${tier.cadence}).\n\nMy channel:\nMain platform: YouTube / Bilibili / other\nNiche preference:\nPreferred delivery route: email / GitHub issue\n\nPlease send payment instructions and the next delivery step.`;
}

function orderDraftText(tier, lang = "en") {
  const subject = `Subject: TrendFoundry order: ${lang === "zh" ? tier.nameZh : tier.name}`;
  return `${subject}\n\n${orderDraftBody(tier, lang)}`;
}

function copyOrderButton(tier, lang = "en", label = "Copy draft", labelZh = "复制草稿", extraClass = "") {
  return `<button class="action copy-action${extraClass}" type="button" data-copy-order="${escapeHtml(orderDraftText(tier, lang))}" data-copy-label="${escapeHtml(label)}" data-copy-success="${lang === "zh" ? "已复制" : "Copied"}">${dual(label, labelZh)}</button>`;
}

const pricingCards = pricingTiers
  .map(
    (tier, index) => {
      const decision = tierDecisionMeta(tier);
      return `<article class="tier${tier.featured ? " featured selected" : ""}" data-tier-card="${escapeHtml(tierSlug(tier))}" data-tier-index="${index}" data-tier-name-en="${escapeHtml(tier.name)}" data-tier-name-zh="${escapeHtml(tier.nameZh)}" data-tier-price="${escapeHtml(tier.price)}" data-tier-cadence-en="${escapeHtml(tier.cadence)}" data-tier-cadence-zh="${escapeHtml(tier.cadenceZh)}" data-tier-commitment-en="${escapeHtml(tier.commitment)}" data-tier-commitment-zh="${escapeHtml(tier.commitmentZh)}" data-tier-best-en="${escapeHtml(tier.bestFor)}" data-tier-best-zh="${escapeHtml(tier.bestForZh)}" data-tier-action-en="${escapeHtml(tier.action)}" data-tier-action-zh="${escapeHtml(tier.actionZh)}" data-tier-href-en="${escapeHtml(tierOrderHref(tier, "en"))}" data-tier-href-zh="${escapeHtml(tierOrderHref(tier, "zh"))}" data-tier-pack-en="${escapeHtml(decision.packEn)}" data-tier-pack-zh="${escapeHtml(decision.packZh)}" data-tier-delivery-en="${escapeHtml(decision.deliveryEn)}" data-tier-delivery-zh="${escapeHtml(decision.deliveryZh)}" data-tier-route-en="${escapeHtml(decision.routeEn)}" data-tier-route-zh="${escapeHtml(decision.routeZh)}">
  <div>
    ${dual(tier.cadence, tier.cadenceZh, "p", ' class="tier-kicker"')}
    ${dual(tier.name, tier.nameZh, "h3")}
    <p class="tier-price">${escapeHtml(tier.price)}</p>
    ${dual(tier.commitment, tier.commitmentZh, "strong", ' class="tier-commitment"')}
    ${dual(tier.bestFor, tier.bestForZh, "p")}
  </div>
  <ul>${tier.includes.slice(0, 3).map((item, index) => `<li>${dual(item, tier.includesZh[index])}</li>`).join("")}</ul>
  <div class="tier-actions">
    <button class="action tier-select-action${tier.featured ? " primary" : ""}" type="button" data-tier-select="${escapeHtml(tierSlug(tier))}" aria-pressed="${tier.featured ? "true" : "false"}">${dual("Select tier", "选择此档")}</button>
    <a class="action tier-direct-action" href="${escapeHtml(tierOrderHref(tier))}" data-tier-direct="${escapeHtml(tierSlug(tier))}" data-tier-href-en="${escapeHtml(tierOrderHref(tier, "en"))}" data-tier-href-zh="${escapeHtml(tierOrderHref(tier, "zh"))}">${dual(tier.action, tier.actionZh)}</a>
  </div>
</article>`;
    }
  )
  .join("");
const pricingRail = `<div class="pricing-rail" role="tablist" aria-label="Pricing plan selector">
  ${pricingTiers
    .map(
      (tier, index) => {
        const featuredBadge = tier.featured ? `\n    ${dual("Best default", "默认推荐", "em")}` : "";
        return `<button class="pricing-rail-option${tier.featured ? " active" : ""}" type="button" role="tab" aria-selected="${tier.featured ? "true" : "false"}" data-tier-jump="${escapeHtml(tierSlug(tier))}">
    <span>${index + 1}</span>
    <strong>${dual(tier.name, tier.nameZh)}</strong>
    <small>${escapeHtml(tier.price)} ${dual(tier.cadence, tier.cadenceZh)}</small>${featuredBadge}
  </button>`;
      }
    )
    .join("")}
</div>`;
const defaultPricingTier = pricingTiers.find((tier) => tier.featured) || pricingTiers[0];
const defaultTierDecision = tierDecisionMeta(defaultPricingTier);
const pricingChooser = `<div class="pricing-chooser" aria-live="polite">
    <div>
      ${dual("Order summary", "订单摘要", "p", ' class="pricing-chooser-label"')}
      <h3 id="selected-tier-name" data-i18n-en="${escapeHtml(defaultPricingTier.name)}" data-i18n-zh="${escapeHtml(defaultPricingTier.nameZh)}">${escapeHtml(defaultPricingTier.name)}</h3>
      <p id="selected-tier-copy" data-i18n-en="${escapeHtml(defaultPricingTier.bestFor)}" data-i18n-zh="${escapeHtml(defaultPricingTier.bestForZh)}">${escapeHtml(defaultPricingTier.bestFor)}</p>
      <p class="selected-tier-commitment" id="selected-tier-commitment" data-i18n-en="${escapeHtml(defaultPricingTier.commitment)}" data-i18n-zh="${escapeHtml(defaultPricingTier.commitmentZh)}">${escapeHtml(defaultPricingTier.commitment)}</p>
      <div class="pricing-configurator" aria-label="Selected offer details">
        <div>
          <span></span>
          <strong data-i18n-en="Files" data-i18n-zh="文件">Files</strong>
          <small id="selected-tier-pack" data-i18n-en="${escapeHtml(defaultTierDecision.packEn)}" data-i18n-zh="${escapeHtml(defaultTierDecision.packZh)}">${escapeHtml(defaultTierDecision.packEn)}</small>
        </div>
        <div>
          <span></span>
          <strong data-i18n-en="Delivery" data-i18n-zh="交付方式">Delivery</strong>
          <small id="selected-tier-delivery" data-i18n-en="${escapeHtml(defaultTierDecision.deliveryEn)}" data-i18n-zh="${escapeHtml(defaultTierDecision.deliveryZh)}">${escapeHtml(defaultTierDecision.deliveryEn)}</small>
        </div>
        <div>
          <span></span>
          <strong data-i18n-en="Best for" data-i18n-zh="适合">Best for</strong>
          <small id="selected-tier-route" data-i18n-en="${escapeHtml(defaultTierDecision.routeEn)}" data-i18n-zh="${escapeHtml(defaultTierDecision.routeZh)}">${escapeHtml(defaultTierDecision.routeEn)}</small>
        </div>
      </div>
    </div>
    <div class="pricing-chooser-action">
      <strong><span id="selected-tier-price">${escapeHtml(defaultPricingTier.price)}</span> <small id="selected-tier-cadence" data-i18n-en="${escapeHtml(defaultPricingTier.cadence)}" data-i18n-zh="${escapeHtml(defaultPricingTier.cadenceZh)}">${escapeHtml(defaultPricingTier.cadence)}</small></strong>
      <a class="action primary" id="selected-tier-cta" href="${escapeHtml(tierOrderHref(defaultPricingTier))}" data-i18n-en="${escapeHtml(defaultPricingTier.action)}" data-i18n-zh="${escapeHtml(defaultPricingTier.actionZh)}">${escapeHtml(defaultPricingTier.action)}</a>
    </div>
  </div>`;

const orderTierCards = pricingTiers
  .map(
    (tier) => `<article class="tier${tier.featured ? " featured" : ""}">
  <div>
    ${dual(tier.name, tier.nameZh, "h3")}
    <p class="tier-price">${escapeHtml(tier.price)}</p>
    ${dual(tier.bestFor, tier.bestForZh, "p")}
  </div>
  <ul>${tier.includes.map((item, index) => `<li>${dual(item, tier.includesZh[index])}</li>`).join("")}</ul>
  <div class="order-actions">
    <a class="action${tier.featured ? " primary" : ""}" href="${tierOrderHref(tier)}">${dual("Order by email", "邮件下单")}</a>
    ${copyOrderButton(tier, "en", "Copy draft", "复制草稿")}
    <a class="action" href="${tierOrderHref(tier, "zh")}">${dual("Chinese email draft", "中文邮件草稿")}</a>
  </div>
</article>`
  )
  .join("");

const deliveryItems = [
  ["Proof links", "来源链接", "Every idea keeps the original public source attached.", "每个选题都保留原始公开来源，方便买家核验。"],
  ["Recordable angle", "可录制角度", "Titles, hook, outline, demo step, and limitation are generated together.", "标题、钩子、大纲、演示步骤和限制说明一起生成。"],
  ["Quality control", "质量控制", "Hype, rights-risk, and too-broad signals are flagged before they reach the display pack.", "炒作、版权风险和过宽泛信号会在进入展示包前被标记。"],
  ["Simple ordering", "轻量下单", "Request the current issue through GitHub or email and get the delivery details directly.", "通过 GitHub 或邮件申请当前期次，并直接收到交付说明。"]
];
const deliveryChecklist = deliveryItems
  .map(([label, labelZh, text, textZh]) => `<li><strong>${dual(label, labelZh)}</strong>${dual(text, textZh, "span")}</li>`)
  .join("");
const deliveryPreviewItem = top[0] || publicSample[0];
const deliveryPreviewTitle = deliveryPreviewItem ? englishSampleTitle(deliveryPreviewItem) : "Ranked creator opportunity";
const zhDeliveryPreviewTitle = deliveryPreviewItem ? (deliveryPreviewItem.deliverables?.bilibiliTitles?.[0] || deliveryPreviewItem.title) : "已排序创作者机会";
const deliveryPreviewSource = deliveryPreviewItem ? sourceLabel(deliveryPreviewItem) : "Public source";
const deliveryPreviewScore = deliveryPreviewItem ? String(deliveryPreviewItem.score) : "0";
const deliveryPreviewRisk = deliveryPreviewItem?.qualityRisk || "Rights and implementation limits need a quick source check before recording.";
const zhDeliveryPreviewRisk = deliveryPreviewItem ? zhLimitation(deliveryPreviewItem) : "录制前需要快速核验来源、版权和实现限制。";
const deliveryPreviewTabs = [
  {
    id: "brief",
    number: "01",
    label: "Brief",
    labelZh: "Brief",
    caption: "Ranked card",
    captionZh: "排序机会卡",
    title: "The ranked opportunity card",
    titleZh: "已排序机会卡",
    metric: "Score " + deliveryPreviewScore,
    metricZh: "评分 " + deliveryPreviewScore,
    status: "Brief selected",
    statusZh: "已选择 Brief",
    body: `#1 ${deliveryPreviewTitle}\nSource: ${deliveryPreviewSource}\nScore: ${deliveryPreviewScore}\nWhy now: source-backed signal with a concrete recording angle.\nRisk: ${deliveryPreviewRisk}`,
    bodyZh: `#1 ${zhDeliveryPreviewTitle}\n来源：${deliveryPreviewSource}\n评分：${deliveryPreviewScore}\n为什么现在：有来源支撑，并且已经成型为可录制角度。\n风险：${zhDeliveryPreviewRisk}`
  },
  {
    id: "csv",
    number: "02",
    label: "CSV",
    labelZh: "CSV",
    caption: "Sortable table",
    captionZh: "可排序表",
    title: "The sortable buyer table",
    titleZh: "可排序买家表格",
    metric: "12 rows",
    metricZh: "12 行",
    status: "CSV table selected",
    statusZh: "已选择 CSV 表格",
    body: `rank,source,score,title,risk\n1,${deliveryPreviewSource},${deliveryPreviewScore},"${deliveryPreviewTitle}","${deliveryPreviewRisk}"`,
    bodyZh: `rank,source,score,title,risk\n1,${deliveryPreviewSource},${deliveryPreviewScore},"${zhDeliveryPreviewTitle}","${zhDeliveryPreviewRisk}"`
  },
  {
    id: "script",
    number: "03",
    label: "Script",
    labelZh: "脚本",
    caption: "Recording pass",
    captionZh: "录制初稿",
    title: "The first recording pass",
    titleZh: "第一版录制脚本",
    metric: "4 beats",
    metricZh: "4 段",
    status: "Script selected",
    statusZh: "已选择脚本",
    body: `Hook: turn the source signal into a viewer question.\nDemo path: show the project, workflow, or claim in sequence.\nLimitation: name what is unverified before recommending it.\nClose: ask whether this deserves a deeper episode.`,
    bodyZh: `钩子：把来源信号改写成观众问题。\n演示路径：按顺序展示项目、工作流或主张。\n限制：在推荐前说明仍未核验的部分。\n结尾：判断它是否值得做成更深一集。`
  },
  {
    id: "proof",
    number: "04",
    label: "Proof",
    labelZh: "证明",
    caption: "Source trail",
    captionZh: "来源链",
    title: "The public proof trail",
    titleZh: "公开证明链",
    metric: "86% trust",
    metricZh: "86% 可信度",
    status: "Proof trail selected",
    statusZh: "已选择证明链",
    body: `Archive: latest issue page\nProof: original public URL remains attached\nPack: Markdown + CSV + script + delivery notes\nNext step: buyer can order without rebuilding the research queue.`,
    bodyZh: `归档：最新公开期刊页\n证明：原始公开 URL 保持附带\n交付：Markdown + CSV + 脚本 + 交付说明\n下一步：买家不必重建研究队列就能下单。`
  }
];
function deliveryLineItems(tab, lang = "en") {
  const body = lang === "zh" ? tab.bodyZh : tab.body;
  return body
    .split("\n")
    .map((line) => `<li><span></span><p>${escapeHtml(line)}</p></li>`)
    .join("");
}
const deliveryPreviewButtons = deliveryPreviewTabs
  .map((tab, index) => `<button class="deliverable-tab${index === 0 ? " active" : ""}" type="button" data-deliverable-tab="${escapeHtml(tab.id)}" data-deliverable-status-en="${escapeHtml(tab.status)}" data-deliverable-status-zh="${escapeHtml(tab.statusZh)}" aria-pressed="${index === 0 ? "true" : "false"}">
          <span class="deliverable-tab-dot"></span>
          <span class="deliverable-tab-copy">
            ${dual(tab.label, tab.labelZh, "strong")}
            ${dual(tab.caption, tab.captionZh, "small")}
          </span>
        </button>`)
  .join("");
const zhDeliveryPreviewButtons = deliveryPreviewTabs
  .map((tab, index) => `<button class="deliverable-tab${index === 0 ? " active" : ""}" type="button" data-deliverable-tab="${escapeHtml(tab.id)}" data-deliverable-status-en="${escapeHtml(tab.status)}" data-deliverable-status-zh="${escapeHtml(tab.statusZh)}" aria-pressed="${index === 0 ? "true" : "false"}">
          <span class="deliverable-tab-dot"></span>
          <span class="deliverable-tab-copy">
            <strong>${escapeHtml(tab.labelZh)}</strong>
            <small>${escapeHtml(tab.captionZh)}</small>
          </span>
        </button>`)
  .join("");
const deliveryPreviewPanels = deliveryPreviewTabs
  .map((tab, index) => `<article class="deliverable-panel${index === 0 ? " active" : ""}" data-deliverable-panel="${escapeHtml(tab.id)}" data-deliverable-index="${index}" style="--stack-x: ${index * 34}px; --stack-y: ${index * 15}px; --stack-rotate: ${index * -1.2}deg; --stack-scale: ${Math.max(0.88, 1 - index * 0.035)}; --stack-order: ${deliveryPreviewTabs.length - index};">
          <div class="deliverable-sheet-top">
            <span class="deliverable-sheet-mark" data-kind="${escapeHtml(tab.id)}"></span>
            <span>${dual(tab.label, tab.labelZh)}</span>
            <em>${escapeHtml(tab.number)}</em>
          </div>
          ${dual(tab.title, tab.titleZh, "h3")}
          ${dual(tab.caption, tab.captionZh, "p", ' class="deliverable-sheet-caption"')}
          <ul class="deliverable-lines">${deliveryLineItems(tab)}</ul>
          <div class="deliverable-proof-strip">
            ${dual("Ready after checkout", "付款后即可交付", "span")}
            <strong>${dual(tab.metric, tab.metricZh)}</strong>
          </div>
        </article>`)
  .join("");
const zhDeliveryPreviewPanels = deliveryPreviewTabs
  .map((tab, index) => `<article class="deliverable-panel${index === 0 ? " active" : ""}" data-deliverable-panel="${escapeHtml(tab.id)}" data-deliverable-index="${index}" style="--stack-x: ${index * 34}px; --stack-y: ${index * 15}px; --stack-rotate: ${index * -1.2}deg; --stack-scale: ${Math.max(0.88, 1 - index * 0.035)}; --stack-order: ${deliveryPreviewTabs.length - index};">
          <div class="deliverable-sheet-top">
            <span class="deliverable-sheet-mark" data-kind="${escapeHtml(tab.id)}"></span>
            <span>${escapeHtml(tab.labelZh)}</span>
            <em>${escapeHtml(tab.number)}</em>
          </div>
          <h3>${escapeHtml(tab.titleZh)}</h3>
          <p class="deliverable-sheet-caption">${escapeHtml(tab.captionZh)}</p>
          <ul class="deliverable-lines">${deliveryLineItems(tab, "zh")}</ul>
          <div class="deliverable-proof-strip">
            <span>付款后即可交付</span>
            <strong>${escapeHtml(tab.metricZh)}</strong>
          </div>
        </article>`)
  .join("");
const socialProof = `<section class="visual-proof" aria-label="Product preview">
      <div>
        ${dual("Product preview", "产品预览", "p", ' class="section-label"')}
        ${dual("A real signal board, not a text-only sales page.", "这是一个真实信号看板，不是只有文字的销售页。", "h2")}
        ${dual("The board image is generated from the current ranked issue so buyers can see source lanes, scores, and idea density before opening the sample files.", "这张看板图来自当前排序期次，买家打开样品文件前就能看到来源入口、评分和选题密度。", "p")}
      </div>
      <img src="./signal-board.png" alt="TrendFoundry product signal board preview" width="1200" height="760">
    </section>`;
const motionProof = `<section class="motion-proof" id="workflow-motion" aria-label="Animated workflow preview">
      <div>
        ${dual("Workflow in motion", "动态工作流", "p", ' class="section-label"')}
        ${dual("See how public signals become a buyer-ready pack.", "看公开信号如何变成可交付情报包。", "h2")}
        ${dual("This animated preview is regenerated from the same current issue as the signal board, so the product feels inspectable before a buyer downloads or orders.", "这个动态预览与信号看板来自同一期当前数据，买家下载或下单前就能看到产品如何从信号变成交付物。", "p")}
      </div>
      <img class="motion-preview" src="./signal-demo.svg" alt="Animated TrendFoundry workflow: rank signals, shape ideas, package samples, and prepare orders" width="960" height="540">
    </section>`;
const zhMotionProof = `<section class="motion-proof" id="workflow-motion" aria-label="Animated workflow preview">
      <div>
        <p class="section-label">动态工作流</p>
        <h2>看公开信号如何变成可交付情报包。</h2>
        <p>这个动态预览与信号看板来自同一期当前数据，买家下载或下单前就能看到产品如何从信号变成交付物。</p>
      </div>
      <img class="motion-preview" src="../signal-demo.svg" alt="TrendFoundry 动态工作流：排序信号、整理选题、打包样品并准备订单" width="960" height="540">
    </section>`;
const productProof = `<section class="product-proof" id="product-proof" aria-label="Product proof preview">
      <div class="product-proof-copy">
        ${dual("Proof before purchase", "购买前证明", "p", ' class="section-label"')}
        ${dual("Inspect the sample before choosing a tier.", "先看真实样品，再决定买哪一档。", "h2")}
        ${dual("The board, source links, scores, and script structure live in the same sample, so quality is visible before a buyer orders.", "看板、来源、评分和脚本结构都在同一份样品里，购买前就能判断质量。", "p")}
        <div class="product-proof-actions">
          <a class="action primary" href="./public-sample.en.md">${dual("Open sample", "打开样品")}</a>
          <a class="action" href="./issues/latest.html">${dual("View latest issue", "查看最新期")}</a>
        </div>
      </div>
      <figure class="product-proof-visual">
        <img src="./signal-board.png" alt="TrendFoundry product signal board preview" width="1200" height="760">
        <figcaption>${dual("Current issue", "当前期")} · ${dual("verifiable", "可验证")}</figcaption>
      </figure>
      <div class="product-proof-points" aria-label="Proof points">
        <span><strong>${dual("Board", "看板")}</strong>${dual("Source and score", "来源与评分")}</span>
        <span><strong>${dual("Sample", "样品")}</strong>Markdown + CSV</span>
        <span><strong>${dual("Script", "脚本")}</strong>${dual("Ready to record", "可直接开录")}</span>
      </div>
    </section>`;
const zhProductProof = `<section class="product-proof" id="product-proof" aria-label="Product proof preview">
      <div class="product-proof-copy">
        <p class="section-label">购买前证明</p>
        <h2>先看真实样品，再决定买哪一档。</h2>
        <p>看板、来源、评分和脚本结构都在同一份样品里，购买前就能判断质量。</p>
        <div class="product-proof-actions">
          <a class="action primary" href="../public-sample.zh-CN.md">打开样品</a>
          <a class="action" href="../issues/latest.html">查看最新期</a>
        </div>
      </div>
      <figure class="product-proof-visual">
        <img src="../signal-board.png" alt="TrendFoundry 当前创作者机会看板预览" width="1200" height="760">
        <figcaption>当前期 · 可验证</figcaption>
      </figure>
      <div class="product-proof-points" aria-label="Proof points">
        <span><strong>看板</strong>来源与评分</span>
        <span><strong>样品</strong>Markdown + CSV</span>
        <span><strong>脚本</strong>可直接开录</span>
      </div>
    </section>`;
const productMapTierCards = pricingTiers
  .map((tier, index) => {
    const slug = tierSlug(tier);
    const priceEn = tier.cadence === "monthly" ? `${tier.price}/mo` : `${tier.price} one-time`;
    const priceZh = tier.cadenceZh === "每月" ? `${tier.price} 每月` : `${tier.price} 一次`;
    return `<a class="product-tier-card${tier.featured ? " active" : ""}" href="#pricing" data-tier-jump="${escapeHtml(slug)}" aria-label="${escapeHtml(tier.name)}">
          <span>${String(index + 1).padStart(2, "0")}</span>
          <strong>${dual(tier.name, tier.nameZh)}</strong>
          <b data-i18n-en="${escapeHtml(priceEn)}" data-i18n-zh="${escapeHtml(priceZh)}">${escapeHtml(priceEn)}</b>
          ${dual(tier.commitment, tier.commitmentZh, "small")}
        </a>`;
  })
  .join("");
const zhProductMapTierCards = pricingTiers
  .map((tier, index) => {
    const slug = tierSlug(tier);
    const priceZh = tier.cadenceZh === "每月" ? `${tier.price} 每月` : `${tier.price} 一次`;
    return `<a class="product-tier-card${tier.featured ? " active" : ""}" href="#pricing" data-tier-jump="${escapeHtml(slug)}" aria-label="${escapeHtml(tier.nameZh)}">
          <span>${String(index + 1).padStart(2, "0")}</span>
          <strong>${escapeHtml(tier.nameZh)}</strong>
          <b>${escapeHtml(priceZh)}</b>
          <small>${escapeHtml(tier.commitmentZh)}</small>
        </a>`;
  })
  .join("");
const productPathItems = [
  ["Signal", "信号", "public AI/dev changes", "公开 AI/开发者变化"],
  ["Proof", "证据", "source links and risk notes", "来源链接与风险备注"],
  ["Pack", "选题包", "ranked topics, CSV, script notes", "排序选题、CSV、脚本备注"],
  ["Order", "下单", "sample, weekly, or custom", "单期、周更或定制"]
];
const productPathSteps = productPathItems
  .map(([label, labelZh, copy, copyZh], index) => `<li>
          <span>${String(index + 1).padStart(2, "0")}</span>
          <strong>${dual(label, labelZh)}</strong>
          ${dual(copy, copyZh, "small")}
        </li>`)
  .join("");
const zhProductPathSteps = productPathItems
  .map(([, labelZh, , copyZh], index) => `<li>
          <span>${String(index + 1).padStart(2, "0")}</span>
          <strong>${escapeHtml(labelZh)}</strong>
          <small>${escapeHtml(copyZh)}</small>
        </li>`)
  .join("");
const decisionFlow = `<section class="decision-flow product-map" id="decision-flow" aria-label="TrendFoundry product map">
      <div class="decision-copy">
        ${dual("Product map", "产品地图", "p", ' class="section-label"')}
        ${dual("What it does. How to choose.", "先看它做什么，再看怎么选。", "h2")}
        ${dual("TrendFoundry scans public AI and developer signals, then turns them into ranked, proof-backed topic packs you can record from.", "TrendFoundry 把公开 AI/开发者信号，变成可直接开录的选题包。", "p")}
      </div>
      <div class="decision-panel product-map-panel">
        <div class="product-tier-strip" aria-label="Product tiers by decision frequency">${productMapTierCards}</div>
        <div class="pack-preview product-path" aria-label="Signal to order path">
          <div class="pack-preview-head">
            <span>${dual("How the pack moves", "产品路径")}</span>
            <strong>${dual("Signal → Proof → Pack → Order", "信号 → 证据 → 选题包 → 下单")}</strong>
          </div>
          <ol class="product-path-steps">${productPathSteps}</ol>
        </div>
      </div>
    </section>`;
const zhDecisionFlow = `<section class="decision-flow product-map" id="decision-flow" aria-label="TrendFoundry 产品地图">
      <div class="decision-copy">
        <p class="section-label">产品地图</p>
        <h2>先看它做什么，再看怎么选。</h2>
        <p>TrendFoundry 把公开 AI/开发者信号，变成可直接开录的选题包。</p>
      </div>
      <div class="decision-panel product-map-panel">
        <div class="product-tier-strip" aria-label="按决策频率划分的产品档位">${zhProductMapTierCards}</div>
        <div class="pack-preview product-path" aria-label="信号到下单路径">
          <div class="pack-preview-head">
            <span>产品路径</span>
            <strong>信号 → 证据 → 选题包 → 下单</strong>
          </div>
          <ol class="product-path-steps">${zhProductPathSteps}</ol>
        </div>
      </div>
    </section>`;
const beforeAfterRows = [
  ["Topic search", "找选题", "A creator opens five feeds and still has to decide what is recordable.", "创作者打开五个信息源，最后仍要自己判断什么能录。", "The pack arrives as ranked candidates with proof links and risk notes.", "交付时已经是排序候选、来源链接和风险备注。"],
  ["Script planning", "写脚本", "The first hour disappears into title angles, hooks, and demo structure.", "第一个小时常被标题角度、开场钩子和演示结构吃掉。", "Each idea already carries title angles, hook, demo path, and limitation.", "每个机会已经带标题角度、钩子、演示路径和限制说明。"],
  ["Publishing rhythm", "更新节奏", "Good topics arrive randomly, so the recording queue keeps resetting.", "好选题随机出现，录制队列反复重置。", "A weekly issue turns public signals into a steady recording queue.", "每周期刊把公开信号变成稳定录制队列。"]
];
const beforeAfterTable = beforeAfterRows
  .map(([label, labelZh, before, beforeZh, after, afterZh]) => `<div class="contrast-row">
          <strong>${dual(label, labelZh)}</strong>
          ${dual(before, beforeZh, "span", ' class="before-copy"')}
          ${dual(after, afterZh, "span", ' class="after-copy"')}
        </div>`)
  .join("");
const zhBeforeAfterTable = beforeAfterRows
  .map(([, labelZh, , beforeZh, , afterZh]) => `<div class="contrast-row">
          <strong>${escapeHtml(labelZh)}</strong>
          <span class="before-copy">${escapeHtml(beforeZh)}</span>
          <span class="after-copy">${escapeHtml(afterZh)}</span>
        </div>`)
  .join("");
const contrastSection = `<section class="contrast-lab" aria-label="Before and after TrendFoundry">
      <div class="contrast-copy">
        ${dual("Before / after", "前后对比", "p", ' class="section-label"')}
        ${dual("From scavenging trends to choosing what to record.", "从追热点，变成选择下一条该录什么。", "h2")}
        ${dual("The business promise is not more information. It is less decision fatigue before a creator turns on the camera.", "商业承诺不是更多信息，而是在创作者开录前减少决策疲劳。", "p")}
      </div>
      <div class="contrast-panel" data-contrast-mode="after">
        <div class="contrast-toggle" aria-label="Compare workflow">
          <button class="contrast-option" type="button" data-contrast-set="before">${dual("Without it", "不用它")}</button>
          <button class="contrast-option active" type="button" data-contrast-set="after">${dual("With TrendFoundry", "使用 TrendFoundry")}</button>
        </div>
        <div class="contrast-table">${beforeAfterTable}</div>
      </div>
    </section>`;
const zhContrastSection = `<section class="contrast-lab" aria-label="Before and after TrendFoundry">
      <div class="contrast-copy">
        <p class="section-label">前后对比</p>
        <h2>从追热点，变成选择下一条该录什么。</h2>
        <p>商业承诺不是更多信息，而是在创作者开录前减少决策疲劳。</p>
      </div>
      <div class="contrast-panel" data-contrast-mode="after">
        <div class="contrast-toggle" aria-label="Compare workflow">
          <button class="contrast-option" type="button" data-contrast-set="before">不用它</button>
          <button class="contrast-option active" type="button" data-contrast-set="after">使用 TrendFoundry</button>
        </div>
        <div class="contrast-table">${zhBeforeAfterTable}</div>
      </div>
    </section>`;
const planningCalculator = `<section class="planning-calculator" id="planning-calculator" aria-label="Creator planning time estimator">
      <div class="calculator-copy">
        ${dual("Planning estimator", "规划估算器", "p", ' class="section-label"')}
        ${dual("Estimate the time you get back before recording.", "估算开录前能省回多少时间。", "h2")}
        ${dual("TrendFoundry is most valuable when your bottleneck is deciding what deserves a recording slot, not pressing record.", "当瓶颈不是按下录制键，而是判断什么值得录时，TrendFoundry 的价值最大。", "p")}
      </div>
      <div class="calculator-panel">
        <label class="range-control">
          <span>${dual("Videos per week", "每周视频数")}</span>
          <strong><output id="video-count-output">2</output></strong>
          <input id="video-count" type="range" min="1" max="5" step="1" value="2">
        </label>
        <label class="range-control">
          <span>${dual("Research hours per video", "每条找选题小时")}</span>
          <strong><output id="research-hours-output">2</output>h</strong>
          <input id="research-hours" type="range" min="1" max="6" step="1" value="2">
        </label>
        <div class="calculator-result" aria-live="polite">
          <span id="saved-hours">9h</span>
          <p id="saved-hours-copy">${dual("estimated planning time reclaimed each month", "预计每月释放的规划时间")}</p>
          <em id="tier-suggestion">${dual("Suggested: Weekly pipeline", "建议：周更情报")}</em>
        </div>
      </div>
    </section>`;
const zhPlanningCalculator = `<section class="planning-calculator" id="planning-calculator" aria-label="Creator planning time estimator">
      <div class="calculator-copy">
        <p class="section-label">规划估算器</p>
        <h2>估算开录前能省回多少时间。</h2>
        <p>当瓶颈不是按下录制键，而是判断什么值得录时，TrendFoundry 的价值最大。</p>
      </div>
      <div class="calculator-panel">
        <label class="range-control">
          <span>每周视频数</span>
          <strong><output id="video-count-output">2</output></strong>
          <input id="video-count" type="range" min="1" max="5" step="1" value="2">
        </label>
        <label class="range-control">
          <span>每条找选题小时</span>
          <strong><output id="research-hours-output">2</output>h</strong>
          <input id="research-hours" type="range" min="1" max="6" step="1" value="2">
        </label>
        <div class="calculator-result" aria-live="polite">
          <span id="saved-hours">9h</span>
          <p id="saved-hours-copy">预计每月释放的规划时间</p>
          <em id="tier-suggestion">建议：周更情报</em>
        </div>
      </div>
    </section>`;
const payoffScenarios = [
  {
    key: "sample",
    label: "Test once",
    labelZh: "先试一次",
    note: "1 pack",
    noteZh: "1 份样品",
    hours: "4h",
    tier: "Suggested: Sample issue",
    tierZh: "建议：单期样品",
    copy: "Buy one issue to see whether the ranked signals fit your channel.",
    copyZh: "先买一份，看排序信号是否适合你的频道。",
    progress: "34"
  },
  {
    key: "weekly",
    label: "Publish weekly",
    labelZh: "稳定周更",
    note: "12 signals",
    noteZh: "12 条信号",
    hours: "9h",
    tier: "Suggested: Weekly pipeline",
    tierZh: "建议：周更情报",
    copy: "Use each weekly issue as a ready queue for recordable topic decisions.",
    copyZh: "把每周情报当成可录制选题队列。",
    progress: "66"
  },
  {
    key: "custom",
    label: "Own a niche",
    labelZh: "垂直定制",
    note: "custom lane",
    noteZh: "专属赛道",
    hours: "18h",
    tier: "Suggested: Custom niche",
    tierZh: "建议：垂直定制",
    copy: "Ask for one niche, one evidence standard, and one publishing rhythm.",
    copyZh: "按你的垂类、证据标准和发布节奏交付。",
    progress: "100"
  }
];
const defaultPayoffScenario = payoffScenarios[1];
const payoffScenarioButtons = payoffScenarios
  .map((item) => `<button class="payoff-scenario${item.key === defaultPayoffScenario.key ? " active" : ""}" type="button" role="tab" aria-selected="${item.key === defaultPayoffScenario.key ? "true" : "false"}" data-payoff-scenario="${escapeHtml(item.key)}" data-hours="${escapeHtml(item.hours)}" data-tier-en="${escapeHtml(item.tier)}" data-tier-zh="${escapeHtml(item.tierZh)}" data-copy-en="${escapeHtml(item.copy)}" data-copy-zh="${escapeHtml(item.copyZh)}" data-progress="${escapeHtml(item.progress)}">
          ${dual(item.label, item.labelZh, "span")}
          ${dual(item.note, item.noteZh, "strong")}
        </button>`)
  .join("");
const zhPayoffScenarioButtons = payoffScenarios
  .map((item) => `<button class="payoff-scenario${item.key === defaultPayoffScenario.key ? " active" : ""}" type="button" role="tab" aria-selected="${item.key === defaultPayoffScenario.key ? "true" : "false"}" data-payoff-scenario="${escapeHtml(item.key)}" data-hours="${escapeHtml(item.hours)}" data-tier-en="${escapeHtml(item.tier)}" data-tier-zh="${escapeHtml(item.tierZh)}" data-copy-en="${escapeHtml(item.copy)}" data-copy-zh="${escapeHtml(item.copyZh)}" data-progress="${escapeHtml(item.progress)}">
          <span>${escapeHtml(item.labelZh)}</span>
          <strong>${escapeHtml(item.noteZh)}</strong>
        </button>`)
  .join("");
const decisionPayoff = `<section class="decision-payoff" id="decision-payoff" aria-label="TrendFoundry value and product rules" style="--payoff-progress:${defaultPayoffScenario.progress}%;">
      <div class="payoff-copy">
        ${dual("Why it matters", "为什么值得买", "p", ' class="section-label"')}
        ${dual("Turn public signals into recordable ideas.", "把热点变成可录制选题。", "h2")}
        ${dual("TrendFoundry does the slow judgment work before recording: source scanning, evidence checks, risk notes, and a script-shaped outline.", "TrendFoundry 在开录前完成慢判断：扫描来源、核验证据、标注风险，并整理成脚本轮廓。", "p")}
        <ol class="payoff-rules" aria-label="Product division rules">
          <li><span>01</span>${dual("Sample issue: test fit once.", "单期样品：先试一次是否适合。", "strong")}</li>
          <li><span>02</span>${dual("Weekly pipeline: keep the queue alive.", "周更情报：保持录制队列不断档。", "strong")}</li>
          <li><span>03</span>${dual("Custom niche: tune one vertical lane.", "垂直定制：围绕一个垂类调参。", "strong")}</li>
        </ol>
      </div>
      <div class="payoff-panel">
        <div class="payoff-switch" role="tablist" aria-label="Choose publishing rhythm">${payoffScenarioButtons}</div>
        <div class="payoff-result" aria-live="polite">
          <div class="payoff-metric">
            <span>${dual("Time back", "释放时间")}</span>
            <strong id="payoff-hours">${escapeHtml(defaultPayoffScenario.hours)}</strong>
          </div>
          <div class="payoff-recommendation">
            <em id="payoff-tier" data-i18n-en="${escapeHtml(defaultPayoffScenario.tier)}" data-i18n-zh="${escapeHtml(defaultPayoffScenario.tierZh)}">${escapeHtml(defaultPayoffScenario.tier)}</em>
            <p id="payoff-copy" data-i18n-en="${escapeHtml(defaultPayoffScenario.copy)}" data-i18n-zh="${escapeHtml(defaultPayoffScenario.copyZh)}">${escapeHtml(defaultPayoffScenario.copy)}</p>
            <a href="#pricing">${dual("Confirm price", "确认价格")} <span aria-hidden="true">→</span></a>
          </div>
        </div>
        <div class="payoff-path" aria-label="TrendFoundry workflow">
          ${dual("Signal", "信号", "span")}
          ${dual("Proof", "证据", "span")}
          ${dual("Topic pack", "选题包", "span")}
          ${dual("Order", "下单", "span")}
        </div>
      </div>
    </section>`;
const zhDecisionPayoff = `<section class="decision-payoff" id="decision-payoff" aria-label="TrendFoundry 价值与产品规则" style="--payoff-progress:${defaultPayoffScenario.progress}%;">
      <div class="payoff-copy">
        <p class="section-label">为什么值得买</p>
        <h2>把热点变成可录制选题。</h2>
        <p>TrendFoundry 在开录前完成慢判断：扫描来源、核验证据、标注风险，并整理成脚本轮廓。</p>
        <ol class="payoff-rules" aria-label="产品划分规则">
          <li><span>01</span><strong>单期样品：先试一次是否适合。</strong></li>
          <li><span>02</span><strong>周更情报：保持录制队列不断档。</strong></li>
          <li><span>03</span><strong>垂直定制：围绕一个垂类调参。</strong></li>
        </ol>
      </div>
      <div class="payoff-panel">
        <div class="payoff-switch" role="tablist" aria-label="选择发布节奏">${zhPayoffScenarioButtons}</div>
        <div class="payoff-result" aria-live="polite">
          <div class="payoff-metric">
            <span>释放时间</span>
            <strong id="payoff-hours">${escapeHtml(defaultPayoffScenario.hours)}</strong>
          </div>
          <div class="payoff-recommendation">
            <em id="payoff-tier" data-i18n-en="${escapeHtml(defaultPayoffScenario.tier)}" data-i18n-zh="${escapeHtml(defaultPayoffScenario.tierZh)}">${escapeHtml(defaultPayoffScenario.tierZh)}</em>
            <p id="payoff-copy" data-i18n-en="${escapeHtml(defaultPayoffScenario.copy)}" data-i18n-zh="${escapeHtml(defaultPayoffScenario.copyZh)}">${escapeHtml(defaultPayoffScenario.copyZh)}</p>
            <a href="#pricing">确认价格 <span aria-hidden="true">→</span></a>
          </div>
        </div>
        <div class="payoff-path" aria-label="TrendFoundry 工作流">
          <span>信号</span>
          <span>证据</span>
          <span>选题包</span>
          <span>下单</span>
        </div>
      </div>
    </section>`;
const localNav = `<nav class="local-nav" aria-label="TrendFoundry page navigation">
    <a class="local-brand" href="#top">${brandLogo()}</a>
    <div class="local-links">
      <a href="#decision-flow" data-local-link="decision-flow">${dual("Product", "产品")}</a>
      <a href="#opportunities" data-local-link="opportunities">${dual("Sample", "样品")}</a>
      <a href="#pricing" data-local-link="pricing">${dual("Pricing", "价格")}</a>
      <a href="#delivery-pack" data-local-link="delivery-pack">${dual("Delivery", "交付")}</a>
    </div>
    <a class="local-cta" href="./order/">${dual("Order", "下单")}</a>
    <span class="local-progress" aria-hidden="true"></span>
  </nav>`;
const zhLocalNav = `<nav class="local-nav" aria-label="TrendFoundry page navigation">
    <a class="local-brand" href="#top">${brandLogo()}</a>
    <div class="local-links">
      <a href="#decision-flow" data-local-link="decision-flow">产品</a>
      <a href="#opportunities" data-local-link="opportunities">样品</a>
      <a href="#pricing" data-local-link="pricing">价格</a>
      <a href="#delivery-pack" data-local-link="delivery-pack">交付</a>
    </div>
    <a class="local-cta" href="../order/">下单</a>
    <span class="local-progress" aria-hidden="true"></span>
  </nav>`;
const sampleDrawerCards = publicSample
  .map((item, index) => `<article class="sample-drawer-card">
      <div class="sample-drawer-meta"><span>#${index + 1}</span><span>${escapeHtml(sourceLabel(item))}</span><span>${dual(`Score ${item.score}`, `评分 ${item.score}`)}</span></div>
      <h3>${escapeHtml(englishSampleTitle(item))}</h3>
      ${dual(item.summary || "Recordable creator opportunity with proof links and practical demo framing.", zhHook(item), "p")}
      <a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${dual("Open proof source", "打开来源")}</a>
    </article>`)
  .join("");
const zhSampleDrawerCards = publicSample
  .map((item, index) => `<article class="sample-drawer-card">
      <div class="sample-drawer-meta"><span>#${index + 1}</span><span>${escapeHtml(sourceLabel(item))}</span><span>评分 ${escapeHtml(String(item.score))}</span></div>
      <h3>${escapeHtml(item.deliverables?.bilibiliTitles?.[0] || item.title)}</h3>
      <p>${escapeHtml(zhHook(item))}</p>
      <a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">打开来源</a>
    </article>`)
  .join("");
const sampleSpotlightButtons = publicSample
  .map((item, index) => `<button class="sample-spotlight-tab${index === 0 ? " active" : ""}" type="button" data-sample-spotlight="${index}" aria-pressed="${index === 0 ? "true" : "false"}">
      <span>#${index + 1}</span>
      <strong>${escapeHtml(sourceLabel(item))}</strong>
      <em>${dual(`Score ${item.score}`, `评分 ${item.score}`)}</em>
    </button>`)
  .join("");
const zhSampleSpotlightButtons = publicSample
  .map((item, index) => `<button class="sample-spotlight-tab${index === 0 ? " active" : ""}" type="button" data-sample-spotlight="${index}" aria-pressed="${index === 0 ? "true" : "false"}">
      <span>#${index + 1}</span>
      <strong>${escapeHtml(sourceLabel(item))}</strong>
      <em>评分 ${escapeHtml(String(item.score))}</em>
    </button>`)
  .join("");
const sampleSpotlightPanels = publicSample
  .map((item, index) => `<article class="sample-spotlight-panel${index === 0 ? " active" : ""}" data-sample-spotlight-panel="${index}">
      <div class="sample-spotlight-meta">
        <span>${escapeHtml(sourceLabel(item))}</span>
        <span>${dual(`Score ${item.score}`, `评分 ${item.score}`)}</span>
      </div>
      <h3>${escapeHtml(englishSampleTitle(item))}</h3>
      ${dual(englishSampleHook(item), zhHook(item), "p")}
      <div class="sample-spotlight-proof">
        <strong>${dual("Proof note", "证据备注")}</strong>
        ${dual(englishSampleLimitation(item), zhLimitation(item), "span")}
      </div>
      <a class="action primary" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${dual("Open proof source", "打开来源")}</a>
    </article>`)
  .join("");
const zhSampleSpotlightPanels = publicSample
  .map((item, index) => `<article class="sample-spotlight-panel${index === 0 ? " active" : ""}" data-sample-spotlight-panel="${index}">
      <div class="sample-spotlight-meta">
        <span>${escapeHtml(sourceLabel(item))}</span>
        <span>评分 ${escapeHtml(String(item.score))}</span>
      </div>
      <h3>${escapeHtml(zhSampleTitle(item))}</h3>
      <p>${escapeHtml(zhHook(item))}</p>
      <div class="sample-spotlight-proof">
        <strong>证据备注</strong>
        <span>${escapeHtml(zhLimitation(item))}</span>
      </div>
      <a class="action primary" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">打开来源</a>
    </article>`)
  .join("");
const sampleSpotlight = `<div class="sample-spotlight" aria-label="Sample opportunity spotlight">
      <div class="sample-spotlight-tabs">${sampleSpotlightButtons}</div>
      <div class="sample-spotlight-stage">${sampleSpotlightPanels}</div>
    </div>`;
const zhSampleSpotlight = `<div class="sample-spotlight" aria-label="Sample opportunity spotlight">
      <div class="sample-spotlight-tabs">${zhSampleSpotlightButtons}</div>
      <div class="sample-spotlight-stage">${zhSampleSpotlightPanels}</div>
    </div>`;
const sampleDrawer = `<div class="sample-drawer" id="sample-drawer" aria-hidden="true">
    <div class="sample-drawer-backdrop" data-sample-close></div>
    <section class="sample-drawer-panel" role="dialog" aria-modal="true" aria-labelledby="sample-drawer-title">
      <button class="drawer-close" type="button" data-sample-close aria-label="Close sample preview">×</button>
      <div class="drawer-head">
        ${dual("Live sample", "实时样品", "p", ' class="section-label"')}
        ${dual("Three current opportunities, still inside the page.", "不离开页面，先看 3 个当前机会。", "h2", ' id="sample-drawer-title"')}
        ${dual("This is a compact preview of the same source-backed issue. Download the pack for Markdown, CSV, and the full script handoff.", "这是同一份有来源期刊的紧凑预览。下载样品包可获得 Markdown、CSV 和完整脚本交付。", "p")}
      </div>
      <div class="sample-drawer-grid">${sampleDrawerCards}</div>
      <div class="drawer-actions">
        <a class="action primary" href="./trendfoundry-free-sample-pack.zip">${dual("Download sample pack", "下载样品包")}</a>
        <a class="action strong" href="./order/">${dual("Order current issue", "下单当前期")}</a>
      </div>
    </section>
  </div>`;
const zhSampleDrawer = `<div class="sample-drawer" id="sample-drawer" aria-hidden="true">
    <div class="sample-drawer-backdrop" data-sample-close></div>
    <section class="sample-drawer-panel" role="dialog" aria-modal="true" aria-labelledby="sample-drawer-title">
      <button class="drawer-close" type="button" data-sample-close aria-label="关闭样品预览">×</button>
      <div class="drawer-head">
        <p class="section-label">实时样品</p>
        <h2 id="sample-drawer-title">不离开页面，先看 3 个当前机会。</h2>
        <p>这是同一份有来源期刊的紧凑预览。下载样品包可获得 Markdown、CSV 和完整脚本交付。</p>
      </div>
      <div class="sample-drawer-grid">${zhSampleDrawerCards}</div>
      <div class="drawer-actions">
        <a class="action primary" href="../trendfoundry-free-sample-pack.zip">下载样品包</a>
        <a class="action strong" href="../order/">下单当前期</a>
      </div>
    </section>
  </div>`;

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

function hasCjk(value) {
  return /[\u3400-\u9fff]/.test(String(value || ""));
}

function sourceLabel(item) {
  const labels = {
    github: "GitHub",
    bilibili: "Bilibili",
    youtube: "YouTube",
    hn: "Hacker News",
    arxiv: "arXiv"
  };
  return labels[item.source] || item.source || "public";
}

function englishSampleTitle(item) {
  const candidates = [item.deliverables.youtubeTitles?.[0], item.title].filter(Boolean);
  return candidates.find((value) => !hasCjk(value)) || `${sourceLabel(item)} creator workflow signal`;
}

function fitSignalTitle(item) {
  if (item.source === "github" && String(item.title || "").includes("/")) {
    const repo = String(item.title).split("/").pop().replace(/[-_]+/g, " ").trim();
    return repo ? repo.replace(/\b\w/g, (letter) => letter.toUpperCase()) : englishSampleTitle(item);
  }
  const title = englishSampleTitle(item);
  return title.length > 42 ? `${sourceLabel(item)} creator workflow signal` : title;
}

function zhSampleTitle(item) {
  return item.deliverables.bilibiliTitles?.[0] || item.title;
}

function englishSampleWhyNow(item) {
  return `A current ${sourceLabel(item)} signal makes this a timely candidate for a practical creator workflow test.`;
}

function englishSampleHook(item) {
  return `This episode turns ${englishSampleTitle(item)} into a practical workflow test instead of a trend recap.`;
}

function zhHook(item) {
  if (item.source === "github") return "验证安装、输出和适用边界。";
  if (item.source === "bilibili" || item.source === "youtube") return "验证方法是否可复现，避免照搬原视频。";
  return "验证来源、证据和可讲边界。";
}

function englishSampleDemo() {
  return "Run the smallest reproducible test, then compare the workflow before and after the tool.";
}

function englishSampleLimitation(item) {
  if (item.source === "github") return "Do not rely on stars alone; test install friction, maintenance quality, and reproducibility.";
  if (item.source === "bilibili") return "Do not copy the source video; keep the proof link and create your own test, judgment, and limitation section.";
  if (item.source === "youtube") return "Do not copy the original video; keep the proof link and create your own demo and judgment.";
  return "Treat public attention as a signal, not proof of quality; verify facts and reproducibility before recording.";
}

const publicSampleReportEn = `# TrendFoundry Public Sample (English)

Generated: ${data.generatedAt}

Language: English

This free sample shows the format and quality bar. The paid issue expands this into 12 ranked opportunities, one ready-to-record script, CSV tables, and delivery notes.

Chinese version: ${publicSiteUrl}public-sample.zh-CN.md

## Sample Opportunities

${publicSample
  .map(
    (item, index) => `### ${index + 1}. ${englishSampleTitle(item)}

- Score: ${item.score}
- Fit: ${item.monetizationFit}
- Source: ${sourceLabel(item)}${hasCjk(item.sourceQuery) ? "" : ` / ${item.sourceQuery}`}
- Quality: ${item.qualityFlags?.length ? `review (${item.qualityFlags.join(", ")})` : "normal"}
- Link: ${item.url}
- Creator target: ${item.targetCreator}
- Why now: ${englishSampleWhyNow(item)}
- Hook: ${englishSampleHook(item)}
- Demo: ${englishSampleDemo(item)}
- Limitation: ${englishSampleLimitation(item)}
`
  )
  .join("\n")}

## Upgrade

- Sample issue: USD 9 one-off.
- Weekly pipeline: USD 19/month.
- Custom niche: USD 49/month.

Request the current issue: ${issueOrderHref}

Email order: ${contactEmail}
`;

const publicSampleReportZh = `# TrendFoundry 公开样品（中文）

生成时间：${data.generatedAt}

语言：中文

这份免费样品展示格式和质量标准。付费单期会扩展成 12 条排序机会、1 份可直接录制脚本、CSV 表格和交付说明。

English version: ${publicSiteUrl}public-sample.en.md

## 样品机会

${publicSample
  .map(
    (item, index) => `### ${index + 1}. ${zhSampleTitle(item)}

- 评分：${item.score}
- 匹配度：${fitLabel(item.monetizationFit, "zh")}
- 来源：${item.source} / ${item.sourceQuery}
- 质量：${item.qualityFlags?.length ? `需复核（${item.qualityFlags.join("，")}）` : "正常"}
- 链接：${item.url}
- 目标创作者：${item.targetCreator}
- 为什么现在：${zhWhyNow(item)}
- 钩子：${zhHook(item)}
- 演示：${zhDemo(item)}
- 限制：${zhLimitation(item)}
`
  )
  .join("\n")}

## 升级

- 单期样品：USD 9，一次性购买。
- 周更情报：USD 19/月。
- 垂直定制：USD 49/月。

申请当前期：${issueOrderHref}

邮件下单：${contactEmail}
`;

const publicSampleCsvEn = toCsv(
  publicSample.map((item, index) => ({
    rank: index + 1,
    score: item.score,
    source: item.source,
    fit: item.monetizationFit,
    quality: item.qualityFlags?.length ? `review: ${item.qualityFlags.join("; ")}` : "normal",
    title: englishSampleTitle(item),
    hook: englishSampleHook(item),
    why_now: englishSampleWhyNow(item),
    demo: englishSampleDemo(item),
    limitation: englishSampleLimitation(item),
    url: item.url
  })),
  ["rank", "score", "source", "fit", "quality", "title", "hook", "why_now", "demo", "limitation", "url"]
);

const publicSampleCsvZh = toCsv(
  publicSample.map((item, index) => ({
    "排名": index + 1,
    "评分": item.score,
    "来源": item.source,
    "匹配度": fitLabel(item.monetizationFit, "zh"),
    "质量": item.qualityFlags?.length ? `需复核：${item.qualityFlags.join("；")}` : "正常",
    "标题": zhSampleTitle(item),
    "钩子": zhHook(item),
    "为什么现在": zhWhyNow(item),
    "演示": zhDemo(item),
    "限制": zhLimitation(item),
    "链接": item.url
  })),
  ["排名", "评分", "来源", "匹配度", "质量", "标题", "钩子", "为什么现在", "演示", "限制", "链接"]
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
- Hook: ${zhHook(item)}
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

function numberedList(items) {
  return items.map((item, index) => `${index + 1}. ${item}`).join("\n");
}

function fullScriptSections(item) {
  const demoSteps = item.deliverables.demoSteps || [];
  const outline = item.deliverables.outline || [];
  const sourceLine = `${item.source} / ${item.sourceQuery}`;
  return `## Script Contract

- Target length: 6-8 minutes.
- Audience: ${item.targetCreator}.
- Source signal: ${sourceLine}.
- Core promise: turn one public trend into a practical creator workflow test.
- Proof standard: show the source, run or simulate the smallest useful workflow, then state the limitation before the CTA.

## Scene-By-Scene Script

| Time | Screen | Narration | Purpose |
|---|---|---|---|
| 0:00-0:20 | Title card + source page | 实测 ${item.title}：看它能替代创作流程里的哪一步。 | Set the practical test frame. |
| 0:20-0:55 | Source page close-up | 先看原始信号：${item.summary || "这个项目/内容正在获得公开关注"}。热度只是入口，不是结论。 | Ground the claim in evidence. |
| 0:55-1:40 | Problem map | 观众真正关心的是它能替代哪一步：选题、资料整理、脚本、演示，还是发布资产。 | Translate trend into workflow pain. |
| 1:40-3:50 | Demo or reproducible walkthrough | ${demoSteps[1] || "复现一个最小可用流程，并记录输入、输出和卡住的位置。"} | Create the main value segment. |
| 3:50-4:50 | Before/after comparison | 对比使用前后：节省了什么时间，增加了什么检查成本，哪些步骤仍然必须人工判断。 | Avoid hype and show tradeoffs. |
| 4:50-5:45 | Creator angle | 如果把它做成一期视频，标题可以是「${item.deliverables.bilibiliTitles?.[0] || item.title}」。核心卖点不是新奇，而是可复制。 | Convert into a recordable episode. |
| 5:45-6:30 | Limitations | ${item.deliverables.limitation} | Build trust and reduce overclaim risk. |
| 6:30-7:00 | CTA | 如果你想每周拿到 12 个这样的来源、标题、demo 和限制说明，可以索取 TrendFoundry 样品包。 | Move viewer to sample order. |

## Demo Checklist

${numberedList(demoSteps)}

## Recording Outline

${numberedList(outline)}

## Asset Checklist

- Source tab: ${item.url}
- One before/after workflow screenshot or terminal capture.
- One limitation slide using the exact limitation above.
- One thumbnail direction: ${item.deliverables.thumbnailPrompt}
- One pinned comment linking the public sample page.

## Shorts / Clip Hooks

- 15 seconds: 这个工具最值得测的不是热度，而是它到底替代了创作流程里的哪一步。
- 30 seconds: 我用一个公开来源，把 ${item.title} 拆成了可录制选题、demo 和限制说明。
- 45 seconds: 如果一个 AI 工具不能复现、不能说明边界、不能节省真实步骤，它就不该进入你的选题表。

## Publishing Metadata

- Bilibili title: ${item.deliverables.bilibiliTitles?.[0] || item.title}
- YouTube title: ${item.deliverables.youtubeTitles?.[0] || item.title}
- Description opener: 实测 ${item.title}：来源、复现步骤、适用场景和限制。
- Tags: AI工具, 创作者工作流, GitHub, Bilibili, YouTube, TrendFoundry

## Fact Safety Notes

- Do not claim guaranteed views, subscribers, revenue, or automation income.
- Keep the original source link visible in the video description.
- If the demo cannot be reproduced, turn the episode into a limitation-first review instead of a recommendation.
`;
}

const winner = top[0];
const script = `# Ready-To-Record Script: ${winner.title}

Source: ${mdLink(winner)}

## Title Options

- ${winner.deliverables.bilibiliTitles[0]}
- ${winner.deliverables.youtubeTitles[0]}
- ${winner.deliverables.bilibiliTitles[3]}

## 60-Second Opening

验证 ${winner.title} 的真实价值：它能不能帮创作者省时间，还是只是在趋势榜上看起来热闹。

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

${fullScriptSections(winner)}

## Call To Action

如果你想要这类 AI/开发者创作选题包，我会每周整理 12 个有来源、有演示角度、有标题和脚本结构的机会。你只需要选择最适合自己频道的那一个开始录。
`;

function fitLabel(value, lang = "en") {
  const labels = {
    high: { en: "high", zh: "高匹配" },
    medium: { en: "medium", zh: "中匹配" },
    low: { en: "low", zh: "低匹配" }
  };
  return labels[value]?.[lang] || value || "";
}

function englishOutline(item) {
  return [
    `Open with the audience problem behind ${item.title}.`,
    "Run the smallest reproducible test: install, input, output.",
    "Compare the workflow before and after the tool.",
    "Turn the finding into a content angle, template, or checklist.",
    "Close with one practical next step for the viewer."
  ];
}

function zhWhyNow(item) {
  return `${item.title} 正出现在 ${item.source} / ${item.sourceQuery} 的趋势信号里，适合做一次可复现的创作者工作流测试。`;
}

function zhDemo(item) {
  return item.deliverables.demoSteps?.[1]?.includes("Reproduce")
    ? "复现最小可用流程，记录输入、输出和卡住的位置。"
    : "用公开证据验证核心主张，并说明适合谁、不适合谁。";
}

function zhLimitation(item) {
  if (item.source === "github") return "不要只看星标和近期活跃；必须测试安装摩擦、维护质量和真实可复现性。";
  if (item.source === "bilibili") return "不要只看热度；要检查素材版权、观点边界和是否能做出原创实测。";
  if (item.source === "youtube") return "不要复制原视频；要保留来源，并重新做自己的演示、判断和限制说明。";
  return "公开热度不等于生产可用；录制前需要核验来源、复现路径和事实边界。";
}

function englishVideoAngle(item) {
  return `Practical test: should creators pay attention to ${item.title} now?`;
}

const cards = top
  .map(
    (item, index) => `<article class="card" tabindex="0" data-source="${escapeHtml(item.source)}" data-fit="${escapeHtml(item.monetizationFit)}" data-rank="${index + 1}" data-gallery-index="${index}" data-focus-title-en="${escapeHtml(englishSampleTitle(item))}" data-focus-title-zh="${escapeHtml(zhSampleTitle(item))}" data-focus-summary-en="${escapeHtml(item.summary || englishSampleHook(item))}" data-focus-summary-zh="${escapeHtml(zhHook(item))}" data-focus-score="${escapeHtml(String(item.score))}" data-focus-source="${escapeHtml(sourceLabel(item))}" data-focus-url="${escapeHtml(item.url)}" data-search="${escapeHtml(`${item.title} ${item.summary} ${item.sourceQuery} ${item.targetCreator}`.toLowerCase())}">
  <div class="meta"><span>${escapeHtml(item.source)}</span><span>${dual(`Score ${item.score}`, `评分 ${item.score}`)}</span><span>${dual(fitLabel(item.monetizationFit), fitLabel(item.monetizationFit, "zh"))}</span>${item.stale ? `<span>${dual("cached", "缓存")}</span>` : ""}${item.qualityFlags?.length ? `<span>${dual("review", "需复核")}</span>` : ""}</div>
  <h3><a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a></h3>
  ${dual(item.summary || "No summary available.", `创作切入：${zhHook(item)}`, "p")}
  <p class="why"><strong>${dual("Why now:", "为什么现在：")}</strong> ${dual(item.deliverables.whyNow, zhWhyNow(item))}</p>
  <div class="idea">
    <span class="lang-en"><strong>YouTube angle:</strong> ${escapeHtml(englishVideoAngle(item))}</span>
    <span class="lang-zh"><strong>B 站角度：</strong>${escapeHtml(item.deliverables.bilibiliTitles[0])}</span>
  </div>
  <details>
    <summary>${dual("Production outline", "制作大纲")}</summary>
    <ol>${item.deliverables.outline.map((line, lineIndex) => `<li>${dual(englishOutline(item)[lineIndex] || line, line)}</li>`).join("")}</ol>
    <p><strong>${dual("Demo:", "演示：")}</strong> ${dual(item.deliverables.demoSteps[1], zhDemo(item))}</p>
${item.qualityFlags?.length ? `    <p><strong>${dual("Quality flags:", "质量标记：")}</strong> ${escapeHtml(item.qualityFlags.join(", "))}</p>` : ""}
    <p><strong>${dual("Thumbnail:", "封面：")}</strong> ${dual(item.deliverables.thumbnailPrompt, `一张干净的技术讲解封面，突出 ${item.title}、趋势信号和中文标题区域，避免假 logo。`)}</p>
    <p><strong>${dual("Limitation:", "限制：")}</strong> ${dual(item.deliverables.limitation, zhLimitation(item))}</p>
  </details>
</article>`
  )
  .join("\n");

const sourceNavMeta = {
  all: {
    en: "All signals",
    zh: "全部信号",
    noteEn: "Start here for the full weekly mix.",
    noteZh: "先看完整周更组合。"
  },
  github: {
    en: "GitHub",
    zh: "GitHub",
    noteEn: "Repos and tools ready for demos.",
    noteZh: "适合做实测演示的项目。"
  },
  bilibili: {
    en: "Bilibili",
    zh: "B 站",
    noteEn: "Chinese creator demand signals.",
    noteZh: "中文创作者需求信号。"
  },
  youtube: {
    en: "YouTube",
    zh: "YouTube",
    noteEn: "Formats and angles already watched.",
    noteZh: "已验证的视频角度。"
  },
  hn: {
    en: "Hacker News",
    zh: "Hacker News",
    noteEn: "Technical debate and early objections.",
    noteZh: "技术讨论和早期异议。"
  },
  arxiv: {
    en: "arXiv",
    zh: "arXiv",
    noteEn: "Research signals before the demos spread.",
    noteZh: "演示扩散前的研究信号。"
  }
};

function sourceNavButton(source, lang = "en") {
  const meta = sourceNavMeta[source] || {
    en: source,
    zh: source,
    noteEn: "Source-backed trend signals.",
    noteZh: "有来源支撑的趋势信号。"
  };
  const count = source === "all" ? top.length : bySource[source] || 0;
  const countTextEn = count === 1 ? "1 item" : `${count} items`;
  const countTextZh = `${count} 条`;
  const label = lang === "zh" ? meta.zh : meta.en;
  const note = lang === "zh" ? meta.noteZh : meta.noteEn;
  const countText = lang === "zh" ? countTextZh : countTextEn;
  return `<button class="filter-button${source === "all" ? " active" : ""}" type="button" data-source-filter="${escapeHtml(source)}" aria-pressed="${source === "all" ? "true" : "false"}">
    <span class="filter-title" data-i18n-en="${escapeHtml(meta.en)}" data-i18n-zh="${escapeHtml(meta.zh)}">${escapeHtml(label)}</span>
    <span class="filter-note" data-i18n-en="${escapeHtml(meta.noteEn)}" data-i18n-zh="${escapeHtml(meta.noteZh)}">${escapeHtml(note)}</span>
    <span class="filter-count" data-i18n-en="${escapeHtml(countTextEn)}" data-i18n-zh="${escapeHtml(countTextZh)}">${escapeHtml(countText)}</span>
  </button>`;
}

const sourceButtons = ["all", ...Object.keys(bySource)]
  .map((source) => sourceNavButton(source, "en"))
  .join("");

const zhSourceButtons = ["all", ...Object.keys(bySource)]
  .map((source) => sourceNavButton(source, "zh"))
  .join("");

const zhCards = top
  .map(
    (item, index) => `<article class="card" tabindex="0" data-source="${escapeHtml(item.source)}" data-fit="${escapeHtml(item.monetizationFit)}" data-rank="${index + 1}" data-gallery-index="${index}" data-focus-title-en="${escapeHtml(englishSampleTitle(item))}" data-focus-title-zh="${escapeHtml(zhSampleTitle(item))}" data-focus-summary-en="${escapeHtml(item.summary || englishSampleHook(item))}" data-focus-summary-zh="${escapeHtml(zhHook(item))}" data-focus-score="${escapeHtml(String(item.score))}" data-focus-source="${escapeHtml(sourceLabel(item))}" data-focus-url="${escapeHtml(item.url)}" data-search="${escapeHtml(`${item.title} ${zhHook(item)} ${item.deliverables.bilibiliTitles?.[0] || ""} ${item.sourceQuery} ${item.targetCreator}`.toLowerCase())}">
  <div class="meta"><span>${escapeHtml(item.source)}</span><span>评分 ${item.score}</span><span>${escapeHtml(fitLabel(item.monetizationFit, "zh"))}</span>${item.stale ? "<span>缓存</span>" : ""}${item.qualityFlags?.length ? "<span>需复核</span>" : ""}</div>
  <h3><a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a></h3>
  <p>创作切入：${escapeHtml(zhHook(item))}</p>
  <p class="why"><strong>为什么现在：</strong>${escapeHtml(zhWhyNow(item))}</p>
  <div class="idea"><strong>B 站角度：</strong>${escapeHtml(item.deliverables.bilibiliTitles[0])}</div>
  <details>
    <summary>制作大纲</summary>
    <ol>${item.deliverables.outline.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ol>
    <p><strong>演示：</strong>${escapeHtml(zhDemo(item))}</p>
    <p><strong>封面：</strong>${escapeHtml(`一张干净的技术讲解封面，突出 ${item.title}、趋势信号和中文标题区域，避免假 logo。`)}</p>
    <p><strong>限制：</strong>${escapeHtml(zhLimitation(item))}</p>
  </details>
</article>`
  )
  .join("\n");

const focusItem = top[0] || null;

function opportunityFocusPanel(lang = "en") {
  const isZh = lang === "zh";
  const title = focusItem ? (isZh ? zhSampleTitle(focusItem) : englishSampleTitle(focusItem)) : (isZh ? "样品预览" : "Sample preview");
  const summary = focusItem ? (isZh ? zhHook(focusItem) : focusItem.summary || englishSampleHook(focusItem)) : (isZh ? "点选左侧样品后，这里显示来源、评分和录制切入点。" : "Select a sample signal to see its source, score, and recording angle.");
  const source = focusItem ? sourceLabel(focusItem) : "";
  const score = focusItem ? String(focusItem.score) : "";
  const href = focusItem ? focusItem.url : "#";
  return `<div class="opportunity-focus" id="opportunity-focus" aria-live="polite">
    <div>
      <p class="section-label" id="opportunity-focus-label" data-i18n-en="Sample preview" data-i18n-zh="样品预览">${isZh ? "样品预览" : "Sample preview"}</p>
      <h3 id="opportunity-focus-title">${escapeHtml(title)}</h3>
      <p id="opportunity-focus-summary">${escapeHtml(summary)}</p>
    </div>
    <div class="opportunity-focus-card">
      <div class="opportunity-focus-meta">
        <span id="opportunity-focus-rank">#1</span>
        <span id="opportunity-focus-source">${escapeHtml(source)}</span>
        <span id="opportunity-focus-score">${isZh ? "评分 " : "Score "}${escapeHtml(score)}</span>
      </div>
      <a class="action primary" id="opportunity-focus-link" href="${escapeHtml(href)}" target="_blank" rel="noreferrer">${isZh ? "打开来源" : "Open proof source"}</a>
    </div>
  </div>`;
}

const opportunityFocus = opportunityFocusPanel("en");
const zhOpportunityFocus = opportunityFocusPanel("zh");

const sampleSignalItems = top.slice(0, 3);

function sampleSignalRows(lang = "en") {
  const isZh = lang === "zh";
  return sampleSignalItems
    .map((item, index) => {
      const title = isZh ? zhSampleTitle(item) : englishSampleTitle(item);
      const summary = isZh ? zhHook(item) : item.summary || englishSampleHook(item);
      const fit = fitLabel(item.monetizationFit, isZh ? "zh" : "en");
      const source = sourceLabel(item);
      return `<article class="sample-signal-card card${index === 0 ? " is-focused" : ""}" tabindex="0" data-source="${escapeHtml(item.source)}" data-fit="${escapeHtml(item.monetizationFit)}" data-rank="${index + 1}" data-focus-title-en="${escapeHtml(englishSampleTitle(item))}" data-focus-title-zh="${escapeHtml(zhSampleTitle(item))}" data-focus-summary-en="${escapeHtml(item.summary || englishSampleHook(item))}" data-focus-summary-zh="${escapeHtml(zhHook(item))}" data-focus-score="${escapeHtml(String(item.score))}" data-focus-source="${escapeHtml(source)}" data-focus-url="${escapeHtml(item.url)}" data-search="${escapeHtml(`${item.title} ${item.summary} ${item.sourceQuery} ${item.targetCreator}`.toLowerCase())}">
  <span class="sample-signal-rank">0${index + 1}</span>
  <div>
    <p class="sample-signal-meta"><span>${escapeHtml(source)}</span><span>${isZh ? "评分 " : "Score "}${escapeHtml(String(item.score))}</span><span>${escapeHtml(fit)}</span></p>
    <h3>${escapeHtml(title)}</h3>
    <p>${escapeHtml(summary)}</p>
  </div>
  <a class="sample-signal-link" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer" aria-label="${isZh ? "打开来源" : "Open proof source"}">↗</a>
</article>`;
    })
    .join("\n");
}

const sampleSignalCards = sampleSignalRows("en");
const zhSampleSignalCards = sampleSignalRows("zh");

const topicDefinitions = [
  {
    slug: "ai-video-ideas",
    title: "AI video ideas for creator channels",
    titleZh: "面向创作者频道的 AI 视频选题",
    description: "A weekly source-backed list of AI and developer video ideas with hooks, demos, titles, and limitations.",
    descriptionZh: "每周更新、有来源支撑的 AI 和开发者视频选题列表，包含钩子、演示、标题和限制说明。",
    filter: () => true
  },
  {
    slug: "github-ai-projects",
    title: "GitHub AI projects worth turning into videos",
    titleZh: "值得做成视频的 GitHub AI 项目",
    description: "Fresh GitHub signals converted into recordable demos for technical creators.",
    descriptionZh: "把新鲜 GitHub 信号转成技术创作者可以录制的演示选题。",
    filter: (item) => item.source === "github"
  },
  {
    slug: "bilibili-ai-topics",
    title: "Bilibili AI topics for technical explainers",
    titleZh: "适合技术讲解的 B 站 AI 选题",
    description: "Chinese creator angles shaped from Bilibili-facing AI and developer signals.",
    descriptionZh: "从面向 B 站的 AI 和开发者信号里整理中文创作者角度。",
    filter: (item) => item.source === "bilibili"
  },
  {
    slug: "youtube-ai-workflows",
    title: "YouTube AI workflow ideas for weekly videos",
    titleZh: "适合周更视频的 YouTube AI 工作流选题",
    description: "YouTube-ready AI workflow opportunities with proof links and practical demos.",
    descriptionZh: "面向 YouTube 的 AI 工作流机会，包含证明链接和可操作演示。",
    filter: (item) => item.source === "youtube"
  },
  {
    slug: "developer-trend-brief",
    title: "Developer trend brief for creator newsletters",
    titleZh: "面向创作者 newsletter 的开发者趋势 brief",
    description: "Hacker News, arXiv, GitHub, YouTube, and Bilibili signals turned into a compact creator brief.",
    descriptionZh: "把 HN、arXiv、GitHub、YouTube 和 Bilibili 信号整理成紧凑创作者 brief。",
    filter: () => true
  }
];

function pageShell({ title, description, body, canonicalPath = "" }) {
  const canonicalUrl = `${publicSiteUrl}${canonicalPath}`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${ogImageUrl}">
  <title>${escapeHtml(title)} | TrendFoundry</title>
  <link rel="stylesheet" href="../styles.css">
  <link rel="alternate" type="application/rss+xml" title="TrendFoundry RSS" href="../feed.xml">
  <link rel="alternate" type="application/feed+json" title="TrendFoundry JSON Feed" href="../feed.json">
</head>
<body>
${body}
</body>
</html>`;
}

function topicCards(items) {
  return items
    .slice(0, 8)
    .map(
      (item, index) => `<article class="topic-card">
  <p class="topic-rank">#${index + 1} / ${escapeHtml(item.source)} / score ${escapeHtml(item.score)}</p>
  <h2><a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a></h2>
  <p>${escapeHtml(item.summary || "No summary available.")}</p>
  <ul>
    <li><strong>Creator hook:</strong> ${escapeHtml(zhHook(item))}</li>
    <li><strong>Demo angle:</strong> ${escapeHtml(item.deliverables.demoSteps?.[1] || item.deliverables.whyNow)}</li>
    <li><strong>Limitation:</strong> ${escapeHtml(item.deliverables.limitation)}</li>
  </ul>
</article>`
    )
    .join("");
}

function buildTopicPage(topic) {
  const items = top.filter(topic.filter);
  const seen = new Set(items.map((item) => item.url || item.id));
  const fallback = top.filter((item) => !seen.has(item.url || item.id));
  const featured = [...items, ...fallback].slice(0, 8);
  const body = `<header class="topic-hero">
  <div class="brandline">${brandLogo()}<span>SEO brief</span></div>
  <h1>${escapeHtml(topic.title)}</h1>
  <p class="sub">${escapeHtml(topic.description)} Updated from the same source-backed dataset used for the paid weekly pipeline.</p>
  <div class="hero-actions">
    <a class="action primary" href="../public-sample.en.md">English sample</a>
    <a class="action" href="../public-sample.zh-CN.md">中文样品</a>
    <a class="action" href="../ready-to-record-script.md">Open script</a>
    <a class="action" href="../auth/">Sign in</a>
    <a class="action strong" href="${issueOrderHref}">Request current pack</a>
    <a class="action" href="../index.html">Back to dashboard</a>
  </div>
</header>
<main>
  <section class="seo-summary">
    <div>
      <p class="section-label">Search intent</p>
      <h2>Useful when a creator searches for topics, not just tools.</h2>
    </div>
    <p>Each item keeps the proof link, hook, demo angle, and limitation together. That makes the page indexable while still leading serious buyers to the current sample pack.</p>
  </section>
  <section class="topic-list">${topicCards(featured)}</section>
  <section class="handoff">
    <div>
      <p class="section-label">Paid pack</p>
      <h2>Need the current 12-item brief?</h2>
      <p>The paid pack adds the full ranked list, CSV, and one ready-to-record scene-by-scene script.</p>
    </div>
    <div class="handoff-links">
      <a class="action primary" href="${issueOrderHref}">Request sample</a>
      <a class="action" href="${orderHref}">Email order</a>
    </div>
  </section>
</main>`;
  return pageShell({
    title: topic.title,
    description: topic.description,
    body,
    canonicalPath: `topics/${topic.slug}.html`
  });
}

const topicLinks = topicDefinitions
  .map((topic) => `<a class="topic-link" href="./topics/${topic.slug}.html">${dual(topic.title, topic.titleZh)}${dual(topic.description, topic.descriptionZh, "small")}</a>`)
  .join("");

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function feedDescription(item) {
  return [
    item.summary || "No summary available.",
    `Creator hook: ${zhHook(item)}`,
    `Demo angle: ${item.deliverables.demoSteps?.[1] || item.deliverables.whyNow}`,
    `Limitation: ${item.deliverables.limitation}`,
    "Order the current pack: https://github.com/BraveCowNoFear/trendfoundry/issues/new?template=order-sample-pack.yml&title=Sample%20pack%20request%3A%20"
  ].join("\n\n");
}

const feedItems = top.slice(0, 12);
const feedUpdated = new Date(data.generatedAt).toISOString();
const issueDate = feedUpdated.slice(0, 10);
const issueTitle = `TrendFoundry Issue ${issueDate}`;
const issuePath = `issues/${issueDate}.html`;
const issueMarkdownPath = `${issueDate}.md`;
const trustFeedRows = top.slice(0, 5);
const proofLinkRate = top.length ? Math.round((top.filter((item) => item.url).length / top.length) * 100) : 0;
const trustDockFeedRows = trustFeedRows
  .map((item, index) => `<li><span></span><strong>${dual(englishSampleTitle(item), zhSampleTitle(item))}</strong><em>${index === 0 ? "new" : `${(index + 1) * 2}h`}</em></li>`)
  .join("");
const zhTrustDockFeedRows = trustFeedRows
  .map((item, index) => `<li><span></span><strong>${escapeHtml(zhSampleTitle(item))}</strong><em>${index === 0 ? "new" : `${(index + 1) * 2}h`}</em></li>`)
  .join("");
const trustDockSearchLinks = topicDefinitions.slice(0, 4)
  .map((topic) => `<a href="./topics/${topic.slug}.html"><strong>${dual(topic.title, topic.titleZh)}</strong>${dual(topic.description, topic.descriptionZh, "span")}</a>`)
  .join("");
const zhTrustDockSearchLinks = topicDefinitions.slice(0, 4)
  .map((topic) => `<a href="../topics/${topic.slug}.html"><strong>${escapeHtml(topic.titleZh)}</strong><span>${escapeHtml(topic.descriptionZh)}</span></a>`)
  .join("");
const trustDockItems = [
  {
    id: "search",
    icon: "⌕",
    label: "Search Pages",
    labelZh: "搜索页",
    title: "Evergreen pages keep discovery open.",
    titleZh: "长期入口让发现持续开放。",
    body: "Platform and workflow pages refresh from the same source data, then route qualified readers back to the sample pack.",
    bodyZh: "平台和工作流页面使用同一份来源数据刷新，再把合格读者引回样品包。",
    metric: `${topicDefinitions.length} pages`,
    metricZh: `${topicDefinitions.length} 个入口`,
    href: "./topics/bilibili-ai-topics.html",
    hrefZh: "../topics/bilibili-ai-topics.html",
    action: "Open search page",
    actionZh: "打开搜索页",
    panel: `<div class="trust-link-grid">${trustDockSearchLinks}</div>`
  },
  {
    id: "feed",
    icon: "▤",
    label: "Live Feed",
    labelZh: "实时 Feed",
    title: "The current issue stays inspectable.",
    titleZh: "当前期次始终可检查。",
    body: "RSS and JSON publish the top opportunities with proof links, hooks, demo angles, and limitation notes.",
    bodyZh: "RSS 和 JSON 发布 Top 机会，并保留来源链接、钩子、演示角度和限制说明。",
    metric: `${top.length} current signals`,
    metricZh: `${top.length} 条当前信号`,
    href: "./feed.xml",
    hrefZh: "../feed.xml",
    action: "Open RSS feed",
    actionZh: "打开 RSS Feed",
    panel: `<div class="trust-live-list"><div><span></span><strong>${dual(`${top.length} current signals`, `${top.length} 条当前信号`)}</strong><a href="./feed.json">JSON</a></div><ol>${trustDockFeedRows}</ol></div>`
  },
  {
    id: "archive",
    icon: "□",
    label: "Archive",
    labelZh: "归档",
    title: "Every issue freezes into proof.",
    titleZh: "每一期都冻结成证明。",
    body: `The latest public issue is dated ${issueDate}, so buyers can compare the track record before paying.`,
    bodyZh: `最新公开期刊日期为 ${issueDate}，买家付款前可以比较历史记录。`,
    metric: issueDate,
    metricZh: issueDate,
    href: `./${issuePath}`,
    hrefZh: `../${issuePath}`,
    action: "Open latest issue",
    actionZh: "打开最新一期",
    panel: `<div class="trust-issue-card"><div><strong>#${escapeHtml(issueDate)}</strong><span>${dual("Weekly Trend Brief", "周更趋势简报")}</span><em>${dual(`${top.length} ranked signals`, `${top.length} 条排序信号`)}</em></div><ul><li>${dual("Proof links attached", "来源链接已附带")}</li><li>${dual("Source list included", "来源列表已包含")}</li><li>${dual("Evidence verified", "证据已核验")}</li></ul></div>`
  },
  {
    id: "sample",
    icon: "中",
    label: "中文样品",
    labelZh: "中文样品",
    title: "Chinese buyers can inspect the same quality bar.",
    titleZh: "中文买家可以检查同一套质量标准。",
    body: "The Chinese sample keeps titles, hooks, source links, CSV fields, and delivery structure visible before an order.",
    bodyZh: "中文样品在下单前展示标题、钩子、来源链接、CSV 字段和交付结构。",
    metric: "Bilingual pack",
    metricZh: "双语样品包",
    href: "./public-sample.zh-CN.md",
    hrefZh: "../public-sample.zh-CN.md",
    action: "Open Chinese sample",
    actionZh: "打开中文样品",
    panel: `<div class="trust-sample-card"><strong>${dual("Chinese sample", "中文样品")}</strong><span>Markdown + CSV</span><p>${dual("Titles, hooks, proof links, and risk notes remain visible before purchase.", "标题、钩子、来源链接和风险备注在购买前保持可见。")}</p><a href="./public-sample.zh-CN.csv">${dual("Open CSV", "打开 CSV")}</a></div>`
  }
];
const trustDockButtons = trustDockItems
  .map((item, index) => `<button class="trust-dock-tab${index === 1 ? " active" : ""}" type="button" data-trust-dock="${escapeHtml(item.id)}" aria-pressed="${index === 1 ? "true" : "false"}"><span>${escapeHtml(item.icon)}</span><strong>${dual(item.label, item.labelZh)}</strong></button>`)
  .join("");
const zhTrustDockButtons = trustDockItems
  .map((item, index) => `<button class="trust-dock-tab${index === 1 ? " active" : ""}" type="button" data-trust-dock="${escapeHtml(item.id)}" aria-pressed="${index === 1 ? "true" : "false"}"><span>${escapeHtml(item.icon)}</span><strong>${escapeHtml(item.labelZh)}</strong></button>`)
  .join("");
const trustDockPanels = trustDockItems
  .map((item, index) => `<article class="trust-dock-panel${index === 1 ? " active" : ""}" data-trust-dock-panel="${escapeHtml(item.id)}">
        <div class="trust-panel-copy">
          ${dual(item.title, item.titleZh, "h3")}
          ${dual(item.body, item.bodyZh, "p")}
          <a class="trust-panel-link" href="${escapeHtml(item.href)}">${dual(item.action, item.actionZh)}<span>→</span></a>
        </div>
        ${item.panel}
      </article>`)
  .join("");
const zhTrustDockPanels = trustDockItems
  .map((item, index) => {
    const panel = item.id === "search"
      ? `<div class="trust-link-grid">${zhTrustDockSearchLinks}</div>`
      : item.id === "feed"
        ? `<div class="trust-live-list"><div><span></span><strong>${top.length} 条当前信号</strong><a href="../feed.json">JSON</a></div><ol>${zhTrustDockFeedRows}</ol></div>`
        : item.id === "archive"
          ? `<div class="trust-issue-card"><div><strong>#${escapeHtml(issueDate)}</strong><span>Weekly Trend Brief</span><em>${top.length} 条排序信号</em></div><ul><li>来源链接已附带</li><li>来源列表已包含</li><li>证据已核验</li></ul></div>`
          : `<div class="trust-sample-card"><strong>中文样品</strong><span>Markdown + CSV</span><p>标题、钩子、来源链接和风险备注在购买前保持可见。</p><a href="../public-sample.zh-CN.csv">打开 CSV</a></div>`;
    return `<article class="trust-dock-panel${index === 1 ? " active" : ""}" data-trust-dock-panel="${escapeHtml(item.id)}">
        <div class="trust-panel-copy">
          <h3>${escapeHtml(item.titleZh)}</h3>
          <p>${escapeHtml(item.bodyZh)}</p>
          <a class="trust-panel-link" href="${escapeHtml(item.hrefZh)}">${escapeHtml(item.actionZh)}<span>→</span></a>
        </div>
        ${panel}
      </article>`;
  })
  .join("");
const trustDockMetrics = [
  [`${top.length}`, "current signals", "当前信号"],
  [issueDate, "latest issue", "最新期次"],
  [`${proofLinkRate}%`, "proof links attached", "来源链接附带"]
];
const trustDockMetricItems = trustDockMetrics
  .map(([value, label, labelZh]) => `<span><strong>${escapeHtml(value)}</strong>${dual(label, labelZh)}</span>`)
  .join("");
const zhTrustDockMetricItems = trustDockMetrics
  .map(([value, , labelZh]) => `<span><strong>${escapeHtml(value)}</strong>${escapeHtml(labelZh)}</span>`)
  .join("");
const trustDock = `<section class="trust-dock" id="trust-dock" aria-label="Trust dock">
      <div class="trust-dock-copy">
        ${dual("Trust Dock", "信任入口", "p", ' class="section-label"')}
        ${dual("Keep checking before you buy.", "购买前，可以一直检查。", "h2")}
        ${dual("Open data, weekly cadence, and public proof make the product easy to verify without forcing a decision on the first visit.", "开放数据、周更节奏和公开证明，让买家不必第一次访问就做决定，也能持续验证产品质量。", "p")}
        <ul class="trust-dock-bullets">
          <li><span></span>${dual("Public and verifiable", "公开且可验证")}</li>
          <li><span></span>${dual("Updated every week", "每周更新")}</li>
          <li><span></span>${dual("Proof you can click", "来源可点击")}</li>
        </ul>
      </div>
      <div class="trust-dock-surface" data-active-trust-dock="feed" tabindex="0">
        <div class="trust-dock-tabs" aria-label="Trust entry points">${trustDockButtons}<span class="trust-dock-indicator" aria-hidden="true"></span></div>
        <div class="trust-dock-stage">${trustDockPanels}</div>
        <div class="trust-dock-metrics">${trustDockMetricItems}</div>
      </div>
    </section>`;
const zhTrustDock = `<section class="trust-dock" id="trust-dock" aria-label="Trust dock">
      <div class="trust-dock-copy">
        <p class="section-label">信任入口</p>
        <h2>购买前，可以一直检查。</h2>
        <p>开放数据、周更节奏和公开证明，让买家不必第一次访问就做决定，也能持续验证产品质量。</p>
        <ul class="trust-dock-bullets">
          <li><span></span>公开且可验证</li>
          <li><span></span>每周更新</li>
          <li><span></span>来源可点击</li>
        </ul>
      </div>
      <div class="trust-dock-surface" data-active-trust-dock="feed" tabindex="0">
        <div class="trust-dock-tabs" aria-label="Trust entry points">${zhTrustDockButtons}<span class="trust-dock-indicator" aria-hidden="true"></span></div>
        <div class="trust-dock-stage">${zhTrustDockPanels}</div>
        <div class="trust-dock-metrics">${zhTrustDockMetricItems}</div>
      </div>
    </section>`;
const proofLedgerItems = [
  {
    id: "sample",
    label: "Sample",
    labelZh: "样品",
    title: "Inspect the product shape before ordering.",
    titleZh: "下单前先检查产品形态。",
    body: "The free pack exposes the same brief structure: ranked opportunities, proof links, CSV, and a ready-to-record script sample.",
    bodyZh: "免费样品公开同一套 brief 结构：排序机会、来源链接、CSV 和可录制脚本样例。",
    metric: `${publicSample.length} current ideas`,
    metricZh: `${publicSample.length} 个当前机会`,
    href: "./trendfoundry-free-sample-pack.zip",
    hrefZh: "../trendfoundry-free-sample-pack.zip",
    action: "Download sample",
    actionZh: "下载样品"
  },
  {
    id: "feed",
    label: "Feed",
    labelZh: "Feed",
    title: "Watch the pipeline refresh without asking.",
    titleZh: "不用询问，也能看到管线更新。",
    body: "RSS and JSON publish the current top opportunities with hook, demo angle, limitation, and source trail.",
    bodyZh: "RSS 和 JSON 发布当前 Top 机会，并保留钩子、演示角度、限制说明和来源链。",
    metric: `${feedItems.length} live feed items`,
    metricZh: `${feedItems.length} 条 Feed 项目`,
    href: "./feed.xml",
    hrefZh: "../feed.xml",
    action: "Open RSS",
    actionZh: "打开 RSS"
  },
  {
    id: "archive",
    label: "Archive",
    labelZh: "归档",
    title: "Freeze every issue as a track record.",
    titleZh: "每一期都冻结成历史记录。",
    body: `The latest public issue is dated ${issueDate}, so buyers can inspect what was known at the time instead of trusting a moving sales page.`,
    bodyZh: `最新公开期刊日期为 ${issueDate}，买家可以检查当时的记录，而不是只相信会变化的销售页。`,
    metric: issueDate,
    metricZh: issueDate,
    href: `./${issuePath}`,
    hrefZh: `../${issuePath}`,
    action: "Latest issue",
    actionZh: "最新一期"
  },
  {
    id: "order",
    label: "Order",
    labelZh: "下单",
    title: "Move from proof to a buyer-ready pack.",
    titleZh: "从证明资产进入买家交付包。",
    body: "The order page keeps checkout manual first: pick a tier, send a prepared email, then receive payment and delivery details privately.",
    bodyZh: "下单页先保持人工结账：选择档位，发送准备好的邮件，再私下收到付款和交付说明。",
    metric: "$9 / $19 / $49",
    metricZh: "$9 / $19 / $49",
    href: "./order/",
    hrefZh: "../order/",
    action: "Open order page",
    actionZh: "打开下单页"
  }
];
const proofLedgerButtons = proofLedgerItems
  .map((item, index) => `<button class="proof-tab${index === 0 ? " active" : ""}" type="button" data-proof-tab="${escapeHtml(item.id)}" aria-pressed="${index === 0 ? "true" : "false"}"><span>${dual(item.label, item.labelZh)}</span><strong>${dual(item.metric, item.metricZh)}</strong></button>`)
  .join("");
const zhProofLedgerButtons = proofLedgerItems
  .map((item, index) => `<button class="proof-tab${index === 0 ? " active" : ""}" type="button" data-proof-tab="${escapeHtml(item.id)}" aria-pressed="${index === 0 ? "true" : "false"}"><span>${escapeHtml(item.labelZh)}</span><strong>${escapeHtml(item.metricZh)}</strong></button>`)
  .join("");
const proofLedgerPanels = proofLedgerItems
  .map((item, index) => `<article class="proof-panel${index === 0 ? " active" : ""}" data-proof-panel="${escapeHtml(item.id)}">
        ${dual(item.label, item.labelZh, "p", ' class="proof-panel-kicker"')}
        ${dual(item.title, item.titleZh, "h3")}
        ${dual(item.body, item.bodyZh, "p")}
        <a class="action primary" href="${escapeHtml(item.href)}">${dual(item.action, item.actionZh)}</a>
      </article>`)
  .join("");
const zhProofLedgerPanels = proofLedgerItems
  .map((item, index) => `<article class="proof-panel${index === 0 ? " active" : ""}" data-proof-panel="${escapeHtml(item.id)}">
        <p class="proof-panel-kicker">${escapeHtml(item.labelZh)}</p>
        <h3>${escapeHtml(item.titleZh)}</h3>
        <p>${escapeHtml(item.bodyZh)}</p>
        <a class="action primary" href="${escapeHtml(item.hrefZh)}">${escapeHtml(item.actionZh)}</a>
      </article>`)
  .join("");
const proofLedger = `<section class="proof-ledger" id="proof-ledger" aria-label="Proof ledger">
    <div class="proof-copy">
      ${dual("Proof ledger", "证明账本", "p", ' class="section-label"')}
      ${dual("Trust is a system, not a claim.", "信任不是一句话，而是一套系统。", "h2")}
      ${dual("TrendFoundry keeps a visible trail from sample to feed to archive to order, so a buyer can inspect the operating rhythm before paying.", "TrendFoundry 把样品、Feed、归档和下单路径连成可见轨迹，让买家在付款前先检查运营节奏。", "p")}
    </div>
    <div class="proof-console">
      <div class="proof-tabs" aria-label="Proof channels">${proofLedgerButtons}</div>
      <div class="proof-panels">${proofLedgerPanels}</div>
    </div>
  </section>`;
const zhProofLedger = `<section class="proof-ledger" id="proof-ledger" aria-label="Proof ledger">
    <div class="proof-copy">
      <p class="section-label">证明账本</p>
      <h2>信任不是一句话，而是一套系统。</h2>
      <p>TrendFoundry 把样品、Feed、归档和下单路径连成可见轨迹，让买家在付款前先检查运营节奏。</p>
    </div>
    <div class="proof-console">
      <div class="proof-tabs" aria-label="Proof channels">${zhProofLedgerButtons}</div>
      <div class="proof-panels">${zhProofLedgerPanels}</div>
    </div>
  </section>`;

const finalActionItems = [
  {
    id: "inspect",
    label: "Inspect",
    labelZh: "检查",
    metric: "Proof first",
    metricZh: "先看证明",
    status: "Latest issue + sample pack + public feed",
    statusZh: "最新期刊 + 样品包 + 公开 Feed",
    title: "Leave with the proof trail open.",
    titleZh: "先把证明路径打开。",
    body: "For cautious buyers, start with the frozen issue and sample pack. The product sells better when every claim has a visible source trail.",
    bodyZh: "面对谨慎买家，先让对方检查已冻结的期刊和样品包。每个承诺都有可见来源路径，销售才更稳。",
    href: "./issues/latest.html",
    hrefZh: "../issues/latest.html",
    action: "Open latest issue",
    actionZh: "打开最新期刊",
    secondaryHref: "./trendfoundry-free-sample-pack.zip",
    secondaryHrefZh: "../trendfoundry-free-sample-pack.zip",
    secondaryAction: "Download sample",
    secondaryActionZh: "下载样品包"
  },
  {
    id: "order",
    label: "Order",
    labelZh: "下单",
    metric: "Manual checkout",
    metricZh: "人工结算",
    status: "$9 sample, $19 weekly, $49 custom",
    statusZh: "$9 样品、$19 周更、$49 定制",
    title: "Move the next issue into the queue.",
    titleZh: "把下一期排进交付队列。",
    body: "The order route stays high-trust and manual: choose the pack, send a prepared request, then confirm payment and delivery details privately.",
    bodyZh: "下单路径保持高信任和人工优先：选择交付包，发送准备好的请求，再私下确认付款和交付细节。",
    href: "./order/",
    hrefZh: "../order/",
    action: "Open order page",
    actionZh: "打开下单页",
    secondaryHref: issueOrderHref,
    secondaryHrefZh: issueOrderHref,
    secondaryAction: "Request sample",
    secondaryActionZh: "申请样品"
  },
  {
    id: "operate",
    label: "Operate",
    labelZh: "运营",
    metric: "Launch loop",
    metricZh: "发布闭环",
    status: "Offer, copy, outreach, repeat",
    statusZh: "报价、文案、外联、复用",
    title: "Turn the page into a selling system.",
    titleZh: "把页面变成销售系统。",
    body: "Use the launch plan and sales copy to route visitors from proof into a weekly subscription, then reuse the archive as compounding trust.",
    bodyZh: "用发布计划和销售文案把访客从证明路径导向周更订阅，再让归档持续累积信任。",
    href: "./launch-plan.md",
    hrefZh: "../launch-plan.md",
    action: "Open launch plan",
    actionZh: "打开发布计划",
    secondaryHref: "./sales-page-copy.md",
    secondaryHrefZh: "../sales-page-copy.md",
    secondaryAction: "View sales copy",
    secondaryActionZh: "查看销售文案"
  }
];
const finalActionButtons = finalActionItems
  .map((item, index) => `<button class="final-action-button${index === 0 ? " active" : ""}" type="button" data-final-action="${escapeHtml(item.id)}" data-final-index="${index}" aria-pressed="${index === 0 ? "true" : "false"}"><em>0${index + 1}</em><span>${dual(item.label, item.labelZh)}</span><strong>${dual(item.metric, item.metricZh)}</strong></button>`)
  .join("");
const zhFinalActionButtons = finalActionItems
  .map((item, index) => `<button class="final-action-button${index === 0 ? " active" : ""}" type="button" data-final-action="${escapeHtml(item.id)}" data-final-index="${index}" aria-pressed="${index === 0 ? "true" : "false"}"><em>0${index + 1}</em><span>${escapeHtml(item.labelZh)}</span><strong>${escapeHtml(item.metricZh)}</strong></button>`)
  .join("");
const finalActionPanels = finalActionItems
  .map((item, index) => `<article class="final-action-panel${index === 0 ? " active" : ""}" data-final-panel="${escapeHtml(item.id)}">
        <div class="final-panel-visual" aria-hidden="true"><span></span><span></span><span></span></div>
        ${dual(item.status, item.statusZh, "p", ' class="final-panel-kicker"')}
        ${dual(item.title, item.titleZh, "h3")}
        ${dual(item.body, item.bodyZh, "p")}
        <div class="final-progress-row"><span>0${index + 1} / 03</span><strong></strong></div>
        <div class="final-panel-actions">
          <a class="action primary" href="${escapeHtml(item.href)}">${dual(item.action, item.actionZh)}</a>
          <a class="action" href="${escapeHtml(item.secondaryHref)}">${dual(item.secondaryAction, item.secondaryActionZh)}</a>
        </div>
      </article>`)
  .join("");
const zhFinalActionPanels = finalActionItems
  .map((item, index) => `<article class="final-action-panel${index === 0 ? " active" : ""}" data-final-panel="${escapeHtml(item.id)}">
        <div class="final-panel-visual" aria-hidden="true"><span></span><span></span><span></span></div>
        <p class="final-panel-kicker">${escapeHtml(item.statusZh)}</p>
        <h3>${escapeHtml(item.titleZh)}</h3>
        <p>${escapeHtml(item.bodyZh)}</p>
        <div class="final-progress-row"><span>0${index + 1} / 03</span><strong></strong></div>
        <div class="final-panel-actions">
          <a class="action primary" href="${escapeHtml(item.hrefZh)}">${escapeHtml(item.actionZh)}</a>
          <a class="action" href="${escapeHtml(item.secondaryHrefZh)}">${escapeHtml(item.secondaryActionZh)}</a>
        </div>
      </article>`)
  .join("");
const finalActionChips = `<div class="final-action-chips" aria-label="Handoff assurances"><span>${dual("Source proof", "来源证明")}</span><span>${dual("Manual checkout", "人工结算")}</span><span>${dual("Launch loop", "发布闭环")}</span></div>`;
const zhFinalActionChips = `<div class="final-action-chips" aria-label="Handoff assurances"><span>来源证明</span><span>人工结算</span><span>发布闭环</span></div>`;
const closingHandoff = `<section class="handoff closing-handoff" id="final-action" aria-label="Final action" style="--final-progress:33%;">
      <div class="closing-copy">
        ${dual("Final Action Studio", "最终动作工作台", "p", ' class="section-label"')}
        ${dual("Choose the next move.", "选择下一步动作。", "h2")}
        ${dual("You have seen the signal and the proof. Now choose whether to inspect, order, or operate the loop.", "你已经看过信号和证明。现在选择检查、下单，或复用这套运营闭环。", "p")}
        <div class="closing-badges" aria-label="Conversion path">
          <span>${dual("Built on verified sources", "建立在已验证来源上")}</span>
          <span>${dual("Secure by design", "默认安全")}</span>
          <span>${dual("Ready to act", "可以直接行动")}</span>
        </div>
        <p class="closing-key-hint">${dual("Use arrow keys to switch the final route.", "可用方向键切换最终路径。")}</p>
      </div>
      <div class="closing-console" tabindex="0">
        <div class="closing-console-top">
          <span><i></i>${dual("TrendFoundry", "TrendFoundry")}</span>
          <strong>${dual("Buyer handoff", "买家交接")}</strong>
          <em>${dual("Verified", "已验证")}</em>
        </div>
        <div class="final-action-switcher" aria-label="Choose final action">${finalActionButtons}</div>
        <div class="final-action-panels">${finalActionPanels}</div>
        ${finalActionChips}
      </div>
    </section>`;
const zhClosingHandoff = `<section class="handoff closing-handoff" id="final-action" aria-label="Final action" style="--final-progress:33%;">
      <div class="closing-copy">
        <p class="section-label">最终动作工作台</p>
        <h2>选择下一步动作。</h2>
        <p>你已经看过信号和证明。现在选择检查、下单，或复用这套运营闭环。</p>
        <div class="closing-badges" aria-label="Conversion path">
          <span>建立在已验证来源上</span>
          <span>默认安全</span>
          <span>可以直接行动</span>
        </div>
        <p class="closing-key-hint">可用方向键切换最终路径。</p>
      </div>
      <div class="closing-console" tabindex="0">
        <div class="closing-console-top">
          <span><i></i>TrendFoundry</span>
          <strong>买家交接</strong>
          <em>已验证</em>
        </div>
        <div class="final-action-switcher" aria-label="Choose final action">${zhFinalActionButtons}</div>
        <div class="final-action-panels">${zhFinalActionPanels}</div>
        ${zhFinalActionChips}
      </div>
    </section>`;

const checkoutCloseActions = [
  {
    id: "sample",
    label: "Inspect sample",
    labelZh: "看样品",
    meta: `${publicSample.length} public opportunities`,
    metaZh: `${publicSample.length} 个公开机会`,
    body: "Confirm the product shape before choosing a paid tier.",
    bodyZh: "先确认格式，再决定是否购买付费档。",
    href: "#sample",
    hrefZh: "#sample"
  },
  {
    id: "order",
    label: "Buy a pack",
    labelZh: "买一份",
    meta: "$9 sample starts here",
    metaZh: "$9 样品从这里开始",
    body: "Open the manual order page and choose a tier.",
    bodyZh: "打开人工下单页，选择单期、周更或定制。",
    href: "./order/",
    hrefZh: "../order/",
    primary: true
  },
  {
    id: "brief",
    label: "Send a brief",
    labelZh: "发需求",
    meta: "Custom niche desk",
    metaZh: "垂直定制需求",
    body: "Use email when the channel or niche needs context.",
    bodyZh: "频道或垂类需要背景时，直接发邮件说明。",
    href: tierOrderHref(pricingTiers[2], "en"),
    hrefZh: tierOrderHref(pricingTiers[2], "zh")
  }
];
const checkoutCloseCards = checkoutCloseActions
  .map((item, index) => `<a class="checkout-close-card${item.primary ? " primary" : ""}" href="${escapeHtml(item.href)}" data-close-href-en="${escapeHtml(item.href)}" data-close-href-zh="${escapeHtml(item.hrefZh)}">
      <span>0${index + 1}</span>
      <strong>${dual(item.label, item.labelZh)}</strong>
      ${dual(item.meta, item.metaZh, "em")}
      ${dual(item.body, item.bodyZh, "small")}
    </a>`)
  .join("");
const zhCheckoutCloseCards = checkoutCloseActions
  .map((item, index) => `<a class="checkout-close-card${item.primary ? " primary" : ""}" href="${escapeHtml(item.hrefZh)}">
      <span>0${index + 1}</span>
      <strong>${escapeHtml(item.labelZh)}</strong>
      <em>${escapeHtml(item.metaZh)}</em>
      <small>${escapeHtml(item.bodyZh)}</small>
    </a>`)
  .join("");
const checkoutClose = `<section class="checkout-close" id="final-action" aria-label="Final checkout action">
    <div class="checkout-close-copy">
      ${dual("Ready when you are", "最后一步", "p", ' class="section-label"')}
      ${dual("Inspect first. Order when it fits.", "检查后再下单。", "h2")}
      ${dual("Confirm the sample, sources, and delivery format before choosing a buying route. The product should feel legible before it asks for commitment.", "先确认样品、来源和交付格式，再选择购买方式。购买动作出现之前，产品本身必须已经讲清楚。", "p")}
      <div class="checkout-proof-row" aria-label="Proof points">
        ${dual("Sample visible", "样品可看", "span")}
        ${dual("Sources traceable", "来源可追", "span")}
        ${dual("Email order", "邮件下单", "span")}
      </div>
    </div>
    <div class="checkout-close-panel">
      <div class="checkout-close-top">
        <span>${dual("TrendFoundry", "TrendFoundry")}</span>
        <strong>${dual("Buyer path", "购买路径")}</strong>
      </div>
      <div class="checkout-close-grid">${checkoutCloseCards}</div>
    </div>
  </section>`;
const zhCheckoutClose = `<section class="checkout-close" id="final-action" aria-label="Final checkout action">
    <div class="checkout-close-copy">
      <p class="section-label">最后一步</p>
      <h2>检查后再下单。</h2>
      <p>先确认样品、来源和交付格式，再选择购买方式。购买动作出现之前，产品本身必须已经讲清楚。</p>
      <div class="checkout-proof-row" aria-label="Proof points">
        <span>样品可看</span>
        <span>来源可追</span>
        <span>邮件下单</span>
      </div>
    </div>
    <div class="checkout-close-panel">
      <div class="checkout-close-top">
        <span>TrendFoundry</span>
        <strong>购买路径</strong>
      </div>
      <div class="checkout-close-grid">${zhCheckoutCloseCards}</div>
    </div>
  </section>`;
const rssFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>TrendFoundry Creator Intelligence</title>
    <link>${publicSiteUrl}</link>
    <atom:link href="${publicSiteUrl}feed.xml" rel="self" type="application/rss+xml" />
    <description>Source-backed AI and developer creator opportunities with hooks, demo angles, and limitations.</description>
    <language>en</language>
    <lastBuildDate>${new Date(feedUpdated).toUTCString()}</lastBuildDate>
${feedItems
  .map(
    (item, index) => `    <item>
      <title>${escapeXml(`#${index + 1} ${item.title}`)}</title>
      <link>${escapeXml(item.url)}</link>
      <guid isPermaLink="false">${escapeXml(item.url || item.id)}</guid>
      <pubDate>${new Date(item.updatedAt || item.createdAt || data.generatedAt).toUTCString()}</pubDate>
      <description><![CDATA[${feedDescription(item)}]]></description>
    </item>`
  )
  .join("\n")}
  </channel>
</rss>
`;

const jsonFeed = {
  version: "https://jsonfeed.org/version/1.1",
  title: "TrendFoundry Creator Intelligence",
  home_page_url: publicSiteUrl,
  feed_url: `${publicSiteUrl}feed.json`,
  description: "Source-backed AI and developer creator opportunities with hooks, demo angles, and limitations.",
  language: "en",
  items: feedItems.map((item, index) => ({
    id: item.url || item.id,
    url: item.url,
    title: `#${index + 1} ${item.title}`,
    content_text: feedDescription(item),
    date_published: item.updatedAt || item.createdAt || data.generatedAt,
    tags: [item.source, item.monetizationFit, item.qualityRisk].filter(Boolean)
  }))
};

const issueMarkdown = `# ${issueTitle}

Generated: ${data.generatedAt}

This public issue is a durable snapshot of the current TrendFoundry brief. The paid pack adds the buyer-ready CSV, delivery notes, and the full scene-by-scene script.

## Source Mix

${Object.entries(bySource)
  .map(([source, count]) => `- ${source}: ${count}`)
  .join("\n")}

## Top Opportunities

${top
  .map(
    (item, index) => `### ${index + 1}. ${item.title}

- Score: ${item.score}
- Source: ${item.source} / ${item.sourceQuery}
- Fit: ${item.monetizationFit}
- Quality: ${item.qualityRisk}
- Link: ${item.url}
- Hook: ${zhHook(item)}
- Demo angle: ${item.deliverables.demoSteps?.[1] || item.deliverables.whyNow}
- Limitation: ${item.deliverables.limitation}
`
  )
  .join("\n")}

## Order

- English sample: ${publicSiteUrl}public-sample.en.md
- Chinese sample: ${publicSiteUrl}public-sample.zh-CN.md
- Ready-to-record script: ${publicSiteUrl}ready-to-record-script.md
- Request current pack: ${issueOrderHref}
- Email order: ${contactEmail}
`;

function issueCards(items) {
  return items
    .map(
      (item, index) => `<article class="issue-card">
  <p class="topic-rank">#${index + 1} / ${escapeHtml(item.source)} / score ${escapeHtml(item.score)}</p>
  <h2><a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a></h2>
  <p>${escapeHtml(item.summary || "No summary available.")}</p>
  <ul>
    <li><strong>Hook:</strong> ${escapeHtml(zhHook(item))}</li>
    <li><strong>Demo angle:</strong> ${escapeHtml(item.deliverables.demoSteps?.[1] || item.deliverables.whyNow)}</li>
    <li><strong>Limitation:</strong> ${escapeHtml(item.deliverables.limitation)}</li>
  </ul>
</article>`
    )
    .join("");
}

function buildIssuePage() {
  const body = `<header class="topic-hero">
  <div class="brandline">${brandLogo()}<span>Public issue</span></div>
  <h1>${escapeHtml(issueTitle)}</h1>
  <p class="sub">A durable public snapshot of 12 source-backed creator opportunities. Use it to inspect proof links, hooks, demo angles, and limitations before requesting the full pack.</p>
  <div class="hero-actions">
    <a class="action primary" href="../public-sample.en.md">English sample</a>
    <a class="action" href="../public-sample.zh-CN.md">中文样品</a>
    <a class="action" href="../ready-to-record-script.md">Open script</a>
    <a class="action" href="./index.html">Issue archive</a>
    <a class="action" href="../auth/">Sign in</a>
    <a class="action strong" href="${issueOrderHref}">Request current pack</a>
  </div>
</header>
<main>
  <section class="issue-summary">
    <div>
      <p class="section-label">Snapshot</p>
      <h2>${escapeHtml(sourceMix)}.</h2>
    </div>
    <p>Generated ${escapeHtml(data.generatedAt)}. Source errors: ${escapeHtml(data.errorCount || 0)}. High-fit opportunities: ${escapeHtml(high.length)}.</p>
  </section>
  <section class="issue-list">${issueCards(top)}</section>
  <section class="handoff">
    <div>
      <p class="section-label">Paid pack</p>
      <h2>Want the buyer-ready version?</h2>
      <p>The paid pack includes CSV, delivery notes, and one ready-to-record scene-by-scene script.</p>
    </div>
    <div class="handoff-links">
      <a class="action primary" href="${issueOrderHref}">Request sample</a>
      <a class="action" href="${orderHref}">Email order</a>
    </div>
  </section>
</main>`;
  return pageShell({
    title: issueTitle,
    description: "A durable public TrendFoundry issue with source-backed creator opportunities, hooks, demo angles, and limitations.",
    body,
    canonicalPath: issuePath
  });
}

async function issueArchiveLinks() {
  const files = new Set([`${issueDate}.html`, "latest.html"]);
  try {
    for (const file of await readdir(siteIssuesDir)) {
      if (/^\d{4}-\d{2}-\d{2}\.html$/.test(file)) files.add(file);
    }
  } catch {
    // Directory is created above, but keep this tolerant for first-run portability.
  }
  return [...files]
    .filter((file) => file !== "latest.html")
    .sort()
    .reverse()
    .map((file) => file.replace(/\.html$/, ""));
}

function buildIssueArchivePage(slugs) {
  const links = slugs
    .map((slug) => `<a class="topic-link" href="./${slug}.html"><span>TrendFoundry Issue ${escapeHtml(slug)}</span><small>Public snapshot with 12 source-backed opportunities, hooks, demo angles, and limitations.</small></a>`)
    .join("");
  const body = `<header class="topic-hero">
  <div class="brandline">${brandLogo()}<span>Issue archive</span></div>
  <h1>Public issue archive</h1>
  <p class="sub">Durable snapshots make the product inspectable, indexable, and easier to trust before a buyer requests the current pack.</p>
  <div class="hero-actions">
    <a class="action primary" href="./latest.html">Latest issue</a>
    <a class="action" href="../feed.xml">RSS feed</a>
    <a class="action" href="../auth/">Sign in</a>
    <a class="action" href="../index.html">Dashboard</a>
  </div>
</header>
<main>
  <section class="seo-hub" aria-label="Issue archive">
    <div>
      <p class="section-label">Archive</p>
      <h2>${slugs.length} public issue${slugs.length === 1 ? "" : "s"} available.</h2>
      <p>Each issue keeps source links, creator hooks, demo angles, and limitation notes together as a permanent proof asset.</p>
    </div>
    <div class="topic-links">${links}</div>
  </section>
</main>`;
  return pageShell({
    title: "TrendFoundry public issue archive",
    description: "Public archive of TrendFoundry creator-intelligence issues.",
    body,
    canonicalPath: "issues/"
  });
}

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Source-backed AI and developer video opportunities shaped into titles, hooks, demos, limitations, and buyer-ready weekly pipelines.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${publicSiteUrl}">
  <meta property="og:title" content="TrendFoundry Creator Intelligence">
  <meta property="og:description" content="Source-backed video ideas before the demos get copied.">
  <meta property="og:image" content="${ogImageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="TrendFoundry Creator Intelligence">
  <meta name="twitter:description" content="AI and developer trend signals shaped into creator-ready weekly pipelines.">
  <meta name="twitter:image" content="${ogImageUrl}">
  <title>TrendFoundry Creator Intelligence</title>
  <link rel="stylesheet" href="./styles.css">
  <link rel="alternate" type="application/rss+xml" title="TrendFoundry RSS" href="./feed.xml">
  <link rel="alternate" type="application/feed+json" title="TrendFoundry JSON Feed" href="./feed.json">
  <script src="./app.js?v=${encodeURIComponent(feedUpdated)}" defer></script>
</head>
<body id="top" data-lang="en" data-default-lang="en">
  <header class="topbar">
    <div>
      <div class="brandrow">
        <div class="brandline">
          ${brandLogo()}
          <span>${dual(`Issue ${new Date(data.generatedAt).toLocaleDateString("en-GB")}`, `期次 ${new Date(data.generatedAt).toLocaleDateString("zh-CN")}`)}</span>
        </div>
        <div class="language-switch" aria-label="Language">
          <button class="language-option active" type="button" data-language-toggle="en">EN</button>
          <button class="language-option" type="button" data-language-toggle="zh">中文</button>
        </div>
      </div>
      ${dual("Source-backed video ideas, ready to record.", "AI/开发者选题包，直接开录。", "h1")}
      ${dual("TrendFoundry scans public signals and turns them into ranked ideas, proof links, CSV, and scripts. Choose one sample, a weekly pipeline, or a custom niche desk.", "TrendFoundry 从公开信号里筛选机会，交付排序选题、来源证据、CSV 和脚本。产品只分三档：单期样品、周更情报、垂直定制。", "p", ' class="sub"')}
      ${heroTiers}
      <div class="hero-actions">
        <a class="action primary" href="./public-sample.en.md">${dual("View free sample", "查看免费样品")}</a>
        <a class="action strong" href="#pricing">${dual("Choose a pack", "选择产品档位")}</a>
      </div>
      <div class="utility-links" aria-label="Secondary landing links">
        <a href="./issues/latest.html">${dual("Latest issue", "最新期刊")}</a>
        <a href="./trendfoundry-free-sample-pack.zip">${dual("Sample pack", "样品包")}</a>
        <a href="./ready-to-record-script.md">${dual("Script", "脚本")}</a>
        <a href="./order/">${dual("Order without login", "无登录下单")}</a>
        <a href="${issueOrderHref}">${dual("Request on GitHub", "在 GitHub 申请")}</a>
        <a href="${orderHref}">${dual("Email order", "邮件下单")}</a>
      </div>
      <a class="scroll-cue" href="#decision-flow" aria-label="Scroll to product map">${dual("Scroll", "下滑")}<span aria-hidden="true"></span></a>
    </div>
    <aside>${productVisual}</aside>
  </header>
  ${localNav}
  ${sampleDrawer}
  <main>
    ${decisionFlow}
    <section class="signal-shelf" id="opportunities" aria-labelledby="signal-shelf-title">
      <div class="signal-shelf-copy">
        ${dual("Signal sample", "样品速览", "p", ' class="section-label"')}
        ${dual("Three signals are enough to judge quality.", "三条信号，够你判断质量。", "h2", ' id="signal-shelf-title"')}
        ${dual("Each row keeps the source, score, proof link, and recording angle visible so the sample stays inspectable without slowing the page down.", "每条都保留来源、评分、证据链接和录制角度；能检查质量，也不拖慢阅读。", "p")}
        <div class="product-rule-strip signal-proof-strip" aria-label="Sample proof fields">
          ${dual("Source", "来源", "span")}
          ${dual("Score", "评分", "span")}
          ${dual("Proof", "证据", "span")}
        </div>
      </div>
      <div class="signal-shelf-board">
        <div class="sample-signal-list" aria-label="Sample signal list">${sampleSignalCards}</div>
        ${opportunityFocus}
      </div>
      <div class="signal-shelf-actions">
        <a class="action primary" href="./trendfoundry-free-sample-pack.zip">${dual("Download sample pack", "下载样品包")}</a>
        <a class="action strong" href="./issues/latest.html">${dual("Open all 12 signals", "打开完整 12 条")}</a>
      </div>
      <div class="signal-file-links" aria-label="Sample files">
        <a href="./public-sample.en.md">EN sample</a>
        <a href="./public-sample.en.csv">EN CSV</a>
        <a href="./public-sample.zh-CN.md">中文样品</a>
        <a href="./public-sample.zh-CN.csv">中文 CSV</a>
      </div>
    </section>
    ${decisionPayoff}
    <section class="pricing pricing-studio" id="pricing" aria-label="Pricing tiers" style="--pricing-progress:66%;">
      <div class="section-head">
        <div>
          ${dual("Pricing", "定价", "p", ' class="section-label"')}
          ${dual("Confirm your intelligence pack.", "确认你的情报包。", "h2")}
          ${dual("The rules are already above. Here you only confirm the tier, price, and order route.", "前面已经说明怎么选档。这里确认档位、价格和下单路径。", "p")}
        </div>
        <div class="pricing-proof-points" aria-label="Offer division rules">
          ${dual("Test once", "先试一次", "span")}
          ${dual("Keep queue alive", "保持队列", "span")}
          ${dual("Own a niche", "占住垂类", "span")}
        </div>
      </div>
      <div class="pricing-workbench">
        ${pricingRail}
        <div class="tier-grid pricing-data-store" aria-hidden="true">${pricingCards}</div>
        ${pricingChooser}
      </div>
    </section>
    <section class="delivery delivery-lab" id="delivery-pack" aria-label="What the buyer receives">
      <div class="delivery-copy">
        ${dual("What arrives", "交付内容", "p", ' class="section-label"')}
        ${dual("Open the pack before you buy it.", "购买前，先看清交付包。", "h2")}
        ${dual("A creator does not need another digest. They need a small set of files that can move from source check to recording queue without rebuilding the research.", "创作者不需要又一份摘要，而是需要一小组文件：从来源核验到录制队列，中间不用重建研究。", "p")}
      </div>
      <div class="deliverable-viewer" data-active-deliverable="brief" style="--delivery-progress: 25%;" tabindex="0">
        <div class="deliverable-tabs" aria-label="Delivery file preview">${deliveryPreviewButtons}</div>
        <div class="deliverable-screen">${deliveryPreviewPanels}</div>
        <div class="delivery-stack-footer">
          <span class="delivery-stack-meter" aria-hidden="true"><span></span></span>
          <p data-deliverable-status>${dual("Brief selected", "已选择 Brief")}</p>
          ${dual("Click a tab or use arrow keys to explore each deliverable.", "点击标签或使用方向键查看每份交付文件。", "small")}
        </div>
      </div>
      <ul>${deliveryChecklist}</ul>
    </section>
    ${checkoutClose}
  </main>
</body>
</html>`;

const zhHtml = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="面向 B 站和中文 AI/开发者视频创作者的有来源选题情报包，包含可录制标题、钩子、演示角度、限制说明和样品交付资产。">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${publicSiteUrl}zh/">
  <meta property="og:title" content="TrendFoundry 中文创作者情报包">
  <meta property="og:description" content="把公开 AI/开发者趋势整理成可录制、可复核、可购买的创作者选题包。">
  <meta property="og:image" content="${ogImageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <title>TrendFoundry 中文创作者情报包</title>
  <link rel="canonical" href="${publicSiteUrl}zh/">
  <link rel="stylesheet" href="../styles.css">
  <link rel="alternate" type="application/rss+xml" title="TrendFoundry RSS" href="../feed.xml">
  <link rel="alternate" type="application/feed+json" title="TrendFoundry JSON Feed" href="../feed.json">
  <script src="../app.js?v=${encodeURIComponent(feedUpdated)}" defer></script>
</head>
<body id="top" data-lang="zh" data-default-lang="zh" data-force-lang="zh">
  <header class="topbar">
    <div>
      <div class="brandrow">
        <div class="brandline">
          ${brandLogo()}
          <span>中文入口 · 期次 ${new Date(data.generatedAt).toLocaleDateString("zh-CN")}</span>
        </div>
        <div class="language-switch" aria-label="Language">
          <a class="language-option" href="../?lang=en">EN</a>
          <span class="language-option active">中文</span>
        </div>
      </div>
      <h1>AI/开发者选题包，直接开录。</h1>
      <p class="sub">TrendFoundry 从公开信号里筛选机会，交付排序选题、来源证据、CSV 和脚本。产品只分三档：单期样品、周更情报、垂直定制。</p>
      ${zhHeroTiers}
      <div class="hero-actions">
        <a class="action primary" href="../public-sample.zh-CN.md">查看免费样品</a>
        <a class="action strong" href="#pricing">选择产品档位</a>
      </div>
      <div class="utility-links" aria-label="Secondary landing links">
        <a href="../public-sample.en.md">English sample</a>
        <a href="../issues/latest.html">最新期刊</a>
        <a href="../trendfoundry-free-sample-pack.zip">样品包</a>
        <a href="../ready-to-record-script.md">脚本</a>
        <a href="../order/">无登录下单</a>
        <a href="${issueOrderHref}">在 GitHub 申请</a>
        <a href="${orderHref}">邮件下单</a>
      </div>
      <a class="scroll-cue" href="#decision-flow" aria-label="Scroll to product map">下滑<span aria-hidden="true"></span></a>
    </div>
    <aside>${zhProductVisual}</aside>
  </header>
  ${zhLocalNav}
  ${zhSampleDrawer}
  <main>
    ${zhDecisionFlow}
    <section class="signal-shelf" id="opportunities" aria-labelledby="signal-shelf-title">
      <div class="signal-shelf-copy">
        <p class="section-label">样品速览</p>
        <h2 id="signal-shelf-title">三条信号，够你判断质量。</h2>
        <p>每条都保留来源、评分、证据链接和录制角度；能检查质量，也不拖慢阅读。</p>
        <div class="product-rule-strip signal-proof-strip" aria-label="样品证据字段">
          <span>来源</span>
          <span>评分</span>
          <span>证据</span>
        </div>
      </div>
      <div class="signal-shelf-board">
        <div class="sample-signal-list" aria-label="样品信号列表">${zhSampleSignalCards}</div>
        ${zhOpportunityFocus}
      </div>
      <div class="signal-shelf-actions">
        <a class="action primary" href="../trendfoundry-free-sample-pack.zip">下载样品包</a>
        <a class="action strong" href="../issues/latest.html">打开完整 12 条</a>
      </div>
      <div class="signal-file-links" aria-label="样品文件">
        <a href="../public-sample.zh-CN.md">中文样品</a>
        <a href="../public-sample.zh-CN.csv">中文 CSV</a>
        <a href="../public-sample.en.md">EN sample</a>
        <a href="../public-sample.en.csv">EN CSV</a>
      </div>
    </section>
    ${zhDecisionPayoff}
    <section class="pricing pricing-studio" id="pricing" aria-label="Pricing tiers" style="--pricing-progress:66%;">
      <div class="section-head">
        <div>
          <p class="section-label">定价</p>
          <h2>确认你的情报包。</h2>
          <p>前面已经说明怎么选档。这里确认档位、价格和下单路径。</p>
        </div>
        <div class="pricing-proof-points" aria-label="产品划分规则">
          <span>先试一次</span>
          <span>保持队列</span>
          <span>占住垂类</span>
        </div>
      </div>
      <div class="pricing-workbench">
        ${pricingRail}
        <div class="tier-grid pricing-data-store" aria-hidden="true">${pricingCards}</div>
        ${pricingChooser}
      </div>
    </section>
    <section class="delivery delivery-lab" id="delivery-pack" aria-label="What the buyer receives">
      <div class="delivery-copy">
        <p class="section-label">交付内容</p>
        <h2>购买前，先看清交付包。</h2>
        <p>创作者不需要又一份摘要，而是需要一小组文件：从来源核验到录制队列，中间不用重建研究。</p>
      </div>
      <div class="deliverable-viewer" data-active-deliverable="brief" style="--delivery-progress: 25%;" tabindex="0">
        <div class="deliverable-tabs" aria-label="Delivery file preview">${zhDeliveryPreviewButtons}</div>
        <div class="deliverable-screen">${zhDeliveryPreviewPanels}</div>
        <div class="delivery-stack-footer">
          <span class="delivery-stack-meter" aria-hidden="true"><span></span></span>
          <p data-deliverable-status>已选择 Brief</p>
          <small>点击标签或使用方向键查看每份交付文件。</small>
        </div>
      </div>
      <ul>${deliveryChecklist}</ul>
    </section>
    ${zhCheckoutClose}
  </main>
</body>
</html>`;

const orderHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Order TrendFoundry creator-intelligence packs by email without a payment account or GitHub login.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${publicSiteUrl}order/">
  <meta property="og:title" content="Order TrendFoundry without login">
  <meta property="og:description" content="Choose a sample issue, weekly pipeline, or custom niche desk and send a prepared order email.">
  <meta property="og:image" content="${ogImageUrl}">
  <title>Order TrendFoundry</title>
  <link rel="canonical" href="${publicSiteUrl}order/">
  <link rel="stylesheet" href="../styles.css">
</head>
<body data-lang="en">
  <header class="topic-hero order-hero">
    <div class="brandline">${brandLogo()}<span>No-login order</span></div>
    <h1>Order a creator-intelligence pack without creating another account.</h1>
    <p class="sub">Pick a tier, send the prepared email, and receive payment instructions plus the next delivery step. The GitHub form remains available for buyers who prefer public issue tracking.</p>
    <div class="hero-actions">
      <a class="action primary" href="#tiers">Choose tier</a>
      <a class="action strong" href="../trendfoundry-free-sample-pack.zip">Download sample pack</a>
      <a class="action" href="../public-sample.en.md">English sample</a>
      <a class="action" href="../public-sample.zh-CN.md">中文样品</a>
      <a class="action strong" href="${issueOrderHref}">GitHub request</a>
    </div>
  </header>
  <main>
    <section class="offer order-summary">
      <div>
        <p class="section-label">How ordering works</p>
        <h2>Manual checkout first, automation later.</h2>
        <p>No card details, private ID, passwords, or payment credentials are collected on this public site. The public page only opens a prepared email; payment and delivery details happen privately after review.</p>
      </div>
      <ol class="order-steps">
        <li><strong>Choose</strong><span>Pick sample, weekly, or custom niche.</span></li>
        <li><strong>Email</strong><span>Send the prepared order draft.</span></li>
        <li><strong>Receive</strong><span>Get payment instructions and delivery timing.</span></li>
      </ol>
    </section>
    <section class="offer payment-safety">
      <div>
        <p class="section-label">Payment reply</p>
        <h2>The next email is generated locally for review.</h2>
        <p>After an order email arrives, TrendFoundry can generate a local payment reply packet with an invoice draft, checklist, delivery boundary, and the exact files to send after payment confirmation.</p>
      </div>
      <ul class="safety-list">
        <li><strong>Private checkout</strong><span>Insert a verified hosted checkout link or manual invoice reference only after review.</span></li>
        <li><strong>No credential sharing</strong><span>Never ask buyers to email card numbers, private IDs, passwords, wallet seeds, or payment credentials.</span></li>
        <li><strong>Clean fulfillment</strong><span>Run fulfillment after payment confirmation; buyer packs exclude seller-only source and outreach files.</span></li>
      </ul>
    </section>
    <section id="tiers" class="pricing" aria-label="Order tiers">
      <div class="section-head">
        <p class="section-label">Order tiers / 下单档位</p>
        <h2>Start small, then subscribe only if the brief fits your channel.</h2>
        <p>Each email draft includes the tier, price, channel, niche preference, and delivery route so a buyer can act without logging into GitHub.</p>
      </div>
      <div class="tier-grid">${orderTierCards}</div>
    </section>
    <section class="order-copy" aria-label="Prepared order drafts">
      <div>
        <p class="section-label">Prepared email / 邮件草稿</p>
        <h2>Copy-safe text for manual review.</h2>
        <p>These drafts are intentionally plain. They avoid income promises and keep private payment information out of public issues.</p>
      </div>
      <div class="mail-drafts">
        <article>
          <h3>English draft</h3>
          <pre>Subject: TrendFoundry order: Weekly pipeline

Hi, I want to order TrendFoundry Weekly pipeline ($19 monthly).

My channel:
Main platform:
Niche preference:
Preferred delivery route:

Please send payment instructions and the next delivery step.</pre>
          <a class="action primary" href="${tierOrderHref(pricingTiers[1])}">Open English email</a>
          ${copyOrderButton(pricingTiers[1], "en", "Copy English draft", "复制英文草稿")}
        </article>
        <article>
          <h3>中文草稿</h3>
          <pre>Subject: TrendFoundry order: 周更情报

你好，我想订购 TrendFoundry 周更情报（$19 每月）。

我的频道：
主要平台：
主题方向：
偏好交付方式：

请发送付款说明和下一步交付流程。</pre>
          <a class="action primary" href="${tierOrderHref(pricingTiers[1], "zh")}">打开中文邮件</a>
          ${copyOrderButton(pricingTiers[1], "zh", "Copy Chinese draft", "复制中文草稿")}
        </article>
      </div>
    </section>
    <section class="handoff">
      <div>
        <p class="section-label">Trust path</p>
        <h2>Inspect before ordering.</h2>
        <p>Use the public samples, latest issue archive, and RSS/JSON feeds to check the format and source quality before buying.</p>
      </div>
      <div class="handoff-links">
        <a class="action primary" href="../issues/latest.html">Latest issue</a>
        <a class="action" href="../feed.xml">RSS feed</a>
        <a class="action" href="../zh/">中文入口</a>
        <a class="action strong" href="../">Dashboard</a>
      </div>
    </section>
  </main>
  <script>
    const copyButtons = [...document.querySelectorAll("[data-copy-order]")];
    function fallbackCopy(text) {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      const copied = document.execCommand("copy");
      area.remove();
      return copied;
    }
    function showManualCopy(button, text) {
      const container = button.closest("article") || button.parentElement || document.body;
      let area = container.querySelector(".copy-fallback");
      if (!area) {
        area = document.createElement("textarea");
        area.className = "copy-fallback";
        area.setAttribute("readonly", "");
        button.insertAdjacentElement("afterend", area);
      }
      area.value = text;
      area.hidden = false;
      area.focus();
      area.select();
    }
    async function copyOrder(button) {
      const text = button.dataset.copyOrder || "";
      if (!text.trim()) return;
      const original = button.textContent;
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
        } else if (!fallbackCopy(text)) {
          throw new Error("copy failed");
        }
        button.textContent = button.dataset.copySuccess || "Copied";
        button.classList.add("copied");
        const container = button.closest("article") || button.parentElement;
        const fallback = container ? container.querySelector(".copy-fallback") : null;
        if (fallback) fallback.hidden = true;
        window.setTimeout(() => {
          button.textContent = original;
          button.classList.remove("copied");
        }, 1600);
      } catch {
        showManualCopy(button, text);
        button.textContent = "Draft selected";
        window.setTimeout(() => {
          button.textContent = original;
        }, 2200);
      }
    }
    for (const button of copyButtons) {
      button.addEventListener("click", () => copyOrder(button));
    }
  </script>
</body>
</html>`;

const authHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="TrendFoundry account login with global and China social providers.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${publicSiteUrl}auth/">
  <meta property="og:title" content="Sign in to TrendFoundry">
  <meta property="og:description" content="Use common international and China account providers to access TrendFoundry.">
  <meta property="og:image" content="${ogImageUrl}">
  <title>Sign in to TrendFoundry</title>
  <link rel="canonical" href="${publicSiteUrl}auth/">
  <link rel="stylesheet" href="../styles.css">
  <script>window.TRENDFOUNDRY_AUTH_PROVIDERS = ${JSON.stringify(authProviders)};</script>
  <script src="../auth.js?v=${encodeURIComponent(feedUpdated)}" defer></script>
</head>
<body data-page="auth">
  <header class="topic-hero auth-hero">
    <div class="auth-hero-copy">
      <div class="brandline">${brandLogo()}<span>Account access</span></div>
      <h1>Access the signal room.</h1>
      <p class="sub">Log in to keep ranked opportunities, source proof, and delivery notes attached to the account your team already uses.</p>
      <div class="auth-quick-logins" aria-label="Primary sign-in choices">${authQuickLogins}</div>
      <div class="hero-actions">
        <a class="action" href="../order/">Order page</a>
        <a class="action" href="../zh/">Chinese entry</a>
        <a class="action strong" href="../">Dashboard</a>
      </div>
    </div>
    <figure class="auth-hero-visual">
      <div class="auth-image-stack">
        <img class="auth-main-shot" src="../signal-board.png" alt="TrendFoundry signal board preview with ranked creator opportunities" width="1200" height="760">
        <div class="auth-preview-card auth-preview-sample">
          <img src="../signal-board.png" alt="TrendFoundry ranked signal cards preview" width="1200" height="760">
          <span>Signal Board</span>
        </div>
        <div class="auth-preview-card auth-preview-proof">
          <img src="../og-image.png" alt="TrendFoundry proof ledger graphic" width="1200" height="630">
          <span>Proof Ledger</span>
        </div>
        <div class="auth-provider-orbit" aria-hidden="true">${authProviderOrbit}</div>
      </div>
      <figcaption>
        <span id="auth-visual-kicker">Secure access</span>
        <strong id="auth-visual-title">Ranked opportunities stay attached to source proof.</strong>
        <small id="auth-visual-copy">Choose a provider to preview the access path before you leave the page.</small>
      </figcaption>
    </figure>
    <div class="auth-provider-rail" aria-label="Supported login platforms">${authProviderRail}</div>
  </header>
  <main>
    <section class="auth-status-panel" aria-label="Account status">
      <div>
        <p class="section-label">Session</p>
        <h2 id="auth-status-title">Not signed in.</h2>
        <p id="auth-status-copy">Choose a provider below. If the OAuth gateway is not configured yet, the page will show the exact missing setup instead of failing silently.</p>
      </div>
      <div class="account-card" id="account-card">
        <span class="account-avatar" id="account-avatar">TF</span>
        <div>
          <strong id="account-name">Guest visitor</strong>
          <small id="account-provider">No active provider</small>
        </div>
        <button class="action" type="button" id="sign-out-button">Sign out</button>
      </div>
    </section>
    <section class="auth-shell" id="providers" aria-label="Login providers">
      <div class="auth-panel">
        <div class="section-head compact">
          <p class="section-label">Global accounts</p>
          <h2>One gateway, many providers.</h2>
          <p>Provider buttons use the same redirect contract. Enable them in <code>auth.config.json</code> or route every provider through a broker.</p>
        </div>
        <div class="provider-grid">${authProviderCards}</div>
      </div>
      <aside class="auth-panel">
        <p class="section-label">Email access</p>
        <h2>Email magic link</h2>
        <p class="auth-muted">Use this for buyers who do not want a social account. It needs a backend endpoint before production sending is enabled.</p>
        <form class="email-login" id="email-login-form">
          <label for="auth-email">Email</label>
          <input id="auth-email" name="email" type="email" autocomplete="email" placeholder="buyer@example.com" required>
          <button class="action primary" type="submit">Send sign-in link</button>
        </form>
        <p class="auth-notice" id="auth-notice" role="status">Loading auth configuration...</p>
      </aside>
    </section>
    <section class="auth-setup-note" aria-label="Production setup">
      <div>
        <p class="section-label">Production setup</p>
        <h2>Secrets stay off the static site.</h2>
      </div>
      <div class="auth-setup-copy">
        <img src="../og-image.png" alt="TrendFoundry public proof graphic used for secure account context" width="1200" height="630">
        <p>The static site cannot complete OAuth token exchange. GitHub Pages can start OAuth flows, but token exchange and secure sessions must live in a backend or hosted auth service. The generated <a href="./auth.config.json"><code>auth.config.json</code></a> is public-client configuration only; provider secrets belong in the broker.</p>
      </div>
    </section>
  </main>
</body>
</html>`;

const authScript = String.raw`const providerGrid = document.querySelector(".provider-grid");
const notice = document.querySelector("#auth-notice");
const statusTitle = document.querySelector("#auth-status-title");
const statusCopy = document.querySelector("#auth-status-copy");
const accountName = document.querySelector("#account-name");
const accountProvider = document.querySelector("#account-provider");
const accountAvatar = document.querySelector("#account-avatar");
const signOutButton = document.querySelector("#sign-out-button");
const emailForm = document.querySelector("#email-login-form");
const authHeroVisual = document.querySelector(".auth-hero-visual");
const authVisualKicker = document.querySelector("#auth-visual-kicker");
const authVisualTitle = document.querySelector("#auth-visual-title");
const authVisualCopy = document.querySelector("#auth-visual-copy");
const authAvatarNodes = [...document.querySelectorAll("[data-auth-avatar]")];
const authChoiceNodes = [...document.querySelectorAll("[data-auth-choice]")];
const providers = window.TRENDFOUNDRY_AUTH_PROVIDERS || [];
const sessionKey = "trendfoundry.auth.session";
let authConfig = { providers: {} };

function setNotice(message, tone) {
  notice.textContent = message;
  notice.dataset.tone = tone || "neutral";
}

function providerConfig(providerId) {
  return (authConfig.providers && authConfig.providers[providerId]) || {};
}

function providerReady(providerId) {
  const config = providerConfig(providerId);
  return Boolean(authConfig.brokerBaseUrl || (config.enabled && config.clientId && (config.authorizationEndpoint || config.authUrl)));
}

function setAuthVisual(providerId) {
  const provider = providers.find((item) => item.id === providerId);
  const isEmail = providerId === "email";
  const ready = isEmail ? Boolean(authConfig.emailSignInEndpoint) : provider ? providerReady(provider.id) : false;
  const label = isEmail ? "Email magic link" : provider ? provider.label : "Secure access";
  const region = isEmail ? "Direct inbox" : provider ? provider.region : "Account access";
  const description = isEmail
    ? "Email creates a low-friction fallback for buyers who do not want a social identity."
    : provider
      ? provider.description
      : "Choose a provider to preview the access path before you leave the page.";
  if (authHeroVisual) authHeroVisual.dataset.ready = ready ? "true" : "false";
  if (authVisualKicker) authVisualKicker.textContent = (ready ? "Ready path" : "Setup path") + " / " + region;
  if (authVisualTitle) authVisualTitle.textContent = label;
  if (authVisualCopy) {
    authVisualCopy.textContent = ready
      ? description + " The button can hand off through the configured gateway."
      : description + " Add the gateway or client settings before production login.";
  }
  for (const button of providerGrid.querySelectorAll("[data-provider]")) {
    button.classList.toggle("visual-active", button.dataset.provider === providerId);
  }
  for (const avatar of authAvatarNodes) {
    avatar.classList.toggle("visual-active", avatar.dataset.authAvatar === providerId);
  }
  for (const choice of authChoiceNodes) {
    choice.classList.toggle("visual-active", choice.dataset.authChoice === providerId);
  }
}

function authReturnUrl() {
  return authConfig.redirectUri || new URL("./", window.location.href).href;
}

function buildAuthUrl(provider) {
  const config = providerConfig(provider.id);
  if (authConfig.brokerBaseUrl) {
    const broker = authConfig.brokerBaseUrl.replace(/\/+$/, "");
    const url = new URL(broker + "/oauth/start/" + encodeURIComponent(provider.id), window.location.href);
    url.searchParams.set("return_to", authReturnUrl());
    return url.href;
  }
  const endpoint = config.authorizationEndpoint || config.authUrl || provider.authUrl;
  if (!config.enabled || !config.clientId || !endpoint) return "";
  const state = provider.id + "." + Math.random().toString(36).slice(2);
  sessionStorage.setItem("trendfoundry.auth.state", state);
  const url = new URL(endpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", authReturnUrl());
  url.searchParams.set("scope", config.scope || provider.scope || "openid email profile");
  url.searchParams.set("state", state);
  return url.href;
}

function saveSession(session) {
  localStorage.setItem(sessionKey, JSON.stringify({
    provider: session.provider || "account",
    name: session.name || "TrendFoundry member",
    email: session.email || "",
    mode: session.mode || "active",
    updatedAt: new Date().toISOString()
  }));
}

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(sessionKey) || "null");
  } catch {
    return null;
  }
}

function renderSession() {
  const session = readSession();
  if (!session) {
    statusTitle.textContent = "Not signed in.";
    statusCopy.textContent = "Choose a provider below. Configured providers redirect through the OAuth gateway; unconfigured providers explain what is missing.";
    accountName.textContent = "Guest visitor";
    accountProvider.textContent = "No active provider";
    accountAvatar.textContent = "TF";
    signOutButton.disabled = true;
    return;
  }
  const provider = providers.find((item) => item.id === session.provider);
  if (session.mode === "pending" && session.provider === "email") {
    statusTitle.textContent = "Email sign-in pending.";
    statusCopy.textContent = "Configure emailSignInEndpoint to send real magic links. This static preview only stores the requested email locally.";
  } else if (session.mode === "pending") {
    statusTitle.textContent = "Authorization code received.";
    statusCopy.textContent = "The provider returned to the static page. Complete backend token exchange in the OAuth broker to create a secure production session.";
  } else {
    statusTitle.textContent = "Signed in.";
    statusCopy.textContent = "Your account marker is stored locally for this static preview. Production sessions should be issued by the auth backend.";
  }
  accountName.textContent = session.name || session.email || "TrendFoundry member";
  accountProvider.textContent = provider ? provider.label : session.provider;
  accountAvatar.textContent = (session.name || provider?.label || "TF").slice(0, 2).toUpperCase();
  signOutButton.disabled = false;
}

function renderProviders() {
  for (const button of providerGrid.querySelectorAll("[data-provider]")) {
    const id = button.dataset.provider;
    const ready = providerReady(id);
    button.classList.toggle("configured", ready);
    button.dataset.ready = ready ? "true" : "false";
    button.title = ready ? "Start login" : "Set brokerBaseUrl or provider clientId in auth.config.json";
  }
  const firstReady = providers.find((provider) => providerReady(provider.id));
  setAuthVisual(firstReady ? firstReady.id : providers[0]?.id || "email");
}

function handleCallback() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("tf_auth") === "error") {
    const provider = params.get("provider") || "provider";
    const message = params.get("message") || "auth_error";
    window.history.replaceState({}, "", window.location.pathname);
    setAuthVisual(provider);
    setNotice(provider + " login could not start: " + message.replace(/_/g, " ") + ".", "warning");
    return true;
  }
  if (params.get("tf_auth") === "ok") {
    const provider = params.get("provider") || "broker";
    saveSession({
      provider,
      name: params.get("name") || params.get("email") || "TrendFoundry member",
      email: params.get("email") || "",
      mode: "active"
    });
    window.history.replaceState({}, "", window.location.pathname);
    setAuthVisual(provider);
    setNotice("Signed in through the configured auth gateway.", "success");
    return true;
  }
  if (params.get("code")) {
    const state = params.get("state") || "";
    const expected = sessionStorage.getItem("trendfoundry.auth.state") || "";
    const provider = state.split(".")[0] || "provider";
    saveSession({ provider, name: "Pending OAuth exchange", mode: "pending" });
    window.history.replaceState({}, "", window.location.pathname);
    setAuthVisual(provider);
    setNotice(expected && state !== expected ? "State mismatch. Do not trust this callback until the backend validates it." : "Code received. A backend must exchange it for a secure session.", expected && state !== expected ? "danger" : "warning");
    return true;
  }
  return false;
}

async function loadConfig() {
  try {
    const response = await fetch("./auth.config.json", { cache: "no-store" });
    if (response.ok) authConfig = await response.json();
  } catch {
    authConfig = { providers: {} };
  }
  if (authConfig.brokerBaseUrl) {
    try {
      const sessionUrl = new URL(authConfig.brokerBaseUrl.replace(/\/+$/, "") + "/session", window.location.href);
      const sessionResponse = await fetch(sessionUrl, { cache: "no-store", credentials: "same-origin" });
      if (sessionResponse.ok) {
        const session = await sessionResponse.json();
        if (session.authenticated && session.profile) saveSession({ ...session.profile, mode: "active" });
      }
    } catch {
      // The static page can still render even when the broker is temporarily unavailable.
    }
  }
  renderProviders();
  const callbackHandled = handleCallback();
  renderSession();
  if (callbackHandled) {
    return;
  }
  if (authConfig.brokerBaseUrl) {
    setNotice("OAuth gateway configured. Provider buttons are ready.", "success");
  } else {
    const enabled = Object.values(authConfig.providers || {}).filter((item) => item.enabled && item.clientId).length;
    setNotice(enabled ? enabled + " direct provider(s) configured. Backend token exchange is still required." : "No OAuth gateway configured yet. Add brokerBaseUrl or provider client IDs in auth.config.json.", enabled ? "warning" : "neutral");
  }
}

providerGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-provider]");
  if (!button) return;
  startAuthChoice(button.dataset.provider);
});

function startAuthChoice(providerId) {
  if (providerId === "email") {
    emailForm.scrollIntoView({ behavior: "smooth", block: "center" });
    const emailInput = emailForm.querySelector("input[type='email']");
    if (emailInput) emailInput.focus({ preventScroll: true });
    setAuthVisual("email");
    window.setTimeout(() => setAuthVisual("email"), 120);
    return;
  }
  const provider = providers.find((item) => item.id === providerId);
  if (!provider) return;
  setAuthVisual(provider.id);
  const url = buildAuthUrl(provider);
  if (!url) {
    setNotice(provider.label + " needs brokerBaseUrl or an enabled clientId in auth.config.json.", "warning");
    return;
  }
  window.location.href = url;
}

providerGrid.addEventListener("pointerover", (event) => {
  const button = event.target.closest("[data-provider]");
  if (button) setAuthVisual(button.dataset.provider);
});

providerGrid.addEventListener("focusin", (event) => {
  const button = event.target.closest("[data-provider]");
  if (button) setAuthVisual(button.dataset.provider);
});

for (const choice of authChoiceNodes) {
  choice.addEventListener("click", () => startAuthChoice(choice.dataset.authChoice));
  choice.addEventListener("pointerover", () => setAuthVisual(choice.dataset.authChoice));
  choice.addEventListener("focusin", () => setAuthVisual(choice.dataset.authChoice));
}

emailForm.addEventListener("focusin", () => setAuthVisual("email"));

emailForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = new FormData(emailForm).get("email");
  setAuthVisual("email");
  if (!authConfig.emailSignInEndpoint) {
    saveSession({ provider: "email", name: String(email), email: String(email), mode: "pending" });
    renderSession();
    setNotice("Email captured locally. Configure emailSignInEndpoint to send real magic links.", "warning");
    return;
  }
  const response = await fetch(authConfig.emailSignInEndpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, returnTo: authReturnUrl() })
  });
  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }
  setNotice(response.ok ? (payload.message || "Sign-in link requested. Check your email.") : (payload.message || "Email endpoint returned an error."), response.ok && payload.ok !== false ? "success" : "warning");
});

signOutButton.addEventListener("click", () => {
  localStorage.removeItem(sessionKey);
  renderSession();
  setNotice("Signed out on this device.", "neutral");
});

window.trendfoundryAuthPreview = {
  setProvider: setAuthVisual
};

loadConfig();
`;

const css = `:root {
  color-scheme: light;
  --ink: #111114;
  --muted: #64666d;
  --line: #e4e7ec;
  --paper: #f5f5f7;
  --panel: #ffffff;
  --accent: #0071e3;
  --accent-2: #7a5a00;
  --accent-soft: #eaf4ff;
  --success: #0f7b63;
  --radius: 8px;
  --shadow: 0 1px 2px rgba(17, 17, 20, 0.04), 0 18px 46px rgba(17, 17, 20, 0.07);
}

* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background:
    linear-gradient(180deg, #fbfbfd 0%, var(--paper) 42%, #ffffff 100%);
  color: var(--ink);
  text-rendering: optimizeLegibility;
  overflow-x: hidden;
}
html {
  scroll-behavior: smooth;
  scroll-padding-top: 78px;
}
a { color: inherit; }
h1,
h2,
h3,
p,
li,
a,
span,
small {
  overflow-wrap: anywhere;
}
.topbar {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(360px, 0.72fr);
  gap: clamp(28px, 5vw, 64px);
  min-height: min(760px, 100svh);
  align-items: center;
  padding: 34px clamp(20px, 5vw, 72px) 46px;
  border-bottom: 1px solid var(--line);
  background:
    radial-gradient(circle at 78% 18%, rgba(0, 113, 227, 0.14), transparent 30%),
    linear-gradient(180deg, #ffffff 0%, #f7f8fb 58%, #ffffff 100%);
  isolation: isolate;
}
.topbar::after {
  content: "";
  position: absolute;
  inset: auto 0 0;
  z-index: -1;
  height: 34%;
  background: linear-gradient(180deg, rgba(255,255,255,0), rgba(255,255,255,0.86));
  pointer-events: none;
}
.local-nav {
  position: sticky;
  top: 0;
  z-index: 20;
  display: grid;
  grid-template-columns: minmax(120px, auto) minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  min-height: 54px;
  border-bottom: 1px solid rgba(17, 17, 20, 0.08);
  padding: 8px clamp(20px, 5vw, 72px);
  background: rgba(251, 251, 253, 0.78);
  backdrop-filter: saturate(180%) blur(22px);
  --scroll-progress: 0%;
}
.local-progress {
  position: absolute;
  right: 0;
  bottom: -1px;
  left: 0;
  height: 2px;
  overflow: hidden;
  pointer-events: none;
}
.local-progress::before {
  content: "";
  display: block;
  width: var(--scroll-progress);
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #0071e3, #8bc4ff);
  box-shadow: 0 0 18px rgba(0, 113, 227, 0.32);
  transition: width 120ms linear;
}
.local-brand,
.local-links a,
.local-cta {
  text-decoration: none;
  white-space: nowrap;
}
.local-brand {
  display: inline-flex;
  align-items: center;
  min-width: max-content;
  color: var(--ink);
  font-size: 14px;
  font-weight: 850;
}
.local-links {
  display: flex;
  justify-content: flex-end;
  gap: 18px;
  min-width: 0;
  color: var(--muted);
  font-size: 12px;
  font-weight: 760;
}
.local-links a {
  position: relative;
  padding: 8px 0;
  transition: color 160ms ease;
}
.local-links a::after {
  content: "";
  position: absolute;
  right: 0;
  bottom: 3px;
  left: 0;
  height: 2px;
  border-radius: 999px;
  background: var(--accent);
  opacity: 0;
  transform: scaleX(0.36);
  transition: opacity 160ms ease, transform 160ms ease;
}
.local-links a.active,
.local-links a:hover {
  color: var(--ink);
}
.local-links a.active::after {
  opacity: 1;
  transform: scaleX(1);
}
.local-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 30px;
  border-radius: 999px;
  padding: 5px 12px;
  background: var(--accent);
  color: #fff;
  font-size: 12px;
  font-weight: 850;
  box-shadow: 0 8px 18px rgba(0, 113, 227, 0.18);
  transition: transform 160ms ease, box-shadow 160ms ease;
}
.local-cta:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 24px rgba(0, 113, 227, 0.24);
}
.sample-drawer {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: center;
  padding: clamp(18px, 4vw, 54px);
  opacity: 0;
  pointer-events: none;
  transition: opacity 220ms ease;
}
.sample-drawer[aria-hidden="false"] {
  opacity: 1;
  pointer-events: auto;
}
.sample-drawer-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(245, 245, 247, 0.72);
  backdrop-filter: blur(24px) saturate(150%);
}
.sample-drawer-panel {
  position: relative;
  display: grid;
  gap: 18px;
  width: min(1040px, 100%);
  max-height: min(820px, calc(100svh - 34px));
  overflow: auto;
  border: 1px solid rgba(17, 17, 20, 0.1);
  border-radius: 22px;
  padding: clamp(18px, 3vw, 34px);
  background:
    radial-gradient(circle at 84% 10%, rgba(0, 113, 227, 0.12), transparent 28%),
    rgba(255, 255, 255, 0.9);
  box-shadow: 0 34px 100px rgba(17, 17, 20, 0.24);
  transform: translateY(18px) scale(0.98);
  transition: transform 220ms ease;
}
.sample-drawer[aria-hidden="false"] .sample-drawer-panel {
  transform: translateY(0) scale(1);
}
.drawer-close {
  position: absolute;
  top: 14px;
  right: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--line);
  border-radius: 50%;
  background: #fff;
  color: var(--muted);
  font: inherit;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}
.drawer-head {
  max-width: 760px;
  padding-right: 44px;
}
.drawer-head h2 {
  margin: 0 0 10px;
  font-size: clamp(30px, 4vw, 54px);
  line-height: 1;
}
.drawer-head p:not(.section-label) {
  margin: 0;
  color: var(--muted);
  font-size: 17px;
  line-height: 1.5;
}
.sample-drawer-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.sample-drawer-card {
  display: grid;
  gap: 12px;
  min-height: 280px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 16px;
  background: #fff;
  box-shadow: 0 12px 32px rgba(17, 17, 20, 0.06);
}
.sample-drawer-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.sample-drawer-meta span {
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 5px 8px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
}
.sample-drawer-card h3 {
  margin: 0;
  font-size: 18px;
  line-height: 1.25;
}
.sample-drawer-card p {
  margin: 0;
  color: var(--muted);
  line-height: 1.45;
}
.sample-drawer-card a {
  align-self: end;
  color: var(--accent);
  font-size: 13px;
  font-weight: 850;
  text-decoration: none;
}
.drawer-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}
body.drawer-open {
  overflow: hidden;
}
.brandline {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 16px;
  margin: 0;
  color: var(--accent);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.brand-lockup {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--ink);
  letter-spacing: 0;
  text-transform: none;
}
.brand-mark {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: 1px solid rgba(17, 17, 20, 0.18);
  border-radius: 7px;
  background: linear-gradient(180deg, #ffffff, #f3f5f7);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.9), 0 6px 16px rgba(17, 17, 20, 0.08);
}
.brand-mark::before,
.brand-mark::after,
.brand-mark span {
  content: "";
  position: absolute;
  border-radius: 999px;
  background: var(--ink);
}
.brand-mark::before {
  width: 3px;
  height: 12px;
  transform: translateX(-4px);
}
.brand-mark span {
  width: 3px;
  height: 16px;
}
.brand-mark::after {
  width: 3px;
  height: 8px;
  transform: translateX(4px);
}
.brand-word {
  color: var(--ink);
  font-weight: 850;
}
.brandrow {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 0 22px;
}
.language-switch {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  border: 1px solid var(--line);
  border-radius: 7px;
  padding: 3px;
  background: #fff;
  box-shadow: var(--shadow);
}
.language-option {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 46px;
  min-height: 30px;
  border: 0;
  border-radius: 5px;
  padding: 5px 9px;
  background: transparent;
  color: var(--muted);
  font: inherit;
  font-size: 12px;
  font-weight: 800;
  text-decoration: none;
  cursor: pointer;
}
.language-option.active {
  background: var(--accent);
  color: #fff;
}
.lang-zh { display: none; }
body[data-lang="zh"] .lang-en { display: none; }
body[data-lang="zh"] .lang-zh { display: inline; }
h1 {
  max-width: 760px;
  margin: 0;
  font-size: clamp(44px, 5.6vw, 74px);
  line-height: 1;
  letter-spacing: 0;
}
.sub {
  max-width: 680px;
  margin: 20px 0 0;
  color: var(--muted);
  font-size: clamp(18px, 1.55vw, 22px);
  line-height: 1.42;
}
.hero-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  max-width: 680px;
  margin-top: 22px;
}
.hero-tier-card {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr);
  gap: 11px;
  align-items: center;
  min-height: 76px;
  border: 1px solid rgba(17, 17, 20, 0.08);
  border-radius: 14px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.68);
  color: var(--muted);
  font: inherit;
  font-weight: 750;
  text-align: left;
  cursor: pointer;
  box-shadow: 0 10px 28px rgba(17, 17, 20, 0.05);
  backdrop-filter: blur(20px);
  transition: transform 220ms ease, background 220ms ease, border-color 220ms ease, box-shadow 220ms ease;
}
.hero-tier-card:focus-visible {
  outline: 3px solid rgba(0, 113, 227, 0.42);
  outline-offset: 3px;
}
.hero-tier-number {
  display: inline-grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 1px solid rgba(0,113,227,0.2);
  border-radius: 999px;
  background: rgba(0,113,227,0.1);
  color: var(--accent);
  font-size: 12px;
  font-weight: 850;
  font-variant-numeric: tabular-nums;
}
.hero-tier-copy {
  display: grid;
  gap: 5px;
  min-width: 0;
}
.hero-tier-copy strong {
  color: var(--ink);
  font-size: 14px;
  line-height: 1.15;
}
.hero-tier-copy small {
  color: var(--muted);
  font-size: 12px;
  font-weight: 760;
  line-height: 1.2;
}
.hero-tier-copy small b {
  color: var(--ink);
  margin-right: 4px;
  font-size: 15px;
  font-weight: 880;
  font-variant-numeric: tabular-nums;
}
.hero-actions,
.handoff-links {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 22px;
}
.utility-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  margin-top: 12px;
  color: var(--muted);
  font-size: 13px;
  font-weight: 700;
}
.utility-links a {
  text-decoration: none;
  border-bottom: 1px solid #c8d0d7;
}
.utility-links a:hover {
  color: var(--accent);
  border-color: var(--accent);
}
.scroll-cue {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: fit-content;
  margin-top: 22px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 850;
  letter-spacing: 0.08em;
  text-decoration: none;
  text-transform: uppercase;
  white-space: nowrap;
}
.scroll-cue span {
  position: relative;
  display: inline-flex;
  width: 18px;
  height: 28px;
  border: 1px solid rgba(17, 17, 20, 0.18);
  border-radius: 999px;
}
.scroll-cue span::after {
  content: "";
  position: absolute;
  top: 6px;
  left: 50%;
  width: 3px;
  height: 6px;
  border-radius: 999px;
  background: var(--accent);
  transform: translateX(-50%);
  animation: scrollCue 1.8s ease-in-out infinite;
}
@keyframes scrollCue {
  0%, 100% { opacity: 0.28; transform: translate(-50%, 0); }
  50% { opacity: 1; transform: translate(-50%, 9px); }
}
.action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 9px 17px;
  background: #fff;
  color: var(--ink);
  font: inherit;
  font-weight: 700;
  text-decoration: none;
  box-shadow: var(--shadow);
  cursor: pointer;
  transition: transform 180ms ease, border-color 180ms ease, background 180ms ease, box-shadow 180ms ease;
}
.action:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 28px rgba(17, 17, 20, 0.1);
}
.action.primary {
  border-color: var(--accent);
  background: var(--accent);
  color: #fff;
}
.action.strong {
  border-color: #111114;
  background: #15171a;
  color: #fff;
}
.action.copied {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
}
.topbar aside {
  align-self: center;
  display: grid;
  gap: 8px;
  perspective: 1200px;
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
.source-mix-panel {
  display: grid;
  gap: 7px;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.82);
  color: var(--muted);
  box-shadow: 0 10px 28px rgba(17, 17, 20, 0.06);
  backdrop-filter: blur(18px);
}
.source-mix-label {
  margin: 0;
  color: var(--accent);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.source-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.source-legend button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 28px;
  border: 1px solid rgba(17, 17, 20, 0.08);
  border-radius: 999px;
  padding: 5px 8px;
  background: rgba(255,255,255,0.72);
  color: var(--muted);
  font-size: 12px;
  font: inherit;
  font-weight: 800;
  cursor: pointer;
  transition: transform 160ms ease, border-color 160ms ease, background 160ms ease, color 160ms ease;
}
.source-legend button:hover,
.source-legend button:focus-visible,
.source-legend button.active {
  transform: translateY(-1px);
  border-color: rgba(0, 113, 227, 0.28);
  background: var(--accent-soft);
  color: var(--accent);
}
.source-legend button strong {
  color: currentColor;
  font-size: 11px;
}
.product-visual {
  display: grid;
  gap: 10px;
  min-width: 0;
  transform-style: preserve-3d;
  transition: transform 260ms ease;
}
.product-screen {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.66);
  border-radius: 18px;
  background: #101418;
  box-shadow: 0 32px 90px rgba(17, 17, 20, 0.26), inset 0 0 0 1px rgba(255,255,255,0.12);
}
.product-screen::before {
  content: "";
  display: block;
  height: 28px;
  background:
    radial-gradient(circle at 18px 50%, #ff5f57 0 4px, transparent 5px),
    radial-gradient(circle at 36px 50%, #ffbd2e 0 4px, transparent 5px),
    radial-gradient(circle at 54px 50%, #28c840 0 4px, transparent 5px),
    linear-gradient(180deg, #262b31, #171b20);
}
.product-screen img {
  display: block;
  width: 100%;
  height: auto;
  transform: translateZ(0);
}
.signal-ticker {
  position: absolute;
  right: 14px;
  bottom: 14px;
  left: 14px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  pointer-events: none;
}
.signal-ticker span {
  min-width: 0;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 6px;
  padding: 7px 9px;
  background: rgba(16, 20, 24, 0.76);
  color: rgba(255, 255, 255, 0.84);
  font-size: 12px;
  line-height: 1.2;
  animation: signalPulse 4.8s ease-in-out infinite;
  animation-delay: var(--delay);
}
.signal-ticker span:nth-child(n+3) {
  display: none;
}
.signal-ticker strong {
  display: block;
  color: #9fd4ca;
  font-size: 11px;
  text-transform: uppercase;
}
.board-summary {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.board-summary li {
  display: grid;
  gap: 2px;
  margin: 0;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 8px;
  background: rgba(255, 255, 255, 0.78);
  color: var(--muted);
  font-size: 12px;
  box-shadow: 0 8px 22px rgba(17, 17, 20, 0.05);
  backdrop-filter: blur(16px);
  transition: transform 180ms ease, opacity 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
}
.board-summary li.is-source-focused {
  transform: translateY(-3px);
  border-color: rgba(0, 113, 227, 0.32);
  box-shadow: 0 14px 28px rgba(0, 113, 227, 0.11);
}
.board-summary li.is-source-dimmed {
  opacity: 0.42;
}
.board-summary strong {
  color: var(--ink);
  font-size: 13px;
}
.board-summary em {
  color: var(--accent);
  font-style: normal;
  font-weight: 850;
}
@keyframes signalPulse {
  0%, 100% { transform: translateY(0); opacity: 0.72; }
  50% { transform: translateY(-5px); opacity: 1; }
}
@keyframes boardFloat {
  0%, 100% { transform: translateY(0) rotateX(0deg); }
  50% { transform: translateY(-8px) rotateX(1.2deg); }
}
.product-visual {
  animation: boardFloat 7s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .signal-ticker span,
  .product-visual,
  .source-legend button,
  .flow-orbit,
  .runway-line span,
  .runway-panel,
  .runway-stage,
  .deliverable-panel,
  .deliverable-tab,
  .proof-tab,
  .proof-panel,
  .trust-dock-tab,
  .trust-dock-panel,
  .final-action-button,
  .final-action-panel,
  .opportunity-focus,
  .card,
  .auth-orbit-avatar,
  .provider-avatar,
  .auth-hero-visual figcaption,
  .provider-button,
  .fit-persona,
  .fit-device,
  .fit-signal-card,
  .fit-source-list li,
  .fit-progress span::before,
  .sample-spotlight-tab,
  .sample-spotlight-panel,
  .local-progress::before,
  .scroll-cue span::after,
  .reveal-item {
    animation: none;
    transition: none;
  }
}
main {
  padding: 34px clamp(20px, 5vw, 72px) 70px;
}
.offer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 24px;
  align-items: center;
  border-bottom: 1px solid var(--line);
  padding: 0 0 34px;
  margin-bottom: 34px;
}
.section-label {
  margin: 0 0 8px;
  color: var(--accent);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.offer h2 { max-width: 780px; margin: 0 0 8px; font-size: clamp(28px, 3.2vw, 44px); line-height: 1.08; }
.offer p { margin: 0; color: var(--muted); }
.workflow-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 22px;
}
.workflow-pills span {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  border: 1px solid rgba(17, 17, 20, 0.1);
  border-radius: 999px;
  padding: 0 14px;
  background: rgba(255,255,255,0.82);
  color: var(--ink);
  font-size: 13px;
  font-weight: 760;
  box-shadow: 0 8px 20px rgba(17, 17, 20, 0.04);
}
.price {
  text-align: right;
  color: var(--accent-2);
}
.price > span { display: block; font-size: clamp(34px, 4.4vw, 56px); font-weight: 850; color: var(--ink); }
.price small { color: var(--muted); }
.fit-studio {
  display: grid;
  grid-template-columns: minmax(260px, 0.38fr) minmax(0, 0.62fr);
  gap: clamp(22px, 5vw, 68px);
  align-items: center;
  padding-top: 18px;
}
.fit-studio > *,
.fit-copy,
.fit-personas,
.fit-device,
.fit-device-screen {
  min-width: 0;
}
.fit-copy h2 {
  max-width: 560px;
  margin: 0 0 10px;
  font-size: clamp(34px, 4.7vw, 64px);
  line-height: 0.98;
  overflow-wrap: anywhere;
}
.fit-copy p:not(.section-label) {
  max-width: 520px;
  margin: 0;
  color: var(--muted);
  line-height: 1.55;
}
.fit-personas {
  display: grid;
  gap: 10px;
  margin-top: 28px;
}
.fit-persona {
  position: relative;
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) 18px;
  gap: 12px;
  align-items: center;
  min-height: 86px;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 12px 14px;
  background: rgba(255,255,255,0.74);
  color: var(--ink);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: transform 180ms ease, border-color 180ms ease, background 180ms ease, box-shadow 180ms ease;
}
.fit-persona::before {
  content: "";
  width: 54px;
  height: 54px;
  border-radius: 8px;
  background:
    radial-gradient(circle at 62% 34%, rgba(0, 113, 227, 0.28), transparent 26%),
    linear-gradient(145deg, #fff, #f1f3f7);
  box-shadow: inset 0 0 0 1px rgba(17,17,20,0.04);
}
.fit-persona::after {
  content: "";
  width: 7px;
  height: 12px;
  border-right: 2px solid rgba(17,17,20,0.34);
  border-bottom: 2px solid rgba(17,17,20,0.34);
  transform: rotate(-45deg);
  justify-self: end;
}
.fit-persona:hover,
.fit-persona:focus-visible,
.fit-persona.active {
  transform: translateY(-1px);
  border-color: rgba(0, 113, 227, 0.34);
  background: #fff;
  box-shadow: 0 12px 30px rgba(17, 17, 20, 0.08);
}
.fit-persona span {
  grid-column: 2;
  color: var(--accent);
  font-size: 11px;
  font-weight: 850;
  text-transform: uppercase;
}
.fit-persona strong {
  grid-column: 2;
  font-size: 15px;
  line-height: 1.2;
}
.fit-persona small {
  grid-column: 2;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.25;
}
.fit-device {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(17, 17, 20, 0.08);
  border-radius: 20px;
  background: linear-gradient(145deg, rgba(255,255,255,0.96), rgba(247,248,250,0.86));
  box-shadow: 0 34px 86px rgba(17, 17, 20, 0.08);
  transition: transform 260ms ease, border-color 260ms ease, box-shadow 260ms ease;
}
.fit-device.is-switching {
  transform: translateY(-4px);
  border-color: rgba(0, 113, 227, 0.28);
  box-shadow: 0 40px 96px rgba(0, 113, 227, 0.14);
}
.fit-device::before {
  display: none;
}
.fit-device[data-fit-device="bilibili"]::before {
  display: none;
}
.fit-device[data-fit-device="deeptech"]::before {
  display: none;
}
.fit-device-bar {
  position: relative;
  display: flex;
  gap: 6px;
  height: 32px;
  align-items: center;
  padding: 0 14px;
  border-bottom: 1px solid rgba(17, 17, 20, 0.06);
  background: rgba(255,255,255,0.62);
}
.fit-device-bar span {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #d5d8de;
}
.fit-device-screen {
  position: relative;
  display: grid;
  gap: 14px;
  min-height: 430px;
  padding: clamp(18px, 3vw, 30px);
}
.fit-device-label {
  margin: 0;
  color: var(--accent);
  font-size: 12px;
  font-weight: 850;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.fit-console-head {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 2px;
}
.fit-console-head strong {
  display: block;
  margin-top: 8px;
  color: var(--muted);
  font-size: 14px;
  font-weight: 650;
}
.fit-console-head b {
  color: var(--accent);
  font-weight: 850;
}
.fit-live {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 780;
  white-space: nowrap;
}
.fit-live i {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #19c37d;
  box-shadow: 0 0 0 4px rgba(25,195,125,0.1);
}
.fit-progress {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
}
.fit-progress span {
  height: 6px;
  border-radius: 999px;
  background: rgba(17,17,20,0.08);
  overflow: hidden;
}
.fit-progress span::before {
  content: "";
  display: block;
  width: var(--fit-progress, 72%);
  height: 100%;
  border-radius: inherit;
  background: var(--accent);
  transition: width 280ms ease;
}
.fit-progress em {
  color: var(--muted);
  font-size: 11px;
  font-style: normal;
  font-weight: 800;
}
.fit-matrix {
  display: grid;
  border: 1px solid rgba(17,17,20,0.08);
  border-radius: 14px;
  overflow: hidden;
  background: rgba(255,255,255,0.7);
}
.fit-matrix-head,
.fit-matrix-row {
  display: grid;
  grid-template-columns: minmax(140px, 1fr) repeat(3, minmax(74px, 0.48fr));
  align-items: center;
}
.fit-matrix-head {
  min-height: 52px;
  border-bottom: 1px solid rgba(17,17,20,0.08);
  color: var(--ink);
  font-weight: 850;
}
.fit-matrix-row {
  min-height: 48px;
  border-bottom: 1px solid rgba(17,17,20,0.06);
}
.fit-matrix-row:last-child {
  border-bottom: 0;
}
.fit-matrix strong,
.fit-matrix span {
  min-width: 0;
  padding: 0 14px;
}
.fit-matrix strong {
  color: var(--ink);
  font-size: 13px;
  line-height: 1.25;
}
.fit-matrix span {
  display: grid;
  min-height: inherit;
  place-items: center;
  border-left: 1px solid rgba(17,17,20,0.05);
  color: rgba(17,17,20,0.38);
  font-size: 15px;
  font-weight: 850;
}
.fit-matrix-head span {
  color: var(--muted);
  font-size: 13px;
}
.fit-matrix span.active {
  background: rgba(0, 113, 227, 0.055);
  color: var(--accent);
}
.fit-workbench {
  position: relative;
  display: grid;
  grid-template-columns: minmax(138px, 0.24fr) minmax(0, 1fr) minmax(160px, 0.28fr);
  gap: 14px;
  min-height: 300px;
  border-top: 1px solid rgba(17,17,20,0.06);
  border-bottom: 1px solid rgba(17,17,20,0.06);
  padding: 16px 0;
}
.fit-source-list {
  display: grid;
  gap: 7px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.fit-source-list li {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) 36px;
  gap: 8px;
  align-items: center;
  min-height: 35px;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 6px 8px;
  background: rgba(255,255,255,0.74);
  animation: signalPulse 4.8s ease-in-out infinite;
  animation-delay: calc(var(--row-index) * 180ms);
}
.fit-source-list li span {
  display: inline-flex;
  width: 22px;
  height: 22px;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: #f2f4f7;
  color: var(--muted);
  font-size: 9px;
  font-weight: 850;
}
.fit-source-list li strong {
  min-width: 0;
  color: var(--ink);
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fit-source-list li em {
  height: 12px;
  border-radius: 999px;
  background:
    radial-gradient(circle at 92% 50%, #19c37d 0 2px, transparent 3px),
    linear-gradient(90deg, transparent 0 12%, var(--accent) 12% 20%, transparent 20% 32%, rgba(0,113,227,0.38) 32% 54%, transparent 54%);
  opacity: 0.72;
}
.fit-pipeline {
  position: relative;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  overflow: hidden;
}
.fit-pipeline::before,
.fit-pipeline::after {
  content: "";
  position: absolute;
  right: 9%;
  left: 4%;
  height: 1px;
  background: linear-gradient(90deg, rgba(0,113,227,0.08), rgba(0,113,227,0.72), rgba(25,195,125,0.48));
  transform-origin: left center;
  pointer-events: none;
}
.fit-pipeline::before {
  top: 42%;
  transform: rotate(16deg);
}
.fit-pipeline::after {
  top: 58%;
  transform: rotate(-10deg);
}
.fit-pipeline-column {
  position: relative;
  display: grid;
  grid-template-rows: auto 1fr 1fr;
  gap: 14px;
  border-left: 1px dashed rgba(17,17,20,0.1);
  padding-left: 10px;
}
.fit-pipeline-column p {
  margin: 0;
  color: var(--muted);
  font-size: 10px;
  font-weight: 850;
  text-transform: uppercase;
}
.fit-pipeline-column span {
  display: block;
  min-height: 58px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background:
    radial-gradient(circle at 84% 20%, #19c37d 0 3px, transparent 4px),
    linear-gradient(180deg, rgba(255,255,255,0.96), rgba(247,248,250,0.78));
  box-shadow: 0 10px 28px rgba(17,17,20,0.06);
}
.fit-pipeline-column span::before,
.fit-pipeline-column span::after {
  content: "";
  display: block;
  height: 5px;
  margin: 13px 12px 0;
  border-radius: 999px;
  background: rgba(17,17,20,0.1);
}
.fit-pipeline-column span::after {
  width: 42%;
  margin-top: 8px;
  background: rgba(0,113,227,0.16);
}
.fit-signal-card {
  align-self: center;
  display: grid;
  gap: 10px;
  min-height: 152px;
  border: 1px solid rgba(0, 113, 227, 0.34);
  border-radius: 12px;
  padding: 16px;
  background: rgba(255,255,255,0.86);
  color: inherit;
  text-decoration: none;
  box-shadow: 0 14px 36px rgba(17, 17, 20, 0.06);
  transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
}
.fit-signal-card:hover {
  transform: translateY(-1px);
  border-color: rgba(0, 113, 227, 0.36);
  box-shadow: 0 18px 42px rgba(0, 113, 227, 0.1);
}
.fit-signal-card span,
.fit-signal-card em {
  color: var(--accent);
  font-size: 12px;
  font-style: normal;
  font-weight: 850;
  text-transform: uppercase;
}
.fit-signal-card strong {
  max-width: 720px;
  color: var(--ink);
  font-size: clamp(17px, 1.5vw, 22px);
  line-height: 1.16;
  overflow-wrap: anywhere;
}
.fit-preview-card p {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.45;
}
.fit-signal-card small {
  display: block;
  align-self: end;
  height: 36px;
  border-radius: 8px;
  background:
    linear-gradient(90deg, rgba(0,113,227,0.12) 0 9%, transparent 9% 13%, rgba(25,195,125,0.22) 13% 22%, transparent 22% 29%, rgba(0,113,227,0.28) 29% 38%, transparent 38% 48%, rgba(0,113,227,0.12) 48% 60%, transparent 60% 68%, rgba(25,195,125,0.3) 68% 84%, transparent 84%);
}
.fit-telemetry {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.fit-telemetry span {
  display: grid;
  gap: 5px;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 12px;
  background: rgba(255,255,255,0.74);
}
.fit-telemetry strong {
  color: var(--muted);
  font-size: 11px;
  text-transform: uppercase;
}
.fit-telemetry small {
  color: var(--ink);
  font-size: 13px;
  font-weight: 760;
  overflow-wrap: anywhere;
}
.fit-studio.product-rules {
  grid-template-columns: 1fr;
  gap: 16px;
  padding: 0 0 32px;
}
.fit-studio.product-rules .fit-copy {
  max-width: 920px;
}
.fit-studio.product-rules .fit-copy h2 {
  max-width: 680px;
  margin: 0 0 8px;
  font-size: clamp(28px, 4vw, 46px);
  line-height: 1.06;
}
.fit-studio.product-rules .fit-copy > p:not(.section-label) {
  max-width: 620px;
  margin: 0;
  color: var(--muted);
  font-size: 15px;
  line-height: 1.45;
}
.fit-studio.product-rules .fit-personas {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 16px;
}
.fit-studio.product-rules .fit-persona {
  grid-template-columns: 1fr auto;
  gap: 6px 12px;
  min-height: 96px;
  border-radius: 12px;
  padding: 14px 16px;
  background: rgba(255,255,255,0.76);
}
.fit-studio.product-rules .fit-persona::before {
  display: none;
}
.fit-studio.product-rules .fit-persona::after {
  width: 8px;
  height: 8px;
  border-right-color: rgba(0,113,227,0.55);
  border-bottom-color: rgba(0,113,227,0.55);
  grid-column: 2;
  grid-row: 1;
  align-self: center;
}
.fit-studio.product-rules .fit-persona span,
.fit-studio.product-rules .fit-persona strong,
.fit-studio.product-rules .fit-persona small,
.fit-studio.product-rules .fit-persona b {
  grid-column: 1;
}
.fit-studio.product-rules .fit-persona span {
  letter-spacing: 0;
  text-transform: none;
}
.fit-studio.product-rules .fit-persona strong {
  font-size: 18px;
  line-height: 1.1;
}
.fit-studio.product-rules .fit-persona b {
  color: var(--ink);
  font-size: 24px;
  font-weight: 850;
  line-height: 1;
}
.fit-studio.product-rules .fit-persona small {
  color: var(--muted);
  font-size: 12px;
}
.fit-studio.product-rules .fit-persona.active {
  border-color: rgba(0,113,227,0.44);
  background: #fff;
}
.fit-studio.product-rules .fit-device {
  border-radius: 14px;
  box-shadow: 0 18px 46px rgba(17,17,20,0.06);
}
.fit-studio.product-rules .fit-device-screen {
  grid-template-columns: minmax(210px, 0.32fr) minmax(0, 0.68fr);
  align-items: stretch;
  min-height: 0;
  gap: 12px;
  padding: clamp(15px, 2.4vw, 20px);
}
.fit-studio.product-rules .fit-console-head {
  grid-column: 1;
  grid-row: 1 / span 2;
  align-content: start;
  display: grid;
  gap: 10px;
  border-right: 1px solid rgba(17,17,20,0.08);
  padding-right: 18px;
}
.fit-studio.product-rules .fit-console-head strong {
  margin: 7px 0 0;
  color: var(--ink);
  font-size: clamp(23px, 2.5vw, 34px);
  line-height: 1.05;
}
.fit-studio.product-rules .fit-device-label {
  letter-spacing: 0;
  text-transform: none;
}
.fit-studio.product-rules .fit-price {
  font-size: clamp(34px, 4.4vw, 54px);
  line-height: 0.96;
}
.fit-price {
  color: var(--accent);
  font-size: clamp(42px, 5vw, 72px);
  font-weight: 850;
  line-height: 0.92;
}
.fit-tier-rule {
  grid-column: 2;
  grid-row: 1;
  align-self: start;
  margin: 0;
  border: 1px solid rgba(0,113,227,0.18);
  border-radius: 999px;
  padding: 7px 12px;
  background: rgba(0,113,227,0.08);
  color: var(--accent);
  font-size: 12px;
  font-weight: 820;
}
.fit-studio.product-rules .fit-preview-card {
  grid-column: 2;
  grid-row: 2;
  min-height: 0;
  border-color: rgba(17,17,20,0.08);
  border-radius: 12px;
  padding: 14px;
  box-shadow: none;
}
.fit-studio.product-rules .fit-preview-card span,
.fit-studio.product-rules .fit-preview-card em {
  text-transform: none;
}
.fit-studio.product-rules .fit-telemetry {
  grid-column: 1 / -1;
  gap: 8px;
}
.fit-studio.product-rules .fit-telemetry span {
  background: rgba(247,249,252,0.72);
  border-radius: 10px;
  padding: 10px 12px;
}
.product-proof {
  display: grid;
  grid-template-columns: minmax(280px, 0.38fr) minmax(0, 0.62fr);
  gap: clamp(24px, 5vw, 70px);
  align-items: center;
  border-bottom: 1px solid var(--line);
  padding: 6px 0 44px;
  margin-bottom: 34px;
}
.product-proof-copy h2 {
  max-width: 700px;
  margin: 0 0 12px;
  font-size: clamp(34px, 5vw, 62px);
  line-height: 1.02;
}
.product-proof-copy p:not(.section-label) {
  max-width: 620px;
  margin: 0;
  color: var(--muted);
  font-size: 17px;
  line-height: 1.5;
}
.product-proof-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 24px;
}
.product-proof-visual {
  position: relative;
  min-width: 0;
  margin: 0;
  border: 1px solid rgba(17,17,20,0.08);
  border-radius: 18px;
  padding: 10px;
  background: rgba(255,255,255,0.76);
  box-shadow: 0 30px 80px rgba(17,17,20,0.09);
}
.product-proof-visual img {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 12px;
}
.product-proof-visual figcaption {
  position: absolute;
  top: 20px;
  left: 20px;
  border: 1px solid rgba(17,17,20,0.08);
  border-radius: 999px;
  padding: 7px 11px;
  background: rgba(255,255,255,0.88);
  color: var(--muted);
  font-size: 12px;
  font-weight: 760;
  backdrop-filter: blur(16px);
}
.product-proof-points {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.product-proof-points span {
  display: grid;
  gap: 5px;
  min-height: 72px;
  border: 1px solid rgba(17,17,20,0.08);
  border-radius: 12px;
  padding: 14px 16px;
  background: rgba(247,249,252,0.68);
  color: var(--muted);
  font-size: 13px;
  line-height: 1.35;
}
.product-proof-points strong {
  color: var(--ink);
  font-size: 17px;
}
.pricing,
.sample-preview,
.fit-studio,
.product-proof,
.visual-proof,
.motion-proof,
.signal-runway,
.delivery,
.proof-ledger {
  border-bottom: 1px solid var(--line);
  padding: 2px 0 34px;
  margin-bottom: 34px;
}
.reveal-item {
  opacity: 0;
  transform: translateY(24px) scale(0.992);
  transition:
    opacity 720ms ease,
    transform 720ms cubic-bezier(0.2, 0.72, 0.16, 1);
  transition-delay: var(--reveal-delay, 0ms);
}
.reveal-item.is-visible {
  opacity: 1;
  transform: translateY(0) scale(1);
}
.product-map.reveal-item {
  opacity: 1;
  transform: none;
}
.sample-preview {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 24px;
  align-items: center;
}
.sample-spotlight {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: minmax(180px, 0.34fr) minmax(0, 0.66fr);
  gap: 12px;
  align-items: stretch;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 12px;
  background:
    radial-gradient(circle at 82% 12%, rgba(0, 113, 227, 0.12), transparent 34%),
    rgba(255,255,255,0.72);
  box-shadow: var(--shadow);
  backdrop-filter: blur(20px);
}
.sample-spotlight-tabs {
  display: grid;
  gap: 8px;
}
.sample-spotlight-tab {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 4px 10px;
  align-items: center;
  min-height: 72px;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 10px;
  background: #fff;
  color: var(--ink);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: transform 180ms ease, border-color 180ms ease, background 180ms ease, box-shadow 180ms ease;
}
.sample-spotlight-tab:hover,
.sample-spotlight-tab.active {
  border-color: rgba(0, 113, 227, 0.34);
  background: var(--accent-soft);
  box-shadow: 0 10px 24px rgba(17, 17, 20, 0.07);
  transform: translateY(-1px);
}
.sample-spotlight-tab span {
  grid-row: span 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 999px;
  background: #111114;
  color: #fff;
  font-size: 12px;
  font-weight: 850;
}
.sample-spotlight-tab strong {
  font-size: 14px;
}
.sample-spotlight-tab em {
  color: var(--muted);
  font-size: 12px;
  font-style: normal;
  font-weight: 800;
}
.sample-spotlight-stage {
  display: grid;
  min-height: 300px;
}
.sample-spotlight-panel {
  grid-area: 1 / 1;
  display: grid;
  align-content: end;
  gap: 12px;
  min-width: 0;
  border: 1px solid rgba(17, 17, 20, 0.08);
  border-radius: 14px;
  padding: clamp(18px, 3vw, 28px);
  background:
    linear-gradient(180deg, rgba(255,255,255,0.72), rgba(247,248,250,0.92)),
    #fff;
  opacity: 0;
  visibility: hidden;
  transform: translateY(10px) scale(0.992);
  transition: opacity 220ms ease, transform 220ms ease, visibility 220ms ease;
}
.sample-spotlight-panel.active {
  opacity: 1;
  visibility: visible;
  transform: translateY(0) scale(1);
}
.sample-spotlight-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.sample-spotlight-meta span,
.sample-spotlight-proof {
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 7px 10px;
  background: #fff;
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
}
.sample-spotlight-panel h3 {
  max-width: 760px;
  margin: 0;
  font-size: clamp(25px, 3.2vw, 44px);
  line-height: 1.04;
}
.sample-spotlight-panel p {
  max-width: 680px;
  margin: 0;
  color: var(--muted);
  line-height: 1.5;
}
.sample-spotlight-proof {
  display: grid;
  gap: 3px;
  max-width: 680px;
  border-radius: 10px;
  line-height: 1.35;
}
.sample-spotlight-proof strong {
  color: var(--ink);
}
.sample-spotlight-panel .action {
  width: fit-content;
}
.visual-proof {
  display: grid;
  grid-template-columns: minmax(0, 0.64fr) minmax(280px, 0.36fr);
  gap: 24px;
  align-items: center;
}
.motion-proof {
  display: grid;
  grid-template-columns: minmax(260px, 0.42fr) minmax(0, 0.58fr);
  gap: 24px;
  align-items: center;
}
.visual-proof h2,
.motion-proof h2,
.runway-copy h2 {
  margin: 0 0 8px;
  font-size: 24px;
  line-height: 1.2;
}
.visual-proof p:not(.section-label),
.motion-proof p:not(.section-label),
.runway-copy p:not(.section-label) {
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
  background: rgba(255, 255, 255, 0.72);
  box-shadow: 0 1px 1px rgba(17, 17, 20, 0.04);
  backdrop-filter: blur(18px);
}
.motion-preview {
  display: block;
  width: 100%;
  height: auto;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: #f7f8fa;
  box-shadow: var(--shadow);
}
.signal-runway {
  display: grid;
  grid-template-columns: minmax(260px, 0.36fr) minmax(0, 0.64fr);
  gap: clamp(24px, 5vw, 64px);
  align-items: center;
  padding-top: 8px;
}
.runway-copy h2 {
  max-width: 520px;
  font-size: clamp(32px, 4vw, 58px);
  line-height: 0.98;
}
.runway-copy p:not(.section-label) {
  max-width: 560px;
  font-size: 17px;
}
.runway-console {
  position: relative;
  display: grid;
  gap: 16px;
  overflow: hidden;
  border-radius: 22px;
  padding: clamp(16px, 2.4vw, 28px);
  background:
    radial-gradient(circle at 78% 16%, rgba(0, 113, 227, 0.24), transparent 30%),
    linear-gradient(145deg, #18191d, #08090b 62%, #111114);
  color: #fff;
  box-shadow: 0 34px 88px rgba(17, 17, 20, 0.28);
}
.runway-console::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px),
    linear-gradient(180deg, rgba(255,255,255,0.05) 1px, transparent 1px);
  background-size: 46px 46px;
  mask-image: linear-gradient(180deg, rgba(0,0,0,0.86), transparent 82%);
  pointer-events: none;
}
.runway-topline,
.runway-product,
.runway-stages {
  position: relative;
  z-index: 1;
}
.runway-topline {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: rgba(255,255,255,0.72);
  font-size: 12px;
  font-weight: 820;
  text-transform: uppercase;
}
.runway-topline strong {
  color: #fff;
}
.runway-product {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) 64px minmax(220px, 0.7fr);
  gap: 16px;
  align-items: stretch;
  min-height: 244px;
}
.runway-card,
.runway-panels {
  border: 1px solid rgba(255,255,255,0.14);
  border-radius: 18px;
  background: rgba(255,255,255,0.08);
  backdrop-filter: blur(20px);
}
.runway-card {
  display: grid;
  align-content: end;
  gap: 12px;
  padding: 20px;
}
.runway-card p {
  margin: 0;
  color: rgba(255,255,255,0.6);
  font-size: 12px;
  font-weight: 850;
  text-transform: uppercase;
}
.runway-card h3 {
  margin: 0;
  color: #fff;
  font-size: clamp(22px, 2.8vw, 36px);
  line-height: 1.03;
}
.runway-card a {
  width: fit-content;
  color: #8bc4ff;
  font-size: 13px;
  font-weight: 850;
  text-decoration: none;
}
.runway-line {
  position: relative;
  align-self: center;
  height: 4px;
  border-radius: 999px;
  background: rgba(255,255,255,0.18);
}
.runway-line span {
  position: absolute;
  inset: 0 auto 0 0;
  width: var(--runway-progress);
  border-radius: inherit;
  background: linear-gradient(90deg, #7dd3fc, #0071e3);
  box-shadow: 0 0 24px rgba(0, 113, 227, 0.42);
  transition: width 320ms ease;
}
.runway-line::before,
.runway-line::after {
  content: "";
  position: absolute;
  top: 50%;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #fff;
  transform: translateY(-50%);
  box-shadow: 0 0 0 8px rgba(255,255,255,0.08);
}
.runway-line::before { left: 0; }
.runway-line::after { right: 0; }
.runway-panels {
  position: relative;
  overflow: hidden;
  min-height: 244px;
}
.runway-panel {
  position: absolute;
  inset: 0;
  display: grid;
  align-content: end;
  gap: 10px;
  padding: 20px;
  opacity: 0;
  transform: translateY(12px);
  transition: opacity 240ms ease, transform 240ms ease;
}
.runway-panel.active {
  opacity: 1;
  transform: translateY(0);
}
.runway-panel p {
  margin: 0;
  color: rgba(255,255,255,0.58);
  font-size: 12px;
  font-weight: 850;
  text-transform: uppercase;
}
.runway-panel h3 {
  margin: 0;
  color: #fff;
  font-size: clamp(20px, 2.4vw, 30px);
  line-height: 1.1;
}
.runway-stages {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}
.runway-stage {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 4px 8px;
  min-height: 104px;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 14px;
  padding: 12px;
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.7);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: transform 180ms ease, background 180ms ease, border-color 180ms ease;
}
.runway-stage:hover,
.runway-stage.active {
  transform: translateY(-2px);
  border-color: rgba(125, 211, 252, 0.55);
  background: rgba(255,255,255,0.12);
  color: #fff;
}
.runway-stage span {
  grid-row: span 2;
  color: #8bc4ff;
  font-size: 12px;
  font-weight: 900;
}
.runway-stage strong {
  align-self: end;
  font-size: 13px;
}
.runway-stage em {
  grid-column: 2;
  color: rgba(255,255,255,0.58);
  font-size: 11px;
  font-style: normal;
  line-height: 1.35;
}
.decision-flow {
  display: grid;
  grid-template-columns: minmax(260px, 0.32fr) minmax(0, 0.68fr);
  gap: clamp(18px, 3vw, 36px);
  align-items: center;
  border-bottom: 1px solid var(--line);
  padding: 0 0 28px;
  margin-bottom: 12px;
}
.decision-copy {
  max-width: 560px;
}
.decision-copy h2 {
  max-width: 520px;
  margin: 0 0 10px;
  font-size: clamp(29px, 3.8vw, 46px);
  line-height: 1.04;
}
.decision-copy p:not(.section-label) {
  margin: 0;
  color: var(--muted);
  font-size: 16px;
  line-height: 1.45;
}
.decision-panel {
  position: relative;
  display: grid;
  gap: 10px;
  min-height: 0;
  border: 1px solid rgba(17, 17, 20, 0.08);
  border-radius: 16px;
  padding: clamp(11px, 1.8vw, 16px);
  background:
    linear-gradient(135deg, rgba(255,255,255,0.92), rgba(247,249,252,0.78)),
    linear-gradient(180deg, rgba(0, 113, 227, 0.06), transparent 42%);
  box-shadow: 0 18px 52px rgba(17, 17, 20, 0.08);
  backdrop-filter: blur(20px);
}
.product-map-panel {
  align-self: stretch;
}
.product-tier-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}
.product-tier-card {
  position: relative;
  display: grid;
  gap: 6px;
  min-height: 126px;
  border: 1px solid rgba(17, 17, 20, 0.08);
  border-radius: 12px;
  padding: 12px;
  color: var(--ink);
  text-decoration: none;
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 8px 22px rgba(17, 17, 20, 0.045);
  transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
}
.product-tier-card:hover,
.product-tier-card:focus-visible,
.product-tier-card.active {
  transform: translateY(-2px);
  border-color: rgba(0, 113, 227, 0.36);
  box-shadow: 0 14px 32px rgba(17, 17, 20, 0.08);
}
.product-tier-card span {
  color: var(--accent);
  font-size: 11px;
  font-weight: 900;
}
.product-tier-card strong {
  font-size: clamp(17px, 1.6vw, 21px);
  line-height: 1.1;
}
.product-tier-card b {
  font-size: 17px;
  line-height: 1;
}
.product-tier-card small {
  align-self: end;
  color: var(--muted);
  font-size: 12px;
  font-weight: 760;
  line-height: 1.25;
}
.flow-steps {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.flow-steps::before {
  content: "";
  position: absolute;
  top: 30px;
  left: 9%;
  right: 9%;
  height: 2px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(0,113,227,0.38), rgba(0,113,227,0.08));
}
.flow-steps li {
  margin: 0;
}
.flow-step-button {
  display: grid;
  justify-items: start;
  gap: 7px;
  width: 100%;
  min-height: 118px;
  border: 1px solid rgba(17, 17, 20, 0.08);
  border-radius: 12px;
  padding: 13px;
  background: rgba(255, 255, 255, 0.76);
  color: var(--ink);
  font: inherit;
  text-align: left;
  box-shadow: 0 8px 24px rgba(17, 17, 20, 0.04);
  cursor: pointer;
  transition: transform 180ms ease, border-color 180ms ease, background 180ms ease, box-shadow 180ms ease;
}
.flow-step-button:hover,
.flow-steps li.is-current .flow-step-button {
  transform: translateY(-2px);
  border-color: rgba(0, 113, 227, 0.42);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 14px 34px rgba(17, 17, 20, 0.09);
}
.flow-step-button span {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 12px;
  font-weight: 850;
}
.flow-step-button strong {
  font-size: 19px;
  line-height: 1.15;
}
.flow-step-button small {
  min-height: 0;
  color: var(--ink);
  font-size: 12px;
  font-weight: 760;
  line-height: 1.35;
}
.flow-step-button em {
  display: none;
  color: var(--muted);
  font-size: 12px;
  font-style: normal;
  line-height: 1.4;
}
.pack-preview {
  border: 1px solid rgba(17, 17, 20, 0.08);
  border-radius: 12px;
  padding: 14px 16px;
  background: rgba(255,255,255,0.72);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.8);
}
.pack-preview-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 760;
}
.pack-preview-head strong {
  color: var(--accent);
}
.pack-preview-title {
  margin-top: 10px;
  color: var(--ink);
  font-size: clamp(21px, 1.7vw, 27px);
  font-weight: 850;
  line-height: 1.05;
}
.product-path {
  padding: 12px;
}
.product-path .pack-preview-head {
  align-items: center;
}
.product-path .pack-preview-head strong {
  white-space: nowrap;
}
.product-path-steps {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 7px;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
}
.product-path-steps li {
  display: grid;
  gap: 6px;
  min-height: 92px;
  border: 1px solid rgba(17, 17, 20, 0.07);
  border-radius: 10px;
  padding: 10px;
  background: rgba(247, 249, 252, 0.72);
}
.product-path-steps span {
  display: inline-grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 10px;
  font-weight: 900;
}
.product-path-steps strong {
  font-size: 14px;
  line-height: 1.12;
}
.product-path-steps small {
  color: var(--muted);
  font-size: 11px;
  font-weight: 680;
  line-height: 1.25;
}
.pack-preview ul {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
}
.pack-preview li {
  min-height: 0;
  border: 1px solid rgba(17, 17, 20, 0.08);
  border-radius: 999px;
  padding: 8px 11px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.35;
  background: rgba(247,249,252,0.72);
}
.contrast-lab {
  display: grid;
  grid-template-columns: minmax(260px, 0.38fr) minmax(0, 0.62fr);
  gap: clamp(24px, 5vw, 64px);
  align-items: start;
  border-bottom: 1px solid var(--line);
  padding: 8px 0 42px;
  margin: 4px 0 34px;
}
.contrast-copy h2 {
  margin: 0 0 10px;
  font-size: clamp(30px, 4vw, 56px);
  line-height: 1;
}
.contrast-copy p:not(.section-label) {
  margin: 0;
  color: var(--muted);
  font-size: 17px;
  line-height: 1.5;
}
.contrast-panel {
  display: grid;
  gap: 14px;
  border: 1px solid rgba(17, 17, 20, 0.08);
  border-radius: 18px;
  padding: 16px;
  background: linear-gradient(180deg, rgba(255,255,255,0.9), rgba(249,250,252,0.78));
  box-shadow: var(--shadow);
}
.contrast-toggle {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px;
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 4px;
  background: #fff;
}
.contrast-option {
  min-height: 38px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--muted);
  font: inherit;
  font-size: 13px;
  font-weight: 850;
  cursor: pointer;
  transition: background 180ms ease, color 180ms ease, transform 180ms ease;
}
.contrast-option.active {
  background: var(--ink);
  color: #fff;
}
.contrast-option:hover {
  transform: translateY(-1px);
}
.contrast-table {
  display: grid;
  gap: 8px;
}
.contrast-row {
  display: grid;
  grid-template-columns: minmax(110px, 0.25fr) minmax(0, 0.375fr) minmax(0, 0.375fr);
  gap: 10px;
  align-items: stretch;
}
.contrast-row strong,
.contrast-row span {
  display: flex;
  align-items: center;
  min-height: 84px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 12px;
  background: #fff;
  line-height: 1.35;
}
.contrast-row strong {
  color: var(--ink);
  font-size: 14px;
}
.contrast-row span {
  color: var(--muted);
  font-size: 13px;
}
.contrast-panel[data-contrast-mode="before"] .before-copy,
.contrast-panel[data-contrast-mode="after"] .after-copy {
  border-color: rgba(0, 113, 227, 0.36);
  background: var(--accent-soft);
  color: var(--ink);
  box-shadow: inset 0 0 0 1px rgba(0, 113, 227, 0.2);
}
.contrast-panel[data-contrast-mode="before"] .after-copy,
.contrast-panel[data-contrast-mode="after"] .before-copy {
  opacity: 0.58;
}
.planning-calculator {
  display: grid;
  grid-template-columns: minmax(260px, 0.42fr) minmax(0, 0.58fr);
  gap: clamp(24px, 5vw, 64px);
  align-items: center;
  border-bottom: 1px solid var(--line);
  padding: 8px 0 42px;
  margin: 4px 0 34px;
}
.calculator-copy h2 {
  margin: 0 0 10px;
  font-size: clamp(32px, 4.4vw, 62px);
  line-height: 1;
}
.calculator-copy p:not(.section-label) {
  margin: 0;
  color: var(--muted);
  font-size: 17px;
  line-height: 1.5;
}
.calculator-panel {
  display: grid;
  grid-template-columns: minmax(0, 0.56fr) minmax(220px, 0.44fr);
  gap: 14px;
  border: 1px solid rgba(17, 17, 20, 0.08);
  border-radius: 18px;
  padding: 16px;
  background:
    linear-gradient(135deg, rgba(255,255,255,0.92), rgba(247,250,252,0.78)),
    radial-gradient(circle at 86% 16%, rgba(0, 113, 227, 0.12), transparent 30%);
  box-shadow: var(--shadow);
}
.range-control {
  display: grid;
  gap: 12px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 16px;
  background: #fff;
}
.range-control + .range-control {
  grid-column: 1;
}
.range-control span {
  color: var(--muted);
  font-size: 13px;
  font-weight: 800;
}
.range-control strong {
  color: var(--ink);
  font-size: 36px;
  line-height: 1;
}
.range-control input[type="range"] {
  width: 100%;
  accent-color: var(--accent);
  cursor: pointer;
}
.calculator-result {
  grid-column: 2;
  grid-row: 1 / span 2;
  display: grid;
  align-content: center;
  gap: 10px;
  min-height: 240px;
  border-radius: 14px;
  padding: 20px;
  background: #111114;
  color: #fff;
}
.calculator-result span {
  font-size: clamp(54px, 7vw, 92px);
  font-weight: 850;
  line-height: 0.9;
}
.calculator-result p {
  margin: 0;
  color: rgba(255,255,255,0.72);
  line-height: 1.4;
}
.calculator-result em {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  border-radius: 999px;
  padding: 7px 10px;
  background: rgba(255,255,255,0.12);
  color: #fff;
  font-size: 12px;
  font-style: normal;
  font-weight: 850;
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
.pricing-studio {
  gap: 16px;
  padding-top: clamp(24px, 4vw, 42px);
  border-top: 1px solid var(--line);
}
.pricing-studio .section-head {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
}
.pricing-studio .section-head h2 {
  max-width: 620px;
  font-size: clamp(30px, 4vw, 48px);
  line-height: 1.05;
  letter-spacing: 0;
}
.pricing-studio .section-head p:not(.section-label) {
  max-width: 560px;
  font-size: 15px;
  line-height: 1.45;
}
.pricing-proof-points {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  max-width: 330px;
  padding-top: 8px;
}
.pricing-proof-points span {
  border: 1px solid rgba(17, 17, 20, 0.1);
  border-radius: 999px;
  padding: 8px 12px;
  background: rgba(255,255,255,0.82);
  color: var(--muted);
  font-size: 12px;
  font-weight: 760;
  white-space: nowrap;
}
.pricing-rail {
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border: 1px solid rgba(17, 17, 20, 0.16);
  border-radius: 14px;
  background: rgba(255,255,255,0.82);
  box-shadow: 0 14px 36px rgba(17, 17, 20, 0.055);
  overflow: hidden;
}
.pricing-rail::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--accent) 0 var(--pricing-progress, 66%), rgba(17,17,20,0.12) var(--pricing-progress, 66%) 100%);
}
.pricing-rail-option {
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 2px 14px;
  align-items: center;
  min-height: 76px;
  border: 0;
  border-right: 1px solid rgba(17, 17, 20, 0.1);
  padding: 13px 16px;
  background: transparent;
  color: var(--ink);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 180ms ease, box-shadow 180ms ease;
}
.pricing-rail-option:last-child {
  border-right: 0;
}
.pricing-rail-option > span {
  grid-row: span 2;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 1px solid rgba(17, 17, 20, 0.18);
  border-radius: 50%;
  color: var(--muted);
  font-size: 13px;
  font-weight: 850;
}
.pricing-rail-option strong {
  font-size: 17px;
  line-height: 1.1;
}
.pricing-rail-option small {
  color: var(--muted);
  font-size: 13px;
}
.pricing-rail-option em {
  grid-column: 2;
  width: fit-content;
  border-radius: 999px;
  padding: 3px 9px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 12px;
  font-style: normal;
  font-weight: 820;
}
.pricing-rail-option:hover,
.pricing-rail-option:focus-visible,
.pricing-rail-option.active {
  background: rgba(0, 113, 227, 0.05);
}
.pricing-rail-option.active {
  box-shadow: inset 0 0 0 2px rgba(0, 113, 227, 0.84);
}
.pricing-rail-option.active > span {
  border-color: var(--accent);
  color: var(--accent);
}
.pricing-workbench {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  align-items: start;
}
.pricing-studio .pricing-data-store {
  display: none;
}
.tier-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.pricing-studio .tier-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
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
  transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
}
.tier:hover {
  transform: translateY(-3px);
  border-color: #b8c8d9;
  box-shadow: 0 18px 42px rgba(17, 17, 20, 0.1);
}
.pricing-studio .tier {
  grid-template-columns: 1fr;
  align-items: start;
  min-height: 276px;
  gap: 12px;
  padding: 20px;
}
.pricing-studio .tier > div:first-child {
  display: grid;
  grid-template-columns: 1fr;
  gap: 7px;
  align-items: start;
}
.pricing-studio .tier > div:first-child > * {
  grid-column: auto;
}
.pricing-studio .tier > div:first-child::before {
  content: none;
}
.pricing-studio .tier:hover {
  transform: translateY(-3px);
}
.tier.featured {
  border-color: rgba(0, 113, 227, 0.38);
  background: linear-gradient(180deg, #ffffff, #f5faff);
}
.tier.selected {
  border-color: rgba(0, 113, 227, 0.58);
  box-shadow: inset 0 0 0 1px rgba(0, 113, 227, 0.36), 0 22px 50px rgba(0, 113, 227, 0.12);
}
.pricing-studio .tier.selected {
  background:
    linear-gradient(180deg, #fff, #f7fbff),
    radial-gradient(circle at 8% 12%, rgba(0,113,227,0.08), transparent 28%);
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
.pricing-studio .tier-price {
  grid-row: auto;
  grid-column: auto;
  margin: 4px 0 2px;
  text-align: left;
  font-size: 40px;
}
.pricing-studio .tier-price::after {
  content: "";
}
.tier p:not(.tier-kicker):not(.tier-price) {
  margin: 0;
  color: var(--muted);
  line-height: 1.45;
}
.tier-commitment {
  display: block;
  width: fit-content;
  border-radius: 999px;
  padding: 5px 9px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 13px;
  line-height: 1;
}
.tier ul {
  margin: 0;
  padding-left: 18px;
  color: var(--muted);
}
.pricing-studio .tier ul {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: 1fr;
  gap: 6px;
  padding-left: 18px;
  font-size: 13px;
}
.tier-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.tier-actions .action {
  width: 100%;
}
.pricing-studio .tier-actions {
  grid-column: 1 / -1;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.tier-select-action {
  border: 0;
  cursor: pointer;
  font: inherit;
}
.tier-select-action:focus-visible {
  outline: 3px solid rgba(0, 113, 227, 0.22);
  outline-offset: 2px;
}
.pricing-chooser {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 18px;
  align-items: center;
  margin-top: 14px;
  border: 1px solid rgba(17, 17, 20, 0.08);
  border-radius: 18px;
  padding: 16px;
  background:
    linear-gradient(135deg, rgba(255,255,255,0.96), rgba(247,250,252,0.88)),
    radial-gradient(circle at 82% 12%, rgba(0, 113, 227, 0.12), transparent 28%);
  box-shadow: var(--shadow);
  transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
}
.pricing-studio .pricing-chooser {
  position: relative;
  top: auto;
  grid-template-columns: minmax(0, 1fr) minmax(190px, 0.28fr);
  min-height: 0;
  margin-top: 0;
  border-color: rgba(17, 17, 20, 0.1);
  border-radius: 14px;
  padding: clamp(14px, 2.2vw, 20px);
  background: rgba(255,255,255,0.86);
  box-shadow: 0 16px 42px rgba(17, 17, 20, 0.07);
  overflow: hidden;
}
.pricing-studio .pricing-chooser::before {
  display: none;
}
.pricing-studio .pricing-chooser > * {
  position: relative;
  z-index: 1;
}
.pricing-chooser.is-updating {
  border-color: rgba(0, 113, 227, 0.34);
  box-shadow: 0 18px 42px rgba(0, 113, 227, 0.11);
}
.pricing-studio .pricing-chooser.is-updating {
  transform: translateY(-2px);
  box-shadow: 0 36px 92px rgba(0, 113, 227, 0.13);
}
.pricing-chooser-label {
  margin: 0 0 6px;
  color: var(--accent);
  font-size: 12px;
  font-weight: 850;
  letter-spacing: 0;
  text-transform: none;
}
.pricing-chooser h3 {
  margin: 0 0 6px;
  font-size: 24px;
  line-height: 1.12;
}
.pricing-studio .pricing-chooser h3 {
  font-size: clamp(24px, 2.8vw, 34px);
  letter-spacing: 0;
}
.pricing-chooser p:not(.pricing-chooser-label) {
  max-width: 620px;
  margin: 0;
  color: var(--muted);
  line-height: 1.45;
}
.selected-tier-commitment {
  width: fit-content;
  margin-top: 8px !important;
  border-radius: 999px;
  padding: 6px 10px;
  background: #111114;
  color: #fff !important;
  font-size: 13px;
  font-weight: 820;
}
.pricing-configurator {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 16px;
}
.pricing-studio .pricing-configurator {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 14px;
  border-top: 0;
}
.pricing-configurator > div {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 3px 8px;
  align-content: start;
  min-height: 94px;
  border: 1px solid rgba(17, 17, 20, 0.08);
  border-radius: 10px;
  padding: 10px;
  background: rgba(255,255,255,0.68);
}
.pricing-studio .pricing-configurator > div {
  grid-template-columns: 10px minmax(0, 1fr);
  min-height: 0;
  border: 1px solid rgba(17, 17, 20, 0.07);
  border-radius: 8px;
  padding: 10px;
  background: rgba(247,248,250,0.64);
}
.pricing-configurator span {
  grid-row: span 2;
  color: var(--accent);
  font-size: 11px;
  font-weight: 900;
}
.pricing-studio .pricing-configurator span {
  width: 6px;
  height: 100%;
  border-radius: 50%;
  background: var(--accent);
  color: transparent;
  font-size: 0;
}
.pricing-configurator strong {
  color: var(--ink);
  font-size: 13px;
}
.pricing-configurator small {
  color: var(--muted);
  line-height: 1.35;
}
.pricing-chooser-action {
  display: grid;
  gap: 10px;
  justify-items: end;
}
.pricing-studio .pricing-chooser-action {
  align-self: stretch;
  align-content: end;
  justify-items: stretch;
  margin-top: 10px;
}
.pricing-chooser-action strong {
  color: var(--ink);
  font-size: 26px;
  line-height: 1;
}
.pricing-studio .pricing-chooser-action strong {
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 12px;
  color: var(--accent);
  font-size: clamp(34px, 4.8vw, 50px);
}
.pricing-chooser-action small {
  color: var(--muted);
  font-size: 12px;
  font-weight: 750;
}
.delivery {
  display: grid;
  grid-template-columns: minmax(260px, 0.55fr) minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}
.delivery-lab {
  grid-template-columns: minmax(260px, 0.36fr) minmax(0, 0.64fr);
  gap: clamp(20px, 4vw, 48px);
}
.delivery-copy {
  min-width: 0;
}
.delivery-copy p:not(.section-label) {
  margin: 10px 0 0;
  color: var(--muted);
  line-height: 1.5;
}
.deliverable-viewer {
  display: grid;
  gap: 14px;
  min-width: 0;
  border: 1px solid rgba(17, 17, 20, 0.08);
  border-radius: 22px;
  padding: clamp(12px, 2vw, 18px);
  background:
    linear-gradient(180deg, rgba(255,255,255,0.96), rgba(247,249,252,0.86)),
    radial-gradient(circle at 82% 16%, rgba(0, 113, 227, 0.12), transparent 32%);
  box-shadow: var(--shadow);
  outline: none;
}
.deliverable-viewer:focus-visible {
  box-shadow: var(--shadow), 0 0 0 4px rgba(0, 113, 227, 0.14);
}
.deliverable-tabs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 4px;
  border: 1px solid rgba(17, 17, 20, 0.1);
  border-radius: 999px;
  padding: 4px;
  background: rgba(255,255,255,0.72);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.9);
}
.deliverable-tab {
  min-width: 0;
  min-height: 48px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--muted);
  font: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 6px 10px;
  transition: background 180ms ease, color 180ms ease, transform 180ms ease, box-shadow 180ms ease;
}
.deliverable-tab-dot {
  width: 7px;
  height: 7px;
  border-radius: 99px;
  background: rgba(17, 17, 20, 0.2);
  flex: 0 0 auto;
}
.deliverable-tab-copy {
  display: grid;
  min-width: 0;
  text-align: left;
}
.deliverable-tab strong {
  overflow: hidden;
  color: inherit;
  font-size: 13px;
  font-weight: 850;
  line-height: 1.05;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.deliverable-tab small {
  overflow: hidden;
  margin-top: 2px;
  color: inherit;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.1;
  opacity: 0.62;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.deliverable-tab:hover,
.deliverable-tab.active {
  background: #fff;
  color: var(--blue);
  box-shadow: 0 10px 24px rgba(17, 17, 20, 0.08);
}
.deliverable-tab.active .deliverable-tab-dot {
  background: var(--blue);
  box-shadow: 0 0 0 4px rgba(0, 113, 227, 0.12);
}
.deliverable-tab:hover {
  transform: translateY(-1px);
}
.deliverable-screen {
  position: relative;
  min-height: 430px;
  overflow: hidden;
  border: 1px solid rgba(17, 17, 20, 0.06);
  border-radius: 18px;
  background:
    radial-gradient(circle at 24% 18%, rgba(255,255,255,0.94), transparent 34%),
    linear-gradient(145deg, #f5f5f7, #eef2f8 58%, #f8f9fb);
  color: var(--ink);
  perspective: 1200px;
}
.deliverable-screen::before {
  content: "";
  position: absolute;
  inset: auto 9% 18px 9%;
  height: 28px;
  border-radius: 999px;
  background: rgba(17, 17, 20, 0.08);
  filter: blur(18px);
}
.deliverable-panel {
  position: absolute;
  inset: clamp(16px, 3vw, 28px) clamp(18px, 4vw, 60px);
  display: grid;
  align-content: start;
  gap: 14px;
  min-width: 0;
  padding: clamp(18px, 2.8vw, 28px);
  border: 1px solid rgba(17, 17, 20, 0.09);
  border-radius: 16px;
  background: rgba(255,255,255,0.94);
  box-shadow: 0 26px 58px rgba(19, 25, 38, 0.16);
  opacity: 0.54;
  pointer-events: none;
  transform:
    translateX(var(--stack-x, 0px))
    translateY(var(--stack-y, 0px))
    rotate(var(--stack-rotate, 0deg))
    scale(var(--stack-scale, 1));
  transform-origin: center bottom;
  transition: opacity 260ms ease, transform 260ms ease, box-shadow 260ms ease;
  z-index: var(--stack-order, 1);
}
.deliverable-panel.active {
  opacity: 1;
  pointer-events: auto;
  background: #fff;
  transform: translateX(0) translateY(0) rotate(0deg) scale(1);
  box-shadow: 0 32px 72px rgba(19, 25, 38, 0.2);
}
.deliverable-panel:not(.active) .deliverable-lines,
.deliverable-panel:not(.active) .deliverable-proof-strip,
.deliverable-panel:not(.active) .deliverable-sheet-caption {
  opacity: 0.18;
}
.deliverable-panel:not(.active) h3 {
  opacity: 0.16;
}
.deliverable-sheet-top {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  color: var(--ink);
  font-size: 14px;
  font-weight: 850;
}
.deliverable-sheet-top > span:not(.deliverable-sheet-mark) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.deliverable-sheet-top em {
  margin-left: auto;
  color: rgba(17, 17, 20, 0.28);
  font-style: normal;
  letter-spacing: 0;
}
.deliverable-sheet-mark {
  width: 20px;
  height: 20px;
  border-radius: 5px;
  background: var(--blue);
  box-shadow: inset 0 -6px 10px rgba(0,0,0,0.14);
}
.deliverable-sheet-mark[data-kind="csv"],
.deliverable-panel[data-deliverable-panel="csv"] .deliverable-lines li span {
  background: #34c759;
}
.deliverable-sheet-mark[data-kind="script"],
.deliverable-panel[data-deliverable-panel="script"] .deliverable-lines li span {
  background: #ff7a3d;
}
.deliverable-sheet-mark[data-kind="proof"],
.deliverable-panel[data-deliverable-panel="proof"] .deliverable-lines li span {
  background: #35c28b;
}
.deliverable-panel h3 {
  margin: 0;
  max-width: 460px;
  color: var(--ink);
  font-size: clamp(24px, 3vw, 34px);
  line-height: 1.1;
}
.deliverable-sheet-caption {
  margin: 0;
  color: var(--muted);
  font-size: 14px;
  font-weight: 750;
}
.pricing-studio .pricing-chooser-action .action {
  justify-content: center;
  min-height: 54px;
  border-radius: 8px;
}
.deliverable-lines {
  display: grid;
  grid-template-columns: 1fr;
  gap: 9px;
  margin: 2px 0 0;
  padding: 0;
  list-style: none;
}
.deliverable-lines li {
  display: grid;
  grid-template-columns: 9px minmax(0, 1fr);
  align-items: start;
  gap: 10px;
  min-width: 0;
}
.deliverable-lines li span {
  width: 9px;
  height: 9px;
  margin-top: 7px;
  border-radius: 99px;
  background: var(--blue);
}
.deliverable-lines p {
  overflow-wrap: anywhere;
  margin: 0;
  color: #545963;
  font: 13px/1.5 ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace;
}
.deliverable-proof-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
  margin-top: 4px;
  border-radius: 10px;
  padding: 12px 14px;
  background: linear-gradient(90deg, rgba(0, 113, 227, 0.1), rgba(52, 199, 89, 0.08));
  color: var(--muted);
  font-size: 12px;
  font-weight: 750;
}
.deliverable-proof-strip strong {
  flex: 0 0 auto;
  color: var(--blue);
  font-size: 14px;
}
.delivery-stack-footer {
  display: grid;
  grid-template-columns: minmax(80px, 150px) auto minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  padding: 0 4px;
  color: var(--muted);
}
.delivery-stack-meter {
  height: 5px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(17, 17, 20, 0.08);
}
.delivery-stack-meter span {
  display: block;
  width: var(--delivery-progress, 25%);
  height: 100%;
  border-radius: inherit;
  background: var(--blue);
  transition: width 260ms ease;
}
.delivery-stack-footer p,
.delivery-stack-footer small {
  margin: 0;
  min-width: 0;
  font-size: 12px;
  font-weight: 750;
}
.delivery-stack-footer small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.checkout-close {
  display: grid;
  grid-template-columns: minmax(360px, 0.48fr) minmax(0, 0.52fr);
  gap: clamp(22px, 5vw, 76px);
  align-items: center;
  border-top: 1px solid rgba(17, 17, 20, 0.08);
  padding-top: clamp(44px, 8vw, 86px);
  padding-bottom: clamp(36px, 7vw, 72px);
}
.checkout-close-copy {
  min-width: 0;
}
.checkout-close-copy h2 {
  max-width: 720px;
  margin: 0 0 14px;
  font-size: clamp(38px, 4.2vw, 58px);
  line-height: 0.96;
  letter-spacing: 0;
}
.checkout-close-copy p:not(.section-label) {
  max-width: 560px;
  margin: 0;
  color: var(--muted);
  font-size: clamp(17px, 1.8vw, 22px);
  line-height: 1.42;
}
.checkout-proof-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 24px;
}
.checkout-proof-row span {
  border: 1px solid rgba(17, 17, 20, 0.08);
  border-radius: 999px;
  padding: 8px 12px;
  background: rgba(255,255,255,0.72);
  color: var(--ink);
  font-size: 13px;
  font-weight: 820;
}
.checkout-close-panel {
  display: grid;
  gap: 12px;
  min-width: 0;
  border: 1px solid rgba(17, 17, 20, 0.1);
  border-radius: 10px;
  padding: clamp(16px, 2.4vw, 24px);
  background: rgba(255,255,255,0.9);
  box-shadow: 0 22px 58px rgba(17, 17, 20, 0.1);
}
.checkout-close-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  border-bottom: 1px solid rgba(17, 17, 20, 0.08);
  padding-bottom: 12px;
  color: var(--muted);
  font-size: 13px;
  font-weight: 800;
}
.checkout-close-top strong {
  color: var(--ink);
}
.checkout-close-grid {
  display: grid;
  gap: 10px;
}
.checkout-close-card {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  gap: 4px 12px;
  align-items: center;
  min-width: 0;
  border: 1px solid rgba(17, 17, 20, 0.08);
  border-radius: 8px;
  padding: 14px;
  background: rgba(247,248,250,0.72);
  color: var(--ink);
  text-decoration: none;
  transition: transform 180ms ease, border-color 180ms ease, background 180ms ease, box-shadow 180ms ease;
}
.checkout-close-card:hover {
  transform: translateY(-2px);
  border-color: rgba(0, 113, 227, 0.28);
  background: #fff;
  box-shadow: 0 14px 32px rgba(17, 17, 20, 0.08);
}
.checkout-close-card.primary {
  border-color: rgba(0, 113, 227, 0.32);
  background: rgba(0, 113, 227, 0.08);
}
.checkout-close-card span {
  grid-row: span 2;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 999px;
  background: #fff;
  color: var(--accent);
  font-size: 12px;
  font-weight: 900;
}
.checkout-close-card strong {
  overflow: hidden;
  color: var(--ink);
  font-size: 18px;
  line-height: 1.1;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.checkout-close-card em {
  justify-self: end;
  color: var(--accent);
  font-style: normal;
  font-size: 12px;
  font-weight: 850;
  white-space: nowrap;
}
.checkout-close-card small {
  grid-column: 2 / -1;
  min-width: 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.35;
}
.proof-ledger {
  display: grid;
  grid-template-columns: minmax(260px, 0.38fr) minmax(0, 0.62fr);
  gap: clamp(22px, 4vw, 52px);
  align-items: center;
}
.proof-copy h2 {
  max-width: 560px;
  margin: 0 0 10px;
  font-size: clamp(32px, 4vw, 58px);
  line-height: 0.98;
}
.proof-copy p:not(.section-label) {
  margin: 0;
  color: var(--muted);
  font-size: 17px;
  line-height: 1.5;
}
.proof-console {
  display: grid;
  grid-template-columns: minmax(190px, 0.42fr) minmax(0, 0.58fr);
  gap: 12px;
  border: 1px solid rgba(17, 17, 20, 0.08);
  border-radius: 18px;
  padding: 14px;
  background:
    linear-gradient(135deg, rgba(255,255,255,0.96), rgba(247,250,252,0.86)),
    radial-gradient(circle at 84% 12%, rgba(0, 113, 227, 0.12), transparent 30%);
  box-shadow: var(--shadow);
}
.proof-tabs {
  display: grid;
  gap: 8px;
}
.proof-tab {
  display: grid;
  gap: 5px;
  min-height: 82px;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 12px;
  background: #fff;
  color: var(--muted);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: transform 160ms ease, border-color 160ms ease, background 160ms ease, box-shadow 160ms ease;
}
.proof-tab:hover,
.proof-tab.active {
  transform: translateY(-2px);
  border-color: rgba(0, 113, 227, 0.42);
  background: var(--accent-soft);
  box-shadow: inset 0 0 0 1px rgba(0, 113, 227, 0.18);
}
.proof-tab span {
  color: var(--ink);
  font-size: 14px;
  font-weight: 850;
}
.proof-tab strong {
  color: var(--accent);
  font-size: 12px;
  line-height: 1.25;
}
.proof-panels {
  position: relative;
  overflow: hidden;
  min-height: 352px;
  border-radius: 14px;
  background: #111114;
  color: #fff;
}
.proof-panels::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 82% 16%, rgba(0, 113, 227, 0.25), transparent 34%),
    linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px),
    linear-gradient(180deg, rgba(255,255,255,0.05) 1px, transparent 1px);
  background-size: auto, 42px 42px, 42px 42px;
  pointer-events: none;
}
.proof-panel {
  position: absolute;
  inset: 0;
  display: grid;
  align-content: end;
  gap: 12px;
  padding: 22px;
  opacity: 0;
  transform: translateY(12px);
  transition: opacity 220ms ease, transform 220ms ease;
}
.proof-panel.active {
  opacity: 1;
  transform: translateY(0);
}
.proof-panel-kicker {
  margin: 0;
  color: #8bc4ff;
  font-size: 12px;
  font-weight: 850;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.proof-panel h3 {
  max-width: 520px;
  margin: 0;
  color: #fff;
  font-size: clamp(24px, 3vw, 40px);
  line-height: 1.02;
}
.proof-panel p:not(.proof-panel-kicker) {
  max-width: 560px;
  margin: 0;
  color: rgba(255,255,255,0.72);
  line-height: 1.5;
}
.proof-panel .action {
  width: fit-content;
}
.trust-dock {
  display: grid;
  grid-template-columns: minmax(260px, 0.34fr) minmax(0, 0.66fr);
  gap: clamp(22px, 5vw, 68px);
  align-items: center;
  border-top: 1px solid var(--line);
  padding-top: clamp(34px, 6vw, 72px);
  margin-top: 38px;
}
.trust-dock-copy {
  min-width: 0;
}
.trust-dock-copy h2 {
  max-width: 560px;
  margin: 0 0 12px;
  font-size: clamp(38px, 5.4vw, 74px);
  line-height: 0.98;
  letter-spacing: 0;
}
.trust-dock-copy p:not(.section-label) {
  max-width: 480px;
  margin: 0;
  color: var(--muted);
  font-size: 17px;
  line-height: 1.5;
}
.trust-dock-bullets {
  display: grid;
  gap: 12px;
  margin: 24px 0 0;
  padding: 0;
  list-style: none;
}
.trust-dock-bullets li {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--ink);
  font-size: 14px;
  font-weight: 820;
}
.trust-dock-bullets li > span:first-child {
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  border-radius: 8px;
  background:
    linear-gradient(135deg, rgba(52,199,89,0.18), rgba(255,255,255,0.9)),
    radial-gradient(circle at 50% 50%, rgba(52,199,89,0.28) 0 3px, transparent 4px);
  border: 1px solid rgba(52,199,89,0.18);
}
.trust-dock-bullets li > span:not(:first-child) {
  min-width: 0;
}
.trust-dock-surface {
  position: relative;
  display: grid;
  gap: 0;
  min-width: 0;
  overflow: hidden;
  border: 1px solid rgba(17, 17, 20, 0.1);
  border-radius: 22px;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.96), rgba(247,248,250,0.92)),
    radial-gradient(circle at 74% 18%, rgba(0,113,227,0.1), transparent 34%);
  box-shadow: 0 28px 72px rgba(19, 25, 38, 0.12);
  outline: none;
}
.trust-dock-surface:focus-visible {
  box-shadow: 0 28px 72px rgba(19, 25, 38, 0.12), 0 0 0 4px rgba(0,113,227,0.14);
}
.trust-dock-tabs {
  position: relative;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  min-width: 0;
  border-bottom: 1px solid rgba(17, 17, 20, 0.08);
  background: rgba(255,255,255,0.72);
}
.trust-dock-tab {
  display: grid;
  gap: 7px;
  justify-items: center;
  min-width: 0;
  min-height: 112px;
  border: 0;
  border-right: 1px solid rgba(17, 17, 20, 0.08);
  padding: 22px 12px 18px;
  background: transparent;
  color: var(--muted);
  font: inherit;
  cursor: pointer;
  transition: color 180ms ease, background 180ms ease, transform 180ms ease;
}
.trust-dock-tab:last-of-type {
  border-right: 0;
}
.trust-dock-tab:hover {
  color: var(--ink);
  background: rgba(255,255,255,0.68);
}
.trust-dock-tab.active {
  color: var(--blue);
}
.trust-dock-tab span {
  font-size: 28px;
  line-height: 1;
}
.trust-dock-tab strong {
  max-width: 100%;
  font-size: 13px;
  font-weight: 780;
  line-height: 1.2;
  text-align: center;
}
.trust-dock-indicator {
  position: absolute;
  left: 25%;
  bottom: 0;
  width: 25%;
  height: 3px;
  border-radius: 999px;
  background: var(--blue);
  transform: translateX(var(--trust-indicator-x, 0%));
  transition: transform 240ms ease;
}
.trust-dock-stage {
  display: grid;
  min-height: 330px;
  padding: clamp(18px, 3vw, 28px);
}
.trust-dock-panel {
  grid-area: 1 / 1;
  display: grid;
  grid-template-columns: minmax(220px, 0.42fr) minmax(0, 0.58fr);
  gap: 22px;
  align-items: stretch;
  min-width: 0;
  opacity: 0;
  visibility: hidden;
  transform: translateY(12px);
  transition: opacity 220ms ease, transform 220ms ease, visibility 220ms ease;
}
.trust-dock-panel.active {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}
.trust-panel-copy {
  display: grid;
  align-content: center;
  gap: 12px;
  min-width: 0;
}
.trust-panel-copy h3 {
  margin: 0;
  color: var(--ink);
  font-size: clamp(24px, 3vw, 38px);
  line-height: 1.06;
}
.trust-panel-copy p {
  margin: 0;
  color: var(--muted);
  line-height: 1.5;
}
.trust-panel-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: fit-content;
  margin-top: 4px;
  color: var(--blue);
  font-weight: 820;
  text-decoration: none;
}
.trust-panel-link span {
  transition: transform 160ms ease;
}
.trust-panel-link:hover span {
  transform: translateX(3px);
}
.trust-link-grid,
.trust-live-list,
.trust-issue-card,
.trust-sample-card {
  min-width: 0;
  border: 1px solid rgba(17, 17, 20, 0.08);
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 14px 38px rgba(17, 17, 20, 0.07);
}
.trust-link-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  overflow: hidden;
  background: rgba(17, 17, 20, 0.08);
}
.trust-link-grid a {
  display: grid;
  gap: 6px;
  min-height: 112px;
  padding: 16px;
  background: #fff;
  color: var(--ink);
  text-decoration: none;
}
.trust-link-grid strong,
.trust-sample-card strong,
.trust-live-list strong,
.trust-issue-card strong {
  color: var(--ink);
  font-weight: 840;
}
.trust-link-grid span,
.trust-sample-card span,
.trust-issue-card span,
.trust-issue-card em {
  color: var(--muted);
  font-size: 12px;
  line-height: 1.35;
}
.trust-live-list {
  display: grid;
  align-content: start;
  overflow: hidden;
}
.trust-live-list > div {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  border-bottom: 1px solid var(--line);
  padding: 16px;
}
.trust-live-list > div span {
  width: 9px;
  height: 9px;
  border-radius: 99px;
  background: #34c759;
}
.trust-live-list > div a {
  margin-left: auto;
  color: var(--blue);
  font-size: 12px;
  font-weight: 800;
  text-decoration: none;
}
.trust-live-list ol {
  margin: 0;
  padding: 0;
  list-style: none;
}
.trust-live-list li {
  display: grid;
  grid-template-columns: 8px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  border-bottom: 1px solid rgba(17, 17, 20, 0.06);
  padding: 0 16px;
}
.trust-live-list li:last-child {
  border-bottom: 0;
}
.trust-live-list li span {
  width: 6px;
  height: 6px;
  border-radius: 99px;
  background: var(--blue);
}
.trust-live-list li strong {
  overflow: hidden;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.trust-live-list li em {
  color: var(--muted);
  font-size: 12px;
  font-style: normal;
}
.trust-issue-card,
.trust-sample-card {
  display: grid;
  align-content: center;
  gap: 18px;
  padding: 22px;
}
.trust-issue-card > div,
.trust-sample-card {
  min-width: 0;
}
.trust-issue-card strong {
  display: block;
  margin-bottom: 6px;
  font-size: 24px;
}
.trust-issue-card span,
.trust-issue-card em,
.trust-sample-card span {
  display: block;
}
.trust-issue-card ul {
  display: grid;
  gap: 9px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.trust-issue-card li {
  color: var(--muted);
  font-size: 13px;
}
.trust-issue-card li::before {
  content: "";
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-right: 8px;
  border-radius: 99px;
  background: #34c759;
}
.trust-sample-card p {
  margin: 0;
  color: var(--muted);
  line-height: 1.5;
}
.trust-sample-card a {
  color: var(--blue);
  font-weight: 820;
  text-decoration: none;
}
.trust-dock-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border-top: 1px solid rgba(17, 17, 20, 0.08);
  padding: 14px clamp(18px, 3vw, 28px);
  background: rgba(255,255,255,0.72);
}
.trust-dock-metrics span {
  display: grid;
  gap: 2px;
  min-width: 0;
  border-right: 1px solid rgba(17, 17, 20, 0.1);
  padding: 0 18px;
  color: var(--muted);
  font-size: 12px;
  text-align: center;
}
.trust-dock-metrics span:first-child {
  padding-left: 0;
}
.trust-dock-metrics span:last-child {
  border-right: 0;
  padding-right: 0;
}
.trust-dock-metrics strong {
  overflow: hidden;
  color: var(--ink);
  font-size: clamp(20px, 2.4vw, 28px);
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.seo-hub,
.seo-summary,
.feed-box,
.archive-box,
.issue-summary {
  display: grid;
  grid-template-columns: minmax(260px, 0.5fr) minmax(0, 1fr);
  gap: 24px;
  align-items: start;
  border-bottom: 1px solid var(--line);
  padding: 2px 0 24px;
  margin-bottom: 22px;
}
.seo-hub h2,
.seo-summary h2,
.feed-box h2,
.archive-box h2,
.issue-summary h2 {
  margin: 0 0 8px;
  font-size: 24px;
  line-height: 1.2;
}
.seo-hub p:not(.section-label),
.seo-summary p,
.feed-box p:not(.section-label),
.archive-box p:not(.section-label),
.issue-summary p {
  margin: 0;
  color: var(--muted);
  line-height: 1.5;
}
.feed-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
  align-self: center;
}
.topic-links {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.topic-link {
  display: grid;
  gap: 5px;
  min-height: 104px;
  align-content: start;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 14px;
  background: #fff;
  text-decoration: none;
  box-shadow: var(--shadow);
}
.topic-link span {
  font-weight: 800;
  line-height: 1.3;
}
.topic-link small {
  color: var(--muted);
  line-height: 1.35;
}
.topic-hero {
  padding: 40px clamp(20px, 5vw, 72px) 30px;
  border-bottom: 1px solid var(--line);
  background: #fff;
}
.topic-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
.topic-card {
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 18px;
  background: #fff;
  box-shadow: var(--shadow);
}
.issue-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
.issue-card {
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 18px;
  background: #fff;
  box-shadow: var(--shadow);
}
.issue-card h2 {
  margin: 0 0 10px;
  font-size: 19px;
  line-height: 1.3;
}
.issue-card p,
.issue-card li {
  color: var(--muted);
  line-height: 1.5;
}
.order-hero .sub {
  max-width: 900px;
}
.order-summary {
  align-items: stretch;
}
.order-steps {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.order-steps li {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  margin: 0;
  border: 1px solid var(--line);
  border-radius: 7px;
  padding: 10px 12px;
  background: #fff;
}
.order-steps span {
  color: var(--muted);
}
.payment-safety {
  align-items: stretch;
}
.safety-list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.safety-list li {
  display: grid;
  gap: 5px;
  margin: 0;
  border: 1px solid var(--line);
  border-radius: 7px;
  padding: 11px 12px;
  background: #fff;
}
.safety-list span {
  color: var(--muted);
  line-height: 1.45;
}
.order-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.copy-action {
  min-width: 112px;
}
.copy-fallback {
  grid-column: 1 / -1;
  flex: 1 1 100%;
  width: 100%;
  min-height: 132px;
  margin: 2px 0 0;
  border: 1px solid var(--accent);
  border-radius: 6px;
  padding: 10px 11px;
  background: #fbfdfc;
  color: var(--ink);
  font: 13px/1.45 ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace;
  resize: vertical;
}
.copy-fallback[hidden] {
  display: none;
}
.order-copy {
  display: grid;
  grid-template-columns: minmax(240px, 0.55fr) minmax(0, 1fr);
  gap: 24px;
  align-items: start;
  padding: 26px 0;
  border-top: 1px solid var(--line);
}
.order-copy p:not(.section-label) {
  margin: 0;
  color: var(--muted);
  line-height: 1.5;
}
.mail-drafts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.mail-drafts article {
  display: grid;
  gap: 10px;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 14px;
  background: #fff;
  box-shadow: var(--shadow);
}
.mail-drafts h3 {
  margin: 0;
}
.mail-drafts pre {
  min-height: 240px;
  margin: 0;
  overflow: auto;
  white-space: pre-wrap;
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 12px;
  background: #f7f9fb;
  color: var(--ink);
  font: 13px/1.45 ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace;
}
.topic-rank {
  margin: 0 0 8px;
  color: var(--accent);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.topic-card h2 {
  margin: 0 0 10px;
  font-size: 19px;
  line-height: 1.3;
}
.topic-card p,
.topic-card li {
  color: var(--muted);
  line-height: 1.5;
}
.delivery > ul {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.delivery > ul > li {
  display: grid;
  gap: 4px;
  margin: 0;
  min-height: 104px;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 13px;
  background: #fff;
  box-shadow: 0 1px 1px rgba(17, 17, 20, 0.04);
}
.delivery > ul > li span {
  color: var(--muted);
  line-height: 1.45;
}
.opportunity-finder {
  display: grid;
  gap: 16px;
  margin-bottom: 26px;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  padding: 30px 0;
}
.finder-head {
  display: grid;
  grid-template-columns: minmax(0, 0.72fr) auto;
  gap: 18px;
  align-items: end;
}
.finder-head h2 {
  margin: 0 0 8px;
  font-size: 24px;
  line-height: 1.2;
}
.finder-head p:not(.section-label):not(.result-count) {
  margin: 0;
  max-width: 760px;
  color: var(--muted);
  line-height: 1.5;
}
.finder-controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(240px, 340px);
  gap: 12px;
  align-items: stretch;
}
.source-picker,
.search-wrap {
  display: grid;
  gap: 10px;
  align-content: start;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 12px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: var(--shadow);
  backdrop-filter: blur(18px);
}
.control-label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--ink);
  font-size: 13px;
  font-weight: 800;
}
.control-label > span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: var(--accent);
  color: #fff;
  font-size: 12px;
}
.control-label label {
  font: inherit;
}
input[type="search"] {
  min-height: 48px;
  width: 100%;
  border: 1px solid #c8d0d7;
  border-radius: 6px;
  padding: 10px 12px;
  color: var(--ink);
  font: inherit;
  background: #fff;
}
input[type="search"]:focus {
  outline: 3px solid rgba(15, 107, 95, 0.14);
  border-color: var(--accent);
}
.filters {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}
.filter-button {
  position: relative;
  display: grid;
  gap: 4px;
  min-height: 96px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 12px;
  background: #fff;
  color: var(--muted);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: transform 160ms ease, border-color 160ms ease, background 160ms ease, box-shadow 160ms ease;
}
.filter-button:hover {
  transform: translateY(-2px);
  border-color: #b8c8d9;
  box-shadow: 0 10px 24px rgba(17, 17, 20, 0.07);
}
.filter-button.active {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
  box-shadow: inset 0 0 0 1px var(--accent), 0 14px 30px rgba(0, 113, 227, 0.1);
}
.filter-title {
  color: var(--ink);
  font-size: 15px;
  font-weight: 850;
  line-height: 1.2;
}
.filter-note {
  color: var(--muted);
  font-size: 12px;
  line-height: 1.35;
}
.filter-count {
  align-self: end;
  color: var(--accent);
  font-size: 12px;
  font-weight: 800;
}
.result-count {
  justify-self: end;
  margin: 0;
  white-space: nowrap;
  border: 1px solid #c8d0d7;
  border-radius: 999px;
  padding: 8px 11px;
  background: #fff;
  color: var(--ink);
  font-size: 13px;
  font-weight: 800;
  box-shadow: var(--shadow);
  transition: transform 180ms ease, background 180ms ease;
}
.result-count.bump {
  transform: scale(1.03);
  background: var(--accent-soft);
}
.opportunity-focus {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  margin-top: 12px;
  border: 1px solid rgba(17, 17, 20, 0.1);
  border-radius: 14px;
  padding: 14px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(248, 251, 250, 0.84)),
    radial-gradient(circle at 16% 14%, rgba(15, 107, 95, 0.11), transparent 32%);
  box-shadow: 0 16px 42px rgba(17, 17, 20, 0.08);
  backdrop-filter: blur(18px);
}
.opportunity-focus h3 {
  margin: 3px 0 6px;
  max-width: 680px;
  font-size: clamp(21px, 2.4vw, 30px);
  line-height: 1.12;
  letter-spacing: 0;
}
.opportunity-focus p {
  max-width: 740px;
  margin: 0;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.42;
}
.opportunity-focus-card {
  display: grid;
  gap: 10px;
  justify-items: end;
  min-width: min(260px, 100%);
}
.opportunity-focus-meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}
.opportunity-focus-meta span {
  border: 1px solid #dbe2e8;
  border-radius: 999px;
  padding: 4px 8px;
  background: #fff;
  color: var(--ink);
  font-size: 12px;
  font-weight: 850;
}
.signal-shelf {
  display: grid;
  gap: 16px;
  scroll-margin-top: 118px;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  padding: clamp(26px, 4vw, 46px) 0;
}
.signal-shelf-copy {
  display: grid;
  gap: 10px;
  max-width: 820px;
}
.signal-shelf-copy h2 {
  margin: 0;
  max-width: 680px;
  font-size: clamp(30px, 4.2vw, 50px);
  line-height: 1.05;
  letter-spacing: 0;
}
.signal-shelf-copy > p:not(.section-label) {
  margin: 0;
  max-width: 620px;
  color: var(--muted);
  font-size: 15px;
  line-height: 1.45;
}
.product-rule-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}
.product-rule-strip span {
  border: 1px solid rgba(17, 17, 20, 0.1);
  border-radius: 999px;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.78);
  color: var(--ink);
  font-size: 11px;
  font-weight: 850;
  box-shadow: 0 8px 20px rgba(17, 17, 20, 0.045);
}
.signal-shelf-board {
  display: grid;
  grid-template-columns: minmax(320px, 0.95fr) minmax(0, 1.05fr);
  gap: 10px;
  align-items: stretch;
}
.sample-signal-list {
  display: grid;
  gap: 8px;
}
.sample-signal-card.card {
  position: relative;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) 30px;
  gap: 9px;
  align-items: start;
  min-height: 0;
  padding: 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.86);
  cursor: pointer;
}
.sample-signal-card.card:hover,
.sample-signal-card.card:focus-visible {
  transform: translateY(-2px);
  border-color: rgba(0, 113, 227, 0.28);
  box-shadow: 0 18px 44px rgba(17, 17, 20, 0.09);
  outline: 0;
}
.sample-signal-card.card.is-focused {
  border-color: rgba(0, 113, 227, 0.62);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(247, 251, 255, 0.9)),
    radial-gradient(circle at 94% 10%, rgba(0, 113, 227, 0.09), transparent 30%);
  box-shadow: inset 0 0 0 1px rgba(0, 113, 227, 0.18), 0 20px 48px rgba(0, 113, 227, 0.09);
}
.sample-signal-rank {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: #f5f7f9;
  color: var(--muted);
  font-size: 11px;
  font-weight: 900;
}
.sample-signal-card.is-focused .sample-signal-rank {
  background: var(--blue);
  color: #fff;
}
.sample-signal-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 0 0 5px;
}
.sample-signal-meta span {
  border: 1px solid rgba(17, 17, 20, 0.08);
  border-radius: 999px;
  padding: 3px 6px;
  background: #fff;
  color: var(--muted);
  font-size: 10px;
  font-weight: 850;
}
.sample-signal-card h3 {
  display: -webkit-box;
  overflow: hidden;
  margin: 0 0 4px;
  color: var(--ink);
  font-size: 14px;
  line-height: 1.22;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
.sample-signal-card p:not(.sample-signal-meta) {
  display: -webkit-box;
  overflow: hidden;
  margin: 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.38;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
.sample-signal-link {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 1px solid rgba(17, 17, 20, 0.1);
  border-radius: 999px;
  color: var(--blue);
  text-decoration: none;
  font-weight: 900;
}
.signal-shelf .opportunity-focus {
  align-self: stretch;
  margin-top: 0;
  min-height: 100%;
}
.signal-shelf-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.signal-file-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  margin-top: -4px;
}
.signal-file-links a {
  color: var(--muted);
  font-size: 12px;
  font-weight: 760;
  text-decoration: none;
}
.signal-file-links a:hover {
  color: var(--accent);
}
.grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}
.opportunity-gallery {
  grid-template-columns: minmax(320px, 1.08fr) repeat(3, minmax(180px, 0.64fr));
  grid-auto-flow: dense;
  gap: 16px;
  align-items: stretch;
  border-top: 1px solid var(--line);
  padding-top: clamp(28px, 5vw, 56px);
  margin-top: 10px;
}
.gallery-header,
.gallery-footer {
  grid-column: 1 / -1;
}
.gallery-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 18px;
  align-items: end;
  margin-bottom: 4px;
}
.gallery-header h2 {
  max-width: 860px;
  margin: 0 0 8px;
  font-size: clamp(34px, 4.8vw, 64px);
  line-height: 0.98;
  letter-spacing: 0;
}
.gallery-header p:not(.section-label) {
  max-width: 680px;
  margin: 0;
  color: var(--muted);
  line-height: 1.5;
}
.gallery-count {
  display: grid;
  gap: 4px;
  min-width: 170px;
  border: 1px solid rgba(17, 17, 20, 0.08);
  border-radius: 12px;
  padding: 12px 14px;
  background: rgba(255,255,255,0.82);
  box-shadow: 0 12px 30px rgba(17, 17, 20, 0.06);
  text-align: right;
}
.gallery-count span {
  color: var(--muted);
  font-size: 12px;
  font-weight: 760;
}
.gallery-count strong {
  color: var(--blue);
  font-size: 14px;
}
.card {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 18px;
  min-height: 320px;
  box-shadow: var(--shadow);
  transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
}
.opportunity-gallery .card {
  position: relative;
  display: grid;
  align-content: start;
  min-height: 174px;
  overflow: hidden;
  border-radius: 14px;
  padding: 15px;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.96), rgba(249,250,252,0.9)),
    radial-gradient(circle at 88% 12%, rgba(0,113,227,0.08), transparent 28%);
  order: var(--gallery-order, 20);
  transition: transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease, opacity 200ms ease;
}
.opportunity-gallery .card::before {
  content: attr(data-rank);
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  margin-bottom: 10px;
  border: 1px solid rgba(17, 17, 20, 0.1);
  border-radius: 8px;
  background: #fff;
  color: var(--muted);
  font-size: 13px;
  font-weight: 850;
}
.opportunity-gallery .card::after {
  content: "";
  position: absolute;
  left: 15px;
  right: 15px;
  bottom: 12px;
  height: 4px;
  border-radius: 999px;
  background:
    linear-gradient(90deg, var(--blue) 0 var(--score-fill, 52%), rgba(17,17,20,0.1) var(--score-fill, 52%) 100%);
}
.opportunity-gallery .card.is-focused {
  grid-column: span 2;
  grid-row: span 2;
  min-height: 424px;
  border-color: rgba(0,113,227,0.72);
  padding: 26px;
  box-shadow: inset 0 0 0 1px rgba(0,113,227,0.42), 0 30px 72px rgba(17, 17, 20, 0.15);
}
.opportunity-gallery .card.is-focused::before {
  width: 36px;
  height: 36px;
  border-color: transparent;
  background: var(--blue);
  color: #fff;
  box-shadow: 0 10px 20px rgba(0,113,227,0.24);
}
.opportunity-gallery .card.is-focused::after {
  height: 5px;
  left: 26px;
  right: 26px;
  bottom: 18px;
}
.opportunity-gallery .card:not(.is-focused) {
  cursor: pointer;
}
.opportunity-gallery .card:not(.is-focused):hover {
  transform: translateY(-2px);
  border-color: rgba(0,113,227,0.24);
}
.opportunity-gallery .card:not(.is-focused) p,
.opportunity-gallery .card:not(.is-focused) .why,
.opportunity-gallery .card:not(.is-focused) .idea,
.opportunity-gallery .card:not(.is-focused) details {
  display: none;
}
.opportunity-gallery .card:not(.is-focused) .meta span:nth-child(n+4) {
  display: none;
}
.opportunity-gallery .meta > span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.opportunity-gallery .meta > span > span {
  border: 0;
  border-radius: 0;
  padding: 0;
  background: transparent;
  color: inherit;
  font-size: inherit;
}
.opportunity-gallery .card h3 a {
  color: inherit;
  text-decoration: none;
}
.opportunity-gallery .card h3 a:hover {
  color: var(--blue);
}
.opportunity-gallery .card:not(.is-focused) h3 {
  display: -webkit-box;
  overflow: hidden;
  margin-bottom: 22px;
  font-size: 16px;
  line-height: 1.28;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}
.opportunity-gallery .card.is-focused h3 {
  max-width: 610px;
  margin: 0 0 16px;
  font-size: clamp(28px, 3.8vw, 46px);
  line-height: 1.04;
}
.opportunity-gallery .card.is-focused p {
  max-width: 640px;
}
.opportunity-gallery .card.is-focused details {
  margin-bottom: 20px;
}
.gallery-footer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  margin-top: 2px;
}
.gallery-meter {
  height: 5px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(17,17,20,0.08);
}
.gallery-meter span {
  display: block;
  width: var(--gallery-progress, 8%);
  height: 100%;
  border-radius: inherit;
  background: var(--blue);
  transition: width 220ms ease;
}
.gallery-controls {
  display: flex;
  gap: 8px;
}
.gallery-step {
  display: grid;
  place-items: center;
  width: 38px;
  height: 34px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: #fff;
  color: var(--ink);
  font: inherit;
  font-size: 22px;
  cursor: pointer;
  transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
}
.gallery-step:hover {
  transform: translateY(-1px);
  border-color: rgba(0,113,227,0.28);
  box-shadow: 0 10px 24px rgba(17,17,20,0.08);
}
.card:hover {
  transform: translateY(-3px);
  border-color: #b8c8d9;
  box-shadow: 0 20px 46px rgba(17, 17, 20, 0.11);
}
.card:focus-visible {
  outline: 3px solid rgba(15, 107, 95, 0.18);
  outline-offset: 3px;
}
.card.is-focused {
  transform: translateY(-3px);
  border-color: var(--accent);
  box-shadow: inset 0 0 0 1px rgba(15, 107, 95, 0.5), 0 24px 54px rgba(17, 17, 20, 0.13);
}
.opportunity-gallery .card.is-focused {
  border-color: rgba(0,113,227,0.72);
  box-shadow: inset 0 0 0 1px rgba(0,113,227,0.42), 0 30px 72px rgba(17, 17, 20, 0.15);
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
.closing-handoff {
  grid-template-columns: minmax(260px, 0.38fr) minmax(0, 0.62fr);
  gap: clamp(22px, 5vw, 68px);
  align-items: center;
  margin-top: 38px;
  padding-top: clamp(42px, 7vw, 88px);
  border-top: 1px solid var(--line);
}
.closing-copy h2 {
  max-width: 640px;
  margin: 0 0 12px;
  font-size: clamp(36px, 5.2vw, 72px);
  line-height: 0.98;
  letter-spacing: 0;
}
.closing-copy p:not(.section-label) {
  max-width: 560px;
  color: var(--muted);
  font-size: 17px;
  line-height: 1.5;
}
.closing-badges {
  display: grid;
  gap: 14px;
  margin-top: 24px;
}
.closing-badges > span {
  position: relative;
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  border: 0;
  border-radius: 0;
  padding: 0;
  background: transparent;
  color: var(--ink);
  font-size: 15px;
  font-weight: 800;
}
.closing-badges > span::before {
  content: "";
  width: 28px;
  height: 28px;
  border: 1px solid rgba(0,113,227,0.2);
  border-radius: 8px;
  background:
    radial-gradient(circle at 50% 50%, rgba(0,113,227,0.22), transparent 34%),
    #fff;
  box-shadow: 0 8px 20px rgba(17,17,20,0.06);
}
.closing-key-hint {
  margin-top: 28px !important;
  color: var(--muted);
  font-size: 13px !important;
  font-weight: 720;
}
.closing-console {
  position: relative;
  display: grid;
  gap: 16px;
  min-width: 0;
  overflow: hidden;
  border: 1px solid rgba(17, 17, 20, 0.12);
  border-radius: 8px;
  padding: clamp(18px, 3vw, 34px);
  background:
    linear-gradient(135deg, rgba(255,255,255,0.98), rgba(245,248,252,0.9)),
    radial-gradient(circle at 88% 8%, rgba(0, 113, 227, 0.13), transparent 28%);
  color: var(--ink);
  box-shadow: 0 32px 86px rgba(17, 17, 20, 0.11);
}
.closing-console::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    linear-gradient(120deg, transparent 0 36%, rgba(255,255,255,0.72) 48%, transparent 60%),
    repeating-linear-gradient(135deg, rgba(255,255,255,0.22) 0 1px, transparent 1px 34px);
  opacity: 0.45;
  pointer-events: none;
}
.closing-console-top,
.final-action-switcher,
.final-action-panels {
  position: relative;
  z-index: 1;
}
.closing-console-top {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 12px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
}
.closing-console-top > span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.closing-console-top i {
  display: inline-block;
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: var(--accent);
  box-shadow: 0 0 0 6px rgba(0,113,227,0.08);
}
.closing-console-top strong {
  color: var(--ink);
}
.closing-console-top em {
  border: 1px solid rgba(15, 123, 99, 0.18);
  border-radius: 999px;
  padding: 5px 9px;
  background: rgba(15, 123, 99, 0.07);
  color: var(--success);
  font-style: normal;
}
.final-action-switcher {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0;
  border: 1px solid rgba(17,17,20,0.14);
  border-radius: 8px;
  overflow: hidden;
  background: rgba(255,255,255,0.7);
}
.final-action-button {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 3px 10px;
  align-items: center;
  min-height: 78px;
  border: 0;
  border-right: 1px solid rgba(17,17,20,0.1);
  border-radius: 0;
  padding: 14px 16px;
  background: transparent;
  color: var(--ink);
  text-align: left;
  cursor: pointer;
  transition: background 180ms ease, border-color 180ms ease, transform 180ms ease;
}
.final-action-button:last-child {
  border-right: 0;
}
.final-action-button:hover {
  background: rgba(0,113,227,0.04);
}
.final-action-button.active {
  box-shadow: inset 0 0 0 2px var(--accent);
  background: rgba(0,113,227,0.05);
  color: var(--ink);
}
.final-action-button em {
  grid-row: span 2;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 1px solid rgba(17,17,20,0.14);
  border-radius: 50%;
  color: var(--muted);
  font-size: 12px;
  font-style: normal;
  font-weight: 850;
}
.final-action-button.active em {
  border-color: var(--accent);
  color: var(--accent);
}
.final-action-button > span {
  font-size: 14px;
  font-weight: 850;
}
.final-action-button strong {
  color: inherit;
  font-size: 12px;
  line-height: 1.25;
  opacity: 0.72;
}
.final-action-panels {
  display: grid;
  border: 1px solid rgba(17,17,20,0.1);
  border-radius: 8px;
  background: rgba(255,255,255,0.7);
  overflow: hidden;
}
.final-action-panel {
  grid-area: 1 / 1;
  display: grid;
  align-content: end;
  grid-template-columns: minmax(0, 1fr) minmax(180px, 0.42fr);
  gap: 12px 26px;
  min-height: 330px;
  border: 0;
  border-radius: 0;
  padding: clamp(18px, 3vw, 28px);
  background: transparent;
  opacity: 0;
  visibility: hidden;
  transform: translateY(12px);
  transition: opacity 220ms ease, transform 220ms ease, visibility 220ms ease;
}
.final-action-panel.active {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}
.final-panel-kicker {
  grid-column: 1;
  margin: 0;
  color: var(--accent);
  font-size: 12px;
  font-weight: 850;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.final-action-panel h3 {
  grid-column: 1;
  max-width: 560px;
  margin: 0;
  color: var(--ink);
  font-size: clamp(28px, 4vw, 48px);
  line-height: 1.02;
}
.final-action-panel p:not(.final-panel-kicker) {
  grid-column: 1;
  max-width: 620px;
  margin: 0;
  color: var(--muted);
  line-height: 1.5;
}
.final-panel-visual {
  grid-column: 2;
  grid-row: 1 / span 4;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  align-self: center;
}
.final-panel-visual span {
  display: block;
  min-height: 118px;
  border: 1px solid rgba(17,17,20,0.08);
  border-radius: 8px;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.96), rgba(245,247,250,0.86)),
    linear-gradient(135deg, rgba(0,113,227,0.08), transparent 50%);
  box-shadow: 0 12px 26px rgba(17,17,20,0.06);
}
.final-panel-visual span:nth-child(2) {
  transform: translateY(10px);
}
.final-panel-visual span:nth-child(3) {
  transform: translateY(20px);
}
.final-progress-row {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 14px;
  align-items: center;
  color: var(--muted);
  font-weight: 800;
}
.final-progress-row strong {
  display: block;
  height: 4px;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--accent) 0 var(--final-progress, 33%), rgba(17,17,20,0.12) var(--final-progress, 33%) 100%);
}
.final-panel-actions {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.final-action-chips {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.final-action-chips > span {
  border: 1px solid rgba(17,17,20,0.08);
  border-radius: 8px;
  padding: 12px 14px;
  background: rgba(255,255,255,0.72);
  color: var(--muted);
  font-size: 13px;
  font-weight: 760;
}
.final-action-chips > span:first-child {
  color: var(--success);
}
.auth-hero .sub {
  max-width: 620px;
  color: #495263;
  font-size: clamp(18px, 2vw, 24px);
  line-height: 1.45;
}
.auth-hero {
  display: grid;
  grid-template-columns: minmax(300px, 0.42fr) minmax(420px, 0.58fr);
  gap: clamp(30px, 6vw, 82px);
  align-items: center;
  min-height: min(780px, 94svh);
  overflow: hidden;
  background: linear-gradient(180deg, #fff 0%, #f8f9fb 100%);
}
.auth-hero-copy {
  min-width: 0;
}
.auth-hero-copy h1 {
  max-width: 720px;
  margin-bottom: 18px;
  font-size: clamp(54px, 8vw, 104px);
  line-height: 0.93;
  letter-spacing: 0;
}
.auth-quick-logins {
  display: grid;
  gap: 12px;
  width: min(100%, 470px);
  margin: 30px 0 22px;
}
.auth-quick-login {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
  min-height: 62px;
  border: 1px solid rgba(17, 17, 20, 0.14);
  border-radius: 8px;
  padding: 10px 16px;
  background: rgba(255,255,255,0.88);
  color: var(--ink);
  font: inherit;
  font-size: 17px;
  font-weight: 780;
  text-align: left;
  cursor: pointer;
  box-shadow: 0 10px 30px rgba(17, 17, 20, 0.05);
  transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease, background 180ms ease, color 180ms ease;
}
.auth-quick-login.primary {
  border-color: var(--accent);
  background: var(--accent);
  color: #fff;
  box-shadow: 0 18px 42px rgba(0, 113, 227, 0.24);
}
.auth-quick-login:hover,
.auth-quick-login:focus-visible,
.auth-quick-login.visual-active {
  transform: translateY(-2px);
  border-color: rgba(0, 113, 227, 0.42);
  box-shadow: 0 18px 40px rgba(17, 17, 20, 0.1);
}
.auth-quick-login.primary:hover,
.auth-quick-login.primary:focus-visible,
.auth-quick-login.primary.visual-active {
  background: #0578ea;
  color: #fff;
  box-shadow: 0 22px 48px rgba(0, 113, 227, 0.3);
}
.auth-quick-login .provider-avatar {
  width: 42px;
  height: 42px;
}
.auth-hero-visual {
  position: relative;
  display: grid;
  gap: 0;
  min-width: 0;
  margin: 0;
  justify-self: stretch;
}
.auth-image-stack {
  position: relative;
  min-height: clamp(480px, 52vw, 660px);
  border: 1px solid rgba(17, 17, 20, 0.08);
  border-radius: 8px;
  background:
    linear-gradient(135deg, rgba(255,255,255,0.98), rgba(241,245,250,0.84)),
    linear-gradient(90deg, rgba(0,113,227,0.08), transparent 58%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.9), 0 34px 88px rgba(17, 17, 20, 0.12);
  overflow: hidden;
  transition: transform 220ms ease, box-shadow 220ms ease;
}
.auth-image-stack::after {
  content: "";
  position: absolute;
  inset: 0;
  background:
    linear-gradient(120deg, transparent 0 34%, rgba(255,255,255,0.62) 42%, transparent 54%),
    repeating-linear-gradient(135deg, rgba(255,255,255,0.28) 0 1px, transparent 1px 34px);
  opacity: 0.44;
  pointer-events: none;
}
.auth-hero-visual[data-ready="true"] .auth-image-stack,
.auth-hero-visual[data-ready="false"] .auth-image-stack {
  transform: translateY(-3px);
}
.auth-main-shot,
.auth-preview-card img,
.auth-setup-copy img {
  image-rendering: auto;
}
.auth-main-shot {
  position: relative;
  z-index: 1;
  display: block;
  width: min(84%, 720px);
  height: auto;
  margin: 58px 4% 0 auto;
  border: 1px solid rgba(17, 17, 20, 0.1);
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 28px 76px rgba(17, 17, 20, 0.16);
  transform: rotate(-2deg);
}
.auth-preview-card {
  position: absolute;
  z-index: 3;
  display: grid;
  gap: 9px;
  border: 1px solid rgba(17, 17, 20, 0.1);
  border-radius: 8px;
  padding: 10px;
  background: rgba(255,255,255,0.9);
  box-shadow: 0 20px 54px rgba(17, 17, 20, 0.14);
  backdrop-filter: blur(18px);
  transition: transform 180ms ease;
}
.auth-preview-card img {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 6px;
  background: #fff;
}
.auth-preview-card span {
  color: var(--ink);
  font-size: 13px;
  font-weight: 820;
}
.auth-preview-sample {
  left: clamp(10px, 4vw, 42px);
  bottom: clamp(82px, 14vw, 138px);
  width: min(46%, 360px);
}
.auth-preview-proof {
  right: clamp(8px, 4vw, 34px);
  bottom: clamp(24px, 5vw, 52px);
  width: min(42%, 330px);
}
.auth-hero-visual:hover .auth-preview-sample {
  transform: translateY(-5px) rotate(-1deg);
}
.auth-hero-visual:hover .auth-preview-proof {
  transform: translateY(-3px) rotate(1deg);
}
.auth-hero-visual figcaption {
  position: absolute;
  z-index: 4;
  right: clamp(16px, 4vw, 44px);
  top: clamp(18px, 4vw, 44px);
  display: grid;
  gap: 3px;
  width: min(46%, 390px);
  margin: 0;
  border: 1px solid rgba(255,255,255,0.54);
  border-radius: 8px;
  padding: 14px;
  background: rgba(255,255,255,0.78);
  box-shadow: var(--shadow);
  backdrop-filter: blur(18px);
  transition: border-color 180ms ease, transform 180ms ease;
}
.auth-hero-visual[data-ready="true"] figcaption {
  border-color: rgba(15, 123, 99, 0.32);
}
.auth-hero-visual[data-ready="false"] figcaption {
  border-color: rgba(0, 113, 227, 0.22);
}
.auth-hero-visual figcaption span {
  color: var(--accent);
  font-size: 12px;
  font-weight: 850;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.auth-hero-visual figcaption strong {
  font-size: 16px;
  line-height: 1.25;
}
.auth-hero-visual figcaption small {
  color: var(--muted);
  line-height: 1.35;
}
.auth-provider-orbit {
  position: absolute;
  z-index: 4;
  inset: auto auto 22px 24px;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: 6px;
  width: min(44%, 330px);
  pointer-events: none;
}
.auth-orbit-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid rgba(255,255,255,0.54);
  border-radius: 999px;
  background: rgba(255,255,255,0.74);
  box-shadow: 0 10px 24px rgba(17, 17, 20, 0.09);
  animation: authChipFloat 4.8s ease-in-out infinite;
  animation-delay: calc(var(--orbit-index) * -0.42s);
  backdrop-filter: blur(14px);
  transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
}
.auth-orbit-avatar.visual-active {
  border-color: rgba(0, 113, 227, 0.42);
  box-shadow: 0 14px 30px rgba(0, 113, 227, 0.16);
  transform: translateY(-5px) scale(1.08);
}
.auth-provider-rail {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(78px, 1fr));
  gap: 8px;
  align-items: stretch;
  width: min(100%, 1180px);
  margin: clamp(12px, 3vw, 28px) auto 0;
  border: 1px solid rgba(17, 17, 20, 0.1);
  border-radius: 8px;
  padding: 14px;
  background: rgba(255,255,255,0.82);
  box-shadow: 0 20px 58px rgba(17, 17, 20, 0.08);
  backdrop-filter: blur(16px);
}
.auth-rail-avatar {
  display: grid;
  place-items: center;
  gap: 8px;
  min-height: 92px;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 8px 6px;
  background: transparent;
  color: var(--ink);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: background 180ms ease, border-color 180ms ease, transform 180ms ease;
}
.auth-rail-avatar:hover,
.auth-rail-avatar:focus-visible,
.auth-rail-avatar.visual-active {
  border-color: rgba(0, 113, 227, 0.16);
  background: rgba(0, 113, 227, 0.06);
  transform: translateY(-2px);
}
.auth-rail-avatar .provider-avatar {
  width: 46px;
  height: 46px;
}
@keyframes authChipFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}
.auth-status-panel,
.auth-shell,
.auth-setup-note {
  display: grid;
  grid-template-columns: minmax(260px, 0.48fr) minmax(0, 1fr);
  gap: 24px;
  align-items: start;
  border-bottom: 1px solid var(--line);
  padding: 2px 0 24px;
  margin-bottom: 22px;
}
.auth-status-panel h2,
.auth-panel h2,
.auth-setup-note h2 {
  margin: 0 0 8px;
  font-size: 24px;
  line-height: 1.2;
}
.auth-status-panel p:not(.section-label),
.auth-panel p,
.auth-setup-note p {
  margin: 0;
  color: var(--muted);
  line-height: 1.5;
}
.account-card,
.auth-panel {
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
  box-shadow: var(--shadow);
}
.account-card {
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 14px;
}
.account-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 850;
}
.account-card small,
.auth-muted {
  display: block;
  color: var(--muted);
  line-height: 1.4;
}
.auth-panel {
  padding: 16px;
}
.section-head.compact {
  display: block;
  margin-bottom: 14px;
}
.provider-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.provider-button {
  position: relative;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  min-height: 82px;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 12px;
  background: #fff;
  color: var(--ink);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 180ms ease, background 180ms ease, box-shadow 180ms ease, transform 180ms ease;
}
.provider-button:hover,
.provider-button:focus-visible,
.provider-button.visual-active {
  border-color: rgba(0, 113, 227, 0.35);
  background: #fbfdff;
  box-shadow: 0 10px 26px rgba(17, 17, 20, 0.07);
  transform: translateY(-1px);
}
.provider-button.configured {
  border-color: #94aaa5;
  background: #fbfdfc;
}
.provider-button.configured.visual-active {
  border-color: rgba(15, 123, 99, 0.45);
}
.provider-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border: 1px solid rgba(17, 17, 20, 0.06);
  border-radius: 50%;
  background:
    radial-gradient(circle at 30% 24%, rgba(255,255,255,0.56), transparent 27%),
    linear-gradient(135deg, var(--provider-a), var(--provider-b));
  color: #fff;
  font-size: 13px;
  font-weight: 850;
  letter-spacing: 0;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.28), 0 8px 18px rgba(17, 17, 20, 0.09);
  transition: transform 180ms ease, box-shadow 180ms ease;
}
.provider-avatar span {
  line-height: 1;
}
.provider-avatar-small {
  width: 28px;
  height: 28px;
  font-size: 10px;
}
.provider-button:hover .provider-avatar,
.provider-button:focus-visible .provider-avatar,
.provider-button.visual-active .provider-avatar {
  transform: scale(1.05);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.32), 0 12px 22px rgba(17, 17, 20, 0.14);
}
.provider-button strong,
.provider-button small {
  display: block;
}
.provider-button small {
  margin-top: 3px;
  color: var(--muted);
  line-height: 1.35;
}
.provider-button em {
  position: static;
  grid-column: 2;
  justify-self: start;
  margin-top: -2px;
  border: 1px solid rgba(17, 17, 20, 0.08);
  border-radius: 999px;
  padding: 2px 7px;
  background: rgba(17, 17, 20, 0.03);
  color: var(--muted);
  font-size: 12px;
  font-style: normal;
  font-weight: 800;
  text-transform: uppercase;
}
.provider-button strong,
.provider-button small,
.auth-quick-login span,
.auth-rail-avatar span {
  overflow-wrap: normal;
  word-break: normal;
}
.email-login {
  display: grid;
  gap: 8px;
  margin-top: 14px;
}
.email-login label {
  color: var(--muted);
  font-size: 13px;
  font-weight: 700;
}
input[type="email"] {
  min-height: 42px;
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 8px 11px;
  color: var(--ink);
  font: inherit;
  background: #fff;
}
.auth-notice {
  margin-top: 14px !important;
  border: 1px solid var(--line);
  border-radius: 7px;
  padding: 10px 12px;
  background: #f7f9fb;
}
.auth-notice[data-tone="success"] {
  border-color: #94aaa5;
  background: var(--accent-soft);
  color: var(--accent);
}
.auth-notice[data-tone="warning"] {
  border-color: #d8b46d;
  background: #fff7e8;
  color: #7b4e0c;
}
.auth-notice[data-tone="danger"] {
  border-color: #d09a9a;
  background: #fff0f0;
  color: #8b2727;
}
.auth-setup-copy {
  display: grid;
  grid-template-columns: minmax(180px, 0.34fr) minmax(0, 1fr);
  gap: 16px;
  align-items: center;
}
.auth-setup-copy img {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 1200 / 630;
  object-fit: cover;
  min-width: 0;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #fff;
  box-shadow: var(--shadow);
}
@media (max-width: 960px) {
  .topbar,
  .offer,
  .fit-studio,
  .sample-preview,
  .product-proof,
  .visual-proof,
  .motion-proof,
  .signal-runway,
  .decision-flow,
  .decision-payoff,
  .contrast-lab,
  .planning-calculator,
  .section-head,
  .tier-grid,
  .delivery,
  .delivery > ul,
  .proof-ledger,
  .trust-dock,
  .seo-hub,
  .seo-summary,
  .feed-box,
  .archive-box,
  .issue-summary,
  .auth-status-panel,
  .auth-shell,
  .auth-setup-note,
  .account-card,
  .provider-grid,
  .order-copy,
  .mail-drafts,
  .topic-links,
  .topic-list,
  .issue-list,
  .finder-head,
  .finder-controls,
  .opportunity-focus,
  .handoff,
  .grid {
    grid-template-columns: 1fr;
  }
  .price { text-align: left; }
  .signal-shelf {
    gap: 12px;
    padding: 20px 0 24px;
  }
  .signal-shelf-board {
    grid-template-columns: 1fr;
  }
  .signal-shelf-copy h2 {
    font-size: clamp(25px, 7vw, 30px);
    line-height: 1.08;
  }
  .signal-shelf-copy > p:not(.section-label) {
    font-size: 13px;
    line-height: 1.38;
  }
  .signal-proof-strip {
    margin-top: 0;
  }
  .signal-proof-strip span {
    padding: 5px 8px;
    font-size: 11px;
  }
  .sample-signal-card.card {
    grid-template-columns: 30px minmax(0, 1fr) 28px;
    gap: 8px;
    padding: 9px;
  }
  .signal-shelf .opportunity-focus {
    min-height: 0;
  }
  .signal-shelf-actions .action {
    flex: 1 1 calc(50% - 4px);
    width: auto;
    min-width: 0;
    max-width: 100%;
    white-space: normal;
    text-align: center;
  }
  .opportunity-gallery {
    grid-template-columns: 1fr;
    gap: 12px;
    padding-top: 32px;
  }
  .gallery-header {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .gallery-header h2 {
    font-size: clamp(32px, 9vw, 44px);
  }
  .gallery-count {
    min-width: 0;
    text-align: left;
  }
  .opportunity-gallery .card,
  .opportunity-gallery .card.is-focused {
    grid-column: auto;
    grid-row: auto;
  }
  .opportunity-gallery .card {
    min-height: 132px;
    padding: 14px;
  }
  .opportunity-gallery .card::before {
    width: 28px;
    height: 28px;
    margin-bottom: 8px;
  }
  .opportunity-gallery .card::after {
    left: 14px;
    right: 14px;
    bottom: 10px;
  }
  .opportunity-gallery .card.is-focused {
    min-height: 420px;
    padding: 18px;
  }
  .opportunity-gallery .card.is-focused::after {
    left: 18px;
    right: 18px;
    bottom: 14px;
  }
  .opportunity-gallery .card.is-focused h3 {
    font-size: clamp(26px, 8vw, 36px);
  }
  .gallery-footer {
    grid-template-columns: 1fr;
  }
  .gallery-controls {
    justify-content: flex-end;
  }
  .fit-studio {
    gap: 18px;
  }
  .fit-copy h2 {
    font-size: clamp(32px, 9vw, 44px);
  }
  .fit-personas {
    grid-auto-flow: row;
    grid-auto-columns: initial;
    grid-template-columns: 1fr;
    overflow: visible;
    padding-bottom: 0;
    scroll-snap-type: none;
  }
  .fit-personas::-webkit-scrollbar {
    display: none;
  }
  .fit-persona {
    grid-template-columns: minmax(0, 1fr) 18px;
    gap: 4px 12px;
    min-height: 74px;
    scroll-snap-align: none;
  }
  .fit-persona::before {
    display: none;
  }
  .fit-persona::after {
    grid-column: 2;
    grid-row: 1 / span 3;
    align-self: center;
  }
  .fit-persona span,
  .fit-persona strong,
  .fit-persona small {
    grid-column: 1;
  }
  .fit-device {
    border-radius: 16px;
  }
  .fit-device-screen {
    min-height: 0;
    padding: 16px;
  }
  .fit-console-head {
    align-items: start;
  }
  .fit-matrix-head,
  .fit-matrix-row {
    grid-template-columns: minmax(92px, 1fr) repeat(3, minmax(48px, 0.42fr));
  }
  .fit-matrix strong,
  .fit-matrix span {
    padding: 0 8px;
  }
  .fit-matrix-head span {
    font-size: 11px;
  }
  .fit-matrix strong {
    font-size: 12px;
  }
  .fit-workbench {
    grid-template-columns: 1fr;
    min-height: 0;
    gap: 12px;
  }
  .fit-source-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .fit-source-list li {
    grid-template-columns: 22px minmax(0, 1fr);
  }
  .fit-source-list li em {
    grid-column: 1 / -1;
    width: 100%;
  }
  .fit-pipeline {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .fit-pipeline::before,
  .fit-pipeline::after {
    display: none;
  }
  .fit-signal-card {
    min-height: 0;
  }
  .fit-telemetry {
    grid-template-columns: 1fr;
  }
  .fit-studio.product-rules .fit-personas {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
    margin-top: 12px;
  }
  .fit-studio.product-rules .fit-persona {
    grid-template-columns: 1fr;
    gap: 4px;
    min-height: 0;
    padding: 10px;
    border-radius: 11px;
  }
  .fit-studio.product-rules .fit-persona::after {
    display: none;
  }
  .fit-studio.product-rules .fit-persona b {
    grid-column: 1;
    grid-row: auto;
    align-self: auto;
    font-size: 19px;
  }
  .fit-studio.product-rules .fit-persona strong {
    font-size: 14px;
  }
  .fit-studio.product-rules .fit-persona small {
    font-size: 11px;
    line-height: 1.2;
  }
  .fit-studio.product-rules .fit-device-screen {
    grid-template-columns: 1fr;
    gap: 10px;
    padding: 12px;
  }
  .fit-studio.product-rules .fit-console-head {
    grid-column: auto;
    grid-row: auto;
    display: flex;
    align-items: flex-end;
    border-right: 0;
    border-bottom: 1px solid rgba(17,17,20,0.08);
    padding-right: 0;
    padding-bottom: 10px;
  }
  .fit-studio.product-rules .fit-console-head strong {
    font-size: clamp(21px, 6vw, 27px);
  }
  .fit-studio.product-rules .fit-price {
    font-size: clamp(30px, 9vw, 40px);
    white-space: nowrap;
  }
  .fit-tier-rule,
  .fit-studio.product-rules .fit-preview-card {
    grid-column: auto;
    grid-row: auto;
  }
  .fit-studio.product-rules .fit-preview-card {
    padding: 12px;
  }
  .fit-studio.product-rules .fit-preview-card strong {
    font-size: 16px;
    line-height: 1.22;
  }
  .fit-studio.product-rules .fit-preview-card p {
    font-size: 12px;
    line-height: 1.4;
  }
  .fit-studio.product-rules .fit-telemetry {
    gap: 6px;
  }
  .fit-studio.product-rules .fit-telemetry span {
    padding: 9px 10px;
  }
  .sample-actions { justify-content: flex-start; }
  .sample-spotlight {
    grid-template-columns: 1fr;
    border-radius: 14px;
    padding: 10px;
  }
  .sample-spotlight-tabs {
    grid-auto-flow: column;
    grid-auto-columns: minmax(138px, 44vw);
    grid-template-columns: none;
    overflow-x: auto;
    padding-bottom: 2px;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }
  .sample-spotlight-tabs::-webkit-scrollbar {
    display: none;
  }
  .sample-spotlight-tab {
    min-height: 66px;
    padding: 9px;
    scroll-snap-align: start;
  }
  .sample-spotlight-tab span {
    width: 30px;
    height: 30px;
  }
  .sample-spotlight-stage {
    min-height: 360px;
  }
  .sample-spotlight-panel {
    padding: 16px;
  }
  .sample-spotlight-panel h3 {
    font-size: clamp(23px, 7vw, 31px);
  }
  .sample-spotlight-panel .action {
    width: 100%;
  }
  .feed-actions { justify-content: flex-start; }
  .opportunity-focus {
    gap: 10px;
    border-radius: 12px;
    padding: 11px;
  }
  .opportunity-focus h3 {
    display: -webkit-box;
    overflow: hidden;
    font-size: clamp(18px, 5.8vw, 22px);
    line-height: 1.12;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }
  .opportunity-focus-card {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
    justify-items: stretch;
    min-width: 0;
  }
  .opportunity-focus-meta {
    justify-content: flex-start;
  }
  .opportunity-focus .action {
    width: auto;
    min-height: 36px;
    padding: 0 14px;
    white-space: nowrap;
  }
  .product-proof {
    gap: 18px;
    padding-bottom: 30px;
  }
  .product-proof-copy h2 {
    font-size: clamp(32px, 9vw, 44px);
  }
  .product-proof-copy p:not(.section-label) {
    font-size: 16px;
  }
  .product-proof-points {
    grid-template-columns: 1fr;
  }
  .product-proof-visual {
    border-radius: 14px;
    padding: 8px;
  }
  .product-proof-visual figcaption {
    top: 14px;
    left: 14px;
  }
  .visual-proof img { justify-self: start; max-width: 100%; }
  .motion-preview { max-width: 100%; }
  .signal-runway {
    gap: 18px;
    padding-bottom: 30px;
  }
  .runway-copy h2 {
    font-size: clamp(30px, 8vw, 38px);
  }
  .runway-copy p:not(.section-label) {
    font-size: 15px;
  }
  .runway-console {
    border-radius: 18px;
    padding: 14px;
  }
  .runway-product {
    grid-template-columns: 1fr;
    min-height: 0;
  }
  .runway-line {
    width: 4px;
    height: 34px;
    justify-self: center;
  }
  .runway-line span {
    width: 100%;
    height: var(--runway-progress);
    background: linear-gradient(180deg, #7dd3fc, #0071e3);
    transition: height 320ms ease;
  }
  .runway-line::before,
  .runway-line::after {
    left: 50%;
    transform: translate(-50%, -50%);
  }
  .runway-line::before { top: 0; }
  .runway-line::after { top: 100%; right: auto; }
  .runway-card,
  .runway-panels {
    min-height: 160px;
    border-radius: 14px;
  }
  .runway-stages {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;
  }
  .runway-stage {
    grid-template-columns: 1fr;
    min-height: 56px;
    padding: 9px 7px;
    text-align: center;
  }
  .runway-stage span {
    grid-row: auto;
  }
  .runway-stage strong {
    align-self: center;
    font-size: 12px;
  }
  .runway-stage em {
    display: none;
  }
  .decision-flow {
    gap: 18px;
    padding-bottom: 28px;
  }
  .decision-copy h2 {
    font-size: clamp(29px, 8.5vw, 40px);
  }
  .decision-copy p:not(.section-label) {
    font-size: 16px;
  }
  .decision-panel {
    min-height: 0;
    border-radius: 14px;
    padding: 10px;
  }
  .product-tier-strip {
    grid-template-columns: 1fr;
    gap: 7px;
  }
  .product-tier-card {
    grid-template-columns: 28px minmax(0, 1fr) auto;
    align-items: center;
    min-height: 0;
    gap: 5px 9px;
    padding: 10px;
  }
  .product-tier-card span {
    grid-row: 1 / span 2;
  }
  .product-tier-card strong {
    font-size: 16px;
  }
  .product-tier-card b {
    font-size: 15px;
    white-space: nowrap;
  }
  .product-tier-card small {
    grid-column: 2 / -1;
    font-size: 11px;
  }
  .product-path {
    padding: 10px;
  }
  .product-path .pack-preview-head {
    align-items: flex-start;
    flex-direction: column;
    gap: 5px;
  }
  .product-path .pack-preview-head strong {
    white-space: normal;
  }
  .product-path-steps {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
  }
  .product-path-steps li {
    min-height: 84px;
    padding: 9px;
  }
  .flow-steps {
    grid-template-columns: 1fr;
    gap: 7px;
  }
  .flow-steps::before {
    top: 22px;
    bottom: 22px;
    left: 27px;
    right: auto;
    width: 2px;
    height: auto;
    background: linear-gradient(180deg, rgba(0,113,227,0.38), rgba(0,113,227,0.08));
  }
  .flow-step-button {
    grid-template-columns: 36px minmax(0, 1fr);
    align-items: center;
    min-height: 0;
    gap: 4px 11px;
    padding: 10px 11px;
  }
  .flow-step-button span {
    grid-row: 1 / span 2;
    width: 32px;
    height: 32px;
  }
  .flow-step-button strong {
    font-size: 18px;
  }
  .flow-step-button small {
    font-size: 12px;
  }
  .pack-preview {
    padding: 14px;
  }
  .pack-preview-title {
    font-size: 22px;
  }
  .pack-preview ul {
    grid-template-columns: 1fr;
    margin-top: 12px;
  }
  .pack-preview li {
    min-height: 0;
    border-radius: 10px;
    padding: 8px 10px;
  }
  .contrast-lab {
    gap: 16px;
    padding-bottom: 30px;
  }
  .contrast-copy h2 {
    font-size: clamp(30px, 9vw, 44px);
  }
  .contrast-copy p:not(.section-label) {
    font-size: 16px;
  }
  .contrast-panel {
    border-radius: 14px;
    padding: 12px;
  }
  .contrast-row {
    grid-template-columns: 1fr;
    gap: 6px;
  }
  .contrast-row strong {
    min-height: 0;
    padding: 8px 10px;
  }
  .contrast-row span {
    align-items: flex-start;
    min-height: 0;
    padding: 10px;
    font-size: 12px;
  }
  .contrast-panel[data-contrast-mode="before"] .after-copy,
  .contrast-panel[data-contrast-mode="after"] .before-copy {
    display: none;
  }
  .planning-calculator {
    gap: 16px;
    padding-bottom: 30px;
  }
  .calculator-copy h2 {
    font-size: clamp(30px, 9vw, 44px);
  }
  .calculator-copy p:not(.section-label) {
    font-size: 16px;
  }
  .calculator-panel {
    grid-template-columns: 1fr;
    border-radius: 14px;
    padding: 12px;
  }
  .range-control + .range-control,
  .calculator-result {
    grid-column: auto;
    grid-row: auto;
  }
  .calculator-result {
    min-height: 190px;
  }
  .tier-actions {
    grid-template-columns: 1fr;
  }
  .tier-grid {
    grid-template-columns: none;
    grid-auto-flow: column;
    grid-auto-columns: minmax(286px, 86vw);
    gap: 10px;
    overflow-x: auto;
    padding: 2px 0 8px;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }
  .tier-grid::-webkit-scrollbar {
    display: none;
  }
  .tier {
    min-height: 388px;
    scroll-snap-align: start;
  }
  .pricing-chooser {
    grid-template-columns: 1fr;
    border-radius: 14px;
    padding: 14px;
  }
  .pricing-studio .section-head {
    grid-template-columns: 1fr;
  }
  .pricing-studio .section-head h2 {
    font-size: clamp(28px, 8vw, 38px);
  }
  .pricing-studio .section-head p:not(.section-label) {
    font-size: 14px;
  }
  .pricing-proof-points {
    display: none;
  }
  .pricing-rail {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    overflow: hidden;
  }
  .pricing-rail-option {
    grid-template-columns: 1fr;
    gap: 3px;
    min-height: 88px;
    padding: 10px 8px;
    text-align: left;
  }
  .pricing-rail-option > span {
    width: auto;
    height: auto;
    place-items: start;
    border: 0;
    font-size: 11px;
  }
  .pricing-rail-option strong {
    font-size: 14px;
  }
  .pricing-rail-option small {
    font-size: 12px;
    line-height: 1.2;
  }
  .pricing-rail-option em {
    grid-column: 1;
    padding: 2px 6px;
    font-size: 10px;
  }
  .pricing-workbench {
    grid-template-columns: 1fr;
  }
  .pricing-chooser h3 {
    font-size: 22px;
  }
  .pricing-studio .pricing-chooser {
    position: relative;
    top: auto;
    grid-template-columns: 1fr;
    min-height: 0;
    border-radius: 14px;
    padding: 12px;
  }
  .pricing-studio .tier-grid {
    display: grid;
    grid-auto-flow: row;
    grid-auto-columns: auto;
    grid-template-columns: 1fr;
    overflow: visible;
    padding: 0;
  }
  .pricing-studio .pricing-data-store {
    display: none;
  }
  .pricing-studio .tier {
    min-height: 0;
    scroll-snap-align: none;
  }
  .pricing-studio .tier ul {
    grid-template-columns: 1fr;
  }
  .pricing-studio .tier-price {
    font-size: 30px;
  }
  .pricing-studio .pricing-configurator {
    grid-template-columns: 1fr;
    gap: 6px;
    margin-top: 10px;
  }
  .pricing-studio .pricing-configurator > div {
    min-height: 0;
    padding: 8px 9px;
  }
  .pricing-chooser-action {
    justify-items: stretch;
  }
  .pricing-studio .pricing-chooser-action strong {
    justify-content: flex-start;
    font-size: 30px;
  }
  .delivery-lab {
    gap: 16px;
    padding-bottom: 30px;
  }
  .delivery-copy {
    position: static;
  }
  .delivery-copy p:not(.section-label) {
    font-size: 15px;
  }
  .deliverable-viewer {
    border-radius: 14px;
    padding: 12px;
  }
  .deliverable-tabs {
    gap: 4px;
  }
  .deliverable-tab {
    min-height: 40px;
    gap: 5px;
    padding: 6px;
  }
  .deliverable-tab strong {
    font-size: 12px;
  }
  .deliverable-tab small {
    display: none;
  }
  .deliverable-screen {
    min-height: 344px;
    border-radius: 14px;
  }
  .deliverable-panel {
    inset: 12px;
    gap: 10px;
    padding: 16px;
    border-radius: 12px;
  }
  .deliverable-panel h3 {
    font-size: 22px;
  }
  .deliverable-lines {
    gap: 7px;
  }
  .deliverable-lines p {
    font-size: 12px;
  }
  .deliverable-proof-strip {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
    padding: 10px 12px;
  }
  .delivery-stack-footer {
    grid-template-columns: 1fr;
    gap: 6px;
  }
  .delivery-stack-footer small {
    white-space: normal;
  }
  .checkout-close {
    grid-template-columns: 1fr;
    gap: 18px;
    padding-top: 34px;
    padding-bottom: 34px;
  }
  .checkout-close-copy h2 {
    font-size: clamp(34px, 11vw, 52px);
  }
  .checkout-close-copy p:not(.section-label) {
    font-size: 16px;
  }
  .checkout-proof-row {
    gap: 7px;
    margin-top: 18px;
  }
  .checkout-proof-row span {
    padding: 7px 10px;
    font-size: 12px;
  }
  .checkout-close-panel {
    border-radius: 8px;
    padding: 12px;
  }
  .checkout-close-card {
    grid-template-columns: 30px minmax(0, 1fr);
    gap: 3px 10px;
    padding: 12px;
  }
  .checkout-close-card span {
    width: 26px;
    height: 26px;
  }
  .checkout-close-card strong {
    font-size: 16px;
    white-space: normal;
  }
  .checkout-close-card em {
    grid-column: 2;
    justify-self: start;
    white-space: normal;
  }
  .checkout-close-card small {
    grid-column: 2;
    font-size: 12px;
  }
  .delivery-lab > ul {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  .delivery-lab > ul > li {
    min-height: 100px;
    padding: 10px;
  }
  .delivery-lab > ul > li strong {
    font-size: 13px;
    line-height: 1.25;
  }
  .delivery-lab > ul > li span {
    font-size: 12px;
    line-height: 1.35;
  }
  .proof-ledger {
    gap: 16px;
    padding-bottom: 30px;
  }
  .proof-copy h2 {
    font-size: clamp(30px, 8vw, 40px);
  }
  .proof-copy p:not(.section-label) {
    font-size: 15px;
  }
  .proof-console {
    grid-template-columns: 1fr;
    border-radius: 14px;
    padding: 12px;
  }
  .proof-tabs {
    grid-auto-flow: column;
    grid-auto-columns: minmax(132px, 42vw);
    overflow-x: auto;
    padding-bottom: 2px;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }
  .proof-tabs::-webkit-scrollbar {
    display: none;
  }
  .proof-tab {
    min-height: 66px;
    padding: 10px;
    scroll-snap-align: start;
  }
  .proof-panels {
    min-height: 254px;
  }
  .proof-panel {
    padding: 16px;
  }
  .proof-panel h3 {
    font-size: clamp(24px, 7vw, 32px);
  }
  .trust-dock {
    gap: 18px;
    padding-top: 34px;
    margin-top: 28px;
  }
  .trust-dock-copy h2 {
    font-size: clamp(32px, 9vw, 46px);
  }
  .trust-dock-copy p:not(.section-label) {
    font-size: 16px;
  }
  .trust-dock-bullets {
    gap: 9px;
    margin-top: 18px;
  }
  .trust-dock-surface {
    border-radius: 16px;
  }
  .trust-dock-tabs {
    grid-auto-flow: column;
    grid-auto-columns: minmax(118px, 38vw);
    grid-template-columns: none;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }
  .trust-dock-tabs::-webkit-scrollbar {
    display: none;
  }
  .trust-dock-tab {
    min-height: 84px;
    padding: 16px 10px 14px;
    scroll-snap-align: start;
  }
  .trust-dock-tab span {
    font-size: 23px;
  }
  .trust-dock-tab strong {
    font-size: 12px;
  }
  .trust-dock-indicator {
    display: none;
  }
  .trust-dock-stage {
    min-height: 420px;
    padding: 14px;
  }
  .trust-dock-panel {
    grid-template-columns: 1fr;
    gap: 14px;
  }
  .trust-panel-copy {
    align-content: start;
  }
  .trust-panel-copy h3 {
    font-size: clamp(24px, 7vw, 32px);
  }
  .trust-link-grid {
    grid-template-columns: 1fr;
  }
  .trust-link-grid a {
    min-height: 86px;
  }
  .trust-live-list li {
    min-height: 42px;
  }
  .trust-live-list li strong {
    white-space: normal;
  }
  .trust-dock-metrics {
    padding: 12px 14px;
  }
  .trust-dock-metrics span {
    padding: 0 8px;
    font-size: 11px;
  }
  .trust-dock-metrics strong {
    overflow: visible;
    font-size: 16px;
    white-space: normal;
  }
  .auth-hero {
    grid-template-columns: 1fr;
    gap: 18px;
    min-height: 0;
  }
  .auth-hero-copy h1 {
    font-size: clamp(48px, 14vw, 72px);
  }
  .auth-quick-logins {
    width: 100%;
    margin: 22px 0 16px;
  }
  .auth-quick-login {
    min-height: 58px;
    font-size: 16px;
  }
  .auth-hero-visual {
    justify-self: stretch;
  }
  .auth-image-stack {
    min-height: 390px;
  }
  .auth-main-shot {
    width: 100%;
    max-height: 250px;
    margin: 58px 0 0;
    object-fit: cover;
    object-position: left top;
    border-radius: 8px;
    transform: none;
  }
  .auth-preview-card {
    padding: 8px;
  }
  .auth-preview-sample {
    left: 10px;
    bottom: 70px;
    width: min(54%, 230px);
  }
  .auth-preview-proof {
    right: 10px;
    bottom: 18px;
    width: min(48%, 210px);
  }
  .auth-hero-visual figcaption {
    right: 12px;
    left: 12px;
    top: 12px;
    width: auto;
    padding: 12px;
  }
  .auth-hero-visual figcaption strong {
    font-size: 14px;
  }
  .auth-hero-visual figcaption small {
    font-size: 12px;
  }
  .auth-provider-orbit {
    display: none;
  }
  .auth-provider-rail {
    grid-template-columns: none;
    grid-auto-flow: column;
    grid-auto-columns: minmax(74px, 82px);
    justify-content: start;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scroll-snap-type: x proximity;
    padding: 10px;
    gap: 5px;
  }
  .auth-rail-avatar {
    min-height: 82px;
    scroll-snap-align: start;
    font-size: 12px;
  }
  .auth-rail-avatar .provider-avatar {
    width: 40px;
    height: 40px;
  }
  .provider-avatar-small {
    width: 22px;
    height: 22px;
    font-size: 9px;
  }
  .auth-setup-copy {
    grid-template-columns: 1fr;
  }
  .auth-setup-copy img {
    max-height: 180px;
    object-fit: cover;
  }
  .closing-handoff {
    gap: 18px;
    padding-top: 30px;
  }
  .closing-copy h2 {
    font-size: clamp(32px, 9vw, 46px);
  }
  .closing-copy p:not(.section-label) {
    font-size: 16px;
  }
  .closing-console {
    border-radius: 8px;
    padding: 12px;
  }
  .closing-console-top {
    grid-template-columns: 1fr auto;
  }
  .closing-console-top em {
    grid-column: 1 / -1;
    width: fit-content;
  }
  .final-action-switcher {
    grid-auto-flow: column;
    grid-auto-columns: minmax(138px, 45vw);
    grid-template-columns: none;
    overflow-x: auto;
    padding-bottom: 2px;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }
  .final-action-switcher::-webkit-scrollbar {
    display: none;
  }
  .final-action-button {
    min-height: 68px;
    padding: 10px;
    scroll-snap-align: start;
  }
  .final-action-panel {
    grid-template-columns: 1fr;
    min-height: 318px;
    padding: 16px;
  }
  .final-panel-visual {
    grid-column: 1;
    grid-row: auto;
    order: -1;
  }
  .final-panel-visual span {
    min-height: 76px;
  }
  .final-action-panel h3 {
    font-size: clamp(25px, 7vw, 34px);
  }
  .final-action-chips {
    grid-template-columns: 1fr;
  }
  .final-panel-actions .action {
    flex: 1 1 100%;
    width: 100%;
    text-align: center;
  }
  .result-count { justify-self: stretch; margin: 0; white-space: normal; text-align: center; }
  .brandrow { align-items: flex-start; }
  .topbar {
    gap: 18px;
    padding: 24px clamp(20px, 5vw, 72px) 18px;
  }
  .local-nav {
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 10px;
    min-height: 50px;
    padding: 7px 20px;
  }
  .local-brand {
    font-size: 13px;
  }
  .local-links {
    justify-content: flex-start;
    gap: 14px;
    overflow-x: auto;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }
  .local-links::-webkit-scrollbar {
    display: none;
  }
  .local-cta {
    min-height: 28px;
    padding: 4px 10px;
  }
  .sample-drawer {
    align-items: end;
    padding: 10px;
  }
  .sample-drawer-panel {
    width: 100%;
    max-height: calc(100svh - 20px);
    border-radius: 18px;
    padding: 18px;
  }
  .drawer-head {
    padding-right: 38px;
  }
  .drawer-head h2 {
    font-size: clamp(28px, 9vw, 42px);
  }
  .sample-drawer-grid {
    grid-template-columns: 1fr;
  }
  .sample-drawer-card {
    min-height: 0;
  }
  .drawer-actions .action {
    flex: 1 1 100%;
    width: 100%;
  }
  .topbar > * {
    min-width: 0;
    max-width: 100%;
  }
  .language-switch { width: 100%; }
  .language-option { flex: 1 1 0; }
  .order-steps li { grid-template-columns: 1fr; }
  .mail-drafts pre { min-height: 180px; }
  h1 {
    width: 100%;
    max-width: 100%;
    font-size: clamp(31px, 8.8vw, 42px);
    line-height: 1.02;
    white-space: normal;
    word-break: break-word;
    overflow-wrap: anywhere;
  }
  .sub {
    width: 100%;
    max-width: 100%;
    font-size: 17px;
    white-space: normal;
    overflow-wrap: anywhere;
  }
  .hero-metrics {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    max-width: 100%;
    gap: 8px;
    margin-top: 18px;
  }
  .hero-tier-card {
    grid-template-columns: 1fr;
    gap: 8px;
    min-height: 80px;
    padding: 10px;
  }
  .hero-tier-number {
    width: 28px;
    height: 28px;
  }
  .hero-tier-copy strong {
    font-size: 12px;
  }
  .hero-tier-copy small {
    font-size: 11px;
  }
  .hero-tier-copy small b {
    display: block;
    margin: 0 0 2px;
    font-size: 15px;
  }
  .utility-links {
    display: none;
  }
  .scroll-cue {
    margin-top: 16px;
    align-self: flex-start;
  }
  body[data-lang="zh"] h1 {
    word-break: keep-all;
    overflow-wrap: normal;
  }
  .topbar aside,
  .source-mix-panel,
  .source-legend {
    min-width: 0;
    max-width: 100%;
  }
  .product-screen {
    max-height: 150px;
  }
  .product-screen img {
    min-height: 150px;
    object-fit: cover;
  }
  .topbar .source-mix-panel {
    display: none;
  }
  .topbar .product-visual {
    gap: 0;
  }
  .signal-ticker {
    display: none;
  }
  .board-summary {
    display: none;
  }
  .topbar aside span {
    min-width: 0;
    max-width: 100%;
  }
  .source-legend button {
    flex: 1 1 calc(50% - 5px);
  }
  .hero-actions .action,
  .handoff-links .action,
  .sample-actions .action,
  .feed-actions .action,
  .order-actions .action {
    flex: 1 1 100%;
    width: 100%;
    min-width: 0;
    max-width: 100%;
    white-space: normal;
    text-align: center;
    overflow-wrap: anywhere;
  }
  .filters { grid-template-columns: 1fr; }
  .filter-button { min-height: 86px; }
}

.topbar {
  --spotlight-x: 68%;
  --spotlight-y: 24%;
  overflow: hidden;
  color: #f5f5f7;
  background:
    linear-gradient(122deg, rgba(83, 184, 255, 0.28), transparent 34% 70%, rgba(43, 201, 142, 0.14)),
    linear-gradient(180deg, rgba(255,255,255,0.08), transparent 24%),
    linear-gradient(180deg, #07090d 0%, #141922 54%, #f5f5f7 100%);
  border-bottom: 0;
}
.topbar::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  background:
    linear-gradient(110deg, rgba(255,255,255,0.08), transparent 26% 70%, rgba(255,255,255,0.05)),
    linear-gradient(90deg, rgba(255,255,255,0.08), transparent 42%);
  opacity: 0.72;
  pointer-events: none;
}
.topbar::after {
  height: 42%;
  background: linear-gradient(180deg, rgba(245,245,247,0), rgba(245,245,247,0.94) 72%, #f5f5f7);
}
.topbar .brandline,
.topbar .sub,
.topbar .utility-links,
.topbar .scroll-cue {
  color: rgba(245, 245, 247, 0.72);
}
.topbar .brand-word,
.topbar .brand-lockup,
.topbar h1,
.topbar .hero-metrics strong,
.topbar aside strong {
  color: #fff;
}
.topbar h1 {
  max-width: 820px;
  font-weight: 850;
  text-wrap: balance;
  text-shadow: 0 18px 54px rgba(0,0,0,0.34);
}
.topbar .sub {
  max-width: 720px;
  font-weight: 520;
}
.topbar .brand-mark,
.topbar .language-switch,
.topbar .hero-tier-card,
.topbar .source-mix-panel,
.topbar .board-summary li {
  border-color: rgba(255,255,255,0.18);
  background: rgba(255,255,255,0.1);
  box-shadow: 0 18px 48px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.12);
  backdrop-filter: blur(24px) saturate(150%);
}
.topbar .brand-mark::before,
.topbar .brand-mark::after,
.topbar .brand-mark span {
  background: #fff;
}
.topbar .hero-tier-number {
  border-color: rgba(255,255,255,0.22);
  background: rgba(255,255,255,0.12);
  color: #fff;
}
.topbar .language-option { color: rgba(255,255,255,0.72); }
.topbar .language-option.active {
  background: rgba(255,255,255,0.9);
  color: #111114;
}
.topbar .hero-tier-card {
  color: rgba(255,255,255,0.74);
}
.topbar .hero-tier-card:hover,
.topbar .hero-tier-card.is-selected,
.topbar .hero-tier-card[aria-pressed="true"] {
  transform: translateY(-4px);
  border-color: rgba(255,255,255,0.34);
  background: rgba(255,255,255,0.16);
}
.topbar .hero-tier-card.is-selected,
.topbar .hero-tier-card[aria-pressed="true"] {
  box-shadow: 0 22px 54px rgba(0,113,227,0.2), inset 0 0 0 1px rgba(255,255,255,0.2);
}
.topbar .hero-tier-copy strong {
  color: #fff;
}
.topbar .hero-tier-copy small {
  color: rgba(245,245,247,0.82);
}
.topbar .action {
  border-color: rgba(255,255,255,0.2);
  background: rgba(255,255,255,0.12);
  color: #fff;
  box-shadow: 0 18px 42px rgba(0,0,0,0.22);
}
.topbar .action.primary {
  border-color: #fff;
  background: #fff;
  color: #111114;
}
.topbar .action.strong {
  border-color: rgba(255,255,255,0.22);
  background: rgba(0,0,0,0.42);
  color: #fff;
}
.topbar .utility-links a {
  border-color: rgba(255,255,255,0.26);
}
.topbar .utility-links a:hover {
  color: #fff;
  border-color: #fff;
}
.topbar .scroll-cue span {
  border-color: rgba(255,255,255,0.28);
}
.topbar .scroll-cue span::after {
  background: #fff;
}
.product-visual {
  position: relative;
  will-change: transform;
}
.product-visual::before,
.product-visual::after {
  content: "";
  position: absolute;
  inset: 9% -6% auto;
  z-index: -1;
  height: 58%;
  border-radius: 50%;
  background: linear-gradient(115deg, transparent 8%, rgba(92, 190, 255, 0.24), transparent 78%);
  filter: blur(22px);
  opacity: 0.76;
  pointer-events: none;
  transform: rotate(-4deg);
}
.product-visual::after {
  inset: auto 6% -9%;
  height: 34%;
  background: linear-gradient(90deg, transparent, rgba(33, 225, 160, 0.16), transparent);
  transform: rotate(2deg);
}
.product-screen {
  border-radius: 26px;
  border-color: rgba(255,255,255,0.28);
  background: linear-gradient(180deg, #202631, #080a0d);
  box-shadow: 0 44px 110px rgba(0,0,0,0.38), 0 0 0 1px rgba(255,255,255,0.11), inset 0 1px 0 rgba(255,255,255,0.2);
}
.product-screen img {
  transform: scale(1.012);
  transition: transform 700ms cubic-bezier(.2,.8,.2,1), filter 700ms ease;
}
.product-visual:hover .product-screen img {
  transform: scale(1.045);
  filter: saturate(1.08) contrast(1.04);
}
.product-visual[data-source-focus]:not([data-source-focus="all"]) .product-screen img {
  filter: saturate(1.12) contrast(1.06);
}
.signal-ticker span {
  border-color: rgba(255,255,255,0.2);
  background: rgba(4,8,12,0.72);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.12);
}
.source-mix-label,
.source-legend button.active,
.source-legend button:hover,
.source-legend button:focus-visible,
.board-summary em {
  color: #a8dcff;
}
.source-legend button {
  border-color: rgba(255,255,255,0.14);
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.72);
}
.source-legend button.active,
.source-legend button:hover,
.source-legend button:focus-visible {
  border-color: rgba(168,220,255,0.5);
  background: rgba(168,220,255,0.14);
}
.board-summary li.is-source-focused {
  border-color: rgba(168,220,255,0.56);
  box-shadow: 0 18px 38px rgba(83,184,255,0.16);
}
.local-nav {
  transition: min-height 220ms ease, background 220ms ease, box-shadow 220ms ease;
}
body.is-scrolled .local-nav {
  min-height: 48px;
  background: rgba(251,251,253,0.88);
  box-shadow: 0 10px 30px rgba(17,17,20,0.08);
}
.reveal-item {
  transform: translateY(28px) scale(0.992);
  filter: blur(8px);
}
.reveal-item.is-visible {
  transform: translateY(0) scale(1);
  filter: blur(0);
}
.product-map.reveal-item {
  transform: none;
  filter: none;
}
.sample-preview,
.product-proof,
.visual-proof,
.motion-proof,
.signal-runway,
.fit-studio,
.pricing-studio,
.delivery-lab,
.checkout-close {
  border-radius: 0;
}
.pricing-studio .tier.selected,
.checkout-close-card.primary,
.sample-spotlight-panel.active,
.deliverable-panel.active {
  box-shadow: 0 26px 70px rgba(17,17,20,0.12);
}
.decision-payoff {
  display: grid;
  grid-template-columns: minmax(300px, 0.48fr) minmax(360px, 0.52fr);
  gap: clamp(24px, 5vw, 70px);
  align-items: center;
  border-bottom: 1px solid var(--line);
  padding: 10px 0 42px;
  margin: 2px 0 34px;
}
.payoff-copy h2 {
  margin: 0 0 12px;
  max-width: 640px;
  font-size: clamp(34px, 4.6vw, 62px);
  line-height: 0.98;
}
.payoff-copy > p:not(.section-label) {
  margin: 0;
  max-width: 620px;
  color: var(--muted);
  font-size: 17px;
  line-height: 1.55;
}
.payoff-rules {
  display: grid;
  gap: 0;
  margin: 24px 0 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid var(--line);
}
.payoff-rules li {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  min-height: 54px;
  border-bottom: 1px solid var(--line);
}
.payoff-rules span {
  color: var(--accent);
  font-size: 12px;
  font-weight: 900;
}
.payoff-rules strong {
  color: var(--ink);
  font-size: 14px;
  line-height: 1.35;
}
.payoff-panel {
  border: 1px solid rgba(17,17,20,0.08);
  border-radius: 20px;
  padding: 16px;
  background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(247,249,252,0.82));
  box-shadow: 0 24px 80px rgba(17,17,20,0.08);
}
.payoff-switch {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}
.payoff-scenario {
  display: grid;
  align-content: center;
  gap: 6px;
  min-height: 76px;
  border: 1px solid var(--line);
  border-radius: 15px;
  padding: 12px;
  background: #fff;
  color: var(--muted);
  text-align: left;
  cursor: pointer;
  transition: border-color 180ms ease, color 180ms ease, transform 180ms ease, box-shadow 180ms ease, background 180ms ease;
}
.payoff-scenario span {
  font-size: 13px;
  font-weight: 850;
  line-height: 1.1;
}
.payoff-scenario strong {
  color: var(--ink);
  font-size: 15px;
  line-height: 1.1;
}
.payoff-scenario.active,
.payoff-scenario:hover,
.payoff-scenario:focus-visible {
  border-color: rgba(0,113,227,0.42);
  background: var(--accent-soft);
  color: var(--accent);
  transform: translateY(-1px);
  box-shadow: 0 12px 28px rgba(0,113,227,0.11);
}
.payoff-result {
  position: relative;
  display: grid;
  grid-template-columns: minmax(120px, 0.34fr) minmax(0, 0.66fr);
  gap: 16px;
  overflow: hidden;
  margin-top: 14px;
  border: 1px solid rgba(17,17,20,0.06);
  border-radius: 18px;
  padding: 18px;
  background: #f5f5f7;
}
.payoff-result::before {
  content: "";
  position: absolute;
  inset: 0 auto auto 0;
  width: var(--payoff-progress, 66%);
  height: 3px;
  background: linear-gradient(90deg, var(--accent), rgba(0,113,227,0.28));
  transition: width 240ms ease;
}
.payoff-metric {
  display: grid;
  align-content: center;
  gap: 2px;
}
.payoff-metric span {
  color: var(--muted);
  font-size: 12px;
  font-weight: 850;
  text-transform: uppercase;
}
.payoff-metric strong {
  color: var(--accent);
  font-size: clamp(44px, 6vw, 78px);
  line-height: 0.92;
  letter-spacing: 0;
}
.payoff-recommendation {
  display: grid;
  align-content: center;
  gap: 8px;
}
.payoff-recommendation em {
  color: var(--ink);
  font-style: normal;
  font-size: 18px;
  font-weight: 900;
}
.payoff-recommendation p {
  margin: 0;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.45;
}
.payoff-recommendation a {
  width: fit-content;
  color: var(--accent);
  font-size: 14px;
  font-weight: 900;
  text-decoration: none;
}
.payoff-path {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-top: 14px;
}
.payoff-path span {
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 8px 10px;
  color: var(--muted);
  background: #fff;
  font-size: 12px;
  font-weight: 850;
  text-align: center;
}
@media (max-width: 900px) {
  .topbar {
    min-height: auto;
    color: #f5f5f7;
    background:
      linear-gradient(122deg, rgba(83,184,255,0.26), transparent 48%),
      linear-gradient(180deg, #07090d 0%, #171d26 68%, #f5f5f7 100%);
  }
  .product-screen {
    border-radius: 18px;
  }
  .decision-payoff {
    grid-template-columns: 1fr;
    gap: 18px;
    padding-bottom: 30px;
  }
  .payoff-copy h2 {
    font-size: clamp(34px, 10vw, 50px);
  }
  .payoff-copy > p:not(.section-label) {
    font-size: 16px;
  }
  .payoff-panel {
    border-radius: 16px;
    padding: 12px;
  }
  .payoff-switch {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
  }
  .payoff-scenario {
    min-height: 64px;
    padding: 10px 8px;
    text-align: center;
  }
  .payoff-scenario span {
    font-size: 12px;
  }
  .payoff-scenario strong {
    font-size: 13px;
  }
  .payoff-result {
    grid-template-columns: minmax(88px, 0.32fr) minmax(0, 0.68fr);
    gap: 10px;
    padding: 14px;
  }
  .payoff-path {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;
  }
  .payoff-path span {
    padding: 7px 6px;
  }
}
`;

const app = `const cards = [...document.querySelectorAll(".card")];
const buttons = [...document.querySelectorAll("[data-source-filter]")];
const search = document.querySelector("#opportunity-search");
const resultCount = document.querySelector("#result-count");
const languageButtons = [...document.querySelectorAll("[data-language-toggle]")];
const translatable = [...document.querySelectorAll("[data-i18n-en][data-i18n-zh]")];
const placeholderTargets = [...document.querySelectorAll("[data-i18n-placeholder-en][data-i18n-placeholder-zh]")];
const closeHrefTargets = [...document.querySelectorAll("[data-close-href-en][data-close-href-zh]")];
const payoffButtons = [...document.querySelectorAll("[data-payoff-scenario]")];
const payoffNode = document.querySelector(".decision-payoff");
const payoffHours = document.querySelector("#payoff-hours");
const payoffTier = document.querySelector("#payoff-tier");
const payoffCopy = document.querySelector("#payoff-copy");
const videoCountInput = document.querySelector("#video-count");
const researchHoursInput = document.querySelector("#research-hours");
const videoCountOutput = document.querySelector("#video-count-output");
const researchHoursOutput = document.querySelector("#research-hours-output");
const savedHoursOutput = document.querySelector("#saved-hours");
const savedHoursCopy = document.querySelector("#saved-hours-copy");
const tierSuggestion = document.querySelector("#tier-suggestion");
const deliverableButtons = [...document.querySelectorAll("[data-deliverable-tab]")];
const deliverablePanels = [...document.querySelectorAll("[data-deliverable-panel]")];
const deliverableViewer = document.querySelector(".deliverable-viewer");
const deliverableStatus = document.querySelector("[data-deliverable-status]");
const proofButtons = [...document.querySelectorAll("[data-proof-tab]")];
const proofPanels = [...document.querySelectorAll("[data-proof-panel]")];
const trustDockButtons = [...document.querySelectorAll("[data-trust-dock]")];
const trustDockPanels = [...document.querySelectorAll("[data-trust-dock-panel]")];
const trustDockSurface = document.querySelector(".trust-dock-surface");
const finalActionButtons = [...document.querySelectorAll("[data-final-action]")];
const finalActionPanels = [...document.querySelectorAll("[data-final-panel]")];
const finalActionNode = document.querySelector(".closing-console");
const sampleSpotlightButtons = [...document.querySelectorAll("[data-sample-spotlight]")];
const sampleSpotlightPanels = [...document.querySelectorAll("[data-sample-spotlight-panel]")];
const fitPersonaButtons = [...document.querySelectorAll("[data-fit-persona]")];
const fitDeviceNode = document.querySelector(".fit-device");
const fitTitleNode = document.querySelector("#fit-title");
const fitPriceNode = document.querySelector("#fit-price");
const fitKitNode = document.querySelector("#fit-kit");
const fitCadenceNode = document.querySelector("#fit-cadence");
const fitSourceNode = document.querySelector("#fit-source");
const fitSignalNode = document.querySelector("#fit-signal");
const fitStrengthNode = document.querySelector("#fit-strength");
const fitVelocityNode = document.querySelector("#fit-velocity");
const fitProgressLabel = document.querySelector("#fit-progress-label");
const fitSignalLink = document.querySelector("#fit-signal-link");
const fitPreviewCopyNode = document.querySelector("#fit-preview-copy");
const fitMatrixColumns = [...document.querySelectorAll("[data-matrix-column]")];
const heroTierButtons = [...document.querySelectorAll("[data-hero-tier]")];
const tierCards = [...document.querySelectorAll("[data-tier-card]")];
const tierSelectButtons = [...document.querySelectorAll("[data-tier-select]")];
const tierRailButtons = [...document.querySelectorAll("[data-tier-jump]")];
const selectedTierName = document.querySelector("#selected-tier-name");
const selectedTierCopy = document.querySelector("#selected-tier-copy");
const selectedTierPrice = document.querySelector("#selected-tier-price");
const selectedTierCadence = document.querySelector("#selected-tier-cadence");
const selectedTierCommitment = document.querySelector("#selected-tier-commitment");
const selectedTierCta = document.querySelector("#selected-tier-cta");
const selectedTierPack = document.querySelector("#selected-tier-pack");
const selectedTierDelivery = document.querySelector("#selected-tier-delivery");
const selectedTierRoute = document.querySelector("#selected-tier-route");
const pricingChooserNode = document.querySelector(".pricing-chooser");
const pricingStudioNode = document.querySelector(".pricing-studio");
const tierDirectActions = [...document.querySelectorAll("[data-tier-direct]")];
const localNavNode = document.querySelector(".local-nav");
const opportunityGalleryNode = document.querySelector(".opportunity-gallery");
const galleryPositionNode = document.querySelector("#gallery-position");
const galleryActiveScoreNode = document.querySelector("#gallery-active-score");
const galleryStepButtons = [...document.querySelectorAll("[data-gallery-step]")];
const opportunityFocusTitle = document.querySelector("#opportunity-focus-title");
const opportunityFocusSummary = document.querySelector("#opportunity-focus-summary");
const opportunityFocusRank = document.querySelector("#opportunity-focus-rank");
const opportunityFocusSource = document.querySelector("#opportunity-focus-source");
const opportunityFocusScore = document.querySelector("#opportunity-focus-score");
const opportunityFocusLink = document.querySelector("#opportunity-focus-link");
let selectedTierCard = tierCards.find((card) => card.classList.contains("selected")) || tierCards[0] || null;
let activePayoffButton = payoffButtons.find((button) => button.classList.contains("active")) || payoffButtons[0] || null;
let activeFitPersonaButton = fitPersonaButtons.find((button) => button.classList.contains("active")) || fitPersonaButtons[0] || null;
let activeOpportunityCard = cards[0] || null;
let activeSource = "all";
const requestedLanguage = new URLSearchParams(window.location.search).get("lang");
const forcedLanguage = document.body.dataset.forceLang;
let currentLanguage = forcedLanguage || (requestedLanguage === "en" || requestedLanguage === "zh" ? requestedLanguage : localStorage.getItem("trendfoundry-language")) || document.body.dataset.defaultLang || "en";
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

function countLabel(count) {
  if (currentLanguage === "zh") return "正在显示 " + count + " 条机会";
  return count === 1 ? "Showing 1 opportunity" : "Showing " + count + " opportunities";
}

function updatePlanningCalculator() {
  if (!videoCountInput || !researchHoursInput || !savedHoursOutput) return;
  const videos = Number(videoCountInput.value || 2);
  const hours = Number(researchHoursInput.value || 2);
  const monthlySaved = Math.max(1, Math.round(videos * hours * 4.3 * 0.55));
  if (videoCountOutput) videoCountOutput.textContent = String(videos);
  if (researchHoursOutput) researchHoursOutput.textContent = String(hours);
  savedHoursOutput.textContent = monthlySaved + "h";
  if (savedHoursCopy) {
    savedHoursCopy.textContent = currentLanguage === "zh" ? "预计每月释放的规划时间" : "estimated planning time reclaimed each month";
  }
  if (tierSuggestion) {
    let suggestion = currentLanguage === "zh" ? "建议：单期样品" : "Suggested: Sample issue";
    if (videos >= 2 || monthlySaved >= 8) suggestion = currentLanguage === "zh" ? "建议：周更情报" : "Suggested: Weekly pipeline";
    if (videos >= 4 || hours >= 5) suggestion = currentLanguage === "zh" ? "建议：垂直定制" : "Suggested: Custom niche";
    tierSuggestion.textContent = suggestion;
  }
}

function updatePayoffScenario(button) {
  if (!button) return;
  activePayoffButton = button;
  for (const item of payoffButtons) {
    const active = item === button;
    item.classList.toggle("active", active);
    item.setAttribute("aria-selected", active ? "true" : "false");
  }
  const suffix = currentLanguage === "zh" ? "Zh" : "En";
  if (payoffNode) payoffNode.style.setProperty("--payoff-progress", (button.dataset.progress || "66") + "%");
  if (payoffHours) payoffHours.textContent = button.dataset.hours || "";
  if (payoffTier) payoffTier.textContent = button.dataset["tier" + suffix] || "";
  if (payoffCopy) payoffCopy.textContent = button.dataset["copy" + suffix] || "";
}

function updateSelectedTier(card, scrollToCard = false) {
  if (!card) return;
  selectedTierCard = card;
  for (const tierCard of tierCards) tierCard.classList.toggle("selected", tierCard === card);
  for (const railButton of tierRailButtons) {
    const active = railButton.dataset.tierJump === card.dataset.tierCard;
    railButton.classList.toggle("active", active);
    railButton.setAttribute("aria-selected", active ? "true" : "false");
  }
  for (const heroButton of heroTierButtons) {
    const active = heroButton.dataset.heroTier === card.dataset.tierCard;
    heroButton.classList.toggle("is-selected", active);
    heroButton.setAttribute("aria-pressed", active ? "true" : "false");
  }
  for (const button of tierSelectButtons) {
    const active = button.dataset.tierSelect === card.dataset.tierCard;
    button.classList.toggle("primary", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  }
  const suffix = currentLanguage === "zh" ? "Zh" : "En";
  if (selectedTierName) selectedTierName.textContent = card.dataset["tierName" + suffix] || "";
  if (selectedTierCopy) selectedTierCopy.textContent = card.dataset["tierBest" + suffix] || "";
  if (selectedTierPrice) selectedTierPrice.textContent = card.dataset.tierPrice || "";
  if (selectedTierCadence) selectedTierCadence.textContent = card.dataset["tierCadence" + suffix] || "";
  if (selectedTierCommitment) selectedTierCommitment.textContent = card.dataset["tierCommitment" + suffix] || "";
  if (selectedTierPack) selectedTierPack.textContent = card.dataset["tierPack" + suffix] || "";
  if (selectedTierDelivery) selectedTierDelivery.textContent = card.dataset["tierDelivery" + suffix] || "";
  if (selectedTierRoute) selectedTierRoute.textContent = card.dataset["tierRoute" + suffix] || "";
  if (selectedTierCta) {
    selectedTierCta.textContent = card.dataset["tierAction" + suffix] || selectedTierCta.textContent;
    selectedTierCta.setAttribute("href", card.dataset["tierHref" + suffix] || selectedTierCta.getAttribute("href") || "#");
  }
  if (pricingStudioNode) {
    const index = Number(card.dataset.tierIndex || 0);
    const progress = Math.round(((index + 1) / Math.max(1, tierCards.length)) * 100);
    pricingStudioNode.style.setProperty("--pricing-progress", progress + "%");
  }
  if (pricingChooserNode) {
    pricingChooserNode.classList.remove("is-updating");
    window.requestAnimationFrame(() => pricingChooserNode.classList.add("is-updating"));
    window.setTimeout(() => pricingChooserNode.classList.remove("is-updating"), 260);
  }
  for (const action of tierDirectActions) {
    action.setAttribute("href", action.dataset["tierHref" + suffix] || action.getAttribute("href") || "#");
  }
  if (scrollToCard && card.scrollIntoView) {
    card.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }
}

function activateFitPersona(button, scrollToButton = false) {
  if (!button) return;
  activeFitPersonaButton = button;
  for (const item of fitPersonaButtons) {
    const active = item === button;
    item.classList.toggle("active", active);
    item.setAttribute("aria-pressed", active ? "true" : "false");
    if (active && scrollToButton && item.scrollIntoView) item.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }
  const suffix = currentLanguage === "zh" ? "Zh" : "En";
  if (fitDeviceNode) {
    fitDeviceNode.dataset.fitDevice = button.dataset.fitPersona || "";
    fitDeviceNode.style.setProperty("--fit-progress", (button.dataset.fitProgress || "72") + "%");
    fitDeviceNode.classList.remove("is-switching");
    window.requestAnimationFrame(() => fitDeviceNode.classList.add("is-switching"));
    window.setTimeout(() => fitDeviceNode.classList.remove("is-switching"), 300);
  }
  for (const column of fitMatrixColumns) {
    column.classList.toggle("active", column.dataset.matrixColumn === (button.dataset.fitPersona || ""));
  }
  if (fitTitleNode) fitTitleNode.textContent = button.dataset["fitPack" + suffix] || "";
  if (fitPriceNode) fitPriceNode.textContent = button.dataset["fitPrice" + suffix] || "";
  if (fitKitNode) fitKitNode.textContent = button.dataset["fitKit" + suffix] || "";
  if (fitCadenceNode) fitCadenceNode.textContent = button.dataset["fitCadence" + suffix] || "";
  if (fitSourceNode) fitSourceNode.textContent = button.dataset["fitSource" + suffix] || "";
  if (fitSignalNode) fitSignalNode.textContent = button.dataset["fitSignal" + suffix] || "";
  if (fitPreviewCopyNode) fitPreviewCopyNode.textContent = button.dataset["fitCopy" + suffix] || "";
  if (fitStrengthNode) fitStrengthNode.textContent = button.dataset["fitRule" + suffix] || "";
  if (fitVelocityNode) fitVelocityNode.textContent = button.dataset["fitVelocity" + suffix] || "";
  if (fitProgressLabel) fitProgressLabel.textContent = (button.dataset.fitProgress || "72") + "%";
  if (fitSignalLink) fitSignalLink.setAttribute("href", button.dataset.fitUrl || "#");
}

function visibleOpportunityCards() {
  return cards.filter((card) => !card.classList.contains("hidden"));
}

function updateGalleryState(card) {
  if (!opportunityGalleryNode || !card) return;
  const visibleCards = visibleOpportunityCards();
  const activeIndex = Math.max(0, visibleCards.indexOf(card));
  const total = Math.max(1, visibleCards.length);
  for (const item of cards) {
    if (item.classList.contains("hidden")) {
      item.style.removeProperty("--gallery-order");
      continue;
    }
    const visibleIndex = visibleCards.indexOf(item);
    const offset = visibleIndex < activeIndex ? visibleIndex + total - activeIndex : visibleIndex - activeIndex;
    item.style.setProperty("--gallery-order", String(offset + 1));
    const score = Math.max(0, Math.min(100, Math.round(Number(item.dataset.focusScore || 0) / 2)));
    item.style.setProperty("--score-fill", score + "%");
  }
  opportunityGalleryNode.style.setProperty("--gallery-progress", Math.round(((activeIndex + 1) / total) * 100) + "%");
  if (galleryPositionNode) {
    galleryPositionNode.textContent = currentLanguage === "zh" ? "已选择 " + (activeIndex + 1) + " / " + total : (activeIndex + 1) + " of " + total + " selected";
  }
  if (galleryActiveScoreNode) {
    galleryActiveScoreNode.textContent = currentLanguage === "zh" ? "评分 " + (card.dataset.focusScore || "") : "Score " + (card.dataset.focusScore || "");
  }
}

function stepOpportunityGallery(direction) {
  const visibleCards = visibleOpportunityCards();
  if (!visibleCards.length) return;
  const currentIndex = Math.max(0, visibleCards.indexOf(activeOpportunityCard));
  const nextIndex = (currentIndex + direction + visibleCards.length) % visibleCards.length;
  const nextCard = visibleCards[nextIndex];
  updateOpportunityFocus(nextCard);
  if (nextCard.focus) nextCard.focus({ preventScroll: true });
  if (nextCard.scrollIntoView) nextCard.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
}

function updateOpportunityFocus(card) {
  if (!opportunityFocusTitle) return;
  activeOpportunityCard = card || null;
  for (const item of cards) item.classList.toggle("is-focused", item === activeOpportunityCard);
  const suffix = currentLanguage === "zh" ? "Zh" : "En";
  if (!activeOpportunityCard) {
    opportunityFocusTitle.textContent = currentLanguage === "zh" ? "没有匹配机会" : "No matching opportunity";
    opportunityFocusSummary.textContent = currentLanguage === "zh" ? "换一个来源或缩短搜索词，焦点机会会立刻回到这里。" : "Switch lanes or shorten the search query and the focused opportunity will return here.";
    if (opportunityFocusRank) opportunityFocusRank.textContent = "#0";
    if (opportunityFocusSource) opportunityFocusSource.textContent = currentLanguage === "zh" ? "空结果" : "Empty";
    if (opportunityFocusScore) opportunityFocusScore.textContent = currentLanguage === "zh" ? "评分 -" : "Score -";
    if (opportunityFocusLink) {
      opportunityFocusLink.setAttribute("href", "#opportunities");
      opportunityFocusLink.textContent = currentLanguage === "zh" ? "调整筛选" : "Adjust filters";
    }
    if (opportunityGalleryNode) opportunityGalleryNode.style.setProperty("--gallery-progress", "0%");
    return;
  }
  updateGalleryState(activeOpportunityCard);
  opportunityFocusTitle.textContent = activeOpportunityCard.dataset["focusTitle" + suffix] || "";
  opportunityFocusSummary.textContent = activeOpportunityCard.dataset["focusSummary" + suffix] || "";
  if (opportunityFocusRank) opportunityFocusRank.textContent = "#" + (activeOpportunityCard.dataset.rank || "");
  if (opportunityFocusSource) opportunityFocusSource.textContent = activeOpportunityCard.dataset.focusSource || "";
  if (opportunityFocusScore) opportunityFocusScore.textContent = (currentLanguage === "zh" ? "评分 " : "Score ") + (activeOpportunityCard.dataset.focusScore || "");
  if (opportunityFocusLink) {
    opportunityFocusLink.setAttribute("href", activeOpportunityCard.dataset.focusUrl || "#");
    opportunityFocusLink.textContent = currentLanguage === "zh" ? "打开来源" : "Open proof source";
  }
}

function setLanguage(language) {
  currentLanguage = language === "zh" ? "zh" : "en";
  document.body.dataset.lang = currentLanguage;
  document.documentElement.lang = currentLanguage === "zh" ? "zh-CN" : "en";
  localStorage.setItem("trendfoundry-language", currentLanguage);
  for (const node of translatable) {
    node.textContent = node.dataset[currentLanguage === "zh" ? "i18nZh" : "i18nEn"];
  }
  for (const node of placeholderTargets) {
    node.setAttribute("placeholder", node.dataset[currentLanguage === "zh" ? "i18nPlaceholderZh" : "i18nPlaceholderEn"]);
  }
  for (const node of closeHrefTargets) {
    node.setAttribute("href", node.dataset[currentLanguage === "zh" ? "closeHrefZh" : "closeHrefEn"]);
  }
  for (const button of languageButtons) {
    button.classList.toggle("active", button.dataset.languageToggle === currentLanguage);
  }
  const visible = [...cards].filter((card) => !card.classList.contains("hidden")).length;
  if (resultCount) resultCount.textContent = countLabel(visible);
  updatePlanningCalculator();
  updatePayoffScenario(activePayoffButton);
  updateSelectedTier(selectedTierCard);
  activateFitPersona(activeFitPersonaButton);
  updateOpportunityFocus(activeOpportunityCard);
  const activeDeliverable = deliverableButtons.find((button) => button.classList.contains("active")) || deliverableButtons[0];
  if (activeDeliverable) activateDeliverableTab(activeDeliverable.dataset.deliverableTab);
  const activeTrustDock = trustDockButtons.find((button) => button.classList.contains("active")) || trustDockButtons[0];
  if (activeTrustDock) activateTrustDock(activeTrustDock.dataset.trustDock);
}

function applyFilters() {
  const query = (search?.value || "").trim().toLowerCase();
  let visible = 0;
  for (const card of cards) {
    const sourceMatch = activeSource === "all" || card.dataset.source === activeSource;
    const textMatch = !query || card.dataset.search.includes(query);
    const show = sourceMatch && textMatch;
    card.classList.toggle("hidden", !show);
    if (show) visible += 1;
  }
  const firstVisible = cards.find((card) => !card.classList.contains("hidden"));
  if (!activeOpportunityCard || activeOpportunityCard.classList.contains("hidden")) {
    updateOpportunityFocus(firstVisible || null);
  } else {
    updateGalleryState(activeOpportunityCard);
  }
  if (resultCount) {
    resultCount.textContent = countLabel(visible);
    resultCount.classList.remove("bump");
    window.requestAnimationFrame(() => resultCount.classList.add("bump"));
    window.setTimeout(() => resultCount.classList.remove("bump"), 220);
  }
}

for (const card of cards) {
  card.addEventListener("pointerenter", () => updateOpportunityFocus(card));
  card.addEventListener("focusin", () => updateOpportunityFocus(card));
  card.addEventListener("click", (event) => {
    if (event.target.closest("a, summary, details")) return;
    updateOpportunityFocus(card);
  });
}
for (const button of galleryStepButtons) {
  button.addEventListener("click", () => stepOpportunityGallery(button.dataset.galleryStep === "prev" ? -1 : 1));
}
if (opportunityGalleryNode) {
  opportunityGalleryNode.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    stepOpportunityGallery(event.key === "ArrowRight" ? 1 : -1);
  });
}

for (const button of buttons) {
  button.addEventListener("click", () => {
    activeSource = button.dataset.sourceFilter;
    for (const other of buttons) {
      const active = other === button;
      other.classList.toggle("active", active);
      other.setAttribute("aria-pressed", active ? "true" : "false");
    }
    applyFilters();
  });
}

for (const button of languageButtons) {
  button.addEventListener("click", () => setLanguage(button.dataset.languageToggle));
}

for (const button of payoffButtons) {
  button.addEventListener("click", () => updatePayoffScenario(button));
  button.addEventListener("focusin", () => updatePayoffScenario(button));
  if (finePointer) button.addEventListener("pointerenter", () => updatePayoffScenario(button));
}

for (const button of tierSelectButtons) {
  button.addEventListener("click", () => {
    const card = tierCards.find((item) => item.dataset.tierCard === button.dataset.tierSelect);
    updateSelectedTier(card, true);
  });
}
for (const button of tierRailButtons) {
  button.addEventListener("click", () => {
    const card = tierCards.find((item) => item.dataset.tierCard === button.dataset.tierJump);
    updateSelectedTier(card, true);
  });
  if (finePointer) button.addEventListener("pointerenter", () => {
    const card = tierCards.find((item) => item.dataset.tierCard === button.dataset.tierJump);
    updateSelectedTier(card);
  });
}
for (const button of heroTierButtons) {
  button.addEventListener("click", () => {
    const card = tierCards.find((item) => item.dataset.tierCard === button.dataset.heroTier);
    updateSelectedTier(card, false);
    const pricingNode = document.querySelector("#pricing");
    if (pricingNode?.scrollIntoView) pricingNode.scrollIntoView({ block: "start", behavior: "smooth" });
  });
  if (finePointer) button.addEventListener("pointerenter", () => {
    const card = tierCards.find((item) => item.dataset.tierCard === button.dataset.heroTier);
    updateSelectedTier(card);
  });
}
if (pricingStudioNode) {
  pricingStudioNode.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const currentIndex = Math.max(0, tierCards.indexOf(selectedTierCard));
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (currentIndex + delta + tierCards.length) % tierCards.length;
    event.preventDefault();
    updateSelectedTier(tierCards[nextIndex], true);
  });
}

for (const button of fitPersonaButtons) {
  button.addEventListener("click", () => activateFitPersona(button, true));
  if (finePointer) button.addEventListener("pointerenter", () => activateFitPersona(button));
  button.addEventListener("focusin", () => activateFitPersona(button));
}

if (search) search.addEventListener("input", applyFilters);
if (videoCountInput) videoCountInput.addEventListener("input", updatePlanningCalculator);
if (researchHoursInput) researchHoursInput.addEventListener("input", updatePlanningCalculator);
setLanguage(currentLanguage);
if (selectedTierCard && window.location.hash === "#pricing") {
  window.requestAnimationFrame(() => updateSelectedTier(selectedTierCard, true));
}
const revealTargets = [...document.querySelectorAll("main > section, .topbar > div, .topbar aside")];
for (const [index, target] of revealTargets.entries()) {
  target.classList.add("reveal-item");
  target.style.setProperty("--reveal-delay", Math.min(index % 5, 4) * 42 + "ms");
}
if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    }
  }, { threshold: 0.14 });
  for (const target of revealTargets) revealObserver.observe(target);
} else {
  for (const target of revealTargets) target.classList.add("is-visible");
}

const flowSteps = [...document.querySelectorAll("[data-flow-step]")];
function activateFlowStep(step) {
  for (const item of flowSteps) {
    const isCurrent = item === step;
    item.classList.toggle("is-current", isCurrent);
    const button = item.querySelector("button");
    if (button) button.setAttribute("aria-pressed", String(isCurrent));
  }
}
for (const step of flowSteps) {
  const button = step.querySelector("button");
  if (button) {
    button.setAttribute("aria-pressed", String(step.classList.contains("is-current")));
    button.addEventListener("click", () => activateFlowStep(step));
  }
}

const contrastButtons = [...document.querySelectorAll("[data-contrast-set]")];
for (const button of contrastButtons) {
  button.addEventListener("click", () => {
    const panel = button.closest(".contrast-panel");
    if (!panel) return;
    const mode = button.dataset.contrastSet === "before" ? "before" : "after";
    panel.dataset.contrastMode = mode;
    for (const other of panel.querySelectorAll("[data-contrast-set]")) {
      other.classList.toggle("active", other === button);
    }
  });
}

function activateDeliverableTab(id, scrollToButton = false) {
  const activeIndex = Math.max(0, deliverableButtons.findIndex((button) => button.dataset.deliverableTab === id));
  const total = Math.max(1, deliverableButtons.length);
  const compactStack = window.innerWidth < 640;
  const xStep = compactStack ? 18 : 34;
  const yStep = compactStack ? 9 : 15;
  if (deliverableViewer) {
    deliverableViewer.dataset.activeDeliverable = id;
    deliverableViewer.style.setProperty("--delivery-progress", Math.round(((activeIndex + 1) / total) * 100) + "%");
  }
  for (const [index, button] of deliverableButtons.entries()) {
    const active = button.dataset.deliverableTab === id;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
    if (active) {
      if (deliverableStatus) {
        const suffix = currentLanguage === "zh" ? "Zh" : "En";
        deliverableStatus.textContent = button.dataset["deliverableStatus" + suffix] || button.textContent.trim();
      }
      if (scrollToButton && button.scrollIntoView) button.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
    }
  }
  for (const panel of deliverablePanels) {
    const panelIndex = Number(panel.dataset.deliverableIndex || 0);
    let offset = panelIndex - activeIndex;
    if (offset < 0) offset += total;
    panel.classList.toggle("active", panel.dataset.deliverablePanel === id);
    panel.style.setProperty("--stack-x", offset * xStep + "px");
    panel.style.setProperty("--stack-y", offset * yStep + "px");
    panel.style.setProperty("--stack-rotate", offset * -1.2 + "deg");
    panel.style.setProperty("--stack-scale", String(Math.max(0.88, 1 - offset * 0.035)));
    panel.style.setProperty("--stack-order", String(total - offset));
  }
}
for (const button of deliverableButtons) {
  button.addEventListener("click", () => activateDeliverableTab(button.dataset.deliverableTab, true));
}
if (deliverableViewer && deliverableButtons.length) {
  deliverableViewer.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const currentIndex = Math.max(0, deliverableButtons.findIndex((button) => button.classList.contains("active")));
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (currentIndex + delta + deliverableButtons.length) % deliverableButtons.length;
    const nextButton = deliverableButtons[nextIndex];
    activateDeliverableTab(nextButton.dataset.deliverableTab, true);
    nextButton.focus({ preventScroll: true });
  });
  window.addEventListener("resize", () => {
    const activeButton = deliverableButtons.find((button) => button.classList.contains("active")) || deliverableButtons[0];
    activateDeliverableTab(activeButton.dataset.deliverableTab);
  });
  activateDeliverableTab((deliverableButtons[0] || {}).dataset?.deliverableTab || "brief");
}

function activateProofTab(id) {
  for (const button of proofButtons) {
    const active = button.dataset.proofTab === id;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  }
  for (const panel of proofPanels) {
    panel.classList.toggle("active", panel.dataset.proofPanel === id);
  }
}
for (const button of proofButtons) {
  button.addEventListener("click", () => activateProofTab(button.dataset.proofTab));
}

function activateTrustDock(id, scrollToButton = false) {
  const activeIndex = Math.max(0, trustDockButtons.findIndex((button) => button.dataset.trustDock === id));
  if (trustDockSurface) {
    trustDockSurface.dataset.activeTrustDock = id;
    trustDockSurface.style.setProperty("--trust-indicator-x", (activeIndex - 1) * 100 + "%");
  }
  for (const button of trustDockButtons) {
    const active = button.dataset.trustDock === id;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
    if (active && scrollToButton && button.scrollIntoView) button.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }
  for (const panel of trustDockPanels) {
    panel.classList.toggle("active", panel.dataset.trustDockPanel === id);
  }
}
for (const button of trustDockButtons) {
  button.addEventListener("click", () => activateTrustDock(button.dataset.trustDock, true));
}
if (trustDockSurface && trustDockButtons.length) {
  trustDockSurface.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const currentIndex = Math.max(0, trustDockButtons.findIndex((button) => button.classList.contains("active")));
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (currentIndex + delta + trustDockButtons.length) % trustDockButtons.length;
    const nextButton = trustDockButtons[nextIndex];
    activateTrustDock(nextButton.dataset.trustDock, true);
    nextButton.focus({ preventScroll: true });
  });
  activateTrustDock((trustDockButtons.find((button) => button.classList.contains("active")) || trustDockButtons[0]).dataset.trustDock);
}

function activateFinalAction(id) {
  const activeButton = finalActionButtons.find((button) => button.dataset.finalAction === id);
  for (const button of finalActionButtons) {
    const active = button.dataset.finalAction === id;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
    if (active && button.scrollIntoView) button.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }
  for (const panel of finalActionPanels) {
    panel.classList.toggle("active", panel.dataset.finalPanel === id);
  }
  if (finalActionNode && activeButton) {
    const index = Number(activeButton.dataset.finalIndex || 0);
    const progress = Math.round(((index + 1) / Math.max(1, finalActionButtons.length)) * 100);
    finalActionNode.style.setProperty("--final-progress", progress + "%");
  }
}
for (const button of finalActionButtons) {
  button.addEventListener("click", () => activateFinalAction(button.dataset.finalAction));
}
if (finalActionNode) {
  finalActionNode.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const currentIndex = Math.max(0, finalActionButtons.findIndex((button) => button.classList.contains("active")));
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (currentIndex + delta + finalActionButtons.length) % finalActionButtons.length;
    event.preventDefault();
    activateFinalAction(finalActionButtons[nextIndex].dataset.finalAction);
  });
}

function activateSampleSpotlight(index, scrollToButton = true) {
  for (const button of sampleSpotlightButtons) {
    const active = button.dataset.sampleSpotlight === String(index);
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
    if (active && scrollToButton && button.scrollIntoView) button.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }
  for (const panel of sampleSpotlightPanels) {
    panel.classList.toggle("active", panel.dataset.sampleSpotlightPanel === String(index));
  }
}
for (const button of sampleSpotlightButtons) {
  button.addEventListener("click", () => activateSampleSpotlight(button.dataset.sampleSpotlight));
}

const localLinks = [...document.querySelectorAll("[data-local-link]")];
const localSections = localLinks
  .map((link) => ({ link, section: document.getElementById(link.dataset.localLink) }))
  .filter((item) => item.section);
function setActiveLocalLink(id) {
  for (const item of localSections) {
    item.link.classList.toggle("active", item.section.id === id);
  }
}
if ("IntersectionObserver" in window && localSections.length) {
  const localObserver = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
    if (visible[0]) setActiveLocalLink(visible[0].target.id);
  }, { rootMargin: "-20% 0px -58% 0px", threshold: [0.02, 0.2, 0.45] });
  for (const item of localSections) localObserver.observe(item.section);
  setActiveLocalLink(localSections[0].section.id);
}

function updateLocalProgress() {
  if (!localNavNode) return;
  const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const progress = Math.min(1, Math.max(0, window.scrollY / scrollable));
  localNavNode.style.setProperty("--scroll-progress", (progress * 100).toFixed(2) + "%");
}
updateLocalProgress();
window.addEventListener("scroll", updateLocalProgress, { passive: true });
window.addEventListener("resize", updateLocalProgress);

const sampleDrawerNode = document.querySelector("#sample-drawer");
const sampleOpenButtons = [...document.querySelectorAll("[data-sample-open]")];
const sampleCloseButtons = [...document.querySelectorAll("[data-sample-close]")];
function setSampleDrawer(open) {
  if (!sampleDrawerNode) return;
  sampleDrawerNode.setAttribute("aria-hidden", open ? "false" : "true");
  document.body.classList.toggle("drawer-open", open);
  if (open) {
    const closeButton = sampleDrawerNode.querySelector(".drawer-close");
    if (closeButton) closeButton.focus();
  }
}
for (const button of sampleOpenButtons) {
  button.addEventListener("click", () => setSampleDrawer(true));
}
for (const button of sampleCloseButtons) {
  button.addEventListener("click", () => setSampleDrawer(false));
}
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setSampleDrawer(false);
});

const hero = document.querySelector(".topbar");
const productVisualNode = document.querySelector(".product-visual");
const motionSafe = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const heroMetricValues = [...document.querySelectorAll("[data-hero-count]")];
const sourceLensButtons = [...document.querySelectorAll("[data-source-lens]")];
const sourceLensWrap = document.querySelector(".source-legend");
const boardSummaryItems = [...document.querySelectorAll("[data-board-source]")];
const runwayNode = document.querySelector(".signal-runway");
const runwayConsole = document.querySelector(".runway-console");
const runwayButtons = [...document.querySelectorAll("[data-runway-stage]")];
const runwayPanels = [...document.querySelectorAll("[data-runway-panel]")];
let runwayAutoTimer = 0;
let runwayUserPaused = false;

let selectedSourceLens = "all";
function renderSourceLens(source) {
  const activeSource = source || "all";
  const hasMatch = activeSource === "all" || boardSummaryItems.some((item) => item.dataset.boardSource === activeSource);
  for (const button of sourceLensButtons) {
    const active = button.dataset.sourceLens === activeSource;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  }
  for (const item of boardSummaryItems) {
    const focused = hasMatch && activeSource !== "all" && item.dataset.boardSource === activeSource;
    item.classList.toggle("is-source-focused", focused);
    item.classList.toggle("is-source-dimmed", hasMatch && activeSource !== "all" && !focused);
  }
  if (productVisualNode) {
    productVisualNode.dataset.sourceFocus = hasMatch ? activeSource : "all";
  }
}

for (const button of sourceLensButtons) {
  button.addEventListener("pointerenter", () => renderSourceLens(button.dataset.sourceLens));
  button.addEventListener("focusin", () => renderSourceLens(button.dataset.sourceLens));
  button.addEventListener("click", () => {
    selectedSourceLens = button.dataset.sourceLens || "all";
    renderSourceLens(selectedSourceLens);
  });
}
if (sourceLensWrap) {
  sourceLensWrap.addEventListener("pointerleave", () => renderSourceLens(selectedSourceLens));
}
renderSourceLens(selectedSourceLens);

function activateRunwayStage(index) {
  if (!runwayButtons.length || !runwayConsole) return;
  const activeIndex = Math.max(0, Math.min(index, runwayButtons.length - 1));
  for (const button of runwayButtons) {
    const isActive = Number(button.dataset.runwayStage) === activeIndex;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  }
  for (const panel of runwayPanels) {
    panel.classList.toggle("active", Number(panel.dataset.runwayPanel) === activeIndex);
  }
  runwayConsole.style.setProperty("--runway-progress", ((activeIndex + 1) / runwayButtons.length * 100).toFixed(0) + "%");
}
for (const button of runwayButtons) {
  button.addEventListener("click", () => {
    runwayUserPaused = true;
    if (runwayAutoTimer) window.clearInterval(runwayAutoTimer);
    activateRunwayStage(Number(button.dataset.runwayStage));
  });
}
if (runwayNode && runwayButtons.length && motionSafe) {
  const startRunway = () => {
    if (runwayAutoTimer || runwayUserPaused) return;
    runwayAutoTimer = window.setInterval(() => {
      const current = runwayButtons.findIndex((button) => button.classList.contains("active"));
      activateRunwayStage((current + 1) % runwayButtons.length);
    }, 2600);
  };
  const stopRunway = () => {
    if (runwayAutoTimer) window.clearInterval(runwayAutoTimer);
    runwayAutoTimer = 0;
  };
  if ("IntersectionObserver" in window) {
    const runwayObserver = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) startRunway();
      else stopRunway();
    }, { threshold: 0.34 });
    runwayObserver.observe(runwayNode);
  } else {
    startRunway();
  }
}
if (hero && productVisualNode && motionSafe) {
  hero.addEventListener("pointermove", (event) => {
    const rect = hero.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    hero.style.setProperty("--spotlight-x", ((x + 0.5) * 100).toFixed(1) + "%");
    hero.style.setProperty("--spotlight-y", ((y + 0.5) * 100).toFixed(1) + "%");
    productVisualNode.style.transform = "rotateY(" + (x * -6).toFixed(2) + "deg) rotateX(" + (y * 4).toFixed(2) + "deg) translateY(-4px)";
  });
  hero.addEventListener("pointerleave", () => {
    hero.style.setProperty("--spotlight-x", "68%");
    hero.style.setProperty("--spotlight-y", "24%");
    productVisualNode.style.transform = "";
  });
}

function updateScrolledState() {
  document.body.classList.toggle("is-scrolled", window.scrollY > 18);
}
updateScrolledState();
window.addEventListener("scroll", updateScrolledState, { passive: true });

function animateHeroMetrics() {
  if (!motionSafe || !heroMetricValues.length) return;
  const metricWrap = document.querySelector(".hero-metrics");
  metricWrap?.classList.add("is-counting");
  const duration = 920;
  const start = performance.now();
  for (const node of heroMetricValues) node.textContent = "0";
  function step(now) {
    const progress = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    for (const node of heroMetricValues) {
      const target = Number(node.dataset.heroCount || node.textContent || 0);
      node.textContent = String(Math.round(target * eased));
    }
    if (progress < 1) {
      window.requestAnimationFrame(step);
    } else {
      for (const node of heroMetricValues) node.textContent = String(Number(node.dataset.heroCount || node.textContent || 0));
      metricWrap?.classList.remove("is-counting");
    }
  }
  window.requestAnimationFrame(step);
}

if (heroMetricValues.length && motionSafe) {
  if ("IntersectionObserver" in window) {
    const metricObserver = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        animateHeroMetrics();
        metricObserver.disconnect();
      }
    }, { threshold: 0.48 });
    metricObserver.observe(heroMetricValues[0].closest(".hero-metrics"));
  } else {
    animateHeroMetrics();
  }
}
`;

await writeFile(path.join(docsDir, "daily-brief.md"), report, "utf8");
await writeFile(path.join(docsDir, "ready-to-record-script.md"), script, "utf8");
await writeFile(path.join(docsDir, "public-sample.md"), publicSampleReportEn, "utf8");
await writeFile(path.join(docsDir, "public-sample.en.md"), publicSampleReportEn, "utf8");
await writeFile(path.join(docsDir, "public-sample.zh-CN.md"), publicSampleReportZh, "utf8");
await writeFile(path.join(docsDir, "auth-setup.md"), authSetupDoc, "utf8");
await writeFile(path.join(siteDir, "index.html"), html, "utf8");
await writeFile(path.join(zhDir, "index.html"), zhHtml, "utf8");
await writeFile(path.join(orderDir, "index.html"), orderHtml, "utf8");
await writeFile(path.join(authDir, "index.html"), authHtml, "utf8");
await writeFile(path.join(siteDir, "styles.css"), css, "utf8");
await writeFile(path.join(siteDir, "app.js"), app, "utf8");
await writeFile(path.join(siteDir, "auth.js"), authScript, "utf8");
await writeFile(path.join(authDir, "auth.config.json"), authConfigExample, "utf8");
await writeFile(path.join(siteDir, "daily-brief.md"), report, "utf8");
await writeFile(path.join(siteDir, "ready-to-record-script.md"), script, "utf8");
await writeFile(path.join(siteDir, "public-sample.md"), publicSampleReportEn, "utf8");
await writeFile(path.join(siteDir, "public-sample.en.md"), publicSampleReportEn, "utf8");
await writeFile(path.join(siteDir, "public-sample.zh-CN.md"), publicSampleReportZh, "utf8");
await writeFile(path.join(siteDir, "public-sample.csv"), publicSampleCsvEn, "utf8");
await writeFile(path.join(siteDir, "public-sample.en.csv"), publicSampleCsvEn, "utf8");
await writeFile(path.join(siteDir, "public-sample.zh-CN.csv"), publicSampleCsvZh, "utf8");
await writeFile(path.join(siteDir, "feed.xml"), rssFeed, "utf8");
await writeFile(path.join(siteDir, "feed.json"), JSON.stringify(jsonFeed, null, 2), "utf8");
await writeFile(path.join(docsIssuesDir, issueMarkdownPath), issueMarkdown, "utf8");
await writeFile(path.join(siteIssuesDir, `${issueDate}.html`), buildIssuePage(), "utf8");
await writeFile(path.join(siteIssuesDir, "latest.html"), buildIssuePage(), "utf8");
const issueSlugs = await issueArchiveLinks();
await writeFile(path.join(siteIssuesDir, "index.html"), buildIssueArchivePage(issueSlugs), "utf8");
for (const topic of topicDefinitions) {
  await writeFile(path.join(topicsDir, `${topic.slug}.html`), buildTopicPage(topic), "utf8");
}
await writeFile(
  path.join(siteDir, "robots.txt"),
  `User-agent: *\nAllow: /\nSitemap: ${publicSiteUrl}sitemap.xml\n`,
  "utf8"
);
const sitemapUrls = [
  "",
  "zh/",
  "order/",
  "auth/",
  "public-sample.md",
  "public-sample.en.md",
  "public-sample.zh-CN.md",
  "public-sample.csv",
  "public-sample.en.csv",
  "public-sample.zh-CN.csv",
  "signal-demo.svg",
  "trendfoundry-free-sample-pack.zip",
  "trendfoundry-free-sample-pack.json",
  "ready-to-record-script.md",
  "sales-page-copy.md",
  "feed.xml",
  "feed.json",
  "issues/",
  "issues/latest.html",
  issuePath,
  ...topicDefinitions.map((topic) => `topics/${topic.slug}.html`)
];
await writeFile(
  path.join(siteDir, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls
    .map((urlPath) => `  <url><loc>${publicSiteUrl}${urlPath}</loc></url>`)
    .join("\n")}\n</urlset>\n`,
  "utf8"
);
await writeFile(path.join(siteDir, "launch-plan.md"), await readFile(path.join(docsDir, "launch-plan.md"), "utf8"), "utf8");
await writeFile(path.join(siteDir, "sales-page-copy.md"), await readFile(path.join(docsDir, "sales-page-copy.md"), "utf8"), "utf8");
console.log(`Built ${top.length} cards.`);
