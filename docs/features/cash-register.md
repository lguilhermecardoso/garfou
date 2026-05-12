# Cash Register System

Sistema completo de gerenciamento de caixa integrado ao PDV.

## Status

✅ Implementado e testado (2026-05-12)

## Funcionalidades

### 1. Abertura de Caixa

- Registra valor inicial em dinheiro
- Identifica usuário que abriu
- Status visual (badge verde "ABERTO")
- Permite observações

### 2. Fechamento de Caixa

- Declara valores por forma de pagamento:
  - Dinheiro
  - Débito
  - Crédito
  - PIX
- Calcula valores esperados automaticamente
- Detecta diferenças (quebra de caixa)
- Registra observações do fechamento

### 3. Sangria (Retirada)

- Remove dinheiro do caixa
- Requer descrição do motivo
- Atualiza totais automaticamente

### 4. Suprimento (Entrada)

- Adiciona dinheiro ao caixa
- Requer descrição do motivo (ex: reforço de troco)
- Atualiza totais automaticamente

### 5. Integração Automática com PDV

- **Fechamento de comanda**: Ao fechar uma comanda no PDV, a venda é automaticamente registrada no caixa aberto (se houver)
- **Registro por forma de pagamento**: Cada venda é categorizada corretamente (dinheiro, débito, crédito, PIX)
- **Rastreabilidade**: Cada transação guarda referência ao usuário e pedido

### 6. Feedback Visual

- Badge de status (ABERTO/FECHADO) sempre visível
- Totais por forma de pagamento em cards coloridos
- Valores esperados vs declarados no fechamento
- Alertas de diferença (quebra de caixa)
- Toasts de sucesso/erro em todas operações

## Arquitetura

### Database (Prisma)

**Models:**

- `CashRegister`: Registro de abertura/fechamento de caixa
  - Status: OPEN | CLOSED
  - Valores iniciais, declarados, esperados e diferenças
  - Timestamps de abertura/fechamento
  - Relações com usuários (quem abriu/fechou)

- `CashTransaction`: Transações individuais
  - Tipo: SALE | WITHDRAWAL | SUPPLY
  - Valor e forma de pagamento
  - Descrição e timestamps
  - Relações com caixa, usuário e pedido

**Schema Path:** `prisma/schema.prisma` (linhas 740-791)

### Repository Layer

**Path:** `src/repositories/cash-register.repository.ts`

**Métodos principais:**

- `findOpenRegister(restaurantId)`: Busca caixa aberto
- `openRegister(input)`: Abre novo caixa
- `closeRegister(input)`: Fecha caixa com cálculos automáticos
- `createTransaction(input)`: Registra venda/sangria/suprimento
- `calculateExpectedTotals(registerId)`: Calcula valores esperados
- `findHistory(restaurantId, options)`: Histórico paginado

**Lógica de Cálculo:**

- SALE: +valor
- SUPPLY: +valor
- WITHDRAWAL: -valor
- Totais por forma de pagamento
- Diferenças = declarado - esperado

### API Routes

**Base:** `/api/restaurants/[restaurantId]/cash-register`

| Endpoint      | Method | Função                          |
| ------------- | ------ | ------------------------------- |
| `/`           | GET    | Busca status atual ou histórico |
| `/open`       | POST   | Abre novo caixa                 |
| `/close`      | POST   | Fecha caixa aberto              |
| `/withdrawal` | POST   | Registra sangria                |
| `/supply`     | POST   | Registra suprimento             |

**Validação:** Zod schemas para todos endpoints POST
**Autorização:** OWNER, MANAGER, CASHIER apenas

### Frontend Components

**Path:** `src/features/cash-register/cash-register-panel.tsx`

**Componente Principal:** `CashRegisterPanel`

- React Query para polling a cada 30s
- Modais para cada operação (abrir/fechar/sangria/suprimento)
- Formulários controlados com validação
- Toast notifications para feedback

**Integração:**

- POS: `src/features/pos/pos-dashboard.tsx` (topo da página)
- Dashboard: (TODO - adicionar widget resumido)

### Integração Automática

**Path:** `src/app/api/restaurants/[restaurantId]/tabs/[tabId]/close/route.ts`

Quando uma comanda é fechada:

1. Busca caixa aberto atual
2. Se houver, cria transação tipo SALE
3. Registra forma de pagamento e valor
4. Adiciona descrição com número da comanda/mesa
5. Em caso de erro no caixa, não falha o fechamento da comanda

## Permissões (RBAC)

| Operação     | OWNER | MANAGER | CASHIER | Outros |
| ------------ | ----- | ------- | ------- | ------ |
| Abrir caixa  | ✅    | ✅      | ✅      | ❌     |
| Fechar caixa | ✅    | ✅      | ✅      | ❌     |
| Sangria      | ✅    | ✅      | ✅      | ❌     |
| Suprimento   | ✅    | ✅      | ✅      | ❌     |
| Visualizar   | ✅    | ✅      | ✅      | ❌     |

**Nota importante:** OWNER tem acesso total e irrestrito a todas operações, independente de verificações de permissão. Isso garante que o proprietário do restaurante sempre possa acessar e gerenciar o caixa, mesmo que o sistema exija role CASHIER.

## Seed Data

**Path:** `prisma/seed.js` (linhas 602-631)

**Demo data:**

- 1 caixa aberto com R$200 inicial
- 9 transações:
  - 7 vendas (mix de formas de pagamento)
  - 1 sangria (R$100 - depósito bancário)
  - 1 suprimento (R$50 - reforço de troco)

## Testing

### Manual Test Flow

1. Login como cashier@garfou.demo / Cashier123!
2. Acesse PDV
3. Verifique caixa aberto no topo
4. Teste sangria (ex: R$50, "Teste sangria")
5. Teste suprimento (ex: R$30, "Teste suprimento")
6. Feche uma comanda aberta → venda deve aparecer automaticamente no caixa
7. Feche o caixa declarando valores
8. Verifique diferenças calculadas

### E2E Tests (TODO)

- Fluxo completo de abertura → vendas → fechamento
- Cálculo de diferenças (quebra)
- Integração com fechamento de comandas
- Validações de formulário
- Permissões RBAC

## Known Limitations

1. **Single Open Register**: Apenas 1 caixa aberto por vez por restaurante
2. **Cash Only for Withdrawals/Supplies**: Sangria e suprimento são sempre em dinheiro
3. **No Print Integration**: Não há impressão de relatório de fechamento (apenas modal visual)
4. **No History View**: Interface de histórico não implementada (API pronta)
5. **No Analytics**: Sem gráficos ou análise de desempenho de caixa

## Future Enhancements

1. **Cash Register History Page**: Interface para consultar histórico com filtros
2. **Print Receipt on Close**: Comprovante impresso de fechamento
3. **Daily Report**: Relatório consolidado do dia
4. **Multiple Registers**: Suporte a múltiplos caixas simultâneos (diferentes operadores)
5. **Dashboard Widget**: Card resumido no dashboard principal
6. **Audit Trail**: Log detalhado de todas operações
7. **Export**: Exportar fechamentos para Excel/PDF
8. **Notifications**: Alertas de diferenças significativas (>5%)
9. **Integration with Finance**: Lançamentos automáticos no módulo financeiro

## Related Documentation

- [POS/Tabs System](./tabs.md)
- [RBAC](../architecture/security.md)
- [Database Schema](../database/schema.md)
- [Repository Pattern](../architecture/patterns.md)
