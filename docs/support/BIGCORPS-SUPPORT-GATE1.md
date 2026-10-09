# BigCorps Support — Gate 1

Entrega compartilhada de suporte para os produtos hospedados no repositório `BigCorps/minhAi`.

## Incluído

- widget global com identificação automática do produto pelo host/caminho;
- thread pública protegida por token aleatório armazenado apenas como SHA-256;
- identificação do usuário autenticado e da empresa quando existe exatamente uma empresa ativa;
- limites básicos por visitante e por thread;
- mensagens persistentes no Supabase;
- respostas determinísticas para acesso, pagamento, erro e solicitação de humano;
- integração opcional com OpenAI atrás de `BIGCORPS_SUPPORT_AI_ENABLED=true`;
- fila humana no Admin em `/admin/suporte`, com resposta e resolução;
- nenhuma senha, token ou chave deve ser solicitada pelo suporte;
- MelhorIA recebe guardrail explícito para não fornecer orientação médica.

## Segurança

As tabelas `bigcorps_support_threads` e `bigcorps_support_messages` usam RLS e não concedem acesso a `anon` nem `authenticated`. O navegador acessa somente as rotas Next.js. O token bruto da thread nunca é persistido no banco.

O widget não aparece no Admin, no diagnóstico `ajuda.bigcorps.com.br`, em rotas de API, Tour ou Kiosk.

## Custos

A IA fica desligada por padrão. Com a flag ausente/false, o Gate 1 opera com respostas determinísticas + handoff humano, sem nova despesa de modelo. A ativação de IA pode ser feita em gate separado após revisão do conhecimento e do orçamento.

## Migration

`supabase/migrations/20261009150000_bigcorps_support_gate1.sql`
