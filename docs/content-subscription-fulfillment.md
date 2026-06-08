# TrendFoundry Content Subscription Fulfillment

Generated: 2026-06-07

This is the local fulfillment workflow for the USD 19/month `trendfoundry-proof-weekly` product. It prepares one buyer-only weekly delivery directory after subscription/payment status is externally confirmed.

## Command

```powershell
npm run content-subscription
npm run fulfill-content-subscription -- --subscriber="Buyer Name" --contact="buyer@example.com" --channel="https://youtube.com/@buyer" --week="1" --payment-ref="external-confirmation-id"
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
2. Pick the correct week from `docs/content-subscription-plan.md`.
3. Run the command with buyer details and payment reference.
4. Review `weekly-proof-pack.md`.
5. Review `subscriber-email.md`.
6. Attach only buyer deliverables unless the buyer requested archived weeks.
7. Update local status after sending manually.
