# Fulfillment

Use this when a lead becomes a paid order or approved sample delivery.

## Command

```bash
npm run fulfill -- --buyer="Buyer Name" --contact="buyer@example.com" --channel="https://youtube.com/@channel" --type="sample-issue"
```

Generated output:

- `dist/orders/<order-id>/daily-brief.md`
- `dist/orders/<order-id>/ready-to-record-script.md`
- `dist/orders/<order-id>/opportunities.csv`
- `dist/orders/<order-id>/public-sample.md`
- `dist/orders/<order-id>/public-sample.csv`
- `dist/orders/<order-id>/manifest.json`
- `dist/orders/<order-id>/delivery-email.md`
- `dist/orders/<order-id>/fulfillment-checklist.md`

`dist/` is ignored by Git. Buyer-specific contact details and delivery drafts should stay local.

The order `manifest.json` includes `buyerDeliverables`, `excludedSellerOnlyFiles`, and `primaryValue` so the delivery boundary and core buyer value are explicit before sending.

## Ready Leads

After syncing GitHub issue leads, prepare local delivery folders for paid leads:

```bash
npm run leads
npm run fulfill-ready
```

To also prepare approved sample deliveries from `qualified` leads:

```bash
npm run fulfill-ready -- --include-qualified
```

Generated local outputs:

- `dist/lead-fulfillment/ready-orders.md`
- `dist/lead-fulfillment/ready-orders.json`
- `dist/orders/issue-<number>-<requester>/...`

The script only creates local delivery drafts. It does not send messages, upload files, charge buyers, or change GitHub labels.

## Seller-Only Files

Do not send these files to buyers:

- `prospects.csv`
- `outreach-board.md`
- `latest.json`

They are internal operations files, not buyer deliverables.

## Safety

- Review the delivery email before sending.
- Confirm the email describes `ready-to-record-script.md` as a scene-by-scene script, not just a loose outline.
- Do not include payment card details or private IDs.
- Do not promise views, revenue, or platform growth.
- Update the GitHub issue label or local lead stage after sending.
