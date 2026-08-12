# Skill 6: Consultar NF-e por Chave de Acesso e Gerar Visualização / DANFE

## Objetivo
Permitir que o usuário digite ou cole uma Chave de Acesso de NF-e (44 dígitos), consulte os dados oficiais na API do Portal da Transparência do Governo Federal e visualize o espelho completo da nota (com opção de impressão/PDF do DANFE).

## Regras de Negócio e Entrada
1. **Sanitização da Chave:** Remover espaços e caracteres não numéricos. Validar se possui exatamente 44 dígitos numéricos.
2. **Autenticação:** Utilizar a variável de ambiente `API_TRANSPARENCIA_KEY` configurada no Easypanel para enviar o header `chave-api-dados`.
3. **Persistência de Dados:** Tratar o payload JSON contendo `notaFiscalDTO` e `itensNotaFiscal`.

## Fluxo de Execução
1. Frontend valida o formato da chave (44 dígitos).
2. Chamada `GET` para `/api/nfe/[chave]`.
3. Route Handler do Next.js faz o fetch na API do Governo.
4. Interface exibe o card da NF-e e a tabela de itens.
5. Botão "Imprimir / Exportar DANFE" aciona visualização pronta para impressão.