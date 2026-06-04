'use client'
// components/tour/scenes/SceneWhatsAppMCP.tsx
// WhatsApp minhAi — conversa direta com sequência animada de ferramentas.
// Linguagem para usuário comum (sem mencionar MCP).
// Avatar: /public/whats.jpg

import { useEffect, useState } from 'react'
import Image from 'next/image'

// Mesma sequência de ferramentas do SceneMCP, adaptada para linguagem WhatsApp
const TOOL_SCENES = [
  {
    userMsg: 'Gera um PIX de R$ 150,00 pra mim',
    thinking: '⚙️ Gerando cobrança PIX...',
    response: '💰 *PIX Gerado!*\n\nValor: *R$ 150,00*\n📷 QR Code abaixo\n\nCópia e cola:\n`00020126...`',
    accent: '#16a34a',
    accentBg: '#1a2a1e',
    accentBorder: 'rgba(22,163,74,0.3)',
  },
  {
    userMsg: 'Consulta o CPF 123.456.789-09',
    thinking: '⚙️ Consultando CPF na Receita...',
    response: '👤 *Consulta CPF*\n\nNome: JOÃO DA SILVA\nSituação: ✅ Regular\nData nasc.: 15/03/1985',
    accent: '#3b82f6',
    accentBg: '#1a1e2a',
    accentBorder: 'rgba(59,130,246,0.3)',
  },
  {
    userMsg: 'Esse boleto é fraude? 23793.38128 60007.827136',
    thinking: '⚙️ Analisando boleto...',
    response: '✅ *LEGÍTIMO*\n\nScore de risco: 8/100\nEmissor verificado.\nPode pagar com segurança! 👍',
    accent: '#16a34a',
    accentBg: '#1a2a1e',
    accentBorder: 'rgba(22,163,74,0.3)',
  },
]

export default function SceneWhatsAppMCP() {
  const [activeTool, setActiveTool] = useState(0)
  const [phase, setPhase] = useState<'user' | 'thinking' | 'response'>('user')

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    if (phase === 'user') {
      t = setTimeout(() => setPhase('thinking'), 1200)
    } else if (phase === 'thinking') {
      t = setTimeout(() => setPhase('response'), 1400)
    } else {
      t = setTimeout(() => {
        setActiveTool(p => (p + 1) % TOOL_SCENES.length)
        setPhase('user')
      }, 2500)
    }
    return () => clearTimeout(t)
  }, [phase, activeTool])

  const scene = TOOL_SCENES[activeTool]

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none"
      style={{ background: '#111b21' }}
    >
      {/* ── Header WhatsApp ── */}
      <div
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ background: '#202c33' }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={2} className="w-5 h-5 flex-shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
        </svg>

        {/* Avatar com foto whats.jpg */}
        <div className="relative flex-shrink-0 rounded-full overflow-hidden" style={{ width: 40, height: 40 }}>
          <Image src="/whats.jpg" alt="minhAi WhatsApp" fill className="object-cover" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium leading-none">minhAi</p>
          <p className="text-xs mt-0.5" style={{ color: '#8696a0' }}>
            {phase === 'thinking' ? 'digitando...' : 'online'}
          </p>
        </div>

        <div className="flex gap-4 flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={2} className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <svg viewBox="0 0 24 24" fill="rgba(255,255,255,0.5)" className="w-5 h-5">
            <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
          </svg>
        </div>
      </div>

      {/* ── Mensagens ── */}
      <div
        className="flex-1 flex flex-col justify-end gap-2 px-3 py-3 overflow-hidden"
        style={{ background: '#0b141a' }}
      >
        {/* Mensagem do usuário */}
        <div className="flex justify-end">
          <div
            className="rounded-lg px-3 py-1.5 max-w-[78%]"
            style={{ background: '#005c4b', fontSize: 'clamp(0.7rem, 1.8vw, 0.82rem)', color: '#e9edef' }}
          >
            <p>{scene.userMsg}</p>
            <span className="block text-right mt-0.5" style={{ fontSize: '0.6rem', color: '#8696a0' }}>agora ✓✓</span>
          </div>
        </div>

        {/* "Digitando..." / processando */}
        {phase === 'thinking' && (
          <div className="flex justify-start items-end gap-2">
            <div className="relative rounded-full overflow-hidden flex-shrink-0" style={{ width: 24, height: 24 }}>
              <Image src="/whats.jpg" alt="" fill className="object-cover" />
            </div>
            <div
              className="rounded-xl rounded-tl-sm px-3 py-2 flex flex-col gap-1"
              style={{ background: scene.accentBg, border: `1px solid ${scene.accentBorder}` }}
            >
              <p className="text-xs" style={{ color: scene.accent }}>{scene.thinking}</p>
            </div>
          </div>
        )}

        {/* Resposta final */}
        {phase === 'response' && (
          <div className="flex justify-start items-end gap-2">
            <div className="relative rounded-full overflow-hidden flex-shrink-0" style={{ width: 24, height: 24 }}>
              <Image src="/whats.jpg" alt="" fill className="object-cover" />
            </div>
            <div
              className="rounded-lg rounded-tl-sm px-3 py-1.5 max-w-[80%] whitespace-pre-line"
              style={{ background: '#202c33', fontSize: 'clamp(0.68rem, 1.7vw, 0.8rem)', color: '#e9edef' }}
            >
              {scene.response}
              <span className="block text-right mt-0.5" style={{ fontSize: '0.6rem', color: '#8696a0' }}>agora ✓✓</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Indicador de cena ── */}
      <div
        className="flex items-center justify-center gap-1.5 px-4 py-1.5 flex-shrink-0"
        style={{ background: '#111b21' }}
      >
        {TOOL_SCENES.map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === activeTool ? 16 : 6,
              height: 6,
              background: i === activeTool ? '#00a884' : 'rgba(255,255,255,0.15)',
            }}
          />
        ))}
      </div>

      {/* ── Input ── */}
      <div
        className="flex items-center gap-2 px-3 py-2 flex-shrink-0"
        style={{ background: '#202c33' }}
      >
        <div
          className="flex-1 rounded-full px-4 py-2 text-xs"
          style={{ background: '#2a3942', color: '#8696a0' }}
        >
          Mensagem
        </div>
        <div
          className="rounded-full flex items-center justify-center flex-shrink-0"
          style={{ width: 40, height: 40, background: '#00a884' }}
        >
          <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
            <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
          </svg>
        </div>
      </div>
    </div>
  )
}
