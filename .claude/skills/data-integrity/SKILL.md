---
name: data-integrity
description: The integrity core of this platform — money as integer cents, transactional checkout, atomic conditional stock decrement, order snapshots, soft-delete, and DB-level constraints. Load for any work touching orders, cart, stock, prices, payments, or the schema.
---

# Data Integrity

This is the heart of the assessment: correctness under concurrency and over time. The server is
the only authority for money and stock. Treat these rules as invariants — never trade them for
convenience or speed.

## Money is integer cents

- Stored as `Int` (`priceCents`, `unitPriceCents`, `totalCents`), passed and computed as integers,
  exposed in DTOs as `*Cents`. `formatPrice(cents)` divides by 100 **only** at the render edge.
- Never use floats, `parseFloat`, or currency strings in logic or storage. Rounding bugs are
  designed out by construction.

## Totals are computed server-side, never trusted from the client

- The cart stores only `(productId, quantity)`; line/grand totals are **always recomputed** from
  the current product price (`buildCartResponse` is the single source for the cart;
  `createOrderFromCart` for the order).
- `Order.totalCents` is the authoritative charged amount and **equals the sum of its line
  snapshots** (asserted in tests).

## Checkout = one transaction, with an atomic conditional decrement

The integrity core lives in [orders.service.ts](../../../backend/src/orders/orders.service.ts) —
`createOrderFromCart` runs entirely inside one interactive `$transaction`:
1. (Stripe) idempotency short-circuit on `stripeSessionId`;
2. load cart (must be non-empty);
3. per line: re-read the product, **atomically decrement stock** with a conditional update, snapshot
   its current price/name/image/category;
4. compute the total server-side from snapshots;
5. settle payment (mock charge throws on decline → full rollback; Stripe already captured);
6. create Order + OrderItems;
7. clear the cart.

Any `throw` rolls back **everything** — no partial orders, no stray stock changes.

**The oversell guard is this conditional decrement** (not a read-then-write):
```ts
const decremented = await tx.product.updateMany({
  where: { id: product.id, isActive: true, stock: { gte: item.quantity } },
  data: { stock: { decrement: item.quantity } },
});
if (decremented.count === 0) {
  throw new ConflictException(`Not enough stock for "${product.name}" (only ${product.stock} left)`);
}
```
The `WHERE … stock >= qty` + decrement serializes at the row level, so concurrent checkouts can't
oversell without Serializable isolation. A preceding `findUnique` is only for the snapshot.

## Snapshots, not references

`OrderItem` freezes `productName`, `productImageUrl`, `productCategory`, `unitPriceCents`,
`quantity` at order time. Historical orders stay correct even after the product is edited or
deactivated. **Read snapshot fields for order history; never join to the live product for display.**

## Soft-delete only

"Delete a product" = `isActive = false`. The catalog filters `isActive: true`; order history keeps
its snapshot. `OrderItem → Product` is `Restrict`, so an ordered product **cannot** be hard-deleted
— that's the backstop forcing the soft-delete path.

## Cancellation restocks atomically

Cancelling a `PENDING`/`PROCESSING` order increments each line's stock back **in the same
transaction** as the status change, so stock and status never drift (see `updateStatus`).

## Idempotency (Stripe)

`Order.stripeSessionId` is **UNIQUE**; fulfilment first checks for an existing order, and a
concurrent double-delivery loses on the unique index (`P2002`) and returns the winner's order. The
order is created **exactly once** and stock decremented exactly once, no matter how many times
Stripe delivers the webhook.

## Defense in depth at the DB

Value invariants Prisma can't express are enforced as **CHECK constraints** (migration
`add_value_check_constraints`): non-negative money/stock, positive quantities — in addition to DTO
validation. The DB is the last line of defense.

## Anti-patterns

- ❌ Read stock, then decrement in a separate write (race → oversell). Use the conditional
  `updateMany` and assert `count === 1`.
- ❌ Trusting a client-sent total/price, or the cart's implied price, at checkout.
- ❌ Floats for money anywhere.
- ❌ Joining to the live `Product` to render a past order (use the snapshot).
- ❌ Hard-deleting a product, or adding a delete path that bypasses `isActive`.
- ❌ Writing some order rows outside the transaction (partial order on failure).
- ❌ De-duplicating Stripe deliveries in app code only, without the UNIQUE column.
