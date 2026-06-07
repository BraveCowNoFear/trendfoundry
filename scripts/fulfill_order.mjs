import { argValue, prepareOrder } from "./lib/fulfillment.mjs";

const buyerName = argValue("buyer", "buyer");
const buyerContact = argValue("contact", "not-provided");
const orderType = argValue("type", "sample-issue");
const channel = argValue("channel", "not-provided");
const orderId = argValue("order-id", "");

const result = await prepareOrder({
  buyerName,
  buyerContact,
  orderType,
  channel,
  ...(orderId ? { orderId } : {})
});

console.log(`Fulfillment order prepared: ${result.orderDir}`);
console.log(`Files: ${result.files.join(", ")}`);
