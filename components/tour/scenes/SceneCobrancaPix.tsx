'use client'
// components/tour/scenes/SceneCobrancaPix.tsx
// Modal PIX animado — QR gerado → confirmação automática → saldo sobe

import { useEffect, useState } from 'react'

const BG = 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #020617 100%)'

type Phase = 'generating' | 'qr' | 'autocheck' | 'confirmed'

export default function SceneCobrancaPix() {
  const [phase, setPhase] = useState<Phase>('generating')
  const [saldo, setSaldo] = useState(201.90)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('qr'), 800)
    const t2 = setTimeout(() => { setPhase('autocheck'); setChecking(true) }, 4000)
    const t3 = setTimeout(() => {
      setPhase('confirmed')
      setChecking(false)
      setSaldo(v => v + 89.90)
    }, 6000)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none"
      style={{ background: BG }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 flex-shrink-0"
        style={{ background: 'rgba(15,23,42,0.8)', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ background: 'rgba(50,188,173,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#32bcad" strokeWidth={2.5} strokeLinecap="round" style={{ width: 10, height: 10 }}>
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
          </div>
          <span className="text-white/60 font-semibold" style={{ fontSize: 'clamp(0.48rem, 1.1vw, 0.62rem)' }}>
            Pagamento via PIX
          </span>
        </div>
        {phase === 'confirmed' && (
          <div className="rounded-full px-2 py-0.5" style={{ background: 'rgba(50,188,173,0.15)', border: '1px solid rgba(50,188,173,0.3)' }}>
            <span className="font-bold" style={{ color: '#32bcad', fontSize: 'clamp(0.32rem, 0.75vw, 0.42rem)' }}>✓ Confirmado</span>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 flex gap-3 px-3 py-3 overflow-hidden">

        {/* Coluna esquerda — info */}
        <div className="flex flex-col gap-2 flex-1 overflow-hidden">

          {/* Valor */}
          <div className="rounded-xl px-3 py-2 flex-shrink-0" style={{ background: 'rgba(50,188,173,0.08)', border: '1px solid rgba(50,188,173,0.2)' }}>
            <p className="text-white/40" style={{ fontSize: 'clamp(0.32rem, 0.75vw, 0.42rem)' }}>Valor a pagar</p>
            <p className="font-bold text-white" style={{ fontSize: 'clamp(0.75rem, 2vw, 1rem)', color: '#32bcad' }}>R$ 89,90</p>
            <p className="text-white/30" style={{ fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)' }}>Café Exemplo · Banco Inter · 30 min</p>
          </div>

          {/* Código PIX */}
          {(phase === 'qr' || phase === 'autocheck' || phase === 'confirmed') && (
            <div className="rounded-xl px-2.5 py-1.5 flex-shrink-0" style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)' }}>
              <p className="text-white/30 font-mono truncate" style={{ fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)' }}>
                00020126580014br.gov.bcb.pix0136...
              </p>
            </div>
          )}

          {/* Auto-check */}
          {phase === 'autocheck' && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="w-3 h-3 border border-[#32bcad]/40 border-t-[#32bcad] rounded-full animate-spin flex-shrink-0" />
              <span className="text-white/40" style={{ fontSize: 'clamp(0.32rem, 0.75vw, 0.42rem)' }}>
                Verificando pagamento...
              </span>
            </div>
          )}

          {/* Confirmado */}
          {phase === 'confirmed' && (
            <div className="rounded-xl px-3 py-2 flex-shrink-0" style={{ background: 'rgba(50,188,173,0.1)', border: '1px solid rgba(50,188,173,0.3)' }}>
              <div className="flex items-center gap-1.5 mb-1">
                <svg viewBox="0 0 24 24" fill="none" stroke="#32bcad" strokeWidth={2.5} strokeLinecap="round" style={{ width: 12, height: 12, flexShrink: 0 }}>
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span className="font-bold" style={{ color: '#32bcad', fontSize: 'clamp(0.38rem, 0.9vw, 0.5rem)' }}>PIX confirmado!</span>
              </div>
              <p className="text-white/40" style={{ fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)' }}>R$ 89,90 adicionados ao saldo</p>
            </div>
          )}

          {/* Saldo */}
          <div className="rounded-xl px-3 py-2 flex-shrink-0 mt-auto" style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)' }}>
            <p className="text-white/40" style={{ fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)' }}>Saldo disponível</p>
            <p
              className="font-bold"
              style={{
                fontSize: 'clamp(0.65rem, 1.5vw, 0.85rem)',
                color: phase === 'confirmed' ? '#32bcad' : 'white',
                transition: 'color 400ms ease',
              }}
            >
              R$ {saldo.toFixed(2).replace('.', ',')}
            </p>
          </div>
        </div>

        {/* Coluna direita — QR */}
        <div className="flex-shrink-0 flex flex-col items-center justify-center gap-2" style={{ width: 'clamp(90px, 30%, 130px)' }}>
          {phase === 'generating' && (
            <div className="flex flex-col items-center gap-2">
              <span className="w-8 h-8 border-2 border-[#32bcad]/30 border-t-[#32bcad] rounded-full animate-spin" />
              <span className="text-white/30" style={{ fontSize: 'clamp(0.32rem, 0.75vw, 0.42rem)' }}>Gerando QR...</span>
            </div>
          )}
          {(phase === 'qr' || phase === 'autocheck') && (
            <div className="bg-white rounded-xl p-2 w-full" style={{ aspectRatio: '1/1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/qrcode.png" alt="QR Code PIX" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </div>
          )}
          {phase === 'confirmed' && (
            <div
              className="rounded-xl flex flex-col items-center justify-center gap-2 w-full"
              style={{ aspectRatio: '1/1', background: 'rgba(50,188,173,0.12)', border: '1px solid rgba(50,188,173,0.3)' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="#32bcad" strokeWidth={2.5} strokeLinecap="round" style={{ width: 32, height: 32 }}>
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span className="font-bold" style={{ color: '#32bcad', fontSize: 'clamp(0.35rem, 0.8vw, 0.46rem)' }}>Pago!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
