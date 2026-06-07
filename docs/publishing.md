# Publishing

## Public Repository

Repository: `BraveCowNoFear/trendfoundry`

Live demo: `https://bravecownofear.github.io/trendfoundry/`

Latest verified Pages run: `27082190404`

Latest verified commit: `076b818 Run operations with QA gate`

Verified public paths:

- `https://bravecownofear.github.io/trendfoundry/`
- `https://bravecownofear.github.io/trendfoundry/daily-brief.md`
- `https://bravecownofear.github.io/trendfoundry/sales-page-copy.md`
- `https://bravecownofear.github.io/trendfoundry/public-sample.md`
- `https://bravecownofear.github.io/trendfoundry/public-sample.csv`
- `https://github.com/BraveCowNoFear/trendfoundry/issues/new?template=order-sample-pack.yml&title=Sample%20pack%20request%3A%20`

Latest verification:

- Pages workflow `27082190404` completed successfully for commit `076b8186d1692a866b7d7ec4141bafba41406a02`.
- Public page, `public-sample.md`, `public-sample.csv`, and `og-image.png` returned HTTP 200.
- `og-image.png` is 1200x630, and public HTML includes OG/Twitter image metadata plus the visual preview section.
- `npm run qa -- --online` passed 38/38.
- Browser QA with Edge: desktop 1280px and mobile 390px had no horizontal overflow; the preview image loaded, 12 cards rendered, core CTAs remained visible, and source errors showed 0.

The repository is intended to be public so the sample product page can be inspected without account access.

## GitHub Pages

The workflow at `.github/workflows/pages.yml` deploys the `site/` directory to GitHub Pages on every push to `main`.

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
