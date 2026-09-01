'use client';

import type { PropsSecao } from '@/lib/conviteria/tipos';
import { Broto } from '../Ornamentos';

/**
 * RSVP, presentes e recados sao estruturalmente o mesmo bloco:
 * titulo, texto e um botao que sai do convite. Um componente so.
 */
const PADRAO: Record<string, { titulo: string; texto: string; rotulo: string }> = {
  rsvp: {
    titulo: 'Confirmação de presença',
    texto:
      'Sua presença é muito importante para nós. Pedimos a gentileza de confirmar quantas pessoas virão com você.',
    rotulo: 'Confirmar presença',
  },
  recados: {
    titulo: 'Recados',
    texto: 'Queremos guardar suas palavras. Deixe um recado no nosso mural.',
    rotulo: 'Deixar um recado',
  },
  presentes: {
    titulo: 'Lista de presentes',
    texto:
      'O maior presente é dividir esse dia com você. Mas, se quiser nos presentear, preparamos uma lista com carinho.',
    rotulo: 'Acessar nossa lista',
  },
};

export default function Acao({ cfg, secao, modo }: PropsSecao) {
  const base = PADRAO[secao.tipo] ?? PADRAO.rsvp;
  const c = secao.config ?? {};
  const href =
    c.href ??
    cfg.links?.[secao.tipo as 'rsvp' | 'presentes' | 'recados'] ??
    undefined;

  return (
    <section className="cv-secao">
      <Broto className="cv-broto" />
      <h2 className="cv-titulo">{c.titulo ?? base.titulo}</h2>
      <p className="cv-texto">{c.texto ?? base.texto}</p>
      {c.destaque && <p className="cv-destaque">{c.destaque}</p>}
      {href && (
        <a
          className="cv-botao"
          href={modo.previa ? undefined : href}
          onClick={modo.previa ? (e) => e.preventDefault() : undefined}
          target={modo.previa ? undefined : '_blank'}
          rel="noopener noreferrer"
          aria-disabled={modo.previa || undefined}
        >
          {c.rotuloBotao ?? base.rotulo}
        </a>
      )}
    </section>
  );
}
