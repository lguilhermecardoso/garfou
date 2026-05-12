# GARFOU — Print Architecture

## Two Printing Modes

### 1. Browser Print (IMPLEMENTED)

Trigger: operator clicks "Confirmar e Imprimir" or "Imprimir" in `OrderDetailModal`.

Implementation in `src/features/orders/order-print-receipt.tsx`:

```
operator clicks button
    ↓
printOrder(order)  — creates hidden <iframe>
    ↓
writes HTML: @page { size: 58mm auto; margin: 2mm }
             font-family: Courier New; font-size: 8.5pt
    ↓
iframe.contentWindow.print()  — browser opens OS print dialog
    ↓
user selects thermal printer  — OR OS default printer used automatically
    ↓
iframe removed after 2s
```

**Target printer**: Bematech MP-4200 TH FI (58mm paper, 48 chars/line at default font).

**Receipt format** (`buildReceiptLines(order)`):

- 48 columns, monospaced
- `═` top/bottom border, `─` section dividers
- Header: restaurant name, pedido #, type/table, date/time, customer, delivery address
- Items: qty × name, unit price, notes, addons
- Totals: subtotal (if discount), discount, delivery fee, total, payment method
- Footer: observations, thank-you message

**Limitation**: browser always shows print dialog (cannot silent-print without user interaction).

---

### 2. Print Agent — Local Daemon (NOT YET IMPLEMENTED)

For silent auto-printing without user interaction. Needed for high-volume operation.

A local application (Electron or Node daemon) runs on the restaurant's computer.

#### Communication Flow

```
[SaaS (Vercel)] ←── polling ──── [Print Agent (local)]
                ────────────────→ return pending print jobs
[Print Agent]   ────────────────→ prints via ESC/POS (silent)
[Print Agent]   ────────────────→ POST /confirm-print
[SaaS]          marks order.printConfirmed = true
```

#### Print Agent Responsibilities

1. Poll `GET /api/restaurants/[id]/orders/print-queue` every 3–5 seconds
2. Parse response (pending orders)
3. Format ESC/POS commands
4. Send to local thermal printer
5. Handle print queue (retry on failure)
6. POST confirmation back to SaaS
7. Log all print events

#### API Contract

##### GET /api/restaurants/[restaurantId]/orders/print-queue

Auth: Print Agent API Key (stored in agent config)

Response:

```json
{
  "jobs": [
    {
      "orderId": "uuid",
      "orderNumber": 42,
      "type": "NEW_ORDER",
      "items": [...],
      "notes": "...",
      "createdAt": "ISO date"
    }
  ]
}
```

##### POST /api/restaurants/[restaurantId]/orders/[orderId]/confirm-print

```json
{
  "printerName": "BEMATECH MP-4200 TH FI",
  "printedAt": "ISO date"
}
```

#### Print Job Types

| Type        | Trigger         | Destination     |
| ----------- | --------------- | --------------- |
| `NEW_ORDER` | Order confirmed | Kitchen printer |
| `RECEIPT`   | Order finalized | Counter printer |
| `REPRINT`   | Manual request  | Depends on type |

#### ESC/POS Formatting

Each print job is formatted as:

- Restaurant name + logo (if supported)
- Order number (large, bold)
- Date and time
- Items with quantities
- Separator lines
- Notes
- Total (for receipts)
- QR code for NPS (optional)

#### Printer Detection

The agent automatically detects connected printers via OS APIs.
The restaurant configures which printer handles which job type in the dashboard.

## Database Fields

Orders have `printedAt` (`DateTime?`) and `printConfirmed` (`Boolean`, default `false`).
Browser printing does NOT set these fields (no confirmation round-trip).
Only the Print Agent daemon sets them via `POST /confirm-print`.

## Problem

Browsers cannot reliably auto-print to thermal printers without user interaction.

## Solution: Print Agent

A local application (Electron or Node daemon) runs on the restaurant's computer.

## Communication Flow

```
[SaaS (Vercel)] ←── polling ──── [Print Agent (local)]
                ────────────────→ return pending print jobs
[Print Agent]   ────────────────→ prints via ESC/POS
[Print Agent]   ────────────────→ POST /confirm-print
[SaaS]          marks order.printConfirmed = true
```

## Print Agent Responsibilities

1. Poll `GET /api/restaurants/[id]/orders/print-queue` every 3–5 seconds
2. Parse response (pending orders)
3. Format ESC/POS commands
4. Send to local thermal printer
5. Handle print queue (retry on failure)
6. POST confirmation back to SaaS
7. Log all print events

## API Contract

### GET /api/restaurants/[restaurantId]/orders/print-queue

Auth: Print Agent API Key (stored in agent config)

Response:

```json
{
  "jobs": [
    {
      "orderId": "uuid",
      "orderNumber": 42,
      "type": "NEW_ORDER",
      "items": [...],
      "notes": "...",
      "createdAt": "ISO date"
    }
  ]
}
```

### POST /api/restaurants/[restaurantId]/orders/[orderId]/confirm-print

```json
{
  "printerName": "EPSON TM-T20",
  "printedAt": "ISO date"
}
```

## Print Job Types

| Type        | Trigger         | Destination     |
| ----------- | --------------- | --------------- |
| `NEW_ORDER` | Order confirmed | Kitchen printer |
| `RECEIPT`   | Order finalized | Counter printer |
| `REPRINT`   | Manual request  | Depends on type |

## ESC/POS Formatting

Each print job is formatted as:

- Restaurant name + logo (if supported)
- Order number (large, bold)
- Date and time
- Items with quantities
- Separator lines
- Notes
- Total (for receipts)
- QR code for NPS (optional)

## Printer Detection

The agent automatically detects connected printers via OS APIs.
The restaurant configures which printer handles which job type in the dashboard.
