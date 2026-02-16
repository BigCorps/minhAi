/**
 * Sistema de Registro de Funções NOVAS - eAi
 * 
 * ⚠️ IMPORTANTE: Este registry é apenas para NOVAS funções.
 * Funções existentes (WhatsApp, Instagram, PIX, FAQ, ChatGPT) continuam
 * funcionando pelo sistema legado no VoiceAssistant.
 * 
 * Como adicionar uma nova função:
 * 1. Adicionar entrada neste arquivo
 * 2. Criar Edge Function (se necessário)
 * 3. Criar Modal (se necessário)
 * 4. Adicionar no banco de dados
 * 5. PRONTO! O VoiceAssistant detecta automaticamente
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
  
  // Handler customizado (opcional)
  // Usado quando a função precisa de lógica específica
  handler?: (context: {
    transcript: string;
    companyId: string;
    functionSettings: any;
    playText: (text: string) => Promise<void>;
    setIsProcessing: (processing: boolean) => void;
    setActiveModal?: (modal: any) => void;
    registerFunctionUsage?: (key: string, credits: number) => Promise<void>;
    checkIfFunctionIsEnabled?: (key: string) => Promise<boolean>;
  }) => Promise<boolean>;
}

/**
 * ========================================
 * REGISTRO DE NOVAS FUNÇÕES
 * ========================================
 * 
 * ⚠️ NÃO ADICIONE as funções legadas aqui:
 * - qrcode_whatsapp (já existe no VoiceAssistant)
 * - qrcode_instagram (já existe no VoiceAssistant)
 * - pix_generate (já existe no VoiceAssistant)
 * - pix_confirm (já existe no VoiceAssistant)
 * - pix_cancel (já existe no VoiceAssistant)
 * - faq (já existe no VoiceAssistant)
 * - chatgpt (já existe no VoiceAssistant)
 */
export const FUNCTIONS_REGISTRY: Record<string, FunctionDefinition> = {

  // ========================================
  // NOSSO SITE
  // ========================================
  qrcode_website: {
    functionKey: 'qrcode_website',
    functionName: 'Nosso Site',
    category: 'contact',
    responseType: 'voice+modal',
    
    voiceTriggers: [
      'site',
      'website',
      'nosso site',
      'página',
      'pagina',
      'endereço',
      'endereco',
      'url',
    ],
    
    examplePhrases: [
      'Qual o site?',
      'Me passa o site',
      'Qual o endereço do site?',
      'Mostre o site',
    ],
    
    edgeFunction: 'gerar-qrcode-contato',
    uiComponent: 'QRCodeDisplay',
    
    requiresInput: false,
    
    description: 'Exibe QR Code do site da empresa',
    shortDescription: 'Mostrar Site',
    icon: '🌐',
    color: '#3B82F6',
    
    saveToHistory: true,
    creditsPerUse: 1,
    requiresPayment: false,
    isPremium: false,
  },

  // ========================================
  // NOSSO FACEBOOK
  // ========================================
  qrcode_facebook: {
    functionKey: 'qrcode_facebook',
    functionName: 'Nosso Facebook',
    category: 'contact',
    responseType: 'voice+modal',
    
    voiceTriggers: [
      'facebook',
      'face',
      'fb',
      'perfil facebook',
      'página facebook',
      'pagina facebook',
    ],
    
    examplePhrases: [
      'Qual o Facebook?',
      'Me passa o Facebook',
      'Mostre o Facebook',
      'Perfil do Facebook',
    ],
    
    edgeFunction: 'gerar-qrcode-contato',
    uiComponent: 'QRCodeDisplay',
    
    requiresInput: false,
    
    description: 'Exibe QR Code do perfil do Facebook da empresa',
    shortDescription: 'Mostrar Facebook',
    icon: '👍',
    color: '#1877F2',
    
    saveToHistory: true,
    creditsPerUse: 1,
    requiresPayment: false,
    isPremium: false,
  },
  
  // ========================================
  // EXEMPLO: RESUMO DE VENDAS (com handler customizado)
  // ========================================
  // 
  // Descomente e adapte este exemplo para criar sua primeira função nova:
  
  /*
  resumo_vendas: {
    functionKey: 'resumo_vendas',
    functionName: 'Resumo de Vendas',
    category: 'productivity',
    responseType: 'voice+modal',
    
    voiceTriggers: [
      'vendas',
      'quanto vendemos',
      'faturamento',
      'resultado',
      'quanto vendeu',
    ],
    
    examplePhrases: [
      'Quanto vendemos hoje?',
      'Qual o faturamento desta semana?',
      'Resumo de vendas',
    ],
    
    edgeFunction: 'resumo-vendas',
    uiComponent: 'SalesSummaryModal',
    
    requiresInput: false,
    
    description: 'Fornece resumo de vendas do período com total e quantidade',
    shortDescription: 'Ver vendas',
    icon: '📊',
    color: '#F59E0B',
    
    saveToHistory: true,
    creditsPerUse: 2,
    requiresPayment: false,
    isPremium: true,
    
    // Handler customizado (opcional)
    // Use quando precisar de lógica específica
    handler: async ({ playText, setActiveModal, companyId }) => {
      try {
        // Chamar Edge Function
        const response = await fetch('/api/supabase-function', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            function: 'resumo-vendas',
            company_id: companyId,
          }),
        });
        
        const data = await response.json();
        
        // Falar resultado
        await playText(`Você vendeu ${data.total} reais hoje.`);
        
        // Abrir modal (se tiver)
        if (setActiveModal) {
          setActiveModal({
            componentName: 'SalesSummaryModal',
            data: data,
          });
        }
        
        return true; // Comando foi processado
      } catch (error) {
        console.error('Erro ao buscar vendas:', error);
        await playText('Erro ao buscar resumo de vendas.');
        return false;
      }
    },
  },
  */
  
  // ========================================
  // EXEMPLO: CONSULTA DE ESTOQUE (sem handler - usa Edge Function)
  // ========================================
  
  /*
  consulta_estoque: {
    functionKey: 'consulta_estoque',
    functionName: 'Consultar Estoque',
    category: 'productivity',
    responseType: 'voice',
    
    voiceTriggers: [
      'estoque',
      'tem disponível',
      'quantidade',
      'quantos tem',
    ],
    
    examplePhrases: [
      'Quantos produtos X tem em estoque?',
      'Consultar estoque de Y',
    ],
    
    edgeFunction: 'consultar-estoque',
    
    requiresInput: true,
    inputType: 'text',
    inputPrompt: 'Qual produto você quer consultar?',
    
    description: 'Consulta quantidade em estoque de um produto',
    shortDescription: 'Ver estoque',
    icon: '📦',
    color: '#3B82F6',
    
    saveToHistory: true,
    creditsPerUse: 1,
    requiresPayment: false,
    isPremium: false,
    
    // Sem handler - usa automaticamente o voice-command-processor
    // que chama a Edge Function especificada
  },
  */
  
  // ========================================
  // ADICIONE SUAS NOVAS FUNÇÕES AQUI
  // ========================================
  
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
 * Extrai número de um texto (para valores, quantidades, etc)
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
