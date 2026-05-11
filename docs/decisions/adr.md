# ADR-001: Single Database Multitenancy

## Status
Accepted

## Context
GARFOU is a SaaS for restaurants running on Vercel FREE. We need to support multiple restaurant tenants cost-effectively.

## Decision
Use a single PostgreSQL database with row-level isolation via `restaurantId` FK on all tenant tables.

## Rationale
- Vercel FREE only allows 1 database connection pool configuration
- Schema-per-tenant requires DDL migrations per customer — impractical at scale
- Row-level is simpler to implement and maintain
- Prisma makes it easy to enforce via services

## Consequences
- Every query MUST include `restaurantId` in WHERE clause (enforced at repository layer)
- Risk of accidental data leakage if `restaurantId` is omitted — mitigated by repository pattern
- Database performance degrades if not properly indexed — mitigated with composite indexes

## Indexes Required
```sql
-- On every major tenant table:
CREATE INDEX idx_{table}_restaurant ON {table}(restaurant_id, created_at DESC);
CREATE INDEX idx_{table}_restaurant_deleted ON {table}(restaurant_id, deleted_at);
```

---

# ADR-002: No WebSockets — Smart Polling

## Status
Accepted

## Context
Vercel FREE serverless does not support persistent connections. Kitchen/waiter screens need near-realtime updates.

## Decision
Use TanStack Query polling at 3–5 second intervals. No WebSockets, no SSE initially.

## Rationale
- 5s delay is acceptable for kitchen workflow
- Polling is simple, reliable, and Vercel-compatible
- TanStack Query handles retries, caching, optimistic updates
- SSE can be added later if needed without breaking the architecture

## Consequences
- Maximum 3–5s delay on new orders appearing in kitchen
- Slightly higher DB read load (mitigated by Prisma connection pooling)
- No server push capability — acceptable tradeoff

---

# ADR-003: Auth.js (NextAuth v5) for Authentication

## Status
Accepted

## Context
Need secure, extensible auth for SaaS with email/password and future OAuth.

## Decision
Use Auth.js v5 (NextAuth) with Prisma adapter.

## Rationale
- Native Next.js App Router support
- Prisma adapter handles session storage
- Easy to add OAuth providers later (Google, etc.)
- Well-maintained, battle-tested

## Consequences
- Session data stored in DB (uses DB resources)
- Requires Auth.js tables in schema (accounts, sessions, verificationTokens)

---

# ADR-004: Stripe as Only External Integration

## Status
Accepted

## Context
SaaS needs payment processing for subscriptions.

## Decision
Integrate only Stripe. No other external payment or banking integrations initially.

## Rationale
- Stripe is industry standard, well-documented
- Restaurant financial features use manual entry (PIX, cash, card)
- Reduces scope and external dependencies
- Can expand later

## Consequences
- Subscription management via Stripe Billing
- Webhooks required for subscription lifecycle
- No automated payout or banking features
