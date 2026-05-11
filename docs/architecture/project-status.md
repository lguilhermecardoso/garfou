# GARFOU - Status de Aderencia ao Prompt Mestre

## Objetivo deste documento
Consolidar o estado real do projeto para continuidade por agentes de IA sem retrabalho.

## Resumo executivo
- Base arquitetural pronta e coerente com Vercel FREE
- Multitenancy, RBAC e rate limiting implementados
- Modulos principais em estagio misto (alguns operacionais, outros parciais)
- Testes automatizados ativos com cobertura global acima da meta
- Ainda existem lacunas de feature-complete para operacao de restaurante real

## Matriz de aderencia

| Area | Status | Evidencias |
|------|--------|------------|
| Next.js + TS + App Router | Concluido | src/app, package.json |
| Tailwind + shadcn/ui + lucide | Concluido | src/components/ui, dependencias |
| Prisma + PostgreSQL | Concluido | prisma/schema.prisma, docs/database/schema.md |
| Vercel FREE friendly | Concluido | docs/deploy/vercel.md, polling em realtime |
| Realtime sem websocket persistente | Concluido | docs/realtime/strategy.md, kitchen polling 3s |
| Multitenancy (single DB + isolamento) | Concluido | docs/multi-tenancy/strategy.md, repositories com restaurantId |
| RBAC + seguranca baseline | Concluido | src/lib/rbac.ts, docs/architecture/security.md |
| Rate limit endpoints publicos | Concluido | src/lib/rate-limit.ts, rotas register/orders/nps |
| Testes unitarios/integracao base | Concluido | 115 testes passando |
| Cobertura minima 80% | Concluido | 86.88% statements |
| E2E Playwright | Parcial | infra criada, estabilizacao de cenarios pendente |
| Print Agent local (daemon/electron) | Nao iniciado | apenas arquitetura documentada |
| Fluxo WhatsApp completo | Nao iniciado | sem envio automatizado, apenas diretriz |
| Operacao completa de entrega (bairro/raio/taxa) | Parcial | estrutura existe, regras completas pendentes |
| Horario de funcionamento automatico | Parcial | suporte parcial no dominio |
| Stripe assinatura fim a fim | Parcial | base de stripe existente, ciclo completo pendente |
| Storybook ou rota dev/components | Concluido | src/app/dev/components/page.tsx |

## Estado dos modulos de negocio

| Modulo | Estado atual |
|--------|--------------|
| Pedidos | Funcional com ciclo principal e controles de status |
| Cardapio digital | Funcional (publico + interno) |
| App do garcom | Funcional base (pedido rapido) |
| Tela de cozinha | Funcional base com polling e atualizacao de status |
| Financeiro | Funcional base |
| Estoque | Funcional base |
| CRM | Parcial |
| Relatorios | Parcial |
| Cupons | Parcial |
| NPS | Funcional base |
| Impressao termica local | Arquitetura pronta, implementacao pendente |

## Linha de base de qualidade
- Testes: 115 passando
- Build: compilando sem regressao
- Cobertura statements: 86.88%
- Cobertura branches: 75.72%
- Cobertura functions: 77.77%
- Cobertura lines: 87.17%

## Riscos atuais
1. Ausencia de Print Agent real impede automacao de impressao em ambiente de pico.
2. E2E ainda nao estabilizado para fluxo completo de operacao.
3. Alguns modulos estao em nivel MVP e nao em nivel operacao completa.

## Proximas entregas recomendadas
1. Implementar Print Agent local (Node daemon) com fila e confirmacao de impressao.
2. Finalizar fluxos E2E criticos: signup -> onboarding -> pedido -> cozinha -> finalizacao.
3. Elevar cobertura de branches/functions em order service e utils.
4. Fechar lacunas de entrega, cupons e horario automatico com regras completas.

## Diagrama de status
```mermaid
flowchart LR
  A[Fundacao Arquitetural] --> B[Testes e Qualidade]
  B --> C[Modulos MVP]
  C --> D[Operacao Completa]
  A:::done
  B:::done
  C:::partial
  D:::pending

  classDef done fill:#d1fae5,stroke:#047857,color:#064e3b;
  classDef partial fill:#fef3c7,stroke:#b45309,color:#78350f;
  classDef pending fill:#fee2e2,stroke:#b91c1c,color:#7f1d1d;
```
