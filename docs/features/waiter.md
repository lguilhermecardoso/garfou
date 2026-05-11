# Feature: App do Garcom

## Status

Parcial funcional

## Escopo atual

- Visualizacao de produtos por categoria
- Busca rapida
- Carrinho por mesa
- Envio de pedido para cozinha

## Rotas relacionadas

- GET /dashboard/[restaurantId]/waiter
- POST /api/restaurants/[restaurantId]/orders

## Regras de negocio

- Fluxo mobile-first
- Atualizacao orientada por polling
- Tenant isolado por restaurantId

## Lacunas

1. Abrir e transferir mesa com fluxo dedicado
2. Fechamento de conta completo
3. Comanda com historico por mesa
