# TrendFoundry

TrendFoundry 是一个自动化创作者情报产品：从 GitHub、Hacker News、arXiv 等公开信号抓取 AI/开发者趋势，评分后生成可售卖的 B 站/YouTube 选题包。

在线演示：https://bravecownofear.github.io/trendfoundry/

申请样品包：https://github.com/BraveCowNoFear/trendfoundry/issues/new?template=order-sample-pack.yml&title=Sample%20pack%20request%3A%20

## 运行

```bash
npm run daily
npm start
```

然后打开 `http://localhost:4173`。

`npm run export` 会在 `dist/trendfoundry-sample-pack/` 生成可发给买家的样品包。
可以用 `PORT=4174 SITE_DIR=dist/trendfoundry-sample-pack npm start` 预览导出的样品包。

## 自动化

Windows 上的 `scripts/run_daily.ps1` 会刷新情报包，并把日志写入 `logs/`。

## 产物

- `data/latest.json`：来自 GitHub、YouTube、Bilibili、Hacker News、arXiv 的带来源链接机会列表。
- `docs/daily-brief.md`：可作为付费样品的日报。
- `site/index.html`：当前情报包的销售/展示页。
- `docs/design-system.md`：产品和交付资产的极简设计标准。
- `docs/lead-capture.md`：样品包请求的公开入口和处理流程。

## 变现路径

先卖周更情报包：

- 单期样品 USD 9。
- 周更订阅 USD 19/month。
- 垂直频道定制包 USD 49/month。

核心承诺不是批量 AI 灌水，而是有真实来源、有复现实测角度、有视频生产结构的高信号选题。外部源采集失败会进入 `errors`，并用历史缓存兜底，避免公开 API 限流时污染成品报告。

## 发布

`site/` 目录通过 `.github/workflows/pages.yml` 发布到 GitHub Pages。详情见 `docs/publishing.md`。
