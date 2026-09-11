// components/VoiceAssistant/functions/payment/pix-generate.ts
import { FunctionHandler, FunctionContext } from '../types';

export const pixGenerateHandler: FunctionHandler = {
  key: 'pix_generate',
  category: 'payment',
  triggers: ['gerar pix', 'gera pix', 'cria pix', 'criar pix', 'faça pix', 'faz pix', 'fazer pix', 'pix de'],

  detect(transcript: string): boolean {
    const lower = transcript.toLowerCase();
    const main = /(?:gerar|gera|cria|criar|faça|faz|fazer)\s+(?:um\s+)?(?:pix|pics|pic|picks|pixs)(?:\s+de)?(?:\s+r\$)?(?:\s+reais?)?(?:\s+)?([\d]+(?:[,.]\d{1,2})?)/i;
    if (main.test(lower)) return true;
    return /(?:pix|pics|pic|picks|pixs).*?([\d]+(?:[,.]\d{1,2})?)/i.test(lower);
  },

  async execute(transcript: string, context: FunctionContext): Promise<void> {
    const match = transcript.toLowerCase().match(/(?:pix|pics|pic|picks|pixs).*?([\d]+(?:[,.]\d{1,2})?)/i);
    if (!match) { await context.playText('Não consegui identificar o valor do PIX'); return; }
    const amount = Number(match[1].replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) { await context.playText('Valor inválido para PIX'); return; }

    try {
      // A Edge Function é a autoridade sobre configuração e modo de PIX.
      // O navegador não lê mais receiving_pix_key nem receiving_pix_key_type.
      context.setIsProcessing(true);
      const response = await context.supabase.functions.invoke('gerar-pix-assistente-v2', {
        body: { company_id: context.companyId, amount_cents: Math.round(amount * 100) },
      });

      const data = response.data;
      const providerError = String(data?.error || response.error?.message || '');
      if (providerError === 'pix_key_required') {
        await context.playText('A função PIX ainda não foi configurada. Configure sua chave PIX nas configurações do assistente.');
        return;
      }
      if (providerError === 'mp_connection_required') {
        await context.playText('A confirmação automática do PIX ainda não está configurada. Revise a conexão Mercado Pago no painel.');
        return;
      }
      if (response.error) throw response.error;
      if (!data?.success && providerError) throw new Error(providerError);
      if (!data?.transaction_id || !data?.pix_code) throw new Error('invalid_pix_response');

      const effective = Number(data.amount_brl || amount);
      const discount = Number(data.discount_cents || 0);
      context.setPixConfirmationData({
        transactionId: data.transaction_id,
        amount: effective,
        qrCodeUrl: data.qr_code_url,
        pixCode: data.pix_code,
      });

      if (discount > 0) {
        await context.playText(`PIX gerado. Foi aplicado um desconto Pix de ${discount} centavos. O valor para pagamento é ${effective.toFixed(2).replace('.', ',')} reais.`);
      } else {
        await context.playText(`PIX de ${effective.toFixed(2).replace('.', ',')} reais gerado. Aguardando confirmação.`);
      }
    } catch (error: any) {
      console.error('❌ Erro ao gerar PIX:', error);
      const msg = String(error?.message || error || '');
      if (msg.includes('pix_direct_slots_unavailable')) await context.playText('Há muitas cobranças iguais abertas agora. Tente novamente em instantes.');
      else if (msg.includes('pix_key_required')) await context.playText('A função PIX ainda não foi configurada. Configure sua chave PIX nas configurações do assistente.');
      else if (msg.includes('mp_connection_required')) await context.playText('A confirmação automática do PIX ainda não está configurada. Revise a conexão Mercado Pago no painel.');
      else await context.playText('Desculpe, não consegui gerar o PIX.');
    } finally { context.setIsProcessing(false); }
  },

  demo() {
    return {
      title: 'Gerar PIX',
      description: 'Gere QR Codes PIX instantaneamente por voz ou texto!',
      image: '/demos/pix-generate.png',
      steps: ['1. Diga: "Gerente, gerar PIX de 50 reais"', '2. QR Code aparece na tela', '3. Cliente paga pelo banco', '4. A confirmação acontece automaticamente', '5. O sistema conclui a venda'],
    };
  },
};
