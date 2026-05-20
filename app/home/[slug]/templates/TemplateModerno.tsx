// app/home/[slug]/templates/TemplateModerno.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getContextualRoute } from '@/lib/routing-utils';
import type { LandingCompany } from '../page';

export default function TemplateModerno({ company }: { company: LandingCompany }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const accent = company.webapp_theme_color || '#f97316';
  const logo = company.webapp_logo_url || company.logo_url;

  const iaUrl    = getContextualRoute('ia',     company.slug);
  const vendasUrl = company.modo_vendas_enabled ? getContextualRoute('vendas', company.slug) : null;
  const filaUrl   = company.modo_fila_enabled   ? getContextualRoute('fila',   company.slug) : null;
  const linksUrl  = company.modo_links_enabled  ? getContextualRoute('links',  company.slug) : null;

  const contacts = [
    company.whatsapp_number   && { label: 'WhatsApp',  href: `https://wa.me/${company.whatsapp_number.replace(/\D/g,'')}`,       icon: '💬' },
    company.instagram_username && { label: 'Instagram', href: `https://instagram.com/${company.instagram_username.replace('@','')}`, icon: '📸' },
    company.website            && { label: 'Site',       href: company.website,                                                     icon: '🌐' },
    company.email_contato      && { label: 'E-mail',     href: `mailto:${company.email_contato}`,                                   icon: '✉️' },
    company.telefone_fixo      && { label: 'Telefone',   href: `tel:${company.telefone_fixo.replace(/\D/g,'')}`,                    icon: '📞' },
  ].filter(Boolean) as { label: string; href: string; icon: string }[];

  return (
    <div style={{
      minHeight: '100vh',
      background: '#080b14',
      color: '#f1f5f9',
      fontFamily: "'DM Sans', 'Nunito', system-ui, sans-serif",
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: `radial-gradient(ellipse 80% 50% at 50% -10%, ${accent}22 0%, transparent 70%)`,
      }} />

      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(8,11,20,0.85)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '0 24px',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo + Nome */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {logo && (
              <img src={logo} alt={company.name} style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover' }} />
            )}
            <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em' }}>{company.name}</span>
          </div>

          {/* Nav Desktop */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {vendasUrl && <NavLink href={vendasUrl} label="Cardápio" />}
            {filaUrl   && <NavLink href={filaUrl}   label="Fila" />}
            {linksUrl  && <NavLink href={linksUrl}  label="Links" />}
            <Link href={iaUrl} style={{
              padding: '8px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600,
              background: accent, color: '#fff', textDecoration: 'none',
              transition: 'opacity 0.2s',
            }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              Falar com IA
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section style={{ maxWidth: 800, margin: '0 auto', padding: '96px 24px 64px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        {logo && (
          <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'center' }}>
            <img src={logo} alt={company.name} style={{
              width: 88, height: 88, borderRadius: 22, objectFit: 'cover',
              border: `2px solid ${accent}40`,
              boxShadow: `0 0 40px ${accent}30`,
            }} />
          </div>
        )}

        <h1 style={{
          fontSize: 'clamp(2.2rem, 6vw, 3.8rem)',
          fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.1,
          margin: '0 0 20px',
        }}>
          {company.name}
        </h1>

        {company.assistant_role && (
          <p style={{ fontSize: 14, fontWeight: 600, color: accent, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16 }}>
            {company.assistant_role}
          </p>
        )}

        {company.brand_description && (
          <p style={{ fontSize: 17, color: 'rgba(241,245,249,0.65)', lineHeight: 1.7, maxWidth: 560, margin: '0 auto 40px' }}>
            {company.brand_description}
          </p>
        )}

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href={iaUrl} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '14px 32px', borderRadius: 14, fontSize: 15, fontWeight: 700,
            background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
            color: '#fff', textDecoration: 'none',
            boxShadow: `0 4px 24px ${accent}40`,
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 32px ${accent}50`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 4px 24px ${accent}40`; }}
          >
            🤖 Falar com o Assistente
          </Link>

          {vendasUrl && (
            <Link href={vendasUrl} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '14px 32px', borderRadius: 14, fontSize: 15, fontWeight: 600,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              color: '#f1f5f9', textDecoration: 'none',
              transition: 'background 0.2s',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.10)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
            >
              🛒 Ver Produtos
            </Link>
          )}
        </div>
      </section>

      {/* Info Cards */}
      {(company.business_hours || company.business_address) && (
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 64px', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {company.business_hours && (
              <InfoCard icon="🕐" title="Horários" value={company.business_hours} accent={accent} />
            )}
            {company.business_address && (
              <InfoCard icon="📍" title="Endereço" value={company.business_address} accent={accent} />
            )}
          </div>
        </section>
      )}

      {/* Contatos */}
      {contacts.length > 0 && (
        <section style={{ maxWidth: 600, margin: '0 auto', padding: '0 24px 64px', position: 'relative', zIndex: 1 }}>
          <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 20 }}>
            Entre em contato
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {contacts.map(c => (
              <a key={c.href} href={c.href} target="_blank" rel="noopener noreferrer" style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 20px', borderRadius: 14,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                color: '#f1f5f9', textDecoration: 'none', fontSize: 14, fontWeight: 500,
                transition: 'background 0.15s, border-color 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = `${accent}40`; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
              >
                <span style={{ fontSize: 18 }}>{c.icon}</span>
                <span style={{ flex: 1 }}>{c.label}</span>
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ opacity: 0.4 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 18l6-6-6-6" />
                </svg>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.05)',
        padding: '24px', textAlign: 'center',
        fontSize: 12, color: 'rgba(255,255,255,0.25)',
        position: 'relative', zIndex: 1,
      }}>
        <a href="https://minhai.app" style={{ color: 'inherit', textDecoration: 'none' }}>
          Powered by <strong style={{ color: 'rgba(255,255,255,0.4)' }}>minhAi</strong>
        </a>
      </footer>
    </div>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} style={{
      padding: '8px 16px', borderRadius: 10, fontSize: 14, fontWeight: 500,
      color: 'rgba(241,245,249,0.7)', textDecoration: 'none',
      transition: 'color 0.15s',
    }}
      onMouseEnter={e => (e.currentTarget.style.color = '#f1f5f9')}
      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(241,245,249,0.7)')}
    >
      {label}
    </a>
  );
}

function InfoCard({ icon, title, value, accent }: { icon: string; title: string; value: string; accent: string }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 16, padding: '20px 24px',
    }}>
      <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: accent, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 14, color: 'rgba(241,245,249,0.7)', lineHeight: 1.6 }}>{value}</div>
    </div>
  );
}
