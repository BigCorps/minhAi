# ConsultaTec

Consulta de CPF e CNPJ, sem burocracia — paga por consulta ou com saldo salvo.

**Domínio:** consulta.tec.br
**Empresa desenvolvedora:** BigCorps Tecnologia Ltda — CNPJ 14.282.244/0001-19
**Parte do ecossistema:** minhAi (whitelabel — mesmo repo Next.js, mesmo backend Supabase, mesmo padrão da ArteFinal e do Pix Wiki)

---

## 1. O que é

O ConsultaTec é uma ferramenta de consulta pública de CPF e CNPJ. O usuário digita o documento, o sistema identifica automaticamente se é CPF ou CNPJ (pelo tamanho e dígitos verificadores) e mostra as opções de consulta disponíveis com o preço de cada uma. Paga na hora via PIX (sem precisar de cadastro) ou, se quiser, cria conta e mantém saldo — as próximas consultas descontam automaticamente, sem gerar PIX de novo.

Não existe assistente de voz, chat ou WhatsApp aqui — ao contrário do restante do ecossistema minhAi, o ConsultaTec é deliberadamente um formulário simples e direto ao ponto.

## 2. Funções e preços

| Consulta | CPF | CNPJ | O que traz |
|---|---|---|---|
| **Dados** | R$ 3,00 | R$ 3,00 | Dados cadastrais — nome/razão social, filiação ou sócios, data de nascimento/abertura, situação cadastral |
| **Restrições** | R$ 15,00 | R$ 20,00 | Score e pendências financeiras (via Quod) |
| **Protestos** | R$ 10,00 | — | Protestos em cartório e pendências tributárias. Só existe pra CPF — a API usada não tem endpoint de protestos PJ |
| **Completa** | R$ 28,00 | — | Dados + Restrições + Protestos, num único pagamento. Só CPF, pelo mesmo motivo acima |

CNPJ, portanto, só tem 2 opções (Dados e Restrições) — decisão deliberada, não é bug.

## 3. Como o usuário paga

Duas formas, sem nenhuma tela de escolha — o sistema decide sozinho:

- **Avulso (sem cadastro):** cada consulta gera um PIX na hora. Paga, a consulta libera. Usa uma "empresa" compartilhada e sem dono (`consultatec-avulso`) com `consultas_payment_method = 'pix'` travado — nunca tenta descontar saldo de ninguém, sempre pede PIX.
- **Saldo salvo (com cadastro):** o usuário loga (email/senha, biometria, Google ou Facebook), e a consulta desconta automaticamente do saldo. Pra ter saldo, ele "recebe" um PIX pra si mesmo através da mesma função de cobrança que qualquer empresa minhAi usa (`gerar-pix-assistente` com `purpose: 'payment'`) — o valor cai no `company_balance` dele.

Cada usuário logado tem sua própria "empresa" no Supabase, criada automaticamente no primeiro acesso (`ensure_my_consultatec_company()`). Como a conta é a mesma do ecossistema minhAi inteiro, quem já tem uma empresa cliente da minhAi (Smart ou Vendas) e loga no ConsultaTec com o mesmo e-mail **compartilha o mesmo saldo** — é uma decisão deliberada de conta unificada, não um bug.

## 4. Identidade visual

Tema "papel moeda antigo": fundo creme, tinta escura, sem dark mode (é a única paleta).

| Token | Cor | Uso |
|---|---|---|
| `fundo` | `#F2EAD3` | Fundo geral |
| `fundoCard` | `#FBF6E9` | Cards, modais |
| `borda` | `#C9BFA0` | Bordas |
| `tinta` | `#1C1A14` | Texto principal |
| `tintaMuted` | `#6B6350` | Texto secundário |
| `destaque` | `#7A6142` | Botões, links, valores em destaque (bege escuro) |

QR Codes PIX saem sempre com a cor `#1C1A14` e o logo do ConsultaTec, independente de qualquer outro produto minhAi que a conta também use — a marca é definida por parâmetro explícito (`brand: 'consultatec'`) em cada chamada, não por um campo salvo na conta.

## 5. Arquitetura

Segue o padrão whitelabel já usado pela ArteFinal e pelo Pix Wiki: **não é um projeto novo**, é um host novo servido pelo mesmo repositório Next.js e pelo mesmo backend Supabase da minhAi.

- **Hospedagem:** cenário A (host único, sem landing separada) — `consulta.tec.br` já cai direto na ferramenta via rewrite no `middleware.ts`
- **Frontend:** Next.js App Router, dentro do repo `minhAi`, em `app/consultatec/`
- **Backend:** Supabase compartilhado (projeto `qyonozbroekuqlotqcbm`)
- **Deploy:** Vercel, projeto próprio apontando pro host, mesmo repo

### Rotas
- `/consultatec` — página principal (input + opções)
- `/consultatec/login` — login/cadastro
- `/consultatec/dashboard` — saldo, histórico, "adicionar saldo"
- `/consultatec/termos`, `/consultatec/aviso` — **pendentes** (ver seção 8)

### Estrutura de arquivos
```
app/consultatec/
  layout.tsx          → metadata dinâmico (favicon, OG, título) via getBrandByHost
  page.tsx             → tela principal
  login/page.tsx        → login (email/senha, biometria WebAuthn, Google/Facebook, Turnstile)
  dashboard/page.tsx     → saldo + histórico + propaganda minhAi

components/consultatec/
  Footer.tsx
  AdicionarSaldoModal.tsx
  CompletaCpfModal.tsx
  ConsultarCpfModal.tsx
  ConsultarCnpjModal.tsx
  RestricoesCpfModal.tsx
  RestricoesCnpjModal.tsx
  ConsultarProtestosModal.tsx

lib/
  validateDocumento.ts   → validação e auto-detecção CPF/CNPJ (dígito verificador)

public/brands/consultatec/
  manifest.webmanifest, logo.png, favicon.png, og.png, ícones (pendentes — ver seção 8)
```

### Backend Supabase

**Tabelas usadas** (nenhuma nova — todas já existiam, reaproveitadas):
- `companies` — cada usuário logado tem uma linha própria; existe também a company avulsa `consultatec-avulso`
- `company_balance` — saldo em reais por company
- `historico_consultas` — log de cada consulta paga (tipo, custo, status, sem guardar CPF consultado nem resultado bruto no que o dashboard exibe)
- `pix_transactions` — transações PIX (tanto avulso/consulta_fee quanto adicionar saldo/payment)
- `assistant_segments` — precisou de uma linha nova (`consultatec`) porque `companies.segment_key` tem FK pra essa tabela

**RPC nova:** `ensure_my_consultatec_company()` — cria (ou reaproveita) a company do usuário logado, `SECURITY DEFINER`, mesmo padrão do `ensure_my_arte_company()` da ArteFinal.

**Edge functions reaproveitadas (com patch aditivo, sem quebrar quem já usava):**
- `ferramentas-consultas` — ganhou a ação `completa_cpf` (roda os 3 handlers existentes em paralelo, cobra R$28,00 num débito só)
- `gerar-pix-assistente` — ganhou o parâmetro `brand` no body, que sobrepõe o `segment_key` da company pra decidir logo/cor do QR Code — evita que uma conta compartilhada com outro produto (ex.: Pix Wiki) "prenda" a marca errada
- `confirmar-pix-assistente` — usado sem alterações (já suportava `purpose: 'payment'` creditando `company_balance`)

Nenhuma dessas funções exige login pra ser chamada (`verify_jwt: false` em todas) — é assim que o fluxo avulso funciona sem conta.

## 6. Autenticação

Mesmo padrão da ArteFinal: email/senha, biometria (WebAuthn, com fallback automático se o navegador não suportar), Google e Facebook OAuth, proteção Turnstile. `/auth/callback` é compartilhado com o resto da minhAi e não precisou de nenhuma alteração — já é genérico via parâmetro `next` e `requestUrl.origin`.

## 7. Variáveis de ambiente

```
NEXT_PUBLIC_CONSULTATEC_GUEST_COMPANY_ID=<uuid da company consultatec-avulso>
```

## 8. Pendências antes de publicar

- [ ] **Assets de marca**: `logo.png`, `favicon.png`, `og.png` (1200×630), ícones do manifest (512×512 normal + maskable com margem de segurança de 96px)
- [ ] **`/consultatec/termos` e `/consultatec/aviso`** — conteúdo jurídico real (não copiado de outro produto). Obrigatório antes de submeter à Play Store — o app processa CPF/CNPJ de terceiros, não só do titular da conta, então a política de privacidade precisa deixar isso explícito
- [ ] **Confirmar a allowlist do Supabase Auth** — URLs de redirect autorizadas com `consulta.tec.br`, já reportado como feito, vale reconferir se o texto colado não tinha um artefato de link apontando pro domínio errado
- [ ] **Registro do domínio + config Vercel** (projeto próprio, cenário A)
- [ ] **TWA/Bubblewrap** — gerar o `.aab`, `assetlinks.json`, testar navegação sem barra do Chrome antes de submeter

## 9. Material pra divulgação / ficha da Play Store

> Os textos abaixo são rascunho — ajuste tom e palavras-chave antes de publicar. Números de preço e funcionalidades batem com a seção 2, não invente nada além disso.

**Categoria sugerida:** Negócios / Finanças (Business/Finance)

**Nome do app:** ConsultaTec — Consulta CPF e CNPJ

**Descrição curta (até 80 caracteres):**
> Consulte CPF e CNPJ na hora. Pague por PIX ou guarde saldo. Sem burocracia.

**Descrição completa (rascunho):**
> Precisa consultar um CPF ou CNPJ rapidamente? O ConsultaTec identifica automaticamente o tipo de documento assim que você digita e mostra na hora as opções disponíveis e o preço de cada uma.
>
> O que você pode consultar:
> • Dados cadastrais (nome, filiação/sócios, situação) — R$ 3,00
> • Restrições e score financeiro — a partir de R$ 15,00
> • Protestos em cartório (CPF) — R$ 10,00
> • Consulta completa: dados + restrições + protestos (CPF) — R$ 28,00
>
> Como pagar:
> • Sem cadastro: pague por PIX na hora, direto no navegador ou no app.
> • Com cadastro: guarde saldo na sua conta e as próximas consultas descontam automaticamente, sem gerar PIX de novo.
>
> Seus dados ficam protegidos e armazenados no Brasil, em conformidade com a LGPD.
>
> ConsultaTec é desenvolvido pela BigCorps, a mesma empresa por trás da minhAi — plataforma de IA que atende negócios de todos os tamanhos por voz, WhatsApp e totem.

**Palavras-chave sugeridas:** consulta cpf, consulta cnpj, cpf online, cnpj online, restrição cpf, protesto cpf, score cpf

## 10. O que NÃO fazer (decisões já tomadas, não reabrir sem motivo)

- Não usar Gemini pra nada aqui — segue a regra geral do ecossistema (GPT-4o Vision é usado onde há OCR/IA, mas o ConsultaTec nem usa isso, é consulta direta em API)
- Não recriar validação de CPF/CNPJ em cada modal — está centralizada em `lib/validateDocumento.ts`
- Não usar `PixConfirmationModal`/`ResultDownloadQR` compartilhados da minhAi — os modais do ConsultaTec têm a tela de PIX e o botão de download construídos inline, no tema próprio
- Não reintroduzir comando de voz ou envio por e-mail nos modais — foram removidos de propósito ao portar da minhAi (não fazem sentido nesse produto)
