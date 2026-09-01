import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ConsultaAction,
  ConsultaTecApiResponse,
  ConsultaTecConfirmacaoResponse,
  ConsultaTecPixResponse,
} from '@/types/consultatec';

async function getFunctionError(error: any, data: any, fallback: string) {
  if (data?.error) return String(data.error);

  try {
    if (error?.context && typeof error.context.json === 'function') {
      const body = await error.context.json();
      if (body?.error) return String(body.error);
      if (body?.message) return String(body.message);
    }
  } catch {
    // O corpo pode já ter sido consumido pelo SDK.
  }

  return error?.message || fallback;
}

export async function executarConsulta(
  supabase: SupabaseClient,
  input: {
    companyId: string;
    action: ConsultaAction;
    documento: string;
    paymentTransactionId?: string | null;
  },
): Promise<ConsultaTecApiResponse> {
  // Camada pública da ConsultaTec: normaliza score/restrições e remove
  // informações internas sobre as fontes antes de responder ao navegador.
  const { data, error } = await supabase.functions.invoke('consultatec-consultas-public', {
    body: {
      company_id: input.companyId,
      action: input.action,
      documento: input.documento,
      ...(input.paymentTransactionId
        ? { payment_transaction_id: input.paymentTransactionId }
        : {}),
    },
  });

  if (error) {
    throw new Error(await getFunctionError(error, data, 'Erro ao realizar consulta.'));
  }

  return (data ?? { success: false, error: 'Resposta vazia do servidor.' }) as ConsultaTecApiResponse;
}

export async function gerarPixConsulta(
  supabase: SupabaseClient,
  input: { companyId: string; action: ConsultaAction; documento: string },
): Promise<ConsultaTecPixResponse> {
  const { data, error } = await supabase.functions.invoke('consultatec-gerar-pix', {
    body: {
      company_id: input.companyId,
      action: input.action,
      documento: input.documento,
    },
  });

  if (error) {
    throw new Error(await getFunctionError(error, data, 'Erro ao gerar PIX.'));
  }

  return (data ?? { success: false, error: 'Resposta vazia do servidor.' }) as ConsultaTecPixResponse;
}

export async function confirmarPixConsulta(
  supabase: SupabaseClient,
  input: { companyId: string; transactionId: string },
): Promise<ConsultaTecConfirmacaoResponse> {
  const { data, error } = await supabase.functions.invoke('consultatec-confirmar-pix', {
    body: {
      company_id: input.companyId,
      transaction_id: input.transactionId,
    },
  });

  if (error) {
    throw new Error(await getFunctionError(error, data, 'PIX ainda não confirmado.'));
  }

  return (data ?? { success: false, error: 'Resposta vazia do servidor.' }) as ConsultaTecConfirmacaoResponse;
}

export async function gerarRecargaConsultaTec(
  supabase: SupabaseClient,
  input: { companyId: string; amountCents: number },
): Promise<ConsultaTecPixResponse> {
  const { data, error } = await supabase.functions.invoke('consultatec-gerar-recarga', {
    body: { company_id: input.companyId, amount_cents: input.amountCents },
  });

  if (error) {
    throw new Error(await getFunctionError(error, data, 'Erro ao gerar PIX de recarga.'));
  }

  return (data ?? { success: false, error: 'Resposta vazia do servidor.' }) as ConsultaTecPixResponse;
}

export async function confirmarRecargaConsultaTec(
  supabase: SupabaseClient,
  input: { companyId: string; transactionId: string },
): Promise<ConsultaTecConfirmacaoResponse & { new_balance_cents?: number; already_credited?: boolean }> {
  const { data, error } = await supabase.functions.invoke('consultatec-confirmar-recarga', {
    body: { company_id: input.companyId, transaction_id: input.transactionId },
  });

  if (error) {
    throw new Error(await getFunctionError(error, data, 'PIX de recarga ainda não confirmado.'));
  }

  return (data ?? { success: false, error: 'Resposta vazia do servidor.' }) as ConsultaTecConfirmacaoResponse & {
    new_balance_cents?: number;
    already_credited?: boolean;
  };
}
