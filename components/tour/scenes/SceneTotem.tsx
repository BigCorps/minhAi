'use client'
// components/tour/scenes/SceneTotem.tsx
// Alterna entre Totem (metade do tempo) e LoginCliente (metade do tempo)

import { useEffect, useState } from 'react'

// ── Cores ────────────────────────────────────────────────────────
const BG      = '#0f172a'
const BG_CARD = '#1e293b'
const ACCENT  = '#3b82f6'

// ── Teclado mock ─────────────────────────────────────────────────
const KEYBOARD_ROWS = [
  ['1','2','3','4','5','6','7','8','9','0'],
  ['q','w','e','r','t','y','u','i','o','p'],
  ['a','s','d','f','g','h','j','k','l'],
  ['z','x','c','v','b','n','m'],
]
const TYPED_SEQUENCE = 'expresso'

// ── Componente Totem ─────────────────────────────────────────────
function TotemMock() {
  const [typed, setTyped]               = useState('')
  const [keyboardOpen, setKeyboardOpen] = useState(false)
  const [typingIdx, setTypingIdx]       = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setKeyboardOpen(true), 1000)
    return () => clearTimeout(t)
  }, [])

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

  const activeKey = typingIdx < TYPED_SEQUENCE.length ? TYPED_SEQUENCE[typingIdx] : null

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none relative"
      style={{ background: BG }}
    >
      {/* Header */}
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

      {/* Avatar + input */}
      <div
        className="flex-1 flex flex-col items-center justify-center gap-2 min-h-0 px-4"
        style={{
          paddingBottom: keyboardOpen ? 'clamp(120px, 30%, 180px)' : '0',
          transition: 'padding-bottom 400ms cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        <p className="text-white font-bold text-center" style={{ fontSize: 'clamp(0.7rem, 1.8vw, 1rem)' }}>
          Como Posso te Ajudar Hoje?
        </p>
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

      {/* Teclado mock */}
      <div
        className="flex-shrink-0 w-full absolute bottom-0 left-0"
        style={{
          background: BG_CARD,
          borderTop: '1px solid rgba(255,255,255,0.08)',
          padding: '8px 6px 10px',
          transform: keyboardOpen ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 400ms cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        <div className="flex justify-end px-1 mb-1.5">
          <button
            className="rounded-full flex items-center justify-center"
            style={{
              background: 'rgba(255,255,255,0.1)', width: 20, height: 20,
              color: 'rgba(255,255,255,0.5)', border: 'none', fontSize: 13, cursor: 'pointer',
            }}
            onClick={() => setKeyboardOpen(false)}
          >✕</button>
        </div>

        {KEYBOARD_ROWS.map((row, ri) => (
          <div key={ri} className="flex justify-center gap-1 mb-1">
            {row.map(key => {
              const isActive = key === activeKey
              return (
                <div
                  key={key}
                  className="flex items-center justify-center rounded-lg font-medium transition-all duration-100"
                  style={{
                    flex: 1,
                    maxWidth: ri === 0 ? '10%' : undefined,
                    height: 'clamp(22px, 4vw, 32px)',
                    fontSize: 'clamp(0.45rem, 1.1vw, 0.6rem)',
                    background: isActive ? ACCENT : '#334155',
                    color: isActive ? 'white' : 'rgba(255,255,255,0.75)',
                    border: `1px solid ${isActive ? ACCENT : 'rgba(255,255,255,0.06)'}`,
                    transform: isActive ? 'scale(1.12)' : 'scale(1)',
                  }}
                >
                  {key}
                </div>
              )
            })}
          </div>
        ))}

        <div className="flex gap-1 mt-1">
          {[
            { label: '⬆', flex: 1.4, bg: BG },
            { label: '123@?,', flex: 1.4, bg: BG },
            { label: 'espaço', flex: 4, bg: '#334155' },
            { label: '⌫', flex: 1.4, bg: BG },
            { label: '↵ Enviar', flex: 2, bg: '#16a34a' },
          ].map(({ label, flex, bg }) => (
            <div key={label} className="flex items-center justify-center rounded-lg font-semibold"
              style={{
                flex, height: 'clamp(22px, 4vw, 32px)',
                fontSize: 'clamp(0.38rem, 0.9vw, 0.5rem)',
                background: bg, color: bg === '#16a34a' ? 'white' : 'rgba(255,255,255,0.5)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >{label}</div>
          ))}
        </div>
      </div>

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
        <strong>minhAi.app</strong> — Uma IA pra chamar de sua!
      </div>
    </div>
  )
}

// ── Componente Login/Usuário ──────────────────────────────────────
type LoginMode = 'login_cliente' | 'cadastro' | 'login_colab'
const LOGIN_MODES: LoginMode[] = ['login_cliente', 'cadastro', 'login_colab']

function useTypingEffect(target: string, active: boolean, speed = 80) {
  const [value, setValue] = useState('')
  useEffect(() => {
    setValue('')
    if (!active) return
    let i = 0
    const t = setInterval(() => {
      i++
      setValue(target.slice(0, i))
      if (i >= target.length) clearInterval(t)
    }, speed)
    return () => clearInterval(t)
  }, [target, active])
  return value
}

function FieldMock({ label, value, placeholder, active }: {
  label: string; value: string; placeholder?: string; active: boolean
}) {
  return (
    <div>
      <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 'clamp(0.4rem, 0.95vw, 0.56rem)', fontWeight: 500, margin: '0 0 4px 0' }}>
        {label}
      </p>
      <div style={{
        width: '100%',
        padding: 'clamp(6px, 1.5%, 9px) clamp(8px, 2%, 12px)',
        background: BG,
        border: `1.5px solid ${active && value ? 'rgba(59,130,246,0.6)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 8,
        color: value ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.2)',
        fontSize: 'clamp(0.45rem, 1.1vw, 0.62rem)',
        boxSizing: 'border-box' as const,
        minHeight: 'clamp(26px, 6vw, 36px)',
        display: 'flex', alignItems: 'center',
        transition: 'border-color 0.15s',
      }}>
        {value || placeholder || ''}
        {active && value && <span style={{ opacity: 0.7 }}>|</span>}
      </div>
    </div>
  )
}

function LoginClienteMock() {
  const [modeIdx, setModeIdx] = useState(0)
  const [phase, setPhase]     = useState<'typing' | 'hold' | 'out'>('typing')

  const mode: LoginMode = LOGIN_MODES[modeIdx % LOGIN_MODES.length]

  useEffect(() => {
    if (phase === 'typing') {
      const t = setTimeout(() => setPhase('hold'), 2800)
      return () => clearTimeout(t)
    }
    if (phase === 'hold') {
      const t = setTimeout(() => setPhase('out'), 1800)
      return () => clearTimeout(t)
    }
    if (phase === 'out') {
      const t = setTimeout(() => { setModeIdx(i => i + 1); setPhase('typing') }, 350)
      return () => clearTimeout(t)
    }
  }, [phase])

  const emailTyped = useTypingEffect('usuario@email.com', phase === 'typing' && mode === 'login_cliente', 75)
  const nomeTyped  = useTypingEffect('Maria da Silva',    phase === 'typing' && mode === 'cadastro', 80)
  const pinTyped   = useTypingEffect('1234',              phase === 'typing' && mode === 'login_colab', 200)
  const idTyped    = useTypingEffect('msilva',            phase === 'typing' && mode === 'login_colab', 110)

  const visible = phase !== 'out'

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden flex items-center justify-center select-none"
      style={{ background: BG }}
    >
      <div style={{
        width: '88%', maxWidth: 340,
        background: BG_CARD,
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        padding: 'clamp(14px, 4%, 22px)',
        display: 'flex', flexDirection: 'column',
        gap: 'clamp(10px, 2.5%, 16px)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'scale(1) translateY(0)' : 'scale(0.96) translateY(8px)',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 'clamp(28px, 7vw, 38px)', height: 'clamp(28px, 7vw, 38px)',
              borderRadius: 10,
              background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth={2}
                strokeLinecap="round" style={{ width: '55%', height: '55%' }}>
                <path d="M15 3H19C20.1046 3 21 3.89543 21 5V19C21 20.1046 20.1046 21 19 21H15" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
            </div>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.95)', fontWeight: 700, fontSize: 'clamp(0.65rem, 1.6vw, 0.85rem)', margin: 0 }}>
                {mode === 'login_cliente' ? 'Entrar' : mode === 'cadastro' ? 'Criar Conta' : 'Acesso Colaborador'}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.45rem, 1.1vw, 0.6rem)', margin: 0 }}>
                {mode === 'login_colab' ? 'Use seu identificador e PIN' : 'Acesse sua conta'}
              </p>
            </div>
          </div>
          <div style={{
            width: 22, height: 22, borderRadius: 6,
            background: 'rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.4)', fontSize: 13, cursor: 'pointer', flexShrink: 0,
          }}>✕</div>
        </div>

        {/* Aviso PIN */}
        {mode === 'login_colab' && (
          <div style={{
            background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: 10, padding: 'clamp(6px, 1.5%, 10px) clamp(8px, 2%, 12px)',
          }}>
            <p style={{ color: '#fcd34d', fontSize: 'clamp(0.42rem, 1vw, 0.58rem)', margin: 0 }}>
              Use o identificador e PIN cadastrados no painel de administração.
            </p>
          </div>
        )}

        {/* Campos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(8px, 2%, 12px)' }}>
          {mode === 'cadastro' && <FieldMock label="Nome completo" value={nomeTyped} active={phase === 'typing'} />}
          {mode === 'login_colab' && <FieldMock label="Identificador ou E-mail" value={idTyped} active={phase === 'typing'} />}
          {(mode === 'login_cliente' || mode === 'cadastro') && (
            <FieldMock
              label="E-mail"
              value={mode === 'login_cliente' ? emailTyped : (nomeTyped.length > 5 ? 'maria@email.com' : '')}
              active={phase === 'typing' && mode === 'login_cliente'}
            />
          )}
          {mode === 'login_colab' && (
            <FieldMock label="PIN" value={'•'.repeat(pinTyped.length)} placeholder="4 a 6 dígitos" active={phase === 'typing'} />
          )}
        </div>

        {/* Botão */}
        <div style={{
          width: '100%', padding: 'clamp(8px, 2%, 11px)',
          background: ACCENT, borderRadius: 10,
          color: '#fff', fontSize: 'clamp(0.55rem, 1.3vw, 0.75rem)', fontWeight: 700,
          textAlign: 'center', cursor: 'pointer',
        }}>
          {mode === 'login_cliente' ? 'Entrar' : mode === 'cadastro' ? 'Criar conta' : 'Entrar com PIN'}
        </div>

        {/* Links inferiores */}
        <div style={{
          display: 'flex',
          justifyContent: mode === 'login_cliente' ? 'space-between' : 'center',
          alignItems: 'center',
        }}>
          {mode === 'login_cliente' && (
            <>
              <div>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.42rem, 1vw, 0.56rem)' }}>Não tem conta? </span>
                <span style={{ color: ACCENT, fontSize: 'clamp(0.42rem, 1vw, 0.56rem)', fontWeight: 600, cursor: 'pointer' }}>Criar conta</span>
              </div>
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 'clamp(0.38rem, 0.9vw, 0.5rem)', cursor: 'pointer' }}>Sou colaborador</span>
            </>
          )}
          {mode === 'cadastro' && (
            <div>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.42rem, 1vw, 0.56rem)' }}>Já tem conta? </span>
              <span style={{ color: ACCENT, fontSize: 'clamp(0.42rem, 1vw, 0.56rem)', fontWeight: 600, cursor: 'pointer' }}>Entrar</span>
            </div>
          )}
          {mode === 'login_colab' && (
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 'clamp(0.42rem, 1vw, 0.56rem)', cursor: 'pointer' }}>
              Voltar ao login de cliente
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Cena principal: alterna Totem ↔ Login ────────────────────────
const HALF = 5000 // ms em cada cena

export default function SceneTotem() {
  const [showLogin, setShowLogin] = useState(false)
  const [visible, setVisible]     = useState(true)

  useEffect(() => {
    const cycle = () => {
      setVisible(false)
      setTimeout(() => {
        setShowLogin(s => !s)
        setVisible(true)
      }, 400)
    }
    const t = setInterval(cycle, HALF)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="w-full h-full relative" style={{ borderRadius: 16, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', inset: 0,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.4s ease',
      }}>
        {showLogin ? <LoginClienteMock /> : <TotemMock />}
      </div>
    </div>
  )
}
