# Referência de Implementação — CATSER / Pesquisa de Preços / PNCP

> Pasta de referência para novas implementações. Data: 2026-08-19.
> Padrões validados na sessão atual — use como guia para features futuras.

---

## 1. Stack e convenções do projeto

- Next.js 14 (App Router), React 18, TypeScript, TailwindCSS.
- Prisma + PostgreSQL. Import de dados via scripts Node (`scripts/*.mjs`).
- UI primitives em `src/components/ui/` (Card, Button, Input, Select, Badge, Skeleton).
- Componentes de feature em `src/components/<modulo>/`.
- Backend: `src/features/<modulo>/*.service.ts` + rotas em `src/app/api/<modulo>/**`.
- Deploy: EasyPanel dispara a cada push em `main`.

---

## 2. Módulo CATSER — arquivos

| Arquivo | Papel |
| --- | --- |
| `src/features/catser/catser.service.ts` | Busca (FTS+trigram), `buscarPorCodigo`, `consultarPrecos` (API gov) |
| `src/features/catser/catser.types.ts` | Tipos compartilhados (item, busca, preços) |
| `src/app/api/catser/route.ts` | Busca `?q=...` + filtros (`codigoGrupo`, `codigoClasse`, `statusServico`) |
| `src/app/api/catser/sugestoes/route.ts` | Autocomplete (`nomeServico`) |
| `src/app/api/catser/[codigoServico]/route.ts` | Cadastral |
| `src/app/api/catser/[codigoServico]/precos/route.ts` | Preços + enriquecimento `link_evidencia` |
| `src/app/catser/page.tsx` | Página |
| `src/components/catser/*` | `CatserSearch`, `CatserResults`, `CatserPrecosTable`, `CatserFiltros`, `CatserPrecosPanel` |
| `src/features/pesquisa/pesquisa-precos.excel.ts` | Geração do Excel IN 65/2021 |
| `src/app/api/catser/pesquisa/export/route.ts` | Endpoint de download `.xlsx` |
| `src/lib/pncp.ts` | Resolver do link de auditoria PNCP |
| `prisma/sql/004_catser_referencia.sql` | Setup FTS/trigram/índices do CATSER |
| `scripts/import-catser.mjs` | Import do `catser.csv` |

---

## 3. API do governo — endpoints oficiais usados

### Pesquisa de preços (materiais e serviços)

- **Material:** `GET https://dadosabertos.compras.gov.br/modulo-pesquisa-preco/1_consultarMaterial`
  - Contrato vigente: `tipo=codigoItemCatalogo&codigo={item}` (o antigo `?codigoItemCatalogo=` responde 404).
- **Serviço:** `GET .../modulo-pesquisa-preco/3_consultarServico`
  - Parâmetros: `codigoItemCatalogo={servico}`, `pagina`, `tamanhoPagina` (10–500), `dataResultado`, `estado` (UF), `codigoUasg`, `codigoMunicipio`, `poder` (E/L/J), `esfera` (F/E/M), `dataCompraInicio/Fim`.
- Retorna `resultado[]` com: `idCompra`, `idItemCompra`, `codigoUasg`, `modalidade`, `dataCompra`, `precoUnitario`, `nomeFornecedor`, `nomeUasg`, `municipio`, `estado`, `objetoCompra`, `poder`, `esfera`, etc.
- ⚠️ **Não retorna `linkCompraPncp`** — o link é sempre resolvido (ver seção 5).

### Módulo de contratações (link PNCP — autoritativo)

- `GET https://dadosabertos.compras.gov.br/modulo-contratacoes/1.1_consultarContratacoes_PNCP_14133_Id?tipo=idCompra&codigo={idCompra}`
- Retorna `resultado[0]` com: `orgaoEntidadeCnpj`, `anoCompraPncp`, `sequencialCompraPncp`, `numeroControlePNCP` (ex.: `28521748000159-1-000096/2026`), `unidadeOrgaoCodigoUnidade`, `modalidadeIdPncp`.
- ⚠️ **Tem lacunas**: alguns `idCompra` de órgãos federais retornam vazio → usar o resolver secundário.
- Funciona **sem chave** (pública).

### Busca pública PNCP (resolver secundário)

- `GET https://pncp.gov.br/api/search?tipos_documento=edital&q={UASG} {ano} {numero}&pagina=1&tamanhoPagina=30`
- Retorna `items[]` com: `orgao_cnpj`, `ano`, `item_url` (`/compras/{cnpj}/{ano}/{seq}`), `numero_sequencial`, `unidade_codigo` (UASG), `title` (contém `nº {numero}/{ano}`).
- Requer header `user-agent` de navegador (bloqueia user-agent simples).

### Autenticação (não usada no fluxo atual)

- Swagger: `https://dadosabertos.compras.gov.br/v3/api-docs` (UI em `/swagger-ui/index.html`).
- `bearerAuth` (JWT) via `POST /autenticacao/login` (login + senha). A `CHAVE_API_COMPRAS_GOV` NÃO autentica módulos UASG/contratações diretamente.

---

## 4. Estrutura do `idCompra`

```
{UASG(6)}{modalidade(2)}{numero(N)}{ano(4)}
```

- Ex.: `98586505900152026` → UASG 985865, modalidade 05, número 90015, ano 2026.
- O `numero` (posições 8 até -4) e o `ano` (últimos 4) são usados no resolver secundário.
- O número que vai na URL do PNCP é o **`sequencialCompraPncp`** (do módulo de contratações), não o `numero` do idCompra.

---

## 5. Link de auditoria PNCP — resolver em cascata

Arquivo: `src/lib/pncp.ts` → `montarLinkPncp(idCompra)`.

1. **Primário (autoritativo):** módulo de contratações pelo `idCompra` → `orgaoEntidadeCnpj` + `anoCompraPncp` + `sequencialCompraPncp`.
2. **Secundário:** busca PNCP por `UASG + ano + número` (decodificado), casa título `nº {numero}/{ano}`, usa o `item_url` convertido para `/editais/`.
3. **Fallback:** `https://pncp.gov.br/app/compras?busca={idCompra}` (textual, não bloqueia).

Link final: `https://pncp.gov.br/app/editais/{cnpj}/{ano}/{sequencial}`

- CNPJ só números; sequencial sem zeros à esquerda.
- Cache em memória por `idCompra` (TTL 24h).
- Saída no item de preço: `link_evidencia` (e `linkPncp` para UI/Excel).
- **Regra:** resolver no backend, nunca montar link no frontend.

---

## 6. Filtros de preços (validados na API real)

| Filtro | Parâmetro | Valores |
| --- | --- | --- |
| UF/região | `estado` | `RJ`, `SP`, ... (27 UFs) |
| Órgão | `codigoUasg` | 6 dígitos |
| Período | `dataCompraInicio` / `dataCompraFim` | `YYYY-MM-DD` |
| Poder | `poder` | `E` (Executivo), `L` (Legislativo), `J` (Judiciário) |
| Esfera | `esfera` | `F` (Federal), `E` (Estadual), `M` (Municipal) |
| Município | `codigoMunicipio` | código IBGE |

⚠️ `poder`/`esfera` usam **código de 1 letra** — enviar nome por extenso retorna 0 registros.

---

## 7. Pesquisa de preços IN 65/2021 (Excel)

- `src/features/pesquisa/pesquisa-precos.excel.ts` → `gerarPlanilhaPesquisaPrecos(dados)` retorna `Buffer`.
- 3 abas: Documento (identificação + objeto + filtros + preço de referência), Preços (lista com ID Compra + Link PNCP), Resumo (métricas + metodologia).
- Endpoint: `POST /api/catser/pesquisa/export` (retorna `.xlsx` via `new NextResponse(new Uint8Array(buffer), ...)` — **não** usar `Buffer` direto no tipo BodyInit).
- UI: formulário no `CatserPrecosPanel` → POST → blob → download.

---

## 8. Como testar (sem deploy)

```bash
# Testar resolver PNCP (tsx lê o alias @/ via tsconfig)
cat > scripts/_t.mts <<'EOF'
import { montarLinkPncp, linkBuscaPncp } from '../src/lib/pncp'
const link = await montarLinkPncp('98586505900152026')
console.log(link ?? linkBuscaPncp('98586505900152026'))
EOF
npx tsx scripts/_t.mts && rm -f scripts/_t.mts

# Testar geração do Excel
npx tsx scripts/_test-excel.mts  # (criar com dados de exemplo)
```

> ⚠️ Arquivos de teste temporários devem ser removidos antes do commit.

---

## 9. Lições aprendidas

- **Contrato do endpoint de preços:** `tamanhoPagina` mínimo 10 (abaixo → 404 "Resource not found"). O contrato antigo `?codigoItemCatalogo=` do material passou a 404; usar `tipo=codigoItemCatalogo&codigo=`.
- **`poder`/`esfera`:** códigos de 1 letra, não nomes.
- **`NextResponse` não aceita `Buffer` do Node** no tipo `BodyInit` — converter para `Uint8Array`.
- **PNCP bloqueia curl com user-agent simples** — usar user-agent de navegador.
- **Arquivos temporários de investigação** (`apidocs.json`, `*.json` de teste) não devem ir para o git — usar `.gitignore` ou remover antes do commit.
- **O `Select` do projeto usa `onChange` nativo** (não `onValueChange` como shadcn).
- **`CHAVE_API_COMPRAS_GOV`** é do Portal da Transparência (usada na NF-e); não serve para módulos UASG/contratações da dados abertos.
- **O módulo de contratações tem lacunas** para alguns órgãos federais — por isso o resolver em cascata com a busca do PNCP.

---

## 10. Pendências conhecidas

- Schema `CompraServicoItem` + `ServicoPrecoResumo` (Opção A) — cache/persistência de preços de serviços.
- Espurgo de outliers (Skill 5) sobre preços de serviços.
- Paginação completa do histórico (hoje 10 registros).
- Expor `link_evidencia` na página `/material/[codigo]` (CATMAT).
- Validação em produção das 9 linhas de exemplo do link PNCP (seção 16 do PLANO_CATSER.md).
