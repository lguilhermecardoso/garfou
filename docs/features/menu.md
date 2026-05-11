# Feature: Cardapio Digital

## Status

Parcial funcional

## Escopo atual

- Landing publica por slug
- Listagem de categorias e produtos
- Busca por nome
- Carrinho local
- Envio de pedido sem login
- Ocultacao de produto interno no menu publico

## Rotas relacionadas

- GET /menu/[slug]
- GET /api/restaurants/[restaurantId]/menu

## Regras de negocio

- Publico nao visualiza produto interno
- Menu respeita status de abertura do restaurante
- Tenant isolado por restaurantId

## Lacunas

1. Combos com composicao completa
2. Politica de promocao por horario
3. Melhor fluxo de indisponibilidade por item
