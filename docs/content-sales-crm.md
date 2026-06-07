# TrendFoundry Content Sales CRM

Generated: 2026-06-07T22:05:39.654Z

This is the local CRM layer for first-customer sales. It turns the ignored prospecting board into a weekly review and follow-up plan. It does not send messages, post content, collect payment, or expose the private prospect list in public docs.

## Current Summary

- Pipeline rows: 20
- Due today: 5
- Due this week: 20
- Drafts needing review: 20
- Private override input: `data/content-sales-crm/overrides.csv` (ignored)
- Private reply input: `data/content-sales-crm/replies.csv` (ignored)
- Local CRM output: `dist/content-sales-crm/pipeline.md`

## Weekly Sales Rule

Review 5 prospects per workday. Personalize the first sentence, send only after human review, then update the ignored override file with the new stage.

## Safety Boundary

- Local planning only.
- No automatic sending or posting.
- No private contact scraping.
- No payment collection.
- No sensitive payment or account data request.
- No promise of views, subscribers, revenue, platform growth, or buyer outcomes.
