// components/VoiceAssistant/functions/payment/pix-confirm.ts

import { FunctionHandler, FunctionContext } from '../types';

export const pixConfirmHandler: FunctionHandler = {
  key: 'pix_confirm',
  category: 'payment',
  
  triggers: [
    'confirmar pix',
    'confirmar pis',
    'confirmar picos',
    'confirma pix',
    'confirmar o pix',
    'confirma o pix',
    'confirme o pix',
    'pix confirmado',
    'paguei o pix',
    'paguei',
    'já paguei',
    'pagamento confirmado'
  ],
  
  detect(transcript: string): boolean {
    const lower = transcript.toLowerCase();
    return this.triggers.some(trigger => lower.includes(trigger));
  },
  
  async execute(transcript: string, context: FunctionContext): Promise<void> {
    console.log('✅ Executando função: Confirmar PIX');
    
    // ✅ LER DO REF (não do estado, pois pode estar desatualizado)
    const currentData = context.pixStateRef.current?.pixConfirmationData;
    
    if (!currentData) {
      console.log('⚠️ Nenhum PIX aberto para confirmar');
      await context.playText('Não há nenhum PIX aberto para confirmar');
      return;
    }
    
    console.log('💳 PIX encontrado:', {
      transactionId: currentData.transactionId,
      amount: currentData.amount
    });
    
    try {
      context.setIsProcessing(true);
      
      // Feedback imediato
      await context.playText('Confirmando pagamento...');
      
      console.log('📤 Chamando Edge Function: confirmar-pix-assistente');
      console.log('📦 Payload:', {
        transaction_id: currentData.transactionId
      });
      
      const response = await context.supabase.functions.invoke('confirmar-pix-assistente', {
        body: {
          transaction_id: currentData.transactionId
        }
      });
      
      console.log('📥 Resposta Edge Function:', response);
      
      // ✅ TRATAR ERRO 400 (PIX NÃO PAGO)
      if (response.error) {
        console.log('❌ Erro detectado:', response.error);
        console.log('📦 Context:', response.error.context);
        
        // PIX ainda não foi pago - Mensagem amigável
        await context.playText(
          'PIX ainda não foi pago. Aguarde alguns segundos após o pagamento e tente novamente.'
        );
        return; // ← NÃO FECHA O MODAL
      }
      
      // ✅ Verificar sucesso na resposta
      const data = response.data;
      
      if (!data || !data.success) {
        console.log('⏳ Resposta sem sucesso:', data);
        await context.playText('PIX ainda não foi pago. Aguarde e tente novamente.');
        return; // ← NÃO FECHA O MODAL
      }
      
      // ✅ SUCESSO! (SEM FALAR O SALDO - PRIVACIDADE!)
      console.log('✅ PIX confirmado com sucesso:', {
        amount_received: data.amount_received,
        new_balance: data.new_balance,
        bank_status: data.bank_status
      });
      
      // Fechar modal
      context.setPixConfirmationData(null);
      
      // ✅ NÃO REVELAR INFORMAÇÃO FINANCEIRA
      await context.playText('Pagamento confirmado com sucesso!');
      
    } catch (error: any) {
      console.error('❌ Erro ao confirmar PIX:', error);
      await context.playText('Erro ao confirmar pagamento. Tente novamente.');
    } finally {
      context.setIsProcessing(false);
    }
  },
  
  demo() {
    return {
      title: 'Confirmar Pagamento PIX',
      description: 'Confirme pagamentos recebidos por voz!',
      image: '/demos/pix-confirm.png',
      steps: [
        '1. Cliente paga o PIX no banco dele',
        '2. Aguarde alguns segundos',
        '3. Diga: "Confirmar PIX"',
        '4. Sistema verifica no banco automaticamente',
        '5. Saldo atualizado se pagamento confirmado!'
      ]
    };
  }
};
