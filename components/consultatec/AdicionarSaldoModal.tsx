'use client';

import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, Clipboard, Loader2, Wallet, X } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { confirmarRecargaConsultaTec, gerarRecargaConsultaTec } from '@/lib/consultatec/api';

interface AdicionarSaldoModalProps {
  companyId: string;
  onClose: () => void;
  onSuccess?: (novoSaldoCents: number) => void;
}

type Step = 'valor' | 'gerando' | 'pix' | 'confirmando' | 'sucesso';

const VALORES_RAPIDOS = [1000, 2500, 5000, 10000];

const cor = {
  fundo: '#FBF6E9',
  fundoAlt: '#F2EAD3',
  borda: '#C9BFA0',
  tinta: '#1C1A14',
  tintaMuted: '#6B6350',
  destaque: '#7A6142',
  erroBg: '#F4E4E0',
  erroTexto: '#7A2E2E',
};

export default function AdicionarSaldoModal({ companyId, onClose, onSuccess }: AdicionarSaldoModalProps) {
  const supabase = useMemo(() => createClient(), []);
  const [step, setStep] = useState<Step>('valor');
  const [valorCents, setValorCents] = useState(2500);
  const [valorCustomTexto, setValorCustomTexto] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [novoSaldo, setNovoSaldo] = useState<number | null>(null);
  const [pixData, setPixData] = useState<{
    qrCodeUrl: string;
    pixCode: string;
    transactionId: string;
    expiresAt?: string;
  } | null>(null);

  const valorAtual = valorCustomTexto
    ? Math.round(Number(valorCustomTexto.replace(',', '.')) * 100)
    : valorCents;
  const valorValido = Number.isInteger(valorAtual) && valorAtual >= 500 && valorAtual <= 1_000_000;

  const handleGerarPix = async () => {
    if (!valorValido) {
      setError('Informe um valor entre R$ 5,00 e R$ 10.000,00.');
      return;
    }

    setError(null);
    setStep('gerando');

    try {
      const data = await gerarRecargaConsultaTec(supabase, { companyId, amountCents: valorAtual });
      if (!data.success || !data.transaction_id || !data.qr_code_url || !data.pix_code) {
        throw new Error(data.error || 'Não foi possível gerar o PIX.');
      }

      setPixData({
        qrCodeUrl: data.qr_code_url,
        pixCode: data.pix_code,
        transactionId: data.transaction_id,
        expiresAt: data.expires_at,
      });
      setStep('pix');
    } catch (err: any) {
      setError(err?.message || 'Erro ao gerar PIX. Tente novamente.');
      setStep('valor');
    }
  };

  const handleCopiarCodigo = async () => {
    if (!pixData) return;
    await navigator.clipboard.writeText(pixData.pixCode);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1800);
  };

  const handleConferirPagamento = async () => {
    if (!pixData) return;
    setError(null);
    setStep('confirmando');

    try {
      const data = await confirmarRecargaConsultaTec(supabase, {
        companyId,
        transactionId: pixData.transactionId,
      });

      if (!data.success || data.new_balance_cents === undefined) {
        throw new Error(data.error || 'Ainda não identificamos o pagamento.');
      }

      setNovoSaldo(data.new_balance_cents);
      onSuccess?.(data.new_balance_cents);
      setStep('sucesso');
    } catch (err: any) {
      setError(err?.message || 'Ainda não identificamos o pagamento. Aguarde alguns segundos e tente novamente.');
      setStep('pix');
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4">
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border max-h-[90vh] flex flex-col"
        style={{ backgroundColor: cor.fundo, borderColor: cor.borda }}
      >
        <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: cor.borda }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: cor.destaque }}>
              <Wallet className="w-5 h-5" style={{ color: cor.fundo }} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: cor.tinta }}>Adicionar saldo</h2>
              <p className="text-sm" style={{ color: cor.tintaMuted }}>Saldo compartilhado minhAi</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:opacity-70" aria-label="Fechar">
            <X className="w-5 h-5" style={{ color: cor.tinta }} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 rounded-lg border flex items-start gap-2" style={{ backgroundColor: cor.erroBg, borderColor: cor.erroTexto }}>
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: cor.erroTexto }} />
              <p className="text-sm" style={{ color: cor.erroTexto }}>{error}</p>
            </div>
          )}

          {step === 'valor' && (
            <div className="space-y-4">
              <div className="rounded-xl p-3 text-xs leading-relaxed" style={{ backgroundColor: cor.fundoAlt, color: cor.tintaMuted }}>
                A recarga entra no seu saldo compartilhado minhAi e fica disponível para os apps integrados à mesma carteira.
              </div>

              <div className="grid grid-cols-4 gap-2">
                {VALORES_RAPIDOS.map((v) => (
                  <button
                    key={v}
                    onClick={() => { setValorCents(v); setValorCustomTexto(''); }}
                    className="py-2.5 rounded-lg border text-sm font-semibold"
                    style={{
                      borderColor: cor.borda,
                      backgroundColor: !valorCustomTexto && valorCents === v ? cor.destaque : 'transparent',
                      color: !valorCustomTexto && valorCents === v ? cor.fundo : cor.tinta,
                    }}
                  >
                    R$ {(v / 100).toFixed(0)}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: cor.tinta }}>Ou outro valor</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={valorCustomTexto}
                  onChange={(e) => setValorCustomTexto(e.target.value.replace(/[^\d,]/g, ''))}
                  className="w-full px-4 py-3 rounded-lg border bg-transparent focus:outline-none"
                  style={{ borderColor: cor.borda, color: cor.tinta }}
                />
              </div>

              <button
                onClick={handleGerarPix}
                disabled={!valorValido}
                className="w-full py-3 rounded-lg font-semibold disabled:opacity-40"
                style={{ backgroundColor: cor.destaque, color: cor.fundo }}
              >
                Gerar PIX
              </button>
            </div>
          )}

          {(step === 'gerando' || step === 'confirmando') && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-10 h-10 animate-spin mb-4" style={{ color: cor.destaque }} />
              <p className="font-medium" style={{ color: cor.tinta }}>{step === 'gerando' ? 'Gerando PIX...' : 'Conferindo pagamento...'}</p>
            </div>
          )}

          {step === 'pix' && pixData && (
            <div className="flex flex-col items-center gap-4">
              <img src={pixData.qrCodeUrl} alt="QR Code PIX" className="w-56 h-56 rounded-lg border" style={{ borderColor: cor.borda }} />
              <p className="text-sm text-center" style={{ color: cor.tintaMuted }}>
                Escaneie o QR Code ou copie o código. O saldo só é creditado depois da confirmação no servidor.
              </p>
              <button onClick={handleCopiarCodigo} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium" style={{ borderColor: cor.borda, color: cor.tinta }}>
                <Clipboard className="w-4 h-4" /> {copiado ? 'Código copiado!' : 'Copiar código PIX'}
              </button>
              <button onClick={handleConferirPagamento} className="w-full py-3 rounded-lg font-semibold" style={{ backgroundColor: cor.destaque, color: cor.fundo }}>
                Já paguei — verificar
              </button>
            </div>
          )}

          {step === 'sucesso' && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 className="w-12 h-12" style={{ color: cor.destaque }} />
              <p className="font-semibold" style={{ color: cor.tinta }}>Saldo adicionado!</p>
              {novoSaldo !== null && (
                <p className="text-sm" style={{ color: cor.tintaMuted }}>
                  Novo saldo compartilhado: R$ {(novoSaldo / 100).toFixed(2).replace('.', ',')}
                </p>
              )}
              <button onClick={onClose} className="mt-2 w-full py-2.5 rounded-lg font-medium border" style={{ borderColor: cor.borda, color: cor.tinta }}>
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
