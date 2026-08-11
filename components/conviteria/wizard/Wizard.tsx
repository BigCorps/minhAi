'use client';

import { useEffect, useReducer, useRef, useState } from 'react';
import type { Dispatch } from 'react';
import Convite from '../Convite';
import {
  ESTADO_INICIAL, ETAPAS, pendencias, reduzir,
} from '@/lib/conviteria/wizard';
import type { AcaoWizard, EstadoWizard } from '@/lib/conviteria/wizard';
import EscolherTipo from './etapas/EscolherTipo';
import EscolherTema from './etapas/EscolherTema';
import EscolherFonte from './etapas/EscolherFonte';
import Dados from './etapas/Dados';
import Local from './etapas/Local';
import Midia from './etapas/Midia';
import Secoes from './etapas/Secoes';
import Revisao from './etapas/Revisao';
import Publicar from './etapas/Publicar';
import './wizard.css';

export interface PropsEtapa {
  estado: EstadoWizard;
  despachar: Dispatch<AcaoWizard>;
  aoEnviarArquivo?: (tipo: 'foto' | 'musica', arquivo: File) => Promise<void>;
}

const ETAPA_COMPONENTE: Record<string, React.ComponentType<PropsEtapa>> = {
  tipo: EscolherTipo,
  tema: EscolherTema,
  dados: Dados,
  local: Local,
  fonte: EscolherFonte,
  midia: Midia,
  secoes: Secoes,
  revisao: Revisao,
  publicar: Publicar,
};

export interface PropsWizard {
  /** Rascunho recuperado do banco. */
  estadoInicial?: EstadoWizard;
  /** Debounced pelo proprio wizard. Nao precisa de debounce por fora. */
  aoSalvar?: (estado: EstadoWizard) => Promise<void> | void;
  aoEnviarArquivo?: (tipo: 'foto' | 'musica', arquivo: File) => Promise<void>;
  aoConcluir?: (estado: EstadoWizard) => void;
}

export default function Wizard({
  estadoInicial, aoSalvar, aoEnviarArquivo, aoConcluir,
}: PropsWizard) {
  const [estado, despachar] = useReducer(reduzir, estadoInicial ?? ESTADO_INICIAL);
  const [previaAberta, setPreviaAberta] = useState(false);
  const primeiraVez = useRef(true);

  const etapa = ETAPAS[estado.etapa];
  const Componente = ETAPA_COMPONENTE[etapa.id];
  const faltas = pendencias(estado);
  const ultima = estado.etapa === ETAPAS.length - 1;

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
      <div className="wz-painel" ref={painel}>
        <header className="wz-cabecalho">
          <ol className="wz-trilha">
            {ETAPAS.map((e, i) => (
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

        <div className="wz-conteudo">
          {Componente && (
            <Componente
              estado={estado}
              despachar={despachar}
              aoEnviarArquivo={aoEnviarArquivo}
            />
          )}
        </div>

        {faltas.length > 0 && (
          <ul className="wz-faltas" role="status">
            {faltas.map((f) => <li key={f}>{f}</li>)}
          </ul>
        )}

        <footer className="wz-rodape">
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
            {ultima ? 'Ir para o pagamento' : 'Continuar'}
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
        <div className="wz-previa-palco">
          <Convite cfg={estado.cfg} modo={{ previa: true, secaoFoco: etapa.foco }} />
        </div>
      </aside>

      <button
        type="button"
        className="wz-abrir-previa"
        onClick={() => setPreviaAberta(true)}
        aria-expanded={previaAberta}
      >
        Ver prévia
        <span className="wz-badge">{estado.etapa + 1}</span>
      </button>
    </div>
  );
}
