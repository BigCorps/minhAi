// ============================================================
// handlers/qrcodeHandlers.ts
// Caminho: components/assistant/VoiceAssistant/handlers/qrcodeHandlers.ts
// ============================================================

import { createClient } from '@/lib/supabase-browser';
import { QRCodeData } from '../types';
import { saveInteractionToHistory } from './functionUsage';

interface QRCodeHandlerDeps {
  companyId: string;
  setIsProcessing: (v: boolean) => void;
  setQrCodeData: (data: QRCodeData | null) => void;
  playText: (text: string) => Promise<void>;
  // Opcional: quando fornecido, abre via ActionModals (necessário no modo texto)
  setActiveModal?: (modal: { type: string; data: any } | null) => void;
}

/**
 * Handler genérico para QR Codes (email, linkedin, tiktok, twitter, telefone, website, facebook).
 * Centraliza a lógica que se repetia em cada handleXxxCommand().
 * Quando setActiveModal está disponível (modo texto), usa QRCodeDisplay via ActionModals
 * em vez de setQrCodeData (que só aparece no AvatarFace, ausente no modo texto).
 */
export async function handleQRCodeCommand(
  qrType: string,
  { companyId, setIsProcessing, setQrCodeData, playText, setActiveModal }: QRCodeHandlerDeps
): Promise<void> {
  try {
    setIsProcessing(true);

    const supabase = createClient();
    const response = await supabase.functions.invoke('gerar-qrcode-contato', {
      body: { company_id: companyId, qr_type: qrType },
    });

    if (response.error) throw response.error;

    const data = response.data;

    const qrCodeData: QRCodeData = {
      type: qrType as QRCodeData['type'],
      qrCodeUrl: data.qr_code_url,
      qrContent: data.qr_content,
      displayText: data.display_text,
      companyName: data.company_name,
    };

    if (setActiveModal) {
      // Modo texto: renderiza via ActionModals (portal no document.body)
      setActiveModal({ type: 'QRCodeDisplay', data: qrCodeData });
    } else {
      // Modo voz/padrão: renderiza dentro do AvatarFace
      setQrCodeData(qrCodeData);
    }

    const speechMap: Record<string, string> = {
      whatsapp: `Aqui está o WhatsApp: ${data.display_text}`,
      instagram: `Aqui está o Instagram: ${data.display_text}`,
      email: `Aqui está o email: ${data.display_text}`,
      linkedin: `Aqui está o LinkedIn`,
      tiktok: `Aqui está o TikTok: ${data.display_text}`,
      twitter: `Aqui está o Twitter: ${data.display_text}`,
      telefone: `Aqui está o telefone: ${data.display_text}. Escaneie o QR Code para ligar diretamente.`,
      website: `Aqui está o site: ${data.display_text}`,
      facebook: `Aqui está o Facebook: ${data.display_text}`,
    };

    await playText(speechMap[qrType] || `Aqui está o ${qrType}: ${data.display_text}`);

    await saveInteractionToHistory(
      companyId,
      `Me passe o ${qrType}`,
      `QR Code de ${qrType} gerado: ${data.display_text}`
    );
  } catch (error: any) {
    console.error(`Erro ${qrType}:`, error);
    await playText(`Desculpe, não consegui obter o ${qrType}. Verifique se foi configurado.`);
  } finally {
    setIsProcessing(false);
  }
}
