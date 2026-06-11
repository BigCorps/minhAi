'use client'
// components/tour/scenes/ScenePlanosConclusao.tsx

import { useEffect, useState } from 'react'

const BG = 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #020617 100%)'

const OPCOES = [
  { label: 'Smart',  desc: 'Controle total por créditos', color: '#3b82f6', tag: 'Flexível' },
  { label: 'Vendas', desc: 'Grátis, paga só ao vender',   color: '#b0cb1f', tag: 'Sem risco' },
  { label: 'Full',   desc: 'Tudo pronto, sua marca',      color: '#8b5cf6', tag: 'Completo' },
]

export default function ScenePlanosConclusao() {
  const [visible, setVisible] = useState(0)
  const [phraseVisible, setPhraseVisible] = useState(false)
  const [ctaVisible, setCtaVisible] = useState(false)

  useEffect(() => {
    if (visible >= OPCOES.length) return
    const t = setTimeout(() => setVisible(v => v + 1), 500)
    return () => clearTimeout(t)
  }, [visible])

  useEffect(() => {
    if (visible < OPCOES.length) return
    const t1 = setTimeout(() => setPhraseVisible(true), 400)
    const t2 = setTimeout(() => setCtaVisible(true), 900)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [visible])

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden flex flex-col items-center justify-center select-none gap-4 px-4"
      style={{ background: BG }}
    >
      {/* Título */}
      <div className="text-center flex-shrink-0">
        <p className="text-white/40 font-semibold uppercase tracking-widest" style={{ fontSize: 'clamp(0.38rem, 0.9vw, 0.5rem)' }}>
          Planos e Preços
        </p>
        <p className="font-bold text-white" style={{ fontSize: 'clamp(0.75rem, 2vw, 1.1rem)' }}>
          O plano certo pro <span style={{ color: '#b0cb1f' }}>negócio certo</span>
        </p>
      </div>

      {/* 3 opções */}
      <div className="flex gap-2 w-full max-w-xs">
        {OPCOES.slice(0, visible).map((o, i) => (
          <div
            key={o.label}
            className="flex-1 rounded-2xl p-3 flex flex-col items-center gap-1.5"
            style={{ background: `${o.color}10`, border: `1px solid ${o.color}25` }}
          >
            <p className="font-bold text-white text-center" style={{ fontSize: 'clamp(0.48rem, 1.1vw, 0.62rem)' }}>{o.label}</p>
            <p className="text-white/40 text-center" style={{ fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)' }}>{o.desc}</p>
            <span
              className="rounded-full px-2 py-0.5 font-bold"
              style={{ background: `${o.color}20`, color: o.color, border: `1px solid ${o.color}30`, fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)' }}
            >
              {o.tag}
            </span>
          </div>
        ))}
      </div>

      {/* Frase */}
      {phraseVisible && (
        <p
          className="text-center text-white/50 italic max-w-xs"
          style={{ fontSize: 'clamp(0.42rem, 1vw, 0.55rem)', lineHeight: 1.6, opacity: phraseVisible ? 1 : 0, transition: 'opacity 500ms ease' }}
        >
          "Comece grátis, escale no seu ritmo —<br />sem amarras."
        </p>
      )}

      {/* CTA */}
      {ctaVisible && (
        <div
          className="flex gap-2 flex-shrink-0"
          style={{ opacity: ctaVisible ? 1 : 0, transition: 'opacity 400ms ease' }}
        >
          <button
            className="rounded-full px-4 py-2 font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', fontSize: 'clamp(0.38rem, 0.9vw, 0.5rem)', boxShadow: '0 4px 16px rgba(59,130,246,0.3)' }}
          >
            Começar grátis
          </button>
          <button
            className="rounded-full px-4 py-2 font-semibold text-white/60"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', fontSize: 'clamp(0.38rem, 0.9vw, 0.5rem)' }}
          >
            Ver planos
          </button>
        </div>
      )}
    </div>
  )
}
