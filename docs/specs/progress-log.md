# GARFOU Progress Log

## 2026-05-14

### Completed (Features sem dependências externas)

- **Histórico de Movimentações de Estoque**:
  - `src/app/api/restaurants/[restaurantId]/inventory/movements/route.ts` — GET paginado, filtro por itemId, join com nome do item e usuário
  - `src/features/inventory/inventory-movements-table.tsx` — client component, paginação "load more", badges coloridas por tipo
  - `src/app/(dashboard)/dashboard/[restaurantId]/inventory/movements/page.tsx` — página de histórico
  - Botão "Histórico" adicionado na página `/inventory`

- **QR Code por Mesa**:
  - `src/features/tables/table-qr-modal.tsx` — modal com `QRCodeSVG` + `QRCodeCanvas` (para download PNG), impressão via nova janela
  - `src/features/tables/tables-settings.tsx` — prop `restaurantSlug` adicionada, botão QR por linha
  - `src/app/(dashboard)/dashboard/[restaurantId]/settings/tables/page.tsx` — server component busca `restaurant.slug` no banco
  - `src/app/(public)/menu/[slug]/page.tsx` — `searchParams` aceita `?table=X`, repassa como prop `tableNumber`
  - `src/features/menu/digital-menu-client.tsx` — prop `tableNumber`, estado `tableNumberState`, mode DINE_IN locked, badge "Mesa X" no checkout, `tableNumber` no payload do pedido

- **WhatsApp**:
  - `src/features/whatsapp/whatsapp-tools.tsx` — client component: link Web, wa.me builder, 5 templates com copy-to-clipboard animado
  - Página `/whatsapp` refatorada — de iframe impossível para `WhatsAppTools` funcional
  - `src/features/orders/order-detail-modal.tsx` — botão WhatsApp com link wa.me personalizado (substituir nome/número)

- **Relatórios com Gráficos (recharts)**:
  - `src/features/reports/revenue-chart.tsx` — AreaChart responsivo, tooltip customizado, gradiente verde
  - `src/features/reports/orders-chart.tsx` — BarChart responsivo, tooltip customizado, barras roxas
  - Reports page — `searchParams.period`, fetch de `periodOrders`, agregação em memória por dia (prefilled com zeros), dois gráficos renderizados, seletor 7d/30d/3m via Next.js Link

- **Exportação CSV**:
  - `src/app/api/restaurants/[restaurantId]/reports/export/route.ts` — GET protegido (MANAGER+), CSV com BOM UTF-8, tipo orders ou finance, range de datas, validação de range máx 1 ano
  - `src/features/reports/export-csv-button.tsx` — client component que calcula datas do período e abre URL de download
  - Reports page — 2 botões de export (pedidos + financeiro) integrados ao layout

## 2026-05-12

### Completed (Latest Session)

- **Implemented complete inventory stock operations UI**:
  - `src/features/inventory/stock-operations-modal.tsx` — modal with 3 operation types (IN, OUT, ADJUSTMENT)
  - Real-time preview showing new stock level after operation
  - Operation type selector with hardcoded color classes (Tailwind v4 compatibility)
  - Validation: prevents negative stock, requires positive quantities, enforces reason field
  - ADJUSTMENT type automatically calculates delta as `newQuantity - currentQuantity`
  - `src/features/inventory/inventory-table.tsx` — refactored to show "Movimentar" button per row
  - `src/app/(dashboard)/dashboard/[restaurantId]/inventory/page.tsx` — refactored to use InventoryTable component
  - Low stock alerts with amber highlighting for items at or below minimum
  - Auto-refresh after operations using `router.refresh()`

- **Implemented delivery order flow buttons**:
  - `src/features/orders/orders-live-table.tsx`:
    - Added 🚚 Truck button for PRONTO + DELIVERY orders → transitions to SAIU_PARA_ENTREGA
    - Added ✅ Finalize button for PRONTO (non-delivery) or SAIU_PARA_ENTREGA → transitions to FINALIZADO
    - Blue row highlighting (bg-blue-50) for SAIU_PARA_ENTREGA status
    - Added `isOutForDelivery` and `isDelivery` checks
    - Imported Truck icon from lucide-react
  - `src/features/orders/order-detail-modal.tsx`:
    - Added "Saiu para Entrega" button with truck icon for ready delivery orders
    - Added "Finalizar" button for ready non-delivery or out-for-delivery orders
    - Updated actioning state type to include "out_for_delivery"
    - Added OUT_FOR_DELIVERY_STATUS constant
    - Toast notifications for all state transitions
  - Customer tracking page (`src/features/orders/track-orders-client.tsx`) already supports all statuses including SAIU_PARA_ENTREGA with auto-refresh every 15s

- **Tested and verified**:
  - No TypeScript errors in any modified files
  - Stock operations API working (POST 201 responses in terminal logs)
  - Auto-refresh working on orders page (5s interval) and inventory page
  - Order status transitions validated in service layer

### Completed (Earlier Today)

- Implemented menu item customization and split-product flow:
  - `prisma/schema.prisma` now includes `ModifierGroup`, `ModifierOption`, `ProductSplitFlavor`, `OrderItemSelectedOption`, `OrderItemSplit`, plus product flags `allowCustomization`, `allowSplit`, `maxSplits`, `splitPriceRule`.
  - `src/features/menu/menu-management.tsx` now exposes manager-side configuration for modifier groups and split flavors through `ProductCustomizationPanel`.
  - `src/features/menu/digital-menu-client.tsx` now routes customizable products through `ProductDetailSheet` instead of raw add-to-cart.
  - New menu components: `product-detail-sheet.tsx`, `modifier-group-section.tsx`, `split-selector.tsx`, `product-customization-panel.tsx`, `menu-customization-types.ts`.
  - `src/features/orders/order.service.ts` now validates and persists `selectedOptions[]` and `splits[]` with price snapshots.
  - `src/features/orders/order-print-receipt.tsx` now prints split flavor lines and selected option lines.
  - Product/menu APIs now expose structured customization data for manager and public menu surfaces.

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

- `npx prisma validate` passed after schema changes.
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
