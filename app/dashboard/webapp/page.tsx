'use client';

// app/dashboard/webapp/page.tsx

import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';

interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  webapp_enabled: boolean;
  webapp_theme_color: string | null;
  webapp_domain: string | null;
  webapp_home: string | null;
  website: string | null;
  modo_vendas_enabled?: boolean;
  modo_fila_enabled?: boolean;
  modo_links_enabled?: boolean;
}

type Step = 1 | 2 | 3;
type Motivo = 'ineligible' | 'loading' | 'ok';

const ORANGE = '#f97316';
const GREEN  = '#10b981';

const WEBAPP_DOMAINS = [
  { value: 'minhai.com.br', label: 'minhai.com.br', desc: 'Versão Brasileira' },
  { value: 'minhaia.app',   label: 'minhaia.app',   desc: 'Minha IA - Mais Pessoal e para MEIs' },
  { value: 'nossaia.app',   label: 'nossaia.app',   desc: 'Nossa IA - Para Equipes e Empresas' },
  { value: 'suaia.app',     label: 'suaia.app',     desc: 'Sua IA - Foco Total no Cliente' },
];

const THEME_COLORS = [
  { label: 'Laranja',  value: '#f97316' },
  { label: 'Azul',     value: '#3b82f6' },
  { label: 'Verde',    value: '#10b981' },
  { label: 'Roxo',     value: '#8b5cf6' },
  { label: 'Rosa',     value: '#ec4899' },
  { label: 'Vermelho', value: '#ef4444' },
  { label: 'Amarelo',  value: '#eab308' },
  { label: 'Ciano',    value: '#06b6d4' },
];

const WEBAPP_HOME_OPTIONS = [
  { value: 'ia',     label: 'Assistente IA',        desc: 'Abre direto no assistente de voz (padrão)',},
  { value: 'vendas', label: 'Modo Vendas',           desc: 'Abre no catálogo de produtos',            },
  { value: 'fila',   label: 'Fila de Atendimento',   desc: 'Abre no painel de senhas',                },
  { value: 'links',  label: 'Página de Links',       desc: 'Abre na página de contatos e links',      },
  { value: 'site',   label: 'Meu Site',              desc: 'Redireciona para o site da empresa',      },
];

async function prepareLogoFor512(file: File): Promise<{ blob: Blob; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const SIZE = 512;
      const canvas = document.createElement('canvas');
      canvas.width = SIZE; canvas.height = SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas não disponível')); return; }
      ctx.clearRect(0, 0, SIZE, SIZE);
      const ratio = Math.min(SIZE / img.naturalWidth, SIZE / img.naturalHeight);
      const drawW = img.naturalWidth * ratio;
      const drawH = img.naturalHeight * ratio;
      ctx.drawImage(img, (SIZE - drawW) / 2, (SIZE - drawH) / 2, drawW, drawH);
      URL.revokeObjectURL(objectUrl);
      canvas.toBlob(blob => {
        if (!blob) { reject(new Error('Falha ao gerar PNG')); return; }
        resolve({ blob, previewUrl: URL.createObjectURL(blob) });
      }, 'image/png');
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Imagem inválida')); };
    img.src = objectUrl;
  });
}

// ── Componentes recebem cores como props ───────────────────────────────────────

interface ThemeColors {
  WHITE: string; MUTED: string; BORDER: string; MID: string;
}

function Dot({ active, done, tc }: { active: boolean; done: boolean; tc: ThemeColors }) {
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: done ? GREEN : active ? ORANGE : tc.BORDER,
      border: `2px solid ${done ? GREEN : active ? ORANGE : tc.MUTED}`,
      color: done || active ? '#fff' : tc.MUTED,
      fontWeight: 700, fontSize: 13,
      transition: 'all 0.3s', flexShrink: 0,
    }}>
      {done
        ? <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
        : <span>{active ? '●' : '○'}</span>
      }
    </div>
  );
}

function StepBar({ step, tc }: { step: Step; tc: ThemeColors }) {
  const steps = ['Visual', 'Domínio', 'Publicar'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 40 }}>
      {steps.map((label, i) => {
        const n = (i + 1) as Step;
        const done = step > n;
        const active = step === n;
        return (
          <div key={n} style={{ display: 'flex', alignItems: 'center', flex: i < 2 ? 1 : undefined }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <Dot active={active} done={done} tc={tc} />
              <span style={{ fontSize: 11, fontWeight: active ? 700 : 500, color: active ? ORANGE : done ? GREEN : tc.MUTED, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {label}
              </span>
            </div>
            {i < 2 && (
              <div style={{ flex: 1, height: 2, margin: '0 8px', marginBottom: 18, background: step > n ? GREEN : tc.BORDER, transition: 'background 0.3s' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────────────────

export default function WebAppPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // Todas as cores derivadas do tema
  const CARD   = isDark ? '#162032'                    : '#ffffff';
  const MID    = isDark ? '#1e293b'                    : '#e2e8f0';
  const BORDER = isDark ? 'rgba(255,255,255,0.07)'     : 'rgba(0,0,0,0.10)';
  const WHITE  = isDark ? '#f8fafc'                    : '#0f172a';
  const MUTED  = isDark ? 'rgba(248,250,252,0.50)'     : 'rgba(15,23,42,0.55)';
  const SUB    = isDark ? 'rgba(248,250,252,0.25)'     : 'rgba(15,23,42,0.35)';
  const INPUTBG= isDark ? 'rgba(255,255,255,0.04)'     : 'rgba(0,0,0,0.04)';
  const ROWBG  = isDark ? 'rgba(255,255,255,0.02)'     : 'rgba(0,0,0,0.02)';
  const PREVIEWBG = isDark ? 'rgba(255,255,255,0.04)'  : 'rgba(0,0,0,0.04)';
  const HTTPSGRAY = isDark ? 'rgba(255,255,255,0.30)'  : 'rgba(15,23,42,0.35)';

  const tc: ThemeColors = { WHITE, MUTED, BORDER, MID };

  const router = useRouter();
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [motivo, setMotivo]                 = useState<Motivo>('loading');
  const [companies, setCompanies]           = useState<Company[]>([]);
  const [selectedId, setSelectedId]         = useState<string>('');
  const [step, setStep]                     = useState<Step>(1);
  const [logoFile, setLogoFile]             = useState<File | null>(null);
  const [logoPreview, setLogoPreview]       = useState<string | null>(null);
  const [processingLogo, setProcessingLogo] = useState(false);
  const [themeColor, setThemeColor]         = useState('#f97316');
  const [webappDomain, setWebappDomain]     = useState('minhai.app');
  const [saving, setSaving]                 = useState(false);
  const [error, setError]                   = useState('');
  const [published, setPublished]           = useState(false);
  const [finalSlug, setFinalSlug]           = useState('');
  const [finalDomain, setFinalDomain]       = useState('minhai.app');
  const [webappHome, setWebappHome]         = useState('ia');

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: credits } = await supabase
        .from('user_credits')
        .select('has_active_plan, plan_expires_at, active_plan_id, active_plan_name')
        .eq('user_id', user.id)
        .single();

      const planOk =
        credits?.has_active_plan &&
        credits?.plan_expires_at &&
        new Date(credits.plan_expires_at) > new Date();

      if (!planOk) { setMotivo('ineligible'); return; }

      const isTrial = credits.active_plan_name === 'Trial' && !credits.active_plan_id;

      if (!isTrial) {
        if (!credits.active_plan_id) { setMotivo('ineligible'); return; }
        const { data: pkg } = await supabase
          .from('credits_packages')
          .select('has_consultoria')
          .eq('id', credits.active_plan_id)
          .single();
        if (!pkg?.has_consultoria) { setMotivo('ineligible'); return; }
      }

      const { data: comps } = await supabase
        .from('companies')
        .select('id, name, slug, logo_url, webapp_enabled, webapp_theme_color, webapp_domain, webapp_home, website, modo_vendas_enabled, modo_fila_enabled, modo_links_enabled')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name');

      if (!comps || comps.length === 0) { setMotivo('ineligible'); return; }

      setCompanies(comps);

      const ativo = comps.find(c => c.webapp_enabled);
      if (ativo) {
        setSelectedId(ativo.id);
        setThemeColor(ativo.webapp_theme_color || '#f97316');
        setWebappDomain(ativo.webapp_domain || 'minhai.app');
        setWebappHome(ativo.webapp_home || 'ia');
        if (ativo.logo_url) setLogoPreview(ativo.logo_url);
        setPublished(true);
        setFinalSlug(ativo.slug);
        setFinalDomain(ativo.webapp_domain || 'minhai.app');
      } else {
        setSelectedId(comps[0].id);
      }

      setMotivo('ok');
    }
    init();
  }, []);

  const selectedCompany   = companies.find(c => c.id === selectedId);
  const selectedDomainInfo = WEBAPP_DOMAINS.find(d => d.value === webappDomain) ?? WEBAPP_DOMAINS[0];

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Logo deve ter no máximo 5MB'); return; }
    setProcessingLogo(true); setError('');
    try {
      const { blob, previewUrl } = await prepareLogoFor512(file);
      setLogoFile(new File([blob], 'logo_512.png', { type: 'image/png' }));
      setLogoPreview(previewUrl);
    } catch (err: any) {
      setError(err.message || 'Erro ao processar imagem');
    } finally {
      setProcessingLogo(false);
    }
  }

  async function publish() {
    if (!selectedCompany) return;
    setSaving(true); setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      let logo_url = selectedCompany.logo_url;

      if (logoFile) {
        const path = `logos/${selectedCompany.id}/logo.png`;
        const { error: upErr } = await supabase.storage
          .from('company-assets')
          .upload(path, logoFile, { upsert: true, contentType: 'image/png', cacheControl: '3600' });
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage.from('company-assets').getPublicUrl(path);
        logo_url = publicUrl;
      }

      const others = companies.filter(c => c.id !== selectedId && c.webapp_enabled);
      if (others.length > 0) {
        await supabase.from('companies').update({ webapp_enabled: false }).in('id', others.map(c => c.id));
      }

      const { error: updErr } = await supabase
        .from('companies')
        .update({
          webapp_enabled: true,
          webapp_theme_color: themeColor,
          webapp_domain: webappDomain,
          webapp_home: webappHome,
          webapp_configured_at: new Date().toISOString(),
          ...(logo_url ? { webapp_logo_url: logo_url } : {}),
        })
        .eq('id', selectedId);
      if (updErr) throw updErr;

      setFinalSlug(selectedCompany.slug);
      setFinalDomain(webappDomain);
      setPublished(true);
      setStep(3);
    } catch (e: any) {
      setError(e.message || 'Erro ao publicar');
    } finally {
      setSaving(false);
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (motivo === 'loading') {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, border: `3px solid ${BORDER}`, borderTopColor: ORANGE, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Inelegível ─────────────────────────────────────────────────────────────
  if (motivo === 'ineligible') {
    return (
      <div style={{ maxWidth: 480, margin: '60px auto', padding: '0 16px' }}>
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: '48px 40px', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(249,115,22,0.1)', border: `2px solid rgba(249,115,22,0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <svg width="28" height="28" fill="none" stroke={ORANGE} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <h2 style={{ color: WHITE, fontWeight: 700, fontSize: 22, marginBottom: 12 }}>Recurso Exclusivo</h2>
          <p style={{ color: MUTED, fontSize: 15, lineHeight: 1.6, marginBottom: 32 }}>
            O WebApp com subdomínio próprio está disponível apenas no plano <strong style={{ color: WHITE }}>Consulting</strong>.
          </p>
          <a href="/dashboard/credits" style={{ display: 'inline-block', padding: '12px 28px', background: `linear-gradient(135deg, ${ORANGE}, #ea580c)`, color: '#fff', borderRadius: 12, fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>
            Ver Planos
          </a>
        </div>
      </div>
    );
  }

  // ── Sucesso ────────────────────────────────────────────────────────────────
  if (published && step === 3) {
    return (
      <div style={{ maxWidth: 560, margin: '40px auto', padding: '0 16px' }}>
        <div style={{ background: CARD, border: `1px solid rgba(16,185,129,0.2)`, borderRadius: 20, padding: '48px 40px', textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', border: `2px solid rgba(16,185,129,0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', animation: 'pulse 2s ease-in-out infinite' }}>
            <svg width="32" height="32" fill="none" stroke={GREEN} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 style={{ color: WHITE, fontWeight: 800, fontSize: 26, marginBottom: 8 }}>Seu WebApp está no ar!</h2>
          <p style={{ color: MUTED, fontSize: 15, marginBottom: 32 }}>Compartilhe o link abaixo com seus clientes</p>

          <div style={{ background: 'rgba(16,185,129,0.08)', border: `1px solid rgba(16,185,129,0.2)`, borderRadius: 14, padding: '16px 20px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <span style={{ color: GREEN, fontWeight: 700, fontSize: 17, letterSpacing: '-0.02em' }}>
              {finalSlug}.{finalDomain}
            </span>
            <button
              onClick={() => navigator.clipboard.writeText(`https://${finalSlug}.${finalDomain}`)}
              style={{ background: 'rgba(16,185,129,0.15)', border: `1px solid rgba(16,185,129,0.3)`, borderRadius: 8, padding: '6px 14px', color: GREEN, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              Copiar
            </button>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href={`https://${finalSlug}.${finalDomain}`} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', background: `linear-gradient(135deg, ${GREEN}, #059669)`, color: '#fff', borderRadius: 12, fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              Abrir WebApp
            </a>
            <button onClick={() => { setPublished(false); setStep(1); }}
              style={{ padding: '12px 24px', background: INPUTBG, border: `1px solid ${BORDER}`, borderRadius: 12, color: MUTED, fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>
              Editar configurações
            </button>
          </div>
        </div>
        <style>{`
          @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,0.3)} 50%{box-shadow:0 0 0 12px rgba(16,185,129,0)} }
        `}</style>
      </div>
    );
  }

  // ── Wizard ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 16px 60px' }}>
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(249,115,22,0.1)', border: `1px solid rgba(249,115,22,0.2)`, borderRadius: 100, padding: '4px 14px', marginBottom: 16 }}>
          <svg width="12" height="12" fill={ORANGE} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /></svg>
          <span style={{ color: ORANGE, fontWeight: 600, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Plano Consulting</span>
        </div>
        <h1 style={{ color: WHITE, fontWeight: 800, fontSize: 28, marginBottom: 6, letterSpacing: '-0.02em' }}>Configure seu WebApp</h1>
        <p style={{ color: MUTED, fontSize: 15 }}>Seu assistente IA com endereço e visual próprios</p>
      </div>

      <StepBar step={step} tc={tc} />

      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, overflow: 'hidden' }}>

        {/* ── PASSO 1: Visual ───────────────────────────────────────────────── */}
        {step === 1 && (
          <div style={{ padding: '36px 36px 32px' }}>
            <h2 style={{ color: WHITE, fontWeight: 700, fontSize: 20, marginBottom: 6 }}>Identidade visual</h2>
            <p style={{ color: MUTED, fontSize: 14, marginBottom: 28 }}>Adicione o logo e a cor principal do seu negócio</p>

            {companies.length > 1 && (
              <div style={{ marginBottom: 28 }}>
                <label style={{ display: 'block', color: MUTED, fontSize: 13, fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Assistente</label>
                <select value={selectedId}
                  onChange={e => {
                    setSelectedId(e.target.value);
                    const c = companies.find(x => x.id === e.target.value);
                    if (c) {
                      setThemeColor(c.webapp_theme_color || '#f97316');
                      setWebappDomain(c.webapp_domain || 'minhai.app');
                      setWebappHome(c.webapp_home || 'ia');
                      setLogoPreview(c.logo_url || null);
                      setLogoFile(null);
                    }
                  }}
                  style={{ width: '100%', background: INPUTBG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 16px', color: WHITE, fontSize: 15, outline: 'none' }}>
                  {companies.map(c => <option key={c.id} value={c.id} style={{ background: MID }}>{c.name}</option>)}
                </select>
                <p style={{ color: 'rgba(249,115,22,0.8)', fontSize: 12, marginTop: 8 }}>Apenas 1 webapp por conta. Ativar aqui desativa o anterior.</p>
              </div>
            )}

            <label style={{ display: 'block', color: MUTED, fontSize: 13, fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Logo</label>
            <div
              onClick={() => !processingLogo && fileRef.current?.click()}
              style={{
                position: 'relative',
                border: `2px dashed ${logoPreview ? 'rgba(16,185,129,0.4)' : BORDER}`,
                borderRadius: 16, padding: '28px 20px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                cursor: processingLogo ? 'wait' : 'pointer',
                marginBottom: 28,
                background: logoPreview ? 'rgba(16,185,129,0.04)' : ROWBG,
                transition: 'all 0.2s',
              }}
            >
              {processingLogo && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, background: isDark ? 'rgba(15,23,42,0.82)' : 'rgba(255,255,255,0.82)', borderRadius: 14, zIndex: 2 }}>
                  <div style={{ width: 28, height: 28, border: `3px solid ${BORDER}`, borderTopColor: ORANGE, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  <span style={{ color: MUTED, fontSize: 12, fontWeight: 500 }}>Ajustando para 512×512…</span>
                </div>
              )}
              {logoPreview ? (
                <>
                  <div style={{ width: 80, height: 80, borderRadius: 16, background: INPUTBG, border: `2px solid rgba(16,185,129,0.4)`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    <img src={logoPreview} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  </div>
                  <span style={{ color: GREEN, fontSize: 13, fontWeight: 600 }}>Logo ajustado para 512×512 — clique para trocar</span>
                  <span style={{ color: MUTED, fontSize: 11 }}>PNG transparente · pronto para PWA/TWA</span>
                </>
              ) : (
                <>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: INPUTBG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="22" height="22" fill="none" stroke={MUTED} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                  <span style={{ color: MUTED, fontSize: 14 }}>Clique para fazer upload do logo</span>
                  <span style={{ color: SUB, fontSize: 12 }}>PNG, JPG, WebP ou SVG · Máx 5MB · será convertido para 512×512</span>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml" style={{ display: 'none' }} onChange={onFileChange} />

            <label style={{ display: 'block', color: MUTED, fontSize: 13, fontWeight: 600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cor principal</label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
              {THEME_COLORS.map(c => (
                <button key={c.value} title={c.label} onClick={() => setThemeColor(c.value)}
                  style={{ width: 36, height: 36, borderRadius: '50%', background: c.value, border: `3px solid ${themeColor === c.value ? WHITE : 'transparent'}`, boxShadow: themeColor === c.value ? `0 0 0 2px ${c.value}` : 'none', cursor: 'pointer', transition: 'all 0.2s', outline: 'none' }} />
              ))}
            </div>

            {error && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 12 }}>{error}</p>}
            <button
              onClick={() => setStep(2)}
              disabled={processingLogo}
              style={{ marginTop: 28, width: '100%', padding: '14px', background: processingLogo ? 'rgba(249,115,22,0.3)' : `linear-gradient(135deg, ${ORANGE}, #ea580c)`, border: 'none', borderRadius: 14, color: '#fff', fontWeight: 700, fontSize: 16, cursor: processingLogo ? 'not-allowed' : 'pointer' }}>
              Continuar →
            </button>
          </div>
        )}

        {/* ── PASSO 2: Domínio ──────────────────────────────────────────────── */}
        {step === 2 && selectedCompany && (
          <div style={{ padding: '36px 36px 32px' }}>
            <h2 style={{ color: WHITE, fontWeight: 700, fontSize: 20, marginBottom: 6 }}>Escolha seu domínio</h2>
            <p style={{ color: MUTED, fontSize: 14, marginBottom: 28 }}>Selecione como seus clientes vão encontrar e lembrar do seu assistente</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
              {WEBAPP_DOMAINS.map(domain => {
                const isSelected = webappDomain === domain.value;
                return (
                  <button
                    key={domain.value}
                    onClick={() => setWebappDomain(domain.value)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 18px',
                      background: isSelected ? 'rgba(249,115,22,0.08)' : ROWBG,
                      border: `2px solid ${isSelected ? ORANGE : BORDER}`,
                      borderRadius: 14, cursor: 'pointer', transition: 'all 0.2s',
                      textAlign: 'left', width: '100%',
                    }}
                  >
                    {/* Radio */}
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                      border: `2px solid ${isSelected ? ORANGE : MUTED}`,
                      background: isSelected ? ORANGE : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.2s',
                    }}>
                      {isSelected && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ color: isSelected ? WHITE : MUTED, fontWeight: 700, fontSize: 15, fontFamily: 'monospace' }}>
                          {selectedCompany.slug}.
                        </span>
                        <span style={{ color: isSelected ? ORANGE : MUTED, fontWeight: 800, fontSize: 16, fontFamily: 'monospace' }}>
                          {domain.label}
                        </span>
                      </div>
                      <p style={{ color: SUB, fontSize: 12, margin: '2px 0 0', fontWeight: 500 }}>
                        {domain.desc}
                      </p>
                    </div>

                    {domain.value === 'minhai.app' && (
                      <span style={{ background: 'rgba(249,115,22,0.15)', border: `1px solid rgba(249,115,22,0.3)`, color: ORANGE, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
                        Padrão
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* ── Página Inicial ── */}
            <label style={{ display: 'block', color: MUTED, fontSize: 13, fontWeight: 600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 28 }}>
              Página Inicial
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
              {WEBAPP_HOME_OPTIONS.map(opt => {
                const isSelected = webappHome === opt.value;
                // Desabilitar opções que dependem de modo ativado
                const disabled =
                  (opt.value === 'vendas' && !selectedCompany?.modo_vendas_enabled) ||
                  (opt.value === 'fila'   && !selectedCompany?.modo_fila_enabled) ||
                  (opt.value === 'links'  && !selectedCompany?.modo_links_enabled) ||
                  (opt.value === 'site'   && !selectedCompany?.website);
                return (
                  <button
                    key={opt.value}
                    onClick={() => !disabled && setWebappHome(opt.value)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '12px 16px',
                      background: isSelected ? 'rgba(249,115,22,0.08)' : ROWBG,
                      border: `2px solid ${isSelected ? ORANGE : BORDER}`,
                      borderRadius: 12, cursor: disabled ? 'not-allowed' : 'pointer',
                      textAlign: 'left', width: '100%',
                      opacity: disabled ? 0.4 : 1,
                    }}
                  >
                    <span style={{ fontSize: 20 }}>{opt.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: isSelected ? WHITE : MUTED, fontWeight: 600, fontSize: 14 }}>{opt.label}</div>
                      <div style={{ color: SUB, fontSize: 12, marginTop: 2 }}>
                        {disabled && opt.value !== 'site' ? 'Modo não ativado neste assistente' :
                         disabled && opt.value === 'site' ? 'Site não cadastrado nas configurações' :
                         opt.desc}
                      </div>
                    </div>
                    {isSelected && (
                      <svg width="16" height="16" fill="none" stroke={ORANGE} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Preview do endereço final */}
            <div style={{ background: ROWBG, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '16px 20px', marginBottom: 28 }}>
              <p style={{ color: MUTED, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Endereço final do seu WebApp:
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: PREVIEWBG, borderRadius: 10, padding: '12px 16px' }}>
                <span style={{ color: HTTPSGRAY, fontSize: 15, fontFamily: 'monospace' }}>https://</span>
                <span style={{ color: WHITE, fontWeight: 800, fontSize: 17, fontFamily: 'monospace' }}>{selectedCompany.slug}</span>
                <span style={{ color: HTTPSGRAY, fontSize: 15, fontFamily: 'monospace' }}>.</span>
                <span style={{ color: ORANGE, fontWeight: 800, fontSize: 17, fontFamily: 'monospace' }}>{webappDomain}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, padding: '14px', background: INPUTBG, border: `1px solid ${BORDER}`, borderRadius: 14, color: MUTED, fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>← Voltar</button>
              <button onClick={() => setStep(3)} style={{ flex: 2, padding: '14px', background: `linear-gradient(135deg, ${ORANGE}, #ea580c)`, border: 'none', borderRadius: 14, color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>Continuar →</button>
            </div>
          </div>
        )}

        {/* ── PASSO 3: Publicar ─────────────────────────────────────────────── */}
        {step === 3 && !published && selectedCompany && (
          <div style={{ padding: '36px 36px 32px' }}>
            <h2 style={{ color: WHITE, fontWeight: 700, fontSize: 20, marginBottom: 6 }}>Tudo pronto!</h2>
            <p style={{ color: MUTED, fontSize: 14, marginBottom: 28 }}>Revise e publique seu WebApp</p>

            <div style={{ background: ROWBG, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: 'hidden', marginBottom: 28 }}>
              {[
                {
                  label: 'Assistente',
                  value: selectedCompany.name,
                  icon: <svg width="16" height="16" fill="none" stroke={MUTED} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
                },
                {
                  label: 'Endereço',
                  value: `${selectedCompany.slug}.${webappDomain}`,
                  icon: <svg width="16" height="16" fill="none" stroke={MUTED} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>,
                },
                {
                  label: 'Logo',
                  value: logoFile ? 'Logo 512×512 (PNG)' : logoPreview ? 'Logo atual mantido' : 'Sem logo (padrão)',
                  icon: <svg width="16" height="16" fill="none" stroke={MUTED} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
                },
                {
                  label: 'Cor',
                  value: THEME_COLORS.find(c => c.value === themeColor)?.label || themeColor,
                  icon: <div style={{ width: 16, height: 16, borderRadius: '50%', background: themeColor }} />,
                },
                {
                  label: 'Domínio',
                  value: `${selectedDomainInfo.label} — ${selectedDomainInfo.desc}`,
                  icon: <svg width="16" height="16" fill="none" stroke={MUTED} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" /></svg>,
                },
        {
          label: 'Página Inicial',
          value: WEBAPP_HOME_OPTIONS.find(o => o.value === webappHome)?.label || 'Assistente IA',
          icon: <svg width="16" height="16" fill="none" stroke={MUTED} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
        },
              ].map((row, i, arr) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: i < arr.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                  <div style={{ flexShrink: 0 }}>{row.icon}</div>
                  <span style={{ color: MUTED, fontSize: 13, flex: 1 }}>{row.label}</span>
                  <span style={{ color: WHITE, fontSize: 14, fontWeight: 600, textAlign: 'right', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.value}</span>
                </div>
              ))}
            </div>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: `1px solid rgba(239,68,68,0.2)`, borderRadius: 10, padding: '12px 16px', color: '#ef4444', fontSize: 13, marginBottom: 16 }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setStep(2)} disabled={saving} style={{ flex: 1, padding: '14px', background: INPUTBG, border: `1px solid ${BORDER}`, borderRadius: 14, color: MUTED, fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>← Voltar</button>
              <button onClick={publish} disabled={saving}
                style={{ flex: 2, padding: '14px', background: saving ? 'rgba(16,185,129,0.3)' : `linear-gradient(135deg, ${GREEN}, #059669)`, border: 'none', borderRadius: 14, color: '#fff', fontWeight: 700, fontSize: 16, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {saving
                  ? <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Publicando...</>
                  : <><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Publicar WebApp</>
                }
              </button>
            </div>
          </div>
        )}

      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        select option { background: ${MID}; }
      `}</style>
    </div>
  );
}
