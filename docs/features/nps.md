# Feature: NPS

## Status

Funcional base

## Escopo atual

- Formulario publico por slug
- Registro de nota e comentario
- Endpoint de submissao com rate limiting

## Rotas relacionadas

- GET /nps/[slug]
- POST /api/restaurants/[restaurantId]/nps

## Regras de negocio

- Fluxo sem autenticacao
- Protecao por limite de requisicoes
- Dados vinculados ao tenant correto

## Lacunas

1. Automacao de envio via WhatsApp
2. Reengajamento de detratores
3. Segmentacao analitica por periodo
