# Sistema de Notificações em Tempo Real

## Visão Geral

Sistema de notificações que monitora novos pedidos e exibe alertas visuais e sonoros no header do dashboard.

## Componentes

### 1. Hook: `useNotifications`

**Localização:** `src/hooks/use-notifications.ts`

**Funcionalidades:**

- Polling a cada 5 segundos para detectar novos pedidos
- Toca som de sino quando novo pedido chega
- Mantém histórico das últimas 10 notificações
- Conta notificações não lidas
- Permite marcar como lida individualmente ou em lote

**Uso:**

```tsx
const { notifications, unreadCount, markAllAsRead, clearAll } = useNotifications(restaurantId);
```

### 2. Componente: `DashboardHeader`

**Localização:** `src/components/shared/dashboard-header.tsx`

**Recursos:**

- Badge com contagem de notificações não lidas (animado com pulse)
- Dropdown com lista de notificações
- Som de sino ao receber novo pedido
- Link direto para página de pedidos pendentes
- Marcar todas como lidas
- Limpar todas as notificações

## Som de Notificação

Usa Web Audio API para gerar um som de sino agradável:

- Tom inicial: 880 Hz
- Tom final: 440 Hz
- Duração: 0.6 segundos
- Volume: 30% (não intrusivo)

## Estados de Notificação

- `NEW_ORDER`: Novo pedido recebido
- `ORDER_READY`: Pedido pronto (futuro)
- `ORDER_CONFIRMED`: Pedido confirmado (futuro)

## Comportamento

1. Primeira carga: Não toca som (evita alertas falsos)
2. Novos pedidos detectados: Toca som + adiciona notificação
3. Contador no badge atualiza em tempo real
4. Dropdown mostra até 10 notificações mais recentes
5. Notificações não lidas têm destaque visual (fundo colorido + badge)

## Personalização

Para ajustar o intervalo de polling, edite:

```tsx
const interval = setInterval(checkNewOrders, 5000); // 5 segundos
```

Para ajustar o som:

```tsx
osc.frequency.setValueAtTime(880, ctx.currentTime); // Frequência inicial
gain.gain.setValueAtTime(0.3, ctx.currentTime); // Volume
```

## Próximas Melhorias

- [ ] WebSockets para notificações instantâneas
- [ ] Mais tipos de notificação (pedido pronto, cancelado, etc.)
- [ ] Preferências de usuário (desabilitar som, ajustar volume)
- [ ] Notificações desktop (Notification API)
- [ ] Persistência de notificações (banco de dados)
