# TrendFoundry Content Health Gate

Generated: 2026-06-08T07:16:21.658Z

This gate checks text integrity and sales-safety boundaries for the content-only operating lane. It uses UTF-8 file reads, so it is authoritative when PowerShell console output visually garbles Chinese text.

## Summary

- Checked files: 30
- Files with mojibake markers: 0
- Bilibili items in latest dataset: 30
- Bilibili items with readable Chinese text: 30
- Close pack selected rows: 5
- Public close doc prospect leaks: 0

## File Checks

| File | Scope | Readable Chinese | Mojibake hits | Hit tokens |
| --- | --- | --- | ---: | --- |
| data/latest.json | public-or-tracked | yes | 0 | none |
| docs/buyer-content-pack.md | public-or-tracked | yes | 0 | none |
| docs/content-close-pack.md | public-or-tracked | no | 0 | none |
| docs/content-editorial-audit.md | public-or-tracked | yes | 0 | none |
| docs/content-feedback-loop.md | public-or-tracked | no | 0 | none |
| docs/content-ops.md | public-or-tracked | no | 0 | none |
| docs/content-product-listing.md | public-or-tracked | no | 0 | none |
| docs/content-prospecting.md | public-or-tracked | no | 0 | none |
| docs/content-revenue-model.md | public-or-tracked | no | 0 | none |
| docs/content-sales-crm.md | public-or-tracked | no | 0 | none |
| docs/content-sales-sequence.md | public-or-tracked | yes | 0 | none |
| docs/content-subscription-crm.md | public-or-tracked | no | 0 | none |
| docs/content-subscription-due.md | public-or-tracked | no | 0 | none |
| docs/content-subscription-fulfillment.md | public-or-tracked | no | 0 | none |
| docs/content-subscription-plan.md | public-or-tracked | yes | 0 | none |
| docs/content-subscription-retention.md | public-or-tracked | no | 0 | none |
| docs/custom-proof-pack.md | public-or-tracked | yes | 0 | none |
| docs/email-subscription-sync.md | public-or-tracked | no | 0 | none |
| docs/episode-workbench.md | public-or-tracked | yes | 0 | none |
| docs/full-episode-script.md | public-or-tracked | yes | 0 | none |
| dist/content-close-pack/today-close-queue.csv | private-ignored | no | 0 | none |
| dist/content-subscription-crm/due-queue.csv | private-ignored | no | 0 | none |
| dist/content-subscription-crm/due-queue.md | private-ignored | no | 0 | none |
| dist/content-subscription-due/prepared.csv | private-ignored | no | 0 | none |
| dist/content-subscription-due/prepared.md | private-ignored | no | 0 | none |
| dist/content-subscription-retention/drafts.csv | private-ignored | no | 0 | none |
| dist/content-subscription-retention/drafts.md | private-ignored | no | 0 | none |
| dist/email-subscription-sync/synced.csv | private-ignored | no | 0 | none |
| dist/content-sales-crm/pipeline.csv | private-ignored | yes | 0 | none |
| dist/content-prospecting/prospects.csv | private-ignored | yes | 0 | none |

## Bilibili Sample

- 当我尝试下载 YouTube 时 (你的米老鼠大爹)
- 【宏观投资】就业数据造假？美联储加息恐慌！ AI 泡沫要破？SpaceX IPO内幕 + 黄金比特币暴跌，本周市场全解读 (YouTube全球洞见)
- 第24周 GitHub 周榜，19个项目杀入榜单，有个工具把 AI 输入砍掉九成 (GitHub星探)

## Safety Boundary

- Does not send messages.
- Does not post content.
- Does not collect payment.
- Does not build or overwrite the frontend.
- Does not publish private prospect rows.
