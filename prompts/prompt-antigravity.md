# 🧠 Prompt Inicial — Antigravity

> Use este prompt ao iniciar uma nova conversa no Antigravity.
> Cole este texto + sua descrição do que deseja desenvolver.

---

## 📂 Contexto do Projeto

```
Stack: Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui
ORM: Prisma + PostgreSQL
Estado: Zustand
Validação: Zod | Formulários: React Hook Form
Autenticação: Auth.js (NextAuth)
Testes: Vitest + React Testing Library + Playwright
Infra: Docker (multi-stage), Easypanel, GitHub Actions
```

📄 Leia também os arquivos [`stack.md`](stack.md) e [`AI_CONTEXT.md`](AI_CONTEXT.md) na raiz do projeto para diretrizes completas de arquitetura.

---

## 🎯 OBJETIVO — PREENCHA AQUI

**Descreva com clareza o que deseja desenvolver:**

```
- Qual módulo/funcionalidade?
- Quais telas são necessárias?
- Quais dados (entidades) estão envolvidos?
- Há integração com API externa?
- Qual o prazo/prioridade?
```

> 👇 **Escreva abaixo**

```








```

---

## 📐 Estrutura que deve ser seguida

```
src/features/seu-modulo/
├── seu-modulo.types.ts    # Tipos e interfaces
├── seu-modulo.schema.ts   # Schemas Zod
├── seu-modulo.service.ts  # Lógica de negócio / API calls
└── components/            # Componentes específicos do módulo
```

---

## ⚠️ Regras que a IA DEVE seguir

1. **Nunca alterar** arquivos fora do escopo definido acima sem permissão.
2. **Sempre definir tipos primeiro** antes de qualquer lógica.
3. **Usar shadcn/ui** para componentes de UI, não criar do zero.
4. **Tailwind CSS** para estilização — sem CSS modules ou arquivos CSS avulsos.
5. **Código TypeScript estrito** — sem `any`, sem `as` desnecessário.

---

## 💡 Dicas para você

- **Quebre em etapas:** Peça para a IA trabalhar em fases (tipos → schema → service → UI).
- **Seja visual:** Descreva como a tela deve se comportar (ex: "tabela com busca, filtro por status e botão de novo").
- **Proteja o legado:** Se for uma feature nova, deixe claro que é um módulo isolado.
- **Revise:** Sempre valide os tipos gerados antes de pedir a próxima etapa.
