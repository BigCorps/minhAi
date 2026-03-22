'use client';

// =========================================================
// SetupAssistantChat.tsx
// Caminho: components/dashboard/SetupAssistantChat.tsx
//
// Bot conversacional para configuração de assistentes.
// Padrão visual do FichaConversacionalDisplay:
// - Chat à esquerda (voz + texto + mute)
// - Painel direito: funções recomendadas + catálogo completo
// - Modal via createPortal
//
// Fluxo:
// 1. Assistente já foi criado → recebe companyId e slug
// 2. Bot pergunta ramo → recomenda funções
// 3. Usuário ativa/desativa por voz, texto ou clique visual
// 4. Bot coleta dados necessários (WhatsApp, endereço, etc.)
// 5. Chama /api/setup/apply → conclui
// =========================================================

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { useIsMobile } from '@/hooks/useIsMobile';
import {
  Loader2, Send, Mic, X, Check, ChevronDown, ChevronUp,
  Volume2, VolumeX, Bot, Zap, CheckCircle2, Circle,
} from 'lucide-react';

// ── Tipos ─────────────────────────────────────────────────

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

// ── Labels de categoria ───────────────────────────────────

const CATEGORIA_LABELS: Record<string, string> = {
  contact:      'Contato',
  payment:      'Pagamentos',
  ai_assistant: 'IA & Assistente',
  information:  'Informações',
  video:        'Vídeos',
  productivity: 'Produtividade',
  schedule:     'Agendamentos',
  services:     'Serviços',
  knowledge:    'Consultas',
  codes:        'Leitura de Códigos',
  images:       'Imagens',
  utylities:    'Utilitários',
  configuration:'Configuração',
  payment_methods: 'Métodos de Pagamento',
};

// ── Campos de dados da empresa que o bot pode coletar ─────

const CAMPOS_DADOS = [
  { key: 'whatsapp_number',      label: 'WhatsApp',           pergunta: 'Qual o número do WhatsApp da empresa? (com DDD, ex: 11999998888)' },
  { key: 'instagram_username',   label: 'Instagram',          pergunta: 'Qual o @ do Instagram? (sem o @)' },
  { key: 'business_address',     label: 'Endereço',           pergunta: 'Qual o endereço completo da empresa?' },
  { key: 'business_hours',       label: 'Horário',            pergunta: 'Qual o horário de funcionamento?' },
  { key: 'brand_description',    label: 'Sobre a empresa',    pergunta: 'Descreva brevemente a empresa em 1-2 frases.' },
  { key: 'website',              label: 'Site',               pergunta: 'Qual o endereço do site? (ex: www.minhaempresa.com.br)' },
  { key: 'email_contato',        label: 'E-mail',             pergunta: 'Qual o e-mail de contato da empresa?' },
  { key: 'receiving_pix_key',    label: 'Chave PIX',          pergunta: 'Qual a chave PIX para receber pagamentos?' },
  { key: 'greeting_message',     label: 'Saudação',           pergunta: 'Qual mensagem de boas-vindas o assistente deve usar?' },
  { key: 'wake_word',            label: 'Palavra de ativação', pergunta: 'Qual palavra ou frase ativa o assistente? (padrão: "Ei Assistente")' },
];

// Funções que requerem dados específicos
const FUNCAO_REQUER_DADO: Record<string, string[]> = {
  qrcode_whatsapp: ['whatsapp_number'],
  qrcode_instagram: ['instagram_username'],
  qrcode_website: ['website'],
  qrcode_email: ['email_contato'],
  endereco: ['business_address'],
  nossa_marca: ['brand_description', 'business_hours'],
  pix_generate: ['receiving_pix_key'],
  pix_confirm: ['receiving_pix_key'],
};

// ── Componente principal ──────────────────────────────────

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
  const isMobile = useIsMobile();
  const voiceRecorder = useVoiceRecorder();

  // ── States ──────────────────────────────────────────────
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

  // ── Refs ─────────────────────────────────────────────────
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);
  const hasStartedRef = useRef(false);

  // ── Colors ───────────────────────────────────────────────
  const C = {
    bg:             isDark ? '#1e293b' : '#ffffff',
    bgSecondary:    isDark ? '#334155' : '#f8fafc',
    bgChat:         isDark ? '#0f172a' : '#f1f5f9',
    text:           isDark ? '#f1f5f9' : '#0f172a',
    textMuted:      isDark ? '#94a3b8' : '#64748b',
    border:         isDark ? '#475569' : '#e2e8f0',
    accent:         '#3b82f6',
    success:        '#22c55e',
    userBubble:     isDark ? '#3b82f6' : '#2563eb',
    assistantBubble:isDark ? '#334155' : '#e2e8f0',
  };

  // ── Áudio ────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    setAudioMutado(prev => {
      audioMutadoRef.current = !prev;
      return !prev;
    });
  }, []);

  const playTextSafe = useCallback(async (text: string) => {
    if (audioMutadoRef.current) return;
    audioQueueRef.current.push(text);
    if (isPlayingRef.current) return;
    while (audioQueueRef.current.length > 0) {
      isPlayingRef.current = true;
      const next = audioQueueRef.current.shift();
      if (next) {
        try {
          await playText(next);
          await new Promise(r => setTimeout(r, 300));
        } catch (err) { console.error('Erro ao falar:', err); }
      }
    }
    isPlayingRef.current = false;
  }, [playText]);

  // ── Auto-scroll ──────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Mensagem inicial ─────────────────────────────────────
  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    const msg = `Olá! Sou seu assistente de configuração. Vou te ajudar a configurar o "${companyName}" em poucos minutos. Para começar, qual é o ramo de atividade da sua empresa? Por exemplo: pizzaria, clínica, salão de beleza, loja de roupas...`;

    addAssistantMessage(msg);
    playTextSafe(msg);
  }, []);

  // ── Helpers de mensagem ──────────────────────────────────
  function addAssistantMessage(content: string) {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'assistant',
      content,
      timestamp: new Date(),
    }]);
  }

  function addUserMessage(content: string) {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    }]);
  }

  // ── Gravar áudio ─────────────────────────────────────────
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
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audio: base64Audio }),
        });
        if (response.ok) {
          const { text } = await response.json();
          if (text?.trim()) processarInput(text.trim());
        }
      } catch (err) {
        console.error('Erro transcrição:', err);
      } finally {
        setIsTranscribing(false);
      }
    } else {
      await voiceRecorder.startRecording();
    }
  };

  // ── Processar input do usuário ───────────────────────────
  const processarInput = async (texto: string) => {
    if (!texto.trim() || isProcessing) return;
    addUserMessage(texto);

    if (etapa === 'ramo') {
      await processarRamo(texto);
    } else if (etapa === 'funcoes') {
      await processarComandoFuncoes(texto);
    } else if (etapa === 'dados' && campoAtual) {
      await processarDado(texto);
    }
  };

  const enviarMensagem = () => {
    if (!inputText.trim() || isProcessing) return;
    processarInput(inputText);
    setInputText('');
  };

  // ── Etapa 1: Processar ramo ──────────────────────────────
  const processarRamo = async (ramoInformado: string) => {
    setIsProcessing(true);
    setRamo(ramoInformado);

    const loadingMsg = `Ótimo! Analisando as melhores funções para "${ramoInformado}"...`;
    addAssistantMessage(loadingMsg);
    playTextSafe(loadingMsg);

    try {
      const response = await fetch('/api/setup/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ramo: ramoInformado, companyId }),
      });

      if (!response.ok) throw new Error('Erro ao buscar recomendações');
      const data = await response.json();

      setRecomendadas(data.recomendadas || []);
      setTodasPorCategoria(data.todas_por_categoria || {});

      // Pré-selecionar as recomendadas
      const preSelected = new Set<string>(
        (data.recomendadas || []).map((f: FuncaoRecomendada) => f.function_key)
      );
      setFuncoesSelecionadas(preSelected);

      setEtapa('funcoes');

      const count = data.recomendadas?.length || 0;
      const resposta = `${data.mensagem} Encontrei ${count} funções recomendadas para você, já marcadas no painel ao lado. Você pode ativar ou desativar qualquer uma clicando nelas, ou me dizer o que quer mudar. Quando estiver pronto, diga "confirmar" ou "continuar".`;
      addAssistantMessage(resposta);
      playTextSafe(resposta);

    } catch (err) {
      console.error('Erro ao recomendar:', err);
      addAssistantMessage('Desculpe, tive um problema ao buscar as recomendações. Pode tentar novamente?');
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Etapa 2: Comandos sobre funções ─────────────────────
  const processarComandoFuncoes = async (texto: string) => {
    const lower = texto.toLowerCase();

    // Confirmar e avançar
    if (/confirmar|continuar|próximo|pronto|ok|tudo bem|salvar|avançar/.test(lower)) {
      await avancarParaDados();
      return;
    }

    // Ativar tudo
    if (/ativa(r)? tudo|ativar todas|quero tudo|selecionar tudo/.test(lower)) {
      const todas = new Set<string>();
      Object.values(todasPorCategoria).flat().forEach(f => todas.add(f.function_key));
      setFuncoesSelecionadas(todas);
      const msg = `Todas as funções foram selecionadas! Diga "confirmar" quando quiser continuar.`;
      addAssistantMessage(msg);
      playTextSafe(msg);
      return;
    }

    // Desativar tudo
    if (/desativa(r)? tudo|remove(r)? tudo|limpar tudo/.test(lower)) {
      setFuncoesSelecionadas(new Set());
      const msg = `Todas as funções foram desmarcadas. Você pode ativar individualmente clicando no painel ou me dizendo o nome da função.`;
      addAssistantMessage(msg);
      playTextSafe(msg);
      return;
    }

    // Tentar identificar função por nome no texto
    const todasFuncoes = Object.values(todasPorCategoria).flat();
    let funcaoEncontrada: FuncaoCategoria | undefined;

    for (const f of todasFuncoes) {
      if (lower.includes(f.function_name.toLowerCase()) ||
          lower.includes(f.function_key.replace(/_/g, ' '))) {
        funcaoEncontrada = f;
        break;
      }
    }

    if (funcaoEncontrada) {
      const ativar = /ativa(r)?|add|adiciona(r)?|quero/.test(lower) ||
                    !(/desativa(r)?|remove(r)?|tira(r)?|sem/.test(lower));
      toggleFuncao(funcaoEncontrada.function_key, ativar);
      const acao = ativar ? 'ativada' : 'desativada';
      const msg = `"${funcaoEncontrada.function_name}" foi ${acao}! Mais alguma alteração ou quer confirmar?`;
      addAssistantMessage(msg);
      playTextSafe(msg);
      return;
    }

    // Não entendeu
    const msg = `Não entendi bem. Você pode clicar nas funções no painel ao lado, ou me dizer o nome da função que quer ativar ou desativar. Quando estiver pronto, diga "confirmar".`;
    addAssistantMessage(msg);
    playTextSafe(msg);
  };

  // ── Toggle visual de função ──────────────────────────────
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

  // ── Avançar para coleta de dados ─────────────────────────
  const avancarParaDados = async () => {
    // Descobrir quais campos são necessários pelas funções selecionadas
    const camposNec: string[] = [];
    for (const fk of funcoesSelecionadas) {
      const requeridos = FUNCAO_REQUER_DADO[fk] || [];
      for (const campo of requeridos) {
        if (!camposNec.includes(campo) && !dadosEmpresa[campo]) {
          camposNec.push(campo);
        }
      }
    }

    // Sempre perguntar pelo menos saudação e horário
    if (!camposNec.includes('business_hours') && !dadosEmpresa['business_hours']) {
      camposNec.push('business_hours');
    }
    if (!camposNec.includes('brand_description') && !dadosEmpresa['brand_description']) {
      camposNec.push('brand_description');
    }

    setCamposNecessarios(camposNec);

    const totalSelecionadas = funcoesSelecionadas.size;
    const msg = `Perfeito! ${totalSelecionadas} função(ões) selecionada(s). Agora vou coletar alguns dados para configurar tudo corretamente.`;
    addAssistantMessage(msg);
    playTextSafe(msg);

    setEtapa('dados');

    if (camposNec.length > 0) {
      await perguntarProximoCampo(camposNec, 0);
    } else {
      await concluirSetup();
    }
  };

  // ── Perguntar próximo campo de dados ─────────────────────
  const perguntarProximoCampo = async (campos: string[], indice: number) => {
    if (indice >= campos.length) {
      await concluirSetup();
      return;
    }

    const campo = campos[indice];
    const campoDef = CAMPOS_DADOS.find(c => c.key === campo);
    if (!campoDef) {
      await perguntarProximoCampo(campos, indice + 1);
      return;
    }

    setCampoAtual(campo);
    const pergunta = `${campoDef.pergunta} (ou diga "pular" para deixar em branco)`;
    addAssistantMessage(pergunta);
    playTextSafe(pergunta);
  };

  // ── Processar resposta de dado ───────────────────────────
  const processarDado = async (valor: string) => {
    if (!campoAtual) return;

    const indiceAtual = camposNecessarios.indexOf(campoAtual);

    if (!/pular|skip|não sei|nao sei|depois|não tenho|nao tenho/.test(valor.toLowerCase())) {
      setDadosEmpresa(prev => ({ ...prev, [campoAtual]: valor }));
    }

    setCampoAtual(null);
    await perguntarProximoCampo(camposNecessarios, indiceAtual + 1);
  };

  // ── Concluir setup ───────────────────────────────────────
  const concluirSetup = async () => {
    setIsSaving(true);
    const msg = 'Aplicando todas as configurações...';
    addAssistantMessage(msg);
    playTextSafe(msg);

    try {
      const functions = Array.from(funcoesSelecionadas).map(fk => ({
        function_key: fk,
        enabled: true,
      }));

      const response = await fetch('/api/setup/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          functions,
          companyData: dadosEmpresa,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setEtapa('concluido');
        const msgFinal = `Tudo configurado! Seu assistente "${companyName}" está pronto com ${funcoesSelecionadas.size} função(ões) ativa(s). Acesse agora em eai.app.br/ia/${slug}`;
        addAssistantMessage(msgFinal);
        playTextSafe(msgFinal);
      } else {
        addAssistantMessage(`Configuração aplicada com alguns problemas: ${data.message}. Você pode ajustar manualmente no dashboard.`);
        setEtapa('concluido');
      }
    } catch (err) {
      console.error('Erro ao aplicar:', err);
      addAssistantMessage('Ocorreu um erro ao salvar. Tente novamente ou configure manualmente no dashboard.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Painel direito: Preview ──────────────────────────────
  const PainelPreview = () => (
    <div style={{ overflowY: 'auto', padding: '20px', height: '100%' }}>

      {/* Info do assistente */}
      <div style={{ marginBottom: '16px', padding: '12px', background: C.bgSecondary, borderRadius: '8px', border: `1px solid ${C.border}` }}>
        <div style={{ fontSize: '11px', color: C.textMuted, marginBottom: '4px' }}>Assistente</div>
        <div style={{ fontSize: '15px', fontWeight: '600', color: C.text }}>{companyName}</div>
        {ramo && <div style={{ fontSize: '12px', color: C.accent, marginTop: '2px' }}>{ramo}</div>}
        <div style={{ fontSize: '11px', color: C.textMuted, marginTop: '4px' }}>eai.app.br/ia/{slug}</div>
      </div>

      {/* Funções selecionadas */}
      {etapa !== 'ramo' && (
        <>
          <div style={{ fontSize: '11px', fontWeight: '600', color: C.textMuted, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Funções Recomendadas ({recomendadas.length})
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
            {recomendadas.map(f => {
              const ativa = funcoesSelecionadas.has(f.function_key);
              return (
                <div
                  key={f.function_key}
                  onClick={() => toggleFuncao(f.function_key)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${ativa ? C.accent : C.border}`,
                    background: ativa ? C.accent + '18' : C.bgSecondary,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ flexShrink: 0, marginTop: '2px' }}>
                    {ativa
                      ? <CheckCircle2 size={16} color={C.accent} />
                      : <Circle size={16} color={C.textMuted} />
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: C.text }}>{f.function_name}</div>
                    <div style={{ fontSize: '11px', color: C.textMuted, marginTop: '2px' }}>{f.justificativa}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Catálogo completo (expansível) */}
          <div
            onClick={() => setMostrarTodas(p => !p)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
              fontSize: '12px', color: C.accent, marginBottom: '8px', userSelect: 'none',
            }}
          >
            {mostrarTodas ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {mostrarTodas ? 'Ocultar catálogo completo' : 'Ver todas as funções disponíveis'}
          </div>

          {mostrarTodas && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Object.entries(todasPorCategoria).map(([cat, funcoes]) => (
                <div key={cat}>
                  <div
                    onClick={() => setCategoriaAberta(p => p === cat ? null : cat)}
                    style={{
                      fontSize: '11px', fontWeight: '600', color: C.textMuted,
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                      marginBottom: '4px',
                    }}
                  >
                    {categoriaAberta === cat ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    {CATEGORIA_LABELS[cat] || cat} ({funcoes.length})
                  </div>

                  {categoriaAberta === cat && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '8px' }}>
                      {funcoes.map(f => {
                        const ativa = funcoesSelecionadas.has(f.function_key);
                        return (
                          <div
                            key={f.function_key}
                            onClick={() => toggleFuncao(f.function_key)}
                            style={{
                              padding: '8px 10px', borderRadius: '6px',
                              border: `1px solid ${ativa ? C.accent : C.border}`,
                              background: ativa ? C.accent + '15' : 'transparent',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                            }}
                          >
                            {ativa
                              ? <CheckCircle2 size={14} color={C.accent} />
                              : <Circle size={14} color={C.textMuted} />
                            }
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

          {/* Contador */}
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

          {/* Botão confirmar */}
          {etapa === 'funcoes' && (
            <button
              onClick={avancarParaDados}
              disabled={isProcessing || funcoesSelecionadas.size === 0}
              style={{
                width: '100%', marginTop: '12px', padding: '12px',
                background: C.accent, color: 'white', border: 'none',
                borderRadius: '8px', fontSize: '14px', fontWeight: '600',
                cursor: funcoesSelecionadas.size === 0 ? 'not-allowed' : 'pointer',
                opacity: funcoesSelecionadas.size === 0 ? 0.5 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
            >
              <Check size={16} />
              Confirmar e Continuar
            </button>
          )}
        </>
      )}

      {/* Etapa concluído */}
      {etapa === 'concluido' && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <CheckCircle2 size={48} color={C.success} style={{ margin: '0 auto 12px' }} />
          <div style={{ fontSize: '16px', fontWeight: '600', color: C.text, marginBottom: '8px' }}>
            Configuração concluída!
          </div>
          <div style={{ fontSize: '12px', color: C.textMuted, marginBottom: '16px' }}>
            eai.app.br/ia/{slug}
          </div>
          <button
            onClick={() => { onConcluido?.(); onClose(); }}
            style={{
              width: '100%', padding: '12px', background: C.success,
              color: 'white', border: 'none', borderRadius: '8px',
              fontSize: '14px', fontWeight: '600', cursor: 'pointer',
            }}
          >
            Ir para o Dashboard
          </button>
        </div>
      )}
    </div>
  );

  // ── Input bar ─────────────────────────────────────────────
  const InputBar = ({ mobile = false }: { mobile?: boolean }) => (
    <div style={{ padding: mobile ? '12px 16px' : '16px', borderTop: `1px solid ${C.border}`, background: C.bg, flexShrink: 0 }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {!inputText.trim() && (
          <button
            onMouseDown={!mobile ? handleMicPress : undefined}
            onClick={mobile ? handleMicPress : undefined}
            disabled={isProcessing || isTranscribing || etapa === 'concluido'}
            style={{
              width: mobile ? '44px' : '48px', height: mobile ? '44px' : '48px',
              borderRadius: '50%',
              background: voiceRecorder.isRecording ? '#ef4444' : C.accent,
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
              opacity: (isProcessing || isTranscribing || etapa === 'concluido') ? 0.5 : 1,
            }}
          >
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
            borderRadius: '24px', color: C.text, fontSize: '14px',
            outline: 'none',
          }}
        />

        {inputText.trim() && (
          <button
            onClick={enviarMensagem}
            disabled={isProcessing || etapa === 'concluido'}
            style={{
              width: mobile ? '44px' : '48px', height: mobile ? '44px' : '48px',
              borderRadius: '50%', background: C.accent, border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', opacity: isProcessing ? 0.5 : 1,
            }}
          >
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
        <div style={{ marginTop: '8px', fontSize: '12px', color: C.accent, textAlign: 'center' }}>
          Transcrevendo...
        </div>
      )}
    </div>
  );

  // ── RENDER MOBILE ─────────────────────────────────────────
  if (isMobile) {
    return createPortal(
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: C.bg, display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bot size={20} color={C.accent} />
            <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: C.text }}>Configurar Assistente</h2>
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

        {/* Chat */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>
          {messages.map(msg => (
            <div key={msg.id} style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%', padding: '10px 14px', borderRadius: '12px',
              background: msg.role === 'user' ? C.userBubble : C.assistantBubble,
              color: msg.role === 'user' ? 'white' : C.text,
              fontSize: '13px', lineHeight: '1.4',
            }}>
              {msg.content}
            </div>
          ))}
          {(isProcessing || isSaving) && (
            <div style={{ alignSelf: 'flex-start', padding: '10px 14px', borderRadius: '12px', background: C.assistantBubble, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Loader2 size={14} className="animate-spin" color={C.accent} />
              <span style={{ fontSize: '13px', color: C.text }}>Processando...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Painel preview (colapsado mobile) */}
        {etapa !== 'ramo' && (
          <div style={{ maxHeight: '40vh', overflowY: 'auto', borderTop: `1px solid ${C.border}`, background: C.bgSecondary, flexShrink: 0 }}>
            <PainelPreview />
          </div>
        )}

        <InputBar mobile />
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

        {/* Header */}
        <div style={{
          padding: '20px', borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
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
            <button onClick={toggleMute} style={{ padding: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: audioMutado ? C.textMuted : C.accent }} title={audioMutado ? 'Ativar áudio' : 'Desativar áudio'}>
              {audioMutado ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <button onClick={onClose} style={{ padding: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: C.textMuted }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Conteúdo — 2 colunas */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1px', background: C.border, overflow: 'hidden' }}>

          {/* CHAT */}
          <div style={{ background: C.bgChat, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', minHeight: 0 }}>
              {messages.map(msg => (
                <div key={msg.id} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '70%', padding: '12px 16px', borderRadius: '12px',
                    background: msg.role === 'user' ? C.userBubble : C.assistantBubble,
                    color: msg.role === 'user' ? 'white' : C.text,
                    fontSize: '14px', lineHeight: '1.5',
                  }}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {(isProcessing || isSaving) && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ padding: '12px 16px', borderRadius: '12px', background: C.assistantBubble, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Loader2 size={16} className="animate-spin" color={C.accent} />
                    <span style={{ color: C.text }}>{isSaving ? 'Aplicando configurações...' : 'Processando...'}</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <InputBar />
          </div>

          {/* PAINEL DIREITO */}
          <div style={{ background: C.bg, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px 8px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: C.text }}>Configuração do Assistente</div>
            </div>
            <PainelPreview />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
