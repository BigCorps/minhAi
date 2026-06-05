'use client'
// components/tour/scenes/SceneQRCode.tsx

import { useEffect, useState } from 'react'

type QRType = 'whatsapp' | 'pix' | 'marca' | 'cep'

const QR_SEQUENCE: QRType[] = ['whatsapp', 'pix', 'marca', 'cep']

const QR_DATA: Record<QRType, {
  label: string
  color: string
  icon: React.ReactNode
  displayText: string
  qrContent: string
}> = {
  whatsapp: {
    label: 'WhatsApp',
    color: '#25D366',
    displayText: 'wa.me/5511999990000',
    qrContent: 'https://wa.me/5511999990000',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
  },
  pix: {
    label: 'Gerar PIX',
    color: '#32BCAD',
    displayText: '00020126580014br.gov.bcb.pix',
    qrContent: '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426655440000',
    icon: (
      <svg viewBox="0 0 24 24" fill="#00B8A9" className="w-5 h-5">
        <path d="M18.15 17.94c-.98 0-1.9-.38-2.59-1.07l-3.15-3.15a.58.58 0 0 0-.82 0l-3.16 3.16c-.69.69-1.61 1.07-2.59 1.07H5.1l4.36 4.36a3.59 3.59 0 0 0 5.08 0l4.37-4.37h-.76ZM5.84 6.05c.98 0 1.9.38 2.59 1.07l3.16 3.16c.23.23.59.23.82 0l3.15-3.15c.69-.69 1.61-1.07 2.59-1.07h.76L14.54 1.7a3.59 3.59 0 0 0-5.08 0L5.1 6.05h.74Z" />
        <path d="m22.3 9.46-2.56-2.56a.7.7 0 0 1-.2.03h-1.3c-.67 0-1.32.27-1.8.75l-3.15 3.15a1.82 1.82 0 0 1-2.58 0L7.56 7.67c-.48-.48-1.13-.75-1.8-.75H4.25a.7.7 0 0 1-.19-.03L1.7 9.25a3.59 3.59 0 0 0 0 5.08l2.36 2.36a.7.7 0 0 1 .19-.03h1.51c.67 0 1.32-.27 1.8-.75l3.16-3.16a1.82 1.82 0 0 1 2.58 0l3.15 3.15c.48.48 1.13.75 1.8.75h1.3c.07 0 .14.01.2.03l2.56-2.56a3.59 3.59 0 0 0 0-5.07Z" />
      </svg>
    ),
  },
  marca: {
    label: 'Nossa Marca',
    color: '#a78bfa',
    displayText: 'cafeexemplo.com.br',
    qrContent: 'https://cafeexemplo.com.br',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  cep: {
    label: 'Consultar CEP',
    color: '#f87171',
    displayText: 'CEP 01310-100 · Av. Paulista',
    qrContent: 'https://maps.google.com/?q=Av+Paulista+São+Paulo',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
}

const BG = 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'

export default function SceneQRCode() {
  const [typeIndex, setTypeIndex] = useState(0)
  const [visible, setVisible] = useState(true)
  const [timeLeft, setTimeLeft] = useState(12)

  const currentType = QR_SEQUENCE[typeIndex]
  const data = QR_DATA[currentType]

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false)
      setTimeout(() => {
        setTypeIndex(i => (i + 1) % QR_SEQUENCE.length)
        setTimeLeft(12)
        setVisible(true)
      }, 300)
    }, 12000)
    return () => clearTimeout(t)
  }, [typeIndex])

  useEffect(() => {
    if (timeLeft <= 0) return
    const t = setTimeout(() => setTimeLeft(v => v - 1), 1000)
    return () => clearTimeout(t)
  }, [timeLeft])

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden flex flex-col items-center justify-center select-none"
      style={{ background: BG }}
    >
      <div
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1)' : 'scale(0.97)',
          transition: 'opacity 300ms ease, transform 300ms ease',
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        {currentType === 'whatsapp' && (
          <WhatsAppCard data={data} timeLeft={timeLeft} />
        )}
        {currentType === 'pix' && (
          <PixCard data={data} timeLeft={timeLeft} />
        )}
        {currentType === 'marca' && (
          <MarcaCard data={data} timeLeft={timeLeft} />
        )}
        {currentType === 'cep' && (
          <CepCard data={data} timeLeft={timeLeft} />
        )}
      </div>

      <p
        className="mt-3 text-center"
        style={{
          color: 'rgba(255,255,255,0.35)',
          fontSize: 'clamp(0.5rem, 1.2vw, 0.65rem)',
        }}
      >
        Toque para copiar · Escanear com o celular
      </p>
    </div>
  )
}

/* ─── Sub-cards ─────────────────────────────────────────── */

function TimerBadge({ timeLeft }: { timeLeft: number }) {
  return (
    <div
      className="px-2 py-0.5 rounded-full font-medium"
      style={{
        background: 'rgba(59,130,246,0.2)',
        color: '#93c5fd',
        fontSize: 'clamp(0.45rem, 1vw, 0.55rem)',
      }}
    >
      {timeLeft}s
    </div>
  )
}

function QRImage({ alt }: { alt: string }) {
  return (
    <img
      src="/qrcode.png"
      alt={alt}
      className="w-full h-full object-contain"
    />
  )
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" className="w-3 h-3">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function WhatsAppCard({ data, timeLeft }: { data: typeof QR_DATA['whatsapp']; timeLeft: number }) {
  return (
    <div
      className="rounded-2xl overflow-hidden shadow-2xl"
      style={{
        width: 'clamp(160px, 44%, 260px)',
        background: '#0f172a',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2">
          <span style={{ color: data.color }}>{data.icon}</span>
          <span className="font-bold text-white" style={{ fontSize: 'clamp(0.6rem, 1.4vw, 0.8rem)' }}>{data.label}</span>
        </div>
        <TimerBadge timeLeft={timeLeft} />
      </div>
      <div className="bg-white p-3" style={{ aspectRatio: '1/1' }}>
        <QRImage alt="QR WhatsApp" />
      </div>
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="flex-1 rounded py-1 px-2" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', fontSize: 'clamp(0.38rem, 0.9vw, 0.5rem)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {data.displayText}
        </div>
        <div className="rounded flex items-center justify-center flex-shrink-0" style={{ background: '#3b82f6', width: 'clamp(20px, 5vw, 28px)', height: 'clamp(20px, 5vw, 28px)' }}>
          <CopyIcon />
        </div>
      </div>
    </div>
  )
}

function PixCard({ data, timeLeft }: { data: typeof QR_DATA['pix']; timeLeft: number }) {
  return (
    <div
      className="rounded-2xl overflow-hidden shadow-2xl flex"
      style={{ width: 'clamp(240px, 58%, 420px)', background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {/* Esquerda: QR */}
      <div className="flex-shrink-0 flex items-center justify-center p-4" style={{ borderRight: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="bg-white rounded-xl p-2.5" style={{ width: 'clamp(80px, 14vw, 104px)', height: 'clamp(80px, 14vw, 104px)' }}>
          <QRImage alt="QR PIX" />
        </div>
      </div>

      {/* Direita: info */}
      <div className="flex-1 flex flex-col">
        {/* Valor */}
        <div className="px-3 py-2" style={{ background: 'rgba(29,78,216,0.2)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>Valor a pagar</p>
          <p style={{ fontSize: 'clamp(16px, 3.5vw, 22px)', fontWeight: 700, color: '#60a5fa', letterSpacing: '-0.02em' }}>R$ 149,90</p>
        </div>

        {/* Info rows */}
        <div className="px-3 py-2 flex flex-col gap-1" style={{ flex: 1 }}>
          {[
            { label: 'Empresa', value: 'BigCorps Pagamentos' },
            { label: 'Banco', value: 'Banco Inter' },
            { label: 'Validade', value: 'Válido por 30 min', highlight: true },
          ].map(row => (
            <div key={row.label} className="flex items-baseline gap-1.5">
              <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em', flexShrink: 0 }}>{row.label}</span>
              <span style={{ fontSize: '11px', color: row.highlight ? '#fbbf24' : 'rgba(255,255,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* PIX code */}
        <div className="flex items-center gap-1.5 px-3 py-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', fontSize: '9px', borderRadius: '4px', padding: '3px 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
            00020126580014br.gov.bcb.pix0136…
          </div>
          <div className="flex items-center justify-center flex-shrink-0" style={{ background: '#3b82f6', width: '22px', height: '22px', borderRadius: '4px' }}>
            <CopyIcon />
          </div>
        </div>

        {/* Botões */}
        <div className="flex gap-1.5 px-3 py-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-center gap-1 flex-1 rounded-lg py-1.5" style={{ background: '#16a34a', fontSize: '9px', fontWeight: 600, color: '#fff' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} className="w-2.5 h-2.5"><polyline points="20 6 9 17 4 12" /></svg>
            Confirmar
          </div>
          <div className="flex items-center justify-center gap-1 flex-1 rounded-lg py-1.5" style={{ background: '#dc2626', fontSize: '9px', fontWeight: 600, color: '#fff' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} className="w-2.5 h-2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            Cancelar
          </div>
        </div>
      </div>
    </div>
  )
}

function MarcaCard({ data, timeLeft }: { data: typeof QR_DATA['marca']; timeLeft: number }) {
  return (
    <div
      className="rounded-2xl overflow-hidden shadow-2xl"
      style={{ width: 'clamp(240px, 60%, 440px)', background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2">
          <span style={{ color: data.color }}>{data.icon}</span>
          <span className="font-bold text-white" style={{ fontSize: '13px' }}>{data.label}</span>
        </div>
        <TimerBadge timeLeft={timeLeft} />
      </div>

      <div className="flex gap-3 p-3">
        {/* Logo + QR */}
        <div className="flex flex-col gap-2 flex-shrink-0">
          <div className="rounded-xl flex items-center justify-center font-bold" style={{ width: '56px', height: '56px', background: 'rgba(255,255,255,0.07)', color: '#a78bfa', fontSize: '18px' }}>C</div>
          <div className="bg-white rounded-lg p-1.5 flex items-center justify-center" style={{ width: '56px', height: '56px' }}>
            <QRImage alt="QR Marca" />
          </div>
        </div>

        {/* Info */}
        <div className="flex flex-col gap-1.5 flex-1">
          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>Café Exemplo — especialidade em grãos selecionados e experiências únicas desde 2010.</p>
          <div className="flex items-center gap-1.5 rounded-lg px-2 py-1.5" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth={2} className="w-3 h-3 flex-shrink-0"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)' }}>Seg–Sex 07h–19h · Sáb 08h–17h</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg px-2 py-1.5" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth={2} className="w-3 h-3 flex-shrink-0"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
            <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)' }}>Rua das Flores, 123 – São Paulo</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2 px-3 py-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex-1 rounded-lg py-1.5 text-center" style={{ background: 'rgba(255,255,255,0.08)', fontSize: '9px', color: 'rgba(255,255,255,0.7)' }}>Copiar endereço</div>
        <div className="flex-1 rounded-lg py-1.5 text-center font-semibold" style={{ background: 'linear-gradient(to right, #16a34a, #059669)', fontSize: '9px', color: '#fff' }}>Abrir no Maps</div>
      </div>
    </div>
  )
}

function CepCard({ data, timeLeft }: { data: typeof QR_DATA['cep']; timeLeft: number }) {
  return (
    <div
      className="rounded-2xl overflow-hidden shadow-2xl"
      style={{ width: 'clamp(240px, 60%, 440px)', background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2">
          <span style={{ color: data.color }}>{data.icon}</span>
          <span className="font-bold text-white" style={{ fontSize: '13px' }}>{data.label}</span>
        </div>
        <TimerBadge timeLeft={timeLeft} />
      </div>

      <div className="flex gap-3 p-3">
        {/* Mini mapa + QR Maps */}
        <div className="flex flex-col items-center justify-center gap-2 flex-shrink-0 rounded-xl p-2" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', minWidth: '80px' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth={1.5} className="w-6 h-6"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
          <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)' }}>01310-100</p>
          <div className="bg-white rounded p-1 flex items-center justify-center" style={{ width: '52px', height: '52px' }}>
            <QRImage alt="QR Maps" />
          </div>
          <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.3)' }}>Abrir no Maps</p>
        </div>

        {/* Dados */}
        <div className="flex flex-col gap-1.5 flex-1">
          {[
            { label: 'CEP', value: '01310-100' },
            { label: 'Logradouro', value: 'Av. Paulista' },
            { label: 'Bairro', value: 'Bela Vista' },
            { label: 'Cidade / UF', value: 'São Paulo – SP' },
          ].map(f => (
            <div key={f.label}>
              <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{f.label}</p>
              <p style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{f.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-1.5 px-3 py-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        {[
          { label: 'Copiar', bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' },
          { label: 'PDF', bg: '#dc2626', color: '#fff' },
          { label: 'Maps', bg: '#2563eb', color: '#fff' },
          { label: 'Novo', bg: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)' },
        ].map(btn => (
          <div key={btn.label} className="flex-1 rounded-lg py-1.5 text-center font-semibold" style={{ background: btn.bg, fontSize: '9px', color: btn.color }}>{btn.label}</div>
        ))}
      </div>
    </div>
  )
}
