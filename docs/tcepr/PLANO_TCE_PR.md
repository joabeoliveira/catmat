# Feature: Implantação da API de pesquisa de preços TCE-preços

## 1. Visão Geral

- Objetivo: Implementar a API de pesquisa de preços e interface para consulta de preços com base nos resultados de licitações homologadas pelo TCE-PR Paraná.

## 1. Escopo & Arquitetura

- **Fonte:** Arquivos XML de licitações municipais TCE-PR 2026.
- **Banco de Dados:** Prisma Schema (Model `LicitacaoItemTcePr` ou similar).
- **Serviço/ETL:** Script de parser XML em `scripts/import-tcepr.mjs`.
- **API:** Rota em `src/app/api/tce-pr/route.ts` e `src/features/tcepr/`.

## 2. Checklist de Execução

- [ ] 1. Definir model no `prisma/schema.prisma` e gerar migration
- [ ] 2. Criar script de parse/importação dos XMLs (`scripts/import-tcepr.mjs`)
- [ ] 3. Implementar camada de serviço em `src/features/tcepr/tcepr.service.ts`
- [ ] 4. Criar rotas da API (`src/app/api/tce-pr/buscar/route.ts`)
- [ ] 5. Testes locais com amostra de XML
- [ ] 6. Integração com MinIo para carga inicial dos dados XML
- [ ] 7. Testes de integração completos com todos os componentes (API, serviço, banco de dados, MinIo)
- [ ] 8. Documentação da API e instruções de uso para desenvolvedores e usuários finais


## 2. Start

- Vou começar meu dia preparando os dados que serão importados para o banco de dados a partir dos arquivos XML do TCE-PR.

- Alguns arquivos são pesados o que demanda cuidado para não versionar no repositório.

## 3. Amostra dos dados

```xml
<root>
<LicitacaoVencedor cdIBGE="410010" nmMunicipio="ABATIÁ" idPessoa="15308" nmEntidade="SERVIÇO AUTÔNOMO MUNICIPAL DE ÁGUA E ESGOTO DE ABATIÁ" idlicitacao="2457782" nrAnoLicitacao="2026" nrLicitacao="1" dsModalidadeLicitacao="Processo Dispensa" nmPessoa="C & X DISTRIBUICAO DE PRODUTOS HIDRAULICOS LTDA" nrDocumento="38349410000115" nrLote="1" nrItem="1" nrQuantidade="1.000" idUnidadeMedida="7" dsUnidadeMedida="Unidade" vlMinimoUnitarioItem="40806.20000" vlMinimoTotal="40806.20" vlMaximoUnitarioitem="40806.20000" vlMaximoTotal="40806.20" dsItem="CONJUNTO DE MOTOBOMBA SUBMERSÍVEL, POTÊNCIA MÁXIMA DE 35 CV TENSÃO DE FUNCIONAMENTO 220 VOLTS, TRIFÁSICO, 60 HZ, TENSÃO DE ENROLAMENTO 220/380 VOLTS, BOMBEADORES EM AÇO INOX, ALTURA MANOMÉTRICA TOTAL (MCA) 199 METROS, DIÂMETRO POÇO 8", EDUTOR DE FERR" dsFormaPagamento="À VISTA" nrPrazoLimiteEntrega="15" idTipoEntregaProduto="1" dsTipoEntregaProduto="Parcela Única" nrQuantidadePropostaLicitacao="1.000" vlPropostaItem="28449.00" dtValidadeProposta="2026-04-04T00:00:00" dtPrazoEntregaPropostaLicitacao="2026-03-05T00:00:00" nrQuantidadeVencedorLicitacao="1.000" vlLicitacaoVencedorLicitacao="28449.00" nrClassificacao="1" dtHomologacao="2026-02-27T00:00:00" ultimoEnvioSIMAMNesteExercicio="2026/06" DataReferencia="2026/07 "/>
<LicitacaoVencedor cdIBGE="410010" nmMunicipio="ABATIÁ" idPessoa="15308" nmEntidade="SERVIÇO AUTÔNOMO MUNICIPAL DE ÁGUA E ESGOTO DE ABATIÁ" idlicitacao="2457782" nrAnoLicitacao="2026" nrLicitacao="1" dsModalidadeLicitacao="Processo Dispensa" nmPessoa="GODANT VAREJISTA LTDA" nrDocumento="47382268000107" nrLote="1" nrItem="1" nrQuantidade="1.000" idUnidadeMedida="7" dsUnidadeMedida="Unidade" vlMinimoUnitarioItem="40806.20000" vlMinimoTotal="40806.20" vlMaximoUnitarioitem="40806.20000" vlMaximoTotal="40806.20" dsItem="CONJUNTO DE MOTOBOMBA SUBMERSÍVEL, POTÊNCIA MÁXIMA DE 35 CV TENSÃO DE FUNCIONAMENTO 220 VOLTS, TRIFÁSICO, 60 HZ, TENSÃO DE ENROLAMENTO 220/380 VOLTS, BOMBEADORES EM AÇO INOX, ALTURA MANOMÉTRICA TOTAL (MCA) 199 METROS, DIÂMETRO POÇO 8", EDUTOR DE FERR" dsFormaPagamento="À VISTA" nrPrazoLimiteEntrega="15" idTipoEntregaProduto="1" dsTipoEntregaProduto="Parcela Única" nrQuantidadePropostaLicitacao="1.000" vlPropostaItem="40700.00" dtValidadeProposta="2026-04-04T00:00:00" dtPrazoEntregaPropostaLicitacao="2026-03-05T00:00:00" nrQuantidadeVencedorLicitacao="1.000" vlLicitacaoVencedorLicitacao="40700.00" nrClassificacao="2" dtHomologacao="2026-02-27T00:00:00" ultimoEnvioSIMAMNesteExercicio="2026/06" DataReferencia="2026/07 "/>
</root>
```

## 4. Banco de dados

- Precisamos criar nova tabela para ser usado nas consultas no banco PostgreSQL
- Sugestão de SQL para a nova tabela:

```sql
-- Garante que a extensão de busca por similaridade de texto está habilitada
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Tabela principal de itens e preços homologados no TCE-PR
CREATE TABLE IF NOT EXISTS licitacao_vencedor_tcepr (
    id BIGSERIAL PRIMARY KEY,
    
    -- Dados da Entidade e Município
    cd_ibge VARCHAR(10),
    nm_municipio VARCHAR(150),
    id_pessoa BIGINT,
    nm_entidade VARCHAR(255),
    
    -- Dados do Processo Licitatório
    id_licitacao BIGINT NOT NULL,
    nr_ano_licitacao INTEGER,
    nr_licitacao INTEGER,
    ds_modalidade_licitacao VARCHAR(100),
    dt_homologacao TIMESTAMP,
    
    -- Dados do Fornecedor / Proponente
    nr_documento VARCHAR(20) NOT NULL, -- CNPJ/CPF do fornecedor
    nm_pessoa VARCHAR(255),
    
    -- Dados do Item e Proposta
    nr_lote INTEGER DEFAULT 1,
    nr_item INTEGER NOT NULL,
    ds_item TEXT NOT NULL,
    id_unidade_medida INTEGER,
    ds_unidade_medida VARCHAR(50),
    nr_quantidade NUMERIC(15, 3),
    
    -- Valores de Referência / Máximo / Mínimo
    vl_minimo_unitario_item NUMERIC(15, 4),
    vl_minimo_total NUMERIC(15, 2),
    vl_maximo_unitario_item NUMERIC(15, 4),
    vl_maximo_total NUMERIC(15, 2),
    
    -- Valores da Proposta e Vencedor
    nr_quantidade_proposta NUMERIC(15, 3),
    vl_proposta_item NUMERIC(15, 4),
    nr_quantidade_vencedor NUMERIC(15, 3),
    vl_licitacao_vencedor NUMERIC(15, 4),
    nr_classificacao INTEGER NOT NULL,
    
    -- Condições Comerciais e Prazos
    ds_forma_pagamento VARCHAR(100),
    nr_prazo_limite_entrega INTEGER,
    id_tipo_entrega_produto INTEGER,
    ds_tipo_entrega_produto VARCHAR(100),
    dt_validade_proposta TIMESTAMP,
    dt_prazo_entrega_proposta TIMESTAMP,
    
    -- Controle SIMAM / TCE-PR
    ultimo_envio_simam VARCHAR(10),
    data_referencia VARCHAR(10),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Restrição de unicidade para evitar duplicatas em re-importações
    CONSTRAINT unq_tcepr_item_fornecedor_classificacao 
        UNIQUE (id_licitacao, nr_lote, nr_item, nr_documento, nr_classificacao)
);

-- -------------------------------------------------------------
-- Índices para otimização de consultas e relatórios
-- -------------------------------------------------------------

-- 1. Busca textual rápida por similaridade ou ilike no nome do item
CREATE INDEX IF NOT EXISTS idx_tcepr_ds_item_trgm 
    ON licitacao_vencedor_tcepr USING gin (ds_item gin_trgm_ops);

-- 2. Filtro por CNPJ/CPF do fornecedor
CREATE INDEX IF NOT EXISTS idx_tcepr_nr_documento 
    ON licitacao_vencedor_tcepr (nr_documento);

-- 3. Filtro geográfico e temporal (Município / Ano)
CREATE INDEX IF NOT EXISTS idx_tcepr_ibge_ano 
    ON licitacao_vencedor_tcepr (cd_ibge, nr_ano_licitacao);

-- 4. Filtro por data de homologação (para ordenação recente -> antigo)
CREATE INDEX IF NOT EXISTS idx_tcepr_dt_homologacao 
    ON licitacao_vencedor_tcepr (dt_homologacao DESC);

-- 5. Consulta por ID da Licitação
CREATE INDEX IF NOT EXISTS idx_tcepr_id_licitacao 
    ON licitacao_vencedor_tcepr (id_licitacao);
```

## 5. Arquivos para carga

Os arquivos seguem um padrão de nomes que facilita a identificação do conteúdo e da data de referência.

Exemplo de nome de arquivo: 

- `2026_410010_LicitacaoVencedor.xml`

ano 2026
orgao 410010
tipo LicitacaoVencedor
extensao xml

# Lista completa de nomes de arquivos

```typescript
export const arquivosLicitacao = [
    "2026_410010_LicitacaoVencedor",
    "2026_410020_LicitacaoVencedor",
    "2026_410030_LicitacaoVencedor",
    "2026_410040_LicitacaoVencedor",
    "2026_410045_LicitacaoVencedor",
    "2026_410050_LicitacaoVencedor",
    "2026_410060_LicitacaoVencedor",
    "2026_410070_LicitacaoVencedor",
    "2026_410080_LicitacaoVencedor",
    "2026_410090_LicitacaoVencedor",
    "2026_410100_LicitacaoVencedor",
    "2026_410105_LicitacaoVencedor",
    "2026_410110_LicitacaoVencedor",
    "2026_410115_LicitacaoVencedor",
    "2026_410120_LicitacaoVencedor",
    "2026_410130_LicitacaoVencedor",
    "2026_410140_LicitacaoVencedor",
    "2026_410150_LicitacaoVencedor",
    "2026_410160_LicitacaoVencedor",
    "2026_410165_LicitacaoVencedor",
    "2026_410170_LicitacaoVencedor",
    "2026_410180_LicitacaoVencedor",
    "2026_410185_LicitacaoVencedor",
    "2026_410190_LicitacaoVencedor",
    "2026_410200_LicitacaoVencedor",
    "2026_410210_LicitacaoVencedor",
    "2026_410220_LicitacaoVencedor",
    "2026_410230_LicitacaoVencedor",
    "2026_410240_LicitacaoVencedor",
    "2026_410250_LicitacaoVencedor",
    "2026_410260_LicitacaoVencedor",
    "2026_410270_LicitacaoVencedor",
    "2026_410275_LicitacaoVencedor",
    "2026_410280_LicitacaoVencedor",
    "2026_410290_LicitacaoVencedor",
    "2026_410300_LicitacaoVencedor",
    "2026_410310_LicitacaoVencedor",
    "2026_410315_LicitacaoVencedor",
    "2026_410320_LicitacaoVencedor",
    "2026_410322_LicitacaoVencedor",
    "2026_410330_LicitacaoVencedor",
    "2026_410335_LicitacaoVencedor",
    "2026_410337_LicitacaoVencedor",
    "2026_410340_LicitacaoVencedor",
    "2026_410345_LicitacaoVencedor",
    "2026_410347_LicitacaoVencedor",
    "2026_410350_LicitacaoVencedor",
    "2026_410360_LicitacaoVencedor",
    "2026_410370_LicitacaoVencedor",
    "2026_410380_LicitacaoVencedor",
    "2026_410390_LicitacaoVencedor",
    "2026_410395_LicitacaoVencedor",
    "2026_410400_LicitacaoVencedor",
    "2026_410405_LicitacaoVencedor",
    "2026_410410_LicitacaoVencedor",
    "2026_410420_LicitacaoVencedor"
]


## 4. Handover Log (Onde Parei)

> **Sessão: 26/08/2026 (implementação via GitHub Copilot)**
>
> **O que foi feito:**
> - **Fase 1 (Banco) — código pronto:** model `LicitacaoVencedorTcePr` em `prisma/schema.prisma` (camelCase, chave única `[idLicitacao, nrLote, nrItem, nrDocumento, nrClassificacao]`); `prisma/sql/006_tcepr_referencia.sql` (tabela + `busca_tsv` + índices GIN trgm/tsv); scripts `import:tcepr` e `db:tcepr-setup` no `package.json`. `npx prisma validate` ✅ e `npx prisma generate` ✅. **Tabela AINDA NÃO criada no banco** (sem `DATABASE_URL` acessível na sessão).
> - **Fase 2 (Import) — pronto e testado:** `scripts/import-tcepr.mjs` (parser XML delimiter-based, sem dependência; MinIO bucket `tcepr` com `MINIO_TCEPR_BUCKET`/`MINIO_TCEPR_PREFIX`; fallback `data/tcepr` e `data/`). Validado contra `data/2026_410010_LicitacaoVencedor.xml`: 2609 tags, 0 inválidas, 941 vencedores, `dsItem` com aspas internas ok.
> - **Fase 3 (API) — código pronto (sem teste real):** `src/features/tcepr/tcepr.types.ts`, `tcepr.service.ts` (busca por `busca_tsv`/similaridade, filtros, ordenação por preço, facets, métricas, `apenasVencedores`), `tcepr.excel.ts` (XLSX); rotas `src/app/api/tce-pr/buscar/route.ts` (GET) e `src/app/api/tce-pr/export/route.ts` (POST). `npx tsc --noEmit` ✅.
> - **Fase 4 (Frontend) — código pronto (sem teste real):** `src/app/tce-pr/page.tsx`, `src/components/tcepr/TcePrSearch.tsx` (busca + ordenação + export XLSX), `TcePrFiltros.tsx`, `TcePrResults.tsx`, `TcePrPrecosTable.tsx` (cards mobile + tabela desktop); link `TCE-PR` no `SiteHeader.tsx`. `npx tsc --noEmit` ✅.
> - **Git:** branch `main` sincronizada; XMLs/CSVs ignorados (`.gitignore` com `data/*.xml`, `data/*.csv`).
>
> **O que falta para rodar em Casa:**
> 1. Definir `DATABASE_URL` (Postgres local via `docker-compose`/serviço ou remoto) e rodar a criação da tabela:
>    `npm run db:tcepr-setup` (ou `npx prisma db execute --file prisma/sql/006_tcepr_referencia.sql --schema prisma/schema.prisma`).
> 2. Importar a carga (amostra já em `data/2026_410010_LicitacaoVencedor.xml`):
>    `npm run import:tcepr -- data` (ou passar arquivo/pasta específica).
> 3. Subir `npm run dev` e testar `GET /api/tce-pr/buscar?q=motobomba`, ordenação por preço e export XLSX; conferir a página `/tce-pr`.
>
> **Próximo comando a rodar:** `npm run db:tcepr-setup` (com `DATABASE_URL` definida) → `npm run import:tcepr -- data` → `npm run dev`.
