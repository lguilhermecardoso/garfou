# Deploy — Vercel + Supabase

Guia completo para subir o projeto em produção.

---

## 1. Banco de dados — Supabase

### 1.1 Obter a connection string do pooler

No painel do Supabase, acesse **Project Settings → Database → Connection string**.

Copie a URI do modo **Transaction** (porta `6543`) — ela se parece com:

```
postgresql://postgres.xxxx:SENHA@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
```

> Use esta URL (não a direta na porta 5432) para evitar esgotamento de conexões em ambiente serverless.

### 1.2 Rodar as migrations

Com a connection string em mãos, execute localmente:

```bash
DATABASE_URL="postgresql://postgres.xxxx:SENHA@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true" \
npx prisma migrate deploy
```

Isso aplica todas as migrations da pasta `prisma/migrations/` no banco do Supabase.

### 1.3 Rodar o seed (opcional)

Para popular o banco com dados de demonstração:

```bash
DATABASE_URL="postgresql://postgres.xxxx:SENHA@..." \
npm run db:seed
```

> O seed cria o restaurante **Garfou Prime Bistrô** com usuários, pedidos, produtos e dados de exemplo. Use apenas em ambientes não-produtivos.

---

## 2. Deploy na Vercel

### 2.1 Pré-requisitos

- Conta na [Vercel](https://vercel.com)
- Repositório no GitHub (o projeto deve estar commitado)
- Banco do Supabase com migrations aplicadas (passo 1)

### 2.2 Importar o projeto

1. Acesse [vercel.com/new](https://vercel.com/new)
2. Conecte sua conta GitHub e selecione o repositório `garfou`
3. Framework será detectado automaticamente como **Next.js**
4. **Não altere** o Build Command (`next build`) nem o Output Directory

### 2.3 Configurar variáveis de ambiente

Na tela de configuração do projeto (ou em **Settings → Environment Variables** depois do deploy), adicione as seguintes variáveis:

| Variável                             | Valor                                                                  |
| ------------------------------------ | ---------------------------------------------------------------------- |
| `DATABASE_URL`                       | URL completa do pooler Supabase (porta 6543) com `?pgbouncer=true`     |
| `AUTH_SECRET`                        | String longa e aleatória (gere com `openssl rand -base64 32`)          |
| `AUTH_URL`                           | URL pública do projeto na Vercel, ex: `https://seu-projeto.vercel.app` |
| `NEXT_PUBLIC_APP_URL`                | Mesma URL acima                                                        |
| `STRIPE_SECRET_KEY`                  | Chave secreta do Stripe (produção: `sk_live_...`)                      |
| `STRIPE_WEBHOOK_SECRET`              | Secret do webhook do Stripe                                            |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Chave pública do Stripe                                                |
| `STRIPE_STARTER_PRICE_ID`            | ID do price do plano Starter                                           |
| `STRIPE_PRO_PRICE_ID`                | ID do price do plano Pro                                               |
| `STRIPE_ENTERPRISE_PRICE_ID`         | ID do price do plano Enterprise                                        |
| `PRINT_AGENT_API_KEY`                | Chave de autenticação do agente de impressão                           |

> **Atenção:** não use interpolação `${VARIAVEL}` nos valores — a Vercel não faz essa substituição. Coloque sempre o valor final completo.

### 2.4 Fazer o deploy

Clique em **Deploy**. A Vercel irá:

1. Instalar dependências (`npm install`)
2. Gerar o Prisma Client (`prisma generate`)
3. Buildar o projeto (`next build`)
4. Publicar em CDN global

O primeiro deploy leva ~2 minutos.

### 2.5 Configurar o webhook do Stripe

Após o deploy, acesse o painel do Stripe em **Developers → Webhooks** e crie um novo endpoint apontando para:

```
https://seu-projeto.vercel.app/api/webhooks/stripe
```

Eventos necessários:

- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

Copie o **Signing secret** gerado e atualize `STRIPE_WEBHOOK_SECRET` nas env vars da Vercel.

---

## 3. Pós-deploy

### Verificar a saúde da aplicação

```bash
curl https://seu-projeto.vercel.app/api/health
```

### Domínio customizado

Em **Settings → Domains** na Vercel, adicione seu domínio e siga as instruções de DNS.

Após adicionar o domínio, atualize `AUTH_URL` e `NEXT_PUBLIC_APP_URL` com a URL definitiva e faça um redeploy.

---

## 4. Referências rápidas

| Recurso                     | Local                           |
| --------------------------- | ------------------------------- |
| Migrações                   | `prisma/migrations/`            |
| Schema do banco             | `prisma/schema.prisma`          |
| Variáveis de ambiente       | `.env.local` (exemplo local)    |
| Configuração Next.js        | `next.config.ts`                |
| Documentação de arquitetura | `docs/architecture/overview.md` |
