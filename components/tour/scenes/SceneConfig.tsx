'use client'
// components/tour/scenes/SceneConfig.tsx
// Simula a página de configuração técnica do assistente (editar/[id])

import { useEffect, useState } from 'react'

const BG = 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'

const C = {
  border:      'rgba(255,255,255,0.08)',
  bg0:         'rgba(255,255,255,0.04)',
  textMuted:   'rgba(255,255,255,0.32)',
  textSub:     'rgba(255,255,255,0.55)',
  textMain:    'rgba(255,255,255,0.88)',
  blue:        '#3b82f6',
  blueBg:      'rgba(59,130,246,0.12)',
  blueBorder:  'rgba(59,130,246,0.3)',
  green:       '#22c55e',
  greenBg:     'rgba(34,197,94,0.12)',
  greenBorder: 'rgba(34,197,94,0.3)',
  amber:       '#f59e0b',
  amberBg:     'rgba(245,158,11,0.12)',
  amberBorder: 'rgba(245,158,11,0.3)',
  purple:      '#a855f7',
  purpleBg:    'rgba(168,85,247,0.12)',
  purpleBrd:   'rgba(168,85,247,0.3)',
}

// ── Helpers ────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 'clamp(0.26rem, 0.6vw, 0.34rem)',
      color: C.textMuted, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.09em',
      marginBottom: 4,
    }}>
      {children}
    </p>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 'clamp(0.3rem, 0.68vw, 0.38rem)', color: C.textSub, marginBottom: 3, fontWeight: 500 }}>
      {children}
    </p>
  )
}

interface ToggleRowProps {
  label: string
  sub?: string
  checked: boolean
  accent?: string
}
function ToggleRow({ label, sub, checked, accent = C.blue }: ToggleRowProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '5px 7px', borderRadius: 7,
      background: checked ? `${accent}14` : C.bg0,
      border: `1px solid ${checked ? `${accent}40` : C.border}`,
      transition: 'all 0.3s',
    }}>
      <div>
        <p style={{ fontSize: 'clamp(0.33rem, 0.75vw, 0.42rem)', color: checked ? C.textMain : C.textSub, fontWeight: checked ? 600 : 400 }}>
          {label}
        </p>
        {sub && <p style={{ fontSize: 'clamp(0.26rem, 0.6vw, 0.34rem)', color: C.textMuted, marginTop: 1 }}>{sub}</p>}
      </div>
      {/* Toggle pill */}
      <div style={{
        width: 22, height: 12, borderRadius: 99,
        background: checked ? accent : 'rgba(255,255,255,0.12)',
        position: 'relative', flexShrink: 0,
        transition: 'background 0.3s',
      }}>
        <div style={{
          position: 'absolute', top: 2,
          left: checked ? 12 : 2,
          width: 8, height: 8, borderRadius: '50%', background: 'white',
          transition: 'left 0.3s',
        }} />
      </div>
    </div>
  )
}

// ── Fases da animação ──────────────────────────────────────────
// 0: tela inicial (campos como estão)
// 1: seleciona preset Ruidoso
// 2: muda voz para Feminino
// 3: ativa Modo Fila
// 4: digita startup function
// 5: saving
// 6: saved

type Phase = 0 | 1 | 2 | 3 | 4 | 5 | 6

export default function SceneConfig() {
  const [phase, setPhase] = useState<Phase>(0)

  // Estados que mudam ao longo da animação
  const [preset, setPreset]       = useState<'silencioso' | 'moderado' | 'ruidoso'>('moderado')
  const [voice, setVoice]         = useState<'masculino' | 'feminino'>('masculino')
  const [filaOn, setFilaOn]       = useState(false)
  const [startupKey, setStartupKey] = useState('')
  const [savedVisible, setSavedVisible] = useState(false)

  const STARTUP_FULL = 'modo_venda'

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>

    if (phase === 0) {
      t = setTimeout(() => setPhase(1), 1400)
    } else if (phase === 1) {
      setPreset('ruidoso')
      t = setTimeout(() => setPhase(2), 1200)
    } else if (phase === 2) {
      setVoice('feminino')
      t = setTimeout(() => setPhase(3), 1200)
    } else if (phase === 3) {
      setFilaOn(true)
      t = setTimeout(() => setPhase(4), 1200)
    } else if (phase === 4) {
      // digita startup key progressivamente
      t = setTimeout(() => {}, 0) // controlado pelo efeito abaixo
    } else if (phase === 5) {
      t = setTimeout(() => {
        setPhase(6)
        setTimeout(() => setSavedVisible(true), 80)
      }, 1400)
    }

    return () => clearTimeout(t)
  }, [phase])

  // Digita startup function tecla a tecla
  useEffect(() => {
    if (phase !== 4) return
    if (startupKey.length >= STARTUP_FULL.length) {
      const t = setTimeout(() => setPhase(5), 700)
      return () => clearTimeout(t)
    }
    const t = setTimeout(
      () => setStartupKey(STARTUP_FULL.slice(0, startupKey.length + 1)),
      80,
    )
    return () => clearTimeout(t)
  }, [phase, startupKey])

  const isSaving = phase === 5
  const isSaved  = phase === 6

  // ── TELA SALVO ─────────────────────────────────────────────
  if (isSaved) {
    return (
      <div
        className="w-full h-full rounded-2xl overflow-hidden select-none"
        style={{ background: BG }}
      >
        <div style={{
          width: '100%', height: '100%', padding: '10px',
          opacity: savedVisible ? 1 : 0, transition: 'opacity 0.35s ease',
          display: 'flex', flexDirection: 'column', gap: 7,
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 20, height: 20, borderRadius: 6,
                background: C.blueBg, border: `1px solid ${C.blueBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg viewBox="0 0 24 24" width={11} height={11} fill="none" stroke={C.blue} strokeWidth={2.5} strokeLinecap="round">
                  <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
              </div>
              <span style={{ fontSize: 'clamp(0.44rem, 1vw, 0.58rem)', color: C.textSub, fontWeight: 600 }}>
                Configurações salvas
              </span>
            </div>
            <span style={{
              fontSize: 'clamp(0.26rem, 0.6vw, 0.34rem)', fontWeight: 700,
              padding: '1px 7px', borderRadius: 99,
              background: C.greenBg, color: C.green, border: `1px solid ${C.greenBorder}`,
            }}>
              Ativo
            </span>
          </div>

          {/* Resumo técnico — duas colunas */}
          <div style={{
            flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, minHeight: 0,
          }}>

            {/* Col esquerda */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>

              {/* Ambiente */}
              <div style={{
                borderRadius: 9, padding: '7px 9px',
                background: C.amberBg, border: `1px solid ${C.amberBorder}`,
              }}>
                <SectionLabel>Ambiente</SectionLabel>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke={C.amber} strokeWidth={2} strokeLinecap="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/>
                  </svg>
                  <div>
                    <p style={{ fontSize: 'clamp(0.38rem, 0.85vw, 0.48rem)', fontWeight: 700, color: C.amber }}>Ruidoso</p>
                    <p style={{ fontSize: 'clamp(0.26rem, 0.6vw, 0.34rem)', color: C.textMuted }}>Balcão, mercado</p>
                  </div>
                </div>
              </div>

              {/* Voz */}
              <div style={{
                borderRadius: 9, padding: '7px 9px',
                background: C.purpleBg, border: `1px solid ${C.purpleBrd}`,
              }}>
                <SectionLabel>Voz</SectionLabel>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke={C.purple} strokeWidth={2} strokeLinecap="round">
                    <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/>
                  </svg>
                  <div>
                    <p style={{ fontSize: 'clamp(0.38rem, 0.85vw, 0.48rem)', fontWeight: 700, color: C.purple }}>Feminino</p>
                    <p style={{ fontSize: 'clamp(0.26rem, 0.6vw, 0.34rem)', color: C.textMuted }}>Neural PT-BR</p>
                  </div>
                </div>
              </div>

              {/* Avatar */}
              <div style={{
                borderRadius: 9, padding: '7px 9px',
                background: C.bg0, border: `1px solid ${C.border}`,
              }}>
                <SectionLabel>Avatar</SectionLabel>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke={C.textSub} strokeWidth={2} strokeLinecap="round">
                    <circle cx={12} cy={8} r={5}/><path d="M20 21a8 8 0 10-16 0"/>
                  </svg>
                  <div>
                    <p style={{ fontSize: 'clamp(0.38rem, 0.85vw, 0.48rem)', fontWeight: 600, color: C.textMain }}>Rosto</p>
                    <p style={{ fontSize: 'clamp(0.26rem, 0.6vw, 0.34rem)', color: C.textMuted }}>Expressoes animadas</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Col direita */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>

              {/* Modulos ativos */}
              <div style={{
                borderRadius: 9, padding: '7px 9px',
                background: C.blueBg, border: `1px solid ${C.blueBorder}`,
                flex: 1,
              }}>
                <SectionLabel>Modulos</SectionLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {[
                    { label: 'Modo Fila',    on: true  },
                    { label: 'Modo Vendas',  on: true  },
                    { label: 'Link na Bio',  on: false },
                  ].map(m => (
                    <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: m.on ? C.green : 'rgba(255,255,255,0.15)',
                        flexShrink: 0,
                      }} />
                      <span style={{ fontSize: 'clamp(0.32rem, 0.72vw, 0.41rem)', color: m.on ? C.textMain : C.textMuted, fontWeight: m.on ? 600 : 400 }}>
                        {m.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Startup function */}
              <div style={{
                borderRadius: 9, padding: '7px 9px',
                background: C.greenBg, border: `1px solid ${C.greenBorder}`,
              }}>
                <SectionLabel>Funcao inicial</SectionLabel>
                <p style={{ fontSize: 'clamp(0.36rem, 0.82vw, 0.46rem)', fontWeight: 700, color: C.green, fontFamily: 'monospace' }}>
                  modo_venda
                </p>
                <p style={{ fontSize: 'clamp(0.26rem, 0.6vw, 0.34rem)', color: C.textMuted, marginTop: 2 }}>Abre catalogo ao detectar presenca</p>
              </div>

              {/* Inatividade */}
              <div style={{
                borderRadius: 9, padding: '7px 9px',
                background: C.bg0, border: `1px solid ${C.border}`,
              }}>
                <SectionLabel>Inatividade</SectionLabel>
                <p style={{ fontSize: 'clamp(0.36rem, 0.82vw, 0.46rem)', fontWeight: 600, color: C.textMain }}>300s</p>
                <p style={{ fontSize: 'clamp(0.26rem, 0.6vw, 0.34rem)', color: C.textMuted, marginTop: 1 }}>Exibir dica de funcao</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── TELA DE EDIÇÃO ─────────────────────────────────────────
  const PRESETS = [
    {
      key: 'silencioso' as const,
      label: 'Silencioso',
      sub: 'Escritorio',
      icon: (
        <svg viewBox="0 0 24 24" width={9} height={9} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1={23} y1={9} x2={17} y2={15}/><line x1={17} y1={9} x2={23} y2={15}/>
        </svg>
      ),
    },
    {
      key: 'moderado' as const,
      label: 'Moderado',
      sub: 'Loja tranquila',
      icon: (
        <svg viewBox="0 0 24 24" width={9} height={9} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/>
        </svg>
      ),
    },
    {
      key: 'ruidoso' as const,
      label: 'Ruidoso',
      sub: 'Balcao, mercado',
      icon: (
        <svg viewBox="0 0 24 24" width={9} height={9} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/>
        </svg>
      ),
    },
  ] as const

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none"
      style={{ background: BG }}
    >
      {/* Header */}
      <div style={{
        borderBottom: `1px solid ${C.border}`,
        background: 'rgba(15,23,42,0.8)',
        padding: '6px 10px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <p style={{ fontSize: 'clamp(0.38rem, 0.86vw, 0.5rem)', color: C.textSub, fontWeight: 600 }}>
            Configurar Assistente
          </p>
          <p style={{ fontSize: 'clamp(0.26rem, 0.6vw, 0.34rem)', color: C.textMuted }}>
            Voz · Ambiente · Modulos · Comportamento
          </p>
        </div>
        <div style={{
          fontSize: 'clamp(0.26rem, 0.6vw, 0.34rem)', fontWeight: 700,
          padding: '1px 7px', borderRadius: 99,
          background: C.amberBg, color: C.amber, border: `1px solid ${C.amberBorder}`,
          opacity: phase >= 1 ? 1 : 0, transition: 'opacity 0.4s',
        }}>
          Editando...
        </div>
      </div>

      {/* Corpo: duas colunas */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '7px 10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>

        {/* Coluna esquerda */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>

          {/* Ambiente */}
          <div style={{ borderRadius: 8, padding: '6px 8px', background: C.bg0, border: `1px solid ${C.border}` }}>
            <SectionLabel>Sensibilidade ao Ambiente</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 3 }}>
              {PRESETS.map(p => {
                const active = preset === p.key
                const borderColor = active
                  ? (p.key === 'ruidoso' ? C.amberBorder : C.blueBorder)
                  : C.border
                const bgColor = active
                  ? (p.key === 'ruidoso' ? C.amberBg : C.blueBg)
                  : 'transparent'
                const textColor = active
                  ? (p.key === 'ruidoso' ? C.amber : C.blue)
                  : C.textMuted
                return (
                  <div key={p.key} style={{
                    borderRadius: 6, padding: '4px 4px 3px',
                    border: `1.5px solid ${borderColor}`,
                    background: bgColor,
                    textAlign: 'center', transition: 'all 0.3s',
                  }}>
                    <div style={{ color: textColor, display: 'flex', justifyContent: 'center', marginBottom: 2 }}>
                      {p.icon}
                    </div>
                    <p style={{ fontSize: 'clamp(0.28rem, 0.63vw, 0.36rem)', fontWeight: active ? 700 : 400, color: textColor, transition: 'color 0.3s' }}>
                      {p.label}
                    </p>
                    <p style={{ fontSize: 'clamp(0.22rem, 0.5vw, 0.28rem)', color: C.textMuted }}>{p.sub}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Voz */}
          <div style={{ borderRadius: 8, padding: '6px 8px', background: C.bg0, border: `1px solid ${C.border}` }}>
            <SectionLabel>Voz do Assistente</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
              {(['masculino', 'feminino'] as const).map(v => {
                const active = voice === v
                return (
                  <div key={v} style={{
                    borderRadius: 6, padding: '4px 6px',
                    border: `1.5px solid ${active ? C.purpleBrd : C.border}`,
                    background: active ? C.purpleBg : 'transparent',
                    textAlign: 'center', transition: 'all 0.3s',
                  }}>
                    <p style={{ fontSize: 'clamp(0.3rem, 0.68vw, 0.38rem)', fontWeight: active ? 700 : 400, color: active ? C.purple : C.textMuted, textTransform: 'capitalize' }}>
                      {v.charAt(0).toUpperCase() + v.slice(1)}
                    </p>
                    <p style={{ fontSize: 'clamp(0.22rem, 0.5vw, 0.28rem)', color: C.textMuted }}>Neural PT-BR</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Avatar */}
          <div style={{ borderRadius: 8, padding: '6px 8px', background: C.bg0, border: `1px solid ${C.border}` }}>
            <SectionLabel>Avatar</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
              {[
                { key: 'rosto', label: 'Rosto', sub: 'Expressoes' },
                { key: 'orbe',  label: 'Orbe',  sub: 'Minimalista' },
              ].map((a, i) => (
                <div key={a.key} style={{
                  borderRadius: 6, padding: '4px 6px',
                  border: `1.5px solid ${i === 0 ? C.blueBorder : C.border}`,
                  background: i === 0 ? C.blueBg : 'transparent',
                  textAlign: 'center',
                }}>
                  <p style={{ fontSize: 'clamp(0.3rem, 0.68vw, 0.38rem)', fontWeight: i === 0 ? 700 : 400, color: i === 0 ? C.blue : C.textMuted }}>{a.label}</p>
                  <p style={{ fontSize: 'clamp(0.22rem, 0.5vw, 0.28rem)', color: C.textMuted }}>{a.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Coluna direita */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>

          {/* Modulos */}
          <div style={{ borderRadius: 8, padding: '6px 8px', background: C.bg0, border: `1px solid ${C.border}` }}>
            <SectionLabel>Modulos</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <ToggleRow label="Modo Fila"   sub="Fila de atendimento" checked={filaOn}  accent={C.blue} />
              <ToggleRow label="Modo Vendas" sub="Loja e pedidos"      checked={true}   accent={C.green} />
              <ToggleRow label="Link na Bio" sub="Pagina de links"     checked={false}  />
            </div>
          </div>

          {/* Funcao inicial */}
          <div style={{ borderRadius: 8, padding: '6px 8px', background: C.bg0, border: `1px solid ${phase >= 4 ? C.greenBorder : C.border}`, transition: 'border-color 0.3s' }}>
            <SectionLabel>Funcao de Boas-vindas</SectionLabel>
            <FieldLabel>Funcao de inicializacao</FieldLabel>
            <div style={{
              borderRadius: 6, padding: '4px 7px',
              border: `1.5px solid ${startupKey ? C.greenBorder : C.border}`,
              background: 'rgba(255,255,255,0.03)',
              fontFamily: 'monospace',
              fontSize: 'clamp(0.32rem, 0.72vw, 0.41rem)',
              color: startupKey ? C.green : C.textMuted,
              minHeight: 18, display: 'flex', alignItems: 'center',
              transition: 'border-color 0.3s, color 0.3s',
            }}>
              {startupKey || 'Ex: modo_venda, agendar...'}
              {phase === 4 && startupKey.length < STARTUP_FULL.length && (
                <span style={{ opacity: 0.7, animation: 'pulse 1s infinite' }}>|</span>
              )}
            </div>
          </div>

          {/* Comportamento */}
          <div style={{ borderRadius: 8, padding: '6px 8px', background: C.bg0, border: `1px solid ${C.border}` }}>
            <SectionLabel>Comportamento</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <ToggleRow label="Saudacao por camera" sub="Detecta presenca automaticamente" checked={true} accent={C.blue} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: 'clamp(0.3rem, 0.68vw, 0.38rem)', color: C.textSub }}>Inatividade</p>
                <p style={{ fontSize: 'clamp(0.3rem, 0.68vw, 0.38rem)', color: C.textMain, fontWeight: 600 }}>300s</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: 'clamp(0.3rem, 0.68vw, 0.38rem)', color: C.textSub }}>Acao</p>
                <p style={{ fontSize: 'clamp(0.3rem, 0.68vw, 0.38rem)', color: C.textMain, fontWeight: 600 }}>Dica de funcao</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer botao salvar */}
      <div style={{ borderTop: `1px solid ${C.border}`, padding: '5px 10px', flexShrink: 0 }}>
        <div style={{
          borderRadius: 8, padding: '5px 0', textAlign: 'center',
          background: isSaving ? 'rgba(59,130,246,0.4)' : 'linear-gradient(90deg, #2563eb, #3b82f6)',
          fontSize: 'clamp(0.32rem, 0.72vw, 0.42rem)', fontWeight: 700, color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          transition: 'background 0.3s',
        }}>
          {isSaving ? (
            <>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                border: '1.5px solid rgba(255,255,255,0.3)',
                borderTopColor: 'white',
                display: 'inline-block',
                animation: 'spin 0.7s linear infinite',
              }} />
              Salvando...
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" width={9} height={9} fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                <polyline points="17,21 17,13 7,13 7,21"/><polyline points="7,3 7,8 15,8"/>
              </svg>
              Salvar Alteracoes
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>
    </div>
  )
}
