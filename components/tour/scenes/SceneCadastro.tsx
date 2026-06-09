'use client'
// components/tour/scenes/SceneCadastro.tsx

import Image from 'next/image'
import { useEffect, useRef, useState, useCallback } from 'react'

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

// ─── Tamanhos base de cada "cena" ──────────────────────────────────────────
// Form: 340px wide, ~520px tall (estimado com todos os campos)
// Dash: 900px wide, 560px tall
const FORM_BASE_W = 340
const FORM_BASE_H = 520
const DASH_BASE_W = 900
const DASH_BASE_H = 560

// ═══════════════════════════════════════════════════════════════════════════
//  COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════
export default function SceneCadastro() {
  const [phase, setPhase]             = useState<'form' | 'dash'>('form')
  const [formOpacity, setFormOpacity] = useState(1)
  const [dashOpacity, setDashOpacity] = useState(0)
  const [emailTyped, setEmailTyped]   = useState('')
  const [passTyped, setPassTyped]     = useState('')
  const [submitting, setSubmitting]   = useState(false)

  // ─── Escala responsiva ─────────────────────────────────────────────────
  const containerRef              = useRef<HTMLDivElement>(null)
  const [formScale, setFormScale] = useState(1)
  const [dashScale, setDashScale] = useState(1)

  const recalcScale = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const { width: cw, height: ch } = el.getBoundingClientRect()
    const pad = 24 // breathing room
    const aw  = cw - pad
    const ah  = ch - pad
    setFormScale(Math.min(1, aw / FORM_BASE_W, ah / FORM_BASE_H))
    setDashScale(Math.min(1, aw / DASH_BASE_W, ah / DASH_BASE_H))
  }, [])

  useEffect(() => {
    recalcScale()
    const ro = new ResizeObserver(recalcScale)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [recalcScale])

  const EMAIL = 'cafe@exemplo.com.br'
  const PASS  = '••••••••'

  const seqTimers  = useRef<ReturnType<typeof setTimeout>[]>([])
  const loopTimers = useRef<ReturnType<typeof setTimeout>[]>([])

  const addSeq  = (t: ReturnType<typeof setTimeout>) => { seqTimers.current.push(t); return t }
  const addLoop = (t: ReturnType<typeof setTimeout>) => { loopTimers.current.push(t); return t }
  const clearSeq  = () => { seqTimers.current.forEach(clearTimeout);  seqTimers.current  = [] }
  const clearLoop = () => { loopTimers.current.forEach(clearTimeout); loopTimers.current = [] }

  // ── Fade-in reativo à mudança de phase ────────────────────────────────
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

  // ── Loop: quando entra no dash, agenda o retorno ao form ──────────────
  useEffect(() => {
    if (phase !== 'dash') return
    clearLoop()
    addLoop(setTimeout(() => {
      setDashOpacity(0)
      addLoop(setTimeout(() => {
        clearSeq()
        setEmailTyped('')
        setPassTyped('')
        setSubmitting(false)
        setPhase('form')
      }, 400))
    }, 5000))
    return clearLoop
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // ── Sequência de digitação ─────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'form') return
    clearSeq()

    let i = 0
    const typeEmail = () => {
      if (i > EMAIL.length) { typePass(); return }
      setEmailTyped(EMAIL.slice(0, i++))
      addSeq(setTimeout(typeEmail, 60))
    }

    let j = 0
    const typePass = () => {
      if (j > PASS.length) { doSubmit(); return }
      setPassTyped(PASS.slice(0, j++))
      addSeq(setTimeout(typePass, 80))
    }

    const doSubmit = () => {
      addSeq(setTimeout(() => {
        setSubmitting(true)
        addSeq(setTimeout(() => {
          setFormOpacity(0)
          addSeq(setTimeout(() => {
            setPhase('dash')
          }, 400))
        }, 1100))
      }, 500))
    }

    addSeq(setTimeout(typeEmail, 400))
    return clearSeq
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // ═══════════════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div
      ref={containerRef}
      style={{
        width: '100%', height: '100%',
        background: 'linear-gradient(135deg,#020617 0%,#0f172a 50%,#020617 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', position: 'relative',
      }}
    >

      {/* ══════════ FORMULÁRIO ══════════ */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: phase === 'form' ? formOpacity : 0,
        pointerEvents: phase === 'form' ? 'auto' : 'none',
        transition: 'opacity 350ms ease',
      }}>
        {/* Wrapper escalável — tamanho fixo base, reduzido via scale */}
        <div style={{
          width: FORM_BASE_W,
          transform: `scale(${formScale})`,
          transformOrigin: 'center center',
        }}>
          <div style={{
            background: 'rgba(30,41,59,0.6)',
            border: '0.5px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(12px)',
            borderRadius: 16, padding: 24,
            display: 'flex', flexDirection: 'column', gap: 0,
          }}>
            {/* Logo + títulos */}
            <div style={{ textAlign: 'center' }}>
              <Image src="/logo.png" alt="minhAi" width={90} height={28} loading="eager"
                style={{ height: 28, width: 'auto', margin: '0 auto', display: 'block', objectFit: 'contain' }} />
              <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, marginTop: 6 }}>Criar Conta</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>Crie sua conta para começar</p>
            </div>

            {/* Divisor */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 0', color: 'rgba(255,255,255,0.25)', fontSize: 10 }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
              <span>ou</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
            </div>

            {/* Campos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              <div>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, marginBottom: 3 }}>Email</div>
                <div style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: `0.5px solid ${emailTyped.length > 0 ? 'rgba(176,203,31,0.5)' : 'rgba(255,255,255,0.12)'}`,
                  borderRadius: 8, padding: '7px 10px',
                  color: 'rgba(255,255,255,0.85)', fontFamily: 'monospace', fontSize: 11,
                  minHeight: 30, display: 'flex', alignItems: 'center', transition: 'border-color 300ms',
                }}>
                  <span>{emailTyped}</span>
                  {emailTyped.length < EMAIL.length && (
                    <span style={{ display: 'inline-block', width: 1, height: 12, background: 'rgba(255,255,255,0.7)', marginLeft: 1, animation: 'cadastro-blink 0.8s step-end infinite' }} />
                  )}
                </div>
              </div>
              <div>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, marginBottom: 3 }}>Senha</div>
                <div style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: `0.5px solid ${passTyped.length > 0 ? 'rgba(176,203,31,0.5)' : 'rgba(255,255,255,0.12)'}`,
                  borderRadius: 8, padding: '7px 10px',
                  color: passTyped.length > 0 ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.2)',
                  fontFamily: 'monospace', fontSize: 11,
                  minHeight: 30, display: 'flex', alignItems: 'center', transition: 'border-color 300ms',
                }}>
                  {passTyped.length > 0 ? (
                    <>
                      <span>{passTyped}</span>
                      {passTyped.length < PASS.length && (
                        <span style={{ display: 'inline-block', width: 1, height: 12, background: 'rgba(255,255,255,0.7)', marginLeft: 1, animation: 'cadastro-blink 0.8s step-end infinite' }} />
                      )}
                    </>
                  ) : <span>••••••••</span>}
                </div>
              </div>
            </div>

            {/* Botão principal */}
            <button style={{
              background: submitting ? 'rgba(176,203,31,0.5)' : '#b0cb1f',
              color: '#fff', fontWeight: 700, fontSize: 11, border: 'none', borderRadius: 10,
              padding: 9, width: '100%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 6, cursor: 'pointer', transition: 'background 300ms',
            }}>
              {submitting ? (
                <>
                  <span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'cadastro-spin 0.7s linear infinite' }} />
                  Criando conta...
                </>
              ) : 'Criar Conta'}
            </button>

            {/* Divisor */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, marginTop: 14, color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
              <span>ou</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            </div>

            {/* Botões sociais */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {[
                { label: 'Continuar com Google',   icon: <GoogleIcon /> },
                { label: 'Continuar com Facebook', icon: <FacebookIcon /> },
              ].map(s => (
                <div key={s.label} style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 8, background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
                  padding: '10px 0', color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                }}>
                  {s.icon}{s.label}
                </div>
              ))}
            </div>

            {/* Link login */}
            <p style={{ textAlign: 'center', color: 'rgba(96,165,250,0.8)', fontSize: 11, margin: 0 }}>
              Não tem conta? Criar conta
            </p>
          </div>
        </div>
      </div>

      {/* ══════════ DASHBOARD ══════════ */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: phase === 'dash' ? dashOpacity : 0,
        pointerEvents: phase === 'dash' ? 'auto' : 'none',
        transition: 'opacity 350ms ease',
      }}>
        {/* Wrapper escalável — tamanho base 900×560, reduzido via scale */}
        <div style={{
          width: DASH_BASE_W,
          height: DASH_BASE_H,
          transform: `scale(${dashScale})`,
          transformOrigin: 'center center',
          flexShrink: 0,
        }}>
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
              borderBottom: '0.5px solid rgba(255,255,255,0.08)', flexShrink: 0,
            }}>
              <Image src="/logo.png" alt="minhAi" width={60} height={20} loading="eager"
                style={{ height: 20, width: 'auto', objectFit: 'contain' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)',
                  borderRadius: 8, padding: '5px 10px', color: 'rgba(255,255,255,0.7)', fontSize: 11,
                }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 14, height: 14 }}>
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  </svg>
                  Café
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 10, height: 10 }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={2} style={{ width: 14, height: 14 }}>
                    <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                  </svg>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', background: '#de691b',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '60%', height: '60%' }}>
                      <path d="M4 8h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8z" />
                      <path d="M16 9h2.5a2.5 2.5 0 0 1 0 5H16" />
                      <path d="M6 2v2" /><path d="M10 2v2" /><path d="M14 2v2" />
                      <path d="M3 21h18" />
                    </svg>
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: 600 }}>Café Exemplo</span>
                </div>
              </div>
            </div>

            {/* ── Body ── */}
            <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>

              {/* Welcome row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexShrink: 0 }}>
                <div>
                  <h1 style={{ color: '#fff', fontSize: 16, fontWeight: 700, lineHeight: 1.2, margin: 0 }}>Olá, Café Exemplo!</h1>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 3, lineHeight: 1.5 }}>
                    Bem-vindo ao seu painel de controle.
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                  <button style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'linear-gradient(135deg,#10b981,#059669)',
                    border: 'none', borderRadius: 8, padding: '6px 10px',
                    color: '#fff', fontSize: 10, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                  }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 12, height: 12 }}>
                      <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                    </svg>
                    cafe.minhai.com.br
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 9, height: 9 }}>
                      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                      <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </button>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.1)',
                    borderRadius: 8, padding: '4px 8px',
                  }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>Link na Bio</span>
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>Inativo</span>
                    <div style={{ width: 28, height: 16, background: 'rgba(255,255,255,0.1)', borderRadius: 8, position: 'relative', border: '0.5px solid rgba(255,255,255,0.15)' }}>
                      <div style={{ width: 10, height: 10, background: 'rgba(255,255,255,0.4)', borderRadius: '50%', position: 'absolute', top: 2, left: 2 }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Credits card */}
              <div style={{
                background: 'rgba(30,41,59,0.8)', border: '0.5px solid rgba(255,255,255,0.1)',
                borderRadius: 12, padding: '12px 16px',
                display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0,
              }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth={2} style={{ width: 20, height: 20 }}>
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                </div>
                <div style={{ flex: '0 0 auto' }}>
                  <h3 style={{ color: '#fff', fontSize: 12, fontWeight: 700, margin: 0 }}>Seus Créditos</h3>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, marginTop: 1 }}>Saldo para interações de IA</p>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9 }}>Progresso de Uso</span>
                    <span style={{ color: '#60a5fa', fontSize: 9, fontWeight: 600 }}>20 disponíveis</span>
                  </div>
                  <div style={{ height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: '85%', background: '#3b82f6', borderRadius: 3 }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 8 }}>0 gastos</span>
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 8 }}>Total: 20</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                  <div style={{ color: '#fff', fontSize: 20, fontWeight: 700, lineHeight: 1 }}>20</div>
                  <button style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 7, padding: '5px 10px', fontSize: 9, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 10, height: 10 }}>
                      <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
                    </svg>
                    Recarregar
                  </button>
                </div>
              </div>

              {/* Setup banner */}
              <div style={{
                background: 'rgba(30,41,59,0.5)', border: '0.5px solid rgba(255,255,255,0.08)',
                borderRadius: 12, padding: '10px 14px',
                display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
              }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth={2} style={{ width: 16, height: 16 }}>
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ color: '#fff', fontSize: 11, fontWeight: 700, margin: 0 }}>Crie seu Assistente</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden', maxWidth: 300 }}>
                      <div style={{ height: '100%', width: '1%', background: '#3b82f6', borderRadius: 3 }} />
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9 }}>1% concluído</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                  {['›', '×'].map((ch, i) => (
                    <div key={i} style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>{ch}</div>
                  ))}
                </div>
              </div>

              {/* Stats grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, flexShrink: 0 }}>
                {[
                  { label: 'Assistentes',      sub: '1 assistente',    color: '#3b82f6', bg: 'rgba(59,130,246,0.15)',  icon: <><circle cx="12" cy="12" r="9" /><circle cx="8" cy="9" r="1" fill="#3b82f6" /><circle cx="16" cy="9" r="1" fill="#3b82f6" /><path d="M8 14s1.5 2 4 2 4-2 4-2" strokeLinecap="round" /></> },
                  { label: 'Histórico',         sub: '1568 interações', color: '#10b981', bg: 'rgba(16,185,129,0.15)', icon: <><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></> },
                  { label: 'Respostas Rápidas', sub: '24 respostas',    color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', icon: <><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></> },
                ].map(card => (
                  <div key={card.label} style={{ background: 'rgba(30,41,59,0.5)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke={card.color} strokeWidth={2} style={{ width: 18, height: 18 }}>{card.icon}</svg>
                    </div>
                    <h4 style={{ color: '#fff', fontSize: 11, fontWeight: 700, margin: 0 }}>{card.label}</h4>
                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9, marginTop: 2 }}>{card.sub}</p>
                  </div>
                ))}
              </div>

              {/* Quick actions grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, flexShrink: 0 }}>
                {[
                  { label: 'Funções',       blue: false, icon: <><path d="M12 2a10 10 0 110 20 10 10 0 010-20z" /><path d="M12 8v4l3 3" /></> },
                  { label: 'Recebimentos', blue: true,  icon: <><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></> },
                  { label: 'Vendas',        blue: false, icon: <><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" /></> },
                  { label: 'Usuários',      blue: true,  icon: <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></> },
                ].map(card => (
                  <div key={card.label} style={{ background: 'rgba(30,41,59,0.5)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke={card.blue ? '#3b82f6' : '#10b981'} strokeWidth={2} style={{ width: 16, height: 16, margin: '0 auto' }}>{card.icon}</svg>
                    <h4 style={{ color: '#fff', fontSize: 10, fontWeight: 700, marginTop: 5, marginBottom: 0 }}>{card.label}</h4>
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