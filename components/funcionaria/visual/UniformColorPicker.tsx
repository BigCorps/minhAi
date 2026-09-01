'use client';

import { UNIFORM_COLORS, getUniformColor } from '@/lib/funcionaria-avatar';

type Props = {
  value?: string | null;
  onChange: (id: string) => void;
  className?: string;
};

/**
 * Paleta no lugar do seletor livre de cor.
 *
 * O seletor deixava escolher tons que não sobrevivem à aplicação: amarelo-limão
 * e cinza-claro somem contra a pele, e tons muito escuros achatam as dobras do
 * tecido. Estas dez foram conferidas na foto e todas mantêm o caimento
 * legível — inclusive branco e preto, que antes nem apareciam.
 */
export default function UniformColorPicker({ value, onChange, className = '' }: Props) {
  const selected = getUniformColor(value);

  return (
    <div className={className}>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-sm font-medium text-slate-700">Cor do uniforme</span>
        <span className="text-xs text-slate-500">{selected.label}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {UNIFORM_COLORS.map(color => {
          const active = color.id === selected.id;
          return (
            <button
              key={color.id}
              type="button"
              onClick={() => onChange(color.id)}
              aria-label={color.label}
              aria-pressed={active}
              title={color.label}
              className={`relative h-11 w-11 rounded-xl border transition ${
                active
                  ? 'border-slate-900 ring-2 ring-slate-900/15'
                  : 'border-slate-200 hover:border-slate-400'
              }`}
              style={{ backgroundColor: color.shirt }}
            >
              {/* faixa da gola, para a combinação ficar visível antes de aplicar */}
              <span
                className="absolute inset-x-1 bottom-1 h-[5px] rounded-full"
                style={{ backgroundColor: color.trim }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
