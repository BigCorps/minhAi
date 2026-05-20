// app/home/[slug]/templates/TemplateMinimalista.tsx
'use client';

import Link from 'next/link';
import { getContextualRoute } from '@/lib/routing-utils';
import type { LandingCompany } from '../page';

export default function TemplateMinimalista({ company }: { company: LandingCompany }) {
  const accent = company.webapp_theme_color || '#1a1a2e';
  const logo = company.webapp_logo_url || company.logo_url;

  const iaUrl     = getContextualRoute('ia',     company.slug);
  const vendasUrl = company.modo_vendas_enabled ? getContextualRoute('vendas', company.slug) : null;
  const filaUrl   = company.modo_fila_enabled   ? getContextualRoute('fila',   company.slug) : null;
  const linksUrl  = company.modo_links_enabled  ? getContextualRoute('links',  company.slug) : null;

  const contacts = [
    company.whatsapp_number    && { label: 'WhatsApp',  href: `https://wa.me/${company.whatsapp_number.replace(/\D/g,'')}` },
    company.instagram_username && { label: 'Instagram', href: `https://instagram.com/${company.instagram_username.replace('@','')}` },
    company.website            && { label: 'Site',       href: company.website },
    company.email_contato      && { label: 'E-mail',     href: `mailto:${company.email_contato}` },
    company.telefone_fixo      && { label: 'Telefone',   href: `tel:${company.telefone_fixo.replace(/\D/g,'')}` },
  ].filter(Boolean) as { label: string; href: string }[];

  return (
    <div style={{
      minHeight: '100vh',
      background: '#fafaf9',
      color: '#1c1917',
      fontFamily: "'Lora', 'Georgia', 'Times New Roman', serif",
    }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid #e7e5e4',
        padding: '0 40px',
      }}>
        <div style={{ maxWidth: 960, margin: '0 auto', height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {logo && (
              <img src={logo} alt={company.name} style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
            )}
            <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>{company.name}</span>
          </div>
          <nav style={{ display: 'flex', gap: 32, fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}>
            {vendasUrl && <a href={vendasUrl} style={{ color: '#78716c', textDecoration: 'none' }}>Produtos</a>}
            {filaUrl   && <a href={filaUrl}   style={{ color: '#78716c', textDecoration: 'none' }}>Fila</a>}
            {linksUrl  && <a href={linksUrl}  style={{ color: '#78716c', textDecoration: 'none' }}>Links</a>}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section style={{ maxWidth: 960, margin: '0 auto', padding: '80px 40px 60px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 48, alignItems: 'center' }}>
          <div>
            {company.assistant_role && (
              <p style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 12, fontWeight: 600, letterSpacing: '0.15em',
                textTransform: 'uppercase', color: accent,
                marginBottom: 20,
              }}>
                {company.assistant_role}
              </p>
            )}
            <h1 style={{
              fontSize: 'clamp(2.5rem, 5vw, 4rem)',
              fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1,
              margin: '0 0 24px',
            }}>
              {company.name}
            </h1>
            {company.brand_description && (
              <p style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 16, lineHeight: 1.8, color: '#78716c',
                maxWidth: 500, margin: '0 0 40px',
              }}>
                {company.brand_description}
              </p>
            )}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link href={iaUrl} style={{
                fontFamily: "'DM Sans', sans-serif",
                padding: '12px 28px', borderRadius: 6, fontSize: 14, fontWeight: 600,
                background: '#1c1917', color: '#fafaf9', textDecoration: 'none',
                transition: 'background 0.2s',
              }}>
                Falar com o Assistente
              </Link>
              {contacts[0] && (
                <a href={contacts[0].href} target="_blank" rel="noopener noreferrer" style={{
                  fontFamily: "'DM Sans', sans-serif",
                  padding: '12px 28px', borderRadius: 6, fontSize: 14, fontWeight: 600,
                  background: 'transparent', border: '1px solid #d6d3d1',
                  color: '#1c1917', textDecoration: 'none',
                }}>
                  {contacts[0].label}
                </a>
              )}
            </div>
          </div>
          {logo && (
            <div style={{ flexShrink: 0 }}>
              <img src={logo} alt={company.name} style={{
                width: 180, height: 180, borderRadius: 20, objectFit: 'cover',
                boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
              }} />
            </div>
          )}
        </div>
      </section>

      {/* Divisor */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 40px' }}>
        <hr style={{ border: 'none', borderTop: '1px solid #e7e5e4' }} />
      </div>

      {/* Info + Contatos */}
      <section style={{ maxWidth: 960, margin: '0 auto', padding: '48px 40px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 40 }}>
          {company.business_hours && (
            <div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#a8a29e', marginBottom: 10 }}>Horários</p>
              <p style={{ fontSize: 15, lineHeight: 1.7, color: '#44403c' }}>{company.business_hours}</p>
            </div>
          )}
          {company.business_address && (
            <div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#a8a29e', marginBottom: 10 }}>Endereço</p>
              <p style={{ fontSize: 15, lineHeight: 1.7, color: '#44403c' }}>{company.business_address}</p>
            </div>
          )}
          {contacts.length > 0 && (
            <div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#a8a29e', marginBottom: 10 }}>Contato</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {contacts.map(c => (
                  <a key={c.href} href={c.href} target="_blank" rel="noopener noreferrer" style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 14, color: accent, textDecoration: 'underline',
                    textUnderlineOffset: 3,
                  }}>
                    {c.label}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <footer style={{
        borderTop: '1px solid #e7e5e4', padding: '24px 40px',
        textAlign: 'center', fontFamily: "'DM Sans', sans-serif",
        fontSize: 12, color: '#a8a29e',
      }}>
        Powered by <a href="https://minhai.app" style={{ color: '#78716c', textDecoration: 'none' }}>minhAi</a>
      </footer>
    </div>
  );
}
