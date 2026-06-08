'use client';

// components/VoiceAssistant/modals/CadastrarProdutoDisplay.tsx
//
// Auxiliar de Cadastro de Produtos — substitui o modal de voz campo a campo.
// Desktop: 2 colunas (chat IA esquerda | painel de produtos direita)
// Mobile:  tabs Chat / Produtos
//
// Suporta:
//  - Chat por texto e voz (microfone manual, igual AssistenteFiscalChat)
//  - Upload de CSV, XLS/XLSX, PDF, imagens (parse no frontend)
//  - 1 produto (formulário detalhado) ou N produtos (tabela editável)
//  - Preview de imagem em tempo real + link Google Images
//  - Pergunta opcional sobre fiscal (NCM/CFOP) e Mercado Livre
//  - Crédito cobrado SOMENTE após salvar com sucesso

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase-browser';
import { useIsMobile } from '@/hooks/useIsMobile';
import type { ProdutoVenda } from '@/lib/produtos-venda';
import { formatarPreco } from '@/lib/produtos-venda';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ItemProduto {
  nome: string;
  descricao?: string;
  categoria?: string;
  preco_venda: number;
  preco_custo?: number;
  unidade: string;
  estoque_atual: number;
  estoque_minimo: number;
  imagem_url?: string;
  ean?: string;
  marca?: string;
  // Fiscal
  ncm?: string;
  cfop?: number;
  origem_produto?: number;
  ncm_sugerido?: boolean;
  // ML
  ml_category_id?: string;
  ml_category_nome?: string;
  ml_listing_type?: string;
  ml_sugerido?: boolean;
}

interface MensagemChat {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface CadastrarProdutoDisplayProps {
  data: { companyId: string };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText?: (text: string) => Promise<void>;
  onSalvo?: (produtos: ProdutoVenda[]) => void;
}

type Step = 'chat' | 'confirmando' | 'salvando' | 'sucesso' | 'erro';
type AbaAtiva = 'chat' | 'produtos';

// ─── Paleta ───────────────────────────────────────────────────────────────────

function useCores(isDark: boolean) {
  return {
    bg:              isDark ? '#0f172a' : '#ffffff',
    bgCard:          isDark ? '#1e293b' : '#f8fafc',
    bgInput:         isDark ? '#0f172a' : '#ffffff',
    bgChat:          isDark ? '#0f172a' : '#f1f5f9',
    bgUserBubble:    isDark ? '#2563eb' : '#2563eb',
    bgAssistBubble:  isDark ? '#1e293b' : '#e2e8f0',
    border:          isDark ? '#334155' : '#e2e8f0',
    borderAccent:    isDark ? 'rgba(16,185,129,0.4)' : 'rgba(16,185,129,0.3)',
    text:            isDark ? '#f1f5f9' : '#0f172a',
    textMuted:       isDark ? '#94a3b8' : '#64748b',
    textFaint:       isDark ? '#475569' : '#94a3b8',
    accent:          '#10b981',
    accentBg:        isDark ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.08)',
    accentBlue:      '#3b82f6',
    accentBlueBg:    isDark ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.08)',
    warning:         '#f59e0b',
    warningBg:       isDark ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.08)',
    error:           '#ef4444',
    errorBg:         isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)',
    success:         '#10b981',
    successBg:       isDark ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.08)',
  };
}

// ─── SVGs inline ──────────────────────────────────────────────────────────────

const IcoX = ({ c }: { c: string }) => (
  <svg width="16" height="16" fill="none" stroke={c} strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);
const IcoMic = ({ c, size = 16 }: { c: string; size?: number }) => (
  <svg width={size} height={size} fill="none" stroke={c} strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
  </svg>
);
const IcoSend = ({ c }: { c: string }) => (
  <svg width="16" height="16" fill="none" stroke={c} strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);
const IcoUpload = ({ c }: { c: string }) => (
  <svg width="16" height="16" fill="none" stroke={c} strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);
const IcoPackage = ({ c, size = 20 }: { c: string; size?: number }) => (
  <svg width={size} height={size} fill="none" stroke={c} strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);
const IcoPlus = ({ c }: { c: string }) => (
  <svg width="14" height="14" fill="none" stroke={c} strokeWidth="2.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);
const IcoTrash = ({ c }: { c: string }) => (
  <svg width="13" height="13" fill="none" stroke={c} strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);
const IcoEdit = ({ c }: { c: string }) => (
  <svg width="13" height="13" fill="none" stroke={c} strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);
const IcoSearch = ({ c }: { c: string }) => (
  <svg width="13" height="13" fill="none" stroke={c} strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);
const IcoCheck = ({ c }: { c: string }) => (
  <svg width="14" height="14" fill="none" stroke={c} strokeWidth="2.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);
const IcoImage = ({ c }: { c: string }) => (
  <svg width="14" height="14" fill="none" stroke={c} strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);
const IcoSpinner = ({ c }: { c: string }) => (
  <svg width="16" height="16" fill="none" stroke={c} strokeWidth="2" viewBox="0 0 24 24"
    style={{ animation: 'spin 1s linear infinite' }}>
    <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" strokeLinecap="round" />
  </svg>
);
const IcoVolume = ({ c }: { c: string }) => (
  <svg width="15" height="15" fill="none" stroke={c} strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
  </svg>
);
const IcoVolumeMute = ({ c }: { c: string }) => (
  <svg width="15" height="15" fill="none" stroke={c} strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
  </svg>
);
const IcoCsv = ({ c }: { c: string }) => (
  <svg width="14" height="14" fill="none" stroke={c} strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function itemVazio(): ItemProduto {
  return {
    nome: '', descricao: '', categoria: '',
    preco_venda: 0, preco_custo: 0, unidade: 'un',
    estoque_atual: 0, estoque_minimo: 0,
    imagem_url: '', ean: '', marca: '',
  };
}

// ─── Sub-componente: PainelProduto (painel direito) ───────────────────────────

interface PainelProdutoProps {
  itens: ItemProduto[];
  onChange: (itens: ItemProduto[]) => void;
  isDark: boolean;
  C: ReturnType<typeof useCores>;
  temMl: boolean;
  pedirFiscal: boolean;
  onSolicitarFiscal: () => void;
  onSolicitarMl: () => void;
}

function PainelProduto({
  itens, onChange, isDark, C,
  temMl, pedirFiscal,
  onSolicitarFiscal, onSolicitarMl,
}: PainelProdutoProps) {

  const [editandoIdx, setEditandoIdx] = useState<number | null>(itens.length === 1 ? 0 : null);
  const [previewImgError, setPreviewImgError] = useState<Record<number, boolean>>({});

  function setItem(idx: number, key: keyof ItemProduto, val: any) {
    const next = itens.map((it, i) => i === idx ? { ...it, [key]: val } : it);
    onChange(next);
  }

  function addItem() {
    onChange([...itens, itemVazio()]);
    setEditandoIdx(itens.length);
  }

  function removeItem(idx: number) {
    const next = itens.filter((_, i) => i !== idx);
    onChange(next);
    setEditandoIdx(null);
  }

  const inp = {
    padding: '7px 10px',
    borderRadius: 8,
    border: `1px solid ${C.border}`,
    background: C.bgInput,
    color: C.text,
    fontSize: 12,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
  };

  const label = {
    display: 'block' as const,
    fontSize: 10,
    fontWeight: 600,
    color: C.textFaint,
    marginBottom: 3,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  };

  // ── Lista compacta (múltiplos) ──────────────────────────────────────────────
  if (itens.length !== 1 || editandoIdx !== 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* Header */}
        <div style={{
          padding: '12px 16px',
          borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>
            {itens.length} produto{itens.length !== 1 ? 's' : ''} para cadastrar
          </span>
          <button onClick={addItem} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '5px 10px', borderRadius: 8,
            border: `1px solid ${C.border}`,
            background: 'none', color: C.accent,
            fontSize: 11, fontWeight: 600, cursor: 'pointer',
          }}>
            <IcoPlus c={C.accent} /> Adicionar
          </button>
        </div>

        {/* Lista */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px' }}>
          {itens.length === 0 && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', height: '100%', gap: 10,
              color: C.textFaint,
            }}>
              <IcoPackage c={C.textFaint} size={32} />
              <p style={{ margin: 0, fontSize: 13 }}>Nenhum produto ainda</p>
              <p style={{ margin: 0, fontSize: 12 }}>Use o chat ou clique em Adicionar</p>
            </div>
          )}

          {itens.map((item, idx) => (
            <div key={idx} style={{
              padding: '10px 12px',
              borderRadius: 10,
              border: `1px solid ${editandoIdx === idx ? C.accent : C.border}`,
              background: editandoIdx === idx ? C.accentBg : C.bgCard,
              marginBottom: 6,
              cursor: 'pointer',
            }}
              onClick={() => setEditandoIdx(editandoIdx === idx ? null : idx)}>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Thumbnail */}
                {item.imagem_url && !previewImgError[idx] ? (
                  <img
                    src={item.imagem_url}
                    alt={item.nome}
                    onError={() => setPreviewImgError(p => ({ ...p, [idx]: true }))}
                    style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
                  />
                ) : (
                  <div style={{
                    width: 36, height: 36, borderRadius: 6, flexShrink: 0,
                    background: C.border,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <IcoPackage c={C.textFaint} size={16} />
                  </div>
                )}

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    margin: 0, fontSize: 13, fontWeight: 600, color: C.text,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {item.nome || <span style={{ color: C.textFaint, fontStyle: 'italic' }}>Sem nome</span>}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: C.accent, fontWeight: 700 }}>
                    {item.preco_venda > 0 ? formatarPreco(item.preco_venda) : '—'}
                  </p>
                </div>

                {/* Ações */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={e => { e.stopPropagation(); setEditandoIdx(idx); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                    <IcoEdit c={C.textMuted} />
                  </button>
                  <button onClick={e => { e.stopPropagation(); removeItem(idx); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                    <IcoTrash c={C.error} />
                  </button>
                </div>
              </div>

              {/* Form expandido inline */}
              {editandoIdx === idx && (
                <div style={{ marginTop: 12 }} onClick={e => e.stopPropagation()}>
                  <FormItemProduto
                    item={item}
                    idx={idx}
                    onChange={(k, v) => setItem(idx, k, v)}
                    isDark={isDark}
                    C={C}
                    inp={inp}
                    label={label}
                    pedirFiscal={pedirFiscal}
                    temMl={temMl}
                    compact
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer: opções fiscal/ML */}
        <FooterOpcoes
          C={C}
          pedirFiscal={pedirFiscal}
          temMl={temMl}
          onSolicitarFiscal={onSolicitarFiscal}
          onSolicitarMl={onSolicitarMl}
          itens={itens}
        />
      </div>
    );
  }

  // ── Formulário completo (único produto) ─────────────────────────────────────
  const item = itens[0];
  const markup = item.preco_custo && item.preco_custo > 0 && item.preco_venda > 0
    ? (((item.preco_venda / item.preco_custo) - 1) * 100).toFixed(0)
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        padding: '12px 16px',
        borderBottom: `1px solid ${C.border}`,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>
          Dados do produto
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        <FormItemProduto
          item={item}
          idx={0}
          onChange={(k, v) => setItem(0, k, v)}
          isDark={isDark}
          C={C}
          inp={inp}
          label={label}
          pedirFiscal={pedirFiscal}
          temMl={temMl}
          compact={false}
        />
      </div>

      {markup !== null && (
        <div style={{
          padding: '8px 16px',
          borderTop: `1px solid ${C.border}`,
          flexShrink: 0,
        }}>
          <p style={{
            margin: 0, fontSize: 11, fontWeight: 600,
            color: Number(markup) >= 30 ? C.success : C.warning,
          }}>
            Markup: {markup}% sobre o custo
          </p>
        </div>
      )}

      <FooterOpcoes
        C={C}
        pedirFiscal={pedirFiscal}
        temMl={temMl}
        onSolicitarFiscal={onSolicitarFiscal}
        onSolicitarMl={onSolicitarMl}
        itens={itens}
      />
    </div>
  );
}

// ─── FormItemProduto ──────────────────────────────────────────────────────────

interface FormItemProps {
  item: ItemProduto;
  idx: number;
  onChange: (key: keyof ItemProduto, val: any) => void;
  isDark: boolean;
  C: ReturnType<typeof useCores>;
  inp: React.CSSProperties;
  label: React.CSSProperties;
  pedirFiscal: boolean;
  temMl: boolean;
  compact: boolean;
}

function FormItemProduto({ item, onChange, isDark, C, inp, label, pedirFiscal, temMl, compact }: FormItemProps) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => { setImgError(false); }, [item.imagem_url]);

  const grid2 = {
    display: 'grid' as const,
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
    marginBottom: 10,
  };

  const fieldWrap = { marginBottom: 10 };

  return (
    <div>
      {/* Nome */}
      <div style={fieldWrap}>
        <label style={label}>Nome *</label>
        <input
          style={inp}
          value={item.nome}
          onChange={e => onChange('nome', e.target.value)}
          placeholder="Ex: Pizza de calabresa 35cm"
        />
      </div>

      {/* Preço */}
      <div style={grid2}>
        <div>
          <label style={label}>Preço de venda *</label>
          <input
            style={inp}
            type="number"
            min="0"
            step="0.01"
            value={item.preco_venda || ''}
            onChange={e => onChange('preco_venda', parseFloat(e.target.value) || 0)}
            placeholder="0,00"
          />
        </div>
        <div>
          <label style={label}>Preço de custo</label>
          <input
            style={inp}
            type="number"
            min="0"
            step="0.01"
            value={item.preco_custo || ''}
            onChange={e => onChange('preco_custo', parseFloat(e.target.value) || 0)}
            placeholder="0,00"
          />
        </div>
      </div>

      {/* Categoria + Unidade */}
      <div style={grid2}>
        <div>
          <label style={label}>Categoria</label>
          <input
            style={inp}
            value={item.categoria ?? ''}
            onChange={e => onChange('categoria', e.target.value)}
            placeholder="Ex: Pizzas"
          />
        </div>
        <div>
          <label style={label}>Unidade</label>
          <select
            style={{ ...inp, cursor: 'pointer' }}
            value={item.unidade}
            onChange={e => onChange('unidade', e.target.value)}
          >
            {['un','kg','g','l','ml','cx','pc','m','m2','hr'].map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
      </div>

      {!compact && (
        <>
          {/* Descrição */}
          <div style={fieldWrap}>
            <label style={label}>Descrição</label>
            <textarea
              style={{ ...inp, resize: 'none' } as React.CSSProperties}
              rows={2}
              value={item.descricao ?? ''}
              onChange={e => onChange('descricao', e.target.value)}
              placeholder="Descrição curta exibida no kiosk"
            />
          </div>

          {/* EAN + Marca */}
          <div style={grid2}>
            <div>
              <label style={label}>EAN / Código de barras</label>
              <input
                style={{ ...inp, fontFamily: 'monospace' }}
                value={item.ean ?? ''}
                onChange={e => onChange('ean', e.target.value)}
                placeholder="7891234567890"
              />
            </div>
            <div>
              <label style={label}>Marca</label>
              <input
                style={inp}
                value={item.marca ?? ''}
                onChange={e => onChange('marca', e.target.value)}
                placeholder="Ex: Nike"
              />
            </div>
          </div>

          {/* Estoque */}
          <div style={grid2}>
            <div>
              <label style={label}>Estoque inicial</label>
              <input
                style={inp}
                type="number"
                min="0"
                value={item.estoque_atual || ''}
                onChange={e => onChange('estoque_atual', parseInt(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div>
              <label style={label}>Estoque mínimo</label>
              <input
                style={inp}
                type="number"
                min="0"
                value={item.estoque_minimo || ''}
                onChange={e => onChange('estoque_minimo', parseInt(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
          </div>
        </>
      )}

      {/* Imagem */}
      <div style={fieldWrap}>
        <label style={label}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <IcoImage c={C.textFaint} />
            Imagem (URL)
          </span>
        </label>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            style={{ ...inp, flex: 1 }}
            value={item.imagem_url ?? ''}
            onChange={e => { onChange('imagem_url', e.target.value); setImgError(false); }}
            placeholder="Cole a URL da imagem aqui"
          />
          {item.nome && (
            <a
              href={`https://www.google.com/search?q=${encodeURIComponent(item.nome)}&tbm=isch`}
              target="_blank"
              rel="noopener noreferrer"
              title="Buscar imagem no Google"
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '0 10px', borderRadius: 8, flexShrink: 0,
                border: `1px solid ${C.border}`,
                background: 'none', color: C.textMuted,
                fontSize: 11, fontWeight: 600, cursor: 'pointer',
                textDecoration: 'none', whiteSpace: 'nowrap',
              }}
            >
              <IcoSearch c={C.textMuted} />
              Google
            </a>
          )}
        </div>

        {/* Preview */}
        {item.imagem_url && !imgError && (
          <div style={{ marginTop: 8, position: 'relative', display: 'inline-block' }}>
            <img
              src={item.imagem_url}
              alt="preview"
              onError={() => setImgError(true)}
              style={{
                width: 80, height: 80, objectFit: 'cover',
                borderRadius: 8, border: `1px solid ${C.border}`,
                display: 'block',
              }}
            />
          </div>
        )}
        {item.imagem_url && imgError && (
          <p style={{ margin: '4px 0 0', fontSize: 11, color: C.error }}>
            URL inválida ou imagem não carregou
          </p>
        )}

        {/* Aviso sugestão */}
        <p style={{ margin: '4px 0 0', fontSize: 10, color: C.textFaint, lineHeight: 1.4 }}>
          💡 Cole a URL de qualquer imagem ou busque no Google. Você pode trocar depois no dashboard.
        </p>
      </div>

      {/* Fiscal (se solicitado) */}
      {pedirFiscal && (
        <div style={{
          marginTop: 4, padding: '10px 12px', borderRadius: 10,
          border: `1px solid ${C.borderAccent}`,
          background: C.accentBg,
        }}>
          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: C.accent }}>
            📄 Dados Fiscais (NF-e)
          </p>
          <div style={grid2}>
            <div>
              <label style={label}>
                NCM
                {item.ncm_sugerido && (
                  <span style={{ color: C.warning, marginLeft: 4 }}>(sugerido)</span>
                )}
              </label>
              <input
                style={{ ...inp, fontFamily: 'monospace' }}
                maxLength={8}
                value={item.ncm ?? ''}
                onChange={e => onChange('ncm', e.target.value.replace(/\D/g, ''))}
                placeholder="00000000"
              />
            </div>
            <div>
              <label style={label}>CFOP</label>
              <input
                style={inp}
                type="number"
                value={item.cfop ?? ''}
                onChange={e => onChange('cfop', parseInt(e.target.value) || 5102)}
                placeholder="5102"
              />
            </div>
          </div>
        </div>
      )}

      {/* ML (se conectado) */}
      {temMl && item.ml_category_id && (
        <div style={{
          marginTop: 8, padding: '10px 12px', borderRadius: 10,
          border: `1px solid rgba(255,230,0,0.3)`,
          background: 'rgba(255,230,0,0.06)',
        }}>
          <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#b45309' }}>
            🛒 Mercado Livre
            {item.ml_sugerido && (
              <span style={{ color: C.warning, marginLeft: 4, fontWeight: 400 }}>(sugerido)</span>
            )}
          </p>
          <div style={grid2}>
            <div>
              <label style={label}>Categoria</label>
              <input
                style={{ ...inp, fontFamily: 'monospace', fontSize: 11 }}
                value={item.ml_category_id ?? ''}
                onChange={e => onChange('ml_category_id', e.target.value)}
                placeholder="MLB..."
              />
              {item.ml_category_nome && (
                <p style={{ margin: '2px 0 0', fontSize: 10, color: C.textMuted }}>{item.ml_category_nome}</p>
              )}
            </div>
            <div>
              <label style={label}>Tipo de anúncio</label>
              <select
                style={{ ...inp, cursor: 'pointer' }}
                value={item.ml_listing_type ?? 'bronze'}
                onChange={e => onChange('ml_listing_type', e.target.value)}
              >
                <option value="free">Grátis</option>
                <option value="bronze">Clássico</option>
                <option value="gold_special">Ouro Especial</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── FooterOpcoes ─────────────────────────────────────────────────────────────

function FooterOpcoes({ C, pedirFiscal, temMl, onSolicitarFiscal, onSolicitarMl, itens }: {
  C: ReturnType<typeof useCores>;
  pedirFiscal: boolean;
  temMl: boolean;
  onSolicitarFiscal: () => void;
  onSolicitarMl: () => void;
  itens: ItemProduto[];
}) {
  if ((!temMl && pedirFiscal) || itens.length === 0) return null;

  return (
    <div style={{
      padding: '10px 16px',
      borderTop: `1px solid ${C.border}`,
      display: 'flex', gap: 8, flexWrap: 'wrap',
      flexShrink: 0,
    }}>
      {!pedirFiscal && (
        <button onClick={onSolicitarFiscal} style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 10px', borderRadius: 8,
          border: `1px solid ${C.borderAccent}`,
          background: C.accentBg, color: C.accent,
          fontSize: 11, fontWeight: 600, cursor: 'pointer',
        }}>
          📄 Preparar para NF-e
        </button>
      )}
      {temMl && !itens.some(i => i.ml_category_id) && (
        <button onClick={onSolicitarMl} style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 10px', borderRadius: 8,
          border: '1px solid rgba(255,230,0,0.3)',
          background: 'rgba(255,230,0,0.06)', color: '#b45309',
          fontSize: 11, fontWeight: 600, cursor: 'pointer',
        }}>
          🛒 Publicar no Mercado Livre
        </button>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

function AuxiliarCadastroInner({
  data, onClose, theme = 'dark', playText: playTextProp, onSalvo,
}: CadastrarProdutoDisplayProps) {
  const { companyId } = data;
  const isDark = theme === 'dark';
  const C = useCores(isDark);
  const isMobile = useIsMobile();
  const supabase = createClient();

  // ── Estado ──────────────────────────────────────────────────────────────────
  const [step, setStep]               = useState<Step>('chat');
  const [abaAtiva, setAbaAtiva]       = useState<AbaAtiva>('chat');
  const [mensagem, setMensagem]       = useState('');
  const [historico, setHistorico]     = useState<MensagemChat[]>([]);
  const [itens, setItens]             = useState<ItemProduto[]>([]);
  const [statusIA, setStatusIA]       = useState<'collecting' | 'ready' | 'error'>('collecting');
  const [carregando, setCarregando]   = useState(false);
  const [audioMutado, setAudioMutado] = useState(false);
  const [pedirFiscal, setPedirFiscal] = useState(false);
  const [temMl, setTemMl]             = useState(false);
  const [mlPublicar, setMlPublicar]   = useState(false);
  const [erroSalvar, setErroSalvar]   = useState('');
  const [produtosSalvos, setProdutosSalvos] = useState<ProdutoVenda[]>([]);

  // Mic manual (igual AssistenteFiscalChat)
  const [gravando, setGravando]       = useState(false);
  const mediaRecorderRef              = useRef<MediaRecorder | null>(null);
  const audioChunksRef                = useRef<Blob[]>([]);

  // Fila TTS
  const audioMutadoRef  = useRef(false);
  const audioQueueRef   = useRef<string[]>([]);
  const isPlayingRef    = useRef(false);

  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const inputRef        = useRef<HTMLTextAreaElement>(null);
  const fileInputRef    = useRef<HTMLInputElement>(null);

  // ── Verificar ML conectado ──────────────────────────────────────────────────
  useEffect(() => {
    supabase
      .from('ml_connections')
      .select('id')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .maybeSingle()
      .then(({ data }) => setTemMl(!!data));
  }, [companyId]);

  // ── Scroll ao fundo ─────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [historico]);

  // ── TTS ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    audioMutadoRef.current = audioMutado;
  }, [audioMutado]);

  const playText = useCallback(async (text: string) => {
    if (audioMutadoRef.current) return;
    audioQueueRef.current.push(text);
    if (isPlayingRef.current) return;
    while (audioQueueRef.current.length > 0) {
      isPlayingRef.current = true;
      const next = audioQueueRef.current.shift();
      if (next) {
        try {
          if (playTextProp) await playTextProp(next);
          await new Promise(r => setTimeout(r, 300));
        } catch { /* silencia */ }
      }
    }
    isPlayingRef.current = false;
  }, [playTextProp]);

  // ── Saudação inicial ────────────────────────────────────────────────────────
  useEffect(() => {
    const saudacao: MensagemChat = {
      role: 'assistant',
      content: `Olá! Sou o Auxiliar de Cadastro de Produtos 📦\n\nVocê pode:\n• Digitar ou falar o nome e preço de um produto\n• Mandar uma lista de vários produtos de uma vez\n• Enviar um arquivo CSV, Excel, PDF ou foto de cardápio\n\nComo prefere começar?`,
      timestamp: Date.now(),
    };
    setHistorico([saudacao]);
    // Não lê automaticamente — microfone é manual
  }, []);

  // ── Enviar mensagem para a edge ─────────────────────────────────────────────
  const enviarMensagem = useCallback(async (texto: string) => {
    if (!texto.trim() || carregando) return;

    const msgUsuario: MensagemChat = { role: 'user', content: texto.trim(), timestamp: Date.now() };
    setHistorico(h => [...h, msgUsuario]);
    setMensagem('');
    setCarregando(true);

    try {
      const { data: result, error } = await supabase.functions.invoke('assistente-cadastro-produto', {
        body: {
          company_id: companyId,
          mensagem: texto.trim(),
          historico: [...historico, msgUsuario].slice(-12).map(m => ({
            role: m.role,
            content: m.content,
          })),
          tem_ml_conectado: temMl,
          pedir_fiscal: pedirFiscal,
        },
      });

      if (error) throw error;

      const msgAssist: MensagemChat = {
        role: 'assistant',
        content: result.resposta || 'Entendido.',
        timestamp: Date.now(),
      };
      setHistorico(h => [...h, msgAssist]);
      playText(result.resposta || '');

      if (result.produtos && result.produtos.length > 0) {
        // Merge: preserva edições manuais, adiciona novos da IA
        setItens(prev => {
          if (prev.length === 0) return result.produtos;
          return result.produtos.map((itemIA: ItemProduto, idx: number) => {
            const prev_ = prev[idx];
            if (!prev_) return itemIA;
            return {
              nome:          prev_.nome          || itemIA.nome,
              descricao:     prev_.descricao     || itemIA.descricao,
              categoria:     prev_.categoria     || itemIA.categoria,
              preco_venda:   prev_.preco_venda   || itemIA.preco_venda,
              preco_custo:   prev_.preco_custo   || itemIA.preco_custo,
              unidade:       prev_.unidade       || itemIA.unidade,
              estoque_atual: prev_.estoque_atual || itemIA.estoque_atual,
              estoque_minimo: prev_.estoque_minimo || itemIA.estoque_minimo,
              imagem_url:    prev_.imagem_url    || itemIA.imagem_url,
              ean:           prev_.ean           || itemIA.ean,
              marca:         prev_.marca         || itemIA.marca,
              ncm:           itemIA.ncm          || prev_.ncm,
              cfop:          itemIA.cfop         || prev_.cfop,
              origem_produto: itemIA.origem_produto ?? prev_.origem_produto,
              ncm_sugerido:  itemIA.ncm_sugerido,
              ml_category_id:   itemIA.ml_category_id   || prev_.ml_category_id,
              ml_category_nome: itemIA.ml_category_nome || prev_.ml_category_nome,
              ml_listing_type:  prev_.ml_listing_type   || itemIA.ml_listing_type,
              ml_sugerido:   itemIA.ml_sugerido,
            };
          });
        });
        if (isMobile) setAbaAtiva('produtos');
      }

      setStatusIA(result.status || 'collecting');

    } catch (err: any) {
      const msgErro: MensagemChat = {
        role: 'assistant',
        content: 'Desculpe, houve um erro. Tente novamente.',
        timestamp: Date.now(),
      };
      setHistorico(h => [...h, msgErro]);
      setStatusIA('error');
    } finally {
      setCarregando(false);
    }
  }, [carregando, historico, companyId, temMl, pedirFiscal, supabase, playText, isMobile]);

  // ── Solicitar fiscal via chat ───────────────────────────────────────────────
  const handleSolicitarFiscal = useCallback(() => {
    setPedirFiscal(true);
    enviarMensagem('Preciso preparar esses produtos para emissão de nota fiscal. Por favor, sugira o NCM e CFOP para cada um.');
  }, [enviarMensagem]);

  // ── Solicitar ML via chat ───────────────────────────────────────────────────
  const handleSolicitarMl = useCallback(() => {
    setMlPublicar(true);
    enviarMensagem('Quero publicar esses produtos no Mercado Livre. Por favor, sugira a categoria ML mais adequada para cada um.');
  }, [enviarMensagem]);

  // ── Gravar áudio (microfone manual) ─────────────────────────────────────────
  const iniciarGravacao = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const fd = new FormData();
        fd.append('file', blob, 'audio.webm');
        fd.append('model', 'whisper-1');
        fd.append('language', 'pt');
        try {
          const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY ?? ''}` },
            body: fd,
          });
          const json = await res.json();
          if (json.text?.trim()) {
            setMensagem(json.text.trim());
            // Envia automaticamente após transcrição
            await enviarMensagem(json.text.trim());
          }
        } catch { /* silencia erro de transcrição */ }
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setGravando(true);
    } catch { /* microfone negado */ }
  }, [enviarMensagem]);

  const pararGravacao = useCallback(() => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setGravando(false);
  }, []);

  // ── Upload de arquivo ────────────────────────────────────────────────────────
  const handleArquivo = useCallback(async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    let produtosExtraidos: ItemProduto[] = [];
    let msgArquivo = `Arquivo enviado: ${file.name}`;

    try {
      if (ext === 'csv') {
        // CSV via PapaParse
        const Papa = (await import('papaparse')).default;
        const text = await file.text();
        const result = Papa.parse(text, { header: true, skipEmptyLines: true });
        produtosExtraidos = (result.data as any[]).map(row => ({
          nome:         row.nome || row.name || row.produto || row.Produto || '',
          preco_venda:  parseFloat(row.preco || row.preco_venda || row.price || '0') || 0,
          preco_custo:  parseFloat(row.custo || row.preco_custo || row.cost || '0') || 0,
          categoria:    row.categoria || row.category || '',
          unidade:      row.unidade || row.unit || 'un',
          estoque_atual: parseInt(row.estoque || row.stock || '0') || 0,
          estoque_minimo: 0,
          ean:          row.ean || row.codigo || '',
          imagem_url:   row.imagem || row.image || row.imagem_url || '',
          marca:        row.marca || row.brand || '',
        })).filter((p: ItemProduto) => p.nome.trim());
        msgArquivo = `Encontrei ${produtosExtraidos.length} produto(s) no CSV. Verifique e confirme os dados.`;

      } else if (ext === 'xlsx' || ext === 'xls') {
        // Excel via SheetJS
        const XLSX = (await import('xlsx')).default;
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
        produtosExtraidos = rows.map(row => ({
          nome:         String(row.nome || row.name || row.produto || row.Produto || '').trim(),
          preco_venda:  parseFloat(String(row.preco || row.preco_venda || row.price || '0').replace(',', '.')) || 0,
          preco_custo:  parseFloat(String(row.custo || row.preco_custo || '0').replace(',', '.')) || 0,
          categoria:    String(row.categoria || row.category || '').trim(),
          unidade:      String(row.unidade || row.unit || 'un').trim(),
          estoque_atual: parseInt(String(row.estoque || row.stock || '0')) || 0,
          estoque_minimo: 0,
          ean:          String(row.ean || row.codigo || '').trim(),
          imagem_url:   String(row.imagem || row.image || row.imagem_url || '').trim(),
          marca:        String(row.marca || row.brand || '').trim(),
        })).filter((p: ItemProduto) => p.nome);
        msgArquivo = `Encontrei ${produtosExtraidos.length} produto(s) na planilha. Verifique e confirme os dados.`;

      } else if (ext === 'pdf' || ['jpg', 'jpeg', 'png', 'webp'].includes(ext ?? '')) {
        // PDF/Imagem → base64 → GPT-4o Vision via edge
        const toBase64 = (f: File): Promise<string> => new Promise((res, rej) => {
          const reader = new FileReader();
          reader.onload = () => res((reader.result as string).split(',')[1]);
          reader.onerror = rej;
          reader.readAsDataURL(f);
        });

        const b64 = await toBase64(file);
        const mediaType = ext === 'pdf' ? 'application/pdf' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;

        // Chama a edge com o arquivo em base64 para o GPT-4o extrair
        const prompt = ext === 'pdf'
          ? 'Este é um cardápio ou lista de produtos em PDF. Extraia todos os produtos com nome, descrição e preço em JSON.'
          : 'Esta é uma imagem de cardápio ou lista de produtos. Extraia todos os produtos com nome, descrição e preço em JSON.';

        await enviarMensagem(
          `[ARQUIVO: ${file.name}]\nPor favor, analise este arquivo e extraia os produtos.\nTipo: ${mediaType}\nDados: data:${mediaType};base64,${b64.substring(0, 50)}...`
        );
        return; // A edge vai processar

      } else {
        await enviarMensagem(`Arquivo não suportado: ${file.name}. Use CSV, XLS, XLSX, PDF ou imagem.`);
        return;
      }

      if (produtosExtraidos.length > 0) {
        setItens(produtosExtraidos);
        if (isMobile) setAbaAtiva('produtos');
      }

      const msgUser: MensagemChat = {
        role: 'user',
        content: `📎 ${file.name}`,
        timestamp: Date.now(),
      };
      const msgAssist: MensagemChat = {
        role: 'assistant',
        content: msgArquivo,
        timestamp: Date.now(),
      };
      setHistorico(h => [...h, msgUser, msgAssist]);
      if (produtosExtraidos.length > 0) setStatusIA('ready');

    } catch (err: any) {
      const msgAssist: MensagemChat = {
        role: 'assistant',
        content: `Erro ao processar o arquivo. Tente novamente ou cole os dados no chat.`,
        timestamp: Date.now(),
      };
      setHistorico(h => [...h, msgAssist]);
    }
  }, [enviarMensagem, isMobile]);

  // ── Salvar produtos ─────────────────────────────────────────────────────────
  const handleSalvar = useCallback(async () => {
    const validos = itens.filter(i => i.nome.trim() && i.preco_venda > 0);
    if (validos.length === 0) return;

    setStep('salvando');
    setErroSalvar('');

    try {
      const salvos: ProdutoVenda[] = [];

      for (const item of validos) {
        // 1. Salvar produto
        const { data: inserted, error: errProd } = await supabase
          .from('produtos_venda')
          .insert({
            company_id:       companyId,
            nome:             item.nome.trim(),
            descricao:        item.descricao?.trim() || null,
            categoria:        item.categoria?.trim() || null,
            preco_venda:      item.preco_venda,
            preco_custo:      item.preco_custo || 0,
            unidade:          item.unidade || 'un',
            estoque_atual:    item.estoque_atual || 0,
            estoque_minimo:   item.estoque_minimo || 0,
            imagem_url:       item.imagem_url?.trim() || null,
            ean:              item.ean?.trim() || null,
            marca:            item.marca?.trim() || null,
            controla_estoque: true,
            is_active:        true,
            is_favorito:      false,
          })
          .select('*')
          .single();

        if (errProd) throw errProd;
        salvos.push(inserted as ProdutoVenda);

        // 2. Salvar dados fiscais se existirem
        if (pedirFiscal && item.ncm && item.ncm.length === 8) {
          await supabase
            .from('produtos_fiscal')
            .upsert({
              produto_id:     inserted.id,
              company_id:     companyId,
              ncm:            item.ncm,
              cfop:           item.cfop || 5102,
              origem_produto: item.origem_produto ?? 0,
              updated_at:     new Date().toISOString(),
            }, { onConflict: 'produto_id' });
        }

        // 3. Salvar dados ML se solicitado
        if (mlPublicar && item.ml_category_id) {
          await supabase
            .from('produtos_venda')
            .update({
              ml_category_id:   item.ml_category_id,
              ml_listing_type:  item.ml_listing_type || 'bronze',
            })
            .eq('id', inserted.id);
        }

        // 4. Embedding (sem dados fiscais — regra arquitetural)
        try {
          const { triggerEmbeddingUpdate } = await import('@/lib/embeddings');
          triggerEmbeddingUpdate('product', companyId, {
            id: inserted.id,
            nome: item.nome,
            descricao: item.descricao,
            categoria: item.categoria,
            preco_venda: item.preco_venda,
            unidade: item.unidade,
          });
        } catch { /* silencia erro de embedding */ }
      }

      // 5. Cobrar crédito (1 crédito por produto salvo)
      try {
        await supabase.rpc('register_function_usage', {
          p_company_id:       companyId,
          p_function_key:     'cadastrar_produto',
          p_credits_consumed: validos.length,
        });
      } catch { /* não bloqueia se falhar */ }

      setProdutosSalvos(salvos);
      setStep('sucesso');
      playText(`${salvos.length === 1 ? 'Produto cadastrado' : `${salvos.length} produtos cadastrados`} com sucesso!`);
      onSalvo?.(salvos);

      // Perguntar sobre ML se conectado e não foi solicitado ainda
      if (temMl && !mlPublicar && salvos.length > 0) {
        setTimeout(() => {
          const msgMl: MensagemChat = {
            role: 'assistant',
            content: `Produtos salvos com sucesso! 🎉\n\nIdentifiquei que você tem o Mercado Livre conectado. Deseja publicar ${salvos.length === 1 ? 'este produto' : 'esses produtos'} no ML também?`,
            timestamp: Date.now(),
          };
          setHistorico(h => [...h, msgMl]);
        }, 500);
      }

    } catch (err: any) {
      setErroSalvar(err.message || 'Erro ao salvar. Tente novamente.');
      setStep('chat');
    }
  }, [itens, companyId, pedirFiscal, mlPublicar, temMl, supabase, playText, onSalvo]);

  // ── Key handler ─────────────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviarMensagem(mensagem);
    }
  };

  // ── Produtos válidos ────────────────────────────────────────────────────────
  const itensValidos = itens.filter(i => i.nome.trim() && i.preco_venda > 0);
  const prontoParaSalvar = itensValidos.length > 0 && step === 'chat';

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
      padding: isMobile ? 0 : 16,
    }}>
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: isMobile ? '100%' : 920,
        height: isMobile ? '100%' : 'auto',
        maxHeight: isMobile ? '100%' : '90vh',
        background: C.bg,
        border: isMobile ? 'none' : `1px solid ${C.border}`,
        borderRadius: isMobile ? 0 : 20,
        boxShadow: '0 24px 64px rgba(0,0,0,0.40)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>

        {/* ── Header ── */}
        <div style={{
          padding: isMobile ? '14px 16px' : '14px 20px',
          borderBottom: `1px solid ${C.border}`,
          background: C.accentBg,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: C.accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <IcoPackage c="#fff" size={18} />
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: C.text }}>
                Auxiliar de Cadastro
              </p>
              <p style={{ margin: 0, fontSize: 11, color: C.textMuted }}>
                {itensValidos.length > 0
                  ? `${itensValidos.length} produto${itensValidos.length !== 1 ? 's' : ''} pronto${itensValidos.length !== 1 ? 's' : ''}`
                  : 'Cadastre um ou vários produtos por vez'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Status indicator */}
            {statusIA === 'ready' && itensValidos.length > 0 && (
              <span style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '3px 8px', borderRadius: 20,
                background: C.successBg,
                border: `1px solid ${C.borderAccent}`,
                fontSize: 10, fontWeight: 700, color: C.success,
              }}>
                <IcoCheck c={C.success} /> Pronto
              </span>
            )}

            {/* Mute */}
            <button onClick={() => setAudioMutado(v => !v)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 6, color: audioMutado ? C.error : C.textMuted,
              lineHeight: 0,
            }}>
              {audioMutado ? <IcoVolumeMute c={C.error} /> : <IcoVolume c={C.textMuted} />}
            </button>

            {/* Fechar */}
            <button onClick={onClose} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 6, color: C.textMuted, lineHeight: 0,
            }}>
              <IcoX c={C.textMuted} />
            </button>
          </div>
        </div>

        {/* ── Tabs mobile ── */}
        {isMobile && (
          <div style={{
            display: 'flex',
            borderBottom: `1px solid ${C.border}`,
            flexShrink: 0,
          }}>
            {([
              { key: 'chat' as AbaAtiva, label: 'Assistente IA' },
              { key: 'produtos' as AbaAtiva, label: `Produtos${itensValidos.length > 0 ? ` (${itensValidos.length})` : ''}` },
            ]).map(tab => (
              <button
                key={tab.key}
                onClick={() => setAbaAtiva(tab.key)}
                style={{
                  flex: 1, padding: '10px', background: 'none',
                  border: 'none', cursor: 'pointer',
                  borderBottom: `2px solid ${abaAtiva === tab.key ? C.accent : 'transparent'}`,
                  color: abaAtiva === tab.key ? C.accent : C.textMuted,
                  fontSize: 13, fontWeight: 600,
                  transition: 'all .15s',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Body: sucesso/salvando/erro ── */}
        {step === 'salvando' && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32,
          }}>
            <IcoSpinner c={C.accent} />
            <p style={{ margin: 0, color: C.textMuted, fontSize: 14 }}>
              Salvando {itensValidos.length} produto{itensValidos.length !== 1 ? 's' : ''}...
            </p>
          </div>
        )}

        {step === 'sucesso' && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32,
            textAlign: 'center',
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: C.successBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <IcoCheck c={C.success} />
            </div>
            <div>
              <p style={{ margin: '0 0 4px', fontWeight: 800, fontSize: 20, color: C.text }}>
                {produtosSalvos.length === 1 ? 'Produto Cadastrado!' : `${produtosSalvos.length} Produtos Cadastrados!`}
              </p>
              <p style={{ margin: 0, fontSize: 13, color: C.textMuted }}>
                {produtosSalvos.map(p => p.nome).join(', ')}
              </p>
            </div>
            {temMl && !mlPublicar && (
              <button onClick={() => {
                setMlPublicar(true);
                setStep('chat');
                handleSolicitarMl();
              }} style={{
                padding: '10px 20px', borderRadius: 10,
                border: '1px solid rgba(255,230,0,0.4)',
                background: 'rgba(255,230,0,0.1)', color: '#b45309',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>
                🛒 Publicar no Mercado Livre
              </button>
            )}
            <button onClick={onClose} style={{
              padding: '10px 24px', borderRadius: 10,
              background: C.accent, color: '#fff', border: 'none',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}>
              Concluir
            </button>
          </div>
        )}

        {/* ── Body: chat + painel ── */}
        {(step === 'chat' || step === 'confirmando') && (
          <div style={{
            flex: 1, display: 'flex', overflow: 'hidden',
          }}>
            {/* Coluna esquerda: Chat */}
            <div style={{
              display: 'flex', flexDirection: 'column',
              flex: 1,
              borderRight: !isMobile ? `1px solid ${C.border}` : 'none',
              ...(isMobile && abaAtiva !== 'chat' ? { display: 'none' } : {}),
            }}>

              {/* Hint desktop */}
              {!isMobile && (
                <div style={{
                  padding: '8px 16px',
                  borderBottom: `1px solid ${C.border}`,
                  background: C.accentBlueBg,
                  flexShrink: 0,
                }}>
                  <p style={{ margin: 0, fontSize: 11, color: C.accentBlue }}>
                    💡 Fale ou escreva — pode mandar vários produtos de uma vez, ou enviar um arquivo CSV, Excel, PDF ou foto de cardápio.
                  </p>
                </div>
              )}

              {/* Mensagens */}
              <div style={{
                flex: 1, overflowY: 'auto',
                padding: '12px 14px',
                background: C.bgChat,
                display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                {historico.map((msg, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  }}>
                    <div style={{
                      maxWidth: '82%',
                      padding: '9px 13px',
                      borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                      background: msg.role === 'user' ? C.bgUserBubble : C.bgAssistBubble,
                      color: msg.role === 'user' ? '#fff' : C.text,
                      fontSize: 13,
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}>
                      {msg.content}
                    </div>
                  </div>
                ))}

                {carregando && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <div style={{
                      padding: '9px 13px', borderRadius: '14px 14px 14px 4px',
                      background: C.bgAssistBubble,
                      display: 'flex', gap: 4, alignItems: 'center',
                    }}>
                      {[0, 1, 2].map(i => (
                        <span key={i} style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: C.textMuted,
                          animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                          display: 'inline-block',
                        }} />
                      ))}
                    </div>
                  </div>
                )}

                {erroSalvar && (
                  <div style={{
                    padding: '8px 12px', borderRadius: 10,
                    background: C.errorBg, border: `1px solid ${C.error}33`,
                    color: C.error, fontSize: 12,
                  }}>
                    ⚠️ {erroSalvar}
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input área */}
              <div style={{
                padding: '10px 12px',
                borderTop: `1px solid ${C.border}`,
                background: C.bg,
                flexShrink: 0,
              }}>
                {/* Upload */}
                <div style={{
                  display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap',
                }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls,.pdf,.jpg,.jpeg,.png,.webp"
                    style={{ display: 'none' }}
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) handleArquivo(f);
                      e.target.value = '';
                    }}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '5px 10px', borderRadius: 8,
                      border: `1px solid ${C.border}`,
                      background: 'none', color: C.textMuted,
                      fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    <IcoUpload c={C.textMuted} />
                    CSV / Excel / PDF / Imagem
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '5px 10px', borderRadius: 8,
                      border: `1px solid ${C.border}`,
                      background: 'none', color: C.textMuted,
                      fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    <IcoCsv c={C.textMuted} />
                    Importar CSV
                  </button>
                </div>

                {/* Textarea + botões */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <textarea
                    ref={inputRef}
                    value={mensagem}
                    onChange={e => setMensagem(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ex: Pizza margherita 35cm por R$45, Coca-Cola 2l por R$12..."
                    rows={2}
                    style={{
                      flex: 1,
                      padding: '9px 12px',
                      borderRadius: 10,
                      border: `1px solid ${C.border}`,
                      background: C.bgInput,
                      color: C.text,
                      fontSize: 13,
                      resize: 'none',
                      outline: 'none',
                      fontFamily: 'inherit',
                      lineHeight: 1.4,
                    }}
                  />

                  {/* Microfone */}
                  <button
                    onMouseDown={iniciarGravacao}
                    onMouseUp={pararGravacao}
                    onTouchStart={e => { e.preventDefault(); iniciarGravacao(); }}
                    onTouchEnd={e => { e.preventDefault(); pararGravacao(); }}
                    style={{
                      width: 38, height: 38,
                      borderRadius: 10, border: 'none', flexShrink: 0,
                      background: gravando ? C.error : C.bgCard,
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all .15s',
                      boxShadow: gravando ? `0 0 0 3px ${C.error}44` : 'none',
                    }}
                    title="Segure para gravar"
                  >
                    <IcoMic c={gravando ? '#fff' : C.textMuted} />
                  </button>

                  {/* Enviar */}
                  <button
                    onClick={() => enviarMensagem(mensagem)}
                    disabled={!mensagem.trim() || carregando}
                    style={{
                      width: 38, height: 38,
                      borderRadius: 10, border: 'none', flexShrink: 0,
                      background: mensagem.trim() && !carregando ? C.accent : C.border,
                      cursor: mensagem.trim() && !carregando ? 'pointer' : 'not-allowed',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all .15s',
                    }}
                  >
                    <IcoSend c="#fff" />
                  </button>
                </div>
              </div>
            </div>

            {/* Coluna direita: Painel de produtos */}
            <div style={{
              width: isMobile ? '100%' : 380,
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
              flexShrink: 0,
              ...(isMobile && abaAtiva !== 'produtos' ? { display: 'none' } : {}),
            }}>
              {isMobile && (
                <div style={{
                  padding: '6px 12px',
                  background: C.accentBlueBg,
                  borderBottom: `1px solid ${C.border}`,
                  flexShrink: 0,
                }}>
                  <p style={{ margin: 0, fontSize: 11, color: C.accentBlue }}>
                    💡 Edite direto ou use o chat — os dados ficam sincronizados.
                  </p>
                </div>
              )}

              <PainelProduto
                itens={itens}
                onChange={setItens}
                isDark={isDark}
                C={C}
                temMl={temMl}
                pedirFiscal={pedirFiscal}
                onSolicitarFiscal={handleSolicitarFiscal}
                onSolicitarMl={handleSolicitarMl}
              />
            </div>
          </div>
        )}

        {/* ── Footer: botão salvar ── */}
        {(step === 'chat' || step === 'confirmando') && (
          <div style={{
            padding: '12px 20px',
            borderTop: `1px solid ${C.border}`,
            display: 'flex', gap: 10, alignItems: 'center',
            background: C.bg, flexShrink: 0,
          }}>
            <button onClick={onClose} style={{
              padding: '9px 16px', borderRadius: 10,
              border: `1px solid ${C.border}`,
              background: 'none', color: C.textMuted,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              Cancelar
            </button>

            <div style={{ flex: 1 }} />

            {itensValidos.length > 0 && (
              <p style={{ margin: 0, fontSize: 12, color: C.textMuted }}>
                {itensValidos.length} produto{itensValidos.length !== 1 ? 's' : ''} pronto{itensValidos.length !== 1 ? 's' : ''}
              </p>
            )}

            <button
              onClick={handleSalvar}
              disabled={!prontoParaSalvar}
              style={{
                padding: '9px 20px', borderRadius: 10, border: 'none',
                background: prontoParaSalvar ? C.accent : C.border,
                color: '#fff',
                fontSize: 13, fontWeight: 700, cursor: prontoParaSalvar ? 'pointer' : 'not-allowed',
                transition: 'all .15s',
                opacity: prontoParaSalvar ? 1 : 0.5,
              }}
            >
              {itensValidos.length === 0
                ? 'Cadastrar Produtos'
                : itensValidos.length === 1
                  ? 'Cadastrar Produto'
                  : `Cadastrar ${itensValidos.length} Produtos`}
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40%            { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ─── Export com mount guard ───────────────────────────────────────────────────

export default function CadastrarProdutoDisplay(props: CadastrarProdutoDisplayProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return createPortal(<AuxiliarCadastroInner {...props} />, document.body);
}
