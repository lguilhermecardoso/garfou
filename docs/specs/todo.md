# GARFOU TODO (Living Checklist)

## Planned

- [ ] Implement local Print Agent service (Node daemon) with polling + print queue + ack
- [ ] Add print retries and persistent local print logs design/implementation
- [ ] Implement WhatsApp flow helpers (wa.me links by order status + NPS trigger path)
- [ ] Stabilize Playwright critical E2E flow: signup -> onboarding -> order -> kitchen -> finalized
- [ ] Expand E2E to waiter and kitchen core workflows
- [ ] Increase order service coverage from 76% to >= 90%
- [ ] Increase utils coverage from 60% to >= 80%
- [ ] Complete delivery rules (zones/radius/fee) end-to-end UX + API checks
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

## Rules to keep this file useful

- Move tasks between sections on every implementation cycle.
- Never mark done without at least one validation artifact (tests/build/manual check).
- Keep tasks action-oriented and implementation-scoped.
