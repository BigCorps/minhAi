'use client'
// components/tour/scenes/SceneConfig.tsx

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
function SL({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 'clamp(0.26rem, 0.6vw, 0.34rem)',
      color: C.textMuted, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.09em',
      marginBottom: 5, flexShrink: 0,
    }}>
      {children}
    </p>
  )
}

function Card({ children, accent, style }: {
  children: React.ReactNode
  accent?: { bg: string; border: string }
  style?: React.CSSProperties
}) {
  return (
    <div style={{
      borderRadius: 9, padding: '7px 9px',
      background: accent ? accent.bg : C.bg0,
      border: `1px solid ${accent ? accent.border : C.border}`,
      display: 'flex', flexDirection: 'column',
      ...style,
    }}>
      {children}
    </div>
  )
}

function ToggleRow({ label, sub, checked, accent = C.blue }: {
  label: string; sub?: string; checked: boolean; accent?: string
}) {
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
      <div style={{
        width: 22, height: 12, borderRadius: 99,
        background: checked ? accent : 'rgba(255,255,255,0.12)',
        position: 'relative', flexShrink: 0, transition: 'background 0.3s',
      }}>
        <div style={{
          position: 'absolute', top: 2, left: checked ? 12 : 2,
          width: 8, height: 8, borderRadius: '50%', background: 'white',
          transition: 'left 0.3s',
        }} />
      </div>
    </div>
  )
}

// ── Fases ──────────────────────────────────────────────────────
// 0: estado inicial          4: digita startup key
// 1: seleciona Ruidoso       5: saving
// 2: muda voz Feminino       6: saved (loop → reset → 0)
// 3: ativa Modo Fila

type Phase = 0 | 1 | 2 | 3 | 4 | 5 | 6

export default function SceneConfig() {
  const [phase,      setPhase]      = useState<Phase>(0)
  const [fading,     setFading]     = useState(false)   // fade entre edit e saved
  const [preset,     setPreset]     = useState<'silencioso'|'moderado'|'ruidoso'>('moderado')
  const [voice,      setVoice]      = useState<'masculino'|'feminino'>('masculino')
  const [filaOn,     setFilaOn]     = useState(false)
  const [startupKey, setStartupKey] = useState('')
  const [savedVis,   setSavedVis]   = useState(false)

  const STARTUP_FULL = 'modo_venda'

  // ── Máquina de estados principal ──────────────────────────────
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>

    switch (phase) {
      case 0: t = setTimeout(() => setPhase(1), 1200); break
      case 1: setPreset('ruidoso');  t = setTimeout(() => setPhase(2), 1100); break
      case 2: setVoice('feminino');  t = setTimeout(() => setPhase(3), 1100); break
      case 3: setFilaOn(true);       t = setTimeout(() => setPhase(4), 1100); break
      case 4: break // controlado por efeito de digitação abaixo
      case 5:
        t = setTimeout(() => {
          setFading(true)
          setTimeout(() => {
            setPhase(6)
            setSavedVis(false)
            setFading(false)
            setTimeout(() => setSavedVis(true), 60)
          }, 250)
        }, 1300)
        break
      case 6:
        // Exibe por 3s, depois fade e reseta tudo
        t = setTimeout(() => {
          setSavedVis(false)
          setTimeout(() => {
            setPreset('moderado')
            setVoice('masculino')
            setFilaOn(false)
            setStartupKey('')
            setSavedVis(false)
            setFading(false)
            setPhase(0)
          }, 350)
        }, 3000)
        break
    }

    return () => clearTimeout(t)
  }, [phase])

  // ── Digitação progressiva da startup key ──────────────────────
  useEffect(() => {
    if (phase !== 4) return
    if (startupKey.length >= STARTUP_FULL.length) {
      const t = setTimeout(() => setPhase(5), 600)
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

  // ── Presets de ambiente ────────────────────────────────────────
  const PRESETS = [
    {
      key: 'silencioso' as const, label: 'Silencioso', sub: 'Escritorio',
      icon: (
        <svg viewBox="0 0 24 24" width={9} height={9} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
          <line x1={23} y1={9} x2={17} y2={15}/><line x1={17} y1={9} x2={23} y2={15}/>
        </svg>
      ),
    },
    {
      key: 'moderado' as const, label: 'Moderado', sub: 'Loja tranquila',
      icon: (
        <svg viewBox="0 0 24 24" width={9} height={9} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
          <path d="M15.54 8.46a5 5 0 010 7.07"/>
        </svg>
      ),
    },
    {
      key: 'ruidoso' as const, label: 'Ruidoso', sub: 'Balcao, mercado',
      icon: (
        <svg viewBox="0 0 24 24" width={9} height={9} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
          <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/>
        </svg>
      ),
    },
  ] as const

  // ══════════════════════════════════════════════════════════════
  //  TELA SALVO
  // ══════════════════════════════════════════════════════════════
  if (isSaved) {
    return (
      <div className="w-full h-full rounded-2xl overflow-hidden select-none" style={{ background: BG }}>
        <div style={{
          width: '100%', height: '100%', padding: '9px 10px',
          opacity: savedVis ? 1 : 0, transition: 'opacity 0.3s ease',
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

          {/* Corpo: duas colunas simétricas — 3 cards cada */}
          <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>

            {/* Coluna esquerda: Ambiente · Voz · Função Inicial */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>

              <Card accent={{ bg: C.amberBg, border: C.amberBorder }} style={{ flex: 1 }}>
                <SL>Ambiente</SL>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1 }}>
                  <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke={C.amber} strokeWidth={2} strokeLinecap="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                    <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/>
                  </svg>
                  <div>
                    <p style={{ fontSize: 'clamp(0.42rem, 0.95vw, 0.54rem)', fontWeight: 700, color: C.amber }}>Ruidoso</p>
                    <p style={{ fontSize: 'clamp(0.28rem, 0.63vw, 0.36rem)', color: C.textMuted }}>Balcão, mercado</p>
                  </div>
                </div>
              </Card>

              <Card accent={{ bg: C.purpleBg, border: C.purpleBrd }} style={{ flex: 1 }}>
                <SL>Voz</SL>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1 }}>
                  <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke={C.purple} strokeWidth={2} strokeLinecap="round">
                    <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
                    <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/>
                  </svg>
                  <div>
                    <p style={{ fontSize: 'clamp(0.42rem, 0.95vw, 0.54rem)', fontWeight: 700, color: C.purple }}>Feminino</p>
                    <p style={{ fontSize: 'clamp(0.28rem, 0.63vw, 0.36rem)', color: C.textMuted }}>Neural PT-BR</p>
                  </div>
                </div>
              </Card>

              <Card accent={{ bg: C.greenBg, border: C.greenBorder }} style={{ flex: 1 }}>
                <SL>Função Inicial</SL>
                <p style={{ fontSize: 'clamp(0.4rem, 0.9vw, 0.52rem)', fontWeight: 700, color: C.green, fontFamily: 'monospace', flex: 1, display: 'flex', alignItems: 'center' }}>
                  modo_venda
                </p>
                <p style={{ fontSize: 'clamp(0.26rem, 0.6vw, 0.34rem)', color: C.textMuted }}>Abre catálogo ao detectar presença</p>
              </Card>

            </div>

            {/* Coluna direita: Módulos · Avatar · Inatividade */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>

              <Card accent={{ bg: C.blueBg, border: C.blueBorder }} style={{ flex: 2 }}>
                <SL>Módulos</SL>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, justifyContent: 'center' }}>
                  {[
                    { label: 'Modo Fila',   on: true  },
                    { label: 'Modo Vendas', on: true  },
                    { label: 'Link na Bio', on: false },
                  ].map(m => (
                    <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{
                        width: 9, height: 9, borderRadius: '50%',
                        background: m.on ? C.green : 'rgba(255,255,255,0.15)',
                        flexShrink: 0,
                      }} />
                      <span style={{ fontSize: 'clamp(0.34rem, 0.78vw, 0.44rem)', color: m.on ? C.textMain : C.textMuted, fontWeight: m.on ? 600 : 400 }}>
                        {m.label}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card style={{ flex: 1 }}>
                <SL>Avatar</SL>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1 }}>
                  <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke={C.blue} strokeWidth={2} strokeLinecap="round">
                    <circle cx={12} cy={8} r={5}/><path d="M20 21a8 8 0 10-16 0"/>
                  </svg>
                  <div>
                    <p style={{ fontSize: 'clamp(0.42rem, 0.95vw, 0.54rem)', fontWeight: 700, color: C.blue }}>Rosto</p>
                    <p style={{ fontSize: 'clamp(0.28rem, 0.63vw, 0.36rem)', color: C.textMuted }}>Expressões animadas</p>
                  </div>
                </div>
              </Card>

              <Card style={{ flex: 1 }}>
                <SL>Inatividade</SL>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, flex: 1, alignItems: 'center' } as React.CSSProperties}>
                  <p style={{ fontSize: 'clamp(0.52rem, 1.15vw, 0.68rem)', fontWeight: 700, color: C.textMain }}>300s</p>
                  <p style={{ fontSize: 'clamp(0.28rem, 0.63vw, 0.36rem)', color: C.textMuted }}>· Exibir dica de função</p>
                </div>
              </Card>

            </div>
          </div>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════
  //  TELA DE EDIÇÃO
  // ══════════════════════════════════════════════════════════════
  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none"
      style={{ background: BG, opacity: fading ? 0 : 1, transition: 'opacity 0.25s' }}
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
            Voz · Ambiente · Módulos · Comportamento
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

      {/* Corpo: duas colunas — 3 seções cada */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '7px 10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>

        {/* ── Coluna esquerda: Ambiente · Voz · Avatar ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>

          {/* Ambiente */}
          <div style={{ borderRadius: 9, padding: '7px 9px', background: C.bg0, border: `1px solid ${C.border}`, flex: 1 }}>
            <SL>Sensibilidade ao Ambiente</SL>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4 }}>
              {PRESETS.map(p => {
                const active     = preset === p.key
                const isRuidoso  = p.key === 'ruidoso'
                const bColor = active ? (isRuidoso ? C.amberBorder : C.blueBorder) : C.border
                const bgColor = active ? (isRuidoso ? C.amberBg    : C.blueBg)    : 'transparent'
                const tColor = active ? (isRuidoso ? C.amber       : C.blue)      : C.textMuted
                return (
                  <div key={p.key} style={{
                    borderRadius: 7, padding: '5px 4px 4px',
                    border: `1.5px solid ${bColor}`, background: bgColor,
                    textAlign: 'center', transition: 'all 0.3s',
                  }}>
                    <div style={{ color: tColor, display: 'flex', justifyContent: 'center', marginBottom: 3 }}>
                      {p.icon}
                    </div>
                    <p style={{ fontSize: 'clamp(0.3rem, 0.68vw, 0.38rem)', fontWeight: active ? 700 : 400, color: tColor, transition: 'color 0.3s' }}>
                      {p.label}
                    </p>
                    <p style={{ fontSize: 'clamp(0.22rem, 0.5vw, 0.28rem)', color: C.textMuted, marginTop: 1 }}>{p.sub}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Voz */}
          <div style={{ borderRadius: 9, padding: '7px 9px', background: C.bg0, border: `1px solid ${C.border}`, flex: 1 }}>
            <SL>Voz do Assistente</SL>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
              {(['masculino', 'feminino'] as const).map(v => {
                const active = voice === v
                return (
                  <div key={v} style={{
                    borderRadius: 7, padding: '5px 6px',
                    border: `1.5px solid ${active ? C.purpleBrd : C.border}`,
                    background: active ? C.purpleBg : 'transparent',
                    textAlign: 'center', transition: 'all 0.3s',
                  }}>
                    <p style={{ fontSize: 'clamp(0.32rem, 0.72vw, 0.42rem)', fontWeight: active ? 700 : 400, color: active ? C.purple : C.textMuted }}>
                      {v.charAt(0).toUpperCase() + v.slice(1)}
                    </p>
                    <p style={{ fontSize: 'clamp(0.22rem, 0.5vw, 0.28rem)', color: C.textMuted, marginTop: 1 }}>Neural PT-BR</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Avatar */}
          <div style={{ borderRadius: 9, padding: '7px 9px', background: C.bg0, border: `1px solid ${C.border}`, flex: 1 }}>
            <SL>Avatar</SL>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
              {[
                { key: 'rosto', label: 'Rosto',  sub: 'Expressões' },
                { key: 'orbe',  label: 'Orbe',   sub: 'Minimalista' },
              ].map((a, i) => (
                <div key={a.key} style={{
                  borderRadius: 7, padding: '5px 6px',
                  border: `1.5px solid ${i === 0 ? C.blueBorder : C.border}`,
                  background: i === 0 ? C.blueBg : 'transparent',
                  textAlign: 'center',
                }}>
                  <p style={{ fontSize: 'clamp(0.32rem, 0.72vw, 0.42rem)', fontWeight: i === 0 ? 700 : 400, color: i === 0 ? C.blue : C.textMuted }}>{a.label}</p>
                  <p style={{ fontSize: 'clamp(0.22rem, 0.5vw, 0.28rem)', color: C.textMuted, marginTop: 1 }}>{a.sub}</p>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ── Coluna direita: Módulos · Comportamento · Função de Boas-vindas ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>

          {/* Módulos */}
          <div style={{ borderRadius: 9, padding: '7px 9px', background: C.bg0, border: `1px solid ${C.border}`, flex: 1 }}>
            <SL>Módulos</SL>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <ToggleRow label="Modo Fila"   sub="Fila de atendimento" checked={filaOn} accent={C.blue}  />
              <ToggleRow label="Modo Vendas" sub="Loja e pedidos"      checked={true}  accent={C.green} />
              <ToggleRow label="Link na Bio" sub="Página de links"     checked={false}                  />
            </div>
          </div>

          {/* Comportamento */}
          <div style={{ borderRadius: 9, padding: '7px 9px', background: C.bg0, border: `1px solid ${C.border}`, flex: 1 }}>
            <SL>Comportamento</SL>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <ToggleRow label="Saudação por câmera" sub="Detecta presença automaticamente" checked={true} accent={C.blue} />
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 7px', borderRadius: 7, background: C.bg0, border: `1px solid ${C.border}` }}>
                <p style={{ fontSize: 'clamp(0.3rem, 0.68vw, 0.38rem)', color: C.textSub }}>Inatividade</p>
                <p style={{ fontSize: 'clamp(0.3rem, 0.68vw, 0.38rem)', color: C.textMain, fontWeight: 600 }}>300s · Dica de função</p>
              </div>
            </div>
          </div>

          {/* Função de Boas-vindas */}
          <div style={{
            borderRadius: 9, padding: '7px 9px',
            background: C.bg0,
            border: `1px solid ${phase >= 4 ? C.greenBorder : C.border}`,
            transition: 'border-color 0.3s', flex: 1,
          }}>
            <SL>Função de Boas-vindas</SL>
            <p style={{ fontSize: 'clamp(0.28rem, 0.63vw, 0.36rem)', color: C.textSub, marginBottom: 4 }}>
              Função de inicialização
            </p>
            <div style={{
              borderRadius: 6, padding: '5px 8px',
              border: `1.5px solid ${startupKey ? C.greenBorder : C.border}`,
              background: 'rgba(255,255,255,0.03)',
              fontFamily: 'monospace',
              fontSize: 'clamp(0.34rem, 0.78vw, 0.44rem)',
              color: startupKey ? C.green : C.textMuted,
              minHeight: 20, display: 'flex', alignItems: 'center',
              transition: 'border-color 0.3s, color 0.3s',
            }}>
              {startupKey || 'Ex: modo_venda, agendar...'}
              {phase === 4 && startupKey.length < STARTUP_FULL.length && (
                <span style={{ opacity: 0.7, animation: 'cfgPulse 1s infinite' }}>|</span>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Footer botão salvar */}
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
                border: '1.5px solid rgba(255,255,255,0.3)', borderTopColor: 'white',
                display: 'inline-block', animation: 'cfgSpin 0.7s linear infinite',
              }} />
              Salvando...
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" width={9} height={9} fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                <polyline points="17,21 17,13 7,13 7,21"/><polyline points="7,3 7,8 15,8"/>
              </svg>
              Salvar Alterações
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes cfgSpin  { to { transform: rotate(360deg); } }
        @keyframes cfgPulse { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>
    </div>
  )
}
