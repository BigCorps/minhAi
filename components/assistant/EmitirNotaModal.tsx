'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase-browser';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';
import AssistenteFiscalChat from '@/components/dashboard/vendas/AssistenteFiscalChat';
// PASSO 1 — Novos imports
import CampoDestinatario from '@/components/dashboard/vendas/CampoDestinatario';
import ListaItensComAutocomplete from '@/components/dashboard/vendas/ListaItensComAutocomplete';
import { useClienteFiscal } from '@/hooks/useClienteFiscal';
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
  ean?: string; // PASSO 1 — campo adicionado
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

// ─── Painel de preenchimento manual (mantido para retrocompatibilidade) ────────

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

  const dest  = dados?.destinatario ?? { nome: '', cpf_cnpj: '', endereco: '' };
  const itens = dados?.itens ?? [];

  function setDest(key: keyof typeof dest, val: string) {
    onChange({ destinatario: { ...dest, [key]: val }, itens });
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

  const total = itens.reduce((acc, it) => acc + (it.quantidade * it.valor_unitario), 0);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
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
        <div>
          <div className="flex items-center gap-2 mb-3">
            <User className={`w-4 h-4 ${muted}`} />
            <span className={`text-xs font-semibold uppercase tracking-wide ${muted}`}>Destinatário</span>
            <span className={`text-[10px] ${muted}`}>(opcional)</span>
          </div>
          <div className="space-y-2">
            <div>
              <label className={label}>Nome / Razão Social</label>
              <input type="text" value={dest.nome}
                onChange={(e) => setDest('nome', e.target.value)}
                placeholder="Nome do cliente ou empresa" className={input} />
            </div>
            <div>
              <label className={label}>CPF / CNPJ</label>
              <input type="text" value={dest.cpf_cnpj ?? ''}
                onChange={(e) => setDest('cpf_cnpj', e.target.value)}
                placeholder="000.000.000-00" className={input} />
            </div>
            <div>
              <label className={label}>Endereço</label>
              <input type="text" value={dest.endereco ?? ''}
                onChange={(e) => setDest('endereco', e.target.value)}
                placeholder="Rua, número, cidade" className={input} />
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Package className={`w-4 h-4 ${muted}`} />
            <span className={`text-xs font-semibold uppercase tracking-wide ${muted}`}>Itens</span>
            <span className="ml-auto">
              <button onClick={addItem}
                className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-400 font-medium transition">
                <Plus className="w-3.5 h-3.5" />Adicionar
              </button>
            </span>
          </div>

          {itens.length === 0 && (
            <button onClick={addItem}
              className={`w-full py-6 rounded-xl border-2 border-dashed ${
                isDark ? 'border-slate-700 hover:border-blue-500/50' : 'border-gray-200 hover:border-blue-300'
              } transition flex flex-col items-center gap-2`}>
              <Plus className={`w-5 h-5 ${muted}`} />
              <span className={`text-xs ${muted}`}>Clique para adicionar um item</span>
            </button>
          )}

          <div className="space-y-3">
            {itens.map((item, idx) => (
              <div key={idx}
                className={`p-3 rounded-xl border ${border} ${isDark ? 'bg-slate-800/50' : 'bg-gray-50'} space-y-2`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[11px] font-semibold ${muted}`}>Item {idx + 1}</span>
                  <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-500 transition">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div>
                  <label className={label}>Descrição *</label>
                  <input type="text" value={item.nome}
                    onChange={(e) => setItem(idx, 'nome', e.target.value)}
                    placeholder="Ex: Produto A" className={input} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className={label}>Qtd *</label>
                    <input type="number" min="1" step="1" value={item.quantidade}
                      onChange={(e) => setItem(idx, 'quantidade', parseFloat(e.target.value) || 1)}
                      className={input} />
                  </div>
                  <div>
                    <label className={label}>Valor unit. *</label>
                    <input type="number" min="0" step="0.01" value={item.valor_unitario || ''}
                      onChange={(e) => setItem(idx, 'valor_unitario', parseFloat(e.target.value) || 0)}
                      placeholder="0,00" className={input} />
                  </div>
                  <div>
                    <label className={label}>Unidade</label>
                    <select value={item.unidade}
                      onChange={(e) => setItem(idx, 'unidade', e.target.value)}
                      className={input}>
                      {['UN', 'KG', 'L', 'CX', 'PC', 'M', 'M2', 'HR'].map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={label}>NCM <span className={muted}>(opcional)</span></label>
                    <input type="text" maxLength={8} value={item.ncm ?? ''}
                      onChange={(e) => setItem(idx, 'ncm', e.target.value.replace(/\D/g, ''))}
                      placeholder="00000000" className={`${input} font-mono`} />
                  </div>
                  <div>
                    <label className={label}>CFOP <span className={muted}>(opcional)</span></label>
                    <input type="number" value={item.cfop ?? ''}
                      onChange={(e) => setItem(idx, 'cfop', parseInt(e.target.value) || undefined as any)}
                      placeholder="5102" className={input} />
                  </div>
                </div>
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

      {itens.length > 0 && (
        <div className={`px-4 py-3 border-t ${border} flex-shrink-0`}>
          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium ${muted}`}>Total da nota</span>
            <span className={`text-lg font-bold ${text}`}>R$ {total.toFixed(2)}</span>
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

  // Modelo de documento derivado do tipo de nota (55 = NF-e, 65 = NFC-e)
  const modeloDocumento = tipoNota === 'nfe' ? 55 : 65;

  // Estado central dos dados NF-e — compartilhado entre IA e painel manual
  const [dadosNfe, setDadosNfe]                 = useState<DadosNota | null>(null);
  const [statusAssistente, setStatusAssistente] = useState<'collecting' | 'ready' | 'error'>('collecting');

  // PASSO 2 — Estado de destinatário expandido (com endereço completo)
  const [destinatario, setDestinatario] = useState({
    nome: '',
    cpf_cnpj: '',
    email: '',
    telefone: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
    endereco_completo: '',
  });

  // PASSO 2 — Estado de itens com campos fiscais completos
  const [itens, setItens] = useState<Array<{
    nome: string;
    quantidade: number;
    valor_unitario: number;
    unidade: string;
    ncm?: string;
    cfop?: number;
    origem_produto?: number;
    produto_id?: string;
    ean?: string;
  }>>([]);

  // PASSO 2 — Hook para salvar cliente após emissão
  const { salvarCliente } = useClienteFiscal();

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

  // Alias para o CampoDestinatario do formulário NFS-e (usa o mesmo estado `destinatario`)
  const destinatarioCompleto    = destinatario;
  const setDestinatarioCompleto = setDestinatario;

  const [resultado, setResultado] = useState<Record<string, unknown> | null>(null);
  const [erro, setErro]           = useState('');
  const [toast, setToast]         = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [company, setCompany]     = useState<any>(null);

  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  // ─── PASSO 5 — Reset ao montar (inclui novos estados) ─────────────────────
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
    // PASSO 5 — Reset dos novos estados
    setDestinatario({
      nome: '',
      cpf_cnpj: '',
      email: '',
      telefone: '',
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      uf: '',
      endereco_completo: '',
    });
    setItens([]);
  }, []);

  // ─── Empresa ───────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase
      .from('companies')
      .select('nfe_ativo, nfe_cnpj, nfe_crt, name, nfe_plano')
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

  // ─── PASSO 6 — Carregar itens do pedido automaticamente ───────────────────
  useEffect(() => {
    if (pedidoId && itens.length === 0) {
      const carregarItensDoPedido = async () => {
        try {
          const { data: pedidoItens, error } = await supabase
            .from('pedido_itens')
            .select(`
              nome_snapshot,
              quantidade,
              preco_unitario,
              subtotal,
              produto_id,
              produtos_venda (
                unidade,
                ean,
                produtos_fiscal (
                  ncm,
                  cfop,
                  origem_produto
                )
              )
            `)
            .eq('pedido_id', pedidoId);

          if (error) {
            console.error('Erro ao carregar itens:', error);
            return;
          }

          if (pedidoItens && pedidoItens.length > 0) {
            const itensFormatados = pedidoItens.map((item: any) => {
              const produto = item.produtos_venda;
              const fiscal  = produto?.produtos_fiscal?.[0];
              return {
                nome:            item.nome_snapshot,
                quantidade:      item.quantidade,
                valor_unitario:  item.preco_unitario,
                unidade:         produto?.unidade || 'un',
                produto_id:      item.produto_id,
                ean:             produto?.ean,
                ncm:             fiscal?.ncm || '00000000',
                cfop:            fiscal?.cfop || 5102,
                origem_produto:  fiscal?.origem_produto ?? 0,
              };
            });
            setItens(itensFormatados);
          }
        } catch (err) {
          console.error('Erro ao carregar itens do pedido:', err);
        }
      };
      carregarItensDoPedido();
    }
  }, [pedidoId, itens.length, supabase]);

  // ─── TTS ──────────────────────────────────────────────────────────────────
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

  // ─── Callback do assistente IA → atualiza estado central e sincroniza novos estados ──
  const handleDadosAtualizados = useCallback(
    (novosDados: DadosNota | null, status: 'collecting' | 'ready' | 'error') => {
      setDadosNfe(prev => {
        if (!novosDados) return prev;
        if (!prev) return novosDados;
        return {
          destinatario: {
            nome:     prev.destinatario.nome     || novosDados.destinatario.nome,
            cpf_cnpj: prev.destinatario.cpf_cnpj || novosDados.destinatario.cpf_cnpj,
            endereco: prev.destinatario.endereco  || novosDados.destinatario.endereco,
          },
          itens: novosDados.itens.map((itemIA, idx) => {
            const itemManual = prev.itens[idx];
            if (!itemManual) return itemIA;
            return {
              nome:           itemManual.nome           || itemIA.nome,
              quantidade:     itemManual.quantidade     || itemIA.quantidade,
              valor_unitario: itemManual.valor_unitario || itemIA.valor_unitario,
              unidade:        itemManual.unidade        || itemIA.unidade,
              ncm:            itemManual.ncm  || itemIA.ncm,
              cfop:           itemManual.cfop || itemIA.cfop,
              origem_produto: itemIA.origem_produto ?? itemManual.origem_produto,
              produto_id:     itemIA.produto_id      || itemManual.produto_id,
              ncm_sugerido:   itemIA.ncm_sugerido,
            };
          }),
        };
      });
      setStatusAssistente(status);

      // Sincronizar com os novos estados usados pelos componentes do PASSO 3
      if (novosDados) {
        // Atualiza destinatário apenas se campos estiverem vazios (usuário tem prioridade)
        setDestinatario(prev => ({
          ...prev,
          nome:             prev.nome             || novosDados.destinatario.nome      || '',
          cpf_cnpj:         prev.cpf_cnpj         || novosDados.destinatario.cpf_cnpj  || '',
          endereco_completo: prev.endereco_completo || novosDados.destinatario.endereco || '',
        }));
        // Atualiza itens apenas se lista estiver vazia
        setItens(prev => {
          if (prev.length > 0) return prev;
          return novosDados.itens.map(item => ({
            nome:           item.nome,
            quantidade:     item.quantidade,
            valor_unitario: item.valor_unitario,
            unidade:        item.unidade,
            ncm:            item.ncm,
            cfop:           item.cfop,
            origem_produto: item.origem_produto,
            produto_id:     item.produto_id,
            ean:            item.ean,
          }));
        });
      }
    },
    [],
  );

  // ─── Callback do painel manual → atualiza estado central ──────────────────
  const handleDadosManuais = useCallback((novosDados: DadosNota) => {
    setDadosNfe(novosDados);
    const pronto = novosDados.itens.length > 0 &&
      novosDados.itens.every((it) => it.nome.trim() && it.valor_unitario > 0);
    setStatusAssistente(pronto ? 'ready' : 'collecting');
  }, []);

  // ─── Avançar step ─────────────────────────────────────────────────────────
  const handleAvancar = useCallback(() => {
    if (step === 'form') {
      // ✅ NFS-e vai direto para confirmação
      if (plano === 'nfse') {
        if (!valorTotal || isNaN(parseFloat(valorTotal.replace(',', '.')))) {
          showToast('Informe um valor válido', 'warning');
          return;
        }
        if (!descricaoServico.trim()) {
          showToast('Informe a descrição do serviço', 'warning');
          return;
        }
        setStep('confirming');
        return;
      }

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
      // PASSO 7 — Validação usando os novos estados
      if (!destinatario.nome || destinatario.nome.trim().length < 1) {
        showToast('Preencha ao menos um item com descrição e valor', 'warning');
        return;
      }
      if (itens.length === 0) {
        showToast('Adicione pelo menos um item', 'warning');
        return;
      }
      const todosValidos = itens.every(it => it.nome.trim() && it.quantidade > 0 && it.valor_unitario > 0);
      if (!todosValidos) {
        showToast('Todos os itens precisam de descrição, quantidade e valor', 'warning');
        return;
      }
      if (modeloDocumento === 55) {
        const semNcm = itens.filter(i => !i.ncm || i.ncm === '00000000');
        if (semNcm.length > 0) {
          showToast('NF-e modelo 55 exige NCM válido em todos os produtos', 'warning');
          return;
        }
      }
      setStep('confirming');
    }
  }, [step, tipoNota, destinatario, itens, modeloDocumento, valorTotal, descricaoServico, plano]);

  // ─── PASSO 4 — Emitir (NF-e usa novos estados; NFC-e/NFS-e mantém lógica original) ──
  const handleEmitir = useCallback(async () => {
    setStep('emitting');
    try {
      const isNFe = tipoNota === 'nfe';

      if (isNFe) {
        // ── Validações NF-e ──
        if (!destinatario.nome || destinatario.nome.trim().length < 3) {
          setErro('Nome do destinatário é obrigatório (mínimo 3 caracteres)');
          setStep('error');
          return;
        }
        if (itens.length === 0) {
          setErro('Adicione pelo menos um item');
          setStep('error');
          return;
        }
        for (const item of itens) {
          if (!item.nome || item.nome.trim().length < 2) {
            setErro('Todos os itens devem ter nome');
            setStep('error');
            return;
          }
          if (item.quantidade <= 0) {
            setErro('Quantidade deve ser maior que zero');
            setStep('error');
            return;
          }
          if (item.valor_unitario <= 0) {
            setErro('Valor unitário deve ser maior que zero');
            setStep('error');
            return;
          }
        }
        if (modeloDocumento === 55) {
          const semNcm = itens.filter(i => !i.ncm || i.ncm === '00000000');
          if (semNcm.length > 0) {
            setErro('NF-e modelo 55 exige NCM válido em todos os produtos');
            setStep('error');
            return;
          }
        }

        const valorCalculado = itens.reduce(
          (acc, item) => acc + item.quantidade * item.valor_unitario, 0
        );

        const body: Record<string, unknown> = {
          company_id:           companyId,
          tipo:                 'nfe',
          modelo:               '55',
          pedido_id:            pedidoId,
          forma_pagamento:      formaPagamento,
          enviar_email:         !!destinatario.email,
          valor_total:          valorCalculado,
          destinatario_nome:    destinatario.nome.trim(),
          destinatario_cpf_cnpj: destinatario.cpf_cnpj || undefined,
          destinatario_email:   destinatario.email    || undefined,
          destinatario_endereco: destinatario.endereco_completo || undefined,
          itens: itens.map(item => ({
            nome:           item.nome,
            quantidade:     item.quantidade,
            valor_unitario: item.valor_unitario,
            valor_total:    item.quantidade * item.valor_unitario,
            unidade:        item.unidade,
            ncm:            item.ncm || '00000000',
            cfop:           item.cfop || 5102,
            origem_produto: item.origem_produto ?? 0,
            produto_id:     item.produto_id,
            ean:            item.ean,
          })),
        };

        const { data: result, error } = await supabase.functions.invoke('emitir-nota', { body });
        if (error) throw error;
        if (!result.success) {
          setErro(result.detalhe_rejeicao ?? result.error ?? 'Nota rejeitada.');
          setStep('error');
          return;
        }

        // PASSO 4 — Salvar cliente após emissão bem-sucedida
        if (destinatario.cpf_cnpj) {
          try {
            await salvarCliente({
              company_id:        companyId,
              nome:              destinatario.nome,
              cpf_cnpj:          destinatario.cpf_cnpj,
              email:             destinatario.email,
              telefone:          destinatario.telefone,
              cep:               destinatario.cep,
              logradouro:        destinatario.logradouro,
              numero:            destinatario.numero,
              complemento:       destinatario.complemento,
              bairro:            destinatario.bairro,
              cidade:            destinatario.cidade,
              uf:                destinatario.uf,
              endereco_completo: destinatario.endereco_completo,
            });
          } catch (saveErr) {
            // Não bloqueia o fluxo se salvar cliente falhar
            console.warn('Aviso: não foi possível salvar cliente:', saveErr);
          }
        }

        setResultado(result);
        setStep('success');

      } else {
        // ── Lógica original NFC-e / NFS-e (preservada integralmente) ──
        const valor        = parseFloat(valorTotal.replace(',', '.'));
        const cpfCnpjLimpo = destinatarioCpfCnpj.replace(/\D/g, '');

        const body: Record<string, unknown> = {
          company_id:      companyId,
          tipo:            'nfce',
          modelo:          '65',
          pedido_id:       pedidoId,
          forma_pagamento: formaPagamento,
          enviar_email:    enviarEmail,
          valor_total:     valor,
        };

        if (cpfCnpjLimpo)       body.destinatario_cpf_cnpj = cpfCnpjLimpo;
        if (destinatarioNome)   body.destinatario_nome     = destinatarioNome;
        if (destinatarioEmail)  body.destinatario_email    = destinatarioEmail;

        // ✅ NFS-e com destinatário completo
        if (plano === 'nfse') {
          body.descricao_servico = descricaoServico;

          // Dados do destinatário estruturados
          if (destinatarioCompleto.nome)
            body.destinatario_nome = destinatarioCompleto.nome;

          if (destinatarioCompleto.cpf_cnpj)
            body.destinatario_cpf_cnpj = destinatarioCompleto.cpf_cnpj.replace(/\D/g, '');

          if (destinatarioCompleto.email)
            body.destinatario_email = destinatarioCompleto.email;

          if (destinatarioCompleto.telefone)
            body.destinatario_telefone = destinatarioCompleto.telefone;

          // Endereço estruturado
          if (destinatarioCompleto.cep)
            body.destinatario_cep = destinatarioCompleto.cep;

          if (destinatarioCompleto.logradouro)
            body.destinatario_logradouro = destinatarioCompleto.logradouro;

          if (destinatarioCompleto.numero)
            body.destinatario_numero = destinatarioCompleto.numero;

          if (destinatarioCompleto.bairro)
            body.destinatario_bairro = destinatarioCompleto.bairro;

          if (destinatarioCompleto.cidade)
            body.destinatario_cidade = destinatarioCompleto.cidade;

          if (destinatarioCompleto.uf)
            body.destinatario_uf = destinatarioCompleto.uf;

          if (destinatarioCompleto.endereco_completo)
            body.destinatario_endereco = destinatarioCompleto.endereco_completo;

        } else {
          // ✅ NFCe com itens
          body.itens = [{
            nome:           descricaoServico || 'Produto',
            quantidade:     1,
            valor_unitario: valor,
            valor_total:    valor,
            unidade:        'UN',
          }];
        }

        const { data: result, error } = await supabase.functions.invoke('emitir-nota', { body });
        if (error) throw error;
        if (!result.success) {
          setErro(result.detalhe_rejeicao ?? result.error ?? 'Nota rejeitada.');
          setStep('error');
          return;
        }

        // ✅ SALVAR CLIENTE se emissão bem-sucedida e tem CPF/CNPJ
        // Funciona para NFS-e, NFC-e e NF-e
        if (result.success && destinatarioCompleto.cpf_cnpj && destinatarioCompleto.nome) {
          try {
            await salvarCliente({
              company_id:        companyId,
              nome:              destinatarioCompleto.nome,
              cpf_cnpj:          destinatarioCompleto.cpf_cnpj,
              email:             destinatarioCompleto.email,
              telefone:          destinatarioCompleto.telefone,
              cep:               destinatarioCompleto.cep,
              logradouro:        destinatarioCompleto.logradouro,
              numero:            destinatarioCompleto.numero,
              complemento:       destinatarioCompleto.complemento,
              bairro:            destinatarioCompleto.bairro,
              cidade:            destinatarioCompleto.cidade,
              uf:                destinatarioCompleto.uf,
              endereco_completo: destinatarioCompleto.endereco_completo,
            });
          } catch (saveErr) {
            console.warn('Aviso: não foi possível salvar cliente:', saveErr);
          }
        }

        setResultado(result);
        setStep('success');
      }

    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao emitir nota.');
      setStep('error');
    }
  }, [
    tipoNota, destinatario, destinatarioCompleto, itens, modeloDocumento,
    valorTotal, destinatarioCpfCnpj, destinatarioNome,
    destinatarioEmail, descricaoServico, formaPagamento,
    enviarEmail, companyId, pedidoId, plano, salvarCliente,
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
              {/* ✅ ADAPTAR OPÇÕES BASEADO NO PLANO */}
              {(() => {
                // Se plano for nfse, mostrar só NFS-e
                if (plano === 'nfse') {
                  return (
                    <div className={`w-full p-4 rounded-xl border-2 text-left ${
                      isDark ? 'border-blue-500 bg-blue-500/10' : 'border-blue-500 bg-blue-50'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className={`font-bold mb-0.5 ${textPrimary}`}>NFS-e (Nota Fiscal de Serviço)</p>
                          <p className={`text-sm ${textMuted}`}>Nota de serviço eletrônica</p>
                        </div>
                        <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
                      </div>
                    </div>
                  );
                }

                // Se plano for nfe, mostrar NFC-e e NF-e
                return [
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
                ));
              })()}
            </div>

            {/* ✅ FORMULÁRIO PARA NFS-e */}
            {plano === 'nfse' && (
              <div className="space-y-4 pt-2">
                {/* Campo de Destinatário com Autocomplete */}
                <CampoDestinatario
                  companyId={companyId}
                  dados={destinatarioCompleto}
                  onChange={setDestinatarioCompleto}
                  theme={theme}
                  required={false}
                />

                {/* Divisor */}
                <div className={`border-t ${border}`} />

                {/* Descrição do Serviço */}
                <div>
                  <label className={labelCls}>Descrição do Serviço *</label>
                  <textarea
                    value={descricaoServico}
                    onChange={(e) => setDescricaoServico(e.target.value)}
                    placeholder="Descreva o serviço prestado..."
                    rows={3}
                    className={inputCls}
                  />
                </div>

                {/* Valor Total */}
                <div>
                  <label className={labelCls}>Valor Total (R$) *</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={valorTotal}
                    onChange={(e) => setValorTotal(e.target.value)}
                    placeholder="0,00"
                    className={inputCls}
                  />
                </div>

                {/* Forma de Pagamento */}
                <div>
                  <label className={labelCls}>Forma de Pagamento</label>
                  <select value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)} className={inputCls}>
                    {[
                      ['pix','PIX'],
                      ['dinheiro','Dinheiro'],
                      ['debito','Cartão Débito'],
                      ['credito','Cartão Crédito'],
                      ['nfc','NFC / Tap to Pay'],
                      ['tef','TEF / Maquininha']
                    ].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>

                {/* Checkbox Email */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enviarEmail}
                    onChange={(e) => setEnviarEmail(e.target.checked)}
                    className="w-4 h-4 accent-blue-500"
                  />
                  <span className={`text-sm ${textPrimary}`}>Enviar NFS-e por e-mail</span>
                </label>
              </div>
            )}

            {/* Formulário rápido para NFCe */}
            {tipoNota === 'nfce' && plano !== 'nfse' && (
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
                disabled={
                  (tipoNota === 'nfce' && plano !== 'nfse' && (!valorTotal || isNaN(parseFloat(valorTotal.replace(',', '.'))))) ||
                  (plano === 'nfse' && (!valorTotal || !descricaoServico.trim()))
                }
                className="flex-1 py-3 px-4 rounded-xl font-semibold transition bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center gap-2">
                Continuar <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        );

      // ── PASSO 3 — NF-e: assistente IA (esquerda) + novos componentes (direita) ──
      case 'form_nfe': {
        // PASSO 7 — Condição do botão calculada com novos estados
        const nfeValida =
          destinatario.nome.trim().length >= 1 &&
          itens.length > 0 &&
          itens.every(it => it.nome.trim() && it.quantidade > 0 && it.valor_unitario > 0) &&
          !(modeloDocumento === 55 && itens.some(i => !i.ncm || i.ncm === '00000000'));

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

              {/* Coluna esquerda — Assistente IA (preservado) */}
              <div className={`
                flex-1 overflow-hidden
                ${!isMobile ? `border-r ${border}` : ''}
                ${isMobile && abaAtiva !== 'chat' ? 'hidden' : ''}
              `}>
                {!isMobile && (
                  <div className="px-4 pt-3 pb-0 flex items-center gap-2">
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

              {/* Coluna direita — PASSO 3: novos componentes com autocomplete */}
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
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Campo Destinatário com Autocomplete */}
                  <CampoDestinatario
                    companyId={companyId}
                    dados={destinatario}
                    onChange={setDestinatario}
                    theme={theme}
                    required={modeloDocumento === 55}
                  />

                  {/* Divisor */}
                  <div className={`border-t ${border}`} />

                  {/* Lista de Itens com Autocomplete */}
                  <ListaItensComAutocomplete
                    companyId={companyId}
                    itens={itens}
                    onChange={setItens}
                    theme={theme}
                    mostrarDadosFiscais={modeloDocumento === 55}
                    modeloDocumento={modeloDocumento}
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
              {/* PASSO 7 — Botão com nova condição disabled */}
              <button
                onClick={handleAvancar}
                disabled={!nfeValida}
                className={`flex-1 py-2 px-4 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
                  nfeValida
                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                    : isDark
                      ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {nfeValida
                  ? <><CheckCircle2 className="w-4 h-4" /> Emitir NF-e</>
                  : modeloDocumento === 55 && itens.some(i => !i.ncm || i.ncm === '00000000')
                    ? 'NCM obrigatório em todos os itens'
                    : itens.length === 0
                      ? 'Adicione ao menos um item'
                      : 'Preencha os dados para continuar'
                }
              </button>
            </div>
          </div>
        );
      }

      // ── Confirmação ────────────────────────────────────────────────────────
      case 'confirming':
        return (
          <div className="p-6 space-y-4">
            <div className={`p-4 rounded-lg border ${border} space-y-2`}>
              <p className={`text-sm font-semibold ${textPrimary}`}>Confirme os dados:</p>
              <div className={`text-sm ${textMuted} space-y-1`}>
                <p><span className="font-medium">Tipo:</span> {tipoLabel}</p>
                {/* ✅ Dados específicos de NFS-e */}
                {plano === 'nfse' && (
                  <>
                    {destinatarioCompleto.nome && (
                      <p><span className="font-medium">Destinatário:</span> {destinatarioCompleto.nome}</p>
                    )}
                    {destinatarioCompleto.cpf_cnpj && (
                      <p><span className="font-medium">CPF/CNPJ:</span> {destinatarioCompleto.cpf_cnpj}</p>
                    )}
                    {descricaoServico && (
                      <p><span className="font-medium">Serviço:</span> {descricaoServico}</p>
                    )}
                    {valorTotal && (
                      <p><span className="font-medium">Valor:</span> R$ {parseFloat(valorTotal.replace(',', '.')).toFixed(2)}</p>
                    )}
                  </>
                )}
                {/* Dados de NFC-e */}
                {plano !== 'nfse' && valorTotal && tipoNota !== 'nfe' && (
                  <p><span className="font-medium">Valor:</span> R$ {parseFloat(valorTotal.replace(',', '.')).toFixed(2)}</p>
                )}
                {/* NF-e — usa novos estados */}
                {tipoNota === 'nfe' && (
                  <>
                    {destinatario.nome && (
                      <p><span className="font-medium">Destinatário:</span> {destinatario.nome}</p>
                    )}
                    {destinatario.cpf_cnpj && (
                      <p><span className="font-medium">CPF/CNPJ:</span> {destinatario.cpf_cnpj}</p>
                    )}
                    {destinatario.email && (
                      <p><span className="font-medium">E-mail:</span> {destinatario.email}</p>
                    )}
                    <p><span className="font-medium">Itens:</span> {itens.length}</p>
                    <p>
                      <span className="font-medium">Total:</span> R$&nbsp;
                      {itens.reduce((a, i) => a + i.quantidade * i.valor_unitario, 0).toFixed(2)}
                    </p>
                  </>
                )}
                {descricaoServico && tipoNota !== 'nfe' && plano !== 'nfse' && (
                  <p><span className="font-medium">Descrição:</span> {descricaoServico}</p>
                )}
                {destinatarioCpfCnpj && tipoNota !== 'nfe' && plano !== 'nfse' && (
                  <p><span className="font-medium">CPF/CNPJ:</span> {destinatarioCpfCnpj}</p>
                )}
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
              {resultado?.numero_nfse    && <p><span className="font-medium">Número NFS-e:</span> {String(resultado.numero_nfse)}</p>}
              {resultado?.numero         && <p><span className="font-medium">Número:</span> {String(resultado.numero)}</p>}
              {resultado?.chave_acesso   && <p className="break-all"><span className="font-medium">Chave:</span> {String(resultado.chave_acesso)}</p>}
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
