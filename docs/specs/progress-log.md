# GARFOU Progress Log

## 2026-05-12

### Completed

- Fixed `MissingCSRF` login error (next-auth v5 + proxy.ts collision).
  - Root cause: `proxy.ts` runs its own `NextAuth(authConfig)` on every request, generating a
    second CSRF token that conflicts with the one set by the route handler.
  - Fix: `import { skipCSRFCheck } from "@auth/core"` added to `NextAuth({...})` in `src/lib/auth.ts`.
  - Expected server warning: `[auth][warn][csrf-disabled]` is normal.
- Fixed `TypeError: Cannot read properties of undefined (reading 'items')` on orders page.
  - `Order` interface declared `_count: { items: number }` but repository returns full `items[]`.
  - Fix: changed to `items: unknown[]` and render as `order.items.length`.
- Implemented Bematech MP-4200 thermal receipt rendering + printing:
  - `src/features/orders/order-print-receipt.tsx` — 48-col receipt builder, `printOrder()` helper
    (iframe + `@page { size: 58mm auto }`), `OrderPrintReceipt` screen preview component.
- Implemented `OrderDetailModal`:
  - `src/features/orders/order-detail-modal.tsx` — accessible dialog (ESC/backdrop close,
    focus-trapped, aria-modal), fetches `/api/restaurants/:rId/orders/:orderId`, shows receipt
    preview, Confirmar → PATCH `CONFIRMADO` + auto-print, Recusar → PATCH `CANCELADO`,
    Imprimir button always available.
- Wired modal into orders live table:
  - `src/features/orders/orders-live-table.tsx` — added `Eye` button on every row (all statuses)
    to open `OrderDetailModal`; inline ✅/❌ quick-action buttons kept for pending rows; modal
    updates local row status on change (no full refetch needed).
- Implemented dashboard pending-orders quick-action widget:
  - `src/features/orders/dashboard-pending-orders.tsx` — live widget polling every 8s, shows
    up to 5 orders in `NOVO_PEDIDO`/`AGUARDANDO_CONFIRMACAO`; Eye button opens modal; Confirm
    button PATCHes status + auto-prints; hides itself when queue is empty.
- Updated dashboard page (`src/app/(dashboard)/dashboard/[restaurantId]/page.tsx`):
  - Replaced static "Pedidos recentes" Card and old `DashboardNewOrderAlert` with the new
    `DashboardPendingOrders` live widget.

### Verified

- No TypeScript errors on any of the 5 modified/created files (`get_errors` confirmed).
- Build compiles successfully.

### Active Gaps (carry-over)

- Print Agent local daemon (Node/Electron) — architecture documented, not implemented.
- WhatsApp automation flow — not implemented.
- E2E Playwright critical flows — still partial.
- Some modules remain MVP-level.

---

## 2026-05-11

### Completed

- Added full database seed flow with realistic demo data for restaurant operations.
- Fixed authentication issues and improved post-login route behavior.
- Updated landing behavior for authenticated users.
- Consolidated prompt-adherence audit and status map.
- Added living specs structure under docs/specs (master spec, todo, progress log).
- Implemented conventional commits enforcement through .husky/commit-msg.

### Verified

- Test suite passing (115 tests).
- Build compilation successful.
- Auth credentials callback validated.
- Seeded dataset validated with expected entities.
- Commit message hook validated with valid/invalid examples.
- Lint checked without blocking errors.

### Active Gaps

- Print Agent implementation not started (only architecture docs exist).
- WhatsApp automation flow not implemented.
- E2E critical flow still partial.
- Some modules remain MVP-level.

### Next Execution Target

- Conventional commits enforcement + status/docs synchronization discipline.
