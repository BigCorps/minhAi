'use client'
// components/LeadDemo/tour/TourModos.tsx
// Slideshow sequencial: Vendas → Fila/Link → Totem/Login
// Cada cena já alterna internamente entre seus sub-painéis.

import { useEffect, useState } from 'react'
import SceneVendas from '@/components/tour/scenes/SceneVendas'
import SceneFila   from '@/components/tour/scenes/SceneFila'
import SceneTotem  from '@/components/tour/scenes/SceneTotem'

type SceneId = 'vendas' | 'fila' | 'totem'

const SEQUENCE: SceneId[] = ['vendas', 'fila', 'totem']

// Cada cena permanece visível por 9.5 s (SceneFila e SceneTotem
// alternam seus sub-painéis a cada 5 s, então o usuário vê os dois).
const SCENE_DURATION = 9500

const LABELS: Record<SceneId, string> = {
  vendas: 'Modo Vendas',
  fila:   'Modo Fila & Link',
  totem:  'Modo Totem & Login',
}

export default function TourModos() {
  const [idx, setIdx]         = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIdx(i => (i + 1) % SEQUENCE.length)
        setVisible(true)
      }, 400)
    }, SCENE_DURATION)
    return () => clearInterval(id)
  }, [])

  const scene = SEQUENCE[idx]

  return (
    <div className="w-full h-full flex flex-col gap-3">

      {/* Pills indicadores */}
      <div className="flex items-center justify-center gap-2 flex-shrink-0 flex-wrap">
        {SEQUENCE.map((s, i) => (
          <div
            key={s}
            className="px-3 py-1 rounded-full text-xs font-semibold transition-all duration-300"
            style={{
              background: i === idx ? 'rgba(59,130,246,0.3)'   : 'rgba(255,255,255,0.05)',
              border:     `1px solid ${i === idx ? 'rgba(59,130,246,0.6)' : 'rgba(255,255,255,0.1)'}`,
              color:      i === idx ? '#93c5fd' : 'rgba(255,255,255,0.3)',
              transform:  i === idx ? 'scale(1.06)' : 'scale(1)',
            }}
          >
            {LABELS[s]}
          </div>
        ))}
      </div>

      {/* Cena com fade + slide */}
      <div
        className="flex-1 min-h-0 rounded-2xl overflow-hidden"
        style={{
          opacity:   visible ? 1 : 0,
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.97)',
          transition: 'opacity 0.4s ease, transform 0.4s ease',
        }}
      >
        {scene === 'vendas' && <SceneVendas />}
        {scene === 'fila'   && <SceneFila />}
        {scene === 'totem'  && <SceneTotem />}
      </div>
    </div>
  )
}