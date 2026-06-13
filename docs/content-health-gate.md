# TrendFoundry Content Health Gate

Generated: 2026-06-13T00:31:34.021Z

This gate checks text integrity and sales-safety boundaries for the content-only operating lane. It uses UTF-8 file reads, so it is authoritative when PowerShell console output visually garbles Chinese text.

## Summary

- Checked files: 114
- Files with mojibake markers: 0
- Bilibili items in latest dataset: 29
- Bilibili items with readable Chinese text: 29
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
| scripts/discover_content_outreach_routes.mjs | tracked-source | no | 0 | none |
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
| docs/content-outreach-routes.md | public-or-tracked | no | 0 | none |
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
| dist/content-outreach-routes/routes.csv | private-ignored | no | 0 | none |
| dist/content-outreach-routes/routes.md | private-ignored | no | 0 | none |
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

- AI 垃圾内容正在淹没 YouTube 数学区 - 2maniac (黑纹白斑马)
- 第61期【Coze实战 教程 】一键生成《跨境电商》详情页，工作流/ 智能体 实操搭建 教程 ！ (日行一善AI智能体)
- 【全748集】目前B站最详细最用心的提示词工程（Prompt Engineering）零基础到精通 教程 ，一步步跟着来，从入门到实战全新讲解，7天带你搞定提示词工 (AI_智能体)

## Safety Boundary

- Does not send messages.
- Does not post content.
- Does not collect payment.
- Does not build or overwrite the frontend.
- Does not publish private prospect rows.
