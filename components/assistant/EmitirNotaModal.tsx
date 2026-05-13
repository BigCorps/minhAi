'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase-browser';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';
import AssistenteFiscalChat from '@/components/dashboard/vendas/AssistenteFiscalChat';
import {
  Receipt,
  CheckCircle,
  CheckCircle2,
  XCircle,
  Download,
  Loader2,
  X,
  ArrowLeft,
  ArrowRight,
  Mic,
  Plus,
  Trash2,
  MessageSquare,
  ClipboardList,
  User,
  Package,
} from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ItemNota {
  nome: string;
  quantidade: number;
  valor_unitario: number;
  unidade: string;
  ncm?: string;
  cfop?: number;
  origem_produto?: number;
  produto_id?: string;
  ncm_sugerido?: boolean;
}

interface DadosNota {
  destinatario: {
    nome: string;
    cpf_cnpj?: string;
    endereco?: string;
  };
  itens: ItemNota[];
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface EmitirNotaModalProps {
  data: {
    companyId: string;
    nfe_plano?: string | null;
    pedidoId?: string;
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText?: (text: string) => Promise<void>;
}

type Step = 'form' | 'form_nfe' | 'confirming' | 'emitting' | 'success' | 'error';

// ─── Ícones de volume ─────────────────────────────────────────────────────────

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

// ─── Painel de preenchimento manual (direita) ─────────────────────────────────
// Substitui PreviewNotaFiscal: campos editáveis em sincronia com o assistente IA

interface EditablePreviewProps {
  dados: DadosNota | null;
  onChange: (dados: DadosNota) => void;
  isDark: boolean;
}

const ITEM_VAZIO: ItemNota = {
  nome: '',
  quantidade: 1,
  valor_unitario: 0,
  unidade: 'UN',
};

function EditablePreviewNota({ dados, onChange, isDark }: EditablePreviewProps) {
  const border  = isDark ? 'border-slate-700' : 'border-gray-200';
  const bg      = isDark ? 'bg-slate-900' : 'bg-white';
  const bgInput = isDark ? 'bg-slate-800' : 'bg-white';
  const text    = isDark ? 'text-white' : 'text-gray-900';
  const muted   = isDark ? 'text-slate-400' : 'text-gray-500';
  const label   = `block text-[11px] font-medium mb-0.5 ${muted}`;
  const input   = `w-full px-2.5 py-1.5 rounded-lg border ${border} ${bgInput} ${text} text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`;

  // Garante estrutura mínima mesmo quando dados é null
  const dest  = dados?.destinatario ?? { nome: '', cpf_cnpj: '', endereco: '' };
  const itens = dados?.itens ?? [];

  function setDest(key: keyof typeof dest, val: string) {
    onChange({
      destinatario: { ...dest, [key]: val },
      itens,
    });
  }

  function setItem(idx: number, key: keyof ItemNota, val: string | number) {
    const next = itens.map((it, i) => i === idx ? { ...it, [key]: val } : it);
    onChange({ destinatario: dest, itens: next });
  }

  function addItem() {
    onChange({ destinatario: dest, itens: [...itens, { ...ITEM_VAZIO }] });
  }

  function removeItem(idx: number) {
    onChange({ destinatario: dest, itens: itens.filter((_, i) => i !== idx) });
  }

  // Calcula total para exibir
  const total = itens.reduce((acc, it) => acc + (it.quantidade * it.valor_unitario), 0);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* ── Cabeçalho do painel ── */}
      <div className={`px-4 py-3 border-b ${border} flex items-center gap-2 flex-shrink-0`}>
        <ClipboardList className="w-4 h-4 text-blue-500" />
        <span className={`text-sm font-semibold ${text}`}>Preencher manualmente</span>
        {dados && itens.length > 0 && itens.some(i => i.nome && i.valor_unitario > 0) && (
          <span className="ml-auto flex items-center gap-1 text-[11px] text-green-500 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Pronto
          </span>
        )}
      </div>

      <div className="p-4 space-y-5 flex-1">

        {/* ── Destinatário ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <User className={`w-4 h-4 ${muted}`} />
            <span className={`text-xs font-semibold uppercase tracking-wide ${muted}`}>Destinatário</span>
            <span className={`text-[10px] ${muted}`}>(opcional)</span>
          </div>

          <div className="space-y-2">
            <div>
              <label className={label}>Nome / Razão Social</label>
              <input
                type="text"
                value={dest.nome}
                onChange={(e) => setDest('nome', e.target.value)}
                placeholder="Nome do cliente ou empresa"
                className={input}
              />
            </div>
            <div>
              <label className={label}>CPF / CNPJ</label>
              <input
                type="text"
                value={dest.cpf_cnpj ?? ''}
                onChange={(e) => setDest('cpf_cnpj', e.target.value)}
                placeholder="000.000.000-00"
                className={input}
              />
            </div>
            <div>
              <label className={label}>Endereço</label>
              <input
                type="text"
                value={dest.endereco ?? ''}
                onChange={(e) => setDest('endereco', e.target.value)}
                placeholder="Rua, número, cidade"
                className={input}
              />
            </div>
          </div>
        </div>

        {/* ── Itens ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Package className={`w-4 h-4 ${muted}`} />
            <span className={`text-xs font-semibold uppercase tracking-wide ${muted}`}>Itens</span>
            <span className="ml-auto">
              <button
                onClick={addItem}
                className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-400 font-medium transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar
              </button>
            </span>
          </div>

          {itens.length === 0 && (
            <button
              onClick={addItem}
              className={`w-full py-6 rounded-xl border-2 border-dashed ${
                isDark ? 'border-slate-700 hover:border-blue-500/50' : 'border-gray-200 hover:border-blue-300'
              } transition flex flex-col items-center gap-2`}
            >
              <Plus className={`w-5 h-5 ${muted}`} />
              <span className={`text-xs ${muted}`}>Clique para adicionar um item</span>
            </button>
          )}

          <div className="space-y-3">
            {itens.map((item, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl border ${border} ${isDark ? 'bg-slate-800/50' : 'bg-gray-50'} space-y-2`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[11px] font-semibold ${muted}`}>Item {idx + 1}</span>
                  <button
                    onClick={() => removeItem(idx)}
                    className="text-red-400 hover:text-red-500 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Nome */}
                <div>
                  <label className={label}>Descrição *</label>
                  <input
                    type="text"
                    value={item.nome}
                    onChange={(e) => setItem(idx, 'nome', e.target.value)}
                    placeholder="Ex: Produto A"
                    className={input}
                  />
                </div>

                {/* Qtd + Valor + Unidade */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className={label}>Qtd *</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={item.quantidade}
                      onChange={(e) => setItem(idx, 'quantidade', parseFloat(e.target.value) || 1)}
                      className={input}
                    />
                  </div>
                  <div>
                    <label className={label}>Valor unit. *</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.valor_unitario || ''}
                      onChange={(e) => setItem(idx, 'valor_unitario', parseFloat(e.target.value) || 0)}
                      placeholder="0,00"
                      className={input}
                    />
                  </div>
                  <div>
                    <label className={label}>Unidade</label>
                    <select
                      value={item.unidade}
                      onChange={(e) => setItem(idx, 'unidade', e.target.value)}
                      className={input}
                    >
                      {['UN', 'KG', 'L', 'CX', 'PC', 'M', 'M2', 'HR'].map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* NCM + CFOP (opcionais) */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={label}>NCM <span className={muted}>(opcional)</span></label>
                    <input
                      type="text"
                      maxLength={8}
                      value={item.ncm ?? ''}
                      onChange={(e) => setItem(idx, 'ncm', e.target.value.replace(/\D/g, ''))}
                      placeholder="00000000"
                      className={`${input} font-mono`}
                    />
                  </div>
                  <div>
                    <label className={label}>CFOP <span className={muted}>(opcional)</span></label>
                    <input
                      type="number"
                      value={item.cfop ?? ''}
                      onChange={(e) => setItem(idx, 'cfop', parseInt(e.target.value) || undefined as any)}
                      placeholder="5102"
                      className={input}
                    />
                  </div>
                </div>

                {/* Subtotal */}
                {item.valor_unitario > 0 && (
                  <p className={`text-xs text-right font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                    Subtotal: R$ {(item.quantidade * item.valor_unitario).toFixed(2)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Rodapé com total ── */}
      {itens.length > 0 && (
        <div className={`px-4 py-3 border-t ${border} flex-shrink-0`}>
          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium ${muted}`}>Total da nota</span>
            <span className={`text-lg font-bold ${text}`}>
              R$ {total.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function EmitirNotaModal({
  data,
  onClose,
  theme = 'dark',
  playText: playTextProp,
}: EmitirNotaModalProps) {
  const { companyId, nfe_plano, pedidoId } = data;
  const supabase = createClient();
  const isDark = theme === 'dark';
  const isMobile = useIsMobile();

  const [step, setStep]         = useState<Step>('form');
  const [tipoNota, setTipoNota] = useState<'nfce' | 'nfe'>('nfce');
  const [plano]                 = useState<string>(nfe_plano ?? '');

  // Estado central dos dados NF-e — compartilhado entre IA e painel manual
  const [dadosNfe, setDadosNfe]                 = useState<DadosNota | null>(null);
  const [statusAssistente, setStatusAssistente] = useState<'collecting' | 'ready' | 'error'>('collecting');

  // Aba mobile: 'chat' | 'form'
  const [abaAtiva, setAbaAtiva] = useState<'chat' | 'form'>('chat');

  // Campos NFCe / NFS-e
  const [destinatarioCpfCnpj, setDestinatarioCpfCnpj] = useState('');
  const [destinatarioNome, setDestinatarioNome]         = useState('');
  const [destinatarioEmail, setDestinatarioEmail]       = useState('');
  const [descricaoServico, setDescricaoServico]         = useState('');
  const [valorTotal, setValorTotal]                     = useState('');
  const [formaPagamento, setFormaPagamento]             = useState('pix');
  const [enviarEmail, setEnviarEmail]                   = useState(false);

  const [resultado, setResultado] = useState<Record<string, unknown> | null>(null);
  const [erro, setErro]           = useState('');
  const [toast, setToast]         = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [company, setCompany]     = useState<any>(null);

  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  // ─── Reset ao montar ───────────────────────────────────────────────────────
  useEffect(() => {
    setStep('form');
    setTipoNota('nfce');
    setDadosNfe(null);
    setStatusAssistente('collecting');
    setResultado(null);
    setErro('');
    setValorTotal('');
    setDescricaoServico('');
    setDestinatarioCpfCnpj('');
    setDestinatarioNome('');
    setDestinatarioEmail('');
    setFormaPagamento('pix');
    setEnviarEmail(false);
    setAbaAtiva('chat');
  }, []);

  // ─── Empresa ───────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase
      .from('companies')
      .select('nfe_ativo, nfe_cnpj, nfe_crt, name')
      .eq('id', companyId)
      .single()
      .then(({ data: row }) => setCompany(row));
  }, [companyId]);

  // ─── Toast ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (msg: string, type: 'success' | 'error' | 'warning' = 'warning') =>
    setToast({ message: msg, type });

  // ─── TTS — mesmo padrão de FichaConversacionalDisplay ─────────────────────
  const [audioMutado, setAudioMutado] = useState(false);
  const audioMutadoRef = useRef(false);
  const audioQueueRef  = useRef<string[]>([]);
  const isPlayingRef   = useRef(false);

  const toggleMute = useCallback(() => {
    setAudioMutado((prev) => {
      audioMutadoRef.current = !prev;
      return !prev;
    });
  }, []);

  const playTextFallback = useCallback(async (text: string): Promise<void> => {
    return new Promise<void>((resolve) => {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-BR';
        utterance.rate = 1.0;
        const voices = window.speechSynthesis.getVoices();
        const ptVoice =
          voices.find((v) => v.lang === 'pt-BR') ??
          voices.find((v) => v.lang.startsWith('pt')) ??
          null;
        if (ptVoice) utterance.voice = ptVoice;
        utterance.onend   = () => resolve();
        utterance.onerror = () => resolve();
        window.speechSynthesis.speak(utterance);
      } catch { resolve(); }
    });
  }, []);

  const playTextComMute = useCallback(async (text: string) => {
    if (audioMutadoRef.current) return;
    return playTextProp ? playTextProp(text) : playTextFallback(text);
  }, [playTextProp, playTextFallback]);

  const playText = useCallback(async (text: string) => {
    if (audioMutadoRef.current) return;
    audioQueueRef.current.push(text);
    if (isPlayingRef.current) return;
    while (audioQueueRef.current.length > 0) {
      isPlayingRef.current = true;
      const next = audioQueueRef.current.shift();
      if (next) {
        try {
          await playTextComMute(next);
          await new Promise((r) => setTimeout(r, 300));
        } catch (e) { console.error('Erro TTS:', e); }
      }
    }
    isPlayingRef.current = false;
  }, [playTextComMute]);

  // ─── Voz na confirmação ────────────────────────────────────────────────────
  useModalVoiceCommand({
    active: step === 'confirming',
    onTranscript: (transcript) => {
      const t = transcript.toLowerCase();
      if (['confirmar', 'confirma', 'emitir', 'sim', 'pode emitir'].some((x) => t.includes(x))) handleEmitir();
      else if (['cancelar', 'cancela', 'fechar', 'não'].some((x) => t.includes(x))) onCloseRef.current();
    },
  });

  // ─── Callback do assistente IA → atualiza estado central ──────────────────
const handleDadosAtualizados = useCallback(
  (novosDados: DadosNota | null, status: 'collecting' | 'ready' | 'error') => {
    setDadosNfe(prev => {
      if (!novosDados) return prev;
      if (!prev) return novosDados;

      return {
        destinatario: {
          // Mantém o que o usuário digitou; IA preenche só se estiver vazio
          nome:      prev.destinatario.nome      || novosDados.destinatario.nome,
          cpf_cnpj:  prev.destinatario.cpf_cnpj  || novosDados.destinatario.cpf_cnpj,
          endereco:  prev.destinatario.endereco   || novosDados.destinatario.endereco,
        },
        itens: novosDados.itens.map((itemIA, idx) => {
          const itemManual = prev.itens[idx];
          if (!itemManual) return itemIA; // item novo da IA, aceita
          return {
            // Campos que o usuário pode ter editado manualmente têm prioridade
            nome:            itemManual.nome            || itemIA.nome,
            quantidade:      itemManual.quantidade      || itemIA.quantidade,
            valor_unitario:  itemManual.valor_unitario  || itemIA.valor_unitario,
            unidade:         itemManual.unidade         || itemIA.unidade,
            // NCM e CFOP: IA sempre preenche (é o ponto forte dela), 
            // mas respeita se o usuário já digitou manualmente
            ncm:             itemManual.ncm  || itemIA.ncm,
            cfop:            itemManual.cfop || itemIA.cfop,
            origem_produto:  itemIA.origem_produto ?? itemManual.origem_produto,
            produto_id:      itemIA.produto_id      || itemManual.produto_id,
            ncm_sugerido:    itemIA.ncm_sugerido,
          };
        }),
      };
    });
    setStatusAssistente(status);
  }, [],
);

  // ─── Callback do painel manual → atualiza estado central ──────────────────
  const handleDadosManuais = useCallback((novosDados: DadosNota) => {
    setDadosNfe(novosDados);
    // Recalcula status: pronto se tiver ao menos 1 item com nome + valor
    const pronto = novosDados.itens.length > 0 &&
      novosDados.itens.every((it) => it.nome.trim() && it.valor_unitario > 0);
    setStatusAssistente(pronto ? 'ready' : 'collecting');
  }, []);

  // ─── Avançar step ─────────────────────────────────────────────────────────
  const handleAvancar = useCallback(() => {
    if (step === 'form') {
      if (tipoNota === 'nfe') {
        setStep('form_nfe');
      } else {
        if (!valorTotal || isNaN(parseFloat(valorTotal.replace(',', '.')))) {
          showToast('Informe um valor válido', 'warning');
          return;
        }
        if (plano === 'nfse' && !descricaoServico.trim()) {
          showToast('Informe a descrição do serviço', 'warning');
          return;
        }
        setStep('confirming');
      }
    } else if (step === 'form_nfe') {
      if (statusAssistente !== 'ready') {
        showToast('Preencha ao menos um item com descrição e valor', 'warning');
        return;
      }
      setStep('confirming');
    }
  }, [step, tipoNota, statusAssistente, valorTotal, descricaoServico, plano]);

  // ─── Emitir ───────────────────────────────────────────────────────────────
  const handleEmitir = useCallback(async () => {
    setStep('emitting');
    try {
      const isNFe = tipoNota === 'nfe';
      const valor  = parseFloat(valorTotal.replace(',', '.'));
      const cpfCnpjLimpo = destinatarioCpfCnpj.replace(/\D/g, '');

      const body: Record<string, unknown> = {
        company_id: companyId,
        tipo: isNFe ? 'nfe' : 'nfce',
        modelo: isNFe ? '55' : '65',
        pedido_id: pedidoId,
        forma_pagamento: formaPagamento,
        enviar_email: enviarEmail,
      };

      if (isNFe && dadosNfe) {
  const valorCalculado = dadosNfe.itens.reduce(
    (acc, it) => acc + it.quantidade * it.valor_unitario, 0
  );

  body.valor_total = valorCalculado;

  if (dadosNfe.destinatario.nome)
    body.destinatario_nome = dadosNfe.destinatario.nome;

  if (dadosNfe.destinatario.cpf_cnpj)
    body.destinatario_cpf_cnpj = dadosNfe.destinatario.cpf_cnpj.replace(/\D/g, '');

  body.itens = dadosNfe.itens.map(it => ({
    ...it,
    valor_total: it.quantidade * it.valor_unitario,
  }));
} else {
        body.valor_total = valor;
        if (cpfCnpjLimpo) body.destinatario_cpf_cnpj = cpfCnpjLimpo;
        if (destinatarioNome) body.destinatario_nome = destinatarioNome;
        if (destinatarioEmail) body.destinatario_email = destinatarioEmail;
        if (plano === 'nfse') {
          body.descricao_servico = descricaoServico;
        } else {
          body.itens = [{ nome: descricaoServico || 'Produto', quantidade: 1, valor_unitario: valor, valor_total: valor, unidade: 'UN' }];
        }
      }

      const { data: result, error } = await supabase.functions.invoke('emitir-nota', { body });
      if (error) throw error;
      if (!result.success) { setErro(result.detalhe_rejeicao ?? result.error ?? 'Nota rejeitada.'); setStep('error'); return; }
      setResultado(result);
      setStep('success');
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao emitir nota.');
      setStep('error');
    }
  }, [
    tipoNota, valorTotal, destinatarioCpfCnpj, destinatarioNome,
    destinatarioEmail, descricaoServico, formaPagamento, enviarEmail,
    companyId, pedidoId, dadosNfe, plano,
  ]);

  // ─── Estilos ───────────────────────────────────────────────────────────────
  const bg          = isDark ? 'bg-slate-900' : 'bg-white';
  const border      = isDark ? 'border-slate-700' : 'border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted   = isDark ? 'text-gray-400' : 'text-gray-500';
  const inputCls    = `w-full px-4 py-2 rounded-lg border ${border} ${bg} ${textPrimary} focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm`;
  const labelCls    = `block text-xs font-medium mb-1 ${textMuted}`;
  const tipoLabel   =
    plano === 'nfse' ? 'NFS-e (Serviço)'
    : tipoNota === 'nfe' ? 'NF-e (Nota Fiscal Eletrônica)'
    : 'NFC-e (Cupom Fiscal)';

  // ─── Renders ───────────────────────────────────────────────────────────────
  const renderStep = () => {
    switch (step) {

      // ── Seleção do tipo ────────────────────────────────────────────────────
      case 'form':
        return (
          <div className="p-6 space-y-5">
            <div>
              <h3 className={`text-base font-semibold mb-1 ${textPrimary}`}>Tipo de nota</h3>
              <p className={`text-sm ${textMuted}`}>Escolha o modelo que deseja emitir</p>
            </div>

            <div className="space-y-3">
              {[
                { key: 'nfce' as const, title: 'NFC-e (Cupom Fiscal)', desc: 'Modelo 65 — Ideal para vendas no balcão' },
                { key: 'nfe'  as const, title: 'NF-e (Nota Fiscal Eletrônica)', desc: 'Modelo 55 — Com assistente IA e preenchimento manual' },
              ].map(({ key, title, desc }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTipoNota(key)}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    tipoNota === key
                      ? isDark ? 'border-blue-500 bg-blue-500/10' : 'border-blue-500 bg-blue-50'
                      : isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={`font-bold mb-0.5 ${textPrimary}`}>{title}</p>
                      <p className={`text-sm ${textMuted}`}>{desc}</p>
                    </div>
                    {tipoNota === key && <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" />}
                  </div>
                </button>
              ))}
            </div>

            {/* Formulário rápido para NFCe */}
            {tipoNota === 'nfce' && (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div>
                      <label className={labelCls}>Valor Total (R$) *</label>
                      <input type="text" inputMode="decimal" value={valorTotal}
                        onChange={(e) => setValorTotal(e.target.value)} placeholder="0,00" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>{plano === 'nfse' ? 'Descrição do Serviço *' : 'Descrição do Produto'}</label>
                      <input type="text" value={descricaoServico}
                        onChange={(e) => setDescricaoServico(e.target.value)}
                        placeholder={plano === 'nfse' ? 'Ex: Desenvolvimento de website' : 'Ex: Produto'} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Forma de Pagamento</label>
                      <select value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)} className={inputCls}>
                        {[['pix','PIX'],['dinheiro','Dinheiro'],['debito','Cartão Débito'],['credito','Cartão Crédito'],['nfc','NFC / Tap to Pay'],['tef','TEF / Maquininha']]
                          .map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={enviarEmail} onChange={(e) => setEnviarEmail(e.target.checked)} className="w-4 h-4 accent-blue-500" />
                      <span className={`text-sm ${textPrimary}`}>Enviar DANFE por e-mail</span>
                    </label>
                  </div>
                  <div className={`p-3 rounded-lg border ${border} space-y-3`}>
                    <p className={`text-xs font-semibold uppercase tracking-wide ${textMuted}`}>Destinatário (opcional)</p>
                    <div>
                      <label className={labelCls}>CPF / CNPJ</label>
                      <input type="text" value={destinatarioCpfCnpj}
                        onChange={(e) => setDestinatarioCpfCnpj(e.target.value)} placeholder="000.000.000-00" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Nome</label>
                      <input type="text" value={destinatarioNome}
                        onChange={(e) => setDestinatarioNome(e.target.value)} placeholder="Nome do cliente" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>E-mail</label>
                      <input type="email" value={destinatarioEmail}
                        onChange={(e) => setDestinatarioEmail(e.target.value)} placeholder="cliente@email.com" className={inputCls} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={onClose}
                className={`flex-1 py-3 px-4 rounded-xl font-semibold transition ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'}`}>
                Cancelar
              </button>
              <button onClick={handleAvancar}
                className="flex-1 py-3 px-4 rounded-xl font-semibold transition bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center gap-2">
                Continuar <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        );

      // ── NF-e: assistente IA + painel manual em sincronia ──────────────────
      case 'form_nfe':
        return (
          <div className="flex flex-col" style={{ height: '620px' }}>

            {/* Tabs mobile */}
            {isMobile && (
              <div className={`flex border-b ${border} flex-shrink-0`}>
                {([
                  { key: 'chat' as const, label: 'Assistente IA', Icon: MessageSquare },
                  { key: 'form' as const, label: 'Preencher',     Icon: ClipboardList },
                ] as const).map(({ key, label, Icon }) => (
                  <button
                    key={key}
                    onClick={() => setAbaAtiva(key)}
                    className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition border-b-2 ${
                      abaAtiva === key
                        ? 'border-blue-500 text-blue-500'
                        : `border-transparent ${textMuted}`
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Corpo */}
            <div className="flex flex-1 overflow-hidden">

              {/* Coluna esquerda — Assistente IA */}
              <div className={`
                flex-1 overflow-hidden
                ${!isMobile ? `border-r ${border}` : ''}
                ${isMobile && abaAtiva !== 'chat' ? 'hidden' : ''}
              `}>
                {/* Hint sobre o painel direito — só desktop */}
                {!isMobile && (
                  <div className={`px-4 pt-3 pb-0 flex items-center gap-2`}>
                    <span className={`text-[11px] ${textMuted}`}>
                      💡 O assistente preenche o formulário automaticamente. Você também pode editar à direita.
                    </span>
                  </div>
                )}
                <AssistenteFiscalChat
                  companyId={companyId}
                  theme={theme}
                  playText={playText}
                  onDadosAtualizados={handleDadosAtualizados}
                />
              </div>

              {/* Coluna direita — Painel editável */}
              <div className={`
                overflow-hidden flex flex-col
                ${isMobile ? 'flex-1' : 'w-[400px]'}
                ${isMobile && abaAtiva !== 'form' ? 'hidden' : ''}
              `}>
                {isMobile && (
                  <div className={`px-4 py-2 ${isDark ? 'bg-blue-900/20' : 'bg-blue-50'} flex-shrink-0`}>
                    <p className={`text-[11px] ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                      💡 Edite direto ou use o Assistente IA — os dados ficam sincronizados.
                    </p>
                  </div>
                )}
                <div className="flex-1 overflow-hidden">
                  <EditablePreviewNota
                    dados={dadosNfe}
                    onChange={handleDadosManuais}
                    isDark={isDark}
                  />
                </div>
              </div>
            </div>

            {/* Footer fixo */}
            <div className={`px-6 py-4 border-t ${border} flex gap-3 flex-shrink-0 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
              <button
                onClick={() => setStep('form')}
                className={`px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 ${
                  isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </button>
              <button
                onClick={handleAvancar}
                disabled={statusAssistente !== 'ready'}
                className="flex-1 py-2 px-4 rounded-lg font-semibold transition bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {statusAssistente === 'ready'
                  ? <><CheckCircle2 className="w-4 h-4" /> Emitir NF-e</>
                  : 'Preencha os itens para continuar'
                }
              </button>
            </div>
          </div>
        );

      // ── Confirmação ────────────────────────────────────────────────────────
      case 'confirming':
        return (
          <div className="p-6 space-y-4">
            <div className={`p-4 rounded-lg border ${border} space-y-2`}>
              <p className={`text-sm font-semibold ${textPrimary}`}>Confirme os dados:</p>
              <div className={`text-sm ${textMuted} space-y-1`}>
                <p><span className="font-medium">Tipo:</span> {tipoLabel}</p>
                {valorTotal && <p><span className="font-medium">Valor:</span> R$ {parseFloat(valorTotal.replace(',', '.')).toFixed(2)}</p>}
                {dadosNfe && (
                  <>
                    {dadosNfe.destinatario.nome && <p><span className="font-medium">Destinatário:</span> {dadosNfe.destinatario.nome}</p>}
                    {dadosNfe.destinatario.cpf_cnpj && <p><span className="font-medium">CPF/CNPJ:</span> {dadosNfe.destinatario.cpf_cnpj}</p>}
                    <p><span className="font-medium">Itens:</span> {dadosNfe.itens.length}</p>
                    <p><span className="font-medium">Total:</span> R$ {dadosNfe.itens.reduce((a, i) => a + i.quantidade * i.valor_unitario, 0).toFixed(2)}</p>
                  </>
                )}
                {descricaoServico && <p><span className="font-medium">Descrição:</span> {descricaoServico}</p>}
                {destinatarioCpfCnpj && <p><span className="font-medium">CPF/CNPJ:</span> {destinatarioCpfCnpj}</p>}
                <p><span className="font-medium">Pagamento:</span> {formaPagamento.toUpperCase()}</p>
              </div>
            </div>

            <div className={`p-3 rounded-lg border flex items-center gap-2 ${isDark ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'}`}>
              <Mic className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-blue-300' : 'text-blue-600'}`} />
              <p className={`text-sm ${isDark ? 'text-blue-200' : 'text-blue-800'}`}>
                Diga <strong>"CONFIRMAR"</strong> para emitir ou <strong>"CANCELAR"</strong> para fechar
              </p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(tipoNota === 'nfe' ? 'form_nfe' : 'form')}
                className={`flex-1 py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'}`}>
                <ArrowLeft className="w-4 h-4" /> Voltar
              </button>
              <button onClick={handleEmitir}
                className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2">
                <Receipt className="w-4 h-4" /> Confirmar Emissão
              </button>
            </div>
          </div>
        );

      // ── Emitindo ───────────────────────────────────────────────────────────
      case 'emitting':
        return (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
            <p className={`text-lg font-semibold ${textPrimary}`}>Transmitindo para a SEFAZ...</p>
            <p className={`text-sm ${textMuted}`}>Aguarde, isso pode levar alguns segundos</p>
          </div>
        );

      // ── Sucesso ────────────────────────────────────────────────────────────
      case 'success':
        return (
          <div className="p-6 space-y-4">
            <div className="flex flex-col items-center py-6 gap-3">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <p className={`text-xl font-bold ${textPrimary}`}>Nota Fiscal Emitida!</p>
              {resultado?.aguardando_processamento && (
                <p className={`text-sm text-center ${textMuted}`}>A prefeitura está processando. O número será gerado em breve.</p>
              )}
            </div>
            <div className={`p-4 rounded-lg border ${border} space-y-2 text-sm ${textMuted}`}>
              {resultado?.numero_nfse   && <p><span className="font-medium">Número NFS-e:</span> {String(resultado.numero_nfse)}</p>}
              {resultado?.numero        && <p><span className="font-medium">Número:</span> {String(resultado.numero)}</p>}
              {resultado?.chave_acesso  && <p className="break-all"><span className="font-medium">Chave:</span> {String(resultado.chave_acesso)}</p>}
              {resultado?.cod_verificacao && <p><span className="font-medium">Cód. Verificação:</span> {String(resultado.cod_verificacao)}</p>}
              {resultado?.cod_lote && resultado?.aguardando_processamento && (
                <p><span className="font-medium">Protocolo:</span> {String(resultado.cod_lote)}</p>
              )}
            </div>
            {resultado?.danfe_base64 && (
              <button
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = `data:application/pdf;base64,${resultado!.danfe_base64}`;
                  link.download = `nota-fiscal-${Date.now()}.pdf`;
                  link.click();
                }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" /> Baixar DANFE
              </button>
            )}
            <button onClick={onClose} className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition">
              Concluir
            </button>
          </div>
        );

      // ── Erro ───────────────────────────────────────────────────────────────
      case 'error':
        return (
          <div className="p-6 space-y-4">
            <div className="flex flex-col items-center py-6 gap-3">
              <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center">
                <XCircle className="w-8 h-8 text-white" />
              </div>
              <p className={`text-xl font-bold ${textPrimary}`}>Falha na Emissão</p>
            </div>
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">{erro}</div>
            <div className="flex gap-3">
              <button onClick={() => setStep('form')} className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition">
                Tentar Novamente
              </button>
              <button onClick={onClose}
                className={`flex-1 py-3 rounded-lg font-medium transition ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'}`}>
                Fechar
              </button>
            </div>
          </div>
        );
    }
  };

  // ─── Portal ────────────────────────────────────────────────────────────────
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">

      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[10000] px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3
          ${toast.type === 'success' ? 'bg-green-500' : toast.type === 'error' ? 'bg-red-500' : 'bg-amber-400'}
          animate-in slide-in-from-top duration-300`}
        >
          <p className="text-white font-semibold text-sm">{toast.message}</p>
        </div>
      )}

      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-lg sm:max-w-5xl rounded-2xl shadow-2xl overflow-hidden border ${bg} ${border} animate-in zoom-in-95 duration-300 flex flex-col`}
      >
        {step !== 'emitting' && (
          <div className={`px-6 py-4 border-b ${border} ${isDark ? 'bg-blue-950/30' : 'bg-blue-50'} flex items-center justify-between flex-shrink-0`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <Receipt className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className={`text-lg font-bold ${textPrimary}`}>Emitir Nota Fiscal</h2>
                <p className={`text-xs ${textMuted}`}>{company?.name ?? tipoLabel}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleMute}
                title={audioMutado ? 'Ativar voz' : 'Silenciar voz'}
                className={`p-2 rounded-full transition ${
                  audioMutado
                    ? isDark ? 'text-red-400 hover:bg-white/10' : 'text-red-500 hover:bg-gray-100'
                    : isDark ? 'text-gray-400 hover:bg-white/10' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {audioMutado ? <IconVolumeMute /> : <IconVolume />}
              </button>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition" aria-label="Fechar">
                <X className={`w-5 h-5 ${textMuted}`} />
              </button>
            </div>
          </div>
        )}

        <div className="relative overflow-y-auto max-h-[90vh]">
          {renderStep()}
        </div>
      </div>
    </div>,
    document.body,
  );
}
