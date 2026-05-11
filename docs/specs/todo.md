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

## Rules to keep this file useful

- Move tasks between sections on every implementation cycle.
- Never mark done without at least one validation artifact (tests/build/manual check).
- Keep tasks action-oriented and implementation-scoped.
