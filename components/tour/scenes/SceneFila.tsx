'use client'
// components/tour/scenes/SceneFila.tsx
// Alterna entre PainelFila (metade do tempo) e Link (metade do tempo)

import { useEffect, useState } from 'react'

// ── Cores ────────────────────────────────────────────────────────
const BG      = '#0f172a'
const BG_CARD = '#1e293b'
const ACCENT  = '#3b82f6'
const ACCENT_LINK = '#f97316'

// ── Dados mock ───────────────────────────────────────────────────
const SENHAS_INICIAIS = ['A002','A003','A004','A005','A006','A007','A008','A009','A010','A011']

const CONTACTS = [
  {
    label: 'WhatsApp', color: '#25D366',
    icon: <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 14, height: 14 }}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>,
  },
  {
    label: 'Instagram', color: '#E1306C',
    icon: <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 14, height: 14 }}><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>,
  },
  {
    label: 'Facebook', color: '#1877F2',
    icon: <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 14, height: 14 }}><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>,
  },
  {
    label: 'Site', color: '#6366F1',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 14, height: 14 }}><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg>,
  },
  {
    label: 'E-mail', color: '#F59E0B',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 14, height: 14 }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>,
  },
]



// ── Componente Fila ───────────────────────────────────────────────
function PainelFila() {
  const [senhaAtual, setSenhaAtual] = useState('A001')
  const [proximas, setProximas]     = useState(SENHAS_INICIAIS)
  const [calling, setCalling]       = useState(false)

  useEffect(() => {
    const t = setInterval(() => {
      setCalling(true)
      setTimeout(() => {
        setSenhaAtual(prev => {
          const num = parseInt(prev.slice(1)) + 1
          return `A${String(num).padStart(3, '0')}`
        })
        setProximas(prev => {
          const next = prev.slice(1)
          const last = parseInt(prev[prev.length - 1].slice(1)) + 1
          return [...next, `A${String(last).padStart(3, '0')}`]
        })
        setCalling(false)
      }, 600)
    }, 3500)
    return () => clearInterval(t)
  }, [])

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden flex select-none"
      style={{ background: BG, padding: 12, gap: 12 }}
    >
      {/* Senha Atual */}
      <div
        className="flex flex-col items-center justify-center rounded-2xl border-2 flex-shrink-0"
        style={{
          flex: 3,
          background: BG_CARD,
          borderColor: ACCENT,
          boxShadow: calling ? `0 0 32px ${ACCENT}60` : `0 0 16px ${ACCENT}30`,
          transition: 'box-shadow 300ms ease',
          padding: '16px 12px',
        }}
      >
        <p
          className="tracking-widest font-semibold uppercase"
          style={{ color: 'rgba(255,255,255,0.45)', fontSize: 'clamp(0.5rem, 1.2vw, 0.7rem)', marginBottom: 8 }}
        >
          Senha Atual
        </p>
        <p
          className="font-bold text-white transition-all duration-300"
          style={{
            fontSize: 'clamp(2rem, 8vw, 5rem)',
            lineHeight: 1,
            transform: calling ? 'scale(1.06)' : 'scale(1)',
            textShadow: calling ? `0 0 20px ${ACCENT}` : 'none',
          }}
        >
          {senhaAtual}
        </p>
        <p
          className="mt-2 tracking-wider"
          style={{
            color: calling ? '#60a5fa' : 'rgba(255,255,255,0.35)',
            fontSize: 'clamp(0.45rem, 1vw, 0.6rem)',
            transition: 'color 300ms ease',
          }}
        >
          {calling ? '📣 Sendo Chamada' : 'Em Atendimento'}
        </p>
      </div>

      {/* Próximas Senhas */}
      <div
        className="flex flex-col rounded-2xl overflow-hidden flex-shrink-0"
        style={{ flex: 2, background: BG_CARD, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
      >
        <div
          className="flex items-center justify-between px-3 py-2 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p
            className="font-semibold tracking-widest uppercase"
            style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.4rem, 0.9vw, 0.55rem)' }}
          >
            Próximas
          </p>
          <span
            className="rounded-full px-1.5 py-0.5 font-bold"
            style={{ background: 'rgba(59,130,246,0.15)', color: '#93c5fd', fontSize: 'clamp(0.38rem, 0.85vw, 0.5rem)' }}
          >
            {proximas.length}
          </span>
        </div>
        <div
          className="flex-1 overflow-hidden p-2"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, alignContent: 'start' }}
        >
          {proximas.slice(0, 10).map((senha, i) => (
            <div
              key={senha}
              className="flex items-center justify-center rounded-lg font-bold text-white transition-all duration-300"
              style={{
                background: BG,
                border: `2px solid ${ACCENT}`,
                padding: '6px 4px',
                fontSize: 'clamp(0.55rem, 1.4vw, 0.8rem)',
                opacity: i === 0 ? 1 : 0.75,
              }}
            >
              {senha}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Componente Link ───────────────────────────────────────────────
function PaginaLink() {
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <div
      className="w-full h-full rounded-2xl flex flex-col select-none"
      style={{ background: BG, overflow: 'hidden' }}
    >
      {/* Conteúdo — sem overflow-y, tudo cabe na tela */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '10px 18px',
        gap: 8,
        overflow: 'hidden',
      }}>

        {/* Logo + nome — ícone de café SVG igual ao SceneTotem */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{
            width: 'clamp(36px, 9vw, 52px)',
            height: 'clamp(36px, 9vw, 52px)',
            borderRadius: '50%',
            background: 'rgba(245,158,11,0.15)',
            border: '2px solid rgba(245,158,11,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth={1.8} strokeLinecap="round"
              style={{ width: '55%', height: '55%' }}>
              <path d="M4 8h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8z" />
              <path d="M16 9h2.5a2.5 2.5 0 0 1 0 5H16" />
              <path d="M6 2v2" /><path d="M10 2v2" /><path d="M14 2v2" />
              <path d="M3 21h18" />
            </svg>
          </div>
          <p style={{ color: '#fff', fontWeight: 700, fontSize: 'clamp(0.65rem, 1.6vw, 0.88rem)', margin: 0, textAlign: 'center' }}>
            Café Exemplo
          </p>
          <p style={{ fontSize: 'clamp(0.42rem, 1vw, 0.58rem)', color: ACCENT_LINK, fontWeight: 600, margin: 0 }}>
            Agente IA
          </p>
        </div>

        {/* Label CONTATO */}
        <p style={{
          textAlign: 'center', fontSize: 'clamp(0.32rem, 0.75vw, 0.43rem)',
          fontWeight: 600, color: 'rgba(255,255,255,0.35)',
          letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0,
        }}>Contato</p>

        {/* Contatos — largura limitada para não esticar até a borda */}
        <div style={{ width: '80%', maxWidth: 260, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {CONTACTS.map((c) => (
            <div key={c.label} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '5px 10px',
              borderRadius: 10,
              background: hovered === c.label ? 'rgba(255,255,255,0.07)' : BG_CARD,
              border: '1px solid rgba(255,255,255,0.07)',
              cursor: 'pointer', transition: 'background 0.15s',
            }}
              onMouseEnter={() => setHovered(c.label)}
              onMouseLeave={() => setHovered(null)}
            >
              <span style={{ color: c.color, display: 'flex', alignItems: 'center', flexShrink: 0 }}>{c.icon}</span>
              <span style={{ flex: 1, textAlign: 'center', color: 'rgba(255,255,255,0.85)', fontSize: 'clamp(0.42rem, 1vw, 0.58rem)', fontWeight: 600 }}>
                {c.label}
              </span>
            </div>
          ))}
        </div>

        {/* Botão assistente */}
        <div style={{ width: '80%', maxWidth: 260 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '8px 14px',
            borderRadius: 12,
            background: `linear-gradient(135deg, ${ACCENT_LINK}, #10b981)`,
            color: '#ffffff', fontSize: 'clamp(0.48rem, 1.1vw, 0.65rem)', fontWeight: 700,
            boxShadow: `0 4px 20px ${ACCENT_LINK}40`, cursor: 'pointer',
          }}>
            Falar com o Assistente
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        textAlign: 'center', padding: '3px 0 5px',
        fontSize: 'clamp(0.32rem, 0.75vw, 0.42rem)',
        color: 'rgba(255,255,255,0.15)',
        borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0,
      }}>
        <strong>minhAi.app</strong> — Uma IA pra chamar de sua!
      </div>
    </div>
  )
}

// ── Cena principal: alterna Fila ↔ Link ──────────────────────────
const HALF = 5000 // ms em cada cena

export default function SceneFila() {
  const [showLink, setShowLink]     = useState(false)
  const [visible, setVisible]       = useState(true)

  useEffect(() => {
    const cycle = () => {
      // fade out
      setVisible(false)
      setTimeout(() => {
        setShowLink(s => !s)
        setVisible(true)
      }, 400)
    }
    const t = setInterval(cycle, HALF)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="w-full h-full relative" style={{ borderRadius: 16, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', inset: 0,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.4s ease',
      }}>
        {showLink ? <PaginaLink /> : <PainelFila />}
      </div>
    </div>
  )
}
