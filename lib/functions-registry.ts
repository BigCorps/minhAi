/**
 * Sistema de Registro de Funções do Assistente eAi
 * 
 * Este arquivo centraliza TODAS as funções disponíveis no assistente.
 * Para adicionar uma nova função, basta adicionar uma nova entrada aqui.
 */

export type ResponseType = 'voice' | 'modal' | 'page' | 'voice+modal' | 'voice+page';

/**
 * Interface que define a estrutura de cada função
 */
export interface FunctionDefinition {
  // Identificação
  functionKey: string;
  functionName: string;
  category: 'contact' | 'payment' | 'information' | 'ai_assistant' | 'productivity' | 'custom';
  
  // Tipo de resposta
  responseType: ResponseType;
  
  // Triggers de voz (para detecção automática)
  voiceTriggers: string[];
  examplePhrases: string[];
  
  // Backend
  edgeFunction?: string;
  apiEndpoint?: string;
  
  // Frontend
  uiComponent?: string;
  configPath?: string;
  
  // Comportamento
  requiresInput: boolean;
  inputType?: 'text' | 'number' | 'date' | 'selection';
  inputPrompt?: string;
  
  // Metadata
  description: string;
  shortDescription?: string;
  icon?: string;
  color?: string;
  
  // Configurações
  saveToHistory: boolean;
  creditsPerUse: number;
  requiresPayment: boolean;
  isPremium: boolean;
}

/**
 * ========================================
 * REGISTRO DE FUNÇÕES
 * ========================================
 * 
 * ✅ 100% ALINHADO COM O BANCO DE DADOS
 * Categorias: contact, payment, information, ai_assistant
 */
export const FUNCTIONS_REGISTRY: Record<string, FunctionDefinition> = {
  
  // ========================================
  // CONTATO (contact)
  // ========================================
  
  qrcode_whatsapp: {
    functionKey: 'qrcode_whatsapp',
    functionName: 'Nosso WhatsApp',
    category: 'contact',
    responseType: 'voice+modal',
    
    voiceTriggers: [
      'whatsapp',
      'whats',
      'zap',
      'contato',
      'falar',
      'número',
      'telefone',
      'watts',
      'what\'s',
    ],
    
    examplePhrases: [
      'Mostre o WhatsApp',
      'Qual o WhatsApp?',
      'Quero falar no WhatsApp',
      'Me dá o zap',
    ],
    
    edgeFunction: 'gerar-qrcode-contato',
    uiComponent: 'QRCodeDisplay',
    
    requiresInput: false,
    
    description: 'Exibe QR Code do WhatsApp da empresa para facilitar o contato',
    shortDescription: 'Mostrar WhatsApp',
    icon: '📱',
    color: '#25D366',
    
    saveToHistory: true,
    creditsPerUse: 1,
    requiresPayment: false,
    isPremium: false,
  },
  
  qrcode_instagram: {
    functionKey: 'qrcode_instagram',
    functionName: 'Nosso Instagram',
    category: 'contact',
    responseType: 'voice+modal',
    
    voiceTriggers: [
      'instagram',
      'insta',
      'perfil',
      'seguir',
      'arroba',
      'instagran',
      'istagran',
    ],
    
    examplePhrases: [
      'Mostre o Instagram',
      'Qual o Instagram?',
      'Quero seguir no Instagram',
    ],
    
    edgeFunction: 'gerar-qrcode-contato',
    uiComponent: 'QRCodeDisplay',
    
    requiresInput: false,
    
    description: 'Exibe QR Code do Instagram da empresa',
    shortDescription: 'Mostrar Instagram',
    icon: '📸',
    color: '#E4405F',
    
    saveToHistory: true,
    creditsPerUse: 1,
    requiresPayment: false,
    isPremium: false,
  },
  
  // ========================================
  // PAGAMENTOS
  // ========================================
  
  pix_generate: {
    functionKey: 'pix_generate',
    functionName: 'Gerar PIX',
    category: 'payment',
    responseType: 'voice+modal',
    
    voiceTriggers: [
      'pix',
      'gerar pix',
      'criar pix',
      'cobrar',
      'cobrança',
      'cobranca',
      'pagamento',
      'picos',
      'picks',
      'piche',
      'pics',
    ],
    
    examplePhrases: [
      'Gerar PIX de 50 reais',
      'Criar cobrança de 100',
      'Quero cobrar 25 no PIX',
    ],
    
    edgeFunction: 'gerar-pix-assistente',
    uiComponent: 'PIXConfirmationModal',
    
    requiresInput: true,
    inputType: 'number',
    inputPrompt: 'Qual o valor do PIX que você deseja gerar?',
    
    description: 'Gera cobrança PIX para o cliente com QR Code',
    shortDescription: 'Cobrar via PIX',
    icon: '💰',
    color: '#32BCAD',
    
    saveToHistory: true,
    creditsPerUse: 2,
    requiresPayment: false,
    isPremium: false,
  },
  
  pix_confirm: {
    functionKey: 'pix_confirm',
    functionName: 'Confirmar PIX',
    category: 'payment',
    responseType: 'voice',
    
    voiceTriggers: [
      'confirmar pix',
      'paguei',
      'confirmado',
      'já paguei',
      'pagamento confirmado',
      'pago',
    ],
    
    examplePhrases: [
      'Confirmar PIX',
      'Já paguei',
    ],
    
    edgeFunction: 'confirmar-pix-assistente',
    
    requiresInput: false,
    
    description: 'Confirma recebimento do PIX e atualiza o saldo',
    shortDescription: 'Confirmar pagamento',
    icon: '✅',
    color: '#10B981',
    
    saveToHistory: true,
    creditsPerUse: 1,
    requiresPayment: false,
    isPremium: false,
  },
  
  pix_cancel: {
    functionKey: 'pix_cancel',
    functionName: 'Cancelar PIX',
    category: 'payment',
    responseType: 'voice',
    
    voiceTriggers: [
      'cancelar pix',
      'desistir do pix',
      'cancela pix',
      'fechar pix',
    ],
    
    examplePhrases: [
      'Cancelar PIX',
    ],
    
    edgeFunction: 'cancelar-pix-assistente',
    
    requiresInput: false,
    
    description: 'Cancela cobrança PIX pendente',
    shortDescription: 'Cancelar PIX',
    icon: '❌',
    color: '#EF4444',
    
    saveToHistory: false,
    creditsPerUse: 0,
    requiresPayment: false,
    isPremium: false,
  },
  
  // ========================================
  // INFORMAÇÃO (information)
  // ========================================
  
  faq: {
    functionKey: 'faq',
    functionName: 'Perguntas Frequentes',
    category: 'information',
    responseType: 'voice',
    
    voiceTriggers: [
      'faq',
      'perguntas frequentes',
      'duvidas',
      'dúvidas',
      'ajuda',
      'horário',
      'funciona',
      'endereço',
      'localização',
      'preço',
      'valor',
      'aceita',
      'forma de pagamento',
      'delivery',
      'entrega',
    ],
    
    examplePhrases: [
      'Quais são seus horários?',
      'Qual o prazo de entrega?',
      'Quais formas de pagamento?',
      'Como funciona a troca?',
    ],
    
    apiEndpoint: '/api/voice/process',
    configPath: '/dashboard/faq',
    
    requiresInput: false,
    
    description: 'Responde perguntas frequentes configuradas pela empresa',
    shortDescription: 'Dúvidas comuns',
    icon: '❓',
    color: '#3B82F6',
    
    saveToHistory: true,
    creditsPerUse: 1,
    requiresPayment: false,
    isPremium: false,
  },
  
  // ========================================
  // ASSISTENTE IA (ai_assistant)
  // ========================================
  
  chatgpt: {
    functionKey: 'chatgpt',
    functionName: 'Perguntas Gerais (ChatGPT)',
    category: 'ai_assistant',
    responseType: 'voice',
    
    voiceTriggers: [
      'chatgpt',
      'perguntas gerais',
      'ajuda geral',
      'curiosidade',
      'calcular',
      // Sem triggers específicos - é o fallback para qualquer pergunta
    ],
    
    examplePhrases: [
      'Quanto é 15% de 350?',
      'Converta 100 dólares para reais',
      'Me conte uma curiosidade',
      'Qual a capital da França?',
    ],
    
    apiEndpoint: '/api/voice/process',
    
    requiresInput: true,
    inputType: 'text',
    
    description: 'Responde perguntas gerais usando IA (Gemini)',
    shortDescription: 'Perguntas gerais',
    icon: '🤖',
    color: '#8B5CF6',
    
    saveToHistory: true,
    creditsPerUse: 2,
    requiresPayment: false,
    isPremium: false,
  },
};

/**
 * ========================================
 * FUNÇÕES UTILITÁRIAS
 * ========================================
 */

/**
 * Busca função por key
 */
export function getFunctionByKey(key: string): FunctionDefinition | undefined {
  return FUNCTIONS_REGISTRY[key];
}

/**
 * Busca todas as funções de uma categoria
 */
export function getFunctionsByCategory(category: string): FunctionDefinition[] {
  return Object.values(FUNCTIONS_REGISTRY).filter(
    fn => fn.category === category
  );
}

/**
 * Detecta qual função deve ser ativada baseado no texto transcrito
 */
export function detectFunctionFromTranscript(transcript: string): {
  function: FunctionDefinition | null;
  confidence: number;
  extractedValue?: any;
} {
  const lowerTranscript = transcript.toLowerCase().trim();
  
  // Percorrer todas as funções e calcular score de match
  let bestMatch: FunctionDefinition | null = null;
  let bestScore = 0;
  let extractedValue: any = undefined;
  
  for (const func of Object.values(FUNCTIONS_REGISTRY)) {
    let score = 0;
    
    // Verificar triggers
    for (const trigger of func.voiceTriggers) {
      if (lowerTranscript.includes(trigger.toLowerCase())) {
        score += 10;
      }
    }
    
    // Se a função precisa de input numérico, tentar extrair
    if (func.requiresInput && func.inputType === 'number') {
      const numberMatch = extractNumberFromText(lowerTranscript);
      if (numberMatch) {
        score += 5;
        extractedValue = numberMatch;
      }
    }
    
    // Atualizar melhor match
    if (score > bestScore) {
      bestScore = score;
      bestMatch = func;
    }
  }
  
  // Threshold mínimo de confiança
  const confidence = bestScore / 10;
  
  return {
    function: confidence >= 0.5 ? bestMatch : null,
    confidence,
    extractedValue,
  };
}

/**
 * Extrai número de um texto (para PIX, valores, etc)
 */
function extractNumberFromText(text: string): number | null {
  // Converter palavras em números primeiro
  const converted = convertWordsToNumbers(text);
  
  // Remover palavras comuns
  let cleaned = converted
    .replace(/reais?|real/gi, '')
    .replace(/centavos?/gi, '')
    .replace(/r\$/gi, '')
    .trim();
  
  // Buscar padrões numéricos
  const patterns = [
    /(\d+[,.]?\d{0,2})/g,
  ];
  
  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      const numStr = match[0].replace(',', '.');
      const num = parseFloat(numStr);
      if (!isNaN(num) && num > 0) {
        return num;
      }
    }
  }
  
  return null;
}

/**
 * Converte palavras em números
 */
function convertWordsToNumbers(text: string): string {
  const numberWords: {[key: string]: string} = {
    'zero': '0', 'um': '1', 'dois': '2', 'três': '3', 'tres': '3',
    'quatro': '4', 'cinco': '5', 'seis': '6', 'sete': '7',
    'oito': '8', 'nove': '9', 'dez': '10',
    'vinte': '20', 'trinta': '30', 'quarenta': '40', 'cinquenta': '50',
    'sessenta': '60', 'setenta': '70', 'oitenta': '80', 'noventa': '90',
    'cem': '100', 'cento': '100', 'duzentos': '200', 'mil': '1000',
  };
  
  let result = text;
  
  for (const [word, number] of Object.entries(numberWords)) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    result = result.replace(regex, number);
  }
  
  return result;
}

/**
 * Lista todas as funções disponíveis
 */
export function getAllFunctions(): FunctionDefinition[] {
  return Object.values(FUNCTIONS_REGISTRY);
}

/**
 * Busca funções que precisam de página de configuração
 */
export function getFunctionsWithConfigPage(): FunctionDefinition[] {
  return Object.values(FUNCTIONS_REGISTRY).filter(
    fn => fn.configPath !== undefined
  );
}
