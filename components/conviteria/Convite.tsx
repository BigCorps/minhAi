'use client';

import type { ComponentType } from 'react';
import type {
  ConviteConfig,
  ModoRender,
  PropsSecao,
  SecaoConfig,
} from '@/lib/conviteria/tipos';
import { tokensDoConvite } from '@/lib/conviteria/tokens';
import { ArranjoCanto, RaminhoDivisor } from './Ornamentos';
import Foto from './secoes/Foto';
import Frase from './secoes/Frase';
import Musica from './secoes/Musica';
import Nomes from './secoes/Nomes';
import DataHora from './secoes/DataHora';
import Contagem from './secoes/Contagem';
import Calendario from './secoes/Calendario';
import Local from './secoes/Local';
import Acao from './secoes/Acao';
import Presentes from './secoes/Presentes';
import Padrinhos from './secoes/Padrinhos';
import Galeria from './secoes/Galeria';
import Fim from './secoes/Fim';
import './convite.css';

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
  recados: Acao,
  presentes: Presentes,
  padrinhos: Padrinhos,
  dresscode: Frase,
  galeria: Galeria,
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

  return (
    <div
      className={`cv-fora${revelando ? ' revelando' : ''}`}
      style={tokensDoConvite(cfg.temaId, cfg.fonteId)}
    >
      <article className="cv-papel">
        <ArranjoCanto className="cv-canto cv-canto-se" />
        <ArranjoCanto className="cv-canto cv-canto-sd" />
        <ArranjoCanto className="cv-canto cv-canto-ie" />
        <ArranjoCanto className="cv-canto cv-canto-id" />

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
                  <RaminhoDivisor />
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
