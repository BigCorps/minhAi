// lib/vosk-grammar.ts

/**
 * Grammar customizada para melhorar reconhecimento do Vosk
 * Adicione aqui palavras específicas do seu domínio que o Vosk deve priorizar
 */

export const VOSK_CUSTOM_GRAMMAR = [
  // === PALAVRAS-CHAVE PIX ===
  '[unk]',
  'pix',
  'pics',
  'pic',
  'picos',
  'kit', // para normalizar depois
  
  // === COMANDOS FINANCEIROS ===
  'gerar',
  'criar',
  'fazer',
  'cobrança',
  'cobranca',
  'cobrar',
  'pagamento',
  'pagar',
  'receber',
  
  // === VALORES ===
  'reais',
  'real',
  'centavos',
  'valor',
  
  // === NÚMEROS (0-100) ===
  'zero', 'um', 'dois', 'tres', 'três', 'quatro', 'cinco',
  'seis', 'sete', 'oito', 'nove', 'dez',
  'onze', 'doze', 'treze', 'catorze', 'quinze',
  'dezesseis', 'dezessete', 'dezoito', 'dezenove',
  'vinte', 'trinta', 'quarenta', 'cinquenta',
  'sessenta', 'setenta', 'oitenta', 'noventa', 'cem',
  
  // === NÚMEROS GRANDES ===
  'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos',
  'seiscentos', 'setecentos', 'oitocentos', 'novecentos',
  'mil', 'milhão', 'milhões',
  
  // === WHATSAPP ===
  'whatsapp',
  'whats',
  'zap',
  'wassap',
  'número',
  'numero',
  'contato',
  'telefone',
  
  // === INSTAGRAM ===
  'instagram',
  'insta',
  'arroba',
  'perfil',
  'rede',
  'social',
  
  // === AÇÕES GERAIS ===
  'mostrar',
  'mostre',
  'mostra',
  'exibir',
  'exiba',
  'ver',
  'qual',
  'quais',
  'me',
  'o',
  'a',
  'da',
  'do',
  'de',
  'para',
  
  // === CONFIRMAÇÃO ===
  'confirmar',
  'confirmado',
  'confirma',
  'paguei',
  'já',
  'ok',
  'sim',
  'certo',
  'correto',
  
  // === CANCELAMENTO ===
  'cancelar',
  'cancela',
  'desistir',
  'não',
  'nao',
  'nunca',
  'quero',
  'fechar',
  'fecha',
  
  // === WAKE WORDS ===
  'gerente',
  'atendente',
  'assistente',
  'oi',
  'olá',
  'ola',
  'eai',
  'ei',
  
  // === COMANDOS STOP ===
  'pare',
  'para',
  'parar',
  'cala',
  'boca',
  'silencio',
  'silêncio',
  'stop',
  'chega',
  'tchau',
  'obrigado',
  'obrigada',
  'valeu',
  
  // === CONECTORES E PREPOSIÇÕES ===
  'com',
  'sem',
  'em',
  'no',
  'na',
  'pelo',
  'pela',
  'ao',
  'à',
  'por',
  'favor',
  
  // === VERBOS COMUNS ===
  'quero',
  'preciso',
  'gostaria',
  'poderia',
  'pode',
  'consegue',
  'ajuda',
  'ajudar',
  
  // === SAUDAÇÕES ===
  'boa',
  'dia',
  'tarde',
  'noite',
  'bom',
  'tudo',
  'bem',
  
  // === PERGUNTAS ===
  'como',
  'quando',
  'onde',
  'porque',
  'porquê',
  'quanto',
  'quem',
  'que',
  'o que',
  
  // === ADICIONE AQUI PALAVRAS ESPECÍFICAS DO SEU NEGÓCIO ===
  // Exemplo para delivery:
  // 'pizza', 'hamburguer', 'lanche', 'entrega', 'cardapio'
  
  // Exemplo para clínica:
  // 'consulta', 'agendamento', 'horario', 'doutor', 'exame'
];

/**
 * Dicionário de correções pós-processamento
 * Normaliza erros conhecidos do Vosk
 */
export const VOSK_CORRECTIONS: { [key: string]: string } = {
  // PIX
  'picos': 'pix',
  'kit': 'pix',
  'pic': 'pix',
  'picks': 'pix',
  'pics': 'pix',
  'pis': 'pix',
  'pitch': 'pix',
  
  // WhatsApp
  'whats up': 'whatsapp',
  'wassap': 'whatsapp',
  "what's app": 'whatsapp',
  'watts': 'whatsapp',
  'zap zap': 'zap',
  
  // Instagram
  'insta gram': 'instagram',
  'instagramo': 'instagram',
  
  // Números
  'dois mil': '2000',
  'três mil': '3000',
  'cinco mil': '5000',
  'dez mil': '10000',
  
  // Stop commands
  'calça boca': 'cala boca',
  'para de': 'pare de',
  'para aí': 'pare aí',
  
  // Confirmação
  'tá bom': 'ok',
  'ta bom': 'ok',
  'beleza': 'ok',
};

/**
 * Normaliza transcrição do Vosk aplicando correções
 */
export function normalizeVoskTranscript(text: string): string {
  let normalized = text.toLowerCase().trim();
  
  // Aplicar correções do dicionário
  for (const [wrong, correct] of Object.entries(VOSK_CORRECTIONS)) {
    const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
    normalized = normalized.replace(regex, correct);
  }
  
  return normalized;
}