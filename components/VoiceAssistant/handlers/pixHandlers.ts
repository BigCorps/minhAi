import { createClient } from '@/lib/supabase-browser';
import { PixConfirmationData, FunctionSettings } from '../types';
import { saveInteractionToHistory, registerFunctionUsage } from './functionUsage';

interface PixDeps {
  companyId: string;
  setIsProcessing: (v: boolean) => void;
  setPixConfirmationData: (data: PixConfirmationData | null) => void;
  playText: (text: string) => Promise<void>;
  functionSettings: Record<string, FunctionSettings>;
  setActiveModal?: (modal: { type: string; data: any } | null) => void;
  profileId?: string | null;
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

    const response = await supabase.functions.invoke('gerar-pix-assistente', {
      body: { company_id: companyId, amount_cents: amountCents },
    });

    if (response.error) throw response.error;
    const data = response.data;

    // Vincular pedido ao PIX se vier de contexto de produto
    if (pedidoId && data.transaction_id) {
      await supabase
        .from('pix_transactions')
        .update({ pedido_id: pedidoId })
        .eq('id', data.transaction_id);
    }

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
  const { companyId, setIsProcessing, setPixConfirmationData, playText, functionSettings, setActiveModal, profileId } = deps;
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

    // Pós-venda: vincular cliente ao pedido se houver contexto de produto
    if (pixConfirmationData.pedidoId) {
      const { data: pedido } = await supabase
        .from('pedidos')
        .select('profile_id, cliente_nome')
        .eq('id', pixConfirmationData.pedidoId)
        .single();

      if (profileId && !pedido?.profile_id) {
        await supabase.from('pedidos')
          .update({ profile_id: profileId })
          .eq('id', pixConfirmationData.pedidoId);
        window.dispatchEvent(new CustomEvent('eai:enviarConfirmacaoCliente', {
          detail: { pedidoId: pixConfirmationData.pedidoId, profileId }
        }));
      } else if (!pedido?.profile_id && !pedido?.cliente_nome) {
        window.dispatchEvent(new CustomEvent('eai:solicitarIdentificacaoCliente', {
          detail: { pedidoId: pixConfirmationData.pedidoId }
        }));
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
