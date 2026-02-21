// ============================================================
// handlers/pixHandlers.ts
// Caminho: components/assistant/VoiceAssistant/handlers/pixHandlers.ts
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
}

/**
 * Gera um PIX via Edge Function do Supabase.
 */
export async function handlePixCommand(
  amount: number,
  { companyId, setIsProcessing, setPixConfirmationData, playText }: PixDeps
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

    setPixConfirmationData({
      transactionId: data.transaction_id,
      amount: data.amount_brl,
      qrCodeUrl: data.qr_code_url,
      pixCode: data.pix_code,
    });

    await playText(`PIX de ${amount.toFixed(2).replace('.', ',')} reais gerado. Aguardando confirmação.`);

    await saveInteractionToHistory(
      companyId,
      `Gerar PIX de R$ ${amount.toFixed(2)}`,
      `PIX no valor de R$ ${amount.toFixed(2)} gerado e aguardando confirmação.`
    );
  } catch (error: any) {
    console.error('Erro PIX:', error);
    await playText('Desculpe, não consegui gerar o PIX.');
  } finally {
    setIsProcessing(false);
  }
}

/**
 * Confirma um PIX aberto via Edge Function do Supabase.
 */
export async function handleConfirmPix(
  pixConfirmationData: PixConfirmationData | null,
  { companyId, setIsProcessing, setPixConfirmationData, playText, functionSettings }: PixDeps
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
    setPixConfirmationData(null);

    await playText('Pagamento confirmado com sucesso!');

    const shouldSave = functionSettings['pix_confirm']?.saveToHistory ?? false;
    if (shouldSave) {
      await saveInteractionToHistory(
        companyId,
        'Confirmar pagamento PIX',
        `Pagamento PIX de R$ ${pixConfirmationData.amount} confirmado com sucesso!`
      );
    }

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
 */
export async function handleCancelPix(
  pixConfirmationData: PixConfirmationData | null,
  { companyId, setIsProcessing, setPixConfirmationData, playText }: PixDeps
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
    setPixConfirmationData(null);
    await playText('PIX cancelado.');
  } catch (error: any) {
    console.error('❌ Erro cancelar PIX:', error);
    await playText('Erro ao cancelar PIX.');
  } finally {
    setIsProcessing(false);
  }
}