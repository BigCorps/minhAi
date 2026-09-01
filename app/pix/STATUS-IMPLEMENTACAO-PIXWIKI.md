# PixWiki — Status de Implementação

Atualizado em: **23/08/2026**

## Base existente

- [x] Fases 1–9 do PixWiki
- [x] Conexão Mercado Pago por OAuth
- [x] Chave Pix e Pix Link
- [x] Histórico, Realtime e notificações
- [x] Multiempresa, relatórios, API e Webhooks

## Pix Grátis inteligente compartilhado

- [x] `pix_direct_intents`
- [x] reserva de valor exato primeiro
- [x] desconto somente em colisão, de R$ 0,01 a R$ 0,10
- [x] trava transacional + índice único para concorrência
- [x] escopo unificado por conta Mercado Pago (`mpuser`)
- [x] `pix_payment_preferences` com opt-in
- [x] `allow_payer_choice` no PixWiki
- [x] reconciliador único `pix-direct-reconcile`
- [x] minhAi V2 ligada ao reconciliador
- [x] PixWiki ligado ao reconciliador
- [x] FuncionarIA ligado ao reconciliador
- [x] `auto-confirmar-pix` roteando os três produtos
- [x] fluxo legado preservado quando não existe preferência
- [x] helpers financeiros restritos ao `service_role`
- [x] interface exibe desconto apenas quando aplicado
- [x] aba Pagamentos no dashboard PixWiki
- [x] escolha opcional do pagador no Pix Link

## Estado no Supabase em 23/08/2026

As migrations e Edge Functions desta entrega foram aplicadas diretamente no projeto de produção via MCP. No momento da validação final não havia nenhuma preferência `pix_payment_preferences` criada para clientes e não havia intenção direta pendente; portanto nenhum cliente existente foi convertido automaticamente.

## QA recomendado após subir o ZIP no GitHub/Vercel

- [ ] confirmar build Vercel da interface
- [ ] abrir minhAi Vendas e verificar que o modo atual aparece sem migrar a empresa
- [ ] configurar uma conta de QA com chave Pix + Mercado Pago e optar por Pix Grátis
- [ ] gerar R$ 59,90 sem colisão e confirmar R$ 59,90
- [ ] abrir segunda cobrança R$ 59,90 na mesma conta e confirmar R$ 59,89
- [ ] abrir terceira cobrança e confirmar R$ 59,88
- [ ] repetir a colisão entre PixWiki e minhAi usando a mesma conta Mercado Pago
- [ ] testar Pix pelo Mercado Pago e confirmar valor exato
- [ ] testar `Permitir que o pagador escolha` no PixWiki
- [ ] confirmar baixa de pedido/estoque no fluxo de vendas

O teste com pagamento real deve ser feito somente em conta de QA e com valores pequenos.
