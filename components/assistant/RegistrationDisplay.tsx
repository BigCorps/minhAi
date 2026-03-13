'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, UserPlus, Check, ChevronRight, Fingerprint, Camera } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';

// ── Configuração de campos disponíveis ────────────────────────────────
const FIELD_LABELS: Record<string, string> = {
  nome:        'nome completo',
  telefone:    'telefone',
  email:       'e-mail',
  cpf:         'CPF',
  endereco:    'endereço',
  empresa:     'empresa',
  cargo:       'cargo',
  observacoes: 'observações',
};

const FIELD_QUESTIONS: Record<string, string> = {
  nome:        'Qual o nome completo?',
  telefone:    'Qual o telefone?',
  email:       'Qual o e-mail?',
  cpf:         'Qual o CPF?',
  endereco:    'Qual o endereço?',
  empresa:     'Qual a empresa?',
  cargo:       'Qual o cargo?',
  observacoes: 'Alguma observação?',
};

const AUTO_CLOSE_SECONDS = 120;

// ── Normalização padrão ───────────────────────────────────────────────
const normalize = (text: string) =>
  text.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,!?;:]+/g, '');

// ── Props ─────────────────────────────────────────────────────────────
interface RegistrationDisplayProps {
  data: { companyId: string };
  onClose: () => void;
  playText: (text: string) => Promise<void>;
  theme?: 'dark' | 'light';
}

type Stage = 'loading' | 'collecting' | 'confirming' | 'saving' | 'success';

export default function RegistrationDisplay({
  data, onClose, playText, theme = 'dark',
}: RegistrationDisplayProps) {
  const isDark = theme === 'dark';
  const supabase = createClient();

  const [stage, setStage] = useState<Stage>('loading');
  const [configuredFields, setConfiguredFields] = useState<string[]>(['nome']);
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(AUTO_CLOSE_SECONDS);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Refs para evitar closure stale
  const stageRef = useRef<Stage>('loading');
  const currentFieldIndexRef = useRef(0);
  const configuredFieldsRef = useRef<string[]>(['nome']);
  const formDataRef = useRef<Record<string, string>>({});

  // Manter refs em sincronia
  useEffect(() => { stageRef.current = stage; }, [stage]);
  useEffect(() => { currentFieldIndexRef.current = currentFieldIndex; }, [currentFieldIndex]);
  useEffect(() => { configuredFieldsRef.current = configuredFields; }, [configuredFields]);
  useEffect(() => { formDataRef.current = formData; }, [formData]);

  // ── Falar com flag de estado ─────────────────────────────────────
  const speak = useCallback(async (text: string) => {
    setIsSpeaking(true);
    try {
      await playText(text);
    } catch (_) {}
    setIsSpeaking(false);
  }, [playText]);

  // ── Cleanup ───────────────────────────────────────────────────────
  useEffect(() => {
    return () => { window.speechSynthesis.cancel(); };
  }, []);

  // ── Auto-close ────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { onClose(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onClose]);

  // ── Carregar campos configurados ──────────────────────────────────
  useEffect(() => {
    async function loadConfig() {
      const { data: config } = await supabase
        .from('registration_configs')
        .select('fields')
        .eq('company_id', data.companyId)
        .single();

      const fields: string[] = config?.fields ?? ['nome'];
      setConfiguredFields(fields);
      configuredFieldsRef.current = fields;
      setStage('collecting');
      stageRef.current = 'collecting';

      await speak(`Iniciando cadastro. ${FIELD_QUESTIONS[fields[0]]}`);
    }
    loadConfig();
  }, [data.companyId]);

  // ── Salvar cadastro ───────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    setStage('saving');
    stageRef.current = 'saving';
    try {
      await supabase.from('registrations').insert({
        company_id:   data.companyId,
        fields:       formDataRef.current,
        biometry_data: null,
        facial_id:    null,
      });
      setStage('success');
      stageRef.current = 'success';
      await speak('Cadastro realizado com sucesso!');
      setTimeout(() => onClose(), 2500);
    } catch (_) {
      await speak('Erro ao salvar. Tente novamente.');
      setStage('confirming');
      stageRef.current = 'confirming';
    }
  }, [data.companyId, onClose, speak]);

  // ── Avançar para próximo campo ────────────────────────────────────
  const advanceField = useCallback(async (answer: string, index: number) => {
    const fields = configuredFieldsRef.current;
    const fieldKey = fields[index];

    const newFormData = { ...formDataRef.current, [fieldKey]: answer };
    setFormData(newFormData);
    formDataRef.current = newFormData;

    const nextIndex = index + 1;

    if (nextIndex >= fields.length) {
      // Todos os campos coletados → confirmação
      setStage('confirming');
      stageRef.current = 'confirming';

      const summary = fields
        .map(f => `${FIELD_LABELS[f]}: ${newFormData[f]}`)
        .join('. ');
      await speak(`Resumo do cadastro: ${summary}. Confirma?`);
    } else {
      setCurrentFieldIndex(nextIndex);
      currentFieldIndexRef.current = nextIndex;
      await speak(FIELD_QUESTIONS[fields[nextIndex]]);
    }
  }, [speak]);

  // ── Comandos de voz ───────────────────────────────────────────────
  useModalVoiceCommand({
    active: stage === 'collecting' || stage === 'confirming',
    onTranscript: async (transcript) => {
      const t = normalize(transcript);
      const currentStage = stageRef.current;
      const index = currentFieldIndexRef.current;
      const fields = configuredFieldsRef.current;

      // Universal: fechar
      if (['fechar', 'cancelar', 'sair', 'encerrar'].some(cmd => t.includes(cmd))) {
        onClose();
        return;
      }

      // Universal: repetir
      if (['repetir', 'repete', 'de novo', 'nao ouvi', 'nao entendi'].some(cmd => t.includes(cmd))) {
        if (currentStage === 'collecting') {
          await speak(FIELD_QUESTIONS[fields[index]]);
        } else if (currentStage === 'confirming') {
          const fd = formDataRef.current;
          const summary = fields.map(f => `${FIELD_LABELS[f]}: ${fd[f]}`).join('. ');
          await speak(`Resumo: ${summary}. Confirma?`);
        }
        return;
      }

      // Etapa de CONFIRMAÇÃO
      if (currentStage === 'confirming') {
        if (['sim', 'confirmar', 'confirma', 'ok', 'pode', 'certo'].some(cmd => t.includes(cmd))) {
          await handleSave();
          return;
        }
        if (['nao', 'nao confirmo', 'corrigir'].some(cmd => t.includes(cmd))) {
          // Volta para o início da coleta
          setCurrentFieldIndex(0);
          currentFieldIndexRef.current = 0;
          setStage('collecting');
          stageRef.current = 'collecting';
          await speak(`Vamos corrigir. ${FIELD_QUESTIONS[fields[0]]}`);
          return;
        }

        // Correção de campo específico: "corrigir nome", "mudar telefone"
        for (const fieldKey of fields) {
          const label = FIELD_LABELS[fieldKey];
          if (t.includes(label) || t.includes(fieldKey)) {
            const fieldIdx = fields.indexOf(fieldKey);
            setCurrentFieldIndex(fieldIdx);
            currentFieldIndexRef.current = fieldIdx;
            setStage('collecting');
            stageRef.current = 'collecting';
            await speak(`Ok. ${FIELD_QUESTIONS[fieldKey]}`);
            return;
          }
        }
        return;
      }

      // Etapa de COLETA — qualquer resposta é o valor do campo atual
      if (currentStage === 'collecting' && transcript.trim().length > 0) {
        await advanceField(transcript.trim(), index);
      }
    },
  });

  // ── Render ────────────────────────────────────────────────────────
  const fields = configuredFields;
  const progress = stage === 'collecting'
    ? (currentFieldIndex / fields.length) * 100
    : stage === 'confirming' || stage === 'saving' || stage === 'success'
      ? 100
      : 0;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70">
      <div className={`w-full max-w-md rounded-2xl p-6 ${
        isDark ? 'bg-slate-800 border border-white/10' : 'bg-white border border-gray-200'
      }`}>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="text-2xl">👤</span>
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Cadastro
            </h2>
          </div>
          <button onClick={onClose}>
            <X className={`w-5 h-5 ${isDark ? 'text-white/60 hover:text-white' : 'text-gray-400 hover:text-gray-600'}`} />
          </button>
        </div>

        {/* Progresso dos campos */}
        {stage !== 'loading' && (
          <div className="flex gap-1.5 mb-5">
            {fields.map((f, i) => (
              <div
                key={f}
                className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                  i < currentFieldIndex || stage === 'confirming' || stage === 'saving' || stage === 'success'
                    ? 'bg-yellow-600'
                    : i === currentFieldIndex && stage === 'collecting'
                      ? 'bg-yellow-400'
                      : isDark ? 'bg-slate-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        )}

        {/* Conteúdo por etapa */}
        {stage === 'loading' && (
          <div className="flex items-center justify-center py-10">
            <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {stage === 'collecting' && (
          <div>
            <p className={`text-sm mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Campo {currentFieldIndex + 1} de {fields.length}
            </p>
            <p className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {FIELD_QUESTIONS[fields[currentFieldIndex]]}
            </p>

            {/* Campos já preenchidos */}
            {Object.entries(formData).length > 0 && (
              <div className={`rounded-xl p-3 mb-4 space-y-1 ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                {fields.slice(0, currentFieldIndex).map(f => (
                  <div key={f} className="flex justify-between text-sm">
                    <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>
                      {FIELD_LABELS[f]}
                    </span>
                    <span className={isDark ? 'text-white' : 'text-gray-900'}>
                      {formData[f]}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {isSpeaking && (
              <div className="flex items-center gap-2 text-xs text-yellow-500 mb-3">
                <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse" />
                Falando...
              </div>
            )}
          </div>
        )}

        {stage === 'confirming' && (
          <div>
            <p className={`text-sm font-medium mb-3 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
              Confirma os dados?
            </p>
            <div className={`rounded-xl p-4 mb-4 space-y-2 ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
              {fields.map(f => (
                <div key={f} className="flex justify-between text-sm">
                  <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>
                    {FIELD_LABELS[f]}
                  </span>
                  <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {formData[f] || '—'}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setStage('collecting');
                  setCurrentFieldIndex(0);
                  speak(FIELD_QUESTIONS[fields[0]]);
                }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border ${
                  isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Corrigir
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-yellow-600 text-white hover:bg-yellow-500 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" /> Confirmar
              </button>
            </div>
          </div>
        )}

        {stage === 'saving' && (
          <div className="flex flex-col items-center py-8 gap-3">
            <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
            <p className={isDark ? 'text-slate-300' : 'text-gray-600'}>Salvando cadastro...</p>
          </div>
        )}

        {stage === 'success' && (
          <div className="flex flex-col items-center py-8 gap-3">
            <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center">
              <Check className="w-7 h-7 text-green-500" />
            </div>
            <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Cadastro realizado!
            </p>
          </div>
        )}

        {/* Biometria — Em breve */}
        {(stage === 'confirming') && (
          <div className={`mt-4 flex gap-2`}>
            {[
              { icon: Fingerprint, label: 'Biometria' },
              { icon: Camera, label: 'Facial' },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                title="Em breve"
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs border border-dashed opacity-40 cursor-not-allowed ${
                  isDark ? 'border-slate-600 text-slate-400' : 'border-gray-300 text-gray-400'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label} — em breve
              </div>
            ))}
          </div>
        )}

        {/* Voice hint */}
        {(stage === 'collecting' || stage === 'confirming') && (
          <div className={`mt-4 px-3 py-2 rounded-xl text-xs flex items-center gap-2 ${
            isDark ? 'bg-slate-700/50 text-slate-400' : 'bg-gray-50 text-gray-500'
          }`}>
            <span>🎤</span>
            <span>
              {stage === 'collecting'
                ? <>Responda por voz • Diga <strong>"repetir"</strong> ou <strong>"cancelar"</strong></>
                : <>Diga <strong>"confirmar"</strong>, <strong>"corrigir"</strong> ou o nome do campo</>
              }
            </span>
          </div>
        )}

        {/* Barra auto-close */}
        <div className={`mt-3 h-1 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
          <div
            className="h-full bg-yellow-600 rounded-full transition-all duration-1000"
            style={{ width: `${(timeLeft / AUTO_CLOSE_SECONDS) * 100}%` }}
          />
        </div>

      </div>
    </div>,
    document.body
  );
}
