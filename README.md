# TrendFoundry

TrendFoundry is a small autonomous creator-intelligence product. It collects public AI/developer trend signals, scores them for creator monetization fit, and builds a sellable Bilibili/YouTube idea pack.

## Run

```bash
npm run daily
npm start
```

Then open `http://localhost:4173`.

## Automation

On Windows, `scripts/run_daily.ps1` refreshes the pack and writes logs under `logs/`.

## What It Produces

- `data/latest.json`: ranked source-backed opportunities.
- `docs/daily-brief.md`: paid-report style brief.
- `site/index.html`: sales/demo page for the current pack.

## Monetization Plan

Start as a weekly paid brief:

- USD 9 one-off sample pack.
- USD 19/month weekly pack.
- USD 49/month custom niche pack for a creator or small channel team.

The product promise is not bulk AI content. It is source-backed topic selection plus a recording-ready production angle.
