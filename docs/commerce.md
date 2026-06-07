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

## Product SKUs

- `trendfoundry-sample-issue`: USD 9 one-off.
- `trendfoundry-weekly-brief`: USD 19/month.
- `trendfoundry-custom-niche`: USD 49/month.

## Guardrails

- Do not promise views, subscribers, revenue, or platform growth.
- Do not include `prospects.csv`, `outreach-board.md`, or `latest.json` in buyer delivery.
- Review platform-specific requirements before publishing a hosted checkout page.
- Keep the email order path live until a hosted payment page is verified.
