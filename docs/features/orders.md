# GARFOU — Orders Feature

## Overview

The orders module is the core of GARFOU. It handles the full lifecycle of a restaurant order from
creation to completion, including real-time live table, full-detail modal with receipt preview, and
browser-based thermal printing (Bematech MP-4200 / 58mm).

## Order Types

| Type       | Description                       |
| ---------- | --------------------------------- |
| `DINE_IN`  | Customer dining in the restaurant |
| `TAKEOUT`  | Customer picks up at counter      |
| `DELIVERY` | Delivery to customer address      |

## Order Status Flow

```
NOVO_PEDIDO
    ↓
AGUARDANDO_CONFIRMACAO  ← (if manual approval required)
    ↓
CONFIRMADO
    ↓
EM_PREPARO
    ↓
PRONTO
    ↓
SAIU_PARA_ENTREGA  ← (only for DELIVERY type)
    ↓
FINALIZADO

At any point → CANCELADO
```

## Key Rules

1. Orders can be created by: waiters, customers (digital menu), cashiers
2. `orderNumber` is auto-incremented PER restaurant (not global)
3. Product prices are **snapshotted** at order creation time (not live price)
4. Modifier options and split flavors are also snapshotted at order creation time
5. Discount/coupon is applied at order level, not item level
6. Kitchen only sees orders in: `CONFIRMADO`, `EM_PREPARO` status
7. Waiter app shows all non-cancelled orders for current session

## Auto-Approval

Restaurants can configure `settings.autoApproveOrders = true`.

- When enabled: orders skip `AGUARDANDO_CONFIRMACAO` and go directly to `CONFIRMADO`
- When disabled: staff must manually approve each order (default for seed data: `approvalMode: "MANUAL"`)

## Components

### OrdersLiveTable (`src/features/orders/orders-live-table.tsx`)

- `"use client"` — polls `GET /api/restaurants/:rId/orders` every **5 seconds**
- Status filter pills (all statuses + "Todos")
- Plays a doorbell sound when new NOVO_PEDIDO/AGUARDANDO_CONFIRMACAO orders appear
- **Eye button** on every row → opens `OrderDetailModal`
- **Inline ✅/❌ buttons** on `NOVO_PEDIDO` / `AGUARDANDO_CONFIRMACAO` rows for quick approve/reject
- **🚚 Truck button** on `PRONTO` + `DELIVERY` rows → marks as `SAIU_PARA_ENTREGA`
- **✅ Finalize button** on `PRONTO` (non-delivery) or `SAIU_PARA_ENTREGA` rows → marks as `FINALIZADO`
- Row highlighting: pending (amber), ready (emerald), out for delivery (blue)
- Props: `{ restaurantId: string, initialStatus?: string }`

### OrderDetailModal (`src/features/orders/order-detail-modal.tsx`)

- `"use client"` — accessible dialog (`role="dialog"`, `aria-modal`, ESC/backdrop close)
- Fetches full order from `GET /api/restaurants/:rId/orders/:orderId` on open
- Renders `<OrderPrintReceipt>` preview inside
- **Confirmar e Imprimir** button: PATCH status → `CONFIRMADO` then auto-calls `printOrder()`
- **Recusar** button: PATCH status → `CANCELADO`
- **Saiu para Entrega** button (🚚): Only for `PRONTO` + `DELIVERY` orders → `SAIU_PARA_ENTREGA`
- **Finalizar** button (✅): For `PRONTO` (non-delivery) or `SAIU_PARA_ENTREGA` → `FINALIZADO`
- **Imprimir** button: always available, calls `printOrder()`
- `onStatusChange(orderId, newStatus)` callback — parent updates its local state, no full refetch
- Props: `{ orderId: string | null, restaurantId: string, onClose(): void, onStatusChange?(id, status): void }`

### OrderPrintReceipt (`src/features/orders/order-print-receipt.tsx`)

- `"use client"` — screen preview component + standalone helpers
- `buildReceiptLines(order: PrintOrder): string[]` — 48-char/line receipt, `═`/`─` borders
- `printOrder(order: PrintOrder): void` — injects into hidden `<iframe>`, calls `window.print()`
  with `@page { size: 58mm auto; margin: 2mm }` — targets Bematech MP-4200 TH FI
- `OrderPrintReceipt({ order, className })` — monospaced scroll preview, max-height 60vh
- `PrintOrder` interface includes: orderNumber, createdAt, type, tableNumber, status, subtotal,
  discount, deliveryFee, total, paymentMethod, notes, customer, deliveryAddress, items
- `PrintItem` now supports `selectedOptions[]` and `splits[]` to render customizations and divided products

### DashboardPendingOrders (`src/features/orders/dashboard-pending-orders.tsx`)

- `"use client"` — polls every **8 seconds**
- Shows up to 5 orders with status `NOVO_PEDIDO` or `AGUARDANDO_CONFIRMACAO`
- **Eye button** → opens `OrderDetailModal`
- **Confirm button** → PATCH `CONFIRMADO` + auto-print
- Renders nothing (`return null`) when queue is empty
- Props: `{ restaurantId: string, initialCount?: number }`

## Printing

### Browser-based (implemented)

Uses `printOrder()` in `order-print-receipt.tsx`:

- Creates a hidden `<iframe>`, writes HTML with `@page { size: 58mm auto; margin: 2mm }` and
  `font-family: Courier New; font-size: 8.5pt`
- Calls `iframe.contentWindow.print()` then removes iframe after 2s
- Works with Bematech MP-4200 TH FI and compatible 58mm thermal printers when the OS printer
  driver is installed and set as default

### Print Agent (architecture only — not yet implemented)

See [printing architecture](../printing/architecture.md).

- Local Node/Electron daemon polls `/api/restaurants/:id/orders/print-queue`
- Sends ESC/POS commands directly to the printer
- Posts confirmation back via `POST /api/.../confirm-print`
- `order.printConfirmed` and `order.printedAt` fields track this

## API Endpoints

| Method | Route                                                            | Description                                                       |
| ------ | ---------------------------------------------------------------- | ----------------------------------------------------------------- |
| GET    | `/api/restaurants/[restaurantId]/orders`                         | List orders; query params: `status`, `page`, `pageSize`           |
| POST   | `/api/restaurants/[restaurantId]/orders`                         | Create new order with addons, selectedOptions, splits             |
| GET    | `/api/restaurants/[restaurantId]/orders/[orderId]`               | Get full order (customer, items, addons, selectedOptions, splits) |
| PATCH  | `/api/restaurants/[restaurantId]/orders/[orderId]`               | Update status (`updateOrderStatusSchema`)                         |
| GET    | `/api/restaurants/[restaurantId]/orders/print-queue`             | Print Agent polling endpoint                                      |
| POST   | `/api/restaurants/[restaurantId]/orders/[orderId]/confirm-print` | Mark as printed                                                   |

## Repository Shape

`order.repository.ts`:

- `findMany()` returns `{ orders, total, page, pageSize }` — `orders[]` includes full `items[]` array
- `findById()` returns order with `customer`, `waiter`, `items` (each with `product`, `addons`, `selectedOptions`, `splits`)
- `findPrintQueue()` returns orders where `printConfirmed: false` and status in `[CONFIRMADO, EM_PREPARO]`

## Seed Data

Orders in demo seed (`prisma/seed.js`), restaurant slug `garfou-demo-max`:

- #1001 `NOVO_PEDIDO` — DINE_IN mesa 05
- #1002 `AGUARDANDO_CONFIRMACAO` — DELIVERY
- #1003 `CONFIRMADO` — DINE_IN mesa 12
- #1004 `EM_PREPARO` — TAKEOUT
- #1005 `PRONTO` — DINE_IN mesa 03
- #1006 `SAIU_PARA_ENTREGA` — DELIVERY
- #1007–#1015 — mix of FINALIZADO and CANCELADO (historical)

## Overview

The orders module is the core of GARFOU. It handles the full lifecycle of a restaurant order from creation to completion.

## Order Types

| Type       | Description                       |
| ---------- | --------------------------------- |
| `DINE_IN`  | Customer dining in the restaurant |
| `TAKEOUT`  | Customer picks up at counter      |
| `DELIVERY` | Delivery to customer address      |

## Order Status Flow

```
NOVO_PEDIDO
    ↓
AGUARDANDO_CONFIRMACAO  ← (if manual approval required)
    ↓
CONFIRMADO
    ↓
EM_PREPARO
    ↓
PRONTO
    ↓
SAIU_PARA_ENTREGA  ← (only for DELIVERY type)
    ↓
FINALIZADO

At any point → CANCELADO
```

## Key Rules

1. Orders can be created by: waiters, customers (digital menu), cashiers
2. `orderNumber` is auto-incremented PER restaurant (not global)
3. Product prices are **snapshotted** at order creation time (not live price)
4. Discount/coupon is applied at order level, not item level
5. Kitchen only sees orders in: `CONFIRMADO`, `EM_PREPARO` status
6. Waiter app shows all non-cancelled orders for current session

## Auto-Approval

Restaurants can configure `settings.autoApproveOrders = true`.

- When enabled: orders skip `AGUARDANDO_CONFIRMACAO` and go directly to `CONFIRMADO`
- When disabled: staff must manually approve each order

## Printing

See [printing architecture](../printing/architecture.md).

Orders have `printedAt` and `printConfirmed` fields.
The Print Agent polls for orders where `printConfirmed = false`.

## API Endpoints

| Method | Route                                                            | Description                        |
| ------ | ---------------------------------------------------------------- | ---------------------------------- |
| GET    | `/api/restaurants/[restaurantId]/orders`                         | List orders (filterable by status) |
| POST   | `/api/restaurants/[restaurantId]/orders`                         | Create new order                   |
| GET    | `/api/restaurants/[restaurantId]/orders/[orderId]`               | Get order details                  |
| PATCH  | `/api/restaurants/[restaurantId]/orders/[orderId]/status`        | Update status                      |
| POST   | `/api/restaurants/[restaurantId]/orders/[orderId]/cancel`        | Cancel order                       |
| GET    | `/api/restaurants/[restaurantId]/orders/print-queue`             | Print Agent polling endpoint       |
| POST   | `/api/restaurants/[restaurantId]/orders/[orderId]/confirm-print` | Mark as printed                    |
