# Easypanel deployment

## Arquivos a incluir no zip

O pacote enviado ao Easypanel deve incluir a pasta dados com os arquivos CSV:
- dados/catmat.csv
- dados/catser.csv

Esses arquivos serão usados pelo seed de produção para popular o banco PostgreSQL.

> **Salários (CBO/INPC):** o `dados/salariosBrasil_INPC.csv` **não** vai no zip (é grande e ignorado pelo Git). Em produção ele é carregado a partir do **MinIO** (bucket `catmat-dados`) via `npm run import:salarios` — veja [README](README.md). Como alternativa, o arquivo pode ser montado localmente e passado como argumento: `npm run import:salarios -- /app/dados-importacao/salariosBrasil_INPC.csv`.

## Recomendação

Ao criar o zip, certifique-se de que a estrutura seja preservada assim:

```text
app/
  package.json
  prisma/
  src/
  dados/
    catmat.csv
    catser.csv
```

## Variáveis de ambiente recomendadas

- DATABASE_URL
- NODE_ENV=production
