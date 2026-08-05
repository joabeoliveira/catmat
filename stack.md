# Stack Padrão Ouro (The Tech Stack)

Este documento serve como referência para a stack padrão ouro utilizada em projetos de desenvolvimento de software de **Joabe Oliveira (@joabeoliveiraof)**. Ele garante escalabilidade, profissionalismo e alta performance. A stack escolhida combina tecnologias modernas e eficientes, proporcionando uma base sólida para a criação de aplicações web resilientes.

---

## 1. Tecnologias Principais

* **Framework:** **Next.js** (App Router). Escolhido pela capacidade Fullstack nativa (Frontend + API Routes), renderização otimizada (SSR/SSG), roteamento intuitivo baseado em arquivos e infraestrutura resiliente.
* **Linguagem:** **TypeScript**. Obrigatório para a definição de tipos estáticos e contratos rígidos. Reduz bugs humanos e serve como "âncora de realidade" para a própria IA, evitando alucinações de código.
* **Estilização e UI:** **Tailwind CSS** + **shadcn/ui** (baseado em Radix UI). Os componentes visuais devem seguir o padrão do shadcn/ui para garantir acessibilidade, consistência e velocidade de desenvolvimento.
* **Gerenciamento de Estado:** **Zustand** para estado global da aplicação (quando estritamente necessário) e React `useState`/`useReducer` para estados locais de componentes.
* **Banco de Dados:** **PostgreSQL** (ou outro banco relacional). Utilizado para armazenamento de dados estruturados, garantindo integridade, consistência e suporte a consultas complexas.
* **ORM:** **Prisma**. Facilita a interação com o banco de dados, fornecendo tipagem estática segura (Type-safe) integrada ao TypeScript e migrações simplificadas.
* **Validação de Dados:** **Zod**. Essencial para validar schemas de formulários, requisições de API e dados do banco. Totalmente integrado ao Prisma e ao ecossistema TypeScript.
* **Formulários:** **React Hook Form** + **Zod**. Combinação padrão do shadcn/ui para formulários performáticos com validação reativa e tipada.
* **Autenticação:** **Auth.js** (NextAuth). Solução nativa para Next.js com suporte a múltiplos provedores (Google, GitHub, credentials, etc.) e sessões seguras.
* **Gerenciador de Pacotes:** **pnpm**. Preferência por ser mais rápido que npm/yarn, eficiente em disco (hard links) e amplamente adotado no ecossistema moderno.
* **Controle de Versão:** **Git**. Utilizado para gerenciamento de código-fonte, permitindo colaboração eficiente e rastreamento de alterações.

---

## 2. Utilitários e Bibliotecas de Apoio

* **Ícones:** **Lucide React**. Biblioteca de ícones open-source padrão do shadcn/ui, consistente e leve.
* **Utilitários CSS:** **tailwind-merge** + **clsx**. Essenciais para mesclagem condicional de classes Tailwind sem conflitos, amplamente usados em componentes shadcn/ui.
* **Hooks Customizados:** Padronizar hooks em `src/hooks/`. Utilizar `usehooks-ts` como biblioteca auxiliar para hooks comuns (debounce, media query, clipboard, etc.).

---

## 3. Qualidade de Código e Padronização

* **Linter:** **ESLint** com configuração padrão do Next.js + regras adicionais do TypeScript. Obrigatório em todos os projetos.
* **Formatador:** **Prettier**. Configuração única (`.prettierrc`) compartilhada entre projetos para formatação automática consistente.
* **Pré-commit Hooks:** **Husky** + **lint-staged**. Executa linter e formatador automaticamente nos arquivos staged antes de cada commit.
* **Commits Semânticos:** Seguir o padrão **Conventional Commits** (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, etc.) para histórico limpo e geração automatizada de changelog.
* **Variáveis de Ambiente:** Usar `.env.local` para desenvolvimento local e `.env.example` (versionado) como template documentado com todas as variáveis necessárias.

---

## 4. Estratégia de Testes

* **Testes Unitários e de Integração:** **Vitest** e **React Testing Library** para testar regras de negócio, funções utilitárias e o comportamento isolado de componentes críticos.
* **Testes Ponta a Ponta (E2E):** **Playwright** para automatizar testes dos fluxos principais do usuário (ex: fluxo de login, criação de cotações), garantindo que a interface e o backend funcionem perfeitamente juntos.
* **Obrigatoriedade:** Todos os testes devem passar localmente e no pipeline antes de qualquer mesclagem (merge) na branch principal.

---

## 5. Ecossistema, Infraestrutura e DevOps

* **Conteinerização:** **Docker**. Utilizado tanto para desenvolvimento (ambiente replicável) quanto para produção. Define serviços como banco de dados, aplicação e redis em `docker-compose.yml`.
* **Ferramentas de IA:** Priorizar o uso de ecossistemas integrados modernos (como o **Vercel AI SDK**) para recursos de inteligência artificial na interface, como editores de texto ricos (Tiptap/Lexical) com streaming de dados em tempo real.
* **Hospedagem e Deploy:** **Easypanel**. Infraestrutura autohospedada baseada em Docker, integrada ao ecossistema de servidores VPS (como Oracle Cloud, Google Cloud, Integrator Host, Hetzner ou DigitalOcean). Utilizada para gerenciar bancos de dados e aplicações Next.js, garantindo deploys automáticos rápidos e escaláveis via Webhooks do GitHub ou GitLab.
* **CI/CD (Integração e Entrega Contínua):** Configurar pipelines automatizados (via **GitHub Actions**) para rodar linters, testes (Vitest/Playwright), build e deploy automatizados antes de cada push na branch principal.
* **Monitoramento e Logs:** Implementar ferramentas de monitoramento em produção (como **Sentry**) para rastreamento ativo de erros, performance monitoring e análise de qualidade da aplicação.

---

## 6. Estrutura de Diretórios Padrão

A organização do projeto deve seguir o padrão abaixo para garantir previsibilidade e escalabilidade:

```
src/
├── app/                    # App Router (rotas da aplicação)
│   ├── (auth)/             # Grupo de rotas de autenticação
│   ├── (dashboard)/        # Grupo de rotas protegidas (painel)
│   ├── api/                # API Routes (backend Next.js)
│   └── layout.tsx          # Layout raiz
├── components/             # Componentes React reutilizáveis
│   ├── ui/                 # Componentes base do shadcn/ui
│   └── shared/             # Componentes compartilhados do projeto
├── features/               # Módulos isolados por funcionalidade
│   └── modulo/
│       ├── modulo.types.ts # Tipos e contratos do módulo
│       ├── modulo.schema.ts# Schemas Zod do módulo
│       ├── modulo.service.ts# Lógica de negócio
│       └── components/     # Componentes específicos do módulo
├── hooks/                  # Custom hooks React
├── lib/                    # Funções utilitárias e configurações
│   ├── db.ts               # Conexão com Prisma
│   └── utils.ts            # Utilitários (cn, formatters, etc.)
├── providers/              # Providers React (Theme, Auth, Query, etc.)
└── styles/                 # Estilos globais
    └── globals.css
```

> **Nota:** Novos módulos de negócio devem ser criados dentro de `src/features/`, cada um com seus próprios tipos, schemas e serviços, respeitando o princípio de isolamento definido no `AI_CONTEXT.md`.