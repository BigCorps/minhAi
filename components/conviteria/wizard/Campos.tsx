'use client';

import type { ReactNode } from 'react';

export function Campo({
  rotulo, dica, children,
}: { rotulo: string; dica?: string; children: ReactNode }) {
  return (
    <label className="wz-campo">
      <span className="wz-campo-rotulo">{rotulo}</span>
      {children}
      {dica && <span className="wz-campo-dica">{dica}</span>}
    </label>
  );
}

export function Texto({
  valor, onChange, placeholder, maxLength = 120,
}: {
  valor: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <input
      type="text"
      className="wz-input"
      value={valor}
      placeholder={placeholder}
      maxLength={maxLength}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function AreaTexto({
  valor, onChange, placeholder, linhas = 3, maxLength = 400,
}: {
  valor: string;
  onChange: (v: string) => void;
  placeholder?: string;
  linhas?: number;
  maxLength?: number;
}) {
  return (
    <textarea
      className="wz-input wz-area"
      rows={linhas}
      value={valor}
      placeholder={placeholder}
      maxLength={maxLength}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function Cartoes<T extends { id: string }>({
  itens, selecionado, onSelecionar, render,
}: {
  itens: T[];
  selecionado: string;
  onSelecionar: (id: string) => void;
  render: (item: T) => ReactNode;
}) {
  return (
    <div className="wz-cartoes">
      {itens.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`wz-cartao${item.id === selecionado ? ' sel' : ''}`}
          aria-pressed={item.id === selecionado}
          onClick={() => onSelecionar(item.id)}
        >
          {render(item)}
        </button>
      ))}
    </div>
  );
}
