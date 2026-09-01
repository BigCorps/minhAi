// lib/tour/stage7-script.ts

export type Stage7SceneId =
  | 'funcoes-intro'
  | 'funcoes-conhecimento'
  | 'funcoes-comercial'
  | 'funcoes-agenda'
  | 'funcoes-contato'
  | 'funcoes-arquivos'
  | 'funcoes-midia'
  | 'funcoes-localizacao'
  | 'funcoes-conclusao'

export interface Stage7Script {
  id: Stage7SceneId
  label: string
  audioText: string
  displayText?: string
  fallbackDuration: number
}

export const STAGE7_SCRIPT: Stage7Script[] = [
  {
    id: 'funcoes-intro',
    label: 'Intro',
    audioText:
      'A minha I Á tem mais de 100 funções organizadas em categorias, ' +
      'cada uma ativável por voz, por texto ou por clique. ' +
      'O assistente só executa o que você deixou ativo. ' +
      'controlando tudo pelo dashboard, com simples cliques.',
    displayText:
      'A minhAi tem mais de 100 funções organizadas em categorias, ' +
      'cada uma ativável por voz, por texto ou por clique. ' +
      'O assistente só executa o que você deixou ativo, ' +
      'controlando tudo pelo dashboard, com simples cliques.',
    fallbackDuration: 8000,
  },
  {
    id: 'funcoes-conhecimento',
    label: 'Conhecimento · Consultas',
    audioText:
      'Em Conhecimento, o assistente responde perguntas gerais com ChatGPT, ' +
      'executa respostas rápidas, cria posts ' +
      'gera orçamentos, mostra o clima e transcreve áudios e vídeos. ' +
      'Em Consultas, acessa dados de CPF e CNPJ, ' +
      'verifica restrições de crédito, protestos em cartório e dados de veículos por placa. ' +
      'funções para quem precisa de inteligência e segurança nas transações.',
    fallbackDuration: 12000,
  },
  {
    id: 'funcoes-comercial',
    label: 'Comercial · Financeiro',
    audioText:
      'Em Comercial, o assistente abre o catálogo de produtos, monta o carrinho por voz, ' +
      'registra vendas, gera cupons de desconto e cadastra produtos com sugestão de imagens. ' +
      'Em Financeiro, temos as funções de cobraça no Pix, Débito e Crédito, ' +
      'tudo integrado, sem sair do assistente.',
    fallbackDuration: 9000,
  },
  {
    id: 'funcoes-agenda',
    label: 'Agendamento · Identificação',
    audioText:
      'Em Agendamento, o assistente marca, reagenda, cancela e confirma compromissos ' +
      'direto no Google Agenda — com lembretes automáticos. ' +
      'Em Identificação, faz login de clientes, gera senhas de fila, ' +
      'coleta pré-atendimento, aplica pesquisas de satisfação e gerencia cadastros configuráveis.',
    fallbackDuration: 10000,
  },
  {
    id: 'funcoes-contato',
    label: 'Contato · Serviços',
    audioText:
      'Em Contato, cada canal da empresa vira um QR Code: ' +
      'WhatsApp, Instagram, Facebook, TikTok, LinkedIn, site, e-mail e telefone. ' +
      'Em Serviços, exibe cardápio digital, compartilha Wi-Fi por QR Code, ' +
      'envia SMS, aciona o gerente com notificação urgente, ' +
      'gerencia listas de compras por voz e suporta impressão local, remota e em térmicas.',
    fallbackDuration: 10000,
  },
  {
    id: 'funcoes-arquivos',
    label: 'Arquivos · Câmera',
    audioText:
      'Em Arquivos, transforma planilhas e PDFs em dashboards com gráficos e insights, ' +
      'remove fundo de imagens, converte formatos, duplica fotos para impressão e junta PDFs. ' +
      'Em Câmera, lê QR Codes e códigos de barras, ' +
      'extrai texto de imagens e contratos, identifica fraudes em boletos e links ' +
      'e permite que clientes enviem arquivos pelo assistente.',
    fallbackDuration: 10000,
  },
  {
    id: 'funcoes-midia',
    label: 'Multimídia · Utilitários',
    audioText:
      'Em Multimídia, toca músicas, vídeos e playlists solicitados ou programados, ' +
      'exibe slideshows de ofertas, inicia videochamadas pelo Google Meet ou entre usuários. ' +
      'Em Utilitários, emite notas fiscais, cria lembretes e alarmes por voz, ' +
      'configura lembretes de remédios, gera segunda via de boleto ' +
      'e salva anotações direto no dashboard.',
    fallbackDuration: 10000,
  },
  {
    id: 'funcoes-localizacao',
    label: 'Localização · Informação',
    audioText:
      'Em Localização, mostra o endereço da empresa no mapa, ' +
      'traça rotas, consulta CEP e rastreia encomendas dos Correios. ' +
      'Em Informação, exibe cotação de câmbio em tempo real, ' +
      'notícias do momento, calculadora de juros, IMC, ' +
      'conversor de medidas e feriados nacionais.',
    fallbackDuration: 9000,
  },
  {
    id: 'funcoes-conclusao',
    label: 'Conclusão',
    audioText:
      'Mais de 100 funções, ativadas só quando fazem sentido pro seu negócio. ' +
      'Você pode escolher uma ou todas as funções. Realmente uma I Á pra chamar de sua!',
    displayText:
      'Mais de 100 funções, ativadas só quando fazem sentido pro seu negócio. ' +
      'Você pode escolher 1 ou todas as funções. Realmente uma IA pra chamar de sua!',
    fallbackDuration: 5000,
  },
]
