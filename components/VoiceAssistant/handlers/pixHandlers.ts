import { createClient } from '@/lib/supabase-browser';
import { PixConfirmationData, FunctionSettings } from '../types';
import { saveInteractionToHistory, registerFunctionUsage } from './functionUsage';
import { vincularPerfilAposPix } from '@/lib/orders-client';

interface PixDeps {
  companyId: string;
  setIsProcessing: (v: boolean) => void;
  setPixConfirmationData: (data: PixConfirmationData | null) => void;
  playText: (text: string) => Promise<void>;
  functionSettings: Record<string, FunctionSettings>;
  setActiveModal?: (modal: { type: string; data: any } | null) => void;
  profileId?: string | null;
  profileToken?: string | null;
  pedidoId?: string | null;
}

export async function handlePixCommand(
  amount: number,
  deps: PixDeps
): Promise<void> {
  const { companyId, setIsProcessing, setPixConfirmationData, playText, setActiveModal, pedidoId } = deps;
  try {
    setIsProcessing(true);
    const amountCents = Math.round(amount * 100);
    const supabase = createClient();

    const response = await supabase.functions.invoke('gerar-pix-assistente-v2', {
      body: {
        company_id: companyId,
        amount_cents: amountCents,
        ...(pedidoId ? { pedido_id: pedidoId } : {}),
      },
    });

    if (response.error) throw response.error;
    const data = response.data;


    const pixData: PixConfirmationData = {
      transactionId: data.transaction_id,
      amount: data.amount_brl,
      qrCodeUrl: data.qr_code_url,
      pixCode: data.pix_code,
      pedidoId: pedidoId ?? null,
    };

    if (setActiveModal) {
      setActiveModal({ type: 'PIXConfirmationModal', data: { ...pixData, companyId } });
    } else {
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

export async function handleConfirmPix(
  pixConfirmationData: PixConfirmationData | null,
  deps: PixDeps
): Promise<void> {
  const { companyId, setIsProcessing, setPixConfirmationData, playText, functionSettings, setActiveModal, profileToken } = deps;
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

    if (setActiveModal) {
      setActiveModal(null);
    } else {
      setPixConfirmationData(null);
    }

    await playText('Pagamento confirmado com sucesso!');

    // Pós-venda: consulta/vincula o perfil somente no servidor, usando a transação confirmada.
    if (pixConfirmationData.pedidoId) {
      try {
        const orderState = await vincularPerfilAposPix({
          pedidoId: pixConfirmationData.pedidoId,
          transactionId: pixConfirmationData.transactionId,
          profileToken: profileToken ?? null,
        });

        if (orderState.linked && orderState.profile_id) {
          window.dispatchEvent(new CustomEvent('eai:enviarConfirmacaoCliente', {
            detail: { pedidoId: pixConfirmationData.pedidoId, profileId: orderState.profile_id },
          }));
        } else if (!orderState.profile_id && !orderState.cliente_nome) {
          window.dispatchEvent(new CustomEvent('eai:solicitarIdentificacaoCliente', {
            detail: { pedidoId: pixConfirmationData.pedidoId },
          }));
        }
      } catch (profileError) {
        console.warn('Pós-venda PIX: não foi possível consultar/vincular perfil', profileError);
      }
    }

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

export async function handleCancelPix(
  pixConfirmationData: PixConfirmationData | null,
  deps: PixDeps
): Promise<void> {
  const { companyId, setIsProcessing, setPixConfirmationData, playText, setActiveModal } = deps;
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
