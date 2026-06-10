# Custom Email Order Fulfillment

Generated: 2026-06-10T14:23:43.500Z

This prepares buyer-only custom proof pack directories for paid email orders with `tier=custom-niche`. It does not send messages, collect payment, upload files, or build the frontend.

## Prepared Custom Orders

| Order ID | Status | Buyer | Contact | Niche | Platform | Order Dir |
| --- | --- | --- | --- | --- | --- | --- |
| - | - | - | - | - | - | No paid custom email orders. |

## Skipped Orders

| Order ID | Stage | Tier | Reason |
| --- | --- | --- | --- |
| - | - | - | No skipped orders. |

## Safety

- Verify payment externally before sending any delivery email.
- Attach only buyer deliverables from the custom order directory.
- After manual delivery, run `npm run complete-custom-proof-delivery -- --order="dist/custom-email-orders/<order-id>" --source="custom-email" --creator="<buyer>" --next-due="YYYY-MM-DD"`.
- Do not attach prospects, outreach notes, raw snapshots, account data, or sensitive payment data.
- Do not promise views, subscribers, revenue, platform growth, or buyer outcomes.
