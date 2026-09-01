// components/VoiceAssistant/functions/payment/pix-confirm.ts
import { FunctionHandler, FunctionContext } from '../types';

export const pixConfirmHandler: FunctionHandler = {
  key: 'pix_confirm',
  category: 'payment',
  triggers: ['confirmar pix', 'confirmar pis', 'confirmar picos', 'confirma pix', 'confirmar o pix', 'confirma o pix', 'confirme o pix', 'pix confirmado', 'paguei o pix', 'paguei', 'já paguei', 'pagamento confirmado'],
  detect(transcript: string): boolean { const lower = transcript.toLowerCase(); return this.triggers.some(trigger => lower.includes(trigger)); },

  async execute(_transcript: string, context: FunctionContext): Promise<void> {
    const currentData = context.pixStateRef.current?.pixConfirmationData;
    if (!currentData) { await context.playText('Não há nenhum PIX aberto para confirmar'); return; }

    try {
      context.setIsProcessing(true);
      await context.playText('Confirmando pagamento...');
      const response = await context.supabase.functions.invoke('confirmar-pix-assistente-v2', {
        body: { transaction_id: currentData.transactionId },
      });
      if (response.error) {
        await context.playText('PIX ainda não foi pago. Aguarde alguns segundos após o pagamento e tente novamente.');
        return;
      }
      const data = response.data;
      if (!data?.success) {
        await context.playText('PIX ainda não foi pago. Aguarde e tente novamente.');
        return;
      }
      context.setPixConfirmationData(null);
      await context.playText('Pagamento confirmado com sucesso!');
    } catch (error: any) {
      console.error('❌ Erro ao confirmar PIX:', error);
      await context.playText('Erro ao confirmar pagamento. Tente novamente.');
    } finally { context.setIsProcessing(false); }
  },

  demo() {
    return {
      title: 'Confirmar Pagamento PIX',
      description: 'Confirme pagamentos recebidos por voz!',
      image: '/demos/pix-confirm.png',
      steps: ['1. Cliente paga o PIX', '2. O sistema verifica automaticamente', '3. Você também pode dizer "Confirmar PIX"', '4. O recebimento é validado', '5. A venda é concluída'],
    };
  },
};
