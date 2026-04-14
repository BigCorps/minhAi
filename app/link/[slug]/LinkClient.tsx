// app/link/[slug]/LinkClient.tsx
'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { detectSubdomainContext, getContextualRoute } from '@/lib/routing-utils';
import SlugHeader from '@/components/slug/SlugHeader';
import SlugFooter from '@/components/slug/SlugFooter';

// ── Tipos ────────────────────────────────────────────────────────────────────

interface CompanyData {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  webapp_logo_url?: string | null;
  webapp_enabled: boolean;
  webapp_theme_color?: string | null;
  assistant_role?: string | null;
  brand_description?: string | null;
  modo_links_enabled: boolean;
  whatsapp_number?: string | null;
  instagram_username?: string | null;
  website?: string | null;
  facebook?: string | null;
  email_contato?: string | null;
  telefone_fixo?: string | null;
  tiktok?: string | null;
  twitter?: string | null;
  linkedin?: string | null;
  youtube_channel_url?: string | null;
}

interface LinkItem {
  id: string;
  titulo: string;
  url: string;
  display_order: number;
  is_broken: boolean;
}

interface Props {
  company: CompanyData;
  links: LinkItem[];
  slug: string;
}

// ── Mapeamento de contatos ───────────────────────────────────────────────────

const CONTACT_MAP = [
  {
    field: 'whatsapp_number' as keyof CompanyData,
    label: 'WhatsApp',
    buildUrl: (v: string) => `https://wa.me/${v.replace(/\D/g, '')}`,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
    color: '#25D366',
  },
  {
    field: 'instagram_username' as keyof CompanyData,
    label: 'Instagram',
    buildUrl: (v: string) => `https://instagram.com/${v.replace('@', '')}`,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
    color: '#E1306C',
  },
  {
    field: 'facebook' as keyof CompanyData,
    label: 'Facebook',
    buildUrl: (v: string) => v,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    color: '#1877F2',
  },
  {
    field: 'website' as keyof CompanyData,
    label: 'Site',
    buildUrl: (v: string) => v,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
      </svg>
    ),
    color: '#6366F1',
  },
  {
    field: 'telefone_fixo' as keyof CompanyData,
    label: 'Telefone',
    buildUrl: (v: string) => `tel:${v.replace(/\D/g, '')}`,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.68 9.63a19.79 19.79 0 01-3.07-8.67A2 2 0 012.59 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.56a16 16 0 006.53 6.53l.91-.91a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
      </svg>
    ),
    color: '#10B981',
  },
  {
    field: 'email_contato' as keyof CompanyData,
    label: 'E-mail',
    buildUrl: (v: string) => `mailto:${v}`,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    ),
    color: '#F59E0B',
  },
  {
    field: 'tiktok' as keyof CompanyData,
    label: 'TikTok',
    buildUrl: (v: string) => `https://tiktok.com/@${v.replace('@', '')}`,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.19 8.19 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z" />
      </svg>
    ),
    color: '#010101',
  },
  {
    field: 'twitter' as keyof CompanyData,
    label: 'X / Twitter',
    buildUrl: (v: string) => `https://twitter.com/${v.replace('@', '')}`,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    color: '#000000',
  },
  {
    field: 'linkedin' as keyof CompanyData,
    label: 'LinkedIn',
    buildUrl: (v: string) => v,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
    color: '#0A66C2',
  },
  {
    field: 'youtube_channel_url' as keyof CompanyData,
    label: 'YouTube',
    buildUrl: (v: string) => v,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
    color: '#FF0000',
  },
];

// ── Componente principal ─────────────────────────────────────────────────────

export default function LinkClient({ company, links, slug }: Props) {
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const theme = mounted ? ((resolvedTheme as 'dark' | 'light') ?? 'dark') : 'dark';
  const isDark = theme === 'dark';

  // URL do assistente respeitando subdomínio (routing-utils)
  const assistenteUrl = mounted ? getContextualRoute('ia', slug) : `/ia/${slug}`;

  const handleToggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  // Filtrar links de contato com campos preenchidos
  const contactLinks = CONTACT_MAP.filter((c) => {
    const val = company[c.field];
    return val && String(val).trim() !== '';
  });

  // Paletas inline (padrão arquitetural minhAi — sem Tailwind dinâmico)
  const DARK = {
    bg: '#0f172a',
    card: 'rgba(255,255,255,0.04)',
    cardBorder: 'rgba(255,255,255,0.08)',
    cardHover: 'rgba(255,255,255,0.08)',
    text: '#f1f5f9',
    textMuted: 'rgba(255,255,255,0.45)',
    divider: 'rgba(255,255,255,0.08)',
    badge: 'rgba(239,68,68,0.15)',
    badgeText: '#f87171',
  };

  const LIGHT = {
    bg: '#f8fafc',
    card: '#ffffff',
    cardBorder: '#e2e8f0',
    cardHover: '#f1f5f9',
    text: '#0f172a',
    textMuted: '#64748b',
    divider: '#e2e8f0',
    badge: '#fef2f2',
    badgeText: '#dc2626',
  };

  const palette = isDark ? DARK : LIGHT;

  // Loading / SSR
  if (!mounted) {
    return (
      <div style={{ minHeight: '100vh', background: DARK.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: 48, height: 48, border: '3px solid rgba(99,102,241,0.3)',
          borderTopColor: '#6366f1', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const accentColor = company.webapp_theme_color ?? '#6366f1';
  const displayLogo = company.webapp_logo_url ?? company.logo_url;

  return (
    <div style={{ minHeight: '100vh', background: palette.bg, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <SlugHeader
        company={{
          name: company.name,
          logo_url: company.logo_url,
          assistant_role: company.assistant_role,
          webapp_enabled: company.webapp_enabled,
          modo_vendas_enabled: false,
          modo_fila_enabled: false,
          modo_links_enabled: company.modo_links_enabled,
        }}
        slug={slug}
        pageType="link"
        theme={theme}
        overlayMode={false}
        isKioskMode={false}
        isWakeLockActive={false}
        isWakeLockSupported={false}
        isPortrait={false}
        showControls={false}
        onEnterKioskMode={() => {}}
        onToggleWakeLock={() => {}}
        onToggleModoVenda={() => {}}
        onToggleTheme={handleToggleTheme}
        onClose={undefined}
      />

      {/* Conteúdo principal */}
      <main style={{
        flex: 1,
        maxWidth: 480,
        width: '100%',
        margin: '0 auto',
        padding: '24px 16px 120px',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}>

        {/* ── Cabeçalho da empresa ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, paddingTop: 8 }}>
          {displayLogo ? (
            <img
              src={displayLogo}
              alt={company.name}
              style={{
                width: 80, height: 80, borderRadius: '50%', objectFit: 'cover',
                border: `3px solid ${accentColor}30`,
                boxShadow: `0 0 0 4px ${accentColor}15`,
              }}
            />
          ) : (
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: `${accentColor}20`,
              border: `3px solid ${accentColor}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, fontWeight: 700, color: accentColor,
            }}>
              {company.name.charAt(0).toUpperCase()}
            </div>
          )}

          <div style={{ textAlign: 'center' }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: palette.text, lineHeight: 1.2 }}>
              {company.name}
            </h1>
            {company.assistant_role && (
              <p style={{ margin: '4px 0 0', fontSize: 13, color: accentColor, fontWeight: 500 }}>
                {company.assistant_role}
              </p>
            )}
            {company.brand_description && (
              <p style={{ margin: '8px 0 0', fontSize: 13, color: palette.textMuted, lineHeight: 1.5, maxWidth: 340 }}>
                {company.brand_description}
              </p>
            )}
          </div>
        </div>

        {/* ── Links de Contato ── */}
        {contactLinks.length > 0 && (
          <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: palette.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Contato
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {contactLinks.map((c) => {
                const val = String(company[c.field] ?? '');
                return (
                  <a
                    key={c.field}
                    href={c.buildUrl(val)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 14px',
                      borderRadius: 12,
                      background: palette.card,
                      border: `1px solid ${palette.cardBorder}`,
                      color: palette.text,
                      textDecoration: 'none',
                      fontSize: 13, fontWeight: 500,
                      transition: 'all 0.15s ease',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = palette.cardHover;
                      (e.currentTarget as HTMLElement).style.borderColor = `${c.color}50`;
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = palette.card;
                      (e.currentTarget as HTMLElement).style.borderColor = palette.cardBorder;
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                    }}
                  >
                    <span style={{ color: c.color, display: 'flex', alignItems: 'center' }}>{c.icon}</span>
                    {c.label}
                  </a>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Links Customizados ── */}
        {links.length > 0 && (
          <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: palette.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', alignSelf: 'center' }}>
              Links
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {links.map((link) => (
                <a
                  key={link.id}
                  href={link.is_broken ? undefined : link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center',
                    padding: '14px 18px',
                    borderRadius: 14,
                    background: palette.card,
                    border: `1px solid ${link.is_broken ? '#ef444430' : palette.cardBorder}`,
                    color: palette.text,
                    textDecoration: 'none',
                    fontSize: 15, fontWeight: 600,
                    transition: 'all 0.15s ease',
                    cursor: link.is_broken ? 'default' : 'pointer',
                    opacity: link.is_broken ? 0.6 : 1,
                  }}
                  onMouseEnter={e => {
                    if (!link.is_broken) {
                      (e.currentTarget as HTMLElement).style.background = palette.cardHover;
                      (e.currentTarget as HTMLElement).style.transform = 'scale(1.015)';
                      (e.currentTarget as HTMLElement).style.boxShadow = isDark
                        ? '0 4px 20px rgba(0,0,0,0.3)'
                        : '0 4px 20px rgba(0,0,0,0.08)';
                    }
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = palette.card;
                    (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                  }}
                >
                  <span style={{ flex: 1 }}>{link.titulo}</span>

                  {link.is_broken ? (
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      background: palette.badge, color: palette.badgeText,
                      padding: '2px 8px', borderRadius: 6,
                    }}>
                      Indisponível
                    </span>
                  ) : (
                    /* Seta → */
                    <svg style={{ width: 16, height: 16, color: palette.textMuted, flexShrink: 0 }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
                    </svg>
                  )}
                </a>
              ))}
            </div>
          </section>
        )}

        {/* ── Botão Falar com o Assistente ── */}
        <section>
          <a
            href={assistenteUrl}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              padding: '16px 24px',
              borderRadius: 16,
              background: `linear-gradient(135deg, ${accentColor}, #10b981)`,
              color: '#ffffff',
              textDecoration: 'none',
              fontSize: 15, fontWeight: 700,
              boxShadow: `0 4px 20px ${accentColor}40`,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)';
              (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 30px ${accentColor}50`;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
              (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 20px ${accentColor}40`;
            }}
          >
            Falar com o Assistente
          </a>
        </section>
      </main>

      {/* Footer */}
      <SlugFooter
        theme={theme}
        slug={slug}
        webapp_enabled={company.webapp_enabled}
      />
    </div>
  );
}
