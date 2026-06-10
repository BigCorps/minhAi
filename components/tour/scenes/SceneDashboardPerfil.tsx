'use client'
// components/tour/scenes/SceneDashboardPerfil.tsx
// Menu usuário como dropdown no header — igual ao SceneDashboardVisao

import { useEffect, useRef, useState, useCallback } from 'react'

// ─── Ícones ────────────────────────────────────────────────────────────────
const IcoUser = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
)
const IcoCreditCard = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
  </svg>
)
const IcoWallet = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <path d="M20 12V8H6a2 2 0 01-2-2c0-1.1.9-2 2-2h12v4" />
    <path d="M4 6v12c0 1.1.9 2 2 2h14v-4" /><circle cx="18" cy="12" r="2" />
  </svg>
)
const IcoChat = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
)
const IcoUsers = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
)
const IcoLifeBuoy = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" />
    <line x1="4.93" y1="4.93" x2="9.17" y2="9.17" /><line x1="14.83" y1="14.83" x2="19.07" y2="19.07" />
    <line x1="14.83" y1="9.17" x2="19.07" y2="4.93" /><line x1="4.93" y1="19.07" x2="9.17" y2="14.83" />
  </svg>
)
const IcoLogout = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
    <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
  </svg>
)
const IcoSun = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <circle cx="12" cy="12" r="5" />
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </svg>
)
const IcoZap = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
)
const IcoCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
)
const IcoInstagram = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
  </svg>
)
const IcoTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
  </svg>
)
const IcoShield = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
)
const IcoSearch = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)

// ─── Dados ────────────────────────────────────────────────────────────────
const MENU_ITEMS = [
  { key: 'perfil',       label: 'Perfil',          Icon: IcoUser       },
  { key: 'creditos',     label: 'Créditos',         Icon: IcoCreditCard },
  { key: 'recebimentos', label: 'Recebimentos',     Icon: IcoWallet     },
  { key: 'historico',    label: 'Histórico',        Icon: IcoChat       },
  { key: 'indique',      label: 'Indique e Ganhe',  Icon: IcoUsers      },
  { key: 'ajuda',        label: 'Ajuda',            Icon: IcoLifeBuoy   },
]

const HISTORICO_ROWS = [
  { assistente: 'Café Exemplo', tipo: 'PIX',   valor: 'R$ 57,50',   status: 'CONFIRMADO', data: '10/06 14:45' },
  { assistente: 'Café Exemplo', tipo: 'PIX',   valor: 'R$ 32,00',   status: 'CONFIRMADO', data: '10/06 13:59' },
  { assistente: 'Café Exemplo', tipo: 'PIX',   valor: 'R$ 110,90',  status: 'CONFIRMADO', data: '10/06 11:37' },
  { assistente: 'Café Exemplo', tipo: 'SAQUE', valor: '-R$ 253,50', status: 'CONCLUÍDO',  data: '09/06 09:07' },
]

const HISTORICO_CHAT = [
  { assistente: 'Café Exemplo', funcao: 'Atendimento',      creditos: '2 créditos',  data: '10/06/2026, 14:52', msg: 'Olá! Gostaria de saber o horário de funcionamento.' },
  { assistente: 'Café Exemplo', funcao: 'Criador de Posts', creditos: '15 créditos', data: '09/06/2026, 11:53', msg: 'Função "Criador de Posts" executada' },
  { assistente: 'Café Exemplo', funcao: 'Atendimento',      creditos: '2 créditos',  data: '09/06/2026, 10:21', msg: 'Quais são os sabores disponíveis hoje?' },
]

const AJUDA_CARDS = [
  { label: 'Suporte',       sub: 'Fale com nossa equipe',    Icon: IcoLifeBuoy,  color: '#3b82f6' },
  { label: 'Instagram',     sub: 'Dicas e novidades',        Icon: IcoInstagram, color: '#ec4899' },
  { label: 'Sugestões',     sub: 'Ajude a melhorar',         Icon: IcoZap,       color: '#f59e0b' },
  { label: 'Excluir Dados', sub: 'Remover conta permanente', Icon: IcoTrash,     color: '#ef4444' },
  { label: 'Termos de Uso', sub: 'Leia nossos termos',       Icon: IcoShield,    color: '#10b981' },
  { label: 'Privacidade',   sub: 'Como usamos seus dados',   Icon: IcoUser,      color: '#8b5cf6' },
]

type Section = 'perfil' | 'creditos' | 'recebimentos' | 'historico' | 'indique' | 'ajuda'
const SECTION_ORDER: Section[] = ['perfil', 'creditos', 'recebimentos', 'historico', 'indique', 'ajuda']

// Fases: menu abre → itens aparecem → fecha → conteúdo exibido → próxima seção
type Phase = 'menu-open' | 'content'

const BASE_W = 900
const BASE_H = 560

export default function SceneDashboardPerfil() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  const [phase, setPhase]               = useState<Phase>('menu-open')
  const [menuOpen, setMenuOpen]         = useState(true)
  const [menuItems, setMenuItems]       = useState(0)       // quantos itens aparecem
  const [activeSection, setActiveSection] = useState<Section>('perfil')
  const [rowStep, setRowStep]           = useState(0)

  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const add = (t: ReturnType<typeof setTimeout>) => { timers.current.push(t); return t }
  const clearAll = () => { timers.current.forEach(clearTimeout); timers.current = [] }

  const recalc = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const { width: w, height: h } = el.getBoundingClientRect()
    setScale(Math.min(1, (w - 16) / BASE_W, (h - 16) / BASE_H))
  }, [])

  useEffect(() => {
    recalc()
    const ro = new ResizeObserver(recalc)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [recalc])

  // Reset row animation quando a seção muda
  useEffect(() => { setRowStep(0) }, [activeSection])

  // Anima linhas nas seções com lista
  useEffect(() => {
    const maxRows =
      activeSection === 'recebimentos' ? HISTORICO_ROWS.length :
      activeSection === 'historico'    ? HISTORICO_CHAT.length :
      activeSection === 'ajuda'        ? AJUDA_CARDS.length    : 0
    if (phase !== 'content' || maxRows === 0 || rowStep >= maxRows) return
    const t = setTimeout(() => setRowStep(v => v + 1), 280)
    timers.current.push(t)
    return () => clearTimeout(t)
  }, [phase, activeSection, rowStep])

  // ── Loop principal ────────────────────────────────────────────────────
  useEffect(() => {
    clearAll()

    if (phase === 'menu-open') {
      // Abre dropdown e anima itens um a um
      setMenuOpen(true)
      const tick = (i: number) => {
        if (i > MENU_ITEMS.length) {
          // Após todos os itens aparecerem, espera e fecha
          add(setTimeout(() => {
            setMenuOpen(false)
            add(setTimeout(() => setPhase('content'), 300))
          }, 1200))
          return
        }
        setMenuItems(i)
        add(setTimeout(() => tick(i + 1), 110))
      }
      add(setTimeout(() => tick(0), 400))
      return
    }

    if (phase === 'content') {
      // Exibe conteúdo por 4s, depois abre menu da próxima seção
      add(setTimeout(() => {
        const idx = SECTION_ORDER.indexOf(activeSection)
        const next = SECTION_ORDER[(idx + 1) % SECTION_ORDER.length]
        setActiveSection(next)
        setMenuItems(0)
        setPhase('menu-open')
      }, 4000))
      return
    }

    return clearAll
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, activeSection])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%', height: '100%',
        background: '#020617',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Wrapper de escala */}
<div style={{
  width: BASE_W,
  height: BASE_H,
  transform: `scale(${scale})`,
  transformOrigin: 'center center',
  flexShrink: 0,
}}>
  <div style={{
    width: '100%',         // ← '100%' herda do wrapper
    height: '100%',        // ← '100%' herda do wrapper
    position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          background: '#0f172a',
          borderRadius: 16,
          overflow: 'hidden',
          border: '0.5px solid rgba(255,255,255,0.08)',
          position: 'relative',
        }}>

          {/* ══ HEADER ══════════════════════════════════════════════════ */}
          <div style={{
            height: 46, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 16px',
            background: '#0f172a',
            borderBottom: '0.5px solid rgba(255,255,255,0.08)',
            position: 'relative',
            zIndex: 30,
          }}>
            {/* Left: logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg viewBox="0 0 80 24" style={{ height: 18, width: 'auto' }}>
                <text x="0" y="18" fontFamily="monospace" fontWeight="800" fontSize="18" fill="white">minhAi</text>
              </svg>
            </div>

            {/* Right: theme + assistant selector + avatar */}
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

              <div style={{
                width: 30, height: 30, borderRadius: 8,
                background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ width: 13, height: 13, color: 'rgba(255,255,255,0.55)' }}><IcoSun /></div>
              </div>

              {/* Avatar + nome — clicável, destaca quando menu aberto */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: menuOpen ? 'rgba(255,255,255,0.07)' : 'transparent',
                transition: 'background 200ms',
                cursor: 'pointer',
                padding: '3px 6px 3px 3px',
                borderRadius: 8,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: '#de691b',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
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

            {/* ── DROPDOWN MENU USUÁRIO ── */}
            {menuOpen && (
              <div style={{
                position: 'absolute',
                top: 46, right: 8,
                width: 190,
                background: '#1e293b',
                border: '0.5px solid rgba(255,255,255,0.1)',
                borderRadius: 10,
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                zIndex: 50,
              }}>
                <div style={{ padding: '7px 12px 5px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Menu Usuário
                  </span>
                </div>
                {MENU_ITEMS.slice(0, menuItems).map(item => {
                  const isActive = item.key === activeSection && phase === 'content'
                  return (
                    <div
                      key={item.key}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 9,
                        padding: '7px 12px',
                        background: isActive ? 'rgba(59,130,246,0.08)' : 'transparent',
                        borderLeft: `2px solid ${isActive ? '#3b82f6' : 'transparent'}`,
                      }}
                    >
                      <div style={{ width: 13, height: 13, flexShrink: 0, color: isActive ? '#60a5fa' : 'rgba(255,255,255,0.55)' }}>
                        <item.Icon />
                      </div>
                      <span style={{ fontSize: 10.5, color: isActive ? '#93c5fd' : 'rgba(255,255,255,0.75)', fontWeight: isActive ? 600 : 400 }}>
                        {item.label}
                      </span>
                    </div>
                  )
                })}
                {menuItems >= MENU_ITEMS.length && (
                  <>
                    <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.07)', margin: '2px 0' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 12px' }}>
                      <div style={{ width: 13, height: 13, flexShrink: 0, color: '#f87171' }}><IcoLogout /></div>
                      <span style={{ fontSize: 10.5, color: '#f87171', fontWeight: 400 }}>Sair</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* ══ BODY ════════════════════════════════════════════════════ */}
          <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>

            {/* ── PERFIL ── */}
            {activeSection === 'perfil' && phase === 'content' && (
              <>
                {/* Biometria */}
                <div style={{
                  background: 'rgba(30,41,59,0.8)', border: '0.5px solid rgba(255,255,255,0.1)',
                  borderRadius: 12, padding: '12px 16px', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth={2} style={{ width: 16, height: 16 }}>
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>Login por Biometria</div>
                      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9 }}>1 dispositivo cadastrado</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ background: 'rgba(16,185,129,0.12)', border: '0.5px solid rgba(16,185,129,0.3)', borderRadius: 6, padding: '4px 10px', color: '#34d399', fontSize: 9, fontWeight: 600 }}>✓ Ativo</div>
                    <button style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 9.5, fontWeight: 600, cursor: 'pointer' }}>Cadastrar Biometria</button>
                  </div>
                </div>

                {/* Informações + PIX */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, flex: 1 }}>
                  <div style={{ background: 'rgba(30,41,59,0.5)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 14, height: 14, color: '#3b82f6' }}><IcoUser /></div>
                      <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>Informações do Usuário</span>
                    </div>
                    {[
                      { label: 'Nome', value: 'Café Exemplo' },
                      { label: 'Tipo de Documento', value: 'CNPJ', select: true },
                      { label: 'CNPJ', value: '14.282.244/0001-19' },
                    ].map(f => (
                      <div key={f.label}>
                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, marginBottom: 4 }}>{f.label}</div>
                        <div style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '6px 10px', color: 'rgba(255,255,255,0.8)', fontSize: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          {f.value}
                          {f.select && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 10, height: 10, color: 'rgba(255,255,255,0.4)' }}><polyline points="6 9 12 15 18 9" /></svg>}
                        </div>
                      </div>
                    ))}
                    <button style={{ background: '#b0cb1f', color: '#fff', border: 'none', borderRadius: 8, padding: '7px', fontSize: 10, fontWeight: 700, cursor: 'pointer', marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 11, height: 11 }}><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
                      Salvar Informações
                    </button>
                  </div>

                  <div style={{ background: 'rgba(30,41,59,0.5)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 14, height: 14, color: '#10b981' }}><IcoWallet /></div>
                      <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>Configuração Pix</span>
                    </div>
                    <div style={{ background: 'rgba(59,130,246,0.1)', border: '0.5px solid rgba(59,130,246,0.2)', borderRadius: 8, padding: '8px 10px', color: 'rgba(255,255,255,0.6)', fontSize: 9.5, lineHeight: 1.5 }}>
                      Esta chave Pix será utilizada para <strong style={{ color: '#60a5fa' }}>SACAR</strong> o saldo consolidado de todos os recebimentos dos seus assistentes.
                    </div>
                    {[
                      { label: 'Tipo de Chave', value: 'CPF', select: true },
                      { label: 'Chave Pix', value: '377.001.318-21' },
                    ].map(f => (
                      <div key={f.label}>
                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, marginBottom: 4 }}>{f.label}</div>
                        <div style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '6px 10px', color: 'rgba(255,255,255,0.8)', fontSize: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          {f.value}
                          {f.select && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 10, height: 10, color: 'rgba(255,255,255,0.4)' }}><polyline points="6 9 12 15 18 9" /></svg>}
                        </div>
                      </div>
                    ))}
                    <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 8.5 }}>⚠ A chave Pix não pode ser alterada após o preenchimento.</div>
                  </div>
                </div>
              </>
            )}

            {/* ── CRÉDITOS ── */}
            {activeSection === 'creditos' && phase === 'content' && (
              <>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
                  <div>
                    <h2 style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: 0 }}>Gerenciamento de Créditos</h2>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9.5, marginTop: 3 }}>Escolha o pacote ideal para suas necessidades</p>
                    <div style={{ background: 'rgba(16,185,129,0.12)', border: '0.5px solid rgba(16,185,129,0.3)', borderRadius: 6, padding: '3px 8px', color: '#34d399', fontSize: 9, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
                      Plano Consulting ativo — expira em 17/04/2027
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    {[
                      { label: 'DISPONÍVEIS', value: '8.853',  color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' },
                      { label: 'UTILIZADOS',  value: '1.568',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
                      { label: 'COMPRADOS',   value: '10.400', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)' },
                    ].map(s => (
                      <div key={s.label} style={{ background: s.bg, border: `0.5px solid ${s.border}`, borderRadius: 10, padding: '8px 14px', textAlign: 'center' }}>
                        <div style={{ color: s.color, fontSize: 8, fontWeight: 700, letterSpacing: '0.5px' }}>{s.label}</div>
                        <div style={{ color: '#fff', fontSize: 16, fontWeight: 800, lineHeight: 1.2, marginTop: 2 }}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, flex: 1 }}>
                  <div style={{ background: 'rgba(30,41,59,0.5)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 8.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>PLANO</div>
                    <div style={{ color: '#fff', fontSize: 18, fontWeight: 800 }}>Top</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                      <span style={{ color: '#fff', fontSize: 17, fontWeight: 800 }}>R$ 49,90</span>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9 }}>/mês</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
                      {['50 créditos por mês', 'Serviços Google', 'Serviços Meta', 'Linha de Produção', 'QR Codes com seu logo'].map(f => (
                        <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 10, height: 10, color: '#10b981', flexShrink: 0 }}><IcoCheck /></div>
                          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9 }}>{f}</span>
                        </div>
                      ))}
                    </div>
                    <button style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '7px', fontSize: 10, fontWeight: 700, cursor: 'pointer', marginTop: 4 }}>Assinar Agora</button>
                  </div>
                  <div style={{ background: 'linear-gradient(135deg,rgba(59,130,246,0.2),rgba(59,130,246,0.08))', border: '0.5px solid rgba(59,130,246,0.4)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 8, position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 10, right: 10, background: '#f59e0b', color: '#000', fontSize: 7.5, fontWeight: 800, borderRadius: 4, padding: '2px 7px', textTransform: 'uppercase' }}>RECOMENDADO</div>
                    <div style={{ position: 'absolute', top: 28, right: 10, background: '#10b981', color: '#fff', fontSize: 7.5, fontWeight: 700, borderRadius: 4, padding: '2px 7px' }}>✓ Ativo</div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 8.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>PLANO</div>
                    <div style={{ color: '#fff', fontSize: 18, fontWeight: 800 }}>Consulting</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                      <span style={{ color: '#fff', fontSize: 17, fontWeight: 800 }}>R$ 299,90</span>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9 }}>/mês</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
                      {['300 créditos por mês', 'Serviços Google', 'Serviços Meta', 'Linha de Produção', 'QR Codes com seu logo', 'Subdomínio Próprio', 'Consultoria'].map(f => (
                        <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 10, height: 10, color: '#10b981', flexShrink: 0 }}><IcoCheck /></div>
                          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9 }}>{f}</span>
                        </div>
                      ))}
                    </div>
                    <button style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '0.5px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '7px', fontSize: 10, fontWeight: 700, cursor: 'pointer', marginTop: 4 }}>Renovar Plano</button>
                  </div>
                </div>
              </>
            )}

            {/* ── RECEBIMENTOS ── */}
            {activeSection === 'recebimentos' && phase === 'content' && (
              <>
                <div style={{ flexShrink: 0 }}>
                  <h2 style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: 0 }}>Recebimentos</h2>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9.5, marginTop: 3 }}>Gerencie seus recebimentos e solicite saque imediato</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, flexShrink: 0 }}>
                  {[
                    { label: 'Saldo Disponível',  value: 'R$ 201,90',    sub: 'Via PIX',             color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.2)' },
                    { label: 'Total Recebido',     value: 'R$ 15.484,45', sub: 'Apenas via PIX',      color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.2)' },
                    { label: 'Total Sacado',       value: 'R$ 15.103,55', sub: 'Todo o período',      color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.2)' },
                    { label: 'Comissões (Vendas)', value: 'R$ 0,00',      sub: 'Comissões pendentes', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.2)' },
                  ].map(s => (
                    <div key={s.label} style={{ background: s.bg, border: `0.5px solid ${s.border}`, borderRadius: 10, padding: '10px 12px' }}>
                      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 8.5, fontWeight: 600 }}>{s.label}</div>
                      <div style={{ color: s.color, fontSize: 14, fontWeight: 800, lineHeight: 1.3, marginTop: 3 }}>{s.value}</div>
                      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 8, marginTop: 2 }}>{s.sub}</div>
                    </div>
                  ))}
                </div>
                <div style={{ flex: 1, background: 'rgba(30,41,59,0.5)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '110px 60px 1fr 90px 90px', padding: '8px 14px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                    {['DATA', 'TIPO', 'ASSISTENTE', 'VALOR', 'STATUS'].map(h => (
                      <div key={h} style={{ color: 'rgba(255,255,255,0.3)', fontSize: 8, fontWeight: 600, letterSpacing: '0.5px' }}>{h}</div>
                    ))}
                  </div>
                  {HISTORICO_ROWS.slice(0, rowStep).map((r, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '110px 60px 1fr 90px 90px', padding: '7px 14px', borderBottom: '0.5px solid rgba(255,255,255,0.04)', alignItems: 'center' }}>
                      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9 }}>{r.data}</div>
                      <div><span style={{ background: r.tipo === 'SAQUE' ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.15)', color: r.tipo === 'SAQUE' ? '#f87171' : '#60a5fa', fontSize: 8, fontWeight: 700, borderRadius: 4, padding: '2px 6px' }}>{r.tipo}</span></div>
                      <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9 }}>{r.assistente}</div>
                      <div style={{ color: r.valor.startsWith('-') ? '#f87171' : '#fff', fontSize: 10, fontWeight: 700 }}>{r.valor}</div>
                      <div><span style={{ background: r.status === 'CONFIRMADO' ? 'rgba(16,185,129,0.15)' : 'rgba(139,92,246,0.15)', color: r.status === 'CONFIRMADO' ? '#34d399' : '#a78bfa', fontSize: 7.5, fontWeight: 700, borderRadius: 4, padding: '2px 6px' }}>{r.status}</span></div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── HISTÓRICO ── */}
            {activeSection === 'historico' && phase === 'content' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                  <div>
                    <h2 style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: 0 }}>Histórico de Conversas</h2>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9.5, marginTop: 3 }}>
                      Interações dos usuários com seus assistentes &nbsp;
                      <span style={{ color: '#60a5fa', fontWeight: 600 }}>· 2241 registros</span>
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button style={{ background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', borderRadius: 8, padding: '5px 10px', fontSize: 9, fontWeight: 600, cursor: 'pointer' }}>Exportar PDF</button>
                    <button style={{ background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', borderRadius: 8, padding: '5px 10px', fontSize: 9, fontWeight: 600, cursor: 'pointer' }}>Atualizar</button>
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <div style={{ width: 12, height: 12, color: 'rgba(255,255,255,0.3)' }}><IcoSearch /></div>
                  <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>Buscar por função, pergunta ou resposta...</span>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden' }}>
                  {HISTORICO_CHAT.slice(0, rowStep).map((r, i) => (
                    <div key={i} style={{ background: 'rgba(30,41,59,0.5)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', fontSize: 8, fontWeight: 700, borderRadius: 4, padding: '2px 7px' }}>{r.assistente}</span>
                        <span style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)', fontSize: 8, borderRadius: 4, padding: '2px 7px' }}>{r.funcao}</span>
                        <span style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24', fontSize: 8, fontWeight: 600, borderRadius: 4, padding: '2px 7px' }}>{r.creditos}</span>
                        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 8, marginLeft: 'auto' }}>{r.data}</span>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: '5px 10px', color: 'rgba(255,255,255,0.5)', fontSize: 9 }}>{r.msg}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── INDIQUE E GANHE ── */}
            {activeSection === 'indique' && phase === 'content' && (
              <>
                <div style={{ flexShrink: 0 }}>
                  <h2 style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: 0 }}>Indique e Ganhe</h2>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9.5, marginTop: 3 }}>Indique amigos e ganhe créditos a cada assinatura aprovada</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, flexShrink: 0 }}>
                  {[
                    { label: 'Indicações Realizadas', value: '7',   color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.2)' },
                    { label: 'Indicações Aprovadas',  value: '4',   color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.2)' },
                    { label: 'Créditos Ganhos',       value: '200', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.2)' },
                  ].map(s => (
                    <div key={s.label} style={{ background: s.bg, border: `0.5px solid ${s.border}`, borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                      <div style={{ color: s.color, fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{s.value}</div>
                      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, marginTop: 4 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background: 'rgba(30,41,59,0.8)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9.5, fontWeight: 600 }}>Seu link de indicação</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 12px', color: '#60a5fa', fontSize: 10, fontFamily: 'monospace' }}>
                      app.minhai.com.br/ref/cafe-exemplo
                    </div>
                    <button style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 9.5, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>Copiar</button>
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 8.5 }}>
                    A cada indicação aprovada você recebe <strong style={{ color: '#f59e0b' }}>50 créditos</strong> — automaticamente.
                  </div>
                </div>
                <div style={{ flex: 1, background: 'rgba(30,41,59,0.5)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Como funciona</div>
                  {[
                    { step: '01', text: 'Compartilhe seu link exclusivo com amigos e parceiros' },
                    { step: '02', text: 'Seu amigo se cadastra e assina qualquer plano' },
                    { step: '03', text: 'Você recebe 50 créditos automaticamente' },
                  ].map(s => (
                    <div key={s.step} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(59,130,246,0.15)', border: '0.5px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ color: '#60a5fa', fontSize: 8, fontWeight: 800 }}>{s.step}</span>
                      </div>
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9.5 }}>{s.text}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── AJUDA ── */}
            {activeSection === 'ajuda' && phase === 'content' && (
              <>
                <div style={{ flexShrink: 0 }}>
                  <h2 style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: 0 }}>Central de Ajuda</h2>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9.5, marginTop: 3 }}>Como podemos ajudá-lo hoje?</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, flex: 1 }}>
                  {AJUDA_CARDS.slice(0, rowStep).map((c, i) => (
                    <div key={i} style={{ background: 'rgba(30,41,59,0.5)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: `${c.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: 16, height: 16, color: c.color }}><c.Icon /></div>
                      </div>
                      <div>
                        <div style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>{c.label}</div>
                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, marginTop: 3 }}>{c.sub}</div>
                      </div>
                      <button style={{ background: '#b0cb1f', color: '#fff', border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: 9, fontWeight: 700, cursor: 'pointer', marginTop: 'auto' }}>
                        Acessar
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Estado vazio enquanto o menu está aberto */}
            {phase === 'menu-open' && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: 'rgba(255,255,255,0.15)', fontSize: 11 }}>
                    {MENU_ITEMS.find(m => m.key === activeSection)?.label}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}