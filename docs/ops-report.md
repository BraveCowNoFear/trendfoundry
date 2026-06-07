# Ops Report

Use this when checking whether TrendFoundry is ready for sales, fulfillment, and outreach today.

## Command

```bash
npm run ops-report
```

Generated local outputs:

- `dist/ops-report/ops-report.md`
- `dist/ops-report/ops-report.json`

The report reads local state only. It does not send messages, charge buyers, upload files, or change GitHub labels.

## Inputs

- `data/latest.json`
- `data/leads.json`
- `dist/outreach-drafts/`
- `dist/launch-assets/`
- `dist/commerce/products.json`
- `dist/qa/latest-qa.json`
- `dist/ops-run/latest-run.json`
- `dist/orders/`
- `docs/publishing.md`

## What It Shows

- latest verified public deployment
- current source snapshot and item count
- latest online QA pass count plus the most recent QA run
- most recent `npm run operate` step statuses
- lead stage counts
- local outreach draft count
- launch asset count
- commerce SKU count
- prepared order directories
- next actions with safety reminders
