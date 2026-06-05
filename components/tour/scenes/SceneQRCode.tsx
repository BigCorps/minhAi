'use client'
// components/tour/scenes/SceneQRCode.tsx

import { useEffect, useState } from 'react'

type QRType = 'whatsapp' | 'pix' | 'instagram'

const QR_SEQUENCE: QRType[] = ['whatsapp', 'pix', 'instagram']

const QR_DATA: Record<QRType, {
  label: string
  color: string
  icon: React.ReactNode
  displayText: string
  qrContent: string
  amount?: string
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
    label: 'PIX',
    color: '#32BCAD',
    displayText: '00020126580014br.gov.bcb.pix',
    qrContent: '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426655440000',
    amount: '89,90',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12.5 2.5L20 10l-7.5 7.5M4 10h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
        <path d="M17.5 6.5l-11 7M6.5 6.5l11 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
  instagram: {
    label: 'Instagram',
    color: '#E1306C',
    displayText: 'instagram.com/cafeexemplo',
    qrContent: 'https://instagram.com/cafeexemplo',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
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
    }, 4000)
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
        className="rounded-2xl overflow-hidden shadow-2xl"
        style={{
          width: 'clamp(160px, 44%, 260px)',
          background: '#0f172a',
          border: '1px solid rgba(255,255,255,0.08)',
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1)' : 'scale(0.97)',
          transition: 'opacity 300ms ease, transform 300ms ease',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-3 py-2 border-b"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}
        >
          <div className="flex items-center gap-2">
            <span style={{ color: data.color }}>{data.icon}</span>
            <span className="font-bold text-white" style={{ fontSize: 'clamp(0.6rem, 1.4vw, 0.8rem)' }}>
              {data.label}
            </span>
          </div>
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
        </div>

        {/* QR Code via API */}
<div className="bg-white p-3" style={{ aspectRatio: '1/1' }}>
  <img
    src="/qrcode.png"
    alt={`QR Code ${data.label}`}
    className="w-full h-full object-contain"
  />
</div>

        {/* PIX amount */}
        {data.amount && (
          <div
            className="px-3 py-1.5 border-b"
            style={{
              borderColor: 'rgba(255,255,255,0.08)',
              background: 'rgba(59,130,246,0.1)',
            }}
          >
            <p
              className="font-bold text-center"
              style={{ color: '#60a5fa', fontSize: 'clamp(0.75rem, 2vw, 1rem)' }}
            >
              R$ {data.amount}
            </p>
            <p
              className="text-center"
              style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.38rem, 0.85vw, 0.48rem)' }}
            >
              Café Exemplo
            </p>
          </div>
        )}

        {/* Display text + copy */}
        <div className="flex items-center gap-2 px-3 py-2">
          <div
            className="flex-1 rounded py-1 px-2"
            style={{
              background: 'rgba(255,255,255,0.05)',
              color: 'rgba(255,255,255,0.6)',
              fontSize: 'clamp(0.38rem, 0.9vw, 0.5rem)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {data.displayText}
          </div>
          <div
            className="rounded flex items-center justify-center flex-shrink-0"
            style={{
              background: '#3b82f6',
              width: 'clamp(20px, 5vw, 28px)',
              height: 'clamp(20px, 5vw, 28px)',
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" className="w-3 h-3">
              <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </div>
        </div>
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