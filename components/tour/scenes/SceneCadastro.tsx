'use client'
// components/tour/scenes/SceneCadastro.tsx

import { useEffect, useState } from 'react'

const BG = 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #020617 100%)'

type Step = 'form' | 'dashboard'

export default function SceneCadastro() {
  const [step, setStep] = useState<Step>('form')
  const [emailTyped, setEmailTyped] = useState('')
  const [passTyped, setPassTyped]   = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [dashVisible, setDashVisible] = useState(false)

  const EMAIL = 'cafe@exemplo.com.br'
  const PASS  = '••••••••'

  useEffect(() => {
    if (emailTyped.length >= EMAIL.length) return
    const t = setTimeout(() => setEmailTyped(EMAIL.slice(0, emailTyped.length + 1)), 60)
    return () => clearTimeout(t)
  }, [emailTyped])

  useEffect(() => {
    if (emailTyped.length < EMAIL.length) return
    if (passTyped.length >= PASS.length) return
    const t = setTimeout(() => setPassTyped(PASS.slice(0, passTyped.length + 1)), 80)
    return () => clearTimeout(t)
  }, [emailTyped, passTyped])

  useEffect(() => {
    if (passTyped.length < PASS.length) return
    const t = setTimeout(() => {
      setSubmitting(true)
      setTimeout(() => {
        setStep('dashboard')
        setTimeout(() => setDashVisible(true), 100)
      }, 1000)
    }, 600)
    return () => clearTimeout(t)
  }, [passTyped])

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden flex items-center justify-center select-none"
      style={{ background: BG }}
    >
      {/* ── Formulário ── */}
      {step === 'form' && (
        <div
          className="flex flex-col rounded-2xl p-5 w-full"
          style={{
            maxWidth: 'clamp(260px, 75%, 360px)',
            background: 'rgba(30,41,59,0.5)',
            border: '0.5px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {/* Logo */}
          <div className="text-center mb-4">
            <div
              className="inline-block px-3 py-1 rounded-xl mb-2"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <span
                className="font-extrabold tracking-tight"
                style={{ fontSize: 'clamp(0.9rem, 2vw, 1.15rem)', color: '#b0cb1f' }}
              >
                minhAi
              </span>
            </div>
            <p className="text-white font-bold" style={{ fontSize: 'clamp(0.75rem, 1.8vw, 1rem)' }}>
              Criar Conta
            </p>
            <p className="text-white/50" style={{ fontSize: 'clamp(0.45rem, 1vw, 0.58rem)' }}>
              Crie sua conta para começar
            </p>
          </div>

          {/* Botões sociais */}
          <div className="flex gap-2 mb-3">
            {[
              {
                label: 'Continuar com Google',
                icon: (
                  <svg viewBox="0 0 24 24" className="w-3 h-3 flex-shrink-0">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                ),
              },
              {
                label: 'Continuar com Facebook',
                icon: (
                  <svg viewBox="0 0 24 24" className="w-3 h-3 flex-shrink-0" fill="#1877F2">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                ),
              },
            ].map(s => (
              <button
                key={s.label}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-1.5"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '0.5px solid rgba(255,255,255,0.1)',
                  fontSize: 'clamp(0.38rem, 0.85vw, 0.5rem)',
                  color: 'rgba(255,255,255,0.8)',
                }}
              >
                {s.icon}
                {s.label}
              </button>
            ))}
          </div>

          {/* Divisor */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-white/30" style={{ fontSize: 'clamp(0.38rem, 0.85vw, 0.48rem)' }}>ou</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Campos */}
          <div className="flex flex-col gap-2 mb-3">
            {/* Email */}
            <div>
              <label className="text-white/50 block mb-0.5" style={{ fontSize: 'clamp(0.38rem, 0.85vw, 0.48rem)' }}>
                Email
              </label>
              <div
                className="w-full rounded-lg px-2.5 py-1.5 font-mono flex items-center"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: `0.5px solid ${emailTyped.length > 0 ? 'rgba(176,203,31,0.5)' : 'rgba(255,255,255,0.12)'}`,
                  color: 'rgba(255,255,255,0.85)',
                  fontSize: 'clamp(0.42rem, 1vw, 0.55rem)',
                  minHeight: '1.8rem',
                }}
              >
                {emailTyped}
                {emailTyped.length < EMAIL.length && (
                  <span className="animate-pulse inline-block w-px h-3 bg-white/70 ml-px" />
                )}
              </div>
            </div>

            {/* Senha */}
            <div>
              <label className="text-white/50 block mb-0.5" style={{ fontSize: 'clamp(0.38rem, 0.85vw, 0.48rem)' }}>
                Senha
              </label>
              <div
                className="w-full rounded-lg px-2.5 py-1.5 font-mono flex items-center"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: `0.5px solid ${passTyped.length > 0 ? 'rgba(176,203,31,0.5)' : 'rgba(255,255,255,0.12)'}`,
                  color: 'rgba(255,255,255,0.85)',
                  fontSize: 'clamp(0.42rem, 1vw, 0.55rem)',
                  minHeight: '1.8rem',
                }}
              >
                {passTyped.length > 0 ? (
                  <>
                    {passTyped}
                    {passTyped.length < PASS.length && (
                      <span className="animate-pulse inline-block w-px h-3 bg-white/70 ml-px" />
                    )}
                  </>
                ) : (
                  <span className="text-white/20">••••••••</span>
                )}
              </div>
            </div>
          </div>

          {/* Botão principal */}
          <button
            className="w-full rounded-xl py-2 font-bold text-white flex items-center justify-center gap-2"
            style={{
              background: submitting ? 'rgba(176,203,31,0.5)' : '#b0cb1f',
              fontSize: 'clamp(0.48rem, 1.1vw, 0.62rem)',
              transition: 'background 300ms ease',
            }}
          >
            {submitting ? (
              <>
                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Criando conta...
              </>
            ) : (
              'Criar Conta'
            )}
          </button>

          <p
            className="text-center mt-2"
            style={{ fontSize: 'clamp(0.38rem, 0.85vw, 0.48rem)', color: 'rgba(96,165,250,0.8)' }}
          >
            Já tem conta? Fazer login
          </p>
        </div>
      )}

      {/* ── Dashboard após cadastro ── */}
      {step === 'dashboard' && (
        <div
          className="w-full h-full flex flex-col p-3 gap-2"
          style={{ opacity: dashVisible ? 1 : 0, transition: 'opacity 400ms ease' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(176,203,31,0.15)' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="#b0cb1f" strokeWidth={2} strokeLinecap="round" className="w-3.5 h-3.5">
                  <rect x="3" y="3" width="7" height="7" rx="1"/>
                  <rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="3" y="14" width="7" height="7" rx="1"/>
                  <rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
              </div>
              <span className="text-white/60 font-semibold" style={{ fontSize: 'clamp(0.48rem, 1.1vw, 0.62rem)' }}>
                Dashboard
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(176,203,31,0.2)' }}
              >
                <span style={{ fontSize: '0.42rem', color: '#b0cb1f', fontWeight: 700 }}>CE</span>
              </div>
              <span className="text-white/40" style={{ fontSize: 'clamp(0.38rem, 0.85vw, 0.48rem)' }}>
                cafe@exemplo.com.br
              </span>
            </div>
          </div>

          {/* Card CTA */}
          <div
            className="flex-shrink-0 rounded-2xl p-4 flex items-center gap-3"
            style={{
              background: 'linear-gradient(135deg, rgba(176,203,31,0.12), rgba(176,203,31,0.04))',
              border: '0.5px solid rgba(176,203,31,0.25)',
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(176,203,31,0.15)' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="#b0cb1f" strokeWidth={2} strokeLinecap="round" className="w-5 h-5">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
                <circle cx="12" cy="16" r="1" fill="#b0cb1f"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold" style={{ fontSize: 'clamp(0.55rem, 1.3vw, 0.72rem)' }}>
                Criar meu primeiro assistente com IA
              </p>
              <p className="text-white/40" style={{ fontSize: 'clamp(0.4rem, 0.9vw, 0.52rem)' }}>
                Pronto em menos de 5 minutos · sem código
              </p>
            </div>
            <div
              className="rounded-xl px-3 py-1.5 font-bold text-white flex-shrink-0"
              style={{ background: '#b0cb1f', fontSize: 'clamp(0.42rem, 1vw, 0.55rem)' }}
            >
              Começar
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 flex-shrink-0">
            {[
              { label: 'Assistentes', value: '0', accent: false },
              { label: 'Interações',  value: '0', accent: false },
              { label: 'Créditos',    value: '100', accent: true },
            ].map(s => (
              <div
                key={s.label}
                className="rounded-xl p-2.5 text-center"
                style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)' }}
              >
                <p
                  className="font-bold"
                  style={{
                    fontSize: 'clamp(0.65rem, 1.5vw, 0.85rem)',
                    color: s.accent ? '#b0cb1f' : '#fff',
                  }}
                >
                  {s.value}
                </p>
                <p className="text-white/40" style={{ fontSize: 'clamp(0.35rem, 0.8vw, 0.44rem)' }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>

          {/* Próximos passos */}
          <div
            className="rounded-xl p-2.5 flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.07)' }}
          >
            <p
              className="text-white/40 font-semibold mb-1.5 tracking-wider uppercase"
              style={{ fontSize: 'clamp(0.32rem, 0.75vw, 0.42rem)' }}
            >
              Próximos passos
            </p>
            {[
              { label: 'Criar conta',              done: true  },
              { label: 'Criar primeiro assistente', done: false },
              { label: 'Publicar no seu site',      done: false },
            ].map(item => (
              <div
                key={item.label}
                className="flex items-center gap-2 py-1"
                style={{ borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0 flex items-center justify-center"
                  style={{ background: item.done ? '#b0cb1f' : 'rgba(255,255,255,0.1)' }}
                >
                  {item.done && (
                    <svg viewBox="0 0 10 10" className="w-1.5 h-1.5" fill="none" stroke="#fff" strokeWidth={2}>
                      <path d="M2 5l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span
                  style={{
                    fontSize: 'clamp(0.38rem, 0.85vw, 0.48rem)',
                    color: item.done ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.6)',
                    textDecoration: item.done ? 'line-through' : 'none',
                  }}
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}