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

const authProviderCards = authProviders
  .map(
    (provider) => `<button class="provider-button" type="button" data-provider="${provider.id}">
  <span class="provider-mark">${escapeHtml(provider.label.slice(0, 1))}</span>
  <span><strong>${escapeHtml(provider.label)}</strong><small>${escapeHtml(provider.description)}</small></span>
  <em>${escapeHtml(provider.region)}</em>
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
  .map(([source, count]) => `<span>${escapeHtml(source)} <strong>${count}</strong></span>`)
  .join("");
const sourceMixPanel = `<div class="source-mix-panel">
        ${dual("Source mix", "来源组合", "p", ' class="source-mix-label"')}
        <div class="source-legend" aria-label="Source mix">${sourceLegend}</div>
      </div>`;
const publicSample = top.slice(0, 3);
const boardItems = top.slice(0, 5);
const boardRows = boardItems
  .map(
    (item, index) => `<li>
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
      </div>`;
const zhProductVisual = `<div class="product-visual" aria-label="TrendFoundry signal board preview">
        <div class="product-screen">
          <img src="../signal-board.png" alt="TrendFoundry 按来源和评分整理的当前创作者机会看板" width="1200" height="760">
          <div class="signal-ticker" aria-hidden="true">${boardTicker}</div>
        </div>
        <ul class="board-summary">${boardRows}</ul>
      </div>`;

const pricingTiers = [
  {
    name: "Sample issue",
    nameZh: "单期样品",
    price: "$9",
    cadence: "one-off",
    cadenceZh: "一次性",
    bestFor: "Test whether the brief fits your channel before subscribing.",
    bestForZh: "先测试这份情报包是否适合你的频道，再决定是否订阅。",
    includes: ["12 ranked opportunities", "1 ready-to-record script", "CSV opportunity table", "Quality-risk notes"],
    includesZh: ["12 个排序后的选题机会", "1 份可直接录制的脚本", "CSV 机会表", "质量风险备注"],
    action: "Request sample",
    actionZh: "申请样品",
    href: issueOrderHref,
    featured: false
  },
  {
    name: "Weekly brief",
    nameZh: "周更情报",
    price: "$19",
    cadence: "per month",
    cadenceZh: "每月",
    bestFor: "Creators who need a dependable weekly topic pipeline.",
    bestForZh: "适合需要稳定周更选题管线的创作者。",
    includes: ["Weekly 12-item issue", "Fresh source mix", "Bilibili + YouTube title angles", "Recording outline per item"],
    includesZh: ["每周 12 条机会", "新鲜来源组合", "B 站 + YouTube 标题角度", "每条都有录制大纲"],
    action: "Start weekly",
    actionZh: "开始周更",
    href: orderHref,
    featured: true
  },
  {
    name: "Custom niche",
    nameZh: "垂直定制",
    price: "$49",
    cadence: "per month",
    cadenceZh: "每月",
    bestFor: "Teams focused on one narrow audience or technical vertical.",
    bestForZh: "适合聚焦单一受众或技术垂类的小团队。",
    includes: ["Custom source queries", "Niche-specific ranking", "Stricter quality filtering", "Lead/outreach angle notes"],
    includesZh: ["定制来源查询", "垂类专属排序", "更严格质量过滤", "线索/外联角度备注"],
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

function tierOrderHref(tier, lang = "en") {
  const subject = encodeURIComponent(`TrendFoundry order: ${tier.name}`);
  const body = orderDraftBody(tier, lang);
  return `mailto:${contactEmail}?subject=${subject}&body=${encodeURIComponent(body)}`;
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
    (tier) => `<article class="tier${tier.featured ? " featured" : ""}">
  <div>
    ${dual(tier.cadence, tier.cadenceZh, "p", ' class="tier-kicker"')}
    ${dual(tier.name, tier.nameZh, "h3")}
    <p class="tier-price">${escapeHtml(tier.price)}</p>
    ${dual(tier.bestFor, tier.bestForZh, "p")}
  </div>
  <ul>${tier.includes.map((item, index) => `<li>${dual(item, tier.includesZh[index])}</li>`).join("")}</ul>
  <a class="action${tier.featured ? " primary" : ""}" href="${tier.href}">${dual(tier.action, tier.actionZh)}</a>
</article>`
  )
  .join("");

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
const decisionFlowItems = [
  ["01", "Proof first", "先看证据", "A signal enters the pack only when the original public source stays attached.", "只有保留原始公开来源的信号，才进入情报包。"],
  ["02", "Creator fit", "创作者匹配", "Novelty, recordability, audience pain, and rights risk are scored before an idea reaches the queue.", "先评估新鲜度、可录制性、观众痛点和版权风险，再进入选题队列。"],
  ["03", "Recording kit", "录制组件", "Each accepted idea becomes title angles, a hook, a demo path, and a limitation note.", "每个通过筛选的机会都会变成标题角度、钩子、演示路径和限制说明。"],
  ["04", "Buyer handoff", "买家交付", "The weekly pack lands as a sample, CSV, script, and current issue so a creator can act quickly.", "周更包以样品、CSV、脚本和当前期刊形式交付，让创作者快速开录。"]
];
const decisionFlowSteps = decisionFlowItems
  .map(([number, label, labelZh, text, textZh], index) => `<li class="${index === 0 ? "is-current" : ""}" data-flow-step="${index}">
          <button class="flow-step-button" type="button">
            <span>${number}</span>
            <strong>${dual(label, labelZh)}</strong>
            ${dual(text, textZh, "em")}
          </button>
        </li>`)
  .join("");
const zhDecisionFlowSteps = decisionFlowItems
  .map(([number, , labelZh, , textZh], index) => `<li class="${index === 0 ? "is-current" : ""}" data-flow-step="${index}">
          <button class="flow-step-button" type="button">
            <span>${number}</span>
            <strong>${escapeHtml(labelZh)}</strong>
            <em>${escapeHtml(textZh)}</em>
          </button>
        </li>`)
  .join("");
const decisionFlow = `<section class="decision-flow" id="decision-flow" aria-label="TrendFoundry decision system">
      <div class="decision-copy">
        ${dual("Decision system", "决策系统", "p", ' class="section-label"')}
        ${dual("The product is the filter, not the feed.", "产品的价值在筛选，不在搬运信息流。", "h2")}
        ${dual("TrendFoundry sells the judgment layer between public noise and a creator's next recording session: proof, fit, angle, and handoff all travel together.", "TrendFoundry 卖的是公开噪声和下一次录制之间的判断层：证据、匹配度、创作角度和交付物必须一起出现。", "p")}
      </div>
      <div class="decision-panel">
        <div class="flow-orbit" aria-hidden="true">
          <span></span><span></span><span></span><span></span>
        </div>
        <ol class="flow-steps">${zhDecisionFlowSteps}</ol>
      </div>
    </section>`;
const zhDecisionFlow = `<section class="decision-flow" id="decision-flow" aria-label="TrendFoundry decision system">
      <div class="decision-copy">
        <p class="section-label">决策系统</p>
        <h2>产品的价值在筛选，不在搬运信息流。</h2>
        <p>TrendFoundry 卖的是公开噪声和下一次录制之间的判断层：证据、匹配度、创作角度和交付物必须一起出现。</p>
      </div>
      <div class="decision-panel">
        <div class="flow-orbit" aria-hidden="true">
          <span></span><span></span><span></span><span></span>
        </div>
        <ol class="flow-steps">${decisionFlowSteps}</ol>
      </div>
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
- Weekly brief: USD 19/month.
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
    (item, index) => `<article class="card" data-source="${escapeHtml(item.source)}" data-fit="${escapeHtml(item.monetizationFit)}" data-search="${escapeHtml(`${item.title} ${item.summary} ${item.sourceQuery} ${item.targetCreator}`.toLowerCase())}">
  <div class="meta"><span>${escapeHtml(item.source)}</span><span>${dual(`Score ${item.score}`, `评分 ${item.score}`)}</span><span>${dual(fitLabel(item.monetizationFit), fitLabel(item.monetizationFit, "zh"))}</span>${item.stale ? `<span>${dual("cached", "缓存")}</span>` : ""}${item.qualityFlags?.length ? `<span>${dual("review", "需复核")}</span>` : ""}</div>
  <h3>${index + 1}. <a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a></h3>
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
    (item, index) => `<article class="card" data-source="${escapeHtml(item.source)}" data-fit="${escapeHtml(item.monetizationFit)}" data-search="${escapeHtml(`${item.title} ${zhHook(item)} ${item.deliverables.bilibiliTitles?.[0] || ""} ${item.sourceQuery} ${item.targetCreator}`.toLowerCase())}">
  <div class="meta"><span>${escapeHtml(item.source)}</span><span>评分 ${item.score}</span><span>${escapeHtml(fitLabel(item.monetizationFit, "zh"))}</span>${item.stale ? "<span>缓存</span>" : ""}${item.qualityFlags?.length ? "<span>需复核</span>" : ""}</div>
  <h3>${index + 1}. <a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a></h3>
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
  <div class="brandline"><span>TrendFoundry</span><span>SEO brief</span></div>
  <h1>${escapeHtml(topic.title)}</h1>
  <p class="sub">${escapeHtml(topic.description)} Updated from the same source-backed dataset used for the paid weekly brief.</p>
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
  <div class="brandline"><span>TrendFoundry</span><span>Public issue</span></div>
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
  <div class="brandline"><span>TrendFoundry</span><span>Issue archive</span></div>
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
  <link rel="alternate" type="application/rss+xml" title="TrendFoundry RSS" href="./feed.xml">
  <link rel="alternate" type="application/feed+json" title="TrendFoundry JSON Feed" href="./feed.json">
  <script src="./app.js" defer></script>
</head>
<body data-lang="en" data-default-lang="en">
  <header class="topbar">
    <div>
      <div class="brandrow">
        <div class="brandline">
          <span>TrendFoundry</span>
          <span>${dual(`Issue ${new Date(data.generatedAt).toLocaleDateString("en-GB")}`, `期次 ${new Date(data.generatedAt).toLocaleDateString("zh-CN")}`)}</span>
        </div>
        <div class="language-switch" aria-label="Language">
          <button class="language-option active" type="button" data-language-toggle="en">EN</button>
          <button class="language-option" type="button" data-language-toggle="zh">中文</button>
        </div>
      </div>
      ${dual("Creator intelligence packs for AI and developer video channels", "给 AI 和开发者视频频道的创作者情报包", "h1")}
      ${dual("Source-backed opportunities from GitHub, YouTube, Bilibili, Hacker News, and arXiv, shaped into recordable titles, hooks, demos, limitations, and buyer-ready sample assets.", "从 GitHub、YouTube、Bilibili、Hacker News 和 arXiv 提取有来源的趋势机会，并整理成可录制标题、钩子、演示、限制说明和可交付样品包。", "p", ' class="sub"')}
      <div class="hero-metrics" aria-label="Product proof points">
        <span><strong>12</strong>${dual("ranked opportunities", "条排序机会")}</span>
        <span><strong>5</strong>${dual("source lanes", "个来源入口")}</span>
        <span><strong>1</strong>${dual("recordable script", "份可录制脚本")}</span>
      </div>
      <div class="hero-actions">
        <a class="action primary" href="./public-sample.en.md">${dual("View free sample", "查看免费样品")}</a>
        <a class="action strong" href="./order/">${dual("Order without login", "无登录下单")}</a>
      </div>
      <div class="utility-links" aria-label="Secondary landing links">
        <a href="./public-sample.zh-CN.md">${dual("Chinese sample", "中文样品")}</a>
        <a href="./trendfoundry-free-sample-pack.zip">${dual("Sample pack", "样品包")}</a>
        <a href="./ready-to-record-script.md">${dual("Script", "脚本")}</a>
        <a href="./auth/">${dual("Sign in", "账号登录")}</a>
        <a href="${issueOrderHref}">${dual("Request on GitHub", "在 GitHub 申请")}</a>
        <a href="${orderHref}">${dual("Email order", "邮件下单")}</a>
      </div>
    </div>
    <aside>${productVisual}</aside>
  </header>
  <main>
    <section class="offer">
      <div>
        ${dual("Weekly brief", "周更情报", "p", ' class="section-label"')}
        ${dual("Fresh AI and developer video opportunities, ready to turn into scripts.", "每周拿到可核验、可录制的 AI/开发者视频选题。", "h2")}
        ${dual("Each issue gives you 12 ranked ideas with source links, Bilibili and YouTube title angles, outlines, risk notes, CSV, and one ready-to-record script.", "每期包含 12 条排序后的机会、来源链接、B 站和 YouTube 标题角度、录制大纲、风险备注、CSV，以及 1 份可直接录制的脚本。", "p")}
      </div>
      <div class="price">
        <span>$19/mo</span>
        <small><a href="${issueOrderHref}">${dual("GitHub request", "GitHub 申请")}</a> / <a href="${orderHref}">${dual("email order", "邮件下单")}</a></small>
      </div>
    </section>
    <section class="sample-preview" aria-label="Free public sample">
      <div>
        ${dual("Free sample", "免费样品", "p", ' class="section-label"')}
        ${dual("Inspect three current opportunities before ordering.", "下单前先检查 3 个当前机会。", "h2")}
        ${dual("The public sample reveals format, scoring, source links, and quality notes without exposing the full paid pack.", "公开样品展示格式、评分、来源链接和质量备注，但不暴露完整付费包。", "p")}
      </div>
      <div class="sample-actions">
        <a class="action strong" href="./trendfoundry-free-sample-pack.zip">${dual("Download sample pack", "下载样品包")}</a>
        <a class="action primary" href="./public-sample.en.md">${dual("Open English sample", "打开英文样品")}</a>
        <a class="action" href="./public-sample.en.csv">${dual("English CSV", "英文 CSV")}</a>
        <a class="action primary" href="./public-sample.zh-CN.md">${dual("Open Chinese sample", "打开中文样品")}</a>
        <a class="action" href="./public-sample.zh-CN.csv">${dual("Chinese CSV", "中文 CSV")}</a>
      </div>
    </section>
    ${socialProof}
    ${motionProof}
    ${decisionFlow}
    <section class="opportunity-finder" aria-labelledby="opportunity-finder-title">
      <div class="finder-head">
        <div>
          ${dual("Opportunity finder", "机会筛选器", "p", ' class="section-label"')}
          ${dual("Pick a source lane, then search inside it.", "先选来源，再在里面搜索。", "h2", ' id="opportunity-finder-title"')}
          ${dual("The controls work like a product category wall: choose the lane that matches your recording intent before opening the cards.", "这里像商品分类墙一样工作：先按录制意图选入口，再展开具体机会。", "p")}
        </div>
        <p id="result-count" class="result-count" data-count="${top.length}">${top.length} visible opportunities</p>
      </div>
      <div class="finder-controls">
        <div class="source-picker">
          <div class="control-label"><span>1</span>${dual("Pick a source lane", "选择来源入口", "strong")}</div>
          <div class="filters" aria-label="Source filters">${sourceButtons}</div>
        </div>
        <div class="search-wrap">
          <div class="control-label"><span>2</span><label for="opportunity-search">${dual("Search within results", "在结果里搜索")}</label></div>
          <input id="opportunity-search" type="search" ${langAttr("agent, video, workflow, arxiv...", "智能体、视频、工作流、arxiv...")}>
        </div>
      </div>
    </section>
    <section class="grid" id="opportunity-grid">${cards}</section>
    <section class="pricing" aria-label="Pricing tiers">
      <div class="section-head">
        ${dual("Pricing", "定价", "p", ' class="section-label"')}
        ${dual("Choose the depth that matches your publishing cadence.", "按你的更新节奏选择交付深度。", "h2")}
        ${dual("Every tier is built around the same promise: fewer weak topics, faster planning, and a clearer recording queue.", "每一档都围绕同一个价值：少踩弱选题、更快规划、录制队列更清楚。", "p")}
      </div>
      <div class="tier-grid">${pricingCards}</div>
    </section>
    <section class="delivery" aria-label="What the buyer receives">
      <div>
        ${dual("What arrives", "交付内容", "p", ' class="section-label"')}
        ${dual("A compact intelligence pack, not another AI news digest.", "这是紧凑的创作者情报包，不是又一份 AI 新闻摘要。", "h2")}
      </div>
      <ul>${deliveryChecklist}</ul>
    </section>
    <section class="seo-hub" aria-label="Search landing pages">
      <div>
        ${dual("Search pages", "搜索页", "p", ' class="section-label"')}
        ${dual("Evergreen entry points for creators searching by platform or workflow.", "面向按平台或工作流搜索的创作者，提供长期入口。", "h2")}
        ${dual("These pages refresh with the same daily source data and route qualified readers back to the sample pack.", "这些页面使用同一份每日来源数据刷新，并把合格读者引回样品包。", "p")}
      </div>
      <div class="topic-links">${topicLinks}</div>
    </section>
    <section class="feed-box" aria-label="Subscribe to updates">
      <div>
        ${dual("Subscribe", "订阅", "p", ' class="section-label"')}
        ${dual("Turn one-time visitors into repeat readers.", "把一次性访问者变成持续读者。", "h2")}
        ${dual("The RSS and JSON feeds publish the top 12 current opportunities, each with a proof link, hook, demo angle, and limitation.", "RSS 和 JSON Feed 发布当前 Top 12 机会，每条都包含来源链接、钩子、演示角度和限制说明。", "p")}
      </div>
      <div class="feed-actions">
        <a class="action primary" href="./feed.xml">${dual("RSS feed", "RSS Feed")}</a>
        <a class="action" href="./feed.json">${dual("JSON feed", "JSON Feed")}</a>
      </div>
    </section>
    <section class="archive-box" aria-label="Public issue archive">
      <div>
        ${dual("Archive", "归档", "p", ' class="section-label"')}
        ${dual("Durable public issues build trust before purchase.", "持久公开期刊能在购买前建立信任。", "h2")}
        ${dual("Each issue freezes the top 12 opportunities, proof links, hooks, demo angles, and limitations for buyers who want to inspect the track record.", "每一期都会冻结 Top 12 机会、来源链接、钩子、演示角度和限制说明，方便买家检查历史记录。", "p")}
      </div>
      <div class="feed-actions">
        <a class="action primary" href="./issues/latest.html">${dual("Latest issue", "最新一期")}</a>
        <a class="action" href="./issues/index.html">${dual("Issue archive", "期刊归档")}</a>
      </div>
    </section>
    <section class="handoff">
      <div>
        ${dual("Handoff", "交接", "p", ' class="section-label"')}
        ${dual("Next buyer-facing action", "下一步面向买家的动作", "h2")}
        ${dual("Use the sample brief and ready-to-record script as the free proof asset, then sell weekly delivery from the launch plan.", "把样品 brief 和可录制脚本作为免费证明资产，再按发布计划销售周更交付。", "p")}
      </div>
      <div class="handoff-links">
        <a class="action primary" href="./launch-plan.md">${dual("Launch plan", "发布计划")}</a>
        <a class="action" href="./sales-page-copy.md">${dual("Sales copy", "销售文案")}</a>
        <a class="action primary" href="./order/">${dual("Order page", "下单页")}</a>
        <a class="action strong" href="${issueOrderHref}">${dual("Request sample", "申请样品")}</a>
        <a class="action" href="${orderHref}">${dual("Email order", "邮件下单")}</a>
      </div>
    </section>
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
  <script src="../app.js" defer></script>
</head>
<body data-lang="zh" data-default-lang="zh" data-force-lang="zh">
  <header class="topbar">
    <div>
      <div class="brandrow">
        <div class="brandline">
          <span>TrendFoundry</span>
          <span>中文入口 · 期次 ${new Date(data.generatedAt).toLocaleDateString("zh-CN")}</span>
        </div>
        <div class="language-switch" aria-label="Language">
          <a class="language-option" href="../?lang=en">EN</a>
          <span class="language-option active">中文</span>
        </div>
      </div>
      <h1>给 B 站和中文技术频道的 AI 创作者情报包</h1>
      <p class="sub">每天从 GitHub、YouTube、Bilibili、Hacker News 和 arXiv 提取公开趋势信号，整理成可录制标题、钩子、演示路径、限制说明和买家可交付样品。</p>
      <div class="hero-metrics" aria-label="Product proof points">
        <span><strong>12</strong>条排序机会</span>
        <span><strong>5</strong>个来源入口</span>
        <span><strong>1</strong>份可录制脚本</span>
      </div>
      <div class="hero-actions">
        <a class="action primary" href="../public-sample.zh-CN.md">查看免费样品</a>
        <a class="action strong" href="../order/">无登录下单</a>
      </div>
      <div class="utility-links" aria-label="Secondary landing links">
        <a href="../public-sample.en.md">English sample</a>
        <a href="../trendfoundry-free-sample-pack.zip">样品包</a>
        <a href="../ready-to-record-script.md">脚本</a>
        <a href="../auth/">账号登录</a>
        <a href="${issueOrderHref}">在 GitHub 申请</a>
        <a href="${orderHref}">邮件下单</a>
      </div>
    </div>
    <aside>${zhProductVisual}</aside>
  </header>
  <main>
    <section class="offer">
      <div>
        <p class="section-label">周更情报</p>
        <h2>每周拿到可核验、可录制的 AI/开发者视频选题。</h2>
        <p>每期包含 12 条排序后的机会、来源链接、B 站和 YouTube 标题角度、录制大纲、风险备注、CSV，以及 1 份可直接录制的脚本。</p>
      </div>
      <div class="price">
        <span>$19/mo</span>
        <small><a href="${issueOrderHref}">GitHub 申请</a> / <a href="${orderHref}">邮件下单</a></small>
      </div>
    </section>
    <section class="sample-preview" aria-label="Free public sample">
      <div>
        <p class="section-label">免费样品</p>
        <h2>下单前先看 3 个当前机会。</h2>
        <p>公开样品展示格式、评分、来源链接和质量备注；完整 12 条机会、CSV 和脚本结构仍作为付费/请求交付。</p>
      </div>
      <div class="sample-actions">
        <a class="action strong" href="../trendfoundry-free-sample-pack.zip">下载样品包</a>
        <a class="action primary" href="../public-sample.zh-CN.md">打开中文样品</a>
        <a class="action" href="../public-sample.zh-CN.csv">中文 CSV</a>
        <a class="action primary" href="../public-sample.en.md">Open English sample</a>
        <a class="action" href="../public-sample.en.csv">English CSV</a>
      </div>
    </section>
    <section class="visual-proof" aria-label="Product preview">
      <div>
        <p class="section-label">产品预览</p>
        <h2>这是一张真实信号看板，不是只有文字的销售页。</h2>
        <p>看板图来自当前排序期次，买家打开样品文件前就能看到来源入口、评分和选题密度。</p>
      </div>
      <img src="../signal-board.png" alt="TrendFoundry 当前创作者机会看板预览" width="1200" height="760">
    </section>
    ${zhMotionProof}
    ${zhDecisionFlow}
    <section class="opportunity-finder" aria-labelledby="opportunity-finder-title">
      <div class="finder-head">
        <div>
          <p class="section-label">机会筛选器</p>
          <h2 id="opportunity-finder-title">先选来源，再在里面搜索。</h2>
          <p>这里像商品分类墙一样工作：先按录制意图选入口，再展开具体机会。</p>
        </div>
        <p id="result-count" class="result-count" data-count="${top.length}">${top.length} 个可见机会</p>
      </div>
      <div class="finder-controls">
        <div class="source-picker">
          <div class="control-label"><span>1</span><strong>选择来源入口</strong></div>
          <div class="filters" aria-label="Source filters">${zhSourceButtons}</div>
        </div>
        <div class="search-wrap">
          <div class="control-label"><span>2</span><label for="opportunity-search">在结果里搜索</label></div>
          <input id="opportunity-search" type="search" placeholder="智能体、视频、工作流、arxiv...">
        </div>
      </div>
    </section>
    <section class="grid" id="opportunity-grid">${zhCards}</section>
    <section class="pricing" aria-label="Pricing tiers">
      <div class="section-head">
        <p class="section-label">定价</p>
        <h2>按你的更新节奏选择交付深度。</h2>
        <p>每一档都围绕同一个价值：少踩弱选题、更快规划、录制队列更清楚。</p>
      </div>
      <div class="tier-grid">${pricingCards}</div>
    </section>
    <section class="delivery" aria-label="What the buyer receives">
      <div>
        <p class="section-label">交付内容</p>
        <h2>这是创作者情报包，不是 AI 新闻摘要。</h2>
      </div>
      <ul>${deliveryChecklist}</ul>
    </section>
    <section class="seo-hub" aria-label="Chinese discovery links">
      <div>
        <p class="section-label">复访入口</p>
        <h2>中文买家可以从样品、Feed、公开归档继续检查质量。</h2>
        <p>每个入口都保留公开来源、钩子、演示角度和限制说明，降低首次购买前的不确定性。</p>
      </div>
      <div class="topic-links">
        <a class="topic-link" href="../public-sample.zh-CN.md"><span>中文样品</span><small>先检查中文 Markdown 和 CSV 格式。</small></a>
        <a class="topic-link" href="../public-sample.en.md"><span>English sample</span><small>给英文买家检查同一批机会。</small></a>
        <a class="topic-link" href="../issues/latest.html"><span>最新公开期刊</span><small>查看 Top 12 机会的公开快照。</small></a>
        <a class="topic-link" href="../feed.xml"><span>RSS Feed</span><small>订阅每期更新，减少一次性访问流失。</small></a>
        <a class="topic-link" href="../topics/bilibili-ai-topics.html"><span>B 站 AI 选题页</span><small>面向中文技术讲解的长期搜索入口。</small></a>
      </div>
    </section>
    <section class="handoff">
      <div>
        <p class="section-label">下一步</p>
        <h2>把这页作为中文外联和 B 站动态的主链接。</h2>
        <p>先给对方免费样品和公开归档，再引导申请当前完整包或邮件下单。</p>
      </div>
      <div class="handoff-links">
        <a class="action primary" href="${issueOrderHref}">申请样品</a>
        <a class="action" href="../sales-page-copy.md">销售文案</a>
        <a class="action primary" href="../order/">下单页</a>
        <a class="action strong" href="${orderHref}">邮件下单</a>
      </div>
    </section>
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
  <meta property="og:description" content="Choose a sample issue, weekly brief, or custom niche pack and send a prepared order email.">
  <meta property="og:image" content="${ogImageUrl}">
  <title>Order TrendFoundry</title>
  <link rel="canonical" href="${publicSiteUrl}order/">
  <link rel="stylesheet" href="../styles.css">
</head>
<body data-lang="en">
  <header class="topic-hero order-hero">
    <div class="brandline"><span>TrendFoundry</span><span>No-login order</span></div>
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
          <pre>Subject: TrendFoundry order: Weekly brief

Hi, I want to order TrendFoundry Weekly brief ($19 per month).

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
  <script src="../auth.js" defer></script>
</head>
<body data-page="auth">
  <header class="topic-hero auth-hero">
    <div class="brandline"><span>TrendFoundry</span><span>Account access</span></div>
    <h1>Sign in with the account you already use.</h1>
    <p class="sub">Global and China identity providers are wired through a config-driven OAuth gateway, so buyers can use Google, Apple, Microsoft, GitHub, WeChat, QQ, Alipay, DingTalk, Feishu, and other common accounts.</p>
    <div class="hero-actions">
      <a class="action primary" href="#providers">Choose provider</a>
      <a class="action" href="../order/">Order page</a>
      <a class="action" href="../zh/">Chinese entry</a>
      <a class="action strong" href="../">Dashboard</a>
    </div>
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
      <p>The static site cannot complete OAuth token exchange. GitHub Pages can start OAuth flows, but token exchange and secure sessions must live in a backend or hosted auth service. The generated <a href="./auth.config.json"><code>auth.config.json</code></a> is public-client configuration only; provider secrets belong in the broker.</p>
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
}

function handleCallback() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("tf_auth") === "error") {
    const provider = params.get("provider") || "provider";
    const message = params.get("message") || "auth_error";
    window.history.replaceState({}, "", window.location.pathname);
    setNotice(provider + " login could not start: " + message.replace(/_/g, " ") + ".", "warning");
    return true;
  }
  if (params.get("tf_auth") === "ok") {
    saveSession({
      provider: params.get("provider") || "broker",
      name: params.get("name") || params.get("email") || "TrendFoundry member",
      email: params.get("email") || "",
      mode: "active"
    });
    window.history.replaceState({}, "", window.location.pathname);
    setNotice("Signed in through the configured auth gateway.", "success");
    return true;
  }
  if (params.get("code")) {
    const state = params.get("state") || "";
    const expected = sessionStorage.getItem("trendfoundry.auth.state") || "";
    const provider = state.split(".")[0] || "provider";
    saveSession({ provider, name: "Pending OAuth exchange", mode: "pending" });
    window.history.replaceState({}, "", window.location.pathname);
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
  const callbackHandled = handleCallback();
  renderProviders();
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
  const provider = providers.find((item) => item.id === button.dataset.provider);
  if (!provider) return;
  const url = buildAuthUrl(provider);
  if (!url) {
    setNotice(provider.label + " needs brokerBaseUrl or an enabled clientId in auth.config.json.", "warning");
    return;
  }
  window.location.href = url;
});

emailForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = new FormData(emailForm).get("email");
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
.brandline {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  margin: 0;
  color: var(--accent);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
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
  max-width: 900px;
  margin: 0;
  font-size: clamp(46px, 6.8vw, 92px);
  line-height: 0.96;
  letter-spacing: 0;
}
.sub {
  max-width: 720px;
  margin: 24px 0 0;
  color: var(--muted);
  font-size: clamp(18px, 1.8vw, 24px);
  line-height: 1.36;
}
.hero-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  max-width: 640px;
  margin-top: 26px;
}
.hero-metrics > span {
  display: grid;
  gap: 3px;
  min-height: 76px;
  border: 1px solid rgba(17, 17, 20, 0.08);
  border-radius: var(--radius);
  padding: 12px;
  background: rgba(255, 255, 255, 0.68);
  color: var(--muted);
  font-size: 12px;
  font-weight: 750;
  box-shadow: 0 10px 28px rgba(17, 17, 20, 0.05);
  backdrop-filter: blur(20px);
}
.hero-metrics > span > strong {
  color: var(--ink);
  font-size: 28px;
  line-height: 1;
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
  border-radius: 6px;
  padding: 9px 10px;
  background: rgba(255, 255, 255, 0.72);
  color: var(--muted);
}
.source-mix-label {
  margin: 0;
  color: var(--ink);
  font-size: 12px;
  font-weight: 800;
}
.source-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.source-legend span {
  border: 0;
  border-radius: 0;
  padding: 0;
  background: transparent;
  color: var(--muted);
  font-size: 12px;
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
  .flow-orbit,
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
.price {
  text-align: right;
  color: var(--accent-2);
}
.price > span { display: block; font-size: clamp(34px, 4.4vw, 56px); font-weight: 850; color: var(--ink); }
.price small { color: var(--muted); }
.pricing,
.sample-preview,
.visual-proof,
.motion-proof,
.delivery {
  border-bottom: 1px solid var(--line);
  padding: 2px 0 34px;
  margin-bottom: 34px;
}
.reveal-item {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 620ms ease, transform 620ms ease;
}
.reveal-item.is-visible {
  opacity: 1;
  transform: translateY(0);
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
.motion-proof {
  display: grid;
  grid-template-columns: minmax(260px, 0.42fr) minmax(0, 0.58fr);
  gap: 24px;
  align-items: center;
}
.visual-proof h2,
.motion-proof h2 {
  margin: 0 0 8px;
  font-size: 24px;
  line-height: 1.2;
}
.visual-proof p:not(.section-label),
.motion-proof p:not(.section-label) {
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
.decision-flow {
  display: grid;
  grid-template-columns: minmax(260px, 0.44fr) minmax(0, 0.56fr);
  gap: clamp(24px, 5vw, 70px);
  align-items: center;
  border-bottom: 1px solid var(--line);
  padding: 10px 0 44px;
  margin-bottom: 34px;
}
.decision-copy {
  position: sticky;
  top: 22px;
}
.decision-copy h2 {
  max-width: 620px;
  margin: 0 0 12px;
  font-size: clamp(34px, 4.8vw, 68px);
  line-height: 0.98;
}
.decision-copy p:not(.section-label) {
  margin: 0;
  color: var(--muted);
  font-size: 18px;
  line-height: 1.5;
}
.decision-panel {
  position: relative;
  min-height: 520px;
  overflow: hidden;
  border: 1px solid rgba(17, 17, 20, 0.08);
  border-radius: 18px;
  padding: clamp(16px, 2.4vw, 28px);
  background:
    linear-gradient(135deg, rgba(255,255,255,0.86), rgba(246,249,252,0.72)),
    radial-gradient(circle at 72% 22%, rgba(0, 113, 227, 0.12), transparent 34%);
  box-shadow: var(--shadow);
  backdrop-filter: blur(20px);
}
.flow-orbit {
  position: absolute;
  inset: 26px;
  border: 1px solid rgba(0, 113, 227, 0.16);
  border-radius: 50%;
  opacity: 0.86;
  animation: orbitTurn 18s linear infinite;
}
.flow-orbit::before,
.flow-orbit::after {
  content: "";
  position: absolute;
  inset: 17%;
  border: 1px solid rgba(17, 17, 20, 0.07);
  border-radius: 50%;
}
.flow-orbit::after {
  inset: 33%;
}
.flow-orbit span {
  position: absolute;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 8px rgba(0, 113, 227, 0.1);
}
.flow-orbit span:nth-child(1) { top: 11%; left: 23%; }
.flow-orbit span:nth-child(2) { top: 24%; right: 13%; background: var(--success); }
.flow-orbit span:nth-child(3) { right: 24%; bottom: 12%; background: #a45a00; }
.flow-orbit span:nth-child(4) { bottom: 25%; left: 12%; background: #111114; }
@keyframes orbitTurn {
  to { transform: rotate(360deg); }
}
.flow-steps {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.flow-steps li {
  margin: 0;
}
.flow-step-button {
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr);
  gap: 8px 14px;
  width: 100%;
  min-height: 104px;
  border: 1px solid rgba(17, 17, 20, 0.08);
  border-radius: var(--radius);
  padding: 16px;
  background: rgba(255, 255, 255, 0.7);
  color: var(--ink);
  font: inherit;
  text-align: left;
  box-shadow: 0 8px 24px rgba(17, 17, 20, 0.04);
  cursor: pointer;
  transition: transform 180ms ease, border-color 180ms ease, background 180ms ease, box-shadow 180ms ease;
}
.flow-step-button:hover,
.flow-steps li.is-current .flow-step-button {
  transform: translateX(-4px);
  border-color: rgba(0, 113, 227, 0.42);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 18px 42px rgba(17, 17, 20, 0.1);
}
.flow-step-button span {
  grid-row: span 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 14px;
  font-weight: 850;
}
.flow-step-button strong {
  align-self: end;
  font-size: 19px;
  line-height: 1.15;
}
.flow-step-button em {
  color: var(--muted);
  font-size: 14px;
  font-style: normal;
  line-height: 1.4;
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
  transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
}
.tier:hover {
  transform: translateY(-3px);
  border-color: #b8c8d9;
  box-shadow: 0 18px 42px rgba(17, 17, 20, 0.1);
}
.tier.featured {
  border-color: rgba(0, 113, 227, 0.38);
  background: linear-gradient(180deg, #ffffff, #f5faff);
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
.grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
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
.card:hover {
  transform: translateY(-3px);
  border-color: #b8c8d9;
  box-shadow: 0 20px 46px rgba(17, 17, 20, 0.11);
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
.auth-hero .sub {
  max-width: 880px;
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
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) auto;
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
}
.provider-button.configured {
  border-color: #94aaa5;
  background: #fbfdfc;
}
.provider-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 7px;
  background: #f1f4f6;
  color: var(--accent);
  font-weight: 850;
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
  color: var(--muted);
  font-size: 12px;
  font-style: normal;
  font-weight: 800;
  text-transform: uppercase;
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
@media (max-width: 960px) {
  .topbar,
  .offer,
  .sample-preview,
  .visual-proof,
  .motion-proof,
  .decision-flow,
  .section-head,
  .tier-grid,
  .delivery,
  .delivery ul,
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
  .handoff,
  .grid {
    grid-template-columns: 1fr;
  }
  .price { text-align: left; }
  .sample-actions { justify-content: flex-start; }
  .feed-actions { justify-content: flex-start; }
  .visual-proof img { justify-self: start; max-width: 100%; }
  .motion-preview { max-width: 100%; }
  .decision-flow {
    gap: 18px;
    padding-bottom: 30px;
  }
  .decision-copy {
    position: static;
  }
  .decision-copy h2 {
    font-size: clamp(32px, 10vw, 46px);
  }
  .decision-copy p:not(.section-label) {
    font-size: 16px;
  }
  .decision-panel {
    min-height: 0;
    border-radius: 14px;
  }
  .flow-orbit {
    inset: 18px;
    opacity: 0.5;
  }
  .flow-step-button {
    grid-template-columns: 46px minmax(0, 1fr);
    min-height: 96px;
    padding: 13px;
  }
  .flow-step-button span {
    width: 38px;
    height: 38px;
  }
  .result-count { justify-self: stretch; margin: 0; white-space: normal; text-align: center; }
  .brandrow { align-items: flex-start; }
  .topbar {
    gap: 18px;
    padding: 24px clamp(20px, 5vw, 72px) 18px;
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
  }
  .hero-metrics > span {
    min-height: 62px;
    padding: 9px;
    font-size: 11px;
  }
  .hero-metrics strong {
    font-size: 24px;
  }
  body[data-lang="zh"] h1 {
    word-break: break-all;
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
  .source-legend span {
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
`;

const app = `const cards = [...document.querySelectorAll(".card")];
const buttons = [...document.querySelectorAll("[data-source-filter]")];
const search = document.querySelector("#opportunity-search");
const resultCount = document.querySelector("#result-count");
const languageButtons = [...document.querySelectorAll("[data-language-toggle]")];
const translatable = [...document.querySelectorAll("[data-i18n-en][data-i18n-zh]")];
const placeholderTargets = [...document.querySelectorAll("[data-i18n-placeholder-en][data-i18n-placeholder-zh]")];
let activeSource = "all";
const requestedLanguage = new URLSearchParams(window.location.search).get("lang");
const forcedLanguage = document.body.dataset.forceLang;
let currentLanguage = forcedLanguage || (requestedLanguage === "en" || requestedLanguage === "zh" ? requestedLanguage : localStorage.getItem("trendfoundry-language")) || document.body.dataset.defaultLang || "en";

function countLabel(count) {
  if (currentLanguage === "zh") return "正在显示 " + count + " 条机会";
  return count === 1 ? "Showing 1 opportunity" : "Showing " + count + " opportunities";
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
  for (const button of languageButtons) {
    button.classList.toggle("active", button.dataset.languageToggle === currentLanguage);
  }
  const visible = [...cards].filter((card) => !card.classList.contains("hidden")).length;
  resultCount.textContent = countLabel(visible);
}

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
  resultCount.textContent = countLabel(visible);
  resultCount.classList.remove("bump");
  window.requestAnimationFrame(() => resultCount.classList.add("bump"));
  window.setTimeout(() => resultCount.classList.remove("bump"), 220);
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

search.addEventListener("input", applyFilters);
setLanguage(currentLanguage);
const revealTargets = [...document.querySelectorAll("main > section, .topbar > div, .topbar aside")];
for (const target of revealTargets) target.classList.add("reveal-item");
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
  for (const item of flowSteps) item.classList.toggle("is-current", item === step);
}
for (const step of flowSteps) {
  const button = step.querySelector("button");
  if (button) button.addEventListener("click", () => activateFlowStep(step));
}
if ("IntersectionObserver" in window && flowSteps.length) {
  const flowObserver = new IntersectionObserver((entries) => {
    const visibleEntries = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
    if (visibleEntries[0]) activateFlowStep(visibleEntries[0].target);
  }, { threshold: [0.42, 0.7] });
  for (const step of flowSteps) flowObserver.observe(step);
}

const hero = document.querySelector(".topbar");
const productVisualNode = document.querySelector(".product-visual");
const motionSafe = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (hero && productVisualNode && motionSafe) {
  hero.addEventListener("pointermove", (event) => {
    const rect = hero.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    productVisualNode.style.transform = "rotateY(" + (x * -6).toFixed(2) + "deg) rotateX(" + (y * 4).toFixed(2) + "deg) translateY(-4px)";
  });
  hero.addEventListener("pointerleave", () => {
    productVisualNode.style.transform = "";
  });
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
