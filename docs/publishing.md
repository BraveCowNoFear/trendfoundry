# Publishing

## Public Repository

Repository: `BraveCowNoFear/trendfoundry`

Live demo: `https://bravecownofear.github.io/trendfoundry/`

Latest verified Pages run: `27089286112`

Latest verified commit: `f0d66d1 Add bilingual landing page toggle`

Verified public paths:

- `https://bravecownofear.github.io/trendfoundry/`
- `https://bravecownofear.github.io/trendfoundry/daily-brief.md`
- `https://bravecownofear.github.io/trendfoundry/sales-page-copy.md`
- `https://bravecownofear.github.io/trendfoundry/public-sample.md`
- `https://bravecownofear.github.io/trendfoundry/public-sample.csv`
- `https://bravecownofear.github.io/trendfoundry/ready-to-record-script.md`
- `https://bravecownofear.github.io/trendfoundry/sitemap.xml`
- `https://bravecownofear.github.io/trendfoundry/feed.xml`
- `https://bravecownofear.github.io/trendfoundry/feed.json`
- `https://bravecownofear.github.io/trendfoundry/issues/`
- `https://bravecownofear.github.io/trendfoundry/issues/latest.html`
- `https://bravecownofear.github.io/trendfoundry/issues/2026-06-07.html`
- `https://bravecownofear.github.io/trendfoundry/topics/ai-video-ideas.html`
- `https://github.com/BraveCowNoFear/trendfoundry/issues/new?template=order-sample-pack.yml&title=Sample%20pack%20request%3A%20`

Latest verification:

- Pages workflow `27089286112` completed successfully for commit `f0d66d1 Add bilingual landing page toggle`.
- Public page, `public-sample.md`, `public-sample.csv`, `ready-to-record-script.md`, `sitemap.xml`, `feed.xml`, `feed.json`, `issues/`, `issues/latest.html`, `issues/2026-06-07.html`, `topics/ai-video-ideas.html`, and `og-image.png` returned HTTP 200.
- `og-image.png` is 1200x630, and public HTML includes OG/Twitter image metadata plus the visual preview section.
- `npm run qa -- --online` passed 128/128.
- `ready-to-record-script.md` is 4,272 characters and includes scene-by-scene, asset checklist, and fact-safety sections.
- Browser QA with Edge: desktop 1280px and mobile 390px had no horizontal overflow; the homepage language switch changed the public landing page to Simplified Chinese, persisted after reload with `localStorage`, kept the zero-result search count localized, and preserved 12 cards, topic links, Feed buttons, Archive links, script CTA, and core order CTAs. Screenshots: `dist/qa/online-i18n-home-desktop-f0d66d1.png` and `dist/qa/online-i18n-home-mobile-f0d66d1.png`.

The repository is intended to be public so the sample product page can be inspected without account access.

## GitHub Pages

The workflow at `.github/workflows/pages.yml` deploys the `site/` directory to GitHub Pages on normal pushes to `main`.

The scheduled operations workflow at `.github/workflows/daily-ops.yml` also deploys `site/` directly after `npm run operate`, because commits created by `GITHUB_TOKEN` do not trigger the separate Pages workflow.

## Feeds

The build output includes:

- `site/feed.xml`: RSS 2.0 feed with the current top 12 opportunities.
- `site/feed.json`: JSON Feed 1.1 mirror for tools that prefer structured feed ingestion.

Both feeds include proof links, creator hooks, demo angles, limitations, and the current sample-pack request CTA.

## Issue Archive

The build output includes:

- `site/issues/latest.html`: the newest public issue.
- `site/issues/<YYYY-MM-DD>.html`: a dated immutable public issue snapshot.
- `site/issues/index.html`: archive index.
- `docs/issues/<YYYY-MM-DD>.md`: Markdown mirror for repository readers.

The scheduled operations workflow explicitly stages `docs/issues` and `site/issues` so new daily issue files are committed without staging ignored lead, raw, log, or dist files.

## Pre-Publish Checklist

- Run `npm run daily`.
- Confirm `site/index.html` opens locally.
- Confirm `dist/trendfoundry-sample-pack/manifest.json` lists the buyer-ready pack files.
- Do not commit `dist/`, `logs/`, or `data/raw/`.
- Confirm no passwords, tokens, phone numbers, payment credentials, or private IDs are present.

## Repository Topics

Recommended topics:

- `creator-economy`
- `ai-tools`
- `bilibili`
- `youtube`
- `github-trending`
- `trend-intelligence`
- `static-site`
- `newsletter`
