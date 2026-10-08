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

## Fases 9I–9K — retorno real, carrinho incorporado e consistência de entrega

1. **9I:** A URL de retorno InfinitePay passava por `funcionaria.net/vendas/<slug>`, mas o middleware do host principal reescrevia o caminho para a área interna, não para a loja. A URL agora aponta para `https://<slug>.funcionaria.net/vendas?pagamento=<estado>`, coberta pelo roteamento de subdomínio e pelo painel público que lê os três estados. O slug permanece validado antes do redirect; erro de validação continua usando fallback seguro.
2. **9J:** Atalho mobile **Ver pedido** agora aparece também no catálogo incorporado aos modos online/ambos. O botão de conversar no modo online fica acima dele, sem sobreposição. Mensagens de erro do pedido aparecem perto do botão de finalização, em vez de ficar escondidas no topo do catálogo.
3. **9K:** Resposta antiga de cotação Lalamove é ignorada quando produtos, endereço ou modalidade mudam. Cotações vencidas são recusadas antes de concluir o pedido. A chave de idempotência permanece estável para repetição da mesma solicitação e é renovada quando conteúdo do pedido muda; duplo envio síncrono é bloqueado por ref.

**Escopo dos testes:** verificações estruturais no prebuild, sem gerar cotações, pagamentos, pedidos ou tráfego para provedores externos. Validação visual manual e E2E autenticado seguem pendentes e não são confundidos com os gates estruturais.

## Revisão de segurança pré-integração — retorno de pagamento

O parâmetro `?pagamento=confirmado` é manipulável pelo navegador; mesmo que a rota do provedor só produza esse estado após consultar a Edge Function, **a página que recebe o parâmetro não pode tratá-lo como prova de pagamento**. A mensagem de retorno é agora apenas informativa e orienta conferir o pedido; uma confirmação real só pode ser apresentada após resposta de status verificada pelo servidor, como a confirmação exibida pelo `FuncionarIAStorefrontPaymentPanel`. O cartão também aplica a mesma allowlist `checkout.bigcorps.com.br` ao botão de *reabrir* checkout, não só ao checkout inicial. Adicionado gate regressivo sem envolver pagamentos reais.
