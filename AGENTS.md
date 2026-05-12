<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your
training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code.
Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

---

# GARFOU — Agent Context (updated 2026-05-12)

> **Read this file first.** It is the single source of truth for any AI agent working on this codebase.
> Every section links to the deeper doc for that topic. Never invent conventions — always check here first.

---

## 1. Project Summary

**Garfou** is a multi-tenant SaaS for restaurant management (orders, kitchen, waiter, menu,
inventory, finance, NPS). It runs on Vercel FREE tier — no persistent websockets, polling only.

---

## 2. Stack (exact versions matter)

| Layer         | Technology                                                       |
| ------------- | ---------------------------------------------------------------- |
| Framework     | **Next.js 16** App Router (`src/app`)                            |
| Language      | TypeScript                                                       |
| Runtime       | React 19                                                         |
| Dev server    | Turbopack, port **3000**                                         |
| Middleware    | `src/proxy.ts` (renamed from `middleware.ts`)                    |
| Styling       | TailwindCSS v4                                                   |
| UI primitives | `src/components/ui/` (button, card, input, badge, etc.)          |
| Icons         | lucide-react                                                     |
| ORM           | **Prisma 7.x** with `PrismaPg` adapter                           |
| Database      | PostgreSQL 16 (`garfou_db` Docker container, port **5433**→5432) |
| Auth          | **next-auth v5.0.0-beta.31** (`@auth/core`)                      |
| Payments      | Stripe                                                           |
| Testing       | Vitest (unit/integration) + Playwright (E2E)                     |

### Critical quirks

- **Prisma uses `PrismaPg` adapter**, NOT the traditional datasource URL approach.
  Always use `import { prisma } from "@/lib/db"` — never instantiate `PrismaClient` directly.
- **`src/proxy.ts`** is the Next.js middleware. It runs `NextAuth(authConfig)` on every request
  for session validation. This is edge-compatible (uses `auth.config.ts`, no Prisma).
- **`src/lib/auth.ts`** is the Node.js NextAuth config with `PrismaAdapter` + Credentials provider.
  It includes `skipCSRFCheck` (imported from `@auth/core`) to prevent CSRF token collision
  between `proxy.ts` and the route handler.
- **`src/lib/auth.config.ts`** is edge-compatible, has `trustHost: true`, `session: { strategy: "jwt" }`.

---

## 3. Environment

```env
DATABASE_URL="postgresql://garfou:garfou_dev@localhost:5433/garfou?schema=public"
AUTH_URL="http://localhost:3000"
AUTH_SECRET="garfou-dev-auth-secret-change-in-production"
```

Dev server: `npm run dev` (Turbopack). Seed: `npm run db:seed`.

---

## 4. Folder Structure

```
/src
  /app
    /(public)           # Landing, digital menu, NPS
    /(auth)             # /auth/signin, /auth/signup
    /(dashboard)        # /dashboard/[restaurantId]/...
    /api                # Route Handlers
    /dev/components     # Component showcase (dev only)
  /components
    /ui                 # Primitive components
    /shared             # Composed shared components (e.g. OrderStatusBadge)
  /features             # Feature modules (domain logic, client components)
    /orders             # ← see Section 5
    /menu
    /kitchen
    /waiter
    /inventory
    /finance
    /auth
    /settings
    /nps
    /coupons
    /delivery
  /lib
    /db.ts              # Prisma singleton
    /auth.ts            # NextAuth Node config (PrismaAdapter, Credentials, skipCSRFCheck)
    /auth.config.ts     # NextAuth edge config (trustHost, jwt strategy)
    /rbac.ts            # Role-based access control helpers
    /rate-limit.ts      # Rate limiting
    /utils.ts           # formatCurrency, formatDate, getOrderStatusColor, getOrderStatusLabel, cn()
    /validations/       # Zod schemas
  /repositories         # Data access layer (Repository Pattern)
  /tokens               # Design system tokens
  /types                # Global TypeScript types
  /proxy.ts             # Next.js middleware (edge runtime)
```

---

## 5. Orders Module (most recently worked on)

### Files

| File                                                               | Purpose                                                              |
| ------------------------------------------------------------------ | -------------------------------------------------------------------- |
| `src/features/orders/orders-live-table.tsx`                        | Live table, polls 5s, Eye+✅/❌ actions, opens modal                 |
| `src/features/orders/order-detail-modal.tsx`                       | Accessible dialog, receipt preview, Confirmar/Recusar/Imprimir       |
| `src/features/orders/order-print-receipt.tsx`                      | 48-col Bematech 58mm receipt builder + `printOrder()`                |
| `src/features/orders/dashboard-pending-orders.tsx`                 | Dashboard widget, polls 8s, ≤5 pending orders                        |
| `src/features/orders/dashboard-new-order-alert.tsx`                | Legacy alert banner (no longer on dashboard main)                    |
| `src/repositories/order.repository.ts`                             | `findMany()` returns full `items[]`; `findById()` returns full graph |
| `src/app/api/restaurants/[restaurantId]/orders/route.ts`           | GET list + POST create                                               |
| `src/app/api/restaurants/[restaurantId]/orders/[orderId]/route.ts` | GET detail + PATCH status                                            |

### Order interface (client-side, from `findMany`)

```typescript
interface Order {
  id: string;
  orderNumber: number;
  status: string;
  type: string;
  tableNumber: string | null;
  total: number;
  createdAt: string;
  items: unknown[]; // full items array — use items.length for count
}
// NOTE: it is NOT _count: { items: number } — that was a previous bug (fixed 2026-05-12)
```

### `PrintOrder` interface (for receipt)

```typescript
interface PrintOrder {
  orderNumber;
  createdAt;
  type;
  tableNumber;
  status;
  subtotal;
  discount;
  deliveryFee;
  total;
  paymentMethod;
  notes;
  customer?: { name; phone? };
  deliveryAddress?: { street; number; district; city; state };
  items: PrintItem[]; // { quantity, product: { name }, unitPrice, notes?, addons? }
}
```

### Printing (browser)

`printOrder(order: PrintOrder)` — opens hidden `<iframe>`, writes receipt HTML with
`@page { size: 58mm auto; margin: 2mm }`, calls `window.print()`.
Target: Bematech MP-4200 TH FI, 58mm paper, 48 chars/line.

### Status flow

```
NOVO_PEDIDO → AGUARDANDO_CONFIRMACAO → CONFIRMADO → EM_PREPARO → PRONTO → SAIU_PARA_ENTREGA → FINALIZADO
                                                                  ↘ CANCELADO (any point)
```

Pending statuses (need action): `NOVO_PEDIDO`, `AGUARDANDO_CONFIRMACAO`

---

## 6. Authentication

- Sign in at `/auth/signin` with Credentials (email + password via bcryptjs)
- Session: JWT strategy, stored in cookie
- `skipCSRFCheck` applied to avoid proxy.ts / route handler collision
- `src/proxy.ts` checks session for protected routes; public paths defined in `auth.config.ts`
- Server-side: `import { auth } from "@/lib/auth"` then `await auth()`
- Client-side: `import { useSession } from "next-auth/react"` (wrapped in `providers.tsx`)

---

## 7. Seed / Demo Data

Run: `npm run db:seed`

| Credential            | Password      | Role    |
| --------------------- | ------------- | ------- |
| `owner@garfou.demo`   | `Owner123!`   | OWNER   |
| `manager@garfou.demo` | `Manager123!` | MANAGER |
| `waiter@garfou.demo`  | `Waiter123!`  | WAITER  |
| `kitchen@garfou.demo` | `Kitchen123!` | KITCHEN |
| `cashier@garfou.demo` | `Cashier123!` | CASHIER |

Restaurant: **Garfou Prime Bistrô** (slug: `garfou-demo-max`)  
15 orders covering all statuses, 10 customers, 14 menu products, 3 coupons, 8 inventory items,
25 finance entries, 10 NPS responses.

---

## 8. Key Patterns

### Route Handler pattern

```typescript
// src/app/api/restaurants/[restaurantId]/orders/route.ts
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { restaurantId } = await params;
  // ...
}
```

### Repository pattern

```typescript
// Always use restaurantId in every query
const order = await prisma.order.findFirst({
  where: { id: orderId, restaurantId }, // ← tenancy guard
});
```

### Component First rule

- All feature components must have a JSDoc block at the top describing purpose, props, and behavior.

---

## 9. Documentation Map

| Doc                   | Location                              |
| --------------------- | ------------------------------------- |
| Architecture overview | `docs/architecture/overview.md`       |
| Project status matrix | `docs/architecture/project-status.md` |
| Security              | `docs/architecture/security.md`       |
| Orders feature        | `docs/features/orders.md`             |
| Print architecture    | `docs/printing/architecture.md`       |
| Living TODO           | `docs/specs/todo.md`                  |
| Progress log          | `docs/specs/progress-log.md`          |
| Master spec           | `docs/specs/master-spec.md`           |
| Database schema       | `docs/database/schema.md`             |
| Multi-tenancy         | `docs/multi-tenancy/strategy.md`      |
| Realtime strategy     | `docs/realtime/strategy.md`           |
| Deploy (Vercel)       | `docs/deploy/vercel.md`               |

---

## 10. What Is NOT Done (known gaps)

- **Print Agent daemon** — local Node/Electron app for silent ESC/POS printing; only architecture
  documented (`docs/printing/architecture.md`). `order.printConfirmed` / `printedAt` exist in DB
  but are only set by the daemon, not by browser printing.
- **WhatsApp automation** — no implementation yet.
- **E2E Playwright** — infrastructure exists, critical flows not yet stabilized.
- **Delivery rules** — zones/radius/fee structure exists in DB but end-to-end UX incomplete.
- **Operating hours auto-open/close** — partial domain support only.
- **Stripe full lifecycle** — base exists, complete subscription cycle incomplete.
