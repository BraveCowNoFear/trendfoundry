# TrendFoundry Content Ops

Generated: 2026-06-07T21:30:38.603Z

Status: success

Refresh public sources: no

Dataset: 2026-06-07T20:33:58.416Z

This is the content-only operating lane. It refreshes editorial audit, episode workbench, full episode script, buyer content pack, custom proof pack, content product listing, sales drafts, and local prospecting drafts without sending messages, collecting payment, or building the frontend.

## Steps

| Step | Status | Exit |
| --- | --- | --- |
| content-audit | success | 0 |
| episode-workbench | success | 0 |
| full-script | success | 0 |
| buyer-pack | success | 0 |
| custom-proof-pack | success | 0 |
| content-listing | success | 0 |
| content-sales | success | 0 |
| content-prospects | success | 0 |

## Current Content State

- Total source items: 126
- Source errors: 2
- Primary episode: NousResearch/hermes-agent
- Buyer deliverables: full-episode-script.md, episode-workbench.md, content-editorial-audit.md
- Custom pack: AI video creators / YouTube and Bilibili (custom-proof-pack.md)
- Sales drafts: 6 drafts across warm_email, bilibili_dynamic, youtube_community, linkedin_or_x, followup_email, objection_reply
- Prospects: 20 local drafts across YouTube, Bilibili
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
3. Review `docs/content-sales-sequence.md` for publish/send drafts.
4. Review `dist/content-prospecting/prospect-board.md` for one-by-one outreach.
5. If approved, use `dist/buyer-content-pack/delivery-email.md` as the human-reviewed send draft.
6. If the buyer requests a custom niche, run `npm run custom-proof-pack -- --niche="..." --platform="..." --buyer="..." --channel="..."`.
