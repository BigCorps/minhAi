# ConviteIA — Plano de Ação

Levantamento sobre o repositório, o banco de produção e o repositório de
referência `BigCorps/convite`. Atualizado em 13/08/2026.

Ordem definida com o cliente: **pagamento e saque ficam por último**, porque a
venda só abre quando o fluxo de criação estiver completo. Enquanto não há
venda, ninguém acumula saldo, e o risco descrito na Fase 6 não se materializa.

---

## Fase 1 — Player de música ✅ concluída

| Item | Situação |
|---|---|
| Player não pausava | corrigido |
| Player desalinhado | corrigido |
| YouTube tocava como vídeo | agora toca como música |
| Escolha música / vídeo no wizard | feito |

**A causa do pause:** existiam **dois elementos `<audio>`** no convite. O
`ConvitePublico` criava um e dava play no clique da capa; a seção `Musica`
criava outro e o botão pausava esse segundo, que nunca tinha tocado. Agora há
um único `<audio>`, dono no `ConvitePublico`, compartilhado por contexto
(`ContextoAudio.tsx`).

**YouTube como música:** `PlayerYoutube.tsx` usa a IFrame API com os controles
da própria marca. O iframe fica com 1px fora da área visível — e **não**
`display: none`, porque navegador móvel pausa mídia em elemento sem layout.
Quem preferir o vídeo marca a opção no wizard e recebe o player do YouTube
completo.

---

## Fase 2 — Presentes como modal

| # | Item |
|---|---|
| 2.1 | Lista sai de dentro do convite e vira botão + modal |
| 2.2 | Fluxo de pagamento do presente dentro do modal |
| 2.3 | Confirmação e recado do convidado no mesmo lugar |

Hoje `Presentes.tsx` renderiza a lista inline na página do convite. Vira um
botão "Lista de presentes" que abre modal, com o PIX acontecendo ali dentro,
sem tirar o convidado do convite.

---

## Fase 3 — Ajustes de interface

| # | Item |
|---|---|
| 3.1 | Textura de fundo nas telas do painel |
| 3.2 | Botão "Entrar" vira "Minha conta" quando há sessão, no onboarding |
| 3.3 | Header no convite **só para o dono logado**, com atalho para editar |
| 3.4 | Painel: copiar link e gerar QR Code por convite |
| 3.5 | Acabamentos de foto: cantos arredondados, blur, moldura, vinheta |

O 3.3 tem uma regra que vale registrar: o header aparece **apenas** quando há
sessão e o usuário é o dono do evento. Convidado nunca vê — ele não tem conta,
e um header de administração no convite quebraria a ilusão de peça impressa.

---

## Fase 4 — Sistema visual

### O problema da combinatória

Seis texturas × seis envelopes × seis ornamentos × seis lacres = 1.296
combinações, e a maioria feia. O cliente monta uma ruim e conclui que o produto
é ruim.

### A estrutura

O tema declara um **estilo**, e o estilo traz o conjunto combinando:

```
estilo: classico | romantico | moderno | minimal | festivo | rustico
  ├─ textura       (padrão SVG de fundo)
  ├─ envelope      (formato da aba, via clip-path)
  ├─ ornamento     (família de arte)
  └─ lacre         (arte de fundo + iniciais sobrepostas)
```

O cliente escolhe **um** e vê tudo mudar junto, já bonito. Quem quiser abre
"Personalizar" e troca peça por peça. Aproveita a coluna `variante_layout` que
já existe em `conviteria.temas` e hoje está sempre `'classico'`.

### Ordem interna

| # | Item | Por quê nesta ordem |
|---|---|---|
| 4.1 | 6 texturas SVG | técnica provada no `RendaBackground`, recolore pelos tokens |
| 4.2 | Lacres com arte + iniciais sobrepostas | resolve a fragilidade do SVG gerado |
| 4.3 | Logo do cliente como lacre | ver especificação abaixo |
| 4.4 | Logo do evento no corpo do convite | ver especificação abaixo |
| 4.5 | Ornamentos além do floral | mais trabalho de arte que de código |
| 4.6 | Formatos de envelope | por último: só faz sentido com o que combinar |

---

## Especificação dos lacres

### Lacres do catálogo (4.2)

| | |
|---|---|
| Pasta | `public/brands/convite/lacres/` |
| Formato | PNG com transparência |
| Resolução | 464 × 464 px |
| Quantidade | 6 |

Nomes: `lacre-classico.png`, `lacre-floral.png`, `lacre-geometrico.png`,
`lacre-liso.png`, `lacre-rustico.png`, `lacre-moderno.png`

**464px** porque o lacre é exibido a 116px — quatro vezes para tela retina,
com folga para o `scale(1.35)` da animação de abertura.

**Deixe o centro vazio:** área livre de aproximadamente **150 × 150 px** no
meio (cerca de 32% da largura). É onde as iniciais entram por cima, em SVG. Se
o desenho invadir o miolo, as letras ficam ilegíveis.

### Logo do cliente como lacre (4.3)

O cliente sobe o próprio logo e ele substitui o lacre — útil para empresa,
igreja, formatura, evento com identidade própria.

Regras a implementar:

- upload pela etapa de mídia, para `conviteria-midia`, pasta `lacres/`
- aceita PNG e SVG; **PNG precisa ter fundo transparente**
- recorte circular automático via CSS, com o `drop-shadow` do lacre normal
- quando há logo, as iniciais **não** são sobrepostas: o logo já é a marca
- limite de 2 MB, mínimo recomendado 400 × 400 px

### Logo do evento no corpo do convite (4.4)

Diferente do lacre: aparece **dentro** do convite, não na capa.

- nova seção `marca`, ligável e ordenável como as outras
- três posições: abaixo dos nomes, antes do encerramento, ou no rodapé
- altura fixa de 64px, largura proporcional — logo largo e logo quadrado
  precisam conviver sem um deles dominar
- opcional independente do lacre: dá para ter logo no corpo sem logo na capa,
  e vice-versa

---

## Fase 5 — Catálogo e conteúdo

| # | Item |
|---|---|
| 5.1 | Mais itens no catálogo de presentes, por grupo de evento |
| 5.2 | Imagens dos ornamentos novos |

As 60 imagens do catálogo já estão ligadas às linhas (`06-ligar-imagens-catalogo.sql`).

---

## Fase 6 — Dinheiro (por último, decisão do cliente)

Esta fase estava no topo do plano anterior e foi movida para o fim, porque a
venda só abre quando o resto estiver pronto.

| # | Item | Situação atual |
|---|---|---|
| 6.1 | Tabela `saques` + RPC de débito atômico | **não existe** |
| 6.2 | Rota de saque com validação de CPF | **não existe** |
| 6.3 | Tela de saldo e saque no painel | **não existe** |
| 6.4 | Assinatura recorrente do plano mensal | **não existe** |
| 6.5 | Pagamento por link InfinitePay | reaproveitar o esquema da minhAi |

### O que já funciona

O webhook credita os presentes corretamente:

```ts
// Saldo por EVENTO, nao por conta: no plano mensal o revendedor cria o
// convite mas nao pode alcancar o dinheiro dos presentes dos anfitrioes.
await admin.rpc('creditar_saldo_evento', { p_evento_id, p_centavos });
```

`conviteria.evento_saldo` existe, com `disponivel_centavos` e
`repassado_centavos`.

**O saldo já é separado por convite**, não por conta — a tabela é chaveada por
`evento_id`. Quem assina o plano mensal e cria dez convites tem dez saldos
independentes. Era uma dúvida do cliente e a resposta é: já está do jeito
certo, e foi decisão consciente de quem escreveu.

### O que falta, e por que importa

Não existe saque. O convidado paga o presente, o dinheiro entra na conta da
BigCorps, o saldo é registrado no evento — e o casal não tem como tirar. A
página de planos já promete *"disponível para saque pelos anfitriões, mediante
CPF"*.

Enquanto não há venda, isso é inofensivo. **No dia em que a primeira venda
acontecer, esta fase passa a ser bloqueante.** É a última a ser feita, não a
menos importante.

### Decisões pendentes do cliente

- valor mínimo de saque
- prazo de processamento
- repasse manual (alguém da BigCorps faz o PIX) ou automático

---

## O que precisa vir do cliente

| Item | Fase |
|---|---|
| 6 PNGs de lacre, 464 × 464, centro vazio | 4.2 |
| Arte dos ornamentos novos | 4.5 |
| Regras de saque | 6.1 a 6.3 |

Texturas, formatos de envelope e recortes geométricos saem por código — não
precisam de arte.
