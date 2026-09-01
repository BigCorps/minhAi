'use client'
// components/tour/scenes/SceneQRCode.tsx

import { useEffect, useState } from 'react'

type QRType = 'whatsapp' | 'pix' | 'marca' | 'cep'

const QR_SEQUENCE: QRType[] = ['whatsapp', 'pix', 'marca', 'cep']

// Durations in ms — aligned to stage2-script fallbackDuration
const DURATIONS: Record<QRType, number> = {
  whatsapp: 2000,
  pix:      3000,
  marca:    3000,
  cep:      3000,
}

const BG = 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'

// ── Logo do Café (igual SceneTotem) ─────────────────────────
function CafeLogo({ color = '#f59e0b', size = 22 }: { color?: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round"
      style={{ width: size, height: size }}>
      <path d="M4 8h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8z" />
      <path d="M16 9h2.5a2.5 2.5 0 0 1 0 5H16" />
      <path d="M6 2v2M10 2v2M14 2v2M3 21h18" />
    </svg>
  )
}

function QRImage({ alt }: { alt: string }) {
  return <img src="/qrcode.png" alt={alt} className="w-full h-full object-contain block" />
}

function TimerBadge({ t }: { t: number }) {
  return (
    <div className="px-2 py-0.5 rounded-full font-semibold"
      style={{ background: 'rgba(59,130,246,0.2)', color: '#93c5fd', fontSize: 10 }}>
      {t}s
    </div>
  )
}

function CopyIcon({ size = 10 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round"
      width={size} height={size}>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

const cardBase: React.CSSProperties = {
  background: '#0f172a',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 16,
  overflow: 'hidden',
}

const hdrStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)',
}

// ── CARDS ─────────────────────────────────────────────────────

function WhatsAppCard({ t }: { t: number }) {
  return (
    <div style={{ ...cardBase, width: 'clamp(180px, 44%, 270px)' }}>
      <div style={hdrStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#25D366' }}>
            <svg viewBox="0 0 24 24" fill="currentColor" width={18} height={18}>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </span>
          <span style={{ fontWeight: 700, color: '#fff', fontSize: 'clamp(0.62rem,1.5vw,0.82rem)' }}>WhatsApp</span>
        </div>
        <TimerBadge t={t} />
      </div>
      <div style={{ background: '#fff', padding: 12, aspectRatio: '1/1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <QRImage alt="QR WhatsApp" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px' }}>
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.55)', fontSize: 9, borderRadius: 4, padding: '4px 7px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          wa.me/5511999990000
        </div>
        <div style={{ background: '#3b82f6', borderRadius: 5, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <CopyIcon />
        </div>
      </div>
    </div>
  )
}

function PixCard({ t }: { t: number }) {
  const border = '1px solid rgba(255,255,255,0.08)'
  return (
    <div style={{ ...cardBase, width: 'clamp(260px, 62%, 400px)', display: 'flex' }}>
      {/* QR esquerda */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px 12px', borderRight: border }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 8, width: 'clamp(88px,16vw,110px)', height: 'clamp(88px,16vw,110px)' }}>
          <QRImage alt="QR PIX" />
        </div>
      </div>
      {/* Direita */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ padding: '9px 12px 7px', background: 'rgba(29,78,216,0.22)', borderBottom: border }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 1 }}>Valor a pagar</div>
          <div style={{ fontSize: 'clamp(17px,3.8vw,22px)', fontWeight: 700, color: '#60a5fa', letterSpacing: '-0.02em' }}>R$ 149,90</div>
        </div>
        <div style={{ padding: '7px 12px', display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          {[
            { l: 'Empresa', v: 'Inter. Pag. BigCorps', hi: false },
            { l: 'Banco', v: 'Banco Inter', hi: false },
            { l: 'Validade', v: 'Válido por 30 min', hi: true },
          ].map(r => (
            <div key={r.l} style={{ display: 'flex', alignItems: 'baseline', gap: 5, minWidth: 0 }}>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em', flexShrink: 0 }}>{r.l}</span>
              <span style={{ fontSize: 10.5, color: r.hi ? '#fbbf24' : 'rgba(255,255,255,0.78)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{r.v}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderTop: border }}>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.38)', fontSize: 8.5, borderRadius: 4, padding: '3px 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace', minWidth: 0 }}>
            00020126580014br.gov.bcb.pix0136…
          </div>
          <div style={{ background: '#3b82f6', borderRadius: 4, width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CopyIcon size={9} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, padding: '7px 12px', borderTop: border }}>
          <div style={{ flex: 1, background: '#16a34a', borderRadius: 6, padding: '5px 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, fontSize: 9, fontWeight: 600, color: '#fff', minWidth: 0 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} width={9} height={9}><polyline points="20 6 9 17 4 12"/></svg>
            Confirmar
          </div>
          <div style={{ flex: 1, background: '#dc2626', borderRadius: 6, padding: '5px 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, fontSize: 9, fontWeight: 600, color: '#fff', minWidth: 0 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} width={9} height={9}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            Cancelar
          </div>
        </div>
      </div>
    </div>
  )
}

function MarcaCard({ t }: { t: number }) {
  return (
    <div style={{ ...cardBase, width: 'clamp(250px, 58%, 400px)' }}>
      <div style={hdrStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CafeLogo color="#a78bfa" size={18} />
          <span style={{ fontWeight: 700, color: '#fff', fontSize: 'clamp(0.62rem,1.5vw,0.82rem)' }}>Nossa Marca</span>
        </div>
        <TimerBadge t={t} />
      </div>
      <div style={{ display: 'flex', gap: 10, padding: '10px 12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
          <div style={{ width: 54, height: 54, borderRadius: 10, background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CafeLogo color="#f59e0b" size={28} />
          </div>
          <div style={{ background: '#fff', borderRadius: 8, padding: 5, width: 54, height: 54, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <QRImage alt="QR Marca" />
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.72)', lineHeight: 1.45 }}>Café Exemplo — especialidade em grãos selecionados e experiências únicas desde 2010.</p>
          {[
            { icon: 'clock', text: 'Seg–Sex 07h–19h · Sáb 08h–17h' },
            { icon: 'pin', text: 'Rua das Flores, 123 – São Paulo' },
          ].map(row => (
            <div key={row.text} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 6, padding: '5px 8px' }}>
              {row.icon === 'clock'
                ? <svg viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth={2} width={11} height={11}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                : <svg viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth={2} width={11} height={11}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              }
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)' }}>{row.text}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, padding: '7px 12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.08)', borderRadius: 7, padding: 5, fontSize: 9, color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>Copiar endereço</div>
        <div style={{ flex: 1, background: 'linear-gradient(to right,#16a34a,#059669)', borderRadius: 7, padding: 5, fontSize: 9, color: '#fff', textAlign: 'center', fontWeight: 600 }}>Abrir no Maps</div>
      </div>
    </div>
  )
}

function CepCard({ t }: { t: number }) {
  const border = '1px solid rgba(255,255,255,0.08)'
  return (
    <div style={{ ...cardBase, width: 'clamp(250px, 58%, 400px)' }}>
      <div style={hdrStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth={2} width={14} height={14}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <span style={{ fontWeight: 700, color: '#fff', fontSize: 'clamp(0.62rem,1.5vw,0.82rem)' }}>Consultar CEP</span>
        </div>
        <TimerBadge t={t} />
      </div>
      <div style={{ display: 'flex', gap: 10, padding: '10px 12px' }}>
        {/* Coluna mapa + QR */}
        <div style={{ flexShrink: 0, width: 'clamp(80px,18vw,100px)', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img src="/mapa.png" alt="Mapa" style={{ width: '100%', maxHeight: 80, objectFit: 'cover', display: 'block' }} />
          <div style={{ background: '#fff', width: '100%', padding: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            <div style={{ width: 50, height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <QRImage alt="QR Maps" />
            </div>
            <span style={{ fontSize: 7, color: 'rgba(0,0,0,0.4)', fontWeight: 500 }}>Abrir no Maps</span>
          </div>
        </div>
        {/* Dados */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
          {[
            { l: 'CEP', v: '01310-100' },
            { l: 'Logradouro', v: 'Av. Paulista' },
            { l: 'Bairro', v: 'Bela Vista' },
            { l: 'Cidade / UF', v: 'São Paulo – SP' },
          ].map(f => (
            <div key={f.l}>
              <p style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{f.l}</p>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.87)' }}>{f.v}</p>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 5, padding: '7px 12px', borderTop: border }}>
        {[
          { l: 'Copiar', bg: 'rgba(255,255,255,0.08)', c: 'rgba(255,255,255,0.7)' },
          { l: 'PDF',    bg: '#dc2626', c: '#fff' },
          { l: 'Maps',   bg: '#2563eb', c: '#fff' },
          { l: 'Novo',   bg: 'rgba(255,255,255,0.07)', c: 'rgba(255,255,255,0.55)' },
        ].map(b => (
          <div key={b.l} style={{ flex: 1, borderRadius: 6, padding: '5px 2px', fontSize: 9, textAlign: 'center', fontWeight: 600, background: b.bg, color: b.c }}>{b.l}</div>
        ))}
      </div>
    </div>
  )
}

// ── Main ────────────────────────────────────────────────────

export default function SceneQRCode() {
  const [typeIndex, setTypeIndex] = useState(0)
  const [visible, setVisible]     = useState(true)
  const [timeLeft, setTimeLeft]   = useState(Math.round(DURATIONS['whatsapp'] / 1000))

  const currentType = QR_SEQUENCE[typeIndex]

  useEffect(() => {
    if (timeLeft <= 0) {
      setVisible(false)
      setTimeout(() => {
        const next = (typeIndex + 1) % QR_SEQUENCE.length
        setTypeIndex(next)
        setTimeLeft(Math.round(DURATIONS[QR_SEQUENCE[next]] / 1000))
        setVisible(true)
      }, 300)
      return
    }
    const t = setTimeout(() => setTimeLeft(v => v - 1), 1000)
    return () => clearTimeout(t)
  }, [timeLeft, typeIndex])

  const card = () => {
    if (currentType === 'whatsapp') return <WhatsAppCard t={timeLeft} />
    if (currentType === 'pix')      return <PixCard t={timeLeft} />
    if (currentType === 'marca')    return <MarcaCard t={timeLeft} />
    return <CepCard t={timeLeft} />
  }

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden flex flex-col items-center justify-center select-none" style={{ background: BG }}>
      <div style={{ opacity: visible ? 1 : 0, transform: visible ? 'scale(1)' : 'scale(0.97)', transition: 'opacity 300ms ease, transform 300ms ease', display: 'flex', justifyContent: 'center', width: '100%' }}>
        {card()}
      </div>
      <p className="mt-3 text-center" style={{ color: 'rgba(255,255,255,0.35)', fontSize: 'clamp(0.5rem,1.2vw,0.65rem)' }}>
        Toque para copiar · Escanear com o celular
      </p>
    </div>
  )
}
