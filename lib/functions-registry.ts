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

// ✅ ADICIONAR ESTE IMPORT NO TOPO
import { createClient } from '@/lib/supabase-browser';

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
  // NOSSO EMAIL
  // ========================================
  qrcode_email: {
    functionKey: 'qrcode_email',
    functionName: 'Nosso Email',
    category: 'contact',
    responseType: 'voice+modal',
    
    voiceTriggers: [
      'email',
      'nosso email',
      'endereço de email',
      'e-mail',
      'contato email',
    ],
    
    examplePhrases: [
      'Qual o email?',
      'Me passa o email',
      'Mostre o email de contato',
    ],
    
    edgeFunction: 'gerar-qrcode-contato',
    uiComponent: 'QRCodeDisplay',
    requiresInput: false,
    description: 'Exibe QR Code do email da empresa',
    shortDescription: 'Mostrar Email',
    icon: '📧',
    color: '#10B981',
    saveToHistory: true,
    creditsPerUse: 1,
    requiresPayment: false,
    isPremium: false,
  },

  // ========================================
  // NOSSO LINKEDIN
  // ========================================
  qrcode_linkedin: {
    functionKey: 'qrcode_linkedin',
    functionName: 'Nosso LinkedIn',
    category: 'contact',
    responseType: 'voice+modal',
    
    voiceTriggers: [
      'linkedin',
      'linked in',
      'perfil linkedin',
      'página linkedin',
    ],
    
    examplePhrases: [
      'Qual o LinkedIn?',
      'Me passa o LinkedIn',
      'Mostre o LinkedIn',
    ],
    
    edgeFunction: 'gerar-qrcode-contato',
    uiComponent: 'QRCodeDisplay',
    requiresInput: false,
    description: 'Exibe QR Code do perfil LinkedIn da empresa',
    shortDescription: 'Mostrar LinkedIn',
    icon: '💼',
    color: '#10B981',
    saveToHistory: true,
    creditsPerUse: 1,
    requiresPayment: false,
    isPremium: false,
  },

  // ========================================
  // NOSSO TIKTOK
  // ========================================
  qrcode_tiktok: {
    functionKey: 'qrcode_tiktok',
    functionName: 'Nosso TikTok',
    category: 'contact',
    responseType: 'voice+modal',
    
    voiceTriggers: [
      'tiktok',
      'tik tok',
      'nosso tiktok',
      'perfil tiktok',
    ],
    
    examplePhrases: [
      'Qual o TikTok?',
      'Me passa o TikTok',
      'Mostre o TikTok',
    ],
    
    edgeFunction: 'gerar-qrcode-contato',
    uiComponent: 'QRCodeDisplay',
    requiresInput: false,
    description: 'Exibe QR Code do perfil TikTok da empresa',
    shortDescription: 'Mostrar TikTok',
    icon: '🎵',
    color: '#10B981',
    saveToHistory: true,
    creditsPerUse: 1,
    requiresPayment: false,
    isPremium: false,
  },

  // ========================================
  // NOSSO TWITTER/X
  // ========================================
  qrcode_twitter: {
    functionKey: 'qrcode_twitter',
    functionName: 'Nosso Twitter/X',
    category: 'contact',
    responseType: 'voice+modal',
    
    voiceTriggers: [
      'twitter',
      'x',
      'nosso twitter',
      'perfil twitter',
      'nosso x',
    ],
    
    examplePhrases: [
      'Qual o Twitter?',
      'Me passa o X',
      'Mostre o Twitter',
    ],
    
    edgeFunction: 'gerar-qrcode-contato',
    uiComponent: 'QRCodeDisplay',
    requiresInput: false,
    description: 'Exibe QR Code do perfil Twitter/X da empresa',
    shortDescription: 'Mostrar Twitter/X',
    icon: '🐦',
    color: '#10B981',
    saveToHistory: true,
    creditsPerUse: 1,
    requiresPayment: false,
    isPremium: false,
  },

  // ========================================
  // NOSSO TELEFONE FIXO
  // ========================================
  qrcode_telefone: {
    functionKey: 'qrcode_telefone',
    functionName: 'Nosso Telefone',
    category: 'contact',
    responseType: 'voice+modal',
    
    voiceTriggers: [
      'telefone',
      'telefone fixo',
      'número de telefone',
      'ligar',
      'nosso telefone',
      'fixo',
    ],
    
    examplePhrases: [
      'Qual o telefone?',
      'Me passa o telefone',
      'Qual o número para ligar?',
    ],
    
    edgeFunction: 'gerar-qrcode-contato',
    uiComponent: 'QRCodeDisplay',
    requiresInput: false,
    description: 'Exibe QR Code do telefone fixo - abre direto no app de ligações',
    shortDescription: 'Mostrar Telefone',
    icon: '📞',
    color: '#10B981',
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
  // CRIAR ORÇAMENTO
  // ========================================
  orcamento: {
    functionKey: 'orcamento',
    functionName: 'Criar Orçamento',
    category: 'ai_assistant',
    responseType: 'voice',
    
    voiceTriggers: [
      'orçamento',
      'fazer orçamento',
      'quanto custa',
      'preço',
      'valor',
      'cotação',
      'orçar',
    ],
    
    examplePhrases: [
      'Quanto custa [produto/serviço]?',
      'Preciso de um orçamento',
      'Qual o valor de [item]?',
      'Faça um orçamento de [produto]',
    ],
    
    requiresInput: true,
    description: 'Gera orçamentos personalizados usando IA com tabelas de preços configuradas',
    shortDescription: 'Gerar orçamentos com IA',
    icon: '💰',
    color: '#8B5CF6',
    saveToHistory: true,
    creditsPerUse: 2,
    requiresPayment: false,
    isPremium: false,
    
    handler: async ({ 
      transcript, 
      playText, 
      companyId
    }) => {
      try {
        console.log('💰 [ORCAMENTO] Handler iniciado');
        console.log('💰 [ORCAMENTO] Transcript:', transcript);
        
        const supabase = createClient();

        // Buscar prompt de orçamento
        const { data: company } = await supabase
          .from('companies')
          .select('orcamento_prompt')
          .eq('id', companyId)
          .single();

        console.log('💰 [ORCAMENTO] Prompt encontrado:', company?.orcamento_prompt ? 'SIM' : 'NÃO');

        if (!company?.orcamento_prompt) {
          await playText('A função de orçamento não está configurada. Configure as tabelas de preços no painel de funções.');
          return false;
        }

        await playText('Gerando seu orçamento. Um momento...');

        console.log('💰 [ORCAMENTO] Chamando API voice/process...');

        // ✅ USAR /api/voice/process (mesma API que ChatGPT usa)
        // Criar um FormData com o texto
        const formData = new FormData();
        const textBlob = new Blob([transcript], { type: 'text/plain' });
        formData.append('audio', textBlob, 'question.txt');
        formData.append('companyId', companyId);
        formData.append('directQuestion', transcript);
        formData.append('useOrcamentoPrompt', 'true'); // ← Flag especial

        const response = await fetch('/api/voice/process', {
          method: 'POST',
          body: formData,
        });

        console.log('💰 [ORCAMENTO] Response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('💰 [ORCAMENTO] Erro response:', errorText);
          throw new Error('Erro ao gerar orçamento');
        }

        // A resposta é um áudio (ArrayBuffer)
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        console.log('💰 [ORCAMENTO] Áudio recebido, tocando...');

        // Tocar o áudio diretamente
        const audio = new Audio(audioUrl);
        audio.playbackRate = 1.05;
        
        await new Promise<void>((resolve, reject) => {
          audio.onended = () => {
            console.log('💰 [ORCAMENTO] Áudio tocado com sucesso');
            resolve();
          };
          audio.onerror = () => {
            console.error('💰 [ORCAMENTO] Erro ao tocar áudio');
            reject(new Error('Erro ao tocar áudio'));
          };
          audio.play().catch(reject);
        });

        return true;
        
      } catch (error) {
        console.error('💰 [ORCAMENTO] ERRO:', error);
        await playText('Desculpe, não consegui gerar o orçamento. Tente novamente.');
        return false;
      }
    },
  },
  
};

/**
 * ========================================
 * FUNÇÕES UTILITÁRIAS
 * ========================================
 */

export function getFunctionByKey(key: string): FunctionDefinition | undefined {
  return FUNCTIONS_REGISTRY[key];
}

export function getFunctionsByCategory(category: string): FunctionDefinition[] {
  return Object.values(FUNCTIONS_REGISTRY).filter(
    fn => fn.category === category
  );
}

export function detectFunctionFromTranscript(transcript: string): {
  function: FunctionDefinition | null;
  confidence: number;
  extractedValue?: any;
} {
  const lowerTranscript = transcript.toLowerCase().trim();
  
  let bestMatch: FunctionDefinition | null = null;
  let bestScore = 0;
  let extractedValue: any = undefined;
  
  for (const func of Object.values(FUNCTIONS_REGISTRY)) {
    let score = 0;
    
    for (const trigger of func.voiceTriggers) {
      if (lowerTranscript.includes(trigger.toLowerCase())) {
        score += 10;
      }
    }
    
    if (func.requiresInput && func.inputType === 'number') {
      const numberMatch = extractNumberFromText(lowerTranscript);
      if (numberMatch) {
        score += 5;
        extractedValue = numberMatch;
      }
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = func;
    }
  }
  
  const confidence = bestScore / 10;
  
  return {
    function: confidence >= 0.5 ? bestMatch : null,
    confidence,
    extractedValue,
  };
}

function extractNumberFromText(text: string): number | null {
  const converted = convertWordsToNumbers(text);
  
  let cleaned = converted
    .replace(/reais?|real/gi, '')
    .replace(/centavos?/gi, '')
    .replace(/r\$/gi, '')
    .trim();
  
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

export function getAllFunctions(): FunctionDefinition[] {
  return Object.values(FUNCTIONS_REGISTRY);
}

export function getFunctionsWithConfigPage(): FunctionDefinition[] {
  return Object.values(FUNCTIONS_REGISTRY).filter(
    fn => fn.configPath !== undefined
  );
}
