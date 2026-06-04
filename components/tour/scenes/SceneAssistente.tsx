'use client'
// components/tour/scenes/SceneAssistente.tsx

import { useEffect, useState } from 'react'
import { AvatarFace } from '@/components/AvatarFace'

type SubMode = 'padrao' | 'full' | 'texto'

const CHAT_MESSAGES = [
  { from: 'user', text: 'Qual o horário de funcionamento?' },
  { from: 'bot', text: 'Olá! Funcionamos de segunda a sábado, das 8h às 18h. Posso ajudar com mais alguma coisa?' },
  { from: 'user', text: 'Vocês aceitam PIX?' },
  { from: 'bot', text: 'Sim! Aceitamos PIX, cartão de crédito e débito. Quer que eu gere uma cobrança?' },
]

const CAROUSEL_ITEMS = [
  { icon: '💰', label: 'Cobrar' },
  { icon: '📅', label: 'Agendar' },
  { icon: '📋', label: 'Cadastrar' },
  { icon: '🔗', label: 'Link' },
  { icon: '📊', label: 'Relatório' },
]

const SUB_DURATIONS: Record<SubMode, number> = {
  padrao: 3000,
  full: 3000,
  texto: 3000,
}
const SUB_SEQUENCE: SubMode[] = ['padrao', 'full', 'texto']

interface SceneAssistenteProps {
  isSpeaking: boolean
  theme?: 'dark' | 'light'
}

export default function SceneAssistente({ isSpeaking, theme = 'dark' }: SceneAssistenteProps) {
  const [subMode, setSubMode] = useState<SubMode>('padrao')
  const [visible, setVisible] = useState(true)
  const isDark = theme === 'dark'

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>

    const advance = (current: SubMode) => {
      const currentIdx = SUB_SEQUENCE.indexOf(current)
      const next = SUB_SEQUENCE[(currentIdx + 1) % SUB_SEQUENCE.length]
      timeoutId = setTimeout(() => {
        setVisible(false)
        setTimeout(() => {
          setSubMode(next)
          setVisible(true)
          advance(next)
        }, 300)
      }, SUB_DURATIONS[current])
    }

    advance(subMode)
    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Cores por tema ──
  // Modo full é sempre dark (imersivo por design)
  const bg = {
    padrao: isDark
      ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
      : 'linear-gradient(135deg, #f8faff 0%, #eef2ff 50%, #f8faff 100%)',
    texto: isDark
      ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
      : 'linear-gradient(135deg, #f8faff 0%, #eef2ff 50%, #f8faff 100%)',
  }

  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  const labelColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'
  const nameColor = isDark ? 'rgba(255,255,255,0.8)' : 'rgba(15,23,42,0.85)'
  const carouselBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'
  const carouselBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  const carouselLabel = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'
  const userBubble = isDark ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.15)'
  const botBubble = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
  const bubbleText = isDark ? 'rgba(255,255,255,0.85)' : 'rgba(15,23,42,0.85)'
  const inputBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'
  const inputText = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden relative transition-opacity duration-300"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {/* ── MODO FULL — sempre dark (imersivo) ── */}
      {subMode === 'full' && (
        <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center gap-4">
          <span className="absolute top-3 left-1/2 -translate-x-1/2 text-xs text-white/30 tracking-widest uppercase">
            Modo Imersivo
          </span>
          <div style={{ width: 'clamp(120px, 28vw, 220px)', aspectRatio: '1/1' }}>
            <AvatarFace
              isSpeaking={isSpeaking}
              isListening={false}
              isProcessing={false}
              theme="dark"
              avatarType={isSpeaking ? 'orb' : 'face'}
              hasActivePlan={true}
            />
          </div>
          <p className="text-white/40 text-sm">Café Exemplo · Assistente</p>
        </div>
      )}

      {/* ── MODO PADRÃO ── */}
      {subMode === 'padrao' && (
        <div
          className="absolute inset-0 flex flex-col"
          style={{ background: bg.padrao }}
        >
          {/* Header mock */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
            style={{ borderColor }}
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-600/60 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M4 8h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8z" />
                  <path d="M16 9h2.5a2.5 2.5 0 0 1 0 5H16" />
                  <path d="M6 2v2" /><path d="M10 2v2" /><path d="M14 2v2" />
                  <path d="M3 21h16" />
                </svg>
              </div>
              <span className="text-sm font-medium" style={{ color: nameColor }}>Café Exemplo</span>
            </div>
            <span className="text-xs" style={{ color: labelColor }}>minhAi</span>
          </div>

          {/* Avatar centralizado */}
          <div className="flex-1 flex items-center justify-center">
            <div style={{ width: 'clamp(90px, 20vw, 160px)', aspectRatio: '1/1' }}>
              <AvatarFace
                isSpeaking={isSpeaking}
                isListening={false}
                isProcessing={false}
                theme={isDark ? 'dark' : 'light'}
                avatarType={isSpeaking ? 'orb' : 'face'}
                hasActivePlan={true}
              />
            </div>
          </div>

          <span className="text-center text-xs tracking-widest uppercase pb-2" style={{ color: labelColor }}>
            Modo Padrão
          </span>

          {/* Carousel */}
          <div className="flex gap-2 px-4 pb-4 justify-center overflow-hidden flex-shrink-0">
            {CAROUSEL_ITEMS.map((item) => (
              <div
                key={item.label}
                className="flex flex-col items-center gap-1 rounded-xl px-3 py-2 flex-shrink-0 border"
                style={{ background: carouselBg, borderColor: carouselBorder }}
              >
                <span style={{ fontSize: 'clamp(1rem, 2.5vw, 1.4rem)' }}>{item.icon}</span>
                <span className="text-xs" style={{ color: carouselLabel }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MODO TEXTO ── */}
      {subMode === 'texto' && (
        <div
          className="absolute inset-0 flex flex-col"
          style={{ background: bg.texto }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-2 px-4 py-3 border-b flex-shrink-0"
            style={{ borderColor }}
          >
            <div className="w-7 h-7 rounded-full bg-blue-600/60 flex-shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M4 8h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8z" />
                <path d="M16 9h2.5a2.5 2.5 0 0 1 0 5H16" />
                <path d="M6 2v2" /><path d="M10 2v2" /><path d="M14 2v2" />
                <path d="M3 21h16" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium leading-none" style={{ color: nameColor }}>Café Exemplo</p>
              <p className="text-green-500/70 text-xs mt-0.5">● online</p>
            </div>
            <span className="ml-auto text-xs tracking-widest uppercase" style={{ color: labelColor }}>Modo Texto</span>
          </div>

          {/* Mensagens */}
          <div className="flex-1 flex flex-col justify-end gap-2 px-4 py-4 overflow-hidden">
            {CHAT_MESSAGES.map((msg, i) => (
              <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="rounded-2xl px-3 py-2 max-w-[75%]"
                  style={{
                    fontSize: 'clamp(0.7rem, 1.8vw, 0.85rem)',
                    background: msg.from === 'user' ? userBubble : botBubble,
                    color: bubbleText,
                  }}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          {/* Input mock */}
          <div className="flex items-center gap-2 px-4 pb-4 flex-shrink-0">
            <div
              className="flex-1 border rounded-full px-4 py-2 text-xs"
              style={{ background: inputBg, borderColor, color: inputText }}
            >
              Digite uma mensagem...
            </div>
            <div className="w-8 h-8 rounded-full bg-blue-600/50 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white">
                <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
