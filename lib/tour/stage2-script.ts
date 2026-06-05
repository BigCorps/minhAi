// lib/tour/stage2-script.ts

export type Stage2SceneId =
  | 'assistente-intro'
  | 'assistente-carrossel'
  | 'assistente-qrcode'
  | 'assistente-vendas'
  | 'assistente-fila'
  | 'assistente-totem'
  | 'assistente-outro'

export interface Stage2Script {
  id: Stage2SceneId
  label: string
  audioText: string
  displayText?: string
  fallbackDuration: number
}

export const STAGE2_SCRIPT: Stage2Script[] = [
  {
    id: 'assistente-intro',
    label: 'A Página',
    audioText:
      'Esta é a página do seu assistente — ela roda em qualquer tela, tablet, totem ou computador. ' +
      'Você escolhe qual dos três modos apresentar para o seu cliente: ' +
      'o modo padrão com microfone e carrossel de funções, ' +
      'o modo texto para digitação livre, ' +
      'ou o modo imersivo em tela cheia com o avatar centralizado. ' +
      'Cada negócio tem o seu jeito — e a minha I A se adapta a ele.',
    displayText:
      'Esta é a página do seu assistente — ela roda em qualquer tela, tablet, totem ou computador. ' +
      'Você escolhe qual dos três modos apresentar para o seu cliente: ' +
      'o modo padrão com microfone e carrossel de funções, ' +
      'o modo texto para digitação livre, ' +
      'ou o modo imersivo em tela cheia com o avatar centralizado. ' +
      'Cada negócio tem o seu jeito — e a minhAi se adapta a ele.',
    fallbackDuration: 10000,
  },
  {
    id: 'assistente-carrossel',
    label: 'Categorias',
    audioText:
      'O carrossel de categorias organiza mais de 100 funções em grupos como ' +
      'Comercial, Financeiro, Agendamento, Serviços e muito mais. ' +
      'O cliente toca numa categoria, vê as funções disponíveis e escolhe o que precisa — ' +
      'ou simplesmente usa a palavra de ativação e fala diretamente o que quer.',
    fallbackDuration: 8000,
  },
  {
    id: 'assistente-qrcode',
    label: 'QR Code',
    audioText:
      'Com um único toque ou comando, o assistente gera um card na tela — ' +
      'para o WhatsApp da empresa, para uma cobrança PIX, ou qualquer outra das mais de 100 funções. ' +
      'O cliente interage por voz, digitando, lendo o qrcode - ele escolhe. ' +
      'Sem papel, sem digitação, sem atrito.',
    fallbackDuration: 7000,
  },
  {
    id: 'assistente-vendas',
    label: 'Modo Vendas',
    audioText:
      'No Modo Vendas, você tem uma página de vendas completa, com todos os seus produtos. ' +
      'Exibe produtos com foto, descrição e preço, organizados por categoria. ' +
      'O cliente monta o carrinho, escolhe entre retirar no balcão, sentar na mesa ' +
      'ou receber em casa com entrega — o sistema já calcula o frete automaticamente. ',
    fallbackDuration: 9000,
  },
  {
    id: 'assistente-fila',
    label: 'Modo Fila',
    audioText:
      'O Modo Fila organiza o atendimento presencial com senhas digitais. ' +
      'O cliente retira a senha pelo totem, a senha atual aparece em destaque na tela, ' +
      'e as próximas ficam visíveis em tempo real para todos na sala. ' +
      'Quando a senha é chamada, o sistema fala o número em voz alta automaticamente. ' +
      'Podendo acompanhar pelo qrcode, sem papel, sem confusão.',
    fallbackDuration: 8000,
  },
  {
    id: 'assistente-totem',
    label: 'Modo Totem',
    audioText:
      'No Modo Totem, a tela entra em modo quiosque com teclado virtual embutido — ' +
      'sem botões de saída, sem distrações, sem acesso ao sistema. ' +
      'A saída é protegida por uma senha definida pelo proprietário. ' +
      'Ideal para totens de autoatendimento em lojas, clínicas e restaurantes.',
    fallbackDuration: 8000,
  },
  {
    id: 'assistente-outro',
    label: 'Conclusão',
    audioText:
      'E o grande diferencial da minha I A é a liberdade de interação. ' +
      'O cliente pode chamar como uma Alexa usando a palavra de ativação, ' +
      'clicar no botão e falar, navegar pelos botões do carrossel, ' +
      'ou simplesmente digitar. ' +
      'Cada pessoa interage do jeito que prefere — ' +
      'e a minha I A está pronta para todas elas, vinte e quatro horas por dia, ' +
      'sem precisar de um atendente humano.',
    displayText:
      'E o grande diferencial da minhAi é a liberdade de interação. ' +
      'O cliente pode chamar como uma Alexa usando a palavra de ativação, ' +
      'clicar no botão e falar, navegar pelos botões do carrossel, ' +
      'ou simplesmente digitar. ' +
      'Cada pessoa interage do jeito que prefere — ' +
      'e a minhAi está pronta para todas elas, 24 horas por dia, ' +
      'sem precisar de um atendente humano.',
    fallbackDuration: 9000,
  },
]