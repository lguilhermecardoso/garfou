# GARFOU — Orders Feature

## Overview

The orders module is the core of GARFOU. It handles the full lifecycle of a restaurant order from creation to completion.

## Order Types

| Type | Description |
|------|-------------|
| `DINE_IN` | Customer dining in the restaurant |
| `TAKEOUT` | Customer picks up at counter |
| `DELIVERY` | Delivery to customer address |

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

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/restaurants/[restaurantId]/orders` | List orders (filterable by status) |
| POST | `/api/restaurants/[restaurantId]/orders` | Create new order |
| GET | `/api/restaurants/[restaurantId]/orders/[orderId]` | Get order details |
| PATCH | `/api/restaurants/[restaurantId]/orders/[orderId]/status` | Update status |
| POST | `/api/restaurants/[restaurantId]/orders/[orderId]/cancel` | Cancel order |
| GET | `/api/restaurants/[restaurantId]/orders/print-queue` | Print Agent polling endpoint |
| POST | `/api/restaurants/[restaurantId]/orders/[orderId]/confirm-print` | Mark as printed |
