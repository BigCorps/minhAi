// components/VoiceAssistant/functions/contact/instagram.ts

import { FunctionHandler, FunctionContext } from '../types';

export const instagramQRHandler: FunctionHandler = {
  key: 'qrcode_instagram',
  category: 'contact',
  
  triggers: [
    'mostre o instagram',
    'qual o instagram',
    'qual é o instagram',
    'me passa o instagram',
    'instagram da empresa',
    'arroba do instagram',
    'quero o instagram',
    'me manda o instagram',
    'insta',
    'ig',
    'arroba'
  ],
  
  detect(transcript: string): boolean {
    const lower = transcript.toLowerCase();
    return this.triggers.some(trigger => lower.includes(trigger));
  },
  
  async execute(transcript: string, context: FunctionContext): Promise<void> {
    console.log('📸 Executando função: QR Code Instagram');
    
    try {
      context.setIsProcessing(true);
      
      console.log('📤 Chamando Edge Function: gerar-qrcode-contato');
      console.log('📦 Payload:', {
        company_id: context.companyId,
        qr_type: 'instagram'
      });
      
      const response = await context.supabase.functions.invoke('gerar-qrcode-contato', {
        body: {
          company_id: context.companyId,
          qr_type: 'instagram'
        }
      });
      
      if (response.error) {
        console.error('❌ Erro na Edge Function:', response.error);
        throw response.error;
      }
      
      const data = response.data;
      
      console.log('✅ QR Code Instagram gerado:', {
        display_text: data.display_text,
        company_name: data.company_name
      });
      
      // Atualizar estado do modal/display
      context.setQrCodeData({
        type: 'instagram',
        qrCodeUrl: data.qr_code_url,
        qrContent: data.qr_content,
        displayText: data.display_text,
        companyName: data.company_name
      });
      
      // Feedback por voz
      await context.playText(`Aqui está o Instagram: ${data.display_text}`);
      
    } catch (error: any) {
      console.error('❌ Erro ao gerar QR Code Instagram:', error);
      await context.playText('Desculpe, não consegui obter o Instagram.');
    } finally {
      context.setIsProcessing(false);
    }
  },
  
  demo() {
    return {
      title: 'QR Code Instagram',
      description: 'Compartilhe seu Instagram com QR Code instantaneamente!',
      image: '/demos/instagram-qr.png',
      steps: [
        '1. Cliente pergunta: "Qual o Instagram?"',
        '2. QR Code aparece na tela',
        '3. Cliente escaneia com a câmera',
        '4. Instagram abre automaticamente',
        '5. Cliente segue o perfil na hora!'
      ]
    };
  }
};
