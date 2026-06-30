---
name: clean-architecture
description: Layering and dependency rules for the NestJS backend — services hold business logic, controllers stay thin, DTOs validate, mappers shape responses, modules wire DI. Load when adding/refactoring backend code or deciding where logic belongs.
---

# Clean Architecture (NestJS)

The backend is a **modular monolith**: cohesive feature modules with clear DI boundaries, one
Postgres DB. The layering is non-negotiable (CLAUDE.md): **business logic lives in services, never
in controllers.**

## The layers

```
Controller   →   Service   →   PrismaService (DB)
   ▲                 │
   │              uses DTOs (in) and to*Response mappers (out)
Guards/Pipes/Filter (cross-cutting, registered globally)
```

- **Controller** — declares the route, HTTP verb, access decorators (`@Public`/`@Roles`/
  `@CurrentUser`), and Swagger metadata, then delegates to the service. No `if`-business-rules, no
  Prisma calls, no totals. See [products.controller.ts](../../../backend/src/products/products.controller.ts).
- **Service** — all logic: validation beyond DTO shape, transactions, Prisma access, computing
  totals, enforcing the state machine. Injectable, constructor-injected dependencies. See
  [orders.service.ts](../../../backend/src/orders/orders.service.ts).
- **DTO** — request validation (`class-validator`) and response shape, with `@ApiProperty` for
  Swagger. Response DTOs are produced by `to<Entity>Response` mappers that strip sensitive/live
  fields.
- **Module** — wires providers/controllers; imports other modules to reuse their services
  (`AdminModule` imports `ProductsModule`/`OrdersModule`); exports what others need.
- **Cross-cutting** — `ValidationPipe`, `AllExceptionsFilter`, `JwtAuthGuard`, `RolesGuard` are
  registered globally in [app.module.ts](../../../backend/src/app.module.ts), so every route gets
  them (including e2e).

## Rules

1. **No business logic in controllers.** If you write a calculation or a conditional rule in a
   controller, move it to the service.
2. **Services own transactions.** Any multi-write operation uses `this.prisma.$transaction`.
3. **Map every response.** Return DTOs via `to*Response`; never return a raw Prisma entity that
   could leak `passwordHash` or live product fields into a snapshot.
4. **Reuse via DI, not duplication.** Need product logic in admin? Import `ProductsModule` and call
   `ProductsService`. (But honor *intentional* isolation documented in NOTES.md — e.g. CartModule.)
5. **One source of truth for shared rules.** The order lifecycle lives only in
   [order-state-machine.ts](../../../backend/src/orders/order-state-machine.ts); don't re-encode
   transitions inline.
6. **Let the global filter shape errors.** Throw `HttpException` subclasses; map Prisma errors in
   the filter (`P2002→409`, `P2025→404`) rather than scattering try/catch.

## Examples

✅ Thin controller, logic delegated:
```ts
@Patch(':id/deactivate')
@ApiOperation({ summary: 'Soft-delete (deactivate) a product' })
deactivate(@Param('id') id: string): Promise<AdminProductResponseDto> {
  return this.products.setActive(id, false);   // logic lives in the service
}
```

✅ Service owns the transaction + the state-machine rule:
```ts
async updateStatus(orderId: string, next: OrderStatus) {
  return this.prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) throw new NotFoundException('Order not found');
    if (!canTransition(order.status, next))
      throw new ConflictException(`Cannot change order status from ${order.status} to ${next}`);
    if (isCancellation(next)) { /* restock atomically */ }
    return tx.order.update({ where: { id: orderId }, data: { status: next }, include: { items: true, user: true } });
  });
}
```

## Anti-patterns

- ❌ Prisma queries or total/stock math inside a controller method.
- ❌ Returning `prisma.user.findUnique(...)` directly (leaks `passwordHash`) — use `toSafeUser`.
- ❌ Re-implementing allowed transitions inline instead of `canTransition`.
- ❌ Reaching into another module's internals instead of importing its service.
- ❌ Swallowing errors with try/catch when the global filter already maps them.
- ❌ A "manager"/"helper" god-file that bypasses the service boundary.
