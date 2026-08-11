'use client';

import type { PropsSecao } from '@/lib/conviteria/tipos';

const SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export default function Calendario({ cfg, secao }: PropsSecao) {
  const d = new Date(cfg.evento.dataIso);
  const ano = d.getFullYear();
  const mes = d.getMonth();
  const dia = d.getDate();

  const primeiro = new Date(ano, mes, 1).getDay();
  const total = new Date(ano, mes + 1, 0).getDate();

  const celulas: Array<number | null> = [
    ...Array.from({ length: primeiro }, () => null),
    ...Array.from({ length: total }, (_, i) => i + 1),
  ];

  return (
    <section className="cv-secao">
      <p className="cv-rotulo">{secao.config?.titulo ?? 'O grande dia'}</p>
      <p className="cv-mes">{MESES[mes]}</p>
      <div className="cv-calendario" role="presentation">
        {SEMANA.map((s, i) => (
          <span className="cv-cal-cabecalho" key={`c${i}`}>{s}</span>
        ))}
        {celulas.map((n, i) =>
          n === null ? (
            <span key={`v${i}`} />
          ) : (
            <span key={n} className={`cv-cal-dia${n === dia ? ' marcado' : ''}`}>
              {n === dia && (
                <svg className="cv-cal-coracao" viewBox="0 0 32 30" aria-hidden="true">
                  <path
                    d="M16 27C6 20.5 2 15.6 2 10.5 2 6 5.4 3 9.4 3c2.7 0 5.1 1.5 6.6 3.9C17.5 4.5 19.9 3 22.6 3 26.6 3 30 6 30 10.5c0 5.1-4 10-14 16.5z"
                    fill="none" stroke="currentColor" strokeWidth="1.6"
                  />
                </svg>
              )}
              <span className="cv-cal-numero">{n}</span>
            </span>
          )
        )}
      </div>
    </section>
  );
}
