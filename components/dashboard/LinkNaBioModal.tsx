// components/dashboard/LinkNaBioModal.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase-browser';

// ── Tipos ─────────────────────────────────────────────────────

interface CompanyLink {
  id: string;
  titulo: string;
  url: string;
  display_order: number;
  is_active: boolean;
  is_broken: boolean;
  last_checked_at: string | null;
  last_status: number | null;
  broken_since: string | null;
}

interface LinkNaBioModalProps {
  companyId: string;
  slug: string;
  onClose: () => void;
}

// ── Paletas inline (padrão arquitetural minhAi) ───────────────

const DARK = {
  bg: '#0f172a',
  surface: '#1e293b',
  surfaceHover: '#273548',
  border: 'rgba(255,255,255,0.08)',
  borderFocus: '#8b5cf6',
  text: '#f1f5f9',
  textMuted: 'rgba(255,255,255,0.45)',
  textPlaceholder: 'rgba(255,255,255,0.25)',
  input: 'rgba(255,255,255,0.05)',
  inputBorder: 'rgba(255,255,255,0.12)',
  danger: '#f87171',
  dangerBg: 'rgba(239,68,68,0.12)',
  success: '#34d399',
  successBg: 'rgba(52,211,153,0.12)',
  warning: '#fbbf24',
  warningBg: 'rgba(251,191,36,0.12)',
  violet: '#a78bfa',
  violetBg: 'rgba(139,92,246,0.15)',
  overlay: 'rgba(0,0,0,0.75)',
};

const LIGHT = {
  bg: '#ffffff',
  surface: '#f8fafc',
  surfaceHover: '#f1f5f9',
  border: '#e2e8f0',
  borderFocus: '#8b5cf6',
  text: '#0f172a',
  textMuted: '#64748b',
  textPlaceholder: '#94a3b8',
  input: '#ffffff',
  inputBorder: '#cbd5e1',
  danger: '#dc2626',
  dangerBg: '#fef2f2',
  success: '#059669',
  successBg: '#f0fdf4',
  warning: '#d97706',
  warningBg: '#fffbeb',
  violet: '#7c3aed',
  violetBg: '#ede9fe',
  overlay: 'rgba(0,0,0,0.5)',
};

// ── Ícones SVG inline ─────────────────────────────────────────

const IconLink = ({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} fill="none" stroke={color} strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
);

const IconTrash = ({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} fill="none" stroke={color} strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const IconEdit = ({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} fill="none" stroke={color} strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const IconCheck = ({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} fill="none" stroke={color} strokeWidth={2.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const IconX = ({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} fill="none" stroke={color} strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const IconGrip = ({ color = 'currentColor' }: { color?: string }) => (
  <svg width={16} height={16} fill={color} viewBox="0 0 24 24">
    <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
    <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
    <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
  </svg>
);

const IconRefresh = ({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} fill="none" stroke={color} strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const IconExternalLink = ({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} fill="none" stroke={color} strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

const IconPlus = ({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} fill="none" stroke={color} strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);

// ── Componente principal ──────────────────────────────────────

export default function LinkNaBioModal({ companyId, slug, onClose }: LinkNaBioModalProps) {
  const supabase = createClient();
  const [mounted, setMounted] = useState(false);

  // Detectar tema do sistema/next-themes via classe no html
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const html = document.documentElement;
    setIsDark(html.classList.contains('dark') || html.getAttribute('data-theme') === 'dark');
    setMounted(true);
  }, []);

  const p = isDark ? DARK : LIGHT;

  // ── Estado de links ───────────────────────────────────────
  const [links, setLinks] = useState<CompanyLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // ── Formulário de novo/editar link ────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitulo, setFormTitulo] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formError, setFormError] = useState('');

  // ── Drag and drop ─────────────────────────────────────────
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Carregar links ────────────────────────────────────────
  const loadLinks = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('company_links')
      .select('*')
      .eq('company_id', companyId)
      .order('display_order', { ascending: true });

    if (!error && data) setLinks(data);
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  // ── Abrir formulário de edição ────────────────────────────
  const openEdit = (link: CompanyLink) => {
    setEditingId(link.id);
    setFormTitulo(link.titulo);
    setFormUrl(link.url);
    setFormError('');
    setShowForm(true);
  };

  const openNew = () => {
    setEditingId(null);
    setFormTitulo('');
    setFormUrl('');
    setFormError('');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormTitulo('');
    setFormUrl('');
    setFormError('');
  };

  // ── Validar URL ───────────────────────────────────────────
  const normalizeUrl = (url: string): string => {
    const trimmed = url.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') ||
        trimmed.startsWith('mailto:') || trimmed.startsWith('tel:') ||
        trimmed.startsWith('wa.me') || trimmed.startsWith('whatsapp:')) {
      return trimmed;
    }
    return `https://${trimmed}`;
  };

  // ── Salvar link ───────────────────────────────────────────
  const handleSave = async () => {
    if (!formTitulo.trim()) { setFormError('O título é obrigatório.'); return; }
    if (!formUrl.trim()) { setFormError('A URL é obrigatória.'); return; }

    const normalizedUrl = normalizeUrl(formUrl);
    setSaving(true);
    setFormError('');

    if (editingId) {
      const { error } = await supabase
        .from('company_links')
        .update({ titulo: formTitulo.trim(), url: normalizedUrl, updated_at: new Date().toISOString() })
        .eq('id', editingId);

      if (error) { setFormError('Erro ao salvar. Tente novamente.'); setSaving(false); return; }
      showToast('Link atualizado!');
    } else {
      const maxOrder = links.length > 0 ? Math.max(...links.map(l => l.display_order)) + 1 : 0;
      const { error } = await supabase
        .from('company_links')
        .insert({
          company_id: companyId,
          titulo: formTitulo.trim(),
          url: normalizedUrl,
          display_order: maxOrder,
          is_active: true,
        });

      if (error) { setFormError('Erro ao criar link. Tente novamente.'); setSaving(false); return; }
      showToast('Link criado!');
    }

    setSaving(false);
    closeForm();
    await loadLinks();
  };

  // ── Toggle ativo/inativo ──────────────────────────────────
  const handleToggleActive = async (link: CompanyLink) => {
    const { error } = await supabase
      .from('company_links')
      .update({ is_active: !link.is_active })
      .eq('id', link.id);

    if (!error) {
      setLinks(prev => prev.map(l => l.id === link.id ? { ...l, is_active: !l.is_active } : l));
    }
  };

  // ── Deletar ───────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('company_links').delete().eq('id', id);
    if (!error) {
      setLinks(prev => prev.filter(l => l.id !== id));
      showToast('Link removido.');
    }
  };

  // ── Drag and drop reorder ─────────────────────────────────
  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOver(index);
  };
  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null); setDragOver(null); return;
    }

    const reordered = [...links];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    const updated = reordered.map((l, i) => ({ ...l, display_order: i }));
    setLinks(updated);
    setDragIndex(null);
    setDragOver(null);

    // Persistir nova ordem
    for (const l of updated) {
      await supabase.from('company_links').update({ display_order: l.display_order }).eq('id', l.id);
    }
    showToast('Ordem salva!');
  };

  // ── Verificar links ───────────────────────────────────────
  const handleCheckLinks = async () => {
    setChecking(true);
    try {
      const response = await fetch('/api/check-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      });
      const result = await response.json();
      if (response.ok) {
        showToast(`Verificação concluída: ${result.ok} ok, ${result.broken} com problema.`);
        await loadLinks();
      } else {
        showToast('Erro na verificação.', 'error');
      }
    } catch {
      showToast('Erro na verificação.', 'error');
    }
    setChecking(false);
  };

  if (!mounted) return null;

  const content = (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: p.overlay,
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: p.bg,
        borderRadius: 20,
        border: `1px solid ${p.border}`,
        width: '100%',
        maxWidth: 560,
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: isDark ? '0 25px 60px rgba(0,0,0,0.6)' : '0 25px 60px rgba(0,0,0,0.15)',
      }}>

        {/* ── Header ── */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: `1px solid ${p.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: p.violetBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <IconLink size={18} color={p.violet} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: p.text }}>Link na Bio</h2>
              <p style={{ margin: 0, fontSize: 12, color: p.textMuted }}>Gerencie seus links públicos</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Botão ver página */}
            <a
              href={`/link/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 12px',
                borderRadius: 8,
                border: `1px solid ${p.border}`,
                background: 'transparent',
                color: p.textMuted,
                textDecoration: 'none',
                fontSize: 12, fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <IconExternalLink size={12} color={p.textMuted} />
              Ver página
            </a>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: 8,
                border: `1px solid ${p.border}`,
                background: 'transparent',
                color: p.textMuted,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <IconX size={16} color={p.textMuted} />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>

          {/* Formulário de novo/editar link */}
          {showForm && (
            <div style={{
              background: p.surface,
              border: `1px solid ${p.borderFocus}`,
              borderRadius: 14,
              padding: 16,
              marginBottom: 16,
            }}>
              <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: p.violet }}>
                {editingId ? 'Editar link' : 'Novo link'}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: p.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Título
                  </label>
                  <input
                    type="text"
                    value={formTitulo}
                    onChange={e => setFormTitulo(e.target.value)}
                    placeholder="Ex: Nosso Site"
                    maxLength={100}
                    style={{
                      width: '100%', marginTop: 4,
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: `1px solid ${p.inputBorder}`,
                      background: p.input,
                      color: p.text,
                      fontSize: 14,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: p.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    URL
                  </label>
                  <input
                    type="text"
                    value={formUrl}
                    onChange={e => setFormUrl(e.target.value)}
                    placeholder="https://seusite.com.br"
                    style={{
                      width: '100%', marginTop: 4,
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: `1px solid ${p.inputBorder}`,
                      background: p.input,
                      color: p.text,
                      fontSize: 14,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
                  />
                </div>
                {formError && (
                  <p style={{ margin: 0, fontSize: 12, color: p.danger }}>{formError}</p>
                )}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button
                    onClick={closeForm}
                    style={{
                      padding: '8px 16px', borderRadius: 8,
                      border: `1px solid ${p.border}`,
                      background: 'transparent', color: p.textMuted,
                      fontSize: 13, fontWeight: 500, cursor: 'pointer',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                      padding: '8px 16px', borderRadius: 8,
                      border: 'none',
                      background: p.violet, color: '#fff',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      opacity: saving ? 0.7 : 1,
                    }}
                  >
                    {saving ? 'Salvando...' : editingId ? 'Atualizar' : 'Adicionar'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Lista de links */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: p.textMuted, fontSize: 14 }}>
              Carregando links...
            </div>
          ) : links.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '40px 24px',
              background: p.surface, borderRadius: 14,
              border: `1px dashed ${p.border}`,
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔗</div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: p.text }}>Nenhum link cadastrado</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: p.textMuted }}>
                Adicione links para exibir na sua página pública
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {links.map((link, index) => (
                <div
                  key={link.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={e => handleDragOver(e, index)}
                  onDrop={e => handleDrop(e, index)}
                  onDragEnd={() => { setDragIndex(null); setDragOver(null); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: `1px solid ${dragOver === index ? p.borderFocus : (link.is_broken ? p.danger + '40' : p.border)}`,
                    background: dragOver === index ? p.surfaceHover : p.surface,
                    opacity: dragIndex === index ? 0.5 : 1,
                    transition: 'all 0.15s',
                    cursor: 'grab',
                  }}
                >
                  {/* Grip */}
                  <div style={{ color: p.textMuted, flexShrink: 0, cursor: 'grab' }}>
                    <IconGrip color={p.textMuted} />
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: link.is_active ? p.text : p.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>
                        {link.titulo}
                      </span>
                      {link.is_broken && (
                        <span style={{
                          fontSize: 10, fontWeight: 700,
                          background: p.dangerBg, color: p.danger,
                          padding: '2px 6px', borderRadius: 5,
                          flexShrink: 0,
                        }}>
                          🔴 Quebrado
                        </span>
                      )}
                      {!link.is_active && (
                        <span style={{
                          fontSize: 10, fontWeight: 600,
                          background: p.input, color: p.textMuted,
                          padding: '2px 6px', borderRadius: 5,
                          flexShrink: 0,
                        }}>
                          Inativo
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: p.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 260 }}>
                      {link.url}
                    </p>
                    {link.last_checked_at && (
                      <p style={{ margin: '2px 0 0', fontSize: 10, color: p.textMuted }}>
                        Verificado: {new Date(link.last_checked_at).toLocaleDateString('pt-BR')}
                        {link.last_status ? ` (HTTP ${link.last_status})` : ''}
                      </p>
                    )}
                  </div>

                  {/* Ações */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    {/* Toggle ativo */}
                    <button
                      onClick={() => handleToggleActive(link)}
                      title={link.is_active ? 'Desativar' : 'Ativar'}
                      style={{
                        width: 32, height: 32, borderRadius: 8,
                        border: `1px solid ${p.border}`,
                        background: link.is_active ? p.successBg : p.input,
                        color: link.is_active ? p.success : p.textMuted,
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <IconCheck size={14} color={link.is_active ? p.success : p.textMuted} />
                    </button>

                    {/* Editar */}
                    <button
                      onClick={() => openEdit(link)}
                      title="Editar"
                      style={{
                        width: 32, height: 32, borderRadius: 8,
                        border: `1px solid ${p.border}`,
                        background: 'transparent',
                        color: p.textMuted,
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <IconEdit size={14} color={p.textMuted} />
                    </button>

                    {/* Deletar */}
                    <button
                      onClick={() => handleDelete(link.id)}
                      title="Remover"
                      style={{
                        width: 32, height: 32, borderRadius: 8,
                        border: `1px solid ${p.border}`,
                        background: 'transparent',
                        color: p.danger,
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <IconTrash size={14} color={p.danger} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Dica de drag */}
          {links.length > 1 && (
            <p style={{ margin: '12px 0 0', textAlign: 'center', fontSize: 11, color: p.textMuted }}>
              Arraste para reordenar os links
            </p>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: '14px 24px',
          borderTop: `1px solid ${p.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 10, flexShrink: 0,
        }}>
          <button
            onClick={handleCheckLinks}
            disabled={checking || links.length === 0}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 8,
              border: `1px solid ${p.border}`,
              background: 'transparent',
              color: p.textMuted,
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
              opacity: (checking || links.length === 0) ? 0.5 : 1,
            }}
          >
            <IconRefresh size={14} color={p.textMuted} />
            {checking ? 'Verificando...' : 'Verificar links'}
          </button>

          <button
            onClick={openNew}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8,
              border: 'none',
              background: p.violet, color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <IconPlus size={14} color="#fff" />
            Novo link
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          padding: '10px 20px', borderRadius: 10,
          background: toast.type === 'success' ? p.successBg : p.dangerBg,
          border: `1px solid ${toast.type === 'success' ? p.success : p.danger}`,
          color: toast.type === 'success' ? p.success : p.danger,
          fontSize: 13, fontWeight: 600,
          zIndex: 10000,
          whiteSpace: 'nowrap',
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );

  return createPortal(content, document.body);
}
