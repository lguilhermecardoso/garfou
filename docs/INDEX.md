# 📚 Índice de Documentação - GARFOU

> Navegação centralizada para toda a documentação do projeto

---

## 🚀 Início Rápido

### Para Desenvolvedores Humanos

1. [README.md](../../README.md) - Visão geral do projeto
2. [CHANGELOG.md](../../CHANGELOG.md) - Histórico de mudanças
3. [Resumo de Implementações (PT-BR)](./RESUMO-IMPLEMENTACOES.md) - O que foi implementado recentemente

### Para Agentes de IA

1. [AGENTS.md](../../AGENTS.md) - **Leia isto primeiro!** Fonte única de verdade
2. [AI Agent Onboarding](./AI-AGENT-ONBOARDING.md) - Guia de início rápido
3. [Recent Implementations (EN)](./recent-implementations.md) - Implementações recentes

---

## 📖 Documentação por Categoria

### 🏗️ Arquitetura

| Documento                                            | Descrição                           |
| ---------------------------------------------------- | ----------------------------------- |
| [Overview](../architecture/overview.md)              | Visão geral da arquitetura          |
| [Project Status](../architecture/project-status.md)  | Status consolidado do projeto       |
| [Security](../architecture/security.md)              | Segurança e autenticação            |
| [Permissions (RBAC)](../architecture/permissions.md) | Controle de acesso baseado em roles |

### 🎯 Features (Funcionalidades)

| Documento                                     | Descrição                            | Status      |
| --------------------------------------------- | ------------------------------------ | ----------- |
| [Orders](../features/orders.md)               | Sistema de pedidos completo          | ✅ Produção |
| [Inventory](../features/inventory.md)         | Gestão de estoque com operações CRUD | ✅ Produção |
| [Cash Register](../features/cash-register.md) | Caixa e fluxo financeiro             | 🚧 Parcial  |
| [Menu](../features/menu.md)                   | Cardápio com customização            | ✅ Produção |

### 🔧 Técnico

| Documento                                            | Descrição                               |
| ---------------------------------------------------- | --------------------------------------- |
| [Database Schema](../database/schema.md)             | Estrutura do banco de dados             |
| [API Endpoints](../api/endpoints.md)                 | Lista de endpoints da API               |
| [Realtime Strategy](../realtime/strategy.md)         | Estratégia de atualização em tempo real |
| [Multi-tenancy](../multi-tenancy/strategy.md)        | Estratégia de multi-inquilino           |
| [Printing Architecture](../printing/architecture.md) | Arquitetura de impressão térmica        |

### 📝 Especificações

| Documento                                                   | Descrição                           |
| ----------------------------------------------------------- | ----------------------------------- |
| [Master Spec](./master-spec.md)                             | Especificação mestra (viva)         |
| [TODO](./todo.md)                                           | Lista de tarefas pendentes          |
| [Progress Log](./progress-log.md)                           | Log de progresso do projeto         |
| [Recent Implementations (EN)](./recent-implementations.md)  | Implementações recentes (inglês)    |
| [Resumo de Implementações (PT)](./RESUMO-IMPLEMENTACOES.md) | Implementações recentes (português) |
| [AI Agent Onboarding](./AI-AGENT-ONBOARDING.md)             | Guia para agentes de IA             |

### 🧪 Testes

| Documento                                  | Descrição            |
| ------------------------------------------ | -------------------- |
| [Testing Strategy](../testing/strategy.md) | Estratégia de testes |

### 📊 Decisões

| Documento                  | Descrição                      |
| -------------------------- | ------------------------------ |
| [ADR](../decisions/adr.md) | Architectural Decision Records |

---

## 🔍 Navegação por Contexto

### Estou começando no projeto

1. [README.md](../../README.md)
2. [AGENTS.md](../../AGENTS.md)
3. [Architecture Overview](../architecture/overview.md)
4. [Project Status](../architecture/project-status.md)

### Quero implementar uma feature

1. [AGENTS.md](../../AGENTS.md) - Padrões e convenções
2. [AI Agent Onboarding](./AI-AGENT-ONBOARDING.md) - Guia rápido
3. Feature docs relevante ([Orders](../features/orders.md) / [Inventory](../features/inventory.md))
4. [Database Schema](../database/schema.md)
5. [API Endpoints](../api/endpoints.md)

### Estou debugando um problema

1. [Recent Implementations](./recent-implementations.md) - O que mudou recentemente
2. [Progress Log](./progress-log.md) - Histórico de mudanças
3. Feature docs específica
4. [Security](../architecture/security.md) - Se for problema de auth

### Quero entender a arquitetura

1. [Architecture Overview](../architecture/overview.md)
2. [Multi-tenancy Strategy](../multi-tenancy/strategy.md)
3. [Realtime Strategy](../realtime/strategy.md)
4. [Database Schema](../database/schema.md)
5. [Security](../architecture/security.md)

### Vou fazer deploy

1. [Vercel Deploy Guide](../deploy/vercel.md)
2. [Security](../architecture/security.md)
3. [Environment Variables](#) (ver README.md)

---

## 📌 Documentos Mais Acessados

### Top 5 para Humanos

1. [README.md](../../README.md)
2. [Resumo de Implementações](./RESUMO-IMPLEMENTACOES.md)
3. [Orders Feature](../features/orders.md)
4. [Inventory Feature](../features/inventory.md)
5. [Project Status](../architecture/project-status.md)

### Top 5 para Agentes de IA

1. [AGENTS.md](../../AGENTS.md) ⭐ **MAIS IMPORTANTE**
2. [AI Agent Onboarding](./AI-AGENT-ONBOARDING.md)
3. [Recent Implementations](./recent-implementations.md)
4. [Progress Log](./progress-log.md)
5. Feature docs ([Orders](../features/orders.md) / [Inventory](../features/inventory.md))

---

## 🗂️ Estrutura de Arquivos

```
/docs
├── /architecture        # Arquitetura do sistema
│   ├── overview.md
│   ├── project-status.md
│   ├── security.md
│   └── permissions.md
│
├── /features           # Documentação de features
│   ├── orders.md
│   ├── inventory.md
│   ├── cash-register.md
│   └── menu.md
│
├── /specs              # Especificações e logs
│   ├── master-spec.md
│   ├── todo.md
│   ├── progress-log.md
│   ├── recent-implementations.md
│   ├── RESUMO-IMPLEMENTACOES.md
│   ├── AI-AGENT-ONBOARDING.md
│   └── INDEX.md (este arquivo)
│
├── /database           # Banco de dados
│   └── schema.md
│
├── /api                # API
│   └── endpoints.md
│
├── /realtime           # Tempo real
│   └── strategy.md
│
├── /multi-tenancy      # Multi-inquilino
│   └── strategy.md
│
├── /printing           # Impressão
│   └── architecture.md
│
├── /testing            # Testes
│   └── strategy.md
│
├── /deploy             # Deploy
│   └── vercel.md
│
└── /decisions          # Decisões
    └── adr.md
```

---

## 🔄 Atualizações Recentes

### 2026-05-12

- ✅ Criado índice de documentação (este arquivo)
- ✅ Criado guia de onboarding para agentes de IA
- ✅ Criado resumo de implementações em português
- ✅ Criado CHANGELOG.md
- ✅ Atualizado AGENTS.md com inventory e delivery flow
- ✅ Atualizado docs de Orders e Inventory
- ✅ Atualizado Progress Log

### 2026-05-11

- ✅ Implementado sistema de customização de cardápio
- ✅ Implementado impressão térmica
- ✅ Criada estrutura de docs viva

---

## 🎯 Convenções de Documentação

### Formato

- Use Markdown para todos os documentos
- Inclua tabela de conteúdo em docs longos
- Use emojis para melhor legibilidade
- Mantenha exemplos de código atualizados

### Atualização

- Sempre atualize docs ao implementar features
- Adicione entrada no Progress Log
- Atualize AGENTS.md se for padrão importante
- Mantenha CHANGELOG.md sincronizado

### Revisão

- Docs devem ser revisados mensalmente
- Remova informações obsoletas
- Atualize status de features
- Verifique links quebrados

---

## 💡 Dicas

### Para Buscar Informação

1. Use Ctrl+F neste índice para encontrar docs relevantes
2. Verifique Recent Implementations para mudanças recentes
3. Consulte AGENTS.md para padrões rápidos
4. Leia feature docs para detalhes específicos

### Para Contribuir com Docs

1. Siga o formato dos docs existentes
2. Use linguagem clara e objetiva
3. Inclua exemplos de código quando relevante
4. Atualize este índice se criar novo doc

---

## 📞 Falta Algo?

Se você não encontrou o que procura:

1. **Procure no código**: `grep -r "termo" src/`
2. **Verifique PRs recentes**: Pode estar documentado em commits
3. **Leia AGENTS.md**: Pode ter a resposta rápida
4. **Crie issue**: Documente o que está faltando

---

**Última atualização**: 2026-05-12  
**Mantido por**: Equipe GARFOU  
**Versão**: 1.0.0
