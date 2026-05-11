# Feature: Financeiro

## Objetivo
Controle simples de receitas e despesas sem integracao bancaria.

## Entidade principal
- `FinanceEntry`

## Telas
- Lista e resumo mensal: `/dashboard/[restaurantId]/finance`
- Cadastro: `/dashboard/[restaurantId]/finance/new`

## API
- `GET|POST /api/restaurants/[restaurantId]/finance`

## Seguranca
- Requer role `CASHIER` ou superior.
