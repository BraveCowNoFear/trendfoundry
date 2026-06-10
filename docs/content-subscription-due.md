# TrendFoundry Content Subscription Due Fulfillment

Generated: 2026-06-10T14:23:42.895Z

This content-only batch step prepares weekly subscription delivery directories for subscriber rows that the private CRM marked as `prepare_delivery`. It writes private order details under ignored `dist/` paths and does not expose subscriber contacts in tracked docs.

## Current Counts

- Queue rows reviewed: 0
- Ready rows: 0
- Prepared deliveries: 0
- Already prepared deliveries: 0
- Failed deliveries: 0

## Operator Flow

1. Run `npm run content-subscription`.
2. Run `npm run content-subscription-crm`.
3. Run `npm run content-subscription-due`.
4. Review ignored `dist/content-subscription-due/prepared.csv`.
5. Review each generated `dist/content-subscriptions/<order-id>/weekly-proof-pack.md` and `subscriber-email.md`.
6. After sending, run `npm run complete-content-subscription-delivery -- --order="dist/content-subscriptions/<order-id>"`.

## Safety Boundary

- Does not send messages.
- Does not collect payment.
- Does not upload files.
- Does not build or overwrite the frontend.
- Uses only rows already marked `prepare_delivery` by the private CRM.
- Does not expose private subscriber rows in tracked docs.
- Does not promise views, subscribers, revenue, platform growth, or buyer outcomes.
