# GARFOU — Database Schema Documentation

## Conventions

- All tables use `id` as UUID primary key
- All tables have `createdAt`, `updatedAt` timestamps
- All user-facing data has `deletedAt` for soft delete
- `restaurantId` FK on all restaurant-scoped tables

## Tables

### users
Global user accounts (not tenant-scoped)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| name | varchar | |
| email | varchar | unique |
| emailVerified | timestamp | |
| passwordHash | varchar | bcrypt |
| image | varchar | avatar URL |
| createdAt | timestamp | |
| updatedAt | timestamp | |

### restaurants
One user can own many restaurants

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| name | varchar | |
| slug | varchar | unique — URL identifier |
| logo | varchar | |
| phone | varchar | |
| address | varchar | |
| city | varchar | |
| state | varchar | |
| planId | varchar | stripe plan |
| stripeCustomerId | varchar | |
| stripeSubscriptionId | varchar | |
| subscriptionStatus | enum | ACTIVE, TRIALING, CANCELED, PAST_DUE |
| trialEndsAt | timestamp | |
| isOpen | boolean | manual toggle |
| settings | json | restaurant config |
| createdAt | timestamp | |
| updatedAt | timestamp | |
| deletedAt | timestamp | soft delete |

### user_restaurants
Junction table for user-restaurant access with roles

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| userId | uuid | FK users |
| restaurantId | uuid | FK restaurants |
| role | enum | OWNER, MANAGER, WAITER, KITCHEN, CASHIER |
| createdAt | timestamp | |

### categories
Menu categories per restaurant

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| restaurantId | uuid | FK |
| name | varchar | |
| description | varchar | |
| image | varchar | |
| sortOrder | int | display order |
| isActive | boolean | |
| createdAt | timestamp | |
| updatedAt | timestamp | |
| deletedAt | timestamp | |

### products
Menu items per restaurant

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| restaurantId | uuid | FK |
| categoryId | uuid | FK categories |
| name | varchar | |
| description | text | |
| price | decimal(10,2) | |
| image | varchar | |
| sortOrder | int | |
| isActive | boolean | visible on digital menu |
| isInternalOnly | boolean | only waiter/cashier can order |
| isFeatured | boolean | highlight on menu |
| preparationTime | int | minutes |
| costPrice | decimal(10,2) | for margin calc |
| createdAt | timestamp | |
| updatedAt | timestamp | |
| deletedAt | timestamp | |

### product_addons
Additional items/options for products

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| restaurantId | uuid | FK |
| productId | uuid | FK products |
| name | varchar | e.g. "Extra Bacon" |
| price | decimal(10,2) | additional cost |
| isRequired | boolean | |
| maxQuantity | int | |
| createdAt | timestamp | |
| updatedAt | timestamp | |

### orders

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| restaurantId | uuid | FK |
| orderNumber | int | auto-increment per restaurant |
| customerId | uuid | FK customers (nullable) |
| waiterId | uuid | FK users (nullable) |
| tableNumber | varchar | nullable |
| type | enum | DINE_IN, TAKEOUT, DELIVERY |
| status | enum | see order statuses below |
| subtotal | decimal(10,2) | |
| discount | decimal(10,2) | |
| deliveryFee | decimal(10,2) | |
| total | decimal(10,2) | |
| paymentMethod | enum | CASH, PIX, CREDIT_CARD, DEBIT_CARD |
| paymentStatus | enum | PENDING, PAID, REFUNDED |
| notes | text | |
| address | json | delivery address |
| couponId | uuid | FK coupons (nullable) |
| printedAt | timestamp | |
| printConfirmed | boolean | for print agent |
| createdAt | timestamp | |
| updatedAt | timestamp | |

### Order Statuses
```
NOVO_PEDIDO → AGUARDANDO_CONFIRMACAO → CONFIRMADO → EM_PREPARO → PRONTO → SAIU_PARA_ENTREGA → FINALIZADO
                                                                                    ↓
                                                                              CANCELADO (any stage)
```

### order_items

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| orderId | uuid | FK orders |
| productId | uuid | FK products |
| quantity | int | |
| unitPrice | decimal(10,2) | price at time of order |
| notes | text | item-level notes |
| createdAt | timestamp | |

### order_item_addons

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| orderItemId | uuid | FK order_items |
| addonId | uuid | FK product_addons |
| quantity | int | |
| unitPrice | decimal(10,2) | price at time of order |

### customers

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| restaurantId | uuid | FK |
| name | varchar | |
| phone | varchar | |
| email | varchar | nullable |
| address | json | |
| notes | text | |
| totalOrders | int | denormalized |
| totalSpent | decimal(10,2) | denormalized |
| createdAt | timestamp | |
| updatedAt | timestamp | |
| deletedAt | timestamp | |

### inventory_items

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| restaurantId | uuid | FK |
| name | varchar | |
| unit | varchar | kg, L, un, etc. |
| currentStock | decimal(10,3) | |
| minimumStock | decimal(10,3) | alert threshold |
| averageCost | decimal(10,2) | |
| createdAt | timestamp | |
| updatedAt | timestamp | |
| deletedAt | timestamp | |

### inventory_movements

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| restaurantId | uuid | FK |
| itemId | uuid | FK inventory_items |
| type | enum | IN, OUT, ADJUSTMENT |
| quantity | decimal(10,3) | |
| unitCost | decimal(10,2) | |
| reason | varchar | |
| orderId | uuid | FK orders (nullable — auto-deduction) |
| userId | uuid | FK users |
| createdAt | timestamp | |

### nps_responses

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| restaurantId | uuid | FK |
| orderId | uuid | FK orders |
| customerId | uuid | FK customers (nullable) |
| score | int | 0-10 |
| comment | text | |
| createdAt | timestamp | |

### coupons

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| restaurantId | uuid | FK |
| code | varchar | unique per restaurant |
| type | enum | PERCENTAGE, FIXED_AMOUNT |
| value | decimal(10,2) | |
| minOrderValue | decimal(10,2) | |
| maxUses | int | nullable = unlimited |
| usedCount | int | |
| isFirstOrderOnly | boolean | |
| expiresAt | timestamp | |
| isActive | boolean | |
| createdAt | timestamp | |
| updatedAt | timestamp | |

### delivery_zones

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| restaurantId | uuid | FK |
| name | varchar | e.g. "Centro" |
| fee | decimal(10,2) | |
| estimatedMinutes | int | |
| isActive | boolean | |
| createdAt | timestamp | |

### finance_entries

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| restaurantId | uuid | FK |
| type | enum | REVENUE, EXPENSE |
| category | varchar | |
| description | varchar | |
| amount | decimal(10,2) | |
| date | date | |
| paymentMethod | enum | |
| orderId | uuid | FK orders (nullable) |
| userId | uuid | FK users |
| createdAt | timestamp | |
| updatedAt | timestamp | |

### operating_hours

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| restaurantId | uuid | FK |
| dayOfWeek | int | 0=Sun, 6=Sat |
| openTime | varchar | HH:MM |
| closeTime | varchar | HH:MM |
| isClosed | boolean | |
