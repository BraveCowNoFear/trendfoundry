# TrendFoundry Content Subscription CRM

Generated: 2026-06-10T14:11:12.838Z

This is the content-only CRM for the USD 19/month weekly proof pack. It reads private subscriber status from ignored local files, then prepares due delivery queues and fulfillment commands without exposing subscriber contacts in tracked docs.

## Private Input

`data/content-subscriptions/subscribers.csv`

The file is ignored by Git. Use `dist/content-subscription-crm/subscribers.template.csv` as the schema. Keep contacts, payment references, subscriber notes, and delivery history out of tracked files.

## Current Counts

- Private subscriber rows: 0
- Ready to prepare today: 0
- Needs payment review before delivery: 0
- Renewal check due soon: 0
- Upcoming active deliveries: 0

## Operator Flow

1. Run `npm run content-subscription` to refresh the four-week content calendar.
2. After external subscription/payment confirmation, run `npm run record-content-subscription -- --subscriber="Buyer Name" --contact="buyer@example.com" --channel="https://youtube.com/@buyer" --payment-ref="external-confirmation-id"`.
3. Run `npm run content-subscription-crm`.
4. Review `dist/content-subscription-crm/due-queue.md`.
5. Run only the fulfillment commands marked `prepare_delivery`.
6. Review each generated `weekly-proof-pack.md` and `subscriber-email.md` before sending.
7. After delivery, update `last_delivered_week`, `last_sent_at`, and `next_delivery_date` in the ignored subscriber file.

## Safety Boundary

- Does not send messages.
- Does not collect payment.
- Does not upload files.
- Does not build or overwrite the frontend.
- Does not expose private subscriber rows in tracked docs.
- Requires external subscription/payment confirmation before preparing buyer delivery.
- Does not promise views, subscribers, revenue, platform growth, or buyer outcomes.
