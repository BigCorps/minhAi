// ============================================================
// lib/auto-print.ts
//
// Helper de impressão automática — chamado pelos gatilhos:
//   - Finalizar compra   (CheckoutFlow)
//   - Gerar senha        (GerarSenhaDisplay)
//   - Confirmar PIX      (PixConfirmationModal)
//
// Delega para a edge function `auto-print` que:
//   - 'local'  → retorna { useWindowPrint: true } (client chama window.print())
//   - 'recibo' → envia para impressora térmica Bluetooth/USB (1 crédito)
//   - 'remota' → envia para PrintNode (3 créditos)
// ============================================================

import { createClient } from '@/lib/supabase-browser';

export type AutoPrintTrigger = 'purchase' | 'queue' | 'payment';

export interface AutoPrintOptions {
  companyId: string;
  trigger: AutoPrintTrigger;
  /** Conteúdo textual do recibo — usado pela térmica e como log */
  content: string;
  /**
   * PDF em base64 — necessário apenas quando print_auto_type = 'remota'.
   * Se não fornecido na impressão remota, a edge gera um PDF simples do `content`.
   */
  contentBase64?: string;
}

export interface AutoPrintResult {
  success: boolean;
  /** Se true, o client deve chamar window.print() (modo local) */
  useWindowPrint?: boolean;
  /** Tipo de impressão que foi executada */
  printType?: 'local' | 'remota' | 'recibo';
  creditsCharged?: number;
  error?: string;
}

/**
 * Dispara impressão automática sem interação do usuário.
 * Retorna { useWindowPrint: true } quando print_auto_type = 'local',
 * sinalizando que o caller deve chamar window.print() após este retorno.
 */
export async function triggerAutoPrint(options: AutoPrintOptions): Promise<AutoPrintResult> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase.functions.invoke('auto-print', {
      body: {
        companyId: options.companyId,
        trigger: options.trigger,
        content: options.content,
        contentBase64: options.contentBase64,
      },
    });

    if (error) throw error;
    if (!data?.success) throw new Error(data?.error ?? 'Erro desconhecido na impressão automática');

    return {
      success: true,
      useWindowPrint: data.useWindowPrint ?? false,
      printType: data.printType,
      creditsCharged: data.creditsCharged,
    };
  } catch (err: any) {
    console.error('❌ triggerAutoPrint:', err);
    return { success: false, error: err.message ?? 'Erro ao disparar impressão automática' };
  }
}

// ── Formatadores de conteúdo ──────────────────────────────────────────────────
// Cada função gera o texto simples do recibo para o gatilho correspondente.
// Para aprimorar o visual (logotipo, layout, campos extras), edite apenas
// a função correspondente abaixo — o restante do sistema não muda.

/**
 * Recibo de compra (gatilho: 'purchase')
 * TODO: para layout mais elaborado, substitua o texto abaixo por um template
 *       com logotipo da empresa, tabela de itens e rodapé personalizado.
 */
export function formatPurchaseReceipt(opts: {
  companyName: string;
  clienteNome?: string;
  itens: Array<{ nome_snapshot: string; quantidade: number; subtotal: number }>;
  total: number;
  metodo: string;
}): string {
  const sep = '================================';
  const line = '--------------------------------';
  const date = new Date().toLocaleString('pt-BR');

  const metodosLabel: Record<string, string> = {
    pix: 'PIX',
    nfc: 'NFC/TAP',
    tef: 'TEF/POS',
    dinheiro: 'Dinheiro',
    link: 'Link de Pagamento',
  };

  const linhas = [
    sep,
    opts.companyName.toUpperCase().padStart(Math.floor((32 + opts.companyName.length) / 2)),
    'COMPROVANTE DE COMPRA',
    sep,
    `Data: ${date}`,
    opts.clienteNome ? `Cliente: ${opts.clienteNome}` : '',
    line,
    'ITENS',
    line,
    ...opts.itens.map(i =>
      `${i.quantidade}x ${i.nome_snapshot}\n   R$ ${i.subtotal.toFixed(2)}`
    ),
    line,
    `TOTAL: R$ ${opts.total.toFixed(2)}`,
    `Pagamento: ${metodosLabel[opts.metodo] ?? opts.metodo}`,
    sep,
    'Obrigado pela preferencia!',
    sep,
  ].filter(Boolean);

  return linhas.join('\n');
}

/**
 * Senha de fila (gatilho: 'queue')
 * TODO: para layout mais elaborado, adicione nome da empresa, QR Code de
 *       acompanhamento e tempo estimado no template abaixo.
 */
export function formatQueueReceipt(opts: {
  companyName: string;
  senhaCompleta: string;
  posicao: number;
  tempoEstimado: number;
}): string {
  const sep = '================================';
  const date = new Date().toLocaleString('pt-BR');

  return [
    sep,
    opts.companyName.toUpperCase().padStart(Math.floor((32 + opts.companyName.length) / 2)),
    'SENHA DE ATENDIMENTO',
    sep,
    '',
    `        ${opts.senhaCompleta}        `,
    '',
    `Posicao na fila: ${opts.posicao === 0 ? 'Proximo!' : `${opts.posicao}°`}`,
    `Tempo estimado:  ${opts.tempoEstimado} min`,
    `Emitida em:      ${date}`,
    '',
    sep,
    'Aguarde ser chamado.',
    sep,
  ].join('\n');
}

/**
 * Comprovante de PIX (gatilho: 'payment')
 * TODO: para layout mais elaborado, adicione QR Code do comprovante,
 *       chave PIX de destino e ID da transação no template abaixo.
 */
export function formatPixReceipt(opts: {
  companyName: string;
  amount: string;
  transactionId: string;
  clienteNome?: string;
}): string {
  const sep = '================================';
  const date = new Date().toLocaleString('pt-BR');

  return [
    sep,
    opts.companyName.toUpperCase().padStart(Math.floor((32 + opts.companyName.length) / 2)),
    'COMPROVANTE PIX',
    sep,
    `Data: ${date}`,
    opts.clienteNome ? `Pagador: ${opts.clienteNome}` : '',
    `Valor: R$ ${opts.amount}`,
    `ID: ${opts.transactionId.substring(0, 16)}...`,
    sep,
    'Pagamento confirmado!',
    sep,
  ].filter(Boolean).join('\n');
}
