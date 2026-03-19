'use client';

// components/assistant/CadastrarProdutoDisplay.tsx
//
// Modal de cadastro de produto usado no kiosk (slug).
// Fluxo guiado por voz — mesmo padrão do RegistrationDisplay.
// Passos: nome → categoria → preço de venda → preço de custo (opcional)
//         → unidade → estoque → confirmar → salvar
//
// Crédito cobrado APENAS após o produto ser salvo com sucesso.

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Package,
  Loader2,
  AlertCircle,
  CheckCircle,
  Mic,
  ChevronRight,
  ArrowLeft,
  RotateCcw,
  Pencil,
  Save,
} from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';
import { criarProduto, formatarPreco, type ProdutoVenda } from '@/lib/produtos-venda';

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface CadastrarProdutoDisplayProps {
  data: { companyId: string };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText?: (text: string) => Promise<void>;
  /** Chamado após salvar com sucesso — para cobrar o crédito */
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

// ── Campos do formulário ──────────────────────────────────────────────────────

const CAMPOS: {
  key: keyof FormProduto;
  label: string;
  question: string;
  placeholder: string;
  obrigatorio: boolean;
  type?: 'text' | 'number';
  hint?: string;
}[] = [
  {
    key: 'nome',
    label: 'Nome do produto',
    question: 'Qual o nome do produto?',
    placeholder: 'Ex: Pizza de calabresa 35cm',
    obrigatorio: true,
  },
  {
    key: 'categoria',
    label: 'Categoria',
    question: 'Qual a categoria? Pode deixar em branco.',
    placeholder: 'Ex: Pizzas, Bebidas, Salgados...',
    obrigatorio: false,
    hint: 'Diga "pular" para deixar em branco',
  },
  {
    key: 'preco_venda',
    label: 'Preço de venda',
    question: 'Qual o preço de venda?',
    placeholder: 'Ex: 45.90',
    obrigatorio: true,
    type: 'number',
    hint: 'Diga o valor em reais. Ex: quarenta e cinco reais',
  },
  {
    key: 'preco_custo',
    label: 'Preço de custo',
    question: 'Qual o preço de custo? Pode deixar em branco.',
    placeholder: 'Ex: 18.00',
    obrigatorio: false,
    type: 'number',
    hint: 'Diga "pular" para não informar',
  },
  {
    key: 'unidade',
    label: 'Unidade',
    question: 'Qual a unidade? Exemplos: unidade, kg, litro.',
    placeholder: 'un, kg, g, l, ml',
    obrigatorio: false,
    hint: 'Padrão: unidade',
  },
  {
    key: 'estoque_atual',
    label: 'Estoque inicial',
    question: 'Qual a quantidade inicial em estoque?',
    placeholder: 'Ex: 50',
    obrigatorio: false,
    type: 'number',
    hint: 'Diga "pular" para zero',
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function extrairNumero(texto: string): string {
  // Converte palavras numéricas para dígitos
  const palavras: Record<string, number> = {
    zero: 0, um: 1, uma: 1, dois: 2, duas: 2, três: 3, tres: 3,
    quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9,
    dez: 10, onze: 11, doze: 12, treze: 13, catorze: 14, quatorze: 14,
    quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19,
    vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50,
    sessenta: 60, setenta: 70, oitenta: 80, noventa: 90,
    cem: 100, cento: 100, duzentos: 200, trezentos: 300,
    quatrocentos: 400, quinhentos: 500,
    mil: 1000,
  };

  let lower = texto.toLowerCase().trim();

  // Substitui palavras por números
  for (const [palavra, num] of Object.entries(palavras)) {
    lower = lower.replace(new RegExp(`\\b${palavra}\\b`, 'g'), String(num));
  }

  // Remove "reais", "centavos", "R$"
  lower = lower.replace(/reais?|centavos?|r\$/gi, '').trim();

  // Extrai número (aceita ponto e vírgula como decimal)
  const match = lower.match(/(\d+(?:[.,]\d{1,2})?)/);
  if (match) return match[1].replace(',', '.');

  return '';
}

function normalizarUnidade(texto: string): string {
  const map: Record<string, string> = {
    'unidade': 'un', 'unidades': 'un', 'uni': 'un',
    'quilograma': 'kg', 'quilogramas': 'kg', 'quilo': 'kg', 'quilos': 'kg',
    'grama': 'g', 'gramas': 'g',
    'litro': 'l', 'litros': 'l',
    'mililitro': 'ml', 'mililitros': 'ml',
  };
  const lower = texto.toLowerCase().trim();
  return map[lower] || lower || 'un';
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function CadastrarProdutoDisplay({
  data,
  onClose,
  theme = 'dark',
  playText,
  onSalvo,
}: CadastrarProdutoDisplayProps) {
  const { companyId } = data;
  const supabase = createClient();

  const isDark      = theme === 'dark';
  const bg          = isDark ? '#0f172a' : '#ffffff';
  const bgCard      = isDark ? '#1e293b' : '#f8fafc';
  const border      = isDark ? '#334155' : '#e2e8f0';
  const textPrimary = isDark ? '#f1f5f9' : '#0f172a';
  const textMuted   = isDark ? '#94a3b8' : '#64748b';
  const textFaint   = isDark ? '#475569' : '#94a3b8';

  const [stage, setStage]             = useState<Stage>('collecting');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [form, setForm]               = useState<FormProduto>({
    nome: '', categoria: '', preco_venda: '',
    preco_custo: '', unidade: '', estoque_atual: '',
  });
  const [typingValue, setTypingValue] = useState('');
  const [error, setError]             = useState<string | null>(null);
  const [produtoSalvo, setProdutoSalvo] = useState<ProdutoVenda | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const campoAtual = CAMPOS[currentIndex];
  const progress   = (currentIndex / CAMPOS.length) * 100;

  // ── Voice commands durante coleta ─────────────────────────────────────────

  useModalVoiceCommand({
    active: stage === 'collecting',
    onTranscript: (transcript: string) => {
      const lower = transcript.toLowerCase().trim();

      if (['cancelar', 'fechar', 'cancela'].some(t => lower.includes(t))) {
        onClose(); return;
      }
      if (['voltar', 'anterior'].some(t => lower.includes(t))) {
        handleGoBack(); return;
      }
      if (['repetir', 'repete', 'repita'].some(t => lower.includes(t))) {
        playText?.(campoAtual.question).catch(() => {}); return;
      }
      if (['pular', 'próximo', 'proximo', 'skip'].some(t => lower.includes(t)) && !campoAtual.obrigatorio) {
        setTypingValue(''); advanceField(''); return;
      }

      // Extrai valor do transcript
      let valor = transcript.trim();

      if (campoAtual.type === 'number') {
        const num = extrairNumero(transcript);
        if (num) valor = num;
      } else if (campoAtual.key === 'unidade') {
        valor = normalizarUnidade(transcript);
      }

      if (valor) setTypingValue(valor);
    },
  });

  // ── Voice commands durante confirmação ────────────────────────────────────

  useModalVoiceCommand({
    active: stage === 'confirming',
    onTranscript: (transcript: string) => {
      const lower = transcript.toLowerCase().trim();
      if (['confirmar', 'confirma', 'salvar', 'salva', 'sim', 'correto'].some(t => lower.includes(t))) {
        handleSave();
      } else if (['cancelar', 'fechar'].some(t => lower.includes(t))) {
        onClose();
      } else if (['voltar', 'corrigir', 'editar'].some(t => lower.includes(t))) {
        editField(CAMPOS.length - 1);
      }
    },
  });

  // ── Focus no input ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (stage === 'collecting') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [currentIndex, stage]);

  // ── Saudação inicial ───────────────────────────────────────────────────────

  useEffect(() => {
    playText?.(CAMPOS[0].question).catch(() => {});
  }, []);

  // ── Cleanup ────────────────────────────────────────────────────────────────

  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);

  // ── Avança campo ───────────────────────────────────────────────────────────

  const advanceField = useCallback((valorOverride?: string) => {
    const valor = (valorOverride !== undefined ? valorOverride : typingValue).trim();

    if (campoAtual.obrigatorio && !valor) return;

    // Normaliza valor numérico antes de guardar
    let valorFinal = valor;
    if (campoAtual.type === 'number' && valor) {
      const num = parseFloat(valor.replace(',', '.'));
      valorFinal = isNaN(num) ? '' : num.toFixed(2);
    }
    if (campoAtual.key === 'unidade' && valor) {
      valorFinal = normalizarUnidade(valor);
    }

    const novoForm = { ...form, [campoAtual.key]: valorFinal };
    setForm(novoForm);
    setTypingValue('');

    const nextIndex = currentIndex + 1;
    if (nextIndex >= CAMPOS.length) {
      setStage('confirming');
      playText?.('Revise os dados e confirme o cadastro.').catch(() => {});
    } else {
      setCurrentIndex(nextIndex);
      playText?.(CAMPOS[nextIndex].question).catch(() => {});
    }
  }, [typingValue, campoAtual, currentIndex, form, playText]);

  // ── Voltar campo ───────────────────────────────────────────────────────────

  const handleGoBack = useCallback(() => {
    if (stage === 'confirming') {
      const idx = CAMPOS.length - 1;
      setCurrentIndex(idx);
      setTypingValue(form[CAMPOS[idx].key]);
      setStage('collecting');
      playText?.(CAMPOS[idx].question).catch(() => {});
      return;
    }
    if (currentIndex > 0) {
      const prev = currentIndex - 1;
      setCurrentIndex(prev);
      setTypingValue(form[CAMPOS[prev].key]);
      playText?.(CAMPOS[prev].question).catch(() => {});
    }
  }, [stage, currentIndex, form, playText]);

  // ── Editar campo específico ────────────────────────────────────────────────

  const editField = (index: number) => {
    setCurrentIndex(index);
    setTypingValue(form[CAMPOS[index].key]);
    setStage('collecting');
    playText?.(CAMPOS[index].question).catch(() => {});
  };

  // ── Salvar produto ─────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    setStage('saving');
    setError(null);

    try {
      const precoVenda = parseFloat(form.preco_venda || '0');
      if (!form.nome.trim()) throw new Error('Nome é obrigatório');
      if (precoVenda <= 0) throw new Error('Preço de venda inválido');

      const produto = await criarProduto({
        company_id: companyId,
        nome: form.nome.trim(),
        categoria: form.categoria.trim() || undefined,
        preco_venda: precoVenda,
        preco_custo: parseFloat(form.preco_custo || '0') || 0,
        unidade: form.unidade.trim() || 'un',
        estoque_atual: parseFloat(form.estoque_atual || '0') || 0,
        estoque_minimo: 0,
        controla_estoque: true,
        is_active: true, // já ativo — operador cadastrou por voz, confia
      });

      setProdutoSalvo(produto);
      setStage('success');

      const msg = `Produto ${produto.nome} cadastrado com sucesso por ${formatarPreco(produto.preco_venda)}!`;
      await playText?.(msg);

      // Notifica para cobrar o crédito
      onSalvo?.(produto);

      setTimeout(() => onClose(), 3000);
    } catch (e: any) {
      console.error('Erro ao salvar produto:', e);
      setError(e.message || 'Erro ao salvar. Tente novamente.');
      setStage('confirming');
      playText?.('Erro ao salvar. Tente novamente.').catch(() => {});
    }
  }, [form, companyId, playText, onSalvo, onClose]);

  // ── Markup calculado ───────────────────────────────────────────────────────

  const markup = (() => {
    const venda = parseFloat(form.preco_venda || '0');
    const custo = parseFloat(form.preco_custo || '0');
    if (!custo || !venda || custo <= 0) return null;
    return (((venda / custo) - 1) * 100).toFixed(0);
  })();

  // ── RENDER ─────────────────────────────────────────────────────────────────

  const PALETTE = {
    bg, bgCard, border, textPrimary, textMuted, textFaint,
    accent: '#2563eb',
    accentBg: isDark ? 'rgba(37,99,235,0.12)' : 'rgba(37,99,235,0.06)',
    success: '#16a34a',
    successBg: isDark ? 'rgba(22,163,74,0.15)' : 'rgba(22,163,74,0.08)',
    error: '#dc2626',
    errorBg: isDark ? 'rgba(220,38,38,0.12)' : 'rgba(220,38,38,0.06)',
  };

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)',
      padding: 16,
    }}>
      <div style={{
        position: 'relative', width: '100%', maxWidth: 680,
        maxHeight: '92vh', overflowY: 'auto',
        background: PALETTE.bg,
        border: `1px solid ${PALETTE.border}`,
        borderRadius: 20,
        boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
      }}>

        {/* ── Header ── */}
        <div style={{
          padding: '18px 24px',
          borderBottom: `1px solid ${PALETTE.border}`,
          background: PALETTE.accentBg,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: PALETTE.accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Package size={20} color="#fff" />
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 17, color: PALETTE.textPrimary }}>
                Cadastrar Produto
              </p>
              <p style={{ margin: 0, fontSize: 12, color: PALETTE.textMuted }}>
                {stage === 'collecting' && `Campo ${currentIndex + 1} de ${CAMPOS.length}`}
                {stage === 'confirming' && 'Confirme os dados'}
                {stage === 'saving'     && 'Salvando...'}
                {stage === 'success'    && 'Produto cadastrado!'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 6, borderRadius: 8,
              color: PALETTE.textMuted,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Barra de progresso */}
        {stage === 'collecting' && (
          <div style={{ height: 3, background: PALETTE.border }}>
            <div style={{
              height: '100%', width: `${progress}%`,
              background: PALETTE.accent,
              transition: 'width .4s ease',
            }} />
          </div>
        )}

        {/* ── Corpo ── */}
        <div style={{ padding: 24 }}>

          {/* Erro */}
          {error && (
            <div style={{
              marginBottom: 16, padding: '10px 14px',
              background: PALETTE.errorBg,
              border: `1px solid ${PALETTE.error}40`,
              borderRadius: 10,
              display: 'flex', alignItems: 'center', gap: 8,
              color: PALETTE.error, fontSize: 13,
            }}>
              <AlertCircle size={15} />
              {error}
            </div>
          )}

          {/* ── COLLECTING ── */}
          {stage === 'collecting' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

              {/* Coluna esquerda — lista de campos */}
              <div>
                <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '.06em', color: PALETTE.textFaint }}>
                  Campos do produto
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {CAMPOS.map((campo, idx) => {
                    const respondido = !!form[campo.key];
                    const atual      = idx === currentIndex;
                    return (
                      <div key={campo.key} style={{
                        padding: '8px 12px', borderRadius: 10,
                        border: `1px solid ${atual ? PALETTE.accent : respondido ? PALETTE.success + '50' : PALETTE.border}`,
                        background: atual ? PALETTE.accentBg : respondido ? PALETTE.successBg : PALETTE.bgCard,
                        display: 'flex', alignItems: 'center', gap: 10,
                      }}>
                        <div style={{
                          width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                          background: atual ? PALETTE.accent : respondido ? PALETTE.success : PALETTE.border,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {respondido && !atual
                            ? <CheckCircle size={12} color="#fff" />
                            : <span style={{ fontSize: 9, fontWeight: 700, color: '#fff' }}>{idx + 1}</span>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            margin: 0, fontSize: 12, fontWeight: 600,
                            color: atual ? PALETTE.accent : respondido ? PALETTE.success : PALETTE.textMuted,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            {campo.label}
                            {!campo.obrigatorio && (
                              <span style={{ fontWeight: 400, fontSize: 10, marginLeft: 4, opacity: .6 }}>
                                (opcional)
                              </span>
                            )}
                          </p>
                          {respondido && !atual && form[campo.key] && (
                            <p style={{
                              margin: '1px 0 0', fontSize: 11, color: PALETTE.textFaint,
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>
                              {campo.type === 'number' && campo.key !== 'estoque_atual'
                                ? formatarPreco(parseFloat(form[campo.key] || '0'))
                                : form[campo.key]}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Coluna direita — campo atual */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                <div>
                  <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 15, color: PALETTE.textPrimary }}>
                    {campoAtual.question}
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: PALETTE.textMuted }}>
                    {campoAtual.label}
                  </p>
                </div>

                {/* Banner ouvindo */}
                <div style={{
                  padding: '8px 12px', borderRadius: 10,
                  border: `1px solid ${PALETTE.accent}40`,
                  background: PALETTE.accentBg,
                  display: 'flex', alignItems: 'center', gap: 8,
                  fontSize: 12, fontWeight: 600, color: PALETTE.accent,
                }}>
                  <div style={{ position: 'relative', width: 8, height: 8, flexShrink: 0 }}>
                    <div style={{
                      position: 'absolute', inset: 0, borderRadius: '50%',
                      background: PALETTE.accent, opacity: .4,
                      animation: 'ping 1s cubic-bezier(0,0,.2,1) infinite',
                    }} />
                    <div style={{
                      position: 'relative', width: 8, height: 8,
                      borderRadius: '50%', background: PALETTE.accent,
                    }} />
                  </div>
                  <Mic size={13} />
                  {campoAtual.hint || 'Fale a resposta ou digite abaixo'}
                </div>

                {/* Input */}
                <input
                  ref={inputRef}
                  type={campoAtual.type === 'number' ? 'text' : 'text'}
                  inputMode={campoAtual.type === 'number' ? 'decimal' : 'text'}
                  value={typingValue}
                  onChange={e => setTypingValue(e.target.value)}
                  placeholder={campoAtual.placeholder}
                  onKeyDown={e => { if (e.key === 'Enter') advanceField(); }}
                  style={{
                    width: '100%', padding: '10px 14px',
                    border: `1px solid ${PALETTE.border}`,
                    borderRadius: 10, fontSize: 14,
                    background: PALETTE.bgCard,
                    color: PALETTE.textPrimary,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />

                {/* Botão avançar */}
                <button
                  onClick={() => advanceField()}
                  disabled={campoAtual.obrigatorio && !typingValue.trim()}
                  style={{
                    width: '100%', padding: '10px',
                    background: (campoAtual.obrigatorio && !typingValue.trim())
                      ? PALETTE.border : PALETTE.accent,
                    color: '#fff', border: 'none', borderRadius: 10,
                    fontWeight: 700, fontSize: 14, cursor: (campoAtual.obrigatorio && !typingValue.trim()) ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    opacity: (campoAtual.obrigatorio && !typingValue.trim()) ? .5 : 1,
                  }}
                >
                  {currentIndex < CAMPOS.length - 1 ? 'Próximo' : 'Revisar'}
                  <ChevronRight size={16} />
                </button>

                <div style={{ display: 'flex', gap: 8 }}>
                  {currentIndex > 0 && (
                    <button
                      onClick={handleGoBack}
                      style={{
                        flex: 1, padding: '8px',
                        background: PALETTE.bgCard,
                        border: `1px solid ${PALETTE.border}`,
                        borderRadius: 10, color: PALETTE.textPrimary,
                        fontWeight: 600, fontSize: 13, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      }}
                    >
                      <ArrowLeft size={14} />
                      Voltar
                    </button>
                  )}
                  {!campoAtual.obrigatorio && (
                    <button
                      onClick={() => advanceField('')}
                      style={{
                        flex: 1, padding: '8px',
                        background: PALETTE.bgCard,
                        border: `1px solid ${PALETTE.border}`,
                        borderRadius: 10, color: PALETTE.textMuted,
                        fontWeight: 600, fontSize: 13, cursor: 'pointer',
                      }}
                    >
                      Pular
                    </button>
                  )}
                  <button
                    onClick={() => playText?.(campoAtual.question).catch(() => {})}
                    style={{
                      flex: 1, padding: '8px',
                      background: PALETTE.bgCard,
                      border: `1px solid ${PALETTE.border}`,
                      borderRadius: 10, color: PALETTE.textMuted,
                      fontWeight: 600, fontSize: 13, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    <RotateCcw size={13} />
                    Repetir
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── CONFIRMING ── */}
          {stage === 'confirming' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

              {/* Resumo */}
              <div>
                <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '.06em', color: PALETTE.textFaint }}>
                  Dados informados
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {CAMPOS.map((campo, idx) => (
                    <div key={campo.key} style={{
                      padding: '8px 12px', borderRadius: 10,
                      border: `1px solid ${PALETTE.border}`,
                      background: PALETTE.bgCard,
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 11, color: PALETTE.textFaint }}>{campo.label}</p>
                        <p style={{
                          margin: '2px 0 0', fontSize: 13, fontWeight: 600,
                          color: form[campo.key] ? PALETTE.textPrimary : PALETTE.textFaint,
                          fontStyle: form[campo.key] ? 'normal' : 'italic',
                        }}>
                          {form[campo.key]
                            ? (campo.type === 'number' && campo.key !== 'estoque_atual'
                                ? formatarPreco(parseFloat(form[campo.key]))
                                : form[campo.key])
                            : 'não informado'}
                        </p>
                      </div>
                      <button
                        onClick={() => editField(idx)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          padding: 4, borderRadius: 6, color: PALETTE.accent,
                          flexShrink: 0,
                        }}
                        title="Editar"
                      >
                        <Pencil size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Confirmar */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Banner voz */}
                <div style={{
                  padding: '8px 12px', borderRadius: 10,
                  border: `1px solid ${PALETTE.success}40`,
                  background: PALETTE.successBg,
                  display: 'flex', alignItems: 'center', gap: 8,
                  fontSize: 12, fontWeight: 600,
                  color: PALETTE.success,
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%',
                    background: PALETTE.success, flexShrink: 0 }} />
                  <Mic size={13} />
                  Diga "confirmar" ou clique em salvar
                </div>

                {/* Preview produto */}
                <div style={{
                  padding: '14px', borderRadius: 12,
                  border: `1px solid ${PALETTE.border}`,
                  background: PALETTE.bgCard,
                }}>
                  <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 15,
                    color: PALETTE.textPrimary }}>
                    {form.nome || '—'}
                  </p>
                  {form.categoria && (
                    <p style={{ margin: '0 0 8px', fontSize: 12, color: PALETTE.textMuted }}>
                      {form.categoria}
                    </p>
                  )}
                  <p style={{
                    margin: '0 0 4px', fontSize: 20, fontWeight: 800,
                    color: '#16a34a',
                  }}>
                    {form.preco_venda
                      ? formatarPreco(parseFloat(form.preco_venda))
                      : '—'}
                  </p>
                  {markup !== null && (
                    <p style={{ margin: 0, fontSize: 11,
                      color: Number(markup) >= 30 ? '#16a34a' : '#f59e0b' }}>
                      Markup: {markup}%
                    </p>
                  )}
                  {form.estoque_atual && (
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: PALETTE.textMuted }}>
                      Estoque inicial: {form.estoque_atual} {form.unidade || 'un'}
                    </p>
                  )}
                </div>

                {/* Botões */}
                <button
                  onClick={handleSave}
                  style={{
                    width: '100%', padding: '12px',
                    background: PALETTE.accent, color: '#fff',
                    border: 'none', borderRadius: 12,
                    fontWeight: 700, fontSize: 14, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  <Save size={16} />
                  Confirmar e Salvar
                </button>

                <button
                  onClick={handleGoBack}
                  style={{
                    width: '100%', padding: '10px',
                    background: PALETTE.bgCard,
                    border: `1px solid ${PALETTE.border}`,
                    borderRadius: 12, color: PALETTE.textPrimary,
                    fontWeight: 600, fontSize: 13, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  <ArrowLeft size={14} />
                  Voltar e Corrigir
                </button>

                <button
                  onClick={onClose}
                  style={{
                    width: '100%', padding: '8px',
                    background: 'none', border: 'none',
                    color: PALETTE.textFaint, fontSize: 12, cursor: 'pointer',
                  }}
                >
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
              padding: '48px 24px', gap: 16,
            }}>
              <Loader2 size={40} color={PALETTE.accent} style={{ animation: 'spin 1s linear infinite' }} />
              <p style={{ margin: 0, fontSize: 14, color: PALETTE.textMuted }}>Salvando produto...</p>
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
                background: PALETTE.successBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <CheckCircle size={40} color={PALETTE.success} />
              </div>
              <div>
                <p style={{ margin: '0 0 4px', fontWeight: 800, fontSize: 20, color: PALETTE.textPrimary }}>
                  Produto Cadastrado!
                </p>
                <p style={{ margin: 0, fontSize: 14, color: PALETTE.textMuted }}>
                  {produtoSalvo?.nome} foi adicionado à loja.
                </p>
              </div>
              {produtoSalvo && (
                <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: PALETTE.success }}>
                  {formatarPreco(produtoSalvo.preco_venda)}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
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
