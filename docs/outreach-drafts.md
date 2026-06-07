# Outreach Drafts

Use this step after `npm run daily` when the product needs fresh creator-specific sales drafts.

`npm run daily` already runs this step after collection, build, and pack export. Use the command below only when drafts need to be regenerated from the current `data/latest.json` without collecting new signals.

## Command

```bash
npm run draft-outreach
```

Optional:

```bash
npm run draft-outreach -- --limit=12
```

Generated local outputs:

- `dist/outreach-drafts/outreach-drafts.md`
- `dist/outreach-drafts/outreach-drafts.csv`
- `dist/outreach-drafts/<priority>-<creator>.md`

The script selects unique YouTube/Bilibili creators from the latest normal-quality signals, writes one draft per creator, and links to the public sample.

## Guardrails

- Review every draft before sending.
- Do not bulk-send identical messages.
- Do not scrape private contact data.
- Do not promise views, subscribers, revenue, or platform growth.
- Track replies in the local lead CRM or GitHub issue labels.
