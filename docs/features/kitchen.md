# Feature: Tela de Cozinha

## Status

Funcional base

## Escopo atual

- Polling de pedidos ativos a cada 3 segundos
- Filtro por status CONFIRMADO e EM_PREPARO
- Atualizacao de status para EM_PREPARO e PRONTO
- Alerta sonoro para novos pedidos

## Rotas relacionadas

- GET /dashboard/[restaurantId]/kitchen
- GET /api/restaurants/[restaurantId]/orders?status=...
- PATCH /api/restaurants/[restaurantId]/orders/[orderId]

## Regras de negocio

- Fluxo realtime sem websocket persistente
- Otimismo de UI para troca de status
- Isolamento tenant em todas as consultas

## Lacunas

1. Filtro avancado por setor de preparo
2. Controle de prioridade e SLA por item
3. Modo fullscreen bloqueado para operacao
