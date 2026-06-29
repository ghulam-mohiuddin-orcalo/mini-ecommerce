-- Stripe Checkout integration: store the Checkout Session id on the order and make it UNIQUE.
-- The unique index is what makes webhook fulfillment idempotent — a duplicate
-- `checkout.session.completed` delivery can never insert a second order for the same session.
ALTER TABLE "Order" ADD COLUMN "stripeSessionId" TEXT;
CREATE UNIQUE INDEX "Order_stripeSessionId_key" ON "Order"("stripeSessionId");
