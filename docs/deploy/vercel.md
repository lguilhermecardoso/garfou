# Deploy Vercel

## Requisitos
- Projeto alinhado a Vercel Free (sem websocket persistente)
- Realtime por polling com TanStack Query
- Runtime serverless-friendly

## Variaveis de ambiente
- `DATABASE_URL`
- `DIRECT_URL` (opcional para migrate)
- `AUTH_SECRET`
- `AUTH_URL`
- Stripe keys (`STRIPE_*`)
- `PRINT_AGENT_API_KEY`

## Build
- Comando: `npm run build`
- Status atual: build validado localmente com `.env.local`

## Banco
- Prisma 7 com adapter pg (`@prisma/adapter-pg` + `pg`)
- `prisma.config.ts` ativo
