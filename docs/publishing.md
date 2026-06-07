# Publishing

## Public Repository

Target repository: `Clr168/trendfoundry`

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
