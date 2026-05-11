# Fluxo de Pedidos

## Estados
`NOVO_PEDIDO -> AGUARDANDO_CONFIRMACAO -> CONFIRMADO -> EM_PREPARO -> PRONTO -> SAIU_PARA_ENTREGA -> FINALIZADO`

Cancelamento permitido nas transicoes configuradas na service.

## Entradas
- App garcom (`/dashboard/[restaurantId]/waiter`)
- Cardapio digital publico (`/menu/[slug]` -> POST `/api/restaurants/[restaurantId]/orders`)

## Regras Principais
- Produtos devem existir e estar ativos.
- Preco e adicional sao congelados no `OrderItem` no momento da criacao.
- Cupom opcional com validacao de status/expiracao/uso maximo.
- Role minima para leitura interna de pedidos: `KITCHEN`.
- Criacao de pedido:
  - com sessao: requer role `WAITER` no restaurante
  - sem sessao: permitido para cardapio publico

## Impressao
- Polling do print agent via `/orders/print-queue`
- Confirmacao via `/orders/[orderId]/confirm-print`
