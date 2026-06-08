# TrendFoundry Content Sales CRM

Generated: 2026-06-08T08:29:26.599Z

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

## Status Update Command

Use this after a message is manually sent, a reply arrives, payment is externally confirmed, or a buyer delivery is manually sent:

```bash
npm run record-content-sale -- --source="youtube" --creator="Creator Name" --stage="sent_waiting_reply" --next-due="2026-06-11" --notes="Sent reviewed first message manually"
```

Optional reply capture:

```bash
npm run record-content-sale -- --source="youtube" --creator="Creator Name" --stage="replied_needs_response" --summary="Captured buyer reply summary" --objection="captured objection category" --reply-stage="qualified_needs_custom_pack"
```

The command writes only ignored local CRM files under `data/content-sales-crm/`. It does not send messages, collect payment, or store sensitive payment/account data.

## Safety Boundary

- Local planning only.
- No automatic sending or posting.
- No private contact scraping.
- No payment collection.
- No sensitive payment or account data request.
- No promise of views, subscribers, revenue, platform growth, or buyer outcomes.
