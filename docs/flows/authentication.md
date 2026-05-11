# Fluxo de Autenticacao

## Objetivo
Controlar acesso ao dashboard e rotas internas do SaaS multitenant.

## Componentes
- `src/lib/auth.ts`: config principal do Auth.js com Prisma Adapter e Credentials.
- `src/lib/auth.config.ts`: config edge-safe usada no proxy.
- `src/proxy.ts`: gate global por sessao para rotas protegidas.
- `src/app/api/auth/register/route.ts`: cadastro inicial de usuario.

## Fluxo de Login
1. Usuario acessa `/auth/signin`.
2. Formulario envia `credentials` para Auth.js (`signIn("credentials")`).
3. `authorize` valida email/senha com `bcryptjs`.
4. Sessao JWT e criada.
5. Usuario e redirecionado para callback URL.

## Fluxo de Cadastro
1. Usuario envia nome/email/senha para `/api/auth/register`.
2. Backend valida com Zod (`signUpSchema`).
3. Senha e hasheada e usuario e criado.
4. Frontend autentica com credentials e vai para onboarding.

## Regras
- Rotas publicas: `/`, `/auth/*`, `/menu/*`, `/nps/*`, `/manifest.json`, `/sw.js`.
- Rotas privadas: dashboard e APIs internas.
- Autorizacao por role e aplicada nos route handlers via `requireRole`.
