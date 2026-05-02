'use client';

import { useState } from 'react';

interface Option {
  id: string;
  label: string;
  sublabel: string;
  domain: string;
}

const OPTIONS: Option[] = [
  { id: 'minha', label: 'Minha IA', sublabel: 'Mais Pessoal e para MEIs',  domain: 'minhaia.app' },
  { id: 'nossa', label: 'Nossa IA', sublabel: 'Para Equipes e Empresas',   domain: 'nossaia.app' },
  { id: 'sua',   label: 'Sua IA',   sublabel: 'Foco Total no Cliente',     domain: 'suaia.app'   },
];

interface Props {
  isDark: boolean;
}

export function DomainPreviewPicker({ isDark }: Props) {
  const [nome, setNome]         = useState('');
  const [selected, setSelected] = useState('minha');

  const slug = nome.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const active = OPTIONS.find(o => o.id === selected)!;

  return (
    /*
      mb adaptativo por altura:
      - telas normais: mb-4 sm:mb-6
      - telas baixas (≤700px): mb-2
      - telas muito baixas (≤600px): componente inteiro some
    */
    <div
      className={`
        w-full max-w-lg mx-auto
        mb-3 sm:mb-5
        [@media(max-height:700px)_and_(max-width:767px)]:mb-2
        [@media(max-height:560px)]:hidden
      `}
    >
      {/* Título — oculto em telas baixas para economizar espaço */}
      <p
        className={`
          text-sm sm:text-base font-extrabold text-center leading-snug
          mb-2
          [@media(max-height:680px)_and_(max-width:767px)]:hidden
          ${isDark ? 'text-white' : 'text-gray-900'}
        `}
      >
        Escolha como sua IA será apresentada para seus clientes:
      </p>

      {/* Linha única: input + .app + botões */}
      <div className="flex items-center gap-1.5 sm:gap-2">

        {/* Input */}
        <div
          className={`
            flex items-center gap-1.5 flex-1 min-w-0 rounded-xl px-3 py-2 border transition-colors
            ${isDark
              ? 'bg-white/5 border-white/10 focus-within:border-blue-400/50'
              : 'bg-black/5 border-black/10 focus-within:border-blue-500/40'
            }
          `}
        >
          <input
            type="text"
            value={nome}
            onChange={e => setNome(e.target.value)}
            placeholder="suaempresa"
            maxLength={32}
            className={`flex-1 min-w-0 bg-transparent text-sm outline-none ${
              isDark ? 'text-white placeholder-white/25' : 'text-gray-800 placeholder-gray-400'
            }`}
          />
        </div>

        {/* .dominio.app */}
        <span
          className={`text-sm font-mono whitespace-nowrap flex-shrink-0 ${
            isDark ? 'text-white/30' : 'text-gray-400'
          }`}
        >
          .{active.domain}
        </span>

        {/* Separador */}
        <div className={`w-px h-5 flex-shrink-0 ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />

        {/* Botões de opção */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {OPTIONS.map(opt => {
            const isActive = selected === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setSelected(opt.id)}
                className={`
                  px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold
                  transition-all duration-200 whitespace-nowrap
                  ${isActive
                    ? isDark
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-400/40'
                      : 'bg-blue-100 text-blue-700 border border-blue-300'
                    : isDark
                      ? 'text-white/35 hover:text-white/60 border border-transparent hover:border-white/10'
                      : 'text-gray-400 hover:text-gray-600 border border-transparent hover:border-black/10'
                  }
                `}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/*
        Preview de URL abaixo:
        - oculto em telas baixas (≤680px mobile) para não empurrar CTAs
      */}
      <div
        className={`
          mt-1.5 flex items-center justify-center gap-2 text-xs font-mono
          transition-all duration-300
          [@media(max-height:700px)_and_(max-width:767px)]:hidden
          ${isDark ? 'text-white/40' : 'text-gray-400'}
        `}
      >
        <span className={`font-semibold ${isDark ? 'text-blue-300/80' : 'text-blue-500'}`}>
          {slug || 'suaempresa'}.{active.domain}
        </span>
        <span className={isDark ? 'text-white/15' : 'text-gray-300'}>—</span>
        <span>{active.label}</span>
        <span className={isDark ? 'text-white/15' : 'text-gray-300'}>—</span>
        <span>{active.sublabel}</span>
      </div>
    </div>
  );
}
