'use client';

import { Fragment, type ComponentType } from 'react';
import {
  CalendarDays,
  Camera,
  CheckCircle2,
  Gift,
  Heart,
  Info,
  MapPin,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import type {
  ConviteConfig,
  ModoRender,
  PropsSecao,
  TipoSecao,
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
import RSVP from './secoes/RSVP';
import Recados from './secoes/Recados';
import Presentes from './secoes/Presentes';
import Padrinhos from './secoes/Padrinhos';
import Programacao from './secoes/Programacao';
import Informacoes from './secoes/Informacoes';
import Galeria from './secoes/Galeria';
import Fim from './secoes/Fim';
import Marca from './secoes/Marca';
import './convite.css';
import './visual.css';

const MAPA: Record<string, ComponentType<PropsSecao>> = {
  foto: Foto, frase: Frase, musica: Musica, nomes: Nomes, data: DataHora,
  contagem: Contagem, calendario: Calendario, local: Local, rsvp: RSVP,
  recados: Recados, presentes: Presentes, padrinhos: Padrinhos,
  dresscode: Frase, programacao: Programacao, informacoes: Informacoes,
  galeria: Galeria, marca: Marca, fim: Fim,
};

const SEM_DIVISOR = new Set(['foto', 'data', 'nomes', 'musica', 'fim']);

/**
 * Atalhos rápidos inspirados no exemplo de referência enviado pelo usuário.
 * A barra é dinâmica: só mostra itens que realmente existem no convite e
 * aponta para os ids que o próprio motor já cria em cada seção.
 */
const ATALHOS = [
  { tipo: 'local', rotulo: 'Localização', Icone: MapPin },
  { tipo: 'rsvp', rotulo: 'Presença', Icone: CheckCircle2 },
  { tipo: 'presentes', rotulo: 'Presentes', Icone: Gift },
  { tipo: 'programacao', rotulo: 'Programação', Icone: CalendarDays },
  { tipo: 'informacoes', rotulo: 'Informações', Icone: Info },
  { tipo: 'dresscode', rotulo: 'Traje', Icone: Sparkles },
  { tipo: 'padrinhos', rotulo: 'Padrinhos', Icone: Heart },
  { tipo: 'galeria', rotulo: 'Galeria', Icone: Camera },
  { tipo: 'recados', rotulo: 'Recados', Icone: MessageSquare },
] as const;

const TIPOS_ATALHO = new Set<TipoSecao>(ATALHOS.map((a) => a.tipo));

function urlHttp(valor?: string) {
  if (!valor) return false;
  try { const u = new URL(valor); return u.protocol === 'https:' || u.protocol === 'http:'; }
  catch { return false; }
}

function temConteudo(tipo: string, cfg: ConviteConfig): boolean {
  switch (tipo) {
    case 'foto': return Boolean(cfg.midia?.fotoPrincipal);
    case 'galeria': return (cfg.midia?.galeria?.length ?? 0) > 0;
    case 'padrinhos': return (cfg.padrinhos?.length ?? 0) > 0;
    case 'musica': return Boolean(cfg.midia?.musica);
    case 'local': return Boolean(cfg.local);
    case 'programacao': return (cfg.programacao?.length ?? 0) > 0;
    case 'informacoes': return (cfg.informacoes?.length ?? 0) > 0;
    case 'presentes':
      return (cfg.presentes?.length ?? 0) > 0
        || (cfg.presentesEscolhidos?.length ?? 0) > 0
        || urlHttp(cfg.listaPresentesExternaUrl);
    default: return true;
  }
}

function NavegacaoRapida({ tipos }: { tipos: Set<TipoSecao> }) {
  const disponiveis = ATALHOS.filter((atalho) => tipos.has(atalho.tipo));

  // Com apenas um destino, a barra ocupa mais espaço do que ajuda.
  if (disponiveis.length < 2) return null;

  function navegar(tipo: TipoSecao) {
    const alvo = document.getElementById(`secao-${tipo}`);
    if (!alvo) return;
    alvo.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <section
      aria-label="Atalhos para as seções do convite"
      className="relative px-5 py-8 text-center"
    >
      <p
        className="m-0 text-[10px] font-semibold uppercase tracking-[0.28em]"
        style={{ color: 'var(--cv-tinta-suave)' }}
      >
        Clique para{' '}
        <span
          className="normal-case tracking-normal"
          style={{
            color: 'var(--cv-acento-texto)',
            fontFamily: 'var(--cv-display)',
            fontSize: '24px',
            fontStyle: 'italic',
            fontWeight: 'var(--cv-display-peso)',
          }}
        >
          Interagir
        </span>
      </p>

      <nav
        className="mx-auto mt-5 flex max-w-[390px] flex-wrap items-start justify-center gap-x-3 gap-y-4"
        aria-label="Navegação rápida do convite"
      >
        {disponiveis.map(({ tipo, rotulo, Icone }) => (
          <button
            key={tipo}
            type="button"
            onClick={() => navegar(tipo)}
            className="group flex w-[62px] cursor-pointer flex-col items-center gap-1.5 border-0 bg-transparent p-0"
            aria-label={`Ir para ${rotulo}`}
          >
            <span
              className="grid h-11 w-11 place-items-center rounded-full shadow-sm transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md group-focus-visible:-translate-y-0.5"
              style={{
                backgroundColor: 'var(--cv-acento)',
                color: 'var(--cv-bloco-texto)',
              }}
            >
              <Icone className="h-[19px] w-[19px]" strokeWidth={1.8} />
            </span>
            <span
              className="max-w-[62px] text-center text-[9px] leading-[1.15]"
              style={{
                color: 'var(--cv-tinta-suave)',
                fontFamily: 'var(--cv-corpo)',
              }}
            >
              {rotulo}
            </span>
          </button>
        ))}
      </nav>
    </section>
  );
}

export default function Convite({ cfg, modo = {}, revelando = false }: { cfg: ConviteConfig; modo?: ModoRender; revelando?: boolean; }) {
  const secoes = [...cfg.secoes]
    .filter((s) => s.ativo && temConteudo(s.tipo, cfg))
    .sort((a, b) => a.ordem - b.ordem);

  const tema = acharTema(cfg.temaId);
  const onde = cfg.texturaOnde ?? 'papel';
  const tiposVisiveis = new Set<TipoSecao>(secoes.map((s) => s.tipo));
  const indiceNavegacao = secoes.findIndex((s) => TIPOS_ATALHO.has(s.tipo));
  const temNavegacao = ATALHOS.filter((a) => tiposVisiveis.has(a.tipo)).length >= 2;

  return (
    <div className={`cv-fora${revelando ? ' revelando' : ''}`} style={tokensDoConvite(cfg.temaId, cfg.fonteId)}>
      {(onde === 'externa' || onde === 'ambas') && <Textura texturaId={cfg.texturaId} cor={tema.floral.petalaEscura} papel={tema.fora} cantos />}
      <article className="cv-papel">
        {(onde === 'papel' || onde === 'ambas') && <Textura texturaId={cfg.texturaId} cor={tema.floral.petalaEscura} papel={tema.papel} opacidade={0.13} />}
        <OrnamentoCanto id={cfg.ornamentoId} className="cv-canto cv-canto-se" />
        <OrnamentoCanto id={cfg.ornamentoId} className="cv-canto cv-canto-sd" />
        <OrnamentoCanto id={cfg.ornamentoId} className="cv-canto cv-canto-ie" />
        <OrnamentoCanto id={cfg.ornamentoId} className="cv-canto cv-canto-id" />

        {secoes.map((secao, i) => {
          const Componente = MAPA[secao.tipo];
          if (!Componente) return null;

          const anterior = secoes[i - 1];
          const inserirNavegacao = temNavegacao && i === indiceNavegacao;
          // A própria barra funciona como separação visual; evita um divisor
          // decorativo encostado logo abaixo dos ícones.
          const divisor = i > 0
            && !inserirNavegacao
            && !SEM_DIVISOR.has(secao.tipo)
            && !SEM_DIVISOR.has(anterior?.tipo ?? '');

          return (
            <Fragment key={`${secao.tipo}-${secao.ordem}`}>
              {inserirNavegacao && <NavegacaoRapida tipos={tiposVisiveis} />}
              <div
                id={`secao-${secao.tipo}`}
                className={modo.secaoFoco === secao.tipo ? 'cv-foco' : undefined}
                style={{ scrollMarginTop: '20px' }}
              >
                {divisor && <div className="cv-divisor" aria-hidden="true"><OrnamentoDivisor id={cfg.ornamentoId} /></div>}
                <Componente cfg={cfg} secao={secao} modo={modo} />
              </div>
            </Fragment>
          );
        })}
      </article>
    </div>
  );
}
