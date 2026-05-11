# Feature: Cupons

## Status

Parcial funcional

## Escopo atual

- CRUD de cupons
- Validacao de schema com Zod
- Regras de codigo e validade basicas

## Rotas relacionadas

- GET|POST /api/restaurants/[restaurantId]/coupons
- PATCH|DELETE /api/restaurants/[restaurantId]/coupons/[couponId]

## Regras de negocio

- Tenant isolado por restaurantId
- Codigo em formato controlado
- Regras basicas de tipo e valor

## Lacunas

1. Regra de primeira compra ponta a ponta
2. Politica de acumulacao e prioridade
3. Auditoria detalhada de uso por cliente
