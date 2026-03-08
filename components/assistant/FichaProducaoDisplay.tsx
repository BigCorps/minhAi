'use client';

// ============================================================
// FichaProducaoDisplay.tsx
// Caminho: components/assistant/FichaProducaoDisplay.tsx
// Layout: sidebar azul + conteúdo (desktop) | sheet bottom (mobile)
// Cores: 100% inline style — sem classes Tailwind dinâmicas
// ============================================================

import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Mail, Calendar, Settings, AlertCircle, Check, Plus, Trash2, ExternalLink } from 'lucide-react';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';
import { useModalVoiceClose } from '@/components/VoiceAssistant/hooks/useModalVoiceClose';
import { createClient } from '@/lib/supabase-browser';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  calcularResultadoFicha,
  fichaTemEstimativas,
  type Source,
  type Confianca,
  type Unidade,
  type ItemCalculo,
} from '@/lib/fichas-calculos';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type Estagio = 'collecting' | 'reviewing' | 'saved';

interface ItemFicha {
  id: string;
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
    prefilled?: { nome?: string; categoria?: string };
  };
  onClose: () => void;
  playText: (text: string) => Promise<void>;
  theme?: 'dark' | 'light';
}

// ─────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────

const OPENING_TEXT =
  'Ola! Vou ajudar voce a criar sua ficha de producao. Me diga o nome da receita. Por exemplo: pizza de mussarela, molho de tomate, ou qualquer outra receita.';

const AVISO_ESTIMATIVAS =
  'Esta ficha contém estimativas de IA. Confirme os preços com seus fornecedores antes de tomar decisões financeiras.';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function tempId() {
  return Math.random().toString(36).slice(2, 10);
}

function normalize(text: string) {
  return text
    .toLowerCase().trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,!?;:]+/g, '');
}

function fmt(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function calcCusto(item: ItemFicha) {
  return (
    item.quantidade *
    (['g', 'ml'].includes(item.unidade) ? 0.001 : 1) /
    (1 - item.perda_percentual / 100) *
    item.preco_por_unidade
  );
}

// ─────────────────────────────────────────────────────────────
// Paleta de cores (inline styles — sem risco de purge)
// ─────────────────────────────────────────────────────────────

const DARK = {
  bg:           '#1e293b',
  bgSecondary:  '#0f172a',
  bgTertiary:   '#334155',
  border:       'rgba(255,255,255,0.08)',
  text:         '#f1f5f9',
  textMuted:    '#94a3b8',
  inputBg:      '#334155',
  inputBorder:  '#475569',
  hintBg:       '#1e293b',
  hintText:     '#64748b',
  toastSuccess: { bg: 'rgba(34,197,94,0.15)', text: '#86efac', border: 'rgba(34,197,94,0.3)' },
  toastError:   { bg: 'rgba(239,68,68,0.15)',  text: '#fca5a5', border: 'rgba(239,68,68,0.3)' },
  toastWarn:    { bg: 'rgba(234,179,8,0.15)',  text: '#fde047', border: 'rgba(234,179,8,0.3)' },
  btnOutline:   { border: '#475569', text: '#cbd5e1' },
};

const LIGHT = {
  bg:           '#ffffff',
  bgSecondary:  '#f8fafc',
  bgTertiary:   '#f1f5f9',
  border:       '#e2e8f0',
  text:         '#0f172a',
  textMuted:    '#64748b',
  inputBg:      '#f8fafc',
  inputBorder:  '#e2e8f0',
  hintBg:       '#f1f5f9',
  hintText:     '#94a3b8',
  toastSuccess: { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
  toastError:   { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
  toastWarn:    { bg: '#fefce8', text: '#854d0e', border: '#fef08a' },
  btnOutline:   { border: '#e2e8f0', text: '#475569' },
};

// ─────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────

export default function FichaProducaoDisplay({
  data,
  onClose,
  playText,
  theme = 'dark',
}: FichaProducaoDisplayProps) {
  const { companyId, prefilled } = data;
  const supabase = createClient();
  const C = theme === 'dark' ? DARK : LIGHT;

  const [estagio, setEstagio] = useState<Estagio>('collecting');
  const [ficha, setFicha] = useState<FichaState>({
    nome: prefilled?.nome ?? '',
    categoria: prefilled?.categoria ?? '',
    rendimento_qtd: 1,
    rendimento_unid: 'unidades',
    itens: [],
  });
  const [fichaIdSalva, setFichaIdSalva] = useState<string | null>(null);
  const [isLoadingIA, setIsLoadingIA] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [novoItem, setNovoItem] = useState('');
  const [streamingItem, setStreamingItem] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'error' | 'warning' } | null>(null);

  const lastText = useRef('');
  const fichaRef = useRef(ficha);
  useEffect(() => { fichaRef.current = ficha; }, [ficha]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (msg: string, tipo: 'success' | 'error' | 'warning' = 'success') =>
    setToast({ msg, tipo });

  // Abertura
  useEffect(() => {
    if (prefilled?.nome) {
      const text = `Otimo! Vou criar uma ficha base para ${prefilled.nome}. Ja estou montando os ingredientes tipicos.`;
      playText(text).catch(() => {});
      lastText.current = text;
      gerarFichaBase(prefilled.nome, prefilled.categoria ?? '');
    } else {
      playText(OPENING_TEXT).catch(() => {});
      lastText.current = OPENING_TEXT;
    }
    return () => { window.speechSynthesis?.cancel(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useModalVoiceClose(handleClose);

  function handleClose() {
    window.speechSynthesis?.cancel();
    onClose();
  }

  // ── Gera ficha base via IA ────────────────────────────────

  async function gerarFichaBase(nome: string, categoria: string) {
    setIsLoadingIA(true);
    try {
      const prompt = `Você é especialista em gastronomia brasileira. Crie uma ficha técnica para: "${nome}".
Categoria: ${categoria || 'não informada'}.
Responda SOMENTE com JSON válido sem texto extra:
{"nome":"string","categoria":"string","rendimento_qtd":number,"rendimento_unid":"string","itens":[{"ingrediente_nome":"string","quantidade":number,"unidade":"kg|g|l|ml|un","preco_por_unidade":number,"perda_percentual":number}]}
Regras: 3-8 ingredientes típicos, quantidades e preços realistas para o Brasil.`;

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
      const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());

      const itens: ItemFicha[] = (parsed.itens ?? []).map((it: any) => ({
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
        chat_mensagem_original: `Ficha base: ${nome}`,
      }));

      setFicha(prev => ({
        ...prev,
        nome: parsed.nome ?? nome,
        categoria: parsed.categoria ?? categoria,
        rendimento_qtd: parsed.rendimento_qtd ?? 1,
        rendimento_unid: parsed.rendimento_unid ?? 'unidades',
        itens: [],
      }));

      for (const item of itens) {
        setStreamingItem(item.ingrediente_nome);
        await new Promise(r => setTimeout(r, 350));
        setFicha(prev => ({ ...prev, itens: [...prev.itens, item] }));
      }
      setStreamingItem(null);

      const speech = `Pronto! Criei a ficha de ${parsed.nome ?? nome} com ${itens.length} ingredientes. Os valores em italico sao estimativas. O que voce quer ajustar?`;
      playText(speech).catch(() => {});
      lastText.current = speech;
    } catch (err) {
      console.error('gerarFichaBase:', err);
      showToast('Nao consegui gerar a ficha. Adicione os ingredientes manualmente.', 'error');
    } finally {
      setIsLoadingIA(false);
    }
  }

  // ── Estima preço ──────────────────────────────────────────

  async function estimarPreco(nome: string, unidade: string): Promise<number> {
    try {
      const { data: d, error } = await supabase.functions.invoke('estimar-preco-ingrediente', {
        body: { ingrediente: nome, unidade, regiao: 'Brasil' },
      });
      if (error || !d?.success) return 0;
      return d.preco_estimado ?? 0;
    } catch { return 0; }
  }

  // ── Adiciona ingrediente ──────────────────────────────────

  async function adicionarIngrediente(textoOriginal: string) {
    const match = textoOriginal.match(
      /(\d+(?:[.,]\d+)?)\s*(kg|g|gramas?|grama|litros?|litro|ml|mililitros?|un|unidades?|unidade)/i
    );
    let quantidade = 100;
    let unidade: Unidade = 'g';
    let nomeIng = textoOriginal
      .replace(/\b(adicionar?|adiciona|coloca|add|inclui|incluir)\b/gi, '')
      .trim();

    if (match) {
      quantidade = parseFloat(match[1].replace(',', '.'));
      const u = match[2].toLowerCase();
      if (u.startsWith('kg'))    unidade = 'kg';
      else if (u.startsWith('ml') || u.startsWith('mili')) unidade = 'ml';
      else if (u.startsWith('litro') || u === 'l') unidade = 'l';
      else if (u.startsWith('un')) unidade = 'un';
      else unidade = 'g';
      nomeIng = nomeIng.replace(match[0], '').trim();
    }

    if (!nomeIng || nomeIng.length < 2) {
      showToast('Nao entendi. Tente: "adicionar frango 250 gramas"', 'warning');
      return;
    }

    setStreamingItem(nomeIng);

    const { data: ingEx } = await supabase
      .from('producao_ingredientes')
      .select('preco_por_unidade, source')
      .eq('company_id', companyId)
      .ilike('nome', `%${nomeIng}%`)
      .limit(1)
      .maybeSingle();

    let preco = ingEx?.preco_por_unidade ?? 0;
    const source: Source = ingEx ? (ingEx.source as Source) : 'ai_estimate';
    const confianca: Confianca = ingEx ? 'alta' : 'media';
    if (!ingEx) preco = await estimarPreco(nomeIng, unidade);

    setFicha(prev => ({
      ...prev,
      itens: [...prev.itens, {
        id: tempId(), ingrediente_nome: nomeIng, quantidade, unidade,
        preco_por_unidade: preco, perda_percentual: 0, source, confianca,
        chat_message_id: `voice_${Date.now()}`,
        chat_timestamp: new Date().toISOString(),
        chat_mensagem_original: textoOriginal,
      }],
    }));
    setStreamingItem(null);

    const speech = source !== 'user_input'
      ? `Adicionei ${nomeIng}, ${quantidade} ${unidade}. Estimei ${fmt(preco)} por ${unidade}. Voce pode corrigir depois.`
      : `Adicionei ${nomeIng}, ${quantidade} ${unidade}. Preco: ${fmt(preco)} por ${unidade}.`;
    playText(speech).catch(() => {});
    lastText.current = speech;
  }

  function removerItem(id: string) {
    setFicha(prev => ({ ...prev, itens: prev.itens.filter(i => i.id !== id) }));
  }

  function atualizarPreco(id: string, preco: number) {
    setFicha(prev => ({
      ...prev,
      itens: prev.itens.map(i =>
        i.id === id ? { ...i, preco_por_unidade: preco, source: 'user_input', confianca: 'alta' } : i
      ),
    }));
  }

  // ── Exporta PDF ───────────────────────────────────────────

  function exportarPDF() {
    const f = fichaRef.current;
    const itensC: ItemCalculo[] = f.itens.map(i => ({
      quantidade: i.quantidade, unidade: i.unidade,
      preco_por_unidade: i.preco_por_unidade, perda_percentual: i.perda_percentual, source: i.source,
    }));
    const res = calcularResultadoFicha(itensC, f.rendimento_qtd, f.preco_venda);
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Ficha de Producao: ${f.nome}`, 14, 20);
    doc.setFontSize(11);
    doc.text(`Categoria: ${f.categoria || '-'}  |  Rendimento: ${f.rendimento_qtd} ${f.rendimento_unid}`, 14, 30);
    autoTable(doc, {
      startY: 38,
      head: [['Ingrediente', 'Qtd', 'Unid', 'Preco/un', 'Custo', 'Fonte']],
      body: f.itens.map(item => [
        item.ingrediente_nome + (item.source !== 'user_input' ? ' *' : ''),
        item.quantidade, item.unidade,
        fmt(item.preco_por_unidade), fmt(calcCusto(item)),
        item.source !== 'user_input' ? 'estimado' : 'confirmado',
      ]),
    });
    const fy = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text(`Custo Total: ${fmt(res.custo_total)}`, 14, fy);
    doc.text(`Peso Total: ${res.peso_total_kg.toFixed(2)} kg`, 14, fy + 8);
    doc.text(`Preco Sugerido (3x): ${fmt(res.preco_sugerido)}`, 14, fy + 16);
    if (f.preco_venda) doc.text(`Margem Bruta: ${res.margem_bruta.toFixed(1)}%`, 14, fy + 24);
    if (fichaTemEstimativas(f.itens)) {
      doc.setFontSize(9);
      doc.setTextColor(180, 100, 0);
      doc.text('* Estimativas de IA — confirme com seus fornecedores.', 14, fy + 36, { maxWidth: 180 });
    }
    doc.save(`ficha-${f.nome.toLowerCase().replace(/\s+/g, '-')}.pdf`);
    showToast('PDF exportado!', 'success');
  }

  // ── Salva ─────────────────────────────────────────────────

  async function salvarFicha() {
    if (!ficha.nome.trim()) { showToast('Informe o nome da receita.', 'warning'); return; }
    if (ficha.itens.length === 0) { showToast('Adicione pelo menos um ingrediente.', 'warning'); return; }
    setIsSaving(true);
    try {
      const itensC: ItemCalculo[] = ficha.itens.map(i => ({
        quantidade: i.quantidade, unidade: i.unidade,
        preco_por_unidade: i.preco_por_unidade, perda_percentual: i.perda_percentual, source: i.source,
      }));
      const resultado = calcularResultadoFicha(itensC, ficha.rendimento_qtd, ficha.preco_venda);

      const { data: fd, error: fe } = await supabase.from('producao_fichas').insert({
        company_id: companyId, nome: ficha.nome, categoria: ficha.categoria || null,
        rendimento_qtd: ficha.rendimento_qtd, rendimento_unid: ficha.rendimento_unid,
        preco_venda: ficha.preco_venda || null, criado_por_voz: true,
        tem_estimativas: resultado.tem_estimativas,
      }).select('id').single();
      if (fe || !fd) throw fe ?? new Error('Erro ao criar ficha');
      const fichaId = fd.id;

      for (const item of ficha.itens) {
        if (item.source === 'user_input') {
          await supabase.from('producao_ingredientes').upsert({
            company_id: companyId, nome: item.ingrediente_nome, unidade: item.unidade,
            preco_por_unidade: item.preco_por_unidade, source: 'user_input', estimado_ia: false,
          }, { onConflict: 'company_id,nome' });
        }
        const { data: ingData } = await supabase.from('producao_ingredientes').select('id')
          .eq('company_id', companyId).ilike('nome', item.ingrediente_nome).maybeSingle();
        let ingId = ingData?.id ?? null;
        if (!ingId) {
          const { data: ni } = await supabase.from('producao_ingredientes').insert({
            company_id: companyId, nome: item.ingrediente_nome, unidade: item.unidade,
            preco_por_unidade: item.preco_por_unidade, source: item.source,
            estimado_ia: item.source !== 'user_input',
          }).select('id').single();
          ingId = ni?.id ?? null;
        }
        await supabase.from('producao_ficha_itens').insert({
          ficha_id: fichaId, ingrediente_id: ingId,
          ingrediente_nome_temp: ingId ? null : item.ingrediente_nome,
          preco_temp: ingId ? null : item.preco_por_unidade,
          quantidade: item.quantidade, unidade: item.unidade,
          perda_percentual: item.perda_percentual, source: item.source, confianca: item.confianca,
          chat_message_id: item.chat_message_id ?? null,
          chat_timestamp: item.chat_timestamp ?? null,
          chat_mensagem_original: item.chat_mensagem_original ?? null,
          ordem: ficha.itens.indexOf(item),
        });
      }

      setFichaIdSalva(fichaId);
      setEstagio('saved');
      const speech = `Incrivel! Ficha ${ficha.nome} salva. Custo: ${fmt(resultado.custo_total)}. Preco sugerido: ${fmt(resultado.preco_sugerido)}.`;
      playText(speech).catch(() => {});
      lastText.current = speech;
    } catch (err) {
      console.error('salvarFicha:', err);
      showToast('Erro ao salvar. Tente novamente.', 'error');
    } finally {
      setIsSaving(false);
    }
  }

  // ── Voz ───────────────────────────────────────────────────

  useModalVoiceCommand({
    active: true,
    onTranscript: (transcript) => {
      const t = normalize(transcript);
      if (['fechar', 'cancelar', 'sair', 'encerrar'].some(c => t.includes(c))) { handleClose(); return; }
      if (['repetir', 'repete', 'de novo', 'repita'].some(c => t.includes(c))) { playText(lastText.current).catch(() => {}); return; }
      if (['exportar', 'pdf', 'imprimir'].some(c => t.includes(c))) { exportarPDF(); return; }
      if (['salvar', 'salva', 'confirmar', 'confirma', 'concluir', 'pronto'].some(c => t.includes(c))) {
        if (estagio === 'collecting') {
          setEstagio('reviewing');
          const f = fichaRef.current;
          const itensC: ItemCalculo[] = f.itens.map(i => ({ quantidade: i.quantidade, unidade: i.unidade, preco_por_unidade: i.preco_por_unidade, perda_percentual: i.perda_percentual, source: i.source }));
          const res = calcularResultadoFicha(itensC, f.rendimento_qtd);
          const speech = `Aqui esta sua ficha! Custo: ${fmt(res.custo_total)}, preco sugerido: ${fmt(res.preco_sugerido)}.${fichaTemEstimativas(f.itens) ? ' Alguns valores sao estimativas.' : ''} Diga salvar para confirmar.`;
          playText(speech).catch(() => {}); lastText.current = speech;
        } else if (estagio === 'reviewing') { salvarFicha(); }
        return;
      }
      if (['remover', 'remove', 'tirar', 'excluir'].some(c => t.includes(c))) {
        const f = fichaRef.current;
        const palavras = t.split(/\s+/);
        const idx = palavras.findIndex(p => ['remover', 'remove', 'tirar', 'excluir'].includes(p));
        const alvo = palavras.slice(idx + 1).join(' ');
        const item = f.itens.find(i => normalize(i.ingrediente_nome).includes(alvo));
        if (item) { removerItem(item.id); playText(`Removi ${item.ingrediente_nome}.`).catch(() => {}); }
        else showToast('Ingrediente nao encontrado.', 'warning');
        return;
      }
      if (['adicionar', 'adiciona', 'coloca', 'incluir', 'inclui'].some(c => t.includes(c))) {
        adicionarIngrediente(transcript.replace(/\b(adicionar?|adiciona|coloca|inclui|incluir)\b/gi, '').trim());
        return;
      }
      if (estagio === 'collecting' && !fichaRef.current.nome && fichaRef.current.itens.length === 0) {
        const nome = transcript.replace(/\b(quero|criar|cadastrar|fazer|nova)\b/gi, '').trim();
        if (nome.length > 2) {
          setFicha(prev => ({ ...prev, nome }));
          gerarFichaBase(nome, '');
        }
      }
    },
  });

  // ── Cálculos reativos ─────────────────────────────────────

  const itensC: ItemCalculo[] = ficha.itens.map(i => ({
    quantidade: i.quantidade, unidade: i.unidade,
    preco_por_unidade: i.preco_por_unidade, perda_percentual: i.perda_percentual, source: i.source,
  }));
  const resultado = calcularResultadoFicha(itensC, ficha.rendimento_qtd, ficha.preco_venda);
  const temEstimativas = fichaTemEstimativas(ficha.itens);

  // ─────────────────────────────────────────────────────────
  // Render helpers
  // ─────────────────────────────────────────────────────────

  const toastStyle = toast
    ? toast.tipo === 'success' ? C.toastSuccess
    : toast.tipo === 'error'   ? C.toastError
    : C.toastWarn
    : C.toastSuccess;

  const estágios: Estagio[] = ['collecting', 'reviewing', 'saved'];
  const estagioLabels = ['Coletando', 'Revisando', 'Salvo'];
  const estagioAtual = estágios.indexOf(estagio);

  // ─────────────────────────────────────────────────────────
  // JSX
  // ─────────────────────────────────────────────────────────

  return createPortal(
    <>
      {/* ── Overlay ── */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
        }}
        onClick={handleClose}
      />

      {/* ── Modal wrapper — responde ao viewport ── */}
      <div
        style={{
          position: 'fixed', zIndex: 9999,
          // Mobile: bottom sheet
          bottom: 0, left: 0, right: 0,
          // Sem max-width no mobile; controlado por media query abaixo
        }}
        className="ficha-modal-root"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Modal inner ── */}
        <div
          className="ficha-modal-inner"
          style={{
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: '16px 16px 0 0',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '92vh',
            overflow: 'hidden',
          }}
        >
          {/* ═══════════════════════════════════════
              MOBILE LAYOUT — stacked vertical
          ═══════════════════════════════════════ */}

          {/* Header azul mobile */}
          <div
            className="ficha-header-mobile"
            style={{
              background: '#1d4ed8',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: 6 }}>
                <Clipboard size={18} color="#fff" />
              </div>
              <div>
                <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, margin: 0 }}>Fichas de Producao</p>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: 0 }}>
                  {estagio === 'collecting' && 'Coletando ingredientes...'}
                  {estagio === 'reviewing'  && 'Revisao final'}
                  {estagio === 'saved'      && ficha.nome}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer' }}
            >
              <X size={18} color="#fff" />
            </button>
          </div>

          {/* ═══════════════════════════════════════
              DESKTOP LAYOUT — sidebar + content
              Controlado via className + CSS abaixo
          ═══════════════════════════════════════ */}
          <div className="ficha-body" style={{ display: 'flex', flex: 1, minHeight: 0 }}>

            {/* Sidebar azul desktop */}
            <div
              className="ficha-sidebar"
              style={{
                background: '#1d4ed8',
                width: 220,
                flexShrink: 0,
                display: 'none', // sobrescrito via CSS
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: 24,
              }}
            >
              {/* Título sidebar */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
                  <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: 8 }}>
                    <Clipboard size={22} color="#fff" />
                  </div>
                  <div>
                    <p style={{ color: '#fff', fontWeight: 700, fontSize: 16, margin: 0, lineHeight: 1.2 }}>Fichas de</p>
                    <p style={{ color: '#fff', fontWeight: 700, fontSize: 16, margin: 0, lineHeight: 1.2 }}>Producao</p>
                  </div>
                </div>

                {/* Stepper */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {estágios.map((e, i) => {
                    const isActive = estagio === e;
                    const isDone = estagioAtual > i;
                    return (
                      <div key={e} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 700,
                          background: isDone ? '#4ade80' : isActive ? '#fff' : 'rgba(255,255,255,0.2)',
                          color: isDone ? '#fff' : isActive ? '#1d4ed8' : 'rgba(255,255,255,0.4)',
                        }}>
                          {isDone ? '✓' : i + 1}
                        </div>
                        <span style={{
                          fontSize: 13, fontWeight: 500,
                          color: isDone ? '#86efac' : isActive ? '#fff' : 'rgba(255,255,255,0.35)',
                        }}>
                          {estagioLabels[i]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Resumo financeiro */}
              {ficha.itens.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24 }}>
                  <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 14px' }}>
                    <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, margin: '0 0 2px' }}>Custo Total</p>
                    <p style={{ color: '#fff', fontWeight: 700, fontSize: 18, margin: 0 }}>{fmt(resultado.custo_total)}</p>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 14px' }}>
                    <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, margin: '0 0 2px' }}>Sugerido (3x)</p>
                    <p style={{ color: '#fff', fontWeight: 700, fontSize: 16, margin: 0 }}>{fmt(resultado.preco_sugerido)}</p>
                  </div>
                  {ficha.preco_venda && ficha.preco_venda > 0 && (
                    <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 14px' }}>
                      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, margin: '0 0 2px' }}>Margem Bruta</p>
                      <p style={{ color: resultado.margem_bruta > 30 ? '#86efac' : '#fde047', fontWeight: 700, fontSize: 16, margin: 0 }}>
                        {resultado.margem_bruta.toFixed(1)}%
                      </p>
                    </div>
                  )}
                  {temEstimativas && (
                    <div style={{ background: 'rgba(234,179,8,0.2)', borderRadius: 10, padding: '8px 12px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <AlertTriangle size={14} color="#fde047" />
                      <p style={{ color: '#fde047', fontSize: 11, margin: 0 }}>Contém estimativas de IA</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Coluna de conteúdo ── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

              {/* Toast */}
              {toast && (
                <div style={{
                  margin: '12px 20px 0',
                  padding: '8px 14px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 500,
                  flexShrink: 0,
                  background: toastStyle.bg,
                  color: toastStyle.text,
                  border: `1px solid ${toastStyle.border}`,
                }}>
                  {toast.msg}
                </div>
              )}

              {/* Conteúdo scrollável */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* ══ COLLECTING ══ */}
                {estagio === 'collecting' && (
                  <>
                    {/* Campo nome */}
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 500, color: C.textMuted, display: 'block', marginBottom: 4 }}>
                        Nome da receita
                      </label>
                      <input
                        value={ficha.nome}
                        onChange={e => setFicha(prev => ({ ...prev, nome: e.target.value }))}
                        placeholder="Ex: Pizza de Mussarela"
                        style={{
                          width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 14,
                          background: C.inputBg, border: `1px solid ${C.inputBorder}`, color: C.text,
                          outline: 'none', boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    {/* Loading IA */}
                    {isLoadingIA && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 16px', borderRadius: 12,
                        background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)',
                      }}>
                        <div style={{
                          width: 16, height: 16, borderRadius: '50%',
                          border: '2px solid #3b82f6', borderTopColor: 'transparent',
                          animation: 'spin 0.8s linear infinite', flexShrink: 0,
                        }} />
                        <span style={{ fontSize: 13, color: '#60a5fa' }}>Criando ficha base com IA...</span>
                      </div>
                    )}

                    {/* Streaming item */}
                    {streamingItem && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 12px', borderRadius: 8,
                        background: C.bgTertiary, fontSize: 13, color: C.textMuted,
                      }}>
                        <div style={{
                          width: 12, height: 12, borderRadius: '50%',
                          border: '2px solid #60a5fa', borderTopColor: 'transparent',
                          animation: 'spin 0.8s linear infinite', flexShrink: 0,
                        }} />
                        Adicionando: <strong style={{ color: C.text }}>{streamingItem}</strong>
                      </div>
                    )}

                    {/* Tabela de itens */}
                    {ficha.itens.length > 0 && (
                      <div style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.border}` }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                          <thead>
                            <tr style={{ background: C.bgSecondary }}>
                              <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 500, color: C.textMuted }}>Ingrediente</th>
                              <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 500, color: C.textMuted }}>Qtd</th>
                              <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 500, color: C.textMuted }}>R$/un</th>
                              <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 500, color: C.textMuted, display: 'none' }} className="ficha-col-desktop">Custo</th>
                              <th style={{ padding: '8px 12px', fontWeight: 500, color: C.textMuted, display: 'none' }} className="ficha-col-desktop">Fonte</th>
                              <th style={{ width: 32 }} />
                            </tr>
                          </thead>
                          <tbody>
                            {ficha.itens.map(item => {
                              const isEst = item.source !== 'user_input';
                              return (
                                <tr key={item.id} style={{ borderTop: `1px solid ${C.border}` }}>
                                  <td style={{
                                    padding: '8px 12px', fontWeight: 500,
                                    fontStyle: isEst ? 'italic' : 'normal',
                                    color: isEst ? C.textMuted : C.text,
                                  }}>
                                    {item.ingrediente_nome}
                                  </td>
                                  <td style={{
                                    padding: '8px 12px', textAlign: 'right',
                                    fontStyle: isEst ? 'italic' : 'normal',
                                    color: isEst ? C.textMuted : C.text,
                                  }}>
                                    {item.quantidade}{item.unidade}
                                  </td>
                                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                                    <input
                                      type="number" min="0" step="0.01"
                                      value={item.preco_por_unidade}
                                      onChange={e => atualizarPreco(item.id, parseFloat(e.target.value) || 0)}
                                      style={{
                                        width: 72, textAlign: 'right', padding: '2px 6px',
                                        borderRadius: 6, fontSize: 12,
                                        background: C.inputBg, border: `1px solid ${C.inputBorder}`, color: C.text,
                                        outline: 'none',
                                      }}
                                    />
                                  </td>
                                  <td style={{
                                    padding: '8px 12px', textAlign: 'right', display: 'none',
                                    fontStyle: isEst ? 'italic' : 'normal',
                                    color: isEst ? C.textMuted : C.text,
                                  }} className="ficha-col-desktop">
                                    {fmt(calcCusto(item))}
                                  </td>
                                  <td style={{
                                    padding: '8px 12px', fontSize: 11, display: 'none',
                                    color: isEst ? '#eab308' : '#22c55e',
                                  }} className="ficha-col-desktop">
                                    {isEst ? '⚠ estimado' : '✓ confirmado'}
                                  </td>
                                  <td style={{ padding: '4px 8px' }}>
                                    <button
                                      onClick={() => removerItem(item.id)}
                                      style={{
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        padding: 4, borderRadius: 6, color: C.textMuted,
                                      }}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Custo parcial (mobile) */}
                    {ficha.itens.length > 0 && (
                      <div
                        className="ficha-custo-mobile"
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '10px 16px', borderRadius: 12,
                          background: C.bgSecondary, border: `1px solid ${C.border}`,
                        }}
                      >
                        <span style={{ fontSize: 13, color: C.textMuted }}>Custo parcial</span>
                        <span style={{ fontSize: 16, fontWeight: 700, color: '#3b82f6' }}>{fmt(resultado.custo_total)}</span>
                      </div>
                    )}

                    {/* Adicionar ingrediente */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        value={novoItem}
                        onChange={e => setNovoItem(e.target.value)}
                        placeholder='Ex: "mussarela 280g" ou diga em voz alta'
                        onKeyDown={e => {
                          if (e.key === 'Enter' && novoItem.trim()) {
                            adicionarIngrediente(novoItem);
                            setNovoItem('');
                          }
                        }}
                        style={{
                          flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 13,
                          background: C.inputBg, border: `1px solid ${C.inputBorder}`, color: C.text,
                          outline: 'none',
                        }}
                      />
                      <button
                        onClick={() => { if (novoItem.trim()) { adicionarIngrediente(novoItem); setNovoItem(''); } }}
                        style={{
                          padding: '8px 14px', background: '#2563eb', color: '#fff',
                          border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                        }}
                      >
                        <Plus size={15} /> Adicionar
                      </button>
                    </div>

                    {temEstimativas && (
                      <div style={{
                        display: 'flex', gap: 8, alignItems: 'flex-start',
                        padding: '10px 14px', borderRadius: 10,
                        background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)',
                      }}>
                        <AlertTriangle size={15} color="#eab308" />
                        <p style={{ margin: 0, fontSize: 11, color: '#eab308' }}>{AVISO_ESTIMATIVAS}</p>
                      </div>
                    )}
                  </>
                )}

                {/* ══ REVIEWING ══ */}
                {estagio === 'reviewing' && (
                  <>
                    <div style={{
                      padding: '12px 16px', borderRadius: 12,
                      background: C.bgSecondary, border: `1px solid ${C.border}`,
                    }}>
                      <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 14, color: C.text }}>{ficha.nome}</p>
                      <p style={{ margin: 0, fontSize: 12, color: C.textMuted }}>
                        Rendimento: {ficha.rendimento_qtd} {ficha.rendimento_unid}
                        {ficha.categoria && ` · ${ficha.categoria}`}
                      </p>
                    </div>

                    <div style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.border}` }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: C.bgSecondary }}>
                            <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 500, color: C.textMuted }}>Ingrediente</th>
                            <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 500, color: C.textMuted }}>Qtd</th>
                            <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 500, color: C.textMuted }}>Custo</th>
                            <th style={{ padding: '8px 12px', fontWeight: 500, color: C.textMuted }}>Fonte</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ficha.itens.map(item => {
                            const isEst = item.source !== 'user_input';
                            return (
                              <tr key={item.id} style={{ borderTop: `1px solid ${C.border}` }}>
                                <td style={{ padding: '8px 12px', fontStyle: isEst ? 'italic' : 'normal', color: isEst ? C.textMuted : C.text }}>{item.ingrediente_nome}</td>
                                <td style={{ padding: '8px 12px', textAlign: 'right', fontStyle: isEst ? 'italic' : 'normal', color: isEst ? C.textMuted : C.text }}>{item.quantidade}{item.unidade}</td>
                                <td style={{ padding: '8px 12px', textAlign: 'right', fontStyle: isEst ? 'italic' : 'normal', color: isEst ? C.textMuted : C.text }}>{fmt(calcCusto(item))}</td>
                                <td style={{ padding: '8px 12px', fontSize: 11, color: isEst ? '#eab308' : '#22c55e' }}>{isEst ? '⚠ estimado' : '✓ confirmado'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Cards mobile */}
                    <div
                      className="ficha-cards-mobile"
                      style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}
                    >
                      {[
                        { label: 'Custo Total', value: fmt(resultado.custo_total), accent: true },
                        { label: 'Peso Total', value: `${resultado.peso_total_kg.toFixed(2)} kg`, accent: false },
                        { label: 'Custo/Unid', value: fmt(resultado.custo_por_unidade), accent: false },
                        { label: 'Preco Sug.', value: fmt(resultado.preco_sugerido), accent: true },
                      ].map(({ label, value, accent }) => (
                        <div key={label} style={{
                          padding: '10px 14px', borderRadius: 10,
                          background: C.bgSecondary, border: `1px solid ${C.border}`,
                        }}>
                          <p style={{ margin: '0 0 2px', fontSize: 11, color: C.textMuted }}>{label}</p>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: accent ? '#3b82f6' : C.text }}>{value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Preço de venda */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <label style={{ fontSize: 13, color: C.textMuted, whiteSpace: 'nowrap' }}>Preco de venda:</label>
                      <input
                        type="number" min="0" step="0.01"
                        value={ficha.preco_venda ?? ''}
                        onChange={e => setFicha(prev => ({ ...prev, preco_venda: parseFloat(e.target.value) || undefined }))}
                        placeholder="R$ 0,00"
                        style={{
                          flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 13,
                          background: C.inputBg, border: `1px solid ${C.inputBorder}`, color: C.text, outline: 'none',
                        }}
                      />
                      {ficha.preco_venda && ficha.preco_venda > 0 && (
                        <span style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', color: resultado.margem_bruta > 30 ? '#22c55e' : '#eab308' }}>
                          {resultado.margem_bruta.toFixed(1)}%
                        </span>
                      )}
                    </div>

                    {temEstimativas && (
                      <div style={{
                        display: 'flex', gap: 8, alignItems: 'flex-start',
                        padding: '10px 14px', borderRadius: 10,
                        background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)',
                      }}>
                        <AlertTriangle size={15} color="#eab308" />
                        <p style={{ margin: 0, fontSize: 11, color: '#eab308' }}>{AVISO_ESTIMATIVAS}</p>
                      </div>
                    )}
                  </>
                )}

                {/* ══ SAVED ══ */}
                {estagio === 'saved' && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '16px 0' }}>
                    <div style={{ background: 'rgba(34,197,94,0.15)', borderRadius: '50%', padding: 20 }}>
                      <CheckCircle size={48} color="#4ade80" />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: C.text }}>Ficha salva com sucesso!</p>
                      <p style={{ margin: 0, fontSize: 13, color: C.textMuted }}>{ficha.nome}</p>
                    </div>
                    <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div style={{ padding: '12px 16px', borderRadius: 12, textAlign: 'center', background: C.bgSecondary, border: `1px solid ${C.border}` }}>
                        <p style={{ margin: '0 0 2px', fontSize: 11, color: C.textMuted }}>Custo Total</p>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 17, color: '#3b82f6' }}>{fmt(resultado.custo_total)}</p>
                      </div>
                      <div style={{ padding: '12px 16px', borderRadius: 12, textAlign: 'center', background: C.bgSecondary, border: `1px solid ${C.border}` }}>
                        <p style={{ margin: '0 0 2px', fontSize: 11, color: C.textMuted }}>Preco Sugerido</p>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 17, color: C.text }}>{fmt(resultado.preco_sugerido)}</p>
                      </div>
                    </div>
                    <div style={{ width: '100%', display: 'flex', gap: 12 }}>
                      <button
                        onClick={exportarPDF}
                        style={{
                          flex: 1, padding: '12px 16px', borderRadius: 12, fontSize: 13, fontWeight: 500,
                          background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          border: `1px solid ${C.btnOutline.border}`, color: C.btnOutline.text,
                        }}
                      >
                        <FileText size={16} /> Exportar PDF
                      </button>
                      {fichaIdSalva && (
                        <a
                          href="/dashboard/fichas"
                          style={{
                            flex: 1, padding: '12px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                            background: '#16a34a', color: '#fff', textDecoration: 'none',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          }}
                        >
                          <ExternalLink size={16} /> Ver no Dashboard
                        </a>
                      )}
                    </div>
                    {temEstimativas && (
                      <div style={{
                        width: '100%', display: 'flex', gap: 8, alignItems: 'flex-start',
                        padding: '10px 14px', borderRadius: 10,
                        background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)',
                      }}>
                        <AlertTriangle size={15} color="#eab308" />
                        <p style={{ margin: 0, fontSize: 11, color: '#eab308' }}>{AVISO_ESTIMATIVAS}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              {estagio !== 'saved' && (
                <div style={{
                  padding: '14px 20px', flexShrink: 0,
                  borderTop: `1px solid ${C.border}`,
                  display: 'flex', flexDirection: 'column', gap: 10,
                }}>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {estagio === 'collecting' && (
                      <button
                        onClick={() => {
                          setEstagio('reviewing');
                          playText('Revisando sua ficha. Confira e diga salvar para confirmar.').catch(() => {});
                        }}
                        disabled={ficha.itens.length === 0 || isLoadingIA}
                        style={{
                          flex: 1, padding: '12px', borderRadius: 12, fontSize: 14, fontWeight: 600,
                          background: ficha.itens.length === 0 || isLoadingIA ? '#93c5fd' : '#2563eb',
                          color: '#fff', border: 'none', cursor: ficha.itens.length === 0 || isLoadingIA ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}
                      >
                        <CheckCircle size={16} /> Revisar Ficha
                      </button>
                    )}
                    {estagio === 'reviewing' && (
                      <>
                        <button
                          onClick={() => setEstagio('collecting')}
                          style={{
                            flex: 1, padding: '12px', borderRadius: 12, fontSize: 14, fontWeight: 500,
                            background: 'none', cursor: 'pointer',
                            border: `1px solid ${C.btnOutline.border}`, color: C.btnOutline.text,
                          }}
                        >
                          Voltar e Editar
                        </button>
                        <button
                          onClick={salvarFicha}
                          disabled={isSaving}
                          style={{
                            flex: 1, padding: '12px', borderRadius: 12, fontSize: 14, fontWeight: 600,
                            background: isSaving ? '#86efac' : '#16a34a',
                            color: '#fff', border: 'none', cursor: isSaving ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          }}
                        >
                          {isSaving ? (
                            <>
                              <div style={{
                                width: 14, height: 14, borderRadius: '50%',
                                border: '2px solid #fff', borderTopColor: 'transparent',
                                animation: 'spin 0.8s linear infinite',
                              }} />
                              Salvando...
                            </>
                          ) : (
                            <><Save size={16} /> Salvar Ficha (3 creditos)</>
                          )}
                        </button>
                      </>
                    )}
                  </div>

                  {/* Voice hint — texto puro, sem HTML */}
                  <div style={{
                    padding: '8px 12px', borderRadius: 10, fontSize: 12,
                    background: C.hintBg, color: C.hintText,
                    border: `1px solid ${C.border}`,
                  }}>
                    {estagio === 'collecting'
                      ? 'Diga: "adicionar [ingrediente] [quantidade]", "remover [ingrediente]" ou "revisar"'
                      : 'Diga: "salvar" para confirmar, "exportar" para PDF ou "voltar" para editar'
                    }
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── CSS responsivo — scoped ── */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Mobile: bottom sheet, max 92vh, sem borda inferior */
        .ficha-modal-root {
          bottom: 0;
          left: 0;
          right: 0;
        }
        .ficha-modal-inner {
          border-radius: 16px 16px 0 0 !important;
          max-height: 92vh;
        }
        .ficha-sidebar    { display: none !important; }
        .ficha-header-mobile { display: flex !important; }

        /* Desktop (≥ 768px): modal centralizado, deitado */
        @media (min-width: 768px) {
          .ficha-modal-root {
            bottom: auto;
            left: 50%;
            right: auto;
            top: 50%;
            transform: translate(-50%, -50%);
            width: 100%;
            max-width: 860px;
            padding: 0 16px;
          }
          .ficha-modal-inner {
            border-radius: 16px !important;
            flex-direction: row !important;
            max-height: 88vh;
          }
          .ficha-sidebar         { display: flex !important; }
          .ficha-header-mobile   { display: none !important; }
          .ficha-custo-mobile    { display: none !important; }
          .ficha-cards-mobile    { display: none !important; }
          .ficha-col-desktop     { display: table-cell !important; }
        }
      `}</style>
    </>,
    document.body
  );
}