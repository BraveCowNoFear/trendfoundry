# TrendFoundry Content Outreach Sends

Generated: 2026-06-10T14:11:06.497Z

This step summarizes private receipts for outreach messages that were manually reviewed and sent outside the script. Private prospect rows stay in ignored `dist/content-outreach-sends/`.

## Current Counts

- Send receipts: 0
- Sent today: 0
- Waiting for reply: 0
- Private log: `dist/content-outreach-sends/send-log.md`

## Operator Workflow

1. Review a send pack under `dist/content-outreach-review/send-packs/`.
2. Send manually only after checking the source, personalization, offer, and safety language.
3. Record the send:

```bash
npm run complete-content-outreach-send -- --review-id="outreach-01-example"
```

4. Run `npm run content-ops` to refresh CRM due dates, deal desk, customer success, testimonials, and health gates.

## Safety Boundary

- Does not send messages.
- Does not post content.
- Does not collect payment.
- Does not publish private prospect rows.
- Does not request sensitive payment or account data.
- Does not promise views, subscribers, revenue, platform growth, or buyer outcomes.
