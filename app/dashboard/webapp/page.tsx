'use client';

// app/dashboard/webapp/page.tsx

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  webapp_enabled: boolean;
  webapp_theme_color: string | null;
}

type Step = 1 | 2 | 3;
type Motivo = 'ineligible' | 'loading' | 'ok';

// ─── Paleta ───────────────────────────────────────────────────────────────────
const DARK   = '#0f172a';
const MID    = '#1e293b';
const CARD   = '#162032';
const BORDER = 'rgba(255,255,255,0.07)';
const ORANGE = '#f97316';
const GREEN  = '#10b981';
const WHITE  = '#f8fafc';
const MUTED  = 'rgba(248,250,252,0.45)';

// Domínio dos WebApps
const WEBAPP_DOMAIN = 'minhai.com.br';

// ─── Cores disponíveis para tema ──────────────────────────────────────────────
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Dot({ active, done }: { active: boolean; done: boolean }) {
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: done ? GREEN : active ? ORANGE : 'rgba(255,255,255,0.07)',
      border: `2px solid ${done ? GREEN : active ? ORANGE : 'rgba(255,255,255,0.12)'}`,
      color: WHITE, fontWeight: 700, fontSize: 13,
      transition: 'all 0.3s',
      flexShrink: 0,
    }}>
      {done
        ? <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
        : <span>{active ? '●' : '○'}</span>
      }
    </div>
  );
}

function StepBar({ step }: { step: Step }) {
  const steps = ['Logo', 'Subdomínio', 'Publicar'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 40 }}>
      {steps.map((label, i) => {
        const n = (i + 1) as Step;
        const done = step > n;
        const active = step === n;
        return (
          <div key={n} style={{ display: 'flex', alignItems: 'center', flex: i < 2 ? 1 : undefined }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <Dot active={active} done={done} />
              <span style={{ fontSize: 11, fontWeight: active ? 700 : 500, color: active ? ORANGE : done ? GREEN : MUTED, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {label}
              </span>
            </div>
            {i < 2 && (
              <div style={{ flex: 1, height: 2, margin: '0 8px', marginBottom: 18, background: step > n ? GREEN : 'rgba(255,255,255,0.07)', transition: 'background 0.3s' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function WebAppPage() {
  const router = useRouter();
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [motivo, setMotivo]         = useState<Motivo>('loading');
  const [companies, setCompanies]   = useState<Company[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [step, setStep]             = useState<Step>(1);

  const [logoFile, setLogoFile]       = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [themeColor, setThemeColor]   = useState('#f97316');
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');
  const [published, setPublished]     = useState(false);
  const [finalSlug, setFinalSlug]     = useState('');

  // ── Verificação de elegibilidade ────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: credits } = await supabase
        .from('user_credits')
        .select('has_active_plan, plan_expires_at, active_plan_id')
        .eq('user_id', user.id)
        .single();

      const planOk =
        credits?.has_active_plan &&
        credits?.plan_expires_at &&
        new Date(credits.plan_expires_at) > new Date();

      if (!planOk) { setMotivo('ineligible'); return; }

      const { data: pkg } = await supabase
        .from('credits_packages')
        .select('has_consultoria')
        .eq('id', credits.active_plan_id)
        .single();

      if (!pkg?.has_consultoria) { setMotivo('ineligible'); return; }

      const { data: comps } = await supabase
        .from('companies')
        .select('id, name, slug, logo_url, webapp_enabled, webapp_theme_color')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name');

      if (!comps || comps.length === 0) { setMotivo('ineligible'); return; }

      setCompanies(comps);

      const ativo = comps.find(c => c.webapp_enabled);
      if (ativo) {
        setSelectedId(ativo.id);
        setThemeColor(ativo.webapp_theme_color || '#f97316');
        if (ativo.logo_url) setLogoPreview(ativo.logo_url);
        setPublished(true);
        setFinalSlug(ativo.slug);
      } else {
        setSelectedId(comps[0].id);
      }

      setMotivo('ok');
    }
    init();
  }, []);

  const selectedCompany = companies.find(c => c.id === selectedId);

  // ── Upload de logo ──────────────────────────────────────────────────────────
  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError('Logo deve ter no máximo 2MB'); return; }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setError('');
  }

  // ── Salvar e publicar ───────────────────────────────────────────────────────
  async function publish() {
    if (!selectedCompany) return;
    setSaving(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      let logo_url = selectedCompany.logo_url;

      if (logoFile) {
        const ext = logoFile.type === 'image/png' ? 'png'
          : logoFile.type === 'image/webp' ? 'webp'
          : logoFile.type === 'image/svg+xml' ? 'svg'
          : 'jpg';
        const path = `logos/${selectedCompany.id}/logo.${ext}`;

        const { error: upErr } = await supabase.storage
          .from('company-assets')
          .upload(path, logoFile, { upsert: true, contentType: logoFile.type, cacheControl: '3600' });

        if (upErr) throw upErr;

        const { data: { publicUrl } } = supabase.storage
          .from('company-assets')
          .getPublicUrl(path);

        logo_url = publicUrl;
      }

      // Desativar webapp de outras empresas deste usuário (1 por usuário)
      const others = companies.filter(c => c.id !== selectedId && c.webapp_enabled);
      if (others.length > 0) {
        await supabase
          .from('companies')
          .update({ webapp_enabled: false })
          .in('id', others.map(c => c.id));
      }

      // Ativar webapp na empresa selecionada
      const { error: updErr } = await supabase
        .from('companies')
        .update({
          webapp_enabled: true,
          webapp_theme_color: themeColor,
          webapp_configured_at: new Date().toISOString(),
          ...(logo_url ? { logo_url } : {}),
        })
        .eq('id', selectedId);

      if (updErr) throw updErr;

      setFinalSlug(selectedCompany.slug);
      setPublished(true);
      setStep(3);
    } catch (e: any) {
      setError(e.message || 'Erro ao publicar');
    } finally {
      setSaving(false);
    }
  }

  // ── Tela de loading ─────────────────────────────────────────────────────────
  if (motivo === 'loading') {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, border: `3px solid ${BORDER}`, borderTopColor: ORANGE, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Tela de inelegível ──────────────────────────────────────────────────────
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
          <a href="/dashboard/credits" style={{ display: 'inline-block', padding: '12px 28px', background: `linear-gradient(135deg, ${ORANGE}, #ea580c)`, color: WHITE, borderRadius: 12, fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>
            Ver Planos
          </a>
        </div>
      </div>
    );
  }

  // ── Tela de sucesso ─────────────────────────────────────────────────────────
  if (published && step === 3) {
    return (
      <div style={{ maxWidth: 560, margin: '40px auto', padding: '0 16px' }}>
        <div style={{ background: CARD, border: `1px solid rgba(16,185,129,0.2)`, borderRadius: 20, padding: '48px 40px', textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', border: `2px solid rgba(16,185,129,0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', animation: 'pulse 2s ease-in-out infinite' }}>
            <svg width="32" height="32" fill="none" stroke={GREEN} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h2 style={{ color: WHITE, fontWeight: 800, fontSize: 26, marginBottom: 8 }}>
            Seu WebApp está no ar! 🎉
          </h2>
          <p style={{ color: MUTED, fontSize: 15, marginBottom: 32 }}>
            Compartilhe o link abaixo com seus clientes
          </p>

          <div style={{ background: 'rgba(16,185,129,0.08)', border: `1px solid rgba(16,185,129,0.2)`, borderRadius: 14, padding: '16px 20px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
            <span style={{ color: GREEN, fontWeight: 700, fontSize: 17, letterSpacing: '-0.02em' }}>
              {finalSlug}.{WEBAPP_DOMAIN}
            </span>
            <button
              onClick={() => navigator.clipboard.writeText(`https://${finalSlug}.${WEBAPP_DOMAIN}`)}
              style={{ background: 'rgba(16,185,129,0.15)', border: `1px solid rgba(16,185,129,0.3)`, borderRadius: 8, padding: '6px 14px', color: GREEN, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
            >
              Copiar
            </button>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href={`https://${finalSlug}.${WEBAPP_DOMAIN}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', background: `linear-gradient(135deg, ${GREEN}, #059669)`, color: WHITE, borderRadius: 12, fontWeight: 700, fontSize: 15, textDecoration: 'none' }}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              Abrir WebApp
            </a>
            <button
              onClick={() => { setPublished(false); setStep(1); }}
              style={{ padding: '12px 24px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, borderRadius: 12, color: MUTED, fontWeight: 600, fontSize: 15, cursor: 'pointer' }}
            >
              Editar configurações
            </button>
          </div>
        </div>
        <style>{`@keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,0.3)} 50%{box-shadow:0 0 0 12px rgba(16,185,129,0)} }`}</style>
      </div>
    );
  }

  // ── Wizard ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 16px 60px' }}>
      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(249,115,22,0.1)', border: `1px solid rgba(249,115,22,0.2)`, borderRadius: 100, padding: '4px 14px', marginBottom: 16 }}>
          <svg width="12" height="12" fill={ORANGE} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /></svg>
          <span style={{ color: ORANGE, fontWeight: 600, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Plano Consulting</span>
        </div>
        <h1 style={{ color: WHITE, fontWeight: 800, fontSize: 28, marginBottom: 6, letterSpacing: '-0.02em' }}>
          Configure seu WebApp
        </h1>
        <p style={{ color: MUTED, fontSize: 15 }}>
          Seu assistente IA com endereço e visual próprios
        </p>
      </div>

      <StepBar step={step} />

      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, overflow: 'hidden' }}>

        {/* ── PASSO 1: Logo + Cor ──────────────────────────────────────────── */}
        {step === 1 && (
          <div style={{ padding: '36px 36px 32px' }}>
            <h2 style={{ color: WHITE, fontWeight: 700, fontSize: 20, marginBottom: 6 }}>Identidade visual</h2>
            <p style={{ color: MUTED, fontSize: 14, marginBottom: 28 }}>Adicione o logo e a cor principal do seu negócio</p>

            {companies.length > 1 && (
              <div style={{ marginBottom: 28 }}>
                <label style={{ display: 'block', color: MUTED, fontSize: 13, fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Assistente</label>
                <select
                  value={selectedId}
                  onChange={e => {
                    setSelectedId(e.target.value);
                    const c = companies.find(x => x.id === e.target.value);
                    if (c) {
                      setThemeColor(c.webapp_theme_color || '#f97316');
                      setLogoPreview(c.logo_url || null);
                      setLogoFile(null);
                    }
                  }}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 16px', color: WHITE, fontSize: 15, outline: 'none' }}
                >
                  {companies.map(c => (
                    <option key={c.id} value={c.id} style={{ background: MID }}>{c.name}</option>
                  ))}
                </select>
                <p style={{ color: 'rgba(249,115,22,0.7)', fontSize: 12, marginTop: 8 }}>
                  ⚠️ Apenas 1 webapp por conta. Ativar aqui desativa o anterior.
                </p>
              </div>
            )}

            <label style={{ display: 'block', color: MUTED, fontSize: 13, fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Logo</label>
            <div
              onClick={() => fileRef.current?.click()}
              style={{ border: `2px dashed ${logoPreview ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.12)'}`, borderRadius: 16, padding: '28px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, cursor: 'pointer', marginBottom: 28, background: logoPreview ? 'rgba(16,185,129,0.04)' : 'rgba(255,255,255,0.02)', transition: 'all 0.2s' }}
            >
              {logoPreview ? (
                <>
                  <img src={logoPreview} alt="Logo" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: `2px solid rgba(16,185,129,0.4)` }} />
                  <span style={{ color: GREEN, fontSize: 13, fontWeight: 600 }}>Logo carregado — clique para trocar</span>
                </>
              ) : (
                <>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="22" height="22" fill="none" stroke={MUTED} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                  <span style={{ color: MUTED, fontSize: 14 }}>Clique para fazer upload do logo</span>
                  <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>PNG, JPG, WebP ou SVG · Máx 2MB</span>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml" style={{ display: 'none' }} onChange={onFileChange} />

            <label style={{ display: 'block', color: MUTED, fontSize: 13, fontWeight: 600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cor principal</label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
              {THEME_COLORS.map(c => (
                <button key={c.value} title={c.label} onClick={() => setThemeColor(c.value)}
                  style={{ width: 36, height: 36, borderRadius: '50%', background: c.value, border: `3px solid ${themeColor === c.value ? WHITE : 'transparent'}`, boxShadow: themeColor === c.value ? `0 0 0 2px ${c.value}` : 'none', cursor: 'pointer', transition: 'all 0.2s', outline: 'none' }}
                />
              ))}
            </div>

            {error && <p style={{ color: '#f87171', fontSize: 13, marginTop: 12 }}>{error}</p>}

            <button onClick={() => setStep(2)} style={{ marginTop: 28, width: '100%', padding: '14px', background: `linear-gradient(135deg, ${ORANGE}, #ea580c)`, border: 'none', borderRadius: 14, color: WHITE, fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>
              Continuar →
            </button>
          </div>
        )}

        {/* ── PASSO 2: Subdomínio ──────────────────────────────────────────── */}
        {step === 2 && selectedCompany && (
          <div style={{ padding: '36px 36px 32px' }}>
            <h2 style={{ color: WHITE, fontWeight: 700, fontSize: 20, marginBottom: 6 }}>Seu endereço</h2>
            <p style={{ color: MUTED, fontSize: 14, marginBottom: 28 }}>O subdomínio é gerado automaticamente a partir do nome do seu assistente</p>

            <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, borderRadius: 16, padding: '24px', marginBottom: 28 }}>
              <p style={{ color: MUTED, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Seu WebApp ficará disponível em:</p>
              <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '14px 18px', border: `1px solid rgba(255,255,255,0.08)` }}>
                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 17, fontFamily: 'monospace' }}>https://</span>
                <span style={{ color: themeColor, fontWeight: 800, fontSize: 19, fontFamily: 'monospace', letterSpacing: '-0.02em' }}>{selectedCompany.slug}</span>
                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 17, fontFamily: 'monospace' }}>.{WEBAPP_DOMAIN}</span>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, marginTop: 12 }}>O slug é o mesmo já configurado para o seu assistente</p>
            </div>

            {/* Mini mockup */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}`, borderRadius: 16, padding: '20px', marginBottom: 28 }}>
              <p style={{ color: MUTED, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Preview do seu app</p>
              <div style={{ background: DARK, borderRadius: 12, padding: '16px', border: `1px solid ${BORDER}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  {logoPreview
                    ? <img src={logoPreview} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                    : <div style={{ width: 32, height: 32, borderRadius: '50%', background: themeColor + '33', border: `1px solid ${themeColor}66`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="14" height="14" fill="none" stroke={themeColor} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      </div>
                  }
                  <div>
                    <p style={{ color: WHITE, fontWeight: 700, fontSize: 13 }}>{selectedCompany.name}</p>
                    <p style={{ color: MUTED, fontSize: 11 }}>Assistente IA</p>
                  </div>
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: GREEN }} />
                    <span style={{ color: MUTED, fontSize: 10 }}>Online</span>
                  </div>
                </div>
                <div style={{ height: 2, background: `linear-gradient(90deg, ${themeColor}, transparent)`, borderRadius: 2, marginBottom: 10 }} />
                <div style={{ display: 'flex', gap: 6 }}>
                  <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.07)', flex: 3 }} />
                  <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.04)', flex: 2 }} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, padding: '14px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, borderRadius: 14, color: MUTED, fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>← Voltar</button>
              <button onClick={() => setStep(3)} style={{ flex: 2, padding: '14px', background: `linear-gradient(135deg, ${ORANGE}, #ea580c)`, border: 'none', borderRadius: 14, color: WHITE, fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>Continuar →</button>
            </div>
          </div>
        )}

        {/* ── PASSO 3: Confirmar ───────────────────────────────────────────── */}
        {step === 3 && !published && selectedCompany && (
          <div style={{ padding: '36px 36px 32px' }}>
            <h2 style={{ color: WHITE, fontWeight: 700, fontSize: 20, marginBottom: 6 }}>Tudo pronto!</h2>
            <p style={{ color: MUTED, fontSize: 14, marginBottom: 28 }}>Revise e publique seu WebApp</p>

            <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}`, borderRadius: 16, overflow: 'hidden', marginBottom: 28 }}>
              {[
                { label: 'Assistente', value: selectedCompany.name, icon: <svg width="16" height="16" fill="none" stroke={MUTED} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> },
                { label: 'Endereço', value: `${selectedCompany.slug}.${WEBAPP_DOMAIN}`, icon: <svg width="16" height="16" fill="none" stroke={MUTED} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg> },
                { label: 'Logo', value: logoFile ? logoFile.name : logoPreview ? 'Logo atual mantido' : 'Sem logo (padrão)', icon: <svg width="16" height="16" fill="none" stroke={MUTED} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
                { label: 'Cor', value: THEME_COLORS.find(c => c.value === themeColor)?.label || themeColor, icon: <div style={{ width: 16, height: 16, borderRadius: '50%', background: themeColor }} /> },
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: i < 3 ? `1px solid ${BORDER}` : 'none' }}>
                  <div style={{ flexShrink: 0 }}>{row.icon}</div>
                  <span style={{ color: MUTED, fontSize: 13, flex: 1 }}>{row.label}</span>
                  <span style={{ color: WHITE, fontSize: 14, fontWeight: 600, textAlign: 'right', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.value}</span>
                </div>
              ))}
            </div>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: `1px solid rgba(239,68,68,0.2)`, borderRadius: 10, padding: '12px 16px', color: '#f87171', fontSize: 13, marginBottom: 16 }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setStep(2)} disabled={saving} style={{ flex: 1, padding: '14px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, borderRadius: 14, color: MUTED, fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>← Voltar</button>
              <button onClick={publish} disabled={saving}
                style={{ flex: 2, padding: '14px', background: saving ? 'rgba(16,185,129,0.3)' : `linear-gradient(135deg, ${GREEN}, #059669)`, border: 'none', borderRadius: 14, color: WHITE, fontWeight: 700, fontSize: 16, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                {saving
                  ? <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: WHITE, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Publicando...</>
                  : <><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Publicar WebApp</>
                }
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        select option { background: #1e293b; }
      `}</style>
    </div>
  );
}
