# TrendFoundry Content Customer Success

Generated: 2026-06-08T13:11:37.728Z

This step turns completed buyer deliveries into reviewer-ready feedback, testimonial-permission, and upgrade follow-up drafts. Private buyer rows stay in ignored `dist/content-customer-success/`.

## Current Counts

- Completed delivery receipts found: 0
- Follow-up rows: 0
- Due now: 0
- Waiting until due date: 0
- Draft destination: `dist/content-customer-success/followup-drafts.md`

## Operator Workflow

1. Run `npm run complete-content-order-delivery` after a buyer delivery is manually sent.
2. Run `npm run content-customer-success` or full `npm run content-ops`.
3. Review `dist/content-customer-success/followup-drafts.md`.
4. Send only after checking the buyer context and safety language.
5. Capture feedback in ignored `data/content-sales-crm/replies.csv` or with `npm run record-content-sale`.
6. Use testimonial quotes only after explicit permission.

## Safety Boundary

- Does not send messages.
- Does not post testimonials.
- Does not collect payment.
- Does not request sensitive payment or account data.
- Does not publish private buyer rows.
- Does not promise views, subscribers, revenue, platform growth, or buyer outcomes.
