# Operations

Use this for the daily local business loop.

## Command

```bash
npm run operate
```

This runs:

- `npm run daily`
- `npm run commerce`
- `npm run leads`
- `npm run fulfill-ready`
- `npm run launch-assets`
- `npm run ops-report`
- `npm run qa -- --skip-scheduler`

If `site/og-image.png` is missing, it also runs `npm run social`. To force social preview regeneration:

```bash
npm run operate -- --with-social
```

## Windows Wrapper

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run_ops.ps1
```

The wrapper writes logs to `logs/ops-*.log`.

The existing Windows task `TrendFoundryDaily` calls `scripts/run_daily.ps1`, which now runs the full `npm run operate` pipeline and writes `logs/daily-ops-*.log`.

## GitHub Actions

`.github/workflows/daily-ops.yml` runs `npm run operate` every day at 07:15 UTC and on manual `workflow_dispatch`.

If tracked product files change, the workflow commits them to `main` as `github-actions[bot]`, then deploys the current `site/` directory to GitHub Pages in the same workflow. This direct deploy is required because pushes made with `GITHUB_TOKEN` do not trigger the separate Pages workflow. Ignored local files such as `dist/`, `logs/`, `data/leads.json`, `docs/lead-pipeline.md`, and `docs/lead-replies.md` are not committed.

## Safety

- No outreach messages are sent.
- No payment action is attempted.
- No files are uploaded.
- No GitHub labels are changed.
- Buyer delivery still excludes `prospects.csv`, `outreach-board.md`, and `latest.json`.
- The GitHub Actions run only refreshes tracked product files, pushes a commit when there are changes, and deploys the public static site.
