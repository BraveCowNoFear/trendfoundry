# TrendFoundry Email Subscription Sync

Generated: 2026-06-10T14:11:12.214Z

This local automation turns paid email orders for the monthly weekly pack into ignored subscription CRM rows. It does not expose buyer contacts in tracked docs.

## Current Counts

- Email orders reviewed: 0
- Paid weekly orders: 0
- Subscription rows synced: 0
- Skipped orders: 0

## Operator Flow

1. Put copied order emails in ignored `data/email-orders/`.
2. Run `npm run intake-email-orders`.
3. After external payment confirmation, ensure the order text includes `Paid: yes`, `Payment confirmed`, or `Stage: paid`.
4. Run `npm run sync-email-subscriptions`.
5. Run `npm run content-subscription-crm` and `npm run content-subscription-due`.

## Safety Boundary

- Does not connect to an inbox.
- Does not send messages.
- Does not collect payment.
- Does not upload files.
- Does not build or overwrite the frontend.
- Does not expose private subscriber rows in tracked docs.
- Requires paid email order stage before syncing.
- Does not request sensitive payment or account data.
- Does not promise views, subscribers, revenue, platform growth, or buyer outcomes.
