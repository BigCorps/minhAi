'use client';

import { ArrowRight, Bot, Headphones, Loader2, MessageCircle, Mic, Send, Sparkles, Square, UserRound } from 'lucide-react';
import { FormEvent, useMemo, useRef, useState } from 'react';
import { useFAQs, type FAQEntry } from '@/components/VoiceAssistant/hooks/useFAQs';
import { findMatchingFAQLocal } from '@/components/VoiceAssistant/utils/faqUtils';
import { createClient } from '@/lib/supabase-browser';
import {
  functionKeyRoute,
  resolveFuncionarIADeterministic,
  type FuncionarIACompanyPublicInfo,
} from '@/lib/funcionaria-deterministic';
import { contrastTextColor, rgbaFromHex } from '@/lib/funcionaria-visual';

type PendingAction = { href: string; label: string } | null;
type InteractionSource = 'webapp' | 'widget' | 'terminal';

type Props = {
  company: FuncionarIACompanyPublicInfo & { greeting_message?: string | null };
  activeSkillKeys: string[];
  activeFunctionKeys: string[];
  aiEnabled?: boolean;
  /**
   * `true` quando quem le e o cliente final: pagina publica, widget, terminal.
   *
   * Nesse modo nada sobre o funcionamento interno aparece. Se a empresa usa IA,
   * quanto custa, o que e resolvido localmente — isso e assunto do painel da
   * empresa. Para quem chega no site, existe uma atendente que responde.
   */
  clientFacing?: boolean;
  voiceInputEnabled?: boolean;
  source?: InteractionSource;
  primaryColor: string;
  secondaryColor: string;
  playText: (text: string) => Promise<void>;
  onCallHuman: (reason?: string) => void;
  onAiFallback?: (input: string) => Promise<string | null>;
  variant?: 'panel' | 'dock';
};

export default function FuncionarIAInteraction({
  company,
  activeSkillKeys,
  activeFunctionKeys,
  aiEnabled = false,
  clientFacing = false,
  voiceInputEnabled = false,
  source = 'webapp',
  primaryColor,
  secondaryColor,
  playText,
  onCallHuman,
  onAiFallback,
  variant = 'panel',
}: Props) {
  const faqs = useFAQs(company.id);
  const supabase = useMemo(() => createClient(), []);
  const [input, setInput] = useState('');
  const [answer, setAnswer] = useState('');
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [processing, setProcessing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [lastSource, setLastSource] = useState<'company' | 'faq' | 'skill' | 'ai' | 'human' | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartedAtRef = useRef<number>(0);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function speak(text: string) {
    try { await playText(text); } catch (error) { console.warn('[FuncionarIA] TTS:', error); }
  }

  async function registerFaqUse(faq: FAQEntry) {
    try {
      await supabase.rpc('funcionaria_register_faq_use', {
        p_company_id: company.id,
        p_faq_id: faq.id,
      });
    } catch {}
  }

  async function useFaq(faq: FAQEntry) {
    setPendingAction(null);
    await registerFaqUse(faq);

    if (faq.function_key && !activeFunctionKeys.includes(faq.function_key)) {
      const text = 'Essa ação pertence a uma habilidade que não está ativa nesta FuncionarIA. Posso chamar um responsável para ajudar.';
      setAnswer(text);
      setLastSource('human');
      await speak(text);
      return;
    }

    const route = functionKeyRoute(faq.function_key);
    if (route) setPendingAction(route);

    const text = faq.answer || (route ? 'Posso abrir essa opção para você.' : 'Encontrei essa informação.');
    setAnswer(text);
    setLastSource('faq');
    await speak(text);
  }

  async function processInput(raw: string) {
    const question = raw.trim();
    if (!question || processing) return;
    setProcessing(true);
    setPendingAction(null);

    try {
      const direct = resolveFuncionarIADeterministic(question, company, activeSkillKeys);
      if (direct.kind === 'human') {
        setAnswer(direct.text);
        setLastSource('human');
        await speak(direct.text);
        onCallHuman(question);
        return;
      }
      if (direct.kind === 'answer') {
        setAnswer(direct.text);
        setLastSource('company');
        await speak(direct.text);
        return;
      }
      if (direct.kind === 'navigate') {
        setAnswer(direct.text);
        setPendingAction({ href: direct.href, label: direct.label });
        setLastSource('skill');
        await speak(direct.text);
        return;
      }

      const faq = findMatchingFAQLocal(faqs, question);
      if (faq) {
        await useFaq(faq);
        return;
      }

      if (aiEnabled && onAiFallback) {
        const aiAnswer = await onAiFallback(question);
        if (aiAnswer) {
          setAnswer(aiAnswer);
          setLastSource('ai');
          await speak(aiAnswer);
          return;
        }
      }

      const fallback = aiEnabled
        ? 'Não encontrei uma resposta pronta para isso agora. Posso chamar um responsável para ajudar.'
        : 'Não encontrei essa informação nas respostas cadastradas. Posso chamar um responsável para ajudar.';
      setAnswer(fallback);
      setLastSource('human');
      await speak(fallback);
    } finally {
      setProcessing(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const value = input;
    setInput('');
    await processInput(value);
  }

  function cleanupRecorder() {
    if (autoStopRef.current) {
      clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    setRecording(false);
  }

  async function blobToBase64(blob: Blob): Promise<string> {
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  }

  async function sendVoice(blob: Blob, durationSeconds: number) {
    setTranscribing(true);
    setVoiceError(null);
    try {
      const audio = await blobToBase64(blob);
      const response = await fetch('/api/funcionaria/voice/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: company.id,
          audio,
          duration_seconds: durationSeconds,
          source,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok || !data?.text) {
        if (response.status === 402 || data?.reason === 'insufficient_credits') {
          setVoiceError('Créditos de uso insuficientes para reconhecimento de voz. Você ainda pode digitar normalmente.');
        } else if (data?.reason === 'rate_limited') {
          setVoiceError('Muitas tentativas de voz em sequência. Aguarde um instante ou digite sua pergunta.');
        } else if (data?.reason === 'empty_transcript') {
          setVoiceError('Não consegui entender esse áudio. Tente novamente falando mais perto do microfone.');
        } else {
          setVoiceError('Não foi possível reconhecer sua fala agora. Você pode continuar digitando normalmente.');
        }
        return;
      }
      setInput('');
      await processInput(String(data.text));
    } catch (error) {
      console.warn('[FuncionarIA] reconhecimento de voz:', error);
      setVoiceError('Não foi possível usar o microfone agora. Você pode continuar digitando normalmente.');
    } finally {
      setTranscribing(false);
    }
  }

  async function startRecording() {
    if (!voiceInputEnabled || recording || transcribing || processing) return;
    setVoiceError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setVoiceError('Este navegador não oferece gravação de voz. Digite sua pergunta para continuar.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      streamRef.current = stream;
      recorderRef.current = recorder;
      recordingStartedAtRef.current = Date.now();

      recorder.ondataavailable = event => {
        if (event.data?.size) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        cleanupRecorder();
        setVoiceError('O microfone foi interrompido. Tente novamente ou digite sua pergunta.');
      };
      recorder.onstop = () => {
        const durationSeconds = Math.max(1, Math.ceil((Date.now() - recordingStartedAtRef.current) / 1000));
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        cleanupRecorder();
        if (blob.size > 0) void sendVoice(blob, durationSeconds);
      };

      recorder.start(250);
      setRecording(true);
      autoStopRef.current = setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop();
      }, 15_000);
    } catch (error) {
      cleanupRecorder();
      console.warn('[FuncionarIA] permissão de microfone:', error);
      setVoiceError('Não consegui acessar o microfone. Verifique a permissão do navegador ou digite sua pergunta.');
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (recorder?.state === 'recording') recorder.stop();
  }

  const primaryText = contrastTextColor(primaryColor);
  const quickFaqs = faqs.slice(0, 4);
  const dock = variant === 'dock';
  const quickActions = useMemo(() => {
    const seen = new Set<string>();
    const items: Array<{ href: string; label: string }> = [];
    for (const key of activeFunctionKeys) {
      const route = functionKeyRoute(key);
      if (!route || seen.has(route.href)) continue;
      seen.add(route.href);
      items.push(route);
      if (items.length >= 4) break;
    }
    return items;
  }, [activeFunctionKeys]);

  return (
    <section className={dock
      ? 'rounded-[26px] border border-white/70 bg-white/[.88] p-3 shadow-2xl shadow-slate-950/15 backdrop-blur-2xl sm:p-4'
      : 'rounded-[30px] border border-black/5 bg-white p-5 shadow-sm sm:p-6 lg:p-7'}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <div className={`${dock ? 'text-[10px]' : 'text-xs'} font-black uppercase tracking-[.18em]`} style={{ color: primaryColor }}>
            {clientFacing ? 'Atendimento' : 'Olá, eu sou a FuncionarIA'}
          </div>
          <h2 className={`${dock ? 'mt-1 text-lg sm:text-xl' : 'mt-2 text-2xl sm:text-3xl'} font-black tracking-tight`}>Como posso ajudar você na {company.name}?</h2>
          {!dock && (
            <p className="mt-3 text-sm leading-6 text-slate-500">
              {clientFacing
                ? 'Escreva sua dúvida ou escolha uma das opções abaixo.'
                : 'Perguntas cadastradas, dados da empresa e ações determinísticas são resolvidos localmente, sem IA e sem consumir créditos.'}
            </p>
          )}
        </div>
        {!clientFacing && (
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black" style={{ backgroundColor: rgbaFromHex(aiEnabled ? secondaryColor : primaryColor, .12), color: aiEnabled ? '#4D7C0F' : primaryColor }}>
            {aiEnabled ? <Sparkles className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
            {aiEnabled ? 'IA ATIVA' : 'SEM IA'}
          </span>
        )}
      </div>

      <form onSubmit={submit} className={`${dock ? 'mt-3' : 'mt-5'} flex gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 focus-within:border-violet-200`}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Digite sua pergunta…"
          className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm font-semibold outline-none placeholder:text-slate-400"
          disabled={processing || recording || transcribing}
        />
        {voiceInputEnabled && (
          <button
            type="button"
            onClick={recording ? stopRecording : () => void startRecording()}
            disabled={transcribing || processing}
            className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition disabled:opacity-40 ${recording ? 'border-red-200 bg-red-50 text-red-600' : 'border-slate-200 bg-white text-slate-500 hover:text-violet-700'}`}
            aria-label={recording ? 'Parar gravação' : 'Falar com a FuncionarIA'}
          >
            {transcribing ? <Loader2 className="h-4 w-4 animate-spin" /> : recording ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-4 w-4" />}
          </button>
        )}
        <button
          type="submit"
          disabled={processing || recording || transcribing || !input.trim()}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl disabled:opacity-40"
          style={{ backgroundColor: primaryColor, color: primaryText }}
          aria-label="Enviar pergunta"
        >
          {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>

      {(recording || transcribing || voiceError) && (
        <div className={`mt-2 rounded-xl px-3 py-2 text-xs font-bold ${voiceError ? 'bg-amber-50 text-amber-800' : recording ? 'bg-red-50 text-red-700' : 'bg-violet-50 text-violet-700'}`}>
          {voiceError || (recording ? 'Ouvindo… toque novamente para enviar.' : 'Convertendo sua fala em texto…')}
        </div>
      )}

      {quickActions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {quickActions.map(action => (
            <a key={action.href} href={action.href} className={`${dock ? 'px-3 py-1.5 text-[11px]' : 'px-3 py-2 text-xs'} rounded-full border border-violet-200 bg-violet-50 font-black text-violet-700 hover:bg-violet-100`}>
              {action.label}
            </a>
          ))}
        </div>
      )}

      {quickFaqs.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {quickFaqs.map(faq => (
            <button key={faq.id} type="button" onClick={() => void useFaq(faq)} className={`${dock ? 'px-3 py-1.5 text-[11px]' : 'px-3 py-2 text-xs'} rounded-full border border-slate-200 bg-white text-left font-extrabold text-slate-600 hover:border-violet-200 hover:text-violet-700`}>
              {faq.question}
            </button>
          ))}
        </div>
      )}

      {answer && (
        <div className={`${dock ? 'mt-3 p-3' : 'mt-5 p-4'} rounded-2xl border border-slate-100 bg-white/[.92]`}>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.14em] text-slate-400">
            <MessageCircle className="h-3.5 w-3.5" />
            {lastSource === 'faq' ? 'Resposta rápida' : lastSource === 'company' ? 'Informação da empresa' : lastSource === 'skill' ? 'Habilidade' : lastSource === 'ai' ? 'Resposta com IA' : 'Atendimento'}
          </div>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{answer}</p>
          {pendingAction && (
            <a href={pendingAction.href} className="mt-3 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black" style={{ backgroundColor: primaryColor, color: primaryText }}>
              {pendingAction.label} <ArrowRight className="h-4 w-4" />
            </a>
          )}
        </div>
      )}

      <div className={`${dock ? 'mt-3' : 'mt-5'} flex flex-wrap gap-2`}>
        <button
          type="button"
          onClick={() => void speak(company.greeting_message || `Olá! Eu sou a FuncionarIA da ${company.name}. Como posso ajudar?`)}
          className={`${dock ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm'} inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white font-black text-slate-600 hover:bg-slate-50`}
        >
          <Headphones className="h-4 w-4" /> Ouvir saudação
        </button>
        <button
          type="button"
          onClick={() => onCallHuman('Cliente solicitou atendimento humano pela FuncionarIA.')}
          className={`${dock ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm'} inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white font-black text-slate-600 hover:bg-slate-50`}
        >
          <UserRound className="h-4 w-4" /> Chamar responsável
        </button>
      </div>
    </section>
  );
}
