// app/home/[slug]/templates/TemplateTotem.tsx
'use client';

import Link from 'next/link';
import { getContextualRoute } from '@/lib/routing-utils';
import type { LandingCompany } from '../page';

export default function TemplateTotem({ company }: { company: LandingCompany }) {
  const accent = company.webapp_theme_color || '#6366f1';
  const logo = company.webapp_logo_url || company.logo_url;

  const iaUrl     = getContextualRoute('ia',     company.slug);
  const vendasUrl = company.modo_vendas_enabled ? getContextualRoute('vendas', company.slug) : null;
  const filaUrl   = company.modo_fila_enabled   ? getContextualRoute('fila',   company.slug) : null;
  const linksUrl  = company.modo_links_enabled  ? getContextualRoute('links',  company.slug) : null;

  // Botões de ação do totem
  const actions = [
    { label: 'Falar com IA', sublabel: 'Assistente disponível', href: iaUrl, icon: '🤖', primary: true },
    vendasUrl && { label: 'Ver Produtos', sublabel: 'Cardápio e preços', href: vendasUrl, icon: '🛒', primary: false },
    filaUrl   && { label: 'Pegar Senha', sublabel: 'Fila de atendimento', href: filaUrl,   icon: '🎫', primary: false },
    linksUrl  && { label: 'Nossos Links', sublabel: 'Redes e contatos',   href: linksUrl,  icon: '🔗', primary: false },
  ].filter(Boolean) as { label: string; sublabel: string; href: string; icon: string; primary: boolean }[];

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(160deg, #0f0f23 0%, #1a1a3e 50%, #0f0f23 100%)`,
      color: '#f8fafc',
      fontFamily: "'Nunito', 'DM Sans', system-ui, sans-serif",
      display: 'flex', flexDirection: 'column',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Animated background circles */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', width: 600, height: 600,
          borderRadius: '50%', top: '-200px', left: '-200px',
          background: `radial-gradient(circle, ${accent}15 0%, transparent 70%)`,
        }} />
        <div style={{
          position: 'absolute', width: 400, height: 400,
          borderRadius: '50%', bottom: '-100px', right: '-100px',
          background: `radial-gradient(circle, ${accent}10 0%, transparent 70%)`,
        }} />
      </div>

      {/* Logo + Nome no topo */}
      <div style={{ padding: '40px 40px 0', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        {logo && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute', inset: -6, borderRadius: 26,
                background: `${accent}30`, filter: 'blur(8px)',
              }} />
              <img src={logo} alt={company.name} style={{
                width: 80, height: 80, borderRadius: 20, objectFit: 'cover',
                border: `2px solid ${accent}60`, position: 'relative',
              }} />
            </div>
          </div>
        )}
        <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 8px' }}>
          {company.name}
        </h1>
        {company.brand_description && (
          <p style={{ fontSize: 16, color: 'rgba(248,250,252,0.55)', maxWidth: 480, margin: '0 auto', lineHeight: 1.5 }}>
            {company.brand_description}
          </p>
        )}
      </div>

      {/* Botões grandes — touch friendly */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '40px 32px', maxWidth: 600, margin: '0 auto', width: '100%',
        position: 'relative', zIndex: 1, gap: 16,
      }}>
        <p style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, color: 'rgba(248,250,252,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
          Toque para começar
        </p>

        {actions.map((action, i) => (
          <Link key={i} href={action.href} style={{
            display: 'flex', alignItems: 'center', gap: 20,
            padding: '24px 28px', borderRadius: 20,
            background: action.primary
              ? `linear-gradient(135deg, ${accent}, ${accent}cc)`
              : 'rgba(255,255,255,0.06)',
            border: action.primary
              ? 'none'
              : '1px solid rgba(255,255,255,0.1)',
            color: '#f8fafc', textDecoration: 'none',
            boxShadow: action.primary ? `0 8px 32px ${accent}40` : 'none',
            transition: 'transform 0.15s, box-shadow 0.15s',
            cursor: 'pointer',
          }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'scale(1.02)';
              if (action.primary) e.currentTarget.style.boxShadow = `0 12px 40px ${accent}55`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1)';
              if (action.primary) e.currentTarget.style.boxShadow = `0 8px 32px ${accent}40`;
            }}
          >
            <span style={{ fontSize: 36, flexShrink: 0 }}>{action.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em' }}>{action.label}</div>
              <div style={{ fontSize: 13, color: action.primary ? 'rgba(255,255,255,0.75)' : 'rgba(248,250,252,0.5)', marginTop: 2 }}>{action.sublabel}</div>
            </div>
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ opacity: 0.6, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 18l6-6-6-6" />
            </svg>
          </Link>
        ))}
      </div>

      {/* Info bar + Footer */}
      <div style={{ padding: '0 32px 32px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        {(company.business_hours || company.business_address) && (
          <div style={{
            display: 'inline-flex', gap: 32, flexWrap: 'wrap', justifyContent: 'center',
            padding: '16px 28px', borderRadius: 14, marginBottom: 20,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          }}>
            {company.business_hours && (
              <span style={{ fontSize: 13, color: 'rgba(248,250,252,0.6)' }}>
                🕐 {company.business_hours}
              </span>
            )}
            {company.business_address && (
              <span style={{ fontSize: 13, color: 'rgba(248,250,252,0.6)' }}>
                📍 {company.business_address}
              </span>
            )}
          </div>
        )}
        <div style={{ fontSize: 12, color: 'rgba(248,250,252,0.2)' }}>
          Powered by <a href="https://minhai.app" style={{ color: `${accent}90`, textDecoration: 'none' }}>minhAi</a>
        </div>
      </div>
    </div>
  );
}
