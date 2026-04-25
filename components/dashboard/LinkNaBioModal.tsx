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

interface ContactData {
  whatsapp_number: string;
  instagram_username: string;
  website: string;
  facebook: string;
  email_contato: string;
  telefone_fixo: string;
  tiktok: string;
  twitter: string;
  linkedin: string;
  youtube_channel_url: string;
}

interface GbpContactData {
  phone: string | null;
  website: string | null;
  whatsapp: string | null;
  instagram: string | null;
  facebook: string | null;
  youtube: string | null;
  tiktok: string | null;
  twitter: string | null;
  linkedin: string | null;
}

interface LinkNaBioModalProps {
  companyId: string;
  slug: string;
  onClose: () => void;
}

// ── Paletas inline ────────────────────────────────────────────

const DARK = {
  bg: '#0f172a', surface: '#1e293b', surfaceHover: '#273548',
  border: 'rgba(255,255,255,0.08)', borderFocus: '#3b82f6',
  text: '#f1f5f9', textMuted: 'rgba(255,255,255,0.45)',
  input: 'rgba(255,255,255,0.05)', inputBorder: 'rgba(255,255,255,0.12)',
  danger: '#f87171', dangerBg: 'rgba(239,68,68,0.12)',
  success: '#34d399', successBg: 'rgba(52,211,153,0.12)',
  accent: '#60a5fa', accentBg: 'rgba(59,130,246,0.15)',
  overlay: 'rgba(0,0,0,0.75)',
  warn: '#fbbf24', warnBg: 'rgba(251,191,36,0.1)',
};

const LIGHT = {
  bg: '#ffffff', surface: '#f8fafc', surfaceHover: '#f1f5f9',
  border: '#e2e8f0', borderFocus: '#3b82f6',
  text: '#0f172a', textMuted: '#64748b',
  input: '#ffffff', inputBorder: '#cbd5e1',
  danger: '#dc2626', dangerBg: '#fef2f2',
  success: '#059669', successBg: '#f0fdf4',
  accent: '#2563eb', accentBg: '#eff6ff',
  overlay: 'rgba(0,0,0,0.5)',
  warn: '#d97706', warnBg: '#fffbeb',
};

// ── Campos de contato mapeados ────────────────────────────────

const CONTACT_FIELDS: {
  key: keyof ContactData;
  label: string;
  placeholder: string;
  prefix?: string;
  gbpKey?: keyof GbpContactData;
}[] = [
  { key: 'whatsapp_number',    label: 'WhatsApp',    placeholder: '5511999999999',          prefix: 'wa.me/',         gbpKey: 'whatsapp' },
  { key: 'instagram_username', label: 'Instagram',   placeholder: 'nome_usuario',           prefix: 'instagram.com/', gbpKey: 'instagram' },
  { key: 'facebook',           label: 'Facebook',    placeholder: 'https://facebook.com/...', gbpKey: 'facebook' },
  { key: 'website',            label: 'Site',        placeholder: 'https://seusite.com.br',   gbpKey: 'website' },
  { key: 'email_contato',      label: 'E-mail',      placeholder: 'contato@empresa.com.br', prefix: 'mailto:' },
  { key: 'telefone_fixo',      label: 'Telefone',    placeholder: '11 3333-4444',           prefix: 'tel:',           gbpKey: 'phone' },
  { key: 'tiktok',             label: 'TikTok',      placeholder: 'nome_usuario',           prefix: 'tiktok.com/@',   gbpKey: 'tiktok' },
  { key: 'twitter',            label: 'X / Twitter', placeholder: 'nome_usuario',           prefix: 'twitter.com/',   gbpKey: 'twitter' },
  { key: 'linkedin',           label: 'LinkedIn',    placeholder: 'https://linkedin.com/...', gbpKey: 'linkedin' },
  { key: 'youtube_channel_url',label: 'YouTube',     placeholder: 'https://youtube.com/@...', gbpKey: 'youtube' },
];

// Apenas os campos que têm mapeamento GBP
const GBP_SYNCABLE_FIELDS = CONTACT_FIELDS.filter(f => f.gbpKey);

// ── Ícones SVG inline ─────────────────────────────────────────

const Ico = {
  Link: ({ s = 16, c = 'currentColor' }) => (
    <svg width={s} height={s} fill="none" stroke={c} strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  ),
  Phone: ({ s = 16, c = 'currentColor' }) => (
    <svg width={s} height={s} fill="none" stroke={c} strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  ),
  Trash: ({ s = 16, c = 'currentColor' }) => (
    <svg width={s} height={s} fill="none" stroke={c} strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  Edit: ({ s = 16, c = 'currentColor' }) => (
    <svg width={s} height={s} fill="none" stroke={c} strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  Check: ({ s = 16, c = 'currentColor' }) => (
    <svg width={s} height={s} fill="none" stroke={c} strokeWidth={2.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
  X: ({ s = 16, c = 'currentColor' }) => (
    <svg width={s} height={s} fill="none" stroke={c} strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Grip: ({ c = 'currentColor' }) => (
    <svg width={16} height={16} fill={c} viewBox="0 0 24 24">
      <circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/>
      <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
      <circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/>
    </svg>
  ),
  Refresh: ({ s = 16, c = 'currentColor' }) => (
    <svg width={s} height={s} fill="none" stroke={c} strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  External: ({ s = 14, c = 'currentColor' }) => (
    <svg width={s} height={s} fill="none" stroke={c} strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  ),
  Plus: ({ s = 16, c = 'currentColor' }) => (
    <svg width={s} height={s} fill="none" stroke={c} strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  ),
  Save: ({ s = 16, c = 'currentColor' }) => (
    <svg width={s} height={s} fill="none" stroke={c} strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
    </svg>
  ),
};

// ── Google Logo SVG ───────────────────────────────────────────

function GoogleLogo({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

// ── Input helper ──────────────────────────────────────────────

function Field({ label, value, onChange, placeholder, prefix, p, highlight }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; prefix?: string; p: typeof DARK; highlight?: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: highlight ? p.warn : p.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </label>
      <div style={{ display: 'flex', alignItems: 'center', borderRadius: 8, border: `1px solid ${highlight ? p.warn + '60' : p.inputBorder}`, background: p.input, overflow: 'hidden' }}>
        {prefix && (
          <span style={{ padding: '0 8px', fontSize: 11, color: p.textMuted, whiteSpace: 'nowrap', borderRight: `1px solid ${p.inputBorder}`, height: '100%', display: 'flex', alignItems: 'center' }}>
            {prefix}
          </span>
        )}
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            flex: 1, padding: '9px 12px',
            background: 'transparent', border: 'none', outline: 'none',
            color: p.text, fontSize: 13,
          }}
        />
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────

export default function LinkNaBioModal({ companyId, slug, onClose }: LinkNaBioModalProps) {
  const supabase = createClient();
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [tab, setTab] = useState<'links' | 'contato'>('links');

  useEffect(() => {
    const html = document.documentElement;
    setIsDark(html.classList.contains('dark') || html.getAttribute('data-theme') === 'dark');
    setMounted(true);
  }, []);

  const p = isDark ? DARK : LIGHT;

  // ── Toast ─────────────────────────────────────────────────
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ────────────────────────────────────────────────────────
  // ABA LINKS
  // ────────────────────────────────────────────────────────

  const [links, setLinks] = useState<CompanyLink[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitulo, setFormTitulo] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formError, setFormError] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const loadLinks = useCallback(async () => {
    setLoadingLinks(true);
    const { data, error } = await supabase
      .from('company_links').select('*')
      .eq('company_id', companyId).order('display_order', { ascending: true });
    if (!error && data) setLinks(data);
    setLoadingLinks(false);
  }, [companyId]);

  useEffect(() => { loadLinks(); }, [loadLinks]);

  const normalizeUrl = (url: string) => {
    const t = url.trim();
    if (!t) return '';
    if (t.startsWith('http') || t.startsWith('mailto:') || t.startsWith('tel:') || t.startsWith('wa.me')) return t;
    return `https://${t}`;
  };

  const openEdit = (link: CompanyLink) => {
    setEditingId(link.id); setFormTitulo(link.titulo); setFormUrl(link.url);
    setFormError(''); setShowForm(true);
  };
  const openNew = () => {
    setEditingId(null); setFormTitulo(''); setFormUrl('');
    setFormError(''); setShowForm(true);
  };
  const closeForm = () => {
    setShowForm(false); setEditingId(null); setFormTitulo(''); setFormUrl(''); setFormError('');
  };

  const handleSave = async () => {
    if (!formTitulo.trim()) { setFormError('Título obrigatório.'); return; }
    if (!formUrl.trim()) { setFormError('URL obrigatória.'); return; }
    setSaving(true); setFormError('');
    const url = normalizeUrl(formUrl);
    if (editingId) {
      const { error } = await supabase.from('company_links')
        .update({ titulo: formTitulo.trim(), url, updated_at: new Date().toISOString() }).eq('id', editingId);
      if (error) { setFormError('Erro ao salvar.'); setSaving(false); return; }
      showToast('Link atualizado!');
    } else {
      const maxOrder = links.length > 0 ? Math.max(...links.map(l => l.display_order)) + 1 : 0;
      const { error } = await supabase.from('company_links').insert({
        company_id: companyId, titulo: formTitulo.trim(), url, display_order: maxOrder, is_active: true,
      });
      if (error) { setFormError('Erro ao criar link.'); setSaving(false); return; }
      showToast('Link criado!');
    }
    setSaving(false); closeForm(); await loadLinks();
  };

  const handleToggleActive = async (link: CompanyLink) => {
    await supabase.from('company_links').update({ is_active: !link.is_active }).eq('id', link.id);
    setLinks(prev => prev.map(l => l.id === link.id ? { ...l, is_active: !l.is_active } : l));
  };

  const handleDelete = async (id: string) => {
    await supabase.from('company_links').delete().eq('id', id);
    setLinks(prev => prev.filter(l => l.id !== id));
    showToast('Link removido.');
  };

  const handleDragStart = (i: number) => setDragIndex(i);
  const handleDragOver = (e: React.DragEvent, i: number) => { e.preventDefault(); setDragOver(i); };
  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === targetIndex) { setDragIndex(null); setDragOver(null); return; }
    const reordered = [...links];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    const updated = reordered.map((l, i) => ({ ...l, display_order: i }));
    setLinks(updated); setDragIndex(null); setDragOver(null);
    for (const l of updated) await supabase.from('company_links').update({ display_order: l.display_order }).eq('id', l.id);
    showToast('Ordem salva!');
  };

  const handleCheckLinks = async () => {
    setChecking(true);
    try {
      const res = await fetch('/api/check-links', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      });
      const result = await res.json();
      if (res.ok) { showToast(`Verificação: ${result.ok} ok, ${result.broken} com problema.`); await loadLinks(); }
      else showToast('Erro na verificação.', 'error');
    } catch { showToast('Erro na verificação.', 'error'); }
    setChecking(false);
  };

  // ── Bio ───────────────────────────────────────────────────
  const [bio, setBio] = useState('');
  const [loadingBio, setLoadingBio] = useState(true);
  const [savingBio, setSavingBio] = useState(false);
  const [bioDirty, setBioDirty] = useState(false);

  const loadBio = useCallback(async () => {
    setLoadingBio(true);
    const { data } = await supabase.from('companies')
      .select('brand_description').eq('id', companyId).single();
    setBio(data?.brand_description ?? '');
    setLoadingBio(false);
  }, [companyId]);

  useEffect(() => { loadBio(); }, [loadBio]);

  const handleSaveBio = async () => {
    setSavingBio(true);
    const { error } = await supabase.from('companies')
      .update({ brand_description: bio || null, updated_at: new Date().toISOString() })
      .eq('id', companyId);
    setSavingBio(false);
    if (error) showToast('Erro ao salvar.', 'error');
    else { showToast('Descrição salva!'); setBioDirty(false); }
  };

  // ────────────────────────────────────────────────────────
  // ABA CONTATO
  // ────────────────────────────────────────────────────────

  const emptyContact: ContactData = {
    whatsapp_number: '', instagram_username: '', website: '', facebook: '',
    email_contato: '', telefone_fixo: '', tiktok: '', twitter: '', linkedin: '', youtube_channel_url: '',
  };

  const [contact, setContact] = useState<ContactData>(emptyContact);
  const [loadingContact, setLoadingContact] = useState(true);
  const [savingContact, setSavingContact] = useState(false);
  const [contactDirty, setContactDirty] = useState(false);

  const loadContact = useCallback(async () => {
    setLoadingContact(true);
    const { data } = await supabase.from('companies')
      .select('whatsapp_number,instagram_username,website,facebook,email_contato,telefone_fixo,tiktok,twitter,linkedin,youtube_channel_url')
      .eq('id', companyId).single();
    if (data) {
      setContact({
        whatsapp_number:     data.whatsapp_number     ?? '',
        instagram_username:  data.instagram_username  ?? '',
        website:             data.website             ?? '',
        facebook:            data.facebook            ?? '',
        email_contato:       data.email_contato       ?? '',
        telefone_fixo:       data.telefone_fixo       ?? '',
        tiktok:              data.tiktok              ?? '',
        twitter:             data.twitter             ?? '',
        linkedin:            data.linkedin            ?? '',
        youtube_channel_url: data.youtube_channel_url ?? '',
      });
    }
    setLoadingContact(false);
  }, [companyId]);

  useEffect(() => { loadContact(); }, [loadContact]);

  const updateField = (key: keyof ContactData, value: string) => {
    setContact(prev => ({ ...prev, [key]: value }));
    setContactDirty(true);
  };

  const handleSaveContact = async () => {
    setSavingContact(true);
    const { error } = await supabase.from('companies').update({
      whatsapp_number:     contact.whatsapp_number     || null,
      instagram_username:  contact.instagram_username  || null,
      website:             contact.website             || null,
      facebook:            contact.facebook            || null,
      email_contato:       contact.email_contato       || null,
      telefone_fixo:       contact.telefone_fixo       || null,
      tiktok:              contact.tiktok              || null,
      twitter:             contact.twitter             || null,
      linkedin:            contact.linkedin            || null,
      youtube_channel_url: contact.youtube_channel_url || null,
      updated_at: new Date().toISOString(),
    }).eq('id', companyId);
    setSavingContact(false);
    if (error) showToast('Erro ao salvar contatos.', 'error');
    else { showToast('Contatos salvos!'); setContactDirty(false); }
  };

  // ────────────────────────────────────────────────────────
  // GBP SYNC
  // ────────────────────────────────────────────────────────

  const [showGbpSync, setShowGbpSync]   = useState(false);
  const [gbpLoading, setGbpLoading]     = useState(false);
  const [gbpData, setGbpData]           = useState<GbpContactData | null>(null);
  const [gbpSyncing, setGbpSyncing]     = useState(false);
  const [gbpToast, setGbpToast]         = useState('');
  const [gbpDirection, setGbpDirection] = useState<'google_to_minhai' | 'minhai_to_google' | null>(null);

  // Mapeamento minhAi → GBP
  function getMinhAiValue(gbpKey: keyof GbpContactData): string {
    const field = GBP_SYNCABLE_FIELDS.find(f => f.gbpKey === gbpKey);
    if (!field) return '';
    return contact[field.key] || '';
  }

  function getGbpValue(gbpKey: keyof GbpContactData): string {
    return gbpData?.[gbpKey] || '';
  }

  async function loadGbpData() {
    setGbpLoading(true);
    setGbpData(null);
    setGbpDirection(null);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/gbp-sync-info`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ company_id: companyId, action: 'read' }),
        }
      );
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      if (json.google) {
        setGbpData(json.google);
      } else {
        setGbpToast('Nenhuma localização do Google vinculada. Configure em Serviços Google → Meu Negócio.');
        setTimeout(() => setGbpToast(''), 5000);
        setShowGbpSync(false);
      }
    } catch (err: any) {
      setGbpToast(err.message || 'Erro ao conectar com o Google.');
      setTimeout(() => setGbpToast(''), 4000);
      setShowGbpSync(false);
    } finally {
      setGbpLoading(false);
    }
  }

  async function applyGbpSync() {
    if (!gbpDirection || !gbpData) return;
    setGbpSyncing(true);
    try {
      if (gbpDirection === 'google_to_minhai') {
        // Mapear GBP → minhAi
        const update: Partial<ContactData> = {};
        for (const field of GBP_SYNCABLE_FIELDS) {
          const gbpVal = getGbpValue(field.gbpKey!);
          if (gbpVal) update[field.key] = gbpVal;
        }
        if (Object.keys(update).length > 0) {
          await supabase.from('companies').update({
            ...update,
            updated_at: new Date().toISOString(),
          }).eq('id', companyId);
          setContact(prev => ({ ...prev, ...update }));
          setContactDirty(false);
        }
        setGbpToast('✓ Dados do Google aplicados no minhAi!');
      } else {
        // Mapear minhAi → GBP
        const data: Record<string, string> = {};
        for (const field of GBP_SYNCABLE_FIELDS) {
          const minhaiVal = getMinhAiValue(field.gbpKey!);
          if (minhaiVal) data[field.gbpKey!] = minhaiVal;
        }
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/gbp-sync-info`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ company_id: companyId, action: 'write', data }),
          }
        );
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        setGbpToast('✓ Dados do minhAi enviados para o Google!');
      }
      setTimeout(() => {
        setGbpToast('');
        setShowGbpSync(false);
      }, 2500);
    } catch (err: any) {
      setGbpToast('Erro: ' + (err.message || 'Tente novamente.'));
      setTimeout(() => setGbpToast(''), 4000);
    } finally {
      setGbpSyncing(false);
    }
  }

  // Campos com divergência
  const divergentFields = gbpData
    ? GBP_SYNCABLE_FIELDS.filter(f => {
        const minhai = getMinhAiValue(f.gbpKey!);
        const google = getGbpValue(f.gbpKey!);
        return minhai !== google && (minhai !== '' || google !== '');
      })
    : [];

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────

  if (!mounted) return null;

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '8px 0', border: 'none', cursor: 'pointer',
    fontSize: 13, fontWeight: active ? 700 : 500,
    background: 'transparent',
    color: active ? p.accent : p.textMuted,
    borderBottom: `2px solid ${active ? p.accent : 'transparent'}`,
    transition: 'all 0.15s',
  });

  const btnStyle: React.CSSProperties = {
    width: 32, height: 32, borderRadius: 8,
    border: `1px solid ${p.border}`,
    background: 'transparent',
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };

  const content = (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: p.overlay, backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: p.bg, borderRadius: 20, border: `1px solid ${p.border}`, width: '100%', maxWidth: 560, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: isDark ? '0 25px 60px rgba(0,0,0,0.6)' : '0 25px 60px rgba(0,0,0,0.15)' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 0', borderBottom: `1px solid ${p.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: p.accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Ico.Link s={18} c={p.accent} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: p.text }}>Link na Bio</h2>
                <p style={{ margin: 0, fontSize: 12, color: p.textMuted }}>Gerencie links e contatos da página pública</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <a href={`/link/${slug}`} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: `1px solid ${p.border}`, background: 'transparent', color: p.textMuted, textDecoration: 'none', fontSize: 12, fontWeight: 500 }}>
                <Ico.External s={12} c={p.textMuted} /> Ver página
              </a>
              <button onClick={onClose} style={{ ...btnStyle }}>
                <Ico.X s={16} c={p.textMuted} />
              </button>
            </div>
          </div>

          {/* Abas + botão Google */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <button style={tabStyle(tab === 'links')} onClick={() => setTab('links')}>
              Bio / Links
            </button>
            <button style={tabStyle(tab === 'contato')} onClick={() => setTab('contato')}>
              Contato
            </button>

            {/* Botão Sincronizar Google — só na aba Contato */}
            {tab === 'contato' && (
              <button
                onClick={() => { setShowGbpSync(true); loadGbpData(); }}
                style={{
                  marginLeft: 'auto', marginRight: 2, marginBottom: 4,
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 10px',
                  border: `1px solid ${p.border}`,
                  borderRadius: 8, background: p.surface,
                  cursor: 'pointer', fontSize: 11, fontWeight: 600,
                  color: p.textMuted, flexShrink: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                <GoogleLogo size={13} />
                Sincronizar
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>

          {/* ── ABA LINKS ── */}
          {tab === 'links' && (
            <>
              {showForm && (
                <div style={{ background: p.surface, border: `1px solid ${p.borderFocus}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
                  <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: p.accent }}>
                    {editingId ? 'Editar link' : 'Novo link'}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <Field label="Título" value={formTitulo} onChange={setFormTitulo} placeholder="Ex: Nosso Site" p={p} />
                    <Field label="URL" value={formUrl} onChange={setFormUrl} placeholder="https://seusite.com.br" p={p} />
                    {formError && <p style={{ margin: 0, fontSize: 12, color: p.danger }}>{formError}</p>}
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button onClick={closeForm} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${p.border}`, background: 'transparent', color: p.textMuted, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                        Cancelar
                      </button>
                      <button onClick={handleSave} disabled={saving} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: p.accent, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                        {saving ? 'Salvando...' : editingId ? 'Atualizar' : 'Adicionar'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {!showForm && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: p.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                    Bio / Descrição da empresa
                  </label>
                  {loadingBio ? (
                    <div style={{ height: 80, borderRadius: 10, background: p.surface, border: `1px solid ${p.border}` }} />
                  ) : (
                    <>
                      <textarea
                        value={bio}
                        onChange={e => { setBio(e.target.value); setBioDirty(true); }}
                        placeholder="Escreva uma breve descrição da sua empresa..."
                        rows={3} maxLength={300}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${bioDirty ? p.borderFocus : p.inputBorder}`, background: p.input, color: p.text, fontSize: 13, lineHeight: 1.5, resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', transition: 'border-color 0.15s' }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                        <span style={{ fontSize: 11, color: p.textMuted }}>{bio.length}/300 caracteres</span>
                        {bioDirty && (
                          <button onClick={handleSaveBio} disabled={savingBio}
                            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, border: 'none', background: p.accent, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: savingBio ? 0.7 : 1 }}>
                            <Ico.Save s={12} c="#fff" />
                            {savingBio ? 'Salvando...' : 'Salvar bio'}
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {loadingLinks ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: p.textMuted, fontSize: 14 }}>Carregando...</div>
              ) : links.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 24px', background: p.surface, borderRadius: 14, border: `1px dashed ${p.border}` }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🔗</div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: p.text }}>Nenhum link ainda</p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: p.textMuted }}>Adicione links para exibir na página pública</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {links.map((link, index) => (
                    <div key={link.id} draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={e => handleDragOver(e, index)}
                      onDrop={e => handleDrop(e, index)}
                      onDragEnd={() => { setDragIndex(null); setDragOver(null); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, border: `1px solid ${dragOver === index ? p.borderFocus : (link.is_broken ? p.danger + '40' : p.border)}`, background: dragOver === index ? p.surfaceHover : p.surface, opacity: dragIndex === index ? 0.5 : 1, transition: 'all 0.15s', cursor: 'grab' }}
                    >
                      <div style={{ color: p.textMuted, flexShrink: 0 }}><Ico.Grip c={p.textMuted} /></div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: link.is_active ? p.text : p.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{link.titulo}</span>
                          {link.is_broken && <span style={{ fontSize: 10, fontWeight: 700, background: p.dangerBg, color: p.danger, padding: '2px 6px', borderRadius: 5, flexShrink: 0 }}>🔴 Quebrado</span>}
                          {!link.is_active && <span style={{ fontSize: 10, fontWeight: 600, background: p.input, color: p.textMuted, padding: '2px 6px', borderRadius: 5, flexShrink: 0 }}>Inativo</span>}
                        </div>
                        <p style={{ margin: '2px 0 0', fontSize: 11, color: p.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>{link.url}</p>
                        {link.last_checked_at && (
                          <p style={{ margin: '2px 0 0', fontSize: 10, color: p.textMuted }}>
                            Verificado: {new Date(link.last_checked_at).toLocaleDateString('pt-BR')}
                            {link.last_status ? ` · HTTP ${link.last_status}` : ''}
                          </p>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        <button onClick={() => handleToggleActive(link)} title={link.is_active ? 'Desativar' : 'Ativar'}
                          style={{ ...btnStyle, background: link.is_active ? p.successBg : p.input, color: link.is_active ? p.success : p.textMuted }}>
                          <Ico.Check s={14} c={link.is_active ? p.success : p.textMuted} />
                        </button>
                        <button onClick={() => openEdit(link)} title="Editar" style={{ ...btnStyle }}>
                          <Ico.Edit s={14} c={p.textMuted} />
                        </button>
                        <button onClick={() => handleDelete(link.id)} title="Remover" style={{ ...btnStyle, color: p.danger }}>
                          <Ico.Trash s={14} c={p.danger} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {links.length > 1 && (
                    <p style={{ margin: '4px 0 0', textAlign: 'center', fontSize: 11, color: p.textMuted }}>Arraste para reordenar</p>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── ABA CONTATO ── */}
          {tab === 'contato' && (
            <>
              {loadingContact ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: p.textMuted, fontSize: 14 }}>Carregando...</div>
              ) : (
                <>
                  <p style={{ margin: '0 0 14px', fontSize: 12, color: p.textMuted, lineHeight: 1.5 }}>
                    Esses dados aparecem automaticamente na página pública como botões de contato.
                    Campos vazios ficam ocultos na página.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {CONTACT_FIELDS.map(f => (
                      <Field
                        key={f.key}
                        label={f.label}
                        value={contact[f.key]}
                        onChange={v => updateField(f.key, v)}
                        placeholder={f.placeholder}
                        prefix={f.prefix}
                        p={p}
                      />
                    ))}
                  </div>
                  {contactDirty && (
                    <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: p.accentBg, border: `1px solid ${p.borderFocus}20`, fontSize: 12, color: p.accent }}>
                      Você tem alterações não salvas. Clique em "Salvar contatos" abaixo.
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: `1px solid ${p.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexShrink: 0 }}>
          {tab === 'links' ? (
            <>
              <button onClick={handleCheckLinks} disabled={checking || links.length === 0}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: `1px solid ${p.border}`, background: 'transparent', color: p.textMuted, fontSize: 13, fontWeight: 500, cursor: 'pointer', opacity: (checking || links.length === 0) ? 0.5 : 1 }}>
                <Ico.Refresh s={14} c={p.textMuted} />
                {checking ? 'Verificando...' : 'Verificar links'}
              </button>
              <button onClick={openNew}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: p.accent, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                <Ico.Plus s={14} c="#fff" /> Novo link
              </button>
            </>
          ) : (
            <>
              <p style={{ margin: 0, fontSize: 12, color: p.textMuted }}>
                Sincroniza com todas as funções que usam esses dados.
              </p>
              <button onClick={handleSaveContact} disabled={savingContact || !contactDirty}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: p.accent, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: (savingContact || !contactDirty) ? 0.5 : 1 }}>
                <Ico.Save s={14} c="#fff" />
                {savingContact ? 'Salvando...' : 'Salvar contatos'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Toast principal */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', padding: '10px 20px', borderRadius: 10, background: toast.type === 'success' ? p.successBg : p.dangerBg, border: `1px solid ${toast.type === 'success' ? p.success : p.danger}`, color: toast.type === 'success' ? p.success : p.danger, fontSize: 13, fontWeight: 600, zIndex: 10000, whiteSpace: 'nowrap' }}>
          {toast.msg}
        </div>
      )}

      {/* ── Modal de Sync GBP ── */}
      {showGbpSync && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 10001, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setShowGbpSync(false)}
        >
          <div
            style={{ background: p.bg, borderRadius: 18, width: '100%', maxWidth: 520, maxHeight: '85vh', overflowY: 'auto', border: `1px solid ${p.border}`, boxShadow: '0 30px 70px rgba(0,0,0,0.4)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ padding: '18px 20px 14px', borderBottom: `1px solid ${p.border}`, display: 'flex', alignItems: 'center', gap: 10, position: 'sticky', top: 0, background: p.bg, zIndex: 1 }}>
              <GoogleLogo size={20} />
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: p.text }}>Sincronizar com Google Meu Negócio</p>
                <p style={{ margin: 0, fontSize: 11, color: p.textMuted }}>
                  {gbpData ? `${divergentFields.length} campo${divergentFields.length !== 1 ? 's' : ''} com diferenças` : 'Buscando dados...'}
                </p>
              </div>
              <button onClick={() => setShowGbpSync(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <Ico.X s={16} c={p.textMuted} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '16px 20px' }}>

              {/* Loading */}
              {gbpLoading && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '32px 0', color: p.textMuted, fontSize: 13 }}>
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    style={{ animation: 'gbp-spin 1s linear infinite' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Buscando dados do Google Meu Negócio...
                  <style>{`@keyframes gbp-spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              )}

              {!gbpLoading && gbpData && (
                <>
                  {/* Escolha de direção */}
                  <p style={{ margin: '0 0 12px', fontSize: 12, color: p.textMuted }}>
                    Escolha a direção da sincronização:
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                    {([
                      {
                        key: 'google_to_minhai' as const,
                        emoji: '🌐 → 📱',
                        title: 'Google → minhAi',
                        desc: 'Puxar dados do Google e aplicar aqui',
                      },
                      {
                        key: 'minhai_to_google' as const,
                        emoji: '📱 → 🌐',
                        title: 'minhAi → Google',
                        desc: 'Enviar dados daqui para o Google',
                      },
                    ]).map(opt => (
                      <button
                        key={opt.key}
                        onClick={() => setGbpDirection(gbpDirection === opt.key ? null : opt.key)}
                        style={{
                          padding: '12px 10px', borderRadius: 12,
                          border: `2px solid ${gbpDirection === opt.key ? p.accent : p.border}`,
                          background: gbpDirection === opt.key ? p.accentBg : p.surface,
                          cursor: 'pointer', textAlign: 'center',
                          transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ fontSize: 22, marginBottom: 4 }}>{opt.emoji}</div>
                        <p style={{ margin: '0 0 2px', fontSize: 12, fontWeight: 700, color: gbpDirection === opt.key ? p.accent : p.text }}>{opt.title}</p>
                        <p style={{ margin: 0, fontSize: 10, color: p.textMuted, lineHeight: 1.3 }}>{opt.desc}</p>
                      </button>
                    ))}
                  </div>

                  {/* Tabela comparativa */}
                  <div style={{ borderRadius: 12, border: `1px solid ${p.border}`, overflow: 'hidden', marginBottom: 16 }}>
                    {/* Cabeçalho */}
                    <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr', background: p.surface, padding: '8px 12px', borderBottom: `1px solid ${p.border}` }}>
                      <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: p.textMuted, textTransform: 'uppercase' }}>Campo</p>
                      <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase' }}>minhAi</p>
                      <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#34d399', textTransform: 'uppercase' }}>Google</p>
                    </div>

                    {GBP_SYNCABLE_FIELDS.map(field => {
                      const minhaiVal = getMinhAiValue(field.gbpKey!);
                      const googleVal = getGbpValue(field.gbpKey!);
                      const isDiff = minhaiVal !== googleVal && (minhaiVal !== '' || googleVal !== '');
                      const isEmpty = !minhaiVal && !googleVal;

                      if (isEmpty) return null;

                      return (
                        <div
                          key={field.key}
                          style={{
                            display: 'grid', gridTemplateColumns: '100px 1fr 1fr',
                            padding: '8px 12px',
                            borderBottom: `1px solid ${p.border}`,
                            background: isDiff ? p.warnBg : 'transparent',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            {isDiff && <span style={{ fontSize: 10 }}>⚡</span>}
                            <span style={{ fontSize: 11, color: isDiff ? p.warn : p.textMuted, fontWeight: isDiff ? 600 : 400 }}>{field.label}</span>
                          </div>
                          <p style={{ margin: 0, fontSize: 11, color: p.text, wordBreak: 'break-all', paddingRight: 8 }}>
                            {minhaiVal || <span style={{ color: p.textMuted, fontStyle: 'italic' }}>vazio</span>}
                          </p>
                          <p style={{ margin: 0, fontSize: 11, color: p.text, wordBreak: 'break-all' }}>
                            {googleVal || <span style={{ color: p.textMuted, fontStyle: 'italic' }}>vazio</span>}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {divergentFields.length === 0 && (
                    <div style={{ padding: '12px 16px', borderRadius: 10, background: p.successBg, border: `1px solid ${p.success}30`, marginBottom: 16 }}>
                      <p style={{ margin: 0, fontSize: 12, color: p.success, fontWeight: 600 }}>
                        ✓ Todos os campos estão iguais nos dois lados!
                      </p>
                    </div>
                  )}

                  {/* Botão aplicar */}
                  <button
                    onClick={applyGbpSync}
                    disabled={gbpSyncing || !gbpDirection}
                    style={{
                      width: '100%', padding: '12px 0', borderRadius: 10,
                      border: 'none', background: gbpDirection ? p.accent : p.surface,
                      color: gbpDirection ? '#fff' : p.textMuted,
                      fontSize: 13, fontWeight: 700, cursor: gbpDirection ? 'pointer' : 'not-allowed',
                      opacity: gbpSyncing ? 0.7 : 1, transition: 'all 0.15s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                  >
                    {gbpSyncing ? (
                      <>
                        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          style={{ animation: 'gbp-spin 1s linear infinite' }}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Sincronizando...
                      </>
                    ) : gbpDirection ? (
                      gbpDirection === 'google_to_minhai' ? '🌐 Aplicar dados do Google no minhAi' : '📱 Enviar dados do minhAi ao Google'
                    ) : (
                      'Selecione uma direção acima'
                    )}
                  </button>
                </>
              )}

              {/* Toast do modal GBP */}
              {gbpToast && (
                <div style={{
                  marginTop: 12, padding: '10px 14px', borderRadius: 10,
                  background: gbpToast.startsWith('✓') ? p.successBg : p.dangerBg,
                  border: `1px solid ${gbpToast.startsWith('✓') ? p.success : p.danger}30`,
                  color: gbpToast.startsWith('✓') ? p.success : p.danger,
                  fontSize: 12, fontWeight: 600, textAlign: 'center',
                }}>
                  {gbpToast}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(content, document.body);
}
