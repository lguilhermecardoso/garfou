# GARFOU — Comandas (Tabs), Mesas e PDV (Frente de Caixa)

## Status

**EM IMPLEMENTAÇÃO** — 2026-05-12

---

## Contexto

O app do garçom precisa gerenciar **comandas** (tabs/contas) que agregam múltiplos pedidos de uma
**mesa** ou de um **cliente avulso** (consumo local sem mesa fixa). O **PDV** (ponto de venda /
frente de caixa) é responsável por listar comandas abertas, mostrar totais e **fechar comandas**
registrando o pagamento.

Esta feature transforma o modelo de pedidos isolados em um modelo de **sessões de consumo**
agregadas por comanda.

---

## Regras de Negócio

### 1. Mesas (Tables)

- Restaurante **cadastra mesas** com identificador (número ou nome único)
- Mesa pode estar em 3 estados:
  - `AVAILABLE` — livre para uso
  - `OCCUPIED` — tem comanda aberta
  - `RESERVED` — reservada (futura feature de reservas)
- Quando uma **comanda é aberta** para uma mesa, ela vai para `OCCUPIED`
- Quando a **comanda é fechada/paga**, a mesa volta para `AVAILABLE`
- Mesas **não são obrigatórias** — restaurante pode trabalhar só com clientes avulsos

### 2. Clientes Avulsos (Walk-in Customers)

- Para **consumo local sem mesa fixa** (ex: balcão, praça de alimentação)
- Cliente identificado por **nome** (telefone/CPF opcional)
- Garçom pode abrir comanda "em nome de" um cliente avulso sem vincular mesa
- Mesmo cliente pode ter múltiplas comandas abertas simultaneamente (casos raros, mas possíveis)

### 3. Comandas (Tabs)

Uma **comanda** é uma sessão de consumo que:

- Pertence a **uma mesa** OU a **um cliente avulso** (exclusivo, nunca ambos)
- Agrega **múltiplos pedidos** (orders)
- Acumula o **valor total** de todos os pedidos confirmados/finalizados
- Tem um **status**:
  - `OPEN` — comanda aberta, aceitando novos pedidos
  - `CLOSED` — comanda fechada, mas ainda não paga
  - `PAID` — comanda paga e finalizada
  - `CANCELLED` — comanda cancelada (todos pedidos cancelados)

#### Criação de Comanda

- **App do Garçom**:
  - Garçom escolhe: "Abrir comanda em Mesa X" OU "Abrir comanda para Cliente Y"
  - Sistema cria comanda com status `OPEN`
  - Se foi mesa, mesa vai para `OCCUPIED`
  - Garçom pode adicionar pedidos imediatamente após abrir

#### Pedidos na Comanda

- Cada pedido (`Order`) referencia a comanda (`tabId`)
- Pedidos podem ser:
  - `DINE_IN` (consumo local na mesa)
  - `TAKEOUT` (para viagem, mas vinculado à comanda aberta)
  - `DELIVERY` (improvável, mas tecnicamente possível se cliente pedir delivery durante consumo local)
- **Apenas pedidos com status >= `CONFIRMADO`** entram no cálculo do total da comanda
- Pedidos `CANCELADO` não somam no total

#### Fechamento de Comanda (PDV)

- **PDV** lista comandas abertas (`OPEN`)
- Operador visualiza total acumulado
- Operador escolhe **método de pagamento** e **fecha a comanda**
- Sistema:
  1. Muda comanda para `CLOSED` (ou diretamente para `PAID` se pagamento confirmado)
  2. Registra `paymentMethod` e `paidAt`
  3. Se comanda era de mesa, mesa volta para `AVAILABLE`
  4. Opcional: gera comprovante/nota fiscal (futura feature)

### 4. PDV (Ponto de Venda / Frente de Caixa)

#### Funcionalidades

- **Listar comandas abertas** (`OPEN` ou `CLOSED` não pagas)
- **Ver detalhes da comanda**:
  - Mesa ou cliente avulso
  - Lista de pedidos
  - Total acumulado (soma de todos pedidos confirmados/finalizados)
- **Fechar/pagar comanda**:
  - Selecionar método de pagamento: `CASH`, `CREDIT_CARD`, `DEBIT_CARD`, `PIX`, `VOUCHER`
  - Opcionalmente aplicar desconto final
  - Registrar pagamento e finalizar comanda
- **Reabrir comanda** (caso erro operacional)
- **Imprimir comprovante da comanda** (similar ao recibo de pedido)

#### Permissões

- Roles com acesso ao PDV: `OWNER`, `MANAGER`, `CASHIER`
- `WAITER` pode visualizar total da comanda, mas **não pode fechar** (apenas cashier/manager/owner)

---

## Modelo de Dados (Prisma Schema)

### Table (Mesa)

```prisma
enum TableStatus {
  AVAILABLE
  OCCUPIED
  RESERVED
}

model Table {
  id           String      @id @default(cuid())
  restaurantId String
  identifier   String      // "1", "2", "Mesa VIP", "Balcão 3", etc.
  capacity     Int?        // número de lugares (opcional)
  status       TableStatus @default(AVAILABLE)
  isActive     Boolean     @default(true)

  restaurant Restaurant @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  tabs       Tab[]

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  @@unique([restaurantId, identifier])
  @@index([restaurantId, status, isActive])
  @@map("tables")
}
```

### Tab (Comanda)

```prisma
enum TabStatus {
  OPEN
  CLOSED
  PAID
  CANCELLED
}

model Tab {
  id           String    @id @default(cuid())
  restaurantId String
  tableId      String?
  customerId   String?
  openedBy     String    // userId (waiter)
  closedBy     String?   // userId (cashier/manager)

  status       TabStatus      @default(OPEN)
  total        Decimal        @db.Decimal(10, 2) @default(0)
  discount     Decimal        @db.Decimal(10, 2) @default(0)
  finalTotal   Decimal        @db.Decimal(10, 2) @default(0)

  paymentMethod PaymentMethod?
  paidAt        DateTime?
  notes         String?

  restaurant Restaurant  @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  table      Table?      @relation(fields: [tableId], references: [id])
  customer   Customer?   @relation(fields: [customerId], references: [id])
  openedByUser User      @relation("TabsOpened", fields: [openedBy], references: [id])
  closedByUser User?     @relation("TabsClosed", fields: [closedBy], references: [id])
  orders     Order[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  closedAt  DateTime?

  @@index([restaurantId, status, createdAt(sort: Desc)])
  @@index([restaurantId, tableId, status])
  @@index([restaurantId, customerId, status])
  @@map("tabs")
}
```

### Order (ajuste)

```prisma
model Order {
  // ... campos existentes
  tabId String? // ← ADICIONAR

  tab Tab? @relation(fields: [tabId], references: [id])
  // ... outras relações
}
```

### Customer (ajuste mínimo)

```prisma
model Customer {
  // ... campos existentes
  tabs Tab[] // ← ADICIONAR
}
```

### User (ajuste para relações)

```prisma
model User {
  // ... campos existentes
  tabsOpened  Tab[] @relation("TabsOpened")
  tabsClosed  Tab[] @relation("TabsClosed")
}
```

---

## Fluxos de Uso

### Fluxo 1: Garçom abre comanda em mesa

1. Garçom acessa app do garçom (`/dashboard/:restaurantId/waiter`)
2. Clica em "Abrir Comanda"
3. Escolhe mesa disponível da lista (ex: "Mesa 5")
4. Sistema cria `Tab` com `tableId`, `openedBy`, `status: OPEN`
5. Mesa vai para `OCCUPIED`
6. Garçom pode adicionar pedidos imediatamente (selecionando produtos, customizando, enviando)

### Fluxo 2: Garçom abre comanda para cliente avulso

1. Garçom acessa app do garçom
2. Clica em "Abrir Comanda"
3. Escolhe "Cliente Avulso"
4. Informa nome do cliente (ex: "João Silva")
5. Sistema cria ou reutiliza `Customer` + cria `Tab` com `customerId`, `openedBy`, `status: OPEN`
6. Garçom pode adicionar pedidos

### Fluxo 3: Adicionar pedidos a comanda existente

1. Garçom visualiza comandas abertas
2. Seleciona comanda (ex: "Mesa 5" ou "João Silva")
3. Adiciona produtos ao carrinho
4. Envia pedido — ordem é criada com `tabId` referenciando a comanda
5. Total da comanda é recalculado automaticamente (soma de pedidos confirmados/finalizados)

### Fluxo 4: PDV fecha comanda

1. Operador do PDV (`/dashboard/:restaurantId/pos`) vê lista de comandas abertas
2. Clica em comanda (ex: "Mesa 5 — R$ 285,00")
3. Visualiza pedidos e total
4. Clica em "Fechar Comanda"
5. Seleciona método de pagamento (ex: `CREDIT_CARD`)
6. Opcionalmente aplica desconto final
7. Confirma pagamento
8. Sistema:
   - Atualiza comanda: `status: PAID`, `paymentMethod`, `paidAt`, `closedBy`
   - Se mesa, atualiza mesa para `AVAILABLE`
   - Opcional: imprime comprovante

### Fluxo 5: Visualizar total da comanda (garçom)

1. Garçom acessa comanda ativa
2. Visualiza total acumulado em tempo real
3. Não pode fechar — apenas visualizar

---

## APIs (REST)

### Tables

- `GET /api/restaurants/:restaurantId/tables` — lista mesas
- `POST /api/restaurants/:restaurantId/tables` — criar mesa
- `PATCH /api/restaurants/:restaurantId/tables/:tableId` — editar mesa
- `DELETE /api/restaurants/:restaurantId/tables/:tableId` — soft delete

### Tabs

- `GET /api/restaurants/:restaurantId/tabs` — lista comandas (filtros: status, tableId, customerId)
- `POST /api/restaurants/:restaurantId/tabs` — abrir comanda (body: `{ tableId? | customerId?, notes? }`)
- `GET /api/restaurants/:restaurantId/tabs/:tabId` — detalhe da comanda (inclui orders)
- `PATCH /api/restaurants/:restaurantId/tabs/:tabId/close` — fechar/pagar comanda (body: `{ paymentMethod, discount?, notes? }`)
- `DELETE /api/restaurants/:restaurantId/tabs/:tabId` — cancelar comanda (cancela todos pedidos)

### Orders (ajuste)

- `POST /api/restaurants/:restaurantId/orders` — criar pedido (body adiciona `tabId?`)

---

## Componentes UI

### Waiter App (ajuste)

- **Tela inicial**: botão "Abrir Comanda" + lista de comandas abertas
- **Modal de Abrir Comanda**:
  - Radio: Mesa | Cliente Avulso
  - Se Mesa: dropdown de mesas `AVAILABLE`
  - Se Cliente: campo nome + telefone (opcional)
- **Lista de Comandas Abertas**:
  - Card por comanda: mesa/cliente, total acumulado, tempo aberto
  - Clicar em comanda → abre tela de pedidos para aquela comanda
- **Tela de Pedidos (dentro da comanda)**:
  - Header: "Mesa 5 — R$ 285,00"
  - Menu de produtos + carrinho + enviar pedido (igual fluxo atual, mas `tabId` é incluído)

### PDV (novo módulo)

Rota: `/dashboard/:restaurantId/pos`

- **Lista de Comandas Abertas**:
  - Tabela: Mesa/Cliente | Total | Tempo Aberto | Ação
  - Botão "Ver Detalhes" → modal de detalhes
- **Modal de Detalhes da Comanda**:
  - Cabeçalho: Mesa/Cliente, total
  - Lista de pedidos com status e valores
  - Seção de pagamento:
    - Select de método de pagamento
    - Input de desconto adicional (opcional)
    - Total final calculado
    - Botão "Confirmar Pagamento"
- **Confirmação de Pagamento**:
  - Sucesso: comanda vai para `PAID`, mesa liberada
  - Opcional: imprimir comprovante (similar a recibo de pedido)

### Settings (novo: cadastro de mesas)

Rota: `/dashboard/:restaurantId/settings/tables`

- **Lista de Mesas**:
  - Tabela: Identificador | Capacidade | Status | Ações
  - Botão "Nova Mesa"
- **Modal de Mesa**:
  - Input: identificador (ex: "5", "Mesa VIP")
  - Input: capacidade (número de lugares)
  - Checkbox: ativa/inativa
  - Botão "Salvar"

---

## Validações (Zod)

```typescript
// src/lib/validations/index.ts

export const createTableSchema = z.object({
  identifier: z.string().min(1, "Identificador obrigatório").max(50),
  capacity: z.number().int().positive().optional(),
  isActive: z.boolean().default(true),
});

export const updateTableSchema = createTableSchema.partial();

export const createTabSchema = z
  .object({
    tableId: z.string().cuid().optional(),
    customerId: z.string().cuid().optional(),
    notes: z.string().max(500).optional(),
  })
  .refine((data) => data.tableId || data.customerId, {
    message: "Comanda deve ter mesa OU cliente avulso",
  })
  .refine((data) => !(data.tableId && data.customerId), {
    message: "Comanda não pode ter mesa E cliente ao mesmo tempo",
  });

export const closeTabSchema = z.object({
  paymentMethod: z.enum(["CASH", "CREDIT_CARD", "DEBIT_CARD", "PIX", "VOUCHER"]),
  discount: z.number().nonnegative().default(0),
  notes: z.string().max(500).optional(),
});

// Ajustar createOrderSchema para incluir tabId
export const createOrderSchema = baseCreateOrderSchema.extend({
  tabId: z.string().cuid().optional(),
});
```

---

## Repositories

### TableRepository

```typescript
// src/repositories/table.repository.ts
export class TableRepository {
  async findMany(restaurantId: string, filters?: { status?: TableStatus });
  async findById(restaurantId: string, tableId: string);
  async findByIdentifier(restaurantId: string, identifier: string);
  async create(restaurantId: string, data: CreateTableInput);
  async update(restaurantId: string, tableId: string, data: UpdateTableInput);
  async updateStatus(restaurantId: string, tableId: string, status: TableStatus);
  async softDelete(restaurantId: string, tableId: string);
}
```

### TabRepository

```typescript
// src/repositories/tab.repository.ts
export class TabRepository {
  async findMany(
    restaurantId: string,
    filters?: { status?: TabStatus; tableId?: string; customerId?: string }
  );
  async findById(restaurantId: string, tabId: string); // inclui orders
  async create(restaurantId: string, data: CreateTabInput, openedBy: string);
  async updateTotal(restaurantId: string, tabId: string); // recalcula total dos orders
  async close(restaurantId: string, tabId: string, data: CloseTabInput, closedBy: string);
  async cancel(restaurantId: string, tabId: string);
}
```

---

## Lógica de Negócio (Services)

### TabService

```typescript
// src/features/tabs/tab.service.ts
export class TabService {
  async openTab(
    restaurantId: string,
    data: { tableId?: string; customerId?: string; notes?: string },
    userId: string
  ): Promise<Tab> {
    // 1. Validar que mesa está disponível (se tableId)
    // 2. Criar Tab com status OPEN
    // 3. Se tableId, atualizar mesa para OCCUPIED
    // 4. Retornar Tab
  }

  async addOrderToTab(restaurantId: string, tabId: string, orderId: string): Promise<void> {
    // 1. Vincular order.tabId
    // 2. Recalcular total da comanda
  }

  async closeTab(
    restaurantId: string,
    tabId: string,
    data: { paymentMethod: PaymentMethod; discount?: number; notes?: string },
    userId: string
  ): Promise<Tab> {
    // 1. Validar que comanda está OPEN
    // 2. Calcular finalTotal = total - discount
    // 3. Atualizar comanda: status PAID, paymentMethod, paidAt, closedBy, finalTotal
    // 4. Se tableId, atualizar mesa para AVAILABLE
    // 5. Opcional: criar FinanceEntry
    // 6. Retornar Tab
  }

  async recalculateTabTotal(restaurantId: string, tabId: string): Promise<Decimal> {
    // Soma total de orders da comanda com status >= CONFIRMADO e != CANCELADO
  }
}
```

---

## Impactos em Features Existentes

### Orders

- Adicionar campo `tabId` ao schema `Order`
- Adicionar `tabId` ao payload de criação de pedido
- Quando pedido muda de status para `CONFIRMADO` ou `FINALIZADO`, recalcular total da comanda

### Dashboard

- Novo card: "Comandas Abertas" (quantidade de comandas `OPEN`)

### Finance

- Quando comanda é fechada (`PAID`), criar entrada financeira com total da comanda (não mais por pedido individual)

---

## Seed / Demo Data

Adicionar ao seed:

- 5 mesas: Mesa 1, Mesa 2, Mesa 3, Mesa VIP, Balcão
- 2 comandas abertas:
  - Mesa 2 com 2 pedidos (total ~R$ 120)
  - Cliente "Maria Santos" com 1 pedido (total ~R$ 45)

---

## Testes

### Unit

- `TabService.openTab()` — valida mesa disponível, cria comanda, atualiza mesa
- `TabService.closeTab()` — valida status, calcula total, libera mesa, cria finance entry
- `TabService.recalculateTabTotal()` — soma apenas pedidos confirmados/finalizados

### Integration (API)

- `POST /api/restaurants/:id/tabs` — retorna 201 + Tab
- `PATCH /api/restaurants/:id/tabs/:tabId/close` — retorna 200 + Tab com status PAID
- `GET /api/restaurants/:id/tabs` — lista comandas abertas

### E2E (Playwright)

- Fluxo waiter: abrir comanda → adicionar pedidos → ver total
- Fluxo PDV: ver comandas → fechar comanda → mesa liberada

---

## Próximos Passos (Roadmap Futuro)

- **Dividir conta** — split payment entre múltiplos métodos ou pessoas
- **Gorjeta/Taxa de Serviço** — aplicar % sobre total da comanda
- **Reservas** — integrar com comandas (mesa reservada → abrir comanda no horário)
- **Relatórios PDV** — dashboard de vendas, comandas fechadas, ticket médio por mesa
- **Impressão de comanda** — imprimir resumo da comanda antes de fechar (conferência)

---

## Referências

- [Orders Feature](./orders.md)
- [Database Schema](../database/schema.md)
- [RBAC](../../src/lib/rbac.ts)
