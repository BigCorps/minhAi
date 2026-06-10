'use client'
// components/tour/scenes/SceneDashboardPerfil.tsx
// Menu do usuário — perfil, créditos, recebimentos, histórico, indicações, ajuda

import { useEffect, useState } from 'react'

const MENU_ITEMS = [
  { label: 'Perfil',          icon: '👤', desc: 'Dados da conta',              color: '#3b82f6' },
  { label: 'Créditos',        icon: '💳', desc: 'Saldo e histórico de consumo', color: '#10b981' },
  { label: 'Recebimentos',    icon: '💰', desc: 'Ganhos por indicação',         color: '#f59e0b' },
  { label: 'Histórico',       icon: '💬', desc: 'Todas as interações',          color: '#8b5cf6' },
  { label: 'Indique e Ganhe', icon: '👥', desc: 'Programa de indicação',        color: '#84cc16' },
  { label: 'Ajuda',           icon: '🆘', desc: 'Suporte direto',               color: '#ef4444' },
]

const CREDIT_HISTORY = [
  { desc: 'PIX gerado',         credits: '-2',  time: 'hoje 14:32' },
  { desc: 'Indicação aprovada', credits: '+50', time: 'hoje 10:15' },
  { desc: 'NFe emitida',        credits: '-3',  time: 'ontem 16:40' },
  { desc: 'Agendamento',        credits: '-1',  time: 'ontem 11:20' },
]

export default function SceneDashboardPerfil() {
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [menuVisible, setMenuVisible]     = useState(false)
  const [sectionStep, setSectionStep]     = useState(0)

  // Abre o menu dropdown
  useEffect(() => {
    const t = setTimeout(() => setMenuVisible(true), 500)
    return () => clearTimeout(t)
  }, [])

  // Navega para Créditos automaticamente
  useEffect(() => {
    if (!menuVisible) return
    const t = setTimeout(() => setActiveSection('Créditos'), 1800)
    return () => clearTimeout(t)
  }, [menuVisible])

  // Anima itens do histórico
  useEffect(() => {
    if (activeSection !== 'Créditos') return
    if (sectionStep >= CREDIT_HISTORY.length) return
    const t = setTimeout(() => setSectionStep(v => v + 1), 400)
    return () => clearTimeout(t)
  }, [activeSection, sectionStep])

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none"
      style={{ background: '#f8fafc' }}
    >
      {/* Header com avatar e menu */}
      <div
        className="flex items-center justify-between px-3 py-2 flex-shrink-0"
        style={{ background: 'white', borderBottom: '1px solid #e2e8f0' }}
      >
        <p className="text-slate-800 font-bold" style={{ fontSize: 'clamp(0.55rem, 1.3vw, 0.72rem)' }}>
          Minha Conta
        </p>
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-white"
            style={{ background: '#10b981', fontSize: '0.5rem' }}
          >
            CE
          </div>
          <span className="text-slate-600 font-medium" style={{ fontSize: 'clamp(0.38rem, 0.9vw, 0.5rem)' }}>
            Café Exemplo
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex gap-2 px-3 py-2 overflow-hidden">

        {/* Menu lateral */}
        <div
          className="flex-shrink-0 flex flex-col gap-1 overflow-hidden"
          style={{
            width: 'clamp(90px, 38%, 130px)',
            opacity: menuVisible ? 1 : 0,
            transition: 'opacity 400ms ease',
          }}
        >
          {MENU_ITEMS.map((item, i) => (
            <button
              key={item.label}
              onClick={() => { setActiveSection(item.label); setSectionStep(0) }}
              className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-left transition-all"
              style={{
                background: activeSection === item.label ? item.color + '12' : 'white',
                border: `1px solid ${activeSection === item.label ? item.color + '30' : '#e2e8f0'}`,
              }}
            >
              <span style={{ fontSize: '0.6rem' }}>{item.icon}</span>
              <span
                className="font-medium truncate"
                style={{
                  fontSize: 'clamp(0.35rem, 0.8vw, 0.46rem)',
                  color: activeSection === item.label ? item.color : '#374151',
                }}
              >
                {item.label}
              </span>
            </button>
          ))}
        </div>

        {/* Conteúdo da seção */}
        <div className="flex-1 min-w-0 flex flex-col gap-1.5 overflow-hidden">
          {!activeSection && (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-gray-300" style={{ fontSize: 'clamp(0.38rem, 0.9vw, 0.5rem)' }}>
                Selecione uma seção
              </p>
            </div>
          )}

          {activeSection === 'Créditos' && (
            <>
              {/* Saldo */}
              <div
                className="rounded-xl p-3 flex items-center justify-between flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}
              >
                <div>
                  <p className="text-emerald-100" style={{ fontSize: 'clamp(0.32rem, 0.75vw, 0.42rem)' }}>Saldo atual</p>
                  <p className="text-white font-bold" style={{ fontSize: 'clamp(0.75rem, 2vw, 1rem)' }}>1.840</p>
                  <p className="text-emerald-200" style={{ fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)' }}>créditos</p>
                </div>
                <div className="text-right">
                  <p className="text-emerald-100" style={{ fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)' }}>Equivalem a</p>
                  <p className="text-white font-bold" style={{ fontSize: 'clamp(0.55rem, 1.3vw, 0.72rem)' }}>R$ 92,00</p>
                </div>
              </div>

              {/* Histórico */}
              <p className="text-gray-500 font-semibold flex-shrink-0" style={{ fontSize: 'clamp(0.32rem, 0.75vw, 0.42rem)' }}>
                Histórico recente
              </p>
              <div className="flex flex-col gap-1 flex-1 overflow-hidden">
                {CREDIT_HISTORY.slice(0, sectionStep).map((h, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-xl px-2.5 py-1.5"
                    style={{ background: 'white', border: '1px solid #e2e8f0' }}
                  >
                    <div>
                      <p className="text-slate-600 font-medium" style={{ fontSize: 'clamp(0.35rem, 0.8vw, 0.46rem)' }}>{h.desc}</p>
                      <p className="text-gray-400" style={{ fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)' }}>{h.time}</p>
                    </div>
                    <span
                      className="font-bold"
                      style={{
                        fontSize: 'clamp(0.38rem, 0.9vw, 0.5rem)',
                        color: h.credits.startsWith('+') ? '#10b981' : '#ef4444',
                      }}
                    >
                      {h.credits}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeSection && activeSection !== 'Créditos' && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <span style={{ fontSize: '1.5rem' }}>
                  {MENU_ITEMS.find(m => m.label === activeSection)?.icon}
                </span>
                <p className="text-slate-600 font-bold mt-1" style={{ fontSize: 'clamp(0.42rem, 1vw, 0.55rem)' }}>
                  {activeSection}
                </p>
                <p className="text-gray-400" style={{ fontSize: 'clamp(0.32rem, 0.75vw, 0.42rem)' }}>
                  {MENU_ITEMS.find(m => m.label === activeSection)?.desc}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}