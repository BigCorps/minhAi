# FuncionarIA — Master Spec do Produto

**Status:** Documento mestre de produto e implementação  
**Data de consolidação:** 2026-08-23  
**Objetivo:** servir como fonte única para os próximos ZIPs de desenvolvimento e, ao final, para o ZIP consolidado da FuncionarIA.

---

## 1. Visão do produto

A **FuncionarIA** é uma funcionária digital personalizável, multicanal e modular, construída sobre a base técnica já existente da minhAi.

Ela deve funcionar:

- presencialmente, em tablet, computador, terminal touch, totem ou tela;
- online, em subdomínio próprio `empresa.funcionaria.net`;
- como widget no site da empresa;
- em canais como WhatsApp, Instagram, Facebook e Mercado Livre, conforme as habilidades contratadas.

A proposta não é vender “mais de 100 funções”. A proposta é vender **uma funcionária digital que aprende habilidades**.

### Slogan institucional

> **A funcionária IA que veste a camisa da sua empresa, no presencial e no online.**

### CTA principal

> **Contrate sua FuncionarIA grátis agora mesmo.**

### Explicação comercial curta

> Escolha onde ela trabalha, o que ela sabe fazer e pague somente pelas habilidades que sua empresa precisa.

---

## 2. Princípios do produto

1. **Começar grátis.**
2. **Cobrar por habilidades mensais**, não por funções técnicas individuais.
3. **IA generativa é opcional.**
4. **Créditos cobrem custos variáveis reais**, como IA, voz de entrada, WhatsApp e serviços externos.
5. **Dashboard só mostra módulos contratados.**
6. **Uma configuração serve para todos os canais.**
7. **A FuncionarIA deve ser visualmente personalizada para a empresa.**
8. **O cliente pode usar hardware próprio.**
9. **Aluguel de terminal é opcional e separado do SaaS.**
10. **Cash automático com noteiro/cofre foi removido do produto.**

---

## 3. Produto gratuito — FuncionarIA Start

A base gratuita deve ser útil de verdade e funcionar como principal canal de aquisição.

### Incluído gratuitamente

- FuncionarIA visual personalizada;
- subdomínio `empresa.funcionaria.net`;
- cores da empresa;
- cor principal da camisa;
- cor dos detalhes de gola e mangas;
- logo da empresa aplicado na camisa;
- fundo pré-programado ou fundo enviado pela empresa;
- layout responsivo em retrato e paisagem;
- recepção básica;
- informações da empresa;
- contatos;
- endereço;
- horários;
- FAQs;
- interação por toque e texto;
- respostas faladas pré-geradas/cacheadas;
- animação simples da boca;
- botão **Chamar responsável**;
- widget gratuito para o site da empresa;
- vitrine básica de produtos quando houver catálogo.

### Não incluído gratuitamente

- carrinho completo;
- pedidos;
- checkout completo;
- Pix/débito/crédito;
- fila operacional completa;
- agenda completa;
- canais pagos;
- IA generativa;
- reconhecimento livre de voz;
- emissão fiscal oficial.

---

## 4. Habilidades comerciais

As habilidades são os módulos que o usuário entende e contrata. Cada habilidade agrupa várias `function_key` e recursos internos da minhAi.

### Faixas sugeridas

- **R$ 29,90/mês** — habilidade simples/determinística
- **R$ 49,90/mês** — habilidade operacional
- **R$ 79,90/mês** — fluxo integrado/complexo
- **R$ 99,90/mês** — habilidade especializada

Os valores são **ajustáveis antes do lançamento**.

### Habilidades iniciais sugeridas

#### Recepção Básica — GRÁTIS

Inclui informações da empresa, FAQ, contatos, endereço, horários, widget, chamar responsável e vitrine básica.

#### Fila & Atendimento — R$ 29,90

Agrupa, entre outros:

- `modo_fila`
- `fila_atendimento`
- `gerar_senha`
- `painel_fila`
- `pre_atendimento`
- `responder_pesquisa`

#### Pré-atendimento & Cadastro — R$ 29,90

Inclui coleta de dados, cadastro, perguntas iniciais, triagem e encaminhamento.

#### Instagram & Facebook — R$ 49,90

Inclui FAQ, respostas determinísticas, informações da empresa, contatos, habilidades contratadas compatíveis e IA opcional como fallback.

#### Agenda & Reservas — R$ 49,90

Agrupa:

- `ver_agenda`
- `horarios_disponiveis`
- `agendar_compromisso`
- `reagendar_compromisso`
- `cancelar_agendamento`
- `confirmar_presenca`

#### Mercado Livre — R$ 49,90

Deve evoluir para FAQ → dados do produto → resposta determinística → IA opcional com créditos.

#### Vendas & Pedidos — R$ 79,90

Agrupa:

- `modo_venda`
- `ver_produtos`
- `procurar_produto`
- `fazer_pedido`
- `registrar_venda`
- `meu_cupom`
- catálogo;
- carrinho;
- estoque;
- pedidos.

#### Caixa & Cobrança — R$ 79,90

Inclui:

- checkout por código/QR;
- venda em `aguardando_pagamento`;
- Pix;
- débito;
- crédito;
- link de pagamento quando aplicável;
- comprovante;
- chamar responsável;
- dinheiro com confirmação humana;
- cálculo antecipado de troco.

#### Fiscal — R$ 99,90

Pode agrupar NFC-e, NF-e, NFS-e, emissão e histórico fiscal. Pode ter cobrança adicional por uso/documento conforme custo do provedor.

---

## 5. Desconto por quantidade de habilidades

Sugestão atual:

- **1 habilidade:** preço normal
- **2–3 habilidades:** 5% de desconto
- **4–5 habilidades:** 10% de desconto
- **6 ou mais:** 15% de desconto

A habilidade gratuita não entra no cálculo. O desconto é aplicado automaticamente na revisão final.

---

## 6. Dashboard dinâmico por entitlements

O dashboard deve ser o mais simples possível.

### Seções permanentes

- **Minha FuncionarIA**
- **Habilidades**
- **Conta e Créditos**

### Seções condicionais

Só aparecem se a habilidade correspondente estiver contratada.

- Recepção → Atendimentos
- Fila & Atendimento → Fila
- Agenda → Agenda
- Vendas & Pedidos → Produtos / Pedidos
- Caixa & Cobrança → Caixa / Recebimentos
- Instagram/Facebook → Canais
- WhatsApp → WhatsApp / Conversas
- Mercado Livre → Mercado Livre
- Fiscal → Notas Fiscais

### Regra de segurança

Não basta esconder no frontend. Cada habilidade deve virar um **entitlement** verificado também pelo backend. URL direta de módulo não contratado deve ser bloqueada.

---

## 7. FuncionarIA visual V1

A FuncionarIA deve ser uma personagem visual própria, mais humanizada que o Orbe/Avatar atual da minhAi.

### Direção visual

- funcionária de frente;
- headset;
- sentada atrás de mesa/balcão;
- corpo quase estático;
- foco em rosto e fala;
- visual profissional;
- customização da empresa.

### Customizações

- cor principal da camisa;
- uma segunda cor para gola e detalhes das mangas;
- logo da empresa;
- cor principal da interface;
- cor secundária da interface;
- fundo pré-definido;
- fundo enviado pela empresa.

### Sem tema claro/escuro

A FuncionarIA não terá toggle claro/escuro. O slug deve herdar a identidade visual da empresa e calcular automaticamente contraste de texto e botões.

### Layout

**Retrato:** personagem em cima; interação e controles embaixo.  
**Paisagem:** personagem de um lado; controles/interação do outro.

### Boca e sensação de fala

Versão V1:

- boca fechada;
- boca pouco aberta;
- boca média;
- boca aberta;
- alternância baseada na amplitude do áudio usando Web Audio API.

Opcionalmente: piscar ocasionalmente e micro movimento idle. Não é necessário movimento corporal completo.

### Stack recomendada

- TypeScript
- React
- Next.js
- Web Audio API
- assets em camadas PNG/SVG/WebP conforme melhor resultado

---

## 8. TTS, voz e custos

### Voz de saída

Respostas pré-definidas e FAQs podem ser faladas usando cache. A base atual da minhAi já possui `/api/google-tts`, cache por hash de texto + voz + velocidade, cache no Supabase Storage e reutilização do MP3.

### Evolução para FuncionarIA

Quando uma FAQ for criada ou alterada:

1. gerar TTS uma vez;
2. salvar no Storage;
3. reutilizar o áudio nas interações seguintes.

Também pré-gerar frases padrão: saudação, pagamento aprovado, senha gerada, responsável chamado, erro, despedida e instruções de pagamento.

### Modelo comercial

- toque/texto: incluído;
- reprodução de áudio já cacheado: incluída;
- reconhecimento de voz/STT: créditos;
- TTS dinâmico não cacheado: pode usar créditos;
- IA generativa: créditos.

---

## 9. Motor sem IA

O produto deve funcionar bem sem IA.

Ordem sugerida:

1. ação direta de botão/código;
2. função determinística;
3. FAQ local;
4. fluxo/state machine de habilidade;
5. somente se habilitado: IA opcional.

Se IA estiver desligada e nada resolver:

> Não encontrei essa informação. Posso chamar um responsável para ajudar.

A base atual de FAQ-first da minhAi deve ser reaproveitada.

---

## 10. Créditos de uso

O usuário deve ver um único saldo: **Créditos de uso**.

### Consomem créditos quando houver custo variável real

- IA generativa;
- STT/reconhecimento de voz;
- WhatsApp cobrado pela Meta;
- SMS;
- serviços externos pagos;
- consultas;
- determinados TTS dinâmicos.

### Não consomem créditos

- FAQ no terminal;
- FAQ no widget;
- função determinística sem custo externo;
- reprodução de áudio já cacheado;
- navegação;
- interação por toque/texto local.

---

## 11. Widget gratuito para sites

O widget é parte da base gratuita, não uma habilidade.

Exemplo conceitual:

```html
<script src="https://funcionaria.net/widget.js" data-slug="clinicasorriso"></script>
```

O widget usa a mesma personagem, cores, FAQs, logo, habilidades e empresa. Nova habilidade contratada deve aparecer automaticamente também no widget.

---

## 12. Canais e presença

### Presencial

Tablet, computador, notebook, all-in-one touch, terminal touch, totem, TV touch, PWA/TWA.

### Online

- `empresa.funcionaria.net`
- widget no site
- Instagram
- Facebook
- WhatsApp
- Mercado Livre

---

## 13. WhatsApp — três modos

### Modo 1 — Direcionar para a FuncionarIA

**Mais econômico**. Primeira resposta direciona para `empresa.funcionaria.net`, e o restante acontece no nosso ambiente.

### Modo 2 — Atender pelo WhatsApp

**Mais conveniente para o cliente**. FAQ, funções, fluxos e IA opcional rodam dentro do WhatsApp. Créditos cobrem custos variáveis do canal.

### Modo 3 — Híbrido

**Recomendado**. FAQ simples pode responder no WhatsApp; fluxos maiores redirecionam para `/comprar`, `/fila`, `/agenda`, `/pagamento` etc.

### Regra de cobrança

A arquitetura deve tratar o WhatsApp como custo variável e cobri-lo por créditos quando a Meta cobrar a mensagem.

**Pendência:** confirmar tabela oficial final do Brasil para a mudança prevista para outubro de 2026 antes de congelar a equivalência de créditos.

---

## 14. Instagram e Facebook

Prioridade: gatilhos/funções → FAQ → fluxos determinísticos → IA opcional. A habilidade deve funcionar mesmo com IA desligada quando o fluxo permitir.

---

## 15. Mercado Livre

A implementação atual da minhAi usa IA em cada pergunta. Na FuncionarIA, evoluir para:

1. FAQ;
2. dados estruturados do produto;
3. resposta determinística;
4. IA ligada → usar créditos;
5. IA desligada → encaminhar ao responsável.

---

## 16. Caixa & Cobrança

A Etapa 2 já criada deve ser incorporada a esta habilidade.

Fluxo: vendedor fecha venda → pedido real → `aguardando_pagamento` → código/QR → terminal → recuperação da venda → meio de pagamento → confirmação → `pago`.

Meios: Pix, débito, crédito e dinheiro.

---

## 17. Dinheiro sem hardware automático

Cash automático com noteiro/cofre foi descartado.

Ao escolher **Dinheiro**:

> Você tem o valor exato?

Se sim, notificar responsável com terminal, venda, total e informação de valor exato.

Se precisar de troco, o cliente seleciona as cédulas que possui:

- R$2
- R$5
- R$10
- R$20
- R$50
- R$100
- R$200

O sistema calcula total entregue e troco necessário e notifica o responsável por WhatsApp, e-mail ou SMS.

Não marcar como pago automaticamente. Estados sugeridos:

- `aguardando_dinheiro`
- `aguardando_troco`
- `responsavel_notificado`
- `pago`

Confirmação humana por PIN, QR de funcionário ou painel.

---

## 18. Chamar responsável/gerente

Vira infraestrutura central de assistência, não apenas função isolada.

Motivos:

- cliente pediu gerente;
- troco necessário;
- cartão recusado;
- problema no terminal;
- dúvida não resolvida;
- retirada de pedido;
- atendimento humano necessário.

Canais: WhatsApp, e-mail e SMS.

---

## 19. Comprovante e fiscal

### Comprovante/recibo da compra

Incluído em Caixa & Cobrança.

Com impressora: imprimir.  
Sem impressora: QR Code, link, PDF e envio opcional.

Exemplo: `empresa.funcionaria.net/recibo/ABC123`.

### Documento fiscal oficial

Separado na habilidade Fiscal: NFC-e, NF-e e NFS-e. Não chamar um comprovante comum de “recibo fiscal” se não houver documento fiscal oficial.

---

## 20. Hardware

Padrão: **usar meu próprio equipamento — incluído**.

Compatível com navegador/PWA/TWA em tablet, PC, all-in-one, totem e terminal touch.

Opcional: **Alugar um terminal FuncionarIA**. O aluguel é separado do SaaS e aparece no final da contratação.

---

## 21. Onboarding

A experiência deve parecer que o empresário está contratando uma funcionária, não configurando software.

1. **Onde ela vai trabalhar?** Presencial / Online / Presencial e online.
2. **Qual é o seu negócio?** Para recomendações.
3. **O que ela deve fazer?** Cards grandes, sem preço.
4. **Vista sua FuncionarIA.** Camisa, detalhes, logo, fundo, cores, preview.
5. **Como ela conversa?** Toque/texto incluídos; voz e IA opcionais por créditos.
6. **Onde vai usar?** Equipamento próprio ou aluguel de terminal.
7. **Revisão.** Somente aqui mostrar preço, descontos, IA, créditos, equipamento e canais.

Frase de destaque no passo visual:

> **Ela realmente veste a camisa da sua empresa.**

---

## 22. Posicionamento comercial

### Slogan

> **A funcionária IA que veste a camisa da sua empresa, no presencial e no online.**

### CTA

> **Contrate sua FuncionarIA grátis agora mesmo.**

### Apoio

> **Escolha onde ela trabalha, o que ela sabe fazer e pague somente pelas habilidades que sua empresa precisa.**

### Benefício

> Automatize tarefas repetitivas e deixe sua equipe focada no que realmente precisa de pessoas.

### Ideia central

O empresário não precisa pensar em chatbot + totem + fila + PDV + agenda + FAQ + widget + bot de Instagram. Ele pensa: **Tenho uma FuncionarIA.**

---

## 23. Relação com a minhAi

Reaproveitar o máximo possível da base existente: autenticação, multiempresa, Supabase, Vercel, funções, FAQ, produtos, pedidos, pagamentos, fila, agenda, Meta, Mercado Livre, fiscal, TTS, créditos, chamar gerente, dashboard, PWA/TWA e permissões.

A UX/comercial da FuncionarIA não deve expor a complexidade técnica da minhAi.

**minhAi:** plataforma ampla de assistente e funções.  
**FuncionarIA:** produto simplificado, visual, multicanal, modular e baseado em habilidades.

---

## 24. Etapas já existentes

### Etapa 1 — Brand / TWA / Login

Já criada anteriormente.

### Etapa 2 — Checkout por código

Já criada anteriormente e deve ser preservada dentro da habilidade **Caixa & Cobrança**.

---

## 25. Novo roadmap

### Etapa 3 — Arquitetura FuncionarIA 2.0

Habilidades, catálogo comercial, preços, descontos, entitlements, assinatura, canais, onboarding base e dashboard dinâmico.

### Etapa 4 — Funcionária visual V1

Personagem, camisa, detalhes, logo, fundos, cores, retrato/paisagem, boca por amplitude e idle/piscar opcional.

### Etapa 5 — Motor sem IA

FAQ-first, funções determinísticas, state machines, fallback humano, TTS cacheado e pré-geração de áudio.

### Etapa 6 — Canais online

Widget, Instagram, Facebook, WhatsApp nos 3 modos e Mercado Livre FAQ-first.

### Etapa 7 — Créditos IA/Voz/Canais

Saldo único, IA, STT, WhatsApp, SMS, custos externos e telemetria.

### Etapa 8 — Painel e gestão

Dashboard por habilidades, contratação de novas habilidades, atualização de assinatura, comprovantes, fiscal e terminal opcional.

### Etapa final

ZIP consolidado, SQL consolidado, Edge Functions consolidadas, ordem de aplicação e teste completo.

---

## 26. Padrão de entrega acordado

Cada etapa futura será entregue como:

1. **ZIP da aplicação** com arquivos completos e pastas corretas.
2. **SQL separado** para execução manual no Supabase.
3. **Edge Functions completas** para deploy manual.
4. **Resumo curto** com arquivos alterados e ordem de aplicação.

### Estratégia de testes

Não testar cada etapa isoladamente. Construir todas as etapas em sequência e, ao final, gerar o ZIP consolidado e testar tudo junto.

---

## 27. Decisões congeladas

- Nome: **FuncionarIA**
- Domínio: **funcionaria.net**
- Base gratuita: **sim**
- Slogan: **A funcionária IA que veste a camisa da sua empresa, no presencial e no online.**
- CTA: **Contrate sua FuncionarIA grátis agora mesmo.**
- Modelo: **grátis + habilidades + créditos**
- IA: **opcional**
- Voz de entrada: **opcional por créditos**
- Voz de saída cacheada: **incluída**
- Widget: **gratuito**
- Dashboard: **dinâmico conforme habilidades**
- Tema claro/escuro: **não**
- Cores: **da empresa**
- Subdomínio: **slug.funcionaria.net**
- Hardware próprio: **permitido**
- Terminal alugado: **opcional**
- Cash automático: **removido**
- Dinheiro: **confirmação humana + cálculo de troco**
- Fiscal: **habilidade/add-on**
- Comprovante digital: **incluído em Caixa & Cobrança**
- Checkout da Etapa 2: **preservado**
- Testes: **somente após consolidação final**

---

## 28. Pontos ainda ajustáveis

- preços finais de cada habilidade;
- percentuais finais de desconto;
- preço do aluguel de terminal;
- política e pacotes de créditos;
- equivalência de créditos por WhatsApp após tarifa oficial do Brasil;
- quantidade de personagens após V1;
- nomes comerciais finais de algumas habilidades;
- cobrança fiscal por uso/documento;
- limites da vitrine gratuita;
- eventual fair use do plano grátis.

---

## 29. Fonte de verdade

Este Markdown e o JSON correspondente devem ser tratados como a **fonte de verdade da FuncionarIA** durante a construção.

Antes de criar cada ZIP, conferir decisões congeladas, habilidades, monetização, canais, entitlements, dashboard, onboarding, créditos, personagem visual e compatibilidade com as Etapas 1 e 2.
