'use client';

import type { PropsEtapa } from '../Wizard';
import { Campo, Texto } from '../Campos';
import RecortesEnvelope from '../../RecortesEnvelope';
import { ENVELOPES, ETIQUETAS, ETIQUETA_PADRAO } from '@/lib/conviteria/visual';
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

      {/* Os <clipPath> precisam estar no DOM desta tela: os cartoes usam
          `clip-path: url(#env-aba-...)`, e a Capa (que normalmente os
          renderiza) nao esta montada aqui. */}
      <RecortesEnvelope />

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
                  height: 86,
                  position: 'relative',
                  overflow: 'hidden',
                  marginBottom: 6,
                }}
              >
                {/* Envelope em miniatura de verdade: corpo + aba. Antes o
                    cartao mostrava so a aba numa faixa de 52px, e com o
                    recorte aplicado a essa altura os seis formatos ficavam
                    praticamente identicos — a diferenca entre eles esta na
                    METADE DE BAIXO do desenho, que estava fora da caixa. */}
                <span
                  className={`cv-capa envelope-${e.id} wz-env-mini`}
                  // Tokens do tema: sem eles `var(--cv-papel)` nao resolve e a
                  // miniatura sai transparente. Mesma causa do lacre preto e da
                  // aba invisivel na previa — todo pedaco do convite
                  // renderizado fora do <Convite> precisa recebe-los.
                  style={{
                    pointerEvents: 'none',
                    ...tokensDoConvite(estado.cfg.temaId, estado.cfg.fonteId),
                  }}
                >
                  <span className="cv-env-corpo">
                    <span className="cv-env-lado esquerda" />
                    <span className="cv-env-lado direita" />
                    <span className="cv-env-base" />
                  </span>
                  <span className="cv-capa-aba" />
                </span>
              </span>

              <span>{e.nome}</span>
            </button>
          );
        })}
      </div>

      <p className="wz-intro" style={{ marginTop: '1.25rem' }}>
        Convite para abrir.
      </p>

      {ETIQUETAS.map((t) => {
        const sel = (estado.cfg.etiquetaId ?? ETIQUETA_PADRAO) === t.id;
        return (
          <label className="wz-escolha" key={t.id}>
            <input
              type="radio"
              name="etiquetaId"
              checked={sel}
              onChange={() =>
                despachar({ tipo: 'campo', caminho: 'etiquetaId', valor: t.id })
              }
            />
            <span>
              <strong>{t.nome}</strong>
              <br />
              <small style={{ opacity: 0.75 }}>{t.dica}</small>
            </span>
          </label>
        );
      })}

      {/* Texto proprio: "Toque para abrir" no celular, "Abra nosso convite",
          ou o que o casal quiser. So aparece quando ha etiqueta. */}
      {(estado.cfg.etiquetaId ?? ETIQUETA_PADRAO) !== 'nenhuma' && (
        <Campo rotulo="Texto da etiqueta" dica="Deixe vazio para usar o padrão.">
          <Texto
            valor={estado.cfg.textoEtiqueta ?? ''}
            placeholder="Clique para abrir"
            maxLength={40}
            onChange={(v) =>
              despachar({ tipo: 'campo', caminho: 'textoEtiqueta', valor: v })
            }
          />
        </Campo>
      )}
    </>
  );
}
