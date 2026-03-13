'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  UserPlus,
  Loader2,
  AlertCircle,
  CheckCircle,
  Mic,
  MicOff,
  ChevronRight,
  RotateCcw,
  ArrowLeft,
  Fingerprint,
  Camera,
  Pencil,
} from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

// ── Tipos ────────────────────────────────────────────────────────────────────

interface RegistrationDisplayProps {
  data: { companyId: string };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText?: (text: string) => Promise<void>;
}

type Stage = 'loading' | 'collecting' | 'confirming' | 'saving' | 'success';

// ── Constantes ───────────────────────────────────────────────────────────────

const FIXED_FIELD_LABELS: Record<string, string> = {
  nome:        'Nome',
  sobrenome:   'Sobrenome',
  telefone:    'Telefone',
  email:       'E-mail',
  cpf:         'CPF',
  endereco:    'Endereço',
  empresa:     'Empresa',
  cargo:       'Cargo',
  observacoes: 'Observações',
};

const FIXED_FIELD_QUESTIONS: Record<string, string> = {
  nome:        'Qual o seu nome?',
  sobrenome:   'Qual o seu sobrenome?',
  telefone:    'Qual o telefone para contato?',
  email:       'Qual o e-mail?',
  cpf:         'Qual o CPF?',
  endereco:    'Qual o endereço?',
  empresa:     'Qual a empresa?',
  cargo:       'Qual o cargo?',
  observacoes: 'Alguma observação?',
};

// ── Componente ───────────────────────────────────────────────────────────────

export default function RegistrationDisplay({
  data,
  onClose,
  theme = 'dark',
  playText,
}: RegistrationDisplayProps) {
  const { companyId } = data;
  const supabase = createClient();

  // Tema
  const isDark = theme === 'dark';
  const bg          = isDark ? 'bg-slate-900'   : 'bg-white';
  const border      = isDark ? 'border-slate-700' : 'border-gray-200';
  const textPrimary = isDark ? 'text-white'       : 'text-gray-900';
  const textMuted   = isDark ? 'text-gray-400'    : 'text-gray-500';
  const inputCls    = `w-full px-4 py-3 rounded-lg border ${border} ${isDark ? 'bg-slate-800 text-white placeholder-slate-500' : 'bg-white text-gray-900 placeholder-gray-400'} focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm`;

  // Estado geral
  const [stage, setStage]       = useState<Stage>('loading');
  const [fieldKeys, setFieldKeys]   = useState<string[]>([]);
  const [fieldLabels, setFieldLabels] = useState<Record<string, string>>({});
  const [fieldQuestions, setFieldQuestions] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers]   = useState<Record<string, string>>({});
  const [typingValue, setTypingValue] = useState('');
  const [error, setError]       = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<'voice' | 'typing'>('voice');

  const lastSpeech = useRef('');
  const inputRef   = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // ── Carregar config ────────────────────────────────────────────────────────

  useEffect(() => {
    async function loadConfig() {
      const { data: cfg } = await supabase
        .from('registration_configs')
        .select('fields, custom_fields')
        .eq('company_id', companyId)
        .maybeSingle();

      const fields: string[]                      = cfg?.fields       ?? ['nome'];
      const custom: { key: string; label: string }[] = cfg?.custom_fields ?? [];

      const labels: Record<string, string>    = { ...FIXED_FIELD_LABELS };
      const questions: Record<string, string> = { ...FIXED_FIELD_QUESTIONS };

      custom.forEach(cf => {
        labels[cf.key]    = cf.label || cf.key;
        questions[cf.key] = `${cf.label || cf.key}?`;
      });

      setFieldKeys(fields);
      setFieldLabels(labels);
      setFieldQuestions(questions);
      setStage('collecting');

      // Cumprimentar e fazer a primeira pergunta
      const firstQ = questions[fields[0]] ?? `${labels[fields[0]]}?`;
      lastSpeech.current = firstQ;
      playText?.(firstQ).catch(() => {});
    }

    loadConfig();
  }, [companyId]);

  // ── Focus no input quando troca para digitação ─────────────────────────────

  useEffect(() => {
    if (inputMode === 'typing') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [inputMode, currentIndex]);

  // ── Avançar campo ──────────────────────────────────────────────────────────

  const advanceField = useCallback(
    async (value: string) => {
      const key = fieldKeys[currentIndex];
      const updated = { ...answers, [key]: value };
      setAnswers(updated);
      setTypingValue('');

      const nextIndex = currentIndex + 1;

      if (nextIndex >= fieldKeys.length) {
        // Todos os campos preenchidos → confirmar
        setStage('confirming');
        const msg = 'Cadastro quase pronto. Confirme os dados ou corrija algum campo.';
        lastSpeech.current = msg;
        playText?.(msg).catch(() => {});
      } else {
        setCurrentIndex(nextIndex);
        const nextKey = fieldKeys[nextIndex];
        const q = fieldQuestions[nextKey] ?? `${fieldLabels[nextKey]}?`;
        lastSpeech.current = q;
        playText?.(q).catch(() => {});
      }
    },
    [fieldKeys, currentIndex, answers, fieldLabels, fieldQuestions, playText]
  );

  // ── Repetir pergunta atual ─────────────────────────────────────────────────

  const repeatQuestion = useCallback(() => {
    const key = fieldKeys[currentIndex];
    const q   = fieldQuestions[key] ?? `${fieldLabels[key]}?`;
    lastSpeech.current = q;
    playText?.(q).catch(() => {});
  }, [fieldKeys, currentIndex, fieldLabels, fieldQuestions, playText]);

  // ── Voltar ao campo anterior ───────────────────────────────────────────────

  const goBack = useCallback(() => {
    if (stage === 'confirming') {
      setStage('collecting');
      const lastKey = fieldKeys[fieldKeys.length - 1];
      const idx     = fieldKeys.length - 1;
      setCurrentIndex(idx);
      const q = fieldQuestions[lastKey] ?? `${fieldLabels[lastKey]}?`;
      lastSpeech.current = q;
      playText?.(q).catch(() => {});
      return;
    }
    if (currentIndex > 0) {
      const prev = currentIndex - 1;
      setCurrentIndex(prev);
      const prevKey = fieldKeys[prev];
      const q = fieldQuestions[prevKey] ?? `${fieldLabels[prevKey]}?`;
      lastSpeech.current = q;
      playText?.(q).catch(() => {});
    }
  }, [stage, currentIndex, fieldKeys, fieldLabels, fieldQuestions, playText]);

  // ── Salvar ─────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setStage('saving');
    setError(null);
    try {
      const { error: err } = await supabase.from('registrations').insert({
        company_id:    companyId,
        fields:        answers,
        biometry_data: null,
        facial_id:     null,
      });
      if (err) throw err;

      setStage('success');
      const msg = 'Cadastro realizado com sucesso!';
      lastSpeech.current = msg;
      await playText?.(msg);
      setTimeout(() => onClose(), 3000);
    } catch (e) {
      console.error('Erro ao salvar cadastro:', e);
      setError('Erro ao salvar o cadastro. Tente novamente.');
      setStage('confirming');
      const msg = 'Erro ao salvar o cadastro. Tente novamente.';
      lastSpeech.current = msg;
      playText?.(msg).catch(() => {});
    }
  };

  // ── Cleanup ────────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => { window.speechSynthesis.cancel(); };
  }, []);

  // ── Submeter digitação ─────────────────────────────────────────────────────

  const handleTypingSubmit = () => {
    if (!typingValue.trim()) return;
    advanceField(typingValue.trim());
  };

  // ── Editar campo na confirmação ────────────────────────────────────────────

  const editField = (index: number) => {
    setCurrentIndex(index);
    setStage('collecting');
    const key = fieldKeys[index];
    setTypingValue(answers[key] ?? '');
    const q = fieldQuestions[key] ?? `${fieldLabels[key]}?`;
    lastSpeech.current = q;
    playText?.(q).catch(() => {});
  };

  const currentKey      = fieldKeys[currentIndex];
  const currentQuestion = currentKey ? (fieldQuestions[currentKey] ?? `${fieldLabels[currentKey]}?`) : '';
  const progress        = fieldKeys.length > 0 ? ((currentIndex) / fieldKeys.length) * 100 : 0;

  // ── Render ─────────────────────────────────────────────────────────────────

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className={`
        relative w-full rounded-2xl shadow-2xl overflow-hidden border
        ${bg} ${border} animate-in zoom-in-95 duration-300
        max-w-lg sm:max-w-2xl
      `}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className={`px-6 py-4 border-b ${border} ${isDark ? 'bg-blue-950/40' : 'bg-blue-50'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <UserPlus className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className={`text-xl font-bold ${textPrimary}`}>Cadastro</h2>
                <p className={`text-sm ${textMuted}`}>
                  {stage === 'loading'    && 'Carregando campos...'}
                  {stage === 'collecting' && `Campo ${currentIndex + 1} de ${fieldKeys.length}`}
                  {stage === 'confirming' && 'Confirme os dados'}
                  {stage === 'saving'     && 'Salvando...'}
                  {stage === 'success'    && 'Cadastro realizado'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Barra de progresso */}
          {stage === 'collecting' && fieldKeys.length > 0 && (
            <div className="mt-3 h-1.5 rounded-full bg-blue-200 dark:bg-blue-900/40 overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>

        {/* ── Conteúdo ─────────────────────────────────────────────────────── */}
        <div className="p-6">

          {/* Erro */}
          {error && (
            <div className={`mb-4 p-3 rounded-lg border flex items-start gap-2 ${isDark ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'}`}>
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className={`text-sm ${isDark ? 'text-red-200' : 'text-red-800'}`}>{error}</p>
            </div>
          )}

          {/* ── LOADING ─────────────────────────────────────────────────── */}
          {stage === 'loading' && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          )}

          {/* ── COLLECTING ──────────────────────────────────────────────── */}
          {stage === 'collecting' && currentKey && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

              {/* Coluna esquerda — campos já respondidos */}
              <div className="hidden sm:block">
                <p className={`text-xs font-semibold uppercase tracking-wider ${textMuted} mb-3`}>
                  Campos do cadastro
                </p>
                <div className="space-y-2">
                  {fieldKeys.map((key, idx) => {
                    const answered = answers[key] !== undefined;
                    const isCurrent = idx === currentIndex;
                    return (
                      <div
                        key={key}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm transition ${
                          isCurrent
                            ? `border-blue-500 ${isDark ? 'bg-blue-900/20' : 'bg-blue-50'}`
                            : answered
                              ? `border-green-500/30 ${isDark ? 'bg-green-900/10' : 'bg-green-50/50'}`
                              : `border-transparent ${isDark ? 'bg-slate-800/50' : 'bg-gray-50'}`
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isCurrent
                            ? 'bg-blue-500'
                            : answered
                              ? 'bg-green-500'
                              : isDark ? 'bg-slate-700' : 'bg-gray-200'
                        }`}>
                          {answered && !isCurrent
                            ? <CheckCircle className="w-3 h-3 text-white" />
                            : <span className={`text-[10px] font-bold ${isCurrent ? 'text-white' : isDark ? 'text-slate-400' : 'text-gray-400'}`}>{idx + 1}</span>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium truncate ${isCurrent ? 'text-blue-400' : answered ? (isDark ? 'text-green-400' : 'text-green-700') : textMuted}`}>
                            {fieldLabels[key] ?? key}
                          </p>
                          {answered && answers[key] && (
                            <p className={`text-xs truncate ${textMuted}`}>{answers[key]}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Coluna direita — campo atual */}
              <div className="flex flex-col gap-4">
                <div>
                  <p className={`text-base font-semibold ${textPrimary} mb-1`}>{currentQuestion}</p>
                  <p className={`text-xs ${textMuted}`}>
                    {fieldLabels[currentKey] ?? currentKey}
                  </p>
                </div>

                {/* Toggle voz / digitação */}
                <div className={`flex rounded-lg border ${border} overflow-hidden text-sm`}>
                  <button
                    onClick={() => setInputMode('voice')}
                    className={`flex-1 py-2 flex items-center justify-center gap-1.5 transition font-medium ${
                      inputMode === 'voice'
                        ? 'bg-blue-600 text-white'
                        : isDark ? 'bg-slate-800 text-gray-400 hover:bg-slate-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5" />
                    Voz
                  </button>
                  <button
                    onClick={() => setInputMode('typing')}
                    className={`flex-1 py-2 flex items-center justify-center gap-1.5 transition font-medium ${
                      inputMode === 'typing'
                        ? 'bg-blue-600 text-white'
                        : isDark ? 'bg-slate-800 text-gray-400 hover:bg-slate-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Digitar
                  </button>
                </div>

                {/* Input por voz */}
                {inputMode === 'voice' && (
                  <div className={`flex flex-col items-center gap-3 py-4 rounded-xl border ${border} ${isDark ? 'bg-slate-800/50' : 'bg-gray-50'}`}>
                    <div className="w-14 h-14 rounded-full bg-blue-600/10 border-2 border-blue-500/30 flex items-center justify-center">
                      <Mic className="w-7 h-7 text-blue-400" />
                    </div>
                    <p className={`text-sm text-center ${textMuted}`}>
                      Fale a resposta — o assistente irá capturar automaticamente
                    </p>
                    <p className={`text-xs ${textMuted} opacity-60`}>
                      ou troque para "Digitar" abaixo
                    </p>
                  </div>
                )}

                {/* Input por digitação */}
                {inputMode === 'typing' && (
                  <div className="space-y-3">
                    {currentKey === 'observacoes' ? (
                      <textarea
                        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                        value={typingValue}
                        onChange={e => setTypingValue(e.target.value)}
                        placeholder={`Digite ${fieldLabels[currentKey] ?? currentKey}...`}
                        rows={3}
                        className={inputCls + ' resize-none'}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && e.ctrlKey) handleTypingSubmit();
                        }}
                      />
                    ) : (
                      <input
                        ref={inputRef as React.RefObject<HTMLInputElement>}
                        type={currentKey === 'email' ? 'email' : currentKey === 'telefone' ? 'tel' : 'text'}
                        value={typingValue}
                        onChange={e => setTypingValue(e.target.value)}
                        placeholder={`Digite ${fieldLabels[currentKey] ?? currentKey}...`}
                        className={inputCls}
                        onKeyDown={e => { if (e.key === 'Enter') handleTypingSubmit(); }}
                      />
                    )}
                    <button
                      onClick={handleTypingSubmit}
                      disabled={!typingValue.trim()}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg font-semibold text-sm transition flex items-center justify-center gap-2"
                    >
                      Confirmar
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Ações secundárias */}
                <div className="flex gap-2">
                  {currentIndex > 0 && (
                    <button
                      onClick={goBack}
                      className={`flex-1 py-2 rounded-lg border ${border} ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-gray-100 hover:bg-gray-200'} text-sm ${textPrimary} transition flex items-center justify-center gap-1.5`}
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Voltar
                    </button>
                  )}
                  <button
                    onClick={repeatQuestion}
                    className={`flex-1 py-2 rounded-lg border ${border} ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-gray-100 hover:bg-gray-200'} text-sm ${textMuted} transition flex items-center justify-center gap-1.5`}
                  >
                    <RotateCcw className="w-4 h-4" />
                    Repetir
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── CONFIRMING ──────────────────────────────────────────────── */}
          {stage === 'confirming' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

              {/* Resumo dos campos */}
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wider ${textMuted} mb-3`}>
                  Dados informados
                </p>
                <div className="space-y-2">
                  {fieldKeys.map((key, idx) => (
                    <div
                      key={key}
                      className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border ${border} ${isDark ? 'bg-slate-800/50' : 'bg-gray-50'}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium ${textMuted}`}>{fieldLabels[key] ?? key}</p>
                        <p className={`text-sm font-semibold ${textPrimary} mt-0.5 truncate`}>
                          {answers[key] || <span className={`italic ${textMuted} font-normal`}>não informado</span>}
                        </p>
                      </div>
                      <button
                        onClick={() => editField(idx)}
                        className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-200'} transition flex-shrink-0`}
                        title="Editar"
                      >
                        <Pencil className="w-3.5 h-3.5 text-blue-400" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Painel de ações */}
              <div className="flex flex-col gap-4">
                <div className={`p-4 rounded-xl border ${border} ${isDark ? 'bg-slate-800/50' : 'bg-gray-50'}`}>
                  <p className={`text-sm font-medium ${textPrimary} mb-1`}>Tudo certo?</p>
                  <p className={`text-sm ${textMuted}`}>
                    Revise os dados ao lado. Clique em editar em qualquer campo para corrigir, ou confirme para salvar o cadastro.
                  </p>
                </div>

                {/* Em breve */}
                <div className={`p-3 rounded-xl border border-dashed ${isDark ? 'border-slate-600' : 'border-gray-300'} opacity-50`}>
                  <p className={`text-xs font-medium ${textMuted} mb-2`}>Em breve</p>
                  <div className="flex gap-3">
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${isDark ? 'border-slate-600 bg-slate-800' : 'border-gray-200 bg-gray-100'} text-xs ${textMuted} cursor-not-allowed`}>
                      <Fingerprint className="w-3.5 h-3.5" />
                      Biometria
                    </div>
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${isDark ? 'border-slate-600 bg-slate-800' : 'border-gray-200 bg-gray-100'} text-xs ${textMuted} cursor-not-allowed`}>
                      <Camera className="w-3.5 h-3.5" />
                      Facial
                    </div>
                  </div>
                </div>

                {/* Botões */}
                <div className="flex flex-col gap-2 mt-auto">
                  <button
                    onClick={handleSave}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Confirmar e Salvar
                  </button>
                  <button
                    onClick={goBack}
                    className={`w-full py-2.5 rounded-lg border ${border} ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-gray-100 hover:bg-gray-200'} text-sm ${textPrimary} transition flex items-center justify-center gap-1.5`}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar e Corrigir
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── SAVING ──────────────────────────────────────────────────── */}
          {stage === 'saving' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
              <p className={`text-sm ${textMuted}`}>Salvando cadastro...</p>
            </div>
          )}

          {/* ── SUCCESS ─────────────────────────────────────────────────── */}
          {stage === 'success' && (
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <div className={`w-16 h-16 rounded-full ${isDark ? 'bg-green-900/30' : 'bg-green-100'} flex items-center justify-center`}>
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <div className="text-center">
                <h3 className={`text-xl font-bold ${textPrimary} mb-1`}>Cadastro Realizado!</h3>
                <p className={`text-sm ${textMuted}`}>Os dados foram salvos com sucesso.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
