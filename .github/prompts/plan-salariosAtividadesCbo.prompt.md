# Plan: Enriquecimento Salarial com Atividades do CBO

**Objetivo:** permitir que o usuário selecione e inclua as atividades oficiais do CBO no posto de trabalho (grade) e na exportação XLSX, com base no CSV `cbo_perfilocupacional.csv` carregado via MinIO (padrão das cargas anteriores).

**Descoberta-chave do código:** os códigos do CSV vêm sem zeros à esquerda em alguns grupos (ex.: ocupação `20105`) e completos em outros (`111305`). Como as tabelas existentes (`SalarioCbo.cbo` = família, `SalarioCboOcupacao.cbo` = ocupação) armazenam `Int` sem pad, basta converter com `Number()` — o relacionamento casa direto, sem normalização extra.

## Fase 1 — Modelagem de Dados

1. Adicionar model `SalarioCboAtividade` em `prisma/schema.prisma` espelhando as colunas do CSV:
   - `cbo` (ocupação → liga `SalarioCboOcupacao`)
   - `familiaCbo` (família → liga `SalarioCbo`)
   - `codigoAtividade`, `nomeAtividade`
   - `siglaGrandeArea`, `grandeArea`
   - códigos de hierarquia (grande grupo/subgrupo/família)
   - `fonte`, `atualizadoEm`
   - Chave única `[cbo, siglaGrandeArea, codigoAtividade]`
   - Índices `cbo`, `familiaCbo`, `grandeArea`

2. Criar `prisma/sql/007_cbo_atividades_referencia.sql` (padrão idempotente dos arquivos 005/006), sem coluna `busca_tsv` — a consulta é por chave `cbo` (índice), não texto livre.

## Fase 2 — Pipeline de Ingestão

3. Criar `scripts/import-cbo-atividades.mjs` seguindo o padrão de `import-cbo-enriquecimento.mjs`/`import-salarios.mjs`:
   - parser CSV (vírgula + aspas)
   - fonte local `data/` ou MinIO (`MINIO_CBO_ATIVIDADES_KEY`, default `cbo_perfilocupacional.csv`)
   - encoding configurável
   - `ensureSchema()` executando o 007
   - upsert em lote com `ON CONFLICT ("cbo","siglaGrandeArea","codigoAtividade")`
   - batch size com clamp (evita limite de 32.767 params do PostgreSQL)

4. Registrar o comando no `package.json` (`import:cbo-atividades`).

## Fase 3 — Camada de API

5. Tipos em `salarios.types.ts`: `SalarioCboAtividade`, `SalarioCboAreaAtividades` (agrupamento por grande área) e `SalarioAtividadesResponse`.

6. Método `buscarAtividades(cbo)` em `SalariosService` (padrão `$queryRawUnsafe` + `pushParam`):
   - CBO ≥ 100000 resolve atividades da ocupação (`WHERE "cbo" = $1`)
   - CBO menor resolve atividades da família (`WHERE "familiaCbo" = $1`) — **não usar "primeiros dígitos de cbo"**; deixar explícita a resolução família × ocupação no SQL para que os cards de nível superior (família, 4 dígitos) **nunca retornem vazio**
   - garantir no `007_cbo_atividades_referencia.sql` o índice `("familiaCbo")` (além do único `(cbo, siglaGrandeArea, codigoAtividade)`) e validar com EXPLAIN na VPS
   - agrupa por `grandeArea`

7. Nova rota `src/app/api/salarios/[cbo]/atividades/route.ts` com rate-limit (padrão das demais rotas).

## Fase 4 — Experiência do Usuário

8. Em `SalariosSearch.tsx`:
   - botão "Atividades do posto" em cada card
   - painel com **checkboxes agrupados por grande área** (selecionar todas/limpar por área, contador)
   - seção "Z — Demonstrar competências pessoais" renderizada **recolhida (collapsed) por padrão** (UX: o CBO/MTE repete dezenas de competências comportamentais em quase todo cargo; exibi-las abertas polui a interface)
   - seleção incluída em `adicionarNaGrade` (`atividadesSelecionadas`) e persistida no `localStorage` existente

9. Em `salarios.excel.ts`: nova coluna "Atividades (CBO)" na planilha de custos (preservando o campo em `normalizarGrade`), com ajuste de merges/colunas/autofilter.

## Relevant Files

- `prisma/schema.prisma` · `prisma/sql/007_cbo_atividades_referencia.sql` — model + SQL
- `scripts/import-cbo-atividades.mjs` · `package.json` — ingestão
- `src/features/salarios/salarios.types.ts` · `salarios.service.ts` · `src/app/api/salarios/[cbo]/atividades/route.ts` — API
- `src/components/salarios/SalariosSearch.tsx` · `src/features/salarios/salarios.excel.ts` — UI/export

## Verification

1. `npx prisma generate` (com workaround SSL) sem erro.
2. `node ./scripts/import-cbo-atividades.mjs` → contagem + amostra CBO `20105` e `111305`.
3. `npx tsc --noEmit` e `npm run build` sem erros.
4. Manual: `/salarios` → buscar "policial militar" → abrir Atividades → selecionar → adicionar à grade → exportar XLSX conferindo a coluna.

## Decisions

- Códigos normalizados via `Number()` para casar com as tabelas existentes (sem pad).
- Sem FTS na nova tabela; sem migrations (SQL idempotente, padrão do projeto).
- Escopo restrito: adicionar seleção de atividades + exibição/exportação; **não altera** a busca/filtros existentes.
- Deploy manual EasyPanel (branch `main`) + import na VPS com MinIO (usuário sem ambiente local).

## Further Considerations

1. Cards sem termo mostram a família (4 dígitos) → o painel exibirá atividades agregadas de todas as ocupações da família. Manter assim? (recomendado: sim)
2. ~~A área "Z — Demonstrar competências pessoais" se repete em toda ocupação; colapsá-la por padrão deixaria o painel mais enxuto.~~ **Decidido:** a seção "Z — Demonstrar competências pessoais" é renderizada recolhida por padrão (ver Fase 4, item 8).
3. Confirmar o tamanho total do CSV antes do import em produção (evitar timeout).
