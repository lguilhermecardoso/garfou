# GARFOU TODO (Living Checklist)

---

## 🍳 KDS — Kitchen Display System

- [x] KDS base — polling 3s, status cards, audio alert para novos pedidos
- [x] KDS - SLA visual timer com urgência (OK / ALERTA / CRÍTICO / ATRASADO) — 2026-05-14
- [x] KDS - Badge de tipo de pedido (🚚 Delivery / 🍽 Mesa / 🛍 Retirada) — 2026-05-14
- [x] KDS - Ordenar cards por urgência (mais atrasados primeiro) — 2026-05-14
- [ ] KDS - Filtro por setor (Quente / Frio / Bebidas) — requer categoria por produto
- [ ] KDS - Tempo de preparo configurável por restaurante (campo `kitchenTargetMinutes` no schema)
- [ ] KDS - Integrar `estimatedMinutes` da zona de entrega ao SLA dos pedidos delivery
- [ ] KDS - Renderizar `modifier_options` e `splits` no card (além dos `addons` legados)
- [ ] KDS - Fullscreen lock (botão para entrar em modo kiosk no browser)

---

## 🚚 Entrega (Delivery)

- [x] CRUD de zonas de entrega — API + componente (`delivery-zones-client.tsx`)
- [x] Página `/delivery` no dashboard — CRUD de zonas visível ao MANAGER — 2026-05-14
- [ ] Vincular `deliveryZoneId` ao pedido na criação (snapshotal do `estimatedMinutes`)
- [ ] Mostrar zona e tempo estimado no KDS para pedidos delivery
- [ ] Validar endereço de entrega contra zonas ativas antes de confirmar pedido
- [ ] Mapa visual de cobertura de entrega (Google Maps / Leaflet)

---

## 📊 Relatórios & Dashboard

- [x] KPIs do mês (faturamento, ticket médio, NPS, novos clientes)
- [x] Gráfico de faturamento diário (AreaChart recharts) com período 7d/30d/3m
- [x] Gráfico de volume de pedidos (BarChart recharts)
- [x] CSV export para pedidos e financeiro
- [ ] Gráfico de vendas por hora do dia (heatmap) — horários de pico
- [ ] Comparativo semana atual vs. semana anterior no dashboard
- [ ] Relatório de produtos mais cancelados
- [ ] Exportar relatórios para PDF (jsPDF ou `@react-pdf/renderer`)
- [ ] Alertas de anomalia (ex: queda de 30%+ no faturamento vs. média)

---

## 🔔 Notificações

- [x] Bell no header com polling 5s e histórico de 10 notificações
- [ ] Notificação desktop via `Notification API` do browser (pedir permissão na KDS)
- [ ] Badge de contagem persistente no favicon (canvas badge)
- [ ] Persistir notificações no banco (`Notification` model) com lidas/não-lidas

---

## 🍽 Cardápio & Pedidos

- [x] Menu digital público com cart e checkout
- [x] Customização de produtos (modifier groups, split de sabores)
- [x] QR Code por mesa com URL `?table=X`
- [ ] Tempo estimado de preparo por produto (exibir no cardápio digital)
- [ ] Auto-cancelar pedidos NOVO_PEDIDO sem resposta em X minutos (configurable)
- [ ] Suporte a combos / produtos compostos
- [x] Filtrar produtos pausados (`isPaused`) no cardápio digital público — 2026-06-11
- [ ] Promoções por horário (happy hour)

---

## 👨‍🍳 App Garçom

- [x] Browse de produtos, cart, envio de pedido
- [ ] Transferir mesa (mover comanda de uma mesa para outra)
- [ ] Fechar comanda com split de pagamento entre clientes
- [ ] Histórico de pedidos da comanda atual
- [ ] App garçom offline-first com sync quando voltar online

---

## ⏰ Horário de Funcionamento

- [x] CRUD de `OperatingHours` por dia da semana na settings
- [ ] Enforçar abertura/fechamento automático (cron-like via middleware ou API route)
- [ ] Mostrar "Fechado agora" no cardápio digital fora do horário

---

## 💳 Pagamentos & Assinaturas

- [x] Base Stripe — criação de sessão de checkout
- [ ] Webhook Stripe completo — ativar/suspender restaurante conforme status
- [ ] Portal do cliente Stripe (gerenciar assinatura)
- [ ] Trial de 14 dias com aviso de expiração

---

## 🖨 Impressão

- [x] Impressão browser via iframe (Bematech 58mm)
- [ ] Print Agent daemon (Node/Electron local) para impressão silenciosa ESC/POS
- [ ] Fila de reimpressão com ack e retries

---

## 🧪 Testes

- [ ] Stabilize Playwright E2E: signup → onboarding → order → kitchen → finalizado
- [ ] E2E: fluxos de garçom e cozinha
- [ ] Cobertura de menu customization e split ordering
- [ ] Cobertura order service de 76% → ≥ 90%
- [ ] Cobertura utils de 60% → ≥ 80%
- [ ] Unit tests para `OrderPrintReceipt` (wrap de linha, nomes longos)

---

## Planned (original)

- [ ] Implement local Print Agent service (Node daemon) with polling + print queue + ack
- [ ] Add print retries and persistent local print logs design/implementation
- [ ] Stabilize Playwright critical E2E flow: signup -> onboarding -> order -> kitchen -> finalized
- [ ] Expand E2E to waiter and kitchen core workflows
- [ ] Add automated coverage for menu customization and split-product ordering flows
- [ ] Increase order service coverage from 76% to >= 90%
- [ ] Increase utils coverage from 60% to >= 80%
- [ ] Complete operating-hours automatic open/close behavior end-to-end
- [ ] Strengthen Stripe lifecycle handling and guardrails
- [ ] Add `OrderPrintReceipt` unit tests (line wrapping, edge cases for long product names)
- [ ] Add `OrderDetailModal` E2E test (confirm flow, print trigger)

## In Progress

- [ ] Keep specs updated after each implementation cycle

## Done

- [x] Enforce Conventional Commits via git hooks (commit-msg)
- [x] Consolidate project status against master prompt
- [x] Setup complete seed with restaurant, menu, orders, users, finance, inventory, NPS
- [x] Fix login flow and post-login routing
- [x] Home route now detects session and offers system access button
- [x] Add db:seed script and Prisma seed runtime compatibility with adapter-pg
- [x] Keep architecture status document updated with current baseline
- [x] Fix MissingCSRF login error (skipCSRFCheck from @auth/core in src/lib/auth.ts)
- [x] Fix TypeError on orders page (\_count.items → items.length)
- [x] Implement Bematech MP-4200 58mm thermal receipt (order-print-receipt.tsx) - 48-col receipt builder, printOrder() iframe helper, OrderPrintReceipt screen preview
- [x] Implement OrderDetailModal (order-detail-modal.tsx) - Accessible dialog, full receipt preview, Confirmar/Recusar PATCH actions, auto-print on confirm
- [x] Wire OrderDetailModal into OrdersLiveTable (Eye button on all rows)
- [x] Implement DashboardPendingOrders live widget (dashboard-pending-orders.tsx) - Replaces static "Pedidos recentes" card, polls every 8s, eye + confirm quick-actions
- [x] Update dashboard page to use DashboardPendingOrders widget
- [x] Implement menu item customization and split-product flow across manager, public menu, order API, and receipt rendering
- [x] Implement inventory stock movements history (UI + API) with pagination
- [x] Implement QR Code per table — generates scannable URL for digital menu with pre-filled table number
- [x] Transform WhatsApp page into utility tool (wa.me builder + message templates)
- [x] Add WhatsApp quick-send button in OrderDetailModal (when customer phone available)
- [x] Add recharts daily revenue + orders volume charts to Reports with 7d/30d/3m period selector
- [x] Add CSV export API for orders and finance entries + export buttons in Reports

## Rules to keep this file useful

- Move tasks between sections on every implementation cycle.
- Never mark done without at least one validation artifact (tests/build/manual check).
- Keep tasks action-oriented and implementation-scoped.
