# TrendFoundry Content Fulfillment

This is the local fulfillment lane for the buyer content pack. It prepares an order folder after external payment confirmation, but it does not send messages, collect payment, upload files, or touch account credentials.

## Command

Refresh the buyer content pack first:

```bash
npm run buyer-pack
```

Prepare a buyer-only order folder:

```bash
npm run fulfill-content -- --buyer="Buyer Name" --contact="buyer@example.com" --channel="https://youtube.com/@channel" --product="trendfoundry-proof-script-pack" --payment-ref="external-confirmation-id" --order-id="buyer-content-order"
```

`--payment-ref` should be a local reference to an externally confirmed payment, not sensitive payment or account data. If omitted, the generated manifest marks payment as not externally confirmed.

## Generated Files

The command writes to `dist/content-orders/<order-id>/`:

- `full-episode-script.md`
- `episode-workbench.md`
- `content-editorial-audit.md`
- `manifest.json`
- `delivery-email.md`
- `fulfillment-checklist.md`

Only the three Markdown content deliverables are buyer deliverables. `manifest.json`, `delivery-email.md`, and `fulfillment-checklist.md` are local operator aids unless manually reviewed and deliberately shared.

## Seller-Only Boundary

Never attach or publish these files from this lane:

- `prospects.csv`
- `outreach-board.md`
- `data/latest.json`
- `data/raw/`
- `data/leads.json`
- `docs/lead-pipeline.md`
- `docs/lead-replies.md`
- sensitive payment data, account data, access secrets, or private identity data

## Safety Contract

- No automatic sending.
- No automatic charging.
- No account registration.
- No uploads.
- No promises of views, subscribers, revenue, platform growth, or buyer outcomes.
- External payment confirmation is checked outside this repository before delivery.
