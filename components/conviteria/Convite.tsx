'use client';

import type { ComponentType } from 'react';
import type {
  ConviteConfig,
  ModoRender,
  PropsSecao,
  SecaoConfig,
} from '@/lib/conviteria/tipos';
import { tokensDoConvite } from '@/lib/conviteria/tokens';
import { acharTema } from '@/lib/conviteria/temas';
import Textura from './Texturas';
import { OrnamentoCanto, OrnamentoDivisor } from './OrnamentoVisual';
import Foto from './secoes/Foto';
import Frase from './secoes/Frase';
import Musica from './secoes/Musica';
import Nomes from './secoes/Nomes';
import DataHora from './secoes/DataHora';
import Contagem from './secoes/Contagem';
import Calendario from './secoes/Calendario';
import Local from './secoes/Local';
import Acao from './secoes/Acao';
import Recados from './secoes/Recados';
import Presentes from './secoes/Presentes';
import Padrinhos from './secoes/Padrinhos';
import Galeria from './secoes/Galeria';
import Fim from './secoes/Fim';
import Marca from './secoes/Marca';
import './convite.css';
import './visual.css';

// Secao nao mapeada devolve null em vez de quebrar: assim da para cadastrar
// um tipo novo no banco antes de o componente existir em producao.
const MAPA: Record<string, ComponentType<PropsSecao>> = {
  foto: Foto,
  frase: Frase,
  musica: Musica,
  nomes: Nomes,
  data: DataHora,
  contagem: Contagem,
  calendario: Calendario,
  local: Local,
  rsvp: Acao,
  recados: Recados,
  presentes: Presentes,
  padrinhos: Padrinhos,
  dresscode: Frase,
  galeria: Galeria,
  marca: Marca,
  fim: Fim,
};

/** Secoes que ja trazem fundo proprio e nao levam divisor antes. */
const SEM_DIVISOR = new Set(['foto', 'data', 'nomes', 'musica', 'fim']);

export default function Convite({
  cfg,
  modo = {},
  revelando = false,
}: {
  cfg: ConviteConfig;
  modo?: ModoRender;
  /** true depois do clique na capa: dispara a animacao de entrada. */
  revelando?: boolean;
}) {
  const secoes = [...cfg.secoes]
    .filter((s) => s.ativo)
    .sort((a, b) => a.ordem - b.ordem);

  const tema = acharTema(cfg.temaId);
  const onde = cfg.texturaOnde ?? 'papel';

  return (
    <div
      className={`cv-fora${revelando ? ' revelando' : ''}`}
      style={tokensDoConvite(cfg.temaId, cfg.fonteId)}
    >
      {/* Textura antes de tudo: e `fixed -z-10`, entao precisa estar dentro do
          escopo dos tokens para pegar as cores do tema, mas nao pode ter fundo
          pintado por cima dela — ver a licao do painel. As cores vem do tema,
          nao de variavel CSS, porque SVG em `fill` nao resolve `var()` de
          contexto ancestral de forma confiavel em todos os navegadores. */}
      {(onde === 'externa' || onde === 'ambas') && (
        <Textura
          texturaId={cfg.texturaId}
          cor={tema.floral.petalaEscura}
          papel={tema.fora}
          cantos
        />
      )}
      <article className="cv-papel">
        {/* No papel a textura NAO usa mascara de canto: o papel tem 440px de
            largura, e um esmaecimento radial nesse espaco pequeno deixaria
            visivel so uma pontinha em cada quina — foi exatamente o que
            aconteceu no primeiro teste. Aqui ela e uniforme e bem fraca. */}
        {(onde === 'papel' || onde === 'ambas') && (
          <Textura
            texturaId={cfg.texturaId}
            cor={tema.floral.petalaEscura}
            papel={tema.papel}
            opacidade={0.13}
          />
        )}
        <OrnamentoCanto id={cfg.ornamentoId} className="cv-canto cv-canto-se" />
        <OrnamentoCanto id={cfg.ornamentoId} className="cv-canto cv-canto-sd" />
        <OrnamentoCanto id={cfg.ornamentoId} className="cv-canto cv-canto-ie" />
        <OrnamentoCanto id={cfg.ornamentoId} className="cv-canto cv-canto-id" />

        {secoes.map((secao, i) => {
          const Componente = MAPA[secao.tipo];
          if (!Componente) return null;

          const anterior = secoes[i - 1];
          const divisor =
            i > 0 &&
            !SEM_DIVISOR.has(secao.tipo) &&
            !SEM_DIVISOR.has(anterior?.tipo ?? '');

          return (
            <div
              key={`${secao.tipo}-${secao.ordem}`}
              id={`secao-${secao.tipo}`}
              className={modo.secaoFoco === secao.tipo ? 'cv-foco' : undefined}
            >
              {divisor && (
                <div className="cv-divisor" aria-hidden="true">
                  <OrnamentoDivisor id={cfg.ornamentoId} />
                </div>
              )}
              <Componente cfg={cfg} secao={secao} modo={modo} />
            </div>
          );
        })}
      </article>
    </div>
  );
}
