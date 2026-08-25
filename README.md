# MVP CATMAT/CATSER

## Variáveis de ambiente

Para consultar NF-e pela chave de acesso, configure:

```bash
API_TRANSPARENCIA_KEY=seu_token_do_portal_da_transparencia
```

## Importação de CSVs

Os arquivos CSV de exemplo ficam em [dados](dados).

Para preparar a importação dos arquivos no ambiente de implantação, execute:

```bash
npm run seed:csv
```

O fluxo de seed pode ser expandido para popular o banco PostgreSQL com os dados de CATMAT e CATSER quando a conexão estiver disponível.

## Carga de itens de NF-e

Monte a pasta do servidor com os CSVs no container em:

```bash
/app/dados-importacao
```

Com o arquivo disponível, execute no terminal do container da aplicação:

```bash
npm run import:nfe -- /app/dados-importacao/202608_NFe_NotaFiscalItem.csv
```

O script cria a tabela e os índices de busca quando necessário, importa em lotes e atualiza registros repetidos pela combinação `chave_acesso + numero_produto`.
Por padrão, o CSV é lido como `latin1`, formato comum nos arquivos públicos de NF-e. Se algum arquivo vier em outro encoding, ajuste antes do comando:

```bash
NFE_IMPORT_ENCODING=utf8 npm run import:nfe -- /app/dados-importacao/arquivo.csv
```

## Carga da base BPS

Com o arquivo `bps.CSV` disponível no mount de importação, execute no terminal do container da aplicação:

```bash
npm run import:bps -- /app/dados-importacao/bps.CSV
```

O script cria a tabela `bps_itens_referencia`, configura índices de busca textual e atualiza registros repetidos pelo campo `Seq. Compra Item`.
Por padrão, o CSV é lido como `latin1`. Se necessário, ajuste:

```bash
BPS_IMPORT_ENCODING=utf8 npm run import:bps -- /app/dados-importacao/bps.CSV
```

## Carga da base de Salários (CBO/INPC)

A base de salários (`dados/salariosBrasil_INPC.csv`) pode ser carregada de **duas formas**:

**Opção 1 — Arquivo local (padrão de desenvolvimento):**

```bash
npm run import:salarios -- dados/salariosBrasil_INPC.csv
```

**Opção 2 — MinIO (produção):** com o CSV no bucket `catmat-dados` do MinIO, o import baixa o objeto via S3 SDK e popula o banco sem precisar do arquivo no servidor:

```bash
npm run import:salarios
```

O script prioriza o MinIO quando as variáveis abaixo existem e cai para o arquivo local caso contrário:

- `MINIO_ENDPOINT` — ex.: `https://s3.gptgov.com.br`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`
- `MINIO_BUCKET` — ex.: `catmat-dados`
- `MINIO_CSV_KEY` — ex.: `salariosBrasil_INPC.csv`
