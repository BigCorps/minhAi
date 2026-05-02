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
    <div className="w-full max-w-lg mx-auto mb-3 sm:mb-5">

      {/* ── TÍTULO ─────────────────────────────────────────────── */}
      <p className={`text-xs sm:text-sm font-extrabold text-center mb-2 leading-snug ${
        isDark ? 'text-white' : 'text-gray-900'
      }`}>
        Escolha como sua IA será apresentada para seus clientes:
      </p>

      {/*
        MOBILE (< md): layout vertical em 6 linhas
          1. Input de nome
          2. Sufixo .dominio.app
          3. Botões Minha / Nossa / Sua
          4. (linha vazia — separador visual via gap)
          5. Preview da URL completa
          6. Sublabel da opção selecionada

        DESKTOP (md+): tudo em uma linha horizontal (layout original)
      */}

      {/* ── LAYOUT MOBILE VERTICAL ─────────────────────────────── */}
      <div className="flex flex-col gap-2 md:hidden">

        {/* Linha 1: Input */}
        <div className={`flex items-center gap-1.5 rounded-xl px-3 py-2 border transition-colors ${
          isDark
            ? 'bg-white/5 border-white/10 focus-within:border-blue-400/50'
            : 'bg-black/5 border-black/10 focus-within:border-blue-500/40'
        }`}>
          <input
            type="text"
            value={nome}
            onChange={e => setNome(e.target.value)}
            placeholder="nomedaempresa"
            maxLength={32}
            className={`flex-1 min-w-0 bg-transparent text-sm outline-none ${
              isDark ? 'text-white placeholder-white/25' : 'text-gray-800 placeholder-gray-400'
            }`}
          />
        </div>

        {/* Linha 2: sufixo do domínio */}
        <div className={`text-center text-sm font-mono ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
          <span className={`font-semibold ${isDark ? 'text-blue-300/80' : 'text-blue-500'}`}>
            {slug || 'nomedaempresa'}
          </span>
          <span>.{active.domain}</span>
        </div>

        {/* Linha 3: botões de opção */}
        <div className="flex items-center justify-center gap-2">
          {OPTIONS.map(opt => {
            const isActive = selected === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setSelected(opt.id)}
                className={`
                  flex-1 py-2 rounded-xl text-xs font-bold
                  transition-all duration-200
                  ${isActive
                    ? isDark
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-400/40'
                      : 'bg-blue-100 text-blue-700 border border-blue-300'
                    : isDark
                      ? 'text-white/40 border border-white/10 hover:text-white/70'
                      : 'text-gray-400 border border-black/10 hover:text-gray-600'
                  }
                `}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Linha 4: sublabel da opção ativa */}
        <p className={`text-center text-xs font-medium ${isDark ? 'text-white/35' : 'text-gray-400'}`}>
          {active.sublabel}
        </p>

      </div>

      {/* ── LAYOUT DESKTOP HORIZONTAL ──────────────────────────── */}
      <div className="hidden md:block">

        {/* Linha única: input + .app + botões */}
        <div className="flex items-center gap-2">

          {/* Input */}
          <div className={`flex items-center gap-1.5 flex-1 min-w-0 rounded-xl px-3 py-2 border transition-colors ${
            isDark
              ? 'bg-white/5 border-white/10 focus-within:border-blue-400/50'
              : 'bg-black/5 border-black/10 focus-within:border-blue-500/40'
          }`}>
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
          <span className={`text-sm font-mono whitespace-nowrap flex-shrink-0 ${
            isDark ? 'text-white/30' : 'text-gray-400'
          }`}>
            .{active.domain}
          </span>

          {/* Separador */}
          <div className={`w-px h-5 flex-shrink-0 ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />

          {/* Botões */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {OPTIONS.map(opt => {
              const isActive = selected === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setSelected(opt.id)}
                  className={`
                    px-3 py-1.5 rounded-lg text-xs font-bold
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

        {/* Preview abaixo */}
        <div className={`mt-2 flex items-center justify-center gap-2 text-xs font-mono ${
          isDark ? 'text-white/40' : 'text-gray-400'
        }`}>
          <span className={`font-semibold ${isDark ? 'text-blue-300/80' : 'text-blue-500'}`}>
            {slug || 'suaempresa'}.{active.domain}
          </span>
          <span className={isDark ? 'text-white/15' : 'text-gray-300'}>—</span>
          <span>{active.label}</span>
          <span className={isDark ? 'text-white/15' : 'text-gray-300'}>—</span>
          <span>{active.sublabel}</span>
        </div>
      </div>

    </div>
  );
}
