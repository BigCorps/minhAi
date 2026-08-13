'use client';

import { useEffect, useReducer, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import type { Dispatch } from 'react';
import Convite from '../Convite';
import Capa from '../Capa';
import FontesGoogle from '../FontesGoogle';
import { acharTipo } from '@/lib/conviteria/tiposEvento';
import { familiasDoGrupo } from '@/lib/conviteria/tokens';
import { FAMILIAS_LACRE } from '../LacreArte';
import {
  criarEstadoInicial, ETAPAS, pendencias, reduzir,
} from '@/lib/conviteria/wizard';
import type { AcaoWizard, EstadoWizard } from '@/lib/conviteria/wizard';
import EscolherTipo from './etapas/EscolherTipo';
import EscolherTema from './etapas/EscolherTema';
import EscolherFonte from './etapas/EscolherFonte';
import Dados from './etapas/Dados';
import Local from './etapas/Local';
import Midia from './etapas/Midia';
import Secoes from './etapas/Secoes';
import Presentes from './etapas/Presentes';
import Revisao from './etapas/Revisao';
import Publicar from './etapas/Publicar';
import './wizard.css';

export interface PropsEtapa {
  estado: EstadoWizard;
  despachar: Dispatch<AcaoWizard>;
  aoEnviarArquivo?: (tipo: 'foto' | 'musica' | 'logo', arquivo: File) => Promise<string>;
  /** Etapas usam para bloquear campos congelados apos a publicacao. */
  modo?: 'criar' | 'editar';
}

const ETAPA_COMPONENTE: Record<string, React.ComponentType<PropsEtapa>> = {
  tipo: EscolherTipo,
  tema: EscolherTema,
  dados: Dados,
  local: Local,
  fonte: EscolherFonte,
  midia: Midia,
  secoes: Secoes,
  presentes: Presentes,
  revisao: Revisao,
  publicar: Publicar,
};

export interface PropsWizard {
  /** Rascunho recuperado do banco. */
  estadoInicial?: EstadoWizard;
  /** Debounced pelo proprio wizard. Nao precisa de debounce por fora. */
  aoSalvar?: (estado: EstadoWizard) => Promise<void> | void;
  aoEnviarArquivo?: (tipo: 'foto' | 'musica' | 'logo', arquivo: File) => Promise<string>;
  aoConcluir?: (estado: EstadoWizard) => void;
  /**
   * 'editar' esconde a etapa "Publicar" (slug e plano ja estao decididos) e
   * troca o rotulo do botao final. Como 'publicar' e a ULTIMA de ETAPAS, o
   * slice preserva os indices — o reducer continua valendo sem mudanca.
   */
  modo?: 'criar' | 'editar';
}

export default function Wizard({
  estadoInicial, aoSalvar, aoEnviarArquivo, aoConcluir, modo = 'criar',
}: PropsWizard) {
  const etapas = modo === 'editar' ? ETAPAS.slice(0, -1) : ETAPAS;
  // Terceiro argumento do useReducer: o estado padrao so e construido se nao
  // veio rascunho, e apenas na montagem — nunca durante a avaliacao do modulo.
  // Era essa chamada, antes feita em `const ESTADO_INICIAL` no lib/wizard.ts,
  // que estourava no pre-render do build.
  const [estado, despachar] = useReducer(
    reduzir,
    estadoInicial,
    (inicial: EstadoWizard | undefined) => inicial ?? criarEstadoInicial(),
  );

  // Sessao so para o rotulo da barra de marca. Quem ja tem conta nao deve ler
  // "Entrar" — parece que o login nao pegou, e foi exatamente essa confusao
  // que apareceu no teste.
  const [logado, setLogado] = useState<boolean | null>(null);
  useEffect(() => {
    const sb = createClient();
    sb.auth.getUser().then(({ data }) => setLogado(!!data.user));
    const { data: sub } = sb.auth.onAuthStateChange((_e, sessao) => setLogado(!!sessao?.user));
    return () => sub.subscription.unsubscribe();
  }, []);

  const [previaAberta, setPreviaAberta] = useState(false);
  // Aba da previa. Comeca no convite: e onde a pessoa esta trabalhando na
  // maioria das etapas. O envelope existia e so aparecia depois de publicar —
  // ninguem via o que estava montando.
  const [abaPrevia, setAbaPrevia] = useState<'convite' | 'envelope'>('convite');
  const primeiraVez = useRef(true);

  const grupo = acharTipo(estado.cfg.tipoEventoId).grupo;
  // Soma as fontes do lacre: o seletor de monograma existe em qualquer grupo.
  const familias = Array.from(new Set([...familiasDoGrupo(grupo), ...FAMILIAS_LACRE]));
  const etapa = ETAPAS[estado.etapa];
  const Componente = ETAPA_COMPONENTE[etapa.id];
  const faltas = pendencias(estado);
  const ultima = estado.etapa === etapas.length - 1;

  // Autosave com debounce. Nao salva no primeiro render para nao gravar
  // rascunho vazio de quem so abriu a pagina e saiu.
  useEffect(() => {
    if (primeiraVez.current) { primeiraVez.current = false; return; }
    if (!aoSalvar) return;
    const id = setTimeout(() => void aoSalvar(estado), 900);
    return () => clearTimeout(id);
  }, [estado, aoSalvar]);

  // Rolar para o topo do formulario ao trocar de etapa (no mobile, o campo
  // ficaria fora da tela).
  const painel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    painel.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [estado.etapa]);

  return (
    <div className="wz">
      <FontesGoogle familias={familias} />
      <div className="wz-painel" ref={painel}>
        {/* Barra de marca: mesma funcao das outras marcas minhAi — da saida
            para quem ja tem conta, sem obrigar a terminar o convite antes. */}
        <div className="wz-marca">
          <a className="wz-marca-logo" href="/convite">
            <img src="/brands/convite/icone-512.png" alt="" width={28} height={28} />
            <span>Convite IA</span>
          </a>
          {/* `logado === null` = verificando. Renderizar qualquer rotulo agora
              faria o texto piscar de "Entrar" para "Minha conta". */}
          <a
            className="wz-marca-entrar"
            href={logado ? '/convite/painel' : '/convite/entrar'}
            style={{ visibility: logado === null ? 'hidden' : 'visible' }}
          >
            {logado ? 'Minha conta' : 'Entrar'}
          </a>
        </div>

        <header className="wz-cabecalho">
          <ol className="wz-trilha">
            {etapas.map((e, i) => (
              <li key={e.id} className={i === estado.etapa ? 'atual' : i < estado.etapa ? 'feita' : ''}>
                <button
                  type="button"
                  onClick={() => despachar({ tipo: 'ir', etapa: i })}
                  aria-current={i === estado.etapa ? 'step' : undefined}
                >
                  <span className="wz-trilha-num">{i + 1}</span>
                  <span className="wz-trilha-nome">{e.titulo}</span>
                </button>
              </li>
            ))}
          </ol>
          <h1 className="wz-titulo">{etapa.titulo}</h1>
        </header>

        {/* `key` na etapa: sem ela o React reaproveita o no e a animacao de
            entrada nao reinicia na troca de etapa. */}
        <div className="wz-conteudo" key={etapa.id}>
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
          <ul className="wz-faltas" role="status">
            {faltas.map((f) => <li key={f}>{f}</li>)}
          </ul>
        )}

        <footer className="wz-rodape">
          {/* No mobile este botao era `position: fixed` e cobria o conteudo
              da etapa. No rodape ele nunca tapa nada. */}
          <button
            type="button"
            className="wz-btn wz-btn-previa"
            onClick={() => setPreviaAberta(true)}
            aria-expanded={previaAberta}
          >
            Ver prévia
            {/* O numero existia no botao flutuante e sumiu na mudanca para o
                rodape. Volta porque e ele que mostra que a previa acompanha a
                etapa — sem isso a pessoa nao percebe que o que ela digita no
                celular ja esta refletido do outro lado. */}
            <span className="wz-badge">{estado.etapa + 1}</span>
          </button>
          <button
            type="button"
            className="wz-btn wz-btn-fantasma"
            disabled={estado.etapa === 0}
            onClick={() => despachar({ tipo: 'voltar' })}
          >
            Voltar
          </button>
          <button
            type="button"
            className="wz-btn wz-btn-principal"
            disabled={faltas.length > 0}
            onClick={() => (ultima ? aoConcluir?.(estado) : despachar({ tipo: 'avancar' }))}
          >
            {ultima ? (modo === 'editar' ? 'Salvar alterações' : 'Ir para o pagamento') : 'Continuar'}
          </button>
        </footer>
      </div>

      {/* Desktop: coluna fixa. Mobile: folha em tela cheia.
          Uma marcacao so — dividir a tela do celular em duas deixaria as
          duas metades inutilizaveis. */}
      <aside className={`wz-previa${previaAberta ? ' aberta' : ''}`}>
        <div className="wz-previa-topo">
          <span>Prévia</span>
          <button
            type="button"
            className="wz-fechar"
            onClick={() => setPreviaAberta(false)}
            aria-label="Fechar prévia"
          >
            ✕
          </button>
        </div>
        {/* Duas abas em vez de mostrar os dois empilhados: o envelope e tela
            cheia por natureza, e um em cima do outro no palco de 380px nao
            deixaria ver nenhum dos dois. */}
        <div className="wz-previa-abas" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={abaPrevia === 'convite'}
            className={abaPrevia === 'convite' ? 'sel' : ''}
            onClick={() => setAbaPrevia('convite')}
          >
            Convite
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={abaPrevia === 'envelope'}
            className={abaPrevia === 'envelope' ? 'sel' : ''}
            onClick={() => setAbaPrevia('envelope')}
          >
            Envelope
          </button>
        </div>

        <div className="wz-previa-palco">
          {abaPrevia === 'envelope' ? (
            <div className="wz-envelope-palco">
              {/* `aoAbrir` vazio de proposito: na previa o clique nao deve
                  disparar a animacao e sumir com o envelope — a pessoa esta
                  conferindo aparencia, nao testando o fluxo. */}
              <Capa
                fotoUrl={estado.cfg.midia?.fotoCapa ?? estado.cfg.midia?.fotoPrincipal}
                lacreId={estado.cfg.lacreId}
                iniciais={estado.cfg.anfitrioes?.iniciais}
                logoLacreUrl={estado.cfg.logoLacreUrl}
                lacreAjuste={estado.cfg.lacreAjuste}
                aoAbrir={() => undefined}
              />
            </div>
          ) : (
            <Convite cfg={estado.cfg} modo={{ previa: true, secaoFoco: etapa.foco }} />
          )}
        </div>
      </aside>

    </div>
  );
}