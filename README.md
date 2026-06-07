# TrendFoundry

TrendFoundry is a small autonomous creator-intelligence product. It collects public AI/developer trend signals, scores them for creator monetization fit, and builds a sellable Bilibili/YouTube idea pack.

Live demo: https://bravecownofear.github.io/trendfoundry/

Request a sample pack: https://github.com/BraveCowNoFear/trendfoundry/issues/new?template=order-sample-pack.yml&title=Sample%20pack%20request%3A%20

## Run

```bash
npm run daily
npm start
```

Then open `http://localhost:4173`.

`npm run export` writes a buyer-ready sample pack under `dist/trendfoundry-sample-pack/`.
Preview an exported pack with `PORT=4174 SITE_DIR=dist/trendfoundry-sample-pack npm start`.

## Automation

On Windows, `scripts/run_daily.ps1` refreshes the pack and writes logs under `logs/`.

## What It Produces

- `data/latest.json`: ranked source-backed opportunities from GitHub, YouTube, Bilibili, Hacker News, and arXiv.
- `docs/daily-brief.md`: paid-report style brief.
- `site/index.html`: sales/demo page for the current pack.
- `docs/design-system.md`: minimal design standards for product and delivery assets.
- `docs/lead-capture.md`: public intake and triage flow for sample-pack requests.

## Monetization Plan

Start as a weekly paid brief:

- USD 9 one-off sample pack.
- USD 19/month weekly pack.
- USD 49/month custom niche pack for a creator or small channel team.

The product promise is not bulk AI content. It is source-backed topic selection plus a recording-ready production angle. Fresh collection errors are isolated into `errors`, and historical cache fallbacks keep the brief usable when a public source rate-limits.

## Publishing

The `site/` directory is deployed through GitHub Pages using `.github/workflows/pages.yml`. See `docs/publishing.md`.
