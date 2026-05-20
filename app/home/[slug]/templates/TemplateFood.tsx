// app/home/[slug]/templates/TemplateFood.tsx
'use client';

import Link from 'next/link';
import { getContextualRoute } from '@/lib/routing-utils';
import type { LandingCompany } from '../page';

export default function TemplateFood({ company }: { company: LandingCompany }) {
  const accent = company.webapp_theme_color || '#dc2626';
  const logo = company.webapp_logo_url || company.logo_url;

  const iaUrl     = getContextualRoute('ia',     company.slug);
  const vendasUrl = company.modo_vendas_enabled ? getContextualRoute('vendas', company.slug) : null;
  const filaUrl   = company.modo_fila_enabled   ? getContextualRoute('fila',   company.slug) : null;
  const linksUrl  = company.modo_links_enabled  ? getContextualRoute('links',  company.slug) : null;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#1a0a00',
      color: '#fdf8f0',
      fontFamily: "'Playfair Display', 'Georgia', serif",
      position: 'relative',
    }}>
      {/* Texture overlay */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(220,38,38,0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(234,179,8,0.1) 0%, transparent 40%)',
      }} />

      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(26,10,0,0.92)', backdropFilter: 'blur(16px)',
        borderBottom: `2px solid ${accent}30`,
        padding: '0 32px',
      }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {logo && <img src={logo} alt={company.name} style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${accent}` }} />}
            <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' }}>{company.name}</span>
          </div>
          <div style={{ display: 'flex', gap: 6, fontFamily: "'DM Sans', sans-serif" }}>
            {vendasUrl && (
              <a href={vendasUrl} style={{
                padding: '8px 20px', borderRadius: 8, background: accent, color: '#fff',
                textDecoration: 'none', fontSize: 13, fontWeight: 600,
              }}>
                🍽️ Cardápio
              </a>
            )}
            {filaUrl && (
              <a href={filaUrl} style={{
                padding: '8px 20px', borderRadius: 8, background: 'rgba(255,255,255,0.08)',
                color: '#fdf8f0', textDecoration: 'none', fontSize: 13, fontWeight: 600,
              }}>
                Fila
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section style={{ maxWidth: 1000, margin: '0 auto', padding: '80px 32px 56px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        {logo && (
          <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'center' }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <div style={{
                position: 'absolute', inset: -8, borderRadius: '50%',
                background: `${accent}25`, border: `1px solid ${accent}40`,
              }} />
              <img src={logo} alt={company.name} style={{
                width: 100, height: 100, borderRadius: '50%', objectFit: 'cover',
                border: `3px solid ${accent}`, position: 'relative', zIndex: 1,
              }} />
            </div>
          </div>
        )}

        {company.assistant_role && (
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 12, fontWeight: 700, letterSpacing: '0.2em',
            textTransform: 'uppercase', color: accent, marginBottom: 16,
          }}>
            {company.assistant_role}
          </p>
        )}

        <h1 style={{
          fontSize: 'clamp(2.8rem, 7vw, 5rem)',
          fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.05,
          margin: '0 0 20px',
        }}>
          {company.name}
        </h1>

        {company.brand_description && (
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 16, lineHeight: 1.75, color: 'rgba(253,248,240,0.65)',
            maxWidth: 500, margin: '0 auto 44px',
          }}>
            {company.brand_description}
          </p>
        )}

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', fontFamily: "'DM Sans', sans-serif" }}>
          {vendasUrl ? (
            <Link href={vendasUrl} style={{
              padding: '16px 36px', borderRadius: 12, fontSize: 16, fontWeight: 700,
              background: `linear-gradient(135deg, ${accent}, #b91c1c)`,
              color: '#fff', textDecoration: 'none',
              boxShadow: `0 6px 28px ${accent}50`,
              transition: 'transform 0.2s',
            }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              🍽️ Ver Cardápio
            </Link>
          ) : (
            <Link href={iaUrl} style={{
              padding: '16px 36px', borderRadius: 12, fontSize: 16, fontWeight: 700,
              background: `linear-gradient(135deg, ${accent}, #b91c1c)`,
              color: '#fff', textDecoration: 'none',
              boxShadow: `0 6px 28px ${accent}50`,
            }}>
              🤖 Fazer Pedido
            </Link>
          )}
          <Link href={iaUrl} style={{
            padding: '16px 36px', borderRadius: 12, fontSize: 16, fontWeight: 600,
            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
            color: '#fdf8f0', textDecoration: 'none',
          }}>
            💬 Falar com IA
          </Link>
        </div>
      </section>

      {/* Info + Horários */}
      {(company.business_hours || company.business_address) && (
        <section style={{ maxWidth: 1000, margin: '0 auto', padding: '0 32px 56px', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {company.business_hours && (
              <div style={{
                background: 'rgba(255,255,255,0.04)', border: `1px solid ${accent}30`,
                borderRadius: 16, padding: '20px 24px',
              }}>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>🕐 Horários</p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'rgba(253,248,240,0.75)', lineHeight: 1.6 }}>{company.business_hours}</p>
              </div>
            )}
            {company.business_address && (
              <div style={{
                background: 'rgba(255,255,255,0.04)', border: `1px solid ${accent}30`,
                borderRadius: 16, padding: '20px 24px',
              }}>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>📍 Endereço</p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'rgba(253,248,240,0.75)', lineHeight: 1.6 }}>{company.business_address}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Contatos */}
      {(company.whatsapp_number || company.instagram_username || company.telefone_fixo) && (
        <section style={{ maxWidth: 600, margin: '0 auto', padding: '0 32px 80px', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', fontFamily: "'DM Sans', sans-serif" }}>
            {company.whatsapp_number && (
              <a href={`https://wa.me/${company.whatsapp_number.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer"
                style={{ padding: '10px 20px', borderRadius: 10, background: '#16a34a20', border: '1px solid #16a34a40', color: '#4ade80', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
                💬 WhatsApp
              </a>
            )}
            {company.instagram_username && (
              <a href={`https://instagram.com/${company.instagram_username.replace('@','')}`} target="_blank" rel="noopener noreferrer"
                style={{ padding: '10px 20px', borderRadius: 10, background: '#ec489920', border: '1px solid #ec489940', color: '#f472b6', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
                📸 Instagram
              </a>
            )}
            {company.telefone_fixo && (
              <a href={`tel:${company.telefone_fixo.replace(/\D/g,'')}`}
                style={{ padding: '10px 20px', borderRadius: 10, background: '#0ea5e920', border: '1px solid #0ea5e940', color: '#38bdf8', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
                📞 Ligar
              </a>
            )}
          </div>
        </section>
      )}

      <footer style={{
        borderTop: `1px solid ${accent}20`, padding: '20px 32px', textAlign: 'center',
        fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'rgba(253,248,240,0.3)',
        position: 'relative', zIndex: 1,
      }}>
        Powered by <a href="https://minhai.app" style={{ color: accent, textDecoration: 'none' }}>minhAi</a>
      </footer>
    </div>
  );
}
