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
  /** Texto enviado para /api/google-tts */
  audioText: string
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
      'Olá! Eu sou o assistente da minhAi. Posso atuar em qualquer lugar onde o seu cliente esteja — telas, aplicativos, redes sociais e ferramentas de desenvolvimento.',
    fallbackDuration: 7000,
  },
  {
    id: 'assistente',
    label: 'Tela & Totem',
    audioText:
      'Diretamente na tela do seu estabelecimento ou em um totem de autoatendimento, com três modos de exibição: padrão com avatar, modo imersivo em tela cheia, e modo texto para digitação.',
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
      'No WhatsApp, com a naturalidade que seus clientes já conhecem. Responde mensagens, envia cobranças, agenda atendimentos e muito mais.',
    fallbackDuration: 7000,
  },
  {
    id: 'instagram',
    label: 'Instagram',
    audioText:
      'No Instagram, respondendo mensagens diretas automaticamente, convertendo seguidores em clientes.',
    fallbackDuration: 6000,
  },
  {
    id: 'mercadolivre',
    label: 'Mercado Livre',
    audioText:
      'No Mercado Livre, respondendo perguntas de compradores e mensagens pós-venda de forma automática e inteligente.',
    fallbackDuration: 6000,
  },
  {
    id: 'mcp',
    label: 'MCP',
    audioText:
      'Via protocolo MCP, integrado diretamente ao Claude, ChatGPT, Cursor e Manus — onde desenvolvedores e equipes já trabalham, o assistente da minhAi está disponível como ferramenta nativa.',
    fallbackDuration: 8000,
  },
  {
    id: 'whatsapp-mcp',
    label: 'WhatsApp MCP',
    audioText:
      'E também no WhatsApp com MCP ativo, trazendo capacidades de ferramentas inteligentes para dentro da conversa — consultas, ações e integrações sem sair do aplicativo.',
    fallbackDuration: 7000,
  },
  {
    id: 'outro',
    label: 'Conclusão',
    audioText:
      'Em qualquer canal. Com a mesma inteligência. Conheça a minhAi.',
    fallbackDuration: 4000,
  },
]
