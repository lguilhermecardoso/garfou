# GARFOU — Architecture Overview

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15+ App Router |
| Language | TypeScript |
| Styling | TailwindCSS v4 + shadcn/ui |
| ORM | Prisma |
| Database | PostgreSQL |
| Auth | NextAuth v5 (Auth.js) |
| State/Cache | TanStack Query |
| Validation | Zod |
| Payments | Stripe |
| Hosting | Vercel FREE |

## Folder Structure

```
/src
  /app                    # Next.js App Router routes
    /(public)             # Public routes (landing, menu, nps)
    /(auth)               # Auth routes (login, signup)
    /(dashboard)          # Authenticated restaurant dashboard
    /api                  # API Route Handlers
  /components             # Shared UI components
    /ui                   # Primitive shadcn/ui components
    /shared               # Composed shared components
  /features               # Feature modules (domain logic)
    /orders
    /menu
    /kitchen
    /waiter
    /inventory
    /finance
    /crm
    /reports
    /printing
    /settings
  /lib                    # Utilities and configurations
    /db.ts                # Prisma client singleton
    /auth.ts              # NextAuth config
    /stripe.ts            # Stripe client
    /validations          # Zod schemas
  /hooks                  # Custom React hooks
  /services               # Backend service layer
  /repositories           # Data access layer (Repository Pattern)
  /types                  # Global TypeScript types
  /tokens                 # Design system tokens
```

## Architectural Patterns

### Clean Architecture (adapted for Next.js)

```
Route Handler / Server Action
    ↓
Service Layer (business logic)
    ↓
Repository Layer (data access)
    ↓
Prisma ORM
    ↓
PostgreSQL
```

### Multitenancy Strategy

- Single PostgreSQL database
- Every table includes `restaurantId` FK
- Middleware validates tenant access on every request
- RBAC enforced at service layer

### Realtime Strategy (Vercel-compatible)

- **No persistent WebSockets**
- TanStack Query polling (3–5s for kitchen/waiter)
- `stale-while-revalidate` for dashboard
- Optimistic updates for waiter app
- SSE as fallback if needed

## Key Constraints

- Must run 100% on Vercel FREE tier
- Serverless-friendly (no persistent connections)
- Mobile-first UI (primary users: waiters, kitchen staff)
- 5s delay acceptable for realtime features
