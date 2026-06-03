// app/tour/layout.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tour Interativo',
  description:
    'Veja ao vivo onde o assistente minhAi pode atuar: telas, widgets, WhatsApp, Instagram, Mercado Livre e integrações MCP com Claude, ChatGPT, Cursor e Manus.',
  alternates: { canonical: 'https://www.minhai.app/tour' },
  openGraph: {
    title: 'Tour Interativo minhAi',
    description:
      'Demonstração guiada por voz de todos os canais onde o minhAi atua.',
    url: 'https://www.minhai.app/tour',
  },
}

export default function TourLayout({ children }: { children: React.ReactNode }) {
  return (
    // Layout completamente limpo: sem sidebar, sem header do dashboard.
    // Fundo escuro fixo para funcionar bem em gravações de vídeo.
    <div className="min-h-screen w-full bg-slate-950 overflow-hidden">
      {children}
    </div>
  )
}
