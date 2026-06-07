# Lead Capture

## Public Intake

Primary intake URL:

`https://github.com/BraveCowNoFear/trendfoundry/issues/new?template=order-sample-pack.yml&title=Sample%20pack%20request%3A%20`

This is the lowest-dependency buyer-intent path currently available:

- No backend.
- No payment processor.
- No private form service.
- Buyers can request the USD 9 sample pack, weekly brief, or custom niche brief.
- The form captures creator channel, primary platform, desired pack, preferred contact, preferred delivery route, niche preference, and safety acknowledgement.
- The form states that the paid pack includes 12 source-backed opportunities, one scene-by-scene ready-to-record script, CSV planning files, and quality-risk notes.
- GitHub sign-in is required to submit the issue form; use the email CTA for buyers who do not want to log in.

## Manual Triage

When a new issue appears:

1. Confirm the request is not spam.
2. Check the creator channel or public profile.
3. Reply with the current sample pack link and payment instructions.
4. Label the issue as `lead`, `sample-pack`, `qualified`, `paid`, or `not-fit`.
5. Track conversion in `docs/outreach-board.md` or a future CRM export.

## Local Lead Sync

Run:

```bash
npm run leads
```

The sync reads public GitHub issues from `BraveCowNoFear/trendfoundry`, parses the Issue Form fields, and writes:

- `data/leads.json`
- `docs/lead-pipeline.md`
- `docs/lead-replies.md`

These files are intentionally ignored by Git because they may contain buyer contact details. Commit `docs/lead-pipeline.example.md` only.

`docs/lead-replies.md` contains GitHub and email reply drafts. The drafts include the buyer's preferred delivery route and describe the script as a scene-by-scene ready-to-record asset. Review them before sending; the automation does not post messages or transmit buyer data.

## Scheduled Sync

Local scheduled task:

- `TrendFoundryLeadSync`
- Script: `scripts/run_leads.ps1`
- Log pattern: `logs/leads-*.log`

Keep this separate from `TrendFoundryDaily` so a GitHub API hiccup does not block the daily content pack.

## Safety

- Do not ask buyers to post payment card details or private identifiers in GitHub issues.
- Use email for payment instructions and private delivery details.
- Keep public replies factual and avoid income/view guarantees.
