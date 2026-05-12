# Recent Implementations (2026-05-12)

> Quick reference for AI agents — last updated 2026-05-12 14:00 BRT

## ✅ Completed Features

### 1. Inventory Stock Operations (CRUD Completo)

**Status**: ✅ Production-ready  
**Files Modified**:

- `src/features/inventory/stock-operations-modal.tsx` (NEW)
- `src/features/inventory/inventory-table.tsx` (REFACTORED)
- `src/app/(dashboard)/dashboard/[restaurantId]/inventory/page.tsx` (REFACTORED)

**What Was Implemented**:

- ✅ Modal with 3 operation types:
  - **IN** (Entrada): Add stock
  - **OUT** (Saída): Remove stock
  - **ADJUSTMENT** (Ajuste): Set new total (auto-calculates delta)
- ✅ Real-time preview showing stock after operation
- ✅ Validation: no negative stock, positive quantities, mandatory reason
- ✅ Low stock alerts (amber highlight when `currentQuantity <= minStock`)
- ✅ Auto-refresh after operations
- ✅ Hardcoded button styles (Tailwind v4 compatibility fix)

**How It Works**:

1. User clicks "Movimentar" button on any inventory item
2. Modal opens with current stock and operation selector
3. User selects operation type (IN/OUT/ADJUSTMENT)
4. Enters quantity and reason
5. Preview shows new stock in real-time
6. On submit: POST to `/api/restaurants/[rid]/inventory/[itemId]/move`
7. Page auto-refreshes to show updated data

**API Endpoint**:

```typescript
POST /api/restaurants/[restaurantId]/inventory/[itemId]/move
Body: {
  type: "IN" | "OUT" | "ADJUSTMENT",
  quantity: number,  // For ADJUSTMENT: desired final quantity
  reason: string,
  userId: string
}
```

**Known Limitations**:

- Button colors are hardcoded (cannot use dynamic Tailwind classes in v4)
- No undo/rollback functionality
- Movements history is stored but not displayed in UI yet

---

### 2. Delivery Order Flow Buttons

**Status**: ✅ Production-ready  
**Files Modified**:

- `src/features/orders/orders-live-table.tsx` (UPDATED)
- `src/features/orders/order-detail-modal.tsx` (UPDATED)

**What Was Implemented**:

- ✅ 🚚 **"Saiu para Entrega" button** for PRONTO + DELIVERY orders
  - Blue button with truck icon
  - Transitions order to `SAIU_PARA_ENTREGA` status
  - Shows toast: "Saiu para entrega! #123 está a caminho"
- ✅ ✅ **"Finalizar" button** logic updated:
  - Shows for PRONTO orders (non-delivery types)
  - Shows for SAIU_PARA_ENTREGA orders (any type)
  - Transitions order to `FINALIZADO` status
- ✅ **Row highlighting** in live table:
  - Pending orders: amber (bg-amber-50)
  - Ready orders: emerald (bg-emerald-50)
  - Out for delivery: blue (bg-blue-50)

**How It Works**:

**For DELIVERY orders**:

```
Kitchen marks PRONTO → Staff clicks 🚚 → SAIU_PARA_ENTREGA → Staff clicks ✅ → FINALIZADO
```

**For DINE_IN/TAKEOUT orders**:

```
Kitchen marks PRONTO → Staff clicks ✅ → FINALIZADO
```

**UI Changes**:

1. **Live Table** (`orders-live-table.tsx`):
   - Added `isOutForDelivery` check
   - Added `isDelivery` check
   - Blue button with Truck icon for ready deliveries
   - Green finalize button conditionally shown

2. **Detail Modal** (`order-detail-modal.tsx`):
   - Same button logic as live table
   - Added "Saiu para Entrega" action type
   - Toast notifications for all transitions

**Customer-Facing**:

- Tracking page (`/track/[slug]`) already supports all statuses
- Auto-updates every 15 seconds
- Progress bar shows completion percentage
- Badge displays current status with proper styling

---

## 🔧 Technical Notes

### Tailwind v4 Dynamic Classes Issue

**Problem**: `border-${color}-500` syntax doesn't work in Tailwind v4  
**Solution**: Hardcode all color classes explicitly in the source code  
**Example**:

```tsx
// ❌ Doesn't work
<div className={`border-${color}-500`}>

// ✅ Works
{type === "in" && <div className="border-green-500">}
{type === "out" && <div className="border-red-500">}
```

### Order Status Transition Rules

Defined in `src/features/orders/order.service.ts`:

```typescript
PRONTO → ["SAIU_PARA_ENTREGA", "FINALIZADO", "CANCELADO"]
SAIU_PARA_ENTREGA → ["FINALIZADO", "CANCELADO"]
```

### Repository Pattern

All inventory operations use the repository pattern:

- `src/repositories/inventory.repository.ts` (if exists)
- Direct Prisma queries in API routes
- Server components fetch and serialize `Decimal` to `number` for client

---

## 📋 Testing Status

| Feature               | Unit Tests | Integration Tests | E2E Tests | Manual Testing |
| --------------------- | ---------- | ----------------- | --------- | -------------- |
| Stock Operations      | ⏸️ N/A     | ⏸️ N/A            | ⏸️ TODO   | ✅ PASSED      |
| Delivery Flow Buttons | ⏸️ N/A     | ⏸️ N/A            | ⏸️ TODO   | ✅ PASSED      |

**Manual Testing Verified**:

- ✅ Stock IN operation increases quantity
- ✅ Stock OUT operation decreases quantity
- ✅ Stock ADJUSTMENT calculates delta correctly
- ✅ Negative stock validation prevents invalid operations
- ✅ Auto-refresh works after stock operations
- ✅ Delivery orders show truck button when ready
- ✅ Finalize button shows/hides correctly based on order type
- ✅ Row highlighting works for all order statuses
- ✅ Toast notifications display for all actions
- ✅ No TypeScript errors in any modified files

---

## 🐛 Known Issues

**None at this time** — All implementations are production-ready.

---

## 📚 Related Documentation

- [Orders Feature Docs](../features/orders.md)
- [Inventory Feature Docs](../features/inventory.md)
- [AGENTS.md (Main Context)](../../AGENTS.md)
- [Progress Log](./progress-log.md)
- [Database Schema](../database/schema.md)

---

## 🔄 Next Steps (Backlog)

### Inventory

- [ ] Display movement history in UI
- [ ] Export inventory report (CSV/PDF)
- [ ] Batch operations for multiple items
- [ ] Inventory alerts via email/SMS

### Orders

- [ ] WhatsApp notification when order SAIU_PARA_ENTREGA
- [ ] Estimated delivery time calculation
- [ ] Delivery zone management
- [ ] Driver assignment UI

### General

- [ ] E2E tests for new features
- [ ] Performance optimization (reduce polling frequency on idle)
- [ ] Offline support with service workers
