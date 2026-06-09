'use client'
// components/tour/scenes/SceneWebApp.tsx

import { useCallback, useEffect, useRef, useState } from 'react'

// ─── Base sizes ───────────────────────────────────────────────────────────────
const BASE_W = 900
const BASE_H = 540

// ─── Paleta (espelha WebAppPage dark) ────────────────────────────────────────
const ORANGE = '#f97316'
const GREEN  = '#10b981'
const WHITE  = '#f8fafc'
const MUTED  = 'rgba(248,250,252,0.50)'
const SUB    = 'rgba(248,250,252,0.25)'
const BORDER = 'rgba(255,255,255,0.07)'
const INPUTBG= 'rgba(255,255,255,0.04)'
const ROWBG  = 'rgba(255,255,255,0.02)'
const MID    = '#1e293b'
const CARD   = '#162032'

// ─── Dados ───────────────────────────────────────────────────────────────────
const THEME_COLORS = ['#f97316','#3b82f6','#10b981','#8b5cf6','#ec4899','#ef4444','#eab308','#06b6d4']
const THEME_LABELS = ['Laranja','Azul','Verde','Roxo','Rosa','Vermelho','Amarelo','Ciano']

const DOMAINS = [
  { value: 'minhai.app',    label: 'minhai.app',    desc: 'Padrão',           badge: true  },
  { value: 'minhaia.app',   label: 'minhaia.app',   desc: 'Mais Pessoal',     badge: false },
  { value: 'nossaia.app',   label: 'nossaia.app',   desc: 'Para Equipes',     badge: false },
  { value: 'suaia.app',     label: 'suaia.app',     desc: 'Foco no Cliente',  badge: false },
]

const HOME_OPTIONS = [
  { value: 'ia',     label: 'Assistente IA',       desc: 'Abre direto no assistente' },
  { value: 'vendas', label: 'Modo Vendas',          desc: 'Abre no catálogo de produtos' },
  { value: 'links',  label: 'Página de Links',      desc: 'Abre na página de contatos' },
]

const REVIEW_ROWS = [
  { label: 'Assistente', value: 'Café Exemplo' },
  { label: 'Endereço',   value: 'cafeexemplo.minhai.app' },
  { label: 'Logo',       value: 'Logo 512×512 (PNG)' },
  { label: 'Cor',        value: 'Laranja' },
  { label: 'Domínio',    value: 'minhai.app — Padrão' },
  { label: 'Página Inicial', value: 'Assistente IA' },
]

// ─── Ícone check ─────────────────────────────────────────────────────────────
const IconCheck = ({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} fill="none" stroke={color} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
  </svg>
)

// ─── Dot do StepBar ──────────────────────────────────────────────────────────
function Dot({ n, step }: { n: number; step: number }) {
  const active = step === n
  const done   = step > n
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: done ? GREEN : active ? ORANGE : BORDER,
      border: `2px solid ${done ? GREEN : active ? ORANGE : MUTED}`,
      color: '#fff', fontWeight: 700, fontSize: 11,
      transition: 'all 0.35s',
    }}>
      {done ? <IconCheck size={12} color="#fff" /> : <span>{active ? '●' : '○'}</span>}
    </div>
  )
}

// ─── StepBar ─────────────────────────────────────────────────────────────────
function StepBar({ step }: { step: number }) {
  const labels = ['Visual', 'Domínio', 'Publicar']
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
      {labels.map((label, i) => {
        const n = i + 1
        const active = step === n
        const done   = step > n
        return (
          <div key={n} style={{ display: 'flex', alignItems: 'center', flex: i < 2 ? 1 : undefined }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <Dot n={n} step={step} />
              <span style={{
                fontSize: 9, fontWeight: active ? 700 : 500,
                color: active ? ORANGE : done ? GREEN : MUTED,
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>{label}</span>
            </div>
            {i < 2 && (
              <div style={{
                flex: 1, height: 2, margin: '0 6px', marginBottom: 14,
                background: step > n ? GREEN : BORDER,
                transition: 'background 0.35s',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Botão primário ───────────────────────────────────────────────────────────
function BtnPrimary({ children, color = ORANGE }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{
      flex: 2, padding: '11px 0', borderRadius: 12,
      background: `linear-gradient(135deg, ${color}, ${color}cc)`,
      color: '#fff', fontWeight: 700, fontSize: 12,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      cursor: 'default',
    }}>
      {children}
    </div>
  )
}

function BtnSecondary({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      flex: 1, padding: '11px 0', borderRadius: 12,
      background: INPUTBG, border: `1px solid ${BORDER}`,
      color: MUTED, fontWeight: 600, fontSize: 12,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'default',
    }}>
      {children}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
export default function SceneWebApp() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale]         = useState(1)
  const [step, setStep]           = useState(1)      // 1 | 2 | 3 | 4 (sucesso)
  const [themeIdx, setThemeIdx]   = useState(0)
  const [domainIdx, setDomainIdx] = useState(0)
  const [homeIdx, setHomeIdx]     = useState(0)
  const [logoOn, setLogoOn]       = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [cycle, setCycle]         = useState(0)

  // ── Escala responsiva — NUNCA cresce, só diminui ─────────────────────────
  const recalc = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const { width: cw, height: ch } = el.getBoundingClientRect()
    const s = Math.min(1, (cw - 24) / BASE_W, (ch - 24) / BASE_H)
    setScale(s)
  }, [])

  useEffect(() => {
    recalc()
    const ro = new ResizeObserver(recalc)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [recalc])

  // ── Loop automático ───────────────────────────────────────────────────────
  // Passo 1: anima seleção de cor (0-1s) → avança (2.5s)
  // Passo 2: anima seleção de domínio + home (0-2s) → avança (3.5s)
  // Passo 3: simula publicando (0.5s) → sucesso (2s)
  // Sucesso: fica 2.5s → reinicia
  useEffect(() => {
    // reset state ao iniciar novo ciclo
    setStep(1); setThemeIdx(0); setDomainIdx(0); setHomeIdx(0)
    setLogoOn(false); setPublishing(false)

    const ts: ReturnType<typeof setTimeout>[] = []

    // Passo 1 — anima cores e logo
    ts.push(setTimeout(() => setLogoOn(true),    600))
    ts.push(setTimeout(() => setThemeIdx(1),    1000))
    ts.push(setTimeout(() => setThemeIdx(2),    1500))
    ts.push(setTimeout(() => setThemeIdx(0),    2000))
    // avança para passo 2
    ts.push(setTimeout(() => setStep(2),        2800))

    // Passo 2 — anima domínio e home
    ts.push(setTimeout(() => setDomainIdx(1),   3400))
    ts.push(setTimeout(() => setDomainIdx(2),   4000))
    ts.push(setTimeout(() => setDomainIdx(0),   4600))
    ts.push(setTimeout(() => setHomeIdx(1),     5200))
    ts.push(setTimeout(() => setHomeIdx(0),     5800))
    // avança para passo 3
    ts.push(setTimeout(() => setStep(3),        6500))

    // Passo 3 — anima publicando
    ts.push(setTimeout(() => setPublishing(true),  7000))
    ts.push(setTimeout(() => setStep(4),            8200))

    // Sucesso — reinicia
    ts.push(setTimeout(() => setCycle(c => c + 1), 11000))

    return () => ts.forEach(clearTimeout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycle])

  const themeColor  = THEME_COLORS[themeIdx]
  const themeLabel  = THEME_LABELS[themeIdx]
  const domain      = DOMAINS[domainIdx]
  const homeOpt     = HOME_OPTIONS[homeIdx]

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
      <div style={{
        position: 'absolute',
        width: BASE_W, height: BASE_H,
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
      }}>

        {/* ── Shell da página ── */}
        <div style={{
          width: '100%', height: '100%',
          background: '#0f172a',
          borderRadius: 16,
          border: '0.5px solid rgba(255,255,255,0.08)',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}>

          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 20px', flexShrink: 0,
            borderBottom: '0.5px solid rgba(255,255,255,0.08)',
            background: 'rgba(15,23,42,0.8)',
          }}>
            <div>
              <div style={{ color: WHITE, fontSize: 20, fontWeight: 800 }}>Configure seu WebApp</div>
              <div style={{ color: MUTED, fontSize: 10, marginTop: 2 }}>
                Seu assistente IA com endereço e visual próprios
              </div>
            </div>
            {/* Badge plano */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)',
              borderRadius: 100, padding: '4px 12px',
            }}>
              <svg width="8" height="8" fill={ORANGE} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>
              <span style={{ color: ORANGE, fontWeight: 600, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Plano Consulting
              </span>
            </div>
          </div>

          {/* Body */}
          <div style={{ flex: 1, padding: '16px 20px', overflow: 'hidden', display: 'flex', gap: 20 }}>

            {/* Coluna esquerda — wizard */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>

              <StepBar step={Math.min(step, 3)} />

              {/* Card do passo */}
              <div style={{
                background: CARD, border: `1px solid ${BORDER}`,
                borderRadius: 16, flex: 1, overflow: 'hidden',
                display: 'flex', flexDirection: 'column',
              }}>

                {/* ── PASSO 1: Visual ──────────────────────────────────────── */}
                {step === 1 && (
                  <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
                    <div>
                      <div style={{ color: WHITE, fontWeight: 700, fontSize: 14, marginBottom: 2 }}>Identidade visual</div>
                      <div style={{ color: MUTED, fontSize: 10 }}>Adicione o logo e a cor principal do seu negócio</div>
                    </div>

                    {/* Logo upload */}
                    <div style={{
                      border: `2px dashed ${logoOn ? 'rgba(16,185,129,0.4)' : BORDER}`,
                      borderRadius: 12, padding: '14px 16px',
                      display: 'flex', alignItems: 'center', gap: 12,
                      background: logoOn ? 'rgba(16,185,129,0.04)' : ROWBG,
                      transition: 'all 0.4s',
                    }}>
                      {logoOn ? (
                        <>
                          <div style={{
                            width: 36, height: 36, borderRadius: 8, background: '#de691b',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            border: '2px solid rgba(16,185,129,0.4)',
                          }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" style={{ width: '55%', height: '55%' }}>
                              <path d="M4 8h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8z"/>
                              <path d="M16 9h2.5a2.5 2.5 0 0 1 0 5H16"/>
                              <path d="M6 2v2"/><path d="M10 2v2"/><path d="M14 2v2"/>
                            </svg>
                          </div>
                          <div>
                            <div style={{ color: GREEN, fontSize: 11, fontWeight: 600 }}>Logo ajustado para 512×512</div>
                            <div style={{ color: MUTED, fontSize: 9 }}>PNG transparente · pronto para PWA/TWA</div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: INPUTBG, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg width="16" height="16" fill="none" stroke={MUTED} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                            </svg>
                          </div>
                          <div>
                            <div style={{ color: MUTED, fontSize: 11 }}>Clique para fazer upload do logo</div>
                            <div style={{ color: SUB, fontSize: 9 }}>PNG, JPG, WebP · Máx 5MB · convertido para 512×512</div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Cor principal */}
                    <div>
                      <div style={{ color: MUTED, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Cor principal</div>
                      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                        {THEME_COLORS.map((c, i) => (
                          <div key={c} style={{
                            width: 24, height: 24, borderRadius: '50%', background: c,
                            border: `3px solid ${themeIdx === i ? WHITE : 'transparent'}`,
                            boxShadow: themeIdx === i ? `0 0 0 2px ${c}` : 'none',
                            transition: 'all 0.25s', cursor: 'default', flexShrink: 0,
                          }} />
                        ))}
                      </div>
                    </div>

                    {/* Botão continuar */}
                    <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
                      <BtnPrimary>Continuar →</BtnPrimary>
                    </div>
                  </div>
                )}

                {/* ── PASSO 2: Domínio ─────────────────────────────────────── */}
                {step === 2 && (
                  <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1, overflow: 'hidden' }}>
                    <div>
                      <div style={{ color: WHITE, fontWeight: 700, fontSize: 14, marginBottom: 2 }}>Escolha seu domínio</div>
                      <div style={{ color: MUTED, fontSize: 10 }}>Selecione como seus clientes vão encontrar o assistente</div>
                    </div>

                    {/* Lista de domínios */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {DOMAINS.map((d, i) => {
                        const sel = domainIdx === i
                        return (
                          <div key={d.value} style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '8px 12px',
                            background: sel ? 'rgba(249,115,22,0.08)' : ROWBG,
                            border: `2px solid ${sel ? ORANGE : BORDER}`,
                            borderRadius: 10, transition: 'all 0.25s',
                          }}>
                            {/* Radio */}
                            <div style={{
                              width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                              border: `2px solid ${sel ? ORANGE : MUTED}`,
                              background: sel ? ORANGE : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'all 0.25s',
                            }}>
                              {sel && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff' }} />}
                            </div>
                            <span style={{ color: sel ? MUTED : SUB, fontSize: 10, fontFamily: 'monospace' }}>cafeexemplo.</span>
                            <span style={{ color: sel ? ORANGE : MUTED, fontWeight: 700, fontSize: 11, fontFamily: 'monospace' }}>{d.label}</span>
                            {d.badge && (
                              <span style={{
                                marginLeft: 'auto', background: 'rgba(249,115,22,0.15)',
                                border: '1px solid rgba(249,115,22,0.3)', color: ORANGE,
                                fontSize: 8, fontWeight: 700, padding: '1px 6px', borderRadius: 100,
                                textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0,
                              }}>Padrão</span>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Página inicial */}
                    <div style={{ color: MUTED, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Página Inicial</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {HOME_OPTIONS.map((o, i) => {
                        const sel = homeIdx === i
                        return (
                          <div key={o.value} style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '7px 12px',
                            background: sel ? 'rgba(249,115,22,0.08)' : ROWBG,
                            border: `2px solid ${sel ? ORANGE : BORDER}`,
                            borderRadius: 10, transition: 'all 0.25s',
                          }}>
                            <div style={{ color: sel ? WHITE : MUTED, fontWeight: 600, fontSize: 11 }}>{o.label}</div>
                            <div style={{ color: SUB, fontSize: 9, marginLeft: 4 }}>{o.desc}</div>
                            {sel && <div style={{ marginLeft: 'auto' }}><IconCheck size={12} color={ORANGE} /></div>}
                          </div>
                        )
                      })}
                    </div>

                    {/* Endereço final */}
                    <div style={{ background: ROWBG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '8px 12px', marginTop: 'auto' }}>
                      <div style={{ color: MUTED, fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Endereço final:</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 1, fontFamily: 'monospace' }}>
                        <span style={{ color: SUB, fontSize: 11 }}>https://</span>
                        <span style={{ color: WHITE, fontWeight: 800, fontSize: 13 }}>cafeexemplo</span>
                        <span style={{ color: SUB, fontSize: 11 }}>.</span>
                        <span style={{ color: ORANGE, fontWeight: 800, fontSize: 13, transition: 'color 0.25s' }}>{domain.label}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <BtnSecondary>← Voltar</BtnSecondary>
                      <BtnPrimary>Continuar →</BtnPrimary>
                    </div>
                  </div>
                )}

                {/* ── PASSO 3: Publicar ─────────────────────────────────────── */}
                {step === 3 && (
                  <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                    <div>
                      <div style={{ color: WHITE, fontWeight: 700, fontSize: 14, marginBottom: 2 }}>Tudo pronto!</div>
                      <div style={{ color: MUTED, fontSize: 10 }}>Revise e publique seu WebApp</div>
                    </div>

                    {/* Tabela de revisão */}
                    <div style={{ background: ROWBG, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden', flex: 1 }}>
                      {REVIEW_ROWS.map((row, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '8px 14px',
                          borderBottom: i < REVIEW_ROWS.length - 1 ? `1px solid ${BORDER}` : 'none',
                        }}>
                          <span style={{ color: MUTED, fontSize: 10, flex: 1 }}>{row.label}</span>
                          <span style={{
                            color: WHITE, fontSize: 11, fontWeight: 600,
                            maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {row.label === 'Cor' ? themeLabel :
                             row.label === 'Domínio' ? `${domain.label} — ${domain.desc}` :
                             row.label === 'Página Inicial' ? homeOpt.label :
                             row.value}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <BtnSecondary>← Voltar</BtnSecondary>
                      <BtnPrimary color={publishing ? 'rgba(16,185,129,0.5)' : GREEN}>
                        {publishing ? (
                          <>
                            <div style={{
                              width: 11, height: 11,
                              border: '2px solid rgba(255,255,255,0.3)',
                              borderTopColor: '#fff', borderRadius: '50%',
                              animation: 'wsp 0.7s linear infinite',
                            }} />
                            Publicando...
                          </>
                        ) : (
                          <><IconCheck size={13} color="#fff" /> Publicar WebApp</>
                        )}
                      </BtnPrimary>
                    </div>
                  </div>
                )}

                {/* ── PASSO 4: Sucesso ──────────────────────────────────────── */}
                {step === 4 && (
                  <div style={{
                    flex: 1, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 12, padding: '20px 22px',
                  }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: '50%',
                      background: 'rgba(16,185,129,0.12)',
                      border: '2px solid rgba(16,185,129,0.35)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      animation: 'wsp-pulse 2s ease-in-out infinite',
                    }}>
                      <IconCheck size={24} color={GREEN} />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: WHITE, fontWeight: 800, fontSize: 16, marginBottom: 4 }}>Seu WebApp está no ar!</div>
                      <div style={{ color: MUTED, fontSize: 11 }}>Compartilhe o link abaixo com seus clientes</div>
                    </div>

                    {/* Link do webapp */}
                    <div style={{
                      background: 'rgba(16,185,129,0.08)',
                      border: '1px solid rgba(16,185,129,0.2)',
                      borderRadius: 12, padding: '12px 16px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                      width: '100%',
                    }}>
                      <span style={{ color: GREEN, fontWeight: 700, fontSize: 14, fontFamily: 'monospace' }}>
                        cafeexemplo.{domain.label}
                      </span>
                      <div style={{
                        background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
                        borderRadius: 7, padding: '4px 12px', color: GREEN, fontWeight: 600, fontSize: 11,
                      }}>Copiar</div>
                    </div>

                    {/* Botões de ação */}
                    <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                      <div style={{
                        flex: 1, padding: '9px 0', borderRadius: 11,
                        background: `linear-gradient(135deg, ${GREEN}, #059669)`,
                        color: '#fff', fontWeight: 700, fontSize: 11,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      }}>
                        <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                        </svg>
                        Abrir WebApp
                      </div>
                      <div style={{
                        flex: 1, padding: '9px 0', borderRadius: 11,
                        background: INPUTBG, border: `1px solid ${BORDER}`,
                        color: MUTED, fontWeight: 600, fontSize: 11,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        Editar configurações
                      </div>
                    </div>
                  </div>
                )}

              </div>{/* /card */}
            </div>{/* /coluna esquerda */}

            {/* Coluna direita — preview do webapp */}
            <div style={{
              width: 180, flexShrink: 0,
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <div style={{ color: MUTED, fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Preview
              </div>

              {/* Mock do browser */}
              <div style={{
                flex: 1, background: '#0f172a',
                border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden',
                display: 'flex', flexDirection: 'column',
              }}>
                {/* Browser bar */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', flexShrink: 0,
                  background: 'rgba(255,255,255,0.04)', borderBottom: `1px solid ${BORDER}`,
                }}>
                  <div style={{ display: 'flex', gap: 3 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(239,68,68,0.5)' }} />
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(234,179,8,0.5)' }} />
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(34,197,94,0.5)' }} />
                  </div>
                  <div style={{
                    flex: 1, borderRadius: 100, padding: '2px 6px', textAlign: 'center',
                    background: 'rgba(255,255,255,0.06)',
                    color: 'rgba(255,255,255,0.3)', fontSize: 7, fontFamily: 'monospace',
                    transition: 'all 0.4s',
                  }}>
                    cafeexemplo.{domain.label}
                  </div>
                </div>

                {/* Conteúdo do webapp */}
                <div style={{
                  flex: 1, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 8, padding: '16px 12px',
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 11, background: '#de691b',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    border: `3px solid ${themeColor}`,
                    transition: 'border-color 0.4s',
                  }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" style={{ width: '52%', height: '52%' }}>
                      <path d="M4 8h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8z"/>
                      <path d="M16 9h2.5a2.5 2.5 0 0 1 0 5H16"/>
                      <path d="M6 2v2"/><path d="M10 2v2"/><path d="M14 2v2"/>
                    </svg>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: WHITE, fontWeight: 800, fontSize: 11 }}>Café Exemplo</div>
                    <div style={{ color: MUTED, fontSize: 8, marginTop: 2 }}>Agente IA</div>
                  </div>
                  <div style={{
                    width: '100%', borderRadius: 9, padding: '7px 0', textAlign: 'center',
                    fontWeight: 700, fontSize: 9, color: '#fff',
                    background: `linear-gradient(135deg, ${themeColor}, ${themeColor}bb)`,
                    transition: 'background 0.4s',
                  }}>
                    Falar com o Assistente
                  </div>

                  {/* Indicador de domínio */}
                  <div style={{
                    width: '100%', borderRadius: 7, padding: '5px 8px',
                    background: ROWBG, border: `1px solid ${BORDER}`,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth={2} style={{ width: 8, height: 8, flexShrink: 0 }}>
                      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                    </svg>
                    <span style={{ color: SUB, fontSize: 7, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {domain.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cor selecionada */}
              <div style={{
                background: ROWBG, border: `1px solid ${BORDER}`,
                borderRadius: 8, padding: '7px 10px',
                display: 'flex', alignItems: 'center', gap: 7,
              }}>
                <div style={{
                  width: 14, height: 14, borderRadius: '50%', background: themeColor,
                  flexShrink: 0, transition: 'background 0.4s',
                }} />
                <span style={{ color: MUTED, fontSize: 9, fontWeight: 600 }}>{themeLabel}</span>
              </div>
            </div>

          </div>{/* /body */}
        </div>{/* /shell */}
      </div>

      <style>{`
        @keyframes wsp { to { transform: rotate(360deg); } }
        @keyframes wsp-pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.3); }
          50%      { box-shadow: 0 0 0 10px rgba(16,185,129,0); }
        }
      `}</style>
    </div>
  )
}
