'use client';

import { acharTema } from '@/lib/conviteria/temas';
import { acharFonte } from '@/lib/conviteria/fontes';
import { acharTipo } from '@/lib/conviteria/tiposEvento';
import { ETAPAS, pendencias } from '@/lib/conviteria/wizard';
import type { PropsEtapa } from '../Wizard';

export default function Revisao({ estado, despachar }: PropsEtapa) {
  const { cfg } = estado;
  const ativas = cfg.secoes.filter((s) => s.ativo).length;

  // Junta as pendencias de todas as etapas, com atalho para corrigir.
  const problemas = ETAPAS.flatMap((e, i) =>
    pendencias(estado, i).map((texto) => ({ texto, etapa: i, titulo: e.titulo }))
  );

  const linhas: Array<[string, string]> = [
    ['Tipo', acharTipo(cfg.tipoEventoId).nome],
    ['Nomes', cfg.anfitrioes.exibicao || '—'],
    ['Data', `${cfg.evento.dataExtenso}, ${cfg.evento.horario}`],
    ['Local', cfg.local?.nome || cfg.local?.logradouro || '—'],
    ['Tema', acharTema(cfg.temaId).nome],
    ['Fontes', acharFonte(cfg.fonteId).nome],
    ['Seções ativas', String(ativas)],
  ];

  return (
    <>
      {problemas.length > 0 && (
        <div className="wz-problemas">
          <p>Antes de publicar:</p>
          <ul>
            {problemas.map((p) => (
              <li key={`${p.etapa}-${p.texto}`}>
                {p.texto}{' '}
                <button type="button" onClick={() => despachar({ tipo: 'ir', etapa: p.etapa })}>
                  Ir para {p.titulo}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <dl className="wz-resumo">
        {linhas.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>

      <p className="wz-aviso">
        A escolha do endereço do convite e o pagamento vêm na próxima etapa.
      </p>
    </>
  );
}
