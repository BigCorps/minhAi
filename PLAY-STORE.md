# Play Store — declarações prontas

Respostas para copiar no Play Console. Cada uma tem, do lado, o motivo — porque
se um revisor perguntar, a justificativa precisa estar à mão.

> As políticas da Play mudam com frequência. Confira a redação atual dos
> formulários antes de enviar; o conteúdo das respostas continua valendo.

---

## 1. Ficha da loja

**Nome do app**
```
MelhorIA
```

**Nome completo (se pedir)**
```
MelhorIA — a IA da Melhor Idade
```

**Descrição curta** (máx. 80 caracteres)
```
Lembra o remédio na hora certa, anota consultas e confere golpes. Letra grande.
```
*(79 caracteres)*

**Descrição completa**

```
A MelhorIA lembra você de tomar seus remédios na hora certa — mesmo com o
aplicativo fechado.

Foi feita para quem já não tem paciência com aplicativo complicado: letra
grande de verdade, botões que o dedo acerta, uma coisa por tela e microfone
para ditar em vez de digitar.

O QUE É GRÁTIS, SEM LIMITE

• Cadastrar remédios, consultas e exames
• Receber todos os lembretes, sempre
• Marcar o que já tomou e ver o histórico
• Relatório em PDF para levar ao médico
• Aviso quando o remédio está acabando
• Conferir boleto pelos números
• Lista de compras
• Avisar a família pelo aplicativo

COMO FUNCIONA

O horário fica guardado no servidor, não no aparelho. O aviso chega como
notificação mesmo com o aplicativo fechado. Se ninguém confirmar em 30
minutos, um familiar cadastrado é avisado.

Consultas e exames têm aviso em 7 dias, 1 dia, 3 horas e 1 hora. Quando o
exame pede jejum, avisamos na hora exata de parar de comer — não só na
véspera.

Na verificação de boleto, conferimos os dígitos de segurança, o banco emissor,
o vencimento e o valor. Sem custo e sem limite.

PARA A FAMÍLIA

Quem cuida acompanha de longe: vê se as doses foram confirmadas, recebe aviso
quando alguma falha e baixa o relatório para a consulta.

CRÉDITOS

Alguns recursos usam créditos: ler receita pela câmera, analisar foto de
boleto, conversar com a inteligência artificial e enviar mensagem de celular.
Você ganha créditos ao criar a conta. Não existe período de teste — o que é
grátis é grátis para sempre.

IMPORTANTE

A MelhorIA lembra, organiza e registra. Ela não indica dose, não diz para que
serve um remédio e não interpreta resultado de exame — isso é com o seu médico.

O botão de ajuda avisa os contatos que você cadastrar. Ele não aciona SAMU
(192), Polícia (190) nem Bombeiros (193).

Desenvolvido pela BigCorps Tecnologia, com tecnologia minhAi.
```

**Categoria:** `Saúde e fitness`
> Não use "Medicina". As duas cabem num app de lembrete, mas "Medicina" atrai
> revisor mais rigoroso e convida perguntas sobre finalidade médica.

**Tags:** lembrete de remédio · saúde · idosos · cuidador · acessibilidade

**Classificação indicativa:** Livre
> Sem conteúdo sensível, sem violência, sem compras direcionadas a menores.

**E-mail de contato:** contato@bigcorps.com.br
**Política de privacidade:** `https://melhoria.org/aviso`

---

## 2. Declaração de apps de saúde

| Pergunta | Resposta | Por quê |
|---|---|---|
| Fornece telessaúde? | **Não** | Não há contato com profissional de saúde |
| Vende, entrega ou dispensa medicamento? | **Não** | Não há farmácia nem venda |
| Envolve pesquisa clínica? | **Não** | — |
| É dispositivo médico? | **Não** | Não diagnostica, não trata, não calcula dose |
| Fornece diagnóstico? | **Não** | Explicitamente recusado, inclusive na IA |
| Recomenda tratamento? | **Não** | Idem |
| Calcula dose de medicamento? | **Não** | A dose é digitada pelo usuário ou transcrita da receita |
| Coleta informações de saúde? | **Sim** | Lembretes e histórico do próprio usuário |
| Compartilha dado de saúde com terceiros? | **Não** | Ver seção 3 |

### Se o revisor pedir justificativa

> A MelhorIA é uma ferramenta de organização pessoal. Ela registra os
> medicamentos e horários informados pelo próprio usuário e emite lembretes. O
> aplicativo não interpreta sintomas, não sugere medicamentos, não ajusta doses
> e não avalia interações medicamentosas. Quando o usuário fotografa uma
> receita, o aplicativo apenas transcreve o texto e exige conferência humana
> antes de ativar qualquer lembrete. Toda decisão clínica permanece com o
> profissional de saúde.

**Isso é verdade e está implementado**, não é texto de conveniência:
- a instrução da IA lista o que ela não responde e como recusar;
- `medicamentos.revisado` só vira `true` na tela de conferência;
- `melhoria.materializar_doses` filtra por `m.revisado`, então remédio não
  conferido existe no banco mas **não gera lembrete nenhum**.

---

## 3. Data safety (Segurança dos dados)

### Coleta

| Tipo | Coletado | Compartilhado | Obrigatório | Finalidade |
|---|---|---|---|---|
| Nome | Sim | Não | Não | Personalização |
| E-mail | Sim | Não | Sim | Conta e login |
| Telefone | Sim | Não | Não | Contato |
| **Health info** | **Sim** | **Não** | Não | Funcionalidade do app |
| Contatos (digitados) | Sim | Não | Não | Aviso de emergência |
| Localização aproximada | Sim | Não | Não | Só no disparo do botão de ajuda |
| Fotos (receitas) | Sim | Não | Não | Funcionalidade do app |
| **Áudio** | **Não** | — | — | Ver 3.2 |
| Histórico de compras | Sim | Não | Não | Compra de créditos |

### 3.1 Health info — pontos obrigatórios

- **Não é compartilhado com terceiros.** Verificado: o Microsoft Clarity foi
  desligado em todas as telas do aplicativo e roda **apenas na landing**, que é
  página pública sem login e sem dado de saúde.
- **Não é vendido.**
- **Não é usado para publicidade** nem para perfil comercial.
- Criptografado em trânsito: **sim**.
- Usuário pode pedir exclusão: **sim** — `https://melhoria.org/exclusao`,
  acessível sem login.

### 3.2 Áudio: "não coletado" — e é verdade

O ditado usa a API `SpeechRecognition` do próprio navegador. **Nenhum áudio sai
do aparelho** e nada é gravado no servidor — só o texto que a pessoa confere e
decide salvar.

> Isto é uma vantagem real na revisão: declarar coleta de voz abriria uma
> categoria inteira de perguntas. Não migre o ditado para uma API de servidor
> sem revisitar esta declaração.

### 3.3 Localização

Coletada **apenas** no instante em que o botão de ajuda é acionado, e enviada
só aos contatos que o próprio usuário cadastrou. Não há rastreamento contínuo.

---

## 4. Permissões

| Permissão | Usada? | Observação |
|---|---|---|
| `INTERNET` | Sim | — |
| `POST_NOTIFICATIONS` | Sim | Lembretes de medicação |
| `ACCESS_COARSE_LOCATION` | Sim | Só no botão de ajuda |
| `CAMERA` | Sim | Foto de receita e boleto |
| `RECORD_AUDIO` | Sim | Ditado; o áudio não sai do aparelho |
| **`SEND_SMS`** | **NÃO** | ⚠️ ver abaixo |
| `READ_SMS` | **NÃO** | — |

### ⚠️ O ponto mais fácil de estragar

O Google **restringe fortemente** `SEND_SMS`. Aplicativo que pede essa
permissão precisa se encaixar num caso de uso permitido e costuma ser
reprovado.

A MelhorIA passa porque **o envio é server-side**, pela API Brasil: o aplicativo
nunca toca no SMS do aparelho e a TWA não declara a permissão.

> Se alguém propuser "mandar pelo SMS do próprio celular para economizar
> crédito", isso **reprova o aplicativo**. A arquitetura server-side não é
> preferência de implementação: é requisito de publicação.

---

## 5. Conteúdo e políticas

**Emergência.** Existe política sobre apps que sugerem acionar serviços de
emergência. A frase precisa ser idêntica nos três lugares — descrição da loja,
tela do aplicativo e seção 3 dos termos:

```
O botão de ajuda avisa os contatos cadastrados. Ele não aciona SAMU (192),
Polícia (190) nem Bombeiros (193).
```

**Sem alegação médica.** Verbos de organização, nunca de tratamento:

| Escreva | Evite |
|---|---|
| Lembra, organiza e registra | Controle seu tratamento |
| Nunca mais esqueça um horário | Cuide da sua saúde |
| Avisa sua família | Proteção 24 horas |
| Confere indícios de golpe | Bloqueia fraudes |

**Conta de teste para o revisor.** O Play exige credenciais quando há login.
Crie uma conta com alguns remédios e uma consulta já cadastrados — revisor que
abre um app vazio não consegue avaliar nada.

---

## 6. Checklist antes de enviar

- [ ] `assetlinks.json` com a impressão digital real da chave
- [ ] Abrir o APK e confirmar que **não aparece a barra do Chrome**
- [ ] Ditado funcionando no APK (se falhar, `fallbackType` não está em
      `customtabs`)
- [ ] `melhoria.org/aviso` e `/exclusao` abrindo **sem login**, em janela anônima
- [ ] Clarity: DevTools → Network em `/app` e `/remedios`, **nenhuma requisição
      para clarity.ms**
- [ ] Descrição sem verbo de tratamento (tabela da seção 5)
- [ ] Aviso do botão de ajuda idêntico nos três lugares
- [ ] Declaração de saúde conforme seção 2
- [ ] Data safety conforme seção 3, com Áudio = não coletado
- [ ] Categoria "Saúde e fitness"
- [ ] Conta de teste criada, com dados de exemplo
- [ ] Textos legais revisados por advogado

O item do Clarity é o único que dá para verificar em dez segundos e que, se
estiver errado, contradiz diretamente o que você declarou na Data safety.
