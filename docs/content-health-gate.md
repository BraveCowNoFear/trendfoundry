# TrendFoundry Content Health Gate

Generated: 2026-06-13T00:17:38.843Z

This gate checks text integrity and sales-safety boundaries for the content-only operating lane. It uses UTF-8 file reads, so it is authoritative when PowerShell console output visually garbles Chinese text.

## Summary

- Checked files: 110
- Files with mojibake markers: 0
- Bilibili items in latest dataset: 30
- Bilibili items with readable Chinese text: 30
- Close pack selected rows: 5
- Public close doc prospect leaks: 0

## File Checks

| File | Scope | Readable Chinese | Mojibake hits | Hit tokens |
| --- | --- | --- | ---: | --- |
| data/latest.json | public-or-tracked | yes | 0 | none |
| scripts/generate_content_action_brief.mjs | tracked-source | no | 0 | none |
| scripts/generate_content_attribution.mjs | tracked-source | no | 0 | none |
| scripts/generate_content_experiments.mjs | tracked-source | no | 0 | none |
| scripts/generate_content_send_batch.mjs | tracked-source | no | 0 | none |
| scripts/generate_full_episode_script.mjs | tracked-source | no | 0 | none |
| scripts/generate_episode_workbench.mjs | tracked-source | no | 0 | none |
| scripts/generate_content_evidence_pack.mjs | tracked-source | no | 0 | none |
| scripts/generate_content_delivery_gate.mjs | tracked-source | no | 0 | none |
| scripts/generate_content_customer_success.mjs | tracked-source | no | 0 | none |
| scripts/generate_content_testimonials.mjs | tracked-source | no | 0 | none |
| scripts/update_content_testimonial_status.mjs | tracked-source | no | 0 | none |
| scripts/generate_content_outreach_send_log.mjs | tracked-source | no | 0 | none |
| scripts/generate_content_outreach_followups.mjs | tracked-source | no | 0 | none |
| scripts/export_content_outreach_drafts.mjs | tracked-source | no | 0 | none |
| scripts/complete_content_outreach_send.mjs | tracked-source | no | 0 | none |
| scripts/intake_content_replies.mjs | tracked-source | no | 0 | none |
| scripts/generate_content_outreach_review.mjs | tracked-source | no | 0 | none |
| scripts/generate_buyer_content_pack.mjs | tracked-source | no | 0 | none |
| scripts/run_content_ops.mjs | tracked-source | no | 0 | none |
| scripts/update_content_sale_status.mjs | tracked-source | no | 0 | none |
| scripts/complete_content_order_delivery.mjs | tracked-source | no | 0 | none |
| scripts/complete_custom_proof_delivery.mjs | tracked-source | no | 0 | none |
| scripts/generate_content_fulfillment_queue.mjs | tracked-source | no | 0 | none |
| scripts/generate_content_outreach_gate.mjs | tracked-source | no | 0 | none |
| docs/content-action-brief.md | public-or-tracked | no | 0 | none |
| docs/content-attribution.md | public-or-tracked | no | 0 | none |
| docs/buyer-content-pack.md | public-or-tracked | yes | 0 | none |
| docs/content-experiments.md | public-or-tracked | no | 0 | none |
| docs/content-send-batch.md | public-or-tracked | no | 0 | none |
| docs/content-close-pack.md | public-or-tracked | no | 0 | none |
| docs/content-customer-success.md | public-or-tracked | no | 0 | none |
| docs/content-deal-desk.md | public-or-tracked | no | 0 | none |
| docs/content-delivery-gate.md | public-or-tracked | no | 0 | none |
| docs/content-editorial-audit.md | public-or-tracked | yes | 0 | none |
| docs/content-evidence-pack.md | public-or-tracked | yes | 0 | none |
| docs/content-feedback-loop.md | public-or-tracked | no | 0 | none |
| docs/content-fulfillment-queue.md | public-or-tracked | no | 0 | none |
| docs/content-reply-intake.md | public-or-tracked | no | 0 | none |
| docs/content-testimonials.md | public-or-tracked | no | 0 | none |
| docs/content-outreach-review.md | public-or-tracked | no | 0 | none |
| docs/content-outreach-gate.md | public-or-tracked | no | 0 | none |
| docs/content-outreach-sends.md | public-or-tracked | no | 0 | none |
| docs/content-outreach-followups.md | public-or-tracked | no | 0 | none |
| docs/content-outreach-export.md | public-or-tracked | no | 0 | none |
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
| dist/content-action-brief/actions.csv | private-ignored | no | 0 | none |
| dist/content-action-brief/action-brief.md | private-ignored | no | 0 | none |
| dist/content-attribution/attribution-ledger.csv | private-ignored | no | 0 | none |
| dist/content-attribution/attribution-ledger.md | private-ignored | no | 0 | none |
| dist/content-experiments/experiments.csv | private-ignored | no | 0 | none |
| dist/content-experiments/experiment-plan.md | private-ignored | no | 0 | none |
| dist/content-send-batch/send-batch.csv | private-ignored | no | 0 | none |
| dist/content-send-batch/send-batch.md | private-ignored | no | 0 | none |
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
| dist/content-outreach-gate/checks.csv | private-ignored | no | 0 | none |
| dist/content-outreach-followups/followups.csv | private-ignored | no | 0 | none |
| dist/content-outreach-followups/followups.md | private-ignored | no | 0 | none |
| dist/content-outreach-export/drafts.csv | private-ignored | no | 0 | none |
| dist/content-outreach-export/drafts.md | private-ignored | no | 0 | none |
| dist/content-deal-desk/deal-desk.csv | private-ignored | no | 0 | none |
| dist/content-deal-desk/deal-desk.md | private-ignored | no | 0 | none |
| dist/content-deal-desk/response-drafts.md | private-ignored | no | 0 | none |
| dist/content-deal-desk/invoice-drafts.md | private-ignored | no | 0 | none |
| dist/content-fulfillment-queue/fulfillment-queue.csv | private-ignored | no | 0 | none |
| dist/content-fulfillment-queue/fulfillment-queue.md | private-ignored | no | 0 | none |
| dist/content-customer-success/followups.csv | private-ignored | no | 0 | none |
| dist/content-customer-success/followup-drafts.md | private-ignored | no | 0 | none |
| dist/content-testimonials/testimonials.csv | private-ignored | no | 0 | none |
| dist/content-testimonials/testimonial-bank.md | private-ignored | no | 0 | none |
| dist/content-testimonials/publish-candidates.md | private-ignored | no | 0 | none |
| dist/content-outreach-sends/send-log.csv | private-ignored | no | 0 | none |
| dist/content-outreach-sends/send-log.md | private-ignored | no | 0 | none |
| dist/content-reply-intake/parsed-replies.csv | private-ignored | no | 0 | none |
| dist/content-reply-intake/parsed-replies.md | private-ignored | no | 0 | none |
| dist/email-subscription-sync/synced.csv | private-ignored | no | 0 | none |
| dist/custom-email-orders/custom-email-orders.md | private-ignored | no | 0 | none |
| dist/email-order-routing/routes.csv | private-ignored | no | 0 | none |
| dist/content-sales-crm/pipeline.csv | private-ignored | yes | 0 | none |
| dist/content-prospecting/prospects.csv | private-ignored | yes | 0 | none |

## Bilibili Sample

- 3个开源项目打造 AI 分身！以后更新视频，可以不用我了 (IT咖啡馆)
- 16岁，一部手机，代码一行没跑过。我把我的认知推理中间件开源了——安全只是推理做对之后自然溢出的结果。 (大一统意识与美学系统)
- 【目前最强LTX2.3 Ai 视频模型】B站搭建最详细LTX2.3模型手把手教你搭建音画同步 工作流 一个视频最直接教会你（附现成 工作流 +模型+插件）双击启动 (秋叶aaeki)

## Safety Boundary

- Does not send messages.
- Does not post content.
- Does not collect payment.
- Does not build or overwrite the frontend.
- Does not publish private prospect rows.
