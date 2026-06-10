'use client'
// components/tour/scenes/SceneDashboardVisao.tsx
// Mock animado do Dashboard — header real + sidebar real + menu usuário + conteúdo

import Image from 'next/image'
import { useEffect, useRef, useState, useCallback } from 'react'

// ─── SVGs dos ícones (equivalentes aos lucide/custom usados no Sidebar/Header reais) ─
const IcoGrid = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
  </svg>
)
const IcoBot = () => (
  <svg viewBox="96 96 320 320" fill="none" stroke="currentColor" strokeWidth={18} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <circle cx="256" cy="256" r="145" /><circle cx="256" cy="256" r="122" />
    <ellipse cx="218" cy="230" rx="18" ry="24" fill="currentColor" stroke="none" />
    <ellipse cx="294" cy="230" rx="18" ry="24" fill="currentColor" stroke="none" />
    <path d="M216 296C237 314 275 314 296 296" strokeWidth={16} />
  </svg>
)
const IcoZap = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
)
const IcoCart = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
  </svg>
)
const IcoUserPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="17" y1="11" x2="23" y2="11" />
  </svg>
)
const IcoClipboard = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
  </svg>
)
// ─── Google icon: branco/monocromático (igual aos demais ícones do menu) ───
const IcoGoogle = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92" />
    <path d="M5.84 14.09A6.5 6.5 0 0112 5.38c1.62 0 3.06.56 4.21 1.64l2.36-2.36A11 11 0 1023 12.25" />
  </svg>
)
const IcoMeta = () => (
  <svg viewBox="0 0 287.56 191" fill="currentColor" style={{ width: '100%', height: '100%' }}>
    <path d="M31.06,126c0,11,2.41,19.41,5.56,24.51A19,19,0,0,0,53.19,160c8.1,0,15.51-2,29.79-21.76,11.44-15.83,24.92-38,34-52l15.36-23.6c10.67-16.39,23-34.61,37.18-47C181.07,5.6,193.54,0,206.09,0c21.07,0,41.14,12.21,56.5,35.11,16.81,25.08,25,56.67,25,89.27,0,19.38-3.82,33.62-10.32,44.87C271,180.13,258.72,191,238.13,191V160c17.63,0,22-16.2,22-34.74,0-26.42-6.16-55.74-19.73-76.69-9.63-14.86-22.11-23.94-35.84-23.94-14.85,0-26.8,11.2-40.23,31.17-7.14,10.61-14.47,23.54-22.7,38.13l-9.06,16c-18.2,32.27-22.81,39.62-31.91,51.75C84.74,183,71.12,191,53.19,191c-21.27,0-34.72-9.21-43-23.09C3.34,156.6,0,141.76,0,124.85Z" />
    <path d="M24.49,37.3C38.73,15.35,59.28,0,82.85,0c13.65,0,27.22,4,41.39,15.61,15.5,12.65,32,33.48,52.63,67.81l7.39,12.32c17.84,29.72,28,45,33.93,52.22,7.64,9.26,13,12,19.94,12,17.63,0,22-16.2,22-34.74l27.4-.86c0,19.38-3.82,33.62-10.32,44.87C271,180.13,258.72,191,238.13,191c-12.8,0-24.14-2.78-36.68-14.61-9.64-9.08-20.91-25.21-29.58-39.71L146.08,93.6c-12.94-21.62-24.81-37.74-31.68-45C107,40.71,97.51,31.23,82.35,31.23c-12.27,0-22.69,8.61-31.41,21.78Z" />
    <path d="M82.35,31.23c-12.27,0-22.69,8.61-31.41,21.78C38.61,71.62,31.06,99.34,31.06,126c0,11,2.41,19.41,5.56,24.51L10.14,167.91C3.34,156.6,0,141.76,0,124.85,0,94.1,8.44,62.05,24.49,37.3,38.73,15.35,59.28,0,82.85,0Z" />
  </svg>
)
const IcoChatGPT = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '100%', height: '100%' }}>
    <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.032.067L9.74 19.946a4.5 4.5 0 0 1-6.14-1.642zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0L4.075 14.02A4.5 4.5 0 0 1 2.34 7.896zm16.597 3.855l-5.833-3.387 2.02-1.168a.076.076 0 0 1 .071 0l4.742 2.738a4.5 4.5 0 0 1-.695 8.118v-5.681a.79.79 0 0 0-.305-.62zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.74-2.738a4.5 4.5 0 0 1 6.69 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
  </svg>
)
const IcoHelp = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
)
const IcoReceipt = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z" />
    <line x1="8" y1="10" x2="16" y2="10" /><line x1="8" y1="14" x2="16" y2="14" />
  </svg>
)
const IcoFolder = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
  </svg>
)
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
    <path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
    <circle cx="18" cy="12" r="2" />
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
const IcoChevronDown = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
)
const IcoSun = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <circle cx="12" cy="12" r="5" />
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </svg>
)
const IcoMenu = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
  </svg>
)
const IcoX = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

// ─── Dados dos menus ───────────────────────────────────────────────────────
const MENU_ITEMS = [
  { label: 'Dashboard',             Icon: IcoGrid,      active: true  },
  { label: 'Assistentes',           Icon: IcoBot,       active: false },
  { label: 'Funções e Habilidades', Icon: IcoZap,       active: false },
  { label: 'Vendas e Produtos',     Icon: IcoCart,      active: false },
  { label: 'Controle de Usuários',  Icon: IcoUserPlus,  active: false },
  { label: 'Linha de Produção',     Icon: IcoClipboard, active: false },
  { label: 'Serviços Google',       Icon: IcoGoogle,    active: false },
  { label: 'Serviços Meta',         Icon: IcoMeta,      active: false },
  { label: 'Integrações IA',        Icon: IcoChatGPT,   active: false },
  { label: 'Respostas Rápidas',     Icon: IcoHelp,      active: false },
  { label: 'Notas Fiscais',         Icon: IcoReceipt,   active: false },
  { label: 'Arquivos',              Icon: IcoFolder,    active: false },
]

const USER_ITEMS = [
  { label: 'Perfil',          Icon: IcoUser       },
  { label: 'Créditos',        Icon: IcoCreditCard  },
  { label: 'Recebimentos',    Icon: IcoWallet      },
  { label: 'Histórico',       Icon: IcoChat        },
  { label: 'Indique e Ganhe', Icon: IcoUsers       },
  { label: 'Ajuda',           Icon: IcoLifeBuoy    },
]

type Phase = 'idle' | 'sidebar' | 'user-menu'

const BASE_W = 900
const BASE_H = 560

export default function SceneDashboardVisao() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  const [phase, setPhase]               = useState<Phase>('idle')
  const [sidebarOpen, setSidebarOpen]   = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [sidebarItems, setSidebarItems] = useState(0)
  const [userItems, setUserItems]       = useState(0)

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

  // Loop principal de animação
  useEffect(() => {
    clearAll()

    if (phase === 'idle') {
      add(setTimeout(() => {
        setSidebarOpen(true)
        setPhase('sidebar')
        setSidebarItems(0)
      }, 1200))
      return
    }

    if (phase === 'sidebar') {
      const tick = (i: number) => {
        if (i > MENU_ITEMS.length) {
          add(setTimeout(() => {
            setSidebarOpen(false)
            add(setTimeout(() => {
              setPhase('user-menu')
              setUserMenuOpen(true)
              setUserItems(0)
            }, 400))
          }, 1500))
          return
        }
        setSidebarItems(i)
        add(setTimeout(() => tick(i + 1), 100))
      }
      tick(0)
      return
    }

    if (phase === 'user-menu') {
      const tick = (i: number) => {
        if (i > USER_ITEMS.length) {
          add(setTimeout(() => {
            setUserMenuOpen(false)
            add(setTimeout(() => {
              setPhase('idle')
            }, 400))
          }, 2000))
          return
        }
        setUserItems(i)
        add(setTimeout(() => tick(i + 1), 120))
      }
      tick(0)
      return
    }

    return clearAll
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

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
<div style={{                // wrapper: só escala
  width: BASE_W,
  height: BASE_H,
  transform: `scale(${scale})`,
  transformOrigin: 'center center',
  flexShrink: 0,
}}>
  <div style={{              // visual: flex + aparência
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: '#0f172a',
    borderRadius: 16,
    overflow: 'hidden',
    border: '0.5px solid rgba(255,255,255,0.08)',
    position: 'relative',
  }}>

        {/* ══ HEADER ══════════════════════════════════════════════════════ */}
        <div style={{
          height: 46,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          background: '#0f172a',
          borderBottom: '0.5px solid rgba(255,255,255,0.08)',
          position: 'relative',
          zIndex: 30,
        }}>
          {/* Left: hamburguer + logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 28, height: 28,
              borderRadius: 7,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: sidebarOpen ? 'rgba(255,255,255,0.07)' : 'transparent',
              color: 'rgba(255,255,255,0.85)',
              transition: 'background 200ms',
              cursor: 'pointer',
              flexShrink: 0,
            }}>
              <div style={{ width: 14, height: 14 }}>
                {sidebarOpen ? <IcoX /> : <IcoMenu />}
              </div>
            </div>
            <Image
              src="/logo.png"
              alt="minhAi"
              width={60}
              height={20}
              loading="eager"
              style={{ height: 20, width: 'auto', objectFit: 'contain' }}
            />
          </div>

          {/* Right: theme + assistant selector + avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(255,255,255,0.06)',
              border: '0.5px solid rgba(255,255,255,0.1)',
              borderRadius: 8, padding: '5px 10px',
              color: 'rgba(255,255,255,0.7)', fontSize: 11,
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
              background: 'rgba(255,255,255,0.05)',
              border: '0.5px solid rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ width: 13, height: 13, color: 'rgba(255,255,255,0.55)' }}><IcoSun /></div>
            </div>

            {/* Avatar + nome */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: userMenuOpen ? 'rgba(255,255,255,0.07)' : 'transparent',
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

          {/* ── SIDEBAR DROPDOWN ─────────────────────────────────────── */}
          {sidebarOpen && (
            <div style={{
              position: 'absolute',
              top: 46, left: 8,
              width: 210,
              background: '#1e293b',
              border: '0.5px solid rgba(255,255,255,0.1)',
              borderRadius: 10,
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              zIndex: 50,
            }}>
              <div style={{ padding: '7px 12px 5px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Menu Assistentes
                </span>
              </div>
              {MENU_ITEMS.slice(0, sidebarItems).map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9,
                    padding: '6px 12px',
                    borderLeft: `2px solid ${item.active ? '#3b82f6' : 'transparent'}`,
                    background: item.active ? 'rgba(59,130,246,0.08)' : 'transparent',
                  }}
                >
                  <div style={{
                    width: 14, height: 14, flexShrink: 0,
                    color: item.active ? '#60a5fa' : 'rgba(255,255,255,0.5)',
                  }}>
                    <item.Icon />
                  </div>
                  <span style={{
                    fontSize: 10.5,
                    color: item.active ? '#93c5fd' : 'rgba(255,255,255,0.72)',
                    fontWeight: item.active ? 600 : 400,
                  }}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* ── MENU USUÁRIO DROPDOWN ──────────────────────────────────── */}
          {userMenuOpen && (
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
              {USER_ITEMS.slice(0, userItems).map((item) => (
                <div
                  key={item.label}
                  style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 12px' }}
                >
                  <div style={{ width: 13, height: 13, flexShrink: 0, color: 'rgba(255,255,255,0.55)' }}>
                    <item.Icon />
                  </div>
                  <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.75)', fontWeight: 400 }}>
                    {item.label}
                  </span>
                </div>
              ))}
              {userItems >= USER_ITEMS.length && (
                <>
                  <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.07)', margin: '2px 0' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 12px' }}>
                    <div style={{ width: 13, height: 13, flexShrink: 0, color: '#f87171' }}>
                      <IcoLogout />
                    </div>
                    <span style={{ fontSize: 10.5, color: '#f87171', fontWeight: 400 }}>Sair</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ══ BODY ════════════════════════════════════════════════════════ */}
        <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>

          {/* Welcome row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexShrink: 0 }}>
            <div>
              <h1 style={{ color: '#fff', fontSize: 16, fontWeight: 700, lineHeight: 1.2, margin: 0 }}>Olá, André!</h1>
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

        </div>
      </div>
    </div>
  </div>
  )
}