'use client';

import { useState } from 'react';
import type { PresenteExibicao, PropsSecao } from '@/lib/conviteria/tipos';
import { Broto } from '../Ornamentos';
import ModalPresentes from '../ModalPresentes';

export default function Presentes({ cfg, secao, modo }: PropsSecao) {
  const [aberto, setAberto] = useState(false);

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

      {!modo.teste ? (
        <button
          type="button"
          className="cv-botao"
          disabled={modo.previa || !modo.eventoId}
          onClick={() => setAberto(true)}
        >
          {c.rotuloBotao ?? 'Ver lista de presentes'}
        </button>
      ) : (
        <div className="mx-auto mt-5 w-full max-w-xl rounded-2xl border border-black/10 bg-white/55 p-3 text-left">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[.12em] opacity-65">Demonstração da lista</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {lista.map((p) => (
              <div key={p.id} className="rounded-xl border border-black/10 bg-white/70 px-3 py-2">
                <p className="truncate text-sm font-semibold">{p.titulo}</p>
                <p className="mt-0.5 text-xs opacity-70">{p.valorCentavos > 0 ? (p.valorCentavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Valor livre'}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-xs opacity-70">No modo teste, nenhum pagamento é gerado. PIX e cartão são liberados após a publicação definitiva.</p>
        </div>
      )}

      <p className="cv-presentes-contagem">
        {disponiveis === 0
          ? 'Todas as cotas já foram presenteadas'
          : `${disponiveis} ${disponiveis === 1 ? 'opção disponível' : 'opções disponíveis'}`}
      </p>

      {aberto && modo.eventoId && !modo.teste && (
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
