# Plan: API de pesquisa de preços TCE-PR

## TL;DR
Implantar módulo de pesquisa de preços de licitações homologadas pelo TCE-PR: nova tabela `"LicitacaoVencedorTcePr"` (padrão SalarioCbo: model Prisma + SQL espelhado + serviço `$queryRawUnsafe`), script `import-tcepr.mjs` com parser XML manual (sem dependência), rotas `GET /api/tce-pr/buscar` e `POST /api/tce-pr/export` (XLSX), página `/tce-pr` com busca/filtros/ordenação por preço, e link no `SiteHeader`. Preço de referência = `vlLicitacaoVencedorLicitacao` (vencedor, `nrClassificacao=1`, default). Dados: local `dados/tcepr/*.xml` + MinIO bucket `tcepr`.

## Decisões do usuário (2026-08-26)
1. Banco: seguir padrão Salários (model Prisma + SQL `00X` espelhando schema + serviço raw).
2. Preço: filtrar vencedor (classificacao=1) por padrão; preço = `vlLicitacaoVencedorLicitacao`.
3. Parser XML: manual, sem dependência nova.
4. Dados: MinIO bucket `tcepr` (mesma lógica salários; variáveis já no EasyPanel; ajustar nome do bucket) + pasta local `dados/tcepr/`.
5. Exportação XLSX: incluir na v1.
6. Rota/página **`/tce-pr`** (kebab-case) confirmada — padrão SEO e do menu `SiteHeader`.
7. API **`?apenasVencedores=false`** (default `true`) já na v1: só vencedores por padrão (IN 65/2021); permite expandir no futuro para mapa comparativo de lances/propostas de todos os concorrentes (todas as classificações ficam armazenadas — unique inclui `nrClassificacao`).

## Templates a copiar (referências)
- Model: `SalarioCbo` em `prisma/schema.prisma` (camelCase, tabela entre aspas, sem @map; `busca_tsv Unsupported("tsvector")?`; `@@unique`, `@@index`).
- SQL: `prisma/sql/005_salarios_referencia.sql` (CREATE EXTENSION unaccent/pg_trgm; `immutable_unaccent`; CREATE TABLE espelhado; ALTER ADD COLUMN IF NOT EXISTS; busca_tsv GENERATED com setweight; CREATE UNIQUE INDEX IF NOT EXISTS; índices GIN trgm/tsv).
- Import: `scripts/import-salarios.mjs` (ensureSchema via splitSqlStatements + $executeRawUnsafe; insertBatch com placeholders $N e ON CONFLICT DO UPDATE; baixarCsvDoMinio; main().catch().finally(disconnect)).
- Serviço: `src/features/salarios/salarios.service.ts` (pushParam, buildWhere, $queryRawUnsafe, ordenação por enum) + `src/features/salarios/salarios.types.ts` (tipos compartilhados).
- Rota GET: `src/app/api/catser/route.ts` (allowRequest/clientIp/tooManyRequests + numberParam/boolParam).
- Rota export: `src/app/api/salarios/export/route.ts` (POST, runtime nodejs, gera Buffer XLSX via `salarios.excel.ts`).
- Frontend: `CatserSearch.tsx` (orquestrador), `CatserFiltros.tsx` (facets `filtrosSugeridos`), `CatserPrecosTable.tsx` (cards mobile + table desktop), ordenação `<select>` de `SalariosSearch.tsx`. Menu: `src/components/shared/SiteHeader.tsx` (array `links`).

## Model Prisma proposto (camelCase, tabela "LicitacaoVencedorTcePr")
- `id Int @id @default(autoincrement())`
- Dados entidade/município: `cdIbge String?`, `nmMunicipio String`, `idPessoa Int?`, `nmEntidade String`
- Licitação: `idLicitacao Int`, `nrAnoLicitacao Int`, `nrLicitacao Int`, `dsModalidadeLicitacao String`, `dtHomologacao DateTime?`
- Fornecedor: `nrDocumento String`, `nmPessoa String`
- Item: `nrLote Int`, `nrItem Int`, `dsItem String @db.Text`, `idUnidadeMedida Int?`, `dsUnidadeMedida String?`, `nrQuantidade Float?`
- Valores: `vlMinimoUnitarioItem Float?`, `vlMinimoTotal Float?`, `vlMaximoUnitarioItem Float?`, `vlMaximoTotal Float?`
- Proposta/vencedor: `nrQuantidadeProposta Float?`, `vlPropostaItem Float?`, `nrQuantidadeVencedor Float?`, `vlLicitacaoVencedor Float?`, `nrClassificacao Int`
- Condições: `dsFormaPagamento String?`, `nrPrazoLimiteEntrega Int?`, `idTipoEntregaProduto Int?`, `dsTipoEntregaProduto String?`, `dtValidadeProposta DateTime?`, `dtPrazoEntregaProposta DateTime?`
- Controle: `ultimoEnvioSimam String?`, `dataReferencia String?`, `importadoEm DateTime @default(now())`
- `busca_tsv Unsupported("tsvector")?`
- `@@unique([idLicitacao, nrLote, nrItem, nrDocumento, nrClassificacao])` (idempotência upsert)
- `@@index([cdIbge, nrAnoLicitacao])`, `@@index([nrDocumento])`, `@@index([dtHomologacao])`, `@@index([idLicitacao])`, `@@index([dsModalidadeLicitacao])`

## SQL `prisma/sql/006_tcepr_referencia.sql`
- CREATE EXTENSION unaccent/pg_trgm + immutable_unaccent (padrão).
- CREATE TABLE IF NOT EXISTS "LicitacaoVencedorTcePr" espelhando model (aspas, camelCase).
- ALTER ADD COLUMN IF NOT EXISTS para colunas novas.
- busca_tsv GENERATED: setweight(dsItem,'A') || setweight(nmMunicipio,'B') || setweight(nmEntidade,'C') || setweight(nmPessoa,'C') || setweight(dsModalidadeLicitacao,'C').
- CREATE UNIQUE INDEX IF NOT EXISTS tcepr_item_fornecedor_classificacao_uidx ON (idLicitacao, nrLote, nrItem, nrDocumento, nrClassificacao).
- Índices: GIN busca_tsv; GIN trgm dsItem; btree (cdIbge, nrAnoLicitacao); nrDocumento; dtHomologacao DESC; idLicitacao; dsModalidadeLicitacao.

## Fases de execução (sequenciais; Fase N depende da N-1)

### Fase 1 — Banco
1. Adicionar model `LicitacaoVencedorTcePr` ao `prisma/schema.prisma`.
2. Criar `prisma/sql/006_tcepr_referencia.sql` (template 005).
3. `package.json`: adicionar scripts `db:tcepr-setup` (psql -f 006) e `import:tcepr`.
4. Rodar `npx prisma generate` (ambiente: `$env:NODE_TLS_REJECT_UNAUTHORIZED="0"`).
5. Rodar `npm run db:tcepr-setup` (ou via ensureSchema do import).
- Verificação: tabela criada via query Node/Prisma; `npx prisma validate`.

### Fase 2 — Import (parser XML + script)
1. Criar `scripts/import-tcepr.mjs` (template import-salarios.mjs): ensureSchema(006), leitura streaming (readline), parse por linha das tags `<LicitacaoVencedor .../>`, insertBatch com ON CONFLICT DO UPDATE, logs de progresso.
2. Parser manual sem dependência: função `parseLicitacaoTag(line)` — extração **delimiter-based** (PONTO CRÍTICO): NÃO confiar na 1ª aspa dupla como fechamento, pois `dsItem` tem aspas internas não escapadas (`...DIÂMETRO POÇO 8", EDUTOR DE FERR"`); varrer os atributos em **ordem fixa conhecida**, usando o próximo nome de atributo (ex.: `dsFormaPagamento="`) como delimitador final do valor (principalmente de `dsItem`); decodificar entidades (&amp; &lt; &gt; &quot; &#39;); parseDecimal (ponto), parseDate ISO; descartar linha inválida com log de contagem.
3. MinIO: `listarXmlsDoMinio()` — listObjectsV2 no bucket `MINIO_TCEPR_BUCKET || 'tcepr'`, prefixo `MINIO_TCEPR_PREFIX || '2026/'`, baixar cada `*.xml` para `os.tmpdir()`, processar, limpar. Fallback local: `dados/tcepr/*.xml`.
4. Mapear atributos XML → colunas do model (camelCase). `vlLicitacaoVencedorLicitacao` → `vlLicitacaoVencedor`.
5. `.gitignore`: ignorar `dados/tcepr/*.xml` (arquivos pesados).
- Verificação: `npm run import:tcepr -- dados/tcepr/2026_410010_LicitacaoVencedor.xml` com amostra real; conferir contagem e ausência de duplicatas (re-run = upsert).

### Fase 3 — Backend API
1. `src/features/tcepr/tcepr.types.ts`: `TcePrFiltros` (inclui `apenasVencedores?: boolean`, default `true`), `TcePrBuscaParams`, `TcePrItem`, `TcePrMetricas`, `TcePrFiltrosSugeridos`, `TcePrBuscaResponse`, `OrdenacaoTcePr = 'relevancia' | 'preco_asc' | 'preco_desc' | 'data_desc' | 'data_asc' | 'municipio'`.
2. `src/features/tcepr/tcepr.service.ts`: classe `TceprService.buscar` com pushParam/buildWhere (busca_tsv @@ websearch + similarity + LIKE em dsItem), filtros (municipio/nmMunicipio, modalidade, anoLicitacao, dtHomologacaoInicio/Fim, fornecedor/nmPessoa, **apenasVencedores** default true → `"nrClassificacao" = 1`, valorMin/valorMax em vlLicitacaoVencedor), ORDER BY conforme ordenarPor, LIMIT/OFFSET, facets filtrosSugeridos (municípios, modalidades, anos, top fornecedores), toItem + score; métricas de preço (menor/média/mediana/maior) quando aplicável. Com `apenasVencedores=false`, mantém múltiplas linhas por item (fornecedor/classificação) — base para o mapa comparativo futuro.
3. `src/app/api/tce-pr/buscar/route.ts`: GET com allowRequest/clientIp/tooManyRequests + numberParam/boolParam; lê `?apenasVencedores=false` para incluir todos os concorrentes (default `true` = só vencedor); erro 400; 503 se tabela ausente (padrão NFe).
4. `src/features/tcepr/tcepr.excel.ts`: gerar planilha XLSX (padrão `salarios.excel.ts`/`pesquisa-precos.excel.ts`).
5. `src/app/api/tce-pr/export/route.ts`: POST (runtime nodejs, rate-limit 30), recebe filtros/termo, chama service com limite até 500, retorna Buffer XLSX.
- Verificação: `GET /api/tce-pr/buscar?q=motobomba` (default = vencedores) e `&apenasVencedores=false` (todos os concorrentes); ordenação por preço; filtros; export gera arquivo.

### Fase 4 — Frontend
1. `src/app/tce-pr/page.tsx`: Server Component (molde de `nfe/page.tsx`) + metadata; renderiza `<TcePrSearch />`.
2. `src/components/tcepr/TcePrSearch.tsx`: client orquestrador (padrão CatserSearch) — termo + autocomplete 150ms + AbortController, filtrosAbertos, pagina, ordenar, botão exportar (POST /api/tce-pr/export).
3. `src/components/tcepr/TcePrFiltros.tsx`: props `{ filtros, sugeridos, onAlterar }` (padrão CatserFiltros) — município, modalidade, ano, **toggle apenasVencedores**, período homologação, faixa de preço.
4. `src/components/tcepr/TcePrResults.tsx` + `TcePrPrecosTable.tsx`: cards mobile + table desktop (padrão CatserPrecosTable) — colunas Item/Fornecedor/Município/Entidade/Modalidade/Homologação/Qtd/Unidade/Preço; métricas em cards; paginação Anterior/Próxima.
5. Ordenação por preço: `<select>` (padrão SalariosSearch) — relevancia/preco_asc/preco_desc/data_desc.
6. `src/components/shared/SiteHeader.tsx`: adicionar `['/tce-pr', 'TCE-PR']` no array `links` (+ link opcional no `SiteFooter.tsx`).
- Verificação: navegação na UI; busca + filtros + ordenação + export na mão.

### Fase 5 — Produção/MinIO + docs
1. Subir arquivos XML no bucket MinIO `tcepr` (console) — validar prefixo `2026/`.
2. Confirmar variáveis `MINIO_TCEPR_BUCKET`/`MINIO_TCEPR_PREFIX` no EasyPanel (ajustar se preciso).
3. Deploy manual no EasyPanel (push main + clicar Implantar — não há CI automática).
4. Rodar `npm run import:tcepr` no runner/console do EasyPanel.
5. Atualizar `docs/tcepr/PLANO_TCE_PR.md`: handover log, comandos, documentação da API (ex.: parágrafo de uso), instruções usuário final.
- Verificação: busca em produção com dados reais; contagem de registros.

## Riscos / observações
- **XML malformado**: exemplo mostra aspas duplas dentro do `dsItem` → parser **delimiter-based** (próximo nome de atributo fecha o valor, ex.: `dsFormaPagamento="`); validar com amostra real ANTES de finalizar; descartar linhas inválidas com log de contagem.
- **Tamanho**: arquivos pesados → streaming + batch ~1000; não versionar no git.
- **Ambiente local (rede corporativa)**: `$env:NODE_TLS_REJECT_UNAUTHORIZED="0"` antes de npm/prisma.
- **Nomes camelCase em SQL**: todas as colunas/tabela entre aspas duplas (padrão SalarioCbo), diferente do draft snake_case do plano — por consistência com o padrão escolhido (Salários).
- **`nrLicitacao` pode ser número ou string** conforme município — normalizar.
- Rota `sugestoes` não incluída na v1 (facets vêm no próprio response).

## Escopo
- Incluído: banco, import XML (local+MinIO), API buscar+export, página + componentes, link header, docs, deploy.
- Excluído: rota `sugestoes` dedicada, integração com `FavoritoButton`/`precos.service.ts` (espurgo/outliers), módulo `modulo/` (placeholder), correção do GitHub Actions (higiene pré-existente).
