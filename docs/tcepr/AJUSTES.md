# Ajustes TCE-PR

> Status: ✅ **Implementado em 26/08/2026** (commit `fb0ebbb`, na `main` — requer novo deploy no EasyPanel para testar).

1. Ao inserir o nome da pesquisa não está sugerindo nomes igual Consulta CATMAR e CATSER
   - ✅ Adicionado endpoint `GET /api/tce-pr/sugestoes?q=...` e autocomplete (debounce 150ms) no campo de busca, no mesmo padrão do CATMAT/CATSER.

2. O que deve aparecer no resultado:

Os resultados devem levar em consideração o que o usuário precisa ver de mais relevante do processo de licitação.

- Item (descrição) é o mais importante para o usuário poder analisar os resultados da pesquisa. dar um destaque maior do jeito que está agora ficou muito exprimido e causando uma experiência ruim
- Data da homologação
- Quantidade do itens
- Valor unitário homologado
- Orgão
- Fornecedor
- Id da licitacao

Isso é o suficiente.
   - ✅ Resultado reformulado: **Item em destaque** (fonte maior/negrito), Valor homologado em evidência, e apenas Homologação, Quantidade (+unidade), Órgão, Fornecedor e Id da licitação (com botão copiar). Colunas extras (Município/Modalidade/CNPJ/Classificação) removidas dos cards e da tabela.

3. refinamento da busca

No resultado o usuário deve ter a possibilidade de refinar a busca com outras características do descritivo igual foi implementado em CATMAT.

A ideia é que o usuário consiga ter o máximo de funcionalidades que ajudem a encontrar o que procura de forma rápida e eficiente.
   - ✅ Campo **"Refinar resultados"** adicionado na busca (debounce 400ms): palavras separadas por vírgula/espaço que **todas** devem aparecer no descritivo do item (E-lógico), mesmo padrão do CATMAT. Também disponível no export XLSX e reflete nos filtros sugeridos (facets).
