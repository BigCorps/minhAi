// app/home/[slug]/templates/TemplateBold.tsx
'use client';

import Link from 'next/link';
import { getContextualRoute } from '@/lib/routing-utils';
import type { LandingCompany } from '../page';

export default function TemplateBold({ company }: { company: LandingCompany }) {
  const accent = company.webapp_theme_color || '#eab308';
  const logo = company.webapp_logo_url || company.logo_url;

  const iaUrl     = getContextualRoute('ia',     company.slug);
  const vendasUrl = company.modo_vendas_enabled ? getContextualRoute('vendas', company.slug) : null;
  const filaUrl   = company.modo_fila_enabled   ? getContextualRoute('fila',   company.slug) : null;
  const linksUrl  = company.modo_links_enabled  ? getContextualRoute('links',  company.slug) : null;

  const contacts = [
    company.whatsapp_number    && { label: 'WhatsApp',  href: `https://wa.me/${company.whatsapp_number.replace(/\D/g,'')}`,        color: '#22c55e' },
    company.instagram_username && { label: 'Instagram', href: `https://instagram.com/${company.instagram_username.replace('@','')}`, color: '#ec4899' },
    company.website            && { label: 'Site',       href: company.website,                                                      color: '#60a5fa' },
    company.email_contato      && { label: 'E-mail',     href: `mailto:${company.email_contato}`,                                    color: '#fb923c' },
    company.telefone_fixo      && { label: 'Telefone',   href: `tel:${company.telefone_fixo.replace(/\D/g,'')}`,                     color: '#34d399' },
  ].filter(Boolean) as { label: string; href: string; color: string }[];

  return (
    <div style={{
      minHeight: '100vh',
      background: '#09090b',
      color: '#fafafa',
      fontFamily: "'Bebas Neue', 'Impact', 'Arial Black', sans-serif",
    }}>
      {/* Accent stripe */}
      <div style={{ height: 4, background: `linear-gradient(90deg, ${accent}, ${accent}88, transparent)` }} />

      {/* Header */}
      <header style={{ padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {logo && <img src={logo} alt={company.name} style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', border: `2px solid ${accent}` }} />}
          <span style={{ fontSize: 22, letterSpacing: '0.05em', color: '#fafafa' }}>{company.name.toUpperCase()}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, fontFamily: "'DM Sans', sans-serif" }}>
          {vendasUrl && <a href={vendasUrl} style={{ padding: '8px 18px', borderRadius: 6, background: 'rgba(255,255,255,0.06)', color: '#fafafa', textDecoration: 'none', fontSize: 13 }}>PRODUTOS</a>}
          {filaUrl   && <a href={filaUrl}   style={{ padding: '8px 18px', borderRadius: 6, background: 'rgba(255,255,255,0.06)', color: '#fafafa', textDecoration: 'none', fontSize: 13 }}>FILA</a>}
        </div>
      </header>

      {/* Hero */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 32px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: logo ? '1fr 1fr' : '1fr', gap: 48, alignItems: 'center' }}>
          <div>
            {company.assistant_role && (
              <div style={{
                display: 'inline-block', marginBottom: 24,
                padding: '6px 16px', borderRadius: 4,
                background: accent, color: '#09090b',
                fontSize: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase',
              }}>
                {company.assistant_role}
              </div>
            )}
            <h1 style={{
              fontSize: 'clamp(3rem, 8vw, 7rem)',
              lineHeight: 0.95, letterSpacing: '-0.01em',
              margin: '0 0 24px', textTransform: 'uppercase',
            }}>
              {company.name}
            </h1>
            {company.brand_description && (
              <p style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 16, lineHeight: 1.6, color: 'rgba(250,250,250,0.6)',
                maxWidth: 480, margin: '0 0 40px',
              }}>
                {company.brand_description}
              </p>
            )}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontFamily: "'DM Sans', sans-serif" }}>
              <Link href={iaUrl} style={{
                padding: '16px 36px', borderRadius: 6, fontSize: 15, fontWeight: 700,
                background: accent, color: '#09090b', textDecoration: 'none',
                textTransform: 'uppercase', letterSpacing: '0.05em',
                transition: 'transform 0.15s',
              }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.03)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
              >
                Falar com IA →
              </Link>
              {vendasUrl && (
                <Link href={vendasUrl} style={{
                  padding: '16px 36px', borderRadius: 6, fontSize: 15, fontWeight: 700,
                  border: `2px solid ${accent}`, color: accent, textDecoration: 'none',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  background: 'transparent',
                }}>
                  Ver Produtos
                </Link>
              )}
            </div>
          </div>
          {logo && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ position: 'relative' }}>
                <div style={{
                  position: 'absolute', inset: -12,
                  background: `${accent}15`, borderRadius: 24,
                  border: `1px solid ${accent}30`,
                }} />
                <img src={logo} alt={company.name} style={{
                  width: 260, height: 260, borderRadius: 16, objectFit: 'cover',
                  position: 'relative', zIndex: 1,
                }} />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Info bar */}
      {(company.business_hours || company.business_address) && (
        <section style={{
          borderTop: `1px solid ${accent}30`, borderBottom: `1px solid ${accent}30`,
          margin: '0 32px',
          padding: '24px 0',
          display: 'flex', gap: 48, flexWrap: 'wrap',
          fontFamily: "'DM Sans', sans-serif", maxWidth: 1200,
        }}>
          {company.business_hours && (
            <div>
              <p style={{ fontSize: 10, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.15em', color: accent, marginBottom: 4 }}>HORÁRIOS</p>
              <p style={{ fontSize: 14, color: 'rgba(250,250,250,0.7)' }}>{company.business_hours}</p>
            </div>
          )}
          {company.business_address && (
            <div>
              <p style={{ fontSize: 10, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.15em', color: accent, marginBottom: 4 }}>ENDEREÇO</p>
              <p style={{ fontSize: 14, color: 'rgba(250,250,250,0.7)' }}>{company.business_address}</p>
            </div>
          )}
        </section>
      )}

      {/* Contatos */}
      {contacts.length > 0 && (
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 32px 80px' }}>
          <h2 style={{ fontSize: 36, letterSpacing: '0.05em', marginBottom: 28, textTransform: 'uppercase' }}>
            CONTATO
          </h2>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontFamily: "'DM Sans', sans-serif" }}>
            {contacts.map(c => (
              <a key={c.href} href={c.href} target="_blank" rel="noopener noreferrer" style={{
                padding: '12px 24px', borderRadius: 6, fontSize: 14, fontWeight: 600,
                border: `1px solid ${c.color}40`, color: c.color,
                textDecoration: 'none', background: `${c.color}10`,
                transition: 'background 0.15s',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = `${c.color}20`)}
                onMouseLeave={e => (e.currentTarget.style.background = `${c.color}10`)}
              >
                {c.label}
              </a>
            ))}
          </div>
        </section>
      )}

      <footer style={{
        borderTop: `1px solid ${accent}20`, padding: '20px 32px',
        fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'rgba(250,250,250,0.3)',
      }}>
        POWERED BY <a href="https://minhai.app" style={{ color: accent, textDecoration: 'none' }}>MINHAI</a>
      </footer>
    </div>
  );
}
