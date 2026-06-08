# TrendFoundry Content Health Gate

Generated: 2026-06-08T17:38:42.391Z

This gate checks text integrity and sales-safety boundaries for the content-only operating lane. It uses UTF-8 file reads, so it is authoritative when PowerShell console output visually garbles Chinese text.

## Summary

- Checked files: 69
- Files with mojibake markers: 0
- Bilibili items in latest dataset: 30
- Bilibili items with readable Chinese text: 30
- Close pack selected rows: 5
- Public close doc prospect leaks: 0

## File Checks

| File | Scope | Readable Chinese | Mojibake hits | Hit tokens |
| --- | --- | --- | ---: | --- |
| data/latest.json | public-or-tracked | yes | 0 | none |
| scripts/generate_full_episode_script.mjs | tracked-source | no | 0 | none |
| scripts/generate_episode_workbench.mjs | tracked-source | no | 0 | none |
| scripts/generate_content_evidence_pack.mjs | tracked-source | no | 0 | none |
| scripts/generate_content_delivery_gate.mjs | tracked-source | no | 0 | none |
| scripts/generate_content_customer_success.mjs | tracked-source | no | 0 | none |
| scripts/generate_content_testimonials.mjs | tracked-source | no | 0 | none |
| scripts/update_content_testimonial_status.mjs | tracked-source | no | 0 | none |
| scripts/generate_buyer_content_pack.mjs | tracked-source | no | 0 | none |
| scripts/run_content_ops.mjs | tracked-source | no | 0 | none |
| scripts/update_content_sale_status.mjs | tracked-source | no | 0 | none |
| scripts/complete_content_order_delivery.mjs | tracked-source | no | 0 | none |
| scripts/complete_custom_proof_delivery.mjs | tracked-source | no | 0 | none |
| docs/buyer-content-pack.md | public-or-tracked | yes | 0 | none |
| docs/content-close-pack.md | public-or-tracked | no | 0 | none |
| docs/content-customer-success.md | public-or-tracked | no | 0 | none |
| docs/content-deal-desk.md | public-or-tracked | no | 0 | none |
| docs/content-delivery-gate.md | public-or-tracked | no | 0 | none |
| docs/content-editorial-audit.md | public-or-tracked | yes | 0 | none |
| docs/content-evidence-pack.md | public-or-tracked | yes | 0 | none |
| docs/content-feedback-loop.md | public-or-tracked | no | 0 | none |
| docs/content-testimonials.md | public-or-tracked | no | 0 | none |
| docs/content-outreach-review.md | public-or-tracked | no | 0 | none |
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
| docs/custom-email-fulfillment.md | public-or-tracked | no | 0 | none |
| docs/email-subscription-sync.md | public-or-tracked | no | 0 | none |
| docs/email-order-routing.md | public-or-tracked | no | 0 | none |
| docs/episode-workbench.md | public-or-tracked | yes | 0 | none |
| docs/full-episode-script.md | public-or-tracked | yes | 0 | none |
| dist/full-episode-script/latest.json | private-ignored | yes | 0 | none |
| dist/episode-workbench/latest.json | private-ignored | yes | 0 | none |
| dist/content-delivery-gate/checks.csv | private-ignored | no | 0 | none |
| dist/content-evidence-pack/content-evidence-pack.md | private-ignored | yes | 0 | none |
| dist/content-evidence-pack/evidence.csv | private-ignored | yes | 0 | none |
| dist/content-evidence-pack/claim-checklist.csv | private-ignored | yes | 0 | none |
| dist/content-close-pack/today-close-queue.csv | private-ignored | no | 0 | none |
| dist/content-subscription-crm/due-queue.csv | private-ignored | no | 0 | none |
| dist/content-subscription-crm/due-queue.md | private-ignored | no | 0 | none |
| dist/content-subscription-due/prepared.csv | private-ignored | no | 0 | none |
| dist/content-subscription-due/prepared.md | private-ignored | no | 0 | none |
| dist/content-subscription-retention/drafts.csv | private-ignored | no | 0 | none |
| dist/content-subscription-retention/drafts.md | private-ignored | no | 0 | none |
| dist/content-outreach-review/review-board.csv | private-ignored | no | 0 | none |
| dist/content-outreach-review/review-board.md | private-ignored | no | 0 | none |
| dist/content-deal-desk/deal-desk.csv | private-ignored | no | 0 | none |
| dist/content-deal-desk/deal-desk.md | private-ignored | no | 0 | none |
| dist/content-deal-desk/response-drafts.md | private-ignored | no | 0 | none |
| dist/content-deal-desk/invoice-drafts.md | private-ignored | no | 0 | none |
| dist/content-customer-success/followups.csv | private-ignored | no | 0 | none |
| dist/content-customer-success/followup-drafts.md | private-ignored | no | 0 | none |
| dist/content-testimonials/testimonials.csv | private-ignored | no | 0 | none |
| dist/content-testimonials/testimonial-bank.md | private-ignored | no | 0 | none |
| dist/content-testimonials/publish-candidates.md | private-ignored | no | 0 | none |
| dist/email-subscription-sync/synced.csv | private-ignored | no | 0 | none |
| dist/custom-email-orders/custom-email-orders.md | private-ignored | no | 0 | none |
| dist/email-order-routing/routes.csv | private-ignored | no | 0 | none |
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
