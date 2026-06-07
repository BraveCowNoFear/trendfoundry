# TrendFoundry

TrendFoundry is a small autonomous creator-intelligence product. It collects public AI/developer trend signals, scores them for creator monetization fit, and builds a sellable Bilibili/YouTube idea pack with a scene-by-scene ready-to-record script.

Live demo: https://bravecownofear.github.io/trendfoundry/

Request a sample pack: https://github.com/BraveCowNoFear/trendfoundry/issues/new?template=order-sample-pack.yml&title=Sample%20pack%20request%3A%20

Subscribe:

- RSS: https://bravecownofear.github.io/trendfoundry/feed.xml
- JSON Feed: https://bravecownofear.github.io/trendfoundry/feed.json

Public archive: https://bravecownofear.github.io/trendfoundry/issues/

## Run

```bash
npm run operate
```

For local preview only:

```bash
npm run daily
npm start
```

Then open `http://localhost:4173`.

`npm run export` writes a buyer-ready sample pack under `dist/trendfoundry-sample-pack/`.
Preview an exported pack with `PORT=4174 SITE_DIR=dist/trendfoundry-sample-pack npm start`.
Public samples are split by language: `public-sample.en.md/.csv` and `public-sample.zh-CN.md/.csv`.

For no-login email orders, generate a reviewed payment reply packet:

```bash
npm run payment-reply -- --tier="weekly-brief" --buyer="Buyer Name" --contact="buyer@example.com" --channel="https://youtube.com/@channel"
```

For copied buyer emails, place local `.txt`, `.md`, or `.eml` files under ignored `data/email-orders/`, then run:

```bash
npm run intake-email-orders
```

## Automation

On Windows, `scripts/run_daily.ps1` runs the full `npm run operate` pipeline and writes logs under `logs/`. GitHub Actions also runs the same operation daily through `.github/workflows/daily-ops.yml` and commits tracked product refreshes when they change.

## What It Produces

- `data/latest.json`: ranked source-backed opportunities from GitHub, YouTube, Bilibili, Hacker News, and arXiv.
- `docs/daily-brief.md`: paid-report style brief.
- `docs/ready-to-record-script.md`: one 6-8 minute scene-by-scene script for the top opportunity.
- `site/index.html`: sales/demo page for the current pack.
- `site/topics/*.html`: SEO landing pages for creator search traffic.
- `site/feed.xml` and `site/feed.json`: subscription feeds for the current top 12 opportunities.
- `site/issues/*.html`: durable public issue archive pages for trust, SEO, and repeat inspection.
- `docs/design-system.md`: minimal design standards for product and delivery assets.
- `docs/lead-capture.md`: public intake and triage flow for sample-pack requests.
- `docs/qa.md`: local and online checks for delivery boundaries, visual assets, script quality, and scheduled operations.
- `docs/launch-posts.md`: draft launch posts and warm outreach copy generated for manual review.
- `dist/payment-replies/<order-id>/`: local payment reply, invoice draft, and checklist for buyer email orders.
- `dist/email-order-intake/`: local parsed order pipeline from copied buyer email text.

## Monetization Plan

Start as a weekly paid brief:

- USD 9 one-off sample pack.
- USD 19/month weekly pack.
- USD 49/month custom niche pack for a creator or small channel team.

The product promise is not bulk AI content. It is source-backed topic selection plus a recording-ready production angle, including demo steps, limitations, publishing metadata, and fact-safety notes. Fresh collection errors are isolated into `errors`, and historical cache fallbacks keep the brief usable when a public source rate-limits.

## QA

```bash
npm run qa
npm run qa -- --online
```

The QA gate checks buyer CTAs, OG/social preview image dimensions, seller-only file boundaries, commerce listings, ready script sections, ops reports, scheduled tasks, and public GitHub Pages resources.

## Publishing

The `site/` directory is deployed through GitHub Pages using `.github/workflows/pages.yml`. See `docs/publishing.md`.
