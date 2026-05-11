# Feature: Estoque

## Objetivo
Gerenciar itens, limites minimos e movimentos de estoque.

## Entidades
- `InventoryItem`
- `InventoryMovement`

## Telas
- Lista de itens: `/dashboard/[restaurantId]/inventory`
- Cadastro de item: `/dashboard/[restaurantId]/inventory/new`

## API
- `GET|POST /api/restaurants/[restaurantId]/inventory`
- `POST /api/restaurants/[restaurantId]/inventory/[itemId]/move`

## Seguranca
- Requer role `MANAGER` ou superior.
