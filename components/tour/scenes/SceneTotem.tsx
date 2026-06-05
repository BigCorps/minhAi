'use client'
// components/tour/scenes/SceneTotem.tsx

import { useEffect, useState } from 'react'
import { AvatarFace } from '@/components/AvatarFace'
import VirtualKeyboard from '@/components/assistant/VirtualKeyboard'

const TYPED_SEQUENCE = 'expresso'

interface SceneTotemProps {
  isSpeaking?: boolean
}

export default function SceneTotem({ isSpeaking = false }: SceneTotemProps) {
  const [typed, setTyped]               = useState('')
  const [keyboardOpen, setKeyboardOpen] = useState(false)
  const [typingIdx, setTypingIdx]       = useState(0)

  // Abre teclado após 1s
  useEffect(() => {
    const t = setTimeout(() => setKeyboardOpen(true), 1000)
    return () => clearTimeout(t)
  }, [])

  // Digita letra por letra após teclado abrir
  useEffect(() => {
    if (!keyboardOpen) return
    if (typingIdx >= TYPED_SEQUENCE.length) {
      const t = setTimeout(() => { setTyped(''); setTypingIdx(0) }, 2000)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => {
      setTyped(prev => prev + TYPED_SEQUENCE[typingIdx])
      setTypingIdx(i => i + 1)
    }, 220)
    return () => clearTimeout(t)
  }, [keyboardOpen, typingIdx])

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none relative"
      style={{ background: '#0f172a' }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-4 py-2 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-amber-500/80 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" className="w-3 h-3">
              <path d="M4 8h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8z" /><path d="M16 9h2.5a2.5 2.5 0 0 1 0 5H16" />
              <path d="M6 2v2" /><path d="M10 2v2" /><path d="M14 2v2" /><path d="M3 21h18" />
            </svg>
          </div>
          <span className="text-white/60 font-semibold" style={{ fontSize: 'clamp(0.5rem, 1.2vw, 0.65rem)' }}>Café Exemplo</span>
        </div>
        <div
          className="flex items-center gap-1 rounded-full px-2 py-0.5"
          style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth={2} strokeLinecap="round" className="w-2.5 h-2.5">
            <path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
          </svg>
          <span style={{ color: '#f87171', fontSize: 'clamp(0.38rem, 0.9vw, 0.5rem)', fontWeight: 600 }}>Modo Kiosk</span>
        </div>
      </div>

      {/* ── Avatar + input ── */}
      <div className="flex-1 flex flex-col items-center justify-center gap-2 min-h-0 px-4">
        <div style={{ width: 'clamp(60px, 14vw, 100px)', aspectRatio: '1/1' }}>
          <AvatarFace
            isSpeaking={isSpeaking}
            isListening={false}
            isProcessing={false}
            theme="dark"
            avatarType={isSpeaking ? 'orb' : 'face'}
            hasActivePlan={true}
          />
        </div>

        <p className="text-white font-bold text-center" style={{ fontSize: 'clamp(0.7rem, 1.8vw, 1rem)' }}>
          Como Posso te Ajudar Hoje?
        </p>

        {/* Campo de input mockado */}
        <div
          className="w-full max-w-xs rounded-xl border flex items-center gap-2 px-3 py-2"
          style={{
            background: 'rgba(255,255,255,0.05)',
            borderColor: keyboardOpen ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.1)',
          }}
          onClick={() => setKeyboardOpen(true)}
        >
          <span
            className="flex-1"
            style={{
              color: typed ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.25)',
              fontSize: 'clamp(0.5rem, 1.2vw, 0.65rem)',
            }}
          >
            {typed || 'Ou digite sua mensagem...'}
            {keyboardOpen && <span className="animate-pulse">|</span>}
          </span>
          <div
            className="rounded flex items-center justify-center flex-shrink-0"
            style={{
              background: 'rgba(255,255,255,0.08)',
              width: 'clamp(18px, 4vw, 24px)',
              height: 'clamp(18px, 4vw, 24px)',
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={2} strokeLinecap="round" className="w-3 h-3">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </div>
        </div>
      </div>

      {/* ── VirtualKeyboard real ── */}
      {keyboardOpen && (
        <VirtualKeyboard
          theme="dark"
          onKey={(char) => setTyped(prev => prev + char)}
          onBackspace={() => setTyped(prev => prev.slice(0, -1))}
          onEnter={() => { setTyped(''); setKeyboardOpen(false) }}
          onClose={() => setKeyboardOpen(false)}
          onReplace={(char) => setTyped(prev => prev.slice(0, -1) + char)}
        />
      )}

      {/* Footer */}
      <div
        className="text-center flex-shrink-0"
        style={{
          padding: '2px 0 4px',
          fontSize: 'clamp(0.35rem, 0.8vw, 0.45rem)',
          color: 'rgba(255,255,255,0.15)',
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <strong>minhai.app</strong> — Uma IA pra chamar de sua!
      </div>
    </div>
  )
}