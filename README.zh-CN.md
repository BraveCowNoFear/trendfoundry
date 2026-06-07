# TrendFoundry

TrendFoundry 是一个自动化创作者情报产品：采集 GitHub、YouTube、Bilibili、Hacker News 和 arXiv 的公开 AI/开发者趋势信号，评分后生成可售卖的 B 站/YouTube 选题包，并为最高分机会生成 6-8 分钟 scene-by-scene 成片脚本。

在线演示：https://bravecownofear.github.io/trendfoundry/

申请样品包：https://github.com/BraveCowNoFear/trendfoundry/issues/new?template=order-sample-pack.yml&title=Sample%20pack%20request%3A%20

订阅：

- RSS：https://bravecownofear.github.io/trendfoundry/feed.xml
- JSON Feed：https://bravecownofear.github.io/trendfoundry/feed.json

公开归档：https://bravecownofear.github.io/trendfoundry/issues/

## 运行

```bash
npm run operate
```

仅本地预览：

```bash
npm run daily
npm start
```

然后打开 `http://localhost:4173`。

`npm run export` 会在 `dist/trendfoundry-sample-pack/` 生成可发送给买家的样品包。可用 `PORT=4174 SITE_DIR=dist/trendfoundry-sample-pack npm start` 预览导出的样品包。

## 自动化

Windows 上的 `scripts/run_daily.ps1` 会运行完整 `npm run operate` 流水线，并把日志写入 `logs/`。GitHub Actions 也会通过 `.github/workflows/daily-ops.yml` 每天运行同一套流程；当 tracked 产品文件变化时，自动提交刷新结果并部署 Pages。

## 产物

- `data/latest.json`：来自 GitHub、YouTube、Bilibili、Hacker News 和 arXiv 的带来源机会列表。
- `docs/daily-brief.md`：可作为付费样品的情报 brief。
- `docs/ready-to-record-script.md`：最高分机会的一份 6-8 分钟分镜式成片脚本。
- `site/index.html`：当前情报包的销售/展示页。
- `site/topics/*.html`：面向搜索流量的 SEO 长尾主题页。
- `site/feed.xml` 和 `site/feed.json`：当前 top 12 机会的订阅 Feed。
- `site/issues/*.html`：持久化公开期刊归档页，用于建立信任、SEO 和复访。
- `docs/design-system.md`：产品和交付资产的极简设计标准。
- `docs/lead-capture.md`：样品包请求的公开入口和处理流程。
- `docs/qa.md`：本地与线上 QA，覆盖交付边界、视觉资产、脚本质量和计划任务。
- `docs/launch-posts.md`：自动生成的首发动态和暖启动外联文案，需人工审核后发布。

## 变现路径

先卖周更情报包：

- 单期样品：USD 9。
- 周更订阅：USD 19/month。
- 垂直频道定制包：USD 49/month。

核心承诺不是批量 AI 内容，而是有真实来源、有复现实测角度、有视频生产结构的高信号选题，并额外给出 demo 步骤、限制说明、发布 metadata 和 fact-safety notes。外部源采集失败会进入 `errors`，并用历史缓存兜底，避免公开 API 限流时污染成品报告。

## QA

```bash
npm run qa
npm run qa -- --online
```

QA 守门会检查买家 CTA、OG/社交预览图尺寸、seller-only 文件边界、commerce listing、ready script 章节、Feed、SEO 页面、运营报告、Windows 计划任务和公开 GitHub Pages 资源。

## 发布

`site/` 目录通过 `.github/workflows/pages.yml` 发布到 GitHub Pages。详情见 `docs/publishing.md`。
