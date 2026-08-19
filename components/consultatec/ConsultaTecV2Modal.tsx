'use client';

import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, Clipboard, Download, FileSearch, Loader2, ShieldCheck, X } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { confirmarPixConsulta, executarConsulta, gerarPixConsulta } from '@/lib/consultatec/api';
import { generateConsultaTecPDF } from '@/lib/consultatec/generatePDF';
import type { ConsultaAction, ResultadoFormatado } from '@/types/consultatec';
import ConsultaCompletaCnpjResult from './ConsultaCompletaCnpjResult';

interface Props {
  companyId: string;
  documento: string;
  action: ConsultaAction;
  titulo: string;
  descricao: string;
  precoCents: number;
  onClose: () => void;
  onSuccess?: () => void;
}

type Step = 'confirmar' | 'processando' | 'pix' | 'resultado';

const cor = {
  fundo: '#FBF6E9',
  fundoAlt: '#F2EAD3',
  borda: '#C9BFA0',
  tinta: '#1C1A14',
  muted: '#6B6350',
  destaque: '#7A6142',
  erroBg: '#F4E4E0',
  erroTexto: '#7A2E2E',
};

const formatBRL = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
const formatDoc = (doc: string) => doc.length === 11
  ? doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  : doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');

function normalizeRows(input: any): ResultadoFormatado[] {
  if (!Array.isArray(input)) return [];
  return input.map((item: any) => Array.isArray(item)
    ? { label: String(item[0] ?? ''), value: String(item[1] ?? '') }
    : { label: String(item?.label ?? ''), value: String(item?.value ?? '') });
}

export default function ConsultaTecV2Modal({
  companyId,
  documento,
  action,
  titulo,
  descricao,
  precoCents,
  onClose,
  onSuccess,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [step, setStep] = useState<Step>('confirmar');
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<any>(null);
  const [rows, setRows] = useState<ResultadoFormatado[]>([]);
  const [copiado, setCopiado] = useState(false);
  const [pix, setPix] = useState<{
    transactionId: string;
    qrCodeUrl: string;
    pixCode: string;
    amountBrl: string;
    expiresAt?: string;
  } | null>(null);

  const concluir = (res: any) => {
    setResultado(res?.result ?? {});
    setRows(normalizeRows(res?.resultado_formatado));
    setPix(null);
    setStep('resultado');
    onSuccess?.();
  };

  const iniciarConsulta = async (paymentTransactionId?: string | null) => {
    setError(null);
    setStep('processando');

    try {
      const res = await executarConsulta(supabase, {
        companyId,
        action,
        documento,
        paymentTransactionId,
      });

      if (res.requires_payment) {
        const pixRes = await gerarPixConsulta(supabase, { companyId, action, documento });
        if (!pixRes.success || !pixRes.transaction_id || !pixRes.qr_code_url || !pixRes.pix_code) {
          throw new Error(pixRes.error || 'Não foi possível gerar o PIX.');
        }

        setPix({
          transactionId: pixRes.transaction_id,
          qrCodeUrl: pixRes.qr_code_url,
          pixCode: pixRes.pix_code,
          amountBrl: pixRes.amount_brl || (pixRes.amount_cents ? formatBRL(pixRes.amount_cents).replace('R$ ', '') : formatBRL(precoCents).replace('R$ ', '')),
          expiresAt: pixRes.expires_at,
        });
        setStep('pix');
        return;
      }

      if (!res.success) throw new Error(res.error || 'Falha na consulta.');
      concluir(res);
    } catch (err: any) {
      setError(err?.message || 'Erro ao consultar. Tente novamente.');
      setStep(paymentTransactionId && pix ? 'pix' : 'confirmar');
    }
  };

  const conferirPagamento = async () => {
    if (!pix) return;
    setError(null);
    setStep('processando');

    try {
      const confirmacao = await confirmarPixConsulta(supabase, {
        companyId,
        transactionId: pix.transactionId,
      });

      if (!confirmacao.success) {
        throw new Error(confirmacao.error || 'Ainda não identificamos o pagamento.');
      }

      await iniciarConsulta(pix.transactionId);
    } catch (err: any) {
      setError(err?.message || 'Ainda não identificamos o pagamento. Aguarde alguns segundos e tente novamente.');
      setStep('pix');
    }
  };

  const copiarPix = async () => {
    if (!pix?.pixCode) return;
    await navigator.clipboard.writeText(pix.pixCode);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1800);
  };

  const baixarPDF = () => {
    if (!resultado) return;
    const dataUri = generateConsultaTecPDF({
      titulo,
      documento: formatDoc(documento),
      action,
      result: resultado,
      resultadoFormatado: rows,
    });
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = `consultatec-${action}-${documento}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-3 sm:p-4">
      <div
        className="relative w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl border max-h-[94vh] flex flex-col"
        style={{ backgroundColor: cor.fundo, borderColor: cor.borda }}
      >
        <div className="px-4 sm:px-6 py-4 border-b flex items-center justify-between gap-3 flex-shrink-0" style={{ borderColor: cor.borda }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: cor.destaque }}>
              <FileSearch className="w-5 h-5" style={{ color: cor.fundo }} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold truncate" style={{ color: cor.tinta }}>{titulo}</h2>
              <p className="text-xs sm:text-sm truncate" style={{ color: cor.muted }}>{formatDoc(documento)} · {formatBRL(precoCents)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:opacity-70 flex-shrink-0" aria-label="Fechar">
            <X className="w-5 h-5" style={{ color: cor.tinta }} />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 rounded-xl border flex items-start gap-2" style={{ backgroundColor: cor.erroBg, borderColor: cor.erroTexto }}>
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: cor.erroTexto }} />
              <p className="text-sm" style={{ color: cor.erroTexto }}>{error}</p>
            </div>
          )}

          {step === 'confirmar' && (
            <div className="max-w-lg mx-auto py-3 sm:py-6 space-y-5">
              <div className="rounded-xl border p-4" style={{ borderColor: cor.borda, backgroundColor: cor.fundoAlt }}>
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: cor.destaque }} />
                  <div>
                    <p className="font-semibold text-sm" style={{ color: cor.tinta }}>{descricao}</p>
                    <p className="text-xs mt-1 leading-relaxed" style={{ color: cor.muted }}>
                      Se houver saldo suficiente, o valor será descontado automaticamente. Sem saldo ou sem login, o sistema gera um PIX antes de consultar o fornecedor.
                    </p>
                  </div>
                </div>
              </div>
              {action === 'completa_cnpj' && (
                <div className="text-xs leading-relaxed" style={{ color: cor.muted }}>
                  A versão atual combina cadastro enriquecido + QSA + restrições Quod. Score é exibido apenas quando o produto contratado o retorna; a ConsultaTec não cria pontuação própria.
                </div>
              )}
              <button
                onClick={() => iniciarConsulta()}
                className="w-full py-3 rounded-xl font-bold transition hover:opacity-90"
                style={{ backgroundColor: cor.destaque, color: cor.fundo }}
              >
                Consultar — {formatBRL(precoCents)}
              </button>
            </div>
          )}

          {step === 'processando' && (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <Loader2 className="w-10 h-10 animate-spin mb-4" style={{ color: cor.destaque }} />
              <p className="font-semibold" style={{ color: cor.tinta }}>Processando consulta...</p>
              <p className="text-xs mt-1" style={{ color: cor.muted }}>O pagamento e os dados são validados no servidor.</p>
            </div>
          )}

          {step === 'pix' && pix && (
            <div className="max-w-md mx-auto flex flex-col items-center gap-4 py-2">
              <img src={pix.qrCodeUrl} alt="QR Code PIX ConsultaTec" className="w-56 h-56 rounded-xl border" style={{ borderColor: cor.borda }} />
              <div className="text-center">
                <p className="font-bold" style={{ color: cor.tinta }}>PIX de R$ {pix.amountBrl}</p>
                <p className="text-xs mt-1" style={{ color: cor.muted }}>
                  O pagamento é conferido diretamente no servidor antes da consulta ser liberada.
                </p>
              </div>
              <button onClick={copiarPix} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold" style={{ borderColor: cor.borda, color: cor.tinta }}>
                <Clipboard className="w-4 h-4" /> {copiado ? 'Código copiado!' : 'Copiar código PIX'}
              </button>
              <button onClick={conferirPagamento} className="w-full py-3 rounded-xl font-bold" style={{ backgroundColor: cor.destaque, color: cor.fundo }}>
                Já paguei — verificar
              </button>
              {pix.expiresAt && <p className="text-[11px]" style={{ color: cor.muted }}>PIX válido por aproximadamente 30 minutos.</p>}
            </div>
          )}

          {step === 'resultado' && resultado && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" style={{ color: cor.destaque }} />
                  <span className="font-semibold text-sm" style={{ color: cor.tinta }}>Consulta realizada com sucesso</span>
                </div>
                <button onClick={baixarPDF} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold" style={{ backgroundColor: cor.destaque, color: cor.fundo }}>
                  <Download className="w-4 h-4" /> Baixar PDF
                </button>
              </div>

              {action === 'completa_cnpj' ? (
                <ConsultaCompletaCnpjResult result={resultado} />
              ) : (
                <div className="border rounded-xl overflow-hidden" style={{ borderColor: cor.borda }}>
                  <div className="max-h-[480px] overflow-y-auto">
                    {rows.length === 0 ? (
                      <p className="p-4 text-sm" style={{ color: cor.muted }}>Nenhuma informação estruturada foi retornada.</p>
                    ) : rows.map((item, index) => (
                      <div key={`${item.label}-${index}`} className="px-4 py-3 border-b last:border-b-0" style={{ borderColor: cor.borda, backgroundColor: index % 2 === 0 ? cor.fundoAlt : cor.fundo }}>
                        {item.label === '---' ? (
                          <p className="text-sm font-bold" style={{ color: cor.tinta }}>{item.value}</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
                            <div className="text-xs sm:text-sm font-semibold" style={{ color: cor.muted }}>{item.label}</div>
                            <div className="sm:col-span-2 text-xs sm:text-sm break-words" style={{ color: cor.tinta }}>{item.value}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={onClose} className="w-full py-2.5 rounded-xl border text-sm font-semibold" style={{ borderColor: cor.borda, color: cor.tinta }}>
                Fechar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
