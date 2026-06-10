# TrendFoundry Content Close Pack

Generated: 2026-06-10T14:11:05.501Z

This document describes the daily close workflow without publishing the private prospect table. Detailed review rows stay in ignored `dist/content-close-pack/`.

## Current Queue

- Selected review rows: 5
- Clean text rows: 5
- Rows needing manual text cleanup: 0
- Due prospect rows considered: 5
- Feedback questions available: 4

## Operator Workflow

1. Open `dist/content-close-pack/today-close-queue.md`.
2. Review only one prospect at a time.
3. Check the public source URL before sending anything.
4. Personalize the draft and keep the feedback question.
5. After any reply, append a safe summary row to ignored `data/content-sales-crm/replies.csv`.
6. Run `npm run content-ops` again to refresh CRM, feedback, revenue assumptions, and this close pack.

## Reply Capture Columns

```csv
source,creator,summary,objection,stage,notes
youtube,Example Creator,Asked for narrower niche,too broad,replied_needs_response,Send custom pack outline
```

## Safety Boundary

- Does not send messages.
- Does not post content.
- Does not collect payment.
- Does not request sensitive payment or account data.
- Does not publish private prospect rows.
- Does not promise views, subscribers, revenue, platform growth, or buyer outcomes.
