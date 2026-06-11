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
      'Esta é a página do seu assistente: roda em qualquer tela, celular, tablet, totem ou computador. ' +
      'O cliente escolhe como interagir, escolhe o tema claro ou escuro e a apresentação: ' +
      'Normal com microfone e texto; ' +
      'Só interação por texto, como um chatbot, ' +
      'ou o Imersivo, com o avatar centralizado. ' +
      'Cada cliente tem o seu jeito, e a minha I Á se adapta a ele.',
    displayText:
      'Esta é a página do seu assistente: roda em qualquer tela, celular, tablet, totem ou computador. ' +
      'O cliente escolhe como interagir, escolhe o tema claro ou escuro e a apresentação: ' +
      'Normal com microfone ou texto; ' +
      'Só interação por texto, como um chatbot, ' +
      'ou o Imersivo, com o avatar centralizado. ' +
      'Cada cliente tem o seu jeito, e a minhAi se adapta a ele.',
    fallbackDuration: 10000,
  },
  {
    id: 'assistente-carrossel',
    label: 'Categorias',
    audioText:
      'O carrossel de categorias organiza mais de 100 funções em grupos como ' +
      'Comercial, Financeiro, Agendamento, Serviços e muito mais. ' +
      'O cliente toca numa categoria, vê as funções disponíveis e escolhe o que precisa, ' +
      'ou simplesmente usa a palavra de ativação e fala diretamente o que quer.',
    fallbackDuration: 8000,
  },
  {
    id: 'assistente-qrcode',
    label: 'QR Code',
    audioText:
      'Com um único toque ou comando, o assistente gera um card na tela, ' +
      'para o WhatsApp da empresa, para uma cobrança PIX, ou qualquer outra das mais de 100 funções. ' +
      'O cliente interage por voz, digitando ou lendo o qrcode. Ele escolhe. ' +
      'Sem papel, sem digitação, sem atrito.',
    fallbackDuration: 7000,
  },
  {
    id: 'assistente-vendas',
    label: 'Modo Vendas',
    audioText:
      'Tem ainda os modos: o Modo Vendas é uma loja virtual completa, com todos os seus produtos. ' +
      'Alem de interagir com o assistente, também exibe os produtos com nome, foto, descrição e preço, organizados por categoria. ' +
      'O cliente monta o carrinho, escolhe entre retirar no balcão, sentar na mesa ' +
      'ou receber em casa com entrega, o sistema já calcula o frete automaticamente. ',
    fallbackDuration: 9000,
  },
  {
    id: 'assistente-fila',
    label: 'Modo Fila',
    audioText:
      'O Modo Fila organiza o atendimento presencial com senhas digitais. ' +
      'O cliente retira a senha pelo totem, acompanha em tempo real pela tela ' +
      'e o sistema anuncia cada chamada em voz alta, sem papel, sem confusão. ' +
      'E para facilitar ainda mais o acesso, tem também o Modo Link: ' +
      'uma página rápida da empresa com WhatsApp, Instagram, site e todos os contatos, ' +
      'Um único endereço para o cliente encontrar todos os seus contatos',
    fallbackDuration: 10000,
  },
  {
    id: 'assistente-totem',
    label: 'Modo Totem',
    audioText:
      'No Modo Totem, a tela entra em modo quiosque com teclado virtual embutido: ' +
      'sem botões de saída, sem acesso ao sistema, ' +
      'com saída protegida por senha do proprietário. ' +
      'E para personalizar ainda mais a experiência, tem também o Modo Cliente, ' +
      'seus clientes e colaboradores criam uma conta em segundos: Clientes tendo acesso as suas compras.' +
      'Os colaboradores, cada um com seu nível de acesso, com identificador e PIN cadastrados. ' +
      'E você tem o controle de tudo no dashboard, clientes, funcionários, gerente, caixa, totens, entre outros.',
    fallbackDuration: 10000,
  },
  {
    id: 'assistente-outro',
    label: 'Conclusão',
    audioText:
      'O grande diferencial da minha I Á é a liberdade de interação. ' +
      'O cliente pode chamar como uma Alexa usando a palavra de ativação, ' +
      'clicar no botão e falar, navegar pelos botões do carrossel, ' +
      'digitar, ou interagir pelos modos.' +
      'Cada pessoa utiliza do jeito que prefere, ' +
      'e a minha I Á está pronta para todas elas, vinte e quatro horas por dia, ',
    displayText:
      'E o grande diferencial da minhAi é a liberdade de interação. ' +
      'O cliente pode chamar como uma Alexa usando a palavra de ativação, ' +
      'clicar no botão e falar, navegar pelos botões do carrossel, ' +
      'digitar, ou interagir pelos modos.' +
      'Cada pessoa utiliza do jeito que prefere, ' +
      'e a minhAi está pronta para todas elas, 24 horas por dia! ',
    fallbackDuration: 9000,
  },
]
