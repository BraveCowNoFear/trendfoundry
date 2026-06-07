# QA

Use this before or after an operations run to verify the business-critical invariants.

## Local QA

```bash
npm run qa
```

## Local + Public QA

```bash
npm run qa -- --online
```

## Inside Scheduled Operations

```bash
npm run qa -- --skip-scheduler
```

Use this mode inside `npm run operate`, because a scheduled task cannot reliably assert its own final `Last Result` while it is still running.

Generated local outputs:

- `dist/qa/latest-qa.md`
- `dist/qa/latest-qa.json`

## Covered Checks

- required package scripts exist
- latest data has enough items and low source errors
- site has buyer CTAs, OG metadata, visual preview, and 12 cards
- `site/og-image.png` is 1200x630
- ready-to-record script is linked from the site and includes scene-by-scene, asset checklist, and fact-safety sections
- sales copy does not promise PDF delivery or attach `prospects.csv`
- commerce products exist, mention the scene-by-scene script, and exclude seller-only files from buyer fulfillment
- a temporary fulfillment order excludes seller-only files
- ops report includes safety and commerce status
- Windows scheduled tasks point to the expected scripts and last result is 0
- `--skip-scheduler` omits scheduled task checks for in-task self-checks
- optional online checks verify public page, public sample, ready-to-record script sections, UTF-8 hook text, and OG image dimensions
