# FuncionarIA — Fase 9A: QA desktop, mobile, PWA/TWA

## Escopo
QA estrutural da experiência pública, sem criar pedidos, pagamentos, entregas ou sincronizações reais.

## Achado corrigido
Digital Asset Links estava configurado para `funcionaria.net`, mas não para
`<empresa>.funcionaria.net`. Como a associação Android é validada por origem,
a navegação do TWA para a loja/atendimento de uma empresa podia perder a
verificação e cair em Custom Tab com barra do navegador.

A mesma entrada `net.funcionaria.twa` e os mesmos fingerprints já publicados
foram centralizados em `FUNCIONARIA_ENTRY` e agora atendem tanto o apex quanto
qualquer subdomínio `.funcionaria.net`. Nenhum certificado foi adicionado,
removido ou alterado.

## Gate automático
`check:funcionaria-9a` verifica roteamento de subdomínio, manifest, package TWA,
maskable icon, Digital Asset Links, modos online/ambos/presencial e limites
responsivos essenciais do shell/catálogo/carrinho.

Este gate é estrutural. QA visual em aparelhos reais continua sendo um gate
separado antes de declarar a Fase 9 inteira concluída.

## Fase 9B — UX mobile e contratos do checkout

O QA encontrou um problema de usabilidade no catálogo mobile: o carrinho estava após toda a grade de produtos. Em catálogos grandes, o cliente precisava rolar potencialmente dezenas de cards para concluir o pedido.

Correção: quando há itens no carrinho, a experiência standalone exibe um atalho flutuante mobile **Ver pedido**, respeitando safe-area, com quantidade total de unidades e total atual. O botão navega suavemente ao carrinho. O contador do cabeçalho também passa a contar unidades, e não apenas linhas distintas.

O gate 9B confirma ainda que permanecem intactos: cotação obrigatória antes de entrega, telefone com DDD, vínculo do token de entrega, idempotência do pedido, allowlist do checkout de cartão e estados de pagamento.

Nenhuma chamada de pagamento, entrega ou criação de pedido é feita pelo teste.
