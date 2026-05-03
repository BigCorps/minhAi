'use client';

// components/VoiceAssistant/modals/SaleModeModal/OpcionaisProdutoModal.tsx
//
// Modal que abre no kiosk quando o cliente adiciona um produto ao carrinho
// e o produto tem grupos de opcionais configurados.
//
// Renderiza:
//  - Grupos com max_escolhas = 1 → radio (seleção única)
//  - Grupos com max_escolhas > 1 → checkbox (múltipla seleção)
//  - Grupos obrigatórios → não deixa confirmar sem escolher
//  - Total dinâmico = preço base + adicionais selecionados

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase-browser';
import { formatarPreco, type ProdutoVenda } from '@/lib/produtos-venda';

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface GrupoOpcoes {
  id: string;
  nome: string;
  descricao: string | null;
  obrigatorio: boolean;
  min_escolhas: number;
  max_escolhas: number;
  display_order: number;
  itens: ItemOpcao[];
}

interface ItemOpcao {
  id: string;
  grupo_id: string;
  nome: string;
  descricao: string | null;
  preco_adicional: number;
  disponivel: boolean;
  display_order: number;
}

export interface OpcaoSelecionada {
  grupo_id: string;
  grupo_nome: string;
  item_id: string;
  item_nome: string;
  preco_adicional: number;
}

interface OpcionaisProdutoModalProps {
  produto: ProdutoVenda;
  quantidade: number;
  theme?: 'dark' | 'light';
  onConfirmar: (opcoes: OpcaoSelecionada[], totalAdicional: number) => void;
  onCancelar: () => void;
}

// ── Paletas ────────────────────────────────────────────────────────────────────

const DARK = {
  bg:          '#0f172a',
  bgCard:      '#1e293b',
  border:      '#334155',
  textPrimary: '#f1f5f9',
  textMuted:   '#94a3b8',
  textFaint:   '#475569',
  accent:      '#10b981',
  accentBg:    'rgba(16,185,129,0.10)',
  accentBorder:'rgba(16,185,129,0.30)',
  warning:     '#f59e0b',
  warningBg:   'rgba(245,158,11,0.10)',
};

const LIGHT = {
  bg:          '#ffffff',
  bgCard:      '#f8fafc',
  border:      '#e2e8f0',
  textPrimary: '#0f172a',
  textMuted:   '#64748b',
  textFaint:   '#94a3b8',
  accent:      '#059669',
  accentBg:    'rgba(5,150,105,0.06)',
  accentBorder:'rgba(5,150,105,0.25)',
  warning:     '#d97706',
  warningBg:   'rgba(217,119,6,0.08)',
};

// ── Componente ────────────────────────────────────────────────────────────────

export default function OpcionaisProdutoModal({
  produto,
  quantidade,
  theme = 'dark',
  onConfirmar,
  onCancelar,
}: OpcionaisProdutoModalProps) {
  const P = theme === 'dark' ? DARK : LIGHT;
  const supabase = createClient();

  const [grupos, setGrupos]     = useState<GrupoOpcoes[]>([]);
  const [loading, setLoading]   = useState(true);
  // Map: grupo_id → Set de item_ids selecionados
  const [selecoes, setSelecoes] = useState<Map<string, Set<string>>>(new Map());

  // ── Carregar grupos do produto ─────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      try {
        const { data: gruposData } = await supabase
          .from('produto_opcoes_grupos')
          .select('*')
          .eq('produto_id', produto.id)
          .order('display_order', { ascending: true });

        if (!gruposData || gruposData.length === 0) {
          // Produto sem opcionais — confirma direto sem modal
          onConfirmar([], 0);
          return;
        }

        const { data: itensData } = await supabase
          .from('produto_opcoes_itens')
          .select('*')
          .in('grupo_id', gruposData.map(g => g.id))
          .eq('disponivel', true)
          .order('display_order', { ascending: true });

        const gruposComItens: GrupoOpcoes[] = gruposData.map(g => ({
          ...g,
          itens: (itensData ?? []).filter(i => i.grupo_id === g.id),
        }));

        setGrupos(gruposComItens);
        setLoading(false);
      } catch {
        setLoading(false);
      }
    }
    load();
  }, [produto.id]);

  // ── Toggle seleção ─────────────────────────────────────────────────────────

  function toggleItem(grupo: GrupoOpcoes, itemId: string) {
  setSelecoes(prev => {
    const next = new Map(prev);

    if (grupo.max_escolhas === 1) {
      // Radio — substitui sempre, mesmo que seja o mesmo item
      next.set(grupo.id, new Set([itemId]));
    } else {
      // Checkbox — toggle com limite
      const current = new Set(next.get(grupo.id) ?? []);
      if (current.has(itemId)) {
        current.delete(itemId);
      } else if (current.size < grupo.max_escolhas) {
        current.add(itemId);
      }
      next.set(grupo.id, current);
    }

    return next;
  });
}

  // ── Validação e total ──────────────────────────────────────────────────────

  const gruposObrigatoriosNaoRespondidos = grupos.filter(g => {
    if (!g.obrigatorio) return false;
    const sel = selecoes.get(g.id);
    const qtd = sel?.size ?? 0;
    return qtd < (g.min_escolhas || 1);
  });

  const totalAdicional = grupos.reduce((acc, grupo) => {
    const sel = selecoes.get(grupo.id) ?? new Set();
    return acc + grupo.itens
      .filter(i => sel.has(i.id))
      .reduce((s, i) => s + i.preco_adicional, 0);
  }, 0);

  const totalPorUnidade = produto.preco_venda + totalAdicional;
  const totalFinal      = totalPorUnidade * quantidade;

  // ── Confirmar ──────────────────────────────────────────────────────────────

  function handleConfirmar() {
    if (gruposObrigatoriosNaoRespondidos.length > 0) return;

    const opcoesSelecionadas: OpcaoSelecionada[] = [];
    grupos.forEach(grupo => {
      const sel = selecoes.get(grupo.id) ?? new Set();
      grupo.itens
        .filter(i => sel.has(i.id))
        .forEach(i => {
          opcoesSelecionadas.push({
            grupo_id:        grupo.id,
            grupo_nome:      grupo.nome,
            item_id:         i.id,
            item_nome:       i.nome,
            preco_adicional: i.preco_adicional,
          });
        });
    });

    onConfirmar(opcoesSelecionadas, totalAdicional);
  }

  // ── RENDER ─────────────────────────────────────────────────────────────────

  if (loading) return null;

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
    }}>
      {/* Sheet vinda de baixo */}
      <div style={{
        width: '100%',
        maxWidth: 520,
        maxHeight: '85vh',
        background: P.bg,
        borderRadius: '20px 20px 0 0',
        border: `1px solid ${P.border}`,
        borderBottom: 'none',
        boxShadow: '0 -16px 48px rgba(0,0,0,0.35)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>

        {/* Handle */}
        <div style={{
          display: 'flex', justifyContent: 'center',
          paddingTop: 12, paddingBottom: 4, flexShrink: 0,
        }}>
          <div style={{ width: 40, height: 4, borderRadius: 4, background: P.border }} />
        </div>

        {/* Header */}
        <div style={{
          padding: '8px 20px 14px',
          borderBottom: `1px solid ${P.border}`,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {produto.imagem_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={produto.imagem_url}
                alt={produto.nome}
                style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }}
              />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: P.textPrimary, lineHeight: 1.3 }}>
                {produto.nome}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: P.textMuted }}>
                Personalize seu pedido
              </p>
            </div>
          </div>
        </div>

        {/* Grupos */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
          {grupos.map((grupo, gi) => {
            const sel          = selecoes.get(grupo.id) ?? new Set();
            const qtdSel       = sel.size;
            const obrigNaoFez  = grupo.obrigatorio && qtdSel < (grupo.min_escolhas || 1);
            const isRadio      = grupo.max_escolhas === 1;

            return (
              <div key={grupo.id} style={{
                borderBottom: gi < grupos.length - 1 ? `1px solid ${P.border}` : 'none',
                paddingBottom: 4,
                marginBottom: 4,
              }}>
                {/* Cabeçalho do grupo */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 20px 6px',
                }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: P.textPrimary }}>
                      {grupo.nome}
                    </p>
                    {grupo.descricao && (
                      <p style={{ margin: '1px 0 0', fontSize: 11, color: P.textMuted }}>
                        {grupo.descricao}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {grupo.obrigatorio && (
                      <span style={{
                        padding: '2px 7px', borderRadius: 20,
                        fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                        background: obrigNaoFez ? '#fef3c7' : P.accentBg,
                        color: obrigNaoFez ? '#92400e' : P.accent,
                        border: `1px solid ${obrigNaoFez ? '#fcd34d' : P.accentBorder}`,
                      }}>
                        {obrigNaoFez ? 'obrigatório' : '✓ feito'}
                      </span>
                    )}
                    {!isRadio && (
                      <span style={{ fontSize: 11, color: P.textFaint }}>
                        até {grupo.max_escolhas}
                      </span>
                    )}
                  </div>
                </div>

                {/* Itens */}
                {grupo.itens.map(item => {
                  const selecionado = sel.has(item.id);
                  const maxAtingido = !isRadio && sel.size >= grupo.max_escolhas && !selecionado;

                  return (
                    <button
                      key={item.id}
                      onClick={() => !maxAtingido && toggleItem(grupo, item.id)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 20px',
                        background: selecionado ? P.accentBg : 'transparent',
                        border: 'none', cursor: maxAtingido ? 'not-allowed' : 'pointer',
                        opacity: maxAtingido ? .45 : 1,
                        transition: 'background .15s',
                        textAlign: 'left',
                      }}
                    >
                      {/* Indicador radio/checkbox */}
                      <div style={{
                        width: 20, height: 20, flexShrink: 0,
                        borderRadius: isRadio ? '50%' : 6,
                        border: `2px solid ${selecionado ? P.accent : P.border}`,
                        background: selecionado ? P.accent : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all .15s',
                      }}>
                        {selecionado && (
                          <svg width="10" height="10" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24">
                            {isRadio
                              ? <circle cx="12" cy="12" r="4" fill="#fff" stroke="#fff" />
                              : <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            }
                          </svg>
                        )}
                      </div>

                      {/* Nome + descrição */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          margin: 0, fontSize: 13,
                          fontWeight: selecionado ? 600 : 400,
                          color: selecionado ? P.textPrimary : P.textMuted,
                        }}>
                          {item.nome}
                        </p>
                        {item.descricao && (
                          <p style={{ margin: '1px 0 0', fontSize: 11, color: P.textFaint }}>
                            {item.descricao}
                          </p>
                        )}
                      </div>

                      {/* Preço adicional */}
                      <p style={{
                        margin: 0, fontSize: 13,
                        fontWeight: 600,
                        color: item.preco_adicional > 0 ? P.accent : P.textFaint,
                        flexShrink: 0,
                      }}>
                        {item.preco_adicional > 0
                          ? `+${formatarPreco(item.preco_adicional)}`
                          : 'grátis'}
                      </p>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px',
          borderTop: `1px solid ${P.border}`,
          flexShrink: 0,
          background: P.bg,
        }}>
          {/* Aviso campos obrigatórios */}
          {gruposObrigatoriosNaoRespondidos.length > 0 && (
            <div style={{
              marginBottom: 10, padding: '8px 12px',
              background: P.warningBg,
              border: `1px solid ${P.warning}40`,
              borderRadius: 10, fontSize: 12, color: P.warning,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <svg width="14" height="14" fill="none" stroke={P.warning} strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              Escolha: {gruposObrigatoriosNaoRespondidos.map(g => g.nome).join(', ')}
            </div>
          )}

          {/* Total + botões */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

            {/* Resumo de preço */}
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 11, color: P.textFaint }}>
                {quantidade}× {formatarPreco(totalPorUnidade)}
                {totalAdicional > 0 && (
                  <span style={{ color: P.accent }}> (+{formatarPreco(totalAdicional)} adicionais)</span>
                )}
              </p>
              <p style={{ margin: '1px 0 0', fontSize: 18, fontWeight: 800, color: P.textPrimary }}>
                {formatarPreco(totalFinal)}
              </p>
            </div>

            {/* Cancelar */}
            <button
              onClick={onCancelar}
              style={{
                padding: '12px 18px',
                background: 'transparent',
                border: `1px solid ${P.border}`,
                borderRadius: 12, color: P.textMuted,
                fontWeight: 600, fontSize: 13, cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              Voltar
            </button>

            {/* Confirmar */}
            <button
              onClick={handleConfirmar}
              disabled={gruposObrigatoriosNaoRespondidos.length > 0}
              style={{
                padding: '12px 24px',
                background: gruposObrigatoriosNaoRespondidos.length > 0 ? P.border : P.accent,
                border: 'none', borderRadius: 12,
                color: gruposObrigatoriosNaoRespondidos.length > 0 ? P.textFaint : '#fff',
                fontWeight: 700, fontSize: 14, cursor: gruposObrigatoriosNaoRespondidos.length > 0 ? 'not-allowed' : 'pointer',
                flexShrink: 0, transition: 'background .15s',
              }}
            >
              Adicionar ao carrinho
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
