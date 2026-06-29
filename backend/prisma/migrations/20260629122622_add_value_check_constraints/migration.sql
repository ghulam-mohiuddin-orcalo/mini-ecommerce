-- Defense-in-depth data integrity: enforce value invariants at the database level,
-- independent of (and in addition to) application-layer validation.
-- Prisma's schema language can't express CHECK constraints, so they live here as raw SQL.

-- Money and stock can never be negative.
ALTER TABLE "Product"
  ADD CONSTRAINT "Product_priceCents_nonneg" CHECK ("priceCents" >= 0),
  ADD CONSTRAINT "Product_stock_nonneg" CHECK ("stock" >= 0);

-- A cart line must represent at least one unit.
ALTER TABLE "CartItem"
  ADD CONSTRAINT "CartItem_quantity_positive" CHECK ("quantity" > 0);

-- Order totals are non-negative; line items have a non-negative unit price and a positive quantity.
ALTER TABLE "Order"
  ADD CONSTRAINT "Order_totalCents_nonneg" CHECK ("totalCents" >= 0);

ALTER TABLE "OrderItem"
  ADD CONSTRAINT "OrderItem_unitPriceCents_nonneg" CHECK ("unitPriceCents" >= 0),
  ADD CONSTRAINT "OrderItem_quantity_positive" CHECK ("quantity" > 0);
