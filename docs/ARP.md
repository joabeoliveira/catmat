# Consulta ARP

A listagem inicial consulta as atas armazenadas. Cada ata é mantida por
`numeroControlePncpAta`. Ao abrir seus detalhes, o servidor consulta
`2.1_consultarARPItem_Id`, valida o vínculo e grava os itens por ata/número.
Busca por UASG ou CATMAT consulta `2_consultarARPItem`, em páginas de 200,
com início de vigência entre hoje menos 365 dias e hoje. Atas prorrogadas
com início anterior a essa janela podem não aparecer nessa busca.

Objeto sem código pesquisa as atas locais; na busca por código, objeto e UF
refinam a página retornada pela API. A interface permite navegar pelas páginas.
O detalhe separa preço do item de valor total da ata e separa empenho de adesão.
Saldo é consultado ao selecionar o item, sem ser inferido de dados ausentes.

## Execução

- `DATABASE_URL` aponta para PostgreSQL.
- `ARP_TRANSPORT=curl` seleciona o transporte local alternativo.
- Sem essa variável, o servidor usa fetch nativo. Ambos possuem timeout/retry.
- A API de origem é pública e não recebe chave.
- `POST /api/arp/sincronizar?pagina=N` atualiza um lote de cabeçalhos e retorna
  `proximaPagina`. A rotina não executa uma varredura global dentro da requisição.
- A atualização diária agendada e a retomada persistente de uma carga global
  ainda não estão implementadas. O botão avança os lotes na sessão atual.
- A consulta por código não implica importação de todas as suas atas.

## Validação

Com o servidor em execução, `node scripts/qa-arp.mjs` valida item/ata,
preço, quantidade, repetição da gravação, saldos, busca e parâmetros inválidos.
Use `QA_BASE_URL` para outra porta. O teste consulta a API oficial e atualiza
os itens da ata de referência no banco local.

Não executar `next build` simultaneamente com `next dev` usando a mesma pasta
`.next`: isso pode invalidar os chunks carregados pelo servidor em execução.
