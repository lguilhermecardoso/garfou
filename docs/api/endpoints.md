# API Endpoints

## Auth
- `POST /api/auth/register`
- `GET|POST /api/auth/[...nextauth]`

## Restaurants (tenant root)
- `GET|POST /api/restaurants`

## Tenant APIs
- Pedidos:
  - `GET|POST /api/restaurants/[restaurantId]/orders`
  - `GET|PATCH /api/restaurants/[restaurantId]/orders/[orderId]`
  - `GET /api/restaurants/[restaurantId]/orders/print-queue`
  - `POST /api/restaurants/[restaurantId]/orders/[orderId]/confirm-print`
- Cardapio:
  - `GET /api/restaurants/[restaurantId]/menu`
  - `GET|POST /api/restaurants/[restaurantId]/categories`
  - `PATCH|DELETE /api/restaurants/[restaurantId]/categories/[categoryId]`
  - `GET|POST /api/restaurants/[restaurantId]/products`
  - `GET|PATCH|DELETE /api/restaurants/[restaurantId]/products/[productId]`
- Financeiro:
  - `GET|POST /api/restaurants/[restaurantId]/finance`
- Estoque:
  - `GET|POST /api/restaurants/[restaurantId]/inventory`
  - `POST /api/restaurants/[restaurantId]/inventory/[itemId]/move`
- CRM:
  - `GET|POST /api/restaurants/[restaurantId]/customers`
- Cupons:
  - `GET|POST /api/restaurants/[restaurantId]/coupons`
  - `PATCH|DELETE /api/restaurants/[restaurantId]/coupons/[couponId]`
- NPS:
  - `POST /api/restaurants/[restaurantId]/nps`
- Configuracoes:
  - `GET|PATCH /api/restaurants/[restaurantId]/settings`

## Billing
- `POST /api/webhooks/stripe`
