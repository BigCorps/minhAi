// app/docs/data.ts

export interface DocsArtigo {
  slug: string;
  titulo: string;
  resumo: string;
  conteudo: string;
  publishedAt: string;
  updatedAt: string;
}

export interface DocsSection {
  id: string;
  titulo: string;
  emoji: string;
  iconBg: string;
  textColor: string;
  artigos: DocsArtigo[];
}

export const DOCS_SECTIONS: DocsSection[] = [

  // ── Primeiros passos ────────────────────────────────────────────────────────
  {
    id: 'inicio',
    titulo: 'Primeiros passos',
    emoji: '🚀',
    iconBg: 'bg-blue-500/15',
    textColor: 'text-blue-400',
    artigos: [
      {
        slug: 'criar-conta',
        titulo: 'Criar sua conta e primeiro login',
        resumo: 'Como criar conta, confirmar email e acessar o dashboard pela primeira vez.',
        publishedAt: '2026-04-01',
        updatedAt: '2026-05-01',
        conteudo: `
## Criar sua conta no minhAi

Acesse [minhai.app](https://www.minhai.app) e clique em **"Criar Minha IA Grátis"** ou **"Entrar"**.

Na tela de cadastro, preencha:
- Nome completo
- Email
- Senha (mínimo 8 caracteres)

Após confirmar o email, você é direcionado para o dashboard.

## Créditos gratuitos

Ao criar a conta, você recebe automaticamente **20 créditos** para testar as funções do minhAi Smart. Nenhum cartão de crédito é necessário.

## Escolher a versão

Na primeira tela do dashboard, você escolhe entre:

- **minhAi Smart** — assistente geral por créditos de uso
- **minhAi Vendas** — gratuito para o lojista, 10% de comissão por venda

Você pode criar assistentes de ambas as versões na mesma conta.

## Próximo passo

Com a conta criada, siga para [configurar seu primeiro assistente](/docs/configurar-assistente).
        `.trim(),
      },
      {
        slug: 'configurar-assistente',
        titulo: 'Configurar seu primeiro assistente',
        resumo: 'Passo a passo para criar e publicar um assistente do zero em menos de 5 minutos.',
        publishedAt: '2026-04-01',
        updatedAt: '2026-05-01',
        conteudo: `
## Criando um assistente

No dashboard, clique em **"Novo Assistente"** e escolha a versão (Smart ou Vendas).

### 1. Identidade

- **Nome do assistente** — como ele vai se apresentar para os clientes
- **Nome da empresa** — aparece nas mensagens e no WebApp
- **Domínio** — escolha entre Minha IA, Nossa IA ou Sua IA + seu slug personalizado

### 2. Personalidade

Escreva como o assistente deve se comportar. Exemplos:

> "Você é a assistente virtual da Clínica VidaSaúde. Seja cordial, use linguagem formal e sempre ofereça ajuda para agendar consultas."

> "Você é o assistente do Restaurante do Carlos. Seja animado, use emojis e sempre apresente as promoções do dia."

### 3. Ativar funções

Selecione as funções que o assistente deve ter. Cada função pode ser ativada ou desativada individualmente.

### 4. Publicar

Clique em **"Publicar"**. O assistente recebe um link único e um QR Code gerados automaticamente.

Seu assistente já está no ar.
        `.trim(),
      },
      {
        slug: 'dominio-personalizado',
        titulo: 'Escolher o domínio do seu assistente',
        resumo: 'Como funciona o sistema de domínios minhaia.app, nossaia.app e suaia.app.',
        publishedAt: '2026-04-01',
        updatedAt: '2026-05-01',
        conteudo: `
## Domínios disponíveis

O minhAi oferece três opções de domínio para o WebApp do seu assistente:

| Opção | Domínio | Indicado para |
|---|---|---|
| Minha IA | suaempresa.minhaia.app | MEIs e profissionais autônomos |
| Nossa IA | suaempresa.nossaia.app | Equipes e empresas |
| Sua IA | suaempresa.suaia.app | Foco no cliente (ex: suaclínica.suaia.app) |

## Como escolher

No dashboard, ao criar ou editar o assistente, acesse a aba **"Identidade"** e use o seletor de domínio. Você digita o slug (suaempresa) e escolhe o sufixo (.minhaia.app, .nossaia.app ou .suaia.app).

## Domínio próprio

Domínio próprio (ex: ia.suaempresa.com.br) está disponível no **Plano Consulting**. Entre em contato pelo WhatsApp para configurar.

## QR Code automático

Após escolher o domínio, o sistema gera automaticamente um QR Code que você pode usar em cartões de visita, totens e materiais impressos.
        `.trim(),
      },
    ],
  },

  // ── Integrações ─────────────────────────────────────────────────────────────
  {
    id: 'integracoes',
    titulo: 'Integrações',
    emoji: '🔗',
    iconBg: 'bg-green-500/15',
    textColor: 'text-green-400',
    artigos: [
      {
        slug: 'conectar-whatsapp',
        titulo: 'Conectar ao WhatsApp Business',
        resumo: 'Como vincular o número da sua empresa ao minhAi usando a API oficial do WhatsApp.',
        publishedAt: '2026-04-01',
        updatedAt: '2026-05-01',
        conteudo: `
## Pré-requisitos

Para conectar o WhatsApp, você precisa de:

- Conta no **Meta Business Manager** (business.facebook.com)
- Número de telefone verificado (pode ser fixo ou móvel)
- Número **não pode estar em uso no WhatsApp comum** — será convertido para API

## Passo a passo

**1. Acesse Integrações → WhatsApp** no dashboard do minhAi.

**2. Clique em "Conectar WhatsApp"** — você será direcionado para o fluxo de autenticação da Meta.

**3. Autorize o minhAi** a gerenciar seu número no Meta Business Manager.

**4. Selecione o número** que deseja vincular ao assistente.

**5. Aguarde a verificação** — normalmente leva de 5 a 15 minutos.

Após a conexão, todas as mensagens recebidas no número são processadas pelo assistente automaticamente.

## Transferência para humano

Configure palavras-chave que acionam a transferência para atendente humano (ex: "falar com atendente", "humano", "reclamação"). O assistente pausa e notifica sua equipe.

## Horário de atendimento

Você pode configurar horários onde o assistente responde e horários onde ele informa que a equipe entrará em contato — tudo no dashboard.
        `.trim(),
      },
      {
        slug: 'conectar-google-calendar',
        titulo: 'Integrar com Google Calendar',
        resumo: 'Como conectar o Google Agenda para agendamento automático de consultas e serviços.',
        publishedAt: '2026-04-01',
        updatedAt: '2026-05-01',
        conteudo: `
## O que a integração permite

Com o Google Calendar conectado, o assistente consegue:

- Criar eventos no calendário por comando de voz ou chat
- Verificar disponibilidade em tempo real
- Enviar confirmação de agendamento por WhatsApp e email
- Enviar lembretes automáticos 24h antes
- Processar confirmação ou cancelamento do cliente

## Como conectar

**1. Acesse Integrações → Google Calendar** no dashboard.

**2. Clique em "Conectar Google"** — você será redirecionado para a tela de autorização do Google.

**3. Selecione a conta Google** que contém o calendário que deseja usar.

**4. Autorize as permissões** — o minhAi precisa de acesso para leitura e escrita no calendário.

**5. Selecione o calendário** — você pode ter múltiplos calendários (um por profissional, por exemplo).

## Configurar grade de horários

Após conectar, defina:

- Dias da semana disponíveis
- Horário de início e fim
- Duração padrão de cada agendamento
- Intervalo entre agendamentos (tempo de preparo)
- Antecedência mínima para agendamento (ex: mínimo 2 horas de antecedência)

## Múltiplos profissionais

Cada profissional pode ter seu próprio calendário Google configurado. O assistente pergunta com qual profissional o cliente quer agendar e verifica a disponibilidade individual.
        `.trim(),
      },
      {
        slug: 'configurar-pix',
        titulo: 'Configurar cobrança via PIX',
        resumo: 'Como cadastrar sua chave PIX e ativar geração automática de cobranças.',
        publishedAt: '2026-04-01',
        updatedAt: '2026-05-01',
        conteudo: `
## Pré-requisitos

Para usar PIX no minhAi, você precisa de:

- Conta no **Banco Inter** (pessoa física ou jurídica)
- Chave PIX cadastrada no Inter (CPF, CNPJ, email, telefone ou aleatória)

## Configuração no dashboard

**1. Acesse Integrações → PIX** no dashboard.

**2. Informe a chave PIX** da sua conta no Banco Inter.

**3. Configure o Client ID e Secret** — obtidos no Portal do Desenvolvedor do Banco Inter (developers.inter.com.br).

**4. Teste a integração** — o sistema gera uma cobrança de R$ 0,01 para confirmar.

## Como funciona a confirmação automática

Quando um cliente realiza o pagamento PIX, o Banco Inter envia uma notificação via webhook para o minhAi. O sistema detecta o pagamento em tempo real e:

- Atualiza o status da cobrança para "Pago"
- Notifica o cliente por WhatsApp com confirmação
- Registra a transação no dashboard
- Libera o próximo passo (agendamento confirmado, pedido enviado etc.)

## minhAi Vendas: comissão automática

No minhAi Vendas, a comissão de 10% é descontada automaticamente no momento do saque. Você recebe 90% do valor de cada PIX confirmado — sem precisar calcular nada.
        `.trim(),
      },
      {
        slug: 'configurar-infinitepay',
        titulo: 'Configurar NFC e Link via InfinitePay',
        resumo: 'Como conectar o InfinitePay para aceitar pagamentos por aproximação e link.',
        publishedAt: '2026-04-05',
        updatedAt: '2026-05-01',
        conteudo: `
## O que é suportado via InfinitePay

- **NFC Débito** — Tap to Pay no débito via celular Android com NFC
- **NFC Crédito** — Tap to Pay no crédito via celular Android com NFC
- **Link de Pagamento** — link de cobrança enviado por WhatsApp

Uma única configuração (Handle/Token) ativa as três funções.

## Como configurar

**1. Acesse Integrações → InfinitePay** no dashboard.

**2. Informe seu Handle InfinitePay** — encontrado no app InfinitePay em Configurações → Desenvolvedor.

**3. Informe o Token de API** — gerado no mesmo local.

**4. Salve e teste** — o sistema verifica a conexão automaticamente.

## Requisitos para NFC

Para aceitar pagamentos por aproximação, o celular que vai ser usado como maquininha precisa:

- Android 6.0 ou superior
- NFC habilitado nas configurações do celular
- App InfinitePay instalado
- Conta InfinitePay ativa e aprovada

## Taxas

As taxas do InfinitePay são cobradas diretamente pela operadora, separadas da comissão da minhAi. Consulte os valores atualizados em [infinitepay.io](https://infinitepay.io).
        `.trim(),
      },
    ],
  },

  // ── Pagamentos ──────────────────────────────────────────────────────────────
  {
    id: 'pagamentos',
    titulo: 'Pagamentos',
    emoji: '💳',
    iconBg: 'bg-lime-500/15',
    textColor: 'text-lime-400',
    artigos: [
      {
        slug: 'tef-mercado-pago',
        titulo: 'Configurar TEF com Mercado Pago Point',
        resumo: 'Como integrar a maquininha Mercado Pago Point Smart para TEF débito e crédito.',
        publishedAt: '2026-04-05',
        updatedAt: '2026-05-01',
        conteudo: `
## O que é TEF?

TEF (Transferência Eletrônica de Fundos) é a integração da maquininha com o sistema de caixa. Em vez de digitar o valor na maquininha, o assistente abre a cobrança automaticamente — sem interação manual.

## Hardware necessário

- **Mercado Pago Point Smart** (o modelo com Android integrado)
- Conexão Wi-Fi ou 4G ativa

## Configuração

**1. Acesse Integrações → Mercado Pago TEF** no dashboard.

**2. Informe seu Access Token** — obtido em [mercadopago.com.br/developers](https://www.mercadopago.com.br/developers) em Credenciais de Produção.

**3. Informe o Terminal ID** — encontrado no app do Mercado Pago Point em Configurações → Terminal.

**4. Instale o app do minhAi na maquininha** — disponível na Play Store para Point Smart.

**5. Faça uma transação de teste** — o assistente abre uma cobrança de R$ 0,01 para confirmar.

## Como usar no atendimento

Quando o cliente for pagar, diga ao assistente:
- "Cobra R$ [valor] no débito" → abre cobrança débito na maquininha
- "Cobra R$ [valor] no crédito" → abre cobrança crédito
- "Cobra R$ [valor] em 3x" → abre parcelamento

A maquininha abre automaticamente na tela de pagamento — o atendente não precisa digitar nada.
        `.trim(),
      },
      {
        slug: 'modelo-comissao-vendas',
        titulo: 'Como funciona a comissão do minhAi Vendas',
        resumo: 'Entenda como a comissão de 10% é calculada, quando é descontada e quais transações são elegíveis.',
        publishedAt: '2026-04-08',
        updatedAt: '2026-05-01',
        conteudo: `
## O modelo de comissão

O minhAi Vendas é **gratuito para o lojista**. Em vez de mensalidade ou créditos, a minhAi retém uma comissão sobre as vendas processadas pelo assistente.

## Quais transações geram comissão?

| Tipo | Comissão |
|---|---|
| PIX (confirmado) | 10% + 1% no saque |
| NFC Débito (InfinitePay) | 10% |
| NFC Crédito (InfinitePay) | 10% |
| Link de Pagamento (InfinitePay) | 10% |
| TEF Débito (Mercado Pago) | 10% |
| TEF Crédito (Mercado Pago) | 10% |

**Transações que NÃO geram comissão:**
- Consultas de CPF/CNPJ
- Agendamentos (sem pagamento)
- Perguntas e respostas gerais

## Quando a comissão é descontada?

- **PIX:** descontada no momento do saque da conta Banco Inter. Você recebe 90% do valor na sua conta.
- **NFC/TEF/Link:** descontada pela InfinitePay ou Mercado Pago conforme liquidação normal das transações.

## Taxas das operadoras (separadas da comissão)

As taxas cobradas por InfinitePay e Mercado Pago são separadas e cobradas diretamente por cada operadora — não entram no cálculo da comissão da minhAi.

## Acompanhar as vendas

No dashboard do minhAi Vendas, você tem um relatório completo de todas as transações processadas, com valores brutos, comissões e líquidos.
        `.trim(),
      },
    ],
  },

  // ── Funções ─────────────────────────────────────────────────────────────────
  {
    id: 'funcoes',
    titulo: 'Funções do assistente',
    emoji: '⚙️',
    iconBg: 'bg-purple-500/15',
    textColor: 'text-purple-400',
    artigos: [
      {
        slug: 'fila-de-atendimento',
        titulo: 'Configurar fila de atendimento digital',
        resumo: 'Como ativar o sistema de senhas digitais com painel em tempo real e chamada por voz.',
        publishedAt: '2026-04-10',
        updatedAt: '2026-05-01',
        conteudo: `
## Ativar a fila

No dashboard, acesse **Funções → Fila de Atendimento** e ative.

## Configurar tipos de atendimento

Você pode criar múltiplos tipos:
- Caixa, Triagem, Guichê 1, Prioritário etc.
- Cada tipo tem prefixo de senha configurável (A, B, P etc.)

## Painel de TV

O painel da fila é acessado por uma URL separada. Abra no monitor que fica visível na sala de espera em tela cheia (F11 no Chrome).

A URL fica em **Dashboard → Fila → Link do Painel**.

## Emissão de senhas

- **Pelo totem** — cliente toca a tela e seleciona o tipo de atendimento
- **Pelo celular** — escaneie o QR Code do totem e acesse pelo celular
- **Via WhatsApp** — cliente envia mensagem e recebe a senha

## Chamada de senha

A chamada é feita pelo painel do atendente (Dashboard → Fila → Chamar Próximo). O sistema anuncia a senha por voz (TTS) e atualiza o painel de TV em tempo real.
        `.trim(),
      },
      {
        slug: 'modo-totem',
        titulo: 'Configurar modo totem (kiosk)',
        resumo: 'Como colocar qualquer tablet ou monitor em modo totem de autoatendimento.',
        publishedAt: '2026-04-10',
        updatedAt: '2026-05-01',
        conteudo: `
## O que é o modo totem?

O modo totem coloca o WebApp do assistente em tela cheia, sem acesso ao browser ou sistema operacional. Ideal para totens de autoatendimento, quiosques e recepções.

## Ativar no dashboard

Acesse **Configurações → Modo Totem** e ative. Configure uma senha de saída (PIN) para sair do modo kiosk.

## Configurar no dispositivo

**Android (tablet):**
1. Abra o Chrome e acesse o link do seu assistente
2. Menu → "Adicionar à tela inicial" como PWA
3. No dashboard, ative o Modo Totem
4. Abra o PWA — ele entra em tela cheia automaticamente

**Chrome OS / Chromebook:**
Use o modo Kiosk nativo do Chrome OS e aponte para a URL do assistente.

**Windows com Chrome:**
Use o atalho `chrome.exe --kiosk [URL]` para abrir em modo kiosk.

## Segurança

Com o modo totem ativo, o usuário não consegue:
- Sair do assistente sem o PIN
- Acessar outras abas ou apps
- Fechar a janela

## Reinicialização automática

Configure o assistente para voltar à tela inicial após X segundos de inatividade — evita que o totem fique parado em meio a uma conversa inacabada.
        `.trim(),
      },
      {
        slug: 'painel-de-ofertas',
        titulo: 'Configurar painel de ofertas com Google Drive',
        resumo: 'Como criar um slideshow automático de promoções integrado ao Google Drive.',
        publishedAt: '2026-04-12',
        updatedAt: '2026-05-01',
        conteudo: `
## Como funciona

O painel de ofertas exibe imagens em slideshow automático — ideal para promoções, cardápio visual e comunicados em totens e TVs.

As imagens ficam em uma pasta do **Google Drive** que você gerencia. Quando você adiciona ou remove imagens no Drive, o painel atualiza automaticamente.

## Configuração

**1. Crie uma pasta no Google Drive** e adicione as imagens das promoções (JPG ou PNG, recomendado 1920×1080px).

**2. Compartilhe a pasta** como "Qualquer pessoa com o link pode visualizar".

**3. Copie o ID da pasta** — está na URL: drive.google.com/drive/folders/**[ID_AQUI]**.

**4. Cole o ID no dashboard** em Funções → Painel de Ofertas → ID da Pasta.

**5. Configure o intervalo** de troca de slides (recomendado: 8 a 15 segundos).

## Exibir em TV separada

O painel de ofertas pode ser exibido em uma TV independente do totem. Acesse a URL do painel (Dashboard → Painel de Ofertas → Link) em qualquer Chrome conectado à TV.

## Integração com o assistente

O painel é exibido automaticamente quando o assistente está ocioso — assim que o cliente interage, o assistente assume a tela.
        `.trim(),
      },
    ],
  },

  // ── Planos e cobrança ───────────────────────────────────────────────────────
  {
    id: 'planos',
    titulo: 'Planos e cobrança',
    emoji: '💰',
    iconBg: 'bg-amber-500/15',
    textColor: 'text-amber-400',
    artigos: [
      {
        slug: 'creditos-como-funcionam',
        titulo: 'Como funcionam os créditos (minhAi Smart)',
        resumo: 'O que conta como interação, quanto custa cada crédito e como recarregar.',
        publishedAt: '2026-04-01',
        updatedAt: '2026-05-01',
        conteudo: `
## O que é uma interação?

Uma interação é cada vez que o assistente processa uma mensagem do usuário e gera uma resposta. Inclui:

- Resposta a pergunta via chat ou voz
- Criação de agendamento
- Geração de PIX
- Consulta de CPF/CNPJ (2 créditos)
- Consulta de CEP (1 crédito)
- Transcrição de áudio (1 crédito por 30 segundos)

Mensagens onde o assistente apenas aguarda resposta (ex: "Informe seu nome:") **não** consomem crédito.

## Pacotes disponíveis

| Pacote | Interações | Preço | Por interação |
|---|---|---|---|
| Starter | 200 | R$ 29,90 | R$ 0,15 |
| Professional | 1.000 | R$ 99,90 | R$ 0,10 |
| Business | 3.600 | R$ 249,90 | R$ 0,07 |
| Enterprise | 10.000 | R$ 499,90 | R$ 0,05 |

## Planos mensais

Além dos pacotes avulsos, há planos mensais com interações incluídas todo mês automaticamente:

- **Top** — 50 interações por R$ 49,90/mês
- **Consulting** — 300 interações por R$ 299,90/mês (inclui suporte prioritário)

## Como recarregar

No dashboard, acesse **Conta → Créditos → Comprar** e escolha o pacote. O pagamento é via PIX — os créditos são liberados automaticamente após confirmação.

## Créditos não expiram

Créditos comprados não têm prazo de validade. Você usa conforme a demanda do seu negócio.
        `.trim(),
      },
      {
        slug: 'plano-consulting',
        titulo: 'Plano Consulting: o que está incluído',
        resumo: 'O que o plano Consulting oferece além dos créditos: suporte, integração e personalização.',
        publishedAt: '2026-04-15',
        updatedAt: '2026-05-01',
        conteudo: `
## O que é o Plano Consulting?

O Plano Consulting é para empresas que precisam de mais do que a configuração padrão — inclui suporte dedicado, integração personalizada e treinamento da equipe.

**Preço:** R$ 299,90/mês + 300 interações incluídas

## O que está incluído

- **300 interações mensais** — repostas automaticamente todo mês
- **Suporte prioritário** via WhatsApp com tempo de resposta em até 2 horas
- **Integração dedicada** — nossa equipe configura as integrações (WhatsApp, Google, PIX etc.)
- **Treinamento da equipe** — sessão de onboarding via videochamada
- **Domínio próprio** — configuração do seu domínio personalizado (ia.suaempresa.com.br)
- **Assistente personalizado** — configuração completa pela equipe minhAi

## Para quem é indicado?

- Clínicas com múltiplos profissionais
- Redes e franquias com mais de uma unidade
- Empresas que precisam de integração com sistemas internos
- Negócios que não têm tempo para configurar sozinhos

## Como contratar

Entre em contato via WhatsApp (+55 11 98731-1425) ou pelo formulário em [minhai.app/contato](https://www.minhai.app/contato). Nossa equipe faz uma demonstração personalizada antes de contratar.
        `.trim(),
      },
    ],
  },

  // ── Solução de problemas ────────────────────────────────────────────────────
  {
    id: 'suporte',
    titulo: 'Solução de problemas',
    emoji: '🔧',
    iconBg: 'bg-red-500/15',
    textColor: 'text-red-400',
    artigos: [
      {
        slug: 'assistente-nao-responde',
        titulo: 'Assistente não está respondendo no WhatsApp',
        resumo: 'Checklist de verificação quando o assistente para de responder mensagens.',
        publishedAt: '2026-04-01',
        updatedAt: '2026-05-01',
        conteudo: `
## Checklist de diagnóstico

Se o assistente parou de responder no WhatsApp, verifique:

**1. Status da integração**
Dashboard → Integrações → WhatsApp → verifique se o status está "Conectado" (verde). Se estiver "Desconectado", clique em "Reconectar".

**2. Créditos disponíveis**
Dashboard → Conta → Créditos. Se zerou, o assistente para de responder. Recarregue para reativar.

**3. Assistente publicado**
Dashboard → Assistentes → verifique se o toggle "Publicado" está ativo.

**4. Número correto**
Confirme que está mandando mensagem para o número correto vinculado ao assistente.

**5. Horário de atendimento**
Se você configurou horário de atendimento, verifique se está dentro do horário ativo.

## Reconexão manual

Se nenhum dos itens acima resolver, tente:

1. Dashboard → Integrações → WhatsApp → "Desconectar"
2. Aguarde 30 segundos
3. Clique em "Conectar WhatsApp" novamente

## Ainda com problema?

Entre em contato via WhatsApp (+55 11 98731-1425) com o ID do seu assistente (disponível em Dashboard → Assistentes → [nome] → Configurações → ID).
        `.trim(),
      },
      {
        slug: 'pix-nao-confirmando',
        titulo: 'Pagamento PIX não está sendo confirmado automaticamente',
        resumo: 'O que verificar quando o sistema não detecta o pagamento PIX em tempo real.',
        publishedAt: '2026-04-05',
        updatedAt: '2026-05-01',
        conteudo: `
## Por que a confirmação pode falhar?

A confirmação automática de PIX depende do webhook do Banco Inter. Se a notificação não chega, o sistema não detecta o pagamento.

## Checklist

**1. Credenciais do Inter válidas**
Dashboard → Integrações → PIX → verifique se o Client ID e Secret ainda são válidos. Tokens podem expirar — gere novos no Portal do Desenvolvedor do Inter.

**2. Webhook configurado**
No Portal do Desenvolvedor do Inter, confirme que o webhook está apontando para:
`https://api.minhai.app/webhooks/inter`

**3. Conta Inter ativa**
Verifique se a conta Banco Inter está ativa e sem pendências.

**4. Chave PIX correta**
Confirme que a chave PIX cadastrada no minhAi é a mesma da sua conta Inter.

## Confirmação manual

Enquanto resolve o problema, você pode confirmar pagamentos manualmente:
Dashboard → Transações → [transação] → "Marcar como pago"

## Contato Inter

Se o problema persistir, contate o suporte do Banco Inter (Central de Atendimento Inter: 3003-4070) para verificar se o webhook está ativo na conta.
        `.trim(),
      },
    ],
  },
];

export function getDocsArtigoBySlug(slug: string): DocsArtigo | undefined {
  for (const section of DOCS_SECTIONS) {
    const artigo = section.artigos.find((a) => a.slug === slug);
    if (artigo) return artigo;
  }
  return undefined;
}

export function getDocsSectionByArtigoSlug(slug: string): DocsSection | undefined {
  return DOCS_SECTIONS.find((s) => s.artigos.some((a) => a.slug === slug));
}
