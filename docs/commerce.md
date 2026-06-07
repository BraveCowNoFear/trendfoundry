# Commerce Assets

Use this before setting up Gumroad, Ko-fi, Lemon Squeezy, Stripe Payment Links, or manual invoice checkout.

## Command

```bash
npm run commerce
```

Generated local outputs:

- `dist/commerce/products.json`
- `dist/commerce/products.csv`
- `dist/commerce/platform-listings.md`
- `dist/commerce/manual-invoices.md`

These files are ignored by Git because platform drafts may later include private account or buyer details.

## Buyer Email Reply

When a buyer orders by email and no hosted checkout is ready yet, generate a local payment reply packet:

```bash
npm run payment-reply -- --tier="weekly-brief" --buyer="Buyer Name" --contact="buyer@example.com" --channel="https://youtube.com/@channel" --niche="AI developer tools" --delivery-route="email"
```

Generated local outputs:

- `dist/payment-replies/<order-id>/payment-reply.md`
- `dist/payment-replies/<order-id>/invoice-draft.md`
- `dist/payment-replies/<order-id>/payment-checklist.md`
- `dist/payment-replies/<order-id>/manifest.json`

The script only writes local drafts. It does not send email, charge a buyer, create a payment link, upload files, or change GitHub state.

For multiple saved buyer emails, copy `.txt`, `.md`, or `.eml` files into ignored `data/email-orders/` and run:

```bash
npm run intake-email-orders
```

This creates `dist/email-order-intake/pipeline.md` and matching local payment reply packets without connecting to an inbox.

If payment is externally verified and the copied order text includes `Paid: yes`, `Payment confirmed`, or `Stage: paid`, prepare local buyer delivery files with:

```bash
npm run fulfill-email-orders
```

## Product SKUs

- `trendfoundry-sample-issue`: USD 9 one-off.
- `trendfoundry-weekly-brief`: USD 19/month.
- `trendfoundry-custom-niche`: USD 49/month.

## Guardrails

- Do not promise views, subscribers, revenue, or platform growth.
- Do not ask buyers to send card numbers, private IDs, passwords, wallet seeds, or payment credentials by email or in a public issue.
- Do not include `prospects.csv`, `outreach-board.md`, or `latest.json` in buyer delivery.
- Review platform-specific requirements before publishing a hosted checkout page.
- Keep the email order path live until a hosted payment page is verified.
