'use client';

import { useState } from 'react';

interface Option {
  id: string;
  label: string;
  sublabel: string;
  domain: string;
}

const OPTIONS: Option[] = [
  { id: 'minha', label: 'Minha IA', sublabel: 'mais pessoal',       domain: 'minhaia.app' },
  { id: 'nossa', label: 'Nossa IA', sublabel: 'ideal para equipes', domain: 'nossaia.app' },
  { id: 'sua',   label: 'Sua IA',   sublabel: 'foco no cliente',    domain: 'suaia.app'   },
];

interface Props {
  isDark: boolean;
}

export function DomainPreviewPicker({ isDark }: Props) {
  const [nome, setNome]         = useState('');
  const [selected, setSelected] = useState('minha');

  const slug = nome.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || null;

  return (
    <div className="w-full max-w-lg mx-auto mb-4 sm:mb-6">

      {/* Label */}
      <p className={`text-xs font-semibold text-center mb-3 tracking-wide uppercase ${
        isDark ? 'text-white/40' : 'text-gray-400'
      }`}>
        Escolha como sua IA será apresentada para seus clientes
      </p>

      {/* Input */}
      <div className={`flex items-center gap-2 rounded-xl px-4 py-2.5 mb-3 border transition-colors ${
        isDark
          ? 'bg-white/5 border-white/10 focus-within:border-blue-400/50'
          : 'bg-black/5 border-black/10 focus-within:border-blue-500/50'
      }`}>
        <svg className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-white/30' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <input
          type="text"
          value={nome}
          onChange={e => setNome(e.target.value)}
          placeholder="Nome da sua empresa"
          maxLength={32}
          className={`flex-1 bg-transparent text-sm outline-none placeholder-opacity-40 ${
            isDark ? 'text-white placeholder-white/30' : 'text-gray-800 placeholder-gray-400'
          }`}
        />
      </div>

      {/* Chips */}
      <div className="flex gap-2">
        {OPTIONS.map(opt => {
          const isActive = selected === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => setSelected(opt.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl border text-center transition-all duration-200 ${
                isActive
                  ? isDark
                    ? 'bg-blue-500/10 border-blue-400/50 shadow-[0_0_12px_rgba(96,165,250,0.1)]'
                    : 'bg-blue-50 border-blue-400'
                  : isDark
                    ? 'bg-white/3 border-white/8 hover:border-white/15'
                    : 'bg-black/3 border-black/8 hover:border-black/15'
              }`}
            >
              {/* Label principal */}
              <span className={`text-xs font-bold leading-tight ${
                isActive
                  ? isDark ? 'text-blue-300' : 'text-blue-600'
                  : isDark ? 'text-white/60' : 'text-gray-500'
              }`}>
                {opt.label}
              </span>

              {/* Sublabel */}
              <span className={`text-[10px] leading-tight ${
                isDark ? 'text-white/25' : 'text-gray-400'
              }`}>
                {opt.sublabel}
              </span>

              {/* URL preview */}
              <span className={`mt-1 text-[10px] font-mono leading-tight truncate max-w-full px-1 rounded ${
                isActive
                  ? isDark ? 'text-blue-300/80' : 'text-blue-500'
                  : isDark ? 'text-white/20' : 'text-gray-400'
              }`}>
                {slug
                  ? <><span className={isDark ? 'text-white/50' : 'text-gray-600'}>{slug}</span>.{opt.domain}</>
                  : <span className={isDark ? 'text-white/15' : 'text-gray-300'}>seunome.{opt.domain}</span>
                }
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
