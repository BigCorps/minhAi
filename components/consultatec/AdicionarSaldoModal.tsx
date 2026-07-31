'use client';

// components/consultatec/AdicionarSaldoModal.tsx
//
// Não é uma função nova de pagamento — é a MESMA "Gerar PIX" que qualquer
// empresa minhAi já usa, chamada com o company_id do próprio usuário do
// ConsultaTec. Confirmei em confirmar-pix-assistente: quando o purpose do
// PIX é 'payment' (o padrão, quando você não passa purpose), o valor
// confirmado credita company_balance.available_balance_cents. Quando o
// purpose é 'consulta_fee' (como os modais de consulta já fazem), o valor
// vai direto pra BigCorps e NÃO mexe no saldo. Por isso aqui, ao chamar
// gerar-pix-assistente, deliberadamente não passamos purpose nenhum.

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Wallet, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

interface AdicionarSaldoModalProps {
  companyId: string;
  onClose: () => void;
  onSuccess?: (novoSaldoCents: number) => void;
}

type Step = 'valor' | 'pix' | 'confirmando' | 'sucesso';

const VALORES_RAPIDOS = [1000, 2500, 5000, 10000]; // em centavos: R$10, 25, 50, 100

// ── paleta ConsultaTec (creme / preto) ──────────────────────────────────
const cor = {
  fundo: '#FBF6E9',
  borda: '#C9BFA0',
  tinta: '#1C1A14',
  tintaMuted: '#6B6350',
  destaque: '#2F4F3A',
  destaqueHover: '#25402E',
  erroBg: '#F4E4E0',
  erroTexto: '#7A2E2E',
};

export default function AdicionarSaldoModal({ companyId, onClose, onSuccess }: AdicionarSaldoModalProps) {
  const [step, setStep] = useState<Step>('valor');
  const [valorCents, setValorCents] = useState<number>(2500);
  const [valorCustomTexto, setValorCustomTexto] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [pixData, setPixData] = useState<{ qrCodeUrl: string; pixCode: string; transactionId: string } | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [novoSaldo, setNovoSaldo] = useState<number | null>(null);

  const valorAtual = valorCustomTexto ? Math.round(parseFloat(valorCustomTexto.replace(',', '.')) * 100) : valorCents;
  const valorValido = Number.isFinite(valorAtual) && valorAtual >= 500; // mínimo R$5,00

  const handleGerarPix = async () => {
    if (!valorValido) {
      setError('Informe um valor de pelo menos R$ 5,00');
      return;
    }
    setError(null);
    setStep('confirmando');

    try {
      const supabase = createClient();
      const { data, error: fnError } = await supabase.functions.invoke('gerar-pix-assistente', {
        body: {
          company_id: companyId,
          amount_cents: valorAtual,
          description: 'Adicionar saldo — ConsultaTec',
          // purpose OMITIDO de propósito: default 'payment' → credita company_balance
        },
      });

      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error ?? 'Não foi possível gerar o PIX');

      setPixData({
        qrCodeUrl: data.qr_code_url,
        pixCode: data.pix_code,
        transactionId: data.transaction_id,
      });
      setStep('pix');
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar PIX. Tente novamente.');
      setStep('valor');
    }
  };

  const handleCopiarCodigo = async () => {
    if (!pixData) return;
    await navigator.clipboard.writeText(pixData.pixCode);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const handleConferirPagamento = async () => {
    if (!pixData) return;
    setStep('confirmando');
    setError(null);

    try {
      const supabase = createClient();
      const { data, error: fnError } = await supabase.functions.invoke('confirmar-pix-assistente', {
        body: { transaction_id: pixData.transactionId },
      });

      if (fnError) throw new Error(fnError.message);

      if (!data?.success) {
        // Ainda não caiu — volta pra tela do QR e deixa tentar de novo
        setError(data?.message || 'Ainda não identificamos o pagamento. Aguarde alguns segundos e tente novamente.');
        setStep('pix');
        return;
      }

      const novoSaldoCents = Math.round((data.new_balance ?? 0) * 100);
      setNovoSaldo(novoSaldoCents);
      onSuccess?.(novoSaldoCents);
      setStep('sucesso');
    } catch (err: any) {
      setError(err.message || 'Erro ao confirmar pagamento.');
      setStep('pix');
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4">
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border max-h-[90vh] flex flex-col"
        style={{ backgroundColor: cor.fundo, borderColor: cor.borda }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: cor.borda }}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: cor.destaque }}
            >
              <Wallet className="w-5 h-5" style={{ color: cor.fundo }} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: cor.tinta }}>Adicionar saldo</h2>
              <p className="text-sm" style={{ color: cor.tintaMuted }}>Vale para qualquer consulta</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:opacity-70">
            <X className="w-5 h-5" style={{ color: cor.tinta }} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div
              className="mb-4 p-3 rounded-lg border flex items-start gap-2"
              style={{ backgroundColor: cor.erroBg, borderColor: cor.erroTexto }}
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: cor.erroTexto }} />
              <p className="text-sm" style={{ color: cor.erroTexto }}>{error}</p>
            </div>
          )}

          {/* ── STEP: escolher valor ── */}
          {step === 'valor' && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-2">
                {VALORES_RAPIDOS.map((v) => (
                  <button
                    key={v}
                    onClick={() => { setValorCents(v); setValorCustomTexto(''); }}
                    className="py-2.5 rounded-lg border text-sm font-semibold transition"
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
                <label className="block text-sm font-medium mb-1" style={{ color: cor.tinta }}>
                  Ou outro valor
                </label>
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
                className="w-full py-3 rounded-lg font-semibold transition disabled:opacity-40"
                style={{ backgroundColor: cor.destaque, color: cor.fundo }}
              >
                Gerar PIX
              </button>
            </div>
          )}

          {/* ── STEP: aguardando / confirmando ── */}
          {step === 'confirmando' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-10 h-10 animate-spin mb-4" style={{ color: cor.destaque }} />
              <p className="font-medium" style={{ color: cor.tinta }}>Processando...</p>
            </div>
          )}

          {/* ── STEP: QR pix ── */}
          {step === 'pix' && pixData && (
            <div className="flex flex-col items-center gap-4">
              <img
                src={pixData.qrCodeUrl}
                alt="QR Code PIX"
                className="w-56 h-56 rounded-lg border"
                style={{ borderColor: cor.borda }}
              />
              <p className="text-sm text-center" style={{ color: cor.tintaMuted }}>
                Escaneie o QR Code ou copie o código abaixo
              </p>
              <button
                onClick={handleCopiarCodigo}
                className="w-full py-2.5 rounded-lg border text-sm font-medium truncate"
                style={{ borderColor: cor.borda, color: cor.tinta }}
              >
                {copiado ? 'Código copiado!' : 'Copiar código PIX'}
              </button>
              <button
                onClick={handleConferirPagamento}
                className="w-full py-3 rounded-lg font-semibold"
                style={{ backgroundColor: cor.destaque, color: cor.fundo }}
              >
                Já paguei
              </button>
            </div>
          )}

          {/* ── STEP: sucesso ── */}
          {step === 'sucesso' && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 className="w-12 h-12" style={{ color: cor.destaque }} />
              <p className="font-semibold" style={{ color: cor.tinta }}>Saldo adicionado!</p>
              {novoSaldo !== null && (
                <p className="text-sm" style={{ color: cor.tintaMuted }}>
                  Novo saldo: R$ {(novoSaldo / 100).toFixed(2).replace('.', ',')}
                </p>
              )}
              <button
                onClick={onClose}
                className="mt-2 w-full py-2.5 rounded-lg font-medium border"
                style={{ borderColor: cor.borda, color: cor.tinta }}
              >
                Fechar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
