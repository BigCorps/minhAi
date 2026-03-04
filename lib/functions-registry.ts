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
  category: 'contact' | 'payment' | 'information' | 'ai_assistant' | 'video' | 'productivity' | 'utylities' | 'custom';
  
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
    sessionId?: string | null;
  }) => Promise<boolean>;
}

/**
 * ========================================
 * REGISTRO DE NOVAS FUNÇÕES
 * ========================================
 */
export const FUNCTIONS_REGISTRY: Record<string, FunctionDefinition> = {

  link_pagamento: {
    functionKey: 'link_pagamento',
    functionName: 'Link de Pagamento',
    category: 'payment',
    responseType: 'voice+modal',

  voiceTriggers: [
    'link de pagamento',
    'gerar link de pagamento',
    'cobrar por link',
    'link pagamento',
    'cobrar no link',
    'link cobrança', 'link cobranca',
    'pagamento por link',
    'via link',
    'pelo link',
    'por link',
  ],

    examplePhrases: [
      'Gerar link de pagamento de 50 reais',
      'Cobrar por link',
      'Quero gerar um link de R$ 100',
      'Link de pagamento de 200 reais',
    ],

    requiresInput: true,
    inputType: 'number',
    inputPrompt: 'Qual o valor para o link de pagamento?',

    description: 'Gera um link de pagamento para cobrar clientes remotamente via InfinitePay.',
    shortDescription: 'Gerar link de cobrança',
    icon: '🔗',
    color: '#10B981',

    saveToHistory: true,
    creditsPerUse: 1,
    requiresPayment: false,
    isPremium: false,

    handler: async ({ playText, setActiveModal, companyId, transcript }) => {
      const amount = extractAmount(transcript ?? '');

      if (!amount) {
        await playText('Por favor, informe o valor para gerar o link de pagamento.');
        return false;
      }

      const telefone = extractTelefone(transcript ?? '');

      await playText(
        `Gerando link de pagamento de ${amount.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        })}...`
      );

      setActiveModal?.({
        type: 'InfinitePayDisplay',
        data: {
          companyId,
          tipo: 'LINK_PAGAMENTO',
          amount_cents: Math.round(amount * 100),
          telefone,
        },
      });

      return true;
    },
  },

  nfc_debito: {
    functionKey: 'nfc_debito',
    functionName: 'NFC Débito',
    category: 'payment',
    responseType: 'voice+modal',

voiceTriggers: [
  'nfc debito', 'nfc débito',
  'cobrar no debito', 'cobrar no débito',
  'cobrança no debito', 'cobrança no débito',
  'cobranca no debito',
  'cartao de debito', 'cartão de débito',
  // ✅ chave: sem o valor — o processor só precisa identificar a função
  'cobrar debito', 'cobrar débito',
  'debito via nfc', 'débito via nfc',
  'no debito',   // ← cobre "cobrar 10,00 no debito"
  'no débito',
],

    examplePhrases: [
      'Cobrar 50 reais no débito',
      'Gerar uma cobrança no débito',          
      'Pagar no débito',
      'NFC débito de R$ 100',
      'Aproximação débito de 200 reais',
    ],

    requiresInput: true,
    inputType: 'number',
    inputPrompt: 'Qual o valor para o pagamento no débito?',

    description: 'Processa pagamento por aproximação (NFC) na modalidade débito via InfinitePay.',
    shortDescription: 'Pagamento NFC débito',
    icon: '💳',
    color: '#3B82F6',

    saveToHistory: true,
    creditsPerUse: 1,
    requiresPayment: false,
    isPremium: false,

    handler: async ({ playText, setActiveModal, companyId, transcript }) => {
      const amount = extractAmount(transcript ?? '');

      if (!amount) {
        await playText('Por favor, informe o valor para o pagamento no débito.');
        return false;
      }

      await playText(
        `Preparando pagamento de ${amount.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        })} no débito...`
      );

      setActiveModal?.({
        type: 'InfinitePayDisplay',
        data: {
          companyId,
          tipo: 'NFC',
          nfc_payment_method: 'debit',
          amount_cents: Math.round(amount * 100),
        },
      });

      return true;
    },
  },

  nfc_credito: {
    functionKey: 'nfc_credito',
    functionName: 'NFC Crédito',
    category: 'payment',
    responseType: 'voice+modal',

voiceTriggers: [
  'nfc credito', 'nfc crédito',
  'cobrar no credito', 'cobrar no crédito',
  'cobrança no credito', 'cobrança no crédito',
  'cobranca no credito',
  'cartao de credito', 'cartão de crédito',
  'cobrar credito', 'cobrar crédito',
  'credito via nfc', 'crédito via nfc',
  'no credito',   // ← cobre "cobrar 10,00 no credito"
  'no crédito',
],

    examplePhrases: [
      'Cobrar 50 reais no crédito',
      'Gerar uma cobrança no crédito',          
      'Pagar no crédito',
      'NFC crédito de R$ 100',
      'Aproximação crédito de 200 reais',
    ],

    requiresInput: true,
    inputType: 'number',
    inputPrompt: 'Qual o valor para o pagamento no crédito?',

    description: 'Processa pagamento por aproximação (NFC) na modalidade crédito via InfinitePay.',
    shortDescription: 'Pagamento NFC crédito',
    icon: '💳',
    color: '#8B5CF6',

    saveToHistory: true,
    creditsPerUse: 1,
    requiresPayment: false,
    isPremium: false,

    handler: async ({ playText, setActiveModal, companyId, transcript }) => {
      const amount = extractAmount(transcript ?? '');

      if (!amount) {
        await playText('Por favor, informe o valor para o pagamento no crédito.');
        return false;
      }

      await playText(
        `Preparando pagamento de ${amount.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        })} no crédito...`
      );

      setActiveModal?.({
        type: 'InfinitePayDisplay',
        data: {
          companyId,
          tipo: 'NFC',
          nfc_payment_method: 'credit',
          amount_cents: Math.round(amount * 100),
        },
      });

      return true;
    },
  },

  sequencia_videos: {
    functionKey: 'sequencia_videos',
    functionName: 'Sequência de Vídeos',
    category: 'video',
    responseType: 'modal',
    
    voiceTriggers: [
      'sequência de vídeos',
      'sequencia de videos',
      'playlist',
      'série de vídeos',
      'serie de videos',
      'vídeos em sequência',
      'videos em sequencia',
      'tutorial completo',
      'aulas',
      'curso',
    ],
    
    examplePhrases: [
      'Mostrar sequência de vídeos',
      'Quero ver os vídeos',
      'Playlist de tutoriais',
      'Série completa',
    ],
    
    requiresInput: false,
    
    description: 'Reproduz uma sequência de vídeos em ordem com navegação por voz.',
    shortDescription: 'Playlist de vídeos com navegação',
    icon: '🎬',
    color: '#8B5CF6',
    
    saveToHistory: true,
    creditsPerUse: 2,
    requiresPayment: false,
    isPremium: false,
    
    handler: async ({ playText, setActiveModal, companyId }) => {
      try {
        console.log('🎬 Executando: Sequência de Vídeos');
        
        const supabase = createClient();
        
        const { data: company, error } = await supabase
          .from('companies')
          .select('sequencia_videos_urls')
          .eq('id', companyId)
          .single();
        
        if (error) {
          console.error('Erro ao buscar sequência:', error);
          await playText('Desculpe, não consegui acessar a sequência de vídeos.');
          return false;
        }
        
        const videos = company.sequencia_videos_urls || [];
        
        if (!Array.isArray(videos) || videos.length === 0) {
          await playText('Ainda não temos vídeos configurados na sequência. Entre em contato com o suporte.');
          return false;
        }
        
        await playText(`Abrindo sequência com ${videos.length} vídeos.`);
        
        if (setActiveModal) {
          setActiveModal({
            type: 'SequenciaVideosDisplay',
            data: { companyId, videos },
          });
        }
        
        return true;
        
      } catch (error) {
        console.error('Erro na função sequencia_videos:', error);
        await playText('Ocorreu um erro ao tentar abrir a sequência de vídeos.');
        return false;
      }
    },
  },
  
  agendar_compromisso: {
    functionKey: 'agendar_compromisso',
    functionName: 'Marcar Evento',
    category: 'productivity',
    responseType: 'modal',
    
    voiceTriggers: [
      'agendar',
      'marcar na agenda',
      'marcar compromisso',
      'marcar evento',
      'criar evento',
      'agendar reunião',
      'marcar reunião',
      'agendar compromisso',
      'novo evento',
      'nova reunião',
      'marcar horário',
      'agendar horário',
    ],
    
    examplePhrases: [
      'Agendar reunião para amanhã',
      'Marcar compromisso na próxima semana',
      'Criar evento no calendário',
    ],
    
    edgeFunction: 'criar-evento-calendario',
    requiresInput: false,
    
    description: 'Cria eventos no Google Calendar através de comando de voz',
    shortDescription: 'Marcar evento',
    icon: '📅',
    color: '#10B981',
    
    saveToHistory: true,
    creditsPerUse: 1,
    requiresPayment: false,
    isPremium: false,
    
  handler: async ({ transcript, playText, setActiveModal, companyId }) => {
    try {
      console.log('📅 [MARCAR EVENTO] Processando comando');
      
      const transcriptText = transcript?.toLowerCase() || '';
      
      // Objeto para armazenar os dados extraídos
      const extractedData: {
        date?: Date;
        time?: string;
        name?: string;
      } = {};
      
      // ==================== EXTRAIR DATA ====================
      const today = new Date();
      
      if (transcriptText.includes('hoje')) {
        extractedData.date = new Date(today);
      } else if (transcriptText.includes('amanhã') || transcriptText.includes('amanha')) {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        extractedData.date = tomorrow;
      } else {
        // Detectar dias da semana
        const diasSemana: Record<string, number> = {
          'segunda': 1, 'segunda-feira': 1, 'segunda feira': 1,
          'terça': 2, 'terca': 2, 'terça-feira': 2, 'terca-feira': 2,
          'quarta': 3, 'quarta-feira': 3, 'quarta feira': 3,
          'quinta': 4, 'quinta-feira': 4, 'quinta feira': 4,
          'sexta': 5, 'sexta-feira': 5, 'sexta feira': 5,
          'sábado': 6, 'sabado': 6,
          'domingo': 0
        };
        
        for (const [dia, numero] of Object.entries(diasSemana)) {
          if (transcriptText.includes(dia)) {
            const targetDate = new Date(today);
            const currentDay = today.getDay();
            let daysToAdd = numero - currentDay;
            if (daysToAdd <= 0) daysToAdd += 7;
            targetDate.setDate(today.getDate() + daysToAdd);
            extractedData.date = targetDate;
            break;
          }
        }
        
        // Detectar data no formato "dia X"
        const diaMatch = transcriptText.match(/dia (\d{1,2})/);
        if (diaMatch) {
          const dia = parseInt(diaMatch[1]);
          const dataTemp = new Date(today.getFullYear(), today.getMonth(), dia);
          if (dataTemp < today) {
            dataTemp.setMonth(dataTemp.getMonth() + 1);
          }
          extractedData.date = dataTemp;
        }
        
        // Detectar mês específico
        const meses: Record<string, number> = {
          'janeiro': 0, 'fevereiro': 1, 'março': 2, 'marco': 2,
          'abril': 3, 'maio': 4, 'junho': 5,
          'julho': 6, 'agosto': 7, 'setembro': 8,
          'outubro': 9, 'novembro': 10, 'dezembro': 11
        };
        
        for (const [mes, numero] of Object.entries(meses)) {
          if (transcriptText.includes(mes)) {
            if (extractedData.date) {
              extractedData.date.setMonth(numero);
            } else {
              extractedData.date = new Date(today.getFullYear(), numero, 1);
            }
            break;
          }
        }
      }
      
      // ==================== EXTRAIR HORÁRIO ====================
      const horaMatch = transcriptText.match(/(\d{1,2})[h:](\d{2})?/);
      if (horaMatch) {
        const hora = horaMatch[1].padStart(2, '0');
        const minuto = horaMatch[2] ? horaMatch[2] : '00';
        extractedData.time = `${hora}:${minuto}`;
      } else {
        if (transcriptText.includes('meio dia') || transcriptText.includes('meio-dia')) {
          extractedData.time = '12:00';
        } else if (transcriptText.includes('meia noite') || transcriptText.includes('meia-noite')) {
          extractedData.time = '00:00';
        }
        
        const horaTexto = transcriptText.match(/(\d{1,2})\s+(da\s+)?(manhã|manha|tarde|noite)/);
        if (horaTexto) {
          let hora = parseInt(horaTexto[1]);
          const periodo = horaTexto[3];
          
          if (periodo.includes('tarde') && hora < 12) {
            hora += 12;
          } else if (periodo.includes('noite') && hora < 12) {
            hora += 12;
          }
          
          extractedData.time = `${hora.toString().padStart(2, '0')}:00`;
        }
      }
      
      // ==================== EXTRAIR NOME/TÍTULO ====================
      const nomePatterns = [
        /chamado\s+(.+?)(?:\s+às|\s+as|\s+no|\s+na|\s+dia|$)/i,
        /chamada\s+(.+?)(?:\s+às|\s+as|\s+no|\s+na|\s+dia|$)/i,
        /reunião\s+(.+?)(?:\s+às|\s+as|\s+no|\s+na|\s+dia|$)/i,
        /reuniao\s+(.+?)(?:\s+às|\s+as|\s+no|\s+na|\s+dia|$)/i,
        /com\s+(.+?)(?:\s+às|\s+as|\s+no|\s+na|\s+dia|$)/i,
        /compromisso\s+(.+?)(?:\s+às|\s+as|\s+no|\s+na|\s+dia|$)/i
      ];
      
      for (const pattern of nomePatterns) {
        const match = transcriptText.match(pattern);
        if (match && match[1]) {
          extractedData.name = match[1].trim();
          break;
        }
      }
      
      // ==================== DECIDIR QUAL MODAL ABRIR ====================
      const hasAllRequiredData = extractedData.date && extractedData.time && extractedData.name;
      
      if (setActiveModal) {
        setActiveModal({ 
          type: 'CreateEventModal', 
          data: { 
            companyId,
            prefilledData: extractedData
          } 
        });
      }
      
      if (hasAllRequiredData) {
        await playText('Verifique os dados e confirme para criar o evento.');
      } else {
        await playText('Posso te marcar na agenda, basta me dizer qual o dia, mês, hora e seu nome.');
      }
      
      return true;
      
    } catch (error) {
      console.error('📅 [MARCAR EVENTO] ERRO:', error);
      await playText('Desculpe, não consegui abrir o calendário.');
      return false;
    }
  },
},

  ver_agenda: {
    functionKey: 'ver_agenda',
    functionName: 'Ver Agenda',
    category: 'productivity',
    responseType: 'modal',
    
    voiceTriggers: [
      'ver agenda',
      'mostrar agenda',
      'minha agenda',
      'compromissos',
      'ver calendário',
      'mostrar calendário',
      'ver eventos',
      'mostrar eventos',
      'o que tenho agendado',
      'o que está marcado',
    ],
    
    examplePhrases: [
      'Ver minha agenda de hoje',
      'Mostrar compromissos da semana',
      'O que tenho agendado?',
    ],
    
    edgeFunction: 'listar-eventos-google',
    requiresInput: false,
    
    description: 'Visualiza eventos do Google Calendar',
    shortDescription: 'Ver agenda',
    icon: '📆',
    color: '#3B82F6',
    
    saveToHistory: true,
    creditsPerUse: 1,
    requiresPayment: false,
    isPremium: true,
    
  handler: async ({ transcript, playText, setActiveModal, companyId }) => {
    try {
      console.log('📆 [VER AGENDA] Abrindo modal');
      
      let initialView: 'month' | 'week' | 'day' = 'month';
      const lowerTranscript = transcript?.toLowerCase() || '';
      
      // Detectar menções a "dia" ou "hoje"
      if (
        lowerTranscript.includes('dia') || 
        lowerTranscript.includes('hoje') ||
        lowerTranscript.includes('diária') ||
        lowerTranscript.includes('diario')
      ) {
        initialView = 'day';
      }
      // Detectar menções a "semana"
      else if (
        lowerTranscript.includes('semana') ||
        lowerTranscript.includes('semanal')
      ) {
        initialView = 'week';
      }
      // Detectar menções a "mês"
      else if (
        lowerTranscript.includes('mês') ||
        lowerTranscript.includes('mes') ||
        lowerTranscript.includes('mensal')
      ) {
        initialView = 'month';
      }
      
      if (setActiveModal) {
        setActiveModal({
          type: 'ViewAgendaModal',
          data: { companyId, initialView }
        });
      }
      
      const viewText = 
        initialView === 'day' ? 'visualização diária' :
        initialView === 'week' ? 'visualização semanal' :
        'visualização mensal';
      
      await playText(`Abrindo o calendário em ${viewText}.`);
      
      return true;
      
    } catch (error) {
      console.error('📆 [VER AGENDA] ERRO:', error);
      await playText('Desculpe, não consegui abrir a agenda.');
      return false;
    }
  },
},
  
// ── Entradas a adicionar no FUNCTIONS_REGISTRY ─────────────

  criar_lembrete: {
    functionKey: 'criar_lembrete',
    functionName: 'Criar Lembrete',
    category: 'utylities',
    responseType: 'voice+modal',

    voiceTriggers: [
      'criar lembrete',
      'me lembra',
      'me lembre',
      'adicionar lembrete',
      'novo lembrete',
      'lembrar de',
      'não me deixa esquecer',
      'quero um lembrete',
    ],

    examplePhrases: [
      'Me lembra de ligar para o João às 15h',
      'Criar lembrete para reunião amanhã às 10h',
      'Me lembre de tomar remédio às 8 da manhã',
      'Lembrar de buscar o carro às 18h',
    ],

    requiresInput: true,
    inputType: 'text',
    inputPrompt: 'O que devo lembrar e quando?',

    description: 'Cria um lembrete por voz. Quando o horário chegar, um modal avisa automaticamente.',
    shortDescription: 'Lembrar de um evento',
    icon: '🔔',
    color: '#F59E0B',

    saveToHistory: true,
    creditsPerUse: 1,
    requiresPayment: false,
    isPremium: false,

    handler: async ({ transcript, playText, setActiveModal, companyId }) => {
      try {
        const { extractLembreteTitle, extractTargetTime } = await import('@/components/VoiceAssistant/utils/utilitiesUtils');
        const titulo = extractLembreteTitle(transcript ?? '');
        const timeData = extractTargetTime(transcript ?? '');

        if (timeData) {
          await playText(`Lembrete criado! Vou te avisar sobre "${titulo}" às ${timeData.label}.`);
        } else {
          await playText('Vou criar um lembrete. Preencha o horário no formulário.');
        }

        setActiveModal?.({
          type: 'CriarLembreteDisplay',
          data: { companyId, titulo, dateTime: timeData?.isoTime },
        });

        return true;
      } catch (error) {
        console.error('❌ [CRIAR LEMBRETE]', error);
        await playText('Não consegui criar o lembrete.');
        return false;
      }
    },
  },

  cronometro: {
    functionKey: 'cronometro',
    functionName: 'Cronômetro',
    category: 'utylities',
    responseType: 'voice+modal',

    voiceTriggers: [
      'cronômetro',
      'cronometro',
      'iniciar cronômetro',
      'começar cronômetro',
      'iniciar contagem',
      'começar contagem',
      'ligar cronômetro',
    ],

    examplePhrases: [
      'Iniciar cronômetro',
      'Começar a contar o tempo',
      'Liga o cronômetro',
    ],

    requiresInput: false,

    description: 'Inicia um cronômetro. Para quando o usuário pedir para finalizar.',
    shortDescription: 'Iniciar cronômetro',
    icon: '⏱️',
    color: '#3B82F6',

    saveToHistory: true,
    creditsPerUse: 1,
    requiresPayment: false,
    isPremium: false,

    handler: async ({ playText, setActiveModal, companyId }) => {
      try {
        await playText('Cronômetro iniciado! Diga "finalizar cronômetro" quando quiser parar.');
        setActiveModal?.({ type: 'CronometroDisplay', data: { companyId } });
        return true;
      } catch (error) {
        console.error('❌ [CRONÔMETRO]', error);
        await playText('Não consegui iniciar o cronômetro.');
        return false;
      }
    },
  },

  temporizador: {
    functionKey: 'temporizador',
    functionName: 'Temporizador',
    category: 'utylities',
    responseType: 'voice+modal',

    voiceTriggers: [
      'temporizador',
      'timer',
      'contagem regressiva',
      'contar regressivo',
      'criar temporizador',
      'iniciar temporizador',
      'colocar timer',
    ],

    examplePhrases: [
      'Temporizador de 5 minutos',
      'Criar timer de 30 segundos',
      'Contagem regressiva de 10 minutos',
    ],

    requiresInput: true,
    inputType: 'text',
    inputPrompt: 'Qual o tempo para o temporizador?',

    description: 'Cria um temporizador com tempo definido. Avisa por voz e modal quando terminar.',
    shortDescription: 'Contar tempo regressivo',
    icon: '⏲️',
    color: '#10B981',

    saveToHistory: true,
    creditsPerUse: 1,
    requiresPayment: false,
    isPremium: false,

    handler: async ({ transcript, playText, setActiveModal, companyId }) => {
      try {
        const { extractDurationMs } = await import('@/components/VoiceAssistant/utils/utilitiesUtils');
        const duration = extractDurationMs(transcript ?? '');

        if (!duration) {
          await playText('Por favor, informe o tempo. Por exemplo: temporizador de 5 minutos.');
          return false;
        }

        await playText(`Temporizador de ${duration.label} iniciado!`);
        setActiveModal?.({
          type: 'TemporizadorDisplay',
          data: { companyId, durationMs: duration.ms, label: duration.label },
        });

        return true;
      } catch (error) {
        console.error('❌ [TEMPORIZADOR]', error);
        await playText('Não consegui iniciar o temporizador.');
        return false;
      }
    },
  },

  relogio_mundial: {
    functionKey: 'relogio_mundial',
    functionName: 'Relógio Mundial',
    category: 'utylities',
    responseType: 'voice+modal',

    voiceTriggers: [
      'relógio mundial',
      'relogio mundial',
      'horas no mundo',
      'horário mundial',
      'que horas são no mundo',
      'horas internacionais',
      'fuso horário',
      'fusos horários',
      'horário em outros países',
    ],

    examplePhrases: [
      'Que horas são no mundo?',
      'Mostrar relógio mundial',
      'Horas internacionais',
      'Ver fusos horários',
    ],

    requiresInput: false,

    description: 'Exibe as horas atuais nas 8 principais cidades do mundo.',
    shortDescription: 'Horas ao redor do mundo',
    icon: '🌍',
    color: '#6366F1',

    saveToHistory: true,
    creditsPerUse: 1,
    requiresPayment: false,
    isPremium: false,

    handler: async ({ setActiveModal, companyId }) => {
      try {
        setActiveModal?.({ type: 'RelogioMundialDisplay', data: { companyId } });
        return true;
      } catch (error) {
        console.error('❌ [RELÓGIO MUNDIAL]', error);
        return false;
      }
    },
  },

  alarme: {
    functionKey: 'alarme',
    functionName: 'Alarme',
    category: 'utylities',
    responseType: 'voice+modal',

    voiceTriggers: [
      'alarme',
      'criar alarme',
      'definir alarme',
      'colocar alarme',
      'setar alarme',
      'me acorda',
      'acordar às',
      'despertar',
    ],

    examplePhrases: [
      'Criar alarme para as 7 da manhã',
      'Me acorda às 6h30',
      'Definir alarme para 8 horas',
    ],

    requiresInput: true,
    inputType: 'text',
    inputPrompt: 'Qual o horário do alarme?',

    description: 'Cria um alarme para um horário específico. Avisa quando chegar a hora.',
    shortDescription: 'Criar alarme por horário',
    icon: '⏰',
    color: '#EF4444',

    saveToHistory: true,
    creditsPerUse: 1,
    requiresPayment: false,
    isPremium: false,

    handler: async ({ transcript, playText, setActiveModal, companyId }) => {
      try {
        const { extractTargetTime } = await import('@/components/VoiceAssistant/utils/utilitiesUtils');
        const timeData = extractTargetTime(transcript ?? '');

        if (timeData) {
          await playText(`Alarme criado para as ${timeData.label}!`);
          setActiveModal?.({
            type: 'AlarmeDisplay',
            data: { companyId, targetTime: timeData.isoTime, label: `Alarme ${timeData.label}` },
          });
        } else {
          await playText('Para criar um alarme, me diga o horário. Por exemplo: alarme para as 7 da manhã.');
          setActiveModal?.({ type: 'AlarmeDisplay', data: { companyId } });
        }

        return true;
      } catch (error) {
        console.error('❌ [ALARME]', error);
        await playText('Não consegui criar o alarme.');
        return false;
      }
    },
  },
  
  enviar_email: {
    functionKey: 'enviar_email',
    functionName: 'Enviar Email',
    category: 'productivity',
    responseType: 'modal',
    
    voiceTriggers: [
      'enviar email',
      'mandar email',
      'envie um email',
      'mande um email',
      'enviar e-mail',
      'mandar e-mail',
      'enviar mensagem',
      'mandar mensagem',
      'escrever email',
    ],
    
    examplePhrases: [
      'Enviar email para João',
      'Mandar email para cliente',
      'Envie um email',
    ],
    
    edgeFunction: 'enviar-email-google',
    requiresInput: false,
    
    description: 'Envia emails através da conta Google conectada usando Gmail API',
    shortDescription: 'Enviar email',
    icon: '📧',
    color: '#4285F4',
    
    saveToHistory: true,
    creditsPerUse: 1,
    requiresPayment: false,
    isPremium: false,
    
    handler: async ({ playText, setActiveModal, companyId }) => {
      try {
        console.log('📧 [ENVIAR EMAIL] Abrindo modal');
        
        if (setActiveModal) {
          setActiveModal({
            type: 'SendEmailModal',
            data: { companyId }
          });
        }
        
        await playText('Após a contagem, diga o conteudo do email');
        
        return true;
        
      } catch (error) {
        console.error('📧 [ENVIAR EMAIL] ERRO:', error);
        await playText('Desculpe, não consegui abrir o envio de email.');
        return false;
      }
    },
  },

  video_instrucoes: {
    functionKey: 'video_instrucoes',
    functionName: 'Vídeo de Instruções',
    category: 'video',
    responseType: 'modal',
    
    voiceTriggers: [
      'instruções',
      'instrucoes',
      'tutorial',
      'como usar',
      'vídeo explicativo',
      'video explicativo',
      'mostrar vídeo',
      'mostrar video',
      'demonstração',
      'demonstracao',
    ],
    
    examplePhrases: [
      'Mostrar vídeo de instruções',
      'Como funciona o produto?',
      'Tutorial do serviço',
      'Quero ver uma demonstração',
    ],
    
    requiresInput: false,
    
    description: 'Exibe um vídeo tutorial ou explicativo sobre o produto/serviço da empresa',
    shortDescription: 'Tutorial em vídeo',
    icon: '🎓',
    color: '#8B5CF6',
    
    saveToHistory: true,
    creditsPerUse: 1,
    requiresPayment: false,
    isPremium: false,
    
    handler: async ({ playText, setActiveModal, companyId }) => {
      try {
        console.log('🎓 Executando: Vídeo de Instruções');
        
        const supabase = createClient();
        
        const { data: company, error } = await supabase
          .from('companies')
          .select('video_instrucoes_url')
          .eq('id', companyId)
          .single();
        
        if (error) {
          console.error('Erro ao buscar vídeo:', error);
          await playText('Desculpe, não consegui acessar o vídeo de instruções.');
          return false;
        }
        
        if (!company.video_instrucoes_url) {
          await playText('Ainda não temos um vídeo de instruções configurado. Entre em contato com o suporte.');
          return false;
        }
        
        await playText('Abrindo vídeo de instruções.');
        
        if (setActiveModal) {
          setActiveModal({
            type: 'VideoInstrucoesDisplay',
            data: { companyId, videoUrl: company.video_instrucoes_url },
          });
        }
        
        return true;
        
      } catch (error) {
        console.error('Erro na função video_instrucoes:', error);
        await playText('Ocorreu um erro ao tentar abrir o vídeo.');
        return false;
      }
    },
  },

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
    
    handler: async ({ companyId, playText, setActiveModal }) => {
      try {
        console.log('📍 [ENDEREÇO] Buscando localização');
        
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
        
        if (!company.business_address) {
          await playText('O endereço ainda não foi configurado. Por favor, configure no painel administrativo.');
          return false;
        }
        
        const isAddress = !company.business_address.startsWith('http') && 
                         !company.business_address.includes('www.');
        
        if (!isAddress) {
          await playText('Esta empresa não possui um endereço físico configurado, apenas um site.');
          return false;
        }
        
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(company.business_address)}`;
        
        if (setActiveModal) {
          setActiveModal({
            type: 'EnderecoDisplay',
            data: {
              companyName: company.name,
              address: company.business_address,
              mapsUrl: mapsUrl,
              qrContent: mapsUrl,
              autoCloseDuration: 30000,
            }
          });
        }
        
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

  qrcode_website: {
    functionKey: 'qrcode_website',
    functionName: 'Nosso Site',
    category: 'contact',
    responseType: 'voice+modal',
    voiceTriggers: ['site', 'website', 'seu site', 'página', 'pagina', 'url'],
    examplePhrases: ['Qual o site?', 'Me passa o site', 'Mostre o site'],
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

  qrcode_email: {
    functionKey: 'qrcode_email',
    functionName: 'Nosso Email',
    category: 'contact',
    responseType: 'voice+modal',
    voiceTriggers: ['nosso email', 'endereço de email', 'qual o email', 'contato email'],
    examplePhrases: ['Qual o email?', 'Me passa o email', 'Mostre o email de contato'],
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

  qrcode_linkedin: {
    functionKey: 'qrcode_linkedin',
    functionName: 'Nosso LinkedIn',
    category: 'contact',
    responseType: 'voice+modal',
    voiceTriggers: ['linkedin', 'linked in', 'perfil linkedin', 'página linkedin'],
    examplePhrases: ['Qual o LinkedIn?', 'Me passa o LinkedIn', 'Mostre o LinkedIn'],
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

  qrcode_tiktok: {
    functionKey: 'qrcode_tiktok',
    functionName: 'Nosso TikTok',
    category: 'contact',
    responseType: 'voice+modal',
    voiceTriggers: ['tiktok', 'tik tok', 'nosso tiktok', 'perfil tiktok'],
    examplePhrases: ['Qual o TikTok?', 'Me passa o TikTok', 'Mostre o TikTok'],
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

  qrcode_twitter: {
    functionKey: 'qrcode_twitter',
    functionName: 'Nosso Twitter/X',
    category: 'contact',
    responseType: 'voice+modal',
    // ✅ CORRIGIDO: removido 'x' sozinho que causava falsos positivos (ex: "10x15")
    voiceTriggers: ['twitter', 'nosso twitter', 'perfil twitter', 'nosso x', 'twitter x'],
    examplePhrases: ['Qual o Twitter?', 'Me passa o X', 'Mostre o Twitter'],
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

  qrcode_telefone: {
    functionKey: 'qrcode_telefone',
    functionName: 'Nosso Telefone',
    category: 'contact',
    responseType: 'voice+modal',
    voiceTriggers: ['telefone fixo', 'nosso telefone', 'número de telefone'],
    examplePhrases: ['Qual o telefone?', 'Me passa o telefone', 'Qual o número para ligar?'],
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

  qrcode_facebook: {
    functionKey: 'qrcode_facebook',
    functionName: 'Nosso Facebook',
    category: 'contact',
    responseType: 'voice+modal',
    voiceTriggers: ['facebook', 'face', 'fb', 'perfil facebook', 'página facebook', 'pagina facebook'],
    examplePhrases: ['Qual o Facebook?', 'Me passa o Facebook', 'Mostre o Facebook'],
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

    wifi_qrcode: {
    functionKey: 'wifi_qrcode',
    functionName: 'Wi-Fi QR Code',
    category: 'services',
    responseType: 'voice+modal',
    voiceTriggers: [
      'wifi', 'wi-fi',
      'senha do wifi', 'senha do wi-fi',
      'conectar wifi', 'conectar wi-fi',
      'internet', 'rede wifi', 'rede wi-fi',
    ],
    requiresInput: false,
    handler: async ({ playText, setActiveModal, companyId }) => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('companies')
          .select('wifi_network_name, wifi_network_password, name')
          .eq('id', companyId)
          .single();

        if (!data?.wifi_network_name) {
          await playText('O Wi-Fi ainda não foi configurado. Configure no painel.');
          return false;
        }

        setActiveModal({
          type: 'WifiQRCodeDisplay',
          data: {
            networkName: data.wifi_network_name,
            networkPassword: data.wifi_network_password ?? '',
            companyName: data.name,
          },
        });
        await playText(`Aqui está o QR Code do Wi-Fi. A rede é ${data.wifi_network_name}.`);
        return true;
      } catch (error) {
        console.error('Erro wifi_qrcode:', error);
        return false;
      }
    },
  },

  cardapio: {
    functionKey: 'cardapio',
    functionName: 'Cardápio',
    category: 'services',
    responseType: 'voice+modal',
    voiceTriggers: [
      'cardapio', 'cardápio', 'menu',
      'ver cardapio', 'ver cardápio',
      'mostrar cardapio', 'mostrar cardápio',
      'abrir cardapio', 'abrir cardápio',
      'cardapio digital', 'cardápio digital',
    ],
    requiresInput: false,
    handler: async ({ playText, setActiveModal, companyId }) => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('companies')
          .select('cardapio_url, cardapio_description, name')
          .eq('id', companyId)
          .single();

        if (!data?.cardapio_url) {
          await playText('O cardápio ainda não foi configurado. Configure no painel.');
          return false;
        }

        setActiveModal({
          type: 'CardapioDisplay',
          data: {
            menuUrl: data.cardapio_url,
            menuDescription: data.cardapio_description ?? '',
            companyName: data.name,
          },
        });
        await playText(
          data.cardapio_description
            ? `Aqui está o cardápio. ${data.cardapio_description}`
            : 'Aqui está o nosso cardápio. Você pode escanear o QR Code ou clicar para abrir.'
        );
        return true;
      } catch (error) {
        console.error('Erro cardapio:', error);
        return false;
      }
    },
  },

  nosso_qrcode: {
    functionKey: 'nosso_qrcode',
    functionName: 'Nosso QR Code',
    category: 'services',
    responseType: 'voice+modal',
    voiceTriggers: [
      'nosso qr code', 'nosso qrcode',
      'qr code', 'qrcode',
      'mostrar qr code', 'mostrar qrcode',
      'meu qr code', 'meu qrcode',
    ],
    requiresInput: false,
    handler: async ({ playText, setActiveModal, companyId }) => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('companies')
          .select('qrcode_content, qrcode_label, name')
          .eq('id', companyId)
          .single();

        if (!data?.qrcode_content) {
          await playText('O QR Code ainda não foi configurado. Configure no painel.');
          return false;
        }

        setActiveModal({
          type: 'NossoQRCodeDisplay',
          data: {
            qrContent: data.qrcode_content,
            qrLabel: data.qrcode_label,
            companyName: data.name,
          },
        });
        await playText(data.qrcode_label);
        return true;
      } catch (error) {
        console.error('Erro nosso_qrcode:', error);
        return false;
      }
    },
  },

  nossa_marca: {
    functionKey: 'nossa_marca',
    functionName: 'Nossa Marca',
    category: 'information',
    responseType: 'voice+modal',
    
    voiceTriggers: [
      'nossa marca',
      'sobre a empresa',
      'quem somos',
      'horário de funcionamento',
      'horario de funcionamento',
      'horário de atendimento',
      'horario de atendimento',
      'quando funciona',
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
    
    handler: async ({ companyId, playText, setActiveModal }) => {
      try {
        console.log('🏢 [NOSSA MARCA] Buscando informações');
        
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
        
        if (!company.brand_description && !company.business_hours && !company.business_address) {
          await playText('As informações da marca ainda não foram configuradas. Por favor, configure no painel administrativo.');
          return false;
        }
        
        const isAddress = company.business_address && 
          !company.business_address.startsWith('http') && 
          !company.business_address.includes('www.');
        
        let qrContent = '';
        if (isAddress) {
          qrContent = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(company.business_address)}`;
        } else if (company.business_address) {
          qrContent = company.business_address.startsWith('http') 
            ? company.business_address 
            : `https://${company.business_address}`;
        }
        
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
              autoCloseDuration: 20000,
            }
          });
        }
        
        await playText(speechText);
        
        return true;
        
      } catch (error) {
        console.error('🏢 [NOSSA MARCA] ERRO:', error);
        await playText('Desculpe, ocorreu um erro ao buscar as informações.');
        return false;
      }
    },
  },
  
  meu_sistema: {
    functionKey: 'meu_sistema',
    functionName: 'Meu Sistema',
    category: 'information',
    responseType: 'voice+modal',
    
    voiceTriggers: [
      'meu sistema',
      'sobre o sistema',
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
    creditsPerUse: 0,
    requiresPayment: false,
    isPremium: false,
    
    handler: async ({ playText, setActiveModal }) => {
      try {
        console.log('🧊 [MEU SISTEMA] Abrindo informações');
        
        if (setActiveModal) {
          setActiveModal({
            type: 'MeuSistemaDisplay',
            data: {
              logoUrl: '/public/logo-circle.png',
              websiteUrl: 'https://eai.app.br',
              qrCodeUrl: '',
              title: 'Sistema eAi',
              subtitle: 'Assistente de Voz Inteligente',
              description: 'Transforme o atendimento da sua empresa com um Funcionário IA',
              autoCloseDuration: 15000,
            }
          });
        }
        
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
  // ✅ CORREÇÃO PRINCIPAL: requiresInput: false
  // O orçamento usa o transcript completo como pergunta para o GPT.
  // Não precisa extrair número — a pergunta inteira é o input.
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
    
    // ✅ CORRIGIDO: false — o transcript completo é enviado para o GPT
    requiresInput: false,
    inputType: undefined,
    inputPrompt: undefined,
    
    description: 'Gera orçamentos personalizados usando IA com tabelas de preços configuradas',
    shortDescription: 'Gerar orçamentos com IA',
    icon: '💰',
    color: '#8B5CF6',
    saveToHistory: true,
    creditsPerUse: 2,
    requiresPayment: false,
    isPremium: false,
    
    handler: async ({ transcript, playText, companyId, sessionId }) => {
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

        const formData = new FormData();
        const textBlob = new Blob([transcript], { type: 'text/plain' });
        formData.append('audio', textBlob, 'question.txt');
        formData.append('companyId', companyId);
        formData.append('directQuestion', transcript);
        formData.append('useOrcamentoPrompt', 'true');
        formData.append('returnText', 'true');

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

        // ✅ CORRIGIDO: verificar content-type antes de parsear JSON
        const contentType = response.headers.get('content-type') || '';

        if (!contentType.includes('application/json')) {
          console.error('💰 [ORCAMENTO] API retornou áudio em vez de JSON — verifique returnText na rota');
          throw new Error('API retornou áudio em vez de JSON. Verifique a rota /api/voice/process.');
        }

        const data = await response.json();
        const reply = data.response || data.reply;
        
        if (!reply) {
          throw new Error('Resposta vazia do servidor');
        }

        console.log('💰 [ORCAMENTO] Orçamento gerado com sucesso');
        
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
      const triggerLower = trigger.toLowerCase();
      // ✅ CORRIGIDO: word boundary para evitar matches parciais (ex: "x" em "10x15")
      const escaped = triggerLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(
        `(?<![a-záéíóúãõâêîôûç])${escaped}(?![a-záéíóúãõâêîôûç])`,
        'i'
      );
      if (regex.test(lowerTranscript)) {
        // ✅ CORRIGIDO: triggers mais longos valem mais pontos
        score += triggerLower.split(' ').length >= 2 ? 15 : 8;
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

  // ✅ CORRIGIDO: threshold de 1.0 exige ao menos 1 trigger multi-palavra (15 pts)
  // ou 2 triggers de palavra única (8+8=16 pts).
  // Triggers de palavra única sozinhos (score=8) não ativam mais.
  const confidence = bestScore / 15;
  
  return {
    function: confidence >= 1.0 ? bestMatch : null,
    confidence,
    extractedValue,
  };
}

function extractAmount(transcript: string): number | null {
  const match = transcript.match(/R?\$?\s*(\d+(?:[.,]\d{1,2})?)/i);
  if (!match) return null;
  const value = parseFloat(match[1].replace(',', '.'));
  return isNaN(value) || value <= 0 ? null : value;
}

function extractTelefone(transcript: string): string | undefined {
  const digits = transcript.replace(/\D/g, '');
  const match = digits.match(/(\d{10,11})$/);
  return match ? match[1] : undefined;
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
