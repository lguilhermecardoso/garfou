# AI Agent Onboarding Guide

> Quick start guide for AI agents working on the GARFOU codebase

---

## 🎯 START HERE

**First time working on this codebase?** Read these files in order:

1. **[AGENTS.md](../../AGENTS.md)** ← Single source of truth (5 min read)
2. **[Recent Implementations](./recent-implementations.md)** ← What was just built (3 min read)
3. **[Project Status](../architecture/project-status.md)** ← Overall status (2 min read)

---

## 📚 Essential Reading

### Before Writing Any Code

- [ ] Read [AGENTS.md](../../AGENTS.md) sections 1-3 (Stack, Environment, Folder Structure)
- [ ] Check [Project Status](../architecture/project-status.md) to avoid duplicate work
- [ ] Review [Progress Log](./progress-log.md) to understand recent changes

### When Working on Features

- **Orders**: Read [docs/features/orders.md](../features/orders.md)
- **Inventory**: Read [docs/features/inventory.md](../features/inventory.md)
- **Menu**: Read [AGENTS.md](../../AGENTS.md) section 5.2
- **Auth**: Read [docs/architecture/security.md](../architecture/security.md)

### When Debugging

- [ ] Check [get_errors tool output](#) first
- [ ] Review [Progress Log](./progress-log.md) for known issues
- [ ] Check terminal output for Prisma/Next.js warnings

---

## ⚠️ Critical Rules (NEVER BREAK THESE)

### 1. Multi-tenancy

```typescript
// ❌ WRONG - Missing restaurantId
await prisma.order.findMany();

// ✅ CORRECT - Always filter by restaurantId
await prisma.order.findMany({
  where: { restaurantId },
});
```

### 2. Tailwind v4 Classes

```tsx
// ❌ WRONG - Dynamic classes don't work
<div className={`border-${color}-500`}>

// ✅ CORRECT - Hardcode conditionally
{type === "in" && <div className="border-green-500">}
{type === "out" && <div className="border-red-500">}
```

### 3. Prisma Client

```typescript
// ❌ WRONG - Don't instantiate directly
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// ✅ CORRECT - Use singleton
import { prisma } from "@/lib/db";
```

### 4. Decimal Serialization

```typescript
// ❌ WRONG - Prisma Decimal causes Next.js error
return { price: item.price }; // Decimal type

// ✅ CORRECT - Convert to number
return { price: Number(item.price) };
```

### 5. Auth Middleware

```typescript
// ❌ WRONG - Using auth.ts in edge runtime
import { auth } from "@/lib/auth";

// ✅ CORRECT - Use auth.config.ts in middleware
import { auth } from "@/lib/auth.config";
```

---

## 🛠️ Common Tasks

### Adding a New Feature

1. **Check existing patterns**:

   ```bash
   # Search for similar features
   grep -r "feature-name" src/
   ```

2. **Follow the structure**:

   ```
   src/features/[feature-name]/
   ├── [feature]-client.tsx     # Client component
   ├── [feature]-server.ts      # Server actions
   └── [feature]-types.ts       # TypeScript types
   ```

3. **Create API route**:

   ```
   src/app/api/restaurants/[restaurantId]/[feature]/route.ts
   ```

4. **Add to documentation**:
   - Update `docs/features/[feature].md`
   - Update `AGENTS.md` with key info
   - Add entry to `progress-log.md`

### Debugging an Error

1. **Get error details**:

   ```typescript
   // Use get_errors tool
   get_errors({ filePaths: ["path/to/file.tsx"] });
   ```

2. **Check terminal output**:
   - Look for Prisma query logs
   - Check for Next.js warnings
   - Verify API response codes

3. **Common fixes**:
   - TypeScript: Missing type imports
   - Prisma: Missing `restaurantId` filter
   - Next.js: Client/Server component mismatch
   - Tailwind: Dynamic class strings

### Adding Documentation

1. **Feature docs**: `docs/features/[name].md`
   - Purpose, components, API, rules

2. **Agent context**: `AGENTS.md`
   - Quick reference, key patterns only

3. **Progress log**: `docs/specs/progress-log.md`
   - Date, what was done, what was tested

4. **Changelog**: `CHANGELOG.md`
   - User-facing changes only

---

## 📋 Checklist Before Committing

- [ ] Run `get_errors` on modified files
- [ ] Test feature manually in browser
- [ ] Update relevant documentation
- [ ] Add entry to progress log
- [ ] Check for console errors
- [ ] Verify auto-refresh works (if applicable)
- [ ] Commit with conventional format: `feat: description`

---

## 🔍 Quick Reference

### Project Structure

```
/src
  /app                  # Next.js App Router
    /(auth)            # Auth pages (signin, signup)
    /(dashboard)       # Protected dashboard
    /(public)          # Landing, menu, tracking
    /api               # API routes
  /components
    /ui                # Base components (button, input, etc)
    /shared            # Reusable composed components
  /features            # Feature modules (orders, inventory, etc)
  /lib                 # Utilities, auth, db, rbac
  /repositories        # Data access layer
```

### Key Files

- `src/lib/db.ts` - Prisma singleton
- `src/lib/auth.ts` - NextAuth config (Node runtime)
- `src/lib/auth.config.ts` - NextAuth config (Edge runtime)
- `src/lib/rbac.ts` - Role-based access control
- `src/proxy.ts` - Next.js middleware

### Environment

```bash
DATABASE_URL="postgresql://garfou:garfou_dev@localhost:5433/garfou?schema=public"
AUTH_URL="http://localhost:3000"
AUTH_SECRET="garfou-dev-auth-secret-change-in-production"
```

### Common Commands

```bash
npm run dev              # Start dev server (port 3000)
npm run db:seed          # Seed database
npx prisma studio        # Open Prisma Studio
npx prisma migrate dev   # Run migrations
npm test                 # Run tests
npm run build            # Production build
```

### Test Credentials

```
owner@garfou.demo    / Owner123!    (OWNER)
manager@garfou.demo  / Manager123!  (MANAGER)
waiter@garfou.demo   / Waiter123!   (WAITER)
kitchen@garfou.demo  / Kitchen123!  (KITCHEN)
cashier@garfou.demo  / Cashier123!  (CASHIER)
```

### API Patterns

```typescript
// GET with auth + tenancy
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { restaurantId } = await params;

  // Always filter by restaurantId
  const data = await prisma.model.findMany({
    where: { restaurantId },
  });

  return NextResponse.json(data);
}
```

---

## 🆘 When Stuck

1. **Search existing code**:

   ```bash
   grep -r "pattern-you-need" src/
   ```

2. **Check similar features**:
   - Orders module is the most complete reference
   - Inventory module shows CRUD patterns
   - Menu module shows complex customization

3. **Read the docs**:
   - `AGENTS.md` - Quick patterns
   - `docs/features/` - Feature details
   - `docs/architecture/` - System design

4. **Check recent work**:
   - `docs/specs/progress-log.md` - What was just done
   - `docs/specs/recent-implementations.md` - Latest features

---

## 📞 Questions?

**Before asking**:

1. Did you read [AGENTS.md](../../AGENTS.md)?
2. Did you check [Recent Implementations](./recent-implementations.md)?
3. Did you search the codebase?
4. Did you check the docs?

**If still stuck**:

- Describe what you tried
- Show relevant code snippets
- Include error messages
- Reference docs you've read

---

## ✅ Success Criteria

You're ready to contribute when you can answer:

- [ ] What is the multi-tenancy strategy?
- [ ] How do you access Prisma client?
- [ ] Why can't you use dynamic Tailwind classes?
- [ ] What's the difference between auth.ts and auth.config.ts?
- [ ] How do you serialize Prisma Decimals for client components?
- [ ] What's the order status flow for delivery orders?
- [ ] How do stock operations work?

---

**Remember**: Read first, code second. This codebase has specific patterns and constraints. Following them saves time and prevents bugs.

**Happy coding!** 🚀
