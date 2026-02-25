/**
 * Processador de Comandos de Voz (Sistema Híbrido) - eAi
 * 
 * ⚠️ IMPORTANTE: Este processador é usado APENAS para NOVAS funções.
 * As funções legadas (WhatsApp, Instagram, PIX, etc.) são processadas
 * diretamente no VoiceAssistant através do detectVoiceCommand().
 * 
 * Este processador é chamado como FALLBACK quando nenhuma função
 * legada foi detectada.
 */

import { createClient } from '@/lib/supabase-browser';
import {
  FUNCTIONS_REGISTRY,
  detectFunctionFromTranscript,
  getFunctionByKey,
  type FunctionDefinition,
} from '@/lib/functions-registry';

/**
 * Interface de retorno do processador
 */
export interface CommandProcessResult {
  success: boolean;
  functionKey?: string;
  action: 'voice' | 'modal' | 'voice+modal' | 'none';
  
  // Para voz
  speechText?: string;
  
  // Para modal
  modalType?: string;
  modalData?: any;
  
  // Metadata
  creditsConsumed?: number;
  saveToHistory?: boolean;
  error?: string;
}

/**
 * Processador de Comandos para Novas Funções
 */
export class VoiceCommandProcessor {
  private companyId: string;
  private functionSettings: Record<string, {
    saveToHistory: boolean;
    creditsPerUse: number;
    isEnabled: boolean;
  }> = {};
  
  constructor(companyId: string) {
    this.companyId = companyId;
  }
  
  /**
   * Inicializa carregando as configurações das funções
   */
  async initialize() {
    await this.loadFunctionSettings();
  }
  
  /**
   * Carrega configurações de funções do banco
   */
  private async loadFunctionSettings() {
    try {
      const supabase = createClient();
      
      const legacyFunctions = [
        'qrcode_whatsapp',
        'qrcode_instagram',
        'pix_generate',
        'pix_confirm',
        'pix_cancel',
        'faq',
        'chatgpt'
      ];
      
      const { data, error } = await supabase
        .from('assistant_functions')
        .select(`
          function_key,
          save_to_history,
          credits_per_use,
          is_active,
          company_function_settings!inner(
            is_enabled,
            custom_credits_per_use
          )
        `)
        .eq('company_function_settings.company_id', this.companyId)
        .not('function_key', 'in', `(${legacyFunctions.join(',')})`);
      
      if (error) {
        console.warn('⚠️ Erro ao carregar settings novas funções, usando defaults');
        return;
      }
      
      if (data) {
        const settings: Record<string, any> = {};
        data.forEach(f => {
          const companySetting = f.company_function_settings?.[0];
          settings[f.function_key] = {
            saveToHistory: f.save_to_history,
            creditsPerUse: companySetting?.custom_credits_per_use ?? f.credits_per_use,
            isEnabled: companySetting?.is_enabled ?? true,
          };
        });
        
        this.functionSettings = settings;
        console.log('✅ Settings de novas funções carregados:', Object.keys(settings).length);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar function settings:', error);
    }
  }
  
  /**
   * Processa um comando de voz (APENAS PARA NOVAS FUNÇÕES)
   */
  async processCommand(transcript: string): Promise<CommandProcessResult> {
    console.log('🔍 Processando comando (novas funções):', transcript);
    
    // 1. Detectar qual função deve ser ativada
    const detection = detectFunctionFromTranscript(transcript);
    
    if (!detection.function) {
      console.log('❌ Nenhuma nova função detectada');
      return {
        success: false,
        action: 'none',
        error: 'NO_FUNCTION_DETECTED',
      };
    }
    
    const func = detection.function;
    console.log(`✅ Nova função detectada: ${func.functionKey} (${Math.round(detection.confidence * 100)}%)`);
    
    // 2. Verificar se a função está habilitada
    const isEnabled = this.checkIfFunctionEnabled(func.functionKey);
    
    if (!isEnabled) {
      return {
        success: false,
        action: 'voice',
        speechText: `A função ${func.functionName} está desativada no momento.`,
        error: 'FUNCTION_DISABLED',
      };
    }
    
    // 3. Verificar se precisa de input numérico extraído
    // ✅ CORRIGIDO: só bloqueia se a função exige número extraído do transcript
    // (ex: NFC, Link de Pagamento que precisam de valor em reais).
    // Funções como 'orcamento' usam o transcript completo como pergunta — não bloqueiam aqui.
    const needsExtractedNumber = func.requiresInput &&
      func.inputType === 'number' &&
      !detection.extractedValue;

    if (needsExtractedNumber) {
      return {
        success: true,
        action: 'voice',
        speechText: func.inputPrompt || `Por favor, informe o valor para ${func.functionName}.`,
        functionKey: func.functionKey,
      };
    }
    
    // 4. Executar a função
    return await this.executeFunction(func, detection.extractedValue);
  }
  
  /**
   * Executa uma função específica
   */
  async executeFunction(
    func: FunctionDefinition,
    extractedValue?: any
  ): Promise<CommandProcessResult> {
    try {
      console.log(`⚡ [Processor] Executando função: ${func.functionKey}`);
      
      // Verificar se tem handler customizado
      if (func.handler) {
        console.log(`🎯 [Processor] Função tem handler customizado, delegando...`);
        
        // Retornar sem executar aqui - será executado no VoiceAssistant
        return {
          success: true,
          functionKey: func.functionKey,
          action: 'voice',
          speechText: '',
          creditsConsumed: this.getFunctionCredits(func.functionKey),
          saveToHistory: this.shouldSaveToHistory(func.functionKey),
        };
      }
      
      // Executar baseado no tipo de resposta (funções sem handler)
      switch (func.responseType) {
        case 'voice':
          return await this.handleVoiceOnly(func, extractedValue);
        
        case 'voice+modal':
          return await this.handleVoiceWithModal(func, extractedValue);
        
        default:
          throw new Error(`Response type não suportado: ${func.responseType}`);
      }
      
    } catch (error: any) {
      console.error('❌ [Processor] Erro ao executar função:', error);
      
      return {
        success: false,
        action: 'voice',
        speechText: `Desculpe, ocorreu um erro ao executar ${func.functionName}.`,
        error: error.message,
      };
    }
  }
  
  /**
   * Handler para funções que só retornam voz
   */
  private async handleVoiceOnly(
    func: FunctionDefinition,
    value?: any
  ): Promise<CommandProcessResult> {
    if (func.edgeFunction) {
      const result = await this.callEdgeFunction(func.edgeFunction, func.functionKey, value);
      
      return {
        success: true,
        functionKey: func.functionKey,
        action: 'voice',
        speechText: result.message || result.text || 'Operação concluída',
        creditsConsumed: this.getFunctionCredits(func.functionKey),
        saveToHistory: this.shouldSaveToHistory(func.functionKey),
      };
    }
    
    return {
      success: true,
      functionKey: func.functionKey,
      action: 'voice',
      speechText: func.description,
      creditsConsumed: this.getFunctionCredits(func.functionKey),
      saveToHistory: this.shouldSaveToHistory(func.functionKey),
    };
  }
  
  /**
   * Handler para funções que retornam voz + modal
   */
  private async handleVoiceWithModal(
    func: FunctionDefinition,
    value?: any
  ): Promise<CommandProcessResult> {
    if (!func.edgeFunction) {
      throw new Error('Edge function não configurada para função com modal');
    }
    
    const result = await this.callEdgeFunction(func.edgeFunction, func.functionKey, value);
    
    return {
      success: true,
      functionKey: func.functionKey,
      action: 'voice+modal',
      speechText: result.speech_text || result.message,
      modalType: func.uiComponent || 'GenericModal',
      modalData: result,
      creditsConsumed: this.getFunctionCredits(func.functionKey),
      saveToHistory: this.shouldSaveToHistory(func.functionKey),
    };
  }
  
  /**
   * Chama uma Edge Function do Supabase
   */
  private async callEdgeFunction(functionName: string, functionKey: string, value?: any) {
    const supabase = createClient();
    
    const payload: any = {
      company_id: this.companyId,
    };

    if (functionKey.startsWith('qrcode_')) {
      payload.qr_type = functionKey.replace('qrcode_', '');
    }

    if (value !== undefined) {
      payload.value = value;
    }
    
    console.log(`📤 Chamando Edge Function: ${functionName}`, payload);
    
    const response = await supabase.functions.invoke(functionName, {
      body: payload,
    });
    
    if (response.error) {
      throw new Error(response.error.message || 'Erro na Edge Function');
    }
    
    console.log('✅ Edge Function executada com sucesso');
    
    return response.data;
  }
  
  /**
   * Verifica se função está habilitada
   */
  private checkIfFunctionEnabled(functionKey: string): boolean {
    if (this.functionSettings[functionKey] !== undefined) {
      return this.functionSettings[functionKey].isEnabled;
    }
    return true;
  }
  
  /**
   * Obtém créditos configurados para a função
   */
  getFunctionCredits(functionKey: string): number {
    if (this.functionSettings[functionKey]) {
      return this.functionSettings[functionKey].creditsPerUse;
    }
    const func = getFunctionByKey(functionKey);
    return func?.creditsPerUse || 0;
  }
  
  /**
   * Verifica se deve salvar no histórico
   */
  shouldSaveToHistory(functionKey: string): boolean {
    if (this.functionSettings[functionKey]) {
      return this.functionSettings[functionKey].saveToHistory;
    }
    const func = getFunctionByKey(functionKey);
    return func?.saveToHistory || false;
  }
  
  /**
   * Registra uso de créditos
   */
  async registerUsage(functionKey: string) {
    try {
      const supabase = createClient();
      const credits = this.getFunctionCredits(functionKey);
      
      await supabase.rpc('register_function_usage', {
        p_company_id: this.companyId,
        p_function_key: functionKey,
        p_credits_consumed: credits,
      });
      
      console.log(`✅ Uso registrado: ${functionKey} (${credits} créditos)`);
    } catch (error) {
      console.error('❌ Erro ao registrar uso:', error);
    }
  }
}
