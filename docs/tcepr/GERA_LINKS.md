# Geração de Links TCE-PR

## Obejetivo

- Enriquecer os dados com um link para acessar ao processo licitatório diretamente pelo link.

O link é formado por dados do próprio processo licitatório, como o Id da Licitação, Id da Entidade e o Ano da Licitação.

Basta usar a URL padrão e preencher os parâmetros com os dados do processo licitatório.

PADRÃO:

https://pit.tce.pr.gov.br/Licitacao/LicitacaoDetalhes/Detalhes?IdLicitacao=2457782&IdEntidade=15308&NrAnoLicitacao=2026

idlicitacao=2457782
idPessoa=15308
NrAnoLicitacao=2026

## Status

- ✅ **Implementado em 26/08/2026**: campo `linkTcePr` gerado no serviço (`src/features/tcepr/tcepr.service.ts`) a partir de `idLicitacao` + `idPessoa` (IdEntidade) + `nrAnoLicitacao` (NrAnoLicitacao). Exibido nos resultados (ícone de link ao lado do id da licitação, abre em nova aba) e no export XLSX (coluna "Link TCE-PR" com hiperlink).

