# GARFOU — Feature: Personalização de Itens do Cardápio

> **Status:** `SPEC — Aguardando implementação`
> **Última atualização:** 2026-05-12
> **Autor:** Análise de produto + arquitetura Garfou
> **Escopo:** Cardápio Digital (cliente) + Gestão de Cardápio (operador)

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Pesquisa de Mercado](#2-pesquisa-de-mercado)
3. [Estado Atual do Sistema](#3-estado-atual-do-sistema)
4. [Modelo Conceitual](#4-modelo-conceitual)
5. [Esquema de Banco de Dados](#5-esquema-de-banco-de-dados)
6. [Contratos de API](#6-contratos-de-api)
7. [Fluxos de UX](#7-fluxos-de-ux)
8. [Mapa de Componentes](#8-mapa-de-componentes)
9. [Regras de Negócio](#9-regras-de-negócio)
10. [Impacto no Recibo Térmico](#10-impacto-no-recibo-térmico)
11. [Configuração por Restaurante](#11-configuração-por-restaurante)
12. [Fora de Escopo](#12-fora-de-escopo)
13. [Questões em Aberto](#13-questões-em-aberto)
14. [Glossário](#14-glossário)
15. [Divisão em Partes — Meio a Meio / Terços / Quartos](#15-divisão-em-partes--meio-a-meio--terços--quartos)

---

## 1. Visão Geral

Esta feature adiciona ao Garfou a capacidade de **personalização de itens de pedido** em dois eixos
complementares:

| Eixo                        | Descrição                                                  | Exemplo                            |
| --------------------------- | ---------------------------------------------------------- | ---------------------------------- |
| **Observação livre**        | Campo de texto opcional por item                           | "Sem orégano, ponto médio"         |
| **Grupos de modificadores** | Seleção estruturada de ingredientes / adicionais com preço | "Ingredientes", "Adicionais pagos" |
| **Divisão em partes**       | Produto dividido em 2, 3 ou 4 partes com sabores distintos | "½ Marguerita + ½ Da Casa"         |

A feature é **configurável por restaurante** (liga/desliga global) e **configurável por produto**
(cada item pode ou não ter grupos de modificadores). O campo de observação livre permanece sempre
disponível quando o restaurante permitir customização.

### Problema resolvido

Hoje o cliente no cardápio digital não tem como:

- Remover ingredientes de um item (ex.: "sem cebola")
- Escolher adicionais pagos (ex.: "dobro de queijo +R$3,00")
- Ver quais ingredientes padrão o item possui

O restaurante também não tem como configurar essas opções no gestor, nem o sistema registra essas
escolhas no pedido de forma estruturada para a cozinha.

Também não é possível oferecer **produtos divididos em partes** (ex.: pizza meio a meio), onde
cada parte pode ter um sabor diferente do catálogo, com preço calculado automaticamente pela
regra do restaurante (mais caro, média, etc.).

---

## 2. Pesquisa de Mercado

### 2.1 iFood — "Grupos de Complementos"

O iFood é a principal referência para o mercado brasileiro de delivery. Ele usa o conceito de
**Grupos de Complementos**:

- Cada produto tem zero ou mais grupos
- Cada grupo tem `minimo` (0 = opcional, 1+ = obrigatório) e `maximo` (controla multi-seleção)
- Itens dentro do grupo podem ter preço zero (ingrediente padrão) ou positivo (adicional pago)
- O cliente vê os grupos em sequência no modal do produto, com validação inline
- Um grupo com `maximo: 1` vira radio-button; com `maximo > 1` vira checkboxes com contador

**Padrões notáveis do iFood:**

- Grupo "Retirar ingredientes" é um grupo normal com price=0 e maxSelections=N, onde o cliente
  DESMARCA o que não quer (todos vêm pré-selecionados por padrão)
- Grupos obrigatórios bloqueiam o botão "Adicionar" até serem preenchidos
- **Meio a meio:** produto do tipo "pizza" pode ser dividido em até N partes; cada parte
  referencia outro produto do catálogo como sabor; o preço final usa a regra "mais caro" por padrão

### 2.2 Toast POS — "Modifier Groups"

Sistema americano usado em redes de restaurantes. Conceitos relevantes:

- `ModifierGroup` tem `minSelections` e `maxSelections`
- Modificadores podem ter `price` positivo, zero, ou até negativo (substituto mais barato)
- Suporte a modificadores **aninhados** (modificador de modificador) — não planejado para o Garfou
- `isPizzaModifier` para lógica de metade/metade — fora do escopo
- "86 list": ingrediente desabilitado temporariamente por falta de estoque

### 2.3 Square for Restaurants — "Modifier Lists"

- Listas do tipo `SINGLE` (radio) ou `MULTIPLE` (checkbox)
- Modificadores podem ser `SOLD_OUT` (equivalente ao 86 list do Toast)
- Suporte a imagem por modificador (fora do escopo)

### 2.4 Rappi / Delivery Hero — "Toppings"

- Mesma estrutura de grupos com min/max
- UI mobile-first com bottom sheet por produto
- Destaque visual para grupos obrigatórios (label em vermelho)

### 2.5 McDonald's App — "Customize Your Order"

Abordagem mais simples e eficaz para fast food:

- Três abas: **Remover** / **Adicionar** / **Extras pagos**
- "Remover" = lista de ingredientes padrão, todos desmarcados para remover
- Simplicidade: sem grupos, sem min/max complexo

### 2.6 Síntese — Padrão do Mercado

O mercado convergiu no padrão **"Modifier Group"** (Grupo de Modificadores):

```
Produto
  └── ModifierGroup[]          (ordenados, 0..N grupos por produto)
        ├── nome
        ├── tipo                (INGREDIENT | ADDON | REQUIRED_CHOICE)
        ├── minSelections       (0 = opcional, ≥1 = obrigatório)
        ├── maxSelections       (1 = único, >1 = múltiplo)
        └── ModifierOption[]   (as escolhas disponíveis)
              ├── nome
              ├── price         (0 para ingredientes, >0 para adicionais pagos)
              └── isDefault     (true = vem no produto por padrão)
```

**Insight-chave:** "Remover ingrediente" e "Adicionar extra pago" são o **mesmo mecanismo** com
parâmetros diferentes. Não há necessidade de dois sistemas separados.

### 2.7 Padrões de Mercado para Divisão de Produtos

O mercado brasileiro (iFood, Rappi) e americano (Toast, Square) convergem no seguinte padrão para
pizzas e produtos similares divisíveis:

| Player | Nome interno     | Máximo de partes            | Regra de preço padrão | Pool de sabores             |
| ------ | ---------------- | --------------------------- | --------------------- | --------------------------- |
| iFood  | "Montagem"       | Configurável (geralmente 2) | Mais caro             | Produtos da mesma categoria |
| Toast  | "Pizza Modifier" | 2 (halves)                  | Por metade (× 0.5)    | Lista configurada           |
| Square | "Half & Half"    | 2                           | Mais caro             | Lista configurada           |
| Rappi  | "Divisão"        | Até 4                       | Mais caro             | Lista configurada           |

**Decisão para o Garfou:**

- O restaurante configura o número exato de partes (`maxSplits`: 2, 3 ou 4) por produto
- O pool de sabores é uma lista explícita configurada pelo operador (não automática por categoria)
- A regra de preço padrão é `HIGHEST` (mais caro) — configurável por produto
- Cada parte pode ter seus próprios modificadores (adicionais/remoções) — considerado na seção 15

---

## 3. Estado Atual do Sistema

### 3.1 O que já existe no banco

O schema já possui as tabelas `product_addons` e `order_item_addons`, mas com modelo simples:

```prisma
model ProductAddon {
  id           String  @id
  restaurantId String
  productId    String
  name         String
  price        Decimal @default(0)
  isRequired   Boolean @default(false)
  maxQuantity  Int     @default(1)
  // ← sem: groupName, sortOrder, isDefault, minSelections, type
}
```

**Gaps identificados:**

- Sem conceito de "grupo" — todos os addons de um produto são uma lista plana
- Sem `sortOrder` nos addons
- Sem `isDefault` (ingrediente incluído por padrão vs. adicional opcional)
- Sem `minSelections` no nível de grupo (apenas `isRequired` booleano no addon)
- Sem `type` para diferenciar "remover ingrediente" de "adicionar extra"
- Sem flag por produto para habilitar/desabilitar customização

### 3.2 O que já existe na API

| Rota                                        | Situação                                 |
| ------------------------------------------- | ---------------------------------------- |
| `GET /api/restaurants/:rId/products`        | Inclui `addons[]` no retorno             |
| `GET /api/restaurants/:rId/products/:pId`   | Inclui `addons[]`                        |
| `POST /api/restaurants/:rId/products`       | Não persiste addons                      |
| `PATCH /api/restaurants/:rId/products/:pId` | Não persiste addons                      |
| `GET /api/restaurants/:rId/menu`            | **Não inclui addons** no retorno público |
| Rotas de addons (`/addons/*`)               | **Não existem**                          |

### 3.3 O que já existe nos componentes

| Componente                | Situação                                                           |
| ------------------------- | ------------------------------------------------------------------ |
| `digital-menu-client.tsx` | Campo `notes?: string` no `CartItem`, mas sem UI para addons       |
| `menu-management.tsx`     | CRUD de categoria/produto, **sem UI de addons**                    |
| `order-print-receipt.tsx` | Já renderiza `item.addons[]` se presente (via `PrintItem.addons?`) |
| `placeOrder()`            | Envia `addons: []` hardcoded — sem seleção real                    |

### 3.4 Resumo dos gaps

```
Banco:    Tabela existe mas sem grupos e sem metadados suficientes
API:      Sem rotas de CRUD de addons; menu público não expõe addons
Manager:  Sem UI para gerenciar grupos/addons por produto
Digital:  Sem UI de seleção; campo de observação existe mas sem UI visível
Pedido:   addons enviados como [] sempre; cozinha não vê customizações
```

---

## 4. Modelo Conceitual

### 4.1 Entidades

```
Product
  ├── allowCustomization: boolean    ← toggle por produto
  └── ModifierGroup[]
        ├── id
        ├── productId
        ├── restaurantId
        ├── name                     ← "Ingredientes", "Adicionais", "Ponto da carne"
        ├── type                     ← INGREDIENT | ADDON | REQUIRED_CHOICE
        ├── minSelections            ← 0 = opcional, 1+ = obrigatório
        ├── maxSelections            ← 1 = único, 999 = ilimitado
        ├── sortOrder
        └── ModifierOption[]
              ├── id
              ├── groupId
              ├── name               ← "Mussarela", "Extra Bacon", "Bem passado"
              ├── price              ← 0.00 para ingredientes; >0 para adicionais pagos
              ├── isDefault          ← true = vem no produto, cliente pode remover
              ├── isAvailable        ← false = 86'd (sem estoque)
              └── sortOrder
```

### 4.2 Tipos de Grupo

| Tipo              | `minSelections` | `maxSelections` | UI gerada               | Uso típico                                    |
| ----------------- | --------------- | --------------- | ----------------------- | --------------------------------------------- |
| `INGREDIENT`      | 0               | N (todos)       | Checkboxes pré-marcados | Lista de ingredientes padrão para remoção     |
| `ADDON`           | 0               | N               | Checkboxes desmarcados  | Adicionais opcionais pagos                    |
| `REQUIRED_CHOICE` | 1               | 1               | Radio buttons           | "Ponto da carne", "Tamanho", "Sabor da borda" |
| `REQUIRED_MULTI`  | 1               | N               | Checkboxes c/ contador  | "Escolha 2 molhos"                            |

> **Nota:** Do ponto de vista do banco, `INGREDIENT`, `ADDON`, `REQUIRED_CHOICE` e `REQUIRED_MULTI`
> são apenas valores do campo `type`. A UI decide como renderizar baseado na combinação de
> `type + minSelections + maxSelections`.

### 4.3 Fluxo de dados no pedido

```
CartItem (client-side)
  ├── productId
  ├── name
  ├── basePrice          ← preço base do produto
  ├── quantity
  ├── notes?             ← observação livre
  └── selectedOptions[]
        ├── optionId
        ├── optionName   ← snapshot para exibição
        ├── price        ← snapshot do preço no momento
        └── isRemoval    ← true = "remover ingrediente padrão"

OrderItem (banco → pedido)
  └── addons: OrderItemAddon[]
        ├── addonId      ← FK para ModifierOption
        ├── quantity
        └── unitPrice    ← snapshot
```

### 4.4 Cálculo de preço

```
// Sem divisão:
itemTotal = (basePrice + Σ selectedOption.price) × quantity

// Com divisão (ver Seção 15):
splitBasePrice = applySplitPriceRule(splits[], product.splitPriceRule)
itemTotal      = (splitBasePrice + Σ selectedOption.price) × quantity
```

### 4.5 Modelo de Divisão em Partes

Veja a **Seção 15** para o modelo conceitual completo. Em resumo, um produto divisível carrega:

```
Product
  ├── allowSplit: boolean           ← false por padrão
  ├── maxSplits: 2 | 3 | 4         ← número exato de partes permitidas
  ├── splitPriceRule: enum          ← HIGHEST | AVERAGE | SUM
  └── splitFlavors: Product[]       ← produtos elegíveis como "parte"

CartItem (quando dividido)
  └── splits: SplitSelection[]
        ├── splitIndex              ← 0 = 1ª parte, 1 = 2ª parte, ...
        ├── productId               ← sabor escolhido
        ├── productName             ← snapshot
        └── price                   ← snapshot do preço do sabor
```

---

## 5. Esquema de Banco de Dados

### 5.1 Alterações necessárias

#### 5.1.1 Tabela `products` — novas colunas

```sql
ALTER TABLE products ADD COLUMN allow_customization BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE products ADD COLUMN allow_split         BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE products ADD COLUMN max_splits          INT     NOT NULL DEFAULT 2;
ALTER TABLE products ADD COLUMN split_price_rule    VARCHAR NOT NULL DEFAULT 'HIGHEST';
```

Em Prisma:

```prisma
enum SplitPriceRule {
  HIGHEST  // preço da parte mais cara (padrão)
  AVERAGE  // média das partes
  SUM      // soma total (uso raro)
}

model Product {
  // ... colunas existentes ...
  allowCustomization Boolean        @default(false)
  allowSplit         Boolean        @default(false)
  maxSplits          Int            @default(2)       // 2, 3 ou 4
  splitPriceRule     SplitPriceRule @default(HIGHEST)

  modifierGroups ModifierGroup[]
  splitFlavors   ProductSplitFlavor[] @relation("SplitSource")
  usedAsSplit    ProductSplitFlavor[] @relation("SplitFlavor")
}
```

#### 5.1.2 Nova tabela `modifier_groups`

```prisma
model ModifierGroup {
  id              String             @id @default(cuid())
  restaurantId    String
  productId       String
  name            String             // "Ingredientes", "Adicionais", "Ponto da carne"
  type            ModifierGroupType  @default(ADDON)
  minSelections   Int                @default(0)
  maxSelections   Int                @default(1)
  sortOrder       Int                @default(0)

  restaurant  Restaurant       @relation(...)
  product     Product          @relation(...)
  options     ModifierOption[]

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  @@index([productId])
  @@map("modifier_groups")
}

enum ModifierGroupType {
  INGREDIENT       // ingredientes padrão (pré-marcados, cliente remove)
  ADDON            // adicionais opcionais (desmarcados, cliente adiciona)
  REQUIRED_CHOICE  // escolha obrigatória única (radio)
  REQUIRED_MULTI   // escolha obrigatória múltipla (checkboxes com mínimo)
}
```

#### 5.1.3 Nova tabela `modifier_options`

```prisma
model ModifierOption {
  id          String  @id @default(cuid())
  groupId     String
  name        String
  price       Decimal @db.Decimal(10, 2) @default(0)
  isDefault   Boolean @default(false)  // vem no produto por padrão
  isAvailable Boolean @default(true)   // false = 86'd
  sortOrder   Int     @default(0)

  group           ModifierGroup    @relation(...)
  orderItemAddons OrderItemAddon[]

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  @@index([groupId])
  @@map("modifier_options")
}
```

#### 5.1.4 Alterar `order_item_addons`

Atualmente referencia `ProductAddon`. Com o novo modelo, deve referenciar `ModifierOption`:

```prisma
model OrderItemAddon {
  id          String  @id @default(cuid())
  orderItemId String
  optionId    String  // ← renomear de addonId para optionId
  quantity    Int     @default(1)
  unitPrice   Decimal @db.Decimal(10, 2)
  isRemoval   Boolean @default(false)  // true = cliente removeu ingrediente padrão

  orderItem OrderItem      @relation(...)
  option    ModifierOption @relation(...)

  @@map("order_item_addons")
}
```

#### 5.1.5 Tabela `product_addons` — deprecação

A tabela `product_addons` existente deve ser migrada para o novo modelo e depois removida. Plano:

1. Criar as novas tabelas `modifier_groups` + `modifier_options`
2. Migrar dados existentes de `product_addons` para o novo modelo (cada addon vira um `ModifierGroup`
   do tipo `ADDON` com uma única `ModifierOption`)
3. Manter `product_addons` como read-only durante a transição
4. Remover `product_addons` após validação em produção

> **Decisão de implementação:** Na primeira versão, os addons legados podem ser mantidos em
> `product_addons` em paralelo com o novo modelo, para evitar uma migração big-bang.

#### 5.1.6 Nova tabela `product_split_flavors`

Mapeia quais produtos podem ser usados como "parte" de um produto divisível.

```prisma
model ProductSplitFlavor {
  id              String  @id @default(cuid())
  restaurantId    String
  sourceProductId String  // produto-base que pode ser dividido (ex.: "Pizza")
  flavorProductId String  // produto que pode ser escolhido como parte (ex.: "Marguerita")
  sortOrder       Int     @default(0)
  isAvailable     Boolean @default(true) // false = temporariamente indisponível como parte

  restaurant     Restaurant @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  sourceProduct  Product    @relation("SplitSource",  fields: [sourceProductId], references: [id])
  flavorProduct  Product    @relation("SplitFlavor",  fields: [flavorProductId], references: [id])

  @@unique([sourceProductId, flavorProductId])
  @@index([sourceProductId])
  @@map("product_split_flavors")
}
```

#### 5.1.7 Nova tabela `order_item_splits`

Registra a divisão de partes de um `OrderItem` no pedido.

```prisma
model OrderItemSplit {
  id           String  @id @default(cuid())
  orderItemId  String
  splitIndex   Int     // 0 = 1ª parte, 1 = 2ª parte, etc.
  productId    String  // snapshot: ID do sabor escolhido
  productName  String  // snapshot: nome do sabor
  unitPrice    Decimal @db.Decimal(10, 2) // snapshot do preço do sabor (para cálculo)

  orderItem OrderItem @relation(fields: [orderItemId], references: [id], onDelete: Cascade)

  @@index([orderItemId])
  @@map("order_item_splits")
}
```

`OrderItem` também recebe a relação:

```prisma
model OrderItem {
  // ... colunas existentes ...
  splits  OrderItemSplit[]
}
```

### 5.2 Schema de `restaurant.settings`

O campo `settings: Json` na tabela `restaurants` deve incluir:

```json
{
  "customization": {
    "enabled": true,
    "allowFreeTextObservation": true,
    "maxObservationLength": 200
  }
}
```

| Campo                      | Padrão  | Descrição                                                |
| -------------------------- | ------- | -------------------------------------------------------- |
| `enabled`                  | `false` | Master toggle: habilita toda customização no restaurante |
| `allowFreeTextObservation` | `true`  | Mostra campo "Observações" no cardápio digital           |
| `maxObservationLength`     | `200`   | Limite de chars na observação livre                      |

---

## 6. Contratos de API

### 6.1 Endpoints novos

#### `GET /api/restaurants/:rId/products/:pId/modifier-groups`

Retorna todos os grupos de modificadores de um produto.

**Response:**

```json
{
  "data": [
    {
      "id": "cm_...",
      "name": "Ingredientes",
      "type": "INGREDIENT",
      "minSelections": 0,
      "maxSelections": 10,
      "sortOrder": 0,
      "options": [
        {
          "id": "co_...",
          "name": "Mussarela",
          "price": 0,
          "isDefault": true,
          "isAvailable": true,
          "sortOrder": 0
        },
        {
          "id": "co_...",
          "name": "Tomate",
          "price": 0,
          "isDefault": true,
          "isAvailable": true,
          "sortOrder": 1
        }
      ]
    },
    {
      "id": "cm_...",
      "name": "Adicionais",
      "type": "ADDON",
      "minSelections": 0,
      "maxSelections": 5,
      "sortOrder": 1,
      "options": [
        {
          "id": "co_...",
          "name": "Extra Mussarela",
          "price": 300,
          "isDefault": false,
          "isAvailable": true,
          "sortOrder": 0
        },
        {
          "id": "co_...",
          "name": "Bacon",
          "price": 500,
          "isDefault": false,
          "isAvailable": true,
          "sortOrder": 1
        }
      ]
    }
  ]
}
```

> **Nota de preço:** Preços em centavos (int) para evitar problemas de floating point.

#### `POST /api/restaurants/:rId/products/:pId/modifier-groups`

Cria um grupo de modificadores. Requer role `MANAGER`.

**Body:**

```json
{
  "name": "Adicionais",
  "type": "ADDON",
  "minSelections": 0,
  "maxSelections": 3,
  "sortOrder": 1
}
```

#### `PATCH /api/restaurants/:rId/modifier-groups/:groupId`

Atualiza grupo (nome, tipo, min/max, sortOrder). Requer `MANAGER`.

#### `DELETE /api/restaurants/:rId/modifier-groups/:groupId`

Soft delete do grupo e todas as suas options. Requer `MANAGER`.

#### `POST /api/restaurants/:rId/modifier-groups/:groupId/options`

Adiciona uma option ao grupo.

**Body:**

```json
{
  "name": "Extra Bacon",
  "price": 500,
  "isDefault": false,
  "sortOrder": 0
}
```

#### `PATCH /api/restaurants/:rId/modifier-options/:optionId`

Atualiza uma option (nome, preço, disponibilidade, sortOrder).

#### `DELETE /api/restaurants/:rId/modifier-options/:optionId`

Remove uma option.

### 6.2 Endpoints modificados

#### `GET /api/restaurants/:rId/menu` (público)

Deve incluir `modifierGroups` quando `allowCustomization: true` no produto:

```json
{
  "data": [
    {
      "id": "cat_...",
      "name": "Pizzas",
      "products": [
        {
          "id": "prod_...",
          "name": "Marguerita",
          "price": 4500,
          "allowCustomization": true,
          "modifierGroups": [
            /* grupos completos com options */
          ]
        }
      ]
    }
  ]
}
```

Quando `allowCustomization: false`, o campo `modifierGroups` é omitido.

#### `POST /api/restaurants/:rId/orders` (criar pedido)

O body de cada item deve aceitar o array de options selecionadas:

```json
{
  "items": [
    {
      "productId": "prod_...",
      "quantity": 1,
      "notes": "Caprichar no molho",
      "selectedOptions": [
        { "optionId": "co_...", "quantity": 1 },
        { "optionId": "co_...", "quantity": 1, "isRemoval": true }
      ]
    }
  ]
}
```

O backend calcula o preço total do item com base em:

```
unitPrice = product.price + Σ (option.price × qty) de não-removals
```

#### `GET /api/restaurants/:rId/products/:pId/split-flavors`

Retorna os sabores disponíveis para divisão de um produto. Acesso público (mesmo endpoint de menu).

**Response:**

```json
{
  "data": [
    {
      "id": "psf_...",
      "flavorProductId": "prod_...",
      "name": "Marguerita",
      "price": 4500,
      "isAvailable": true,
      "sortOrder": 0
    },
    {
      "id": "psf_...",
      "flavorProductId": "prod_...",
      "name": "Da Casa",
      "price": 5200,
      "isAvailable": true,
      "sortOrder": 1
    }
  ]
}
```

#### `POST /api/restaurants/:rId/products/:pId/split-flavors`

Adiciona um sabor ao pool de divisão. Requer `MANAGER`.

**Body:**

```json
{ "flavorProductId": "prod_...", "sortOrder": 0 }
```

#### `PATCH /api/restaurants/:rId/split-flavors/:splitFlavorId`

Atualiza disponibilidade ou sortOrder de um sabor. Requer `MANAGER`.

#### `DELETE /api/restaurants/:rId/split-flavors/:splitFlavorId`

Remove um sabor do pool. Requer `MANAGER`.

#### Endpoint `POST /api/restaurants/:rId/orders` — splits

O body de cada item aceita `splits[]` quando o produto é divisível:

```json
{
  "items": [
    {
      "productId": "prod_pizza_base",
      "quantity": 1,
      "notes": "Borda de catupiry",
      "splits": [
        { "splitIndex": 0, "flavorProductId": "prod_marguerita" },
        { "splitIndex": 1, "flavorProductId": "prod_da_casa" }
      ],
      "selectedOptions": [{ "optionId": "co_catupiry", "quantity": 1, "isRemoval": false }]
    }
  ]
}
```

O backend:

1. Valida que `splits.length === product.maxSplits`
2. Valida que cada `flavorProductId` pertence ao pool do produto
3. Calcula `unitPrice` via `splitPriceRule`
4. Persiste `OrderItemSplit[]` com snapshots de preço e nome

#### `GET /api/restaurants/:rId/menu` — atualização para splits

Produtos com `allowSplit: true` incluem os campos de divisão:

```json
{
  "id": "prod_...",
  "name": "Pizza",
  "price": 4500,
  "allowCustomization": true,
  "allowSplit": true,
  "maxSplits": 2,
  "splitPriceRule": "HIGHEST",
  "splitFlavors": [
    {
      "flavorProductId": "prod_...",
      "name": "Marguerita",
      "price": 4500,
      "isAvailable": true,
      "sortOrder": 0
    },
    {
      "flavorProductId": "prod_...",
      "name": "Da Casa",
      "price": 5200,
      "isAvailable": true,
      "sortOrder": 1
    }
  ],
  "modifierGroups": [
    /* grupos de ingredientes/adicionais da pizza base */
  ]
}
```

### 6.3 Validações de negócio na API

- Se grupo `minSelections > 0` e nenhuma option do grupo foi enviada → retornar `400`
- Se quantidade de options selecionadas no grupo excede `maxSelections` → retornar `400`
- Se `optionId` não pertence ao produto → retornar `400`
- Preço de option é snapshotado no momento da criação do pedido
- Se produto tem `allowSplit: true` e `splits[]` foi enviado: `splits.length` deve ser igual a `product.maxSplits` → senão `400`
- Se `flavorProductId` não está no pool do produto → retornar `400`
- Se sabor marcado como `isAvailable: false` for enviado → retornar `400`

---

## 7. Fluxos de UX

### 7.1 Cardápio Digital — Cliente

#### 7.1.1 Fluxo atual (sem personalização)

```
Lista de produtos → Toca no produto → Produto adicionado ao carrinho diretamente
```

#### 7.1.2 Fluxo novo (com personalização ativa no produto)

```
Lista de produtos
  → Toca no produto com allowCustomization: true
    → Abre "Product Detail Sheet" (bottom sheet mobile / modal desktop)
      ├── Imagem + nome + descrição + preço base
      ├── [Se allowSplit: true] Seção "Dividir em partes?":
      │   ├── Toggle "Quero dividir" (padrão: desligado)
      │   └── [Se ligado] N seletores de sabor (ver fluxo 7.1.5)
      ├── Para cada ModifierGroup (em ordem de sortOrder):
      │   ├── Cabeçalho: nome do grupo + badge "Obrigatório" ou "Opcional"
      │   ├── Contador: "Escolha até N" ou "Escolha X"
      │   └── Para cada option:
      │       ├── INGREDIENT: checkbox pré-marcado (desmarcar = remover)
      │       ├── ADDON: checkbox desmarcado (marcar = adicionar + preço)
      │       └── REQUIRED_CHOICE: radio button
      ├── Campo "Observações" (se allowFreeTextObservation: true)
      ├── Preço total calculado dinamicamente
      └── Botão "Adicionar ao carrinho" (desabilitado se grupos obrigatórios não preenchidos
                                         OU se divisão ativada e nem todos os sabores escolhidos)
```

#### 7.1.5 Fluxo de divisão em partes (novo)

```
[Cliente ativa "Dividir em partes"]
  → Aparecem N cards/slots numerados ("1ª parte", "2ª parte", ...)
  → Cada slot exibe:
      ├── Droplist/Sheet de sabores disponíveis (nome + preço)
      └── Preço do sabor selecionado
  → Enquanto algum slot não foi preenchido:
      └── Botão "Adicionar ao carrinho" permanece desabilitado
  → Conforme sabores são selecionados:
      └── Preço total é recalculado em tempo real:
          ├── HIGHEST: exibe o preço da parte mais cara
          ├── AVERAGE: exibe a média
          └── Mostra linha de resumo: "½ Marguerita + ½ Da Casa"
  → [Cliente desativa toggle]
      └── Slots somem; volta ao preço base do produto
```

**Exemplo de visual no Product Detail Sheet (2 sabores):**

```
┌──────────────────────────────────────────┐
│ Pizza                          R$ 52,00 │
│ ─────────────────────────────────────── │
│ ○ Pizza inteira  ● Dividir em 2 partes  │
│                                          │
│ 1ª Metade                               │
│ [▼ Marguerita               R$45,00]    │
│                                          │
│ 2ª Metade                               │
│ [▼ Da Casa                  R$52,00]    │
│                                          │
│ Adicionais (opcional)                   │
│ ☐ Extra Cheddar             +R$ 3,00   │
│                                          │
│ Observações                             │
│ [Borda de catupiry         ]            │
│ ─────────────────────────────────────── │
│       [Adicionar · R$52,00]             │
└──────────────────────────────────────────┘
```

> **Nota UX:** O preço exibido no botão reflete a regra `HIGHEST` — o sabor mais caro da divisão
> define o preço, independente de quantas partes têm preço menor.

#### 7.1.3 Produto sem personalização

Produtos com `allowCustomization: false` continuam funcionando como hoje: toque direto adiciona ao
carrinho (sem abrir bottom sheet).

> **Exceção:** Mesmo sem grupos, se `allowFreeTextObservation: true`, o carrinho deve oferecer um
> ícone de edição por item para o cliente digitar uma observação livre.

#### 7.1.4 Estados do Product Detail Sheet

| Estado           | Gatilho                                               |
| ---------------- | ----------------------------------------------------- |
| Loading          | Enquanto carrega grupos (se não vieram junto ao menu) |
| Vazio            | Nenhum grupo configurado → mostrar só observação      |
| Validação inline | Grupo obrigatório não preenchido → label em vermelho  |
| Adicionando      | Spinner no botão                                      |

### 7.2 Gestor (Manager App) — Configuração de Produto

#### 7.2.1 Tela de Cardápio — lista de produtos

Cada produto na lista passa a exibir:

- Badge "Personalização ativa" se `allowCustomization: true`
- Badge com contagem de grupos: "3 grupos"
- Botão/link "Configurar personalização" (ícone de ajustes)

#### 7.2.2 ProductModal — aba de personalização

O `ProductModal` em `menu-management.tsx` deve ganhar uma segunda aba (ou seção expansível):
**"Personalização"**, visível apenas para role `MANAGER`.

Conteúdo da aba — duas sub-seções:

**Sub-seção A: Divisão em partes**

1. Toggle "Permitir dividir este produto" (`allowSplit`)
2. Se habilitado:
   - Select "Número de partes" → 2 / 3 / 4 (`maxSplits`)
   - Select "Regra de preço" → "Mais caro" / "Média" / "Soma" (`splitPriceRule`)
   - Lista de sabores disponíveis: nome + preço + badge disponível/indisponível
   - Ações por sabor: reordenar / marcar indisponível / remover
   - Botão "+ Adicionar sabor" → abre seletor de produtos do restaurante

**Sub-seção B: Grupos de modificadores**

1. Toggle "Permitir personalização neste produto" (`allowCustomization`)
2. Lista de grupos (se `allowCustomization: true`):
   - Nome do grupo
   - Tipo + min/max
   - Lista de options com preço
   - Ações: editar / reordenar (drag-to-reorder) / excluir
3. Botão "+ Novo grupo"

#### 7.2.3 ModifierGroupModal — criar/editar grupo

| Campo  | Tipo         | Notas                                                      |
| ------ | ------------ | ---------------------------------------------------------- |
| Nome   | text input   | Ex.: "Ingredientes", "Adicionais"                          |
| Tipo   | select       | `INGREDIENT`, `ADDON`, `REQUIRED_CHOICE`, `REQUIRED_MULTI` |
| Mínimo | number input | 0..maxSelections                                           |
| Máximo | number input | 1..N                                                       |

#### 7.2.4 ModifierOptionModal — criar/editar option

| Campo              | Tipo           | Notas                                 |
| ------------------ | -------------- | ------------------------------------- |
| Nome               | text input     | Ex.: "Mussarela", "Extra Bacon"       |
| Preço adicional    | currency input | 0 para sem custo                      |
| Ingrediente padrão | checkbox       | Pré-marcado no cardápio digital       |
| Disponível         | toggle         | false = 86'd, não aparece no cardápio |

#### 7.2.5 Configurações globais do restaurante

Em `settings.tsx` (aba de Cardápio ou nova aba "Personalização"):

- Toggle mestre "Habilitar personalização de itens"
- Toggle "Permitir observação livre"
- Campo "Limite de caracteres da observação" (padrão: 200)

### 7.3 Cozinha (Kitchen Screen)

O `kitchen-screen.tsx` deve exibir as customizações de cada item:

**Sem divisão:**

```
┌─────────────────────────────────────┐
│ #42 · Pizza Marguerita · x1         │
│ ── Removidos: Orégano               │
│ ── Adicionados: Extra Mussarela     │
│ ── Obs: "Caprichar no molho"        │
└─────────────────────────────────────┘
```

**Com divisão em partes:**

```
┌─────────────────────────────────────┐
│ #43 · Pizza [2 sabores] · x1        │
│    ½  Marguerita                    │
│    ½  Da Casa                       │
│ ── Adicionado: Cheddar              │
│ ── Obs: "Borda de catupiry"         │
└─────────────────────────────────────┘
```

Regras de exibição na cozinha:

- Partes da divisão em **azul** com fração (½, ⅓, ¼) — exibidas antes dos modificadores
- Remoções em **vermelho** com ícone X (são críticas — não colocar o ingrediente)
- Adições em **verde** com ícone +
- Observação livre em **âmbar** com ícone de nota

---

## 8. Mapa de Componentes

### 8.1 Componentes novos

| Componente                  | Caminho                                             | Responsabilidade                                                                                             |
| --------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `ProductDetailSheet`        | `src/features/menu/product-detail-sheet.tsx`        | Bottom sheet do cardápio digital com grupos de modificadores, divisão em partes, observação e preço dinâmico |
| `SplitSelector`             | `src/features/menu/split-selector.tsx`              | UI de seleção de sabores por slot (toggle + N seletores); exibe preço dinâmico pela regra configurada        |
| `ModifierGroupSection`      | `src/features/menu/modifier-group-section.tsx`      | Renderiza um grupo de modificadores (INGREDIENT/ADDON/REQUIRED_CHOICE) com a UI correta                      |
| `ModifierGroupModal`        | `src/features/menu/modifier-group-modal.tsx`        | CRUD de grupo no gestor                                                                                      |
| `ModifierOptionModal`       | `src/features/menu/modifier-option-modal.tsx`       | CRUD de option no gestor                                                                                     |
| `ProductCustomizationPanel` | `src/features/menu/product-customization-panel.tsx` | Painel completo de gestão de grupos/options + configuração de divisão dentro do ProductModal                 |
| `SplitFlavorPicker`         | `src/features/menu/split-flavor-picker.tsx`         | Seletor de sabores no gestor: mostra produtos disponíveis para associar como sabores                         |

### 8.2 Componentes modificados

| Componente                | Mudança                                                                                                                |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `digital-menu-client.tsx` | `CartItem` recebe `selectedOptions[]` e `notes`; `addToCart()` abre `ProductDetailSheet` se `allowCustomization: true` |
| `menu-management.tsx`     | `ProductModal` ganha aba/seção "Personalização"; lista de produtos mostra badges de grupos                             |
| `order-print-receipt.tsx` | `buildReceiptLines()` já contempla addons; verificar compatibilidade com novo modelo                                   |
| `kitchen-screen.tsx`      | Exibe remoções (vermelho), adições (verde) e observação (âmbar) por item                                               |
| `order-detail-modal.tsx`  | Exibe customizações na preview do recibo                                                                               |

### 8.3 Interfaces TypeScript relevantes

```typescript
// CartItem expandido
interface CartItem {
  productId: string;
  name: string;
  basePrice: number; // preço base (sem adicionais; ignorado se splits presente)
  quantity: number;
  notes?: string;
  selectedOptions: SelectedOption[];
  splits?: SplitSelection[]; // presente se o cliente dividiu o produto
}

interface SelectedOption {
  optionId: string;
  optionName: string; // snapshot para exibição
  price: number; // snapshot do preço
  isRemoval: boolean; // true = cliente removeu ingrediente padrão
}

interface SplitSelection {
  splitIndex: number; // 0 = 1ª parte, 1 = 2ª parte, ...
  productId: string; // ID do sabor (flavorProductId)
  productName: string; // snapshot do nome
  price: number; // snapshot do preço base do sabor
}

// Cálculo de preço base efetivo
function getEffectiveBasePrice(
  item: CartItem,
  splitPriceRule: "HIGHEST" | "AVERAGE" | "SUM"
): number {
  if (!item.splits || item.splits.length === 0) return item.basePrice;
  const prices = item.splits.map((s) => s.price);
  switch (splitPriceRule) {
    case "HIGHEST":
      return Math.max(...prices);
    case "AVERAGE":
      return prices.reduce((a, b) => a + b, 0) / prices.length;
    case "SUM":
      return prices.reduce((a, b) => a + b, 0);
  }
}

// Preço unitário do item
const itemUnitPrice =
  getEffectiveBasePrice(item, product.splitPriceRule) +
  item.selectedOptions.filter((o) => !o.isRemoval).reduce((acc, o) => acc + o.price, 0);
```

```typescript
// Produto no menu público com grupos
interface MenuProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  allowCustomization: boolean;
  modifierGroups?: ModifierGroup[];
}

interface ModifierGroup {
  id: string;
  name: string;
  type: "INGREDIENT" | "ADDON" | "REQUIRED_CHOICE" | "REQUIRED_MULTI";
  minSelections: number;
  maxSelections: number;
  sortOrder: number;
  options: ModifierOption[];
}

interface ModifierOption {
  id: string;
  name: string;
  price: number;
  isDefault: boolean;
  isAvailable: boolean;
  sortOrder: number;
}
```

---

## 9. Regras de Negócio

### 9.1 Configuração

1. Se `restaurant.settings.customization.enabled = false`, nenhum produto exibe personalização,
   independente de `product.allowCustomization`.
2. `product.allowCustomization` só tem efeito se o toggle de restaurante estiver habilitado.
3. Produtos `isInternalOnly: true` seguem as mesmas regras de personalização.

### 9.2 Validação de pedido

4. Grupos com `minSelections > 0` são obrigatórios: o pedido não pode ser criado sem pelo menos
   `minSelections` options selecionadas daquele grupo.
5. O número de options selecionadas por grupo deve ser `≤ maxSelections`.
6. Options marcadas como `isAvailable: false` não podem ser selecionadas (frontend e backend validam).
7. O preço de cada option é snapshotado no `OrderItemAddon.unitPrice` no momento do pedido.

### 9.3 Remoção de ingredientes

8. Uma option do tipo `INGREDIENT` com `isDefault: true` representa um ingrediente padrão.
   Quando o cliente DESMARCA esse ingrediente, é criado um `OrderItemAddon` com `isRemoval: true`.
9. Remoções não alteram o preço do item (price = 0 nas options de ingrediente).
10. Uma remoção é exibida na cozinha como instrução crítica.

### 9.4 Adicionais pagos

11. Options com `price > 0` incrementam o preço do item.
12. O `subtotal` do pedido e o `total` do `OrderItem` devem refletir adicionais pagos.
13. Adicionais aparecem na nota fiscal/recibo com nome e preço unitário.

### 9.5 Observação livre

14. A observação livre (`OrderItem.notes`) é um campo de texto simples, não estruturado.
15. Limite configurável via `settings.customization.maxObservationLength` (padrão: 200).
16. A observação é exibida na cozinha e no recibo.

### 9.6 Exclusão de grupos/options

17. Excluir um `ModifierGroup` ou `ModifierOption` faz soft delete (`deletedAt`).
18. `OrderItemAddon` registros históricos que referenciam options deletadas são preservados
    (a option deletada deve ser mantida no banco para integridade referencial histórica).

### 9.7 Regras de divisão em partes

19. `allowSplit` só pode ser habilitado se o toggle mestre do restaurante estiver ativo.
20. Um produto pode ter `allowSplit: true` e `allowCustomization: true` simultaneamente — os
    modificadores (ingredientes/adicionais) se aplicam ao produto como um todo, não por parte.
21. `splits.length` enviado no pedido deve ser **exatamente igual** a `product.maxSplits` — nem
    mais, nem menos. O cliente não pode pedir "½ e inteira" no mesmo item.
22. Cada `flavorProductId` deve pertencer ao `splitFlavors` do produto-base.
23. O mesmo sabor pode ser repetido em múltiplas partes (ex.: "pizza inteira de marguerita"
    = 2× `splitIndex` com o mesmo `flavorProductId`).
24. Sabores com `isAvailable: false` são **ocultos** no cardápio digital; se enviados na API,
    a requisição retorna `400`.
25. O preço final do item usa `splitPriceRule` do produto-base — não pode ser sobrescrito pelo
    cliente.
26. `OrderItemSplit` registros são imutáveis após criação (snapshot histórico).
27. Ao excluir um produto do catálogo (soft delete), o produto continua acessível via
    `order_item_splits.productId` para histórico, mas deve ser removido do pool de
    `product_split_flavors` de outros produtos.

---

## 10. Impacto no Recibo Térmico

O `order-print-receipt.tsx` já tem suporte ao campo `addons` na interface `PrintItem`:

```typescript
interface PrintItem {
  quantity: number;
  product: { name: string };
  unitPrice: number;
  notes?: string;
  addons?: { name: string; unitPrice: number; quantity: number }[];
}
```

Com o novo modelo, a serialização do recibo deve:

1. **Partes da divisão** → listadas antes de modificadores, com fração + nome do sabor
2. **Adicionais pagos** → listados abaixo com `  + Nome (R$X,XX)`
3. **Remoções** → listadas com `  - Sem Nome`
4. **Observação livre** → listada com `  * Obs: texto`

**Exemplo — item simples (sem divisão):**

```
────────────────────────────────────────────────
1x Pizza Marguerita                    R$45,00
   - Sem Oregano
   + Extra Mussarela              +R$  3,00
   * Caprichar no molho
────────────────────────────────────────────────
```

**Exemplo — item dividido em 2 partes:**

```
────────────────────────────────────────────────
1x Pizza [2 sabores]                   R$52,00
   1/2 Marguerita
   1/2 Da Casa
   + Cheddar                      +R$  3,00
   * Borda de catupiry
────────────────────────────────────────────────
```

**Exemplo — item dividido em 4 partes:**

```
────────────────────────────────────────────────
1x Pizza [4 sabores]                   R$58,00
   1/4 Marguerita
   1/4 Da Casa
   1/4 Portuguesa
   1/4 Frango Catupiry
────────────────────────────────────────────────
```

Regras de formatação:

- Fração exibida como `1/2`, `1/3`, `1/4` (não Unicode ½ ⅓ ¼ — pode não imprimir na Bematech)
- Linha de parte não deve exceder 48 chars; nome do sabor truncado com `…` se necessário
- Linha de adicional pago também não deve exceder 48 chars

---

## 11. Configuração por Restaurante

### 11.1 Toggle mestre

O restaurante pode desabilitar toda personalização via:

```json
// restaurant.settings
{
  "customization": {
    "enabled": false
  }
}
```

Nesse caso, o cardápio digital não exibe nenhum grupo ou campo de observação. O comportamento é
idêntico ao estado atual (adiciona ao carrinho com um toque, sem modal).

### 11.2 Toggle por produto

Mesmo com `customization.enabled: true` no restaurante, cada produto tem seu próprio
`allowCustomization: boolean`. Isso permite um cardápio misto onde:

- "Pizza Marguerita" tem grupos configurados (personalização ativa)
- "Refrigerante Lata" não tem grupos (personalização inativa, toque direto no carrinho)

### 11.3 Observação livre independente

`allowFreeTextObservation` é independente dos grupos. Um produto pode ter:

- Grupos de modificadores SEM observação livre
- Observação livre SEM grupos
- Ambos

---

## 12. Fora de Escopo (desta versão)

| Item                                        | Justificativa                                            |
| ------------------------------------------- | -------------------------------------------------------- |
| Modificadores aninhados (addon de addon)    | Complexidade excessiva para MVP                          |
| Modificadores por **parte** da divisão      | Complexidade alta; adicionais se aplicam ao produto todo |
| Imagens por option de modificador           | Pouco impacto, custo de upload alto                      |
| Estoque automático por option               | Requer integração com inventário — spec futura           |
| Preço negativo (substituição mais barata)   | Raro no mercado BR, complexidade desnecessária           |
| Modificadores por horário                   | Combinação com feature de horários — spec futura         |
| Arrastar-para-reordenar no cardápio digital | UX secundária, pode usar inputs de sortOrder             |
| Divisão com número variável de partes       | Restaurante define o `maxSplits` fixo por produto        |

---

## 13. Questões em Aberto

> Estas questões devem ser respondidas pelo produto antes do início da implementação.

| #   | Questão                                                                                                                                                                | Impacto                                            |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Q1  | Os dados legados de `product_addons` precisam ser migrados para o novo modelo, ou pode-se iniciar do zero (zero addons cadastrados hoje)?                              | Decisão de migração de schema                      |
| Q2  | O campo `product_addons` deve ser deprecated em paralelo ou removido na mesma migration?                                                                               | Risco de breaking change                           |
| Q3  | Qual o número máximo de grupos por produto? (sugestão: 10)                                                                                                             | Validação de schema + UX                           |
| Q4  | Qual o número máximo de options por grupo? (sugestão: 30)                                                                                                              | Validação de schema + UX                           |
| Q5  | Cozinheiro pode marcar uma option como "86'd" (indisponível) em tempo real?                                                                                            | Novo fluxo no kitchen-screen                       |
| Q6  | O preço dinâmico no cardápio digital deve aparecer atualizado inline ou apenas no resumo do carrinho?                                                                  | Decisão de UX                                      |
| Q7  | Grupos de ingredientes devem vir pré-expandidos ou colapsados no cardápio digital?                                                                                     | Decisão de UX                                      |
| Q8  | Pedidos feitos pelo garçom (waiter app) devem suportar customização da mesma forma?                                                                                    | Escopo do waiter app                               |
| Q9  | Um produto pode aparecer tanto como produto standalone quanto como sabor de divisão de outro produto? (sugestão: sim)                                                  | Sem impacto no schema — já funciona com a FK atual |
| Q10 | O cliente deve poder misturar divisão com produto inteiro no mesmo pedido? Ex.: 1x Pizza inteira + 1x Pizza dividida? (sugestão: sim — são dois `OrderItem` separados) | Sem impacto arquitetural                           |
| Q11 | O toggle "Dividir em partes" no cardápio digital deve vir desligado por padrão ou ligado?                                                                              | Decisão de UX                                      |
| Q12 | Cozinheiro deve ver o preço de cada sabor da divisão ou apenas o preço final do item?                                                                                  | Decisão de UX — impacta `kitchen-screen.tsx`       |

---

## 14. Glossário

| Termo                      | Definição                                                                               |
| -------------------------- | --------------------------------------------------------------------------------------- |
| **Grupo de Modificadores** | Conjunto nomeado de opções de personalização (ex.: "Ingredientes", "Adicionais")        |
| **Option / Opção**         | Escolha individual dentro de um grupo (ex.: "Mussarela", "Extra Bacon")                 |
| **Remoção**                | Quando o cliente desmarca um ingrediente padrão (`isRemoval: true`)                     |
| **Adicional pago**         | Option com `price > 0` que incrementa o valor do item                                   |
| **Ingrediente padrão**     | Option com `isDefault: true` — vem no produto a menos que removido                      |
| **86'd**                   | Gíria de cozinha (EUA) para item temporariamente indisponível (`isAvailable: false`)    |
| **Observação livre**       | Campo de texto livre (`OrderItem.notes`), sem estrutura                                 |
| **Toggle mestre**          | `restaurant.settings.customization.enabled` — habilita/desabilita a feature globalmente |
| **Snapshot de preço**      | Cópia do preço no momento do pedido, armazenada em `OrderItemAddon.unitPrice`           |
| **Produto divisível**      | Produto com `allowSplit: true` — pode ser dividido em partes no cardápio                |
| **Parte / Slot**           | Uma das N frações de um produto divisível (`SplitSelection`)                            |
| **Sabor**                  | Produto do catálogo associado como opção de divisão via `ProductSplitFlavor`            |
| **Pool de sabores**        | Lista de produtos elegíveis como partes de um produto divisível                         |
| **Regra de preço**         | `SplitPriceRule`: `HIGHEST` (mais caro), `AVERAGE` (média) ou `SUM`                     |
| **HIGHEST**                | Regra de preço padrão — o preço do item é o preço da parte mais cara                    |
| **maxSplits**              | Número fixo de partes em que o produto pode ser dividido (2, 3 ou 4)                    |

---

## Anexo A — Exemplo completo: Pizza Marguerita

### Configuração no gestor

```
Produto: Pizza Marguerita
  allowCustomization: true

  Grupo 1: "Ingredientes" (INGREDIENT, min:0, max:5)
    ☑ Mussarela        · isDefault: true  · R$ 0,00
    ☑ Tomate           · isDefault: true  · R$ 0,00
    ☑ Manjericão fresco· isDefault: true  · R$ 0,00
    ☐ Parmesão ralado  · isDefault: false · R$ 0,00  ← opcional, sem custo

  Grupo 2: "Adicionais" (ADDON, min:0, max:3)
    ☐ Extra Mussarela  · isDefault: false · R$ 3,00
    ☐ Cheddar          · isDefault: false · R$ 3,00
    ☐ Bacon            · isDefault: false · R$ 5,00
```

### Fluxo no cardápio digital

```
Cliente abre "Pizza Marguerita"

Ingredientes (todos pré-marcados):
  ☑ Mussarela
  ☑ Tomate
  ☐ Manjericão fresco  ← cliente desmarcou
  ☑ Parmesão ralado    ← cliente marcou

Adicionais (todos desmarcados):
  ☐ Extra Mussarela
  ☑ Cheddar (+R$3,00)  ← cliente marcou
  ☐ Bacon

Observações: "Caprichar no molho"

Preço: R$45,00 + R$3,00 (Cheddar) = R$48,00

[Adicionar ao carrinho · R$48,00]
```

### Payload enviado

```json
{
  "productId": "prod_marguerita",
  "quantity": 1,
  "notes": "Caprichar no molho",
  "selectedOptions": [
    { "optionId": "opt_manjericao", "quantity": 1, "isRemoval": true },
    { "optionId": "opt_parmesao", "quantity": 1, "isRemoval": false },
    { "optionId": "opt_cheddar", "quantity": 1, "isRemoval": false }
  ]
}
```

### Exibição na cozinha

```
┌─────────────────────────────────────────────┐
│ #42 · Mesa 07                               │
│                                             │
│ 1x Pizza Marguerita            R$ 48,00    │
│    ✗ Sem Manjericão fresco                  │
│    ✓ Parmesão ralado                        │
│    ✓ Cheddar                                │
│    ✎ "Caprichar no molho"                   │
└─────────────────────────────────────────────┘
```

### Recibo térmico (58mm)

```
════════════════════════════════════════════════
1x Pizza Marguerita                    R$48,00
   - Sem Manjericao fresco
   + Parmesao ralado
   + Cheddar                       +R$ 3,00
   * Caprichar no molho
────────────────────────────────────────────────
```

---

---

## 15. Divisão em Partes — Meio a Meio / Terços / Quartos

### 15.1 Visão geral

Alguns produtos (pizzas, calzones, massas recheadas, tapiocas, etc.) podem ser divididos em
partes iguais, onde cada parte recebe um sabor diferente do catálogo. O restaurante configura:

- **Se o produto pode ser dividido** (`allowSplit`)
- **Quantas partes** são permitidas (`maxSplits`: 2, 3 ou 4)
- **Quais produtos** podem ser usados como sabores (`splitFlavors`)
- **Como o preço é calculado** (`splitPriceRule`)

O cliente no cardápio digital vê o toggle de divisão apenas nos produtos que o restaurante
habilitou, e escolhe livremente um sabor para cada parte.

### 15.2 Modelo de dados completo

```
Product (pizza base)
  ├── allowSplit: true
  ├── maxSplits: 2
  ├── splitPriceRule: HIGHEST
  └── splitFlavors: ProductSplitFlavor[]
        ├── { flavorProductId: "prod_marguerita",      sortOrder: 0, isAvailable: true }
        ├── { flavorProductId: "prod_da_casa",         sortOrder: 1, isAvailable: true }
        ├── { flavorProductId: "prod_portuguesa",      sortOrder: 2, isAvailable: true }
        └── { flavorProductId: "prod_frango_catupiry", sortOrder: 3, isAvailable: false } ← 86'd

OrderItem (pedido com divisão)
  ├── productId: "prod_pizza_base"
  ├── quantity: 1
  ├── unitPrice: 5200  ← calculado: HIGHEST(4500, 5200) = 5200
  ├── notes: "Borda de catupiry"
  ├── splits: OrderItemSplit[]
  │     ├── { splitIndex: 0, productId: "prod_marguerita", productName: "Marguerita", unitPrice: 4500 }
  │     └── { splitIndex: 1, productId: "prod_da_casa",    productName: "Da Casa",    unitPrice: 5200 }
  └── addons: OrderItemAddon[]
        └── { optionId: "opt_cheddar", unitPrice: 300, quantity: 1, isRemoval: false }
```

### 15.3 Regras de preço

| Regra     | Fórmula        | Exemplo: ½ Marguerita (R$45) + ½ Da Casa (R$52)  |
| --------- | -------------- | ------------------------------------------------ |
| `HIGHEST` | `max(partes)`  | **R$ 52,00** ← padrão no Brasil                  |
| `AVERAGE` | `Σ partes / N` | R$ 48,50                                         |
| `SUM`     | `Σ partes`     | R$ 97,00 (incomum, uso em contextos específicos) |

> A regra `HIGHEST` é a prática padrão no mercado brasileiro (iFood, balcão). O cliente paga
> pelo sabor mais caro, independente de quantas partes têm preço menor.

### 15.4 Configuração no gestor — passo a passo

```
1. Abrir produto "Pizza" no modal de edição
2. Ir para aba "Personalização"
3. Sub-seção "Divisão em partes":
   [x] Permitir dividir este produto
   Número de partes: [2 ▼]
   Regra de preço:   [Mais caro (padrão) ▼]

4. Clicar "+ Adicionar sabor"
   → Abre seletor de produtos:
     Buscar: [margue...          ]
     ✓ Marguerita         R$45,00
       Da Casa             R$52,00
       Portuguesa          R$48,00
       Frango Catupiry     R$50,00
   → Selecionar "Marguerita" → aparece na lista de sabores

5. Repetir para todos os sabores desejados

6. Para desabilitar temporariamente um sabor:
   Toggle "Disponível" → false (86'd no cardápio)

7. Salvar produto
```

### 15.5 Cardápio digital — UX completa (pizza 2 sabores)

**Estado inicial (produto inteiro):**

```
[ Pizza ]                              R$45,00
○ Pizza inteira    ● Dividir em 2 partes
```

**Após ativar divisão:**

```
[ Pizza ]                              R$???
○ Pizza inteira    ● Dividir em 2 partes

1ª Metade
┌─────────────────────────────────────┐
│  Escolha um sabor...            [▼] │
└─────────────────────────────────────┘

2ª Metade
┌─────────────────────────────────────┐
│  Escolha um sabor...            [▼] │
└─────────────────────────────────────┘

[Adicionar ao carrinho]    ← desabilitado
```

**Após selecionar os dois sabores:**

```
[ Pizza ]                              R$52,00  ← HIGHEST
○ Pizza inteira    ● Dividir em 2 partes

1ª Metade
┌─────────────────────────────────────┐
│  Marguerita                 R$45,00 │
└─────────────────────────────────────┘

2ª Metade
┌─────────────────────────────────────┐
│  Da Casa                    R$52,00 │
└─────────────────────────────────────┘

Adicionais (opcional)
☑ Cheddar                      +R$3,00

[Adicionar ao carrinho · R$55,00]  ← 52 + 3
```

**Exibição no carrinho:**

```
Pizza                                R$55,00
  ½ Marguerita  +  ½ Da Casa
  + Cheddar
  [Editar]  [×]
```

### 15.6 Payload do pedido

```json
{
  "productId": "prod_pizza_base",
  "quantity": 1,
  "notes": null,
  "splits": [
    { "splitIndex": 0, "flavorProductId": "prod_marguerita" },
    { "splitIndex": 1, "flavorProductId": "prod_da_casa" }
  ],
  "selectedOptions": [{ "optionId": "opt_cheddar", "quantity": 1, "isRemoval": false }]
}
```

### 15.7 Exibição na cozinha

```
┌────────────────────────────────────────────┐
│ Pedido #43 · Mesa 04                       │
├────────────────────────────────────────────┤
│ 1× Pizza [2 sabores]           R$ 55,00   │
│   ● 1/2  Marguerita                        │
│   ● 1/2  Da Casa                           │
│   ✓ Cheddar (adicional)                    │
└────────────────────────────────────────────┘
```

### 15.8 Recibo térmico (58mm / 48 colunas)

```
════════════════════════════════════════════════
1x Pizza [2 sabores]                   R$55,00
   1/2 Marguerita
   1/2 Da Casa
   + Cheddar                       +R$ 3,00
────────────────────────────────────────────────
```

### 15.9 Exemplo com 4 sabores

```
Produto: Pizza [4 sabores]  (maxSplits: 4, splitPriceRule: HIGHEST)

Cliente escolhe:
  Parte 1: Marguerita      R$45,00
  Parte 2: Da Casa         R$52,00
  Parte 3: Portuguesa      R$48,00
  Parte 4: Frango Catupiry R$50,00

Preço final: HIGHEST(45, 52, 48, 50) = R$52,00

Recibo:
────────────────────────────────────────────────
1x Pizza [4 sabores]                   R$52,00
   1/4 Marguerita
   1/4 Da Casa
   1/4 Portuguesa
   1/4 Frango Catupiry
────────────────────────────────────────────────
```

---

_Este documento é a especificação para análise e planejamento. Nenhum código deve ser alterado com
base neste documento sem que as Questões em Aberto da seção 13 sejam respondidas e um ciclo de
implementação seja aberto formalmente._
