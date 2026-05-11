# Security Baseline

## Autenticacao
- Auth.js v5 com sessao JWT.
- Credentials + Google provider.
- Proxy protegendo rotas privadas.

## Autorizacao (RBAC)
- Verificacao por restaurante via `UserRestaurant`.
- Helper central: `requireRole(restaurantId, minRole)`.
- Hierarquia: `OWNER > MANAGER > CASHIER > WAITER > KITCHEN`.

## Multitenancy
- Todas as consultas internas filtram por `restaurantId`.
- APIs publicas limitadas ao escopo de restaurante no path.

## Rate limiting (best effort)
Implementado para reduzir abuso nas rotas publicas mais sensiveis:
- `POST /api/auth/register`: 10 req/min por IP
- `POST /api/restaurants/[restaurantId]/orders` (publico): 30 req/min por IP
- `POST /api/restaurants/[restaurantId]/nps`: 20 req/10min por IP

Observacao: em Vercel serverless o limitador em memoria e best effort por instancia. Para limite global distribuido, evoluir para Redis/Upstash.
