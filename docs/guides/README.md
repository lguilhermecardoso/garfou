# 📚 Guias do GARFOU

Esta pasta contém guias práticos e completos sobre funcionalidades específicas do sistema.

---

## 📋 **Índice de Guias**

### 🏢 **Multi-Restaurante**

- **Arquivo**: [`MULTI-RESTAURANTE.md`](./MULTI-RESTAURANTE.md)
- **Conteúdo**:
  - Como cadastrar nova unidade
  - Como trocar de restaurante no dashboard
  - Configuração de delivery zones
  - Taxa única de entrega
  - Uso de CurrencyInput e masked inputs
  - Estrutura de dados e permissões
  - Fluxo completo com diagramas
- **Atualização**: 2026-05-12
- **Status**: ✅ Completo e testado

### 📝 **Respostas às Perguntas Frequentes**

- **Arquivo**: [`RESPOSTAS-PERGUNTAS.md`](./RESPOSTAS-PERGUNTAS.md)
- **Conteúdo**:
  - 9 perguntas e respostas detalhadas sobre multi-restaurante
  - Exemplos de código para cada funcionalidade
  - Como testar cada feature
  - Referências cruzadas com outros documentos
- **Atualização**: 2026-05-12
- **Status**: ✅ Completo

### 👥 **Gestão de Equipe e Múltiplos Restaurantes**

- **Arquivo**: [`GESTAO-EQUIPE.md`](./GESTAO-EQUIPE.md)
- **Conteúdo**:
  - Arquitetura de membros por restaurante
  - Diferença entre `/onboarding` e `/restaurants/new`
  - Como adicionar/remover membros (OWNER apenas)
  - APIs de gestão de equipe
  - Permissões e hierarquia de roles
  - Fluxos de uso completos
  - Validações e estrutura de dados
- **Atualização**: 2026-01-12
- **Status**: ✅ Completo

---

## 🎯 **Quando Usar Cada Guia**

### Use **MULTI-RESTAURANTE.md** quando:

- ✅ Você quer entender como o multi-tenancy funciona
- ✅ Precisa cadastrar uma nova unidade de restaurante
- ✅ Quer configurar delivery zones ou taxa única
- ✅ Precisa entender permissões e roles
- ✅ Quer ver a estrutura de dados completa

### Use **RESPOSTAS-PERGUNTAS.md** quando:

- ✅ Tem dúvidas específicas sobre implementação
- ✅ Quer ver exemplos práticos de código
- ✅ Precisa testar funcionalidades passo a passo
- ✅ Quer entender o "porquê" de cada decisão técnica

### Use **GESTAO-EQUIPE.md** quando:

- ✅ Precisa adicionar membros à equipe do restaurante
- ✅ Quer entender a diferença entre onboarding e novos restaurantes
- ✅ Precisa implementar gestão de equipe (OWNER)
- ✅ Quer entender como membros podem estar em múltiplos restaurantes
- ✅ Precisa ver as APIs de team management

---

## 🔗 **Referências Cruzadas**

### Documentação Técnica:

- [`/docs/architecture/overview.md`](../architecture/overview.md) - Visão geral da arquitetura
- [`/docs/multi-tenancy/strategy.md`](../multi-tenancy/strategy.md) - Estratégia multi-tenant
- [`/AGENTS.md`](../../AGENTS.md) - Contexto para agentes IA

### Features:

- [`/docs/features/orders.md`](../features/orders.md) - Sistema de pedidos
- [`/docs/features/inventory.md`](../features/inventory.md) - Gestão de estoque
- [`/docs/features/delivery.md`](../features/delivery.md) - Sistema de delivery

### Specs:

- [`/docs/specs/master-spec.md`](../specs/master-spec.md) - Especificação completa
- [`/CHANGELOG.md`](../../CHANGELOG.md) - Histórico de mudanças

---

## 🚀 **Quick Start**

### Para Desenvolvedores:

1. Leia [`AGENTS.md`](../../AGENTS.md) primeiro (contexto geral)
2. Depois [`MULTI-RESTAURANTE.md`](./MULTI-RESTAURANTE.md) (funcionalidades)
3. Use [`RESPOSTAS-PERGUNTAS.md`](./RESPOSTAS-PERGUNTAS.md) como referência

### Para Usuários Finais:

1. Comece com [`MULTI-RESTAURANTE.md`](./MULTI-RESTAURANTE.md)
2. Siga os exemplos passo a passo
3. Consulte [`RESPOSTAS-PERGUNTAS.md`](./RESPOSTAS-PERGUNTAS.md) em caso de dúvidas

---

## 📊 **Status dos Guias**

| Guia                   | Status      | Última Atualização | Páginas     |
| ---------------------- | ----------- | ------------------ | ----------- |
| MULTI-RESTAURANTE.md   | ✅ Completo | 2026-05-12         | ~400 linhas |
| RESPOSTAS-PERGUNTAS.md | ✅ Completo | 2026-05-12         | ~600 linhas |

---

## 🤝 **Contribuindo**

### Como Adicionar um Novo Guia:

1. Crie o arquivo na pasta `docs/guides/`
2. Use o template abaixo
3. Adicione referência neste README.md
4. Atualize o [`CHANGELOG.md`](../../CHANGELOG.md)

### Template para Novos Guias:

```markdown
# 📋 [Nome do Guia]

> Atualizado: YYYY-MM-DD

---

## 📋 **Visão Geral**

[Descrição breve do que este guia cobre]

---

## 🎯 **Objetivos**

- ✅ Objetivo 1
- ✅ Objetivo 2
- ✅ Objetivo 3

---

## 📚 **Conteúdo**

### Seção 1

[Conteúdo...]

### Seção 2

[Conteúdo...]

---

## 🚀 **Como Usar**

[Instruções práticas...]

---

## 📞 **Suporte**

- **Documentação**: [link]
- **Código**: [link]
- **Exemplos**: [link]
```

---

**Última atualização**: 2026-05-12  
**Mantido por**: Equipe GARFOU
