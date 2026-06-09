'use client'
// components/tour/scenes/SceneAuxiliaresIntro.tsx

import { useEffect, useState } from 'react'
import {
  ShoppingCart,
  FileText,
  Receipt,
  Factory,
  CalendarClock,
  Package,
  ShieldAlert,
  FileBarChart2,
  Settings2,
  Sparkles,
} from 'lucide-react'

// 3 cores alternadas: lime, blue, amber
const COLORS = ['#84cc16', '#3b82f6', '#f59e0b']

const ESPECIALISTAS = [
  { nome: 'Vendas',           tagline: 'Do pedido ao pagamento',       Icon: ShoppingCart },
  { nome: 'Orçamentos',       tagline: 'Orçamento em segundos',        Icon: FileText     },
  { nome: 'Criador de Posts', tagline: 'Arte gerada por IA',           Icon: Sparkles     },
  { nome: 'Agenda',           tagline: 'Consultas, salões e reuniões', Icon: CalendarClock},
  { nome: 'Fiscal',           tagline: 'Emite NFe, NFSe e NFCe',       Icon: Receipt      },
  { nome: 'Cadastro',         tagline: 'Produtos criados por voz',     Icon: Package      },
  { nome: 'Produção',         tagline: 'Custo e margem calculados',    Icon: Factory      },
  { nome: 'Antifraude',       tagline: 'Detecção ágil de fraudes',     Icon: ShieldAlert  },
  { nome: 'Relatórios',       tagline: 'Arquivos viram relatórios',    Icon: FileBarChart2},
  { nome: 'Funções',          tagline: 'Configura sem código',         Icon: Settings2    },
].map((e, i) => ({ ...e, color: COLORS[i % COLORS.length] }))

// Linhas: 3 + 4 + 3
const LINHAS = [
  ESPECIALISTAS.slice(0, 3),
  ESPECIALISTAS.slice(3, 7),
  ESPECIALISTAS.slice(7, 10),
]

const BG = 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'

export default function SceneAuxiliaresIntro() {
  const [visibleCount, setVisibleCount] = useState(0)

  useEffect(() => {
    if (visibleCount >= ESPECIALISTAS.length) return
    const t = setTimeout(() => setVisibleCount(v => v + 1), 150)
    return () => clearTimeout(t)
  }, [visibleCount])

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none"
      style={{ background: BG }}
    >
      {/* Header */}
      <div className="flex-shrink-0 text-center pt-3 pb-1 px-4">
        <p
          className="font-semibold uppercase tracking-widest"
          style={{ color: '#84cc16', fontSize: 'clamp(0.42rem, 1vw, 0.55rem)' }}
        >
          Especialistas de IA
        </p>
        <h2
          className="font-bold text-white"
          style={{ fontSize: 'clamp(0.75rem, 2vw, 1.1rem)' }}
        >
          Sua equipe digital{' '}
          <span style={{ color: '#84cc16' }}>completa</span>
        </h2>
      </div>

      {/* Grid em 3 linhas: 3 + 4 + 3 */}
      <div className="flex-1 min-h-0 flex flex-col justify-center gap-2 p-3">
        {LINHAS.map((linha, li) => (
          <div
            key={li}
            className="flex justify-center gap-2"
          >
            {linha.map((e) => {
              const globalIndex = ESPECIALISTAS.findIndex(x => x.nome === e.nome)
              return (
                <div
                  key={e.nome}
                  className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl border text-center"
                  style={{
                    flex: 1,
                    maxWidth: li === 1 ? '24%' : '32%',
                    background: `${e.color}08`,
                    borderColor: `${e.color}20`,
                    opacity: globalIndex < visibleCount ? 1 : 0,
                    transform: globalIndex < visibleCount ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.96)',
                    transition: 'opacity 300ms ease, transform 300ms ease',
                  }}
                >
                  {/* Ícone */}
                  <div
                    className="flex items-center justify-center rounded-xl flex-shrink-0"
                    style={{
                      background: `${e.color}18`,
                      width: 'clamp(20px, 4vw, 28px)',
                      height: 'clamp(20px, 4vw, 28px)',
                    }}
                  >
                    <e.Icon
                      style={{ color: e.color }}
                      size={14}
                      strokeWidth={1.8}
                    />
                  </div>

                  {/* Nome */}
                  <p
                    className="font-bold text-white leading-tight"
                    style={{ fontSize: 'clamp(0.42rem, 1vw, 0.58rem)' }}
                  >
                    {e.nome}
                  </p>

                  {/* Tagline */}
                  <span
                    className="rounded-full px-1.5 py-0.5 font-semibold leading-none"
                    style={{
                      background: `${e.color}15`,
                      color: e.color,
                      border: `1px solid ${e.color}25`,
                      fontSize: 'clamp(0.32rem, 0.75vw, 0.42rem)',
                    }}
                  >
                    {e.tagline}
                  </span>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        className="text-center px-3 py-1 flex-shrink-0"
        style={{
          fontSize: 'clamp(0.35rem, 0.8vw, 0.45rem)',
          color: 'rgba(255,255,255,0.15)',
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        Todos funcionam por voz ou texto · em qualquer canal
      </div>
    </div>
  )
}
