'use client';

// =========================================================
// SetupAssistantChat.tsx v3
// ✅ v2: InputBar/PainelPreview inline, breakpoint manual
// ✅ v3: business_address e website sempre coletados
//        brand_description salvo como campo da empresa
//        URLs corrigidas para minhai.app/ia/
// =========================================================

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import {
  Loader2, Send, Mic, X, Check, ChevronDown, ChevronUp,
  Volume2, VolumeX, Bot, Zap, CheckCircle2, Circle,
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface FuncaoRecomendada {
  function_key: string;
  function_name: string;
  short_description: string;
  function_category: string;
  justificativa: string;
  already_active: boolean;
}

interface FuncaoCategoria {
  function_key: string;
  function_name: string;
  short_description: string;
  already_active: boolean;
}

type Etapa = 'ramo' | 'funcoes' | 'dados' | 'concluido';

interface SetupAssistantChatProps {
  companyId: string;
  companyName: string;
  slug: string;
  onClose: () => void;
  onConcluido?: () => void;
  theme?: 'dark' | 'light';
  playText: (text: string) => Promise<void>;
}

const CATEGORIA_LABELS: Record<string, string> = {
  contact:         'Contato',
  payment:         'Pagamentos',
  ai_assistant:    'IA & Assistente',
  information:     'Informações',
  video:           'Vídeos',
  productivity:    'Produtividade',
  schedule:        'Agendamentos',
  services:        'Serviços',
  knowledge:       'Consultas',
  codes:           'Leitura de Códigos',
  images:          'Imagens',
  utylities:       'Utilitários',
  configuration:   'Configuração',
  payment_methods: 'Métodos de Pagamento',
};

const CAMPOS_DADOS = [
  { key: 'whatsapp_number',    pergunta: 'Qual o número do WhatsApp da empresa? (com DDD, ex: 11999998888)' },
  { key: 'instagram_username', pergunta: 'Qual o @ do Instagram? (sem o @)' },
  { key: 'business_address',   pergunta: 'Qual o endereço completo da empresa?' },
  { key: 'business_hours',     pergunta: 'Qual o horário de funcionamento?' },
  { key: 'brand_description',  pergunta: 'Descreva brevemente a empresa em 1-2 frases. (usado na função Nossa Marca)' },
  { key: 'website',            pergunta: 'Qual o endereço do site? (ex: www.minhaempresa.com.br)' },
  { key: 'email_contato',      pergunta: 'Qual o e-mail de contato da empresa?' },
  { key: 'receiving_pix_key',  pergunta: 'Qual a chave PIX para receber pagamentos?' },
  { key: 'greeting_message',   pergunta: 'Qual mensagem de boas-vindas o assistente deve usar?' },
  { key: 'wake_word',          pergunta: 'Qual palavra ou frase ativa o assistente? (padrão: "Ei Assistente")' },
];

const FUNCAO_REQUER_DADO: Record<string, string[]> = {
  qrcode_whatsapp:  ['whatsapp_number'],
  qrcode_instagram: ['instagram_username'],
  qrcode_website:   ['website'],
  qrcode_email:     ['email_contato'],
  endereco:         ['business_address'],
  nossa_marca:      ['brand_description', 'business_hours'],
  pix_generate:     ['receiving_pix_key'],
  pix_confirm:      ['receiving_pix_key'],
};

export default function SetupAssistantChat({
  companyId,
  companyName,
  slug,
  onClose,
  onConcluido,
  theme = 'dark',
  playText,
}: SetupAssistantChatProps) {
  const isDark = theme === 'dark';
  const voiceRecorder = useVoiceRecorder();

  // ✅ Breakpoint manual
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [audioMutado, setAudioMutado] = useState(false);
  const audioMutadoRef = useRef(false);

  const [etapa, setEtapa] = useState<Etapa>('ramo');
  const [ramo, setRamo] = useState('');
  const [recomendadas, setRecomendadas] = useState<FuncaoRecomendada[]>([]);
  const [todasPorCategoria, setTodasPorCategoria] = useState<Record<string, FuncaoCategoria[]>>({});
  const [funcoesSelecionadas, setFuncoesSelecionadas] = useState<Set<string>>(new Set());
  const [dadosEmpresa, setDadosEmpresa] = useState<Record<string, string>>({});
  const [campoAtual, setCampoAtual] = useState<string | null>(null);
  const [camposNecessarios, setCamposNecessarios] = useState<string[]>([]);
  const [mostrarTodas, setMostrarTodas] = useState(false);
  const [categoriaAberta, setCategoriaAberta] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);
  const hasStartedRef = useRef(false);

  const C = {
    bg:              isDark ? '#1e293b' : '#ffffff',
    bgSecondary:     isDark ? '#334155' : '#f8fafc',
    bgChat:          isDark ? '#0f172a' : '#f1f5f9',
    text:            isDark ? '#f1f5f9' : '#0f172a',
    textMuted:       isDark ? '#94a3b8' : '#64748b',
    border:          isDark ? '#475569' : '#e2e8f0',
    accent:          '#3b82f6',
    success:         '#22c55e',
    userBubble:      isDark ? '#3b82f6' : '#2563eb',
    assistantBubble: isDark ? '#334155' : '#e2e8f0',
  };

  const toggleMute = useCallback(() => {
    setAudioMutado(prev => { audioMutadoRef.current = !prev; return !prev; });
  }, []);

  const playTextSafe = useCallback(async (text: string) => {
    if (audioMutadoRef.current) return;
    audioQueueRef.current.push(text);
    if (isPlayingRef.current) return;
    while (audioQueueRef.current.length > 0) {
      isPlayingRef.current = true;
      const next = audioQueueRef.current.shift();
      if (next) {
        try { await playText(next); await new Promise(r => setTimeout(r, 300)); }
        catch (err) { console.error('Erro ao falar:', err); }
      }
    }
    isPlayingRef.current = false;
  }, [playText]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;
    const msg = `Olá! Sou seu assistente de configuração. Vou te ajudar a configurar o "${companyName}" em poucos minutos. Para começar, qual é o ramo de atividade da sua empresa?`;
    setMessages([{ id: Date.now().toString(), role: 'assistant', content: msg, timestamp: new Date() }]);
    playTextSafe(msg);
  }, []);

  function addAssistantMessage(content: string) {
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content, timestamp: new Date() }]);
  }
  function addUserMessage(content: string) {
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content, timestamp: new Date() }]);
  }

  const handleMicPress = async () => {
    if (voiceRecorder.isRecording) {
      setIsTranscribing(true);
      try {
        const audioBlob = await voiceRecorder.stopRecording();
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        const base64Audio = await new Promise<string>(resolve => {
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        });
        const response = await fetch('/api/voice/transcribe', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audio: base64Audio }),
        });
        if (response.ok) {
          const { text } = await response.json();
          if (text?.trim()) processarInput(text.trim());
        }
      } catch (err) { console.error('Erro transcrição:', err); }
      finally { setIsTranscribing(false); }
    } else {
      await voiceRecorder.startRecording();
    }
  };

  const processarInput = async (texto: string) => {
    if (!texto.trim() || isProcessing) return;
    addUserMessage(texto);
    if (etapa === 'ramo') await processarRamo(texto);
    else if (etapa === 'funcoes') await processarComandoFuncoes(texto);
    else if (etapa === 'dados' && campoAtual) await processarDado(texto);
  };

  const enviarMensagem = () => {
    if (!inputText.trim() || isProcessing) return;
    processarInput(inputText);
    setInputText('');
  };

  const processarRamo = async (ramoInformado: string) => {
    setIsProcessing(true);
    setRamo(ramoInformado);
    const loadingMsg = `Ótimo! Analisando as melhores funções para "${ramoInformado}"...`;
    addAssistantMessage(loadingMsg);
    playTextSafe(loadingMsg);
    try {
      const response = await fetch('/api/setup/recommend', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ramo: ramoInformado, companyId }),
      });
      if (!response.ok) throw new Error('Erro ao buscar recomendações');
      const data = await response.json();
      setRecomendadas(data.recomendadas || []);
      setTodasPorCategoria(data.todas_por_categoria || {});
      setFuncoesSelecionadas(new Set((data.recomendadas || []).map((f: FuncaoRecomendada) => f.function_key)));
      setEtapa('funcoes');
      const count = data.recomendadas?.length || 0;
      const resposta = `${data.mensagem} Encontrei ${count} funções recomendadas para você, já marcadas no painel ao lado. Você pode ativar ou desativar qualquer uma clicando nelas, ou me dizer o que quer mudar. Quando estiver pronto, diga "confirmar" ou "continuar".`;
      addAssistantMessage(resposta);
      playTextSafe(resposta);
    } catch (err) {
      console.error('Erro ao recomendar:', err);
      addAssistantMessage('Desculpe, tive um problema ao buscar as recomendações. Pode tentar novamente?');
    } finally { setIsProcessing(false); }
  };

  const processarComandoFuncoes = async (texto: string) => {
    const lower = texto.toLowerCase();
    if (/confirmar|continuar|próximo|pronto|ok|tudo bem|salvar|avançar/.test(lower)) { await avancarParaDados(); return; }
    if (/ativa(r)? tudo|ativar todas|quero tudo|selecionar tudo/.test(lower)) {
      const todas = new Set<string>();
      Object.values(todasPorCategoria).flat().forEach(f => todas.add(f.function_key));
      setFuncoesSelecionadas(todas);
      const msg = `Todas as funções foram selecionadas! Diga "confirmar" quando quiser continuar.`;
      addAssistantMessage(msg); playTextSafe(msg); return;
    }
    if (/desativa(r)? tudo|remove(r)? tudo|limpar tudo/.test(lower)) {
      setFuncoesSelecionadas(new Set());
      const msg = `Todas as funções foram desmarcadas.`;
      addAssistantMessage(msg); playTextSafe(msg); return;
    }
    const todasFuncoes = Object.values(todasPorCategoria).flat();
    let funcaoEncontrada: FuncaoCategoria | undefined;
    for (const f of todasFuncoes) {
      if (lower.includes(f.function_name.toLowerCase()) || lower.includes(f.function_key.replace(/_/g, ' '))) {
        funcaoEncontrada = f; break;
      }
    }
    if (funcaoEncontrada) {
      const ativar = /ativa(r)?|add|adiciona(r)?|quero/.test(lower) || !(/desativa(r)?|remove(r)?|tira(r)?|sem/.test(lower));
      toggleFuncao(funcaoEncontrada.function_key, ativar);
      const msg = `"${funcaoEncontrada.function_name}" foi ${ativar ? 'ativada' : 'desativada'}! Mais alguma alteração?`;
      addAssistantMessage(msg); playTextSafe(msg); return;
    }
    const msg = `Não entendi bem. Clique nas funções no painel ao lado, ou diga o nome da função. Quando pronto, diga "confirmar".`;
    addAssistantMessage(msg); playTextSafe(msg);
  };

  const toggleFuncao = (functionKey: string, forcar?: boolean) => {
    setFuncoesSelecionadas(prev => {
      const next = new Set(prev);
      if (forcar === true) next.add(functionKey);
      else if (forcar === false) next.delete(functionKey);
      else if (next.has(functionKey)) next.delete(functionKey);
      else next.add(functionKey);
      return next;
    });
  };

  const avancarParaDados = async () => {
    const camposNec: string[] = [];

    // Campos exigidos pelas funções selecionadas
    for (const fk of funcoesSelecionadas) {
      for (const campo of (FUNCAO_REQUER_DADO[fk] || [])) {
        if (!camposNec.includes(campo) && !dadosEmpresa[campo]) camposNec.push(campo);
      }
    }

    // ✅ v3: Campos sempre coletados independente das funções
    const camposSempre = ['business_hours', 'brand_description', 'business_address', 'website'];
    for (const campo of camposSempre) {
      if (!camposNec.includes(campo) && !dadosEmpresa[campo]) {
        camposNec.push(campo);
      }
    }

    setCamposNecessarios(camposNec);
    const msg = `Perfeito! ${funcoesSelecionadas.size} função(ões) selecionada(s). Agora vou coletar alguns dados para configurar tudo corretamente.`;
    addAssistantMessage(msg);
    playTextSafe(msg);
    setEtapa('dados');
    if (camposNec.length > 0) await perguntarProximoCampo(camposNec, 0);
    else await concluirSetup();
  };

  const perguntarProximoCampo = async (campos: string[], indice: number) => {
    if (indice >= campos.length) { await concluirSetup(); return; }
    const campoDef = CAMPOS_DADOS.find(c => c.key === campos[indice]);
    if (!campoDef) { await perguntarProximoCampo(campos, indice + 1); return; }
    setCampoAtual(campos[indice]);
    const pergunta = `${campoDef.pergunta} (ou diga "pular" para deixar em branco)`;
    addAssistantMessage(pergunta);
    playTextSafe(pergunta);
  };

  const processarDado = async (valor: string) => {
    if (!campoAtual) return;
    const indiceAtual = camposNecessarios.indexOf(campoAtual);
    if (!/pular|skip|não sei|nao sei|depois|não tenho|nao tenho/.test(valor.toLowerCase())) {
      setDadosEmpresa(prev => ({ ...prev, [campoAtual]: valor }));
    }
    setCampoAtual(null);
    await perguntarProximoCampo(camposNecessarios, indiceAtual + 1);
  };

  const concluirSetup = async () => {
    setIsSaving(true);
    addAssistantMessage('Aplicando todas as configurações...');
    try {
      const response = await fetch('/api/setup/apply', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          functions: Array.from(funcoesSelecionadas).map(fk => ({ function_key: fk, enabled: true })),
          companyData: dadosEmpresa,
        }),
      });
      const data = await response.json();
      setEtapa('concluido');
      const msgFinal = data.success
        ? `Tudo configurado! Seu assistente "${companyName}" está pronto com ${funcoesSelecionadas.size} função(ões) ativa(s). Acesse em minhai.app/ia/${slug}`
        : `Configuração aplicada com alguns problemas: ${data.message}. Ajuste manualmente no dashboard.`;
      addAssistantMessage(msgFinal);
      playTextSafe(msgFinal);
    } catch (err) {
      console.error('Erro ao aplicar:', err);
      addAssistantMessage('Ocorreu um erro ao salvar. Tente novamente ou configure manualmente.');
    } finally { setIsSaving(false); }
  };

  // ── JSX painel preview ────────────────────────────────────
  const painelPreviewJSX = (
    <div style={{ overflowY: 'auto', padding: '20px', height: '100%' }}>

      <div style={{ marginBottom: '16px', padding: '12px', background: C.bgSecondary, borderRadius: '8px', border: `1px solid ${C.border}` }}>
        <div style={{ fontSize: '11px', color: C.textMuted, marginBottom: '4px' }}>Assistente</div>
        <div style={{ fontSize: '15px', fontWeight: '600', color: C.text }}>{companyName}</div>
        {ramo && <div style={{ fontSize: '12px', color: C.accent, marginTop: '2px' }}>{ramo}</div>}
        <div style={{ fontSize: '11px', color: C.textMuted, marginTop: '4px' }}>minhai.app/ia/{slug}</div>
      </div>

      {etapa !== 'ramo' && (
        <>
          <div style={{ fontSize: '11px', fontWeight: '600', color: C.textMuted, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Funções Recomendadas ({recomendadas.length})
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
            {recomendadas.map(f => {
              const ativa = funcoesSelecionadas.has(f.function_key);
              return (
                <div key={f.function_key} onClick={() => toggleFuncao(f.function_key)} style={{
                  padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
                  border: `1px solid ${ativa ? C.accent : C.border}`,
                  background: ativa ? C.accent + '18' : C.bgSecondary,
                  display: 'flex', alignItems: 'flex-start', gap: '10px', transition: 'all 0.15s',
                }}>
                  <div style={{ flexShrink: 0, marginTop: '2px' }}>
                    {ativa ? <CheckCircle2 size={16} color={C.accent} /> : <Circle size={16} color={C.textMuted} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: C.text }}>{f.function_name}</div>
                    <div style={{ fontSize: '11px', color: C.textMuted, marginTop: '2px' }}>{f.justificativa}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div onClick={() => setMostrarTodas(p => !p)} style={{
            display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
            fontSize: '12px', color: C.accent, marginBottom: '8px', userSelect: 'none',
          }}>
            {mostrarTodas ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {mostrarTodas ? 'Ocultar catálogo completo' : 'Ver todas as funções disponíveis'}
          </div>

          {mostrarTodas && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Object.entries(todasPorCategoria).map(([cat, funcoes]) => (
                <div key={cat}>
                  <div onClick={() => setCategoriaAberta(p => p === cat ? null : cat)} style={{
                    fontSize: '11px', fontWeight: '600', color: C.textMuted,
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px',
                  }}>
                    {categoriaAberta === cat ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    {CATEGORIA_LABELS[cat] || cat} ({funcoes.length})
                  </div>
                  {categoriaAberta === cat && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '8px' }}>
                      {funcoes.map(f => {
                        const ativa = funcoesSelecionadas.has(f.function_key);
                        return (
                          <div key={f.function_key} onClick={() => toggleFuncao(f.function_key)} style={{
                            padding: '8px 10px', borderRadius: '6px', cursor: 'pointer',
                            border: `1px solid ${ativa ? C.accent : C.border}`,
                            background: ativa ? C.accent + '15' : 'transparent',
                            display: 'flex', alignItems: 'center', gap: '8px',
                          }}>
                            {ativa ? <CheckCircle2 size={14} color={C.accent} /> : <Circle size={14} color={C.textMuted} />}
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: '500', color: C.text }}>{f.function_name}</div>
                              <div style={{ fontSize: '10px', color: C.textMuted }}>{f.short_description}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div style={{
            marginTop: '16px', padding: '10px', borderRadius: '8px',
            background: C.success + '18', border: `1px solid ${C.success}44`,
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <Zap size={14} color={C.success} />
            <span style={{ fontSize: '12px', color: C.success, fontWeight: '600' }}>
              {funcoesSelecionadas.size} função(ões) selecionada(s)
            </span>
          </div>

          {etapa === 'funcoes' && (
            <button onClick={avancarParaDados} disabled={isProcessing || funcoesSelecionadas.size === 0} style={{
              width: '100%', marginTop: '12px', padding: '12px',
              background: C.accent, color: 'white', border: 'none', borderRadius: '8px',
              fontSize: '14px', fontWeight: '600',
              cursor: funcoesSelecionadas.size === 0 ? 'not-allowed' : 'pointer',
              opacity: funcoesSelecionadas.size === 0 ? 0.5 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}>
              <Check size={16} />Confirmar e Continuar
            </button>
          )}
        </>
      )}

      {etapa === 'concluido' && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <CheckCircle2 size={48} color={C.success} style={{ margin: '0 auto 12px' }} />
          <div style={{ fontSize: '16px', fontWeight: '600', color: C.text, marginBottom: '8px' }}>Configuração concluída!</div>
          <div style={{ fontSize: '12px', color: C.textMuted, marginBottom: '16px' }}>minhai.app/ia/{slug}</div>
          <button onClick={() => { onConcluido?.(); onClose(); }} style={{
            width: '100%', padding: '12px', background: C.success, color: 'white',
            border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
          }}>
            Confira mais!
          </button>
        </div>
      )}
    </div>
  );

  // ── JSX input bar ─────────────────────────────────────────
  const inputBarJSX = (mobile = false) => (
    <div style={{ padding: mobile ? '12px 16px' : '16px', borderTop: `1px solid ${C.border}`, background: C.bg, flexShrink: 0 }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {!inputText.trim() && (
          <button onClick={handleMicPress} disabled={isProcessing || isTranscribing || etapa === 'concluido'} style={{
            width: mobile ? '44px' : '48px', height: mobile ? '44px' : '48px', borderRadius: '50%',
            background: voiceRecorder.isRecording ? '#ef4444' : C.accent,
            border: 'none', cursor: 'pointer', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
            opacity: (isProcessing || isTranscribing || etapa === 'concluido') ? 0.5 : 1,
          }}>
            <Mic size={18} className={voiceRecorder.isRecording ? 'animate-pulse' : ''} />
          </button>
        )}
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensagem(); } }}
          placeholder={etapa === 'concluido' ? 'Configuração concluída!' : 'Digite ou use o microfone...'}
          disabled={isProcessing || voiceRecorder.isRecording || isTranscribing || etapa === 'concluido'}
          style={{
            flex: 1, padding: '12px 16px',
            background: C.bgSecondary, border: `1px solid ${C.border}`,
            borderRadius: '24px', color: C.text, fontSize: '14px', outline: 'none',
          }}
        />
        {inputText.trim() && (
          <button onClick={enviarMensagem} disabled={isProcessing || etapa === 'concluido'} style={{
            width: mobile ? '44px' : '48px', height: mobile ? '44px' : '48px', borderRadius: '50%',
            background: C.accent, border: 'none', cursor: 'pointer', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
            opacity: isProcessing ? 0.5 : 1,
          }}>
            <Send size={16} />
          </button>
        )}
      </div>
      {voiceRecorder.isRecording && (
        <div style={{ marginTop: '8px', fontSize: '12px', color: '#ef4444', textAlign: 'center' }}>
          Gravando... clique novamente para enviar ({voiceRecorder.duration}s)
        </div>
      )}
      {isTranscribing && (
        <div style={{ marginTop: '8px', fontSize: '12px', color: C.accent, textAlign: 'center' }}>Transcrevendo...</div>
      )}
    </div>
  );

  // ── JSX mensagens ─────────────────────────────────────────
  const mensagensJSX = (fontSize: string, maxWidth: string, padding: string) => (
    <>
      {messages.map(msg => (
        <div key={msg.id} style={{
          alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
          maxWidth, padding, borderRadius: '12px',
          background: msg.role === 'user' ? C.userBubble : C.assistantBubble,
          color: msg.role === 'user' ? 'white' : C.text,
          fontSize, lineHeight: '1.4',
        }}>
          {msg.content}
        </div>
      ))}
      {(isProcessing || isSaving) && (
        <div style={{
          alignSelf: 'flex-start', padding, borderRadius: '12px',
          background: C.assistantBubble, display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <Loader2 size={14} className="animate-spin" color={C.accent} />
          <span style={{ fontSize, color: C.text }}>{isSaving ? 'Aplicando...' : 'Processando...'}</span>
        </div>
      )}
      <div ref={messagesEndRef} />
    </>
  );

  // ── RENDER MOBILE ─────────────────────────────────────────
  if (isMobile) {
    return createPortal(
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: C.bg, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bot size={20} color={C.accent} />
            <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: C.text, margin: 0 }}>Configurar Assistente</h2>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={toggleMute} style={{ padding: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: audioMutado ? C.textMuted : C.accent }}>
              {audioMutado ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <button onClick={onClose} style={{ padding: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: C.textMuted }}>
              <X size={20} />
            </button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>
          {mensagensJSX('13px', '85%', '10px 14px')}
        </div>
        {etapa !== 'ramo' && (
          <div style={{ maxHeight: '40vh', overflowY: 'auto', borderTop: `1px solid ${C.border}`, background: C.bgSecondary, flexShrink: 0 }}>
            {painelPreviewJSX}
          </div>
        )}
        {inputBarJSX(true)}
      </div>,
      document.body
    );
  }

  // ── RENDER DESKTOP ────────────────────────────────────────
  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)', padding: '20px',
    }}>
      <div style={{
        width: '100%', maxWidth: '1100px', height: '90vh',
        background: C.bg, borderRadius: '16px',
        border: `1px solid ${C.border}`,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ padding: '20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Bot size={24} color={C.accent} />
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: C.text, margin: 0 }}>Assistente de Configuração</h2>
              <p style={{ fontSize: '13px', color: C.textMuted, margin: 0 }}>
                {etapa === 'ramo' && 'Conte-me sobre sua empresa'}
                {etapa === 'funcoes' && 'Selecione as funções desejadas'}
                {etapa === 'dados' && 'Coletando informações da empresa'}
                {etapa === 'concluido' && 'Configuração concluída!'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <button onClick={toggleMute} style={{ padding: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: audioMutado ? C.textMuted : C.accent }}>
              {audioMutado ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <button onClick={onClose} style={{ padding: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: C.textMuted }}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1px', background: C.border, overflow: 'hidden' }}>
          <div style={{ background: C.bgChat, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', minHeight: 0 }}>
              {mensagensJSX('14px', '70%', '12px 16px')}
            </div>
            {inputBarJSX(false)}
          </div>
          <div style={{ background: C.bg, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px 8px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: C.text }}>Configuração do Assistente</div>
            </div>
            {painelPreviewJSX}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
