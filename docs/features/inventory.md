# Feature: Estoque (Inventory)

## Objetivo

Gerenciar itens, limites mínimos e movimentos de estoque com operações de entrada, saída e ajuste.

## Entidades

- `InventoryItem` - Item de estoque (produto, quantidade atual, estoque mínimo, unidade)
- `InventoryMovement` - Movimento de estoque (tipo, quantidade, motivo, usuário responsável)

## Tipos de Movimento

| Tipo         | Descrição                                       | Delta       |
| ------------ | ----------------------------------------------- | ----------- |
| `IN`         | Entrada de estoque (compra, devolução)          | Positivo    |
| `OUT`        | Saída de estoque (venda, perda, uso)            | Negativo    |
| `ADJUSTMENT` | Ajuste de estoque (correção, inventário físico) | Calculado\* |

\*Para ajustes, o delta é calculado automaticamente como: `newQuantity - currentQuantity`

## Componentes

### InventoryTable (`src/features/inventory/inventory-table.tsx`)

- `"use client"` — exibe tabela de itens com quantidade atual e estoque mínimo
- **Alerta de estoque baixo**: itens com `currentQuantity <= minStock` são destacados
- **Botão "Movimentar"** em cada linha → abre `StockOperationsModal`
- Props: `{ items: SerializedInventoryItem[], restaurantId: string }`

### StockOperationsModal (`src/features/inventory/stock-operations-modal.tsx`)

- `"use client"` — modal de operações de estoque
- Três tipos de operação selecionáveis: Entrada (IN), Saída (OUT), Ajuste (ADJUSTMENT)
- **Preview em tempo real**: mostra novo estoque após operação
- **Validações**:
  - Saída não pode deixar estoque negativo
  - Quantidade deve ser positiva (exceto ajustes)
  - Motivo é obrigatório para todas as operações
- Estilos de botão hardcoded (Tailwind v4 não suporta classes dinâmicas)
- Props: `{ isOpen: boolean, onClose(): void, item: { id, name, currentQuantity, unit }, restaurantId: string, onSuccess?(): void }`

## Telas

- Lista de itens: `/dashboard/[restaurantId]/inventory`
- Cadastro de item: `/dashboard/[restaurantId]/inventory/new`

## API

| Method | Route                                                     | Description                      |
| ------ | --------------------------------------------------------- | -------------------------------- |
| GET    | `/api/restaurants/[restaurantId]/inventory`               | Listar todos os itens de estoque |
| POST   | `/api/restaurants/[restaurantId]/inventory`               | Criar novo item                  |
| POST   | `/api/restaurants/[restaurantId]/inventory/[itemId]/move` | Registrar movimento de estoque   |

### POST /move Request Body

```typescript
{
  type: "IN" | "OUT" | "ADJUSTMENT",
  quantity: number,        // Para IN/OUT: quantidade a adicionar/remover
                           // Para ADJUSTMENT: nova quantidade total desejada
  reason: string,          // Motivo da operação (obrigatório)
  userId: string           // ID do usuário que realizou a operação
}
```

## Segurança

- Requer role `MANAGER` ou superior
- OWNER tem acesso irrestrito (bypass de permissões)

## Regras de Negócio

1. Estoque nunca pode ficar negativo após uma operação
2. Itens com `currentQuantity <= minStock` disparam alertas visuais
3. Todos os movimentos são registrados com timestamp e usuário responsável
4. Ajustes calculam automaticamente o delta necessário para atingir a quantidade desejada
5. Após cada operação, a página atualiza automaticamente usando `router.refresh()`
