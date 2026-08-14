'use client';

import { AlignCenter, AlignLeft, AlignRight, RotateCcw } from 'lucide-react';
import type { PropsEtapa } from '../Wizard';
import { Campo } from '../Campos';
import LacreArte, {
  FONTE_LACRE_PADRAO,
  FONTES_LACRE,
  LACRE_CORES,
  LACRE_COR_PADRAO,
  LACRE_PADRAO,
  LACRES,
} from '../../LacreArte';
import '../logo.css';

type UsoLogo = 'envelope' | 'convite' | 'ambos';

const AJUSTE_LOGO_PADRAO = {
  escala: 38,
  x: 0,
  y: 0,
  rotacao: 0,
};

export default function Logo({
  estado,
  despachar,
  aoEnviarArquivo,
}: PropsEtapa) {
  const { cfg } = estado;

  const logoMestre = cfg.logoLacreUrl ?? cfg.midia?.logoEventoUrl ?? null;
  const usaEnvelope = Boolean(cfg.logoLacreUrl);
  const usaConvite = Boolean(cfg.midia?.logoEventoUrl);

  function secoesComMarca(ativa: boolean) {
    const existe = cfg.secoes.some((s) => s.tipo === 'marca');

    if (existe) {
      return cfg.secoes.map((s) =>
        s.tipo === 'marca' ? { ...s, ativo: ativa } : s
      );
    }

    if (!ativa) return cfg.secoes;

    const nomes = cfg.secoes.find((s) => s.tipo === 'nomes');
    const ordem = nomes ? nomes.ordem + 1 : 25;

    return [
      ...cfg.secoes,
      { tipo: 'marca' as const, ordem, ativo: true },
    ];
  }

  function aplicarUso(uso: UsoLogo) {
    if (!logoMestre) return;

    const envelope = uso === 'envelope' || uso === 'ambos';
    const convite = uso === 'convite' || uso === 'ambos';

    despachar({
      tipo: 'campo',
      caminho: 'logoLacreUrl',
      valor: envelope ? logoMestre : null,
    });

    despachar({
      tipo: 'campo',
      caminho: 'midia.logoEventoUrl',
      valor: convite ? logoMestre : null,
    });

    despachar({
      tipo: 'campo',
      caminho: 'secoes',
      valor: secoesComMarca(convite),
    });
  }

  async function enviarLogo(file: File) {
    if (!aoEnviarArquivo) return;

    const url = await aoEnviarArquivo('logo', file);

    // Primeiro upload: os dois usos ativos por padrão. Depois a pessoa pode
    // deixar só envelope ou só convite com um clique.
    const envelope = usaEnvelope || (!usaEnvelope && !usaConvite);
    const convite = usaConvite || (!usaEnvelope && !usaConvite);

    despachar({
      tipo: 'campo',
      caminho: 'logoLacreUrl',
      valor: envelope ? url : null,
    });

    despachar({
      tipo: 'campo',
      caminho: 'midia.logoEventoUrl',
      valor: convite ? url : null,
    });

    despachar({
      tipo: 'campo',
      caminho: 'secoes',
      valor: secoesComMarca(convite),
    });
  }

  function removerLogo() {
    despachar({ tipo: 'campo', caminho: 'logoLacreUrl', valor: null });
    despachar({ tipo: 'campo', caminho: 'midia.logoEventoUrl', valor: null });
    despachar({ tipo: 'campo', caminho: 'secoes', valor: secoesComMarca(false) });
  }

  const usoAtual: UsoLogo =
    usaEnvelope && usaConvite
      ? 'ambos'
      : usaConvite
        ? 'convite'
        : 'envelope';

  return (
    <>
      <Campo
        rotulo="Logo"
        dica="Opcional. Um único arquivo pode aparecer no fechamento do envelope, dentro do convite ou nos dois."
      >
        {logoMestre ? (
          <div className="wz-logo-identidade">
            <div className="wz-logo-identidade-preview">
              <img src={logoMestre} alt="Logo escolhido" />
            </div>

            <div className="wz-logo-identidade-acoes">
              <label className="wz-btn wz-btn-fantasma wz-btn-mini">
                Trocar logo
                <input
                  type="file"
                  accept="image/png,image/webp,image/svg+xml"
                  hidden
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) await enviarLogo(f);
                  }}
                />
              </label>

              <button
                type="button"
                className="wz-btn wz-btn-fantasma wz-btn-mini"
                onClick={removerLogo}
              >
                Remover
              </button>
            </div>
          </div>
        ) : (
          <input
            type="file"
            accept="image/png,image/webp,image/svg+xml"
            className="wz-input wz-arquivo"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) await enviarLogo(f);
            }}
          />
        )}

        {logoMestre && (
          <div className="wz-logo-usos">
            {([
              ['envelope', 'No envelope'],
              ['convite', 'No convite'],
              ['ambos', 'Nos dois'],
            ] as const).map(([id, nome]) => (
              <button
                type="button"
                key={id}
                className={`wz-opcao${usoAtual === id ? ' sel' : ''}`}
                aria-pressed={usoAtual === id}
                onClick={() => aplicarUso(id)}
              >
                {nome}
              </button>
            ))}
          </div>
        )}
      </Campo>

      <Campo
        rotulo="Fechamento do envelope"
        dica="Escolha o carimbo. Se usar logo, ele substitui as iniciais no centro."
      >
        <ul className="wz-lacres">
          {LACRES.map((l) => {
            const sel = (cfg.lacreId ?? LACRE_PADRAO) === l.id;

            return (
              <li key={l.id}>
                <button
                  type="button"
                  className={`wz-lacre${sel ? ' sel' : ''}`}
                  aria-pressed={sel}
                  onClick={() =>
                    despachar({
                      tipo: 'campo',
                      caminho: 'lacreId',
                      valor: l.id,
                    })
                  }
                >
                  <LacreArte
                    lacreId={l.id}
                    lacreCor={cfg.lacreCor}
                    iniciais={cfg.anfitrioes.iniciais}
                    logoUrl={cfg.logoLacreUrl}
                    ajuste={cfg.lacreAjuste}
                    logoAjuste={cfg.logoLacreAjuste}
                    tamanho={72}
                  />
                  <span>{l.nome}</span>
                </button>
              </li>
            );
          })}
        </ul>

        {(cfg.lacreId ?? LACRE_PADRAO) !== 'nenhum' && (
          <>
            <p className="wz-status" style={{ marginTop: '.8rem' }}>
              Cor da cera
            </p>

            <div className="wz-lacre-cores">
              {LACRE_CORES.map((cor) => {
                const sel =
                  (cfg.lacreCor ?? LACRE_COR_PADRAO) === cor.id;

                return (
                  <button
                    key={cor.id}
                    type="button"
                    className={`wz-lacre-cor${sel ? ' sel' : ''}`}
                    aria-pressed={sel}
                    onClick={() =>
                      despachar({
                        tipo: 'campo',
                        caminho: 'lacreCor',
                        valor: cor.id,
                      })
                    }
                  >
                    <span
                      className="wz-lacre-cor-amostra"
                      style={{ backgroundColor: cor.amostra }}
                    />
                    {cor.nome}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </Campo>

      {cfg.logoLacreUrl ? (
        <Campo
          rotulo="Posição do logo no fechamento"
          dica="Você pode mover, ampliar e girar o logo livremente sobre o carimbo — ou sobre o envelope quando estiver sem carimbo."
        >
          <div className="wz-logo-lacre-previa">
            <LacreArte
              lacreId={cfg.lacreId ?? LACRE_PADRAO}
              lacreCor={cfg.lacreCor}
              iniciais={cfg.anfitrioes.iniciais}
              logoUrl={cfg.logoLacreUrl}
              ajuste={cfg.lacreAjuste}
              logoAjuste={cfg.logoLacreAjuste}
              tamanho={168}
            />
          </div>

          {([
            ['escala', 'Tamanho', 15, 95, AJUSTE_LOGO_PADRAO.escala],
            ['x', 'Horizontal', -50, 50, AJUSTE_LOGO_PADRAO.x],
            ['y', 'Vertical', -50, 50, AJUSTE_LOGO_PADRAO.y],
            ['rotacao', 'Rotação', -180, 180, AJUSTE_LOGO_PADRAO.rotacao],
          ] as const).map(([chave, rotulo, min, max, padrao]) => {
            const atual =
              cfg.logoLacreAjuste?.[chave] ?? padrao;

            return (
              <div className="wz-slider" key={chave}>
                <label htmlFor={`logo-lacre-${chave}`}>
                  {rotulo}{' '}
                  <span>
                    {atual}{chave === 'rotacao' ? '°' : ''}
                  </span>
                </label>

                <input
                  id={`logo-lacre-${chave}`}
                  type="range"
                  min={min}
                  max={max}
                  step={1}
                  value={atual}
                  onChange={(e) =>
                    despachar({
                      tipo: 'campo',
                      caminho: `logoLacreAjuste.${chave}`,
                      valor: Number(e.target.value),
                    })
                  }
                />
              </div>
            );
          })}

          <button
            type="button"
            className="wz-btn wz-btn-fantasma wz-btn-mini wz-logo-reset"
            onClick={() =>
              despachar({
                tipo: 'campo',
                caminho: 'logoLacreAjuste',
                valor: AJUSTE_LOGO_PADRAO,
              })
            }
          >
            <RotateCcw className="w-4 h-4" />
            Centralizar
          </button>
        </Campo>
      ) : (
        (cfg.lacreId ?? LACRE_PADRAO) !== 'nenhum' &&
        cfg.anfitrioes.iniciais && (
          <Campo
            rotulo="Monograma"
            dica="Sem logo no envelope, as iniciais ocupam o centro do carimbo."
          >
            <div className="wz-logo-lacre-previa">
              <LacreArte
                lacreId={cfg.lacreId ?? LACRE_PADRAO}
                lacreCor={cfg.lacreCor}
                iniciais={cfg.anfitrioes.iniciais}
                ajuste={cfg.lacreAjuste}
                tamanho={148}
              />
            </div>

            <div className="wz-fontes-lacre">
              {FONTES_LACRE.map((f) => {
                const sel =
                  (cfg.lacreAjuste?.fonte ?? FONTE_LACRE_PADRAO) === f.id;

                return (
                  <button
                    key={f.id}
                    type="button"
                    className={`wz-fonte-lacre${sel ? ' sel' : ''}`}
                    aria-pressed={sel}
                    onClick={() =>
                      despachar({
                        tipo: 'campo',
                        caminho: 'lacreAjuste.fonte',
                        valor: f.id,
                      })
                    }
                  >
                    <span style={{ fontFamily: f.familia }}>
                      {cfg.anfitrioes.iniciais || 'AB'}
                    </span>
                    <small>{f.nome}</small>
                  </button>
                );
              })}
            </div>

            {([
              ['escala', 'Tamanho', 20, 48, 34],
              ['x', 'Horizontal', -12, 12, 0],
              ['y', 'Vertical', -12, 12, 0],
            ] as const).map(([chave, rotulo, min, max, padrao]) => {
              const atual = cfg.lacreAjuste?.[chave] ?? padrao;

              return (
                <div className="wz-slider" key={chave}>
                  <label htmlFor={`monograma-${chave}`}>
                    {rotulo} <span>{atual}</span>
                  </label>
                  <input
                    id={`monograma-${chave}`}
                    type="range"
                    min={min}
                    max={max}
                    step={1}
                    value={atual}
                    onChange={(e) =>
                      despachar({
                        tipo: 'campo',
                        caminho: `lacreAjuste.${chave}`,
                        valor: Number(e.target.value),
                      })
                    }
                  />
                </div>
              );
            })}
          </Campo>
        )
      )}

      {cfg.midia?.logoEventoUrl && (
        <Campo
          rotulo="Logo dentro do convite"
          dica="A posição vertical é definida depois em “Seções”. Aqui você ajusta tamanho e alinhamento."
        >
          <div className="wz-logo-convite-previa">
            <img src={cfg.midia.logoEventoUrl} alt="Prévia do logo no convite" />
          </div>

          <div className="wz-slider">
            <label htmlFor="logo-convite-largura">
              Largura{' '}
              <span>
                {cfg.midia.logoEventoAjuste?.largura ?? 52}%
              </span>
            </label>
            <input
              id="logo-convite-largura"
              type="range"
              min={20}
              max={92}
              step={1}
              value={cfg.midia.logoEventoAjuste?.largura ?? 52}
              onChange={(e) =>
                despachar({
                  tipo: 'campo',
                  caminho: 'midia.logoEventoAjuste.largura',
                  valor: Number(e.target.value),
                })
              }
            />
          </div>

          <div className="wz-logo-alinhamentos">
            {([
              ['esquerda', 'Esquerda', AlignLeft],
              ['centro', 'Centro', AlignCenter],
              ['direita', 'Direita', AlignRight],
            ] as const).map(([id, nome, Icone]) => {
              const sel =
                (cfg.midia?.logoEventoAjuste?.alinhamento ?? 'centro') === id;

              return (
                <button
                  type="button"
                  key={id}
                  className={sel ? 'sel' : ''}
                  aria-pressed={sel}
                  onClick={() =>
                    despachar({
                      tipo: 'campo',
                      caminho: 'midia.logoEventoAjuste.alinhamento',
                      valor: id,
                    })
                  }
                >
                  <Icone className="w-4 h-4" />
                  {nome}
                </button>
              );
            })}
          </div>

          <p className="wz-status">
            Em “Seções” você pode mover o bloco Logo para cima ou para baixo no convite.
          </p>
        </Campo>
      )}
    </>
  );
}
