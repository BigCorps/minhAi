'use client';

// components/VoiceAssistant/modals/CadastrarProdutoDisplay.tsx
//
// Modal de cadastro de produto por voz no kiosk.
// Desktop: 2 colunas lado a lado (lista de campos | input atual), sem scroll.
// Mobile:  coluna única em portrait, compacto.
// Crédito cobrado APENAS após salvar com sucesso via onSalvo().

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';
import { criarProduto, formatarPreco } from '@/lib/produtos-venda';
import type { ProdutoVenda } from '@/lib/produtos-venda';
import { useIsMobile } from '@/hooks/useIsMobile';

// ── Props ─────────────────────────────────────────────────────────────────────

interface CadastrarProdutoDisplayProps {
  data: { companyId: string };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText?: (text: string) => Promise<void>;
  onSalvo?: (produto: ProdutoVenda) => void;
}

type Stage = 'collecting' | 'confirming' | 'saving' | 'success';

interface FormProduto {
  nome: string;
  categoria: string;
  preco_venda: string;
  preco_custo: string;
  unidade: string;
  estoque_atual: string;
}

// ── Campos ────────────────────────────────────────────────────────────────────

const CAMPOS: {
  key: keyof FormProduto;
  label: string;
  question: string;
  placeholder: string;
  obrigatorio: boolean;
  isNumber?: boolean;
  hint?: string;
}[] = [
  { key: 'nome',          label: 'Nome',            question: 'Qual o nome do produto?',             placeholder: 'Ex: Pizza de calabresa 35cm',   obrigatorio: true },
  { key: 'categoria',     label: 'Categoria',        question: 'Qual a categoria? Pode pular.',        placeholder: 'Ex: Pizzas, Bebidas...',          obrigatorio: false, hint: 'Diga "pular" para deixar em branco' },
  { key: 'preco_venda',   label: 'Preço de venda',   question: 'Qual o preço de venda?',              placeholder: 'Ex: 45.90',                       obrigatorio: true,  isNumber: true },
  { key: 'preco_custo',   label: 'Preço de custo',   question: 'Qual o preço de custo? Pode pular.',  placeholder: 'Ex: 18.00',                       obrigatorio: false, isNumber: true, hint: 'Diga "pular" para não informar' },
  { key: 'unidade',       label: 'Unidade',          question: 'Qual a unidade? Ex: un, kg, litro.',  placeholder: 'un, kg, g, l, ml',                obrigatorio: false, hint: 'Padrão: unidade (un)' },
  { key: 'estoque_atual', label: 'Estoque inicial',  question: 'Quantidade inicial em estoque?',      placeholder: 'Ex: 50',                          obrigatorio: false, isNumber: true, hint: 'Diga "pular" para zero' },
];

// ── Paletas ───────────────────────────────────────────────────────────────────

const DARK = {
  bg:           '#0f172a',
  bgCard:       '#1e293b',
  bgCardHover:  '#263347',
  border:       '#334155',
  textPrimary:  '#f1f5f9',
  textMuted:    '#94a3b8',
  textFaint:    '#475569',
  accent:       '#2563eb',
  accentBg:     'rgba(37,99,235,0.12)',
  accentBorder: 'rgba(37,99,235,0.35)',
  success:      '#16a34a',
  successBg:    'rgba(22,163,74,0.15)',
  successBorder:'rgba(22,163,74,0.35)',
  error:        '#dc2626',
  errorBg:      'rgba(220,38,38,0.12)',
  errorBorder:  'rgba(220,38,38,0.30)',
  inputBg:      '#0f172a',
};

const LIGHT = {
  bg:           '#ffffff',
  bgCard:       '#f8fafc',
  bgCardHover:  '#f1f5f9',
  border:       '#e2e8f0',
  textPrimary:  '#0f172a',
  textMuted:    '#64748b',
  textFaint:    '#94a3b8',
  accent:       '#2563eb',
  accentBg:     'rgba(37,99,235,0.06)',
  accentBorder: 'rgba(37,99,235,0.25)',
  success:      '#16a34a',
  successBg:    'rgba(22,163,74,0.08)',
  successBorder:'rgba(22,163,74,0.25)',
  error:        '#dc2626',
  errorBg:      'rgba(220,38,38,0.06)',
  errorBorder:  'rgba(220,38,38,0.20)',
  inputBg:      '#ffffff',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function extrairNumero(texto: string): string {
  const palavras: Record<string, number> = {
    zero: 0, um: 1, uma: 1, dois: 2, duas: 2, três: 3, tres: 3,
    quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9,
    dez: 10, onze: 11, doze: 12, treze: 13, catorze: 14, quatorze: 14,
    quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19,
    vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50,
    sessenta: 60, setenta: 70, oitenta: 80, noventa: 90,
    cem: 100, cento: 100, duzentos: 200, trezentos: 300,
    quatrocentos: 400, quinhentos: 500, mil: 1000,
  };
  let lower = texto.toLowerCase().trim();
  for (const [p, n] of Object.entries(palavras)) {
    lower = lower.replace(new RegExp(`\\b${p}\\b`, 'g'), String(n));
  }
  lower = lower.replace(/reais?|centavos?|r\$/gi, '').trim();
  const m = lower.match(/(\d+(?:[.,]\d{1,2})?)/);
  return m ? m[1].replace(',', '.') : '';
}

function normalizarUnidade(txt: string): string {
  const map: Record<string, string> = {
    unidade: 'un', unidades: 'un', uni: 'un',
    quilograma: 'kg', quilogramas: 'kg', quilo: 'kg', quilos: 'kg',
    grama: 'g', gramas: 'g',
    litro: 'l', litros: 'l',
    mililitro: 'ml', mililitros: 'ml',
  };
  const l = txt.toLowerCase().trim();
  return map[l] || l || 'un';
}

// ── SVGs inline ───────────────────────────────────────────────────────────────

const IconCheck = () => (
  <svg width="12" height="12" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const IconEdit = ({ color }: { color: string }) => (
  <svg width="13" height="13" fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const IconMic = ({ color }: { color: string }) => (
  <svg width="13" height="13" fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
  </svg>
);

const IconArrowLeft = ({ color }: { color: string }) => (
  <svg width="14" height="14" fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const IconNext = ({ color }: { color: string }) => (
  <svg width="14" height="14" fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

const IconSave = ({ color }: { color: string }) => (
  <svg width="16" height="16" fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
  </svg>
);

const IconPackage = ({ color }: { color: string }) => (
  <svg width="20" height="20" fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);

// ── Componente ────────────────────────────────────────────────────────────────

export default function CadastrarProdutoDisplay({
  data,
  onClose,
  theme = 'dark',
  playText,
  onSalvo,
}: CadastrarProdutoDisplayProps) {
  const { companyId } = data;
  const P = theme === 'dark' ? DARK : LIGHT;
  const isMobile = useIsMobile();

  const [stage, setStage]               = useState<Stage>('collecting');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [form, setForm]                 = useState<FormProduto>({
    nome: '', categoria: '', preco_venda: '',
    preco_custo: '', unidade: '', estoque_atual: '',
  });
  const [typingValue, setTypingValue]   = useState('');
  const [error, setError]               = useState<string | null>(null);
  const [produtoSalvo, setProdutoSalvo] = useState<ProdutoVenda | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const campo    = CAMPOS[currentIndex];
  const progress = Math.round((currentIndex / CAMPOS.length) * 100);

  // ── Voice: collecting ──────────────────────────────────────────────────────
  useModalVoiceCommand({
    active: stage === 'collecting',
    onTranscript: (t: string) => {
      const l = t.toLowerCase().trim();
      if (['cancelar', 'fechar', 'cancela'].some(x => l.includes(x))) { onClose(); return; }
      if (['voltar', 'anterior'].some(x => l.includes(x)))              { goBack();  return; }
      if (['repetir', 'repete'].some(x => l.includes(x)))               { playText?.(campo.question).catch(() => {}); return; }
      if (['pular', 'próximo', 'proximo', 'skip'].some(x => l.includes(x)) && !campo.obrigatorio) { advance(''); return; }

      let val = t.trim();
      if (campo.isNumber)              val = extrairNumero(t) || val;
      else if (campo.key === 'unidade') val = normalizarUnidade(t);
      if (val) setTypingValue(val);
    },
  });

  // ── Voice: confirming ──────────────────────────────────────────────────────
  useModalVoiceCommand({
    active: stage === 'confirming',
    onTranscript: (t: string) => {
      const l = t.toLowerCase().trim();
      if (['confirmar', 'confirma', 'salvar', 'sim', 'correto'].some(x => l.includes(x))) save();
      else if (['cancelar', 'fechar'].some(x => l.includes(x))) onClose();
      else if (['voltar', 'corrigir', 'editar'].some(x => l.includes(x))) editField(CAMPOS.length - 1);
    },
  });

  // ── Focus ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (stage === 'collecting') setTimeout(() => inputRef.current?.focus(), 80);
  }, [currentIndex, stage]);

  // ── Greeting ───────────────────────────────────────────────────────────────
  useEffect(() => { playText?.(CAMPOS[0].question).catch(() => {}); }, []);
  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);

  // ── Advance ────────────────────────────────────────────────────────────────
  const advance = useCallback((override?: string) => {
    const raw = (override !== undefined ? override : typingValue).trim();
    if (campo.obrigatorio && !raw) return;

    let final = raw;
    if (campo.isNumber && raw) {
      const n = parseFloat(raw.replace(',', '.'));
      final = isNaN(n) ? '' : n.toFixed(2);
    }
    if (campo.key === 'unidade' && raw) final = normalizarUnidade(raw);

    const next = { ...form, [campo.key]: final };
    setForm(next);
    setTypingValue('');

    const ni = currentIndex + 1;
    if (ni >= CAMPOS.length) {
      setStage('confirming');
      playText?.('Revise os dados e confirme o cadastro.').catch(() => {});
    } else {
      setCurrentIndex(ni);
      playText?.(CAMPOS[ni].question).catch(() => {});
    }
  }, [typingValue, campo, currentIndex, form, playText]);

  // ── Go back ────────────────────────────────────────────────────────────────
  const goBack = useCallback(() => {
    if (stage === 'confirming') {
      const i = CAMPOS.length - 1;
      setCurrentIndex(i); setTypingValue(form[CAMPOS[i].key]); setStage('collecting');
      playText?.(CAMPOS[i].question).catch(() => {}); return;
    }
    if (currentIndex > 0) {
      const p = currentIndex - 1;
      setCurrentIndex(p); setTypingValue(form[CAMPOS[p].key]);
      playText?.(CAMPOS[p].question).catch(() => {});
    }
  }, [stage, currentIndex, form, playText]);

  // ── Edit specific field ────────────────────────────────────────────────────
  const editField = (i: number) => {
    setCurrentIndex(i); setTypingValue(form[CAMPOS[i].key]); setStage('collecting');
    playText?.(CAMPOS[i].question).catch(() => {});
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const save = useCallback(async () => {
    setStage('saving'); setError(null);
    try {
      const pv = parseFloat(form.preco_venda || '0');
      if (!form.nome.trim()) throw new Error('Nome é obrigatório');
      if (pv <= 0) throw new Error('Preço de venda inválido');

      const produto = await criarProduto({
        company_id:       companyId,
        nome:             form.nome.trim(),
        categoria:        form.categoria.trim() || undefined,
        preco_venda:      pv,
        preco_custo:      parseFloat(form.preco_custo || '0') || 0,
        unidade:          form.unidade.trim() || 'un',
        estoque_atual:    parseFloat(form.estoque_atual || '0') || 0,
        estoque_minimo:   0,
        controla_estoque: true,
        is_active:        true,
      });

      setProdutoSalvo(produto);
      setStage('success');
      await playText?.(`Produto ${produto.nome} cadastrado com sucesso por ${formatarPreco(produto.preco_venda)}!`);
      onSalvo?.(produto);
      setTimeout(() => onClose(), 3000);
    } catch (e: any) {
      setError(e.message || 'Erro ao salvar. Tente novamente.');
      setStage('confirming');
      playText?.('Erro ao salvar. Tente novamente.').catch(() => {});
    }
  }, [form, companyId, playText, onSalvo, onClose]);

  // ── Markup ─────────────────────────────────────────────────────────────────
  const markup = (() => {
    const v = parseFloat(form.preco_venda || '0');
    const c = parseFloat(form.preco_custo || '0');
    if (!c || !v || c <= 0) return null;
    return (((v / c) - 1) * 100).toFixed(0);
  })();

  // ── Shared styles ──────────────────────────────────────────────────────────
  const btn = (bg: string, color: string, extra?: React.CSSProperties): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '10px 16px', borderRadius: 10, border: 'none',
    background: bg, color, fontWeight: 700, fontSize: 13, cursor: 'pointer',
    transition: 'opacity .15s', ...extra,
  });

  const fieldRow = (answered: boolean, current: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 12px', borderRadius: 10,
    border: `1px solid ${current ? P.accent : answered ? P.successBorder : P.border}`,
    background: current ? P.accentBg : answered ? P.successBg : P.bgCard,
    cursor: answered && !current ? 'pointer' : 'default',
    transition: 'background .15s',
  });

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
      padding: isMobile ? 12 : 20,
    }}>
      {/* Card principal */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: isMobile ? 440 : 780,
        maxHeight: isMobile ? '95vh' : '88vh',
        background: P.bg,
        border: `1px solid ${P.border}`,
        borderRadius: 20,
        boxShadow: '0 24px 64px rgba(0,0,0,0.40)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>

        {/* ── Header ── */}
        <div style={{
          padding: isMobile ? '14px 18px' : '16px 24px',
          borderBottom: `1px solid ${P.border}`,
          background: P.accentBg,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', background: P.accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <IconPackage color="#fff" />
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: P.textPrimary }}>
                Cadastrar Produto
              </p>
              <p style={{ margin: 0, fontSize: 11, color: P.textMuted }}>
                {stage === 'collecting' && `Passo ${currentIndex + 1} de ${CAMPOS.length}`}
                {stage === 'confirming' && 'Confirme os dados'}
                {stage === 'saving'     && 'Salvando...'}
                {stage === 'success'    && 'Produto cadastrado!'}
              </p>
            </div>
          </div>

          {/* Progress bar + X */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {stage === 'collecting' && (
              <div style={{ width: 80, height: 4, background: P.border, borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: P.accent, borderRadius: 4, transition: 'width .35s ease' }} />
              </div>
            )}
            <button onClick={onClose} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 4, color: P.textMuted, lineHeight: 0,
            }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: isMobile ? '16px 18px' : '20px 24px',
        }}>

          {/* Error */}
          {error && (
            <div style={{
              marginBottom: 14, padding: '10px 14px',
              background: P.errorBg, border: `1px solid ${P.errorBorder}`,
              borderRadius: 10, color: P.error, fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <svg width="15" height="15" fill="none" stroke={P.error} strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          {/* ── COLLECTING ── */}
          {stage === 'collecting' && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: isMobile ? 16 : 24,
              alignItems: 'start',
            }}>

              {/* Coluna esquerda — lista de campos */}
              {(!isMobile || true) && (
                <div>
                  <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '.07em', color: P.textFaint }}>
                    Campos do produto
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {CAMPOS.map((c, i) => {
                      const answered = !!form[c.key];
                      const current  = i === currentIndex;
                      return (
                        <div
                          key={c.key}
                          style={fieldRow(answered, current)}
                          onClick={() => answered && !current ? editField(i) : undefined}
                        >
                          {/* Bullet */}
                          <div style={{
                            width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                            background: current ? P.accent : answered ? P.success : P.border,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {answered && !current
                              ? <IconCheck />
                              : <span style={{ fontSize: 9, fontWeight: 700, color: current ? '#fff' : P.textFaint }}>{i + 1}</span>
                            }
                          </div>
                          {/* Label + valor */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{
                              margin: 0, fontSize: 12, fontWeight: 600,
                              color: current ? P.accent : answered ? P.success : P.textMuted,
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>
                              {c.label}
                              {!c.obrigatorio && <span style={{ fontWeight: 400, fontSize: 10, opacity: .55 }}> (opcional)</span>}
                            </p>
                            {answered && !current && (
                              <p style={{
                                margin: '1px 0 0', fontSize: 11, color: P.textFaint,
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                              }}>
                                {c.isNumber && c.key !== 'estoque_atual'
                                  ? formatarPreco(parseFloat(form[c.key]))
                                  : form[c.key]}
                              </p>
                            )}
                          </div>
                          {/* Editar */}
                          {answered && !current && (
                            <div style={{ flexShrink: 0, opacity: .5 }}>
                              <IconEdit color={P.textMuted} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Coluna direita — campo atual */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                {/* Pergunta */}
                <div>
                  <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 15, color: P.textPrimary, lineHeight: 1.3 }}>
                    {campo.question}
                  </p>
                  {campo.hint && (
                    <p style={{ margin: 0, fontSize: 11, color: P.textFaint }}>{campo.hint}</p>
                  )}
                </div>

                {/* Banner mic */}
                <div style={{
                  padding: '7px 12px', borderRadius: 10,
                  border: `1px solid ${P.accentBorder}`,
                  background: P.accentBg,
                  display: 'flex', alignItems: 'center', gap: 7,
                  fontSize: 11, fontWeight: 600, color: P.accent,
                }}>
                  <span style={{
                    display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                    background: P.accent, animation: 'pingDot 1.2s ease-in-out infinite',
                  }} />
                  <IconMic color={P.accent} />
                  Fale a resposta ou digite abaixo
                </div>

                {/* Input */}
                <input
                  ref={inputRef}
                  inputMode={campo.isNumber ? 'decimal' : 'text'}
                  value={typingValue}
                  onChange={e => setTypingValue(e.target.value)}
                  placeholder={campo.placeholder}
                  onKeyDown={e => { if (e.key === 'Enter') advance(); }}
                  style={{
                    width: '100%', padding: '10px 14px', boxSizing: 'border-box',
                    border: `1px solid ${P.border}`, borderRadius: 10,
                    background: P.inputBg, color: P.textPrimary, fontSize: 14,
                    outline: 'none',
                  }}
                />

                {/* Botão avançar */}
                <button
                  onClick={() => advance()}
                  disabled={campo.obrigatorio && !typingValue.trim()}
                  style={btn(
                    campo.obrigatorio && !typingValue.trim() ? P.border : P.accent,
                    '#fff',
                    { opacity: campo.obrigatorio && !typingValue.trim() ? .5 : 1 }
                  )}
                >
                  {currentIndex < CAMPOS.length - 1 ? 'Próximo' : 'Revisar'}
                  <IconNext color="#fff" />
                </button>

                {/* Botões secundários */}
                <div style={{ display: 'flex', gap: 8 }}>
                  {currentIndex > 0 && (
                    <button onClick={goBack} style={btn(P.bgCard, P.textPrimary, { flex: 1, border: `1px solid ${P.border}` })}>
                      <IconArrowLeft color={P.textPrimary} /> Voltar
                    </button>
                  )}
                  {!campo.obrigatorio && (
                    <button onClick={() => advance('')} style={btn(P.bgCard, P.textMuted, { flex: 1, border: `1px solid ${P.border}` })}>
                      Pular
                    </button>
                  )}
                  <button
                    onClick={() => playText?.(campo.question).catch(() => {})}
                    style={btn(P.bgCard, P.textMuted, { flex: 1, border: `1px solid ${P.border}` })}
                  >
                    ↻ Repetir
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── CONFIRMING ── */}
          {stage === 'confirming' && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: isMobile ? 16 : 24,
              alignItems: 'start',
            }}>

              {/* Resumo */}
              <div>
                <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '.07em', color: P.textFaint }}>
                  Dados informados
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {CAMPOS.map((c, i) => (
                    <div key={c.key} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 12px', borderRadius: 10,
                      border: `1px solid ${P.border}`, background: P.bgCard,
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 10, color: P.textFaint }}>{c.label}</p>
                        <p style={{
                          margin: '2px 0 0', fontSize: 13, fontWeight: 600,
                          color: form[c.key] ? P.textPrimary : P.textFaint,
                          fontStyle: form[c.key] ? 'normal' : 'italic',
                        }}>
                          {form[c.key]
                            ? (c.isNumber && c.key !== 'estoque_atual'
                                ? formatarPreco(parseFloat(form[c.key]))
                                : form[c.key])
                            : 'não informado'}
                        </p>
                      </div>
                      <button onClick={() => editField(i)} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        padding: 4, flexShrink: 0, opacity: .6,
                      }}>
                        <IconEdit color={P.accent} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Confirmar */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                {/* Banner voz */}
                <div style={{
                  padding: '7px 12px', borderRadius: 10,
                  border: `1px solid ${P.successBorder}`, background: P.successBg,
                  display: 'flex', alignItems: 'center', gap: 7,
                  fontSize: 11, fontWeight: 600, color: P.success,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: P.success, display: 'inline-block' }} />
                  <IconMic color={P.success} />
                  Diga "confirmar" ou clique em salvar
                </div>

                {/* Preview */}
                <div style={{
                  padding: '14px 16px', borderRadius: 12,
                  border: `1px solid ${P.border}`, background: P.bgCard,
                }}>
                  <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 15, color: P.textPrimary }}>
                    {form.nome || '—'}
                  </p>
                  {form.categoria && (
                    <p style={{ margin: '0 0 8px', fontSize: 12, color: P.textMuted }}>{form.categoria}</p>
                  )}
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: P.success }}>
                    {form.preco_venda ? formatarPreco(parseFloat(form.preco_venda)) : '—'}
                  </p>
                  {markup !== null && (
                    <p style={{ margin: '2px 0 0', fontSize: 11,
                      color: Number(markup) >= 30 ? P.success : '#f59e0b' }}>
                      Markup: {markup}%
                    </p>
                  )}
                  {form.estoque_atual && (
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: P.textMuted }}>
                      Estoque: {form.estoque_atual} {form.unidade || 'un'}
                    </p>
                  )}
                </div>

                <button onClick={save} style={btn(P.accent, '#fff', { width: '100%', padding: '12px' })}>
                  <IconSave color="#fff" /> Confirmar e Salvar
                </button>
                <button onClick={goBack} style={btn(P.bgCard, P.textPrimary, { width: '100%', border: `1px solid ${P.border}` })}>
                  <IconArrowLeft color={P.textPrimary} /> Voltar e Corrigir
                </button>
                <button onClick={onClose} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: P.textFaint, fontSize: 12, padding: '4px',
                }}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* ── SAVING ── */}
          {stage === 'saving' && (
            <div style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: '48px 24px', gap: 14,
            }}>
              <svg width="40" height="40" fill="none" stroke={P.accent} strokeWidth="2" viewBox="0 0 24 24"
                style={{ animation: 'spin 1s linear infinite' }}>
                <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" strokeLinecap="round" />
              </svg>
              <p style={{ margin: 0, fontSize: 14, color: P.textMuted }}>Salvando produto...</p>
            </div>
          )}

          {/* ── SUCCESS ── */}
          {stage === 'success' && (
            <div style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: '40px 24px', gap: 16, textAlign: 'center',
            }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: P.successBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="40" height="40" fill="none" stroke={P.success} strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p style={{ margin: '0 0 4px', fontWeight: 800, fontSize: 20, color: P.textPrimary }}>
                  Produto Cadastrado!
                </p>
                <p style={{ margin: 0, fontSize: 14, color: P.textMuted }}>
                  {produtoSalvo?.nome} foi adicionado à loja.
                </p>
              </div>
              {produtoSalvo && (
                <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: P.success }}>
                  {formatarPreco(produtoSalvo.preco_venda)}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pingDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: .4; transform: scale(1.6); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>,
    document.body,
  );
}
