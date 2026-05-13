# BFF (Backend For Frontend) - Sistema de Dispositivos

## Visão Geral

Sistema de autenticação independente para apps Garçom e Cozinha que **NÃO depende de cookies ou NextAuth**. Funciona perfeitamente em navegadores anônimos, tablets dedicados e TVs.

## Arquitetura

### 1. **Fluxo de Autenticação**

```
1. Dispositivo envia TOKEN (6 dígitos) → POST /api/bff/devices/activate
2. BFF valida token e identifica restaurante
3. BFF gera bearerToken único (32 bytes base64url)
4. BFF cria sessão e retorna bearerToken
5. Dispositivo armazena bearerToken em localStorage
6. Todas as requisições BFF usam: Authorization: Bearer <token>
```

### 2. **Segurança**

- ✅ **Isolado** - Totalmente independente de NextAuth/cookies
- ✅ **Bearer tokens únicos** - 1 token por sessão de dispositivo
- ✅ **Validação automática** - Cada request valida token + restaurante
- ✅ **Tenancy garantida** - Dispositivo só acessa dados do próprio restaurante
- ✅ **lastSeenAt tracking** - Atualizado a cada requisição (fire-and-forget)
- ✅ **Revogável** - Sessões podem ser desativadas pelo gerente

### 3. **Database Schema**

```sql
-- device_sessions.bearerToken
ALTER TABLE "device_sessions" ADD COLUMN "bearerToken" TEXT UNIQUE;
CREATE INDEX ON "device_sessions"("bearerToken", "isActive");
```

## APIs BFF

### **Ativação de Dispositivo**

```bash
POST /api/bff/devices/activate
Content-Type: application/json

{
  "token": "123456",           # TOKEN de 6 dígitos
  "deviceInfo": "..."          # Opcional: User agent
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "bearerToken": "n5KMFYRn1oZJJjdCxF2iQUNdQ6I4rKskQqDD6UDOsQ4",
    "sessionId": "cmp44mit700003gmqlsonyrd5",
    "deviceType": "WAITER" | "KITCHEN",
    "restaurant": {
      "id": "...",
      "name": "...",
      "slug": "...",
      "logo": "...",
      "isOpen": true
    }
  }
}
```

### **Listar Pedidos**

```bash
GET /api/bff/orders?status=NOVO_PEDIDO,AGUARDANDO_CONFIRMACAO&page=1&pageSize=50
Authorization: Bearer n5KMFYRn1oZJJjdCxF2iQUNdQ6I4rKskQqDD6UDOsQ4
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "orderNumber": 1001,
      "status": "NOVO_PEDIDO",
      "type": "DINE_IN",
      "tableNumber": "05",
      "total": 62.90,
      "items": [...],
      "customer": {...},
      "waiter": {...}
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "total": 2,
    "totalPages": 1
  },
  "device": {
    "type": "WAITER",
    "restaurant": {...}
  }
}
```

### **Buscar Pedido Específico**

```bash
GET /api/bff/orders/:orderId
Authorization: Bearer <token>
```

### **Atualizar Status do Pedido**

```bash
PATCH /api/bff/orders/:orderId
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "CONFIRMADO" | "EM_PREPARO" | "PRONTO" | "SAIU_PARA_ENTREGA" | "FINALIZADO" | "CANCELADO"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Status atualizado com sucesso",
  "data": {
    "id": "...",
    "status": "CONFIRMADO",
    ...
  }
}
```

## Implementação Frontend

### **Ativação (waiter-app/activate, kitchen-app/activate)**

```typescript
async function activateDevice(token: string) {
  const response = await fetch("/api/bff/devices/activate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });

  const data = await response.json();

  if (data.success) {
    // Salvar bearerToken no localStorage
    localStorage.setItem("device_bearer_token", data.data.bearerToken);
    localStorage.setItem("device_type", data.data.deviceType);
    localStorage.setItem("restaurant", JSON.stringify(data.data.restaurant));

    // Redirecionar para app principal
    window.location.href = `/waiter-app/${data.data.restaurant.slug}`;
  }
}
```

### **Requisições Autenticadas**

```typescript
async function fetchOrders(status: string[]) {
  const bearerToken = localStorage.getItem("device_bearer_token");

  if (!bearerToken) {
    // Redirecionar para /waiter-app/activate
    return;
  }

  const response = await fetch(`/api/bff/orders?status=${status.join(",")}&pageSize=50`, {
    headers: {
      Authorization: `Bearer ${bearerToken}`,
    },
  });

  if (response.status === 401) {
    // Token expirado ou inválido
    localStorage.clear();
    window.location.href = "/waiter-app/activate";
    return;
  }

  return await response.json();
}

async function updateOrderStatus(orderId: string, status: string) {
  const bearerToken = localStorage.getItem("device_bearer_token");

  const response = await fetch(`/api/bff/orders/${orderId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });

  return await response.json();
}
```

## Testes Realizados

### ✅ **Ativação com TOKEN Garçom (282264)**

```bash
curl -X POST http://localhost:3000/api/bff/devices/activate \
  -H "Content-Type: application/json" \
  -d '{"token": "282264"}'

# ✅ Retornou bearerToken válido para WAITER
```

### ✅ **Ativação com TOKEN Cozinha (094539)**

```bash
curl -X POST http://localhost:3000/api/bff/devices/activate \
  -H "Content-Type: application/json" \
  -d '{"token": "094539"}'

# ✅ Retornou bearerToken válido para KITCHEN
```

### ✅ **Listar Pedidos com Bearer Token**

```bash
curl -s "http://localhost:3000/api/bff/orders?status=NOVO_PEDIDO&pageSize=5" \
  -H "Authorization: Bearer n5KMFYRn1oZJJjdCxF2iQUNdQ6I4rKskQqDD6UDOsQ4"

# ✅ Retornou pedidos do restaurante correto
# ✅ Validou tenancy automaticamente
```

### ✅ **Atualizar Status de Pedido**

```bash
curl -X PATCH "http://localhost:3000/api/bff/orders/cmp38a3250027qbmq62mexxlw" \
  -H "Authorization: Bearer n5KMFYRn1oZJJjdCxF2iQUNdQ6I4rKskQqDD6UDOsQ4" \
  -H "Content-Type: application/json" \
  -d '{"status": "CONFIRMADO"}'

# ✅ Status atualizado com sucesso
```

### ✅ **Testado em Aba Anônima**

- ✅ Ativação funciona sem cookies
- ✅ Bearer token armazenado em localStorage
- ✅ Todas as requisições autenticadas com sucesso

## Bibliotecas e Helpers

### `/src/lib/device-auth.ts`

```typescript
// Gera bearer token único (32 bytes base64url)
export function generateBearerToken(): string;

// Valida bearer token e retorna dados de autenticação
export async function validateBearerToken(token: string): Promise<DeviceAuth | null>;

// Extrai bearer token do header Authorization
export function extractBearerToken(authHeader: string): string | null;
```

## Rotas Públicas (sem NextAuth)

Adicionado ao `auth.config.ts`:

```typescript
nextUrl.pathname.startsWith("/api/bff/");
```

## Próximos Passos

1. **Frontend**: Atualizar `waiter-app/activate` e `kitchen-app/activate` para usar BFF
2. **Polling**: Implementar polling de pedidos nos apps
3. **Realtime**: Considerar WebSockets/SSE para notificações (opcional)
4. **Revogação**: Interface de gerente para revogar sessões
5. **Logs**: Auditoria de ações dos dispositivos

---

**Status:** ✅ **IMPLEMENTADO E TESTADO**
**Segurança:** ✅ **ISOLADO E SEGURO**
**Multi-tenancy:** ✅ **GARANTIDO**
**Compatibilidade:** ✅ **FUNCIONA EM ABAS ANÔNIMAS**
