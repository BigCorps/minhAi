// lib/tour/stage3-script.ts

export type Stage3SceneId =
  | 'auxiliares-intro'
  | 'auxiliares-vendas'
  | 'auxiliares-fiscal'
  | 'auxiliares-agenda'
  | 'auxiliares-producao'
  | 'auxiliares-extras'

export interface Stage3Script {
  id: Stage3SceneId
  label: string
  audioText: string
  displayText?: string
  fallbackDuration: number
}

export const STAGE3_SCRIPT: Stage3Script[] = [
  {
    id: 'auxiliares-intro',
    label: 'Especialistas',
    audioText:
      'Além de executar mais de 100 funções, a minha I Á conta com nove especialistas de I Á ' +
      'integrados ao seu negócio — cada um focado em conduzir processos complexos do início ao fim, ' +
      'por voz ou texto, em qualquer canal.',
    displayText:
      'Além de executar mais de 100 funções, a minhAi conta com 9 especialistas de IA ' +
      'integrados ao seu negócio — cada um focado em conduzir processos complexos do início ao fim, ' +
      'por voz ou texto, em qualquer canal.',
    fallbackDuration: 7000,
  },
  {
    id: 'auxiliares-vendas',
    label: 'Vendas',
    audioText:
      'O Assistente de Vendas atua como um vendedor digital completo — ' +
      'sugere produtos com base no que o cliente pede, ' +
      'monta o carrinho, oferece opções de retirada, mesa ou entrega com cálculo de frete automático, ' +
      'e envia o link de pagamento direto para o cliente finalizar. ' +
      'Funciona no WhatsApp, na tela, no totem — em qualquer canal.',
    fallbackDuration: 9000,
  },
  {
    id: 'auxiliares-agenda',
    label: 'Agenda',
    audioText:
      'O Gestor de Agenda conduz todo o processo de agendamento de ponta a ponta. ' +
      'Pergunta qual serviço ou produto o cliente quer, ' +
      'mostra os horários disponíveis em tempo real, ' +
      'pode cobrar na hora com link de pagamento, ' +
      'marca direto no Google Agenda e envia confirmação por e-mail — ' +
      'tudo por voz ou texto, sem o cliente sair do canal.',
    fallbackDuration: 9000,
  },
 {
    id: 'auxiliares-fiscal',
    label: 'Fiscal',
    audioText:
      'O Auxiliar Fiscal emite nota fiscal por voz ou texto — N F ê, N F S ê e N F C ê. ' +
      'Informe os dados, ele preenche N C M, C F O P e C S O S N automaticamente ' +
      'e envia direto para a SEFAZ. ' +
      'Integrado aos produtos e clientes cadastrados no dashboard.',
    displayText:
      'O Auxiliar Fiscal emite nota fiscal por voz ou texto — NFe, NFSe e NFCe. ' +
      'Informe os dados, ele preenche NCM, CFOP e CSOSN automaticamente ' +
      'e envia direto para a SEFAZ. ' +
      'Integrado aos produtos e clientes cadastrados no dashboard.',
    fallbackDuration: 8000,
  },
  {
    id: 'auxiliares-producao',
    label: 'Produção & Orçamentos',
    audioText:
      'O Auxiliar de Produção calcula custo e margem a partir dos insumos informados ' +
      'e já cria o produto no catálogo com o preço sugerido. ' +
'O Auxiliar de Relatórios transforma planilhas e PDFs em relatórios formatados. ' +
      'O Assistente de Orçamentos vai além — ' +
      'ele monta o orçamento completo com produtos, data e desconto, ' +
      'gera o documento com o logotipo da empresa e o Pix.',
    fallbackDuration: 10000,
  },
  {
    id: 'auxiliares-extras',
    label: 'Mais Auxiliares',
    audioText:
      'O Investigador Antifraude analisa boletos, comprovantes e U R L suspeitas ' +
      'e emite um laudo com nível de risco em segundos — ' +
 
      'protegendo seu negócio antes de fechar qualquer negociação. ' +
      'O Auxiliar de Funções te ajuda a escolher as melhores funções de acordo com o seu ramo. ' +
      'E o Auxiliar de Cadastro cria produtos completos por voz ou texto — ' +
      'nome, descrição, categoria, preço e margem, com recomendação de imagem automática. ' +
      'O produto já fica disponível no catálogo para venda na hora.',
    displayText:
          'O Investigador Antifraude analisa boletos, comprovantes e URLs suspeitas ' +
      'e emite um laudo com nível de risco em segundos — ' +
 
      'protegendo seu negócio antes de fechar qualquer negociação. ' +
      'O Auxiliar de Funções te ajuda a escolher as melhores funções de acordo com o seu ramo. ' +
      'E o Auxiliar de Cadastro cria produtos completos por voz ou texto — ' +
      'nome, descrição, categoria, preço e margem, com recomendação de imagem automática. ' +
      'O produto já fica disponível no catálogo para venda na hora.',
    fallbackDuration: 11000,
  },
{
  id: 'auxiliares-conclusao',
  label: 'Conclusão',
  audioText:
    'Nove especialistas I Á, cada um conduzindo processos complexos do início ao fim — ' +
    'Tudo por voz ou texto, em qualquer canal, sem precisar de um sistema separado para cada área. ' +
    'É a sua equipe digital completa, integrada em um único assistente.',
  displayText:
    '9 especialistas IA, cada um conduzindo processos complexos do início ao fim — ' +
    'Tudo por voz ou texto, em qualquer canal, sem precisar de um sistema separado para cada área. ' +
    'É a sua equipe digital completa, integrada em um único assistente.',
  fallbackDuration: 9000,
},
]