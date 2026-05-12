# Gestão de Equipe e Múltiplos Restaurantes

## 📋 Visão Geral

Sistema de gestão de equipe e múltiplos restaurantes com escopo por restaurante. Cada membro é específico de um restaurante, mas pode estar em vários restaurantes se convidado.

---

## 🎯 Conceitos Principais

### 1. **Onboarding vs Novos Restaurantes**

#### `/onboarding` (Primeiro Restaurante)

- **Quando usar**: Apenas para o **primeiro** restaurante do usuário
- **Comportamento**:
  - Verifica se usuário já tem restaurantes
  - Se sim, redireciona automaticamente para o dashboard do primeiro restaurante
  - Se não, permite criar o primeiro restaurante
- **Quem acessa**: Qualquer usuário sem restaurantes

#### `/restaurants/new` (Restaurantes Adicionais)

- **Quando usar**: Para criar **novos** restaurantes (2º, 3º, etc.)
- **Comportamento**:
  - Validação de plano (ENTERPRISE permite ilimitados)
  - Cria restaurante e adiciona usuário como OWNER
  - Redireciona para o dashboard do novo restaurante
- **Quem acessa**: OWNERs com plano adequado

---

## 👥 Gestão de Equipe

### Arquitetura

```
User (global) ←→ UserRestaurant (membership) ←→ Restaurant
     ↑                      ↑                          ↑
     └──────────────────────┴──────────────────────────┘
              Relacionamento N:N
```

- **User**: Usuário global do sistema (email, senha, nome)
- **UserRestaurant**: Relacionamento entre User e Restaurant (role específica)
- **Restaurant**: Restaurante específico

### Escopo de Membros

- Membros são **por restaurante** (não globais)
- Um email pode estar em **múltiplos restaurantes** com roles diferentes
- Cada restaurante tem sua própria equipe isolada

### Exemplo Prático

```javascript
// João pode ter diferentes roles em diferentes restaurantes:
// Restaurante A: MANAGER
// Restaurante B: WAITER
// Restaurante C: OWNER

// Ao fazer login, João vê todos os restaurantes onde é membro
// e pode trocar entre eles usando o Restaurant Switcher
```

---

## 🔐 Permissões

### Hierarquia de Roles

```
OWNER (5)      → Controle total, cria equipe, gerencia tudo
MANAGER (4)    → Operações diárias, relatórios, configurações
CASHIER (3)    → PDV, pedidos, financeiro
WAITER (2)     → Pedidos, mesas, atendimento
KITCHEN (1)    → Cozinha, preparo, status de pedidos
```

### Gestão de Equipe (apenas OWNER)

**Pode fazer**:

- ✅ Adicionar novos membros (MANAGER, WAITER, KITCHEN, CASHIER)
- ✅ Remover membros (exceto OWNER)
- ✅ Ver todos os membros do restaurante
- ✅ Criar usuários novos ou adicionar existentes

**Não pode fazer**:

- ❌ Criar outro OWNER
- ❌ Remover OWNER
- ❌ Transferir ownership

---

## 🛣️ Rotas e APIs

### Páginas

| Rota                                      | Descrição                   | Permissão                         |
| ----------------------------------------- | --------------------------- | --------------------------------- |
| `/onboarding`                             | Criar primeiro restaurante  | Qualquer usuário sem restaurantes |
| `/restaurants/new`                        | Criar restaurante adicional | OWNER com plano adequado          |
| `/dashboard/[restaurantId]/settings/team` | Gerenciar equipe            | OWNER apenas                      |

### APIs

#### **GET /api/restaurants/[restaurantId]/team**

Lista todos os membros da equipe do restaurante.

**Resposta**:

```json
{
  "members": [
    {
      "id": "membership-id",
      "userId": "user-id",
      "name": "Alice Donati",
      "email": "alice@exemplo.com",
      "role": "OWNER",
      "joinedAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

**Permissão**: Apenas OWNER

---

#### **POST /api/restaurants/[restaurantId]/team**

Adiciona novo membro à equipe.

**Body**:

```json
{
  "name": "João Silva",
  "email": "joao@exemplo.com",
  "password": "senha123",
  "role": "WAITER"
}
```

**Comportamento**:

- Se email **não existe**: cria novo usuário e adiciona ao restaurante
- Se email **já existe**: apenas adiciona ao restaurante (não sobrescreve senha)
- Se **já é membro**: retorna erro

**Resposta** (201):

```json
{
  "message": "Membro adicionado com sucesso",
  "member": {
    "id": "membership-id",
    "userId": "user-id",
    "name": "João Silva",
    "email": "joao@exemplo.com",
    "role": "WAITER"
  }
}
```

**Permissão**: Apenas OWNER

---

#### **DELETE /api/restaurants/[restaurantId]/team?membershipId=xyz**

Remove membro da equipe.

**Query Params**:

- `membershipId`: ID do UserRestaurant (não do User)

**Resposta** (200):

```json
{
  "message": "Membro removido com sucesso"
}
```

**Regras**:

- ❌ Não pode remover OWNER
- ✅ Pode remover qualquer outro role

**Permissão**: Apenas OWNER

---

## 💡 Fluxos de Uso

### 1. Criar Primeiro Restaurante

```
Usuário se registra → Faz login → /onboarding →
Preenche formulário → Cria restaurante →
Redireciona para /dashboard/[restaurantId]
```

### 2. Criar Restaurante Adicional

```
OWNER clica em "Cadastrar Nova Unidade" (dropdown header) →
Redireciona para /restaurants/new →
Preenche formulário →
Validação de plano (ENTERPRISE = OK) →
Cria restaurante →
Redireciona para /dashboard/[novo-restaurantId]
```

### 3. Adicionar Membro à Equipe

```
OWNER acessa /dashboard/[restaurantId]/settings/team →
Clica em "Adicionar Membro" →
Preenche formulário (nome, email, senha, role) →
Submit → API cria/adiciona usuário →
Lista de membros atualizada
```

### 4. Remover Membro

```
OWNER acessa /dashboard/[restaurantId]/settings/team →
Clica no ícone 🗑️ ao lado do membro →
Confirma remoção →
API remove membership →
Membro removido da lista
```

### 5. Trocar de Restaurante

```
Usuário clica no ícone 🏢 no header (Restaurant Switcher) →
Vê lista de todos os restaurantes onde é membro →
Clica no restaurante desejado →
Redireciona para /dashboard/[novo-restaurantId]
```

---

## 🎨 UI/UX

### Restaurant Switcher (Header)

- **Ícone**: 🏢 Building2
- **Posição**: Header do dashboard, entre notificações e avatar
- **Visibilidade**: Sempre visível se usuário tem >= 1 restaurante
- **Dropdown**:
  - Lista de restaurantes (nome + logo)
  - Restaurante atual destacado
  - Botão "Cadastrar Nova Unidade" no rodapé

### Team Management Page

- **Acesso**: Menu lateral → "Equipe" (apenas OWNER)
- **Componentes**:
  - Lista de membros com ícones por role
  - Badge com nome da role
  - Botão de remover (exceto OWNER)
  - Botão "Adicionar Membro" (abre modal)

### Add Member Modal

- **Campos**:
  - Nome completo (required)
  - Email (required, type=email)
  - Senha inicial (required, min 6 chars)
  - Role (select: MANAGER, WAITER, KITCHEN, CASHIER)
- **Botões**: Cancelar | Adicionar

---

## 🔄 Validações

### Plano ENTERPRISE

```typescript
// prisma/seed.js
restaurant = await prisma.restaurant.create({
  data: {
    name: "Garfou Prime Bistrô",
    settings: {
      plan: "ENTERPRISE", // Permite múltiplos restaurantes
      // ...outras configurações
    },
  },
});
```

### API de Criação de Restaurante

```typescript
// src/app/api/restaurants/route.ts (POST)
// Conta restaurantes existentes
const restaurantCount = await prisma.userRestaurant.count({
  where: { userId: session.user.id },
});

// Busca plano do primeiro restaurante
const firstMembership = await prisma.userRestaurant.findFirst({
  where: { userId: session.user.id },
  include: { restaurant: true },
});

const plan = firstMembership?.restaurant.settings.plan || "STARTER";

// Valida limite
if (restaurantCount >= 1 && plan !== "ENTERPRISE") {
  return NextResponse.json(
    {
      error: "PLAN_LIMIT_REACHED",
      detail: `Seu plano ${plan} permite apenas 1 restaurante`,
      requiredPlan: "ENTERPRISE",
      currentPlan: plan,
    },
    { status: 403 }
  );
}
```

---

## 📊 Estrutura de Dados

### UserRestaurant (Membership)

```prisma
model UserRestaurant {
  id           String   @id @default(cuid())
  userId       String
  restaurantId String
  role         UserRole @default(WAITER)

  user         User       @relation(...)
  restaurant   Restaurant @relation(...)

  @@unique([userId, restaurantId])
  @@index([userId])
  @@index([restaurantId])
}

enum UserRole {
  OWNER
  MANAGER
  CASHIER
  WAITER
  KITCHEN
}
```

### Restaurant Settings

```typescript
{
  plan: "STARTER" | "PRO" | "ENTERPRISE",
  approvalMode: "AUTO" | "MANUAL",
  autoPrint: boolean,
  theme: string,
  currency: "BRL",
  timezone: "America/Sao_Paulo",
  // ...outras configurações
}
```

---

## 🧪 Testes

### Credenciais de Teste (Seed)

```javascript
owner@garfou.demo    / Owner123!     // OWNER com plano ENTERPRISE
manager@garfou.demo  / Manager123!   // MANAGER
waiter@garfou.demo   / Waiter123!    // WAITER
kitchen@garfou.demo  / Kitchen123!   // KITCHEN
cashier@garfou.demo  / Cashier123!   // CASHIER
```

### Cenários de Teste

1. **Primeiro login → Onboarding**
   - Login com novo usuário
   - Acessar /onboarding
   - Criar primeiro restaurante
   - Verificar redirect para dashboard

2. **Criar segundo restaurante (OWNER com ENTERPRISE)**
   - Login como owner@garfou.demo
   - Clicar em 🏢 → "Cadastrar Nova Unidade"
   - Criar segundo restaurante
   - Verificar criação e redirect

3. **Adicionar membro à equipe**
   - Login como OWNER
   - Acessar Settings → Equipe
   - Adicionar novo WAITER
   - Verificar aparição na lista

4. **Trocar de restaurante**
   - Login com usuário em múltiplos restaurantes
   - Clicar em 🏢
   - Ver lista completa
   - Trocar e verificar context switch

---

## 🚀 Melhorias Futuras

### Curto Prazo

- [ ] Transferir ownership entre usuários
- [ ] Editar role de membros existentes
- [ ] Filtros na lista de membros
- [ ] Paginação na lista (se > 50 membros)

### Médio Prazo

- [ ] Convites por email (em vez de criar conta diretamente)
- [ ] Histórico de alterações na equipe (audit log)
- [ ] Permissões customizadas (além das roles padrão)
- [ ] Bulk operations (adicionar múltiplos membros)

### Longo Prazo

- [ ] SSO (Single Sign-On) para empresas
- [ ] Federação de identidade (Google, Microsoft)
- [ ] Multi-org (franquias com estrutura hierárquica)
- [ ] Delegação temporária de permissões

---

## 📝 Checklist de Implementação

### ✅ Concluído

- [x] Rota `/restaurants/new` para criar restaurantes adicionais
- [x] API `/api/restaurants/[restaurantId]/team` (GET, POST, DELETE)
- [x] Página `/dashboard/[restaurantId]/settings/team` para gestão
- [x] Link "Equipe" no menu lateral (apenas OWNER)
- [x] NewRestaurantButton redireciona para `/restaurants/new`
- [x] Validação de plano na criação de restaurantes
- [x] Onboarding redireciona se já tem restaurantes
- [x] Restaurant Switcher sempre visível (se >= 1 restaurante)
- [x] Documentação completa

### 🎯 Próximos Passos

1. Testar fluxo completo end-to-end
2. Atualizar seed se necessário
3. Adicionar testes automatizados
4. Documentar no README principal

---

## 🤝 Contribuindo

Para adicionar novas roles ou modificar permissões, edite:

- `prisma/schema.prisma` (enum UserRole)
- `src/lib/roles.ts` (hierarchy e permissions)
- `src/lib/menu-permissions.ts` (visibilidade do menu)

---

**Data de Criação**: 2025-01-12  
**Última Atualização**: 2025-01-12  
**Versão**: 1.0.0
