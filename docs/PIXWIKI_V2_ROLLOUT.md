# PixWiki V2 — ordem de rollout

## Pré-requisitos
1. Backup lógico/Point-in-Time Recovery compatível com o ambiente.
2. Wildcard `*.pix.wiki` configurado e válido no Vercel/DNS.
3. Segredos das Edge Functions existentes revisados.
4. Mercado Pago de teste disponível para smoke test.
5. Banco Inter de billing validado antes de ativar cobranças reais.

## Ordem obrigatória
1. Gate 1 — fundação.
2. Gate 2 — motor universal.
3. Gate 3 — Checkout público / Pix Link.
4. Gate 4 — API/Webhooks.
5. Gate 5 — onboarding.
6. Gate 6 — dashboard/uso.
7. Gate 7 — equipe/caixa.
8. Gate 8 — billing.
9. Gate 9 — calculadora/leads.
10. Gate 10 — hardening/SEO/legal/roteamento.

Não execute o Gate 10 isoladamente sobre a versão antiga: ele assume que a leitura direta de `pixwiki_receipts` já foi eliminada pelas telas/RPCs dos Gates anteriores.

## Sequência recomendada no deploy consolidado
1. Aplicar migrations em ordem.
2. Deploy das Edge Functions novas/substituídas.
3. Deploy Next.js/Vercel.
4. Rodar validações SQL read-only.
5. Smoke test owner.
6. Smoke test cashier.
7. Smoke test Checkout/API.
8. Teste controlado da fila de 12 sessões.
9. Ativar tráfego V2/Pix Link conforme flag.
10. Só então validar billing real.

## Observação jurídica
Os textos de Termos e Privacidade deste Gate foram escritos para refletir tecnicamente o produto V2 e evitar promessas incorretas. Antes de lançamento comercial amplo, faça revisão com profissional jurídico brasileiro, especialmente LGPD, regras de cancelamento/reembolso e enquadramento contratual com provedores financeiros.
