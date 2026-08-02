# ArteFinal

> **Seu arte-finalista com IA.** Ferramenta de pré-impressão que transforma a arte do
> cliente em **arquivo pronto para gráfica** — PDF/X-1a em CMYK (ISO Coated v2), com
> medida exata, sangria, marcas de corte e faca de recorte — direto do navegador, sem
> instalar nada. Feito para gráficas rápidas, papelarias, estúdios de design e lojas de adesivo.

---

## Sumário

- [O que é](#o-que-é)
- [Diferencial](#diferencial)
- [Arquitetura](#arquitetura)
- [Pipeline de produção](#pipeline-de-produção)
- [Funções](#funções)
- [Modelo de créditos](#modelo-de-créditos)
- [Stack](#stack)
- [Domínios e repositórios](#domínios-e-repositórios)
- [Convenções e regras](#convenções-e-regras-do-código)
- [App Android (TWA)](#app-android-twa)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Pendências](#pendências)

---

## O que é

ArteFinal é uma **superfície whitelabel construída sobre a plataforma minhAi**. Compartilha o
mesmo código-base (Next.js), o mesmo banco (Supabase) e o mesmo projeto de deploy (Vercel) da
minhAi, mas se apresenta com marca, domínio e catálogo de funções próprios.

O usuário sobe uma imagem ou PDF, vê o **preview na hora** e gera um arquivo de produção. O
modelo comercial é **preview de baixa resolução grátis e ilimitado**; cobra-se apenas ao gerar
o **arquivo final em alta**. A falta de resolução no preview é a trava anti-cópia.

- **Empresa:** BigCorps Tecnologia Ltda — CNPJ 14.282.244/0001-19
- **Plataforma-base:** minhAi (`minhai.app`)
- **Público:** gráficas, papelarias, estúdios de design, lojas de adesivo, copiadoras.

---

## Diferencial

O diferencial **não é IA nem "conversão de arquivos"** (isso é commodity). É a **saída de
produção correta**, que a gráfica aceita sem retrabalho:

- **PDF/X-1a** selado (padrão de pré-impressão).
- **CMYK ISO Coated v2** via perfil ICC embarcado — sem surpresa de cor na impressão.
- **Sangria, marcas de corte e faca de recorte** (die-cut) geradas corretamente.
- Medida final exata; `MediaBox` = página, `TrimBox` = corte.

---

## Arquitetura

Topologia whitelabel: **1 host = 1 projeto Vercel**. A landing (marketing/SEO) e a ferramenta
(`/arte`) são coisas separadas.

```
artefinal.app (apex)   ─────────────►  Repo da LANDING (marketing, SEO, Search Console)
                                        React + Vite + wouter, projeto Vercel próprio

ia.artefinal.app       ─────────────►  minhAi  (rota /arte)
                                        Next.js, Supabase, projeto Vercel "gerente"
```

- A ferramenta vive em `/arte` no código da minhAi. O host `ia.artefinal.app` é reconhecido no
  `middleware.ts` (detecção de host) e a marca é resolvida em `lib/brand.ts` (`getBrandByHost`).
- Login em `/arte/login`. Logo em `/arte/arte.png`.
- Uploads em bucket privado `arte-uploads` (Supabase Storage).

> **Nota de estado:** a virada de domínio (apex → landing, `ia.` → ferramenta) estava em
> migração. O header da landing e o app Android já apontam para `ia.artefinal.app`; conferir se o
> `middleware.ts` e os CTAs restantes já foram todos atualizados do antigo `artefinal.app`.

**Referências fixas de infraestrutura:**

| Item | Valor |
|---|---|
| Supabase Project ID | `qyonozbroekuqlotqcbm` |
| Vercel Project ("gerente") | `prj_GtduxwpV4IXya7gIujxAxSQ2h6ik` |
| Bucket de uploads | `arte-uploads` (privado, só INSERT; RLS por `companyId/`) |
| Perfil ICC | `lib/arte/profiles/ISOcoated_v2_300_eci.icc` |

---

## Pipeline de produção

Validado end-to-end e aceito por gráfica:

```
Sharp (RGB→CMYK + ICC ISO Coated v2)
      │
      ▼
pdf-lib (geometria: página, TrimBox, sangria, marcas/linha de corte)
      │
      ▼
PDFRest /pdfx (sela PDF/X-1a)
```

- Rotas de produção rodam em `runtime = 'nodejs'` (Sharp não roda em edge).
- `next.config`: `serverExternalPackages` **precisa incluir** `'sharp'`.
- PDFRest: enviar `file` **ou** `id`, nunca os dois; baixar o `outputUrl` com header `Api-Key`.

### ⚠️ Correção de cor — `drawImageCmyk` (crítico)

Imagem CMYK embutida com `pdf-lib.embedJpg()` ganha um array `/Decode` (por causa do marcador
Adobe do JPEG do Sharp) e **inverte no Corel/impressão** (branco vira preto). **Toda arte CMYK
deve ser embutida com `lib/arte/cmykImage.ts → drawImageCmyk()`**, que grava DeviceCMYK cru
(FlateDecode, sem `/Decode`). Nunca usar `embedJpg` para arte de produção.

---

## Funções

Catálogo atual (fonte: registry `SKILLS` em `app/arte/page.tsx`). Detecção por voz/texto via
`triggers`; cada função abre um modal `*Display`.

| Função | Créditos | Descrição |
|---|---|---|
| **Editor Avançado** | Grátis | Abre PSD (imagem) ou AI/SVG (vetor) via Photopea/Vectorpea em iframe |
| **Margem e Sangria** (Arte Final) | 5 | PDF pronto pra gráfica: medida exata + sangria + marcas de corte |
| **Adesivo com Recorte** | 5 | PDF com arte + linha de corte (die-cut); formas + sangria externa/interna |
| **Folha de Recorte** | 10 | Várias cópias com arte + corte numa folha (A4 ou personalizada) |
| **Duplicar Imagem** | 2 | Grade de cópias em PDF A4 para impressão |
| **Vetorizar em SVG/PDF** | 1 | Bitmap → vetor (silhueta ou contorno) |
| **Foto para Documento** | Grátis | Fotos 2x2 / 3x4 / 5x7 em PDF, com remoção de fundo |
| **Polaroids para A4** | Grátis | Grade de polaroids em PDF pronto para cortar |
| **Editar Imagem** | 1 | Cortar, rotacionar, brilho/contraste/saturação |
| **Remover Fundo** | 2 | PNG transparente em alta resolução |
| **Converter Arquivos** | Grátis | JPG ⇄ PNG ⇄ WebP ⇄ PDF |
| **Juntar/Dividir PDFs** | Grátis | Une vários PDFs ou separa em páginas |
| **Imagem para 3D** | 2 | Imagem → modelo 3D (.STL/.3MF) para impressão 3D |
| **Gerar QR Code** | 1 | QR com cor, tamanho e logo |
| **Código de Barras** | 1 | Code 128, EAN-13 ou Code 39 |
| **Orçamento em PDF** | 2 | Orçamento com logo, itens e totais |

**Detalhes do Adesivo com Recorte** (formas geométricas + automático):
- Formas: quadrado, arredondado (raio), redondo (elipse) e automático (silhueta do alfa via
  `traceContour`).
- **Sangria** controlável nas formas geométricas: `externa` (a medida é o corte; a arte
  transborda para fora) ou `interna` (a medida é a arte; o corte entra para dentro).
- Duas páginas no PDF: pág. 1 = arte CMYK; pág. 2 = linha de corte vetorial (cor de processo).

**Editor Avançado** (função gratuita, sem route/cobrança/login): abre um iframe do Photopea
(imagem) ou Vectorpea (vetor). O arquivo entra pela hash (data-URI) e volta por `postMessage`
(`saveToOE`). O Photopea devolve PNG; o Vectorpea às vezes falha no export automático → há
cascata de formatos (svg→pdf→png) e fallback manual (exportar pelo menu do editor).

---

## Modelo de créditos

- **Grátis para começar:** cadastro dá **20 créditos** + Trial de 14 dias, sem cartão
  (trigger `on_user_created → initialize_user_credits`, por `user_id`).
- **Preview sempre grátis**; cobra-se apenas ao gerar o arquivo final.
- Cobrança via RPC **`cobrar_credito_se_suficiente(p_company_id, p_function_key, p_credits, p_metadata)`**,
  **fail-closed** (gera o arquivo primeiro, cobra por último).
- Preço por função calibrado pelo custo real: funções que chamam PDFRest custam ~5; funções sem
  PDFRest e sem IA custam 0–2. Custo aproximado de uma selagem PDFRest ≈ R$ 0,09.

> **`⚠️` A RPC retorna `TABLE` → chega como ARRAY** no supabase-js. Ler sempre
> `Array.isArray(raw) ? raw[0] : raw` e checar `.sucesso`. Ler `raw.sucesso` direto devolve
> `undefined` → falso 402 mesmo com a RPC já tendo debitado.

---

## Stack

- **Frontend:** Next.js (App Router), React, TypeScript, Tailwind, shadcn/ui, PWA.
  (A **landing** é um projeto à parte: React + Vite + wouter.)
- **Backend:** Supabase — PostgreSQL, Edge Functions (Deno), Storage, RLS, Realtime.
- **Produção de arquivo:** Sharp (+ ICC), pdf-lib, PDFRest (`/pdfx`).
- **Vetor/contorno:** `marchingsquares`, `clipper-lib`, `simplify-js` (puro JS, seguro na Vercel).
- **Editores externos (iframe):** Photopea (imagem), Vectorpea (vetor).
- **Infra:** Vercel (wildcard SSL), GitHub (BigCorps/minhAi).

---

## Domínios e repositórios

| Domínio | Aponta para | Repositório |
|---|---|---|
| `artefinal.app` (apex) + `www` | Landing | Repo da landing (Vite) |
| `ia.artefinal.app` | Ferramenta `/arte` | Repo da minhAi |

- **Regra whitelabel:** cada produto novo = landing no apex (repo próprio) + ferramenta numa rota
  da minhAi (host `ia.<dominio>`) + repo-cliente Android próprio para o TWA.
- **Supabase Auth:** o host da ferramenta (`ia.artefinal.app`) precisa estar no allowlist
  (Site URL / Redirect URLs), senão confirmação de e-mail e OAuth voltam pro host errado.

---

## Convenções e regras do código

**Company (conta whitelabel):** cadastros do ArteFinal nascem sem `company` (só `user_credits`).
Como o pipeline é ancorado em company (RLS do bucket, RPC, posse, logs), usa-se a RPC
**`ensure_my_arte_company()`** (SECURITY DEFINER, via `auth.uid()`) para achar-ou-criar uma
company mínima **antes do upload**. Criação é lazy (no uso), nunca no trigger global de signup.

**Modais (`*Display.tsx`):**
- `createPortal(_, document.body)` + `position: fixed; inset: 0`.
- Estilos **inline** com paleta `DARK`/`LIGHT` (CMYK). Sem classe Tailwind dinâmica.
- **Sem `lucide-react` dentro do modal** — só SVG inline (lucide pode na página).
- Fluxo padrão: `input → (page-select) → configuring → processing → (login) → result → error`.
- Preview client-side sem upload (`makeImagePreview`); upload só no "liberar" (`uploadArteSource`).
- Custo escondido para usuário anônimo (`{logado && ...}`).

**Gotchas:**
- RPC retorna array → ler `[0]`.
- `embedJpg` em CMYK do Sharp → inverte no Corel → usar `drawImageCmyk`.
- Sharp raw CMYK é "straight" (branco = `0,0,0,0`).
- pdf.js não rasteriza no servidor → rasterizar PDF no cliente.
- `getUser(token)` no servidor exige o token explícito.
- `slug` é UNIQUE em `companies`; a company lazy usa `'arte-'||uid`.
- Edge Functions: nunca `.catch()` encadeado em query builder no Deno (usar `await` + try/catch);
  nunca `npm:sharp` (incompatível com linux-arm64).

---

## App Android (TWA)

O app da Play Store é um **TWA/Bubblewrap** que embrulha `ia.artefinal.app` — não há código
Android próprio, é uma casca sobre o PWA.

- `assetlinks.json` deve ser servido em `https://ia.artefinal.app/.well-known/assetlinks.json`
  (pelo projeto minhAi, em `public/.well-known/`), com o fingerprint SHA-256 do app.
- Manifest do brand com `scope`/`start_url` no escopo da ferramenta.
- **Requisito Google Play (31/08/2026):** novas submissões/atualizações devem segmentar
  **Android 16 (API 36)**. Atualizar `targetSdkVersion: 36` no `twa-manifest.json`, subir
  `appVersionCode`, `bubblewrap update && bubblewrap build`, e resubir o AAB. Usuários já
  instalados não são afetados.

---

## Variáveis de ambiente

| Variável | Uso |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do Supabase (cliente e servidor) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anon |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service-role (**sem** `NEXT_PUBLIC_`; só servidor) |
| `PDFREST_API_KEY` | Selagem PDF/X-1a no PDFRest |

---

## Pendências

- Aplicar o swap `embedJpg → drawImageCmyk` na **Arte Final** e na **Duplicar** (a correção de
  cor já existe; falta trocar a chamada nessas duas).
- Re-testar cor no **Corel** após publicar (validação definitiva; PDFRest sela depois).
- Concluir a virada de domínio (apex = landing, `ia.` = ferramenta) e conferir todos os CTAs.
- Editor de Vetor (Vectorpea): confirmar qual formato o export automático devolve (svg/pdf/png)
  ou assumir fallback manual.
- PDFRest: forçar OutputIntent **ISO Coated v2** (hoje sai SWOP; não inverte cor).
- Rebuild dos 3 apps (ArteFinal, Vixus, minhAi) para **API 36** antes de 31/08/2026.

---

*Powered by minhAi.app — BigCorps Tecnologia Ltda.*
