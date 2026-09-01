'use client';

import type { PropsEtapa } from '../Wizard';
import { ENVELOPES } from '@/lib/conviteria/visual';
import { ORNAMENTOS_ASSETS } from '@/lib/conviteria/ornamentos';
import { tokensDoConvite } from '@/lib/conviteria/tokens';
import { OrnamentoCanto } from '../../OrnamentoVisual';

export default function Visual({
  estado,
  despachar,
}: PropsEtapa) {
  const ornamentId =
    estado.cfg.ornamentoId ?? ORNAMENTOS_ASSETS[0].id;

  return (
    <>
      <p className="wz-intro">
        Escolha a família de ornamentos. No convite publicado as cores
        continuam acompanhando automaticamente a paleta escolhida.
      </p>

      <div className="wz-visual-grid">
        {ORNAMENTOS_ASSETS.map((o) => {
          const sel = ornamentId === o.id;

          return (
            <button
              key={o.id}
              type="button"
              className={`wz-visual-card${sel ? ' sel' : ''}`}
              aria-pressed={sel}
              onClick={() =>
                despachar({
                  tipo: 'campo',
                  caminho: 'ornamentoId',
                  valor: o.id,
                })
              }
            >
              <span
                className="wz-ornamento-live"
                style={tokensDoConvite(
                  estado.cfg.temaId,
                  estado.cfg.fonteId
                )}
              >
                <OrnamentoCanto id={o.id} />
              </span>

              <span className="wz-visual-card-nome">
                {o.nome}
              </span>

              <small className="wz-visual-card-desc">
                {o.descricao}
              </small>
            </button>
          );
        })}
      </div>

      <p className="wz-intro" style={{ marginTop: '1.25rem' }}>
        Formato da aba do envelope.
      </p>

      <div className="wz-visual-grid">
        {ENVELOPES.map((e) => {
          const sel =
            (estado.cfg.envelopeId ?? 'classico') === e.id;

          return (
            <button
              key={e.id}
              type="button"
              className={`wz-visual-card${sel ? ' sel' : ''}`}
              aria-pressed={sel}
              onClick={() =>
                despachar({
                  tipo: 'campo',
                  caminho: 'envelopeId',
                  valor: e.id,
                })
              }
            >
              <span
                style={{
                  display: 'block',
                  height: 52,
                  position: 'relative',
                  overflow: 'hidden',
                  marginBottom: 6,
                }}
              >
                <span
                  className={`cv-capa envelope-${e.id}`}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    minHeight: 52,
                    height: 52,
                    pointerEvents: 'none',
                  }}
                >
                  <span
                    className="cv-capa-aba"
                    style={{ height: 52 }}
                  />
                </span>
              </span>

              <span>{e.nome}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
