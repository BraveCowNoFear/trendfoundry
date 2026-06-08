# TrendFoundry Content Action Brief

Generated: 2026-06-08T19:08:07.238Z

This public report summarizes the private content-sales action queue. It does not expose buyer names, contacts, prospect rows, channels, private replies, or payment references.

## Current Counts

- Total private actions: 8
- Top action lane: send_batch
- Needs manual send/review: 8
- Fulfillment-sensitive actions: 0
- Public-safe action rows exposed here: 0

## Lane Counts

| Lane | Count |
| --- | ---: |
| send_batch | 3 |
| outreach_review | 5 |

## Operator Flow

1. Review ignored `dist/content-action-brief/action-brief.md`.
2. Work from the highest priority row downward.
3. For outreach rows, only use send packs that passed `content-outreach-gate`; review before sending and record the send receipt afterward.
4. For fulfillment rows, verify external payment and attach only concise-ready buyer deliverables.

## Safety Boundary

- Does not send messages.
- Does not collect payment.
- Does not upload files.
- Does not build or overwrite the frontend.
- Does not expose private action rows in tracked docs.
- Does not promise views, subscribers, revenue, platform growth, or buyer outcomes.
