# 🧠 Prompt Inicial — Cursor (Chat / Composer / Agent)

> Use este prompt ao iniciar uma nova sessão no Cursor.
> No Cursor, você pode referenciar arquivos com `@stack.md` e `@AI_CONTEXT.md`.

---

## 📂 Contexto do Projeto

**Stack:** Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui  
**ORM:** Prisma + PostgreSQL  
**Estado:** Zustand  
**Validação:** Zod → React Hook Form  
**Auth:** Auth.js (NextAuth)  
**Testes:** Vitest + Playwright  
**Infra:** Docker, Easypanel, GitHub Actions, Sentry  
**Gerenciador:** pnpm  
**Estrutura:** `src/features/` com módulos isolados  

> 🔗 **Referencie estes arquivos no Cursor:** `@stack.md` `@AI_CONTEXT.md`

---

## 🎯 OBJETIVO — PREENCHA AQUI

> Seja o mais específico possível. Quanto mais detalhes, melhor o resultado.

```
══════════════════════════════════════════════════════
              PREENCHA SEU OBJETIVO AQUI
══════════════════════════════════════════════════════

O que deve ser criado/modificado:








Funcionalidades esperadas:








Requisitos de dados/entidades:








Observações importantes:








══════════════════════════════════════════════════════
```

---

## 📐 Estrutura esperada

```
src/features/seu-modulo/
├── seu-modulo.types.ts      # 🥇 TIPOS PRIMEIRO
├── seu-modulo.schema.ts     # Schemas Zod
├── seu-modulo.service.ts    # Lógica + chamadas API
└── components/              # Componentes React
    ├── TabelaComponent.tsx
    └── FormularioComponent.tsx
```

---

## ⚠️ Regras para o Cursor

| Regra | Descrição |
|-------|-----------|
| **Arquitetura** | Siga `src/features/` para novos módulos |
| **Tipos** | Defina `.types.ts` antes de qualquer lógica |
| **UI** | Use apenas Tailwind CSS + componentes `@/components/ui/` (shadcn) |
| **TypeScript** | Estrito — sem `any`, sem `@ts-ignore`, sem `as` desnecessário |
| **Prisma** | Use o singleton em `src/lib/db.ts` |
| **Escopo** | Não altere arquivos de módulos não relacionados |
| **Testes** | Vitest para service/componentes, Playwright para E2E |

---

## 🚀 Workflow recomendado (no Cursor)

| Passo | Ação |
|-------|------|
| 1 | Abra o Cursor Chat e use `@stack.md` + `@AI_CONTEXT.md` |
| 2 | Cole o prompt preenchido acima |
| 3 | Peça: _"Primeiro, crie os arquivos de tipos e schemas"_ |
| 4 | Revise os tipos gerados |
| 5 | Peça: _"Agora crie o service com as queries Prisma"_ |
| 6 | Peça: _"Depois crie os componentes de UI com shadcn/ui"_ |
| 7 | Peça: _"Por fim, conecte a página e os testes"_ |

---

## 💡 Dicas para você

- **Use `@` no Cursor** para referenciar arquivos existentes como contexto.
- **Composer (Ctrl+K)** é ótimo para criar componentes isolados.
- **Agent mode** é melhor para tarefas multi-arquivo (ex: criar módulo completo).
- **Peça revisão explícita:** _"Revise os tipos e me mostre se falta algo"_.
- Se for uma **correção ou refatoração**, especifique claramente o que não deve mudar.
- **Exemplo de prompt completo:** _"Crie o módulo de orçamentos em @src/features/orcamentos/ seguindo a estrutura de @src/features/modulo/ como referência. O orçamento tem cliente, valor, itens e status. Use shadcn/ui para a tabela e formulário. Crie os testes Vitest para o service."_
