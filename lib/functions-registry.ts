/**
 * Sistema de Registro de Funções NOVAS - minhAi
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
import { cobrar_debito, cobrar_credito } from './paymentGatewayEntries'
import { getContextualRoute } from '@/lib/routing-utils';

export type ResponseType = 'voice' | 'modal' | 'page' | 'voice+modal' | 'voice+page';

/**
 * Interface que define a estrutura de cada função
 */
export interface FunctionDefinition {
  // Identificação
  functionKey: string;
  functionName: string;
  category: 'contact' | 'payment' | 'configuration' | 'biometry' | 'knowledge' | 'schedule' | 'information' | 'images' | 'ai_assistant' | 'video' | 'productivity' | 'utylities' | 'codes' | 'services';
  
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
    functionParams?: any;
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
  cobrar_debito,
  cobrar_credito,
  
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

tef_debito: {
  functionKey: 'tef_debito',
  functionName: 'TEF Débito',
  category: 'payment',
  responseType: 'voice+modal',

  voiceTriggers: [
  'tef débito', 'tef debito', 'POS debito', 'debito no POS',
  'débito na maquininha', 'debito na maquininha',
  'cartão na maquininha', 'cartao na maquininha',
  'passar na maquininha',
  'maquininha débito', 'maquininha debito',
  'cobrar na maquininha',
  'pagar na maquininha',
],

  examplePhrases: [
    'Cobrar 50 reais no débito',
    'TEF débito de 80',
    'Passar no débito',
  ],

  requiresInput: true,
  inputType: 'number',
  inputPrompt: 'Qual o valor para o pagamento no débito?',

  description: 'Cobra no cartão de débito direto na maquininha Mercado Pago Point Smart. O cliente passa o cartão na maquininha, sem tocar no tablet.',
  shortDescription: 'Cobrar no débito via maquininha Point',
  icon: '🔴',
  color: '#F44336',

  saveToHistory: true,
  creditsPerUse: 1,
  requiresPayment: true,
  isPremium: false,

  handler: async ({ transcript, playText, setActiveModal, companyId }) => {
    const supabase = createClient()

    const amount = extractAmount(transcript ?? '')

    const { data: company } = await supabase
      .from('companies')
      .select('mp_access_token, mp_terminal_id')
      .eq('id', companyId)
      .single()

    if (!company?.mp_access_token || !company?.mp_terminal_id) {
      await playText('A maquininha Mercado Pago não está configurada. Configure o Access Token e o Terminal ID no painel.')
      return false
    }

    await playText(
      amount
        ? `Preparando cobrança de ${amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} no débito na maquininha.`
        : 'Abrindo cobrança por débito na maquininha. Informe o valor.'
    )

    setActiveModal?.({
      type: 'MercadoPagoPointDisplay',
      data: {
        companyId,
        paymentType: 'debit_card',
        initialAmount: amount ? Math.round(amount * 100) : undefined,
      },
    })

    return true
  },
},

tef_credito: {
  functionKey: 'tef_credito',
  functionName: 'TEF Crédito',
  category: 'payment',
  responseType: 'voice+modal',

  voiceTriggers: [
  'tef crédito', 'tef credito', 'POS credito', 'credito no POS',
  'crédito na maquininha', 'credito na maquininha',
  'parcelar na maquininha',
  'maquininha crédito', 'maquininha credito',
  'cobrar na maquininha',
  'pagar na maquininha',
  'parcelar', 'parcelado',
],

  examplePhrases: [
    'Cobrar 100 reais no crédito',
    'TEF crédito de 80',
    'Parcelar em 3 vezes',
    'Passar no crédito',
  ],

  requiresInput: true,
  inputType: 'number',
  inputPrompt: 'Qual o valor para o pagamento no crédito?',

  description: 'Cobra no cartão de crédito direto na maquininha Mercado Pago Point Smart. Suporta parcelamento configurável. O cliente passa o cartão na maquininha, sem tocar no tablet.',
  shortDescription: 'Cobrar no crédito via maquininha Point',
  icon: '🔴',
  color: '#F44336',

  saveToHistory: true,
  creditsPerUse: 1,
  requiresPayment: true,
  isPremium: false,

  handler: async ({ transcript, playText, setActiveModal, companyId }) => {
    const supabase = createClient()

    const amount = extractAmount(transcript ?? '')

    // Extrair parcelas do transcript
    const installmentsMatch = (transcript ?? '').match(/(\d{1,2})\s*(?:vezes|x\b|parcelas?)/)
    const installments = installmentsMatch ? Math.min(parseInt(installmentsMatch[1]), 12) : 1

    const { data: company } = await supabase
      .from('companies')
      .select('mp_access_token, mp_terminal_id')
      .eq('id', companyId)
      .single()

    if (!company?.mp_access_token || !company?.mp_terminal_id) {
      await playText('A maquininha Mercado Pago não está configurada. Configure o Access Token e o Terminal ID no painel.')
      return false
    }

    // Buscar config de parcelas
    const { data: settings } = await supabase
      .from('company_function_settings')
      .select('config')
      .eq('company_id', companyId)
      .eq('function_key', 'tef_credito')
      .single()

    const maxInstallments = settings?.config?.max_installments || 12
    const minInstallmentValueCents = settings?.config?.min_installment_value_cents || 0
    const parsedInstallments = Math.min(installments, maxInstallments)
    const installmentsCost = settings?.config?.installments_cost || 'seller'

    if (amount) {
      const amountStr = amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      await playText(
        parsedInstallments > 1
          ? `Preparando cobrança de ${amountStr} no crédito em ${parsedInstallments} vezes na maquininha.`
          : `Preparando cobrança de ${amountStr} no crédito à vista na maquininha.`
      )
    } else {
      await playText('Abrindo cobrança por crédito na maquininha. Informe o valor e as parcelas.')
    }

    setActiveModal?.({
      type: 'MercadoPagoPointDisplay',
      data: {
        companyId,
        paymentType: 'credit_card',
        initialAmount: amount ? Math.round(amount * 100) : undefined,
        initialInstallments: parsedInstallments,
        maxInstallments,
        minInstallmentValueCents,
        installmentsCost,
      },
    })

    return true
  },
},

  nfc_debito: {
    functionKey: 'nfc_debito',
    functionName: 'NFC Débito',
    category: 'payment',
    responseType: 'voice+modal',

voiceTriggers: [
  'nfc debito', 'nfc débito', 'tap debito', 'debito no tap',
  'cobrar no debito tap', 'cobrar no débito nfc', 'tap to pay debito',
  'cobrança no debito tap', 'cobrança no débito nfc',
  'cobranca no debito boa nfc',
  'cartao de debito no tap', 'cartão de débito no nfc',
  // ✅ chave: sem o valor — o processor só precisa identificar a função
  'debito via nfc', 'débito via nfc', 'debito via tap',
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
  'cobrar no credito nfc', 'cobrar no crédito tap', 'tap credito', 'credito no tap',
  'cobrança no credito via tap', 'cobrança no crédito via nfc',
  'cobranca no credito via tap', 'tap to pay credito',
  'cartao de credito no tap', 'cartão de crédito no nfc',
  'credito via nfc', 'crédito via nfc', 'credito via tap',
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

// ========================================
// MODO FILA
// ========================================
modo_fila: {
  functionKey: 'modo_fila',
  functionName: 'Modo Fila',
  category: 'biometry',
  responseType: 'navigation',

  voiceTriggers: [
    'modo fila',
    'abrir fila',
    'ir para fila',
    'painel fila',
  ],

  examplePhrases: [
    'Abrir modo fila',
    'Ir para a fila',
  ],

  requiresInput: false,
  description: 'Abre a página de gerenciamento de fila de atendimento.',
  shortDescription: 'Abrir página da fila',
  icon: '🟤',
  color: '#000080',

  saveToHistory: false,
  creditsPerUse: 0,
  requiresPayment: false,
  isPremium: false,

  handler: async ({ slug }) => {
    try {
      // Usa getContextualRoute para detectar slug vs subdomínio
      const filaUrl = getContextualRoute('fila', slug);
      window.location.href = filaUrl;
      return true;
    } catch {
      return false;
    }
  },
},

responder_pesquisa: {
  functionKey: 'responder_pesquisa',
  functionName: 'Responder Pesquisa',
  category: 'information',
  responseType: 'voice+modal',

  voiceTriggers: [
    'responder pesquisa',
    'fazer pesquisa',
    'pesquisa de satisfação',
    'avaliar atendimento',
    'dar nota',
    'avaliação',
    'avaliar',
  ],

  examplePhrases: [
    'Quero responder a pesquisa',
    'Fazer pesquisa de satisfação',
    'Avaliar o atendimento',
    'Dar nota',
  ],

  requiresInput: false,
  description: 'Abre pesquisa de satisfação para o cliente responder.',
  shortDescription: 'Responder pesquisa de satisfação',
  icon: '⭐',
  color: '#f59e0b',

  saveToHistory: true,
  creditsPerUse: 1,
  requiresPayment: false,
  isPremium: false,

  handler: async ({ playText, setActiveModal, companyId }) => {
    try {
      const supabase = createClient();
      const { data: pesquisa } = await supabase
        .from('pesquisas')
        .select('id, titulo')
        .eq('company_id', companyId)
        .eq('ativa', true)
        .maybeSingle();

      if (!pesquisa) {
        await playText('Não há pesquisas disponíveis no momento.');
        return false;
      }

      setActiveModal?.({
        type: 'ResponderPesquisaDisplay',
        data: { companyId, pesquisaId: pesquisa.id },
      });
      playText(`Por favor, responda nossa pesquisa: ${pesquisa.titulo}`).catch(() => {});
      return true;
    } catch (err) {
      console.error('Erro responder_pesquisa:', err);
      await playText('Erro ao abrir pesquisa.');
      return false;
    }
  },
},
// ========================================
// FUNÇÕES DE FILA (8 funções)
// ========================================

// 1. FILA DE ATENDIMENTO (pública - aparece no carrossel)
fila_atendimento: {
  functionKey: 'fila_atendimento',
  functionName: 'Fila de Atendimento',
  category: 'biometry',
  responseType: 'voice+modal',
  voiceTriggers: [
    'fila de atendimento',
    'painel de fila',
    'gerenciar fila',
    'controle de fila',
    'abrir fila',
    'painel atendimento',
    'controlar fila',
    'administrar fila',
  ],
  examplePhrases: [
    'Abrir fila de atendimento',
    'Gerenciar fila',
    'Painel de atendimento',
    'Controle da fila',
  ],
  description: 'Painel completo de gerenciamento de fila: chamar próxima, finalizar, pausar, retomar, estatísticas e configurações.',
  shortDescription: 'Painel de controle da fila',
  icon: '🟤',
  color: '#808000',
  saveToHistory: true,
  creditsPerUse: 0,
  requiresPayment: false,
  isPremium: false,
  handler: async ({ companyId, setActiveModal, playText }) => {
    await playText('Abrindo painel de atendimento...');
    setActiveModal?.({
      type: 'FilaAtendimentoDisplay',
      data: { companyId },
    });
    return true;
  },
},

// 2. GERAR SENHA (pública - aparece no carrossel)
gerar_senha: {
  functionKey: 'gerar_senha',
  functionName: 'Gerar Senha',
  category: 'biometry',
  responseType: 'voice+modal',
  voiceTriggers: [
    'gerar senha',
    'pegar senha',
    'quero senha',
    'retirar senha',
    'senha da fila',
    'entrar na fila',
    'tirar senha',
    'pegar ficha',
  ],
  examplePhrases: [
    'Pegar senha',
    'Gerar senha da fila',
    'Quero entrar na fila',
    'Retirar senha',
  ],
  description: 'Gera uma nova senha da fila e exibe QR Code para acompanhamento em tempo real.',
  shortDescription: 'Gerar senha e acompanhar fila',
  icon: '🟤',
  color: '#000080',
  saveToHistory: true,
  creditsPerUse: 1,
  requiresPayment: false,
  isPremium: false,
  handler: async ({ companyId, setActiveModal, playText }) => {
    // Criar client Supabase dentro do handler
    const { createClient } = await import('@/lib/supabase-browser');
    const supabase = createClient();

    // Buscar slug da empresa
    const { data: company } = await supabase
      .from('companies')
      .select('slug')
      .eq('id', companyId)
      .single();

    const slug = company?.slug;

    // Modal PRIMEIRO (antes do TTS)
    setActiveModal?.({
      type: 'GerarSenhaDisplay',
      data: { companyId, slug },
    });

    // TTS depois SEM AWAIT (não bloqueia)
    playText('Gerando sua senha...');

    return true;
  },
},

// 3. CHAMAR PRÓXIMA SENHA (interna - não aparece no carrossel)
chamar_proxima_senha: {
  functionKey: 'chamar_proxima_senha',
  functionName: 'Chamar Próxima Senha',
  category: 'biometry',
  responseType: 'voice',
  voiceTriggers: [
    'chamar próxima',
    'chamar proxima',
    'próxima senha',
    'proxima senha',
    'chamar senha',
  ],
  examplePhrases: [
    'Chamar próxima senha',
    'Próxima',
    'Chamar',
  ],
  description: 'Chama a próxima senha da fila com TTS.',
  shortDescription: 'Chamar próxima senha',
  icon: '🟤',
  color: '#808000',
  saveToHistory: true,
  creditsPerUse: 0,
  requiresPayment: false,
  isPremium: false,
  handler: async ({ companyId, playText }) => {
    const supabase = createClient();

    try {
      // Buscar próxima senha aguardando
      const { data: proximaSenha, error } = await supabase
        .from('fila_senhas')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'aguardando')
        .order('gerada_em', { ascending: true })
        .limit(1)
        .single();

      if (error || !proximaSenha) {
        await playText('Não há senhas aguardando no momento.');
        return true;
      }

      // Atualizar status para "chamando"
      await supabase
        .from('fila_senhas')
        .update({
          status: 'chamando',
          chamada_em: new Date().toISOString(),
        })
        .eq('id', proximaSenha.id);

      // TTS especial
      const prefixo = proximaSenha.senha_completa[0];
      const numeros = proximaSenha.senha_completa.slice(1).split('');
      const texto = `Senha ${prefixo}. ${numeros.join('. ')}.`;
      await playText(texto);

      // Após 3s, mudar para "atendimento"
      setTimeout(async () => {
        await supabase
          .from('fila_senhas')
          .update({
            status: 'atendimento',
            atendimento_iniciado_em: new Date().toISOString(),
          })
          .eq('id', proximaSenha.id);
      }, 3000);

      return true;
    } catch (err) {
      console.error('Erro ao chamar senha:', err);
      await playText('Erro ao chamar senha.');
      return false;
    }
  },
},

// 4. FINALIZAR ATENDIMENTO (interna)
finalizar_atendimento: {
  functionKey: 'finalizar_atendimento',
  functionName: 'Finalizar Atendimento',
  category: 'biometry',
  responseType: 'voice',
  voiceTriggers: [
    'finalizar atendimento',
    'concluir atendimento',
    'encerrar atendimento',
  ],
  examplePhrases: [
    'Finalizar atendimento',
    'Concluir',
    'Finalizar',
  ],
  description: 'Finaliza o atendimento da senha atual.',
  shortDescription: 'Finalizar atendimento atual',
  icon: '🟤',
  color: '#808000',
  saveToHistory: true,
  creditsPerUse: 0,
  requiresPayment: false,
  isPremium: false,
  handler: async ({ companyId, playText }) => {
    const supabase = createClient();

    try {
      // Buscar senha em atendimento
      const { data: senhaAtual, error } = await supabase
        .from('fila_senhas')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'atendimento')
        .single();

      if (error || !senhaAtual) {
        await playText('Nenhum atendimento em andamento.');
        return true;
      }

      // Finalizar
      await supabase
        .from('fila_senhas')
        .update({
          status: 'finalizado',
          finalizada_em: new Date().toISOString(),
        })
        .eq('id', senhaAtual.id);

      await playText('Atendimento finalizado com sucesso.');
      return true;
    } catch (err) {
      console.error('Erro ao finalizar:', err);
      await playText('Erro ao finalizar atendimento.');
      return false;
    }
  },
},

// 5. PAUSAR FILA (interna)
pausar_fila: {
  functionKey: 'pausar_fila',
  functionName: 'Pausar Fila',
  category: 'biometry',
  responseType: 'voice',
  voiceTriggers: [
    'pausar fila',
    'parar fila',
    'suspender fila',
    'interromper fila',
  ],
  examplePhrases: [
    'Pausar fila',
    'Parar fila',
    'Pausar',
  ],
  description: 'Pausa temporariamente a fila.',
  shortDescription: 'Pausar fila temporariamente',
  icon: '🟤',
  color: '#808000',
  saveToHistory: true,
  creditsPerUse: 0,
  requiresPayment: false,
  isPremium: false,
  handler: async ({ companyId, playText }) => {
    const supabase = createClient();

    try {
      await supabase
        .from('fila_configs')
        .update({ fila_ativa: false })
        .eq('company_id', companyId);

      await playText('Fila pausada. Novas senhas não serão geradas.');
      return true;
    } catch (err) {
      console.error('Erro ao pausar:', err);
      await playText('Erro ao pausar fila.');
      return false;
    }
  },
},

// 6. RETOMAR FILA (interna)
retomar_fila: {
  functionKey: 'retomar_fila',
  functionName: 'Retomar Fila',
  category: 'biometry',
  responseType: 'voice',
  voiceTriggers: [
    'retomar fila',
    'continuar fila',
    'reativar fila',
    'ativar fila',
  ],
  examplePhrases: [
    'Retomar fila',
    'Continuar fila',
    'Retomar',
  ],
  description: 'Retoma a fila pausada.',
  shortDescription: 'Retomar fila pausada',
  icon: '🟤',
  color: '#808000',
  saveToHistory: true,
  creditsPerUse: 0,
  requiresPayment: false,
  isPremium: false,
  handler: async ({ companyId, playText }) => {
    const supabase = createClient();

    try {
      await supabase
        .from('fila_configs')
        .update({ fila_ativa: true })
        .eq('company_id', companyId);

      await playText('Fila retomada. Clientes podem gerar senhas novamente.');
      return true;
    } catch (err) {
      console.error('Erro ao retomar:', err);
      await playText('Erro ao retomar fila.');
      return false;
    }
  },
},

// 7. CANCELAR SENHA (interna)
cancelar_senha: {
  functionKey: 'cancelar_senha',
  functionName: 'Cancelar Senha',
  category: 'biometry',
  responseType: 'voice',
  voiceTriggers: [
    'cancelar senha',
    'desistir da fila',
    'sair da fila',
    'remover senha',
  ],
  examplePhrases: [
    'Cancelar senha',
    'Desistir',
    'Cancelar',
  ],
  description: 'Cancela uma senha específica.',
  shortDescription: 'Cancelar senha da fila',
  icon: '🟤',
  color: '#808000',
  saveToHistory: true,
  creditsPerUse: 0,
  requiresPayment: false,
  isPremium: false,
  handler: async ({ companyId, playText, transcript }) => {
    // Extrair número da senha do transcript
    const match = transcript.match(/[A-Z]\d{3}/i);
    if (!match) {
      await playText('Por favor, informe o número da senha que deseja cancelar.');
      return false;
    }

    const senhaCompleta = match[0].toUpperCase();
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from('fila_senhas')
        .update({ status: 'cancelado' })
        .eq('company_id', companyId)
        .eq('senha_completa', senhaCompleta)
        .eq('status', 'aguardando');

      if (error) {
        await playText('Erro ao cancelar senha.');
        return false;
      }

      await playText(`Senha ${senhaCompleta} cancelada com sucesso.`);
      return true;
    } catch (err) {
      console.error('Erro ao cancelar:', err);
      await playText('Erro ao cancelar senha.');
      return false;
    }
  },
},

// 8. MINHA POSIÇÃO NA FILA (interna)
minha_posicao_fila: {
  functionKey: 'minha_posicao_fila',
  functionName: 'Minha Posição na Fila',
  category: 'biometry',
  responseType: 'voice',
  voiceTriggers: [
    'minha posição',
    'minha posicao',
    'quantos na frente',
    'posição da senha',
    'posicao da senha',
  ],
  examplePhrases: [
    'Minha posição',
    'Quantos na frente',
    'Onde estou na fila',
  ],
  description: 'Informa a posição na fila e tempo estimado.',
  shortDescription: 'Consultar posição na fila',
  icon: '🟤',
  color: '#808000',
  saveToHistory: true,
  creditsPerUse: 0,
  requiresPayment: false,
  isPremium: false,
  handler: async ({ companyId, playText, transcript }) => {
    // Extrair número da senha
    const match = transcript.match(/[A-Z]\d{3}/i);
    if (!match) {
      await playText('Por favor, informe o número da sua senha.');
      return false;
    }

    const senhaCompleta = match[0].toUpperCase();
    const supabase = createClient();

    try {
      // Buscar senha
      const { data: senha, error } = await supabase
        .from('fila_senhas')
        .select('*')
        .eq('company_id', companyId)
        .eq('senha_completa', senhaCompleta)
        .eq('status', 'aguardando')
        .single();

      if (error || !senha) {
        await playText('Senha não encontrada ou já foi chamada.');
        return false;
      }

      // Calcular posição
      const { count } = await supabase
        .from('fila_senhas')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('status', 'aguardando')
        .lt('gerada_em', senha.gerada_em);

      const posicao = count || 0;

      // Buscar tempo médio
      const { data: config } = await supabase
        .from('fila_configs')
        .select('tempo_medio_atendimento')
        .eq('company_id', companyId)
        .single();

      const tempoEstimado = config ? posicao * config.tempo_medio_atendimento : 0;

      if (posicao === 0) {
        await playText(`Sua senha ${senhaCompleta} é a próxima da fila!`);
      } else {
        await playText(
          `Sua senha ${senhaCompleta} tem ${posicao} ${posicao === 1 ? 'pessoa' : 'pessoas'} na frente. Tempo estimado: ${tempoEstimado} minutos.`
        );
      }

      return true;
    } catch (err) {
      console.error('Erro ao consultar posição:', err);
      await playText('Erro ao consultar posição.');
      return false;
    }
  },
},

link_na_bio: {
  functionKey: 'link_na_bio',
  functionName: 'Link na Bio',
  category: 'contact',
  responseType: 'navigation',
 
  voiceTriggers: [
    'link na bio',
    'página de links',
    'pagina de links',
    'links da empresa',
    'links de contato',
    'nossos links',
  ],
 
  examplePhrases: [
    'Ver link na bio',
    'Abrir página de links',
    'Mostrar redes sociais',
    'Links da empresa',
  ],
 
  requiresInput: false,
  description: 'Abre a página pública de links da empresa com redes sociais, links customizados e botão para o assistente.',
  shortDescription: 'Página de links da empresa',
  icon: '🔗',
  color: '#8B5CF6',
 
  saveToHistory: true,
  creditsPerUse: 0,
  requiresPayment: false,
  isPremium: false,
 
  handler: async ({ playText, slug }) => {
    try {
      const linkUrl = getContextualRoute('link', slug);
      await playText('Abrindo página de links!');
      window.location.href = linkUrl;
      return true;
    } catch (error) {
      console.error('Erro ao navegar para link na bio:', error);
      await playText('Erro ao abrir a página de links.');
      return false;
    }
  },
},
  
analisar_planilha: {
  functionKey: 'analisar_planilha',
  functionName: 'Analisar Planilha',
  category: 'images',                    // mesma categoria de enviar_arquivo / gerar_qrcode
  responseType: 'voice+modal',
 
  voiceTriggers: [
    'analisar planilha',
    'analisar arquivo',
    'dashboard de planilha',
    'gerar dashboard',
    'analisar dados',
    'análise de dados',
    'analise de dados',
    'transformar planilha',
    'insights da planilha',
    'relatório de arquivos',
    'relatorio de arquivo',
    'gráficos da planilha',
    'graficos da planilha',
    'analisar excel',
    'analisar csv',
    'analisar xlsx',
  ],
 
  examplePhrases: [
    'Analisar planilha de vendas',
    'Gerar dashboard do meu Excel',
    'Análise de dados com gráficos',
    'Transformar planilha em dashboard',
    'Analisar meu CSV',
  ],
 
  edgeFunction: 'analisar-planilha',
  uiComponent: 'AnalisarPlanilhaDisplay',
  requiresInput: false,
 
  description: 'Transforma planilhas CSV ou XLSX em dashboards interativos com KPIs, gráficos e insights gerados por IA. Converse para refinar a análise e exporte o relatório em PDF.',
  shortDescription: 'Planilha → Dashboard com IA em segundos.',
  icon: '📊',
  color: '#1e40af',
 
  saveToHistory: true,
  creditsPerUse: 3,                      // cobrado apenas ao salvar (quando completo: true)
  requiresPayment: false,
  isPremium: false,
 
  handler: async ({ companyId, setActiveModal }) => {
    // SEM playText aqui — o modal fala no useEffect de mount (padrão do projeto)
    setActiveModal?.({
      type: 'AnalisarPlanilhaDisplay',
      data: { companyId },
    });
    return true;
  },
},

juntar_pdfs: {
  functionKey: 'juntar_pdfs',
  functionName: 'Juntar PDFs',
  category: 'tools' as any,
  responseType: 'voice+modal',
  
  voiceTriggers: [
    'juntar pdf', 'juntar pdfs', 'mesclar pdf', 'unir pdf',
    'combinar pdf', 'mesclar documentos', 'unir documentos',
    'juntar arquivos', 'merge pdf'
  ],
  
  examplePhrases: [
    'Juntar PDFs',
    'Mesclar documentos',
    'Unir vários PDFs'
  ],
  
  edgeFunction: undefined,
  uiComponent: 'JuntarPdfsDisplay',
  requiresInput: false,
  description: 'Mescla múltiplos arquivos PDF em um único documento. Permite reordenar as páginas antes de juntar.',
  icon: '🌐',
  color: '#000080',
  saveToHistory: true,
  creditsPerUse: 2,
  requiresPayment: false,
  isPremium: false,
  
  handler: async ({ companyId, setActiveModal }) => {
    setActiveModal?.({ type: 'JuntarPdfsDisplay', data: { companyId } });
    return true;
  },
},
  
converter_arquivo: {
  functionKey: 'converter_arquivo',
  functionName: 'Converter Arquivos',
  category: 'tools' as any,
  responseType: 'voice+modal',
  
  voiceTriggers: [
    'converter arquivo', 'converter imagem', 'mudar formato',
    'transformar em pdf', 'exportar pdf', 'salvar como png',
    'converter para jpg', 'mudar extensao', 'exportar imagem',
    'salvar pdf', 'transformar arquivo', 'converter arquivos'
  ],
  
  examplePhrases: [
    'Converter para PNG',
    'Transformar em PDF',
    'Mudar formato do arquivo'
  ],
  
  edgeFunction: undefined,
  uiComponent: 'ConverterArquivoDisplay',
  requiresInput: false,
  description: 'Converte imagens e documentos entre diferentes formatos: JPG, PNG, WebP, PDF, TXT.',
  icon: '🌐',
  color: '#000080',
  saveToHistory: true,
  creditsPerUse: 2,
  requiresPayment: false,
  isPremium: false,
  
  handler: async ({ companyId, setActiveModal }) => {
    setActiveModal?.({ type: 'ConverterArquivoDisplay', data: { companyId } });
    return true;
  },
},

editar_imagem: {
  functionKey: 'editar_imagem',
  functionName: 'Editar Imagem',
  category: 'tools' as any,
  responseType: 'voice+modal',
  
  voiceTriggers: [
    'editar imagem', 'editar foto', 'ajustar foto',
    'cortar imagem', 'girar foto', 'brilho contraste',
    'aplicar filtro', 'melhorar foto', 'editar'
  ],
  
  examplePhrases: [
    'Editar minha foto',
    'Ajustar brilho e contraste',
    'Cortar imagem'
  ],
  
  edgeFunction: undefined,
  uiComponent: 'EditarImagemDisplay',
  requiresInput: false,
  description: 'Editor completo de imagens com ajustes de brilho, contraste, saturação, rotação, espelhamento e corte interativo.',
  icon: '🌐',
  color: '#000080',
  saveToHistory: true,
  creditsPerUse: 2,
  requiresPayment: false,
  isPremium: false,
  
  handler: async ({ companyId, setActiveModal }) => {
    setActiveModal?.({ type: 'EditarImagemDisplay', data: { companyId } });
    return true;
  },
},

remover_fundo: {
  functionKey: 'remover_fundo',
  functionName: 'Remover Fundo',
  category: 'tools' as any,
  responseType: 'voice+modal',
  
  voiceTriggers: [
    'remover fundo', 'tirar fundo', 'fundo transparente',
    'remover background', 'apagar fundo', 'fundo branco',
    'recortar pessoa', 'isolar objeto'
  ],
  
  examplePhrases: [
    'Remover fundo da foto',
    'Criar fundo transparente',
    'Tirar background'
  ],
  
  edgeFunction: undefined,
  uiComponent: 'RemoverFundoDisplay',
  requiresInput: false,
  description: 'Remove automaticamente o fundo de imagens usando inteligência artificial. Gera PNG transparente.',
  icon: '🌐',
  color: '#000080',
  saveToHistory: true,
  creditsPerUse: 2,
  requiresPayment: false,
  isPremium: false,
  
  handler: async ({ companyId, setActiveModal }) => {
    setActiveModal?.({ type: 'RemoverFundoDisplay', data: { companyId } });
    return true;
  },
},

// ── CRIAR NOTA ───────────────────────────────────────────────────────────────
 
criar_nota: {
  functionKey:     'criar_nota',
  functionName:    'Criar Nota',
  category:        'utilities' as any,
  responseType:    'voice+modal',
 
  voiceTriggers: [
    'criar nota',
    'anotar',
    'salvar nota',
    'fazer anotacao',
    'quero anotar',
    'registrar nota',
    'escrever nota',
    'nota sobre',
  ],
  examplePhrases: ['Criar nota', 'Anotar isso', 'Fazer anotação', 'Quero anotar algo'],
 
  edgeFunction:    undefined,
  uiComponent:     'CriarNotaDisplay',
  requiresInput:   false,
  description:     'Permite criar e salvar notas de texto por comando de voz. O cliente pode ditar o conteúdo da nota e ela será armazenada no dashboard de arquivos para consulta posterior.',
  icon:            '⏱️',
  color:           '#FFA500',
  saveToHistory:   true,
  creditsPerUse:   1,
  requiresPayment: false,
  isPremium:       false,
 
  handler: async ({ companyId, setActiveModal, transcript }) => {
    // Detecta se veio com "nota sobre [assunto]"
    const match = transcript?.match(/nota sobre (.+)/i);
    const targetText = match ? match[1].trim() : undefined;
 
    setActiveModal?.({
      type: 'CriarNotaDisplay',
      data: { companyId, targetText },
    });
    // SEM playText aqui — o modal fala no useEffect de mount
    return true;
  },
},
 
// ── LEMBRETE DE REMÉDIOS ─────────────────────────────────────────────────────
 
lembrete_remedios: {
  functionKey:     'lembrete_remedios',
  functionName:    'Lembrete de Remédios',
  category:        'utilities' as any,
  responseType:    'voice+modal',
 
  voiceTriggers: [
    'lembrete de remedio',
    'lembrar remedio',
    'alarme de remedio',
    'configurar remedio',
    'horario do remedio',
    'tomar remedio',
  ],
  examplePhrases: ['Lembrete de remédio', 'Configurar remédio', 'Horário do remédio'],
 
  edgeFunction:    undefined,
  uiComponent:     'LembreteRemediosDisplay',
  requiresInput:   false,
  description:     'Configura lembretes para tomar remédios em horários específicos. O cliente informa o nome do remédio e os horários, e pode escolher receber alertas direto no assistente ou via Google Calendar.',
  icon:            '⏱️',
  color:           '#FFA500',
  saveToHistory:   true,
  creditsPerUse:   1,
  requiresPayment: false,
  isPremium:       false,
 
  handler: async ({ companyId, setActiveModal }) => {
    setActiveModal?.({
      type: 'LembreteRemediosDisplay',
      data: { companyId },
    });
    // SEM playText aqui — o modal fala no useEffect de mount
    return true;
  },
},

identificar_fraude: {
  functionKey:      'identificar_fraude',
  functionName:     'Identificar Fraude',
  category:         'security' as any,
  responseType:     'voice+modal',

  voiceTriggers: [
    'identificar fraude',
    'verificar fraude',
    'checar boleto',
    'boleto suspeito',
    'analisar link',
    'link suspeito',
    'site suspeito',
    'verificar site',
    'golpe',
    'fraude',
  ],
  examplePhrases: [
    'Identificar fraude',
    'Verificar boleto',
    'Checar link suspeito',
  ],

  edgeFunction:  'camera-process',
  uiComponent:   'IdentificarFraudeDisplay',
  requiresInput: false,
  description:   'Analisa imagens, boletos e links para detectar fraudes e golpes.',
  icon:          '🔍',
  color:         '#dc2626',
  saveToHistory:  true,
  creditsPerUse:  2,
  requiresPayment: false,
  isPremium:      false,

  handler: async ({ companyId, playText, setActiveModal }) => {
    setActiveModal?.({
      type: 'IdentificarFraudeDisplay',
      data: { companyId },
    });
    return true;
  },
},

tocar_musica: {
  functionKey: 'tocar_musica',
  functionName: 'Tocar Música',
  category: 'video',
  responseType: 'voice+modal',

  voiceTriggers: [
    'tocar musica', 'tocar música',
    'tocar uma musica', 'tocar uma música',
    'reproduzir musica', 'reproduzir música',
    'ouvir musica', 'ouvir música',
    'tocar musica de', 'tocar música de',
    'toca uma musica', 'toca uma música',
    'quero ouvir', 'quero escutar',
    'coloca uma musica', 'coloca uma música',
  ],

  examplePhrases: [
    'Tocar música de jazz',
    'Ouvir lofi',
    'Coloca uma música relaxante',
  ],

  edgeFunction: 'tocar-musica',
  requiresInput: true,
  inputType: 'text',
  inputPrompt: 'Qual música você quer ouvir?',

  description: 'Busca e reproduz músicas do YouTube em um mini player por voz.',
  shortDescription: 'Reproduz músicas do YouTube por voz.',
  icon: '🎵',
  color: '#1DB954',

  saveToHistory: true,
  creditsPerUse: 1,
  requiresPayment: false,
  isPremium: false,

  handler: async ({ transcript, playText, setActiveModal, companyId }) => {
  try {
    const queryMatch = transcript?.match(
      /(?:tocar|reproduzir|ouvir|escutar|coloca|toca)\s+(?:uma\s+)?(?:musica|música)\s+(?:de|do|da|sobre)?\s*(.+)/i
    ) || transcript?.match(
      /(?:quero ouvir|quero escutar)\s+(.+)/i
    );

    const query = queryMatch ? queryMatch[1].trim() : transcript?.trim() || '';

    if (!query) {
      playText('Qual música você quer ouvir? Me diga o estilo ou artista.').catch(() => {});
      return false;
    }

    setActiveModal?.({
      type: 'TocarMusicaDisplay',
      data: { companyId, query },
    });

    // ✅ fire-and-forget — não bloqueia o assistente
    playText('Buscando música...').catch(() => {});
    return true;

  } catch (error) {
    console.error('Erro tocar_musica:', error);
    return false;
  }
 },
},

tocar_video: {
  functionKey: 'tocar_video',
  functionName: 'Tocar Vídeo',
  category: 'video',
  responseType: 'voice+modal',

  voiceTriggers: [
    'tocar video',
    'tocar vídeo',
    'assistir video',
    'assistir vídeo',
    'reproduzir video',
    'reproduzir vídeo',
    'buscar video',
    'buscar vídeo',
    'tocar video de',
    'tocar vídeo de',
    'assistir video de',
    'assistir vídeo de',
    'me mostra um video',
    'me mostra um vídeo',
    'quero ver um video',
    'quero ver um vídeo',
  ],

  examplePhrases: [
    'Tocar vídeo de yoga',
    'Assistir receita de bolo',
    'Me mostra um vídeo de meditação',
  ],

  edgeFunction: 'tocar-video',
  requiresInput: true,
  inputType: 'text',
  inputPrompt: 'Qual vídeo você quer assistir?',

  description: 'Busca e reproduz vídeos do YouTube por comando de voz.',
  shortDescription: 'Reproduz vídeos do YouTube por voz.',
  icon: '🎥',
  color: '#FF0000',

  saveToHistory: true,
  creditsPerUse: 1,
  requiresPayment: false,
  isPremium: false,

  handler: async ({ transcript, playText, setActiveModal, companyId }) => {
    try {
      // Extrair o tema do vídeo do transcript
      const queryMatch = transcript?.match(
        /(?:tocar|assistir|reproduzir|buscar|ver|mostra|quero ver)\s+(?:video|vídeo)\s+(?:de|do|da|sobre)?\s*(.+)/i
      ) || transcript?.match(
        /(?:me mostra|quero ver)\s+(?:um\s+)?(?:video|vídeo)\s+(?:de|do|da|sobre)?\s*(.+)/i
      );

      const query = queryMatch ? queryMatch[1].trim() : transcript?.trim() || '';

      if (!query) {
        await playText('Qual vídeo você quer assistir? Me diga o assunto.');
        return false;
      }

      setActiveModal?.({
        type: 'TocarVideoDisplay',
        data: { companyId, query },
      });

      await playText(`Buscando vídeo sobre ${query}...`);
      return true;
    } catch (error) {
      console.error('Erro tocar_video:', error);
      await playText('Não consegui buscar o vídeo. Tente novamente.');
      return false;
    }
  },
},

duplicar_imagem: {
  functionKey: 'duplicar_imagem',
  functionName: 'Duplicar Imagem',
  category: 'tools' as any,
  responseType: 'voice+modal',
  
  voiceTriggers: [
    'duplicar imagem', 'fazer copias', 'grid de imagens',
    'impressao a4', 'layout a4', 'varias copias',
    'imprimir multiplas', 'grid 3x3', 'grid 2x2',
    'duplicar foto', 'copiar imagem'
  ],
  
  examplePhrases: [
    'Duplicar imagem em grid',
    'Criar layout A4',
    'Fazer múltiplas cópias'
  ],
  
  edgeFunction: undefined,
  uiComponent: 'DuplicarImagemDisplay',
  requiresInput: false,
  description: 'Cria múltiplas cópias da mesma imagem em layout otimizado para impressão em A4.',
  icon: '🌐',
  color: '#000080',
  saveToHistory: true,
  creditsPerUse: 2,
  requiresPayment: false,
  isPremium: false,
  
  handler: async ({ companyId, setActiveModal }) => {
    setActiveModal?.({ type: 'DuplicarImagemDisplay', data: { companyId } });
    return true;
  },
},
  
fichas_producao_conversacional: {
  functionKey: 'fichas_producao_conversacional',
  functionName: 'Fichas de Produção Conversacional',
  category: 'services',
  responseType: 'voice+modal',

  voiceTriggers: [
    'criar ficha conversando',
    'auxiliar de produção',
    'asssistente de produção',
    'criar receita conversando',
    'ficha conversacional',
    'conversar para criar receita',
    'criar ficha falando',
    'criar receita falando',
    'nova ficha conversando',
  ],

  examplePhrases: [
    'Criar ficha conversando',
    'Conversar para criar receita',
    'Criar ficha falando com o assistente',
  ],

  requiresInput: false,

  description: 'Crie fichas de produção conversando naturalmente com o assistente de voz. Basta descrever sua receita e o sistema estrutura automaticamente.',
  shortDescription: 'Criar ficha de produção por conversa',
  icon: '💬',
  color: '#667eea',

  saveToHistory: true,
  creditsPerUse: 5,
  requiresPayment: true,
  isPremium: true,

  handler: async ({ playText, setActiveModal, companyId, transcript }) => {
    try {
      // Detectar tipo de ficha pelo transcript (produto ou preparo)
      const lowerTranscript = transcript?.toLowerCase() ?? '';
      const fichaType = lowerTranscript.includes('preparo') ? 'preparo' : 'produto';

      setActiveModal?.({
        type: 'FichaProducaoConversacionalDisplay',
        data: { companyId, fichaType },
      });

      return true;
    } catch (error) {
      console.error('💬 [FICHAS CONVERSACIONAL] ERRO:', error);
      await playText('Não consegui abrir o modo conversacional.');
      return false;
    }
  },
},


// ============================================================
// CATEGORIA: ENVIAR ARQUIVOS
// ============================================================

enviar_arquivo: {
  functionKey: 'enviar_arquivo',
  functionName: 'Enviar Arquivo',
  category: 'images',
  responseType: 'voice+modal',

  voiceTriggers: [
    'enviar arquivo',
    'mandar arquivo',
    'envie arquivo',
    'mande arquivo',
    'enviar documento',
    'mandar documento',
    'enviar pdf',
    'mandar pdf',
    'subir arquivo',
    'upload de arquivo',
    'quero enviar arquivo',
    'receber arquivo',
  ],

  examplePhrases: [
    'Enviar um arquivo',
    'Quero mandar um documento',
    'Enviar PDF pelo celular',
  ],

  requiresInput: false,

  description: 'Recebe arquivos enviados pelo celular via QR Code ou selecionados localmente. Imagens, PDFs, planilhas e documentos.',
  shortDescription: 'Receba arquivos do celular ou upload local.',
  icon: '🌐',
  color: '#000080',

  saveToHistory: true,
  creditsPerUse: 1,
  requiresPayment: false,
  isPremium: false,

  handler: async ({ playText, setActiveModal, companyId }) => {
    try {
      setActiveModal?.({
        type: 'EnviarArquivoDisplay',
        data: { companyId },
      });
      await playText('Abrindo envio de arquivo. Diga "celular" para escanear o QR Code ou "arquivo" para selecionar do computador.');
      return true;
    } catch (error) {
      console.error('📁 [ENVIAR ARQUIVO] ERRO:', error);
      await playText('Desculpe, não consegui abrir o envio de arquivo.');
      return false;
    }
  },
},

gerar_qrcode: {
  functionKey: 'gerar_qrcode',
  functionName: 'Gerar QR Code',
  category: 'images',
  responseType: 'voice+modal',

  voiceTriggers: [
    'gerar qr code',
    'criar qr code',
    'gerar qrcode',
    'criar qrcode',
    'qr code',
    'qrcode',
    'gerar qr',
    'criar qr',
    'fazer qr code',
    'montar qr code',
    'transformar em qr',
    'converter para qr',
  ],

  examplePhrases: [
    'Gerar QR Code de um link',
    'Criar QR Code com meu site',
    'Converter texto em QR Code',
  ],

  requiresInput: false,

  description: 'Gera QR Code a partir de qualquer texto ou URL. Resultado pode ser baixado em PNG ou enviado por email.',
  shortDescription: 'Converta texto ou link em QR Code.',
  icon: '🌐',
  color: '#000080',

  saveToHistory: true,
  creditsPerUse: 1,
  requiresPayment: false,
  isPremium: false,

  handler: async ({ playText, setActiveModal, companyId }) => {
    try {
      setActiveModal?.({
        type: 'GerarQRCodeDisplay',
        data: { companyId },
      });
      await playText('Abrindo gerador de QR Code. Diga ou digite o texto ou link.');
      return true;
    } catch (error) {
      console.error('🔲 [GERAR QR CODE] ERRO:', error);
      await playText('Desculpe, não consegui abrir o gerador de QR Code.');
      return false;
    }
  },
},

gerar_codigo_barras: {
  functionKey: 'gerar_codigo_barras',
  functionName: 'Gerar Código de Barras',
  category: 'images',
  responseType: 'voice+modal',

  voiceTriggers: [
    'gerar codigo de barras',
    'criar codigo de barras',
    'codigo de barras',
    'gerar barcode',
    'criar barcode',
    'barcode',
    'fazer codigo de barras',
    'montar codigo de barras',
    'gerar ean',
    'gerar ean 13',
    'gerar code 128',
    'gerar code 39',
  ],

  examplePhrases: [
    'Gerar código de barras EAN-13',
    'Criar barcode do produto',
    'Código de barras Code 128',
  ],

  requiresInput: false,

  description: 'Gera código de barras nos formatos Code 128, EAN-13 ou Code 39. Resultado pode ser baixado em PNG ou enviado por email.',
  shortDescription: 'Gere códigos de barras EAN-13, Code 128 ou Code 39.',
  icon: '🌐',
  color: '#000080',

  saveToHistory: true,
  creditsPerUse: 1,
  requiresPayment: false,
  isPremium: false,

  handler: async ({ playText, setActiveModal, companyId }) => {
    try {
      setActiveModal?.({
        type: 'GerarCodigoBarrasDisplay',
        data: { companyId },
      });
      await playText('Abrindo gerador de código de barras. Escolha o formato e diga o conteúdo.');
      return true;
    } catch (error) {
      console.error('📊 [GERAR CÓDIGO DE BARRAS] ERRO:', error);
      await playText('Desculpe, não consegui abrir o gerador de código de barras.');
      return false;
    }
  },
},

// ============================================================
// CATEGORIA: AGENDAMENTOS (schedule)
// ============================================================

confirmar_presenca: {
  functionKey: 'confirmar_presenca',
  functionName: 'Confirmar Presença',
  category: 'schedule',
  description: 'Confirma presença em agendamento marcado',
  shortDescription: 'Confirmar presença',
  icon: '✅',
  color: '#10B981',
  
  voiceTriggers: [
    'confirmar presença',
    'confirmar agendamento',
    'confirmar horário',
    'estou confirmado',
    'vou comparecer',
    'confirmar consulta',
  ],
  
  examplePhrases: [
    'Confirmar presença no agendamento',
    'Quero confirmar minha consulta',
    'Confirmar horário marcado',
  ],
  
  creditsPerUse: 1,
  responseType: 'modal',
  uiComponent: 'ConfirmPresenceModal',
  requiresInput: false,
  
  saveToHistory: true,
  requiresPayment: false,
  isPremium: false,
  
  handler: async ({ 
    transcript,
    playText, 
    setActiveModal, 
    companyId 
  }) => {
    try {
      console.log('✅ [CONFIRMAR PRESENÇA] Abrindo modal');
      
      if (setActiveModal) {
        setActiveModal({
          type: 'ConfirmPresenceModal',
          data: { 
            companyId,
            transcript 
          }
        });
      }
      
      await playText('Vou buscar seu agendamento para confirmar presença.');
      
      return true;
      
    } catch (error) {
      console.error('✅ [CONFIRMAR PRESENÇA] ERRO:', error);
      await playText('Desculpe, não consegui buscar seu agendamento.');
      return false;
    }
  }
},

reagendar_compromisso: {
  functionKey: 'reagendar_compromisso',
  functionName: 'Reagendamento',
  category: 'schedule',
  description: 'Reagenda compromisso para nova data e horário',
  shortDescription: 'Reagendar compromisso',
  icon: '🔄',
  color: '#3B82F6',
  
  voiceTriggers: [
    'reagendar',
    'reagendar compromisso',
    'reagendamento',
    'remarcar',
    'mudar data',
    'mudar horário',
    'trocar dia',
    'desmarcar e marcar',
    'mudar agendamento',
  ],
  
  examplePhrases: [
    'Preciso reagendar minha consulta',
    'Remarcar para outro dia',
    'Mudar horário do agendamento',
  ],
  
  creditsPerUse: 2,
  responseType: 'modal',
  uiComponent: 'RescheduleModal',
  requiresInput: false,
  
  saveToHistory: true,
  requiresPayment: false,
  isPremium: false,
  
  handler: async ({ 
    transcript,
    playText, 
    setActiveModal, 
    companyId 
  }) => {
    try {
      console.log('🔄 [REAGENDAMENTO] Abrindo modal');
      
      if (setActiveModal) {
        setActiveModal({
          type: 'RescheduleModal',
          data: { 
            companyId,
            transcript 
          }
        });
      }
      
      await playText('Vou buscar seu agendamento para reagendar.');
      
      return true;
      
    } catch (error) {
      console.error('🔄 [REAGENDAMENTO] ERRO:', error);
      await playText('Desculpe, não consegui acessar seu agendamento.');
      return false;
    }
  }
},

cancelar_agendamento: {
  functionKey: 'cancelar_agendamento',
  functionName: 'Cancelar Agendamento',
  category: 'schedule',
  description: 'Cancela agendamento marcado',
  shortDescription: 'Cancelar agendamento',
  icon: '❌',
  color: '#EF4444',
  
  voiceTriggers: [
    'cancelar agendamento',
    'cancelar consulta',
    'desmarcar',
    'não vou comparecer',
    'não posso ir',
    'cancelar horário',
  ],
  
  examplePhrases: [
    'Cancelar meu agendamento',
    'Desmarcar consulta',
    'Não poderei comparecer',
  ],
  
  creditsPerUse: 1,
  responseType: 'modal',
  uiComponent: 'CancelAppointmentModal',
  requiresInput: false,
  
  saveToHistory: true,
  requiresPayment: false,
  isPremium: false,
  
  handler: async ({ 
    transcript,
    playText, 
    setActiveModal, 
    companyId 
  }) => {
    try {
      console.log('❌ [CANCELAR AGENDAMENTO] Abrindo modal');
      
      if (setActiveModal) {
        setActiveModal({
          type: 'CancelAppointmentModal',
          data: { 
            companyId,
            transcript 
          }
        });
      }
      
      await playText('Vou buscar seu agendamento para cancelar.');
      
      return true;
      
    } catch (error) {
      console.error('❌ [CANCELAR AGENDAMENTO] ERRO:', error);
      await playText('Desculpe, não consegui acessar seu agendamento.');
      return false;
    }
  }
},

horarios_disponiveis: {
  functionKey: 'horarios_disponiveis',
  functionName: 'Horários Disponíveis',
  category: 'schedule',
  description: 'Consulta horários disponíveis na agenda',
  shortDescription: 'Consultar disponibilidade',
  icon: '🕐',
  color: '#8B5CF6',
  
  voiceTriggers: [
    // ══════════════════════════════════════════════════════
    // VERIFICAR DISPONIBILIDADE (está livre?)
    // ══════════════════════════════════════════════════════
    'tem horário',
    'tem horario',
    'horário disponível',
    'horario disponivel',
    'horários disponíveis',
    'horarios disponiveis',
    'está disponível',
    'esta disponivel',
    'horário livre',
    'horario livre',
    'horário vago',
    'horario vago',
    'tem vaga',
    'tem hora',
    'consultar agenda',
    'ver disponibilidade',
    'verificar disponibilidade',
    'checar disponibilidade',
    'está livre',
    'esta livre',
    'está vago',
    'esta vago',
    'posso marcar',
    'dá para marcar',
    'da para marcar',
    
    // ── COM PALAVRAS TEMPORAIS (disponibilidade) ──────────
    'horário hoje',
    'horario hoje',
    'disponível hoje',
    'disponivel hoje',
    'tem hoje',
    'vaga hoje',
    'livre hoje',
    'vago hoje',
    
    'horário amanhã',
    'horario amanha',
    'disponível amanhã',
    'disponivel amanha',
    'tem amanhã',
    'tem amanha',
    'vaga amanhã',
    'vaga amanha',
    'livre amanhã',
    'livre amanha',
    
    // ── COM PERGUNTAS (disponibilidade) ───────────────────
    'qual horário',
    'qual horario',
    'quais horários',
    'quais horarios',
    'que horas',
    'que horário',
    'que horario',
    
    // ── COM DIA/DATA (disponibilidade) ────────────────────
    'horário dia',
    'horario dia',
    'disponível dia',
    'disponivel dia',
    'tem no dia',
    'vaga no dia',
    'livre no dia',
    'vago no dia',
    
    // ── FRASES COMPLETAS (disponibilidade) ────────────────
    'tem algum horário',
    'tem algum horario',
    'algum horário disponível',
    'algum horario disponivel',
    'alguma vaga',
    'algum horário livre',
    'algum horario livre',
    
    // ══════════════════════════════════════════════════════
    // VERIFICAR O QUE ESTÁ MARCADO (o que tem agendado?)
    // ══════════════════════════════════════════════════════
    'tem algo marcado',
    'tem alguma coisa marcada',
    'o que está marcado',
    'o que esta marcado',
    'o que tem marcado',
    'que está marcado',
    'que esta marcado',
    'que tem marcado',
    
    'tem agendamento',
    'tem algum agendamento',
    'tem compromisso',
    'tem algum compromisso',
    'tem consulta',
    'tem alguma consulta',
    
    'já tem algo',
    'ja tem algo',
    'já está marcado',
    'ja esta marcado',
    'já tem marcado',
    'ja tem marcado',
    
    'quem está agendado',
    'quem esta agendado',
    'quem tem agendado',
    'quantos agendamentos',
    'quantas marcações',
    'quantos compromissos',
    
    // ── COM PALAVRAS TEMPORAIS (o que está marcado) ───────
    'marcado hoje',
    'agendado hoje',
    'compromisso hoje',
    'agendamento hoje',
    
    'marcado amanhã',
    'marcado amanha',
    'agendado amanhã',
    'agendado amanha',
    'compromisso amanhã',
    'compromisso amanha',
    
    // ── COM DIA/DATA (o que está marcado) ─────────────────
    'marcado dia',
    'agendado dia',
    'compromisso dia',
    'agendamento dia',
    'algo no dia',
    
    // ── COM HORÁRIO (o que está marcado) ──────────────────
    'marcado às',
    'marcado as',
    'agendado às',
    'agendado as',
    'compromisso às',
    'compromisso as',
    
    // ── COM PERÍODO (o que está marcado) ──────────────────
    'marcado de manhã',
    'marcado de manha',
    'agendado de manhã',
    'agendado de manha',
    'marcado de tarde',
    'agendado de tarde',
    'marcado de noite',
    'agendado de noite',
  ],
  
  examplePhrases: [
    'Tem horário disponível amanhã às 14h?',
    'Está vago dia 15 às 10h?',
    'Tem algo marcado dia 12?',
    'O que está marcado hoje?',
    'Tem compromisso às 13h do dia 25?',
    'Quantos agendamentos tem amanhã?',
  ],
  
  creditsPerUse: 1,
  responseType: 'voice',
  requiresInput: false,
  
  saveToHistory: true,
  requiresPayment: false,
  isPremium: false,
  
  handler: async ({ 
    transcript,
    playText, 
    setActiveModal,
    companyId 
  }) => {
    try {
      console.log('🕐 [HORÁRIOS DISPONÍVEIS] Consultando disponibilidade...');
      
      // Chamar Edge Function
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/consultar-disponibilidade`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            company_id: companyId,
            user_input: transcript,
          }),
        }
      );
      
      if (!response.ok) {
        throw new Error('Erro na requisição');
      }
      
      const result = await response.json();
      
      if (result.success) {
        // ✅ A Edge Function já retorna o speech_text correto baseado na intenção
        
        if (result.intent === 'check_scheduled') {
          // Cliente perguntou O QUE ESTÁ MARCADO
          await playText(result.speech_text);
          
          // Se houver agendamentos, pode oferecer ver detalhes
          if (!result.available && result.appointment_count > 0) {
            await playText('Quer ver os detalhes na agenda? Diga "ver agenda".');
          }
          
        } else {
          // Cliente perguntou DISPONIBILIDADE
          if (result.available) {
            // DISPONÍVEL
            await playText(
              `${result.speech_text} Quer que eu marque agora ou prefere ver a agenda completa? ` +
              `Diga "marcar agora" para agendar ou "ver agenda" para visualizar.`
            );
            
            if (typeof window !== 'undefined') {
              (window as any).eAi_lastAvailabilityCheck = {
                available: true,
                date: result.date,
                time: result.time,
                transcript: transcript,
              };
            }
            
          } else {
            // OCUPADO
            await playText(
              `${result.speech_text} Quer ver a agenda para escolher outro horário? ` +
              `Diga "ver agenda" para visualizar.`
            );
            
            if (typeof window !== 'undefined') {
              (window as any).eAi_lastAvailabilityCheck = {
                available: false,
                date: result.date,
                time: result.time,
                transcript: transcript,
                existing_appointments: result.existing_appointments,
              };
            }
          }
        }
        
        return true;
      } else {
        await playText(result.speech_text || 'Não consegui consultar a disponibilidade.');
        return false;
      }
      
    } catch (error) {
      console.error('🕐 [HORÁRIOS DISPONÍVEIS] ERRO:', error);
      await playText('Desculpe, não consegui consultar os horários. Tente novamente.');
      return false;
    }
  }
},

minha_conta: {
  functionKey: 'minha_conta',
  functionName: 'Minha Conta',
  category: 'biometry',
  responseType: 'voice+modal',
  voiceTriggers: ['minha conta','fazer login','entrar','login','criar conta','meu perfil'],
  examplePhrases: ['Fazer login', 'Minha conta', 'Criar conta'],
  requiresInput: false,
  description: 'Login e cadastro de clientes',
  saveToHistory: false,
  creditsPerUse: 0,
  requiresPayment: false,
  isPremium: false,
  handler: async ({ playText, setActiveModal, companyId, functionSettings }) => {
    setActiveModal?.({
      type: 'LoginClienteDisplay',
      data: { companyId, slug: window.location.hostname.split('.')[0] },
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

lista_compras: {
  functionKey: 'lista_compras',
  functionName: 'Lista de Compras',
  category: 'utylities',
  icon: '🛒',
  color: '#10B981',
  voiceTriggers: [
    'lista de compras',
    'lista compras',
    'fazer lista',
    'criar lista',
    'minha lista',
    'abrir lista',
    'lista do mercado',
    'ir ao mercado',
    'compras',
  ],
  examplePhrases: [
    'Fazer lista de compras',
    'Adicionar leite na lista',
    'Abrir minha lista',
  ],
  creditsPerUse: 1,
  requiresPayment: false,
  isPremium: false,
  saveToHistory: true,
  handler: async ({ playText, setActiveModal, companyId }) => {
    try {
      setActiveModal?.({ type: 'ListaComprasDisplay', data: { companyId } });
      return true;
    } catch {
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
    // ✅ ADICIONAR TRIGGERS DE FOLLOW-UP
    'marcar agora',
    'marcar sim',
    'pode marcar',
    'quero marcar',
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
  creditsPerUse: 2, // ← Crédito só cobrado ao criar evento
  requiresPayment: false,
  isPremium: false,
  
  handler: async ({ transcript, playText, setActiveModal, companyId }) => {
    try {
      console.log('📅 [MARCAR EVENTO] Processando comando');
      
      // ✅ VERIFICAR SE É UM FOLLOW-UP DE CONSULTA DE DISPONIBILIDADE
      const lastCheck = typeof window !== 'undefined' 
        ? (window as any).eAi_lastAvailabilityCheck 
        : null;
      
      const isFollowUp = transcript && (
        transcript.includes('marcar agora') ||
        transcript.includes('marcar sim') ||
        transcript.includes('pode marcar') ||
        transcript.includes('quero marcar')
      );
      
      // Se for follow-up E tiver contexto disponível
      if (isFollowUp && lastCheck?.available) {
        console.log('📅 [MARCAR EVENTO] Follow-up detectado - usando dados da consulta');
        
        if (setActiveModal) {
          setActiveModal({
            type: 'CreateEventModal',
            data: {
              companyId,
              prefilledData: {
                date: lastCheck.date ? new Date(lastCheck.date) : undefined,
                time: lastCheck.time || undefined,
              }
            }
          });
        }
        
        await playText('Perfeito! Confirme o horário e me diga seu nome para finalizar o agendamento.');
        
        // Limpar contexto
        if (typeof window !== 'undefined') {
          delete (window as any).eAi_lastAvailabilityCheck;
        }
        
        return true;
      }
      
      // ✅ FLUXO NORMAL (não é follow-up)
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
      
      // ==================== ABRIR MODAL ====================
      if (setActiveModal) {
        setActiveModal({ 
          type: 'CreateEventModal', 
          data: { 
            companyId,
            prefilledData: extractedData
          } 
        });
      }
      
      const hasAllRequiredData = extractedData.date && extractedData.time && extractedData.name;
      
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

// ── Ler QR Code ──────────────────────────────────────────────
ler_qrcode: {
  functionKey: 'ler_qrcode',
  functionName: 'Ler QR Code',
  category: 'codes',
  responseType: 'voice+modal',
  voiceTriggers: ['ler qr code', 'ler qr', 'escanear qr', 'escanear qrcode', 'ler codigo qr', 'ler qrcode'],
  examplePhrases: ['Ler QR Code', 'Escanear QR Code'],
  requiresInput: false,
  description: 'Lê e decodifica QR Codes usando a câmera do dispositivo.',
  shortDescription: 'Ler QR Code pela câmera',
  icon: '📷', color: '#6366F1',
  saveToHistory: true, creditsPerUse: 1, requiresPayment: false, isPremium: false,
  handler: async ({ playText, setActiveModal, companyId }) => {
    try { setActiveModal?.({ type: 'LerQRCodeDisplay', data: { companyId } }); await playText('Abrindo leitura de QR Code.'); return true; }
    catch { return false; }
  },
},

// ── Ler Código de Barras ──────────────────────────────────────
ler_codigo_barras: {
  functionKey: 'ler_codigo_barras',
  functionName: 'Ler Código de Barras',
  category: 'codes',
  responseType: 'voice+modal',
  voiceTriggers: ['ler codigo de barras', 'ler código de barras', 'escanear codigo de barras', 'escanear código de barras', 'ler barcode'],
  examplePhrases: ['Ler código de barras', 'Escanear código de barras'],
  requiresInput: false,
  description: 'Lê e decodifica códigos de barras usando a câmera do dispositivo.',
  shortDescription: 'Ler código de barras pela câmera',
  icon: '📊', color: '#3B82F6',
  saveToHistory: true, creditsPerUse: 1, requiresPayment: false, isPremium: false,
  handler: async ({ playText, setActiveModal, companyId }) => {
    try { setActiveModal?.({ type: 'LerCodigoBarrasDisplay', data: { companyId } }); await playText('Abrindo leitura de código de barras.'); return true; }
    catch { return false; }
  },
},

meu_cupom: {
  functionKey: 'meu_cupom',
  functionName: 'Meu Cupom',
  category: 'codes',
  responseType: 'voice+modal',
  voiceTriggers: [
    'meu cupom',
    'gerar cupom',
    'quero um cupom',
    'cupom de desconto',
    'cupom de indicação',
    'cupom de indicacao',
    'gerar meu cupom',
  ],
  examplePhrases: [
    'Gerar meu cupom de indicação',
    'Quero um cupom de desconto',
    'Me gera um cupom',
  ],
  requiresInput: false,
  description: 'Gera um cupom de indicação personalizado com QR Code para compartilhar.',
  shortDescription: 'Gerar cupom de indicação',
  icon: '🎟️',
  color: '#3B82F6',
  saveToHistory: true,
  creditsPerUse: 1,
  requiresPayment: false,
  isPremium: false,
handler: async ({ transcript, playText, setActiveModal, companyId }) => {
  try {
    let prefillName = '';
    const nameMatch = transcript?.match(
      /(?:para|de|do|da|nome|chamado|chama)\s+([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú]?[a-zà-ú]+)*)/i
    );
    if (nameMatch) prefillName = nameMatch[1].trim();

    setActiveModal?.({
      type: 'MeuCupomDisplay',
      data: { companyId, prefillName },
    });
    await playText(
      prefillName
        ? `Encontrei o nome ${prefillName}. Confirme e gere seu cupom.`
        : 'Digite seu nome para gerar seu cupom de indicação.'
    );
    return true;
  } catch {
    return false;
  }
},
},

// ── Validar Cupom ─────────────────────────────────────────────
validar_cupom: {
  functionKey: 'validar_cupom',
  functionName: 'Validar Cupom',
  category: 'codes',
  responseType: 'voice+modal',
  voiceTriggers: ['validar cupom', 'valida cupom', 'validar voucher', 'valida voucher', 'verificar cupom', 'verifica cupom'],
  examplePhrases: ['Validar cupom', 'Verificar cupom de desconto'],
  requiresInput: false,
  description: 'Fotografa e valida cupons de desconto verificando no banco de dados.',
  shortDescription: 'Validar cupom por câmera',
  icon: '🎟️', color: '#10B981',
  saveToHistory: true, creditsPerUse: 2, requiresPayment: false, isPremium: false,
  handler: async ({ playText, setActiveModal, companyId }) => {
    try { setActiveModal?.({ type: 'ValidarCupomDisplay', data: { companyId } }); await playText('Abrindo validação de cupom.'); return true; }
    catch { return false; }
  },
},

// ── Imagem em Texto (OCR) ─────────────────────────────────────
imagem_em_texto: {
  functionKey: 'imagem_em_texto',
  functionName: 'Imagem em Texto',
  category: 'codes',
  responseType: 'voice+modal',
  voiceTriggers: ['imagem em texto', 'extrair texto', 'ocr', 'digitalizar imagem', 'texto da imagem', 'extraia texto'],
  examplePhrases: ['Extrair texto de imagem', 'Digitalizar documento'],
  requiresInput: false,
  description: 'Extrai texto de imagens e documentos usando visão computacional.',
  shortDescription: 'Extrair texto de imagem',
  icon: '📝', color: '#F59E0B',
  saveToHistory: true, creditsPerUse: 3, requiresPayment: false, isPremium: false,
  handler: async ({ playText, setActiveModal, companyId }) => {
    try { setActiveModal?.({ type: 'ImagemEmTextoDisplay', data: { companyId } }); await playText('Abrindo extração de texto.'); return true; }
    catch { return false; }
  },
},

// ── Tabela em Texto ───────────────────────────────────────────
tabela_em_texto: {
  functionKey: 'tabela_em_texto',
  functionName: 'Tabela em Texto',
  category: 'codes',
  responseType: 'voice+modal',
  voiceTriggers: ['tabela em texto', 'converter tabela', 'digitalizar tabela', 'tabela para csv', 'extrair tabela', 'extrai tabela'],
  examplePhrases: ['Converter tabela para texto', 'Digitalizar planilha'],
  requiresInput: false,
  description: 'Converte tabelas fotografadas em CSV editável usando visão computacional.',
  shortDescription: 'Converter tabela para CSV',
  icon: '📋', color: '#8B5CF6',
  saveToHistory: true, creditsPerUse: 3, requiresPayment: false, isPremium: false,
  handler: async ({ playText, setActiveModal, companyId }) => {
    try { setActiveModal?.({ type: 'TabelaEmTextoDisplay', data: { companyId } }); await playText('Abrindo conversor de tabela.'); return true; }
    catch { return false; }
  },
},

// ── Contrato em Texto ─────────────────────────────────────────
contrato_em_texto: {
  functionKey: 'contrato_em_texto',
  functionName: 'Contrato em Texto',
  category: 'codes',
  responseType: 'voice+modal',
  voiceTriggers: ['contrato em texto', 'digitalizar contrato', 'digitaliza contrato', 'extrair contrato', 'ler contrato', 'extrai contrato'],
  examplePhrases: ['Digitalizar contrato', 'Extrair texto de contrato'],
  requiresInput: false,
  description: 'Digitaliza contratos e documentos jurídicos extraindo dados estruturados.',
  shortDescription: 'Digitalizar contrato',
  icon: '📄', color: '#EF4444',
  saveToHistory: true, creditsPerUse: 5, requiresPayment: false, isPremium: false,
  handler: async ({ playText, setActiveModal, companyId }) => {
    try { setActiveModal?.({ type: 'ContratoEmTextoDisplay', data: { companyId } }); await playText('Abrindo digitalização de contrato.'); return true; }
    catch { return false; }
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
    // ✅ ADICIONAR TRIGGERS DE FOLLOW-UP
    'visualizar agenda',
    'quero ver',
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
  isPremium: false,
  
  handler: async ({ transcript, playText, setActiveModal, companyId }) => {
    try {
      console.log('📆 [VER AGENDA] Abrindo modal');
      
      // ✅ VERIFICAR SE É UM FOLLOW-UP DE CONSULTA DE DISPONIBILIDADE
      const lastCheck = typeof window !== 'undefined' 
        ? (window as any).eAi_lastAvailabilityCheck 
        : null;
      
      const isFollowUp = transcript && (
        transcript.includes('ver agenda') ||
        transcript.includes('mostrar agenda') ||
        transcript.includes('visualizar')
      );
      
      // Se for follow-up E tiver contexto
      if (isFollowUp && lastCheck) {
        console.log('📆 [VER AGENDA] Follow-up detectado - abrindo na data consultada');
        
        if (setActiveModal) {
          setActiveModal({
            type: 'ViewAgendaModal',
            data: {
              companyId,
              initialView: 'day',
              initialDate: lastCheck.date || undefined,
            }
          });
        }
        
        await playText(
          lastCheck.date 
            ? 'Abrindo a agenda do dia consultado. Você pode navegar para outros dias se preferir.'
            : 'Abrindo a agenda.'
        );
        
        // Limpar contexto
        if (typeof window !== 'undefined') {
          delete (window as any).eAi_lastAvailabilityCheck;
        }
        
        return true;
      }
      
      // ✅ FLUXO NORMAL (não é follow-up)
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

playlist: {
  functionKey: 'playlist',
  functionName: 'Playlist',
  category: 'video',
  responseType: 'voice+modal',
  voiceTriggers: ['playlist', 'tocar playlist', 'minha playlist', 'abrir playlist', 'tocar lista', 'lista de videos', 'lista de músicas', 'lista de musicas'],
  examplePhrases: ['Tocar playlist', 'Minha playlist de músicas', 'Abrir lista de vídeos'],
  edgeFunction: 'playlist-items',
  requiresInput: false,
  description: 'Reproduz playlists do YouTube configuradas com navegação por voz.',
  shortDescription: 'Toca playlists de vídeo ou música.',
  icon: '📚', color: '#FF0000',
  saveToHistory: true, creditsPerUse: 1, requiresPayment: false, isPremium: false,
  handler: async ({ playText, setActiveModal, companyId }) => {
    try {
      setActiveModal?.({ type: 'PlaylistDisplay', data: { companyId } });
      playText('Abrindo playlist...').catch(() => {});
      return true;
    } catch { return false; }
  },
},

segunda_via_boleto: {
  functionKey:     'segunda_via_boleto',
  functionName:    'Segunda Via Boleto',
  category:        'finance' as any,
  responseType:    'voice+modal',
 
  voiceTriggers: [
    'segunda via',
    'segunda via boleto',
    'boleto perdido',
    'reimprimir boleto',
    'codigo do boleto',
  ],
  examplePhrases: [
    'Segunda via do boleto',
    'Gerar boleto',
    'Perdi meu boleto',
  ],
 
  edgeFunction:    undefined,   // 100% frontend — sem edge
  uiComponent:     'SegundaViaBoletoDisplay',
  requiresInput:   false,
  description:     'Gera segunda via de boleto a partir da linha digitável. Produz PDF com código de barras.',
  icon:            '🧾',
  color:           '#6366f1',
  saveToHistory:   true,
  creditsPerUse:   1,
  requiresPayment: false,
  isPremium:       false,
 
  handler: async ({ companyId, setActiveModal }) => {
    setActiveModal?.({
      type: 'SegundaViaBoletoDisplay',
      data: { companyId },
    });
    // SEM playText aqui — o modal fala no useEffect de mount
    return true;
  },
},

traduzir_texto: {
  functionKey: 'traduzir_texto',
  functionName: 'Traduzir Texto',
  category: 'ai_assistant',
  description: 'Traduz textos entre idiomas usando IA',
  shortDescription: 'Traduzir para outro idioma',
  icon: '🔵',
  color: '#0000ff',
  
  voiceTriggers: [
    'traduzir',
    'traduz',
    'tradução',
    'traducao',
    'traduzir texto',
    'traduzir para',
    'como se diz',
    'traduzir isso',
  ],
  
  examplePhrases: [
    'Traduzir para inglês',
    'Traduzir este texto para espanhol',
    'Como se diz isso em francês?',
  ],
  
  creditsPerUse: 2,
  responseType: 'modal',
  uiComponent: 'TranslateTextModal',
  requiresInput: false,
  
  saveToHistory: true,
  requiresPayment: false,
  isPremium: false,
  
  handler: async ({ playText, setActiveModal, companyId }) => {
    playText('Abrindo ferramenta de tradução. Fale ou digite o texto que deseja traduzir.');
    setActiveModal({ type: 'TranslateTextModal', data: { companyId } });
    return true;
  }
},

transcrever_audio: {
  functionKey: 'transcrever_audio',
  functionName: 'Transcrever Áudio',
  category: 'ai_assistant',
  description: 'Transcreve áudios para texto escrito',
  shortDescription: 'Transcrever áudio para texto',
  icon: '🔵',
  color: '#0000ff',
  
  voiceTriggers: [
    'transcrever',
    'transcreve',
    'transcrição',
    'transcricao',
    'transcrever audio',
    'transcrever áudio',
    'áudio para texto',
    'audio para texto',
    'passar para texto',
  ],
  
  examplePhrases: [
    'Transcrever áudio',
    'Transcrever esta gravação',
    'Passar áudio para texto',
  ],
  
  creditsPerUse: 2,
  responseType: 'modal',
  uiComponent: 'TranscribeAudioModal',
  requiresInput: false,
  
  saveToHistory: true,
  requiresPayment: false,
  isPremium: false,
  
  handler: async ({ playText, setActiveModal, companyId }) => {
    playText('Abrindo ferramenta de transcrição. Fale ou grave o áudio que deseja transcrever.');
    setActiveModal({ type: 'TranscribeAudioModal', data: { companyId } });
    return true;
  }
},

porta_retrato: {
  functionKey: 'porta_retrato',
  functionName: 'Porta Retrato',
  category: 'video',
  responseType: 'voice+modal',
  voiceTriggers: ['porta retrato', 'mostrar fotos', 'album de fotos', 'álbum de fotos', 'slideshow', 'mostrar álbum', 'mostrar album', 'exibir fotos'],
  examplePhrases: ['Mostrar porta retrato', 'Abrir álbum de fotos', 'Slideshow de fotos'],
  edgeFunction: 'google-photos-list',
  requiresInput: false,
  description: 'Exibe slideshow de fotos do Google Photos com música opcional.',
  shortDescription: 'Slideshow de fotos do Google Photos.',
  icon: '🖼️', color: '#E91E63',
  saveToHistory: true, creditsPerUse: 1, requiresPayment: false, isPremium: false,
  handler: async ({ playText, setActiveModal, companyId }) => {
    try {
      setActiveModal?.({ type: 'PortaRetratoDisplay', data: { companyId } });
      playText('Abrindo porta retrato...').catch(() => {});
      return true;
    } catch { return false; }
  },
},

painel_ofertas: {
  functionKey: 'painel_ofertas',
  functionName: 'Painel de Ofertas',
  category: 'information',
  responseType: 'voice+modal',
  voiceTriggers: ['painel de ofertas', 'mostrar ofertas', 'promoções', 'promocoes', 'ofertas', 'ver ofertas', 'mostrar promoções', 'mostrar promocoes', 'painel ofertas'],
  examplePhrases: ['Mostrar ofertas', 'Ver promoções', 'Abrir painel de ofertas'],
  edgeFunction: 'google-drive-images',
  requiresInput: false,
  description: 'Exibe imagens de ofertas do Google Drive em slideshow fullscreen.',
  shortDescription: 'Slideshow de ofertas do Google Drive.',
  icon: '📢', color: '#FF6F00',
  saveToHistory: true, creditsPerUse: 1, requiresPayment: false, isPremium: false,
  handler: async ({ playText, setActiveModal, companyId }) => {
    try {
      setActiveModal?.({ type: 'PainelOfertasDisplay', data: { companyId } });
      playText('Abrindo painel de ofertas...').catch(() => {});
      return true;
    } catch { return false; }
  },
},

aparelhos_smart: {
  functionKey: 'aparelhos_smart',
  functionName: 'Aparelhos Smart',
  category: 'utylities',
  responseType: 'voice+modal',
  voiceTriggers: ['aparelhos smart', 'smart home', 'dispositivos smart', 'ligar luz', 'apagar luz', 'ligar ar', 'desligar ar', 'controlar dispositivos', 'meus aparelhos', 'aparelhos inteligentes', 'ligar televisão', 'ligar televisao', 'desligar televisão', 'desligar televisao'],
  examplePhrases: ['Ligar a luz', 'Desligar o ar condicionado', 'Mostrar aparelhos smart'],
  edgeFunction: 'smart-home-devices',
  requiresInput: false,
  description: 'Controla dispositivos Google Smart Home por voz.',
  shortDescription: 'Controla dispositivos Smart Home por voz.',
  icon: '🏠', color: '#4CAF50',
  saveToHistory: true, creditsPerUse: 1, requiresPayment: false, isPremium: false,
handler: async ({ transcript, playText, setActiveModal, companyId, functionParams }) => {
  try {
    // ── Headless: FAQ com comando direto (ex: "Ligar luz da sala") ──
    if (functionParams?.action === 'smart_home_command') {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/smart-home-devices`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token ?? ''}`,
          },
          body: JSON.stringify({
            action: 'command',
            company_id: companyId,             // <-- Corrigido para snake_case
            device_id: functionParams.device_id, // <-- Corrigido para snake_case
            command: functionParams.command,
            params: functionParams.params ?? {},
          }),
        }
      );

      if (!res.ok) {
        await playText('Não consegui executar o comando. Tente novamente.');
        return false;
      }

      // Fala a resposta da FAQ (se veio pelo clique do modal) ou silencia
      if (functionParams.answer) {
        await playText(functionParams.answer);
      }
      return true;
    }

    // ── Comportamento padrão: abre o modal ──
    setActiveModal?.({ type: 'AparelhosSmartDisplay', data: { companyId, transcript } });
    playText('Abrindo controle de dispositivos...').catch(() => {});
    return true;
  } catch { return false; }
},
},
  
cadastro: {
  functionKey: 'cadastro',
  functionName: 'Cadastro',
  category: 'biometry',
  responseType: 'voice+modal',
  description: 'Realiza cadastros por voz com campos configuráveis pelo operador.',
  examplePhrases: ['Fazer cadastro', 'Cadastrar cliente', 'Novo cadastro'],
  voiceTriggers: [
    'fazer cadastro', 'fazer o cadastro',
    'novo cadastro',
    'cadastrar cliente', 'cadastrar funcionario', 'cadastrar funcionário',
    'cadastrar morador', 'cadastrar empresa',
    'iniciar cadastro', 'quero me cadastrar',
  ],
  requiresInput: false,
  saveToHistory: true,
  creditsPerUse: 1,
  requiresPayment: false,
  isPremium: false,
  handler: async ({ playText, setActiveModal, companyId }) => {
    try {
      setActiveModal?.({ type: 'RegistrationDisplay', data: { companyId } });
      return true;
    } catch (error) {
      console.error('Erro ao abrir cadastro:', error);
      return false;
    }
  }
},

// ── Consultar Câmbio ──────────────────────────────────────────
consultar_cambio: {
  functionKey: 'consultar_cambio',
  functionName: 'Cotação de Câmbio',
  category: 'information',
  responseType: 'voice+modal',

  voiceTriggers: [
    // Genérico
    'câmbio', 'cambio', 'cotação', 'cotacao', 'consultar cambio', 'consultar câmbio',
    'moeda', 'cotacao de cambio', 'cotacao de câmbio',
    // Dólar
    'dólar', 'dolar', 'dólar americano', 'dolar americano', 'cotação do dólar',
    'cotacao do dolar', 'preço do dólar', 'preco do dolar', 'valor do dólar', 'usd',
    // Euro
    'euro', 'preço do euro', 'preco do euro', 'cotação do euro', 'cotacao do euro', 'eur',
    // Libra
    'libra', 'libra esterlina', 'cotação da libra', 'cotacao da libra', 'gbp',
    // Iene
    'iene', 'iene japonês', 'iene japones', 'cotação do iene', 'jpy',
    // Dólar Canadense
    'dólar canadense', 'dolar canadense', 'canadense', 'cad',
    // Dólar Australiano
    'dólar australiano', 'dolar australiano', 'australiano', 'aud',
    // Franco Suíço
    'franco suíço', 'franco suico', 'franco', 'chf',
    // Yuan
    'yuan', 'yuan chinês', 'yuan chines', 'renminbi', 'cny',
    // Peso Mexicano
    'peso mexicano', 'peso do méxico', 'peso do mexico', 'mxn',
    // Bitcoin
    'bitcoin', 'btc', 'cripto', 'criptomoeda',
  ],

  examplePhrases: [
    'Qual a cotação do dólar',
    'Preço do euro hoje',
    'Quanto está o bitcoin',
    'Cotação da libra esterlina',
    'Quanto está o yuan',
  ],

  requiresInput: false,
  description: 'Consulta cotações atualizadas de moedas em tempo real via Frankfurter (BCE) para moedas fiat e CoinGecko para Bitcoin. Disponível: Dólar (USD), Euro (EUR), Libra (GBP), Iene (JPY), Dólar Canadense (CAD), Dólar Australiano (AUD), Franco Suíço (CHF), Yuan (CNY), Peso Mexicano (MXN) e Bitcoin (BTC).',
  shortDescription: 'Cotações de moedas em tempo real',
  icon: '🧊',
  color: '#00FFF7',

  saveToHistory: true,
  creditsPerUse: 2,
  requiresPayment: false,
  isPremium: false,

  handler: async ({ transcript, playText, setActiveModal, companyId }) => {
    try {
      const t = transcript?.toLowerCase() || '';
      let moedaSelecionada = 'USD'; // Padrão: Dólar

      if (t.includes('euro') || t.includes('eur')) moedaSelecionada = 'EUR';
      else if (t.includes('libra') || t.includes('gbp')) moedaSelecionada = 'GBP';
      else if (t.includes('iene') || t.includes('jpy')) moedaSelecionada = 'JPY';
      else if (t.includes('canadense') || t.includes('cad')) moedaSelecionada = 'CAD';
      else if (t.includes('australiano') || t.includes('aud')) moedaSelecionada = 'AUD';
      else if (t.includes('franco') || t.includes('suíço') || t.includes('suico') || t.includes('chf')) moedaSelecionada = 'CHF';
      else if (t.includes('yuan') || t.includes('renminbi') || t.includes('cny')) moedaSelecionada = 'CNY';
      else if (t.includes('mexicano') || t.includes('méxico') || t.includes('mexico') || t.includes('mxn')) moedaSelecionada = 'MXN';
      else if (t.includes('bitcoin') || t.includes('btc') || t.includes('cripto')) moedaSelecionada = 'BTC';

      setActiveModal?.({
        type: 'CotacaoMoedasDisplay',
        data: { companyId, moedaSelecionada }
      });

      await playText('Consultando cotação de moedas.');
      return true;
    } catch {
      return false;
    }
  },
},

tracar_rota: {
  functionKey: 'tracar_rota',
  functionName: 'Traçar Rota',
  category: 'configuration' as any,
  responseType: 'voice+modal',

  voiceTriggers: [
    'tracar rota',
    'traçar rota',
    'calcular rota',
    'mostrar caminho',
    'como chegar',
    'rota para',
    'ir para',
    'traçar caminho',
    'ver rota',
  ],
  examplePhrases: [
    'Traçar rota para a Av. Paulista',
    'Como chegar no aeroporto',
    'Calcular rota',
  ],

  edgeFunction: undefined,
  uiComponent: 'TracarRotaDisplay',
  requiresInput: false,
  description: 'Traça rota entre a localização atual e um destino informado.',
  icon: '🟣',
  color: '#800080',
  saveToHistory: true,
  creditsPerUse: 1,
  requiresPayment: false,
  isPremium: false,

  handler: async ({ companyId, setActiveModal, userMessage }) => {
    // Extrai destino do comando de voz (ex: "traçar rota para av paulista")
    const triggers = ['tracar rota', 'calcular rota', 'rota para', 'como chegar', 'ir para'];
    let destino = '';
    
    const msgLower = userMessage?.toLowerCase() || '';
    for (const trigger of triggers) {
      if (msgLower.includes(trigger)) {
        destino = msgLower.split(trigger)[1]?.trim() || '';
        break;
      }
    }

    setActiveModal?.({ 
      type: 'TracarRotaDisplay', 
      data: { companyId, destinoInicial: destino } 
    });
    return true;
  },
},

buscar_endereco: {
  functionKey: 'buscar_endereco',
  functionName: 'Buscar Endereço',
  category: 'configuration' as any,
  responseType: 'voice+modal',

  voiceTriggers: [
    'buscar endereco',
    'buscar endereço',
    'procurar endereco',
    'procurar endereço',
    'encontrar local',
    'localizar',
  ],
  examplePhrases: [
    'Buscar endereço da Av. Paulista',
    'Qual o CEP 01310-100',
    'Encontrar local',
  ],

  edgeFunction: undefined,
  uiComponent: 'BuscarEnderecoDisplay',
  requiresInput: false,
  description: 'Busca endereços completos por CEP ou nome de lugar.',
  icon: '🟣',
  color: '#800080',
  saveToHistory: true,
  creditsPerUse: 1,
  requiresPayment: false,
  isPremium: false,

  handler: async ({ companyId, setActiveModal, userMessage }) => {
    // Extrai termo de busca
    const triggers = ['buscar endereco', 'buscar endereço', 'procurar endereco', 'qual o endereco', 'cep'];
    let termo = '';
    
    const msgLower = userMessage?.toLowerCase() || '';
    for (const trigger of triggers) {
      if (msgLower.includes(trigger)) {
        termo = msgLower.split(trigger)[1]?.trim() || '';
        break;
      }
    }

    setActiveModal?.({ 
      type: 'BuscarEnderecoDisplay', 
      data: { companyId, termoInicial: termo } 
    });
    return true;
  },
},

rastreio_correios: {
  functionKey: 'rastreio_correios',
  functionName: 'Rastreio Correios',
  category: 'configuration' as any,
  responseType: 'voice+modal',

  voiceTriggers: [
    'rastrear encomenda',
    'rastreio correios',
    'rastrear pacote',
    'cadê minha encomenda',
    'status correios',
    'onde está meu pedido',
  ],
  examplePhrases: [
    'Rastrear encomenda AA123456789BR',
    'Rastreio Correios',
    'Cadê minha encomenda',
  ],

  edgeFunction: undefined,
  uiComponent: 'RastreioCorreiosDisplay',
  requiresInput: false,
  description: 'Rastreia encomendas dos Correios informando o status atual.',
  icon: '🟣',
  color: '#800080',
  saveToHistory: true,
  creditsPerUse: 1,
  requiresPayment: false,
  isPremium: false,

  handler: async ({ companyId, setActiveModal }) => {
    setActiveModal?.({ type: 'RastreioCorreiosDisplay', data: { companyId } });
    return true;
  },
},

// ── Consultar CEP ─────────────────────────────────────────────
consultar_cep: {
  functionKey: 'consultar_cep',
  functionName: 'Consultar CEP',
  category: 'information',
  responseType: 'voice+modal',

  voiceTriggers: [
    'localizar cep', 'código postal', 'codigo postal', 'consultar cep',
    'buscar cep'
  ],

  examplePhrases: [
    'Consultar CEP 01310-100',
    'Buscar endereço por CEP',
    'CEP da Avenida Paulista'
  ],

  requiresInput: false,
  description: 'Consulta endereços completos a partir do CEP. Retorna logradouro, bairro, cidade, UF e complemento.',
  shortDescription: 'Buscar endereço por CEP',
  icon: '🧊',
  color: '#00FFF7',

  saveToHistory: true,
  creditsPerUse: 2,
  requiresPayment: false,
  isPremium: false,

  handler: async ({ transcript, playText, setActiveModal, companyId }) => {
    try {
      const cepMatch = transcript?.match(/\d{5}[-\s]?\d{3}/);
      const cepPrefill = cepMatch ? cepMatch[0].replace(/\D/g, '') : '';

      setActiveModal?.({
        type: 'ConsultarCEPDisplay',
        data: { companyId, cepPrefill }
      });

      await playText(cepPrefill ? `Consultando CEP ${cepPrefill}.` : 'Digite o CEP.');
      return true;
    } catch {
      return false;
    }
  },
},

// ── Consultar CNPJ ────────────────────────────────────────────
consultar_cnpj: {
  functionKey: 'consultar_cnpj',
  functionName: 'Dados CNPJ',
  category: 'knowledge',
  responseType: 'voice+modal',

  voiceTriggers: [
    // Dados cadastrais — NÃO incluir palavras de restrição/score
    'dados da empresa', 'consultar empresa', 'razão social', 'razao social',
    'consultar cnpj', 'consulta cnpj', 'consulte o cnpj',
    'receita federal', 'dados do cnpj', 'informações do cnpj', 'informacoes do cnpj',
    'buscar empresa', 'cnpj na receita',
  ],

  examplePhrases: [
    'Consultar CNPJ 12.345.678/0001-90',
    'Dados da empresa',
    'Informações do CNPJ na Receita Federal',
  ],

  requiresInput: false,
  description: 'Consulta dados cadastrais completos de empresas na Receita Federal via ReceitaWS. Retorna razão social, nome fantasia, CNAE, capital social, endereço completo, situação cadastral, data de início das atividades e contatos.',
  shortDescription: 'Dados cadastrais de CNPJ',
  icon: '🟡',
  color: '#FFFF00',

  saveToHistory: true,
  creditsPerUse: 2,
  requiresPayment: false,
  isPremium: false,

  handler: async ({ transcript, playText, setActiveModal, companyId }) => {
    try {
      const cnpjMatch = transcript?.match(/\d{14}|\d{2}[.\s]?\d{3}[.\s]?\d{3}[\/\s]?\d{4}[-\s]?\d{2}/);
      const cnpjPrefill = cnpjMatch ? cnpjMatch[0].replace(/\D/g, '') : '';

      setActiveModal?.({
        type: 'ConsultarCnpjModal',
        data: { companyId, cnpjPrefill }
      });

      await playText(cnpjPrefill ? `Consultando dados do CNPJ ${cnpjPrefill}.` : 'Digite o CNPJ para consultar os dados cadastrais.');
      return true;
    } catch {
      return false;
    }
  },
},

// ── Consultar CPF ─────────────────────────────────────────────
consultar_cpf: {
  functionKey: 'consultar_cpf',
  functionName: 'Dados CPF',
  category: 'knowledge',
  responseType: 'voice+modal',

  voiceTriggers: [
    // Dados cadastrais — NÃO incluir palavras de restrição/score/serasa/spc
    'dados pessoais', 'consultar cpf', 'consulta cpf', 'consulte o cpf',
    'dados do cpf', 'informações de pessoa física', 'informacoes de pessoa fisica',
    'buscar cpf', 'cpf na receita',
    'nome do cpf', 'titular do cpf',
  ],

  examplePhrases: [
    'Consultar CPF 123.456.789-00',
    'Dados do CPF',
    'Informações de pessoa física',
  ],

  requiresInput: false,
  description: 'Consulta informações cadastrais de pessoa física via API Brasil. Retorna nome completo, nome da mãe, data de nascimento, idade e sexo.',
  shortDescription: 'Dados cadastrais de CPF',
  icon: '🟡',
  color: '#FFFF00',

  saveToHistory: true,
  creditsPerUse: 2,
  requiresPayment: false,
  isPremium: false,

  handler: async ({ transcript, playText, setActiveModal, companyId }) => {
    try {
      const cpfMatch = transcript?.match(/\d{11}|\d{3}[.\s]?\d{3}[.\s]?\d{3}[-\s]?\d{2}/);
      const cpfPrefill = cpfMatch ? cpfMatch[0].replace(/\D/g, '') : '';

      setActiveModal?.({
        type: 'ConsultarCpfModal',
        data: { companyId, cpfPrefill }
      });

      await playText(cpfPrefill ? `Consultando dados do CPF ${cpfPrefill}.` : 'Digite o CPF para consultar os dados cadastrais.');
      return true;
    } catch {
      return false;
    }
  },
},

// ── Restrições CPF ────────────────────────────────────────────
restricoes_cpf: {
  functionKey: 'restricoes_cpf',
  functionName: 'Restrições CPF',
  category: 'knowledge',
  responseType: 'voice+modal',

  voiceTriggers: [
    // Restrições e score — palavras exclusivas desta função
    'restrições cpf', 'restricoes cpf',
    'score cpf', 'score de crédito', 'score de credito',
    'quod cpf', 'consultar quod', 'quod',
    'serasa cpf', 'serasa', 'consultar serasa',
    'spc cpf', 'spc', 'consultar spc',
    'análise de crédito', 'analise de credito',
    'inadimplência', 'inadimplencia',
    'pendências cpf', 'pendencias cpf',
    'negativado', 'nome sujo', 'nome no spc', 'nome no serasa',
    'dívidas cpf', 'dividas cpf', 'protestos cpf',
    'restrição financeira', 'restricao financeira',
    'crédito cpf', 'credito cpf',
  ],

  examplePhrases: [
    'Restrições do CPF 123.456.789-00',
    'Score de crédito',
    'Consultar Serasa CPF',
    'Nome no SPC',
    'CPF negativado',
  ],

  requiresInput: false,
  description: 'Consulta completa de restrições financeiras e score de crédito de CPF via Quod (SPC/Serasa). Retorna score, probabilidade de inadimplência, nível de risco, histórico de protestos, pendências financeiras, cheques sem fundos e ações cíveis.',
  shortDescription: 'Score e restrições de CPF (SPC/Serasa)',
  icon: '🟡',
  color: '#FFFF00',

  saveToHistory: true,
  creditsPerUse: 2,
  requiresPayment: false,
  isPremium: false,

  handler: async ({ transcript, playText, setActiveModal, companyId }) => {
    try {
      const cpfMatch = transcript?.match(/\d{11}|\d{3}[.\s]?\d{3}[.\s]?\d{3}[-\s]?\d{2}/);
      const cpfPrefill = cpfMatch ? cpfMatch[0].replace(/\D/g, '') : '';

      setActiveModal?.({
        type: 'RestricoesCPFDisplay',
        data: { companyId, cpfPrefill }
      });

      await playText(cpfPrefill ? `Consultando restrições do CPF ${cpfPrefill}.` : 'Digite o CPF para consultar restrições e score.');
      return true;
    } catch {
      return false;
    }
  },
},

  // ── MODO VENDAS - 7 FUNÇÕES ──────────────────────────────────
  
  registrar_venda: {
    functionKey: 'registrar_venda',
    functionName: 'Registrar Venda',
    category: 'payment',
    responseType: 'voice+modal',
 
    voiceTriggers: [
      'registrar venda',
      'nova venda',
      'fazer venda',
      'vender',
      'vendendo',
      'abrir venda',
      'iniciar venda',
    ],
 
    examplePhrases: [
      'Registrar venda',
      'Nova venda',
      'Fazer uma venda',
      'Quero vender',
    ],
 
    requiresInput: false,
    description: 'Abre o PDV para registrar uma venda manual. Permite adicionar produtos, calcular total, aplicar descontos e finalizar com PIX, dinheiro ou cartão.',
    shortDescription: 'Abrir PDV para registrar venda',
    icon: '🛒',
    color: '#10b981',
 
    saveToHistory: true,
    creditsPerUse: 1,
    requiresPayment: false,
    isPremium: false,
 
    handler: async ({ playText, setActiveModal, companyId }) => {
      await playText('Abrindo o PDV...');
      
      setActiveModal?.({
        type: 'RegistrarVendaDisplay',
        data: {
          companyId,
        },
      });
 
      return true;
    },
  },
 
  ver_clientes: {
    functionKey: 'ver_clientes',
    functionName: 'Ver Clientes',
    category: 'information',
    responseType: 'voice+modal',
 
    voiceTriggers: [
      'ver clientes',
      'lista de clientes',
      'clientes cadastrados',
      'buscar cliente',
      'encontrar cliente',
      'procurar cliente',
    ],
 
    examplePhrases: [
      'Ver clientes',
      'Lista de clientes',
      'Buscar cliente',
      'Mostrar clientes cadastrados',
    ],
 
    requiresInput: false,
    description: 'Lista todos os clientes cadastrados no sistema com histórico de compras e dados de contato.',
    shortDescription: 'Ver clientes cadastrados',
    icon: '👥',
    color: '#3b82f6',
 
    saveToHistory: false,
    creditsPerUse: 1,
    requiresPayment: false,
    isPremium: false,
 
    handler: async ({ playText, setActiveModal, companyId }) => {
      await playText('Carregando lista de clientes...');
      
      setActiveModal?.({
        type: 'VerClientesDisplay',
        data: {
          companyId,
        },
      });
 
      return true;
    },
  },
 
  fechar_caixa: {
    functionKey: 'fechar_caixa',
    functionName: 'Fechar Caixa',
    category: 'payment',
    responseType: 'voice+modal',
 
    voiceTriggers: [
      'fechar caixa',
      'fechamento de caixa',
      'conferir caixa',
      'encerrar caixa',
      'fechar o caixa',
    ],
 
    examplePhrases: [
      'Fechar caixa',
      'Fechamento do caixa',
      'Conferir caixa',
      'Encerrar o caixa',
    ],
 
    requiresInput: false,
    description: 'Fecha o caixa do turno atual mostrando resumo de vendas, formas de pagamento e divergências.',
    shortDescription: 'Fechar o caixa do turno',
    icon: '🔒',
    color: '#f59e0b',
 
    saveToHistory: true,
    creditsPerUse: 1,
    requiresPayment: false,
    isPremium: false,
 
    handler: async ({ playText, setActiveModal, companyId }) => {
      await playText('Preparando fechamento de caixa...');
      
      setActiveModal?.({
        type: 'FecharCaixaDisplay',
        data: {
          companyId,
        },
      });
 
      return true;
    },
  },
 
  trocar_turno: {
    functionKey: 'trocar_turno',
    functionName: 'Trocar Turno',
    category: 'configuration',
    responseType: 'voice+modal',
 
    voiceTriggers: [
      'trocar turno',
      'mudar turno',
      'encerrar turno',
      'fechar turno',
      'sair do turno',
      'finalizar turno',
    ],
 
    examplePhrases: [
      'Trocar turno',
      'Encerrar turno',
      'Fechar turno',
      'Quero trocar de turno',
    ],
 
    requiresInput: false,
    description: 'Fecha o turno atual e inicia um novo. Gera relatório do turno encerrado.',
    shortDescription: 'Trocar de turno',
    icon: '🔄',
    color: '#8b5cf6',
 
    saveToHistory: true,
    creditsPerUse: 1,
    requiresPayment: false,
    isPremium: false,
 
    handler: async ({ playText, setActiveModal, companyId }) => {
      await playText('Preparando troca de turno...');
      
      setActiveModal?.({
        type: 'TrocarTurnoDisplay',
        data: {
          companyId,
        },
      });
 
      return true;
    },
  },
 
  relatorio_vendas: {
    functionKey: 'relatorio_vendas',
    functionName: 'Relatório de Vendas',
    category: 'information',
    responseType: 'voice+modal',
 
    voiceTriggers: [
      'relatório de vendas',
      'relatorio de vendas',
      'vendas do dia',
      'vendas hoje',
      'vendas do mês',
      'minhas vendas',
      'relatório',
      'relatorio',
    ],
 
    examplePhrases: [
      'Relatório de vendas',
      'Vendas hoje',
      'Minhas vendas',
      'Vendas do mês',
    ],
 
    requiresInput: false,
    description: 'Gera relatório de vendas do período. Colaboradores veem apenas suas vendas, gerentes veem todas.',
    shortDescription: 'Ver relatório de vendas',
    icon: '📊',
    color: '#06b6d4',
 
    saveToHistory: false,
    creditsPerUse: 1,
    requiresPayment: false,
    isPremium: false,
 
    handler: async ({ playText, setActiveModal, companyId }) => {
      await playText('Gerando relatório de vendas...');
      
      setActiveModal?.({
        type: 'RelatorioVendasDisplay',
        data: {
          companyId,
        },
      });
 
      return true;
    },
  },
 
  minhas_compras: {
    functionKey: 'minhas_compras',
    functionName: 'Minhas Compras',
    category: 'information',
    responseType: 'voice+modal',
 
    voiceTriggers: [
      'minhas compras',
      'meus pedidos',
      'histórico de compras',
      'historico de compras',
      'compras anteriores',
      'pedidos anteriores',
      'ver compras',
      'ver pedidos',
    ],
 
    examplePhrases: [
      'Minhas compras',
      'Meus pedidos',
      'Histórico de compras',
      'Ver meus pedidos',
    ],
 
    requiresInput: false,
    description: 'Mostra o histórico completo de pedidos do cliente logado com status de pagamento e detalhes.',
    shortDescription: 'Ver histórico de compras',
    icon: '🛍️',
    color: '#ec4899',
 
    saveToHistory: false,
    creditsPerUse: 1,
    requiresPayment: false,
    isPremium: false,
 
    handler: async ({ playText, setActiveModal, companyId }) => {
      await playText('Carregando seu histórico de compras...');
      
      setActiveModal?.({
        type: 'MinhasComprasDisplay',
        data: {
          companyId,
        },
      });
 
      return true;
    },
  },

  enviar_sms: {
  functionKey: 'enviar_sms',
  functionName: 'Enviar SMS',
  category: 'services',
  responseType: 'voice+modal',

  voiceTriggers: [
    'enviar sms',
    'mandar sms',
    'enviar mensagem',
    'mandar mensagem',
    'enviar torpedo',
    'mandar torpedo',
  ],

  examplePhrases: [
    'Enviar SMS',
    'Mandar mensagem SMS',
    'Enviar torpedo',
  ],

  requiresInput: false,
  description: 'Envia mensagens SMS para qualquer número de telefone usando a API Brasil',
  shortDescription: 'Enviar mensagens via SMS',
  icon: '🟠',
  color: '#D2691E',

  saveToHistory: true,
  creditsPerUse: 2,
  requiresPayment: false,
  isPremium: false,

  handler: async ({ playText, setActiveModal, companyId }) => {
    await playText('Abrindo formulário de SMS...');
    
    setActiveModal?.({
      type: 'EnviarSmsDisplay',
      data: { companyId },
    });

    return true;
  },
},
 
  chamar_gerente: {
    functionKey: 'chamar_gerente',
    functionName: 'Chamar Gerente',
    category: 'services',
    responseType: 'voice+modal',
 
    voiceTriggers: [
      'chamar gerente',
      'chamar o gerente',
      'preciso do gerente',
      'gerente',
      'ajuda gerente',
      'solicitar gerente',
      'quero falar com gerente',
    ],
 
    examplePhrases: [
      'Chamar gerente',
      'Preciso do gerente',
      'Solicitar gerente',
      'Quero falar com o gerente',
    ],
 
    requiresInput: false,
    description: 'Envia notificação para o gerente quando colaboradores ou clientes precisam de autorização ou ajuda.',
    shortDescription: 'Solicitar ajuda do gerente',
    icon: '🔔',
    color: '#ef4444',
 
    saveToHistory: true,
    creditsPerUse: 1,
    requiresPayment: false,
    isPremium: false,
 
    handler: async ({ playText, setActiveModal, companyId, transcript }) => {
      const motivo = extractMotivo(transcript ?? '');
      
      await playText('Chamando o gerente...');
      
      setActiveModal?.({
        type: 'ChamarGerenteDisplay',
        data: {
          companyId,
          motivo,
        },
      });
 
      return true;
    },
  },
 
// ── Restrições CNPJ ───────────────────────────────────────────
restricoes_cnpj: {
  functionKey: 'restricoes_cnpj',
  functionName: 'Restrições CNPJ',
  category: 'knowledge',
  responseType: 'voice+modal',

  voiceTriggers: [
    // Restrições e score — palavras exclusivas desta função
    'restrições cnpj', 'restricoes cnpj',
    'score empresa', 'score empresarial', 'score do cnpj',
    'quod cnpj', 'serasa cnpj', 'spc cnpj',
    'análise crédito empresa', 'analise credito empresa',
    'inadimplência empresa', 'inadimplencia empresa',
    'pendências cnpj', 'pendencias cnpj',
    'empresa negativada', 'cnpj negativado',
    'empresa no spc', 'empresa no serasa', 'cnpj no spc', 'cnpj no serasa',
    'dívidas empresa', 'dividas empresa', 'protestos cnpj',
    'restrição financeira empresa', 'restricao financeira empresa',
    'crédito empresa', 'credito empresa',
  ],

  examplePhrases: [
    'Restrições do CNPJ 12.345.678/0001-90',
    'Score da empresa',
    'CNPJ no Serasa',
    'Empresa negativada',
  ],

  requiresInput: false,
  description: 'Consulta completa de restrições financeiras e score de crédito de CNPJ via Quod (SPC/Serasa). Retorna score empresarial, probabilidade de inadimplência, nível de risco, histórico de protestos e pendências financeiras.',
  shortDescription: 'Score e restrições de CNPJ (SPC/Serasa)',
  icon: '🟡',
  color: '#FFFF00',

  saveToHistory: true,
  creditsPerUse: 2,
  requiresPayment: false,
  isPremium: false,

  handler: async ({ transcript, playText, setActiveModal, companyId }) => {
    try {
      const cnpjMatch = transcript?.match(/\d{14}|\d{2}[.\s]?\d{3}[.\s]?\d{3}[\/\s]?\d{4}[-\s]?\d{2}/);
      const cnpjPrefill = cnpjMatch ? cnpjMatch[0].replace(/\D/g, '') : '';

      setActiveModal?.({
        type: 'RestricoesCNPJDisplay',
        data: { companyId, cnpjPrefill }
      });

      await playText(cnpjPrefill ? `Consultando restrições do CNPJ ${cnpjPrefill}.` : 'Digite o CNPJ para consultar restrições e score.');
      return true;
    } catch {
      return false;
    }
  },
},

// ── Consultar Feriados ────────────────────────────────────────
consultar_feriados: {
  functionKey: 'consultar_feriados',
  functionName: 'Feriados Nacionais',
  category: 'information',
  responseType: 'voice+modal',

  voiceTriggers: [
    'feriados', 'feriado nacional', 'dias não úteis', 'dias nao uteis',
    'calendário', 'calendario', 'feriados nacionais', 'lista de feriados'
  ],

  examplePhrases: [
    'Feriados de 2025',
    'Quais os feriados nacionais',
    'Calendário de feriados'
  ],

  requiresInput: false,
  description: 'Lista todos os feriados nacionais de um ano específico. Retorna nome do feriado, data completa e tipo (nacional, religioso, etc).',
  shortDescription: 'Lista de feriados nacionais',
  icon: '🧊',
  color: '#00FFF7',

  saveToHistory: true,
  creditsPerUse: 2,
  requiresPayment: false,
  isPremium: false,

  handler: async ({ transcript, playText, setActiveModal, companyId }) => {
    try {
      const anoMatch = transcript?.match(/\b(20\d{2})\b/);
      const anoPrefill = anoMatch ? anoMatch[1] : new Date().getFullYear().toString();

      setActiveModal?.({
        type: 'FeriadosNacionaisDisplay',
        data: { companyId, anoPrefill }
      });

      await playText(anoMatch ? `Consultando feriados de ${anoPrefill}.` : 'Digite o ano.');
      return true;
    } catch {
      return false;
    }
  },
},

// ── Consultar DDD ─────────────────────────────────────────────
consultar_ddd: {
  functionKey: 'consultar_ddd',
  functionName: 'Consultar DDD',
  category: 'configuration',
  responseType: 'voice+modal',

  voiceTriggers: [
    'ddd', 'código de área', 'codigo de area', 'telefone',
    'área telefônica', 'area telefonica', 'consultar ddd', 'qual o ddd'
  ],

  examplePhrases: [
    'Qual o DDD de São Paulo',
    'DDD 11',
    'Consultar DDD'
  ],

  requiresInput: false,
  description: 'Identifica estado e cidades correspondentes a um código de área (DDD). Retorna a unidade federativa e lista completa de municípios.',
  shortDescription: 'Identifica estado e cidades por DDD',
  icon: '🟣',
  color: '#800080',

  saveToHistory: true,
  creditsPerUse: 2,
  requiresPayment: false,
  isPremium: false,

  handler: async ({ transcript, playText, setActiveModal, companyId }) => {
    try {
      const dddMatch = transcript?.match(/\b(\d{2})\b/);
      const dddPrefill = dddMatch ? dddMatch[1] : '';

      setActiveModal?.({
        type: 'ConsultarDDDDisplay',
        data: { companyId, dddPrefill }
      });

      await playText(dddPrefill ? `Consultando DDD ${dddPrefill}.` : 'Digite o DDD.');
      return true;
    } catch {
      return false;
    }
  },
},

// ── Consultar Placa ──────────────────────────────────────────
consultar_placa: {
  functionKey: 'consultar_placa',
  functionName: 'Consultar Placa',
  category: 'knowledge',
  responseType: 'voice+modal',

  voiceTriggers: [
    'placa', 'veículo', 'veiculo', 'consultar placa', 'dados do carro',
    'detran', 'dados do veículo', 'informações da placa', 'buscar placa'
  ],

  examplePhrases: [
    'Consultar placa ABC1D23',
    'Dados do veículo',
    'Buscar veículo por placa'
  ],

  requiresInput: false,
  description: 'Consulta dados completos de veículos pela placa. Retorna marca, modelo, ano, cor, chassi, situação e histórico.',
  shortDescription: 'Dados completos de veículos',
  icon: '🟡',
  color: '#FFFF00',

  saveToHistory: true,
  creditsPerUse: 2,
  requiresPayment: false,
  isPremium: false,

  handler: async ({ transcript, playText, setActiveModal, companyId }) => {
    try {
      const placaMatch = transcript?.match(/[A-Z]{3}[\s-]?\d[A-Z\d]\d{2}/i);
      const placaPrefill = placaMatch ? placaMatch[0].replace(/[\s-]/g, '').toUpperCase() : '';

      setActiveModal?.({
        type: 'ConsultarPlacaModal',
        data: { companyId, placaPrefill }
      });

      await playText(placaPrefill ? `Consultando placa ${placaPrefill}.` : 'Digite a placa.');
      return true;
    } catch {
      return false;
    }
  },
},

// ── Consultar Protestos ──────────────────────────────────────
consultar_leilao: {
  functionKey: 'consultar_leilao',
  functionName: 'Consulta de Protestos',
  category: 'knowledge',
  responseType: 'voice+modal',

  voiceTriggers: [
    'protestos', 'protesto', 'consultar protestos', 'consulta de protestos',
    'protesto em cartório', 'protesto em cartorio',
    'título protestado', 'titulo protestado',
    'nome protestado', 'cpf protestado',
    'pendências tributárias', 'pendencias tributarias',
    'dívida tributária', 'divida tributaria',
    'débito das', 'debito das',
    'simples nacional', 'simei',
    'cartório', 'cartorio',
    'pendências em cartório', 'pendencias em cartorio',
    'checar protestos', 'verificar protestos',
  ],

  examplePhrases: [
    'Consultar protestos do CPF 123.456.789-00',
    'Verificar protestos em cartório',
    'CPF tem protestos?',
    'Pendências tributárias do CPF',
  ],

  requiresInput: false,
  description: 'Consulta protestos em cartório e pendências tributárias de CPF em âmbito nacional. Retorna nome, protestos ativos (cartório, data, valor, situação), pendências tributárias, situação no Simples Nacional e SIMEI.',
  shortDescription: 'Protestos e pendências em cartório',
  icon: '🟡',
  color: '#FFFF00',

  saveToHistory: true,
  creditsPerUse: 2,
  requiresPayment: false,
  isPremium: false,

  handler: async ({ transcript, playText, setActiveModal, companyId }) => {
    try {
      const cpfMatch = transcript?.match(/\d{11}|\d{3}[.\s]?\d{3}[.\s]?\d{3}[-\s]?\d{2}/);
      const cpfPrefill = cpfMatch ? cpfMatch[0].replace(/\D/g, '') : '';

      setActiveModal?.({
        type: 'ConsultarLeilaoModal',
        data: { companyId, cpfPrefill }
      });

      await playText(cpfPrefill ? `Consultando protestos do CPF ${cpfPrefill}.` : 'Digite o CPF para consultar protestos em cartório.');
      return true;
    } catch {
      return false;
    }
  },
},
  
// ── Utilitários ─────────────

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
      'que horas são',
      'qual o horário atual',
      'qual a hora',
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
      'qual o endereço daí',
      'endereço de vocês',
      'onde vocês ficam',
      'onde voces ficam',
      'nosso endereço',
      'localização',
      'localizacao',
      'onde estão',
      'onde estao',
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
    examplePhrases: [
      'Qual a senha do Wi-Fi?',
      'Mostra o QR Code do Wi-Fi',
      'Como conecto ao Wi-Fi?',
    ],
    requiresInput: false,
    description: 'Exibe QR Code da rede Wi-Fi para os clientes se conectarem automaticamente.',
    shortDescription: 'QR Code para conectar ao Wi-Fi.',
    icon: '📶',
    color: '#D2691E',
    saveToHistory: true,
    creditsPerUse: 1,
    requiresPayment: false,
    isPremium: false,
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
        setActiveModal?.({
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
    examplePhrases: [
      'Mostra o cardápio',
      'Abre o cardápio digital',
      'Quero ver o menu',
    ],
    requiresInput: false,
    description: 'Exibe o cardápio digital ou PDF com QR Code, preview e botão para abrir.',
    shortDescription: 'Cardápio digital com QR Code.',
    icon: '🍽️',
    color: '#D2691E',
    saveToHistory: true,
    creditsPerUse: 1,
    requiresPayment: false,
    isPremium: false,
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
        setActiveModal?.({
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

  canal_youtube: {
  functionKey: 'canal_youtube',
  functionName: 'Canal do YouTube',
  category: 'video',
  responseType: 'voice+modal',
  voiceTriggers: [
    'youtube',
    'canal do youtube',
    'canal youtube',
    'nosso canal',
    'ver canal',
    'abrir youtube',
    'inscrever',
    'se inscreva',
    'se inscrever',
  ],
  examplePhrases: [
    'Mostrar canal do YouTube',
    'Abrir nosso canal',
    'Como me inscrever no canal',
  ],
  requiresInput: false,
  description: 'Exibe o canal do YouTube da empresa com QR Code, preview e botão de inscrição.',
  shortDescription: 'Canal do YouTube com QR Code.',
  icon: '🔴',
  color: '#A52A2A',
  saveToHistory: true,
  creditsPerUse: 1,
  requiresPayment: false,
  isPremium: false,
  handler: async ({ playText, setActiveModal, companyId }) => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('companies')
        .select('youtube_channel_url, youtube_channel_name, youtube_channel_description, name')
        .eq('id', companyId)
        .single();

      if (!data?.youtube_channel_url) {
        await playText('O canal do YouTube ainda não foi configurado. Configure no painel.');
        return false;
      }

      setActiveModal?.({
        type: 'CanalYoutubeDisplay',
        data: {
          channelUrl: data.youtube_channel_url,
          channelName: data.youtube_channel_name ?? data.name,
          channelDescription: data.youtube_channel_description ?? '',
        },
      });

      await playText(
        data.youtube_channel_description
          ? `Aqui está o nosso canal do YouTube. ${data.youtube_channel_description}`
          : 'Aqui está o nosso canal do YouTube. Escaneie o QR Code ou clique para se inscrever.'
      );

      return true;
    } catch (error) {
      console.error('Erro canal_youtube:', error);
      return false;
    }
  },
},

  // ──────────────────────────────────────────────────────────
  // IMPRESSÃO REMOTA (PrintNode) - 3 CRÉDITOS
  // ──────────────────────────────────────────────────────────

  impressao_remota: {
    functionKey: 'impressao_remota',
    functionName: 'Impressão Remota',
    category: 'services',
    responseType: 'voice+modal',

    voiceTriggers: [
      'impressão remota',
      'impressao remota',
      'imprimir remoto',
      'imprimir automatico',
      'imprimir automático',
      'enviar para impressora',
      'printnode',
      'impressão automática',
      'impressao automatica',
    ],

    examplePhrases: [
      'Imprimir este arquivo automaticamente',
      'Enviar para impressora remota',
      'Impressão automática deste documento',
      'PrintNode imprimir arquivo',
    ],

    requiresInput: false,
    
    description: 'Impressão automática via PrintNode para desktop sem touch. Cliente não precisa fazer nada - o documento imprime automaticamente na impressora configurada. Ideal para escritórios com múltiplas impressoras.',
    shortDescription: 'Impressão automática desktop',
    icon: '🟠',
    color: '#D2691E',

    saveToHistory: true,
    creditsPerUse: 3, // 3 CRÉDITOS (automação total)
    requiresPayment: false,
    isPremium: false,

    uiComponent: 'ImpressaoRemotaDisplay',
    edgeFunction: 'processar-impressao',

handler: async ({ playText, setActiveModal, companyId }) => {
  const supabase = createClient();

  // ✅ Colunas corretas
  const { data: company } = await supabase
    .from('companies')
    .select('printnode_computer_id, printnode_printer_id_bw')
    .eq('id', companyId)
    .single();

  if (!company?.printnode_computer_id || !company?.printnode_printer_id_bw) {
    await playText(
      'A impressão remota não está configurada. Por favor, configure o PrintNode no painel administrativo.'
    );
    return false;
  }

  playText('Envie seu arquivo para imprimir automaticamente.');

  setActiveModal?.({
    type: 'ImpressaoRemotaDisplay',
    data: {
      companyId,
      functionKey: 'impressao_remota',
    },
  });

  return true;
},
  },

  impressao_local: {
    functionKey: 'impressao_local',
    functionName: 'Impressão Local',
    category: 'services',
    responseType: 'voice+modal',

    voiceTriggers: [
      'impressão local',
      'impressao local',
      'imprimir local',
      'imprimir documento',
      'imprimir arquivo',
      'imprimir nativo',
      'imprimir',
      'impressão',
      'impressao',
    ],

    examplePhrases: [
      'Imprimir este documento',
      'Imprimir arquivo',
      'Enviar para impressão',
      'Impressão local do arquivo',
    ],

    requiresInput: false,
    
    description: 'Impressão através do sistema nativo do dispositivo. Funciona em qualquer aparelho (desktop, tablet, celular). Cliente escolhe a impressora e confirma manualmente com um toque.',
    shortDescription: 'Impressão nativa do dispositivo',
    icon: '🟠',
    color: '#D2691E',

    saveToHistory: true,
    creditsPerUse: 1, // 1 CRÉDITO (confirmação manual)
    requiresPayment: false,
    isPremium: false,

    uiComponent: 'ImpressaoLocalDisplay',
    edgeFunction: 'processar-impressao',

    handler: async ({ playText, setActiveModal, companyId }) => {
      playText(
        'Ennvie seu arquivo para imprimir na sua impressora local.'
      );

      setActiveModal?.({
        type: 'ImpressaoLocalDisplay',
        data: {
          companyId,
          functionKey: 'impressao_local',
        },
      });

      return true;
    },
  },

  impressao_recibo: {
    functionKey: 'impressao_recibo',
    functionName: 'Impressão Recibo',
    category: 'services',
    responseType: 'voice+modal',

    voiceTriggers: [
      'impressão recibo',
      'impressao recibo',
      'imprimir recibo',
      'imprimir cupom',
      'cupom fiscal',
      'nota fiscal',
      'recibo térmica',
      'recibo termica',
      'impressora térmica',
      'impressora termica',
      'cupom',
      'recibo',
    ],

    examplePhrases: [
      'Imprimir recibo',
      'Imprimir cupom fiscal',
      'Recibo na térmica',
      'Cupom de venda',
    ],

    requiresInput: false,
    
    description: 'Impressão de recibos/cupons em impressoras térmicas via USB ou Bluetooth. Ideal para PDV, totens e terminais de autoatendimento. Suporta protocolo ESC/POS padrão (Epson, Bematech, Elgin, Daruma).',
    shortDescription: 'Recibo em impressora térmica',
    icon: '🟠',
    color: '#D2691E',

    saveToHistory: true,
    creditsPerUse: 1, // 1 CRÉDITO (sem custo mensal)
    requiresPayment: false,
    isPremium: false,

    uiComponent: 'ImpressaoReciboDisplay',
    edgeFunction: 'processar-impressao',

    handler: async ({ playText, setActiveModal, companyId }) => {
      const supabase = createClient();

      // Verificar se impressora térmica está configurada
      const { data: company } = await supabase
        .from('companies')
        .select('thermal_printer_id')
        .eq('id', companyId)
        .single();

      if (!company?.thermal_printer_id) {
        await playText(
          'A impressora térmica não está configurada. Por favor, conecte uma impressora térmica no painel administrativo.'
        );
        return false;
      }

      playText(
        'Envie seu arquivo, como cupons e recibos, para impressora térmicas dedicadas.'
      );

      setActiveModal?.({
        type: 'ImpressaoReciboDisplay',
        data: {
          companyId,
          functionKey: 'impressao_recibo',
        },
      });

      return true;
    },
  },

nosso_qrcode: {
    functionKey: 'nosso_qrcode',
    functionName: 'Nosso QR Code',
    category: 'services',
    responseType: 'voice+modal',
    voiceTriggers: [
      'nosso qr code', 'nosso qrcode',
      'mostrar qr code', 'mostrar qrcode',
      'meu qr code', 'meu qrcode',
    ],
    examplePhrases: [
      'Mostra o QR Code',
      'Qual é o QR Code de vocês?',
      'Mostra o QR Code do Instagram',
    ],
    requiresInput: false,
    description: 'Exibe QR Code personalizado com mensagem falada pelo assistente.',
    shortDescription: 'QR Code personalizado com mensagem de voz.',
    icon: '📲',
    color: '#D2691E',
    saveToHistory: true,
    creditsPerUse: 1,
    requiresPayment: false,
    isPremium: false,
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
        setActiveModal?.({
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

  clima_tempo: {
  functionKey: 'clima_tempo',
  functionName: 'Clima e Tempo',
  category: 'ai_assistant',
  responseType: 'voice+modal',

  voiceTriggers: [
    'clima',
    'tempo',
    'temperatura',
    'previsao do tempo',
    'previsão do tempo',
    'vai chover',
    'vai fazer sol',
    'como esta o tempo',
    'como está o tempo',
    'que tempo faz',
    'tempo em',
    'clima em',
  ],

  examplePhrases: [
    'Como está o tempo?',
    'Vai chover hoje?',
    'Temperatura em São Paulo',
    'Previsão para esta semana',
  ],

  edgeFunction: 'clima-tempo',
  requiresInput: false,

  description: 'Informa as condições climáticas atuais e a previsão do tempo para qualquer cidade.',
  shortDescription: 'Mostra clima atual e previsão do tempo.',
  icon: '🔵',
  color: '#0000ff',

  saveToHistory: true,
  creditsPerUse: 0,
  requiresPayment: false,
  isPremium: false,

  handler: async ({ transcript, playText, setActiveModal, companyId }) => {
    try {
      // Tenta extrair cidade do transcript
      const cityMatch = transcript?.match(/(?:tempo em|clima em|temperatura em|previsao em|previsão em)\s+([a-záéíóúãõâêîôûç\s]+)/i);
      const city = cityMatch ? cityMatch[1].trim() : null;

      setActiveModal?.({
        type: 'ClimaTempoDisplay',
        data: { companyId, city },
      });

      await playText(
        city
          ? `Consultando o clima em ${city}...`
          : 'Consultando o clima agora...'
      );

      return true;
    } catch (error) {
      console.error('Erro clima_tempo:', error);
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

// ============================================================
// CATEGORIA: VENDAS
// ============================================================

modo_venda: {
  functionKey: 'modo_venda',
  functionName: 'Modo Venda',
  category: 'products',
  responseType: 'navigation', // ← MUDOU de 'voice+modal' para 'navigation'
  voiceTriggers: [
    'modo venda', 'modo de venda', 'abrir loja',
    'quero comprar', 'comprar agora', 'escolher produtos',
    'fazer compras', 'abrir modo venda', 'loja virtual',
  ],
  examplePhrases: [
    'Quero comprar',
    'Abrir modo de venda',
    'Escolher produtos',
    'Comprar agora',
  ],
  requiresInput: false,
  description: 'Abre a página de vendas com catálogo de produtos e carrinho de compras.',
  shortDescription: 'Abrir loja virtual',
  icon: '🛒',
  color: '#10b981',
  saveToHistory: true,
  creditsPerUse: 0,
  requiresPayment: false,
  isPremium: false,
handler: async ({ playText, slug, ...rest }: any) => {
  try {
    const baseUrl = getContextualRoute('vendas', slug);
    
    // Detecta se tem produto inicial (vindo do VerProdutoDisplay)
    const produtoInicial = (rest as any)?.produtoInicial;
    const quantidadeInicial = (rest as any)?.quantidadeInicial || 1;
    
    if (produtoInicial?.id) {
      // Navega com produto no query param
      const params = new URLSearchParams({
        produto: produtoInicial.id,
        quantidade: String(quantidadeInicial),
      });
      
      // Se tem opções selecionadas, serializa como JSON
      const opcoesIniciais = (rest as any)?.opcoesIniciais;
      if (opcoesIniciais && opcoesIniciais.length > 0) {
        params.set('opcoes', JSON.stringify(opcoesIniciais));
      }
      
      window.location.href = `${baseUrl}?${params.toString()}`;
    } else {
      // Navega sem produto (modo venda normal)
      window.location.href = baseUrl;
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao navegar para vendas:', error);
    await playText('Erro ao abrir modo vendas.');
    return false;
  }
},
},

ver_noticias: {
  functionKey: 'ver_noticias',
  functionName: 'Ver Notícias',
  category: 'information' as any,
  responseType: 'voice+modal',
 
  voiceTriggers: [
    'ver noticias',
    'ver notícias',
    'noticias',
    'manchetes',
    'ultimas noticias',
    'ver manchetes',
    'mostrar noticias',
    'quais as noticias',
    'quero ver noticias',
    'mostrar manchetes',
  ],
 
  examplePhrases: [
    'Ver notícias',
    'Mostrar manchetes',
    'Quais são as últimas notícias',
  ],
 
  edgeFunction: undefined,
  uiComponent: 'VerNoticiasDisplay',
  requiresInput: false,
  description: 'Exibe as 5 principais manchetes de notícias do momento em português.',
  icon: '❄️',
  color: '#00FFF7',
  saveToHistory: false,
  creditsPerUse: 1,
  requiresPayment: false,
  isPremium: false,
 
  handler: async ({ companyId, setActiveModal }) => {
    setActiveModal?.({ type: 'VerNoticiasDisplay', data: { companyId } });
    // SEM playText aqui — o modal fala no useEffect de mount
    return true;
  },
},

procurar_produto: {
  functionKey: 'procurar_produto',
  functionName: 'Procurar Produto',
  category: 'information' as any,
  responseType: 'voice+modal',
 
  voiceTriggers: [
    'procurar produto',
    'buscar produto',
    'mercado livre',
    'encontrar produto',
    'pesquisar produto',
    'busca produto',
    'procura produto',
    'buscar no mercado livre',
  ],
 
  examplePhrases: [
    'Procurar produto',
    'Buscar produto no Mercado Livre',
    'Quero comprar',
  ],
 
  edgeFunction: undefined,
  uiComponent: 'ProcurarProdutoDisplay',
  requiresInput: false,
  description: 'Pesquisa produtos no Mercado Livre Brasil e exibe os 5 resultados mais relevantes.',
  icon: '❄️',
  color: '#00FFF7',
  saveToHistory: false,
  creditsPerUse: 1,
  requiresPayment: false,
  isPremium: false,
 
  handler: async ({ companyId, setActiveModal }) => {
    setActiveModal?.({ type: 'ProcurarProdutoDisplay', data: { companyId } });
    // SEM playText aqui — o modal fala no useEffect de mount
    return true;
  },
},

ver_produtos: {
  functionKey: 'ver_produtos',
  functionName: 'Ver Produtos',
  category: 'products',
  responseType: 'voice+modal',
  voiceTriggers: [
    'detalhes do produto',
    'detalhes de produto', 
    'ver o produto',
    'quanto custa o produto',
    'quanto custa',
    'ver produtos',
    'catálogo de produtos',
    'produto no cardápio',
  ],
  examplePhrases: [
    'Me mostra a pizza de calabresa',
    'Detalhes do hambúrguer artesanal',
    'O que é o suco de laranja?',
    'Quanto custa a pizza grande?',
  ],
  requiresInput: false,
  description: 'Abre o catálogo de produtos. Pode receber um termo de busca para filtrar.',
  shortDescription: 'Ver catálogo de produtos',
  icon: '🛍️',
  color: '#10b981',
  saveToHistory: true,
  creditsPerUse: 0,
  requiresPayment: false,
  isPremium: false,
  handler: async ({ transcript, playText, setActiveModal, companyId }) => {
    try {
      // Extrai o nome do produto removendo os triggers
      const nomeProduto = (transcript ?? '')
        .replace(/me mostra|quero ver|detalhes do|detalhes de|o que é|o que e|como é|como e|informações sobre|informacoes sobre|mostra o|mostra a|ver o produto|ver a|quanto custa o|quanto custa a|qual o preco do|qual o preço do/gi, '')
        .replace(/\?/g, '')
        .trim();
      
      if (!nomeProduto || nomeProduto.length < 2) {
        await playText('Qual produto você quer ver? Me diga o nome.');
        return false;
      }

      const { buscarProdutoPorNome } = await import('@/lib/produtos-venda');
      let produtos = await buscarProdutoPorNome(companyId, nomeProduto);
      
      // Fallback com primeira palavra relevante
      if (!produtos.length) {
        const primeiraPalavra = nomeProduto.split(' ').find(w => w.length >= 3);
        if (primeiraPalavra) {
          produtos = await buscarProdutoPorNome(companyId, primeiraPalavra);
        }
      }

      if (!produtos.length) {
        await playText(`Não encontrei nenhum produto chamado ${nomeProduto}. Quer ver o cardápio completo?`);
        return true;
      }

      // Usa o primeiro por display_order (já ordenado pela query)
      const produto = produtos[0];
      
      // ✅ MANTÉM MODAL — VerProdutoDisplay tem botões importantes
      setActiveModal?.({
        type: 'VerProdutoDisplay',
        data: { companyId, produto },
      });
      
      return true;
    } catch (err) {
      console.error('Erro ver_produto:', err);
      await playText('Não consegui buscar o produto. Tente novamente.');
      return false;
    }
  },
},

consultar_estoque: {
  functionKey: 'consultar_estoque',
  functionName: 'Consultar Estoque',
  category: 'products',
  responseType: 'voice',

  voiceTriggers: [
    'estoque de', 'quantos tem', 'quanto tem',
    'verificar estoque', 'consultar estoque',
    'quantos restam', 'quanto resta', 'tem em estoque',
  ],

  examplePhrases: [
    'Quantos pães tem?',
    'Estoque de refrigerante',
    'Quanto resta de frango?',
    'Verificar estoque do café',
  ],

  requiresInput: true,
  inputType: 'text',
  inputPrompt: 'Qual produto você quer consultar?',
  description: 'Consulta o estoque atual de um produto específico.',
  shortDescription: 'Ver estoque de produto',
  icon: '📦',
  color: '#f59e0b',

  saveToHistory: true,
  creditsPerUse: 1,
  requiresPayment: false,
  isPremium: false,

  handler: async ({ transcript, playText, companyId }) => {
    try {
      // Extrai nome do produto do transcript
      const nomeProduto = transcript
        ?.replace(/estoque de|quantos tem|quanto tem|verificar estoque|consultar estoque|quantos restam|quanto resta|tem em estoque/gi, '')
        .trim();

      if (!nomeProduto) {
        await playText('Qual produto você quer consultar?');
        return false;
      }

      const { consultarEstoque, formatarPreco } = await import('@/lib/produtos-venda');
      const { produto, abaixoMinimo } = await consultarEstoque(companyId, nomeProduto);

      if (!produto) {
        await playText(`Não encontrei nenhum produto chamado ${nomeProduto} no cadastro.`);
        return true;
      }

      if (!produto.controla_estoque) {
        await playText(`${produto.nome}: estoque não controlado neste produto.`);
        return true;
      }

      const qtd = produto.estoque_atual;
      const unid = produto.unidade;

      if (qtd <= 0) {
        await playText(`${produto.nome} está sem estoque no momento.`);
      } else if (abaixoMinimo) {
        await playText(`${produto.nome} tem ${qtd} ${unid} em estoque — abaixo do mínimo. Necessário repor.`);
      } else {
        await playText(`${produto.nome} tem ${qtd} ${unid} em estoque.`);
      }

      return true;
    } catch (err) {
      console.error('Erro consultar_estoque:', err);
      await playText('Não consegui consultar o estoque. Tente novamente.');
      return false;
    }
  },
},

fazer_pedido: {
  functionKey: 'fazer_pedido',
  functionName: 'Fazer Pedido',
  category: 'products',
  responseType: 'navigation',
  voiceTriggers: [
    'quero pedir', 'fazer pedido', 'pedir agora',
    'adicionar ao carrinho', 'quero comprar',
    'adiciona', 'coloca no carrinho',
  ],
  examplePhrases: [
    'Quero 2 sucos de laranja',
    'Adicionar uma pizza ao pedido',
    'Pedir agora',
    'Coloca no carrinho',
  ],
  requiresInput: false,
  description: 'Abre o modo venda e conduz o cliente pelo pedido por voz.',
  shortDescription: 'Fazer pedido por voz',
  icon: '📋',
  color: '#f97316',
  saveToHistory: true,
  creditsPerUse: 0,
  requiresPayment: false,
  isPremium: false,
handler: async ({ transcript, playText, slug }) => {
  try {
    // Extrai itens do transcript
    const numerais: Record<string, string> = {
      'um': '1', 'uma': '1', 'dois': '2', 'duas': '2',
      'três': '3', 'tres': '3', 'quatro': '4', 'cinco': '5',
      'seis': '6', 'sete': '7', 'oito': '8', 'nove': '9', 'dez': '10',
    };
    
    let textoNorm = (transcript ?? '').toLowerCase();
    for (const [palavra, num] of Object.entries(numerais)) {
      textoNorm = textoNorm.replace(new RegExp(`\\b${palavra}\\b`, 'g'), num);
    }
    
    const regex = /(\d+)\s+([a-záéíóúãõâêîôûç][a-záéíóúãõâêîôûç\s]{2,40?}?)(?=\s*(?:e\s|\s*,|\s*$))/gi;
    const itensBrutos: { nome: string; quantidade: number }[] = [];
    let match;
    while ((match = regex.exec(textoNorm)) !== null) {
      const nome = match[2].replace(/\b(de|do|da|um|uma|o|a)\s*$/i, '').trim();
      if (nome.length >= 3) {
        itensBrutos.push({ nome, quantidade: parseInt(match[1]) });
      }
    }

    const baseUrl = getContextualRoute('vendas', slug);

    // Sem itens → abre modo venda normal
    if (itensBrutos.length === 0) {
      window.location.href = baseUrl;
      await playText('Abrindo o cardápio. Escolha os produtos.');
      return true;
    }

    // Com itens → serializa e navega
    const params = new URLSearchParams({
      itens: JSON.stringify(itensBrutos),
    });

    await playText('Buscando os produtos. Aguarde...');
    window.location.href = `${baseUrl}?${params.toString()}`;
    return true;
  } catch {
    const baseUrl = getContextualRoute('vendas', slug);
    window.location.href = baseUrl;
    return true;
  }
},
},

cadastrar_produto: {
  functionKey: 'cadastrar_produto',
  functionName: 'Cadastrar Produto',
  category: 'products',
  responseType: 'voice+modal',

  voiceTriggers: [
    'cadastro de produto', 'adicionar produto', 'novo produto',
    'criar produto', 'cadastrar item', 'adicionar item na loja',
  ],

  examplePhrases: [
    'Cadastrar novo produto',
    'Adicionar produto na loja',
    'Criar produto',
  ],

  requiresInput: false,
  description: 'Fluxo guiado por voz para cadastrar um novo produto na loja.',
  shortDescription: 'Cadastrar produto por voz',
  icon: '📦',
  color: '#6366f1',

  saveToHistory: true,
  creditsPerUse: 1,
  requiresPayment: false,
  isPremium: false,

handler: async ({ playText, setActiveModal, companyId }) => {
  try {
    setActiveModal?.({
      type: 'CadastrarProdutoDisplay',
      data: { companyId },
    });
    await playText('Vou te guiar no cadastro do produto. Qual o nome?');
    return true;
  } catch {
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

function extractMotivo(text: string): string {
  // Remove a parte do comando e pega o resto
  const motivoMatch = text
    .replace(/chamar (o )?gerente/gi, '')
    .replace(/preciso (do|da) gerente/gi, '')
    .trim();
  
  return motivoMatch || '';
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
