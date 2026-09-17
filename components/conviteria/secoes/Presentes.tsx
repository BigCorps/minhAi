'use client';

import { useState } from 'react';
import type { PresenteExibicao, PropsSecao } from '@/lib/conviteria/tipos';
import { Broto } from '../Ornamentos';
import ModalPresentes from '../ModalPresentes';

function urlExterna(valor?: string) {
  if (!valor) return null;
  try {
    const u = new URL(valor);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch { return null; }
}

export default function Presentes({ cfg, secao, modo }: PropsSecao) {
  const [aberto, setAberto] = useState(false);
  const lista: PresenteExibicao[] = cfg.presentes?.length
    ? cfg.presentes
    : (cfg.presentesEscolhidos ?? []).map((p) => ({ id: p.catalogoId, titulo: p.titulo, valorCentavos: p.valorCentavos, imagemUrl: p.imagemUrl }));
  const externa = urlExterna(cfg.listaPresentesExternaUrl);
  const c = secao.config ?? {};
  if (lista.length === 0 && !externa) return null;
  const disponiveis = lista.filter((p) => !p.esgotado).length;

  return (
    <section className="cv-secao">
      <Broto className="cv-broto" />
      <h2 className="cv-titulo">{c.titulo ?? 'Lista de presentes'}</h2>
      <p className="cv-texto">{c.texto ?? 'O maior presente é dividir esse dia com você. Se quiser nos presentear, escolha uma das opções.'}</p>

      {lista.length > 0 && (
        <>
          <button type="button" className="cv-botao" disabled={modo.previa || !modo.eventoId} onClick={() => setAberto(true)}>
            {c.rotuloBotao ?? 'Ver lista de presentes'}
          </button>
          <p className="cv-presentes-contagem">
            {disponiveis === 0 ? 'Todas as cotas já foram presenteadas' : `${disponiveis} ${disponiveis === 1 ? 'opção disponível' : 'opções disponíveis'}`}
          </p>
        </>
      )}

      {externa && (
        <a
          className="cv-botao"
          style={{ marginTop: lista.length ? 10 : undefined }}
          href={modo.previa ? undefined : externa}
          onClick={modo.previa ? (e) => e.preventDefault() : undefined}
          target={modo.previa ? undefined : '_blank'}
          rel="noopener noreferrer"
        >
          Ver lista externa de presentes
        </a>
      )}

      {aberto && modo.eventoId && lista.length > 0 && (
        <ModalPresentes eventoId={modo.eventoId} presentes={lista} temaId={cfg.temaId} fonteId={cfg.fonteId} aoFechar={() => setAberto(false)} />
      )}
    </section>
  );
}
