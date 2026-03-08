'use client';

// ============================================================
// FichaProducaoDisplay.tsx
// Caminho: components/assistant/FichaProducaoDisplay.tsx
//
// Modal do assistente eAi para Fichas de Produção
// Padrão: useModalVoiceCommand + playText + 3 estágios
// Estágios: collecting → reviewing → saved
// ============================================================

import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ClipboardList, Plus, Trash2, CheckCircle, FileText, AlertTriangle, Save, ExternalLink } from 'lucide-react';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';
import { useModalVoiceClose } from '@/components/VoiceAssistant/hooks/useModalVoiceClose';
import { createClient } from '@/lib/supabase-browser';
import {
  calcularResultadoFicha,
  podeRecalcular,
  fichaTemEstimativas,
  type Source,
  type Confianca,
  type Unidade,
  type ItemCalculo,
} from '@/lib/fichas-calculos';

// ── Types ─────────────────────────────────────────────────────

type Estagio = 'collecting' | 'reviewing' | 'saved';

interface ItemFicha {
  id: string; // temp UUID para controle local
  ingrediente_nome: string;
  quantidade: number;
  unidade: Unidade;
  preco_por_unidade: number;
  perda_percentual: number;
  source: Source;
  confianca: Confianca;
  chat_message_id?: string;
  chat_timestamp?: string;
  chat_mensagem_original?: string;
}

interface FichaState {
  nome: string;
  categoria: string;
  rendimento_qtd: number;
  rendimento_unid: string;
  preco_venda?: number;
  itens: ItemFicha[];
}

interface FichaProducaoDisplayProps {
  data: {
    companyId: string;
    fichaId?: string;
    prefilled?: {
      nome?: string;
      categoria?: string;
    };
  };
  onClose: () => void;
  playText: (text: string) => Promise<void>;
  theme?: 'dark' | 'light';
}

// ── Constantes ────────────────────────────────────────────────

const OPENING_TEXT =
  'Olá! Vou ajudar você a criar sua ficha de produção. Me diga o nome da receita que você quer cadastrar. Por exemplo: pizza de mussarela, molho de tomate, ou qualquer outra receita.';

const AVISO_ESTIMATIVAS =
  '⚠️ Esta ficha contém estimativas geradas por IA. Confirme os preços com seus fornecedores antes de tomar decisões financeiras.';

const UNIDADES: Unidade[] = ['kg', 'g', 'l', 'ml', 'un'];

// ── Helper: gera ID temporário ─────────────────────────────────
function tempId() {
  return Math.random().toString(36).slice(2, 10);
}

// ── Helper: normaliza texto para comparação ────────────────────
function normalize(text: string) {
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,!?;:]+/g, '');
}

// ── Helper: formata moeda ──────────────────────────────────────
function fmt(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ── Helper: descrição de fonte ─────────────────────────────────
function labelFonte(source: Source) {
  switch (source) {
    case 'user_input': return '✓ confirmado';
    case 'ai_estimate': return '⚠️ estimado';
    case 'ai_default': return '⚠️ estimado';
    case 'system_calculated': return '⚙️ calculado';
  }
}

// ── Componente Principal ───────────────────────────────────────

export default function FichaProducaoDisplay({
  data,
  onClose,
  playText,
  theme = 'dark',
}: FichaProducaoDisplayProps) {
  const { companyId, prefilled } = data;
  const supabase = createClient();
  const isDark = theme === 'dark';

  // ── Estado principal
  const [estagio, setEstagio] = useState<Estagio>('collecting');
  const [ficha, setFicha] = useState<FichaState>({
    nome: prefilled?.nome ?? '',
    categoria: prefilled?.categoria ?? '',
    rendimento_qtd: 1,
    rendimento_unid: 'unidades',
    itens: [],
  });
  const [fichaIdSalva, setFichaIdSalva] = useState<string | null>(null);

  // ── Estado de UI
  const [isLoadingIA, setIsLoadingIA] = useState(false);
  const [isLoadingEstimativa, setIsLoadingEstimativa] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [novoItemPendente, setNovoItemPendente] = useState('');
  const [streamingItem, setStreamingItem] = useState<string | null>(null); // nome do item sendo adicionado
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'error' | 'warning' } | null>(null);

  // ── Refs
  const lastPlayedText = useRef('');
  const fichaRef = useRef(ficha);

  useEffect(() => { fichaRef.current = ficha; }, [ficha]);

  // ── Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (msg: string, tipo: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ msg, tipo });
  };

  // ── Abertura: falar e, se já tem nome, gerar ficha base
  useEffect(() => {
    if (prefilled?.nome) {
      const text = `Ótimo! Vou criar uma ficha base para ${prefilled.nome}. Já estou montando os ingredientes típicos para você.`;
      playText(text).catch(() => {});
      lastPlayedText.current = text;
      gerarFichaBase(prefilled.nome, prefilled.categoria ?? '');
    } else {
      playText(OPENING_TEXT).catch(() => {});
      lastPlayedText.current = OPENING_TEXT;
    }
    return () => { window.speechSynthesis?.cancel(); };
  }, []);

  // ── Fechar com voz
  useModalVoiceClose(handleClose);

  function handleClose() {
    window.speechSynthesis?.cancel();
    onClose();
  }

  // ── Gera ficha base via IA (Gemini/OpenAI) ─────────────────
  async function gerarFichaBase(nome: string, categoria: string) {
    setIsLoadingIA(true);
    try {
      const prompt = `Você é um especialista em gastronomia brasileira. Crie uma ficha técnica base para a receita: "${nome}".
Categoria sugerida: ${categoria || 'não informada'}.

Responda APENAS com JSON válido, sem texto adicional:
{
  "nome": "string",
  "categoria": "string",
  "rendimento_qtd": number,
  "rendimento_unid": "string (ex: unidades, kg, porcoes)",
  "itens": [
    {
      "ingrediente_nome": "string",
      "quantidade": number,
      "unidade": "kg|g|l|ml|un",
      "preco_por_unidade": number,
      "perda_percentual": number
    }
  ]
}
Regras:
- Use quantidades realistas para o mercado brasileiro
- Inclua de 3 a 8 ingredientes típicos
- preco_por_unidade em Reais (mercado BR)
- perda_percentual entre 0 e 30
- Todos os campos são obrigatórios`;

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      const resData = await res.json();
      const raw = resData.content?.find((b: any) => b.type === 'text')?.text ?? '';
      const cleaned = raw.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      // Monta itens com source = ai_default (estimativa inicial da IA)
      const itens: ItemFicha[] = (parsed.itens ?? []).map((it: any, idx: number) => ({
        id: tempId(),
        ingrediente_nome: it.ingrediente_nome,
        quantidade: Number(it.quantidade) || 0,
        unidade: it.unidade as Unidade,
        preco_por_unidade: Number(it.preco_por_unidade) || 0,
        perda_percentual: Number(it.perda_percentual) || 0,
        source: 'ai_default' as Source,
        confianca: 'media' as Confianca,
        chat_message_id: `ai_base_${Date.now()}`,
        chat_timestamp: new Date().toISOString(),
        chat_mensagem_original: `Ficha base gerada automaticamente para: ${nome}`,
      }));

      // Efeito streaming: adiciona um item por vez com delay visual
      setFicha(prev => ({ ...prev, nome: parsed.nome ?? nome, categoria: parsed.categoria ?? categoria, rendimento_qtd: parsed.rendimento_qtd ?? 1, rendimento_unid: parsed.rendimento_unid ?? 'unidades', itens: [] }));

      for (let i = 0; i < itens.length; i++) {
        const item = itens[i];
        setStreamingItem(item.ingrediente_nome);
        await new Promise(r => setTimeout(r, 350));
        setFicha(prev => ({ ...prev, itens: [...prev.itens, item] }));
      }
      setStreamingItem(null);

      const speechText = `Ótimo! Já criei uma ficha base para ${parsed.nome ?? nome} com ${itens.length} ingredientes típicos. Os valores em itálico são estimativas — você pode confirmar ou corrigir qualquer um. O que você quer ajustar?`;
      playText(speechText).catch(() => {});
      lastPlayedText.current = speechText;

    } catch (err) {
      console.error('❌ [FichaProducao] Erro ao gerar ficha base:', err);
      showToast('Não consegui gerar a ficha automática. Adicione os ingredientes manualmente.', 'error');
    } finally {
      setIsLoadingIA(false);
    }
  }

  // ── Estima preço de ingrediente via Edge Function ──────────
  async function estimarPrecoIngrediente(nome: string, unidade: string): Promise<number> {
    setIsLoadingEstimativa(true);
    try {
      const { data: funcData, error } = await supabase.functions.invoke('estimar-preco-ingrediente', {
        body: { ingrediente: nome, unidade, regiao: 'Brasil' },
      });
      if (error || !funcData?.success) return 0;
      return funcData.preco_estimado ?? 0;
    } catch {
      return 0;
    } finally {
      setIsLoadingEstimativa(false);
    }
  }

  // ── Adiciona ingrediente por voz ───────────────────────────
  async function adicionarIngredientePorVoz(textoOriginal: string) {
    // Tenta extrair: "frango desfiado 250 gramas" ou "adicionar mussarela 300g"
    const match = textoOriginal.match(
      /(\d+(?:[.,]\d+)?)\s*(kg|g|gramas?|grama|litros?|litro|ml|mililitros?|un|unidades?|unidade)/i
    );

    let quantidade = 100;
    let unidade: Unidade = 'g';
    let nomeIngrediente = textoOriginal;

    if (match) {
      quantidade = parseFloat(match[1].replace(',', '.'));
      const rawUnid = match[2].toLowerCase();
      if (rawUnid.startsWith('kg')) unidade = 'kg';
      else if (rawUnid.startsWith('l') && !rawUnid.startsWith('litro')) unidade = 'l'; // 'l' só
      else if (rawUnid.startsWith('litro')) unidade = 'l';
      else if (rawUnid.startsWith('ml') || rawUnid.startsWith('mili')) unidade = 'ml';
      else if (rawUnid.startsWith('un')) unidade = 'un';
      else unidade = 'g';

      // Remove quantidade+unidade e palavras de comando do nome
      nomeIngrediente = textoOriginal
        .replace(/\b(adicionar?|adiciona|coloca|add|inclui|incluir)\b/gi, '')
        .replace(match[0], '')
        .trim();
    }

    if (!nomeIngrediente || nomeIngrediente.length < 2) {
      showToast('Não entendi o ingrediente. Tente: "adicionar frango 250 gramas"', 'warning');
      return;
    }

    setStreamingItem(nomeIngrediente);

    // Busca preço na base da empresa primeiro
    const { data: ingExistente } = await supabase
      .from('producao_ingredientes')
      .select('preco_por_unidade, source')
      .eq('company_id', companyId)
      .ilike('nome', `%${nomeIngrediente}%`)
      .limit(1)
      .maybeSingle();

    let preco = ingExistente?.preco_por_unidade ?? 0;
    let source: Source = ingExistente ? (ingExistente.source as Source) : 'ai_estimate';
    let confianca: Confianca = ingExistente ? 'alta' : 'media';

    if (!ingExistente) {
      preco = await estimarPrecoIngrediente(nomeIngrediente, unidade);
    }

    const novoItem: ItemFicha = {
      id: tempId(),
      ingrediente_nome: nomeIngrediente,
      quantidade,
      unidade,
      preco_por_unidade: preco,
      perda_percentual: 0,
      source,
      confianca,
      chat_message_id: `voice_${Date.now()}`,
      chat_timestamp: new Date().toISOString(),
      chat_mensagem_original: textoOriginal,
    };

    setFicha(prev => ({ ...prev, itens: [...prev.itens, novoItem] }));
    setStreamingItem(null);

    const precoFormatado = preco > 0 ? fmt(preco) : 'não encontrado';
    const temEstimativa = source !== 'user_input';

    let speechText = `Adicionei ${nomeIngrediente}, ${quantidade} ${unidade}. `;
    if (temEstimativa) {
      speechText += `Como ainda não tenho o preço exato, estimei ${precoFormatado} por ${unidade}. Você pode corrigir depois se preferir 👍`;
    } else {
      speechText += `Preço cadastrado: ${precoFormatado} por ${unidade}. `;
    }

    playText(speechText).catch(() => {});
    lastPlayedText.current = speechText;
  }

  // ── Remove ingrediente ─────────────────────────────────────
  function removerItem(id: string) {
    setFicha(prev => ({ ...prev, itens: prev.itens.filter(i => i.id !== id) }));
  }

  // ── Atualiza campo de um item ──────────────────────────────
  function atualizarItem(id: string, campo: Partial<ItemFicha>) {
    setFicha(prev => ({
      ...prev,
      itens: prev.itens.map(i => i.id === id ? { ...i, ...campo, source: 'user_input', confianca: 'alta' } : i),
    }));
  }

  // ── Salva ficha no Supabase ────────────────────────────────
  async function salvarFicha() {
    if (!ficha.nome.trim()) {
      showToast('Informe o nome da receita antes de salvar.', 'warning');
      return;
    }
    if (ficha.itens.length === 0) {
      showToast('Adicione pelo menos um ingrediente.', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const itensCalculo: ItemCalculo[] = ficha.itens.map(i => ({
        quantidade: i.quantidade,
        unidade: i.unidade,
        preco_por_unidade: i.preco_por_unidade,
        perda_percentual: i.perda_percentual,
        source: i.source,
      }));

      const resultado = calcularResultadoFicha(itensCalculo, ficha.rendimento_qtd, ficha.preco_venda);

      // Insert na producao_fichas
      const { data: fichaData, error: fichaError } = await supabase
        .from('producao_fichas')
        .insert({
          company_id: companyId,
          nome: ficha.nome,
          categoria: ficha.categoria || null,
          rendimento_qtd: ficha.rendimento_qtd,
          rendimento_unid: ficha.rendimento_unid,
          preco_venda: ficha.preco_venda || null,
          criado_por_voz: true,
          tem_estimativas: resultado.tem_estimativas,
        })
        .select('id')
        .single();

      if (fichaError || !fichaData) throw fichaError ?? new Error('Falha ao criar ficha');

      const fichaId = fichaData.id;

      // Upsert ingredientes na base e insert dos itens
      for (const item of ficha.itens) {
        // Tenta upsert do ingrediente base se não era estimativa de empresa
        if (item.source === 'user_input') {
          await supabase.from('producao_ingredientes').upsert({
            company_id: companyId,
            nome: item.ingrediente_nome,
            unidade: item.unidade,
            preco_por_unidade: item.preco_por_unidade,
            source: 'user_input',
            estimado_ia: false,
          }, { onConflict: 'company_id,nome' }).select();
        }

        // Busca ou cria ingrediente
        const { data: ingData } = await supabase
          .from('producao_ingredientes')
          .select('id')
          .eq('company_id', companyId)
          .ilike('nome', item.ingrediente_nome)
          .maybeSingle();

        let ingredienteId = ingData?.id ?? null;

        if (!ingredienteId && (item.source === 'ai_estimate' || item.source === 'ai_default')) {
          const { data: novoIng } = await supabase
            .from('producao_ingredientes')
            .insert({
              company_id: companyId,
              nome: item.ingrediente_nome,
              unidade: item.unidade,
              preco_por_unidade: item.preco_por_unidade,
              source: item.source,
              estimado_ia: true,
            })
            .select('id')
            .single();
          ingredienteId = novoIng?.id ?? null;
        }

        // Insert do item da ficha
        await supabase.from('producao_ficha_itens').insert({
          ficha_id: fichaId,
          ingrediente_id: ingredienteId,
          ingrediente_nome_temp: ingredienteId ? null : item.ingrediente_nome,
          preco_temp: ingredienteId ? null : item.preco_por_unidade,
          quantidade: item.quantidade,
          unidade: item.unidade,
          perda_percentual: item.perda_percentual,
          source: item.source,
          confianca: item.confianca,
          chat_message_id: item.chat_message_id ?? null,
          chat_timestamp: item.chat_timestamp ?? null,
          chat_mensagem_original: item.chat_mensagem_original ?? null,
          ordem: ficha.itens.indexOf(item),
        });
      }

      setFichaIdSalva(fichaId);
      setEstagio('saved');

      const speechText = `Ficou incrível! Sua ficha ${ficha.nome} foi salva com sucesso. Custo total: ${fmt(resultado.custo_total)}. Preço sugerido de venda: ${fmt(resultado.preco_sugerido)}. Você pode ver e editar no dashboard.`;
      playText(speechText).catch(() => {});
      lastPlayedText.current = speechText;

    } catch (err) {
      console.error('❌ [FichaProducao] Erro ao salvar:', err);
      showToast('Erro ao salvar a ficha. Tente novamente.', 'error');
    } finally {
      setIsSaving(false);
    }
  }

  // ── Comandos de voz ────────────────────────────────────────
  useModalVoiceCommand({
    active: true,
    onTranscript: (transcript) => {
      const t = normalize(transcript);

      // Fechar
      if (['fechar', 'cancelar', 'sair', 'voltar', 'encerrar'].some(cmd => t.includes(cmd))) {
        handleClose();
        return;
      }

      // Repetir
      if (['repetir', 'repete', 'de novo', 'repita'].some(cmd => t.includes(cmd))) {
        playText(lastPlayedText.current).catch(() => {});
        return;
      }

      // Salvar
      if (['salvar', 'salva', 'confirmar', 'confirma', 'concluir', 'concluido', 'pronto'].some(cmd => t.includes(cmd))) {
        if (estagio === 'collecting') {
          setEstagio('reviewing');
          const f = fichaRef.current;
          const itensCalculo: ItemCalculo[] = f.itens.map(i => ({ quantidade: i.quantidade, unidade: i.unidade, preco_por_unidade: i.preco_por_unidade, perda_percentual: i.perda_percentual, source: i.source }));
          const res = calcularResultadoFicha(itensCalculo, f.rendimento_qtd, f.preco_venda);
          const temEst = fichaTemEstimativas(f.itens);
          const speech = `Aqui está sua ficha completa! Custo total: ${fmt(res.custo_total)}, peso total: ${res.peso_total_kg.toFixed(2)} kg, preço sugerido: ${fmt(res.preco_sugerido)}.${temEst ? ' Atenção: alguns valores são estimativas. Confirme com seus fornecedores.' : ''} Diga salvar para confirmar.`;
          playText(speech).catch(() => {});
          lastPlayedText.current = speech;
        } else if (estagio === 'reviewing') {
          salvarFicha();
        }
        return;
      }

      // Exportar PDF (placeholder — Fase 4)
      if (t.includes('exportar') || t.includes('pdf') || t.includes('imprimir')) {
        showToast('Exportação de PDF disponível no dashboard.', 'warning');
        return;
      }

      // Remover ingrediente: "remover mussarela"
      if (t.includes('remover') || t.includes('remove') || t.includes('tirar') || t.includes('excluir')) {
        const f = fichaRef.current;
        const palavras = t.split(/\s+/);
        const idx = palavras.findIndex(p => ['remover', 'remove', 'tirar', 'excluir'].includes(p));
        const nomeAlvo = palavras.slice(idx + 1).join(' ');
        const item = f.itens.find(i => normalize(i.ingrediente_nome).includes(nomeAlvo));
        if (item) {
          removerItem(item.id);
          playText(`Removi ${item.ingrediente_nome} da sua ficha.`).catch(() => {});
        } else {
          showToast('Não encontrei esse ingrediente na ficha.', 'warning');
        }
        return;
      }

      // Adicionar ingrediente: "adicionar frango 250 gramas"
      if (
        t.includes('adicionar') || t.includes('adiciona') ||
        t.includes('coloca') || t.includes('incluir') ||
        t.includes('inclui') || t.includes('add ')
      ) {
        const clean = transcript
          .replace(/\b(adicionar?|adiciona|coloca|add|inclui|incluir)\b/gi, '')
          .trim();
        adicionarIngredientePorVoz(clean);
        return;
      }

      // Receber nome da receita no início (sem itens ainda)
      if (estagio === 'collecting' && !fichaRef.current.nome && fichaRef.current.itens.length === 0) {
        const nome = transcript.replace(/\b(quero|criar|cadastrar|fazer|nova)\b/gi, '').trim();
        if (nome.length > 2) {
          setFicha(prev => ({ ...prev, nome }));
          const speech = `Perfeito! Vou criar a ficha para ${nome}. Já estou montando a base com os ingredientes típicos!`;
          playText(speech).catch(() => {});
          lastPlayedText.current = speech;
          gerarFichaBase(nome, '');
        }
        return;
      }
    },
  });

  // ── Cálculos para exibição ─────────────────────────────────
  const itensCalculo: ItemCalculo[] = ficha.itens.map(i => ({
    quantidade: i.quantidade,
    unidade: i.unidade,
    preco_por_unidade: i.preco_por_unidade,
    perda_percentual: i.perda_percentual,
    source: i.source,
  }));
  const resultado = calcularResultadoFicha(itensCalculo, ficha.rendimento_qtd, ficha.preco_venda);
  const temEstimativas = fichaTemEstimativas(ficha.itens);

  // ── Estilos base ───────────────────────────────────────────
  const bg = isDark ? 'bg-slate-800' : 'bg-white';
  const border = isDark ? 'border-white/10' : 'border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-white/50' : 'text-gray-500';
  const rowHover = isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50';
  const inputCls = `w-full px-2 py-1 rounded text-sm border ${isDark ? 'bg-slate-700 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} focus:outline-none focus:ring-1 focus:ring-fuchsia-500`;

  // ── Render ─────────────────────────────────────────────────
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh] ${bg} border ${border}`}
      >
        {/* ── Header ── */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${border} flex-shrink-0 ${isDark ? 'bg-fuchsia-950/30' : 'bg-fuchsia-50'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-fuchsia-900/40' : 'bg-fuchsia-100'}`}>
              <ClipboardList className={`w-5 h-5 ${isDark ? 'text-fuchsia-400' : 'text-fuchsia-600'}`} />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${textPrimary}`}>
                {estagio === 'saved' ? 'Ficha Salva! 🎉' : 'Fichas de Produção'}
              </h2>
              <p className={`text-xs ${textMuted}`}>
                {estagio === 'collecting' && 'Coletando ingredientes...'}
                {estagio === 'reviewing' && 'Revisão final'}
                {estagio === 'saved' && ficha.nome}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-white/70 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'}`}
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Toast ── */}
        {toast && (
          <div className={`mx-4 mt-3 px-4 py-2 rounded-lg text-sm font-medium flex-shrink-0 ${
            toast.tipo === 'success' ? (isDark ? 'bg-green-900/40 text-green-300' : 'bg-green-100 text-green-800') :
            toast.tipo === 'error'   ? (isDark ? 'bg-red-900/40 text-red-300'   : 'bg-red-100 text-red-800')   :
                                       (isDark ? 'bg-yellow-900/40 text-yellow-300' : 'bg-yellow-100 text-yellow-800')
          }`}>
            {toast.msg}
          </div>
        )}

        {/* ── Conteúdo principal (scrollável) ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* ══ ESTÁGIO: collecting ══ */}
          {estagio === 'collecting' && (
            <>
              {/* Nome da ficha */}
              <div>
                <label className={`text-xs font-medium ${textMuted} mb-1 block`}>Nome da receita</label>
                <input
                  className={inputCls}
                  value={ficha.nome}
                  onChange={e => setFicha(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Ex: Pizza de Mussarela"
                />
              </div>

              {/* Loading IA */}
              {isLoadingIA && (
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${isDark ? 'bg-fuchsia-900/20 border border-fuchsia-800/40' : 'bg-fuchsia-50 border border-fuchsia-200'}`}>
                  <div className="w-4 h-4 border-2 border-fuchsia-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  <span className={`text-sm ${isDark ? 'text-fuchsia-300' : 'text-fuchsia-700'}`}>
                    Criando ficha base com IA...
                  </span>
                </div>
              )}

              {/* Item sendo adicionado (streaming) */}
              {streamingItem && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${isDark ? 'bg-slate-700/50 text-slate-300' : 'bg-gray-100 text-gray-600'}`}>
                  <div className="w-3 h-3 border-2 border-fuchsia-400 border-t-transparent rounded-full animate-spin" />
                  Adicionando: <strong>{streamingItem}</strong>
                </div>
              )}

              {/* Tabela de ingredientes */}
              {ficha.itens.length > 0 && (
                <div className={`rounded-xl overflow-hidden border ${border}`}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={`${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                        <th className={`text-left px-3 py-2 font-medium ${textMuted}`}>Ingrediente</th>
                        <th className={`text-right px-3 py-2 font-medium ${textMuted}`}>Qtd</th>
                        <th className={`text-right px-3 py-2 font-medium ${textMuted}`}>Preço/un</th>
                        <th className={`text-right px-3 py-2 font-medium ${textMuted}`}>Custo</th>
                        <th className={`px-3 py-2 font-medium ${textMuted}`}>Fonte</th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {ficha.itens.map(item => {
                        const isEstimado = item.source !== 'user_input';
                        const custoItem = item.quantidade * ((['g','ml'].includes(item.unidade)) ? 0.001 : 1) / (1 - item.perda_percentual / 100) * item.preco_por_unidade;
                        return (
                          <tr key={item.id} className={`border-t ${border} ${rowHover} transition-colors`}>
                            <td className={`px-3 py-2 ${isEstimado ? 'italic ' + textMuted : textPrimary} font-medium`}>
                              {item.ingrediente_nome}
                            </td>
                            <td className={`px-3 py-2 text-right ${isEstimado ? 'italic ' + textMuted : textPrimary}`}>
                              {item.quantidade}{item.unidade}
                            </td>
                            <td className={`px-3 py-2 text-right ${isEstimado ? 'italic ' + textMuted : textPrimary}`}>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.preco_por_unidade}
                                onChange={e => atualizarItem(item.id, { preco_por_unidade: parseFloat(e.target.value) || 0 })}
                                className={`w-20 text-right px-1 py-0.5 rounded text-xs border ${isDark ? 'bg-slate-700 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                              />
                            </td>
                            <td className={`px-3 py-2 text-right ${isEstimado ? 'italic ' + textMuted : textPrimary}`}>
                              {fmt(custoItem)}
                            </td>
                            <td className={`px-3 py-2 text-xs ${isEstimado ? 'text-yellow-500' : 'text-green-500'}`}>
                              {labelFonte(item.source)}
                            </td>
                            <td className="px-2 py-2">
                              <button
                                onClick={() => removerItem(item.id)}
                                className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-red-900/30 text-white/30 hover:text-red-400' : 'hover:bg-red-50 text-gray-300 hover:text-red-500'}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Adicionar ingrediente manualmente */}
              <div className="flex gap-2">
                <input
                  className={`flex-1 ${inputCls}`}
                  value={novoItemPendente}
                  onChange={e => setNovoItemPendente(e.target.value)}
                  placeholder='Ex: "mussarela 280g" ou diga em voz alta'
                  onKeyDown={e => {
                    if (e.key === 'Enter' && novoItemPendente.trim()) {
                      adicionarIngredientePorVoz(novoItemPendente);
                      setNovoItemPendente('');
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (novoItemPendente.trim()) {
                      adicionarIngredientePorVoz(novoItemPendente);
                      setNovoItemPendente('');
                    }
                  }}
                  className="px-3 py-1.5 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-lg text-sm transition flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar
                </button>
              </div>

              {/* Custo parcial */}
              {ficha.itens.length > 0 && (
                <div className={`flex items-center justify-between px-4 py-3 rounded-xl ${isDark ? 'bg-slate-700/40' : 'bg-gray-50'} border ${border}`}>
                  <span className={`text-sm ${textMuted}`}>Custo parcial</span>
                  <span className={`text-lg font-bold ${isDark ? 'text-fuchsia-300' : 'text-fuchsia-700'}`}>
                    {fmt(resultado.custo_total)}
                  </span>
                </div>
              )}

              {/* Banner estimativas */}
              {temEstimativas && (
                <div className={`flex items-start gap-2 px-4 py-3 rounded-xl border ${isDark ? 'bg-yellow-900/20 border-yellow-700/40 text-yellow-300' : 'bg-yellow-50 border-yellow-200 text-yellow-800'}`}>
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p className="text-xs">{AVISO_ESTIMATIVAS}</p>
                </div>
              )}
            </>
          )}

          {/* ══ ESTÁGIO: reviewing ══ */}
          {estagio === 'reviewing' && (
            <>
              <div className={`px-4 py-3 rounded-xl ${isDark ? 'bg-slate-700/40' : 'bg-gray-50'} border ${border} space-y-1`}>
                <p className={`text-sm font-bold ${textPrimary}`}>{ficha.nome}</p>
                <p className={`text-xs ${textMuted}`}>
                  Rendimento: {ficha.rendimento_qtd} {ficha.rendimento_unid}
                  {ficha.categoria && ` · ${ficha.categoria}`}
                </p>
              </div>

              {/* Tabela final */}
              <div className={`rounded-xl overflow-hidden border ${border}`}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                      <th className={`text-left px-3 py-2 font-medium ${textMuted}`}>Ingrediente</th>
                      <th className={`text-right px-3 py-2 font-medium ${textMuted}`}>Qtd</th>
                      <th className={`text-right px-3 py-2 font-medium ${textMuted}`}>Custo</th>
                      <th className={`px-3 py-2 font-medium ${textMuted}`}>Fonte</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ficha.itens.map(item => {
                      const isEstimado = item.source !== 'user_input';
                      const custoItem = item.quantidade * ((['g','ml'].includes(item.unidade)) ? 0.001 : 1) / (1 - item.perda_percentual / 100) * item.preco_por_unidade;
                      return (
                        <tr key={item.id} className={`border-t ${border}`}>
                          <td className={`px-3 py-2 ${isEstimado ? 'italic ' + textMuted : textPrimary}`}>
                            {item.ingrediente_nome}
                          </td>
                          <td className={`px-3 py-2 text-right ${isEstimado ? 'italic ' + textMuted : textPrimary}`}>
                            {item.quantidade}{item.unidade}
                          </td>
                          <td className={`px-3 py-2 text-right ${isEstimado ? 'italic ' + textMuted : textPrimary}`}>
                            {fmt(custoItem)}
                          </td>
                          <td className={`px-3 py-2 text-xs ${isEstimado ? 'text-yellow-500' : 'text-green-500'}`}>
                            {labelFonte(item.source)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Resumo financeiro */}
              <div className={`grid grid-cols-2 gap-3`}>
                {[
                  { label: 'Custo Total', value: fmt(resultado.custo_total), highlight: true },
                  { label: 'Peso Total', value: `${resultado.peso_total_kg.toFixed(2)} kg`, highlight: false },
                  { label: 'Custo/Unidade', value: fmt(resultado.custo_por_unidade), highlight: false },
                  { label: 'Preço Sugerido (3×)', value: fmt(resultado.preco_sugerido), highlight: true },
                ].map(({ label, value, highlight }) => (
                  <div key={label} className={`px-4 py-3 rounded-xl border ${border} ${isDark ? 'bg-slate-700/30' : 'bg-gray-50'}`}>
                    <p className={`text-xs ${textMuted}`}>{label}</p>
                    <p className={`text-lg font-bold ${highlight ? (isDark ? 'text-fuchsia-300' : 'text-fuchsia-700') : textPrimary}`}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Preço de venda */}
              <div className="flex items-center gap-3">
                <label className={`text-sm ${textMuted} whitespace-nowrap`}>Preço de venda (opcional):</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={ficha.preco_venda ?? ''}
                  onChange={e => setFicha(prev => ({ ...prev, preco_venda: parseFloat(e.target.value) || undefined }))}
                  placeholder="R$ 0,00"
                  className={inputCls}
                />
                {ficha.preco_venda && ficha.preco_venda > 0 && (
                  <span className={`text-sm font-bold whitespace-nowrap ${resultado.margem_bruta > 30 ? 'text-green-500' : 'text-yellow-500'}`}>
                    Margem: {resultado.margem_bruta.toFixed(1)}%
                  </span>
                )}
              </div>

              {/* Banner estimativas */}
              {temEstimativas && (
                <div className={`flex items-start gap-2 px-4 py-3 rounded-xl border ${isDark ? 'bg-yellow-900/20 border-yellow-700/40 text-yellow-300' : 'bg-yellow-50 border-yellow-200 text-yellow-800'}`}>
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p className="text-xs">{AVISO_ESTIMATIVAS}</p>
                </div>
              )}
            </>
          )}

          {/* ══ ESTÁGIO: saved ══ */}
          {estagio === 'saved' && (
            <div className="flex flex-col items-center gap-6 py-6">
              <div className={`p-5 rounded-full ${isDark ? 'bg-green-900/30' : 'bg-green-100'}`}>
                <CheckCircle className={`w-12 h-12 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
              </div>
              <div className="text-center space-y-1">
                <p className={`text-xl font-bold ${textPrimary}`}>Ficha salva com sucesso!</p>
                <p className={`text-sm ${textMuted}`}>{ficha.nome}</p>
              </div>

              <div className={`w-full grid grid-cols-2 gap-3`}>
                <div className={`px-4 py-3 rounded-xl border ${border} ${isDark ? 'bg-slate-700/30' : 'bg-gray-50'} text-center`}>
                  <p className={`text-xs ${textMuted}`}>Custo Total</p>
                  <p className={`text-lg font-bold ${isDark ? 'text-fuchsia-300' : 'text-fuchsia-700'}`}>{fmt(resultado.custo_total)}</p>
                </div>
                <div className={`px-4 py-3 rounded-xl border ${border} ${isDark ? 'bg-slate-700/30' : 'bg-gray-50'} text-center`}>
                  <p className={`text-xs ${textMuted}`}>Preço Sugerido</p>
                  <p className={`text-lg font-bold ${textPrimary}`}>{fmt(resultado.preco_sugerido)}</p>
                </div>
              </div>

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => showToast('Exportação de PDF disponível no dashboard.', 'warning')}
                  className={`flex-1 px-4 py-3 rounded-xl border ${border} text-sm font-medium flex items-center justify-center gap-2 transition ${isDark ? 'hover:bg-white/5 text-white/70' : 'hover:bg-gray-50 text-gray-600'}`}
                >
                  <FileText className="w-4 h-4" />
                  Exportar PDF
                </button>
                {fichaIdSalva && (
                  <a
                    href={`/dashboard/fichas`}
                    className="flex-1 px-4 py-3 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Ver no Dashboard
                  </a>
                )}
              </div>

              {temEstimativas && (
                <div className={`flex items-start gap-2 px-4 py-3 rounded-xl border w-full ${isDark ? 'bg-yellow-900/20 border-yellow-700/40 text-yellow-300' : 'bg-yellow-50 border-yellow-200 text-yellow-800'}`}>
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p className="text-xs">{AVISO_ESTIMATIVAS}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer: botões de ação + voice hint ── */}
        {estagio !== 'saved' && (
          <div className={`px-6 py-4 border-t ${border} flex-shrink-0 space-y-3`}>
            {/* Botões */}
            <div className="flex gap-3">
              {estagio === 'collecting' && (
                <button
                  onClick={() => {
                    setEstagio('reviewing');
                    const speech = 'Revisando sua ficha. Confira os valores e diga salvar para confirmar.';
                    playText(speech).catch(() => {});
                    lastPlayedText.current = speech;
                  }}
                  disabled={ficha.itens.length === 0 || isLoadingIA}
                  className="flex-1 px-4 py-3 bg-fuchsia-600 hover:bg-fuchsia-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Revisar Ficha
                </button>
              )}
              {estagio === 'reviewing' && (
                <>
                  <button
                    onClick={() => setEstagio('collecting')}
                    className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition border ${border} ${isDark ? 'hover:bg-white/5 text-white/70' : 'hover:bg-gray-50 text-gray-600'}`}
                  >
                    Voltar e Editar
                  </button>
                  <button
                    onClick={salvarFicha}
                    disabled={isSaving}
                    className="flex-1 px-4 py-3 bg-fuchsia-600 hover:bg-fuchsia-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Salvando...</>
                    ) : (
                      <><Save className="w-4 h-4" />Salvar Ficha (3 créditos)</>
                    )}
                  </button>
                </>
              )}
            </div>

            {/* Voice hint */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs ${isDark ? 'bg-slate-700/50 text-slate-400' : 'bg-gray-50 text-gray-500'}`}>
              <span>
                {estagio === 'collecting'
                  ? 'Diga: <strong>"adicionar [ingrediente] [quantidade]"</strong>, <strong>"remover [ingrediente]"</strong> ou <strong>"revisar"</strong>'
                  : 'Diga: <strong>"salvar"</strong> para confirmar ou <strong>"voltar"</strong> para editar'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
