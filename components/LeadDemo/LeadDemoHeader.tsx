'use client'

// components/LeadDemo/LeadDemoHeader.tsx
//
// MODIFICADO: adicionados botões de modo (Shop, Full, Link, User, Kiosk)
// e setas de navegação (← →) que abrem o tour educativo.
// Props novas: onModoBtnClick e onArrowClick (ambas opcionais).

import { useState, useEffect } from 'react'
import { useTheme }   from 'next-themes'
import { useWakeLock } from '@/hooks/useWakeLock'
import { Moon, Sun, Lock, LockOpen } from 'lucide-react'

// ── Tipos ────────────────────────────────────────────────────────

export interface LeadDemoHeaderProps {
  nomeNegocio: string
  logoUrl?: string | null
  /** Qualquer botão de modo (Shop / Full / Link / User / Kiosk) abre o tour de modos. */
  onModoBtnClick?: () => void
  /** Setas ← → abrem o tour da página do assistente. */
  onArrowClick?: (dir: 'prev' | 'next') => void
}

// ── SVGs dos botões de modo (extraídos de SceneAssistente) ────────

const ModeIcons = {
  Shop: () => (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  Full: () => (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
    </svg>
  ),
  Link: () => (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  ),
  User: () => (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Kiosk: () => (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
}

const MODE_BTN_LIST = [
  ModeIcons.Shop,
  ModeIcons.Full,
  ModeIcons.Link,
  ModeIcons.User,
  ModeIcons.Kiosk,
] as const

// ── Componente ───────────────────────────────────────────────────

export function LeadDemoHeader({
  nomeNegocio,
  logoUrl,
  onModoBtnClick,
  onArrowClick,
}: LeadDemoHeaderProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted]       = useState(false)
  const { isSupported, isActive, error, requestWakeLock, releaseWakeLock } = useWakeLock()
  const [toast, setToast]           = useState<string | null>(null)

  useEffect(() => { setMounted(true) }, [])

  const theme = mounted ? ((resolvedTheme as 'dark' | 'light') ?? 'dark') : 'dark'

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const handleToggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  const handleToggleWakeLock = async () => {
    if (!isSupported) { showToast('Tela sempre ligada não é suportada neste navegador'); return }
    if (isActive) {
      await releaseWakeLock()
      showToast('Tela sempre ligada desativada')
    } else {
      const ok = await requestWakeLock()
      showToast(ok ? 'Tela sempre ligada ativada!' : (error || 'Erro ao ativar'))
    }
  }

  // ── Estilos ──────────────────────────────────────────────────

  const utilBtnClass = `p-2 rounded-lg backdrop-blur-xl border transition-all hover:scale-110 active:scale-95 ${
    theme === 'dark'
      ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
      : 'bg-black/5 border-black/10 text-black hover:bg-black/10'
  }`

  const modeBtnClass = `w-8 h-8 rounded-lg flex items-center justify-center transition-all
    hover:scale-110 active:scale-95 border flex-shrink-0 ${
    theme === 'dark'
      ? 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white'
      : 'bg-black/5 border-black/10 text-gray-500 hover:bg-black/10 hover:text-gray-800'
  }`

  const arrowBtnClass = `w-8 h-8 rounded-lg flex items-center justify-center transition-all
    opacity-40 hover:opacity-100 active:scale-95 flex-shrink-0 ${
    theme === 'dark'
      ? 'text-white hover:bg-white/10'
      : 'text-gray-700 hover:bg-black/5'
  }`

  if (!mounted) {
    return (
      <header className="w-full border-b bg-gradient-to-r from-slate-950/80 via-slate-900/70 to-slate-950/80 border-white/5 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 h-[72px]" />
      </header>
    )
  }

  return (
    <header
      className={`w-full border-b transition-colors ${
        theme === 'dark'
          ? 'bg-gradient-to-r from-slate-950/80 via-slate-900/70 to-slate-950/80 border-white/5 backdrop-blur-xl'
          : 'bg-white/80 border-gray-200 backdrop-blur-xl'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Desktop ── */}
        <div className="hidden md:flex md:items-center md:justify-between py-4">

          {/* Esquerda: logo + nome */}
          <div className="flex items-center space-x-3">
            <LogoPlaceholder logoUrl={logoUrl} theme={theme} size={40} />
            <div className="flex flex-col">
              <h1 className={`text-xl sm:text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {nomeNegocio}
              </h1>
              <p className={`text-xs sm:text-sm tracking-wider uppercase ${theme === 'dark' ? 'text-white/40' : 'text-gray-500'}`}>
                Demonstração minhAi
              </p>
            </div>
          </div>

          {/* Direita: setas + modos + utilidades + logo */}
          <div className="flex items-center gap-1.5">

            {/* Setas de navegação */}
            {onArrowClick && (
              <>
                <button
                  onClick={() => onArrowClick('prev')}
                  className={arrowBtnClass}
                  title="Ver página do assistente"
                  aria-label="Navegação anterior"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                    strokeLinecap="round" className="w-4 h-4">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <button
                  onClick={() => onArrowClick('next')}
                  className={arrowBtnClass}
                  title="Ver página do assistente"
                  aria-label="Navegação próxima"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                    strokeLinecap="round" className="w-4 h-4">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>

                {/* Mini separador */}
                <div className={`w-px h-5 mx-0.5 ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-300'}`} />
              </>
            )}

            {/* Botões de modo */}
            {onModoBtnClick && MODE_BTN_LIST.map((Icon, i) => (
              <button
                key={i}
                onClick={onModoBtnClick}
                className={modeBtnClass}
                title="Ver modos do assistente"
                aria-label="Abrir demonstração de modos"
              >
                <div style={{ width: 16, height: 16 }}>
                  <Icon />
                </div>
              </button>
            ))}

            {/* Mini separador */}
            {onModoBtnClick && (
              <div className={`w-px h-5 mx-0.5 ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-300'}`} />
            )}

            {/* Wake lock */}
            {isSupported && (
              <button
                onClick={handleToggleWakeLock}
                className={`${utilBtnClass} ${isActive ? 'ring-2 ring-green-500 ring-opacity-50' : ''}`}
                title={isActive ? 'Tela ligada ativa' : 'Manter tela sempre ligada'}
              >
                {isActive
                  ? <Lock className="w-5 h-5 text-green-400" />
                  : <LockOpen className="w-5 h-5" />}
              </button>
            )}

            {/* Tema */}
            <button
              onClick={handleToggleTheme}
              className={utilBtnClass}
              title={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Separador principal */}
            <div className={`w-px h-10 ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-300'}`} />

            <MinhAiLogo size={40} />
          </div>
        </div>

        {/* ── Mobile ── */}
        <div className="md:hidden py-3 space-y-2">

          {/* Linha 1: logo + nome + minhAi */}
          <div className="relative flex items-center justify-center min-h-[44px] px-2">
            <div className="absolute left-0">
              <LogoPlaceholder logoUrl={logoUrl} theme={theme} size={32} />
            </div>
            <div className="flex flex-col items-center text-center">
              <h1 className={`text-base font-bold whitespace-nowrap ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {nomeNegocio}
              </h1>
              <p className={`text-[10px] tracking-wider uppercase whitespace-nowrap ${theme === 'dark' ? 'text-white/40' : 'text-gray-500'}`}>
                Demonstração minhAi
              </p>
            </div>
            <div className="absolute right-0">
              <MinhAiLogo size={32} />
            </div>
          </div>

          {/* Linha 2: setas + modos + utilidades */}
          <div className="flex items-center justify-center gap-1.5 flex-wrap">

            {/* Setas */}
            {onArrowClick && (
              <>
                <button onClick={() => onArrowClick('prev')} className={arrowBtnClass} aria-label="Anterior">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                    strokeLinecap="round" className="w-4 h-4"><path d="M15 18l-6-6 6-6" /></svg>
                </button>
                <button onClick={() => onArrowClick('next')} className={arrowBtnClass} aria-label="Próximo">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                    strokeLinecap="round" className="w-4 h-4"><path d="M9 18l6-6-6-6" /></svg>
                </button>
                <div className={`w-px h-5 ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-300'}`} />
              </>
            )}

            {/* Botões de modo (mobile: menores) */}
            {onModoBtnClick && MODE_BTN_LIST.map((Icon, i) => (
              <button
                key={i}
                onClick={onModoBtnClick}
                aria-label="Abrir demonstração de modos"
                className={`w-7 h-7 rounded-lg flex items-center justify-center border flex-shrink-0
                  transition-all active:scale-95 ${
                  theme === 'dark'
                    ? 'bg-white/5 border-white/10 text-white/50'
                    : 'bg-black/5 border-black/10 text-gray-500'
                }`}
              >
                <div style={{ width: 13, height: 13 }}>
                  <Icon />
                </div>
              </button>
            ))}

            {onModoBtnClick && <div className={`w-px h-5 ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-300'}`} />}

            {/* Wake lock */}
            {isSupported && (
              <button
                onClick={handleToggleWakeLock}
                className={`p-2 rounded-lg backdrop-blur-xl border transition-all active:scale-95 ${
                  theme === 'dark' ? 'bg-white/5 border-white/10 text-white' : 'bg-black/5 border-black/10 text-black'
                } ${isActive ? 'ring-2 ring-green-500 ring-opacity-50' : ''}`}
              >
                {isActive
                  ? <Lock className="w-4 h-4 text-green-400" />
                  : <LockOpen className="w-4 h-4" />}
              </button>
            )}

            {/* Tema */}
            <button
              onClick={handleToggleTheme}
              className={`p-2 rounded-lg backdrop-blur-xl border transition-all active:scale-95 ${
                theme === 'dark' ? 'bg-white/5 border-white/10 text-white' : 'bg-black/5 border-black/10 text-black'
              }`}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9998] pointer-events-none">
          <div className={`px-6 py-3 rounded-lg shadow-lg backdrop-blur-xl border text-sm font-medium ${
            theme === 'dark'
              ? 'bg-slate-800/95 border-white/10 text-white'
              : 'bg-white/95 border-gray-200 text-gray-900'
          }`}>
            {toast}
          </div>
        </div>
      )}
    </header>
  )
}

// ── Sub-componentes ──────────────────────────────────────────────

function LogoPlaceholder({ logoUrl, theme, size }: { logoUrl?: string | null; theme: 'dark' | 'light'; size: number }) {
  if (logoUrl) {
    return <img src={logoUrl} alt="Logo do negócio" className="rounded-full object-cover flex-shrink-0"
      style={{ width: size, height: size }} />
  }
  return (
    <div
      className={`rounded-full flex items-center justify-center flex-shrink-0 border-2 border-dashed ${
        theme === 'dark' ? 'bg-white/5 border-white/20 text-white/40' : 'bg-black/5 border-black/20 text-gray-400'
      }`}
      style={{ width: size, height: size }}
    >
      <span style={{ fontSize: size * 0.18 }} className="text-center leading-tight font-medium px-1">
        Seu Logo Aqui
      </span>
    </div>
  )
}

function MinhAiLogo({ size }: { size: number }) {
  return (
    <img src="/logo-circle.png" alt="minhAi logo" className="rounded-lg flex-shrink-0"
      style={{ width: size, height: size }} />
  )
}