# 🧠 Prompt Inicial — GitHub Copilot (Chat / Edit / Agent)

> Use este prompt ao iniciar uma nova sessão com o GitHub Copilot.
> O `copilot-instructions.md` da raiz já carrega regras globais automaticamente.

---

## 📂 Contexto do Projeto (referências obrigatórias)

- **Stack:** Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **ORM:** Prisma + PostgreSQL
- **Estado:** Zustand
- **Validação:** Zod
- **Testes:** Vitest + Playwright
- **Infra:** Docker, Easypanel
- **Docs:** [`stack.md`](stack.md) e [`AI_CONTEXT.md`](AI_CONTEXT.md) na raiz

---

## 🎯 OBJETIVO

Um MVP para consultar as tabelas CATMAT e CATSER, com filtros, operadores, vetores, entre outras formas de busca, paginação e exportação para CSV/Excel.

### O problema:

Servidores públicos têm dificuldades em consultar as tabelas CATMAT e CATSER, que são grandes e complexas. Ocorre que existem diversos códigos que se parecem na descrição, mas que são diferentes. A busca atual é limitada e não permite filtros avançados, operadores lógicos ou exportação de resultados.

A ideia é dissecar essas tabelas e criar uma interface amigável que permita consultas avançadas, com filtros, operadores, vetores, paginação e exportação para CSV/Excel.

O arquivo a ser exportado será usado para alimentar o sistema Algorise e Cotegov com uma grade padronizada de códigos e descrições.

A ideia é fazer criar um sistema que além de permitir escolher melhor os itens, permita escolher a unidade de medida com uma consulta prévia a API do governo federal.

Essa Consulta a API do governo retorna unidade de medida, preços e descrição onde o usuário poderá escolher a unidade que irá utilizar para o item selecionado e o preço que será utilizado para o mesmo.

O preço será escolhido com os seguintes critérios:
Menor preço, média, mediana, maior preço ou preço personalizado.

Deverá ser possível espurgar os itens com preços incompatíveis (majorados ou minorados) com a média do mercado, para que o usuário possa escolher apenas os itens com preços compatíveis.

Informações da API podem ser consultadas em: [https://compras.dados.gov.br/](https://compras.dados.gov.br/) e no documento 




<!--
  Seja específico. Exemplos:
  "Criar módulo de gestão de contratos em src/features/contratos/"
  "Adicionar tela de login com Auth.js"
  "Criar API route para CRUD de clientes"
-->

**O que quero desenvolver:**

```




```

---

## ✅ Regras que o Copilot já segue (via copilot-instructions.md)

✔ Arquitetura modular em `src/features/`  
✔ Types primeiro (`.types.ts` e `.schema.ts`)  
✔ Tailwind + shadcn/ui para UI  
✔ TypeScript estrito (sem `any`)  
✔ Pronta para deploy Docker/Easypanel  

---

## 💡 Dicas para você (o desenvolvedor)

- **Seja descritivo:** Quanto mais contexto der, melhor o resultado.
- **Peça passo a passo:** "Crie os tipos, depois o schema, depois o service, depois a UI."
- **Escopo fechado:** Diga explicitamente o que **não** deve ser alterado.
- **Exemplo bom:** _"Crie o módulo `orcamentos` em `src/features/orcamentos/` com CRUD completo, seguindo a estrutura de `src/features/modulo/` como referência. Use shadcn/ui para o formulário e tabela."_
- **Exemplo ruim:** _"Faz um sistema de orçamentos."_ (muito vago)
