'use client';

import type { TipoSecao } from '@/lib/conviteria/tipos';
import type { PropsEtapa } from '../Wizard';

const NOMES: Record<TipoSecao, string> = {
  foto: 'Foto', frase: 'Frase ou versículo', musica: 'Música', nomes: 'Nomes',
  data: 'Data e hora', contagem: 'Contagem regressiva', calendario: 'Calendário',
  local: 'Localização', rsvp: 'Confirmação de presença', presentes: 'Lista de presentes',
  recados: 'Recados', padrinhos: 'Padrinhos', dresscode: 'Dress code',
  galeria: 'Galeria de fotos', fim: 'Despedida',
};

/** Sem estas o convite deixa de fazer sentido. */
const OBRIGATORIAS = new Set<TipoSecao>(['nomes', 'data']);

export default function Secoes({ estado, despachar }: PropsEtapa) {
  const lista = [...estado.cfg.secoes].sort((a, b) => a.ordem - b.ordem);

  return (
    <>
      <p className="wz-intro">
        Ligue, desligue e reordene. A prévia acompanha.
      </p>
      <ul className="wz-secoes">
        {lista.map((s, i) => {
          const fixa = OBRIGATORIAS.has(s.tipo);
          return (
            <li key={s.tipo} className={s.ativo ? '' : 'off'}>
              <label className="wz-switch">
                <input
                  type="checkbox"
                  checked={s.ativo}
                  disabled={fixa}
                  onChange={() => despachar({ tipo: 'alternarSecao', secao: s.tipo })}
                />
                <span>{NOMES[s.tipo] ?? s.tipo}</span>
              </label>
              <div className="wz-mover">
                <button
                  type="button" aria-label="Subir" disabled={i === 0}
                  onClick={() => despachar({ tipo: 'moverSecao', secao: s.tipo, direcao: -1 })}
                >↑</button>
                <button
                  type="button" aria-label="Descer" disabled={i === lista.length - 1}
                  onClick={() => despachar({ tipo: 'moverSecao', secao: s.tipo, direcao: 1 })}
                >↓</button>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="wz-aviso">
        Nomes e data não podem ser desligados.
      </p>
    </>
  );
}
