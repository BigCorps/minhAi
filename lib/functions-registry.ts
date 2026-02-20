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
    sessionId?: string | null; // ✅ NOVO
  }) => Promise<boolean>;
}

/**
 * ========================================
 * REGISTRO DE NOVAS FUNÇÕES
 * ========================================
 */
export const FUNCTIONS_REGISTRY: Record<string, FunctionDefinition> = {

  // ========================================
  // ENDEREÇO (MAPA)
  // ========================================
  endereco: {
    functionKey: 'endereco',
    functionName: 'Endereço',
    category: 'information',
    responseType: 'voice+modal',
    
    voiceTriggers: [
      'endereço',
      'endereco',
      'onde fica',
      'onde vocês ficam',
      'onde voces ficam',
      'localização',
      'localizacao',
      'como chegar',
      'onde estão',
      'onde estao',
      'local',
      'lugar',
      'mapa',
      'google maps',
      'mostrar mapa',
      'abrir mapa',
    ],
    
    examplePhrases: [
      'Onde vocês ficam?',
      'Qual o endereço?',
      'Como chegar aí?',
      'Me mostra no mapa',
    ],
    
    requiresInput: false,
    description: 'Exibe o endereço no mapa grande e interativo',
    shortDescription: 'Mostrar endereço no mapa',
    icon: '📍',
    color: '#EF4444',
    saveToHistory: false,
    creditsPerUse: 1,
    requiresPayment: false,
    isPremium: false,
    
    // Handler customizado
    handler: async ({ 
      companyId,
      playText, 
      setActiveModal,
      sessionId,
    }) => {
      try {
        console.log('📍 [ENDEREÇO] Buscando localização');
        
        // Buscar endereço da empresa
        const supabase = createClient();
        
        const { data: company, error } = await supabase
          .from('companies')
          .select('name, business_address')
          .eq('id', companyId)
          .single();
        
        if (error || !company) {
          console.error('Erro ao buscar empresa:', error);
          await playText('Desculpe, não consegui acessar o endereço.');
          return false;
        }
        
        // Verificar se tem endereço configurado
        if (!company.business_address) {
          await playText('O endereço ainda não foi configurado. Por favor, configure no painel administrativo.');
          return false;
        }
        
        // Verificar se é endereço físico (não URL)
        const isAddress = !company.business_address.startsWith('http') && 
                         !company.business_address.includes('www.');
        
        if (!isAddress) {
          await playText('Esta empresa não possui um endereço físico configurado, apenas um site.');
          return false;
        }
        
        // Gerar link do Google Maps
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(company.business_address)}`;
        
        // Gerar QR Code
        const qrContent = mapsUrl;
        
        // Abrir modal
        if (setActiveModal) {
          setActiveModal({
            type: 'EnderecoDisplay',
            data: {
              companyName: company.name,
              address: company.business_address,
              mapsUrl: mapsUrl,
              qrContent: qrContent,
              autoCloseDuration: 30000, // 30 segundos (mais tempo para ver mapa)
            }
          });
        }
        
        // Falar (sem await - paralelo)
        playText(`Estamos localizados em: ${company.business_address}. Você pode copiar o link ou escanear o QR Code para abrir no Google Maps.`).catch(err => {
          console.error('Erro ao falar:', err);
        });
        
        return true;
        
      } catch (error) {
        console.error('📍 [ENDEREÇO] ERRO:', error);
        await playText('Desculpe, ocorreu um erro ao buscar o endereço.');
        return false;
      }
    },
  },

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
  // NOSSA MARCA
  // ========================================
  nossa_marca: {
    functionKey: 'nossa_marca',
    functionName: 'Nossa Marca',
    category: 'information',
    responseType: 'voice+modal',
    
    voiceTriggers: [
      'nossa marca',
      'sobre a empresa',
      'quem somos',
      'onde fica',
      'endereço',
      'endereco',
      'horário de funcionamento',
      'horario de funcionamento',
      'horário de atendimento',
      'horario de atendimento',
      'quando funciona',
      'localização',
      'localizacao',
      'onde vocês ficam',
      'onde voces ficam',
      'informações da empresa',
      'informacoes da empresa',
      'sobre nós',
      'sobre nos',
    ],
    
    examplePhrases: [
      'Conte-me sobre a empresa',
      'Qual o horário de funcionamento?',
      'Onde vocês ficam?',
      'Me fale sobre sua marca',
    ],
    
    requiresInput: false,
    description: 'Apresenta informações sobre a marca, horário de funcionamento e localização da empresa',
    shortDescription: 'Sobre nossa marca',
    icon: '🏢',
    color: '#10B981',
    saveToHistory: false,
    creditsPerUse: 1,
    requiresPayment: false,
    isPremium: false,
    
    // Handler customizado
    handler: async ({ 
      companyId,
      playText, 
      setActiveModal,
      sessionId,
    }) => {
      try {
        console.log('🏢 [NOSSA MARCA] Buscando informações');
        
        // Buscar dados da empresa
        const supabase = createClient();
        
        const { data: company, error } = await supabase
          .from('companies')
          .select('name, logo_url, brand_description, business_hours, business_address')
          .eq('id', companyId)
          .single();
        
        if (error || !company) {
          console.error('Erro ao buscar empresa:', error);
          await playText('Desculpe, não consegui acessar as informações da marca.');
          return false;
        }
        
        // Verificar se tem configuração
        if (!company.brand_description && !company.business_hours && !company.business_address) {
          await playText('As informações da marca ainda não foram configuradas. Por favor, configure no painel administrativo.');
          return false;
        }
        
        // Detectar se é endereço físico ou URL
        const isAddress = company.business_address && 
          !company.business_address.startsWith('http') && 
          !company.business_address.includes('www.');
        
        // Gerar link do QR Code
        let qrContent = '';
        if (isAddress) {
          // É endereço → Google Maps (Corrigido o uso de template string e url)
          qrContent = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(company.business_address)}`;
        } else if (company.business_address) {
          // É URL → usar direto
          qrContent = company.business_address.startsWith('http') 
            ? company.business_address 
            : `https://${company.business_address}`;
        }
        
        // Montar texto para falar
        let speechText = '';
        
        if (company.brand_description) {
          speechText += company.brand_description;
        }
        
        if (company.business_hours) {
          if (speechText) speechText += '. ';
          speechText += `Nosso horário de funcionamento é: ${company.business_hours}`;
        }
        
        if (company.business_address) {
          if (speechText) speechText += '. ';
          if (isAddress) {
            speechText += `Estamos localizados em: ${company.business_address}. Escaneie o QR Code para abrir no Google Maps.`;
          } else {
            speechText += `Visite nosso site: ${company.business_address}. Escaneie o QR Code para acessar.`;
          }
        }
        
        if (!speechText) {
          speechText = 'Informações sobre a marca não disponíveis.';
        }
        
        // 1. ABRIR O MODAL PRIMEIRO (já exibe na tela imediatamente)
        if (setActiveModal) {
          setActiveModal({
            type: 'NossaMarcaDisplay',
            data: {
              companyName: company.name,
              logoUrl: company.logo_url,
              brandDescription: company.brand_description,
              businessHours: company.business_hours,
              businessAddress: company.business_address,
              qrContent: qrContent,
              isAddress: isAddress,
              autoCloseDuration: 20000, // 20 segundos
            }
          });
        }
        
        // 2. FALAR A FRASE (Com await para segurar o status de 'executando' até a voz terminar)
        await playText(speechText);
        
        return true;
        
      } catch (error) {
        console.error('🏢 [NOSSA MARCA] ERRO:', error);
        await playText('Desculpe, ocorreu um erro ao buscar as informações.');
        return false;
      }
    },
  },
  
  // MEU SISTEMA
  meu_sistema: {
    functionKey: 'meu_sistema',
    functionName: 'Meu Sistema',
    category: 'information',
    responseType: 'voice+modal',
    
    voiceTriggers: [
      'meu sistema',
      'sobre o sistema',
      'como funciona',
      'o que é isso',
      'o que é este sistema',
      'que sistema é esse',
      'informações do sistema',
      'sobre eai',
      'sobre e a i',
    ],
    
    examplePhrases: [
      'Como funciona este sistema?',
      'Me fale sobre o sistema',
      'O que é o eAi?',
      'Quero saber mais sobre isso',
    ],
    
    requiresInput: false,
    description: 'Informações sobre o eAi App - assistente de voz inteligente para empresas',
    shortDescription: 'Sobre o sistema',
    icon: '🤖',
    color: '#6366F1',
    saveToHistory: false,
    creditsPerUse: 0, // Gratuito
    requiresPayment: false,
    isPremium: false,
    
    // Handler customizado
    handler: async ({ 
      playText, 
      setActiveModal 
    }) => {
      try {
        console.log('🧊 [MEU SISTEMA] Abrindo informações');
        
        // 1. ABRIR O MODAL PRIMEIRO (já exibe na tela imediatamente)
        if (setActiveModal) {
          setActiveModal({
            type: 'MeuSistemaDisplay',
            data: {
              logoUrl: '/public/logo-circle.png',
              websiteUrl: 'https://eai.app.br',
              qrCodeUrl: '', // Será gerado no componente
              title: 'Sistema eAi',
              subtitle: 'Assistente de Voz Inteligente',
              description: 'Transforme o atendimento da sua empresa com um Funcionário IA',
              autoCloseDuration: 15000, // 15 segundos
            }
          });
        }
        
        // 2. FALAR A FRASE (Uma única vez. O await garante que o handler só conclua quando terminar de falar)
        await playText('E A I, sou um funcionário de Voz com Inteligência Artificial. Escaneie o QR Code para saber mais sobre como meu sistema funciona e suas funcionalidades. e a i.a p p.br');
        
        return true;
        
      } catch (error) {
        console.error('🤖 [MEU SISTEMA] ERRO:', error);
        await playText('Desculpe, não consegui exibir as informações do sistema.');
        return false;
      }
    },
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
      companyId,
      sessionId, // ✅ NOVO
    }) => {
      try {
        console.log('💰 [ORCAMENTO] Handler iniciado');
        
        const supabase = createClient();

        const { data: company } = await supabase
          .from('companies')
          .select('orcamento_prompt')
          .eq('id', companyId)
          .single();

        if (!company?.orcamento_prompt) {
          await playText('A função de orçamento não está configurada.');
          return false;
        }

        await playText('Gerando seu orçamento. Um momento...');

        // ✅ Criar FormData com flag returnText
        const formData = new FormData();
        const textBlob = new Blob([transcript], { type: 'text/plain' });
        formData.append('audio', textBlob, 'question.txt');
        formData.append('companyId', companyId);
        formData.append('directQuestion', transcript);
        formData.append('useOrcamentoPrompt', 'true');
        formData.append('returnText', 'true');

        // ✅ NOVO: Passar sessionId se existir
        if (sessionId) {
          formData.append('sessionId', sessionId);
        }

        const response = await fetch('/api/voice/process', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Erro ao gerar orçamento');
        }

        // ✅ Receber JSON com texto
        const data = await response.json();
        const reply = data.response || data.reply;
        
        console.log('💰 [ORCAMENTO] Orçamento gerado:', reply.substring(0, 100) + '...');
        
        // ✅ Usar playText (ativa orbe do avatar)
        await playText(reply);

        return true;
        
      } catch (error) {
        console.error('💰 [ORCAMENTO] ERRO:', error);
        await playText('Desculpe, não consegui gerar o orçamento.');
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
