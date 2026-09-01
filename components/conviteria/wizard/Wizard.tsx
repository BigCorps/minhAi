'use client';

import { useEffect, useReducer, useRef, useState } from 'react';
import type { Dispatch } from 'react';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import Convite from '../Convite';
import Capa from '../Capa';
import FontesGoogle from '../FontesGoogle';
import { acharTipo } from '@/lib/conviteria/tiposEvento';
import { familiasDoGrupo, tokensDoConvite } from '@/lib/conviteria/tokens';
import { FAMILIAS_LACRE } from '../LacreArte';
import {
  criarEstadoInicial,
  ETAPAS,
  pendencias,
  reduzir,
} from '@/lib/conviteria/wizard';
import type {
  AcaoWizard,
  EstadoWizard,
} from '@/lib/conviteria/wizard';

import EscolherTipo from './etapas/EscolherTipo';
import Midia from './etapas/Midia';
import EscolherTema from './etapas/EscolherTema';
import Visual from './etapas/Visual';
import Dados from './etapas/Dados';
import Local from './etapas/Local';
import EscolherFonte from './etapas/EscolherFonte';
import Logo from './etapas/Logo';
import Interacoes from './etapas/Interacoes';
import Presentes from './etapas/Presentes';
import Secoes from './etapas/Secoes';
import Revisao from './etapas/Revisao';
import Publicar from './etapas/Publicar';

import './wizard.css';
import './wizard-ux.css';
import './catalogo.css';
import '../ornamentos-assets.css';
import '../lacre-cores.css';

export interface PropsEtapa {
  estado: EstadoWizard;
  despachar: Dispatch<AcaoWizard>;
  aoEnviarArquivo?: (
    tipo: 'foto' | 'musica' | 'logo' | 'presente',
    arquivo: File,
  ) => Promise<string>;
  modo?: 'criar' | 'editar';
}

const ETAPA_COMPONENTE: Record<
  string,
  React.ComponentType<PropsEtapa>
> = {
  tipo: EscolherTipo,
  midia: Midia,
  tema: EscolherTema,
  visual: Visual,
  dados: Dados,
  local: Local,
  fonte: EscolherFonte,
  logo: Logo,
  interacoes: Interacoes,
  presentes: Presentes,
  secoes: Secoes,
  revisao: Revisao,
  publicar: Publicar,
};

export interface PropsWizard {
  estadoInicial?: EstadoWizard;
  aoSalvar?: (estado: EstadoWizard) => Promise<void> | void;
  aoEnviarArquivo?: (
    tipo: 'foto' | 'musica' | 'logo' | 'presente',
    arquivo: File,
  ) => Promise<string>;
  aoConcluir?: (estado: EstadoWizard) => Promise<void> | void;
  concluindo?: boolean;
  modo?: 'criar' | 'editar';
}

export default function Wizard({
  estadoInicial,
  aoSalvar,
  aoEnviarArquivo,
  aoConcluir,
  concluindo = false,
  modo = 'criar',
}: PropsWizard) {
  const etapas =
    modo === 'editar'
      ? ETAPAS.slice(0, -1)
      : ETAPAS;

  const [estado, despachar] = useReducer(
    reduzir,
    estadoInicial,
    (inicial: EstadoWizard | undefined) =>
      inicial ?? criarEstadoInicial(),
  );

  const [logado, setLogado] = useState<boolean | null>(null);

  useEffect(() => {
    const sb = createClient();

    sb.auth.getUser().then(({ data }) =>
      setLogado(!!data.user)
    );

    const { data: sub } = sb.auth.onAuthStateChange(
      (_e, sessao) => setLogado(!!sessao?.user)
    );

    return () => sub.subscription.unsubscribe();
  }, []);

  const [previaAberta, setPreviaAberta] = useState(false);
  const [abaPrevia, setAbaPrevia] =
    useState<'convite' | 'envelope'>('convite');

  const primeiraVez = useRef(true);
  const painel = useRef<HTMLDivElement>(null);
  const trilha = useRef<HTMLOListElement>(null);

  const grupo = acharTipo(estado.cfg.tipoEventoId).grupo;

  const familias = Array.from(
    new Set([
      ...familiasDoGrupo(grupo),
      ...FAMILIAS_LACRE,
    ])
  );

  const etapa = ETAPAS[estado.etapa];
  const Componente = ETAPA_COMPONENTE[etapa.id];
  const faltas = pendencias(estado);
  const ultima = estado.etapa === etapas.length - 1;

  useEffect(() => {
    if (primeiraVez.current) {
      primeiraVez.current = false;
      return;
    }

    if (!aoSalvar) return;

    const id = setTimeout(
      () => void aoSalvar(estado),
      900,
    );

    return () => clearTimeout(id);
  }, [estado, aoSalvar]);

  useEffect(() => {
    painel.current?.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }, [estado.etapa]);

  useEffect(() => {
    const lista = trilha.current;
    const atual = lista?.querySelector<HTMLElement>('li.atual');

    if (!lista || !atual) return;

    const esquerda = Math.max(
      0,
      atual.offsetLeft -
        (lista.clientWidth - atual.offsetWidth) / 2,
    );

    lista.scrollTo({
      left: esquerda,
      behavior: 'smooth',
    });
  }, [estado.etapa]);

  return (
    <div className="wz">
      <FontesGoogle familias={familias} />

      <div className="wz-painel" ref={painel}>
        <div className="wz-marca">
          <a className="wz-marca-logo" href="/convite">
            <img
              src="/brands/convite/icone-512.png"
              alt=""
              width={28}
              height={28}
            />
            <span>Convite IA</span>
          </a>

          <a
            className="wz-marca-entrar"
            href={logado ? '/convite/painel' : '/convite/entrar'}
            style={{
              visibility:
                logado === null ? 'hidden' : 'visible',
            }}
          >
            {logado ? 'Minha conta' : 'Entrar'}
          </a>
        </div>

        <header className="wz-cabecalho">
          <ol className="wz-trilha" ref={trilha}>
            {etapas.map((e, i) => (
              <li
                key={e.id}
                className={
                  i === estado.etapa
                    ? 'atual'
                    : i < estado.etapa
                      ? 'feita'
                      : ''
                }
              >
                <button
                  type="button"
                  onClick={() =>
                    despachar({
                      tipo: 'ir',
                      etapa: i,
                    })
                  }
                  aria-current={
                    i === estado.etapa
                      ? 'step'
                      : undefined
                  }
                >
                  <span className="wz-trilha-num">
                    {i + 1}
                  </span>
                  <span className="wz-trilha-nome">
                    {e.titulo}
                  </span>
                </button>
              </li>
            ))}
          </ol>

          <h1 className="wz-titulo">
            {etapa.titulo}
          </h1>
        </header>

        <div
          className="wz-conteudo"
          key={etapa.id}
        >
          {Componente && (
            <Componente
              estado={estado}
              despachar={despachar}
              aoEnviarArquivo={aoEnviarArquivo}
              modo={modo}
            />
          )}
        </div>

        {faltas.length > 0 && (
          <ul
            className="wz-faltas"
            role="status"
          >
            {faltas.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        )}

        <footer className="wz-rodape">
          <button
            type="button"
            className="wz-btn wz-btn-previa"
            onClick={() =>
              setPreviaAberta(true)
            }
            aria-expanded={previaAberta}
          >
            Ver prévia
            <span className="wz-badge">
              {estado.etapa + 1}
            </span>
          </button>

          <button
            type="button"
            className="wz-btn wz-btn-fantasma"
            disabled={estado.etapa === 0 || concluindo}
            onClick={() =>
              despachar({ tipo: 'voltar' })
            }
          >
            Voltar
          </button>

          <button
            type="button"
            className={`wz-btn wz-btn-principal${
              concluindo ? ' wz-btn-carregando' : ''
            }`}
            disabled={faltas.length > 0 || concluindo}
            onClick={() => {
              if (concluindo) return;

              if (ultima) {
                void aoConcluir?.(estado);
                return;
              }

              despachar({
                tipo: 'avancar',
              });
            }}
          >
            {ultima && concluindo ? (
              <>
                <Loader2
                  className="wz-btn-spinner"
                  aria-hidden="true"
                />
                {modo === 'editar'
                  ? 'Salvando alterações…'
                  : 'Processando…'}
              </>
            ) : ultima ? (
              modo === 'editar'
                ? 'Salvar alterações'
                : 'Ir para o pagamento'
            ) : (
              'Continuar'
            )}
          </button>
        </footer>
      </div>

      <aside
        className={`wz-previa${
          previaAberta ? ' aberta' : ''
        }`}
      >
        <div className="wz-previa-topo">
          <span>Prévia</span>

          <button
            type="button"
            className="wz-fechar"
            onClick={() =>
              setPreviaAberta(false)
            }
            aria-label="Fechar prévia"
          >
            ✕
          </button>
        </div>

        <div
          className="wz-previa-abas"
          role="tablist"
        >
          <button
            type="button"
            role="tab"
            aria-selected={
              abaPrevia === 'convite'
            }
            className={
              abaPrevia === 'convite'
                ? 'sel'
                : ''
            }
            onClick={() =>
              setAbaPrevia('convite')
            }
          >
            Convite
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={
              abaPrevia === 'envelope'
            }
            className={
              abaPrevia === 'envelope'
                ? 'sel'
                : ''
            }
            onClick={() =>
              setAbaPrevia('envelope')
            }
          >
            Envelope
          </button>
        </div>

        <div className="wz-previa-palco">
          {abaPrevia === 'envelope' ? (
            <div
              className="wz-envelope-palco"
              style={tokensDoConvite(
                estado.cfg.temaId,
                estado.cfg.fonteId,
              )}
            >
              <Capa
                fotoUrl={
                  estado.cfg.midia?.fotoCapa ??
                  estado.cfg.midia?.fotoPrincipal
                }
                lacreId={estado.cfg.lacreId}
                lacreCor={estado.cfg.lacreCor}
                iniciais={
                  estado.cfg.anfitrioes?.iniciais
                }
                logoLacreUrl={
                  estado.cfg.logoLacreUrl
                }
                lacreAjuste={
                  estado.cfg.lacreAjuste
                }
                logoLacreAjuste={
                  estado.cfg.logoLacreAjuste
                }
                envelopeId={
                  estado.cfg.envelopeId
                }
                ornamentoId={
                  estado.cfg.ornamentoId
                }
                aoAbrir={() => undefined}
              />
            </div>
          ) : (
            <Convite
              cfg={estado.cfg}
              modo={{
                previa: true,
                secaoFoco: etapa.foco,
              }}
            />
          )}
        </div>
      </aside>
    </div>
  );
}
