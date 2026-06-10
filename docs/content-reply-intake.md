# TrendFoundry Content Reply Intake

Generated: 2026-06-10T14:11:04.092Z

This step parses copied creator/buyer replies from ignored `data/content-sales-crm/reply-inbox/` and updates ignored local CRM reply/status files. Private reply text stays in ignored data/dist folders.

## Current Counts

- Inbox replies parsed: 0
- Skipped files: 0
- Stage mix: none
- Private output: `dist/content-reply-intake/parsed-replies.md`

## Inbox Format

Use a local `.txt` or `.md` file:

```text
Source: youtube
Creator: Creator Name
Campaign: tf-outreach-01-example
Review-ID: outreach-01-example
Stage: replied_needs_response
Summary: Short safe summary of the reply
Objection: price_sensitive

Raw copied reply text...
```

## Safety Boundary

- Does not send messages.
- Does not collect payment.
- Does not treat payment as confirmed unless the stage is explicitly set.
- Does not publish private reply text.
- Does not request sensitive payment or account data.
- Does not promise views, subscribers, revenue, platform growth, or buyer outcomes.
