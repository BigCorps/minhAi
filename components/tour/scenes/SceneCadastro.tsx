'use client'
// components/tour/scenes/SceneCadastro.tsx

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

// ─── Dados do gráfico ──────────────────────────────────────────────────────
const CHART_PTS = [
  { d: '10/05', b: 9900, a: 0, c: 0 },   { d: '11/05', b: 9820, a: 0, c: 80 },
  { d: '12/05', b: 9740, a: 0, c: 80 },  { d: '13/05', b: 9620, a: 0, c: 120 },
  { d: '14/05', b: 9550, a: 0, c: 70 },  { d: '15/05', b: 9480, a: 0, c: 70 },
  { d: '16/05', b: 9400, a: 0, c: 80 },  { d: '17/05', b: 9350, a: 0, c: 50 },
  { d: '18/05', b: 9280, a: 0, c: 70 },  { d: '19/05', b: 9200, a: 0, c: 80 },
  { d: '20/05', b: 9150, a: 0, c: 50 },  { d: '21/05', b: 9080, a: 0, c: 70 },
  { d: '22/05', b: 9010, a: 0, c: 70 },  { d: '23/05', b: 8950, a: 0, c: 60 },
  { d: '24/05', b: 8900, a: 0, c: 50 },  { d: '25/05', b: 8850, a: 0, c: 50 },
  { d: '26/05', b: 8780, a: 0, c: 70 },  { d: '27/05', b: 8720, a: 0, c: 60 },
  { d: '28/05', b: 8680, a: 0, c: 40 },  { d: '29/05', b: 8620, a: 0, c: 60 },
  { d: '30/05', b: 8560, a: 0, c: 60 },  { d: '31/05', b: 8500, a: 0, c: 60 },
  { d: '01/06', b: 8440, a: 0, c: 60 },  { d: '02/06', b: 8900, a: 500, c: 40 },
  { d: '03/06', b: 8853, a: 0, c: 47 },
]

// ─── Geração do SVG do gráfico ─────────────────────────────────────────────
function buildChart() {
  const W = 680, H = 160, padL = 40, padR = 10, padT = 10, padB = 24
  const maxB = 10000
  const n = CHART_PTS.length
  const xStep = (W - padL - padR) / (n - 1)
  const xOf = (i: number) => padL + i * xStep
  const yOf = (v: number) => padT + (1 - v / maxB) * (H - padT - padB)

  let balLine = '', addLine = '', consLine = '', balArea = `M${xOf(0)},${H - padB}`
  CHART_PTS.forEach((p, i) => {
    const x = xOf(i), yb = yOf(p.b), ya = yOf(p.a), yc = yOf(p.c)
    if (i === 0) {
      balLine = `M${x},${yb}`; addLine = `M${x},${ya}`; consLine = `M${x},${yc}`
      balArea += ` L${x},${yb}`
    } else {
      balLine += ` L${x},${yb}`; addLine += ` L${x},${ya}`; consLine += ` L${x},${yc}`
      balArea += ` L${x},${yb}`
    }
  })
  balArea += ` L${xOf(n - 1)},${H - padB} Z`

  const gridLines = [0, 2500, 5000, 7500, 10000].map(v => {
    const y = yOf(v)
    const label = v === 0 ? '0' : v >= 1000 ? `${v / 1000}k` : `${v}`
    return { y, label }
  })

  const xLabels = CHART_PTS
    .map((p, i) => ({ ...p, i }))
    .filter((_, j) => j % 3 === 0 || j === n - 1)

  const dots = CHART_PTS
    .map((p, i) => ({ ...p, i }))
    .filter((_, j) => j === 0 || j === n - 1 || CHART_PTS[j].a > 0)

  return { W, H, padL, padR, padB, balLine, addLine, consLine, balArea, gridLines, xLabels, dots, xOf, yOf }
}

// ─── Ícones sociais ────────────────────────────────────────────────────────
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" style={{ width: 12, height: 12, flexShrink: 0 }}>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
)
const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" style={{ width: 12, height: 12, flexShrink: 0 }} fill="#1877F2">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
)

// ═══════════════════════════════════════════════════════════════════════════
//  COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════
export default function SceneCadastro() {
  // ── Estado ────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<'form' | 'dash'>('form')
  const [formOpacity, setFormOpacity] = useState(1)
  const [dashOpacity, setDashOpacity] = useState(0)
  const [emailTyped, setEmailTyped] = useState('')
  const [passTyped, setPassTyped] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const EMAIL = 'cafe@exemplo.com.br'
  const PASS = '••••••••'

  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const addTimer = (t: ReturnType<typeof setTimeout>) => { timers.current.push(t); return t }
  const clearAll = () => { timers.current.forEach(clearTimeout); timers.current = [] }

  // ── Fade-in reativo à mudança de phase ────────────────────────────────
  // Garante que o fade-in só começa DEPOIS do React ter re-renderizado
  // com o novo phase — evita race condition entre setState + setTimeout.
  useEffect(() => {
    if (phase === 'dash') {
      setDashOpacity(0)
      const t = setTimeout(() => setDashOpacity(1), 50)
      return () => clearTimeout(t)
    }
    if (phase === 'form') {
      setFormOpacity(0)
      const t = setTimeout(() => setFormOpacity(1), 50)
      return () => clearTimeout(t)
    }
  }, [phase])

  // ── Restart ───────────────────────────────────────────────────────────
  const restart = () => {
    clearAll()
    setDashOpacity(0)
    addTimer(setTimeout(() => {
      setEmailTyped('')
      setPassTyped('')
      setSubmitting(false)
      setPhase('form') // useEffect acima cuida do fade-in
    }, 400))
  }

  // ── Sequência de digitação ─────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'form') return

    let i = 0
    const typeEmail = () => {
      if (i > EMAIL.length) { typePass(); return }
      setEmailTyped(EMAIL.slice(0, i++))
      addTimer(setTimeout(typeEmail, 60))
    }

    let j = 0
    const typePass = () => {
      if (j > PASS.length) { doSubmit(); return }
      setPassTyped(PASS.slice(0, j++))
      addTimer(setTimeout(typePass, 80))
    }

    const doSubmit = () => {
      addTimer(setTimeout(() => {
        setSubmitting(true)
        addTimer(setTimeout(() => {
          // fade out form, depois muda phase → useEffect cuida do fade-in do dash
          setFormOpacity(0)
          addTimer(setTimeout(() => {
            setPhase('dash') // dispara o useEffect acima
            addTimer(setTimeout(() => restart(), 6000))
          }, 400))
        }, 1100))
      }, 500))
    }

    addTimer(setTimeout(typeEmail, 400))
    return clearAll
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const chart = buildChart()

  // ═══════════════════════════════════════════════════════════════════════
  //  RENDER — ambas as fases ficam no DOM, visibilidade via opacity+pointer-events
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'linear-gradient(135deg,#020617 0%,#0f172a 50%,#020617 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, boxSizing: 'border-box', position: 'relative', overflow: 'hidden',
    }}>

      {/* ══════════ FORMULÁRIO ══════════ */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, boxSizing: 'border-box',
        opacity: phase === 'form' ? formOpacity : 0,
        pointerEvents: phase === 'form' ? 'auto' : 'none',
        transition: 'opacity 350ms ease',
      }}>
        <div style={{ width: '100%', maxWidth: 340 }}>
          <div style={{
            background: 'rgba(30,41,59,0.6)',
            border: '0.5px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(12px)',
            borderRadius: 16, padding: 24,
            display: 'flex', flexDirection: 'column', gap: 0,
          }}>
            {/* Logo + títulos */}
            <div style={{ textAlign: 'center' }}>
              <Image
                src="/logo.png"
                alt="minhAi"
                width={90}
                height={28}
                loading="eager"
                style={{ height: 28, width: 'auto', margin: '0 auto', display: 'block', objectFit: 'contain' }}
              />
              <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, marginTop: 6 }}>Criar Conta</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>Crie sua conta para começar</p>
            </div>

            {/* Botões sociais */}
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              {[
                { label: 'Continuar com Google', icon: <GoogleIcon /> },
                { label: 'Continuar com Facebook', icon: <FacebookIcon /> },
              ].map(s => (
                <div key={s.label} style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 6, background: 'rgba(255,255,255,0.06)',
                  border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 10,
                  padding: '7px 4px', color: 'rgba(255,255,255,0.75)', fontSize: 10, cursor: 'pointer',
                }}>
                  {s.icon}{s.label}
                </div>
              ))}
            </div>

            {/* Divisor */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 0', color: 'rgba(255,255,255,0.25)', fontSize: 10 }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
              <span>ou</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
            </div>

            {/* Campos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              {/* Email */}
              <div>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, marginBottom: 3 }}>Email</div>
                <div style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: `0.5px solid ${emailTyped.length > 0 ? 'rgba(176,203,31,0.5)' : 'rgba(255,255,255,0.12)'}`,
                  borderRadius: 8, padding: '7px 10px',
                  color: 'rgba(255,255,255,0.85)', fontFamily: 'monospace', fontSize: 11,
                  minHeight: 30, display: 'flex', alignItems: 'center',
                  transition: 'border-color 300ms',
                }}>
                  <span>{emailTyped}</span>
                  {emailTyped.length < EMAIL.length && (
                    <span style={{
                      display: 'inline-block', width: 1, height: 12,
                      background: 'rgba(255,255,255,0.7)', marginLeft: 1,
                      animation: 'cadastro-blink 0.8s step-end infinite',
                    }} />
                  )}
                </div>
              </div>

              {/* Senha */}
              <div>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, marginBottom: 3 }}>Senha</div>
                <div style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: `0.5px solid ${passTyped.length > 0 ? 'rgba(176,203,31,0.5)' : 'rgba(255,255,255,0.12)'}`,
                  borderRadius: 8, padding: '7px 10px',
                  color: passTyped.length > 0 ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.2)',
                  fontFamily: 'monospace', fontSize: 11,
                  minHeight: 30, display: 'flex', alignItems: 'center',
                  transition: 'border-color 300ms',
                }}>
                  {passTyped.length > 0 ? (
                    <>
                      <span>{passTyped}</span>
                      {passTyped.length < PASS.length && (
                        <span style={{
                          display: 'inline-block', width: 1, height: 12,
                          background: 'rgba(255,255,255,0.7)', marginLeft: 1,
                          animation: 'cadastro-blink 0.8s step-end infinite',
                        }} />
                      )}
                    </>
                  ) : (
                    <span>••••••••</span>
                  )}
                </div>
              </div>
            </div>

            {/* Botão principal */}
            <button style={{
              background: submitting ? 'rgba(176,203,31,0.5)' : '#b0cb1f',
              color: '#fff', fontWeight: 700, fontSize: 11,
              border: 'none', borderRadius: 10, padding: 9, width: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              cursor: 'pointer', transition: 'background 300ms',
            }}>
              {submitting ? (
                <>
                  <span style={{
                    width: 12, height: 12,
                    border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
                    borderRadius: '50%', display: 'inline-block',
                    animation: 'cadastro-spin 0.7s linear infinite',
                  }} />
                  Criando conta...
                </>
              ) : 'Criar Conta'}
            </button>

            <p style={{ textAlign: 'center', marginTop: 8, color: 'rgba(96,165,250,0.8)', fontSize: 10 }}>
              Já tem conta? Fazer login
            </p>
          </div>
        </div>
      </div>

      {/* ══════════ DASHBOARD ══════════ */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, boxSizing: 'border-box',
        opacity: phase === 'dash' ? dashOpacity : 0,
        pointerEvents: phase === 'dash' ? 'auto' : 'none',
        transition: 'opacity 350ms ease',
      }}>
        <div style={{ width: '100%', maxWidth: 900, height: '100%', maxHeight: 560 }}>
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', flexDirection: 'column',
            background: '#0f172a', borderRadius: 16, overflow: 'hidden',
            border: '0.5px solid rgba(255,255,255,0.08)',
          }}>

            {/* ── Header ── */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 16px', background: '#0f172a',
              borderBottom: '0.5px solid rgba(255,255,255,0.08)',
              flexShrink: 0,
            }}>
              <Image src="/logo.png" alt="minhAi" width={60} height={20} loading="eager"
                style={{ height: 20, width: 'auto', objectFit: 'contain' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)',
                  borderRadius: 8, padding: '5px 10px', color: 'rgba(255,255,255,0.7)', fontSize: 11, cursor: 'pointer',
                }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 14, height: 14 }}>
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  </svg>
                  Casa
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 10, height: 10 }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
                <div style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={2} style={{ width: 14, height: 14 }}>
                    <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                  </svg>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: '#b0cb1f', border: '1.5px solid #b0cb1f',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#000', fontSize: 9, fontWeight: 700,
                  }}>LS</div>
                  <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: 600 }}>Loja de Serviços</span>
                </div>
              </div>
            </div>

            {/* ── Body scrollável ── */}
            <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>

              {/* Welcome row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <h1 style={{ color: '#fff', fontSize: 18, fontWeight: 700, lineHeight: 1.2, margin: 0 }}>Olá, Loja de Serviços!</h1>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 3, lineHeight: 1.5 }}>
                    Bem-vindo ao seu painel de controle.<br />Navegue pelo menu à direita ou seu perfil à esquerda.
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                  <button style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'linear-gradient(135deg,#10b981,#059669)',
                    border: 'none', borderRadius: 8, padding: '7px 12px',
                    color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                  }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 14, height: 14 }}>
                      <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                    </svg>
                    loja.minhai.com.br
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 10, height: 10 }}>
                      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                      <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </button>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.1)',
                    borderRadius: 8, padding: '5px 10px',
                  }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={2} style={{ width: 13, height: 13 }}>
                      <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>Link na Bio</span>
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>Inativo</span>
                    <div style={{
                      width: 32, height: 18, background: 'rgba(255,255,255,0.1)',
                      borderRadius: 9, position: 'relative', cursor: 'pointer',
                      border: '0.5px solid rgba(255,255,255,0.15)',
                    }}>
                      <div style={{
                        width: 12, height: 12, background: 'rgba(255,255,255,0.4)',
                        borderRadius: '50%', position: 'absolute', top: 2, left: 2,
                      }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Credits card */}
              <div style={{
                background: 'rgba(30,41,59,0.8)', border: '0.5px solid rgba(255,255,255,0.1)',
                borderRadius: 12, padding: '14px 18px',
                display: 'flex', alignItems: 'center', gap: 16,
              }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 10,
                  background: 'rgba(59,130,246,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth={2} style={{ width: 22, height: 22 }}>
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                </div>
                <div style={{ flex: '0 0 auto' }}>
                  <h3 style={{ color: '#fff', fontSize: 13, fontWeight: 700, margin: 0 }}>Seus Créditos</h3>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 1 }}>Status do seu saldo para interações de IA</p>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>Progresso de Uso</span>
                    <span style={{ color: '#60a5fa', fontSize: 10, fontWeight: 600 }}>8853 disponíveis</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: '85%', background: '#3b82f6', borderRadius: 3 }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9 }}>1568 gastos</span>
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9 }}>Total: 10421</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                  <div>
                    <div style={{ color: '#fff', fontSize: 22, fontWeight: 700, lineHeight: 1 }}>8853</div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, textAlign: 'right' }}>CRÉDITOS</div>
                  </div>
                  <button style={{
                    background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8,
                    padding: '6px 12px', fontSize: 10, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 11, height: 11 }}>
                      <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
                    </svg>
                    Recarregar
                  </button>
                </div>
              </div>

              {/* Setup banner */}
              <div style={{
                background: 'rgba(30,41,59,0.5)', border: '0.5px solid rgba(255,255,255,0.08)',
                borderRadius: 12, padding: '12px 16px',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'rgba(59,130,246,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth={2} style={{ width: 18, height: 18 }}>
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ color: '#fff', fontSize: 12, fontWeight: 700, margin: 0 }}>Configure seu Assistente</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
                    <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden', maxWidth: 300 }}>
                      <div style={{ height: '100%', width: '67%', background: '#3b82f6', borderRadius: 3 }} />
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, whiteSpace: 'nowrap' }}>67% concluído</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {['›', '×'].map((ch, i) => (
                    <div key={i} style={{
                      width: 28, height: 28, borderRadius: 6,
                      background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: 14,
                    }}>{ch}</div>
                  ))}
                </div>
              </div>

              {/* Gráfico */}
              <div style={{
                background: 'rgba(30,41,59,0.5)', border: '0.5px solid rgba(255,255,255,0.08)',
                borderRadius: 12, padding: '14px 16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <div style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>Progressão de Créditos</div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 2 }}>
                      Acompanhe o uso e adição de créditos ao longo do tempo
                    </div>
                  </div>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={2} style={{ width: 14, height: 14 }}>
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)',
                    borderRadius: 6, padding: '4px 8px', color: 'rgba(255,255,255,0.6)', fontSize: 10, cursor: 'pointer',
                  }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 12, height: 12 }}>
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    30 dias
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 9, height: 9 }}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 6,
                      background: 'rgba(59,130,246,0.2)', border: '0.5px solid rgba(59,130,246,0.4)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', color: '#60a5fa',
                    }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 13, height: 13 }}>
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                      </svg>
                    </div>
                    {[
                      <><line key="a" x1="18" y1="20" x2="18" y2="10" /><line key="b" x1="12" y1="20" x2="12" y2="4" /><line key="c" x1="6" y1="20" x2="6" y2="14" /></>,
                      <><polyline key="d" points="2 20 8 10 14 16 20 6" /></>,
                      <><circle key="e" cx="12" cy="12" r="10" /></>,
                    ].map((d, i) => (
                      <div key={i} style={{
                        width: 28, height: 28, borderRadius: 6,
                        background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: 'rgba(255,255,255,0.4)',
                      }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 13, height: 13 }}>{d}</svg>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ height: 180, position: 'relative', overflow: 'hidden' }}>
                  <svg viewBox={`0 0 ${chart.W} ${chart.H}`} style={{ width: '100%', height: '100%' }}>
                    {chart.gridLines.map(({ y, label }) => (
                      <g key={label}>
                        <line x1={chart.padL} y1={y} x2={chart.W - chart.padR} y2={y}
                          stroke="rgba(255,255,255,0.06)" strokeWidth={1} strokeDasharray="4,4" />
                        <text x={chart.padL - 4} y={y + 3} textAnchor="end" fill="rgba(255,255,255,0.3)" fontSize={9}>{label}</text>
                      </g>
                    ))}
                    {chart.xLabels.map(p => (
                      <text key={p.d} x={chart.xOf(p.i)} y={chart.H - 6}
                        textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={8}>{p.d}</text>
                    ))}
                    <defs>
                      <linearGradient id="cad-balGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <path d={chart.balArea} fill="url(#cad-balGrad)" />
                    <path d={chart.consLine} fill="none" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4,3" />
                    <path d={chart.addLine} fill="none" stroke="#26de81" strokeWidth={1.5} strokeDasharray="4,3" />
                    <path d={chart.balLine} fill="none" stroke="#3b82f6" strokeWidth={2} />
                    {chart.dots.map(p => (
                      <g key={`dot-${p.d}`}>
                        <circle cx={chart.xOf(p.i)} cy={chart.yOf(p.b)} r={3} fill="#3b82f6" stroke="#0f172a" strokeWidth={1.5} />
                        {p.c > 0 && <circle cx={chart.xOf(p.i)} cy={chart.yOf(p.c)} r={2.5} fill="#ef4444" stroke="#0f172a" strokeWidth={1.5} />}
                        {p.a > 0 && <circle cx={chart.xOf(p.i)} cy={chart.yOf(p.a)} r={2.5} fill="#26de81" stroke="#0f172a" strokeWidth={1.5} />}
                      </g>
                    ))}
                  </svg>
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 8, justifyContent: 'center' }}>
                  {[
                    { color: '#26de81', label: 'Adicionados' },
                    { color: '#ef4444', label: 'Consumidos' },
                    { color: '#3b82f6', label: 'Saldo' },
                  ].map(l => (
                    <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>
                      <div style={{ width: 8, height: 2, borderRadius: 1, background: l.color }} />
                      {l.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                {[
                  {
                    label: 'Assistentes', sub: '1 assistente', desc: 'Gerencie seus assistentes minhAi',
                    color: '#3b82f6', bg: 'rgba(59,130,246,0.15)',
                    icon: <><circle cx="12" cy="12" r="9" /><circle cx="8" cy="9" r="1" fill="#3b82f6" /><circle cx="16" cy="9" r="1" fill="#3b82f6" /><path d="M8 14s1.5 2 4 2 4-2 4-2" strokeLinecap="round" /></>,
                  },
                  {
                    label: 'Histórico', sub: '1568 interações', desc: 'Visualize interações anteriores',
                    color: '#10b981', bg: 'rgba(16,185,129,0.15)',
                    icon: <><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></>,
                  },
                  {
                    label: 'Respostas Rápidas', sub: '24 respostas', desc: 'Configure respostas automaticamente',
                    color: '#3b82f6', bg: 'rgba(59,130,246,0.15)',
                    icon: <><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></>,
                  },
                ].map(card => (
                  <div key={card.label} style={{
                    background: 'rgba(30,41,59,0.5)', border: '0.5px solid rgba(255,255,255,0.08)',
                    borderRadius: 10, padding: 14, textAlign: 'center', cursor: 'pointer',
                  }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 8, background: card.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px',
                    }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke={card.color} strokeWidth={2} style={{ width: 20, height: 20 }}>
                        {card.icon}
                      </svg>
                    </div>
                    <h4 style={{ color: '#fff', fontSize: 12, fontWeight: 700, margin: 0 }}>{card.label}</h4>
                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, marginTop: 2 }}>{card.sub}</p>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 4 }}>{card.desc}</p>
                  </div>
                ))}
              </div>

              {/* Quick actions grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
                {[
                  {
                    label: 'Funções', desc: 'Configure e habilite funções', blue: false,
                    icon: <><path d="M12 2a10 10 0 110 20 10 10 0 010-20z" /><path d="M12 8v4l3 3" /></>,
                  },
                  {
                    label: 'Recebimentos', desc: 'Pix, pagamentos e saques', blue: true,
                    icon: <><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></>,
                  },
                  {
                    label: 'Vendas e Produtos', desc: 'Gerencie produtos e pedidos', blue: false,
                    icon: <><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" /></>,
                  },
                  {
                    label: 'Controle de Usuários', desc: 'Gerencie perfis e permissões', blue: true,
                    icon: <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
                  },
                ].map(card => (
                  <div key={card.label} style={{
                    background: 'rgba(30,41,59,0.5)', border: '0.5px solid rgba(255,255,255,0.08)',
                    borderRadius: 10, padding: 14, cursor: 'pointer', textAlign: 'center',
                  }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke={card.blue ? '#3b82f6' : '#10b981'} strokeWidth={2}
                      style={{ width: 18, height: 18, margin: '0 auto' }}>
                      {card.icon}
                    </svg>
                    <h4 style={{ color: '#fff', fontSize: 12, fontWeight: 700, marginTop: 6, marginBottom: 0 }}>{card.label}</h4>
                    <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, marginTop: 3 }}>{card.desc}</p>
                  </div>
                ))}
              </div>

            </div>{/* /dash-body */}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes cadastro-blink { 50% { opacity: 0; } }
        @keyframes cadastro-spin  { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}