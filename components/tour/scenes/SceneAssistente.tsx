'use client'
// components/tour/scenes/SceneAssistente.tsx
// Mock visual dos 3 modos do AssistenteClient:
//   padrao  → header + avatar centralizado + carousel de funções
//   full    → tela escura total + avatar grande
//   texto   → interface de chat com mensagens fictícias
//
// O avatar desta cena já inclui o AvatarFace (isSpeaking=true),
// pois o TourAssistant fica oculto nesta cena (hideAvatar=true no TourStage1).
// O sub-ciclo padrao→full→texto roda automaticamente via timer interno.

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

// Tempo (ms) que cada sub-modo fica visível
const SUB_DURATIONS: Record<SubMode, number> = {
  padrao: 3000,
  full: 3000,
  texto: 3000,
}
const SUB_SEQUENCE: SubMode[] = ['padrao', 'full', 'texto']

interface SceneAssistenteProps {
  /** Passado pelo TourStage1 — true enquanto o TTS desta cena está tocando */
  isSpeaking: boolean
}

export default function SceneAssistente({ isSpeaking }: SceneAssistenteProps) {
  const [subMode, setSubMode] = useState<SubMode>('padrao')
  const [visible, setVisible] = useState(true) // fade entre sub-modos

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>

    const advance = (current: SubMode) => {
      const currentIdx = SUB_SEQUENCE.indexOf(current)
      const next = SUB_SEQUENCE[(currentIdx + 1) % SUB_SEQUENCE.length]

      timeoutId = setTimeout(() => {
        // Fade out
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

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden relative transition-opacity duration-300"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {/* ── MODO FULL ── */}
      {subMode === 'full' && (
        <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center gap-4">
          {/* Label de modo */}
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
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col">
          {/* Header mock */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-600/60" />
              <span className="text-white/80 text-sm font-medium">Café Exemplo</span>
            </div>
            <span className="text-white/30 text-xs">minhAi</span>
          </div>

          {/* Avatar centralizado */}
          <div className="flex-1 flex items-center justify-center">
            <div style={{ width: 'clamp(90px, 20vw, 160px)', aspectRatio: '1/1' }}>
              <AvatarFace
                isSpeaking={isSpeaking}
                isListening={false}
                isProcessing={false}
                theme="dark"
                avatarType={isSpeaking ? 'orb' : 'face'}
                hasActivePlan={true}
              />
            </div>
          </div>

          {/* Label de modo */}
          <span className="text-center text-xs text-white/30 tracking-widest uppercase pb-2">
            Modo Padrão
          </span>

          {/* Carousel de funções mock */}
          <div className="flex gap-2 px-4 pb-4 justify-center overflow-hidden">
            {CAROUSEL_ITEMS.map((item) => (
              <div
                key={item.label}
                className="flex flex-col items-center gap-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 flex-shrink-0"
              >
                <span style={{ fontSize: 'clamp(1rem, 2.5vw, 1.4rem)' }}>{item.icon}</span>
                <span className="text-white/50 text-xs">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MODO TEXTO ── */}
      {subMode === 'texto' && (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
            <div className="w-7 h-7 rounded-full bg-blue-600/60 flex-shrink-0" />
            <div>
              <p className="text-white/80 text-sm font-medium leading-none">Café Exemplo</p>
              <p className="text-green-400/70 text-xs mt-0.5">● online</p>
            </div>
            <span className="ml-auto text-white/30 text-xs tracking-widest uppercase">Modo Texto</span>
          </div>

          {/* Mensagens */}
          <div className="flex-1 flex flex-col justify-end gap-2 px-4 py-4 overflow-hidden">
            {CHAT_MESSAGES.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className="rounded-2xl px-3 py-2 max-w-[75%]"
                  style={{
                    fontSize: 'clamp(0.7rem, 1.8vw, 0.85rem)',
                    background:
                      msg.from === 'user'
                        ? 'rgba(59,130,246,0.3)'
                        : 'rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.85)',
                  }}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          {/* Input mock */}
          <div className="flex items-center gap-2 px-4 pb-4">
            <div className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-white/30 text-xs">
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
