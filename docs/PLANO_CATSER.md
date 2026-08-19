# Plano de Implementação — Consulta e Pesquisa de Preços de Serviços (CATSER)

> Status: **PARCIALMENTE IMPLEMENTADO** · Última atualização: 2026-08-19
> Referência funcional: [`.skills/7_consulta_catser.md`](../.skills/7_consulta_catser.md)
> Referência de padrões: [`docs/catser/REFERENCIA-IMPLEMENTACAO.md`](catser/REFERENCIA-IMPLEMENTACAO.md)

---

## 1. Contexto e Objetivo

Implementar a funcionalidade de **consulta ao Catálogo de Serviços (CATSER)** e **pesquisa de preços praticados** na API de Dados Abertos do Compras.gov.br, seguindo a mesma stack do projeto (Next.js, React, TypeScript, TailwindCSS, Prisma/PostgreSQL).

### Funcionalidades previstas

- [x] Consulta por **descrição** do serviço (retornando os resultados mais próximos, como na busca por CATMAT).
- [x] Consulta por **código do serviço** (`codigoServico`).
- [x] Consulta por **grupo** ou **classe**.
- [x] Consulta por **status** do serviço.
- [x] Consulta por **preços praticados** (API do governo), com tabela comparativa:
  - média, mediana, menor e maior preço;
  - filtros por **UF**, **UASG**, **período**, **poder** e **esfera**;
  - geração de **pesquisa de preços formal (IN 65/2021)** em Excel.

---

## 2. Estado Atual (o que já existe)

| Item | Situação |
| --- | --- |
| Modelo `CatserItem` no `prisma/schema.prisma` | ✅ Existe (sem busca full-text / sem índices trigram) |
| Importação de `dados/catser.csv` via `scripts/seed-from-csv.mjs` | ✅ Existe (parser simples, sem suporte robusto a aspas) |
| Busca full-text CATMAT (`001_fts_trgm.sql` + coluna `tsv`) | ✅ Existe (referência de padrão) |
| Busca BPS (`003_bps_referencia.sql` + `bps-referencia.service.ts`) | ✅ Existe (referência de padrão) |
| API de preços para serviços (`3_consultarServico`) | ✅ Documentada na skill 7 |
| Cache/persistência de preços de serviços | ❌ Não existe (pendente Opção A) |
| Rotas/UI de CATSER | ✅ Implementado (página `/catser` + componentes) |
| Link de auditoria PNCP (resolução oficial) | ✅ Implementado (resolver em cascata) |
| Pesquisa de preços IN 65/2021 (Excel) | ✅ Implementado |

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

- [x] Página `src/app/catser/page.tsx`
- [x] Componente `CatserSearch.tsx` — busca por descrição com autocomplete de sugestões (`/api/catser/sugestoes`)
- [x] Componente `CatserResults.tsx` — lista com `nomeServico`, grupo/classe, % compatível e paginação
- [x] Componente `CatserPrecosTable.tsx` — tabela com métricas (média, mediana, menor, maior), órgão (UASG), unidade, objeto com "Ler mais", ID da compra com copiar + link PNCP
- [x] Componente `CatserFiltros.tsx` — filtros de busca por grupo/classe (a partir de `filtrosSugeridos`)
- [x] Componente `CatserPrecosPanel.tsx` — filtros de preços por UF, UASG, poder, esfera, período + botão "Gerar pesquisa de preços (IN 65/2021)"
- [x] Link no `SiteHeader.tsx` (CATMAT e CATSER no menu)

> ✅ **Frontend implementado em 2026-08-19** (página + 6 componentes), build OK.

### 5.1. Pesquisa de preços formal (IN 65/2021) — Excel

- [x] Módulo `src/features/pesquisa/pesquisa-precos.excel.ts` (geração da planilha com 3 abas: Documento, Preços, Resumo/Metodologia)
- [x] Rota `POST /api/catser/pesquisa/export` (gera `.xlsx` no servidor; dependência `xlsx`)
- [x] Botão "Baixar Excel" no painel de preços (identificação: órgão, responsável, processo, observações)

### 5.2. Link de auditoria no PNCP

- [x] `src/lib/pncp.ts` — resolver em cascata (ver seção 16)

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
- [x] Fase 2 — Backend *(serviço + rotas criadas e testadas)*
- [x] Fase 3 — Frontend *(página + componentes + filtros + Excel + link PNCP)*
- [ ] Fase 4 — Integração Skills 4 e 5 *(espurgo de outliers sobre preços de serviços)*
- [ ] Validação final e testes
- [x] Commit e push das alterações (deploy via EasyPanel)

---

## 10. 🛠️ Fase 3 — Frontend (detalhado)

Objetivo: oferecer uma interface simples e reutilizável para pesquisar serviços e visualizar preços, seguindo os padrões já usados para CATMAT.

- [ ] Criar página principal de CATSER: `src/app/catser/page.tsx` (layout similar a BPS/CATMAT).
- [ ] Componentes principais:
  - `CatserSearch.tsx`: input com sugestões (consume `/api/catser/sugestoes`).
  - `CatserResults.tsx`: lista/página com paginação e filtros (usa `/api/catser?q=`).
  - `CatserPrecosTable.tsx`: tabela com métricas (média/mediana/menor/maior) e botão "Consultar histórico" que chama `/api/catser/[codigoServico]/precos`.
  - `CatserFiltros.tsx`: filtros por `uf`, `codigoUasg`, `dataInicio`/`dataFim`, `poder`, `esfera`.
- [ ] Integração com componente compartilhado `BuscaAvancada` para oferecer alternância CATMAT/CATSER.
- [ ] Testes básicos de UI: smoke test para renderizar página e chamadas mock das APIs.
- [ ] Acessibilidade e responsividade (mesmas regras do projeto).

Notas de implementação:

- Reutilizar estilos e UI primitives em `src/components/ui/`.
- Priorizar renderização server-side para conteúdos estáticos (onde aplicável) e chamadas dinâmica por cliente para métricas pesadas.

## 11. 🗄️ Fase 4 — Esquema de preços e integração (decisão técnica)

Recomendação (Opção A — mais explícita e segura):

- Criar `CompraServicoItem` (nova tabela) que replica os campos relevantes da API `3_consultarServico` e tem FK opcional para `CatserItem` (campo `codigoServico` → `CatserItem.codigoServico`).
- Criar `ServicoPrecoResumo` (semelhante a `PrecoResumo`) para indicar se existe histórico e guardar contadores/periodos.

Exemplo resumido de Prisma (sugestão):

```prisma
model CompraServicoItem {
  id            String   @id @default(cuid())
  codigoServico Int?
  precoUnitario Float?
  nomeFornecedor String?
  nomeUasg      String?
  municipio     String?
  estado        String?
  dataCompra    DateTime?
  // ... outros campos conforme 3_consultarServico
  catserItem    CatserItem? @relation(fields: [codigoServico], references: [codigoServico])
  @@index([codigoServico])
  @@index([dataCompra])
}

model ServicoPrecoResumo {
  codigoServico    Int @id
  quantidadeCompras Int
  periodoInicio     DateTime?
  periodoFim        DateTime?
  atualizadoEm      DateTime @default(now()) @updatedAt
}
```

Motivos: mantém histórico separado (não conflita com `CompraItem` e Catmat), facilita consultas agregadas e limpeza/espurgo posterior.

## 12. 🚀 Execução e deployment (passo a passo imediato)

1. (Feito) Commit + push backend (serviço e rotas) e `scripts/import-catser.mjs` — já enviado para `main`.
2. Production deploy via EasyPanel (você executa). Após deploy concluído:
   - Rodar `npm run db:catser-setup` (aplica `004_catser_referencia.sql`) se ainda não aplicado no DB de produção.
   - Rodar `npm run import:catser /caminho/para/catser.csv` para popular `CatserItem`.
3. Criar e disponibilizar a página frontend `src/app/catser/page.tsx` (segue Fase 3) e commitar para acionar novo deploy.
4. Se necessário, rodar job de import periódico (ver seção GitHub Actions abaixo).

## 13. ⚙️ GitHub Actions / Jobs sugeridos

- `catser-import.yml` (opcional): workflow acionado manualmente (`workflow_dispatch`) que executa `npm run import:catser` usando `DATABASE_URL` do Secrets. Útil para re-imports e backfill.
- `post-deploy-setup.yml` (opcional): job que executa `psql "$DATABASE_URL" -f prisma/sql/004_catser_referencia.sql` automaticamente após deploy se desejar automatizar setup do banco (cuidado com permissões).

## 14. ✅ Checklist de PR/Deploy

- [ ] Testes unitários do serviço (`catser.service`) passam (mocks do Prisma).
- [ ] Testes E2E mínimos na página de busca CATSER (quando implementada).
- [ ] Migração/SQL verificada em staging antes da produção.
- [ ] Backup do banco antes de rodar import em produção.
- [ ] Monitor de erros/telemetria ativo após deploy.

## 15. Próximas ações

- [ ] Implementar o schema `CompraServicoItem` + `ServicoPrecoResumo` (Opção A) no `prisma/schema.prisma` e abrir PR para revisar a migração (cache/persistência de preços de serviços).
- [ ] Aplicar **espurgo de outliers** (Skill 5) sobre os preços de serviços.
- [ ] Expor o `link_evidencia` na página de detalhe do material (`/material/[codigo]`) — já enriquecido no CATMAT.
- [ ] Paginação completa do histórico de preços (hoje mostra os primeiros 10 registros).
- [ ] Validação dos links PNCP em produção (conferir as 9 linhas de exemplo na seção 16).

---

## 16. 🔗 Link de auditoria da compra no PNCP (resolução oficial)

Implementado em `src/lib/pncp.ts` e aplicado no backend (rotas de preços de CATSER e CATMAT), **sem montar link no frontend**.

### Fluxo em cascata

1. **Pesquisa de preço** (Compras.gov.br) → fornece `idCompra`, `idItemCompra`, `codigoUasg`, `modalidade`, `dataCompra` (a API **não** retorna `linkCompraPncp`).
2. **Primário (autoritativo)** — módulo de contratações:
   `GET /modulo-contratacoes/1.1_consultarContratacoes_PNCP_14133_Id?tipo=idCompra&codigo={idCompra}`
   → `orgaoEntidadeCnpj`, `anoCompraPncp`, `sequencialCompraPncp`, `numeroControlePNCP`.
3. **Secundário** — busca pública do PNCP por `UASG + ano + número da contratação` (número decodificado do `idCompra`), casando título `nº {numero}/{ano}` e usando o `item_url`.
4. **Link final:** `https://pncp.gov.br/app/editais/{cnpj}/{anoCompra}/{sequencialCompra}` (CNPJ só números; sequencial sem zeros à esquerda).
5. **Fallback textual** (não bloqueia): `https://pncp.gov.br/app/compras?busca={idCompra}`.

### Estrutura do `idCompra`

`{UASG(6)}{modalidade(2)}{numero(N)}{ano(4)}` — o ano e o número são decodificados para o resolver secundário.

### Validação com dados reais (2026-08-19)

| idCompra | Link gerado |
| --- | --- |
| `98586505900152026` | `editais/28521748000159/2026/96` ✓ |
| `15690506000092026` | `editais/24134488000108/2026/96` |
| `25442306000952026` | `editais/33781055000135/2026/1229` |
| `15307906001172027` | `editais/75095679000149/2027/3` (ano 2027 no idCompra) |
| `15851706000822026` | `editais/11234780000150/2026/34` |
| `15306506002532026` | `editais/24098477000110/2026/91` |
| `15404006003702026` | `editais/00038174000143/2026/209` |
| `98624905900482026` | `editais/46634101000115/2026/140` |
| `15311505900112026` | `editais/33663683000116/2026/133` |

### Notas

- O módulo de contratações tem lacunas (alguns `idCompra` de órgãos federais retornam vazio); o resolver secundário cobre esses casos.
- O `numeroControlePNCP` pode ser usado como validação (ex.: `28521748000159-1-000096/2026` confirma o sequencial 96).
- A `CHAVE_API_COMPRAS_GOV` (`.env.local`) **não** autentica o módulo UASG/contratações (a API usa login+senha → JWT); o fluxo funciona **sem chave**.

---

## 17. 📄 Pesquisa de preços em Excel (IN 65/2021)

- Geração server-side em `src/features/pesquisa/pesquisa-precos.excel.ts` (biblioteca `xlsx`).
- 3 abas: **Documento** (identificação, objeto, filtros, nº de preços, preço de referência), **Preços** (lista com ID Compra + Link PNCP), **Resumo** (métricas + metodologia).
- Endpoint: `POST /api/catser/pesquisa/export`.
- UI: bloco "Gerar pesquisa de preços (IN 65/2021)" no `CatserPrecosPanel`, com formulário (órgão, responsável, processo, observações) e botão "Baixar Excel".

---

## 18. 🗂️ Referência para novas implementações

Ver [`docs/catser/REFERENCIA-IMPLEMENTACAO.md`](catser/REFERENCIA-IMPLEMENTACAO.md) — padrões validados, endpoints oficiais, como testar e lições aprendidas desta sessão.
