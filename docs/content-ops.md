# TrendFoundry Content Ops

Generated: 2026-06-08T18:33:56.308Z

Status: success

Refresh public sources: no

Dataset: 2026-06-08T17:50:16.053Z

This is the content-only operating lane. It refreshes editorial audit, episode workbench, full episode script, source evidence pack, buyer content pack, buyer delivery gate, custom proof pack, content product listing, weekly subscription plan, sales drafts, local prospecting drafts, reply intake, local sales CRM, revenue model, feedback learning loop, daily close pack, outreach review packs, outreach gate, outreach send receipts, deal desk, unified fulfillment queue, customer-success follow-ups, testimonial bank, prioritized action brief, and text health gate without sending messages, collecting payment, or building the frontend.

## Steps

| Step | Status | Exit |
| --- | --- | --- |
| content-audit | success | 0 |
| episode-workbench | success | 0 |
| full-script | success | 0 |
| content-evidence | success | 0 |
| buyer-pack | success | 0 |
| content-delivery-gate | success | 0 |
| custom-proof-pack | success | 0 |
| content-listing | success | 0 |
| content-subscription | success | 0 |
| content-subscription-crm | success | 0 |
| content-subscription-due | success | 0 |
| content-subscription-retention | success | 0 |
| content-sales | success | 0 |
| content-prospects | success | 0 |
| content-reply-intake | success | 0 |
| content-crm | success | 0 |
| content-revenue | success | 0 |
| content-feedback | success | 0 |
| content-close | success | 0 |
| content-outreach-review | success | 0 |
| content-outreach-gate | success | 0 |
| content-outreach-sends | success | 0 |
| content-deal-desk | success | 0 |
| content-fulfillment-queue | success | 0 |
| content-customer-success | success | 0 |
| content-testimonials | success | 0 |
| content-action-brief | success | 0 |
| content-health | success | 0 |

## Current Content State

- Total source items: 125
- Source errors: 0
- Primary episode: NousResearch/hermes-agent
- Evidence pack: 5 evidence items, 20 claims
- Buyer deliverables: START-HERE.md, full-episode-script.md, episode-workbench.md, content-evidence-pack.md, content-editorial-audit.md
- Delivery gate: 45 passed, 0 failed
- Custom pack: AI video creators / YouTube and Bilibili (custom-proof-pack.md)
- Subscription plan: 4 weeks (2026-06-17, 2026-06-24, 2026-07-01, 2026-07-08)
- Subscription CRM: 0 subscribers, 0 ready today, 0 needing payment review, 0 renewal checks
- Subscription due fulfillment: 0 ready, 0 prepared, 0 failed
- Subscription retention: 0 drafts, 0 payment review, 0 renewal
- Sales drafts: 6 drafts across warm_email, bilibili_dynamic, youtube_community, linkedin_or_x, followup_email, objection_reply
- Prospects: 20 local drafts across YouTube, Bilibili
- Reply intake: 0 parsed, 0 skipped
- CRM: 20 rows, 5 due today, 20 due this week
- Revenue model: base new MRR USD 70, base month-one cash USD 92.5
- Feedback loop: 3 learnings, 4 questions, 0 private replies
- Close pack: 5 selected, 5 clean, 0 needing cleanup
- Outreach review: 5 send packs, 0 skipped for text cleanup
- Outreach gate: 5 passed, 0 failed, 120 average draft words
- Outreach sends: 0 receipts, 0 sent today, 0 waiting reply
- Deal desk: 0 active deals, 4 objection playbook rows
- Fulfillment queue: 0 rows, 0 waiting manual send, 0 needing delivery fix, 0 concise-ready
- Customer success: 0 follow-ups, 0 due now, 0 completion receipts
- Testimonials: 0 private rows, 0 publish candidates, 0 needing permission/review
- Action brief: 5 actions, top lane outreach_review, 5 needing manual review
- Health gate: 89 files checked, 0 with mojibake markers, 0 public prospect leaks
- Listing SKUs: trendfoundry-proof-script-pack, trendfoundry-proof-weekly, trendfoundry-proof-custom
- Seller-only exclusions: prospects.csv, outreach-board.md, data/latest.json, data/raw/, data/leads.json, docs/lead-pipeline.md, docs/lead-replies.md, sensitive payment data, account data

## Safety Boundary

- Does not send messages.
- Does not collect payment.
- Does not build or overwrite the frontend.
- Does not include seller-only files in buyer deliverables.

## Next Operator Action

1. Review `docs/buyer-content-pack.md`.
2. Review `docs/content-delivery-gate.md` before fulfilling a paid buyer order.
3. Review `docs/content-evidence-pack.md` before recording or delivering fact-sensitive claims.
4. Review `docs/content-product-listing.md` before publishing or copying payment-platform fields.
5. Review `docs/content-subscription-plan.md` for the weekly subscription promise.
6. Review `docs/content-subscription-crm.md` and private `dist/content-subscription-crm/due-queue.md` for due subscribers.
7. Review `docs/content-subscription-due.md` and private `dist/content-subscription-due/prepared.csv` for prepared weekly deliveries.
8. Review `docs/content-subscription-retention.md` and private `dist/content-subscription-retention/drafts.md` for renewal/payment-review drafts.
9. Review `docs/content-sales-sequence.md` for publish/send drafts.
10. Review `dist/content-prospecting/prospect-board.md` for one-by-one outreach.
11. Drop copied replies into `data/content-sales-crm/reply-inbox/`, then review `dist/content-reply-intake/parsed-replies.md`.
12. Review `dist/content-sales-crm/pipeline.md` for today's follow-up queue.
13. Review `docs/content-revenue-model.md` for weekly sales targets.
14. Review `docs/content-feedback-loop.md` before editing product copy or sales objections.
15. Review `dist/content-close-pack/today-close-queue.md` for the five-row daily close queue.
16. Review `dist/content-outreach-review/review-board.md` and one send pack at a time under `dist/content-outreach-review/send-packs/`.
17. Review `docs/content-outreach-gate.md`; only send packs with passed gate rows may enter action brief.
18. After a send pack is manually sent, run `npm run complete-content-outreach-send -- --review-id="..."`.
19. Review `dist/content-deal-desk/deal-desk.md` when a reply, invoice request, or payment confirmation arrives.
20. Review `dist/content-fulfillment-queue/fulfillment-queue.md` before any manual buyer delivery.
21. Review `dist/content-customer-success/followup-drafts.md` after any delivered order enters `fulfilled_waiting_feedback`.
22. Review `dist/content-testimonials/testimonial-bank.md` before reusing any quote in sales copy.
23. Review `dist/content-action-brief/action-brief.md` for the prioritized private action queue.
24. Review `docs/content-health-gate.md` before trusting console-rendered Chinese text.
25. If approved, use `dist/buyer-content-pack/delivery-email.md` as the human-reviewed send draft.
26. If the buyer requests a custom niche, run `npm run custom-proof-pack -- --niche="..." --platform="..." --buyer="..." --channel="..."`.
