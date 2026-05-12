# GARFOU Master Spec

## Purpose

This document is the single source of truth for current scope, implementation stage, and governance rules so any AI or developer can continue without losing context.

## Product Goal

Build a Vercel-first SaaS platform for real restaurant operations with multitenancy, strong reliability, and mobile-first UX.

## Current Baseline (May 11, 2026)

- Foundation: stable
- Architecture: feature-based with service + repository layers
- Security: auth, RBAC, tenant isolation, and rate limiting implemented
- Test baseline: 115 tests passing
- Coverage baseline: 86.88% statements

## What Is Solid

- Next.js 16 + TypeScript + App Router
- Prisma 7 + PostgreSQL + adapter-pg for serverless compatibility
- Core modules running in MVP level (orders/menu/kitchen/waiter/finance/inventory)
- Menu customization flow implemented across manager + public digital menu
- Public and private flows split with role checks
- Documentation structure complete under docs/

## What Is Still Incomplete

- Print Agent local runtime (critical)
- WhatsApp operational flow automation
- Full E2E stabilization for critical paths
- Full Stripe lifecycle completeness (upgrade/downgrade/cancel UX + controls)
- Some modules still at MVP level instead of production-complete operations

## Development Governance

1. Every feature change must update at least one file in docs/specs/.
2. Every significant architectural/flow change must also update docs/architecture/project-status.md.
3. New completed item -> move from todo.md "Planned/In Progress" to "Done".
4. Every completed item must include verification notes (tests/build/manual checks).

## Verification Baseline

- Build: passing
- Lint: no blocking errors (warnings remain)
- Tests: passing
- Seed: available with full restaurant demo dataset

## Source Index

- Status: docs/architecture/project-status.md
- Roadmap and execution: docs/specs/todo.md
- Execution history: docs/specs/progress-log.md
- Testing baseline: docs/testing/strategy.md
