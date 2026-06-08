# TrendFoundry Content Outreach Review

Generated: 2026-06-08T18:45:06.946Z

This step turns the private daily close queue into reviewer-ready send packs. Detailed prospect rows stay in ignored `dist/content-outreach-review/`.

## Current Counts

- Review packs: 5
- Campaigns with tracked URLs: 5
- Products available: 3
- Offer mix: trendfoundry-proof-custom=4, trendfoundry-proof-script-pack=1

## Operator Workflow

1. Open `dist/content-outreach-review/review-board.md`.
2. Open one file under `dist/content-outreach-review/send-packs/`.
3. Verify the public source URL.
4. Personalize the first sentence.
5. Send manually only after review.
6. If a reply arrives, append the safe summary to ignored `data/content-sales-crm/replies.csv`.
7. Run `npm run content-ops` again to update feedback, revenue assumptions, CRM, close queue, and review packs.

## Safety Boundary

- Does not send messages.
- Does not post content.
- Does not collect payment.
- Does not request sensitive payment or account data.
- Does not publish private prospect rows.
- Does not promise views, subscribers, revenue, platform growth, or buyer outcomes.
