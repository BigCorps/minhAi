'use client';

// ─────────────────────────────────────────────────────────────────────────────
// SegundaViaBoletoDisplay.tsx
// Caminho: components/VoiceAssistant/modals/SegundaViaBoletoDisplay.tsx
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, RefreshCw, Download, Mail, Loader2, Mic, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';
import { useGoogleConnected } from '@/components/VoiceAssistant/hooks/useGoogleConnected';
import { ResultDownloadQR } from '@/components/assistant/ResultDownloadQR';

// ─── Tipos ───────────────────────────────────────────────────────────────────
type Stage = 'input' | 'processing' | 'result' | 'error';

interface BoletoData {
  linhaDigitavel: string;
  codigoBarras: string;
  banco: string;
  valor: string | null;
  vencimento: string | null;
  moeda: string;
}

interface Props {
  data: { companyId: string };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText: (text: string) => Promise<void>;
}

// ─── Mapa de bancos ───────────────────────────────────────────────────────────
const BANCOS: Record<string, string> = {
  '001': 'Banco do Brasil', '033': 'Santander', '041': 'Banrisul',
  '069': 'Crefisa', '077': 'Banco Inter', '085': 'Ailos',
  '104': 'Caixa Economica Federal', '136': 'Unicred', '197': 'Stone',
  '208': 'BTG Pactual', '212': 'Banco Original', '237': 'Bradesco',
  '260': 'Nu Pagamentos (Nubank)', '290': 'PagBank', '318': 'BMG',
  '341': 'Itau', '348': 'XP Investimentos', '364': 'Gerencianet',
  '376': 'JP Morgan', '380': 'PicPay', '389': 'Mercantil do Brasil',
  '422': 'Safra', '456': 'MUFG', '473': 'Caixa Geral',
  '505': 'Credit Suisse', '604': 'Industrial do Brasil', '611': 'Paulista',
  '623': 'Pan', '633': 'Rendimento', '637': 'Sofisa', '643': 'Pine',
  '707': 'Daycoval', '739': 'Cetelem', '745': 'Citibank', '746': 'Modal',
  '748': 'Sicredi', '752': 'BNP Paribas', '755': 'Bank of America',
  '756': 'Sicoob', '757': 'KEB Hana',
};

// ─── Utilitários ─────────────────────────────────────────────────────────────
function apenasDigitos(s: string) { return s.replace(/\D/g, ''); }

function formatarLinhaDigitavel(d: string): string {
  if (d.length === 47)
    return `${d.slice(0,5)}.${d.slice(5,10)} ${d.slice(10,15)}.${d.slice(15,21)} ${d.slice(21,26)}.${d.slice(26,32)} ${d.slice(32,33)} ${d.slice(33)}`;
  if (d.length === 48)
    return `${d.slice(0,11)} ${d.slice(11,22)} ${d.slice(22,33)} ${d.slice(33,44)} ${d.slice(44)}`;
  return d;
}

function linhaParaCodigoBarras(d: string): string {
  if (d.length !== 47) return d;
  return d.slice(0,3) + d.slice(3,4) + d.slice(32,33) + d.slice(33,47) + d.slice(4,9) + d.slice(10,20) + d.slice(21,31);
}

function extrairValor(cb: string): string | null {
  if (cb.length !== 44) return null;
  const n = parseInt(cb.slice(9, 19), 10);
  if (isNaN(n) || n === 0) return null;
  return (n / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function extrairVencimento(cb: string): string | null {
  if (cb.length !== 44) return null;
  const fator = parseInt(cb.slice(5, 9), 10);
  if (isNaN(fator) || fator === 0) return null;
  const base = new Date(1997, 9, 7);
  base.setDate(base.getDate() + fator);
  return base.toLocaleDateString('pt-BR');
}

function extrairBanco(cb: string): string {
  const cod = cb.slice(0, 3);
  return BANCOS[cod] ? `${BANCOS[cod]} (${cod})` : `Banco ${cod}`;
}

function validarLinha(digits: string): { valida: boolean; erro?: string } {
  if (digits.length === 47 || digits.length === 48) return { valida: true };
  if (digits.length < 47) return { valida: false, erro: `Linha incompleta (${digits.length}/47 digitos)` };
  return { valida: false, erro: `Linha invalida (${digits.length} digitos — esperado 47 ou 48)` };
}

const normalize = (t: string) =>
  t.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[.,!?;:\-]+/g, '');

const OPENING_TEXT = 'Segunda via de boleto. Digite a linha digitavel do boleto para gerar o codigo de barras e o PDF.';

// ─── VoiceHint ────────────────────────────────────────────────────────────────
function VoiceHint({ commands, isDark }: { commands: string[]; isDark: boolean }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs ${isDark ? 'bg-slate-700/50 text-slate-400' : 'bg-gray-50 text-gray-500'}`}>
      <Mic className="w-3.5 h-3.5 shrink-0" />
      <div className="flex flex-wrap gap-x-2 gap-y-1">
        {commands.map(cmd => (
          <span key={cmd} className={`px-1.5 py-0.5 rounded font-mono text-[11px] ${isDark ? 'bg-slate-600 text-blue-300' : 'bg-gray-200 text-blue-700'}`}>
            {cmd}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Geração do PDF ───────────────────────────────────────────────────────────
// Sem emojis — jsPDF nao suporta caracteres unicode fora do latin1.
// Todos os textos usam apenas ASCII / latin1.
async function gerarBoletoPDF(boleto: BoletoData): Promise<string> {
  const { jsPDF } = await import('jspdf');
  const JsBarcode = (await import('jsbarcode')).default;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const MARGIN = 15;

  // ── Header azul eAi (#A2D9F7 = rgb 162,217,247) ──
  doc.setFillColor(162, 217, 247);
  doc.rect(0, 0, W, 28, 'F');
  doc.setFontSize(16);
  doc.setTextColor(26, 32, 44);
  doc.setFont('helvetica', 'bold');
  doc.text('Segunda Via de Boleto', MARGIN, 12);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(74, 85, 104);
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')} — minhAi`, MARGIN, 20);
  doc.text(boleto.banco, W - MARGIN, 20, { align: 'right' });

  // ── Aviso (sem emoji, usa texto simples) ──
  doc.setFillColor(255, 251, 235);
  doc.setDrawColor(253, 230, 138);
  doc.roundedRect(MARGIN, 32, W - MARGIN * 2, 12, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(146, 64, 14);
  doc.text(
    'ATENCAO: Este documento nao substitui o boleto original. Use apenas o codigo de barras para pagamento.',
    MARGIN + 3, 39.5
  );

  // ── Dados extraídos ──
  let y = 52;
  doc.setFontSize(11);
  doc.setTextColor(26, 32, 44);
  doc.setFont('helvetica', 'bold');
  doc.text('Dados do Boleto', MARGIN, y);
  doc.setLineWidth(0.3);
  doc.setDrawColor(226, 232, 240);
  doc.line(MARGIN, y + 2, W - MARGIN, y + 2);
  y += 10;

  const rows: [string, string][] = [
    ['Banco',      boleto.banco],
    ['Moeda',      boleto.moeda],
    ['Valor',      boleto.valor      ?? 'Nao informado na linha digitavel'],
    ['Vencimento', boleto.vencimento ?? 'Nao informado na linha digitavel'],
  ];

  doc.setFontSize(9);
  for (const [label, value] of rows) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(label, MARGIN, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(26, 32, 44);
    doc.text(value, MARGIN + 35, y);
    y += 7;
  }

  // ── Linha digitável ──
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(9);
  doc.text('Linha Digitavel', MARGIN, y);
  y += 5;

  doc.setFillColor(15, 23, 42);
  doc.roundedRect(MARGIN, y, W - MARGIN * 2, 10, 2, 2, 'F');
  doc.setFont('courier', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(boleto.linhaDigitavel, W / 2, y + 6.5, { align: 'center' });
  y += 18;

  // ── Código de barras ──
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(9);
  doc.text('Codigo de Barras', MARGIN, y);
  y += 4;

  try {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, boleto.codigoBarras, {
      format: 'CODE128',
      width: 2,
      height: 60,
      displayValue: false,
      margin: 8,
      background: '#ffffff',
      lineColor: '#000000',
    });
    const barcodeDataUrl = canvas.toDataURL('image/png');
    const barcodeW = W - MARGIN * 2;
    const barcodeH = Math.min(barcodeW * (canvas.height / canvas.width), 25);
    doc.addImage(barcodeDataUrl, 'PNG', MARGIN, y, barcodeW, barcodeH);
    y += barcodeH + 4;
  } catch {
    doc.setFontSize(8);
    doc.setTextColor(239, 68, 68);
    doc.text('Erro ao gerar codigo de barras', MARGIN, y);
    y += 8;
  }

  // Número do código abaixo do barcode
  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(boleto.codigoBarras, W / 2, y, { align: 'center' });
  y += 12;

  // ── Como pagar (sem emoji) ──
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(MARGIN, y, W - MARGIN * 2, 16, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(21, 128, 61);
  doc.text('Como pagar:', MARGIN + 4, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(22, 101, 52);
  doc.text(
    'Escaneie o codigo de barras acima no aplicativo do seu banco ou caixa eletronico.',
    MARGIN + 4, y + 11
  );

  // ── Rodapé ──
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFillColor(248, 250, 252);
  doc.rect(0, pageH - 14, W, 14, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(
    'Documento gerado automaticamente pelo assistente minhAi / eAi — BigCorps',
    W / 2, pageH - 6, { align: 'center' }
  );

  return doc.output('datauristring');
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function SegundaViaBoletoDisplay({ data, onClose, theme = 'dark', playText }: Props) {
  const isDark = theme === 'dark';
  const supabase = createClient();
  const { isConnected: googleConnected } = useGoogleConnected(data.companyId);

  const [stage, setStage]             = useState<Stage>('input');
  const [linhaInput, setLinhaInput]   = useState('');
  const [inputError, setInputError]   = useState('');
  const [boletoData, setBoletoData]   = useState<BoletoData | null>(null);
  const [pdfUri, setPdfUri]           = useState<string>('');
  const [fileName, setFileName]       = useState<string>('');
  const [errorMsg, setErrorMsg]       = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // ── Abrir modal — fala UMA vez ───────────────────────────────────────────────
  useEffect(() => {
    window.speechSynthesis?.cancel();
    playText(OPENING_TEXT).catch(() => {});
  }, []); // eslint-disable-line

  // ── Formatar input ────────────────────────────────────────────────────────────
  const handleLinhaChange = (value: string) => {
    setLinhaInput(value.replace(/[^\d.\s]/g, ''));
    setInputError('');
  };

  // ── Processar ────────────────────────────────────────────────────────────────
  const handleProcessar = useCallback(async () => {
    const digits = apenasDigitos(linhaInput);
    const { valida, erro } = validarLinha(digits);
    if (!valida) { setInputError(erro ?? 'Linha digitavel invalida.'); return; }

    setStage('processing');
    try {
      const codigoBarras = linhaParaCodigoBarras(digits);
      const boleto: BoletoData = {
        linhaDigitavel: formatarLinhaDigitavel(digits),
        codigoBarras,
        banco:      extrairBanco(codigoBarras),
        valor:      extrairValor(codigoBarras),
        vencimento: extrairVencimento(codigoBarras),
        moeda:      'Real (R$)',
      };

      setBoletoData(boleto);

      const uri  = await gerarBoletoPDF(boleto);
      const name = `boleto_segunda_via_${Date.now()}.pdf`;
      setPdfUri(uri);
      setFileName(name);
      setStage('result');

      playText(
        `Segunda via gerada. ${boleto.valor ? `Valor: ${boleto.valor}.` : ''} ${boleto.vencimento ? `Vencimento: ${boleto.vencimento}.` : ''} O PDF esta pronto para download.`
      ).catch(() => {});
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Erro ao gerar segunda via.');
      setStage('error');
    }
  }, [linhaInput, playText]);

  // ── Download ──────────────────────────────────────────────────────────────────
  const handleDownload = useCallback(() => {
    if (!pdfUri) return;
    const a = document.createElement('a');
    a.href = pdfUri;
    a.download = fileName;
    a.click();
    playText('PDF baixado com sucesso.').catch(() => {});
  }, [pdfUri, fileName, playText]);

  // ── Email ─────────────────────────────────────────────────────────────────────
  const handleSendEmail = useCallback(async () => {
    if (!boletoData) return;
    setIsSendingEmail(true);
    try {
      const { error } = await supabase.functions.invoke('enviar-email-google', {
        body: {
          company_id: data.companyId,
          subject: `Segunda Via de Boleto — ${boletoData.banco}`,
          body: [
            'Segunda via de boleto gerada pelo assistente.',
            '',
            `Banco: ${boletoData.banco}`,
            `Valor: ${boletoData.valor ?? 'Nao informado'}`,
            `Vencimento: ${boletoData.vencimento ?? 'Nao informado'}`,
            '',
            'Linha Digitavel:',
            boletoData.linhaDigitavel,
            '',
            'Codigo de Barras:',
            boletoData.codigoBarras,
          ].join('\n'),
        },
      });
      if (error) throw error;
      playText('Email enviado com sucesso.').catch(() => {});
    } catch {
      playText('Erro ao enviar email.').catch(() => {});
    } finally {
      setIsSendingEmail(false);
    }
  }, [boletoData, data.companyId, supabase, playText]);

  // ── Reset ─────────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setStage('input');
    setLinhaInput('');
    setInputError('');
    setBoletoData(null);
    setPdfUri('');
    setFileName('');
    setErrorMsg('');
  }, []);

  // ── Voice commands ────────────────────────────────────────────────────────────
  useModalVoiceCommand({
    active: true,
    onTranscript: (transcript) => {
      const t = normalize(transcript);
      if (['fechar', 'cancelar', 'sair', 'voltar'].some(c => t.includes(c))) { onClose(); return; }
      if (['repetir', 'repete', 'de novo', 'nao ouvi'].some(c => t.includes(c))) {
        playText(OPENING_TEXT).catch(() => {}); return;
      }
      if (stage === 'result') {
        if (['baixar', 'download', 'salvar pdf'].some(c => t.includes(c))) { handleDownload(); return; }
        if (googleConnected && ['enviar email', 'mandar email'].some(c => t.includes(c))) { handleSendEmail(); return; }
        if (['novo boleto', 'nova consulta', 'novamente'].some(c => t.includes(c))) { handleReset(); return; }
      }
      if (stage === 'error') {
        if (['tentar novamente', 'novamente'].some(c => t.includes(c))) { handleReset(); return; }
      }
    },
  });

  // Converte data URI → base64 puro para o ResultDownloadQR
  const fileBase64 = pdfUri ? pdfUri.split(',')[1] ?? '' : '';

  const digitCount = apenasDigitos(linhaInput).length;
  const isReady    = digitCount >= 47;

  // ── Render ────────────────────────────────────────────────────────────────────
  const modalMaxWidth = stage === 'result' ? 'max-w-lg sm:max-w-3xl' : 'max-w-lg';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
      <div className={`w-full ${modalMaxWidth} rounded-2xl p-6 shadow-2xl ${isDark ? 'bg-slate-800 border border-white/10' : 'bg-white border border-gray-200'}`}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-5">
          <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Segunda Via de Boleto
          </h2>
          <button onClick={onClose} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-gray-100 text-gray-500'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════
            STAGE: input
        ══════════════════════════════════════════════════════ */}
        {stage === 'input' && (
          <div className="flex flex-col gap-4">

            {/* Info */}
            <div className={`px-3 py-2.5 rounded-xl text-xs leading-relaxed ${isDark ? 'bg-amber-900/20 border border-amber-700/40 text-amber-300' : 'bg-amber-50 border border-amber-200 text-amber-800'}`}>
              Digite a linha digitavel do boleto (47 ou 48 numeros, com ou sem pontos e espacos).
              O sistema gera um PDF com o codigo de barras para pagamento no banco.
            </div>

            {/* Campo */}
            <div className="flex flex-col gap-1.5">
              <label className={`text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                Linha Digitavel
              </label>
              <textarea
                value={linhaInput}
                onChange={e => handleLinhaChange(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleProcessar(); } }}
                placeholder="00000.00000 00000.000000 00000.000000 0 00000000000000000"
                rows={3}
                autoFocus
                className={`w-full px-3 py-2.5 rounded-xl text-sm font-mono resize-none outline-none border transition-colors ${
                  inputError
                    ? 'border-red-500'
                    : isDark
                      ? 'bg-slate-900 border-slate-600 text-slate-200 placeholder-slate-500 focus:border-indigo-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-indigo-500'
                }`}
              />
              <div className="flex justify-between items-center">
                {inputError
                  ? <p className="text-xs text-red-400">{inputError}</p>
                  : <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                      {digitCount} digitos
                      {digitCount > 0 && digitCount < 47 && ` (faltam ${47 - digitCount})`}
                      {(digitCount === 47 || digitCount === 48) && ' ✓'}
                    </span>
                }
              </div>
            </div>

            {/* Botão */}
            <button
              onClick={handleProcessar}
              disabled={!isReady}
              className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${
                isReady
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : isDark ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              Gerar Segunda Via
            </button>

            <VoiceHint commands={['"fechar"']} isDark={isDark} />
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            STAGE: processing
        ══════════════════════════════════════════════════════ */}
        {stage === 'processing' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className={`w-12 h-12 border-4 border-t-transparent rounded-full animate-spin ${isDark ? 'border-indigo-500' : 'border-indigo-600'}`} />
            <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>Gerando segunda via...</p>
            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Processando linha digitavel e gerando PDF</p>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            STAGE: result
        ══════════════════════════════════════════════════════ */}
        {stage === 'result' && boletoData && (
          <div className="flex flex-col gap-4">

            {/* Banner sucesso */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${isDark ? 'bg-green-900/30 border border-green-700 text-green-300' : 'bg-green-50 border border-green-200 text-green-700'}`}>
              <Check className="w-4 h-4 shrink-0" />
              <span>Segunda via gerada!</span>
              <span className={`ml-auto text-xs font-normal ${isDark ? 'text-green-400/70' : 'text-green-600/70'}`}>
                {boletoData.banco}
              </span>
            </div>

            {/* Layout 2 colunas desktop */}
            <div className="flex flex-col sm:flex-row gap-4">

              {/* Coluna esquerda — dados + ações */}
              <div className="flex flex-col gap-3 flex-1 min-w-0">

                {/* Dados extraídos */}
                <div className={`rounded-xl p-4 grid grid-cols-2 gap-x-6 gap-y-3 ${isDark ? 'bg-slate-900/60' : 'bg-gray-50'}`}>
                  {([
                    ['Valor',      boletoData.valor      ?? 'Nao informado'],
                    ['Vencimento', boletoData.vencimento ?? 'Nao informado'],
                    ['Banco',      boletoData.banco],
                    ['Moeda',      boletoData.moeda],
                  ] as [string, string][]).map(([label, value]) => (
                    <div key={label}>
                      <p className={`text-[10px] font-semibold uppercase tracking-wide mb-0.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                        {label}
                      </p>
                      <p className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Linha digitável */}
                <div className={`rounded-xl px-3 py-2.5 ${isDark ? 'bg-slate-900/60' : 'bg-gray-50'}`}>
                  <p className={`text-[10px] font-semibold uppercase tracking-wide mb-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                    Linha Digitavel
                  </p>
                  <p className={`text-xs font-mono leading-relaxed break-all ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    {boletoData.linhaDigitavel}
                  </p>
                </div>

                {/* Aviso */}
                <div className={`px-3 py-2 rounded-xl text-xs leading-relaxed ${isDark ? 'bg-amber-900/20 border border-amber-700/40 text-amber-300' : 'bg-amber-50 border border-amber-200 text-amber-800'}`}>
                  Este documento nao substitui o boleto original. Use apenas o codigo de barras para pagamento no banco.
                </div>

                {/* Botões */}
                <button
                  onClick={handleDownload}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-all"
                >
                  <Download className="w-4 h-4" />
                  Baixar PDF
                </button>

                <div className="flex gap-2">
                  {googleConnected && (
                    <button
                      onClick={handleSendEmail}
                      disabled={isSendingEmail}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-all"
                    >
                      {isSendingEmail
                        ? <><Loader2 className="w-4 h-4 animate-spin" />Enviando...</>
                        : <><Mail className="w-4 h-4" />Enviar email</>
                      }
                    </button>
                  )}
                  <button
                    onClick={handleReset}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    <RefreshCw className="w-4 h-4" />
                    Novo boleto
                  </button>
                </div>

                <VoiceHint
                  commands={['"baixar pdf"', ...(googleConnected ? ['"enviar email"'] : []), '"novo boleto"', '"fechar"']}
                  isDark={isDark}
                />
              </div>

              {/* Coluna direita — QR de download (desktop) */}
              <div className="hidden sm:flex flex-col shrink-0 w-56">
                <ResultDownloadQR
                  companyId={data.companyId}
                  fileName={fileName}
                  fileType="application/pdf"
                  fileBase64={fileBase64}
                  isDark={isDark}
                  enabled={stage === 'result' && !!fileBase64}
                />
              </div>

              {/* QR mobile — abaixo das ações */}
              <div className="sm:hidden">
                <ResultDownloadQR
                  companyId={data.companyId}
                  fileName={fileName}
                  fileType="application/pdf"
                  fileBase64={fileBase64}
                  isDark={isDark}
                  enabled={stage === 'result' && !!fileBase64}
                />
              </div>

            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            STAGE: error
        ══════════════════════════════════════════════════════ */}
        {stage === 'error' && (
          <div className="flex flex-col gap-4">
            <div className={`px-3 py-3 rounded-xl text-sm ${isDark ? 'bg-red-900/30 border border-red-700 text-red-300' : 'bg-red-50 border border-red-200 text-red-600'}`}>
              {errorMsg}
            </div>
            <button
              onClick={handleReset}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700"
            >
              <RefreshCw className="w-4 h-4" />Tentar novamente
            </button>
          </div>
        )}

      </div>
    </div>,
    document.body
  );
}
