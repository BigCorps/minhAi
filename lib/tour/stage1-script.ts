// lib/tour/stage1-script.ts
export type SceneId =
  | 'intro'
  | 'assistente'
  | 'whatsapp'
  | 'instagram'
  | 'widget'
  | 'mcp'
  | 'mercadolivre'
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
      'Sou a minha I A, mas também posso ser Sua I A ou Nossa I A, você escolhe como me chamar! Estou em qualquer lugar onde o seu cliente esteja: aparelhos com telas. Computadores, tablets e celulares. totens, Whatsapp, Instagram, Facebook, aplicativos de I A e até no Mercado Livre',
    displayText:
      'Sou a minhAi, mas também posso ser Sua IA ou Nossa IA, você escolhe como me chamar! Estou em qualquer lugar onde o seu cliente esteja: Aparelhos com telas (computadores, tablets e celulares), Totens, Whatsapp, Instagram, Facebook, aplicativos de IA e até no Mercado Livre.',
    fallbackDuration: 7000,
  },
  {
    id: 'assistente',
    label: 'Tela & Totem',
    audioText:
      'Funciono como uma Alexa, você define qual palavra de ativação me chama, também funciono com botão de microfone, interagindo com botões ou digitando um texto. Diretamente na tela do seu estabelecimento ou em um totem de autoatendimento, tenho três modos de exibição: padrão, modo imersivo em tela cheia, e modo texto para digitação.',
    fallbackDuration: 9000,
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    audioText:
      'No seu próprio WhatsApp, com a naturalidade que seus clientes já conhecem. Respondo mensagens, entendo o que o cliente precisa, envio e confirmo cobranças Pix, Débito e Crédito, marco eventos na sua Agenda Google, calculo frete de entrega, gero orçamentos e muito mais.',
    fallbackDuration: 7000,
  },
  {
    id: 'instagram',
    label: 'Instagram',
    audioText:
      'No seu Instagram e Facebook, respondendo mensagens diretas, comentários e enviando De M automaticamente, com as mesmas funcionalidades do Whatsapp, convertendo seguidores em clientes.',
    displayText:
      'No Instagram e Facebook, respondendo mensagens diretas, comentários e enviando DMs automaticamente, com as mesmas funcionalidades do Whatsapp, convertendo seguidores em clientes.',
    fallbackDuration: 6000,
  },
  {
    id: 'widget',
    label: 'Widget',
    audioText:
      'Como widget flutuante no seu site, pronto para responder visitantes a qualquer hora do dia, sem precisar de um atendente humano.',
    fallbackDuration: 6000,
  },
  {
    id: 'mcp',
    label: 'MCP',
    audioText:
      'Via protocolo MCP, integrado diretamente ao Claude, ChatGPT, Cursor e Manus, onde você pode pedir tarefas para a minha I A diretamente pelo seu app de I A favorito.',
    displayText:
      'Via protocolo MCP, integrado diretamente ao Claude, ChatGPT, Cursor e Manus, onde você pode pedir tarefas para a minhAi diretamente pelo seu app de IA favorito.',
    fallbackDuration: 8000,
  },
    {
    id: 'mercadolivre',
    label: 'Mercado Livre',
    audioText:
      'No Mercado Livre, respondendo perguntas de compradores e tambem postando produtos diretamente vinculados aos seus produtos no dashboard.',
    fallbackDuration: 6000,
  },
  {
    id: 'whatsapp-mcp',
    label: 'WhatsApp MCP',
    audioText:
      'E também pode pedir tarefas diretamente para o WhatsApp minha I A, consultas, ações e integrações sem sair do aplicativo.',
    displayText:
      'E também pode pedir tarefas diretamente para o WhatsApp minhAi — consultas, ações e integrações sem sair do aplicativo.',
    fallbackDuration: 7000,
  },
  {
    id: 'outro',
    label: 'Conclusão',
    audioText:
      'Resumindo, sou multifuncional e multicanal, para quem precisa de um funcionário, assistente pessoal ou um aplicativo de I A próprio, tudo com a mesma praticidade, inteligência, com configuração simples e rápida, sem precisar de conhecimento sobre programação. Venha me testar gratuitamente!',
     displayText:
      'Resumindo, sou multifuncional e multicanal, para quem precisa de um funcionário, assistente pessoal ou um aplicativo de IA próprio, tudo com a mesma praticidade, inteligência, com configuração simples e rápida, sem precisar de conhecimento sobre programação. Venha me testar gratuitamente!',
    fallbackDuration: 4000,
  },
]
