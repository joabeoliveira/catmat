# 🧠 Prompt Inicial — Claude Code (CLI)

> Use este prompt ao iniciar uma nova sessão com `claude` no terminal.
> Inclua a flag `--context-file` para referenciar `stack.md` e `AI_CONTEXT.md`.

---

## 📂 Contexto do Projeto

```
Projeto: [NOME DO PROJETO]
Stack: Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui
ORM: Prisma + PostgreSQL
Estado: Zustand
Validação: Zod | Formulários: React Hook Form
Autenticação: Auth.js (NextAuth)
Testes: Vitest + React Testing Library + Playwright (E2E)
Infra: Docker, Easypanel, GitHub Actions, Sentry
Gerenciador: pnpm
Estrutura: src/features/ (módulos isolados)
```

📚 **Contexto adicional disponível em:**
- `./stack.md` — documentação completa da stack
- `./AI_CONTEXT.md` — diretrizes de arquitetura e vibe coding

---

## 🎯 OBJETIVO — PREENCHA AQUI

```
📌 Módulo/Funcionalidade:
  [ex: Módulo de contratos]

🖥️ Telas necessárias:
  - [ex: Listagem de contratos com filtros]
  - [ex: Formulário de cadastro/edição]
  - [ex: Visualização de detalhes]

📊 Entidades/Dados:
  - [ex: Contrato (id, cliente, valor, status, datas)]
  - [ex: Cliente (id, nome, documento, email)]

🔗 Integrações:
  - [ex: API de terceiros? Webhooks?]

🚨 Restrições:
  - [ex: Autenticação necessária? Roles de acesso?]
```

---

## 🏗️ Plano de execução sugerido (fases)

| Fase | Descrição |
|------|-----------|
| 1 | Definir tipos (`types.ts`) e schemas Zod (`schema.ts`) |
| 2 | Criar service com lógica de negócio + Prisma queries |
| 3 | Criar API Routes (`/api/seu-modulo/`) |
| 4 | Criar componentes de UI com shadcn/ui |
| 5 | Conectar front-end com API |
| 6 | Testes (Vitest para service + Playwright para E2E) |

---

## ⚠️ Regras obrigatórias

- ✅ **TypeScript estrito** — sem `any`, sem `@ts-ignore`
- ✅ **Tipos primeiro** — toda feature começa pelos `.types.ts`
- ✅ **Módulos isolados** — cada feature em `src/features/`
- ✅ **Tailwind + shadcn/ui** — para componentes visuais
- ✅ **Prisma Client via singleton** (`src/lib/db.ts`)
- ❌ Não modificar arquivos de outros módulos sem permissão
- ❌ Não criar CSS modules ou estilos avulsos
- ❌ Não usar bibliotecas de UI fora do ecossistema shadcn/ui

---

## 💡 Dicas para você

- Use `claude --context-file=stack.md,AI_CONTEXT.md` ao iniciar.
- Prefira comandos `pnpm` em vez de `npm`.
- Claude Code pode ler e editar arquivos diretamente — use isso a seu favor.
- Depois de gerar os tipos, peça para a IA **validar** antes de prosseguir.
- Para testes E2E, especifique quais fluxos do usuário devem ser testados.
