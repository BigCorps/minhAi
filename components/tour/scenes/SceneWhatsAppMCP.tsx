'use client'
// components/tour/scenes/SceneWhatsAppMCP.tsx
// WhatsApp com MCP ativo — mostra um card de tool call dentro da conversa.

export default function SceneWhatsAppMCP() {
  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none"
      style={{ background: '#111b21' }}
    >
      {/* ── Header WhatsApp ── */}
      <div
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ background: '#202c33' }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={2} className="w-5 h-5 flex-shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
        </svg>
        <div
          className="rounded-full flex-shrink-0 flex items-center justify-center"
          style={{ width: 40, height: 40, background: '#3b82f6' }}
        >
          <span className="text-white text-sm font-bold">C</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium leading-none">Café Exemplo</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs" style={{ color: '#8696a0' }}>MCP</span>
            <div className="w-1 h-1 rounded-full bg-green-400" />
            <span className="text-xs text-green-400">conectado</span>
          </div>
        </div>
      </div>

      {/* ── Mensagens ── */}
      <div
        className="flex-1 flex flex-col justify-end gap-2 px-3 py-3 overflow-hidden"
        style={{ background: '#0b141a' }}
      >
        {/* Usuário pergunta */}
        <div className="flex justify-end">
          <div
            className="rounded-lg px-3 py-1.5 max-w-[75%]"
            style={{ background: '#005c4b', fontSize: 'clamp(0.7rem, 1.8vw, 0.82rem)', color: '#e9edef' }}
          >
            <p>Qual foi meu último pedido?</p>
            <span className="block text-right mt-0.5" style={{ fontSize: '0.6rem', color: '#8696a0' }}>15:10</span>
          </div>
        </div>

        {/* Card MCP dentro do WhatsApp */}
        <div className="flex justify-start">
          <div
            className="rounded-xl px-3 py-2.5 max-w-[85%] flex flex-col gap-1.5"
            style={{ background: '#1a2a32', border: '1px solid rgba(0,168,132,0.3)' }}
          >
            {/* Header do tool call */}
            <div className="flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="#00a884" strokeWidth={2} className="w-3 h-3 flex-shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-xs font-mono" style={{ color: '#00a884' }}>
                minhai · buscar_pedidos
              </span>
            </div>
            {/* Resultado */}
            <div style={{ fontSize: 'clamp(0.65rem, 1.6vw, 0.75rem)', color: '#8696a0' }}>
              cliente: <span style={{ color: '#e9edef' }}>+55 11 99999-0000</span>
            </div>
          </div>
        </div>

        {/* Resposta final */}
        <div className="flex justify-start">
          <div
            className="rounded-lg px-3 py-1.5 max-w-[80%]"
            style={{ background: '#202c33', fontSize: 'clamp(0.7rem, 1.8vw, 0.82rem)', color: '#e9edef' }}
          >
            <p>
              Seu último pedido foi em <strong style={{ color: '#53bdeb' }}>12/05</strong>: 2x Café Especial 250g — R$&#8239;89,90.
              Entregue ✅ Posso ajudar com algo mais?
            </p>
            <span className="block text-right mt-0.5" style={{ fontSize: '0.6rem', color: '#8696a0' }}>15:10 ✓✓</span>
          </div>
        </div>
      </div>

      {/* ── Input ── */}
      <div
        className="flex items-center gap-2 px-3 py-2 flex-shrink-0"
        style={{ background: '#202c33' }}
      >
        <div
          className="flex-1 rounded-full px-4 py-2 text-xs"
          style={{ background: '#2a3942', color: '#8696a0' }}
        >
          Mensagem
        </div>
        <div
          className="rounded-full flex items-center justify-center flex-shrink-0"
          style={{ width: 40, height: 40, background: '#00a884' }}
        >
          <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
            <path d="M12 15.5a3.5 3.5 0 110-7 3.5 3.5 0 010 7z" />
          </svg>
        </div>
      </div>
    </div>
  )
}
