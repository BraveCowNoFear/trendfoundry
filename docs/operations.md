# Operations

Use this for the daily local business loop.

## Command

```bash
npm run operate
```

This runs:

- `npm run daily`
- `npm run content-ops`
- `npm run commerce`
- `npm run leads`
- `npm run intake-email-orders`
- `npm run audit-email-order-routing`
- `npm run sync-email-subscriptions`
- `npm run content-subscription`
- `npm run content-subscription-crm`
- `npm run content-subscription-due`
- `npm run content-subscription-retention`
- `npm run fulfill-custom-email-orders`
- `npm run fulfill-email-orders`
- `npm run fulfill-ready`
- `npm run launch-assets`
- `npm run ops-report`
- `npm run agent-watch` before QA so the QA gate can verify the dashboard
- `npm run qa -- --skip-scheduler`
- `npm run agent-watch` after QA so the dashboard reflects the final run status

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

## Agent Watch

```bash
npm run agent-watch
```

This writes a local supervision dashboard to `dist/agent-watch/index.html` plus `dist/agent-watch/agent-watch.json`. It tracks worker-agent status, current requirements, and the remaining human-dependency queue for accounts, passwords, payment rails, buyer input, startup funds, and review-only actions. It shows aggregate operational state only, not buyer contact details or secrets.

To view it through the static server:

```powershell
$env:SITE_DIR="dist/agent-watch"; $env:PORT="4175"; npm start
```

Then open `http://localhost:4175`.

## GitHub Actions

`.github/workflows/daily-ops.yml` runs `npm run operate` every day at 07:15 UTC and on manual `workflow_dispatch`.

If tracked product files change, the workflow commits them to `main` as `github-actions[bot]`, then deploys the current `site/` directory to GitHub Pages in the same workflow. This direct deploy is required because pushes made with `GITHUB_TOKEN` do not trigger the separate Pages workflow. Ignored local files such as `dist/`, `logs/`, `data/leads.json`, `docs/lead-pipeline.md`, and `docs/lead-replies.md` are not committed.

## Safety

- No outreach messages are sent.
- No payment action is attempted.
- No files are uploaded.
- No GitHub labels are changed.
- Content operations refresh buyer packs, prospect review packs, deal desk drafts, and health gates locally only.
- Buyer delivery still excludes `prospects.csv`, `outreach-board.md`, and `latest.json`.
- The GitHub Actions run only refreshes tracked product files, pushes a commit when there are changes, and deploys the public static site.

## Order Reply Loop

Use this after a buyer sends a no-login order email:

```bash
npm run payment-reply -- --tier="sample-issue" --buyer="Buyer Name" --contact="buyer@example.com" --channel="https://youtube.com/@channel"
```

Review `dist/payment-replies/<order-id>/payment-reply.md`, insert a verified hosted checkout link or manual invoice reference, then send manually. The generated packet keeps payment credentials out of email/public issues and reminds the seller to run fulfillment only after payment confirmation.

## Email Order Intake

For copied buyer emails or saved `.eml`/`.txt`/`.md` order messages, place files under ignored `data/email-orders/`, then run:

```bash
npm run intake-email-orders
```

Generated local outputs:

- `dist/email-order-intake/orders.json`
- `dist/email-order-intake/pipeline.md`
- matching `dist/payment-replies/<order-id>/...` packets

The intake script only parses local files. It does not connect to an inbox, send email, create payment links, charge buyers, upload files, or change GitHub state.

## Paid Email Fulfillment

If an intake file includes `Paid: yes`, `Payment confirmed`, or `Stage: paid`, the parsed order stage becomes `paid_needs_fulfillment`. After verifying payment externally, generate the local buyer delivery folder:

```bash
npm run fulfill-email-orders
```

Generated local outputs:

- `dist/email-fulfillment/email-orders.json`
- `dist/email-fulfillment/email-orders.md`
- matching `dist/orders/<order-id>/...` buyer delivery packages

The fulfillment script only creates local delivery drafts. It does not send email, upload files, charge buyers, or change GitHub state.
