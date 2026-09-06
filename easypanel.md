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

## Worker de atualização de ARP

O deploy precisa executar dois processos usando a mesma imagem:

- aplicação web: `node server.js`
- worker: `node scripts/arp-adesao-worker.mjs`

O worker executa a carga diária às 02:00 no horário de Brasília, com intervalo padrão de 15 segundos entre páginas.
Configure `ARP_SYNC_HORA` e `ARP_SYNC_INTERVALO_MS` conforme necessário. Em ambientes que aceitam Docker Compose, use `docker-compose.production.yml`, que já define os serviços `web` e `arp-worker`.
