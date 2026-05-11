# Reports

## Objetivo
Consolidar indicadores operacionais e financeiros por restaurante para apoiar decisao diaria.

## Rotas e telas
- Dashboard: `/dashboard/[restaurantId]/reports`

## Fontes de dados
- Pedidos (`orders`): volume, ticket medio, status.
- Financeiro (`financeEntries`): receitas, despesas e saldo.
- NPS (`npsResponse`): media e distribuicao de notas.

## Regras principais
- Escopo sempre filtrado por `restaurantId`.
- Acesso apenas para perfis com permissao de gestao (manager+).
- Periodos devem ser consistentes entre modulos (dia, semana, mes).

## Evolucoes sugeridas
- Exportacao CSV/PDF.
- Comparativo entre periodos.
- Alertas de anomalia (queda brusca de receita, aumento de cancelamentos).
