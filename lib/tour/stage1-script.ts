// lib/tour/stage1-script.ts
export type SceneId =
  | 'intro'
  | 'assistente'
  | 'widget'
  | 'whatsapp'
  | 'instagram'
  | 'mercadolivre'
  | 'mcp'
  | 'whatsapp-mcp'
  | 'outro'

export interface SceneScript {
  id: SceneId
  /** Texto enviado para /api/google-tts — otimizado para pronúncia */
  audioText: string
  /** Texto exibido na legenda — formatado para leitura. Se omitido, usa audioText */
  displayText?: string
  /** Duração de fallback em ms caso o TTS falhe */
  fallbackDuration: number
  /** Label curto exibido nos dots de progresso (acessibilidade) */
  label: string
}

export const STAGE1_SCRIPT: SceneScript[] = [
  {
    id: 'intro',
    label: 'Introdução',
    audioText:
      'Sou a minha I A, mas também posso ser Sua I A ou Nossa I A, você escolhe como me chamar! Estou em qualquer lugar onde o seu cliente esteja: telas, aplicativos de I A, Whatsapp, Instagram, Facebook e Mercado Livre',
    displayText:
      'Sou a minhAi, mas também posso ser Sua IA ou Nossa IA, você escolhe como me chamar! Estou em qualquer lugar onde o seu cliente esteja: telas, aplicativos de IA, Whatsapp, Instagram, Facebook e Mercado Livre',
    fallbackDuration: 7000,
  },
  {
    id: 'assistente',
    label: 'Tela & Totem',
    audioText:
      'Funciono como uma Alexa, você define qual palavra de ativação me ativa, também funciono com botão de microfone, interagindo com botões ou digitando um texto. Diretamente na tela do seu estabelecimento ou em um totem de autoatendimento, tenho três modos de exibição: padrão, modo imersivo em tela cheia, e modo texto para digitação.',
    fallbackDuration: 9000,
  },
  {
    id: 'widget',
    label: 'Widget',
    audioText:
      'Como widget flutuante no seu site, pronto para responder visitantes a qualquer hora do dia, sem precisar de um atendente humano.',
    fallbackDuration: 6000,
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    audioText:
      'No WhatsApp, com a naturalidade que seus clientes já conhecem. Responde mensagens, entende o que o cliente precisa, envia e confirma cobranças Pix, marca eventos na sua Agenda do Google, calcula o frete da entrega, criar orçamentos e muito mais.',
    fallbackDuration: 7000,
  },
  {
    id: 'instagram',
    label: 'Instagram',
    audioText:
      'No Instagram e Facebook, respondendo mensagens diretas, comentários e enviando DMs automaticamente, com as mesmas funcionalidades do Whatsapp, convertendo seguidores em clientes.',
    fallbackDuration: 6000,
  },
  {
    id: 'mercadolivre',
    label: 'Mercado Livre',
    audioText:
      'No Mercado Livre, respondendo perguntas de compradores e tambem postando produtos diretamente vinculado aos seus produtos no dashboard.',
    fallbackDuration: 6000,
  },
  {
    id: 'mcp',
    label: 'MCP',
    audioText:
      'Via protocolo MCP, integrado diretamente ao Claude, ChatGPT, Cursor e Manus — onde você pode pedir tarefas para a minha I A diretamente pelo seu app de I A favorito.',
    displayText:
      'Via protocolo MCP, integrado diretamente ao Claude, ChatGPT, Cursor e Manus — onde você pode pedir tarefas para a minhAi diretamente pelo seu app de IA favorito.',
    fallbackDuration: 8000,
  },
  {
    id: 'whatsapp-mcp',
    label: 'WhatsApp MCP',
    audioText:
      'E também pode pedir tarefas diretamente para o WhatsApp minha I A — consultas, ações e integrações sem sair do aplicativo.',
    displayText:
      'E também pode pedir tarefas diretamente para o WhatsApp minhAi — consultas, ações e integrações sem sair do aplicativo.',
    fallbackDuration: 7000,
  },
  {
    id: 'outro',
    label: 'Conclusão',
    audioText:
      'Em qualquer canal, tudo com a mesma inteligência, configuração simples e rápida, sem conhecimentos tecnicos avançados ou entender sobre programação.',
    fallbackDuration: 4000,
  },
]
