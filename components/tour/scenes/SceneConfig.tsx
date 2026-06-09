'use client'
// components/tour/scenes/SceneConfig.tsx
// Página de configurações mockada — digita wake word → ajusta preset → salva

import { useEffect, useState } from 'react'

const BG = 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'

type Step = 'editing' | 'saving' | 'saved'

const WAKE_WORD   = 'ei, minha IA'
const GREETING    = 'Olá! Como posso ajudar?'

export default function SceneConfig() {
  const [step, setStep]             = useState<Step>('editing')
  const [wakeTyped, setWakeTyped]   = useState('')
  const [greetTyped, setGreetTyped] = useState('')
  const [preset, setPreset]         = useState<'silencioso' | 'moderado' | 'ruidoso'>('moderado')
  const [voiceAnim, setVoiceAnim]   = useState(false)
  const [savedVisible, setSavedVisible] = useState(false)

  // 1. Digita wake word
  useEffect(() => {
    if (wakeTyped.length >= WAKE_WORD.length) return
    const t = setTimeout(
      () => setWakeTyped(WAKE_WORD.slice(0, wakeTyped.length + 1)),
      65,
    )
    return () => clearTimeout(t)
  }, [wakeTyped])

  // 2. Digita saudação após wake word
  useEffect(() => {
    if (wakeTyped.length < WAKE_WORD.length) return
    if (greetTyped.length >= GREETING.length) return
    const t = setTimeout(
      () => setGreetTyped(GREETING.slice(0, greetTyped.length + 1)),
      55,
    )
    return () => clearTimeout(t)
  }, [wakeTyped, greetTyped])

  // 3. Troca preset para "ruidoso" e seleciona voz após saudação
  useEffect(() => {
    if (greetTyped.length < GREETING.length) return
    const t1 = setTimeout(() => setPreset('ruidoso'), 600)
    const t2 = setTimeout(() => setVoiceAnim(true), 1100)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [greetTyped])

  // 4. Salva após animação de voz
  useEffect(() => {
    if (!voiceAnim) return
    const t1 = setTimeout(() => setStep('saving'), 800)
    const t2 = setTimeout(() => {
      setStep('saved')
      setTimeout(() => setSavedVisible(true), 80)
    }, 1800)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [voiceAnim])

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden flex items-center justify-center select-none"
      style={{ background: BG }}
    >

      {/* ══ Tela de edição ══ */}
      {(step === 'editing' || step === 'saving') && (
        <div
          className="flex flex-col gap-2.5 rounded-2xl p-4 w-full"
          style={{
            maxWidth: 'clamp(240px, 72%, 340px)',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {/* Cabeçalho */}
          <div className="mb-0.5">
            <p className="text-white font-bold" style={{ fontSize: 'clamp(0.65rem, 1.6vw, 0.85rem)' }}>
              Configurar Assistente
            </p>
            <p className="text-white/35" style={{ fontSize: 'clamp(0.4rem, 0.9vw, 0.52rem)' }}>
              Identidade · Voz · Ambiente
            </p>
          </div>

          {/* Campo: Wake word */}
          <div>
            <label className="text-white/40 block mb-0.5" style={{ fontSize: 'clamp(0.38rem, 0.85vw, 0.48rem)' }}>
              Palavra de ativação
            </label>
            <div
              className="w-full rounded-lg px-2.5 py-1.5 font-mono"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(59,130,246,0.45)',
                color: 'rgba(255,255,255,0.85)',
                fontSize: 'clamp(0.42rem, 1vw, 0.55rem)',
              }}
            >
              {wakeTyped || <span className="text-white/20">ei, minha IA</span>}
              {wakeTyped.length < WAKE_WORD.length && (
                <span className="animate-pulse">|</span>
              )}
            </div>
          </div>

          {/* Campo: Saudação */}
          <div>
            <label className="text-white/40 block mb-0.5" style={{ fontSize: 'clamp(0.38rem, 0.85vw, 0.48rem)' }}>
              Mensagem de saudação
            </label>
            <div
              className="w-full rounded-lg px-2.5 py-1.5 font-mono"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: `1px solid ${greetTyped.length > 0 ? 'rgba(59,130,246,0.45)' : 'rgba(255,255,255,0.1)'}`,
                color: 'rgba(255,255,255,0.85)',
                fontSize: 'clamp(0.42rem, 1vw, 0.55rem)',
              }}
            >
              {greetTyped || <span className="text-white/20">Olá! Como posso ajudar?</span>}
              {wakeTyped.length >= WAKE_WORD.length &&
               greetTyped.length < GREETING.length && (
                <span className="animate-pulse">|</span>
              )}
            </div>
          </div>

          {/* Preset de ambiente */}
          <div>
            <label className="text-white/40 block mb-1" style={{ fontSize: 'clamp(0.38rem, 0.85vw, 0.48rem)' }}>
              Sensibilidade ao ambiente
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['silencioso', 'moderado', 'ruidoso'] as const).map(p => (
                <div
                  key={p}
                  className="py-1.5 rounded-lg text-center"
                  style={{
                    border: `1px solid ${preset === p ? 'rgba(59,130,246,0.55)' : 'rgba(255,255,255,0.1)'}`,
                    background: preset === p ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.03)',
                    transition: 'all 300ms ease',
                  }}
                >
                  <p
                    style={{
                      fontSize: 'clamp(0.38rem, 0.85vw, 0.5rem)',
                      fontWeight: 600,
                      color: preset === p ? '#93c5fd' : 'rgba(255,255,255,0.35)',
                      transition: 'color 300ms ease',
                    }}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Voz */}
          <div>
            <label className="text-white/40 block mb-0.5" style={{ fontSize: 'clamp(0.38rem, 0.85vw, 0.48rem)' }}>
              Voz do assistente
            </label>
            <div
              className="w-full rounded-lg px-2.5 py-1.5 flex items-center justify-between"
              style={{
                background: voiceAnim ? 'rgba(167,139,250,0.12)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${voiceAnim ? 'rgba(167,139,250,0.45)' : 'rgba(255,255,255,0.1)'}`,
                transition: 'all 350ms ease',
              }}
            >
              <span
                style={{
                  fontSize: 'clamp(0.42rem, 1vw, 0.55rem)',
                  color: voiceAnim ? '#c4b5fd' : 'rgba(255,255,255,0.5)',
                  transition: 'color 350ms ease',
                }}
              >
                {voiceAnim ? 'Feminino — Neural PT-BR' : 'Masculino — Neural PT-BR'}
              </span>
              <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={2}
                className="w-3 h-3 flex-shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Botão salvar */}
          <button
            className="w-full rounded-xl py-2 font-bold text-white flex items-center justify-center gap-2"
            style={{
              background: step === 'saving'
                ? 'rgba(59,130,246,0.45)'
                : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              fontSize: 'clamp(0.48rem, 1.1vw, 0.62rem)',
              transition: 'background 300ms ease',
            }}
          >
            {step === 'saving' ? (
              <>
                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                  strokeLinecap="round" className="w-3 h-3">
                  <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                  <polyline points="17,21 17,13 7,13 7,21"/>
                  <polyline points="7,3 7,8 15,8"/>
                </svg>
                Salvar Alterações
              </>
            )}
          </button>
        </div>
      )}

      {/* ══ Confirmação salvo ══ */}
      {step === 'saved' && (
        <div
          className="w-full h-full flex flex-col p-3 gap-2"
          style={{ opacity: savedVisible ? 1 : 0, transition: 'opacity 400ms ease' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth={2}
                  strokeLinecap="round" className="w-3 h-3">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                  <path d="M9 11l3 3 4-5"/>
                </svg>
              </div>
              <span className="text-white/60 font-semibold" style={{ fontSize: 'clamp(0.48rem, 1.1vw, 0.62rem)' }}>
                Configurações salvas
              </span>
            </div>
            <div
              className="rounded-full px-2 py-0.5"
              style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}
            >
              <span className="text-emerald-400 font-bold" style={{ fontSize: 'clamp(0.35rem, 0.8vw, 0.44rem)' }}>
                ✓ Ativo
              </span>
            </div>
          </div>

          {/* Card resumo */}
          <div
            className="flex-shrink-0 rounded-2xl p-3.5 flex flex-col gap-2"
            style={{
              background: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(59,130,246,0.1))',
              border: '1px solid rgba(139,92,246,0.3)',
            }}
          >
            <p className="text-white font-bold" style={{ fontSize: 'clamp(0.55rem, 1.3vw, 0.72rem)' }}>
              Meu Assistente
            </p>
            {[
              { label: 'Wake word',  value: '"ei, minha IA"',          color: '#93c5fd' },
              { label: 'Saudação',   value: '"Olá! Como posso ajudar?"', color: '#93c5fd' },
              { label: 'Ambiente',   value: 'Ruidoso',                  color: '#fbbf24' },
              { label: 'Voz',        value: 'Feminino Neural PT-BR',    color: '#c4b5fd' },
            ].map(r => (
              <div key={r.label} className="flex items-center justify-between">
                <span className="text-white/35" style={{ fontSize: 'clamp(0.38rem, 0.85vw, 0.48rem)' }}>
                  {r.label}
                </span>
                <span
                  className="font-mono font-semibold"
                  style={{ fontSize: 'clamp(0.38rem, 0.85vw, 0.5rem)', color: r.color }}
                >
                  {r.value}
                </span>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 flex-shrink-0">
            {[
              { label: 'Assistentes', value: '1' },
              { label: 'Ambiente',    value: '🔊' },
              { label: 'Créditos',    value: '100' },
            ].map(s => (
              <div
                key={s.label}
                className="rounded-xl p-2.5 text-center"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <p className="text-white font-bold" style={{ fontSize: 'clamp(0.65rem, 1.5vw, 0.85rem)' }}>
                  {s.value}
                </p>
                <p className="text-white/40" style={{ fontSize: 'clamp(0.35rem, 0.8vw, 0.44rem)' }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}