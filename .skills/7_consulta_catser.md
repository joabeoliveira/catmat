# Skill 7: `consulta_catser` (Consulta de Catálogo de Serviços)

## Objetivo

Permitir que o usuário consulte o Catálogo de Serviços (CATSER) por **descrição** quando não souber o código para descobrir qual o código deve usar, exemplo: O usuário digita vigilância + armada, o sistema retornar as descrições mais próximas para poder escolher o código mais adequado, **código do serviço**, grupo, classe ou descrição, retornando os dados cadastrais do item (descrição, grupo, classe e status) e os **preços praticados** obtidos na API de Dados Abertos do Compras.gov.br.

Para que o usuário consiga identificar o CATSER correto, o sistema deve ter os mesmos recursos disponíveis na busca por CATMAT, ou seja, o usuário pode buscar por **descrição** e o sistema deve retornar os resultados mais próximos, permitindo que o usuário escolha o item correto.

Você deve ser capaz de criar funcionalidades seguindo a stack que está sendo utilizada no projeto, que é baseada em Next.js, React, TypeScript e TailwindCSS.

Exemplos de funcionalidades que devem ser implementadas:

- Consulta por **descrição** do serviço, retornando os dados cadastrais do serviço e os preços praticados.

- Consulta por **código do serviço**, retornando os dados cadastrais do serviço e os preços praticados.

- Consulta por **grupo** ou **classe** do serviço, retornando os dados cadastrais do serviço e os preços praticados.

- Consulta por **status** do serviço, retornando os dados cadastrais do serviço e os preços praticados.

- Consulta por **preços praticados**, retornando os dados cadastrais do serviço e os preços praticados.

- Além disso, o sistema deve permitir que o usuário consulte diretamente pelo **código do serviço** (campo `codigoServico` do CSV), retornando os dados cadastrais do serviço.

- O usuário terá a possibilidade de consultar os preços do serviço também com base na API do governo. O sistema deve montar uma espécie de tabela com os preços comparados, média, mediana, menor preço, maior preço. Conforme determina a IN 65/2023, o sistema deve permitir que o usuário filtre os preços por **data**, **UF** e **UASG** entre outros tipos de filtros.

O sistema deve permitir que o usuário monte grades de preços, com base nos preços retornados pela API.

## Dados para carga no banco de dados

- Arquivo CSV fornecido: `dados/catser.csv`.
- Campos do arquivo:

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `codigoGrupo` | string | Código do grupo do serviço. |
| `nomeGrupo` | string | Nome do grupo do serviço. |
| `codigoClasse` | string | Código da classe do serviço. |
| `nomeClasse` | string | Nome da classe do serviço. |
| `codigoServico` | integer | Código do serviço no CATSER (usado como `codigoItemCatalogo` na API de preços). |
| `nomeServico` | string | Descrição detalhada do serviço. |
| `statusServico` | boolean | Indica se o serviço está ativo (`True`/`False`). |

> **Nota:** O campo-chave para a consulta é o `codigoServico`, que corresponde ao `codigoItemCatalogo` da API de preços.

## API do governo para busca de preços

Endpoint: `GET https://dadosabertos.compras.gov.br/modulo-pesquisa-preco/3_consultarServico`

### Parâmetros de consulta

| Parâmetro | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `pagina` | integer | Não | Número da página (padrão: `1`). |
| `tamanhoPagina` | integer | Não | Quantidade de registros por página (padrão: `10`). |
| `codigoItemCatalogo` | integer | **Sim** | Código do serviço no CATSER (campo `codigoServico`). |
| `codigoUasg` | string | Não | Código da UASG. |
| `estado` | string | Não | Sigla do estado (UF). |
| `codigoMunicipio` | integer | Não | Código do município (IBGE). |
| `dataResultado` | boolean | Não | Se `true`, retorna apenas compras com resultado (padrão: `false`). |
| `poder` | string | Não | Poder (Ex.: Executivo, Legislativo, Judiciário). |
| `esfera` | string | Não | Esfera (Ex.: Federal, Estadual, Municipal). |
| `dataCompraInicio` | string | Não | Data inicial da compra no formato `YYYY-MM-DD`. |
| `dataCompraFim` | string | Não | Data final da compra no formato `YYYY-MM-DD`. |
| `idCompra` | string | Não | Identificador da compra. |


### Exemplo (cURL)

```bash
curl -X 'GET' \
  'https://dadosabertos.compras.gov.br/modulo-pesquisa-preco/3_consultarServico?pagina=1&tamanhoPagina=10&codigoItemCatalogo=25852&dataResultado=false' \
  -H 'accept: */*'
```

### Resposta esperada

JSON com informações detalhadas do serviço consultado, incluindo preço unitário, fornecedores, UASG, município e histórico de compras:

```json
{
  "resultado": [
    {
      "idCompra": "string",
      "idItemCompra": 0,
      "forma": "string",
      "modalidade": 0,
      "criterioJulgamento": "string",
      "numeroItemCompra": 0,
      "descricaoItem": "string",
      "codigoItemCatalogo": 0,
      "nomeUnidadeMedida": "string",
      "siglaUnidadeMedida": "string",
      "quantidade": 0,
      "precoUnitario": 0,
      "percentualMaiorDesconto": 0,
      "niFornecedor": "string",
      "nomeFornecedor": "string",
      "codigoUasg": "string",
      "nomeUasg": "string",
      "codigoMunicipio": 0,
      "municipio": "string",
      "estado": "string",
      "codigoOrgao": 0,
      "nomeOrgao": "string",
      "poder": "string",
      "esfera": "string",
      "dataCompra": "2024-01-15",
      "dataHoraAtualizacaoCompra": "2024-01-15T10:30:00",
      "dataHoraAtualizacaoItem": "2024-01-15T10:30:00",
      "dataResultado": "2024-01-15",
      "dataHoraAtualizacaoUasg": "2024-01-15T10:30:00",
      "objetoCompra": "string",
      "descricaoDetalhadaItem": "string",
      "dataAtualizacaoFato": "2026-08-19T14:40:32.035Z"
    }
  ],
  "totalRegistros": 0,
  "totalPaginas": 0,
  "paginasRestantes": 0
}
```

> **Campos relevantes para exibição:** `descricaoItem`, `precoUnitario`, `nomeFornecedor`, `nomeUnidadeMedida`, `siglaUnidadeMedida`, `quantidade`, `nomeUasg`, `municipio`, `estado` e `dataCompra`.

## Endpoint da aplicação

- `GET /api/catser/[codigoServico]` — consulta os dados do serviço e os preços praticados.
  - `codigoServico`: código do serviço no CATSER (campo `codigoServico` do CSV), ex.: `25852`.
  - Resposta: dados cadastrais do serviço + resultado da API de preços.

## Regras de Negócio e Entrada

1. **Sanitização:** Validar que `codigoServico` contém apenas dígitos numéricos.
2. **Fallback:** Se o serviço não existir no banco local, ainda é possível consultar os preços pela API usando `codigoItemCatalogo`.
3. **Paginação:** Usar `pagina` e `tamanhoPagina` (padrão `1` e `10`) para navegar pelos resultados.

## Fluxo de Execução

1. O usuário busca o serviço por **descrição** (Skill 1) ou informa o **código** diretamente.
2. O frontend envia `GET /api/catser/[codigoServico]`.
3. O Route Handler do Next.js busca os dados cadastrais na tabela local (importada do `catser.csv`).
4. O Route Handler chama `3_consultarServico` com `codigoItemCatalogo = codigoServico`.
5. A interface exibe o card do serviço (grupo, classe, descrição, status) e a tabela de preços (preço unitário, fornecedor, UASG, município, data).
6. Os preços podem ser refinados com filtros (data, UF, UASG) e tratados pelas Skills 4 e 5 (métricas e espurgo de outliers).

## Exemplo de Uso

- **Prompt do Usuário:** "me mostre os preços do serviço 25852 (desenvolvimento de software em Java)"
- **Resultado da Skill:** Retorna os dados cadastrais do serviço e a lista de compras com preços, fornecedores e localidades, ordenada por data.
