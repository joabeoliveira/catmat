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
