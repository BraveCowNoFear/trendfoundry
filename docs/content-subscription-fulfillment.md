# TrendFoundry Content Subscription Fulfillment

Generated: 2026-06-07

This is the local fulfillment workflow for the USD 19/month `trendfoundry-proof-weekly` product. It prepares one buyer-only weekly delivery directory after subscription/payment status is externally confirmed.

## Command

```powershell
npm run content-subscription
npm run record-content-subscription -- --subscriber="Buyer Name" --contact="buyer@example.com" --channel="https://youtube.com/@buyer" --payment-ref="external-confirmation-id"
npm run content-subscription-crm
npm run fulfill-content-subscription -- --subscriber="Buyer Name" --contact="buyer@example.com" --channel="https://youtube.com/@buyer" --week="1" --payment-ref="external-confirmation-id"
npm run complete-content-subscription-delivery -- --order="dist/content-subscriptions/<order-id>"
```

## Output

The command writes ignored files under:

```text
dist/content-subscriptions/<order-id>/
```

Buyer deliverables:

- `weekly-proof-pack.md`
- `subscriber-email.md`

Local operator files:

- `backup-candidates.csv`
- `manifest.json`
- `fulfillment-checklist.md`

After review and sending, `complete-content-subscription-delivery` updates ignored local subscriber status from the order manifest.

## Safety Boundary

- Does not send messages.
- Does not collect payment.
- Does not upload files.
- Requires external subscription/payment confirmation before sending.
- Does not request sensitive payment or account data.
- Does not include CRM, prospecting, raw snapshots, account data, or sensitive payment data.
- Does not promise views, subscribers, revenue, platform growth, or buyer outcomes.

## Operator Checklist

1. Confirm external subscription/payment status.
2. Record the subscriber in ignored local status with `npm run record-content-subscription`.
3. Refresh `npm run content-subscription-crm` and pick due commands from `dist/content-subscription-crm/due-queue.md`.
4. Pick the correct week from `docs/content-subscription-plan.md` if running a manual one-off delivery.
5. Run the fulfillment command with buyer details and payment reference.
6. Review `weekly-proof-pack.md`.
7. Review `subscriber-email.md`.
8. Attach only buyer deliverables unless the buyer requested archived weeks.
9. Run `npm run complete-content-subscription-delivery -- --order="dist/content-subscriptions/<order-id>"` after sending.
10. Refresh `npm run content-subscription-crm` to confirm the next delivery date.
