import type { ConviteConfig, SecaoConfig, TipoSecao } from './tipos';
import { acharTipo, TIPO_PADRAO } from './tiposEvento';
import { fontesDoGrupo, FONTE_PADRAO } from './fontes';
import { TEMA_PADRAO } from './temas';

// ---------------------------------------------------------------------------
// Etapas
// ---------------------------------------------------------------------------

export interface Etapa {
  id: string;
  titulo: string;
  /** Secao que a previa destaca ao entrar nesta etapa. */
  foco?: TipoSecao;
}

export const ETAPAS: Etapa[] = [
  { id: 'tipo',    titulo: 'Tipo de convite' },
  { id: 'tema',    titulo: 'Cores' },
  { id: 'dados',   titulo: 'Nomes e data',   foco: 'nomes' },
  { id: 'local',   titulo: 'Local',          foco: 'local' },
  { id: 'fonte',   titulo: 'Fontes',         foco: 'nomes' },
  { id: 'midia',   titulo: 'Foto e música',  foco: 'foto' },
  { id: 'secoes',  titulo: 'Seções',         foco: 'rsvp' },
  { id: 'revisao',  titulo: 'Revisão' },
  { id: 'publicar', titulo: 'Publicar' },
];

// ---------------------------------------------------------------------------
// Estado
// ---------------------------------------------------------------------------

export interface EstadoWizard {
  etapa: number;
  cfg: ConviteConfig;
}

function secoesDe(tipoEventoId: string): SecaoConfig[] {
  return acharTipo(tipoEventoId).secoesPadrao.map((tipo, i) => ({
    tipo,
    ordem: (i + 1) * 10,
    ativo: true,
  }));
}

export function configInicial(tipoEventoId = TIPO_PADRAO.id): ConviteConfig {
  const tipo = acharTipo(tipoEventoId);
  // Data padrao 90 dias a frente: a contagem regressiva na previa mostra
  // numero de verdade em vez de zero, que parece bug para o usuario.
  const d = new Date(Date.now() + 90 * 86400000);
  d.setHours(19, 0, 0, 0);

  return {
    temaId: TEMA_PADRAO.id,
    fonteId: (fontesDoGrupo(tipo.grupo)[0] ?? FONTE_PADRAO).id,
    tipoEventoId: tipo.id,
    anfitrioes: { exibicao: '', iniciais: '' },
    evento: {
      dataIso: d.toISOString(),
      dataExtenso: formatarExtenso(d),
      diaSemana: formatarDiaSemana(d),
      horario: 'às 19h',
      convocacao: tipo.rotulos.convocacao,
    },
    secoes: secoesDe(tipo.id),
  };
}

export const ESTADO_INICIAL: EstadoWizard = { etapa: 0, cfg: configInicial() };

// ---------------------------------------------------------------------------
// Acoes
// ---------------------------------------------------------------------------

export type AcaoWizard =
  | { tipo: 'ir'; etapa: number }
  | { tipo: 'avancar' }
  | { tipo: 'voltar' }
  | { tipo: 'trocarTipoEvento'; id: string }
  | { tipo: 'trocarTema'; id: string }
  | { tipo: 'trocarFonte'; id: string }
  | { tipo: 'campo'; caminho: string; valor: unknown }
  | { tipo: 'alternarSecao'; secao: TipoSecao }
  | { tipo: 'moverSecao'; secao: TipoSecao; direcao: -1 | 1 }
  | { tipo: 'configSecao'; secao: TipoSecao; chave: string; valor: string }
  | { tipo: 'hidratar'; estado: EstadoWizard };

/** Grava em `a.b.c` sem mutar o original. */
function definir<T extends object>(alvo: T, caminho: string, valor: unknown): T {
  const [chave, ...resto] = caminho.split('.');
  const atual = (alvo as Record<string, unknown>)[chave];
  return {
    ...alvo,
    [chave]:
      resto.length === 0
        ? valor
        : definir((atual as object) ?? {}, resto.join('.'), valor),
  };
}

export function reduzir(estado: EstadoWizard, acao: AcaoWizard): EstadoWizard {
  switch (acao.tipo) {
    case 'hidratar':
      return acao.estado;

    case 'ir':
      return { ...estado, etapa: Math.max(0, Math.min(ETAPAS.length - 1, acao.etapa)) };

    case 'avancar':
      return { ...estado, etapa: Math.min(ETAPAS.length - 1, estado.etapa + 1) };

    case 'voltar':
      return { ...estado, etapa: Math.max(0, estado.etapa - 1) };

    case 'trocarTipoEvento': {
      const tipo = acharTipo(acao.id);
      const permitidas = fontesDoGrupo(tipo.grupo);
      // Se a fonte atual nao serve ao novo grupo, cai na primeira permitida.
      const fonteId = permitidas.some((f) => f.id === estado.cfg.fonteId)
        ? estado.cfg.fonteId
        : (permitidas[0] ?? FONTE_PADRAO).id;

      return {
        ...estado,
        cfg: {
          ...estado.cfg,
          tipoEventoId: tipo.id,
          fonteId,
          secoes: secoesDe(tipo.id),
          evento: { ...estado.cfg.evento, convocacao: tipo.rotulos.convocacao },
        },
      };
    }

    case 'trocarTema':
      return { ...estado, cfg: { ...estado.cfg, temaId: acao.id } };

    case 'trocarFonte':
      return { ...estado, cfg: { ...estado.cfg, fonteId: acao.id } };

    case 'campo':
      return { ...estado, cfg: definir(estado.cfg, acao.caminho, acao.valor) };

    case 'alternarSecao':
      return {
        ...estado,
        cfg: {
          ...estado.cfg,
          secoes: estado.cfg.secoes.map((s) =>
            s.tipo === acao.secao ? { ...s, ativo: !s.ativo } : s
          ),
        },
      };

    case 'moverSecao': {
      const lista = [...estado.cfg.secoes].sort((a, b) => a.ordem - b.ordem);
      const i = lista.findIndex((s) => s.tipo === acao.secao);
      const j = i + acao.direcao;
      if (i < 0 || j < 0 || j >= lista.length) return estado;
      [lista[i], lista[j]] = [lista[j], lista[i]];
      return {
        ...estado,
        cfg: {
          ...estado.cfg,
          secoes: lista.map((s, k) => ({ ...s, ordem: (k + 1) * 10 })),
        },
      };
    }

    case 'configSecao':
      return {
        ...estado,
        cfg: {
          ...estado.cfg,
          secoes: estado.cfg.secoes.map((s) =>
            s.tipo === acao.secao
              ? { ...s, config: { ...s.config, [acao.chave]: acao.valor } }
              : s
          ),
        },
      };

    default:
      return estado;
  }
}

// ---------------------------------------------------------------------------
// Validacao
// ---------------------------------------------------------------------------

/** Pendencias da etapa. Vazio = pode avancar. */
export function pendencias(estado: EstadoWizard, etapa = estado.etapa): string[] {
  const { cfg } = estado;
  const faltas: string[] = [];

  switch (ETAPAS[etapa]?.id) {
    case 'dados':
      if (!cfg.anfitrioes.exibicao.trim()) faltas.push('Preencha os nomes.');
      if (!cfg.evento.dataExtenso.trim()) faltas.push('Escolha a data.');
      break;
    case 'local':
      if (cfg.secoes.some((s) => s.tipo === 'local' && s.ativo) && !cfg.local?.logradouro?.trim()) {
        faltas.push('Preencha o endereço ou desligue a seção de local.');
      }
      break;
    default:
      break;
  }
  return faltas;
}

// ---------------------------------------------------------------------------
// Formatacao de data
// ---------------------------------------------------------------------------

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const DIAS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado'];

export function formatarExtenso(d: Date) {
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}
export function formatarDiaSemana(d: Date) {
  return DIAS[d.getDay()];
}

/** Converte o valor de <input type="datetime-local"> para o config. */
export function daEntradaDeData(valor: string) {
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return null;
  return {
    dataIso: d.toISOString(),
    dataExtenso: formatarExtenso(d),
    diaSemana: formatarDiaSemana(d),
  };
}

/** Converte o config para o valor de <input type="datetime-local">. */
export function paraEntradaDeData(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
