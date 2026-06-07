import path from "node:path";
import { preparePaymentReply } from "./lib/payment_reply.mjs";

const root = process.cwd();

function argValue(name, fallback = "") {
  const prefix = `--${name}=`;
  const arg = process.argv.slice(2).find((value) => value.startsWith(prefix));
  const envName = name.toUpperCase().replace(/-/g, "_");
  return arg ? arg.slice(prefix.length) : process.env[envName] || fallback;
}

const result = await preparePaymentReply({
  root,
  paymentRepliesDir: path.join(root, argValue("payment-replies-dir", "dist/payment-replies")),
  tier: argValue("tier", "sample-issue"),
  buyerName: argValue("buyer", "Buyer"),
  buyerContact: argValue("contact", "buyer@example.com"),
  channel: argValue("channel", "not provided"),
  niche: argValue("niche", "not provided"),
  deliveryRoute: argValue("delivery-route", "email"),
  paymentMethod: argValue("payment-method", "verified hosted checkout link or manual invoice"),
  paymentReference: argValue("payment-reference", "TBD-after-review"),
  orderId: argValue("order-id", "")
});

console.log(`Wrote payment reply draft to ${result.outDir}`);
