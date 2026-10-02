# PixWiki V2 — resolução de sobreposições

Arquivos alterados por mais de um Gate foram resolvidos sempre em favor do Gate mais recente.

| Caminho | Substituições | Versão final |
|---|---|---|
| `app/api/pixwiki/v1/[...path]/route.ts` | gate2 → gate4 | gate4 |
| `app/api/pixwiki/v1/route.ts` | gate2 → gate4 | gate4 |
| `app/pix/c/[token]/page.tsx` | gate3 → gate10 | gate10 |
| `app/pix/dashboard/page.tsx` | gate6 → gate7 | gate7 |
| `app/pix/login/page.tsx` | gate5 → gate7 | gate7 |
| `app/pix/onboarding/page.tsx` | gate5 → gate9 | gate9 |
| `app/pix/page.tsx` | gate5 → gate9 → gate10 | gate10 |
| `components/pix/PixWikiDashboardNav.tsx` | gate6 → gate7 → gate8 | gate8 |
| `supabase/functions/pixwiki-api/index.ts` | gate2 → gate4 | gate4 |
| `vercel.json` | gate3 → gate10 | gate10 |
