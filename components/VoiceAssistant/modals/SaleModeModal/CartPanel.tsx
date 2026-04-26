// components/VoiceAssistant/modals/SaleModeModal/CartPanel.tsx
// v2 — seletor de quantidade em linha separada para nunca sobrepor o texto

'use client';

import { formatarPreco } from '@/lib/produtos-venda';
import { useCart } from '@/hooks/useCart';

interface CartPanelProps {
  theme: 'dark' | 'light';
  onCheckout: () => void;
}

export default function CartPanel({ theme, onCheckout }: CartPanelProps) {
  const { itens, subtotal, desconto, total, totalItens, updateQty, removeItem } = useCart();
  const isDark = theme === 'dark';

  if (itens.length === 0) {
    return (
      <div className={`flex flex-col h-full rounded-2xl border p-4 ${
        isDark ? 'bg-white/3 border-white/8' : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-center gap-2 mb-3 flex-shrink-0">
          <svg className={`w-4 h-4 ${isDark ? 'text-white/50' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className={`text-sm font-semibold ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
            Carrinho
          </h3>
        </div>
        <div className={`flex-1 flex flex-col items-center justify-center gap-2 ${
          isDark ? 'text-white/25' : 'text-gray-300'
        }`}>
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <p className="text-xs text-center">Carrinho vazio<br/>Adicione produtos</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full rounded-2xl border overflow-hidden ${
      isDark ? 'bg-white/3 border-white/8' : 'bg-white border-gray-200 shadow-sm'
    }`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2.5 flex-shrink-0 border-b ${
        isDark ? 'border-white/8' : 'border-gray-100'
      }`}>
        <div className="flex items-center gap-2">
          <svg className={`w-4 h-4 ${isDark ? 'text-white/60' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span className={`text-sm font-semibold ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
            Carrinho
          </span>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
          isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
        }`}>
          {totalItens} {totalItens === 1 ? 'item' : 'itens'}
        </span>
      </div>

      {/* Lista de itens */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2.5 min-h-0">
        {itens.map((item) => (
          <div
            key={item.produto.id}
            className={`rounded-xl p-2 ${isDark ? 'bg-white/4' : 'bg-gray-50'}`}
          >
            {/* Linha 1: nome + preço unitário + botão remover */}
            <div className="flex items-start gap-1.5 mb-1.5">
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium truncate ${isDark ? 'text-white/90' : 'text-gray-900'}`}>
                  {item.produto.nome}
                </p>
                <p className={`text-[10px] ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                  {formatarPreco(item.produto.preco_venda)} / un
                </p>
              </div>
              <button
                onClick={() => removeItem(item.produto.id)}
                className={`w-5 h-5 flex items-center justify-center rounded-full flex-shrink-0 transition-colors mt-0.5 ${
                  isDark
                    ? 'text-white/25 hover:text-red-400 hover:bg-red-500/10'
                    : 'text-gray-300 hover:text-red-500 hover:bg-red-50'
                }`}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Linha 2: controles de qty à esquerda + subtotal à direita */}
            <div className="flex items-center justify-between gap-2">
              {/* Controles qty */}
              <div className={`flex items-center gap-1 rounded-lg px-1 py-0.5 ${
                isDark ? 'bg-white/8' : 'bg-gray-200/70'
              }`}>
                <button
                  onClick={() => updateQty(item.produto.id, item.quantidade - 1)}
                  className={`w-5 h-5 flex items-center justify-center rounded text-sm font-bold transition-colors ${
                    isDark ? 'hover:bg-white/10 text-white/60' : 'hover:bg-gray-300 text-gray-500'
                  }`}
                >−</button>
                <span className={`text-xs font-semibold w-5 text-center ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  {item.quantidade}
                </span>
                <button
                  onClick={() => {
                    if (item.produto.controla_estoque && item.quantidade >= item.produto.estoque_atual) return;
                    updateQty(item.produto.id, item.quantidade + 1);
                  }}
                  className={`w-5 h-5 flex items-center justify-center rounded text-sm font-bold transition-colors ${
                    isDark ? 'hover:bg-white/10 text-white/60' : 'hover:bg-gray-300 text-gray-500'
                  }`}
                >+</button>
              </div>

              {/* Subtotal do item */}
              <span className={`text-xs font-bold ${
                isDark ? 'text-emerald-400' : 'text-emerald-600'
              }`}>
                {formatarPreco(item.subtotal)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Totais + Botão */}
      <div className={`flex-shrink-0 px-3 py-3 border-t space-y-2 ${
        isDark ? 'border-white/8' : 'border-gray-100'
      }`}>
        {/* Subtotal */}
        <div className={`flex justify-between text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
          <span>Subtotal</span>
          <span>{formatarPreco(subtotal)}</span>
        </div>

        {/* Desconto (se houver) */}
        {desconto > 0 && (
          <div className={`flex justify-between text-xs ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
            <span>Desconto</span>
            <span>− {formatarPreco(desconto)}</span>
          </div>
        )}

        {/* Total */}
        <div className={`flex justify-between font-bold text-sm ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}>
          <span>Total</span>
          <span className={isDark ? 'text-emerald-400' : 'text-emerald-600'}>
            {formatarPreco(total)}
          </span>
        </div>

        {/* Botão finalizar */}
        <button
          onClick={onCheckout}
          className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-sm font-bold transition-all shadow-lg shadow-emerald-500/20"
        >
          Finalizar pedido
        </button>
      </div>
    </div>
  );
}
