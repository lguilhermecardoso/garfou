# CHANGELOG

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [Não Lançado]

### Adicionado (2026-05-14 - Sessão: Features sem dependências externas)

#### Histórico de Movimentações de Estoque

- `GET /api/restaurants/[restaurantId]/inventory/movements/route.ts` — endpoint de listagem paginada com filtro opcional por item
- `src/features/inventory/inventory-movements-table.tsx` — tabela client-side com paginação "carregar mais", badges coloridas por tipo (IN/OUT/ADJUSTMENT), prefixo de sinal
- `src/app/(dashboard)/dashboard/[restaurantId]/inventory/movements/page.tsx` — página de histórico
- `src/app/(dashboard)/dashboard/[restaurantId]/inventory/page.tsx` — adicionado botão "Histórico" com ícone History

#### QR Code por Mesa

- `src/features/tables/table-qr-modal.tsx` — modal com QR code SVG via `qrcode.react`, botões Imprimir e Baixar PNG
- `src/features/tables/tables-settings.tsx` — adicionado botão QR Code por linha de mesa; aceita nova prop `restaurantSlug`
- `src/app/(dashboard)/dashboard/[restaurantId]/settings/tables/page.tsx` — busca `restaurant.slug` e passa ao componente
- `src/app/(public)/menu/[slug]/page.tsx` — aceita `?table=X` via `searchParams` e repassa para `DigitalMenuClient`
- `src/features/menu/digital-menu-client.tsx` — aceita prop `tableNumber`, pré-preenche tipo DINE_IN, exibe badge "Mesa X" no checkout

#### WhatsApp

- `src/features/whatsapp/whatsapp-tools.tsx` — componente client com: link direto ao WhatsApp Web, wa.me builder (telefone → abre chat), templates com cópia para clipboard
- `src/app/(dashboard)/dashboard/[restaurantId]/whatsapp/page.tsx` — substituída iframe inútil pelo novo `WhatsAppTools`
- `src/features/orders/order-detail-modal.tsx` — botão "WhatsApp" quando cliente tem telefone cadastrado (abre wa.me com mensagem pré-configurada)

#### Relatórios com Gráficos

- `src/features/reports/revenue-chart.tsx` — AreaChart recharts de faturamento diário
- `src/features/reports/orders-chart.tsx` — BarChart recharts de volume de pedidos diários
- `src/app/(dashboard)/dashboard/[restaurantId]/reports/page.tsx` — seletor de período 7d/30d/3m, query diária com agregação em memória, rendering dos 2 gráficos

#### Exportação CSV

- `src/app/api/restaurants/[restaurantId]/reports/export/route.ts` — GET endpoint com type (orders|finance), from, to; retorna CSV com BOM UTF-8
- `src/features/reports/export-csv-button.tsx` — botão client que abre URL de download na nova aba
- Reports page — botões "Exportar pedidos" e "Exportar financeiro" integrados

### Adicionado (2026-01-12 - Sessão 3: Gestão de Equipe)

#### Gestão de Equipe por Restaurante

- **Página `/dashboard/[restaurantId]/settings/team`**
  - Interface completa para gerenciar membros da equipe
  - Lista todos os membros com ícones por role
  - Badges coloridas para cada role
  - Botão "Adicionar Membro" (abre modal)
  - Botão de remover membro (exceto OWNER)
  - Apenas acessível por OWNER
- **Modal de Adição de Membro**
  - Campos: nome, email, senha inicial, role
  - Validação em tempo real
  - Criação de novo usuário ou adição de existente
  - Feedback visual de sucesso/erro
- **Link "Equipe" no Menu Lateral**
  - Ícone Users
  - Visível apenas para OWNER
  - Posicionado antes de "Configurações"

#### Nova Rota para Restaurantes Adicionais

- **Página `/restaurants/new`**
  - Formulário de 2 etapas (dados básicos → endereço)
  - Validação de plano (ENTERPRISE permite ilimitados)
  - Mensagem de erro detalhada se limite atingido
  - Redireciona para dashboard do novo restaurante após criação
- **Separação de Rotas**:
  - `/onboarding` → APENAS primeiro restaurante
  - `/restaurants/new` → Restaurantes adicionais (2º, 3º, etc.)

#### APIs de Gestão de Equipe

- **GET `/api/restaurants/[restaurantId]/team`**
  - Lista todos os membros do restaurante
  - Retorna: id, userId, name, email, role, joinedAt
  - Ordenado por role (OWNER primeiro) e nome
  - Apenas OWNER pode acessar
- **POST `/api/restaurants/[restaurantId]/team`**
  - Adiciona novo membro à equipe
  - Body: {name, email, password, role}
  - Cria usuário se não existe, ou adiciona ao restaurante se existe
  - Não permite criar OWNER ou duplicar membros
  - Apenas OWNER pode usar
- **DELETE `/api/restaurants/[restaurantId]/team`**
  - Remove membro da equipe (query param `membershipId`)
  - Não permite remover OWNER
  - Apenas OWNER pode usar

#### Validações e Proteções

- **Onboarding com Redirect**:
  - Verifica se usuário já tem restaurantes no mount
  - Se sim, redireciona automaticamente para primeiro restaurante
  - Mostra loading "Verificando configuração..." durante check
- **Restaurant Switcher Sempre Visível**:
  - Alterado de `restaurants.length > 1` para `>= 1`
  - Aparece mesmo com apenas 1 restaurante (consistência UX)
- **Validação de Plano na API**:
  - POST `/api/restaurants` conta restaurantes existentes
  - Se >= 1 e plano !== ENTERPRISE, retorna 403
  - Resposta inclui currentPlan e requiredPlan

#### Documentação

- **Criado `/docs/guides/GESTAO-EQUIPE.md`**
  - Arquitetura completa de membros por restaurante
  - Diferença entre /onboarding e /restaurants/new
  - Permissões e hierarquia de roles
  - Fluxos de uso detalhados (criar restaurante, adicionar/remover membros)
  - APIs com exemplos de request/response
  - UI/UX de todas as páginas
  - Validações e estrutura de dados
  - Checklist de implementação
- **Atualizado `/docs/guides/README.md`**:
  - Adicionado GESTAO-EQUIPE.md no índice
  - Seção "Quando Usar Cada Guia"

### Modificado (2026-01-12 - Sessão 3)

- `src/components/shared/new-restaurant-button.tsx`:
  - Redireciona para `/restaurants/new` (antes: `/onboarding`)
- `src/components/shared/dashboard-header.tsx`:
  - Switcher aparece com >= 1 restaurante (antes: > 1)
- `src/app/onboarding/page.tsx`:
  - Adicionado useEffect para verificar restaurantes existentes
  - Estado `checkingRestaurants` com loading spinner
  - Redirect automático se usuário já tem restaurantes
- `src/components/shared/dashboard-sidebar.tsx`:
  - Adicionado item "Equipe" (Users icon, OWNER only)
  - Posicionado entre "NPS" e "Configurações"

### Adicionado (2026-05-12 - Sessão 2: Multi-Restaurante)

#### Multi-Restaurante UI

- **Seletor de Restaurantes no Dashboard Header**
  - Dropdown interativo no topo do dashboard (ícone 🏢)
  - Mostra todos os restaurantes do usuário com nome e slug
  - Indicação visual do restaurante ativo (fundo azul + ponto)
  - Navegação instantânea entre restaurantes
  - Aparece apenas se usuário tem 2+ restaurantes
  - Link "Cadastrar Nova Unidade" no final do dropdown
- **API `/api/user/restaurants`**: Endpoint para listar restaurantes do usuário autenticado
  - Retorna: id, name, slug, logo, isOpen, role
  - Ordenado alfabeticamente por nome
  - Apenas restaurantes onde o usuário é membro

#### CurrencyInput Component

- **Novo componente para valores monetários BRL**
  - Formatação automática: R$ X.XXX,XX
  - Mascaramento em tempo real conforme o usuário digita
  - Validação e parsing automático
  - Suporte a todos os props padrão de Input
- **Helpers exportados**:
  - `formatCurrencyInput(value)`: string → "R$ X.XXX,XX"
  - `parseCurrencyInput(value)`: "R$ X.XXX,XX" → "12.34"
  - `parseCurrencyToNumber(value)`: "R$ X.XXX,XX" → 12.34
- **Re-exportado em `masked-input.tsx`** para facilitar importação

#### Dev Components Page

- **Atualização completa de `/dev/components`**
  - Seção "Masked Inputs (BR)": Phone, CPF, CNPJ, CEP, Email
  - Seção "Currency Input (BRL)": CurrencyInput com exemplos
  - Seção "Cards": Cards básico, com badge, com ação
  - Melhor organização visual por categorias
  - Importação de todos os componentes UI

#### Documentação

- **Criado `/docs/guides/MULTI-RESTAURANTE.md`**
  - Guia completo de multi-restaurante
  - Como cadastrar nova unidade (2 opções)
  - Como trocar de restaurante no dashboard
  - Configuração de delivery zones
  - Taxa única de entrega para cidades pequenas
  - Uso de CurrencyInput e masked inputs
  - Estrutura de dados e permissões
  - Fluxo completo com diagrama mermaid
- **Atualizado este CHANGELOG** com todas as implementações de hoje

### Modificado (2026-05-12 - Sessão 2)

- `src/components/shared/dashboard-header.tsx`:
  - Adicionado seletor de restaurantes com dropdown
  - Hook `useEffect` para carregar restaurantes do usuário
  - Estado para controlar abertura do dropdown
  - Função `switchRestaurant()` para navegação
- `src/components/ui/masked-input.tsx`:
  - Atualizado JSDoc incluindo CurrencyInput
  - Re-exportação de CurrencyInput e helpers
- `src/app/dev/components/page.tsx`:
  - Expandido com todos os componentes do sistema
  - Importações de CurrencyInput e MaskedInputs
  - Novas seções: Masked Inputs, Currency Input, Cards

### Adicionado (2026-05-12 - Sessão 1: Inventory & Delivery)

#### Sistema de Operações de Estoque

- Modal interativo para operações de estoque (`StockOperationsModal`)
- 3 tipos de operação: Entrada (IN), Saída (OUT), Ajuste (ADJUSTMENT)
- Preview em tempo real do estoque após operação
- Validação automática (previne estoque negativo)
- Alertas visuais para produtos com estoque baixo
- Auto-refresh após operações
- Histórico completo de movimentações no banco de dados
- Endpoint API: `POST /api/restaurants/[rid]/inventory/[itemId]/move`

#### Fluxo de Entrega de Pedidos

- Botão "Saiu para Entrega" 🚚 para pedidos PRONTO de DELIVERY
  - Transição: PRONTO → SAIU_PARA_ENTREGA
  - Ícone de caminhão (Truck) da lucide-react
  - Cor azul para destacar status de entrega
- Botão "Finalizar" ✅ atualizado:
  - Mostra para pedidos PRONTO (não-delivery)
  - Mostra para pedidos SAIU_PARA_ENTREGA (qualquer tipo)
  - Transição final: → FINALIZADO
- Destaque visual por status na tabela de pedidos:
  - Pendente: fundo âmbar (bg-amber-50)
  - Pronto: fundo verde (bg-emerald-50)
  - Saiu para entrega: fundo azul (bg-blue-50)
- Notificações toast para todas as transições de status
- Cliente vê atualizações automáticas na página de rastreamento (15s)

#### Documentação

- Criado `docs/specs/recent-implementations.md` (referência para agentes IA)
- Criado `docs/specs/RESUMO-IMPLEMENTACOES.md` (resumo em português)
- Criado `CHANGELOG.md` (este arquivo)
- Atualizado `AGENTS.md` com seção 5.1 (Inventory Operations)
- Atualizado `docs/features/orders.md` com botões de entrega
- Atualizado `docs/features/inventory.md` com operações CRUD
- Atualizado `docs/specs/progress-log.md` com implementações de hoje
- Atualizado `README.md` com links para documentação recente

### Modificado (2026-05-12)

- `src/features/orders/orders-live-table.tsx`: adicionado botões de entrega e finalize
- `src/features/orders/order-detail-modal.tsx`: adicionado botões de entrega e finalize
- `src/features/inventory/inventory-table.tsx`: refatorado para usar modal de operações
- `src/app/(dashboard)/dashboard/[restaurantId]/inventory/page.tsx`: refatorado componente

### Corrigido (2026-05-12)

- Classes Tailwind dinâmicas agora são hardcoded (compatibilidade v4)
- Validação de estoque negativo em operações OUT
- Auto-refresh funcionando corretamente após operações

## [0.1.0] - 2026-05-11

### Adicionado

- Implementação completa do sistema de customização de cardápio
- Grupos de modificadores e sabores divididos (pizzas 2/3/4 sabores)
- Modal de detalhes de pedido com preview de comprovante
- Widget de pedidos pendentes no dashboard
- Impressão térmica para Bematech MP-4200 (58mm)
- Seed completo com dados realistas de demonstração
- 115 testes automatizados (86.88% cobertura)

### Modificado

- Autenticação com next-auth v5 (skipCSRFCheck para evitar conflito)
- Interface Order agora retorna `items[]` completo ao invés de `_count`

### Corrigido

- Erro MissingCSRF no login
- TypeError ao renderizar contagem de itens de pedido

## [0.0.1] - 2026-05-10

### Adicionado

- Arquitetura base do projeto
- Multi-tenancy com PostgreSQL + Prisma
- Autenticação com next-auth v5
- RBAC (Role-Based Access Control)
- Rate limiting em endpoints públicos
- CI/CD com GitHub Actions
- Hooks de commit convencional
- Estrutura de documentação

---

## Tipos de Mudanças

- **Adicionado**: para novas funcionalidades
- **Modificado**: para mudanças em funcionalidades existentes
- **Depreciado**: para funcionalidades que serão removidas em breve
- **Removido**: para funcionalidades removidas
- **Corrigido**: para correção de bugs
- **Segurança**: em caso de vulnerabilidades

## Links

- [Documentação Completa](./README.md)
- [Implementações Recentes](./docs/specs/RESUMO-IMPLEMENTACOES.md)
- [Contexto para Agentes](./AGENTS.md)
