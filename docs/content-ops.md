# TrendFoundry Content Ops

Generated: 2026-06-08T07:00:53.200Z

Status: success

Refresh public sources: no

Dataset: 2026-06-07T20:33:58.416Z

This is the content-only operating lane. It refreshes editorial audit, episode workbench, full episode script, buyer content pack, custom proof pack, content product listing, weekly subscription plan, sales drafts, local prospecting drafts, local sales CRM, revenue model, feedback learning loop, daily close pack, and text health gate without sending messages, collecting payment, or building the frontend.

## Steps

| Step | Status | Exit |
| --- | --- | --- |
| content-audit | success | 0 |
| episode-workbench | success | 0 |
| full-script | success | 0 |
| buyer-pack | success | 0 |
| custom-proof-pack | success | 0 |
| content-listing | success | 0 |
| content-subscription | success | 0 |
| content-subscription-crm | success | 0 |
| content-subscription-due | success | 0 |
| content-sales | success | 0 |
| content-prospects | success | 0 |
| content-crm | success | 0 |
| content-revenue | success | 0 |
| content-feedback | success | 0 |
| content-close | success | 0 |
| content-health | success | 0 |

## Current Content State

- Total source items: 126
- Source errors: 2
- Primary episode: NousResearch/hermes-agent
- Buyer deliverables: full-episode-script.md, episode-workbench.md, content-editorial-audit.md
- Custom pack: AI video creators / YouTube and Bilibili (custom-proof-pack.md)
- Subscription plan: 4 weeks (2026-06-17, 2026-06-24, 2026-07-01, 2026-07-08)
- Subscription CRM: 0 subscribers, 0 ready today, 0 needing payment review, 0 renewal checks
- Subscription due fulfillment: 0 ready, 0 prepared, 0 failed
- Sales drafts: 6 drafts across warm_email, bilibili_dynamic, youtube_community, linkedin_or_x, followup_email, objection_reply
- Prospects: 20 local drafts across YouTube, Bilibili
- CRM: 20 rows, 5 due today, 20 due this week
- Revenue model: base new MRR USD 70, base month-one cash USD 92.5
- Feedback loop: 3 learnings, 4 questions, 0 private replies
- Close pack: 5 selected, 5 clean, 0 needing cleanup
- Health gate: 25 files checked, 0 with mojibake markers, 0 public prospect leaks
- Listing SKUs: trendfoundry-proof-script-pack, trendfoundry-proof-weekly, trendfoundry-proof-custom
- Seller-only exclusions: prospects.csv, outreach-board.md, data/latest.json, data/raw/, data/leads.json, docs/lead-pipeline.md, docs/lead-replies.md, sensitive payment data, account data

## Safety Boundary

- Does not send messages.
- Does not collect payment.
- Does not build or overwrite the frontend.
- Does not include seller-only files in buyer deliverables.

## Next Operator Action

1. Review `docs/buyer-content-pack.md`.
2. Review `docs/content-product-listing.md` before publishing or copying payment-platform fields.
3. Review `docs/content-subscription-plan.md` for the weekly subscription promise.
4. Review `docs/content-subscription-crm.md` and private `dist/content-subscription-crm/due-queue.md` for due subscribers.
5. Review `docs/content-subscription-due.md` and private `dist/content-subscription-due/prepared.csv` for prepared weekly deliveries.
6. Review `docs/content-sales-sequence.md` for publish/send drafts.
7. Review `dist/content-prospecting/prospect-board.md` for one-by-one outreach.
8. Review `dist/content-sales-crm/pipeline.md` for today's follow-up queue.
9. Review `docs/content-revenue-model.md` for weekly sales targets.
10. Review `docs/content-feedback-loop.md` before editing product copy or sales objections.
11. Review `dist/content-close-pack/today-close-queue.md` for the five-row daily close queue.
12. Review `docs/content-health-gate.md` before trusting console-rendered Chinese text.
13. If approved, use `dist/buyer-content-pack/delivery-email.md` as the human-reviewed send draft.
14. If the buyer requests a custom niche, run `npm run custom-proof-pack -- --niche="..." --platform="..." --buyer="..." --channel="..."`.
