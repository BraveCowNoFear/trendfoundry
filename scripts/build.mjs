import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const data = JSON.parse(await readFile(path.join(root, "data", "latest.json"), "utf8"));
const siteDir = path.join(root, "site");
const docsDir = path.join(root, "docs");
const topicsDir = path.join(siteDir, "topics");
const zhDir = path.join(siteDir, "zh");
const orderDir = path.join(siteDir, "order");
const siteIssuesDir = path.join(siteDir, "issues");
const docsIssuesDir = path.join(docsDir, "issues");
const contactEmail = "rivan_Britain@outlook.com";
const publicSiteUrl = "https://bravecownofear.github.io/trendfoundry/";
const ogImageUrl = `${publicSiteUrl}og-image.png`;
const orderSubject = encodeURIComponent("TrendFoundry sample pack order");
const orderBody = encodeURIComponent("Hi, I want to order the TrendFoundry $9 sample pack. Please send the latest issue and payment instructions.");
const orderHref = `mailto:${contactEmail}?subject=${orderSubject}&body=${orderBody}`;
const issueOrderHref = "https://github.com/BraveCowNoFear/trendfoundry/issues/new?template=order-sample-pack.yml&title=Sample%20pack%20request%3A%20";
await mkdir(siteDir, { recursive: true });
await mkdir(docsDir, { recursive: true });
await mkdir(topicsDir, { recursive: true });
await mkdir(zhDir, { recursive: true });
await mkdir(orderDir, { recursive: true });
await mkdir(siteIssuesDir, { recursive: true });
await mkdir(docsIssuesDir, { recursive: true });

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
  const body =
    lang === "zh"
      ? `你好，我想订购 TrendFoundry ${tier.nameZh}（${tier.price} ${tier.cadenceZh}）。\n\n我的频道：\n主要平台：Bilibili / YouTube / other\n我想要的主题方向：\n偏好交付方式：email / GitHub issue\n\n请发送付款说明和下一步交付流程。`
      : `Hi, I want to order TrendFoundry ${tier.name} (${tier.price} ${tier.cadence}).\n\nMy channel:\nMain platform: YouTube / Bilibili / other\nNiche preference:\nPreferred delivery route: email / GitHub issue\n\nPlease send payment instructions and the next delivery step.`;
  return `mailto:${contactEmail}?subject=${subject}&body=${encodeURIComponent(body)}`;
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
const socialProof = `<section class="visual-proof" aria-label="Share preview">
      <div>
        ${dual("Share preview", "分享预览", "p", ' class="section-label"')}
        ${dual("A cleaner link card for outreach, checkout pages, and social posts.", "给外联、收款页和社交动态准备一张更清楚的链接卡片。", "h2")}
        ${dual("Every buyer-facing link should explain the product before anyone clicks through. This preview image carries the offer, source mix, and no-hype positioning.", "每个面向买家的链接都应该在点击前说明产品价值。这张预览图同时承载报价、来源组合和不夸张的定位。", "p")}
      </div>
      <img src="./og-image.png" alt="TrendFoundry social preview" width="1200" height="630">
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
- 钩子：${item.deliverables.hook}
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
    "钩子": item.deliverables.hook,
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
| 0:00-0:20 | Title card + source page | 今天不做泛泛的 AI 盘点，只验证 ${item.title} 是否值得进入真实创作工作流。 | Set the practical test frame. |
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
- Description opener: 这期用公开来源验证 ${item.title}，重点看它能否进入真实创作工作流。
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
  ${dual(item.summary || "No summary available.", `创作切入：${item.deliverables.hook}`, "p")}
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

const sourceButtons = ["all", ...Object.keys(bySource)]
  .map((source) => `<button class="filter-button${source === "all" ? " active" : ""}" type="button" data-source-filter="${source}">${source === "all" ? dual("All", "全部") : source}</button>`)
  .join("");

const zhSourceButtons = ["all", ...Object.keys(bySource)]
  .map((source) => `<button class="filter-button${source === "all" ? " active" : ""}" type="button" data-source-filter="${source}">${source === "all" ? "全部" : source}</button>`)
  .join("");

const zhCards = top
  .map(
    (item, index) => `<article class="card" data-source="${escapeHtml(item.source)}" data-fit="${escapeHtml(item.monetizationFit)}" data-search="${escapeHtml(`${item.title} ${item.deliverables.hook} ${item.deliverables.bilibiliTitles?.[0] || ""} ${item.sourceQuery} ${item.targetCreator}`.toLowerCase())}">
  <div class="meta"><span>${escapeHtml(item.source)}</span><span>评分 ${item.score}</span><span>${escapeHtml(fitLabel(item.monetizationFit, "zh"))}</span>${item.stale ? "<span>缓存</span>" : ""}${item.qualityFlags?.length ? "<span>需复核</span>" : ""}</div>
  <h3>${index + 1}. <a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a></h3>
  <p>创作切入：${escapeHtml(item.deliverables.hook)}</p>
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
    <li><strong>Creator hook:</strong> ${escapeHtml(item.deliverables.hook)}</li>
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
    `Creator hook: ${item.deliverables.hook}`,
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
- Hook: ${item.deliverables.hook}
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
    <li><strong>Hook:</strong> ${escapeHtml(item.deliverables.hook)}</li>
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
      <div class="hero-actions">
        <a class="action primary" href="./public-sample.en.md">${dual("English sample", "英文样品")}</a>
        <a class="action" href="./public-sample.en.csv">${dual("English CSV", "英文 CSV")}</a>
        <a class="action primary" href="./public-sample.zh-CN.md">${dual("Chinese sample", "中文样品")}</a>
        <a class="action" href="./public-sample.zh-CN.csv">${dual("Chinese CSV", "中文 CSV")}</a>
        <a class="action" href="./ready-to-record-script.md">${dual("Open script", "打开脚本")}</a>
        <a class="action primary" href="./order/">${dual("Order without login", "无登录下单")}</a>
        <a class="action strong" href="${issueOrderHref}">${dual("Request on GitHub", "在 GitHub 申请")}</a>
        <a class="action" href="${orderHref}">${dual("Email order", "邮件下单")}</a>
      </div>
    </div>
    <aside>
      <span><strong>${top.length}</strong> ${dual("opportunities", "个机会")}</span>
      <span><strong>${high.length}</strong> ${dual("high-fit", "高匹配")}</span>
      <span><strong>${data.errorCount || 0}</strong> ${dual("source errors", "个来源错误")}</span>
      ${sourceMixPanel}
    </aside>
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
    <section class="pricing" aria-label="Pricing tiers">
      <div class="section-head">
        ${dual("Pricing", "定价", "p", ' class="section-label"')}
        ${dual("Choose the depth that matches your publishing cadence.", "按你的更新节奏选择交付深度。", "h2")}
        ${dual("Every tier is built around the same promise: fewer weak topics, faster planning, and a clearer recording queue.", "每一档都围绕同一个价值：少踩弱选题、更快规划、录制队列更清楚。", "p")}
      </div>
      <div class="tier-grid">${pricingCards}</div>
    </section>
    <section class="sample-preview" aria-label="Free public sample">
      <div>
        ${dual("Free sample", "免费样品", "p", ' class="section-label"')}
        ${dual("Inspect three current opportunities before ordering.", "下单前先检查 3 个当前机会。", "h2")}
        ${dual("The public sample reveals format, scoring, source links, and quality notes without exposing the full paid pack.", "公开样品展示格式、评分、来源链接和质量备注，但不暴露完整付费包。", "p")}
      </div>
      <div class="sample-actions">
        <a class="action primary" href="./public-sample.en.md">${dual("Open English sample", "打开英文样品")}</a>
        <a class="action" href="./public-sample.en.csv">${dual("English CSV", "英文 CSV")}</a>
        <a class="action primary" href="./public-sample.zh-CN.md">${dual("Open Chinese sample", "打开中文样品")}</a>
        <a class="action" href="./public-sample.zh-CN.csv">${dual("Chinese CSV", "中文 CSV")}</a>
      </div>
    </section>
    ${socialProof}
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
    <section class="toolbelt" aria-label="Opportunity controls">
      <div class="search-wrap">
        <label for="opportunity-search">${dual("Search opportunities", "搜索机会")}</label>
        <input id="opportunity-search" type="search" ${langAttr("agent, video, workflow, arxiv...", "智能体、视频、工作流、arxiv...")}>
      </div>
      <div class="filters" aria-label="Source filters">${sourceButtons}</div>
      <p id="result-count" class="result-count" data-count="${top.length}">${top.length} visible opportunities</p>
    </section>
    <section class="grid" id="opportunity-grid">${cards}</section>
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
      <div class="hero-actions">
        <a class="action primary" href="../public-sample.zh-CN.md">中文样品</a>
        <a class="action" href="../public-sample.zh-CN.csv">中文 CSV</a>
        <a class="action primary" href="../public-sample.en.md">English sample</a>
        <a class="action" href="../public-sample.en.csv">English CSV</a>
        <a class="action" href="../ready-to-record-script.md">打开可录制脚本</a>
        <a class="action primary" href="../order/">无登录下单</a>
        <a class="action strong" href="${issueOrderHref}">在 GitHub 申请</a>
        <a class="action" href="${orderHref}">邮件下单</a>
      </div>
    </div>
    <aside>
      <span><strong>${top.length}</strong> 个机会</span>
      <span><strong>${high.length}</strong> 高匹配</span>
      <span><strong>${data.errorCount || 0}</strong> 个来源错误</span>
      ${sourceMixPanel}
    </aside>
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
    <section class="pricing" aria-label="Pricing tiers">
      <div class="section-head">
        <p class="section-label">定价</p>
        <h2>按你的更新节奏选择交付深度。</h2>
        <p>每一档都围绕同一个价值：少踩弱选题、更快规划、录制队列更清楚。</p>
      </div>
      <div class="tier-grid">${pricingCards}</div>
    </section>
    <section class="sample-preview" aria-label="Free public sample">
      <div>
        <p class="section-label">免费样品</p>
        <h2>下单前先看 3 个当前机会。</h2>
        <p>公开样品展示格式、评分、来源链接和质量备注；完整 12 条机会、CSV 和脚本结构仍作为付费/请求交付。</p>
      </div>
      <div class="sample-actions">
        <a class="action primary" href="../public-sample.zh-CN.md">打开中文样品</a>
        <a class="action" href="../public-sample.zh-CN.csv">中文 CSV</a>
        <a class="action primary" href="../public-sample.en.md">Open English sample</a>
        <a class="action" href="../public-sample.en.csv">English CSV</a>
      </div>
    </section>
    <section class="visual-proof" aria-label="Share preview">
      <div>
        <p class="section-label">分享预览</p>
        <h2>适合外联、社交动态和收款页的清楚链接卡片。</h2>
        <p>买家点击前就能看到报价、来源组合和“不夸张承诺”的定位。</p>
      </div>
      <img src="../og-image.png" alt="TrendFoundry social preview" width="1200" height="630">
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
    <section class="toolbelt" aria-label="Opportunity controls">
      <div class="search-wrap">
        <label for="opportunity-search">搜索机会</label>
        <input id="opportunity-search" type="search" placeholder="智能体、视频、工作流、arxiv...">
      </div>
      <div class="filters" aria-label="Source filters">${zhSourceButtons}</div>
      <p id="result-count" class="result-count" data-count="${top.length}">${top.length} 个可见机会</p>
    </section>
    <section class="grid" id="opportunity-grid">${zhCards}</section>
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
  margin: 0 0 18px;
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
.price > span { display: block; font-size: 32px; font-weight: 850; }
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
  .seo-hub,
  .seo-summary,
  .feed-box,
  .archive-box,
  .issue-summary,
  .order-copy,
  .mail-drafts,
  .topic-links,
  .topic-list,
  .issue-list,
  .toolbelt,
  .handoff,
  .grid {
    grid-template-columns: 1fr;
  }
  .price { text-align: left; }
  .sample-actions { justify-content: flex-start; }
  .feed-actions { justify-content: flex-start; }
  .visual-proof img { justify-self: start; max-width: 100%; }
  .result-count { margin: 0; white-space: normal; }
  .brandrow { align-items: flex-start; }
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
    font-size: 23px;
    line-height: 1.08;
    white-space: normal;
    word-break: break-word;
    overflow-wrap: anywhere;
  }
  .sub {
    width: 100%;
    max-width: 100%;
    font-size: 16px;
    white-space: normal;
    overflow-wrap: anywhere;
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
  .filter-button { flex: 1 1 auto; }
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
  if (currentLanguage === "zh") return count + " 个可见机会";
  return count === 1 ? "1 visible opportunity" : count + " visible opportunities";
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
}

for (const button of buttons) {
  button.addEventListener("click", () => {
    activeSource = button.dataset.sourceFilter;
    for (const other of buttons) other.classList.toggle("active", other === button);
    applyFilters();
  });
}

for (const button of languageButtons) {
  button.addEventListener("click", () => setLanguage(button.dataset.languageToggle));
}

search.addEventListener("input", applyFilters);
setLanguage(currentLanguage);
`;

await writeFile(path.join(docsDir, "daily-brief.md"), report, "utf8");
await writeFile(path.join(docsDir, "ready-to-record-script.md"), script, "utf8");
await writeFile(path.join(docsDir, "public-sample.md"), publicSampleReportEn, "utf8");
await writeFile(path.join(docsDir, "public-sample.en.md"), publicSampleReportEn, "utf8");
await writeFile(path.join(docsDir, "public-sample.zh-CN.md"), publicSampleReportZh, "utf8");
await writeFile(path.join(siteDir, "index.html"), html, "utf8");
await writeFile(path.join(zhDir, "index.html"), zhHtml, "utf8");
await writeFile(path.join(orderDir, "index.html"), orderHtml, "utf8");
await writeFile(path.join(siteDir, "styles.css"), css, "utf8");
await writeFile(path.join(siteDir, "app.js"), app, "utf8");
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
  "public-sample.md",
  "public-sample.en.md",
  "public-sample.zh-CN.md",
  "public-sample.csv",
  "public-sample.en.csv",
  "public-sample.zh-CN.csv",
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
