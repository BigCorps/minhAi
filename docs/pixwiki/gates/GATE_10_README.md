# PixWiki V2 — Gate 10 — Finalização, QA e Segurança

Este pacote é **somente o delta do Gate 10** e pressupõe Gates 1–9 aplicados antes dele.

## Objetivo
Fechar o produto V2 sem acrescentar um novo módulo de negócio: coerência de landing/SEO, páginas legais e técnicas, isolamento de host, cache de Checkout, hardening de banco e roteiro de QA/rollout.

## Entregas
- landing V2 refinada, com wording “0% de taxa PixWiki sobre o valor recebido”;
- preços mensais/anuais corretos e explicação de faixa econômica;
- página `/docs` da API V2;
- página `/seguranca`;
- `/aviso`, `/termos` e `/exclusao` próprios da PixWiki;
- footer com links técnicos/legais;
- metadata/JSON-LD V2 sem referências ao antigo saldo/saque/1%;
- robots/sitemap: só páginas editoriais do apex indexáveis;
- `llms.txt` V2;
- Checkout marcado `force-dynamic`, `revalidate=0` e `Cache-Control: no-store`;
- `admin.minhai.app/pixwiki-leads` liberado no isolamento do Admin;
- `slug.pix.wiki` isolado: caminhos fora de Link/valor/Checkout/infra não expõem o monorepo;
- `vercel.json` volta a conter apenas região + 3 crons existentes; regras de host ficam em `next.config.js`;
- `pixwiki_receipts` finalmente passa a `security_invoker` e perde SELECT direto de anon/authenticated;
- RPCs antigas recebem grants explícitos de menor privilégio;
- `pixwiki_normalize_slug` recebe search_path fixo;
- índices PixWiki apontados pelo Advisor foram adicionados.

## Ordem de aplicação
1. Suba os arquivos Next/public deste ZIP junto dos Gates anteriores.
2. Aplique `supabase/migrations/pixwiki_v2_gate10_security_hardening.sql` **por último**.
3. Faça deploy.
4. Execute `supabase/validation/pixwiki_v2_gate10_validate.sql`.
5. Siga `docs/PIXWIKI_V2_PRODUCTION_QA.md`.

## Importante: view pixwiki_receipts
O Gate 10 revoga a leitura direta da view pelo cliente. Isso é proposital e só é seguro porque Gates 4/6 já movem Dashboard/API/Relatórios para RPCs e tabelas canônicas apropriadas. Não aplique esta migration sobre o frontend legado sozinho.

## Advisor do Supabase
A auditoria live antes deste pacote encontrou:
- `pixwiki_receipts` como SECURITY DEFINER — corrigido aqui;
- `pixwiki_normalize_slug` com search_path mutável — corrigido aqui;
- funções SECURITY DEFINER antigas executáveis por anon — grants reduzidos aqui;
- FKs PixWiki sem índice de cobertura — índices adicionados aqui;
- várias tabelas internas com RLS e zero policies — não foram “abertas” só para remover o aviso; elas são deliberadamente service-role-only quando os grants diretos estão fechados.

## Vercel / domínio
Confirme que `*.pix.wiki` está associado ao projeto. A validação completa de condições de host deve ser feita no deployment, não apenas em dev local.

## Textos legais
Os textos acompanham a arquitetura real do V2, mas são um **draft de produto**. Faça revisão jurídica brasileira antes de lançamento comercial amplo.

## Arquivos que substituem existentes
- `app/pix/page.tsx`
- `app/pix/layout.tsx`
- `app/robots.ts`
- `app/sitemap.ts`
- `components/pix/PixWikiBrandFooter.tsx`
- `next.config.js`
- `vercel.json`
- `public/brands/pix/llms.txt`
- `public/brands/pix/manifest.webmanifest`
- `app/pix/c/[token]/page.tsx`

## Arquivos novos
- `app/pix/docs/page.tsx`
- `app/pix/seguranca/page.tsx`
- `app/pix/aviso/page.tsx`
- `app/pix/termos/page.tsx`
- `app/pix/exclusao/page.tsx`
- `app/pix/not-found/page.tsx`
- `components/pix/PixWikiPublicPage.tsx`
- migration + validation + docs de QA/rollout.

## Não feito neste Gate
- nenhuma migration foi aplicada ao Supabase live;
- nenhum deploy foi disparado;
- nenhuma cobrança real foi gerada;
- nenhum dado existente foi alterado.
