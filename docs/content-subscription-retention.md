# TrendFoundry Content Subscription Retention

Generated: 2026-06-10T14:11:13.557Z

This content-only step turns private subscription CRM actions into retention drafts for payment review and renewal checks. It does not send messages and does not expose subscriber contacts in tracked docs.

## Current Counts

- Queue rows reviewed: 0
- Payment review drafts: 0
- Renewal check drafts: 0
- Total private drafts: 0

## Operator Flow

1. Run `npm run content-subscription-crm`.
2. Run `npm run content-subscription-retention`.
3. Review ignored `dist/content-subscription-retention/drafts.md`.
4. If payment is externally confirmed, run `npm run record-content-subscription` with the new `--payment-ref` and `--paid-through`.
5. If the subscriber pauses, update ignored subscriber status to `inactive` or `cancelled`.

## Safety Boundary

- Does not send messages.
- Does not collect payment.
- Does not upload files.
- Does not build or overwrite the frontend.
- Does not expose private subscriber rows in tracked docs.
- Does not request sensitive payment or account data.
- Does not promise views, subscribers, revenue, platform growth, or buyer outcomes.
