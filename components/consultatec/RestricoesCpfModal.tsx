'use client';

// components/consultatec/RestricoesCpfModal.tsx
// Versão ConsultaTec de Restrições CPF. Diferente da original (RestricoesCPFDisplay,
// que só aceita { companyId }), esta já suporta cpfPrefill — resolve o gap que
// eu tinha sinalizado antes.

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ShieldAlert, Loader2, AlertCircle, CheckCircle2, Download } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { generateConsultaPDF } from '@/lib/generatePDF';
import { validateCPF, formatarDocumento } from '@/lib/validateDocumento';

interface Props {
  data: { companyId: string; cpfPrefill?: string };
  onClose: () => void;
}

type Step = 'input' | 'loading' | 'result';
interface ResultadoFormatado { label: string; value: string; }

const cor = {
  fundo: '#FBF6E9',
  borda: '#C9BFA0',
  tinta: '#1C1A14',
  tintaMuted: '#6B6350',
  destaque: '#7A6142',
  faixaAlt: '#F2EAD3',
  erroBg: '#F4E4E0',
  erroTexto: '#7A2E2E',
};

export default function RestricoesCpfModal({ data, onClose }: Props) {
  const { companyId, cpfPrefill } = data;

  const [step, setStep] = useState<Step>('input');
  const [cpf, setCpf] = useState(cpfPrefill || '');
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoFormatado[]>([]);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState('');

  const [pixInfo, setPixInfo] = useState<{ qrCodeUrl: string; pixCode: string; amountBrl: string } | null>(null);
  const [pendingParams, setPendingParams] = useState<Record<string, any> | null>(null);

  const handleConsultar = async () => {
    const cpfLimpo = cpf.replace(/\D/g, '');
    if (!cpfLimpo || cpfLimpo.length !== 11 || !validateCPF(cpfLimpo)) {
      setError('CPF inválido. Verifique os números digitados.');
      return;
    }

    setStep('loading');
    setError(null);

    try {
      const supabase = createClient();
      const params = pendingParams ?? { company_id: companyId, action: 'restricoes_cpf', cpf: cpfLimpo };

      const { data: res, error: fnError } = await supabase.functions.invoke('ferramentas-consultas', { body: params });
      if (fnError) throw new Error(fnError.message);

      if (res.requires_payment) {
        setPendingParams({ company_id: companyId, action: 'restricoes_cpf', cpf: cpfLimpo, payment_confirmed: true });
        setStep('input');

        const pixRes = await supabase.functions.invoke('gerar-pix-assistente', {
          body: { company_id: companyId, amount_cents: res.amount_cents, purpose: 'consulta_fee', description: `Restrições CPF - R$ ${res.amount_brl}`, brand: 'consultatec' },
        });
        if (pixRes.error) throw new Error(pixRes.error.message);

        setPixInfo({ qrCodeUrl: pixRes.data.qr_code_url, pixCode: pixRes.data.pix_code, amountBrl: res.amount_brl ?? '15,00' });
        return;
      }

      if (!res.success) throw new Error(res.error ?? 'Falha na consulta');

      const rows: ResultadoFormatado[] = (res.resultado_formatado ?? []).map(
        (r: any) => (Array.isArray(r) ? { label: r[0], value: r[1] } : r)
      );
      setResultado(rows);
      setPdfFileName(`restricoes-cpf-${cpfLimpo}.pdf`);
      setPdfBase64(generateConsultaPDF('Restrições CPF', res.resultado_formatado || []));
      setPendingParams(null);
      setPixInfo(null);
      setStep('result');
    } catch (err: any) {
      setError(err.message || 'Erro ao consultar restrições. Tente novamente.');
      setStep('input');
    }
  };

  const handleDownloadPDF = () => {
    if (!pdfBase64) return;
    const link = document.createElement('a');
    link.href = pdfBase64;
    link.download = pdfFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl border max-h-[90vh] flex flex-col" style={{ backgroundColor: cor.fundo, borderColor: cor.borda }}>
        <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: cor.borda }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: cor.destaque }}>
              <ShieldAlert className="w-5 h-5" style={{ color: cor.fundo }} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: cor.tinta }}>Restrições CPF</h2>
              <p className="text-sm" style={{ color: cor.tintaMuted }}>Score e pendências financeiras</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:opacity-70">
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

          {pixInfo && (
            <div className="flex flex-col items-center gap-3 mb-4">
              <img src={pixInfo.qrCodeUrl} alt="QR Code PIX" className="w-48 h-48 rounded-lg border" style={{ borderColor: cor.borda }} />
              <p className="text-sm" style={{ color: cor.tintaMuted }}>PIX de R$ {pixInfo.amountBrl} — escaneie e toque em "Já paguei"</p>
              <button onClick={handleConsultar} className="w-full py-2.5 rounded-lg font-semibold" style={{ backgroundColor: cor.destaque, color: cor.fundo }}>
                Já paguei
              </button>
            </div>
          )}

          {!pixInfo && step === 'input' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: cor.tinta }}>CPF *</label>
                <input
                  type="text"
                  value={cpf}
                  onChange={(e) => setCpf(formatarDocumento(e.target.value))}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className="w-full px-4 py-3 rounded-lg border bg-transparent focus:outline-none font-mono"
                  style={{ borderColor: cor.borda, color: cor.tinta }}
                  autoFocus
                />
              </div>
              <button
                onClick={handleConsultar}
                disabled={!cpf || cpf.replace(/\D/g, '').length !== 11}
                className="w-full py-3 rounded-lg font-semibold disabled:opacity-40"
                style={{ backgroundColor: cor.destaque, color: cor.fundo }}
              >
                Consultar — R$ 15,00
              </button>
            </div>
          )}

          {step === 'loading' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-10 h-10 animate-spin mb-4" style={{ color: cor.destaque }} />
              <p style={{ color: cor.tinta }}>Consultando restrições...</p>
            </div>
          )}

          {step === 'result' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6" style={{ color: cor.destaque }} />
                <span className="font-semibold" style={{ color: cor.tinta }}>Consulta realizada com sucesso</span>
              </div>

              <div className="border rounded-xl overflow-hidden" style={{ borderColor: cor.borda }}>
                <div className="max-h-[360px] overflow-y-auto">
                  {resultado.map((item, index) => (
                    <div key={index} className="px-4 py-3 border-b last:border-b-0" style={{ borderColor: cor.borda, backgroundColor: index % 2 === 0 ? cor.faixaAlt : cor.fundo }}>
                      {item.label === '---' ? (
                        <div className="font-semibold text-sm" style={{ color: cor.tinta }}>{item.value}</div>
                      ) : (
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-sm font-medium" style={{ color: cor.tintaMuted }}>{item.label}</div>
                          <div className="col-span-2 text-sm" style={{ color: cor.tinta }}>{item.value}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                {pdfBase64 && (
                  <button onClick={handleDownloadPDF} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium" style={{ backgroundColor: cor.destaque, color: cor.fundo }}>
                    <Download className="w-4 h-4" />
                    Baixar PDF
                  </button>
                )}
                <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium border" style={{ borderColor: cor.borda, color: cor.tinta }}>
                  Fechar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
