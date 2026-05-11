# GARFOU — Realtime Architecture

## Constraint

Vercel FREE does not support persistent WebSocket connections.

## Strategy

**Smart Polling with TanStack Query**

| Module | Interval | Rationale |
|--------|----------|-----------|
| Kitchen screen | 3s | Critical — orders must appear fast |
| Waiter app | 5s | Near-realtime for table status |
| Dashboard | 30s | Metrics, not time-sensitive |
| Print Agent | 3s | Must catch orders quickly |

## Implementation

### TanStack Query Setup

```typescript
// refetchInterval drives the polling
useQuery({
  queryKey: ['orders', restaurantId, { status: 'active' }],
  queryFn: () => fetchActiveOrders(restaurantId),
  refetchInterval: 3000,
  staleTime: 2000,
})
```

### Optimistic Updates

Waiter app uses optimistic updates for:
- Changing order status
- Adding items to order

```typescript
useMutation({
  mutationFn: updateOrderStatus,
  onMutate: async (newStatus) => {
    await queryClient.cancelQueries(['orders'])
    const previous = queryClient.getQueryData(['orders'])
    queryClient.setQueryData(['orders'], (old) => optimisticUpdate(old, newStatus))
    return { previous }
  },
  onError: (err, vars, context) => {
    queryClient.setQueryData(['orders'], context.previous)
  },
  onSettled: () => {
    queryClient.invalidateQueries(['orders'])
  }
})
```

## Audio Alerts (Kitchen)

Kitchen screen plays a sound when new orders arrive.
Implemented using the Web Audio API — no external dependencies.

Detection: compare query data between poll cycles. If new orders appear → play sound.

## Focus/Visibility Handling

Polling pauses when tab is hidden (TanStack Query default behavior via `refetchOnWindowFocus`).
Kitchen/waiter screens should stay focused — implement a warning if tab loses focus.

## Connection Error Handling

TanStack Query retries failed requests with exponential backoff.
Show a "reconnecting" banner when polls fail 3+ times consecutively.
