'use client';

import { fontesDoGrupo, FONTES } from '@/lib/conviteria/fontes';
import { acharTipo } from '@/lib/conviteria/tiposEvento';
import { Cartoes } from '../Campos';
import type { PropsEtapa } from '../Wizard';

export default function EscolherFonte({ estado, despachar }: PropsEtapa) {
  const grupo = acharTipo(estado.cfg.tipoEventoId).grupo;
  const recomendadas = fontesDoGrupo(grupo);
  const outras = FONTES.filter((f) => !recomendadas.includes(f));

  return (
    <>
      <p className="wz-intro">Recomendadas para este tipo de evento.</p>
      <Cartoes
        itens={recomendadas}
        selecionado={estado.cfg.fonteId}
        onSelecionar={(id) => despachar({ tipo: 'trocarFonte', id })}
        render={(f) => (
          <>
            <span
              className="wz-amostra"
              style={{
                fontFamily: f.display,
                fontWeight: f.pesoDisplay,
                fontSize: `${26 * f.escalaDisplay}px`,
              }}
            >
              {estado.cfg.anfitrioes.exibicao || 'Seu nome aqui'}
            </span>
            <span className="wz-cartao-nome">{f.nome}</span>
          </>
        )}
      />

      {outras.length > 0 && (
        <details className="wz-mais">
          <summary>Ver todas as fontes</summary>
          <Cartoes
            itens={outras}
            selecionado={estado.cfg.fonteId}
            onSelecionar={(id) => despachar({ tipo: 'trocarFonte', id })}
            render={(f) => (
              <>
                <span
                  className="wz-amostra"
                  style={{
                    fontFamily: f.display,
                    fontWeight: f.pesoDisplay,
                    fontSize: `${26 * f.escalaDisplay}px`,
                  }}
                >
                  {estado.cfg.anfitrioes.exibicao || 'Seu nome aqui'}
                </span>
                <span className="wz-cartao-nome">{f.nome}</span>
              </>
            )}
          />
        </details>
      )}
    </>
  );
}
