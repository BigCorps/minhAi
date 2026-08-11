'use client';

import { useState } from 'react';

/**
 * Botao de sugestao por IA. Falha silenciosa por design: se a API cair, o
 * usuario continua preenchendo a mao. IA aqui e atalho, nunca dependencia.
 */
export function BotaoIA({
  rotulo = 'Sugerir com IA',
  onClick,
  carregando,
}: {
  rotulo?: string;
  onClick: () => void;
  carregando: boolean;
}) {
  return (
    <button type="button" className="wz-ia" onClick={onClick} disabled={carregando}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3zM18 15l.9 2.1 2.1.9-2.1.9L18 21l-.9-2.1-2.1-.9 2.1-.9L18 15z"
          fill="currentColor"
        />
      </svg>
      {carregando ? 'Pensando…' : rotulo}
    </button>
  );
}

export function useSugestao<T>() {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  async function pedir(corpo: unknown): Promise<T | null> {
    setCarregando(true);
    setErro('');
    try {
      const r = await fetch('/api/conviteria/sugerir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      });
      const j = await r.json();
      if (!r.ok) { setErro(j.erro ?? 'Não deu certo agora.'); return null; }
      return j as T;
    } catch {
      setErro('Não deu certo agora.');
      return null;
    } finally {
      setCarregando(false);
    }
  }

  return { pedir, carregando, erro };
}

export function ListaSugestoes({
  itens, aoEscolher, aoFechar,
}: {
  itens: string[];
  aoEscolher: (t: string) => void;
  aoFechar: () => void;
}) {
  if (itens.length === 0) return null;
  return (
    <div className="wz-sugestoes">
      <div className="wz-sugestoes-topo">
        <span>Escolha uma</span>
        <button type="button" onClick={aoFechar} aria-label="Fechar sugestões">✕</button>
      </div>
      {itens.map((t, i) => (
        <button key={i} type="button" className="wz-sugestao" onClick={() => aoEscolher(t)}>
          {t}
        </button>
      ))}
    </div>
  );
}
