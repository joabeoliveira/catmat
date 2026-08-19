# Plano de Implementação — Consulta e Pesquisa de Preços de Serviços (CATSER)

> Status: **EM PLANEJAMENTO** · Última atualização: 2026-08-19
> Referência funcional: [`.skills/7_consulta_catser.md`](../.skills/7_consulta_catser.md)

---

## 1. Contexto e Objetivo

Implementar a funcionalidade de **consulta ao Catálogo de Serviços (CATSER)** e **pesquisa de preços praticados** na API de Dados Abertos do Compras.gov.br, seguindo a mesma stack do projeto (Next.js, React, TypeScript, TailwindCSS, Prisma/PostgreSQL).

### Funcionalidades previstas

- [ ] Consulta por **descrição** do serviço (retornando os resultados mais próximos, como na busca por CATMAT).
- [ ] Consulta por **código do serviço** (`codigoServico`).
- [ ] Consulta por **grupo** ou **classe**.
- [ ] Consulta por **status** do serviço.
- [ ] Consulta por **preços praticados** (API do governo), com tabela comparativa:
  - média, mediana, menor e maior preço;
  - filtros por **data**, **UF** e **UASG** (e outros), conforme IN 65/2023;
  - montagem de **grades de preços**.

---

## 2. Estado Atual (o que já existe)

| Item | Situação |
| --- | --- |
| Modelo `CatserItem` no `prisma/schema.prisma` | ✅ Existe (sem busca full-text / sem índices trigram) |
| Importação de `dados/catser.csv` via `scripts/seed-from-csv.mjs` | ✅ Existe (parser simples, sem suporte robusto a aspas) |
| Busca full-text CATMAT (`001_fts_trgm.sql` + coluna `tsv`) | ✅ Existe (referência de padrão) |
| Busca BPS (`003_bps_referencia.sql` + `bps-referencia.service.ts`) | ✅ Existe (referência de padrão) |
| API de preços para serviços (`3_consultarServico`) | ✅ Documentada na skill 7 |
| Cache/persistência de preços de serviços | ❌ Não existe |
| Rotas/UI de CATSER | ❌ Não existe |

### Campos reais de `dados/catser.csv`

`codigoGrupo`, `nomeGrupo`, `codigoClasse`, `nomeClasse`, `codigoServico`, `nomeServico`, `statusServico`

> ⚠️ **Observação importante:** `codigoClasse` no CSV é texto (ex.: `"1111.0"`). No schema atual `CatserItem.codigoClasse` é `String` — manter assim.

---

## 3. 📦 Fase 1 — Carga no Banco de Dados

### 3.1. Evoluir o modelo `CatserItem` (Prisma)

- [x] Adicionar coluna `tsv tsvector?` gerada (padrão `CatmatItem`):
  - peso A → `nomeServico`
  - peso B → `nomeClasse + nomeGrupo`
  - peso C → `codigoServico` (texto)
- [x] Manter `codigoClasse` como `String` (formato `1111.0`).
- [ ] Adicionar relação com a nova tabela de preços de serviços (ver 3.4).

> ⚠️ **Nota:** A coluna foi adicionada como `busca_tsv Unsupported("tsvector")?` no schema em 2026-08-19. Para o client Prisma reconhecer o novo campo é preciso rodar `npm install`/`npx prisma generate` — **pendente** (erro de certificado SSL no ambiente atual).

### 3.2. Novo SQL de setup: `prisma/sql/004_catser_referencia.sql`

- [x] `CREATE EXTENSION IF NOT EXISTS pg_trgm;` e `unaccent`
- [x] Adicionar coluna `busca_tsv` gerada em `CatserItem`
- [x] Índices:
  - [x] `GIN` em `busca_tsv`
  - [x] `GIN (immutable_unaccent("nomeServico") gin_trgm_ops)`
  - [x] B-tree em `codigoGrupo`
  - [x] B-tree em `codigoClasse`
  - [x] B-tree em `codigoServico`
  - [x] B-tree em `statusServico`

> ✅ **Arquivo criado e validado em 2026-08-19** — coluna `busca_tsv` criada com sucesso no banco (pgweb).

### 3.3. Script de importação

- [ ] Criar `scripts/import-catser.mjs` reutilizando o parser robusto do `import-bps-items.mjs` (trata aspas e `;` dentro de campo).
- [ ] Usar `createMany` com `skipDuplicates` (padrão existente).
- [ ] Adicionar scripts no `package.json`:
  - [ ] `import:catser`
  - [ ] `db:catser-setup`

### 3.4. Tabela de preços de serviços (decisão de schema)

> **Decisão pendente de validação:** Opção A (recomendada) vs Opção B.

- [ ] **Opção A (recomendada):** criar `CompraServicoItem` (espelho dos campos da resposta `3_consultarServico`: `precoUnitario`, `nomeFornecedor`, `nomeUasg`, `municipio`, `estado`, `dataCompra`, etc.) com FK para `CatserItem`.
- [ ] Criar `ServicoPrecoResumo` (equivalente ao `PrecoResumo`) para o selo "tem histórico".
- [ ] Alternativa descartada: generalizar `CompraItem` (relação obrigatória atual com `CatmatItem` quebraria com códigos de serviço).

---

## 4. ⚙️ Fase 2 — Backend (serviço + rotas)

### 4.1. Serviço `src/features/catser/catser.service.ts`

- [x] `buscarPorDescricao(termo, filtros, pagina)` → full-text + trigram (padrão BPS)
- [x] `buscarPorCodigo(codigoServico)` → dados cadastrais
- [x] `buscarPorGrupoClasse(grupo, classe)` — via filtros da busca (`codigoGrupo`/`codigoClasse`)
- [x] `buscarPorStatus(status)` — via filtro `statusServico`
- [x] `consultarPrecos(codigoServico, filtros)` → API `3_consultarServico` com filtros (data, UF, UASG, município, poder/esfera) + métricas (média, mediana, menor, maior, nº amostras)

### 4.2. Rotas de API

- [x] `GET /api/catser?q=...` (busca com filtros `codigoGrupo`, `codigoClasse`, `statusServico`)
- [x] `GET /api/catser/sugestoes?q=...`
- [x] `GET /api/catser/[codigoServico]` (cadastral)
- [x] `GET /api/catser/[codigoServico]/precos?...` (filtros `uf`, `codigoUasg`, `codigoMunicipio`, `poder`, `esfera`, `dataCompraInicio`, `dataCompraFim`, `pagina`, `tamanhoPagina`)

> ✅ **Backend criado em 2026-08-19** (serviço + 4 rotas), sem erros de TypeScript. Aguardando `npm install`/`prisma generate` e teste real.

---

## 5. 🖥️ Fase 3 — Frontend

- [ ] Página `src/app/catser/page.tsx` (padrão da página BPS)
- [ ] Componente `CatserSearch.tsx` — busca por descrição/código com sugestões
- [ ] Componente `CatserPrecosTable.tsx` — tabela comparativa com média, mediana, menor, maior (IN 65/2023)
- [ ] Componente `CatserFiltros.tsx` — filtros por data, UF, UASG, município
- [ ] Componente de **grade de preços** (montagem e exportação)
- [ ] Link no `SiteHeader.tsx`

---

## 6. 🔗 Fase 4 — Integração com Skills 4 e 5

- [ ] Aplicar **métricas** (Skill 4) sobre preços de serviços.
- [ ] Aplicar **espurgo de outliers** (Skill 5) sobre preços de serviços.

---

## 7. 📋 Pontos de decisão pendentes

- [ ] **Tabela de preços:** validar Opção A (nova tabela `CompraServicoItem` + `ServicoPrecoResumo`).
- [ ] **Script de importação:** manter `seed-from-csv.mjs` e criar `import-catser.mjs` dedicado, ou apenas melhorar o seed existente.
- [ ] **Ambiente:** confirmar `DATABASE_URL` local disponível para migração e seed.

---

## 8. 🛠️ Comandos úteis

```bash
# Aplicar setup do banco (após criar 004_catser_referencia.sql)
npm run db:catser-setup

# Importar dados do catser.csv
npm run import:catser

# Seed completo (catmat + catser)
npm run seed:csv

# Rodar a aplicação
npm run dev
```

---

## 9. 🧭 Progresso

- [x] Fase 1 — Carga no banco de dados *(parcial: schema + SQL 004; falta item 3.4 tabela de preços)*
- [x] Fase 2 — Backend *(serviço + rotas criadas; pendente `npm install`/`prisma generate` e teste real)*
- [ ] Fase 3 — Frontend
- [ ] Fase 4 — Integração Skills 4 e 5
- [ ] Validação final e testes
- [ ] Commit e push das alterações
