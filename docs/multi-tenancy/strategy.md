# GARFOU — Multitenancy Architecture

## Model

**Single Database, Row-Level Isolation**

Every resource is scoped to a `Restaurant`. Every query MUST include `restaurantId` in the WHERE clause.

## Tenant Hierarchy

```
User (global)
  └── UserRestaurant (junction — role per restaurant)
        └── Restaurant
              ├── Orders
              ├── Menu (Categories, Products)
              ├── Inventory
              ├── Finance
              ├── Customers
              └── Settings
```

## Roles

| Role | Description |
|------|-------------|
| `OWNER` | Full access, billing, settings |
| `MANAGER` | All ops, no billing |
| `WAITER` | Orders, tables, menu view |
| `KITCHEN` | Kitchen screen only |
| `CASHIER` | Finance, closing |

## Middleware

`src/middleware.ts` validates:
1. User is authenticated
2. User has access to the requested `restaurantId`
3. User role allows the requested action

## Tenant Resolution

Routes use the pattern `/dashboard/[restaurantId]/...`

The `restaurantId` is:
1. Extracted from the URL
2. Validated against `UserRestaurant` table
3. Stored in session for the request lifecycle

## Security Rules

- Never trust `restaurantId` from the client without DB validation
- Every service method receives `restaurantId` as a parameter
- Repository layer always filters by `restaurantId`
- Soft delete: records are never permanently deleted, only `deletedAt` is set
