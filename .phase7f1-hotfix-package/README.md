# FuncionarIA 7F.1 — hotfix pré-deploy das Edges

Base esperada: `11ba2d61cacc2baeedb7af3ab3b6911463cebfcd`.

Corrige dois pontos detectados antes do deploy das Edges:
1. preserva o guard de cron que já existe na produção de `auto-confirmar-pix`;
2. respeita `delivery_auto_dispatch` antes de pedir entregador à Lalamove.

Não altera SQL, comissão, ledger, storefront ou APIs públicas.
