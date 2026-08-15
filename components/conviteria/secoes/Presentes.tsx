'use client';

import { useState } from 'react';
import type { PresenteExibicao, PropsSecao } from '@/lib/conviteria/tipos';
import { Broto } from '../Ornamentos';
import ModalPresentes from '../ModalPresentes';

export default function Presentes({ cfg, secao, modo }: PropsSecao) {
  const [aberto, setAberto] = useState(false);

  // Duas fontes para a mesma lista. No convite publicado, `presentes` vem do
  // servidor com o id real de cada linha da tabela — e e esse id que o modal
  // usa para gerar o PIX. Na previa do wizard esse id nao existe ainda, entao
  // caimos em `presentesEscolhidos`, que e o snapshot dentro do config.
  //
  // Sem esse fallback a secao devolvia null na previa e a lista de presentes
  // simplesmente nao aparecia.
  const lista: PresenteExibicao[] = cfg.presentes?.length
    ? cfg.presentes
    : (cfg.presentesEscolhidos ?? []).map((p) => ({
        id: p.catalogoId,
        titulo: p.titulo,
        valorCentavos: p.valorCentavos,
        imagemUrl: p.imagemUrl,
      }));

  const c = secao.config ?? {};

  if (lista.length === 0) return null;
  const disponiveis = lista.filter((p) => !p.esgotado).length;

  return (
    <section className="cv-secao">
      <Broto className="cv-broto" />
      <h2 className="cv-titulo">{c.titulo ?? 'Lista de presentes'}</h2>
      <p className="cv-texto">
        {c.texto ??
          'O maior presente é dividir esse dia com você. Mas, se quiser nos presentear, escolha uma cota.'}
      </p>

      <button
        type="button"
        className="cv-botao"
        disabled={modo.previa || !modo.eventoId}
        onClick={() => setAberto(true)}
      >
        {c.rotuloBotao ?? 'Ver lista de presentes'}
      </button>

      <p className="cv-presentes-contagem">
        {disponiveis === 0
          ? 'Todas as cotas já foram presenteadas'
          : `${disponiveis} ${disponiveis === 1 ? 'opção disponível' : 'opções disponíveis'}`}
      </p>

      {aberto && modo.eventoId && (
        <ModalPresentes
          eventoId={modo.eventoId}
          presentes={lista}
          temaId={cfg.temaId}
          fonteId={cfg.fonteId}
          aoFechar={() => setAberto(false)}
        />
      )}
    </section>
  );
}
