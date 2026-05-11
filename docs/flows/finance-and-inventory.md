# Fluxo Financeiro e Estoque

## Financeiro
- Listagem: `GET /api/restaurants/[restaurantId]/finance`
- Criacao: `POST /api/restaurants/[restaurantId]/finance`
- UI:
  - Lista: `/dashboard/[restaurantId]/finance`
  - Novo lancamento: `/dashboard/[restaurantId]/finance/new`

### Regras
- Role minima: `CASHIER`
- Validacao com `createFinanceEntrySchema`
- Sumario calculado por mes: receita, despesa e saldo

## Estoque
- Listagem: `GET /api/restaurants/[restaurantId]/inventory`
- Criacao de item: `POST /api/restaurants/[restaurantId]/inventory`
- Movimento de estoque: `POST /api/restaurants/[restaurantId]/inventory/[itemId]/move`
- UI:
  - Lista: `/dashboard/[restaurantId]/inventory`
  - Novo item: `/dashboard/[restaurantId]/inventory/new`

### Regras
- Role minima: `MANAGER`
- Estoque baixo quando `currentStock <= minimumStock`
