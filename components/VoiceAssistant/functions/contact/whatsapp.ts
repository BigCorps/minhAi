// components/VoiceAssistant/functions/contact/whatsapp.ts

import { FunctionHandler, FunctionContext } from '../types';

export const whatsappQRHandler: FunctionHandler = {
  key: 'qrcode_whatsapp',
  category: 'contact',
  
  triggers: [
    'mostre o whatsapp',
    'qual o whatsapp',
    'qual é o whatsapp',
    'me passa o whatsapp',
    'whatsapp da empresa',
    'número do whatsapp',
    'quero o whatsapp',
    'me manda o whatsapp',
    'whats',
    'zap'
  ],
  
  detect(transcript: string): boolean {
    const lower = transcript.toLowerCase();
    return this.triggers.some(trigger => lower.includes(trigger));
  },
  
  async execute(transcript: string, context: FunctionContext): Promise<void> {
    console.log('📱 Executando função: QR Code WhatsApp');
    
    try {
      context.setIsProcessing(true);
      
      console.log('📤 Chamando Edge Function: gerar-qrcode-contato');
      console.log('📦 Payload:', {
        company_id: context.companyId,
        qr_type: 'whatsapp'
      });
      
      const response = await context.supabase.functions.invoke('gerar-qrcode-contato', {
        body: {
          company_id: context.companyId,
          qr_type: 'whatsapp'
        }
      });
      
      if (response.error) {
        console.error('❌ Erro na Edge Function:', response.error);
        throw response.error;
      }
      
      const data = response.data;
      
      console.log('✅ QR Code WhatsApp gerado:', {
        display_text: data.display_text,
        company_name: data.company_name
      });
      
      // Atualizar estado do modal/display
      context.setQrCodeData({
        type: 'whatsapp',
        qrCodeUrl: data.qr_code_url,
        qrContent: data.qr_content,
        displayText: data.display_text,
        companyName: data.company_name
      });
      
      // Feedback por voz
      await context.playText(`Aqui está o WhatsApp: ${data.display_text}`);
      
    } catch (error: any) {
      console.error('❌ Erro ao gerar QR Code WhatsApp:', error);
      await context.playText('Desculpe, não consegui obter o WhatsApp.');
    } finally {
      context.setIsProcessing(false);
    }
  },
  
  demo() {
    return {
      title: 'QR Code WhatsApp',
      description: 'Compartilhe seu WhatsApp com QR Code instantaneamente!',
      image: '/demos/whatsapp-qr.png',
      steps: [
        '1. Cliente pergunta: "Qual o WhatsApp?"',
        '2. QR Code aparece na tela',
        '3. Cliente escaneia com a câmera',
        '4. WhatsApp abre automaticamente',
        '5. Cliente adiciona contato ou inicia conversa!'
      ]
    };
  }
};
