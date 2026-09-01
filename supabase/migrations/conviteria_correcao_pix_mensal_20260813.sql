-- A rota do plano mensal usa o mesmo gerador PIX já usado pelo convite avulso.
-- O erro de geração era o CHECK de purpose, que ainda não aceitava mensalidade.

alter table public.pix_transactions
  drop constraint if exists pix_transactions_purpose_check;

alter table public.pix_transactions
  add constraint pix_transactions_purpose_check
  check (
    purpose = any (
      array[
        'payment'::text,
        'consulta_fee'::text,
        'print_fee'::text,
        'conviteria_presente'::text,
        'conviteria_convite'::text,
        'conviteria_mensalidade'::text
      ]
    )
  );
