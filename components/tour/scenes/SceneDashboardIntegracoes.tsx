'use client'
// components/tour/scenes/SceneDashboardIntegracoes.tsx
// Loop entre 3 seções: Serviços Google · Serviços Meta · Integrações IA

import { useEffect, useRef, useState, useCallback } from 'react'

const BASE_W = 520
const BASE_H = 400

// ─── Ícones SVG ────────────────────────────────────────────────────────────
const IcoCalendar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)
const IcoMail = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
)
const IcoStar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
)
const IcoVideo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" />
  </svg>
)
const IcoSettings = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
  </svg>
)
const IcoChat = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
)
const IcoComment = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
  </svg>
)
const IcoZap = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
)
const IcoRefresh = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
  </svg>
)
const IcoLink = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
  </svg>
)
const IcoCopy = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
  </svg>
)
const IcoExternalLink = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
    <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
  </svg>
)
const IcoChevronDown = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
)
const IcoMapPin = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
  </svg>
)
const IcoPhone = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012 .92h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.09a16 16 0 006.72 6.72l1.45-1.24a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
  </svg>
)
const IcoGlobe = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
  </svg>
)
const IcoUser = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
)

// ─── Google Icon ─────────────────────────────────────────────────────────
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '100%', height: '100%' }}>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
)
const MetaIcon = () => (
  <svg viewBox="0 0 287.56 191" fill="rgba(255,255,255,0.8)" style={{ width: '100%', height: '100%' }}>
    <path d="M31.06,126c0,11,2.41,19.41,5.56,24.51A19,19,0,0,0,53.19,160c8.1,0,15.51-2,29.79-21.76,11.44-15.83,24.92-38,34-52l15.36-23.6c10.67-16.39,23-34.61,37.18-47C181.07,5.6,193.54,0,206.09,0c21.07,0,41.14,12.21,56.5,35.11,16.81,25.08,25,56.67,25,89.27,0,19.38-3.82,33.62-10.32,44.87C271,180.13,258.72,191,238.13,191V160c17.63,0,22-16.2,22-34.74,0-26.42-6.16-55.74-19.73-76.69-9.63-14.86-22.11-23.94-35.84-23.94-14.85,0-26.8,11.2-40.23,31.17-7.14,10.61-14.47,23.54-22.7,38.13l-9.06,16c-18.2,32.27-22.81,39.62-31.91,51.75C84.74,183,71.12,191,53.19,191c-21.27,0-34.72-9.21-43-23.09C3.34,156.6,0,141.76,0,124.85Z"/>
    <path d="M24.49,37.3C38.73,15.35,59.28,0,82.85,0c13.65,0,27.22,4,41.39,15.61,15.5,12.65,32,33.48,52.63,67.81l7.39,12.32c17.84,29.72,28,45,33.93,52.22,7.64,9.26,13,12,19.94,12,17.63,0,22-16.2,22-34.74l27.4-.86c0,19.38-3.82,33.62-10.32,44.87C271,180.13,258.72,191,238.13,191c-12.8,0-24.14-2.78-36.68-14.61-9.64-9.08-20.91-25.21-29.58-39.71L146.08,93.6c-12.94-21.62-24.81-37.74-31.68-45C107,40.71,97.51,31.23,82.35,31.23c-12.27,0-22.69,8.61-31.41,21.78Z"/>
    <path d="M82.35,31.23c-12.27,0-22.69,8.61-31.41,21.78C38.61,71.62,31.06,99.34,31.06,126c0,11,2.41,19.41,5.56,24.51L10.14,167.91C3.34,156.6,0,141.76,0,124.85,0,94.1,8.44,62.05,24.49,37.3,38.73,15.35,59.28,0,82.85,0Z"/>
  </svg>
)

// ─── Shared primitives ─────────────────────────────────────────────────────
const S = {
  card: {
    background: 'rgba(30,41,59,0.6)',
    border: '0.5px solid rgba(255,255,255,0.08)',
    borderRadius: 10,
  } as React.CSSProperties,
  tab: (active: boolean, color = '#3b82f6'): React.CSSProperties => ({
    flex: 1, padding: '7px 4px', fontSize: 9.5, fontWeight: active ? 600 : 400,
    color: active ? '#fff' : 'rgba(255,255,255,0.45)',
    borderBottom: active ? `2px solid ${color}` : '2px solid transparent',
    background: 'transparent', cursor: 'pointer', textAlign: 'center',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
    transition: 'all 200ms ease', whiteSpace: 'nowrap',
  }),
  badge: (color: string): React.CSSProperties => ({
    padding: '2px 6px', borderRadius: 20, fontSize: 8, fontWeight: 600,
    background: color + '22', color: color, flexShrink: 0,
  }),
  connectedPill: {
    display: 'flex', alignItems: 'center', gap: 4,
    padding: '3px 8px', borderRadius: 20, fontSize: 8.5, fontWeight: 600,
    background: 'rgba(34,197,94,0.1)', border: '0.5px solid rgba(34,197,94,0.3)',
    color: '#4ade80', flexShrink: 0,
  } as React.CSSProperties,
}

function Toggle({ on }: { on: boolean }) {
  return (
    <div style={{
      width: 34, height: 19, borderRadius: 10, position: 'relative', flexShrink: 0,
      background: on ? '#3b82f6' : 'rgba(255,255,255,0.15)',
      transition: 'background 300ms',
    }}>
      <div style={{
        position: 'absolute', top: 2.5, left: on ? 17 : 2.5,
        width: 14, height: 14, borderRadius: '50%', background: '#fff',
        transition: 'left 300ms', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SEÇÃO 1: SERVIÇOS GOOGLE
// ═══════════════════════════════════════════════════════════════════════════
type GTab = 'agenda' | 'emails' | 'negocio' | 'meet'
const G_TABS: { id: GTab; label: string; count?: number; Icon: React.FC }[] = [
  { id: 'agenda',  label: 'Agenda',          count: 69, Icon: IcoCalendar },
  { id: 'emails',  label: 'Emails Enviados', count: 20, Icon: IcoMail     },
  { id: 'negocio', label: 'Meu Negócio',              Icon: IcoStar      },
  { id: 'meet',    label: 'Vídeo · Meet',              Icon: IcoVideo     },
]

const CAL_DAYS = [31,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,1,2,3,4]
const CAL_EVENTS: Record<number, string> = { 4: '08 Aniversario Pai', 6: '21 Os Melhores...', 29: '10:30 Mih' }

function GoogleAgendaTab() {
  const today = 10
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* Nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 18, height: 18, borderRadius: 4, background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 10, height: 10 }}><polyline points="15 18 9 12 15 6" /></svg>
          </div>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', padding: '3px 8px', borderRadius: 5, background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)' }}>Hoje</span>
          <div style={{ width: 18, height: 18, borderRadius: 4, background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 10, height: 10 }}><polyline points="9 18 15 12 9 6" /></svg>
          </div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>Junho De 2026</span>
        <div style={{ display: 'flex', gap: 2 }}>
          {['Mês', 'Semana', 'Lista'].map((v, i) => (
            <span key={v} style={{
              fontSize: 8.5, padding: '3px 7px', borderRadius: 4, cursor: 'pointer',
              background: i === 0 ? '#2563eb' : 'transparent',
              color: i === 0 ? '#fff' : 'rgba(255,255,255,0.45)',
              border: i === 0 ? 'none' : '0.5px solid rgba(255,255,255,0.1)',
            }}>{v}</span>
          ))}
        </div>
      </div>
      {/* Calendar grid */}
      <div style={{ ...S.card, overflow: 'hidden' }}>
        {/* Days header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
          {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => (
            <div key={d} style={{ padding: '4px 0', textAlign: 'center', fontSize: 8, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>{d}</div>
          ))}
        </div>
        {/* Weeks */}
        {[0,1,2,3,4].map(week => (
          <div key={week} style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}>
            {CAL_DAYS.slice(week * 7, week * 7 + 7).map((day, col) => {
              const isToday = week === 1 && col === 2 // 10 is row 1, col 2 (Wed)
              const evKey = week * 7 + col
              const ev = CAL_EVENTS[evKey]
              return (
                <div key={col} style={{
                  minHeight: 28, padding: '3px 4px',
                  background: isToday ? 'rgba(84,100,40,0.3)' : 'transparent',
                  borderRight: col < 6 ? '0.5px solid rgba(255,255,255,0.04)' : 'none',
                }}>
                  <span style={{ fontSize: 8, color: (week === 0 || evKey >= 31) ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.6)' }}>{day}</span>
                  {ev && (
                    <div style={{ fontSize: 7, color: '#60a5fa', background: 'rgba(59,130,246,0.12)', borderRadius: 3, padding: '1px 3px', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ev}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function GoogleEmailsTab() {
  const emails = [
    { to: 'cafe@exemplo.com.br', subject: 'PIX recebido! R$ 89,90 — Café Exemplo', sub: 'PIX confirmado: 4s1alpx9v07qf5co5in02nex7cn03xzth9m' },
    { to: 'cafe@exemplo.com.br', subject: 'PIX recebido! R$ 45,00 — Café Exemplo', sub: 'PIX confirmado: l25s0fabrornrvwbzajj4ut2pxk730ul1bp' },
    { to: 'cafe@exemplo.com.br', subject: 'PIX recebido! R$ 12,50 — Café Exemplo', sub: 'PIX confirmado: t8cnn5tdxthnniadxlfnpiuvwm303st7hdlt' },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ ...S.card, padding: '7px 10px', background: 'rgba(37,99,235,0.12)', border: '0.5px solid rgba(59,130,246,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 11, height: 11, color: '#60a5fa' }}><IcoMail /></div>
          <span style={{ fontSize: 9, color: '#93c5fd' }}>Exibindo apenas emails enviados pelo assistente.</span>
        </div>
      </div>
      {emails.map((e, i) => (
        <div key={i} style={{ ...S.card, padding: '8px 10px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 3 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 11, height: 11, color: 'rgba(255,255,255,0.4)' }}><IcoUser /></div>
              <span style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.5)' }}>Para: {e.to}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)' }}>Ontem</span>
              <div style={{ width: 12, height: 12, color: 'rgba(255,255,255,0.3)' }}><IcoChevronDown /></div>
            </div>
          </div>
          <p style={{ fontSize: 9.5, fontWeight: 600, color: '#fff', margin: '0 0 2px' }}>{e.subject}</p>
          <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.sub}</p>
        </div>
      ))}
    </div>
  )
}

function GoogleNegocioTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {/* Business card */}
      <div style={{ ...S.card, overflow: 'hidden' }}>
        <div style={{
          height: 60, background: 'linear-gradient(135deg, #1e3a1e 0%, #2d5a1e 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'rgba(255,255,255,0.2)', fontSize: 9,
        }}>
          <span style={{ opacity: 0.5 }}>foto da empresa</span>
        </div>
        <div style={{ padding: '8px 10px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>Café Exemplo</p>
            <p style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.4)', margin: '0 0 2px' }}>R. das Flores, 123 – São Paulo – SP</p>
            <a style={{ fontSize: 8.5, color: '#60a5fa' }}>http://cafeexemplo.com/</a>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#fbbf24', margin: '0 0 2px' }}>4.1</p>
            <div style={{ display: 'flex', gap: 1 }}>
              {[1,2,3,4].map(i => <div key={i} style={{ width: 8, height: 8, color: '#fbbf24' }}><IcoStar /></div>)}
              <div style={{ width: 8, height: 8, color: 'rgba(255,255,255,0.2)' }}><IcoStar /></div>
            </div>
            <p style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.3)', margin: '2px 0 0' }}>63 avaliações</p>
          </div>
        </div>
      </div>
      {/* Apply data section */}
      <div style={{ ...S.card, padding: '8px 10px' }}>
        <p style={{ fontSize: 8.5, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px' }}>APLICAR DADOS DO GOOGLE NO MINHAI</p>
        {[
          { ico: IcoUser, label: 'Nome', val: 'Café Exemplo' },
          { ico: IcoPhone, label: 'Telefone', val: '(11) 99999-0000' },
          { ico: IcoGlobe, label: 'Site', val: 'http://cafeexemplo.com/' },
          { ico: IcoMapPin, label: 'Endereço', val: 'R. das Flores, 123 – São Paulo – SP' },
        ].map(row => (
          <div key={row.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, color: 'rgba(255,255,255,0.35)' }}><row.ico /></div>
              <div>
                <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', margin: '0 0 1px' }}>{row.label}</p>
                <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.75)', margin: 0 }}>{row.val}</p>
              </div>
            </div>
            <span style={{ fontSize: 8, padding: '3px 7px', borderRadius: 6, background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '0.5px solid rgba(59,130,246,0.3)', fontWeight: 600 }}>Usar no minhAi</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function GoogleMeetTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', paddingTop: 8 }}>
      <div style={{ ...S.card, padding: '14px 16px', width: '100%', maxWidth: 320 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ width: 26, height: 26, borderRadius: 8, background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 14, height: 14, color: '#4ade80' }}><IcoVideo /></div>
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#fff', margin: 0 }}>Agendar reunião via Google Meet</p>
            <p style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.35)', margin: 0 }}>O convite será enviado automaticamente pelo Google Calendar</p>
          </div>
        </div>
        {[
          { label: 'Título da reunião', value: 'Reunião', full: true },
        ].map(f => (
          <div key={f.label} style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', display: 'block', marginBottom: 3 }}>{f.label}</label>
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 7, padding: '6px 9px', fontSize: 10, color: '#fff' }}>
              {f.value}
            </div>
          </div>
        ))}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          {[{ label: 'Data', value: '10/06/2026' }, { label: 'Hora', value: '13:07' }].map(f => (
            <div key={f.label}>
              <label style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', display: 'block', marginBottom: 3 }}>{f.label}</label>
              <div style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 7, padding: '6px 9px', fontSize: 10, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {f.value}
                <div style={{ width: 11, height: 11, color: 'rgba(255,255,255,0.3)' }}>
                  {f.label === 'Data' ? <IcoCalendar /> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: '100%', height: '100%' }}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', display: 'block', marginBottom: 3 }}>Email do participante</label>
          <div style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 7, padding: '6px 9px', fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>
            participante@email.com
          </div>
          <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', margin: '3px 0 0' }}>O Google Calendar envia o convite com o link automaticamente.</p>
        </div>
        <div style={{ background: '#2563eb', borderRadius: 8, padding: '8px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <div style={{ width: 11, height: 11, color: '#fff' }}><IcoVideo /></div>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>Agendar e enviar convite</span>
        </div>
      </div>
    </div>
  )
}

function ServicoGoogle({ tab }: { tab: GTab }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Page header */}
      <div style={{ marginBottom: 10, flexShrink: 0 }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>Serviços Google</p>
        <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', margin: 0 }}>Calendário, emails, Drive, Smart Home, Google Meu Negócio e Meet</p>
      </div>
      {/* Connected as */}
      <div style={{ ...S.card, padding: '7px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 14, height: 14 }}><GoogleIcon /></div>
          </div>
          <div>
            <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', margin: '0 0 1px' }}>Conectado como</p>
            <p style={{ fontSize: 9.5, fontWeight: 600, color: '#34A853', margin: 0 }}>cafe@exemplo.com.br</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {['Atualizar', 'Gerenciar'].map((l, i) => (
            <span key={l} style={{ fontSize: 9, color: i === 0 ? 'rgba(255,255,255,0.55)' : '#60a5fa', display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
              {i === 0 && <div style={{ width: 10, height: 10 }}><IcoRefresh /></div>}
              {l}
            </span>
          ))}
        </div>
      </div>
      {/* Sub-tabs */}
      <div style={{ display: 'flex', borderBottom: '0.5px solid rgba(255,255,255,0.08)', marginBottom: 10, flexShrink: 0 }}>
        {G_TABS.map(t => (
          <div key={t.id} style={S.tab(tab === t.id, '#3b82f6')}>
            <div style={{ width: 10, height: 10, opacity: 0.7 }}><t.Icon /></div>
            {t.label}
            {t.count && (
              <span style={{ fontSize: 8, background: tab === t.id ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.1)', color: tab === t.id ? '#93c5fd' : 'rgba(255,255,255,0.5)', borderRadius: 20, padding: '1px 5px', fontWeight: 600 }}>
                {t.count}
              </span>
            )}
          </div>
        ))}
      </div>
      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {tab === 'agenda'  && <GoogleAgendaTab />}
        {tab === 'emails'  && <GoogleEmailsTab />}
        {tab === 'negocio' && <GoogleNegocioTab />}
        {tab === 'meet'    && <GoogleMeetTab />}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SEÇÃO 2: SERVIÇOS META
// ═══════════════════════════════════════════════════════════════════════════
type MTab = 'conexoes' | 'conversas' | 'comentarios' | 'funcoes'
const M_TABS: { id: MTab; label: string; Icon: React.FC }[] = [
  { id: 'conexoes',    label: 'Conexões',    Icon: IcoSettings },
  { id: 'conversas',  label: 'Conversas',  Icon: IcoChat     },
  { id: 'comentarios',label: 'Comentários',Icon: IcoComment  },
  { id: 'funcoes',    label: 'Funções',     Icon: IcoZap      },
]

function MetaConexoesTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ ...S.card, padding: '10px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <div style={{ width: 14, height: 14, color: '#60a5fa' }}><MetaIcon /></div>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>Conexões Meta</span>
        </div>
        <p style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.4)', margin: '0 0 8px' }}>1 conexão ativa</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
          <div style={{ padding: '7px 10px', borderRadius: 7, background: 'rgba(37,211,102,0.08)', border: '0.5px solid rgba(37,211,102,0.4)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg viewBox="0 0 24 24" fill="#25D366" style={{ width: 12, height: 12 }}>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <span style={{ fontSize: 9, fontWeight: 600, color: '#25D366' }}>WhatsApp</span>
          </div>
          <div style={{ padding: '7px 10px', borderRadius: 7, background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg viewBox="0 0 24 24" fill="#E1306C" style={{ width: 11, height: 11 }}><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" fill="none" stroke="#E1306C" strokeWidth={2}/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" stroke="#E1306C" strokeWidth={2}/></svg>
            <svg viewBox="0 0 24 24" fill="#1877F2" style={{ width: 11, height: 11 }}><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            <span style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>Instagram / Facebook</span>
          </div>
        </div>
        {/* BigCorps connection */}
        <div style={{ ...S.card, padding: '8px 10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
            <svg viewBox="0 0 24 24" fill="#1877F2" style={{ width: 12, height: 12 }}><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>Café Exemplo</span>
            <svg viewBox="0 0 24 24" fill="#4ade80" style={{ width: 10, height: 10 }}><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div style={{ fontSize: 8.5, color: '#E1306C', marginBottom: 2 }}>@cafeexemplo</div>
          <div style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>WhatsApp: +55 11 99999-0000 · Respostas automáticas ativas</div>
          {/* Saudação */}
          <div style={{ border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 7, padding: '7px 9px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 10, height: 10, color: 'rgba(255,255,255,0.5)' }}><IcoChat /></div>
                <span style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Saudação Inicial</span>
              </div>
              <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)' }}>Nenhum texto salvo</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 6 }}>
              <div style={{ padding: '5px 0', background: '#2563eb', borderRadius: 5, textAlign: 'center', fontSize: 8.5, fontWeight: 600, color: '#fff' }}>Texto</div>
              <div style={{ padding: '5px 0', background: 'rgba(255,255,255,0.05)', borderRadius: 5, textAlign: 'center', fontSize: 8.5, color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                <div style={{ width: 9, height: 9 }}><IcoZap /></div>Função
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '6px 8px', fontSize: 8.5, color: 'rgba(255,255,255,0.25)', minHeight: 40 }}>
              Ex: Olá! Posso te ajudar com orçamentos, endereço ou PIX. O que precisa?
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetaConversasTab() {
  const convs = [
    { name: 'Ana Souza', msg: 'Qual o horário de funcionamento?', platform: 'WhatsApp', color: '#25D366', ago: '2min' },
    { name: 'Miriam Insta', msg: 'Vocês fazem entrega?', platform: 'Instagram', color: '#E1306C', ago: '47d' },
    { name: 'Carlos Face', msg: 'Qual o WhatsApp?', platform: 'Facebook', color: '#1877F2', ago: '104d' },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ ...S.card, padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 12, color: '#60a5fa' }}><IcoChat /></div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#fff', margin: 0 }}>Conversas</p>
            <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', margin: 0 }}>3 conversas</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          {['Todas', 'WhatsApp', 'Instagram', 'Facebook'].map((f, i) => (
            <span key={f} style={{
              fontSize: 8, padding: '2px 6px', borderRadius: 20, fontWeight: i === 0 ? 700 : 400,
              background: i === 0 ? '#2563eb' : 'transparent',
              color: i === 0 ? '#fff' : 'rgba(255,255,255,0.45)',
              border: i === 0 ? 'none' : '0.5px solid rgba(255,255,255,0.15)',
            }}>{f}</span>
          ))}
        </div>
      </div>
      {convs.map((c, i) => (
        <div key={i} style={{ ...S.card, padding: '8px 10px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', flexShrink: 0 }} />
              <div style={{ width: 12, height: 12, color: 'rgba(255,255,255,0.4)' }}><IcoUser /></div>
              <span style={{ fontSize: 10, fontWeight: 600, color: '#fff' }}>{c.name}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ ...S.badge(c.color) }}>{c.platform}</span>
              <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)' }}>{c.ago}</span>
            </div>
          </div>
          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', margin: '0 0 6px', paddingLeft: 18 }}>{c.msg}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4 }}>
            {[
              { l: 'Pausar',    bg: 'rgba(245,158,11,0.15)',  c: '#fbbf24' },
              { l: 'Responder', bg: 'rgba(59,130,246,0.15)',  c: '#60a5fa' },
              { l: 'Ver',       bg: 'rgba(34,197,94,0.12)',   c: '#4ade80' },
              { l: 'Ações',     bg: 'rgba(255,255,255,0.06)', c: 'rgba(255,255,255,0.55)' },
            ].map(btn => (
              <div key={btn.l} style={{ padding: '4px 0', borderRadius: 5, background: btn.bg, color: btn.c, fontSize: 8, fontWeight: 600, textAlign: 'center' }}>
                {btn.l}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function MetaComentariosTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={{ ...S.card, padding: '10px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13 }}>💬</span>
            <div>
              <p style={{ fontSize: 10.5, fontWeight: 700, color: '#fff', margin: 0 }}>Comentários Automáticos</p>
              <p style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0', maxWidth: 260, lineHeight: 1.4 }}>
                Configure respostas automáticas para comentários no Facebook e Instagram.
              </p>
            </div>
          </div>
          <span style={{ ...S.badge('#4ade80'), fontSize: 8.5, padding: '3px 8px' }}>1 ativa</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 8.5, color: 'rgba(255,255,255,0.4)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth={2} style={{ width: 10, height: 10 }}><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
          Cada comentário respondido consome <strong style={{ color: 'rgba(255,255,255,0.7)' }}>1 crédito</strong>
        </div>
      </div>
      <div style={{ ...S.card, padding: '10px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg viewBox="0 0 24 24" fill="#1877F2" style={{ width: 12, height: 12 }}><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            <svg viewBox="0 0 24 24" fill="#E1306C" style={{ width: 12, height: 12 }}><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" fill="none" stroke="#E1306C" strokeWidth={2}/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" stroke="#E1306C" strokeWidth={2}/></svg>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>Café Exemplo</span>
            <span style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.4)' }}>@cafeexemplo</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 9, color: '#4ade80' }}>Ativo</span>
            <Toggle on={true} />
          </div>
        </div>
        {/* Modo de resposta */}
        {[
          { label: 'Modo de resposta', desc: 'Defina quando o assistente deve responder comentários', open: true },
        ].map(section => (
          <div key={section.label} style={{ border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 8, marginBottom: 6, overflow: 'hidden' }}>
            <div style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 11, height: 11, color: 'rgba(255,255,255,0.5)' }}><IcoComment /></div>
                <div>
                  <p style={{ fontSize: 9.5, fontWeight: 600, color: '#fff', margin: 0 }}>{section.label}</p>
                  <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', margin: 0 }}>{section.desc}</p>
                </div>
              </div>
              <div style={{ width: 12, height: 12, color: 'rgba(255,255,255,0.4)', transform: section.open ? 'rotate(180deg)' : 'none' }}><IcoChevronDown /></div>
            </div>
            {section.open && (
              <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
                {[
                  { label: 'Todos os comentários', desc: 'Responde automaticamente a qualquer comentário nos posts', active: true },
                  { label: 'Apenas com palavras-chave', desc: 'Responde somente quando o comentário contiver as palavras definidas', active: false },
                ].map(opt => (
                  <div key={opt.label} style={{ padding: '8px 10px', display: 'flex', alignItems: 'flex-start', gap: 8, borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}>
                    <div style={{
                      width: 14, height: 14, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                      border: `2px solid ${opt.active ? '#3b82f6' : 'rgba(255,255,255,0.2)'}`,
                      background: opt.active ? '#3b82f6' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {opt.active && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#fff' }} />}
                    </div>
                    <div>
                      <p style={{ fontSize: 9.5, fontWeight: opt.active ? 600 : 400, color: opt.active ? '#fff' : 'rgba(255,255,255,0.6)', margin: '0 0 1px' }}>{opt.label}</p>
                      <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', margin: 0 }}>{opt.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {[
          { ico: '🔵', label: 'Resposta pública no comentário', desc: 'Texto exibido publicamente como reply no comentário' },
          { ico: '📸', label: 'Mensagem privada automática (DM)', desc: 'Enviada automaticamente no inbox de quem comentou' },
        ].map(row => (
          <div key={row.label} style={{ border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11 }}>{row.ico}</span>
              <div>
                <p style={{ fontSize: 9.5, fontWeight: 600, color: '#fff', margin: 0 }}>{row.label}</p>
                <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', margin: 0 }}>{row.desc}</p>
              </div>
            </div>
            <div style={{ width: 12, height: 12, color: 'rgba(255,255,255,0.35)' }}><IcoChevronDown /></div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ServicoMeta({ tab }: { tab: MTab }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ marginBottom: 10, flexShrink: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>Serviços Meta</p>
          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', margin: 0 }}>Configure seus assistentes para WhatsApp, Instagram e Facebook.</p>
        </div>
        <span style={{ fontSize: 9, padding: '4px 8px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 10, height: 10 }}><IcoComment /></div>Ajuda
        </span>
      </div>
      <div style={{ display: 'flex', borderBottom: '0.5px solid rgba(255,255,255,0.08)', marginBottom: 10, flexShrink: 0 }}>
        {M_TABS.map(t => (
          <div key={t.id} style={S.tab(tab === t.id, '#3b82f6')}>
            <div style={{ width: 10, height: 10, opacity: 0.7 }}><t.Icon /></div>
            {t.label}
          </div>
        ))}
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {tab === 'conexoes'    && <MetaConexoesTab />}
        {tab === 'conversas'  && <MetaConversasTab />}
        {tab === 'comentarios' && <MetaComentariosTab />}
        {tab === 'funcoes'    && <MetaConexoesTab />}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SEÇÃO 3: INTEGRAÇÕES IA
// ═══════════════════════════════════════════════════════════════════════════
function ServicoIA() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 10 }}>
      <div style={{ flexShrink: 0 }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>Integrações IA</p>
        <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
          Conecte o assistente <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Café Exemplo</strong> ao Claude, ChatGPT e outros via MCP.
        </p>
      </div>

      {/* MCP URL */}
      <div style={{ ...S.card, padding: '10px 12px', background: 'rgba(37,99,235,0.1)', border: '0.5px solid rgba(59,130,246,0.3)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#60a5fa' }}>
            <div style={{ width: 11, height: 11 }}><IcoZap /></div>
            <span style={{ fontSize: 9, fontWeight: 600 }}>URL do servidor MCP</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 9px', borderRadius: 7, background: '#2563eb', color: '#fff', fontSize: 8.5, fontWeight: 600, cursor: 'pointer' }}>
            <div style={{ width: 10, height: 10 }}><IcoCopy /></div>
            Copiar URL
          </div>
        </div>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'monospace', margin: '0 0 4px' }}>https://mcp.minhai.app</p>
        <p style={{ fontSize: 8.5, color: '#60a5fa', margin: 0 }}>Cole essa URL no campo de connector de qualquer plataforma compatível com MCP</p>
      </div>

      {/* Conexões ativas */}
      <div style={{ flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <div style={{ width: 13, height: 13, color: '#4ade80' }}><IcoLink /></div>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>Conexões ativas</span>
        </div>
        <div style={{ ...S.card, padding: '20px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 28, height: 28, color: 'rgba(255,255,255,0.2)' }}><IcoLink /></div>
          <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.5)', margin: 0 }}>Nenhuma conexão ativa</p>
          <p style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.3)', margin: 0 }}>Use as instruções abaixo para conectar o Claude ou ChatGPT</p>
        </div>
      </div>

      {/* Plataformas disponíveis */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <div style={{ width: 13, height: 13, color: '#fbbf24' }}><IcoZap /></div>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>Plataformas disponíveis</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            {
              name: 'ChatGPT', badge: 'Disponível', badgeColor: '#4ade80',
              sub: 'Requer plano Plus ou superior',
              plans: 'Planos: Plus, Pro, Team, Enterprise',
              logo: (
                <svg viewBox="0 0 24 24" fill="rgba(255,255,255,0.8)" style={{ width: 18, height: 18 }}>
                  <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494z"/>
                </svg>
              ),
              steps: [
                'Ative o Developer Mode nas configurações',
                'Acesse Settings → Connectors → Add',
                'Cole a URL: https://mcp.minhai.app',
                'Faça login com sua conta minhAi',
              ],
            },
            {
              name: 'Claude', badge: 'Disponível', badgeColor: '#4ade80',
              sub: '1 connector no plano gratuito',
              plans: 'Planos: Free, Pro, Max, Team, Enterprise',
              logo: (
                <svg viewBox="0 0 128 128" fill="none" style={{ width: 18, height: 18 }}>
                  <path d="M64 8C33.1 8 8 33.1 8 64s25.1 56 56 56 56-25.1 56-56S94.9 8 64 8zm0 98c-23.2 0-42-18.8-42-42s18.8-42 42-42 42 18.8 42 42-18.8 42-42 42z" fill="#d97706"/>
                  <path d="M76 44H52l-8 20 8 4 4-10v26h8V58l4 10 8-4z" fill="#d97706"/>
                </svg>
              ),
              steps: [
                'Acesse Settings → Connectors → Add custom connector',
                'Cole a URL: https://mcp.minhai.app',
                'Faça login com sua conta minhAi',
                'Selecione o assistente e autorize',
              ],
            },
          ].map(p => (
            <div key={p.name} style={{ ...S.card, padding: '10px 10px', display: 'flex', flexDirection: 'column', gap: 7 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {p.logo}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{p.name}</span>
                      <span style={{ ...S.badge(p.badgeColor), fontSize: 8 }}>{p.badge}</span>
                    </div>
                    <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{p.sub}</p>
                  </div>
                </div>
                <div style={{ width: 13, height: 13, color: 'rgba(255,255,255,0.3)' }}><IcoExternalLink /></div>
              </div>
              <div>
                <p style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 5px' }}>COMO CONECTAR</p>
                {p.steps.map((step, i) => (
                  <div key={i} style={{ display: 'flex', gap: 5, marginBottom: 3 }}>
                    <span style={{ fontSize: 8, fontWeight: 700, color: '#60a5fa', flexShrink: 0, minWidth: 10 }}>{i + 1}</span>
                    <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.55)', lineHeight: 1.4 }}>{step}</span>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.25)', margin: 0 }}>{p.plans}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
type Section = 'google' | 'meta' | 'ia'
const SECTION_SEQ: Section[] = ['google', 'meta', 'ia']
const G_TAB_SEQ: GTab[] = ['agenda', 'emails', 'negocio', 'meet']
const M_TAB_SEQ: MTab[] = ['conexoes', 'conversas', 'comentarios']

export default function SceneDashboardIntegracoes() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [sectionIdx, setSectionIdx] = useState(0)
  const [gTabIdx, setGTabIdx] = useState(0)
  const [mTabIdx, setMTabIdx] = useState(0)
  const [visible, setVisible] = useState(true)

  const recalc = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const { width: w, height: h } = el.getBoundingClientRect()
    setScale(Math.min(1, (w - 12) / BASE_W, (h - 12) / BASE_H))
  }, [])

  useEffect(() => {
    recalc()
    const ro = new ResizeObserver(recalc)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [recalc])

  useEffect(() => {
    // Cada sub-aba fica 2.6s antes de trocar
    // Depois de esgotar sub-abas, troca de seção com fade
    const SUB_DURATION = 2600
    const FADE_DURATION = 350

    const t = setTimeout(() => {
      const section = SECTION_SEQ[sectionIdx]

      if (section === 'google') {
        const nextGTab = gTabIdx + 1
        if (nextGTab < G_TAB_SEQ.length) {
          setGTabIdx(nextGTab)
        } else {
          // Troca de seção
          setVisible(false)
          setTimeout(() => {
            setSectionIdx((sectionIdx + 1) % SECTION_SEQ.length)
            setGTabIdx(0)
            setMTabIdx(0)
            setVisible(true)
          }, FADE_DURATION)
        }
      } else if (section === 'meta') {
        const nextMTab = mTabIdx + 1
        if (nextMTab < M_TAB_SEQ.length) {
          setMTabIdx(nextMTab)
        } else {
          setVisible(false)
          setTimeout(() => {
            setSectionIdx((sectionIdx + 1) % SECTION_SEQ.length)
            setGTabIdx(0)
            setMTabIdx(0)
            setVisible(true)
          }, FADE_DURATION)
        }
      } else {
        // IA: só uma tela, troca depois de 5s total
        setVisible(false)
        setTimeout(() => {
          setSectionIdx(0)
          setGTabIdx(0)
          setMTabIdx(0)
          setVisible(true)
        }, FADE_DURATION)
      }
    }, SUB_DURATION)

    return () => clearTimeout(t)
  }, [sectionIdx, gTabIdx, mTabIdx])

  const section = SECTION_SEQ[sectionIdx]

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%', height: '100%',
        background: '#020617',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <div style={{
        width: BASE_W, height: BASE_H,
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
        flexShrink: 0,
        background: '#0f172a',
        borderRadius: 14,
        overflow: 'hidden',
        border: '0.5px solid rgba(255,255,255,0.1)',
        padding: '14px 16px',
        opacity: visible ? 1 : 0,
        transition: 'opacity 350ms ease',
      }}>
        {section === 'google' && <ServicoGoogle tab={G_TAB_SEQ[gTabIdx]} />}
        {section === 'meta'   && <ServicoMeta   tab={M_TAB_SEQ[mTabIdx]} />}
        {section === 'ia'     && <ServicoIA />}
      </div>
    </div>
  )
}