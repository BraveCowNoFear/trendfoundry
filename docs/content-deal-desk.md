# TrendFoundry Content Deal Desk

Generated: 2026-06-08T08:44:43.693Z

This step turns private replies and CRM deal stages into reviewer-ready replies, invoice drafts, and fulfillment commands. Detailed buyer/prospect rows stay in ignored `dist/content-deal-desk/`.

## Current Counts

- Active deal rows: 0
- Objection playbook rows: 4
- Action mix: none

## Operator Workflow

1. Summarize real replies in ignored `data/content-sales-crm/replies.csv`.
2. Run `npm run content-deal-desk` or full `npm run content-ops`.
3. Review `dist/content-deal-desk/deal-desk.md`.
4. Send a reply manually only after checking the source, offer, and safety checklist.
5. Record external payment confirmation before running any fulfillment command.
6. After fulfillment, update the ignored CRM override/status files.
7. Use `npm run record-content-sale` to upsert ignored CRM status instead of editing CSV by hand.

## Safety Boundary

- Does not send messages.
- Does not issue invoices automatically.
- Does not collect payment.
- Does not fulfill before external payment confirmation.
- Does not request sensitive payment or account data.
- Does not publish private buyer/prospect rows.
- Does not promise views, subscribers, revenue, platform growth, or buyer outcomes.
