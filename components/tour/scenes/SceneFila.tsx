'use client'
// components/tour/scenes/SceneFila.tsx
// Mock visual do PainelFilaDisplay — senha atual + próximas

import { useEffect, useState } from 'react'

const SENHAS_INICIAIS = ['A002','A003','A004','A005','A006','A007','A008','A009','A010','A011']

const BG      = '#0f172a'
const BG_CARD = '#1e293b'
const ACCENT  = '#3b82f6'

export default function SceneFila() {
  const [senhaAtual, setSenhaAtual]     = useState('A001')
  const [proximas, setProximas]         = useState(SENHAS_INICIAIS)
  const [calling, setCalling]           = useState(false)

  // A cada 3.5s avança a senha — simula chamada
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
      {/* ── Senha Atual ── */}
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

      {/* ── Próximas Senhas ── */}
      <div
        className="flex flex-col rounded-2xl overflow-hidden flex-shrink-0"
        style={{
          flex: 2,
          background: BG_CARD,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
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
            style={{
              background: 'rgba(59,130,246,0.15)',
              color: '#93c5fd',
              fontSize: 'clamp(0.38rem, 0.85vw, 0.5rem)',
            }}
          >
            {proximas.length}
          </span>
        </div>

        {/* Grid de senhas */}
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