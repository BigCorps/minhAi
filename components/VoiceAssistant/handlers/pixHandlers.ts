// ============================================================
// handlers/pixHandlers.ts
// Caminho: components/VoiceAssistant/handlers/pixHandlers.ts
// ============================================================

import { createClient } from '@/lib/supabase-browser';
import { PixConfirmationData, FunctionSettings } from '../types';
import { saveInteractionToHistory, registerFunctionUsage } from './functionUsage';

interface PixDeps {
  companyId: string;
  setIsProcessing: (v: boolean) => void;
  setPixConfirmationData: (data: PixConfirmationData | null) => void;
  playText: (text: string) => Promise<void>;
  functionSettings: Record<string, FunctionSettings>;
  // Opcional: quando fornecido, abre via ActionModals (necessário no modo texto,
  // onde o AvatarFace não é renderizado)
  setActiveModal?: (modal: { type: string; data: any } | null) => void;
}

/**
 * Gera um PIX via Edge Function do Supabase.
 * Quando setActiveModal está disponível (modo texto), exibe via PIXConfirmationModal
 * em vez de setPixConfirmationData (que só aparece no AvatarFace).
 * ⚠️ NÃO salva no histórico — apenas confirmação salva.
 */
export async function handlePixCommand(
  amount: number,
  { companyId, setIsProcessing, setPixConfirmationData, playText, setActiveModal }: PixDeps
): Promise<void> {
  try {
    setIsProcessing(true);

    const amountCents = Math.round(amount * 100);

    const supabase = createClient();
    const response = await supabase.functions.invoke('gerar-pix-assistente', {
      body: { company_id: companyId, amount_cents: amountCents },
    });

    if (response.error) throw response.error;

    const data = response.data;

    const pixData: PixConfirmationData = {
      transactionId: data.transaction_id,
      amount: data.amount_brl,
      qrCodeUrl: data.qr_code_url,
      pixCode: data.pix_code,
    };

    if (setActiveModal) {
      // Modo texto: renderiza via ActionModals (portal no document.body)
      setActiveModal({ type: 'PIXConfirmationModal', data: pixData });
    } else {
      // Modo voz/padrão: renderiza dentro do AvatarFace
      setPixConfirmationData(pixData);
    }

    await playText(`PIX de ${amount.toFixed(2).replace('.', ',')} reais gerado. Aguardando confirmação.`);

  } catch (error: any) {
    console.error('Erro PIX:', error);
    await playText('Desculpe, não consegui gerar o PIX.');
  } finally {
    setIsProcessing(false);
  }
}

/**
 * Confirma um PIX aberto via Edge Function do Supabase.
 * ✅ Salva no histórico apenas após confirmação bem-sucedida.
 */
export async function handleConfirmPix(
  pixConfirmationData: PixConfirmationData | null,
  { companyId, setIsProcessing, setPixConfirmationData, playText, functionSettings, setActiveModal }: PixDeps
): Promise<void> {
  console.log('🔘 handleConfirmPix chamada');

  if (!pixConfirmationData) {
    console.log('⚠️ pixConfirmationData não existe');
    await playText('Não há nenhum PIX aberto para confirmar');
    return;
  }

  try {
    setIsProcessing(true);
    await playText('Confirmando pagamento...');

    const supabase = createClient();
    const response = await supabase.functions.invoke('confirmar-pix-assistente', {
      body: { transaction_id: pixConfirmationData.transactionId },
    });

    if (response.error) {
      await playText('PIX ainda não foi pago. Aguarde alguns segundos após o pagamento e tente novamente.');
      return;
    }

    const data = response.data;

    if (!data || !data.success) {
      await playText('PIX ainda não foi pago. Aguarde e tente novamente.');
      return;
    }

    console.log('✅ PIX confirmado:', data);

    // Fecha o modal independente do modo
    if (setActiveModal) {
      setActiveModal(null);
    } else {
      setPixConfirmationData(null);
    }

    await playText('Pagamento confirmado com sucesso!');

    await saveInteractionToHistory(
      companyId,
      `PIX de R$ ${pixConfirmationData.amount} confirmado`,
      `Pagamento PIX de R$ ${pixConfirmationData.amount} confirmado com sucesso!`
    );

    await registerFunctionUsage(
      companyId,
      'pix_confirm',
      functionSettings['pix_confirm']?.creditsPerUse ?? 1
    );
  } catch (error: any) {
    console.error('❌ Erro geral:', error);
    await playText('Erro ao confirmar pagamento. Tente novamente.');
  } finally {
    setIsProcessing(false);
  }
}

/**
 * Cancela um PIX aberto via Edge Function do Supabase.
 * ⚠️ NÃO salva no histórico.
 */
export async function handleCancelPix(
  pixConfirmationData: PixConfirmationData | null,
  { companyId, setIsProcessing, setPixConfirmationData, playText, setActiveModal }: PixDeps
): Promise<void> {
  console.log('🔘 handleCancelPix chamada');

  if (!pixConfirmationData) {
    console.log('⚠️ pixConfirmationData não existe');
    await playText('Não há nenhum PIX aberto para cancelar');
    return;
  }

  try {
    setIsProcessing(true);
    await playText('Cancelando PIX...');

    const supabase = createClient();
    const response = await supabase.functions.invoke('cancelar-pix-assistente', {
      body: { transaction_id: pixConfirmationData.transactionId },
    });

    if (response.error) throw response.error;

    console.log('✅ PIX cancelado');

    // Fecha o modal independente do modo
    if (setActiveModal) {
      setActiveModal(null);
    } else {
      setPixConfirmationData(null);
    }

    await playText('PIX cancelado.');
  } catch (error: any) {
    console.error('❌ Erro cancelar PIX:', error);
    await playText('Erro ao cancelar PIX.');
  } finally {
    setIsProcessing(false);
  }
}
