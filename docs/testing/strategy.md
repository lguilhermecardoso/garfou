# Estrategia de Testes

## Stack
- Vitest
- React Testing Library
- Playwright
- @vitest/coverage-v8

## Estado atual
- Suite de unidade e componentes ativa
- Infra E2E ativa com Playwright
- Cobertura global atual: 86.88% statements
- Cobertura de branches: 75.72%
- Cobertura de functions: 77.77%
- Cobertura de lines: 87.17%

## Cobertura por area
- Repositories: 100%
- Validations: 100%
- Rate limiting: 100%
- Componentes UI base: 100%
- Orders service: 76%
- Utils: 60%

## Suites existentes
- src/test/utils.test.ts
- src/lib/__tests__/rbac.test.ts
- src/lib/__tests__/rbac-hierarchy.test.ts
- src/lib/__tests__/rate-limit.test.ts
- src/lib/__tests__/rate-limit-extended.test.ts
- src/lib/__tests__/validations.test.ts
- src/features/orders/__tests__/order.service.test.ts
- src/repositories/__tests__/order.repository.test.ts
- src/repositories/__tests__/menu.repository.test.ts
- src/features/__tests__/service-integration.test.ts
- src/components/ui/__tests__/button.test.tsx
- src/components/ui/__tests__/input.test.tsx
- e2e/auth-onboarding.spec.ts

## Metas e prioridades seguintes
1. Aumentar cobertura de `order.service.ts` para >= 90%
2. Aumentar cobertura de `utils.ts` para >= 80%
3. Executar e estabilizar E2E do fluxo principal
4. Incluir E2E para fluxo cozinha e garcom
5. Incluir testes de contrato para endpoints criticos

## Comandos operacionais
```bash
npm test
npm run test:coverage
npm run test:e2e
```

## Regra operacional
- Toda regressao de producao deve virar teste automatizado.
