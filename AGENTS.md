<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your
training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code.
Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

---

# GARFOU — Agent Context (updated 2026-06-10)

> **Read this file first.** It is the single source of truth for any AI agent working on this codebase.
> Every section links to the deeper doc for that topic. Never invent conventions — always check here first.

---

## 1. Project Summary

**chamou.delivery** (formerly Garfou) is a multi-tenant SaaS for restaurant management (orders, kitchen, waiter, menu,
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

| File                                                               | Purpose                                                                                  |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `src/features/orders/orders-live-table.tsx`                        | Live table, polls 5s, Eye+✅/❌/🚚/✅ actions, opens modal                               |
| `src/features/orders/order-detail-modal.tsx`                       | Accessible dialog, receipt preview, Confirmar/Recusar/Saiu p/ Entrega/Finalizar/Imprimir |
| `src/features/orders/order-print-receipt.tsx`                      | 48-col Bematech 58mm receipt builder + `printOrder()`                                    |
| `src/features/orders/dashboard-pending-orders.tsx`                 | Dashboard widget, polls 8s, ≤5 pending orders                                            |
| `src/features/orders/dashboard-new-order-alert.tsx`                | Legacy alert banner (no longer on dashboard main)                                        |
| `src/repositories/order.repository.ts`                             | `findMany()` returns full `items[]`; `findById()` returns full graph                     |
| `src/app/api/restaurants/[restaurantId]/orders/route.ts`           | GET list + POST create                                                                   |
| `src/app/api/restaurants/[restaurantId]/orders/[orderId]/route.ts` | GET detail + PATCH status                                                                |

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

## 5.1 Inventory Operations Module (implemented 2026-05-12)

### Files

| File                                                                      | Purpose                                                  |
| ------------------------------------------------------------------------- | -------------------------------------------------------- |
| `src/features/inventory/stock-operations-modal.tsx`                       | Modal for stock operations (IN, OUT, ADJUSTMENT)         |
| `src/features/inventory/inventory-table.tsx`                              | Table with "Movimentar" button per row, low stock alerts |
| `src/app/(dashboard)/dashboard/[restaurantId]/inventory/page.tsx`         | Server component fetching items, uses InventoryTable     |
| `src/app/api/restaurants/[restaurantId]/inventory/[itemId]/move/route.ts` | POST endpoint for stock movements                        |

### Movement types

```typescript
enum MovementType {
  IN         // Entrada: adiciona ao estoque
  OUT        // Saída: remove do estoque
  ADJUSTMENT // Ajuste: define nova quantidade (delta calculado)
}
```

### Key rules

- Stock cannot go negative after any operation
- ADJUSTMENT calculates delta automatically: `newQuantity - currentQuantity`
- All movements require a `reason` field (mandatory)
- Low stock alert when `currentQuantity <= minStock`
- Auto-refresh after operations using `router.refresh()`
- Hardcoded operation selector buttons (Tailwind v4 doesn't support dynamic classes)

### API payload for POST /move

```typescript
{
  type: "IN" | "OUT" | "ADJUSTMENT",
  quantity: number,     // For IN/OUT: amount to add/remove
                        // For ADJUSTMENT: desired new total quantity
  reason: string,
  userId: string
}
```

---

## 5.2 Menu Customization Module (implemented 2026-05-12)

### Files

| File                                                | Purpose                                                                   |
| --------------------------------------------------- | ------------------------------------------------------------------------- |
| `src/features/menu/menu-management.tsx`             | Manager cardápio CRUD + product customization panel                       |
| `src/features/menu/product-customization-panel.tsx` | Manager controls for modifier groups and split-flavor configuration       |
| `src/features/menu/digital-menu-client.tsx`         | Public digital menu with customization-aware cart flow                    |
| `src/features/menu/product-detail-sheet.tsx`        | Bottom sheet for split selection, modifier groups, notes, and price calc  |
| `src/features/menu/modifier-group-section.tsx`      | Renders a single modifier group in the digital menu                       |
| `src/features/menu/split-selector.tsx`              | Renders product split selection (2/3/4 parts)                             |
| `src/features/menu/menu-customization-types.ts`     | Shared menu customization types and price helpers                         |
| `src/features/menu/product-customization.server.ts` | Server helpers for serializing and persisting customization configuration |

### Product fields

```typescript
interface ProductCustomizationConfig {
  allowCustomization: boolean;
  allowSplit: boolean;
  maxSplits: 2 | 3 | 4;
  splitPriceRule: "HIGHEST" | "AVERAGE" | "SUM";
  modifierGroups: ModifierGroup[];
  splitFlavors: SplitFlavor[];
}
```

### Order item payload additions

```typescript
interface CreateOrderItemInput {
  productId: string;
  quantity: number;
  notes?: string;
  selectedOptions: Array<{ optionId: string; quantity: number; isRemoval: boolean }>;
  splits: Array<{ splitIndex: number; flavorProductId: string }>;
}
```

### Key rules

- Customizable products open `ProductDetailSheet` before entering the cart.
- Split products require exactly `maxSplits` selected flavors.
- Modifier and split prices are snapshotted at order creation time.
- Legacy `product_addons` remains supported, but the new feature uses `modifier_groups` and related tables.

---

## 6. Authentication

- Sign in at `/auth/signin` with Credentials (email + password via bcryptjs)
- Session: JWT strategy, stored in cookie
- `skipCSRFCheck` applied to avoid proxy.ts / route handler collision
- `src/proxy.ts` checks session for protected routes; public paths defined in `auth.config.ts`
- Server-side: `import { auth } from "@/lib/auth"` then `await auth()`
- Client-side: `import { useSession } from "next-auth/react"` (wrapped in `providers.tsx`)

### RBAC (Role-Based Access Control)

- **Location**: `src/lib/rbac.ts`
- **Function**: `requireRole(restaurantId: string, minRole: UserRole)`
- **Hierarchy**: OWNER (5) > MANAGER (4) > CASHIER (3) > WAITER (2) > KITCHEN (1)
- **OWNER privilege**: OWNER role has unrestricted access to ALL operations, bypassing any permission checks. This ensures the restaurant owner can always access and manage all features, regardless of required role.
- **Usage**: Call `requireRole()` at the start of protected route handlers to verify access

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
| Permissions (RBAC)    | `docs/architecture/permissions.md`    |
| Orders feature        | `docs/features/orders.md`             |
| Cash Register         | `docs/features/cash-register.md`      |
| Print architecture    | `docs/printing/architecture.md`       |
| Living TODO           | `docs/specs/todo.md`                  |
| Progress log          | `docs/specs/progress-log.md`          |
| Master spec           | `docs/specs/master-spec.md`           |
| Database schema       | `docs/database/schema.md`             |
| Multi-tenancy         | `docs/multi-tenancy/strategy.md`      |
| Realtime strategy     | `docs/realtime/strategy.md`           |
| Deploy (Vercel)       | `docs/deploy/vercel.md`               |
| Devices (PIN system)  | `DEVICES.md`                          |

---

## 10. Device System - PIN-Based Authentication (COMPLETED 2026-05-13)

**Purpose:** Allow tablets (waiters) and TVs (kitchen) to access fullscreen apps securely without traditional login.

**Solution:** Industry-standard PIN system (6-digit temporary codes, 10-minute expiration)

### Key Features

- ✅ **Manager generates PIN** from dashboard → auto-opens activation page in new tab
- ✅ **Worker types 6-digit PIN** → instant activation, vinculado ao restaurante
- ✅ **Session expires** in 10 minutes (configurable), revalidated every 30 seconds
- ✅ **Fullscreen apps** without sidebar/header, optimized for tablets/TVs
- ✅ **Multi-tenancy secure** - impossible to access another restaurant's data

### Architecture

**Database:** `DeviceSession` model with `pin`, `restaurantId`, `type (WAITER|KITCHEN)`, `expiresAt`

**APIs:**

- POST `/api/restaurants/[restaurantId]/devices/generate` - Generate PIN (MANAGER+)
- POST `/api/devices/activate` - Validate PIN and activate device (PUBLIC)
- GET `/api/devices/validate?sessionId=xxx` - Check if session still valid (PUBLIC)
- DELETE `/api/devices/validate?sessionId=xxx` - Logout device (PUBLIC)

**Pages:**

- `/waiter-app/activate` - PIN entry page (blue theme)
- `/waiter-app/[slug]` - Fullscreen waiter app
- `/kitchen-app/activate` - PIN entry page (orange theme)
- `/kitchen-app/[slug]` - Fullscreen kitchen display

**Component:** `DevicePinModal` - Dashboard widget to generate PINs

**Security:**

- PIN expires after 10 minutes
- PIN can only be used once (marked as `activatedAt` after use)
- Session revalidated every 30 seconds on client
- All requests filtered by `restaurantId` from session
- Public routes configured in `auth.config.ts`

**Full Documentation:** See `DEVICES.md` for complete architecture, UX flows, and usage guide.

---

## 11. What Is NOT Done (known gaps)

- **Print Agent daemon** — local Node/Electron app for silent ESC/POS printing; only architecture
  documented (`docs/printing/architecture.md`). `order.printConfirmed` / `printedAt` exist in DB
  but are only set by the daemon, not by browser printing.
- **WhatsApp automation** — no implementation yet.
- **E2E Playwright** — infrastructure exists, critical flows not yet stabilized.
- **Delivery rules** — zones/radius/fee structure exists in DB but end-to-end UX incomplete.
- **Operating hours auto-open/close** — partial domain support only.
- **Stripe full lifecycle** — base exists, complete subscription cycle incomplete.
