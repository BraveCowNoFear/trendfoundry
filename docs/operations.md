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

## Safety

- No outreach messages are sent.
- No payment action is attempted.
- No files are uploaded.
- No GitHub labels are changed.
- Buyer delivery still excludes `prospects.csv`, `outreach-board.md`, and `latest.json`.
