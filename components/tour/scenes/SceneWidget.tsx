'use client'
// components/tour/scenes/SceneWidget.tsx
// Mock de um site genérico com o widget flutuante da minhAi no canto inferior direito.

export default function SceneWidget() {
  return (
    <div className="w-full h-full rounded-2xl overflow-hidden relative bg-slate-100 flex flex-col select-none">
      {/* ── Barra do browser mock ── */}
      <div className="flex items-center gap-2 bg-white border-b border-gray-200 px-3 py-2 flex-shrink-0">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 bg-gray-100 rounded-full px-3 py-0.5 text-gray-400 text-xs truncate">
          www.cafeexemplo.com.br
        </div>
      </div>

      {/* ── Conteúdo do site mock ── */}
      <div className="flex-1 relative overflow-hidden">
        {/* Hero */}
        <div className="bg-gradient-to-br from-amber-800 to-amber-950 px-6 py-8 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-400/30" />
            <span className="text-amber-100 font-semibold text-sm">Café Exemplo</span>
          </div>
          <p className="text-white font-bold" style={{ fontSize: 'clamp(1rem, 3vw, 1.5rem)' }}>
            O melhor café da cidade
          </p>
          <div className="flex gap-2">
            <div className="bg-amber-500 text-white text-xs px-4 py-1.5 rounded-full">
              Ver cardápio
            </div>
            <div className="bg-white/10 text-white text-xs px-4 py-1.5 rounded-full">
              Reservar mesa
            </div>
          </div>
        </div>

        {/* Conteúdo simulado */}
        <div className="bg-white p-4 flex flex-col gap-3">
          <div className="h-3 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
          <div className="h-3 bg-gray-200 rounded w-5/6" />
          <div className="h-3 bg-gray-200 rounded w-2/3" />
        </div>

{/* ── Widget flutuante minhAi ── */}
<div className="absolute bottom-4 right-4 flex flex-col items-end gap-2">
  {/* Balão de boas-vindas */}
  <div className="bg-white rounded-2xl rounded-br-sm shadow-lg px-3 py-2 max-w-[160px] border border-gray-100">
    <p className="text-gray-700 text-xs leading-snug">
      Olá! 👋 Posso ajudar com cardápio, reservas ou pedidos?
    </p>
  </div>
  {/* Botão pill no padrão minhAi */}
  <div
    className="flex items-center gap-2 rounded-full shadow-xl cursor-pointer px-4 py-2.5"
    style={{
      background: '#de691b',
      boxShadow: '0 4px 20px rgba(222,105,27,0.45)',
    }}
  >
    <span className="text-white text-xs font-semibold whitespace-nowrap">
      Gerente Café
    </span>
    <svg viewBox="0 0 24 24" fill="white" className="w-3.5 h-3.5 flex-shrink-0">
      <path d="M7 10l5 5 5-5z" />
    </svg>
  </div>
</div>
      </div>
    </div>
  )
}
