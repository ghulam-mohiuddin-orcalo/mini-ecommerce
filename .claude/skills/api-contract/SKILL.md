---
name: api-contract
description: The HTTP contract conventions for this API — response/error envelope, validation, status codes, pagination, filtering, authentication, and authorization. Load when designing, implementing, consuming, or testing any endpoint.
---

# API Contract

Every endpoint in this server-authoritative API follows one consistent contract. Match it so the
frontend `apiFetch`, the tests, and Swagger all agree.

## Response shapes

- **Single resource:** the response DTO directly (money as integer `*Cents`).
- **List:** the pagination envelope
  ```ts
  { data: T[], meta: { page: number, pageSize: number, total: number, totalPages: number } }
  ```
  Used by `/products`, `/admin/products`, `/admin/orders`. Default `pageSize` is per-endpoint
  (catalog 12, admin lists 20).
- **No body:** `204 No Content` (the client's `apiFetch` returns `undefined`).

## Error envelope (one shape, everywhere)

Produced by [all-exceptions.filter.ts](../../../backend/src/common/filters/all-exceptions.filter.ts):
```ts
{ statusCode: number, error: string, message: string | string[], path: string, timestamp: string }
```
Validation `message` is an array of strings. **Never** leak stack traces; 5xx logs server-side and
returns a generic message. The frontend surfaces `message` via `ApiError`.

## Status-code matrix

| Code | When |
|---|---|
| **200 / 201 / 204** | success / created / no-content |
| **401 Unauthorized** | missing/invalid/expired JWT cookie |
| **403 Forbidden** | authenticated but wrong role (`@Roles(ADMIN)`) |
| **404 Not Found** | missing resource **or** a resource the requester doesn't own (IDOR-safe) |
| **409 Conflict** | duplicate SKU (`P2002`), oversell, invalid state transition |
| **402 Payment Required** | mock payment declined |
| **422 Unprocessable Entity** | DTO validation failure (this app's validation code, **not** 400) |
| **429 Too Many Requests** | auth rate limit (`@nestjs/throttler`) |

## Validation

Global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true,
enableImplicitConversion: true, errorHttpStatusCode: 422 })`. Consequences:
- Unknown fields are **rejected** (422) — clients must send exactly the DTO.
- Query params arrive as strings and are coerced (`page`/`minPrice` → number) via implicit
  conversion; still annotate with `@Type`/`@IsInt` as the DTOs do.
- Every DTO field carries an explicit `class-validator` rule; money is `@IsInt() @Min(0)` cents.

Example DTO ([create-product.dto.ts](../../../backend/src/products/dto/create-product.dto.ts)):
```ts
@ApiProperty({ example: 1999, description: 'Price in integer cents' })
@IsInt() @Min(0) @Max(100_000_000)
priceCents!: number;
```

## Filtering & pagination

- Filters are explicit query params composed into a reusable Prisma `where` (e.g. catalog: always
  `isActive: true`, plus optional `search` (case-insensitive `contains`), `category`,
  `minPrice`/`maxPrice` in cents, `sort` ∈ `newest|price_asc|price_desc`).
- Data + count run in **one** `$transaction` round trip.
- `toQueryString` on the client omits undefined/empty params.

## Authentication & authorization

- **JWT in an httpOnly cookie** `access_token`; the browser is same-origin via the Next `/api/*`
  proxy. Guards are global and **secure-by-default**: a route is protected unless `@Public()`.
- `@Roles(Role.ADMIN)` (class- or method-level) gates admin routes; the customer→403, anon→401
  behaviour is guaranteed by the global `RolesGuard`.
- Customer endpoints take **no** owner param — identity is `req.user.id` from the cookie. By-id
  reads use `findFirst({ id, userId })` and return **404** for non-owners (never reveal existence).
- `@Public` reads (`/recommendations`) can still personalize via `OptionalJwtAuthGuard`.

## Swagger

`@ApiTags`, `@ApiOperation`, typed `@ApiOkResponse`/`@ApiConflictResponse`, `@ApiCookieAuth` on
protected routes, `@ApiProperty` on DTO fields. Mounted at `/api/docs`, non-production only.

## Anti-patterns

- ❌ Returning `400` for validation (this app uses **422**) or `403` for a foreign resource (use
  **404**).
- ❌ A list endpoint without the `{ data, meta }` envelope.
- ❌ Accepting a client-supplied `userId`/`cartId` to address data (it'll be 422'd by
  `forbidNonWhitelisted`, and it's an IDOR smell).
- ❌ Exposing floats or pre-formatted currency from the API.
- ❌ Declaring a `:id` route before a static sibling (`/products/categories` must come first).
- ❌ Hand-rolling an error object instead of throwing an `HttpException` for the filter to shape.
