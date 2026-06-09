// lib/tour/stage4-script.ts

export type Stage4SceneId =
  | 'zeroaoar-cadastro'
  | 'zeroaoar-wizard'
  | 'zeroaoar-publicar'
  | 'zeroaoar-config'
  | 'zeroaoar-webapp'
  | 'zeroaoar-indicacao'
  | 'zeroaoar-conclusao'

export interface Stage4Script {
  id: Stage4SceneId
  label: string
  audioText: string
  displayText?: string
  fallbackDuration: number
}

export const STAGE4_SCRIPT: Stage4Script[] = [
  {
    id: 'zeroaoar-cadastro',
    label: 'Criar Conta',
    audioText:
      'Criar sua conta é rápido e gratuito! Sem cartão de crédito. ' +
      'Basta e-mail e senha, ou também, entrar com Google ou Facebook com um único clique. ' +
      'Em segundos você já está no dashboard, pronto para criar seu assistente.',
    fallbackDuration: 7000,
  },
  {
    id: 'zeroaoar-wizard',
    label: 'Criar com IA',
    audioText:
      'No dashboard, um card te convida a criar seu primeiro assistente com I A. ' +
      'O processo é uma conversa: o auxiliar faz perguntas simples sobre seu negócio: ' +
      'nome, ramo de atividade, tom de voz, o que o assistente deve fazer. ' +
      'Com base nas respostas, gera o prompt, seleciona as funções ideais para o seu segmento ' +
      'e já cria o assistente automaticamente.',
    displayText:
      'No dashboard, um card te convida a criar seu primeiro assistente com IA. ' +
      'O processo é uma conversa: o auxiliar faz perguntas simples sobre seu negócio: ' +
      'nome, ramo de atividade, tom de voz, o que o assistente deve fazer. ' +
      'Com base nas respostas, gera o prompt, seleciona as funções ideais para o seu segmento ' +
      'e já cria o assistente automaticamente.',
    fallbackDuration: 10000,
  },
  {
    id: 'zeroaoar-publicar',
    label: 'Publicar',
    audioText:
      'Assistente criado. Agora é só compartilhar. ' +
      'Você recebe um link próprio, um QR Code pronto para imprimir ou exibir na tela, ' +
      'e já pode configurar as integrações com Google, WhatsApp, Instagram e Facebook. ' +
      'Divulge o link a vontade, seu assistente já está atendendo.',
    fallbackDuration: 8000,
  },
{
  id: 'zeroaoar-config',
  label: 'Configurações',
  audioText:
    'Aqui você personaliza tudo. ' +
    'Define a palavra de ativação, escolha entre voz masculina ou feminina, ' +
    'se prefere o Avatar ou Orbe e ativar a detecção por câmera para saudar clientes automaticamente. ' +
    'Você também ajusta a sensibilidade ao ambiente — escritório silencioso, loja movimentada ou balcão ruidoso — ' +
    'e decide o que acontece quando o assistente fica ocioso.',
  fallbackDuration: 9000,
},
  {
    id: 'zeroaoar-webapp',
    label: 'Seu WebApp',
    audioText:
      'Além do assistente, você pode criar seu próprio aplicativo web — ' +
      'sem programar, sem contratar desenvolvedor. ' +
      'Escolha um subdomínio personalizado, ' +
      'Seu negócio com endereço próprio na internet, em minutos.',
    displayText:
      'Além do assistente, você pode criar seu próprio aplicativo web — ' +
      'sem programar, sem contratar desenvolvedor. ' +
      'Escolha um subdomínio personalizado (como cafeexemplo.minhaia.app), ' +
      'Seu negócio com endereço próprio na internet, em minutos.',
    fallbackDuration: 9000,
  },
  {
    id: 'zeroaoar-indicacao',
    label: 'Indicação',
    audioText:
      'E tem mais: cada cliente que você indicar para a minha I A, você recebe 50% da mensalidade todos os meses ' +
      'Quanto mais negócios você apresentar, mais você ganha! ' +
      'Seu assistente trabalha, você indica, e todos saem ganhando!!!',
    displayText:
      'E tem mais: cada cliente que você indicar para a minhAi, você recebe 50% da mensalidade todos os meses ' +
      'Quanto mais negócios você apresentar, mais você ganha! ' +
      'Seu assistente trabalha, você indica, e todos saem ganhando!!!',
    fallbackDuration: 8000,
  },
  {
    id: 'zeroaoar-conclusao',
    label: 'Conclusão',
    audioText:
      'Do cadastro ao assistente funcionando: menos de cinco minutos. ' +
      'Sem programador, sem código, sem contrato. ' +
      'Comece grátis e escale conforme seu negócio crescer.',
    fallbackDuration: 6000,
  },
]