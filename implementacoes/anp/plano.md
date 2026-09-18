# Plano de implementação tabela ANP

## Introdução

- A tabela ANP trás os custos de combustíveis e derivados de petróleo, permitindo uma análise detalhada dos preços praticados no mercado.

- Toda semana a ANP divulga uma nova tabela em xlsx, que pode ser baixada diretamente da URL `https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/arquivos-lpc/2026/resumo_semanal_lpc_2026-09-06_2026-09-12.xlsx`

Essa URL baixa automaticamente o arquivo xlsx conforme a semana correspondente, permitindo que se obtenha sempre a tabela mais recente divulgada pela ANP.

Esse exemplo se refere à semana de 6 a 12 de setembro de 2026.

As outras semanas podem ser acessadas alterando a data no final da URL, seguindo o mesmo padrão `resumo_semanal_lpc_YYYY-MM-DD_YYYY-MM-DD.xlsx`.

exemplo das próximas semanas:

`resumo_semanal_lpc_2026-09-13_2026-09-19.xlsx`
`resumo_semanal_lpc_2026-09-20_2026-09-26.xlsx`
`resumo_semanal_lpc_2026-09-27_2026-10-03.xlsx`
`resumo_semanal_lpc_2026-10-04_2026-10-10.xlsx`
`resumo_semanal_lpc_2026-10-11_2026-10-17.xlsx`
`resumo_semanal_lpc_2026-10-18_2026-10-24.xlsx`
`resumo_semanal_lpc_2026-10-25_2026-10-31.xlsx`
`resumo_semanal_lpc_2026-11-01_2026-11-07.xlsx`
`resumo_semanal_lpc_2026-11-08_2026-11-14.xlsx`
`resumo_semanal_lpc_2026-11-15_2026-11-21.xlsx`
`resumo_semanal_lpc_2026-11-22_2026-11-28.xlsx`
`resumo_semanal_lpc_2026-11-29_2026-12-05.xlsx`

E assim por diante, seguindo o mesmo padrão semanal.

Arquivo de referência: `resumo_semanal_lpc_2026-09-06_2026-09-12.xlsx` constando os preços de combustíveis e derivados de petróleo para a semana de 6 a 12 de setembro de 2026 na pasta `temp\resumo_semanal_lpc_2026-09-06_2026-09-12.xlsx`

## Objetivo

O objetivo é disponibilizar no sistema os preços de combustíveis e derivados de petróleo atualizados semanalmente, utilizando os dados fornecidos pela ANP na tabela xlsx.

Para isso será necessário criar soluções para automatizar o fluxo de extração dos dados da tabela xlsx e sua integração no sistema.
## Escopo

- Garantir que o sistema utilize sempre os dados mais recentes da ANP.
- Criar uma interface para visualização e consulta dos preços atualizados no sistema mantendo a identidade visual do sistema e responsividade.
- Automatizar o download da tabela semanal da ANP em formato xlsx.
- Extrair os dados relevantes da tabela xlsx.
- Integrar os dados extraídos no sistema, garantindo que os preços de combustíveis e derivados de petróleo estejam sempre atualizados.
- Manter um histórico das tabelas baixadas para referência futura.

## Prompt

Crie um script que baixe automaticamente a tabela semanal da ANP em formato xlsx, utilizando a URL base `https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/arquivos-lpc/2026/` e salvando o arquivo na pasta `temp` com o mesmo nome do arquivo baixado. O script deve permitir a especificação da semana desejada, alterando as datas no final da URL conforme o padrão `resumo_semanal_lpc_YYYY-MM-DD_YYYY-MM-DD.xlsx`.

