// app/home/[slug]/templates/TemplateClinica.tsx
'use client';

import Link from 'next/link';
import { getContextualRoute } from '@/lib/routing-utils';
import type { LandingCompany } from '../page';

export default function TemplateClinica({ company }: { company: LandingCompany }) {
  const accent = company.webapp_theme_color || '#0284c7';
  const logo = company.webapp_logo_url || company.logo_url;

  const iaUrl     = getContextualRoute('ia',     company.slug);
  const vendasUrl = company.modo_vendas_enabled ? getContextualRoute('vendas', company.slug) : null;
  const filaUrl   = company.modo_fila_enabled   ? getContextualRoute('fila',   company.slug) : null;
  const linksUrl  = company.modo_links_enabled  ? getContextualRoute('links',  company.slug) : null;

  const contacts = [
    company.whatsapp_number    && { label: 'WhatsApp',  href: `https://wa.me/${company.whatsapp_number.replace(/\D/g,'')}`,        icon: '💬' },
    company.telefone_fixo      && { label: 'Telefone',   href: `tel:${company.telefone_fixo.replace(/\D/g,'')}`,                    icon: '📞' },
    company.email_contato      && { label: 'E-mail',     href: `mailto:${company.email_contato}`,                                   icon: '✉️' },
    company.website            && { label: 'Site',       href: company.website,                                                     icon: '🌐' },
    company.instagram_username && { label: 'Instagram',  href: `https://instagram.com/${company.instagram_username.replace('@','')}`, icon: '📸' },
  ].filter(Boolean) as { label: string; href: string; icon: string }[];

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f0f9ff',
      color: '#0c4a6e',
      fontFamily: "'Plus Jakarta Sans', 'Nunito', 'DM Sans', system-ui, sans-serif",
    }}>
      {/* Top accent bar */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${accent}, #38bdf8)` }} />

      {/* Header */}
      <header style={{
        background: '#ffffff', borderBottom: '1px solid #e0f2fe',
        padding: '0 32px', boxShadow: '0 1px 12px rgba(2,132,199,0.08)',
      }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {logo ? (
              <img src={logo} alt={company.name} style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', border: `2px solid ${accent}20` }} />
            ) : (
              <div style={{ width: 44, height: 44, borderRadius: 10, background: `${accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                🏥
              </div>
            )}
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0c4a6e' }}>{company.name}</div>
              {company.assistant_role && <div style={{ fontSize: 12, color: accent, fontWeight: 500 }}>{company.assistant_role}</div>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {filaUrl && (
              <a href={filaUrl} style={{
                padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: `${accent}10`, color: accent, textDecoration: 'none', border: `1px solid ${accent}25`,
              }}>
                📋 Fila
              </a>
            )}
            <Link href={iaUrl} style={{
              padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: accent, color: '#fff', textDecoration: 'none',
            }}>
              Agendar Consulta
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section style={{ maxWidth: 1000, margin: '0 auto', padding: '72px 32px 56px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: logo ? '1fr auto' : '1fr', gap: 56, alignItems: 'center' }}>
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 16px', borderRadius: 100, marginBottom: 24,
              background: `${accent}12`, border: `1px solid ${accent}25`,
              fontSize: 12, fontWeight: 600, color: accent,
            }}>
              <span>●</span> Atendimento com IA
            </div>

            <h1 style={{
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15,
              color: '#0c4a6e', margin: '0 0 20px',
            }}>
              {company.name}
            </h1>

            {company.brand_description && (
              <p style={{ fontSize: 16, lineHeight: 1.75, color: '#0369a1', maxWidth: 480, margin: '0 0 36px', opacity: 0.85 }}>
                {company.brand_description}
              </p>
            )}

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link href={iaUrl} style={{
                padding: '14px 32px', borderRadius: 10, fontSize: 15, fontWeight: 700,
                background: accent, color: '#fff', textDecoration: 'none',
                boxShadow: `0 4px 20px ${accent}35`,
                transition: 'box-shadow 0.2s, transform 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 8px 28px ${accent}50`; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = `0 4px 20px ${accent}35`; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                🗓️ Agendar Consulta
              </Link>
              {contacts[0] && (
                <a href={contacts[0].href} target="_blank" rel="noopener noreferrer" style={{
                  padding: '14px 32px', borderRadius: 10, fontSize: 15, fontWeight: 600,
                  background: '#fff', border: `1.5px solid ${accent}30`, color: '#0c4a6e',
                  textDecoration: 'none',
                }}>
                  {contacts[0].icon} {contacts[0].label}
                </a>
              )}
            </div>
          </div>

          {logo && (
            <div style={{
              width: 200, height: 200, borderRadius: 24, overflow: 'hidden',
              boxShadow: `0 20px 60px ${accent}25`,
              border: `3px solid ${accent}20`,
              flexShrink: 0,
            }}>
              <img src={logo} alt={company.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}
        </div>
      </section>

      {/* Cards de Info */}
      <section style={{ maxWidth: 1000, margin: '0 auto', padding: '0 32px 56px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {company.business_hours && (
            <div style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', boxShadow: '0 2px 16px rgba(2,132,199,0.08)', border: '1px solid #e0f2fe' }}>
              <div style={{ fontSize: 22, marginBottom: 10 }}>🕐</div>
              <p style={{ fontSize: 11, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Horários</p>
              <p style={{ fontSize: 14, color: '#0369a1', lineHeight: 1.6 }}>{company.business_hours}</p>
            </div>
          )}
          {company.business_address && (
            <div style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', boxShadow: '0 2px 16px rgba(2,132,199,0.08)', border: '1px solid #e0f2fe' }}>
              <div style={{ fontSize: 22, marginBottom: 10 }}>📍</div>
              <p style={{ fontSize: 11, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Localização</p>
              <p style={{ fontSize: 14, color: '#0369a1', lineHeight: 1.6 }}>{company.business_address}</p>
            </div>
          )}
          <div style={{ background: `${accent}08`, borderRadius: 16, padding: '20px 24px', border: `1px solid ${accent}20`, cursor: 'pointer' }}
            onClick={() => window.location.href = iaUrl}>
            <div style={{ fontSize: 22, marginBottom: 10 }}>🤖</div>
            <p style={{ fontSize: 11, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>IA 24h</p>
            <p style={{ fontSize: 14, color: '#0369a1', lineHeight: 1.6 }}>Tire dúvidas e agende com nossa IA disponível 24 horas.</p>
          </div>
        </div>
      </section>

      {/* Contatos */}
      {contacts.length > 1 && (
        <section style={{ maxWidth: 600, margin: '0 auto', padding: '0 32px 80px' }}>
          <p style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 20 }}>Fale Conosco</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {contacts.map(c => (
              <a key={c.href} href={c.href} target="_blank" rel="noopener noreferrer" style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 20px', borderRadius: 12,
                background: '#fff', border: '1px solid #e0f2fe',
                color: '#0c4a6e', textDecoration: 'none', fontSize: 14, fontWeight: 500,
                boxShadow: '0 1px 8px rgba(2,132,199,0.06)',
                transition: 'box-shadow 0.15s, border-color 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 4px 16px ${accent}20`; e.currentTarget.style.borderColor = `${accent}40`; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 8px rgba(2,132,199,0.06)'; e.currentTarget.style.borderColor = '#e0f2fe'; }}
              >
                <span style={{ fontSize: 18 }}>{c.icon}</span>
                <span style={{ flex: 1 }}>{c.label}</span>
                <svg width="14" height="14" fill="none" stroke={accent} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 18l6-6-6-6" />
                </svg>
              </a>
            ))}
          </div>
        </section>
      )}

      <footer style={{
        borderTop: '1px solid #e0f2fe', padding: '20px 32px', textAlign: 'center',
        fontSize: 12, color: '#7dd3fc',
        background: '#fff',
      }}>
        Powered by <a href="https://minhai.app" style={{ color: accent, textDecoration: 'none', fontWeight: 600 }}>minhAi</a>
      </footer>
    </div>
  );
}
