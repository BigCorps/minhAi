// components/VoiceAssistant/functions/payment/pix-cancel.ts

import { FunctionHandler, FunctionContext } from '../types';

export const pixCancelHandler: FunctionHandler = {
  key: 'pix_cancel',
  category: 'payment',
  
  triggers: [
    'cancelar pix',
    'cancelar pis',
    'cancelar picos',
    'cancela pix',
    'cancelar o pix',
    'cancela o pix',
    'cancele o pix',
    'desistir do pix',
    'não quero',
    'não vou pagar',
    'fechar pix'
  ],
  
  detect(transcript: string): boolean {
    const lower = transcript.toLowerCase();
    return this.triggers.some(trigger => lower.includes(trigger));
  },
  
  async execute(transcript: string, context: FunctionContext): Promise<void> {
    console.log('❌ Executando função: Cancelar PIX');
    
    // ✅ LER DO REF (não do estado, pois pode estar desatualizado)
    const currentData = context.pixStateRef.current?.pixConfirmationData;
    
    if (!currentData) {
      console.log('⚠️ Nenhum PIX aberto para cancelar');
      await context.playText('Não há nenhum PIX aberto para cancelar');
      return;
    }
    
    console.log('💳 PIX encontrado:', {
      transactionId: currentData.transactionId,
      amount: currentData.amount
    });
    
    try {
      context.setIsProcessing(true);
      
      // Feedback imediato
      await context.playText('Cancelando PIX...');
      
      console.log('📤 Chamando Edge Function: cancelar-pix-assistente');
      console.log('📦 Payload:', {
        transaction_id: currentData.transactionId
      });
      
      const response = await context.supabase.functions.invoke('cancelar-pix-assistente', {
        body: {
          transaction_id: currentData.transactionId
        }
      });
      
      if (response.error) {
        console.error('❌ Erro na Edge Function:', response.error);
        throw response.error;
      }
      
      console.log('✅ PIX cancelado com sucesso');
      
      // Fechar modal
      context.setPixConfirmationData(null);
      
      // Feedback
      await context.playText('PIX cancelado.');
      
    } catch (error: any) {
      console.error('❌ Erro ao cancelar PIX:', error);
      await context.playText('Erro ao cancelar PIX. Tente novamente.');
    } finally {
      context.setIsProcessing(false);
    }
  },
  
  demo() {
    return {
      title: 'Cancelar PIX',
      description: 'Cancele PIX não utilizados por voz!',
      image: '/demos/pix-cancel.png',
      steps: [
        '1. Você gerou um PIX mas cliente desistiu',
        '2. Diga: "Cancelar PIX"',
        '3. Modal fecha automaticamente',
        '4. PIX marcado como cancelado no banco',
        '5. Pronto para gerar novo PIX!'
      ]
    };
  }
};
