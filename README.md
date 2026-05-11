# GARFOU

Plataforma SaaS multitenancy para restaurantes, focada em operacao real, mobile-first e deploy serverless na Vercel FREE.

## Stack

- Next.js App Router + TypeScript
- TailwindCSS + shadcn/ui + Lucide
- Prisma + PostgreSQL
- Auth.js v5
- TanStack Query (polling realtime)
- Stripe (billing)
- Vitest + React Testing Library + Playwright

## Estado atual rapido

- Arquitetura base consolidada
- Multitenancy e RBAC implementados
- Rate limiting em endpoints publicos
- 115 testes passando
- Cobertura global: 86.88% statements
- E2E preparado via Playwright

## Rodando local

1. Suba o banco PostgreSQL local

```bash
docker compose up -d
```

2. Instale dependencias

```bash
npm install
```

3. Configure ambiente

```bash
cp .env.example .env.local
```

4. Rode migrations

```bash
npx prisma migrate dev
```

5. Inicie a aplicacao

```bash
npm run dev
```

## Qualidade

```bash
npm run lint
npm run typecheck
npm test
npm run test:coverage
npm run test:e2e
npm run build
```

## Documentacao

- Arquitetura geral: docs/architecture/overview.md
- Status consolidado: docs/architecture/project-status.md
- Master spec viva: docs/specs/master-spec.md
- TODO vivo: docs/specs/todo.md
- Log de progresso: docs/specs/progress-log.md
- Seguranca: docs/architecture/security.md
- Realtime: docs/realtime/strategy.md
- Multi-tenancy: docs/multi-tenancy/strategy.md
- Endpoints: docs/api/endpoints.md
- Testes: docs/testing/strategy.md
- ADRs: docs/decisions/adr.md

## Observacoes de arquitetura

- 100% Vercel FREE friendly (sem websocket persistente)
- Realtime por polling inteligente (TanStack Query)
- Repository pattern para isolamento de tenant
- Soft delete e trilha de auditoria no dominio
