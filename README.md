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
