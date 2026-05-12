# Matriz de Permissões do Sistema

Sistema completo de controle de acesso baseado em roles (RBAC - Role-Based Access Control).

## Status

✅ Implementado (2026-05-12)

## Arquitetura

### Hierarquia de Roles

```
OWNER (5)       ← Acesso total irrestrito
  ↓
MANAGER (4)     ← Gestão completa
  ↓
CASHIER (3)     ← Operações financeiras e vendas
  ↓
WAITER (2)      ← Atendimento e mesas
  ↓
KITCHEN (1)     ← Produção
```

### Privilégio Especial: OWNER

**OWNER sempre tem acesso total**, independente de qualquer verificação de permissão. Isso garante que o proprietário do restaurante possa:

- Acessar qualquer funcionalidade
- Ver todos os dados
- Gerenciar qualquer operação
- Nunca ser bloqueado por permissões

## Matriz de Acesso ao Menu

| Funcionalidade | OWNER | MANAGER | CASHIER | WAITER | KITCHEN |
| -------------- | ----- | ------- | ------- | ------ | ------- |
| Dashboard      | ✅    | ✅      | ✅      | ✅     | ✅      |
| Pedidos        | ✅    | ✅      | ✅      | ✅     | ✅      |
| Cozinha        | ✅    | ✅      | ❌      | ❌     | ✅      |
| Garçom         | ✅    | ✅      | ❌      | ✅     | ❌      |
| PDV            | ✅    | ✅      | ✅      | ❌     | ❌      |
| Mesas          | ✅    | ✅      | ❌      | ✅     | ❌      |
| Cardápio       | ✅    | ✅      | ❌      | ❌     | ❌      |
| Estoque        | ✅    | ✅      | ❌      | ❌     | ❌      |
| Financeiro     | ✅    | ✅      | ✅      | ❌     | ❌      |
| Clientes       | ✅    | ✅      | ✅      | ✅\*   | ❌      |
| Relatórios     | ✅    | ✅      | ✅\*    | ❌     | ❌      |
| Cupons         | ✅    | ✅      | ✅      | ❌     | ❌      |
| Entrega        | ✅    | ✅      | ❌      | ✅     | ❌      |
| WhatsApp       | ✅    | ✅      | ❌      | ❌     | ❌      |
| NPS            | ✅    | ✅      | ❌      | ❌     | ❌      |
| Configurações  | ✅    | ✅\*    | ❌      | ❌     | ❌      |

**Legenda:**

- ✅ = Acesso completo
- ✅\* = Acesso limitado (vê menos informações ou tem restrições)
- ❌ = Sem acesso

## Descrição por Role

### OWNER (Proprietário)

**Acesso**: Total e irrestrito

**Responsabilidades**:

- Gestão estratégica do restaurante
- Configurações críticas (billing, subscription)
- Análise financeira completa
- Gestão de equipe e permissões
- Todas as operações do dia a dia

**Menu completo**: Todas as 16 funcionalidades

---

### MANAGER (Gerente)

**Acesso**: Quase total, exceto billing crítico

**Responsabilidades**:

- Gestão operacional do restaurante
- Supervisão de equipe
- Controle de estoque e cardápio
- Relatórios e análises
- Configurações operacionais

**Menu (15 itens)**:

- Dashboard
- Pedidos
- Cozinha
- Garçom
- PDV
- Mesas
- Cardápio
- Estoque
- Financeiro
- Clientes
- Relatórios
- Cupons
- Entrega
- WhatsApp
- NPS
- Configurações (limitadas)

**Restrições**:

- Não pode alterar subscription/billing
- Não pode remover OWNER

---

### CASHIER (Caixa)

**Acesso**: Operações financeiras e vendas

**Responsabilidades**:

- Operação do PDV
- Fechamento de comandas
- Gestão de caixa (abrir/fechar/sangria/suprimento)
- Controle de cupons
- Relatórios de vendas

**Menu (8 itens)**:

- Dashboard
- Pedidos
- PDV
- Financeiro
- Clientes (visão de vendas)
- Relatórios (foco em vendas)
- Cupons

**Restrições**:

- Não acessa cozinha ou garçom
- Relatórios limitados a vendas e caixa
- Não modifica cardápio ou estoque

---

### WAITER (Garçom)

**Acesso**: Atendimento e mesas

**Responsabilidades**:

- Atendimento de mesas
- Criação de pedidos
- Abertura/fechamento de comandas
- Gestão de delivery
- Cadastro básico de clientes

**Menu (6 itens)**:

- Dashboard
- Pedidos
- Garçom
- Mesas
- Clientes (cadastro e consulta)
- Entrega

**Restrições**:

- Não vê preços de custo
- Não acessa financeiro
- Não modifica cardápio
- Não vê relatórios gerenciais

---

### KITCHEN (Cozinha)

**Acesso**: Apenas produção

**Responsabilidades**:

- Visualização de pedidos
- Atualização de status de preparo
- Marcação de itens prontos

**Menu (3 itens)**:

- Dashboard (simplificado)
- Pedidos (apenas visualização)
- Cozinha

**Restrições**:

- Não vê valores financeiros
- Não acessa clientes
- Não modifica nada fora da cozinha
- Interface focada apenas em produção

## Implementação Técnica

### Camadas de Segurança

#### 1. Menu (Frontend)

**Arquivo**: `src/lib/menu-permissions.ts`

```typescript
export function filterMenuByRole(menuItems: MenuItem[], userRole: UserRole): MenuItem[];
```

- Filtra itens do menu baseado na role
- OWNER sempre vê tudo
- Outros roles vêem apenas itens permitidos

#### 2. Layout

**Arquivo**: `src/app/(dashboard)/dashboard/[restaurantId]/layout.tsx`

- Busca role do usuário via `getRestaurantMembership()`
- Passa role para `DashboardSidebar`
- Redireciona se usuário não tem acesso ao restaurante

#### 3. Componente Sidebar

**Arquivo**: `src/components/shared/dashboard-sidebar.tsx`

- Recebe `userRole` como prop
- Renderiza apenas itens permitidos
- Menu dinâmico por role

#### 4. API Routes (Backend)

**Arquivo**: `src/lib/rbac.ts`

```typescript
export async function requireRole(restaurantId: string, minRole: UserRole = "WAITER");
```

- Valida acesso a cada endpoint
- OWNER sempre passa (bypass)
- Outros roles validados por hierarquia
- Retorna 401/403 se não autorizado

### Fluxo de Validação

```
1. Usuário acessa /dashboard/:restaurantId
   ↓
2. Layout busca membership do usuário
   ↓
3. Verifica se tem acesso ao restaurante
   ↓
4. Identifica role (OWNER, MANAGER, etc)
   ↓
5. Sidebar filtra menu baseado na role
   ↓
6. Usuário vê apenas itens permitidos
   ↓
7. Ao clicar, API valida novamente via requireRole()
```

## Casos de Uso

### Exemplo 1: Garçom tentando acessar PDV

1. Garçom loga como `waiter@garfou.demo`
2. Menu lateral **não mostra** item "PDV"
3. Se tentar acessar URL direta `/dashboard/:id/pos`:
   - API retorna 403 "Permissão insuficiente"
   - Frontend redireciona ou mostra erro

### Exemplo 2: OWNER testando tudo

1. Owner loga como `owner@garfou.demo`
2. Menu lateral mostra **todos** os 16 itens
3. Acessa qualquer funcionalidade sem restrição
4. API sempre permite (bypass especial)

### Exemplo 3: Caixa acessando Financeiro

1. Cashier loga como `cashier@garfou.demo`
2. Menu lateral mostra "Financeiro"
3. Acessa com sucesso
4. API valida: `requireRole(restaurantId, "CASHIER")` → ✅ passa

## Boas Práticas

### ✅ DO (Faça)

- **Sempre** use `requireRole()` em API routes
- Valide role no backend, nunca confie apenas no frontend
- Use OWNER para testes completos
- Documente quando adicionar novas funcionalidades

### ❌ DON'T (Não faça)

- Não esconda funcionalidades apenas no menu (valide na API)
- Não crie lógica de permissão duplicada
- Não permita bypass de OWNER ser removido
- Não assuma que todos usuários têm mesmas permissões

## Extensão do Sistema

### Adicionar nova funcionalidade ao menu:

1. **Definir roles permitidas**

   ```typescript
   {
     href: "/new-feature",
     label: "Nova Feature",
     icon: NewIcon,
     allowedRoles: ["OWNER", "MANAGER"] // definir aqui
   }
   ```

2. **Proteger API route**

   ```typescript
   const access = await requireRole(restaurantId, "MANAGER");
   if ("error" in access) {
     return NextResponse.json({ error: access.error }, { status: access.status });
   }
   ```

3. **Atualizar documentação**
   - Adicionar na tabela de matriz de acesso
   - Documentar restrições específicas

## Debugging

### Ver role de um usuário:

```typescript
const membership = await getRestaurantMembership(restaurantId);
console.log("User role:", membership?.role);
```

### Verificar permissões no menu:

```typescript
import { canAccessMenuItem } from "@/lib/menu-permissions";

const hasAccess = canAccessMenuItem(userRole, menuItem);
console.log("Can access?", hasAccess);
```

### Testar com diferentes roles:

- `owner@garfou.demo` / `Owner123!` → Vê tudo
- `manager@garfou.demo` / `Manager123!` → Vê 15 itens
- `cashier@garfou.demo` / `Cashier123!` → Vê 8 itens
- `waiter@garfou.demo` / `Waiter123!` → Vê 6 itens
- `kitchen@garfou.demo` / `Kitchen123!` → Vê 3 itens

## Segurança

### Camadas de Proteção

1. **Frontend** - Esconde UI não autorizada
2. **Backend** - Valida cada request
3. **Database** - Queries sempre filtram por restaurantId
4. **Session** - JWT valida usuário autenticado

### Princípios Aplicados

- **Defense in Depth** - Múltiplas camadas de validação
- **Least Privilege** - Cada role tem apenas acesso necessário
- **Fail Secure** - Sem permissão = bloqueio, não acesso
- **Owner Supremacy** - Proprietário nunca é bloqueado

## Manutenção

Este sistema foi criado para ser facilmente extensível:

- **Adicionar role**: Adicionar em `UserRole` e definir permissões
- **Modificar permissões**: Atualizar `allowedRoles` em `navItems`
- **Novo recurso**: Seguir padrão de `MenuItem` + `requireRole()`
- **Debugging**: Logs em `requireRole()` e `filterMenuByRole()`

---

**Última atualização**: 2026-05-12  
**Versão**: 1.0.0  
**Status**: ✅ Produção
