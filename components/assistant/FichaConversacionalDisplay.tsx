// =========================================================
// FASE H - CONVERSAÇÃO IA FULL (v7 - Fix foco + mute)
// Arquivo: components/assistant/FichaConversacionalDisplay.tsx
// =========================================================
// ✅ v5: selectedTags, TagSelector, compatibilidade tags
// ✅ v6: playTextSafe (fila anti-duplicação), audioMutado,
//        comando salvar por voz, scroll, fix custo zerado
// ✅ v7: InputArea removido como inner component (causava
//        perda de foco a cada keystroke por remount do input)
//        audioMutadoRef para mute funcionar em callbacks
//        playTextComMute garante que prop playText tbm respeita mute
// =========================================================

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase-browser';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import {
  Loader2, Send, Mic, X, Plus, Trash2,
  ChefHat, Beaker, ClipboardList,
  Package, DollarSign,
} from 'lucide-react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { ProducaoTag } from '@/lib/types/producao';
import TagSelector from '@/components/producao/TagSelector';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ItemFicha {
  id: string;
  nome: string;
  quantidade: number;
  unidade: string;
  preco_unitario?: number;
  perda_percentual: number;
  preco_estimado?: boolean;
}

interface FichaPreview {
  nome: string;
  categoria: string;
  rendimento_qtd: number;
  rendimento_unid: string;
  preco_venda?: number;
  itens: ItemFicha[];
}

interface FichaConversacionalDisplayProps {
  data: {
    companyId: string;
    fichaType?: 'produto' | 'preparo';
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText: (text: string) => Promise<void>;
}

function getInitialTags(type: 'produto' | 'preparo'): ProducaoTag[] {
  if (type === 'preparo') return ['função:preparo', 'origem:produzido'];
  return ['função:produto', 'vendável:sim', 'origem:produzido'];
}

const TAG_OPTIONS = [
  { tag: 'função:produto' as ProducaoTag, label: 'Produto',  icon: ChefHat,    group: 'função'   as const },
  { tag: 'função:preparo' as ProducaoTag, label: 'Preparo',  icon: Beaker,     group: 'função'   as const },
  { tag: 'função:combo'   as ProducaoTag, label: 'Combo',    icon: Package,    group: 'função'   as const },
  { tag: 'vendável:sim'   as ProducaoTag, label: 'Vendável', icon: DollarSign, group: 'vendável' as const },
];

// ✅ v6: ícones SVG inline para volume (sem dependência extra)
function IconVolume() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </svg>
  );
}

function IconVolumeMute() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
    </svg>
  );
}

export default function FichaConversacionalDisplay({
  data,
  onClose,
  theme = 'dark',
  playText,
}: FichaConversacionalDisplayProps) {
  const { companyId, fichaType: initialFichaType = 'produto' } = data;
  const isDark = theme === 'dark';
  const isMobile = useIsMobile();
  const supabase = createClient();

  const voiceRecorder = useVoiceRecorder();

  const [selectedTags, setSelectedTags] = useState<ProducaoTag[]>(
    getInitialTags(initialFichaType)
  );
  const isFichaPreparo = selectedTags.includes('função:preparo');

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioMutado, setAudioMutado] = useState(false); // ✅ v6
  // ✅ v7: ref espelha o state para callbacks sempre terem o valor atual
  const audioMutadoRef = useRef(false);

  const toggleMute = useCallback(() => {
    setAudioMutado(prev => {
      audioMutadoRef.current = !prev;
      return !prev;
    });
  }, []);

  const [fichaPreview, setFichaPreview] = useState<FichaPreview>({
    nome: '',
    categoria: '',
    rendimento_qtd: 1,
    rendimento_unid: 'unidades',
    itens: [],
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isActiveRef = useRef(true);
  const previewRef = useRef<HTMLDivElement>(null);
  const hasSpokenInitialRef = useRef(false);

  // ✅ v6: refs para fila de áudio anti-duplicação
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);

  const C = {
    bg: isDark ? '#1e293b' : '#ffffff',
    bgSecondary: isDark ? '#334155' : '#f8fafc',
    bgChat: isDark ? '#0f172a' : '#f1f5f9',
    text: isDark ? '#f1f5f9' : '#0f172a',
    textMuted: isDark ? '#94a3b8' : '#64748b',
    border: isDark ? '#475569' : '#e2e8f0',
    accent: '#3b82f6',
    success: '#22c55e',
    userBubble: isDark ? '#3b82f6' : '#2563eb',
    assistantBubble: isDark ? '#334155' : '#e2e8f0',
  };

  // ✅ v7: playTextComMute — wrapper da prop playText que respeita o mute via ref
  // Necessário porque o playText (Google TTS) é externo e não sabe do audioMutado
  const playTextComMute = useCallback(async (text: string) => {
    if (audioMutadoRef.current) return;
    return playText(text);
  }, [playText]);

  // ✅ v6/v7: playTextSafe — fila anti-duplicação, usa playTextComMute internamente
  // Usa audioMutadoRef.current (ref) em vez de audioMutado (state) para evitar stale closure
  const playTextSafe = useCallback(async (text: string) => {
    if (audioMutadoRef.current) return;

    audioQueueRef.current.push(text);
    if (isPlayingRef.current) return;

    while (audioQueueRef.current.length > 0) {
      isPlayingRef.current = true;
      const next = audioQueueRef.current.shift();
      if (next) {
        try {
          await playTextComMute(next);
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (err) {
          console.error('Erro ao falar:', err);
        }
      }
    }
    isPlayingRef.current = false;
  }, [playTextComMute]);

  // ══════════════════════════════════════════════════════
  // MENSAGEM INICIAL
  // ══════════════════════════════════════════════════════
  useEffect(() => {
    if (hasSpokenInitialRef.current) return;
    hasSpokenInitialRef.current = true;

    const mensagemInicial = isFichaPreparo
      ? 'Olá! Vamos criar uma ficha de preparo. Me diga o nome do ingrediente que você quer produzir e os ingredientes necessários.'
      : 'Olá! Vamos criar uma ficha de produção. Me diga o nome do produto e os ingredientes.';

    setMessages([{
      id: Date.now().toString(),
      role: 'assistant',
      content: mensagemInicial,
      timestamp: new Date(),
    }]);

    playTextSafe(mensagemInicial);

    return () => { isActiveRef.current = false; };
  }, []);

  // Atualizar mensagem ao trocar tag de função
  useEffect(() => {
    if (!hasSpokenInitialRef.current) return;

    const novaMensagem = isFichaPreparo
      ? 'Vamos criar uma ficha de preparo. Me diga o ingrediente que você quer produzir.'
      : 'Vamos criar um produto final. Me diga o nome do produto.';

    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'assistant',
      content: novaMensagem,
      timestamp: new Date(),
    }]);
  }, [isFichaPreparo]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ══════════════════════════════════════════════════════
  // GRAVAÇÃO DE VOZ
  // ══════════════════════════════════════════════════════
  const handleMicPress = async () => {
    if (voiceRecorder.isRecording) {
      setIsTranscribing(true);
      try {
        const audioBlob = await voiceRecorder.stopRecording();
        await transcreverAudio(audioBlob);
      } catch (error) {
        console.error('Erro ao parar gravação:', error);
      } finally {
        setIsTranscribing(false);
      }
    } else {
      await voiceRecorder.startRecording();
    }
  };

  const transcreverAudio = async (audioBlob: Blob) => {
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      const base64Audio = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      });

      const response = await fetch('/api/voice/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: base64Audio }),
      });

      if (!response.ok) throw new Error('Erro na transcrição');
      const { text } = await response.json();
      if (text && text.trim()) processarMensagem(text.trim());
    } catch (error) {
      console.error('Erro ao transcrever:', error);
      alert('Erro ao transcrever áudio. Tente novamente ou digite.');
    }
  };

  // ══════════════════════════════════════════════════════
  // PROCESSAR MENSAGEM
  // ══════════════════════════════════════════════════════
  const processarMensagem = async (textoUsuario: string) => {
    // ✅ v6: Detectar comando de salvar por voz/texto
    const comandoSalvar = /\b(salvar|salva|salve|finalizar|pronto|concluir)\b/i;
    if (comandoSalvar.test(textoUsuario)) {
      if (fichaPreview.nome && fichaPreview.itens.length > 0) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'user',
          content: textoUsuario,
          timestamp: new Date(),
        }]);
        await salvarFicha();
        return;
      }
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textoUsuario,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsProcessing(true);

    try {
      const response = await fetch('/api/voice/process-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          fichaAtual: fichaPreview,
          isFichaPreparo,
          selectedTags,
          companyId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Erro na API:', errorData);
        throw new Error(errorData.error || 'Erro ao processar');
      }

      const resultado = await response.json();

      // ✅ v6: log para debug de preços
      console.log('📊 Resposta da IA:', resultado);
      resultado.ficha?.itens?.forEach((item: ItemFicha, i: number) => {
        if (!item.preco_unitario || item.preco_unitario === 0)
          console.warn(`⚠️ Item ${i} "${item.nome}" sem preço:`, item);
      });

      setFichaPreview(resultado.ficha);

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: resultado.resposta,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
      playTextSafe(resultado.resposta);

      if (resultado.avisos?.length > 0) {
        setMessages(prev => [...prev, {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: resultado.avisos.join('\n'),
          timestamp: new Date(),
        }]);
      }

      if (resultado.completo && resultado.ficha.nome && resultado.ficha.itens.length > 0) {
        setTimeout(() => {
          const msgSalvar: Message = {
            id: (Date.now() + 3).toString(),
            role: 'assistant',
            content: 'A ficha está pronta! Quer salvar agora ou fazer algum ajuste?',
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, msgSalvar]);
          playTextSafe('A ficha está pronta! Quer salvar agora?');
        }, 1000);
      }

    } catch (err) {
      console.error('Erro ao processar mensagem:', err);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Desculpe, tive um problema ao processar. Pode repetir?',
        timestamp: new Date(),
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const enviarMensagem = () => {
    if (!inputText.trim() || isProcessing) return;
    processarMensagem(inputText);
    setInputText('');
  };

  // ══════════════════════════════════════════════════════
  // SALVAR FICHA
  // ══════════════════════════════════════════════════════
  const salvarFicha = async () => {
    // ✅ v6: Validar preços antes de salvar
    const itensSemPreco = fichaPreview.itens.filter(
      item => !item.preco_unitario || item.preco_unitario === 0
    );
    if (itensSemPreco.length > 0) {
      const nomes = itensSemPreco.map(i => i.nome).join(', ');
      alert(`⚠️ Os seguintes ingredientes não têm preço definido: ${nomes}\n\nPor favor, informe os preços antes de salvar.`);
      setIsSaving(false);
      return;
    }

    if (!fichaPreview.nome || fichaPreview.itens.length === 0) {
      alert('A ficha precisa ter nome e pelo menos um ingrediente');
      return;
    }

    setIsSaving(true);

    try {
      const { data: fichaData, error: fichaError } = await supabase
        .from('producao_fichas')
        .insert({
          company_id: companyId,
          nome: fichaPreview.nome,
          categoria: fichaPreview.categoria || 'Geral',
          rendimento_qtd: fichaPreview.rendimento_qtd,
          rendimento_unid: fichaPreview.rendimento_unid,
          is_ficha_preparo: isFichaPreparo,
          preco_venda: selectedTags.includes('vendável:sim') ? fichaPreview.preco_venda : null,
          tags: selectedTags,
        })
        .select()
        .single();

      if (fichaError) throw fichaError;

      // ✅ v6: Criar ingredientes novos COM conversão de unidade correta
      const ingredientesNovos = fichaPreview.itens.filter(item => item.preco_estimado);

      for (const item of ingredientesNovos) {
        const { data: existente } = await supabase
          .from('producao_ingredientes')
          .select('id')
          .eq('company_id', companyId)
          .ilike('nome', item.nome)
          .single();

        if (!existente) {
          // ✅ v6: converter g→kg e ml→L para preço base correto
          let precoBase = item.preco_unitario || 0;
          let unidadeBase = item.unidade;

          if (item.unidade === 'g') {
            precoBase = precoBase * 1000; // R$/g → R$/kg
            unidadeBase = 'kg';
          } else if (item.unidade === 'ml') {
            precoBase = precoBase * 1000; // R$/ml → R$/L
            unidadeBase = 'L';
          }

          console.log(`✅ Criando ingrediente: ${item.nome} - R$ ${precoBase.toFixed(2)}/${unidadeBase}`);

          const { error: ingError } = await supabase
            .from('producao_ingredientes')
            .insert({
              company_id: companyId,
              nome: item.nome,
              preco_por_unidade: precoBase,
              unidade: unidadeBase,
              tipo: 'direto',
            });

          if (ingError) console.error(`❌ Erro ao criar ingrediente ${item.nome}:`, ingError);
        }
      }

      // ✅ v6: aguardar criação antes de vincular itens
      await new Promise(resolve => setTimeout(resolve, 800));

      const itensParaInserir = await Promise.all(
        fichaPreview.itens.map(async (item) => {
          const { data: ing } = await supabase
            .from('producao_ingredientes')
            .select('id, preco_por_unidade')
            .eq('company_id', companyId)
            .ilike('nome', item.nome)
            .single();

          console.log(`Ingrediente ${item.nome}: ${ing ? `ID ${ing.id}, R$ ${ing.preco_por_unidade}` : 'NÃO ENCONTRADO'}`);

          return {
            ficha_id: fichaData.id,
            ingrediente_id: ing?.id || null,
            quantidade: item.quantidade,
            unidade: item.unidade,
            perda_percentual: item.perda_percentual || 0,
            preco_temp: ing ? null : item.preco_unitario,
          };
        })
      );

      const { error: itensError } = await supabase
        .from('producao_ficha_itens')
        .insert(itensParaInserir);

      if (itensError) throw itensError;

      await new Promise(resolve => setTimeout(resolve, 500));

      const { data: fichaCompleta } = await supabase
        .from('producao_fichas')
        .select('custo_total, preco_venda_sugerido')
        .eq('id', fichaData.id)
        .single();

      const msgSucesso: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Ficha "${fichaPreview.nome}" salva com sucesso! Custo total: R$ ${fichaCompleta?.custo_total?.toFixed(2) ?? '0,00'}. ${isFichaPreparo ? 'O ingrediente foi criado automaticamente.' : `Preço sugerido: R$ ${fichaCompleta?.preco_venda_sugerido?.toFixed(2) ?? '—'}.`} Quer criar outra ficha?`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, msgSucesso]);
      playTextSafe(msgSucesso.content);

      setFichaPreview({
        nome: '',
        categoria: '',
        rendimento_qtd: 1,
        rendimento_unid: 'unidades',
        itens: [],
      });

    } catch (err) {
      console.error('Erro ao salvar:', err);
      alert('Erro ao salvar ficha. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const removerIngrediente = (id: string) => {
    setFichaPreview(prev => ({
      ...prev,
      itens: prev.itens.filter(item => item.id !== id),
    }));
  };

  // ── Botão Mutar reutilizável ──────────────────────────────────────────────
  const BotaoMutar = () => (
    <button
      onClick={toggleMute}
      title={audioMutado ? 'Ativar áudio' : 'Desativar áudio'}
      style={{
        padding: '8px',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        color: audioMutado ? C.textMuted : C.accent,
        opacity: audioMutado ? 0.5 : 1,
        transition: 'all 0.2s',
      }}
    >
      {audioMutado ? <IconVolumeMute /> : <IconVolume />}
    </button>
  );

  // ── Preview da Ficha reutilizável ─────────────────────────────────────────
  const FichaPreviewContent = () => (
    <>
      {fichaPreview.nome && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', color: C.textMuted, marginBottom: '4px' }}>Nome</div>
          <div style={{ fontSize: '15px', fontWeight: '600', color: C.text }}>{fichaPreview.nome}</div>
        </div>
      )}

      {fichaPreview.categoria && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', color: C.textMuted, marginBottom: '4px' }}>Categoria</div>
          <div style={{ fontSize: '13px', color: C.text }}>{fichaPreview.categoria}</div>
        </div>
      )}

      {fichaPreview.rendimento_qtd > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', color: C.textMuted, marginBottom: '4px' }}>Rendimento</div>
          <div style={{ fontSize: '13px', color: C.text }}>
            {fichaPreview.rendimento_qtd} {fichaPreview.rendimento_unid}
          </div>
        </div>
      )}

      {selectedTags.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', color: C.textMuted, marginBottom: '6px' }}>Tags</div>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {selectedTags.map(tag => (
              <span key={tag} style={{
                padding: '2px 8px',
                background: C.accent + '33',
                color: C.accent,
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: '500',
              }}>
                {tag.split(':')[1]}
              </span>
            ))}
          </div>
        </div>
      )}

      {fichaPreview.itens.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', color: C.textMuted, marginBottom: '8px' }}>
            Ingredientes ({fichaPreview.itens.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {fichaPreview.itens.map((item) => (
              <div key={item.id} style={{
                padding: '10px',
                background: C.bgSecondary,
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: C.text }}>{item.nome}</div>
<div style={{ fontSize: '11px', color: C.textMuted, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
  {item.quantidade}{item.unidade} • R$
  <input
    type="number"
    step="0.01"
    min="0.001"
    value={item.preco_unitario ?? ''}
    onChange={(e) => {
      const novoPreco = parseFloat(e.target.value);
      if (isNaN(novoPreco)) return;
      setFichaPreview(prev => ({
        ...prev,
        itens: prev.itens.map(i =>
          i.id === item.id
            ? { ...i, preco_unitario: novoPreco, preco_estimado: false }
            : i
        ),
      }));
    }}
    style={{
      width: '64px',
      padding: '1px 4px',
      background: item.preco_estimado ? C.accent + '22' : C.bgSecondary,
      border: `1px solid ${item.preco_estimado ? C.accent : C.border}`,
      borderRadius: '4px',
      color: C.text,
      fontSize: '11px',
    }}
  />
  /{item.unidade}
  {item.preco_estimado && (
    <span style={{ color: C.accent }}>(estimado)</span>
  )}
</div>
                </div>
                <button
                  onClick={() => removerIngrediente(item.id)}
                  style={{ padding: '4px', background: 'transparent', border: 'none', cursor: 'pointer', color: C.textMuted }}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedTags.includes('vendável:sim') && fichaPreview.preco_venda && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', color: C.textMuted, marginBottom: '4px' }}>Preço de Venda</div>
          <div style={{ fontSize: '13px', color: C.text, fontFamily: 'monospace' }}>
            R$ {fichaPreview.preco_venda.toFixed(2)}
          </div>
        </div>
      )}

      {fichaPreview.nome && fichaPreview.itens.length > 0 && (
        <button
          onClick={salvarFicha}
          disabled={isSaving}
          style={{
            width: '100%',
            padding: '12px',
            background: C.success,
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            opacity: isSaving ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginTop: '16px',
          }}
        >
          {isSaving
            ? <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</>
            : <><Plus className="w-4 h-4" />Salvar Ficha</>
          }
        </button>
      )}

      {!fichaPreview.nome && fichaPreview.itens.length === 0 && (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: C.textMuted, fontSize: '13px' }}>
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>A ficha vai aparecer aqui conforme você conversa</p>
        </div>
      )}
    </>
  );

  // ── Input area: JSX inlined diretamente nos renders (mobile e desktop)
  // ✅ v7: NÃO definir como inner component aqui — causaria remount do <input>
  //        a cada keystroke (inputText muda → pai re-renderiza → novo componente
  //        → React desmonta/remonta o input → foco perdido)

  // ══════════════════════════════════════════════════════
  // RENDER MOBILE
  // ══════════════════════════════════════════════════════
  if (isMobile) {
    return createPortal(
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: C.bg,
        display: 'flex',
        flexDirection: 'column',
      }}>

        {/* Header Mobile */}
        <div style={{
          padding: '12px 16px',
          borderBottom: `1px solid ${C.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isFichaPreparo
              ? <Beaker className="w-5 h-5" style={{ color: C.accent }} />
              : <ChefHat className="w-5 h-5" style={{ color: C.accent }} />
            }
            <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: C.text }}>
              {isFichaPreparo ? 'Ficha de Preparo' : 'Ficha de Produção'}
            </h2>
          </div>
          {/* ✅ v6: botões mutar + fechar agrupados */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <BotaoMutar />
            <button
              onClick={onClose}
              style={{ padding: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: C.textMuted }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TagSelector Mobile */}
        <div style={{ padding: '10px 16px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <TagSelector tags={selectedTags} onChange={setSelectedTags} options={TAG_OPTIONS} theme={theme} />
        </div>

        {/* ✅ v6: Lista completa de mensagens com scroll (substitui "última mensagem" fixo) */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          minHeight: 0, // ✅ essencial para flex+scroll funcionar
        }}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                padding: '10px 14px',
                borderRadius: '12px',
                background: msg.role === 'user' ? C.userBubble : C.assistantBubble,
                color: msg.role === 'user' ? 'white' : C.text,
                fontSize: '13px',
                lineHeight: '1.4',
              }}
            >
              {msg.content}
            </div>
          ))}

          {isProcessing && (
            <div style={{
              alignSelf: 'flex-start',
              padding: '10px 14px',
              borderRadius: '12px',
              background: C.assistantBubble,
              color: C.text,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span style={{ fontSize: '13px' }}>Processando...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Preview colapsável com scroll próprio */}
        <div ref={previewRef} style={{
          maxHeight: '35vh',
          overflowY: 'auto',
          padding: '12px 16px',
          background: C.bgSecondary,
          borderTop: `1px solid ${C.border}`,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <ClipboardList className="w-4 h-4" style={{ color: C.accent }} />
            <h3 style={{ fontSize: '13px', fontWeight: '600', color: C.text }}>Preview da Ficha</h3>
          </div>
          <FichaPreviewContent />
        </div>

        {/* ✅ v7: Input inlined diretamente — NÃO extrair como inner component */}
        <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}`, background: C.bg, flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {!inputText.trim() && (
              <button
                onTouchStart={handleMicPress}
                onMouseDown={handleMicPress}
                disabled={isProcessing || isTranscribing}
                style={{
                  width: '44px', height: '44px', borderRadius: '50%',
                  background: voiceRecorder.isRecording ? '#ef4444' : C.accent,
                  border: 'none', cursor: (isProcessing || isTranscribing) ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', transition: 'all 0.1s ease',
                  transform: voiceRecorder.isRecording ? 'scale(1.1)' : 'scale(1)',
                }}
              >
                <Mic className={`w-5 h-5 ${voiceRecorder.isRecording ? 'animate-pulse' : ''}`} />
              </button>
            )}
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensagem(); } }}
              placeholder="Digite ou toque no microfone..."
              disabled={isProcessing || voiceRecorder.isRecording || isTranscribing}
              style={{ flex: 1, padding: '12px', background: C.bgSecondary, border: `1px solid ${C.border}`, borderRadius: '22px', color: C.text, fontSize: '14px' }}
            />
            {inputText.trim() && (
              <button onClick={enviarMensagem} disabled={isProcessing}
                style={{ width: '44px', height: '44px', borderRadius: '50%', background: C.accent, border: 'none', cursor: isProcessing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', opacity: isProcessing ? 0.5 : 1 }}>
                <Send className="w-5 h-5" />
              </button>
            )}
          </div>
          {voiceRecorder.isRecording && (
            <div style={{ marginTop: '8px', fontSize: '11px', color: '#ef4444', textAlign: 'center' }}>
              Gravando... Solte para enviar ({voiceRecorder.duration}s)
            </div>
          )}
          {isTranscribing && (
            <div style={{ marginTop: '8px', fontSize: '11px', color: C.accent, textAlign: 'center' }}>Transcrevendo áudio...</div>
          )}
          {voiceRecorder.error && (
            <div style={{ marginTop: '8px', fontSize: '11px', color: '#ef4444', textAlign: 'center' }}>{voiceRecorder.error}</div>
          )}
        </div>
      </div>,
      document.body
    );
  }

  // ══════════════════════════════════════════════════════
  // RENDER DESKTOP
  // ══════════════════════════════════════════════════════
  return createPortal(
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)',
      padding: '20px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '1200px',
        height: '90vh',
        background: C.bg,
        borderRadius: '16px',
        border: `1px solid ${C.border}`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>

        {/* Header Desktop */}
        <div style={{
          padding: '20px',
          borderBottom: `1px solid ${C.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isFichaPreparo
              ? <Beaker className="w-6 h-6" style={{ color: C.accent }} />
              : <ChefHat className="w-6 h-6" style={{ color: C.accent }} />
            }
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: C.text, marginBottom: '4px' }}>
                {isFichaPreparo ? 'Nova Ficha de Preparo' : 'Nova Ficha de Produção'}
              </h2>
              <p style={{ fontSize: '13px', color: C.textMuted }}>Converse comigo para criar sua ficha</p>
            </div>
          </div>

          {/* TagSelector Desktop */}
          <div style={{ marginRight: '12px' }}>
            <TagSelector tags={selectedTags} onChange={setSelectedTags} options={TAG_OPTIONS} theme={theme} />
          </div>

          {/* ✅ v6: botões mutar + fechar agrupados */}
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <BotaoMutar />
            <button
              onClick={onClose}
              style={{ padding: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: C.textMuted }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Conteúdo — 2 colunas */}
        <div style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1fr 400px',
          gap: '1px',
          background: C.border,
          overflow: 'hidden',
        }}>

          {/* COLUNA ESQUERDA — CHAT */}
          <div style={{ background: C.bgChat, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* ✅ v6: minHeight: 0 para scroll funcionar */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              minHeight: 0,
            }}>
              {messages.map((msg) => (
                <div key={msg.id} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '70%',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: msg.role === 'user' ? C.userBubble : C.assistantBubble,
                    color: msg.role === 'user' ? 'white' : C.text,
                    fontSize: '14px',
                    lineHeight: '1.5',
                  }}>
                    {msg.content}
                  </div>
                </div>
              ))}

              {isProcessing && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: C.assistantBubble,
                    color: C.text,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <Loader2 className="w-4 h-4 animate-spin" /><span>Processando...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* ✅ v7: Input inlined diretamente — NÃO extrair como inner component */}
            <div style={{ padding: '16px', borderTop: `1px solid ${C.border}`, background: C.bg, flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {!inputText.trim() && (
                  <button
                    onClick={handleMicPress}
                    disabled={isProcessing || isTranscribing}
                    style={{
                      width: '48px', height: '48px', borderRadius: '50%',
                      background: voiceRecorder.isRecording ? '#ef4444' : C.accent,
                      border: 'none', cursor: (isProcessing || isTranscribing) ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', transition: 'all 0.1s ease',
                      transform: voiceRecorder.isRecording ? 'scale(1.1)' : 'scale(1)',
                    }}
                  >
                    <Mic className={`w-5 h-5 ${voiceRecorder.isRecording ? 'animate-pulse' : ''}`} />
                  </button>
                )}
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensagem(); } }}
                  placeholder="Digite sua mensagem ou clique no microfone..."
                  disabled={isProcessing || voiceRecorder.isRecording || isTranscribing}
                  style={{ flex: 1, padding: '12px 16px', background: C.bgSecondary, border: `1px solid ${C.border}`, borderRadius: '24px', color: C.text, fontSize: '14px' }}
                />
                {inputText.trim() && (
                  <button onClick={enviarMensagem} disabled={isProcessing}
                    style={{ width: '48px', height: '48px', borderRadius: '50%', background: C.accent, border: 'none', cursor: isProcessing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', opacity: isProcessing ? 0.5 : 1 }}>
                    <Send className="w-5 h-5" />
                  </button>
                )}
              </div>
              {voiceRecorder.isRecording && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#ef4444', textAlign: 'center' }}>
                  Gravando... Clique novamente para enviar ({voiceRecorder.duration}s)
                </div>
              )}
              {isTranscribing && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: C.accent, textAlign: 'center' }}>Transcrevendo áudio...</div>
              )}
              {voiceRecorder.error && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#ef4444', textAlign: 'center' }}>{voiceRecorder.error}</div>
              )}
            </div>
          </div>

          {/* COLUNA DIREITA — PREVIEW */}
          <div style={{ background: C.bg, overflowY: 'auto', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <ClipboardList className="w-5 h-5" style={{ color: C.accent }} />
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: C.text }}>Preview da Ficha</h3>
            </div>
            <FichaPreviewContent />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
