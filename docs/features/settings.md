# Settings

## Objetivo
Centralizar configuracoes do restaurante para operacao diaria e integracoes.

## Rotas e telas
- Dashboard: `/dashboard/[restaurantId]/settings`
- API: `GET/PUT /api/restaurants/[restaurantId]/settings`

## Escopo de configuracao
- Identidade: nome, slug, contato.
- Operacao: horario, taxa de servico, comportamento de pedido.
- Integracoes: chaves publicas/secretas (quando aplicavel).

## Regras principais
- Isolamento por `restaurantId` em todas as leituras/escritas.
- Alteracoes auditaveis quando impactarem cobranca e operacao.
- Dados sensiveis nunca retornam completos no payload de leitura.

## Seguranca
- Endpoint protegido por autenticacao e RBAC.
- Validacao de entrada com schema tipado.
- Rate limit adicional pode ser aplicado em operacoes administrativas criticas.
