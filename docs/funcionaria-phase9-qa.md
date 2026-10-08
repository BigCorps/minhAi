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

## Fases 9C–9E — lote único de UX segura

Foram agrupadas sem tocar banco ou provedores: acessibilidade/teclado e alvos de toque; proteção de ação duplicada na cotação; e resiliência do Pix quando a Clipboard API falha. Campos públicos receberam nomes acessíveis e autocomplete adequado, seletores de retirada/entrega expõem estado, erros relevantes usam região de alerta e controles do carrinho têm alvo mínimo. O Pix copia-e-cola permanece visível/selecionável como fallback manual.

O gate 9C–9E é estrutural e não cria pedidos, pagamentos ou entregas.

## Fases 9F–9H — retorno e recuperação de pagamento

O retorno InfinitePay já emitia `pagamento=confirmado|processando|erro`, mas a loja pública não apresentava esse estado ao cliente. A interface agora consome o parâmetro uma vez, remove-o da URL e exibe uma mensagem clara. O estado `processando` orienta explicitamente a não pagar novamente.

Pagamentos expirados/cancelados também passam a ter estado terminal próprio, sem deixar botões de cobrança ambíguos, com orientação para iniciar novo pedido. Erros do painel de pagamento são anunciados por regiões acessíveis. O gate permanece estrutural e não aciona provedor financeiro.
