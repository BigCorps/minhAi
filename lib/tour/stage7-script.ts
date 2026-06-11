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
      'O assistente tem mais de 100 funções organizadas em 14 categorias — ' +
      'cada uma ativável por voz, por toque ou automaticamente. ' +
      'No carrossel da página do assistente, o cliente vê só o que está ativo. ' +
      'Você controla tudo pelo dashboard, com um simples toggle.',
    fallbackDuration: 8000,
  },
  {
    id: 'funcoes-conhecimento',
    label: 'Conhecimento · Consultas',
    audioText:
      'Em Conhecimento, o assistente responde perguntas gerais com ChatGPT, ' +
      'executa respostas rápidas configuradas por você, ' +
      'cria posts para redes sociais, gera orçamentos, transcreve áudios e vídeos ' +
      'e mostra o clima em tempo real. ' +
      'Em Consultas, ele acessa dados de CPF e CNPJ, ' +
      'verifica restrições de crédito, protestos em cartório e dados de veículos por placa — ' +
      'funções premium para quem precisa de mais segurança nas transações.',
    fallbackDuration: 12000,
  },
  {
    id: 'funcoes-comercial',
    label: 'Comercial · Financeiro',
    audioText:
      'Em Comercial, o assistente abre o catálogo de produtos, monta o carrinho por voz, ' +
      'registra vendas, gera cupons de desconto e cadastra produtos com sugestão de imagens. ' +
      'Em Financeiro, cobra via PIX, TEF, NFC e link de pagamento — ' +
      'tudo integrado, sem sair do assistente.',
    fallbackDuration: 9000,
  },
  {
    id: 'funcoes-agenda',
    label: 'Agendamento · Identificação',
    audioText:
      'Em Agendamento, o assistente marca, reagenda, cancela e confirma compromissos ' +
      'direto no Google Agenda — com lembretes automáticos e links pelo Google Meet. ' +
      'Em Identificação, faz login de clientes, gera senhas de fila, ' +
      'coleta pré-atendimento, aplica pesquisas de satisfação e gerencia cadastros configuráveis.',
    fallbackDuration: 10000,
  },
  {
    id: 'funcoes-contato',
    label: 'Contato · Serviços',
    audioText:
      'Em Contato, cada canal da empresa vira um QR Code — ' +
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
      'Em Multimídia, toca músicas e vídeos do YouTube por voz, ' +
      'exibe slideshows de ofertas, inicia videochamadas pelo Google Meet ' +
      'e reproduz playlists automaticamente. ' +
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
      'Em Informação, exibe cotação de câmbio, previsão do tempo, ' +
      'notícias do momento, calculadora de juros e de IMC, ' +
      'conversor de medidas e feriados nacionais.',
    fallbackDuration: 9000,
  },
  {
    id: 'funcoes-conclusao',
    label: 'Conclusão',
    audioText:
      'Mais de 100 funções, 14 categorias, ativadas só quando fazem sentido pro seu negócio. ' +
      'O assistente que nunca dorme — e nunca para de aprender.',
    fallbackDuration: 5000,
  },
]
