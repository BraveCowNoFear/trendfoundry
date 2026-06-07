# Publishing

## Public Repository

Repository: `BraveCowNoFear/trendfoundry`

Live demo: `https://bravecownofear.github.io/trendfoundry/`

Latest verified Pages run: `27083053568`

Latest verified commit: `9710a60 Run scheduled TrendFoundry operations`

Verified public paths:

- `https://bravecownofear.github.io/trendfoundry/`
- `https://bravecownofear.github.io/trendfoundry/daily-brief.md`
- `https://bravecownofear.github.io/trendfoundry/sales-page-copy.md`
- `https://bravecownofear.github.io/trendfoundry/public-sample.md`
- `https://bravecownofear.github.io/trendfoundry/public-sample.csv`
- `https://bravecownofear.github.io/trendfoundry/ready-to-record-script.md`
- `https://github.com/BraveCowNoFear/trendfoundry/issues/new?template=order-sample-pack.yml&title=Sample%20pack%20request%3A%20`

Latest verification:

- GitHub Actions operations workflow `27083053568` completed successfully and deployed Pages for commit `9710a6013000994bbbb20aff1903596cdd38432a`.
- Public page, `public-sample.md`, `public-sample.csv`, `ready-to-record-script.md`, and `og-image.png` returned HTTP 200.
- `og-image.png` is 1200x630, and public HTML includes OG/Twitter image metadata plus the visual preview section.
- `npm run qa -- --online` passed 68/68.
- `ready-to-record-script.md` is 4,272 characters and includes scene-by-scene, asset checklist, and fact-safety sections.
- Browser QA with Edge: desktop 1280px and mobile 390px had no horizontal overflow; the preview image loaded, 12 cards rendered, script CTA and core order CTAs remained visible, and source errors stayed within the QA threshold.

The repository is intended to be public so the sample product page can be inspected without account access.

## GitHub Pages

The workflow at `.github/workflows/pages.yml` deploys the `site/` directory to GitHub Pages on normal pushes to `main`.

The scheduled operations workflow at `.github/workflows/daily-ops.yml` also deploys `site/` directly after `npm run operate`, because commits created by `GITHUB_TOKEN` do not trigger the separate Pages workflow.

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
