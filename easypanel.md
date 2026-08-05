# Easypanel deployment

## Arquivos a incluir no zip

O pacote enviado ao Easypanel deve incluir a pasta dados com os arquivos CSV:
- dados/catmat.csv
- dados/catser.csv

Esses arquivos serão usados pelo seed de produção para popular o banco PostgreSQL.

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
