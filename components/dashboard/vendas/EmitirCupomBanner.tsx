'use client';

import { useState } from 'react';
import { X, Receipt } from 'lucide-react';

interface EmitirCupomBannerProps {
  pedidoId: string;
  onEmitir: (pedidoId: string) => void;
  onDismiss: () => void;
  theme?: 'dark' | 'light';
}

export default function EmitirCupomBanner({
  pedidoId,
  onEmitir,
  onDismiss,
  theme = 'dark',
}: EmitirCupomBannerProps) {
  const isDark = theme === 'dark';

  return (
    <div
      className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4`}
    >
      <div
        className={`rounded-2xl border p-4 shadow-2xl backdrop-blur-xl ${
          isDark
            ? 'bg-slate-800/95 border-white/10'
            : 'bg-white/95 border-gray-200'
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isDark ? 'bg-emerald-500/20' : 'bg-emerald-100'
            }`}
          >
            <Receipt className="w-5 h-5 text-emerald-500" />
          </div>

          <div className="flex-1 min-w-0">
            <h3
              className={`text-sm font-bold mb-1 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}
            >
              Emitir cupom fiscal?
            </h3>
            <p
              className={`text-xs mb-3 ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              Pedido pago com sucesso. Deseja emitir a nota fiscal?
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => onEmitir(pedidoId)}
                className="flex-1 py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors"
              >
                Emitir agora
              </button>
              <button
                onClick={onDismiss}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isDark
                    ? 'text-gray-400 hover:text-white hover:bg-white/5'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Depois
              </button>
            </div>
          </div>

          <button
            onClick={onDismiss}
            className={`p-1 rounded-lg transition-colors ${
              isDark
                ? 'text-gray-500 hover:text-white hover:bg-white/5'
                : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
