'use client';

// ─────────────────────────────────────────────────────────────────────────────
// SegundaViaBoletoDisplay.tsx
// Caminho: components/VoiceAssistant/modals/SegundaViaBoletoDisplay.tsx
//
// Cliente digita a linha digitável de um boleto.
// O modal valida, extrai dados e gera PDF com código de barras para impressão.
// 100% frontend — sem edge function, sem créditos OpenAI.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, RefreshCw, Loader2, Download, Mail, Loader } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';
import { useGoogleConnected } from '@/components/VoiceAssistant/hooks/useGoogleConnected';

// ─── Tipos ───────────────────────────────────────────────────────────────────
type Stage = 'input' | 'processing' | 'result' | 'error';

interface BoletoData {
  linhaDigitavel: string;       // formatada: XXXXX.XXXXX XXXXX.XXXXXX XXXXX.XXXXXX X XXXXXXXXXXXXXXXX
  codigoBarras: string;         // 44 dígitos sem formatação
  banco: string;
  valor: string | null;         // null se não estiver na linha digitável
  vencimento: string | null;    // null se não estiver
  moeda: string;
}

interface Props {
  data: { companyId: string };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText: (text: string) => Promise<void>;
}

// ─── Paletas ─────────────────────────────────────────────────────────────────
const DARK = {
  bg:              '#1e293b',
  border:          'rgba(255,255,255,0.08)',
  header:          '#f8fafc',
  sub:             '#94a3b8',
  card:            '#0f172a',
  cardBorder:      'rgba(255,255,255,0.06)',
  input:           '#0f172a',
  inputBorder:     '#334155',
  inputText:       '#e2e8f0',
  inputPlaceholder:'#475569',
  label:           '#cbd5e1',
  btn:             '#6366f1',
  btnText:         '#ffffff',
  btnSecondary:    'rgba(255,255,255,0.08)',
  btnSecondaryText:'#cbd5e1',
  successBg:       'rgba(22,163,74,0.1)',
  successBorder:   'rgba(22,163,74,0.25)',
  successText:     '#86efac',
  errorBg:         'rgba(239,68,68,0.12)',
  errorBorder:     'rgba(239,68,68,0.3)',
  errorText:       '#fca5a5',
  warningBg:       'rgba(245,158,11,0.1)',
  warningBorder:   'rgba(245,158,11,0.25)',
  warningText:     '#fcd34d',
};

const LIGHT = {
  bg:              '#ffffff',
  border:          '#e2e8f0',
  header:          '#0f172a',
  sub:             '#64748b',
  card:            '#f8fafc',
  cardBorder:      '#e2e8f0',
  input:           '#ffffff',
  inputBorder:     '#cbd5e1',
  inputText:       '#1e293b',
  inputPlaceholder:'#94a3b8',
  label:           '#475569',
  btn:             '#6366f1',
  btnText:         '#ffffff',
  btnSecondary:    '#f1f5f9',
  btnSecondaryText:'#475569',
  successBg:       '#f0fdf4',
  successBorder:   '#bbf7d0',
  successText:     '#15803d',
  errorBg:         '#fef2f2',
  errorBorder:     '#fecaca',
  errorText:       '#dc2626',
  warningBg:       '#fffbeb',
  warningBorder:   '#fde68a',
  warningText:     '#92400e',
};

// ─── Mapa de bancos (código 3 dígitos → nome) ─────────────────────────────────
const BANCOS: Record<string, string> = {
  '001': 'Banco do Brasil',
  '033': 'Santander',
  '041': 'Banrisul',
  '069': 'Crefisa',
  '077': 'Banco Inter',
  '085': 'Ailos',
  '104': 'Caixa Econômica Federal',
  '136': 'Unicred',
  '197': 'Stone',
  '208': 'BTG Pactual',
  '212': 'Banco Original',
  '237': 'Bradesco',
  '260': 'Nu Pagamentos (Nubank)',
  '290': 'PagBank',
  '318': 'BMG',
  '341': 'Itaú',
  '348': 'XP Investimentos',
  '364': 'Gerencianet',
  '376': 'JP Morgan',
  '380': 'PicPay',
  '389': 'Mercantil do Brasil',
  '422': 'Safra',
  '435': 'Delcred',
  '456': 'MUFG',
  '473': 'Caixa Geral',
  '505': 'Credit Suisse',
  '604': 'Industrial do Brasil',
  '611': 'Paulista',
  '623': 'Pan',
  '630': 'Intercap',
  '633': 'Rendimento',
  '637': 'Sofisa',
  '643': 'Pine',
  '707': 'Daycoval',
  '739': 'Cetelem',
  '741': 'Ribeirão Preto',
  '743': 'Semear',
  '745': 'Citibank',
  '746': 'Modal',
  '748': 'Sicredi',
  '752': 'BNP Paribas',
  '755': 'Bank of America',
  '756': 'Sicoob',
  '757': 'KEB Hana',
};

// ─── Utilitários de boleto ────────────────────────────────────────────────────

function apenasDigitos(s: string): string {
  return s.replace(/\D/g, '');
}

// Formata linha digitável: AAAAA.AAAAA BBBBB.BBBBBB CCCCC.CCCCCC D EEEEEEEEEEEEEEEE
function formatarLinhaDigitavel(digits: string): string {
  if (digits.length === 47) {
    return `${digits.slice(0,5)}.${digits.slice(5,10)} ${digits.slice(10,15)}.${digits.slice(15,21)} ${digits.slice(21,26)}.${digits.slice(26,32)} ${digits.slice(32,33)} ${digits.slice(33)}`;
  }
  if (digits.length === 48) {
    // Guia de recolhimento (contas convênio)
    return `${digits.slice(0,11)} ${digits.slice(11,22)} ${digits.slice(22,33)} ${digits.slice(33,44)} ${digits.slice(44)}`;
  }
  return digits;
}

// Converte linha digitável 47 dígitos → código de barras 44 dígitos
function linhaParaCodigoBarras(digits: string): string {
  if (digits.length !== 47) return digits;
  // Campos: banco(3) moeda(1) vencimento(4) valor(10) campo1(9) campo2(10) campo3(10) digVer(1)
  const banco  = digits.slice(0, 3);
  const moeda  = digits.slice(3, 4);
  const campo1 = digits.slice(4, 9);   // sem dígito verificador
  const campo2 = digits.slice(10, 20); // sem dígito verificador
  const campo3 = digits.slice(21, 31); // sem dígito verificador
  const digVer = digits.slice(32, 33);
  const vencValor = digits.slice(33, 47);
  return banco + moeda + digVer + vencValor + campo1 + campo2 + campo3;
}

// Extrai valor do código de barras (posições 9-18, 8 inteiros + 2 decimais)
function extrairValor(codigoBarras: string): string | null {
  if (codigoBarras.length !== 44) return null;
  const valorRaw = codigoBarras.slice(9, 19);
  const num = parseInt(valorRaw, 10);
  if (isNaN(num) || num === 0) return null;
  return (num / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Extrai vencimento do código de barras (posições 5-8, fator de vencimento)
function extrairVencimento(codigoBarras: string): string | null {
  if (codigoBarras.length !== 44) return null;
  const fator = parseInt(codigoBarras.slice(5, 9), 10);
  if (isNaN(fator) || fator === 0) return null;
  // Fator 0000 = sem vencimento; base = 07/10/1997
  const base = new Date(1997, 9, 7); // mês 0-based
  base.setDate(base.getDate() + fator);
  return base.toLocaleDateString('pt-BR');
}

// Extrai banco
function extrairBanco(codigoBarras: string): string {
  const cod = codigoBarras.slice(0, 3);
  return BANCOS[cod] ? `${BANCOS[cod]} (${cod})` : `Banco ${cod}`;
}

// Valida linha digitável
function validarLinhaDigitavel(digits: string): { valida: boolean; erro?: string } {
  if (digits.length === 47) return { valida: true };
  if (digits.length === 48) return { valida: true };
  if (digits.length < 47) return { valida: false, erro: `Linha incompleta (${digits.length}/47 dígitos)` };
  return { valida: false, erro: `Linha inválida (${digits.length} dígitos — esperado 47 ou 48)` };
}

// Normaliza helpers
const normalize = (text: string) =>
  text.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,!?;:\-]+/g, '');

const OPENING_TEXT = 'Segunda via de boleto. Digite a linha digitável do boleto para gerar o código de barras e o PDF.';

// ─── Geração de PDF com código de barras ─────────────────────────────────────
async function gerarBoletoPDF(boleto: BoletoData): Promise<string> {
  const { jsPDF } = await import('jspdf');
  const JsBarcode = (await import('jsbarcode')).default;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const MARGIN = 15;

  // ── Header azul eAi ──
  doc.setFillColor(162, 217, 247); // #A2D9F7
  doc.rect(0, 0, W, 28, 'F');
  doc.setFontSize(16);
  doc.setTextColor(26, 32, 44);
  doc.setFont('helvetica', 'bold');
  doc.text('Segunda Via de Boleto', MARGIN, 12);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(74, 85, 104);
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')} — minhAi / eAi`, MARGIN, 20);
  doc.text(boleto.banco, W - MARGIN, 20, { align: 'right' });

  // ── Alerta ──
  doc.setFillColor(255, 251, 235);
  doc.setDrawColor(253, 230, 138);
  doc.roundedRect(MARGIN, 32, W - MARGIN * 2, 14, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(146, 64, 14);
  doc.text('⚠  Este documento não substitui o boleto original. Use apenas o código de barras para pagamento.', MARGIN + 3, 40);

  // ── Dados extraídos ──
  let y = 54;
  doc.setFontSize(11);
  doc.setTextColor(26, 32, 44);
  doc.setFont('helvetica', 'bold');
  doc.text('Dados do Boleto', MARGIN, y);
  doc.setLineWidth(0.3);
  doc.setDrawColor(226, 232, 240);
  doc.line(MARGIN, y + 2, W - MARGIN, y + 2);
  y += 10;

  const rows: [string, string][] = [
    ['Banco',       boleto.banco],
    ['Moeda',       boleto.moeda],
    ['Valor',       boleto.valor ?? 'Não informado na linha digitável'],
    ['Vencimento',  boleto.vencimento ?? 'Não informado na linha digitável'],
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
  doc.text('Linha Digitável', MARGIN, y);
  y += 5;

  doc.setFillColor(15, 23, 42);
  doc.roundedRect(MARGIN, y, W - MARGIN * 2, 10, 2, 2, 'F');
  doc.setFont('courier', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(boleto.linhaDigitavel, W / 2, y + 6.5, { align: 'center' });
  y += 18;

  // ── Código de barras via canvas ──
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(9);
  doc.text('Código de Barras', MARGIN, y);
  y += 4;

  try {
    // Gerar código de barras em canvas
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
    const barcodeH = barcodeW * (canvas.height / canvas.width);
    doc.addImage(barcodeDataUrl, 'PNG', MARGIN, y, barcodeW, Math.min(barcodeH, 25));
    y += Math.min(barcodeH, 25) + 4;
  } catch {
    doc.setFontSize(8);
    doc.setTextColor(239, 68, 68);
    doc.text('Erro ao gerar código de barras', MARGIN, y);
    y += 8;
  }

  // Código numérico abaixo do barcode
  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(boleto.codigoBarras, W / 2, y, { align: 'center' });
  y += 12;

  // ── Instrução de pagamento ──
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(MARGIN, y, W - MARGIN * 2, 16, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(21, 128, 61);
  doc.text('Como pagar:', MARGIN + 4, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(22, 101, 52);
  doc.text('Escaneie o código de barras acima no aplicativo do seu banco ou caixa eletrônico.', MARGIN + 4, y + 11);

  // ── Rodapé ──
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFillColor(248, 250, 252);
  doc.rect(0, pageH - 14, W, 14, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('Documento gerado automaticamente pelo assistente minhAi / eAi — BigCorps', W / 2, pageH - 6, { align: 'center' });

  return doc.output('datauristring');
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function SegundaViaBoletoDisplay({ data, onClose, theme = 'dark', playText }: Props) {
  const p        = theme === 'dark' ? DARK : LIGHT;
  const supabase = createClient();
  const { isConnected: googleConnected } = useGoogleConnected(data.companyId);

  // ── Estado ──────────────────────────────────────────────────────────────────
  const [stage, setStage]           = useState<Stage>('input');
  const [linhaInput, setLinhaInput] = useState('');
  const [inputError, setInputError] = useState('');
  const [boletoData, setBoletoData] = useState<BoletoData | null>(null);
  const [pdfUri, setPdfUri]         = useState<string>('');
  const [errorMsg, setErrorMsg]     = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isGenerating, setIsGenerating]     = useState(false);
  const [copied, setCopied]         = useState(false);

  // ── Abrir modal ──────────────────────────────────────────────────────────────
  useEffect(() => {
    window.speechSynthesis?.cancel();
    playText(OPENING_TEXT).catch(() => {});
  }, []); // eslint-disable-line

  // ── Formatar input enquanto digita ───────────────────────────────────────────
  const handleLinhaChange = (value: string) => {
    // Permitir apenas dígitos, pontos e espaços (para facilitar digitação)
    const cleaned = value.replace(/[^\d.\s]/g, '');
    setLinhaInput(cleaned);
    setInputError('');
  };

  // ── Processar linha digitável ─────────────────────────────────────────────────
  const handleProcessar = useCallback(async () => {
    const digits = apenasDigitos(linhaInput);
    const { valida, erro } = validarLinhaDigitavel(digits);

    if (!valida) {
      setInputError(erro ?? 'Linha digitável inválida.');
      return;
    }

    setStage('processing');
    setIsGenerating(true);

    try {
      const codigoBarras = linhaParaCodigoBarras(digits);
      const boleto: BoletoData = {
        linhaDigitavel: formatarLinhaDigitavel(digits),
        codigoBarras,
        banco:       extrairBanco(codigoBarras),
        valor:       extrairValor(codigoBarras),
        vencimento:  extrairVencimento(codigoBarras),
        moeda:       digits[3] === '9' ? 'Real (R$)' : 'Real (R$)',
      };

      setBoletoData(boleto);
      const uri = await gerarBoletoPDF(boleto);
      setPdfUri(uri);
      setStage('result');
      playText(
        `Segunda via gerada. ${boleto.valor ? `Valor: ${boleto.valor}.` : ''} ${boleto.vencimento ? `Vencimento: ${boleto.vencimento}.` : ''} O PDF está pronto para download.`
      ).catch(() => {});
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Erro ao gerar segunda via.');
      setStage('error');
    } finally {
      setIsGenerating(false);
    }
  }, [linhaInput, playText]);

  // ── Download do PDF ───────────────────────────────────────────────────────────
  const handleDownload = useCallback(() => {
    if (!pdfUri) return;
    const a = document.createElement('a');
    a.href = pdfUri;
    a.download = `boleto_segunda_via_${Date.now()}.pdf`;
    a.click();
    playText('PDF baixado com sucesso.').catch(() => {});
  }, [pdfUri, playText]);

  // ── Copiar linha digitável ────────────────────────────────────────────────────
  const handleCopiarLinha = useCallback(async () => {
    if (!boletoData) return;
    await navigator.clipboard.writeText(boletoData.linhaDigitavel);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    playText('Linha digitável copiada.').catch(() => {});
  }, [boletoData, playText]);

  // ── Enviar por email ──────────────────────────────────────────────────────────
  const handleSendEmail = useCallback(async () => {
    if (!boletoData) return;
    setIsSendingEmail(true);
    try {
      const { error } = await supabase.functions.invoke('enviar-email-google', {
        body: {
          company_id: data.companyId,
          subject: `Segunda Via de Boleto — ${boletoData.banco}`,
          body: `Segunda via de boleto gerada pelo assistente.\n\nBanco: ${boletoData.banco}\nValor: ${boletoData.valor ?? 'Não informado'}\nVencimento: ${boletoData.vencimento ?? 'Não informado'}\n\nLinha Digitável:\n${boletoData.linhaDigitavel}\n\nCódigo de Barras:\n${boletoData.codigoBarras}`,
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
    setErrorMsg('');
    setCopied(false);
  }, []);

  // ── Voice commands ────────────────────────────────────────────────────────────
  useModalVoiceCommand({
    active: true,
    onTranscript: (transcript) => {
      const t = normalize(transcript);
      if (['fechar', 'cancelar', 'sair', 'voltar'].some(cmd => t.includes(cmd))) {
        onClose(); return;
      }
      if (['repetir', 'repete', 'de novo', 'nao ouvi'].some(cmd => t.includes(cmd))) {
        playText(OPENING_TEXT).catch(() => {});
        return;
      }
      if (stage === 'result') {
        if (['baixar', 'download', 'salvar pdf'].some(cmd => t.includes(cmd))) {
          handleDownload(); return;
        }
        if (['copiar linha', 'copiar codigo'].some(cmd => t.includes(cmd))) {
          handleCopiarLinha(); return;
        }
        if (googleConnected && ['enviar email', 'mandar email'].some(cmd => t.includes(cmd))) {
          handleSendEmail(); return;
        }
        if (['nova consulta', 'novo boleto', 'novamente'].some(cmd => t.includes(cmd))) {
          handleReset(); return;
        }
      }
      if (stage === 'error') {
        if (['tentar novamente', 'novamente'].some(cmd => t.includes(cmd))) {
          handleReset(); return;
        }
      }
    },
  });

  // ─── Render ──────────────────────────────────────────────────────────────────
  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.75)', padding: 16,
    }}>
      <div style={{
        width: '100%', maxWidth: stage === 'result' ? 600 : 520,
        background: p.bg, border: `1px solid ${p.border}`,
        borderRadius: 20, padding: 24, boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
        maxHeight: '90vh', overflowY: 'auto',
      }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: p.header, margin: 0 }}>
            Segunda Via de Boleto
          </h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '6px 8px', borderRadius: 10, color: p.sub, lineHeight: 0,
          }}>
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════
            STAGE: input
        ══════════════════════════════════════════════════════ */}
        {stage === 'input' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Info */}
            <div style={{
              padding: '12px 14px', borderRadius: 12,
              background: p.warningBg, border: `1px solid ${p.warningBorder}`,
              fontSize: 12, color: p.warningText, lineHeight: 1.5,
            }}>
              Digite a linha digitável do boleto (47 ou 48 números, com ou sem pontos e espaços).
              O sistema gera um PDF com o código de barras para leitura no caixa.
            </div>

            {/* Campo de input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: p.label }}>
                Linha Digitável
              </label>
              <textarea
                value={linhaInput}
                onChange={e => handleLinhaChange(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleProcessar();
                  }
                }}
                placeholder="00000.00000 00000.000000 00000.000000 0 00000000000000000"
                rows={3}
                autoFocus
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 12,
                  border: `1px solid ${inputError ? '#ef4444' : p.inputBorder}`,
                  background: p.input, color: p.inputText,
                  fontSize: 13, fontFamily: 'monospace', resize: 'none',
                  outline: 'none', boxSizing: 'border-box', lineHeight: 1.6,
                }}
              />
              {/* Contador de dígitos */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {inputError
                  ? <p style={{ fontSize: 12, color: '#ef4444', margin: 0 }}>{inputError}</p>
                  : <span style={{ fontSize: 11, color: p.sub }}>
                      {apenasDigitos(linhaInput).length} dígitos
                      {apenasDigitos(linhaInput).length > 0 && apenasDigitos(linhaInput).length < 47 &&
                        ` (faltam ${47 - apenasDigitos(linhaInput).length})`}
                      {apenasDigitos(linhaInput).length === 47 && ' ✓'}
                      {apenasDigitos(linhaInput).length === 48 && ' ✓'}
                    </span>
                }
              </div>
            </div>

            {/* Botão gerar */}
            <button
              onClick={handleProcessar}
              disabled={apenasDigitos(linhaInput).length < 47}
              style={{
                padding: '13px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: apenasDigitos(linhaInput).length >= 47 ? p.btn : p.btnSecondary,
                color: apenasDigitos(linhaInput).length >= 47 ? p.btnText : p.btnSecondaryText,
                fontSize: 14, fontWeight: 600, transition: 'all 0.2s',
              }}
            >
              Gerar Segunda Via
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            STAGE: processing
        ══════════════════════════════════════════════════════ */}
        {stage === 'processing' && (
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 16, padding: '32px 0',
          }}>
            <Loader2 style={{ width: 40, height: 40, color: '#6366f1', animation: 'spin 1s linear infinite' }} />
            <p style={{ fontSize: 15, fontWeight: 600, color: p.header, margin: 0 }}>
              Gerando segunda via...
            </p>
            <p style={{ fontSize: 13, color: p.sub, margin: 0 }}>
              Processando linha digitável e gerando PDF
            </p>
            <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            STAGE: result
        ══════════════════════════════════════════════════════ */}
        {stage === 'result' && boletoData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Card sucesso */}
            <div style={{
              background: p.successBg, border: `1px solid ${p.successBorder}`,
              borderRadius: 14, padding: 16,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ fontSize: 28 }}>✅</span>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: p.successText, margin: 0 }}>
                  Segunda via gerada!
                </p>
                <p style={{ fontSize: 12, color: p.sub, margin: 0 }}>
                  {boletoData.banco}
                </p>
              </div>
            </div>

            {/* Dados extraídos */}
            <div style={{
              background: p.card, border: `1px solid ${p.cardBorder}`,
              borderRadius: 14, padding: 16,
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px',
            }}>
              {([
                ['Valor',      boletoData.valor      ?? 'Não informado'],
                ['Vencimento', boletoData.vencimento ?? 'Não informado'],
                ['Banco',      boletoData.banco],
                ['Moeda',      boletoData.moeda],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label}>
                  <p style={{ fontSize: 11, color: p.sub, margin: '0 0 2px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {label}
                  </p>
                  <p style={{ fontSize: 13, color: p.header, margin: 0, fontWeight: 500 }}>
                    {value}
                  </p>
                </div>
              ))}
            </div>

            {/* Linha digitável copiável */}
            <div style={{
              background: p.card, border: `1px solid ${p.cardBorder}`,
              borderRadius: 12, padding: '10px 14px',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{
                flex: 1, fontSize: 11, fontFamily: 'monospace',
                color: p.sub, wordBreak: 'break-all', lineHeight: 1.5,
              }}>
                {boletoData.linhaDigitavel}
              </span>
              <button
                onClick={handleCopiarLinha}
                style={{
                  flexShrink: 0, padding: '6px 12px', borderRadius: 8,
                  border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  background: copied ? 'rgba(22,163,74,0.15)' : p.btnSecondary,
                  color: copied ? '#16a34a' : p.btnSecondaryText,
                  transition: 'all 0.2s',
                }}
              >
                {copied ? '✓ Copiado' : 'Copiar'}
              </button>
            </div>

            {/* Aviso */}
            <div style={{
              padding: '10px 14px', borderRadius: 10,
              background: p.warningBg, border: `1px solid ${p.warningBorder}`,
              fontSize: 11, color: p.warningText,
            }}>
              ⚠️ Este documento não substitui o boleto original. Use apenas o código de barras para pagamento no banco.
            </div>

            {/* Botões de ação */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Download PDF */}
              <button
                onClick={handleDownload}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '13px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: p.btn, color: p.btnText, fontSize: 14, fontWeight: 600,
                }}
              >
                <Download style={{ width: 16, height: 16 }} />
                Baixar PDF
              </button>

              <div style={{ display: 'flex', gap: 10 }}>
                {/* Enviar por email */}
                {googleConnected && (
                  <button
                    onClick={handleSendEmail}
                    disabled={isSendingEmail}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: '11px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
                      background: 'rgba(59,130,246,0.15)', color: '#60a5fa',
                      fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
                      opacity: isSendingEmail ? 0.6 : 1,
                    }}
                  >
                    {isSendingEmail
                      ? <><Loader style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> Enviando...</>
                      : <><Mail style={{ width: 14, height: 14 }} /> Enviar email</>
                    }
                  </button>
                )}

                {/* Nova consulta */}
                <button
                  onClick={handleReset}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '11px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: p.btnSecondary, color: p.btnSecondaryText,
                    fontSize: 13, fontWeight: 600,
                  }}
                >
                  <RefreshCw style={{ width: 14, height: 14 }} />
                  Novo boleto
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            STAGE: error
        ══════════════════════════════════════════════════════ */}
        {stage === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{
              background: p.errorBg, border: `1px solid ${p.errorBorder}`,
              borderRadius: 14, padding: 16,
            }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: p.errorText, margin: '0 0 4px' }}>
                Erro ao gerar segunda via
              </p>
              <p style={{ fontSize: 13, color: p.errorText, margin: 0, opacity: 0.8 }}>
                {errorMsg}
              </p>
            </div>
            <button
              onClick={handleReset}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '12px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: p.btn, color: p.btnText, fontSize: 14, fontWeight: 600,
              }}
            >
              <RefreshCw style={{ width: 15, height: 15 }} />
              Tentar novamente
            </button>
          </div>
        )}

      </div>
    </div>,
    document.body
  );
}
