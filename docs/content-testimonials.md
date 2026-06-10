# TrendFoundry Content Testimonials

Generated: 2026-06-10T14:11:09.393Z

This step turns private buyer feedback into a local social-proof review queue. Private buyer names, quotes, and contacts stay in ignored `dist/content-testimonials/` and `data/content-sales-crm/testimonials.csv`.

## Current Counts

- Private testimonial rows: 0
- Publish candidates after final review: 0
- Needs permission or review: 0
- Status mix: none

## Operator Workflow

1. Ask for quote permission through `dist/content-customer-success/followup-drafts.md`.
2. Record permission and quote locally:

```bash
npm run record-content-testimonial -- --source="youtube" --creator="Creator Name" --quote="Short approved quote" --permission="explicit" --stage="publish_ready" --context="After proof script delivery"
```

3. Run `npm run content-testimonials` or full `npm run content-ops`.
4. Review private `dist/content-testimonials/testimonial-bank.md`.
5. Publish only after final manual review and explicit permission.

## Safety Boundary

- Does not send messages.
- Does not post testimonials.
- Does not collect payment.
- Does not expose private buyer rows in public docs.
- Blocks sensitive data and routes outcome claims to review.
- Does not promise views, subscribers, revenue, platform growth, or buyer outcomes.
