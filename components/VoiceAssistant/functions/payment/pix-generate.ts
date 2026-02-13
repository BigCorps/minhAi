// components/VoiceAssistant/functions/payment/pix-generate.ts
import { FunctionHandler, FunctionContext } from '../types';

export const pixGenerateHandler: FunctionHandler = {
  key: 'pix_generate',
  category: 'payment',
  
  triggers: [
    'gerar pix',
    'gera pix',
    'cria pix',
    'criar pix',
    'faça pix',
    'faz pix',
    'fazer pix',
    'pix de'
  ],
  
  detect(transcript: string): boolean {
    const lowerTranscript = transcript.toLowerCase();
    
    // Regex principal para detectar valor
    const pixRegex = /(?:gerar|gera|cria|criar|faça|faz|fazer)\s+(?:um\s+)?(?:pix|pics|pic|picks|pixs)(?:\s+de)?(?:\s+r\$)?(?:\s+reais?)?(?:\s+)?([\d]+(?:[,.]\d{1,2})?)/i;
    const pixMatch = lowerTranscript.match(pixRegex);
    
    if (pixMatch) return true;
    
    // Fallback: Detectar apenas se tem "pix" + número
    const pixFallbackRegex = /(?:pix|pics|pic|picks|pixs).*?([\d]+(?:[,.]\d{1,2})?)/i;
    return pixFallbackRegex.test(lowerTranscript);
  },
  
  async execute(transcript: string, context: FunctionContext): Promise<void> {
    const lowerTranscript = transcript.toLowerCase();
    
    console.log('💰 Executando função: Gerar PIX');
    console.log('📝 Transcript:', transcript);
    
    // ===== VALIDAÇÃO: VERIFICAR SE A CHAVE PIX ESTÁ CONFIGURADA =====
    try {
      const { data: company, error: companyError } = await context.supabase
        .from('companies')
        .select('pix_key, pix_key_type')
        .eq('id', context.companyId)
        .single();
      
      if (companyError) {
        console.error('❌ Erro ao buscar dados da empresa:', companyError);
        await context.playText('Erro ao verificar configurações do PIX.');
        return;
      }
      
      if (!company?.pix_key) {
        console.log('⚠️ Chave PIX não configurada para esta empresa');
        await context.playText(
          'A função PIX ainda não foi configurada. Por favor, configure sua chave PIX nas configurações do assistente.'
        );
        return;
      }
      
      console.log('✅ Chave PIX configurada:', {
        pix_key: company.pix_key,
        pix_key_type: company.pix_key_type
      });
    } catch (error) {
      console.error('❌ Erro ao validar configuração PIX:', error);
      await context.playText('Erro ao verificar configurações do PIX.');
      return;
    }
    // ===== FIM DA VALIDAÇÃO =====
    
    // Extrair valor do PIX
    const pixRegex = /(?:pix|pics|pic|picks|pixs).*?([\d]+(?:[,.]\d{1,2})?)/i;
    const match = lowerTranscript.match(pixRegex);
    
    if (!match) {
      console.log('⚠️ Valor não identificado');
      await context.playText('Não consegui identificar o valor do PIX');
      return;
    }
    
    const amountStr = match[1].replace(',', '.');
    const amount = parseFloat(amountStr);
    
    if (amount <= 0) {
      console.log('⚠️ Valor inválido:', amount);
      await context.playText('Valor inválido para PIX');
      return;
    }
    
    console.log('💵 Valor extraído:', amount);
    
    try {
      context.setIsProcessing(true);
      
      const amountCents = Math.round(amount * 100);
      
      console.log('📤 Chamando Edge Function: gerar-pix-assistente');
      console.log('📦 Payload:', {
        company_id: context.companyId,
        amount_cents: amountCents
      });
      
      const response = await context.supabase.functions.invoke('gerar-pix-assistente', {
        body: {
          company_id: context.companyId,
          amount_cents: amountCents
        }
      });
      
      if (response.error) {
        console.error('❌ Erro na Edge Function:', response.error);
        throw response.error;
      }
      
      const data = response.data;
      
      console.log('✅ PIX gerado com sucesso:', {
        transaction_id: data.transaction_id,
        amount_brl: data.amount_brl
      });
      
      // Atualizar estado do modal
      context.setPixConfirmationData({
        transactionId: data.transaction_id,
        amount: data.amount_brl,
        qrCodeUrl: data.qr_code_url,
        pixCode: data.pix_code
      });
      
      // Feedback por voz
      await context.playText(
        `PIX de ${amount.toFixed(2).replace('.', ',')} reais gerado. Aguardando confirmação.`
      );
      
    } catch (error: any) {
      console.error('❌ Erro ao gerar PIX:', error);
      await context.playText('Desculpe, não consegui gerar o PIX.');
    } finally {
      context.setIsProcessing(false);
    }
  },
  
  demo() {
    return {
      title: 'Gerar PIX',
      description: 'Gere QR Codes PIX instantaneamente por voz ou texto!',
      image: '/demos/pix-generate.png',
      steps: [
        '1. Diga: "Gerente, gerar PIX de 50 reais"',
        '2. QR Code aparece na tela instantaneamente',
        '3. Cliente escaneia com o celular',
        '4. Você confirma: "Confirmar PIX"',
        '5. Saldo atualizado automaticamente!'
      ]
    };
  }
};