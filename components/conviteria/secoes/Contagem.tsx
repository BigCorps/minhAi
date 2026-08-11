'use client';

import { useEffect, useState } from 'react';
import type { PropsSecao } from '@/lib/conviteria/tipos';

type Restante = { dias: number; horas: number; minutos: number; segundos: number };

export default function Contagem({ cfg, secao }: PropsSecao) {
  const alvo = new Date(cfg.evento.dataIso).getTime();
  // Comeca nulo de proposito: evita divergencia entre servidor e cliente.
  const [r, setR] = useState<Restante | null>(null);

  useEffect(() => {
    const calc = (): Restante => {
      const d = Math.max(0, alvo - Date.now());
      return {
        dias: Math.floor(d / 86400000),
        horas: Math.floor(d / 3600000) % 24,
        minutos: Math.floor(d / 60000) % 60,
        segundos: Math.floor(d / 1000) % 60,
      };
    };
    setR(calc());
    const id = setInterval(() => setR(calc()), 1000);
    return () => clearInterval(id);
  }, [alvo]);

  const campos: Array<[string, number | null]> = [
    ['Dias', r?.dias ?? null],
    ['Horas', r?.horas ?? null],
    ['Minutos', r?.minutos ?? null],
    ['Segundos', r?.segundos ?? null],
  ];

  return (
    <section className="cv-secao">
      <p className="cv-rotulo">{secao.config?.titulo ?? 'Faltam'}</p>
      <div className="cv-contagem">
        {campos.map(([nome, valor], i) => (
          <div className="cv-contagem-campo" key={nome}>
            <span className="cv-contagem-numero">
              {valor === null ? '--' : String(valor).padStart(2, '0')}
            </span>
            <span className="cv-contagem-nome">{nome}</span>
            {i < campos.length - 1 && (
              <span className="cv-contagem-sep" aria-hidden="true">:</span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
