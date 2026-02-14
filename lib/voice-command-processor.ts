/**
 * Processador Dinâmico de Comandos de Voz - eAi
 * 
 * Este módulo processa comandos de voz usando o functions-registry
 * de forma automática e dinâmica.
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
 * Classe principal do processador
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
        .eq('company_function_settings.company_id', this.companyId);
      
      if (error) {
        console.warn('⚠️ Erro ao carregar settings, usando defaults do registry');
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
        console.log('✅ Function settings carregados:', Object.keys(settings).length, 'funções');
      }
    } catch (error) {
      console.error('❌ Erro ao carregar function settings:', error);
    }
  }
  
  /**
   * Processa um comando de voz
   */
  async processCommand(transcript: string): Promise<CommandProcessResult> {
    console.log('🎯 Processando comando:', transcript);
    
    // 1. Detectar qual função deve ser ativada
    const detection = detectFunctionFromTranscript(transcript);
    
    if (!detection.function) {
      console.log('❌ Nenhuma função detectada');
      return {
        success: false,
        action: 'none',
        error: 'NO_FUNCTION_DETECTED',
      };
    }
    
    const func = detection.function;
    console.log(`✅ Função detectada: ${func.functionKey} (${Math.round(detection.confidence * 100)}%)`);
    
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
    
    // 3. Verificar se precisa de input adicional
    if (func.requiresInput && !detection.extractedValue) {
      return {
        success: true,
        action: 'voice',
        speechText: func.inputPrompt || `Por favor, forneça mais informações para ${func.functionName}`,
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
      console.log(`⚡ Executando: ${func.functionKey}`);
      
      // Executar baseado no tipo de resposta
      switch (func.responseType) {
        case 'voice':
          return await this.handleVoiceOnly(func, extractedValue);
        
        case 'voice+modal':
          return await this.handleVoiceWithModal(func, extractedValue);
        
        default:
          throw new Error(`Response type não suportado: ${func.responseType}`);
      }
      
    } catch (error: any) {
      console.error('❌ Erro ao executar função:', error);
      
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
    // Se tem Edge Function, chamar ela
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
    
    // Senão, retornar texto padrão
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
    
    // Chamar Edge Function
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
    
    // Adicionar valor específico baseado na função
    if (functionKey === 'pix_generate' && typeof value === 'number') {
      payload.amount_cents = Math.round(value * 100);
    }
    
    if (functionKey === 'qrcode_whatsapp') {
      payload.qr_type = 'whatsapp';
    }
    
    if (functionKey === 'qrcode_instagram') {
      payload.qr_type = 'instagram';
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
    // Verificar cache primeiro
    if (this.functionSettings[functionKey] !== undefined) {
      return this.functionSettings[functionKey].isEnabled;
    }
    
    // Se não tem no cache, assumir habilitada
    return true;
  }
  
  /**
   * Obtém créditos configurados para a função
   */
  getFunctionCredits(functionKey: string): number {
    if (this.functionSettings[functionKey]) {
      return this.functionSettings[functionKey].creditsPerUse;
    }
    
    // Fallback para o registry
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
    
    // Fallback para o registry
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
