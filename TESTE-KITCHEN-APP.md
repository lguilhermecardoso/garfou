# GUIA DE TESTE - Kitchen App com BFF

## O que mudou?

✅ **Kitchen-app agora usa sistema BFF com bearer tokens**

- Não depende mais de cookies ou NextAuth
- Funciona perfeitamente em abas anônimas
- Bearer tokens armazenados no localStorage

## Como testar

### 1. Limpar dados antigos (IMPORTANTE)

Abra o DevTools (F12) e execute no Console:

```javascript
localStorage.clear();
```

### 2. Acessar tela de ativação

Navegue para: `http://localhost:3000/kitchen-app/activate`

### 3. Digitar TOKEN

Digite o TOKEN da cozinha: **094539**

O sistema vai:

1. Validar o TOKEN via BFF
2. Receber um bearer token
3. Armazenar no localStorage
4. Redirecionar para `/kitchen-app/garfou-demo-max`

### 4. Verificar funcionamento

Na tela da cozinha, você deve ver:

- ✅ Pedidos carregando automaticamente
- ✅ Indicador "Ao vivo" no canto
- ✅ Botão "Desconectar" no canto superior direito
- ✅ Pedidos aparecendo em cards

### 5. Testar ações

- Clique em "Confirmar" em um pedido novo
- Status deve mudar para "CONFIRMADO"
- Clique em "Iniciar Preparo"
- Status deve mudar para "EM_PREPARO"

## Verificar localStorage

Após ativação, verifique no DevTools Console:

```javascript
console.log({
  bearerToken: localStorage.getItem("device_bearer_token"),
  deviceType: localStorage.getItem("deviceType"),
  restaurantId: localStorage.getItem("restaurantId"),
  restaurantName: localStorage.getItem("restaurantName"),
});
```

Deve mostrar:

```javascript
{
  bearerToken: "xxxxx...",  // Token longo (43 caracteres)
  deviceType: "KITCHEN",
  restaurantId: "cmp37zy8f000553mq0qz07bpd",
  restaurantName: "Garfou Prime Bistrô"
}
```

## Testar em aba anônima

1. Abra uma **nova janela anônima** (Ctrl+Shift+N)
2. Vá para `http://localhost:3000/kitchen-app/activate`
3. Digite o TOKEN: **094539**
4. Deve funcionar perfeitamente sem cookies!

## Tokens disponíveis

- **KITCHEN**: 094539
- **WAITER**: 282264

Ambos são do restaurante "Garfou Prime Bistrô"

## Se der erro

### "Este dispositivo não está configurado como App Cozinha"

**Solução:** Você tem dados antigos no localStorage

```javascript
localStorage.clear();
```

E faça a ativação novamente

### "Token inválido"

**Solução:** Verifique se digitou o TOKEN corretamente: **094539**

### "Erro ao validar sessão"

**Solução:** O bearer token pode ter expirado

```javascript
localStorage.clear();
```

E faça a ativação novamente

## Fluxo técnico (para debug)

1. **POST /api/bff/devices/activate**
   - Body: `{"token": "094539"}`
   - Response: `{success: true, data: {bearerToken, deviceType, restaurant}}`

2. **GET /api/bff/orders?status=...**
   - Header: `Authorization: Bearer xxxxx`
   - Response: `{success: true, data: [...orders], device: {...}}`

3. **PATCH /api/bff/orders/:id**
   - Header: `Authorization: Bearer xxxxx`
   - Body: `{"status": "CONFIRMADO"}`
   - Response: `{success: true, data: {...order}}`
