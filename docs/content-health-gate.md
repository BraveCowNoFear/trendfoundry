# TrendFoundry Content Health Gate

Generated: 2026-06-08T06:37:59.848Z

This gate checks text integrity and sales-safety boundaries for the content-only operating lane. It uses UTF-8 file reads, so it is authoritative when PowerShell console output visually garbles Chinese text.

## Summary

- Checked files: 19
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
| docs/content-subscription-fulfillment.md | public-or-tracked | no | 0 | none |
| docs/content-subscription-plan.md | public-or-tracked | yes | 0 | none |
| docs/custom-proof-pack.md | public-or-tracked | yes | 0 | none |
| docs/episode-workbench.md | public-or-tracked | yes | 0 | none |
| docs/full-episode-script.md | public-or-tracked | yes | 0 | none |
| dist/content-close-pack/today-close-queue.csv | private-ignored | no | 0 | none |
| dist/content-sales-crm/pipeline.csv | private-ignored | yes | 0 | none |
| dist/content-prospecting/prospects.csv | private-ignored | yes | 0 | none |

## Bilibili Sample

- 【2026最全面秋叶ComfyUI教程】B站强推！建议所有想学 AI 视频生成ComfyUI 工作流 的同学，死磕这条视频，花了一周时间整理的ComfyUI视频生成教程 (AI图生视频工作流)
- 【2026最全面ComfyUI教程】B站强推！建议所有想学ComfyUI 工作流 的同学，死磕这条视频，花了一周时间整理的ComfyUI视频生成教程 (PR教程-)
- 当我尝试下载 YouTube 时 (你的米老鼠大爹)

## Safety Boundary

- Does not send messages.
- Does not post content.
- Does not collect payment.
- Does not build or overwrite the frontend.
- Does not publish private prospect rows.
