import type { ConviteConfig, PresenteEscolhido, SecaoConfig, TipoSecao } from './tipos';
import { acharTipo, TIPO_PADRAO } from './tiposEvento';
import { fontesDoGrupo, FONTE_PADRAO } from './fontes';
import {
  ornamentoPadraoDoTipo,
  temaPadraoDoTipo,
} from './temas';

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

const DIAS = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado',
];

export function formatarExtenso(d: Date) {
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

export function formatarDiaSemana(d: Date) {
  return DIAS[d.getDay()];
}

export function daEntradaDeData(valor: string) {
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return null;

  return {
    dataIso: d.toISOString(),
    dataExtenso: formatarExtenso(d),
    diaSemana: formatarDiaSemana(d),
  };
}

export function paraEntradaDeData(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';

  const p = (n: number) => String(n).padStart(2, '0');

  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export interface Etapa {
  id: string;
  titulo: string;
  foco?: TipoSecao;
}

export const ETAPAS: Etapa[] = [
  { id: 'tipo',       titulo: 'Tipo de convite' },
  { id: 'midia',      titulo: 'Foto e música', foco: 'foto' },
  { id: 'tema',       titulo: 'Cores' },
  { id: 'visual',     titulo: 'Estilo visual' },
  { id: 'dados',      titulo: 'Nomes e data', foco: 'nomes' },
  { id: 'local',      titulo: 'Local', foco: 'local' },
  { id: 'fonte',      titulo: 'Fontes', foco: 'nomes' },
  { id: 'logo',       titulo: 'Logo e selo', foco: 'marca' },
  { id: 'interacoes', titulo: 'Interações', foco: 'rsvp' },
  { id: 'presentes',  titulo: 'Presentes', foco: 'presentes' },
  { id: 'secoes',     titulo: 'Seções', foco: 'rsvp' },
  { id: 'revisao',    titulo: 'Revisão' },
  { id: 'publicar',   titulo: 'Publicar' },
];

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
  const tema = temaPadraoDoTipo(tipo.id);

  const d = new Date(Date.now() + 90 * 86400000);
  d.setHours(19, 0, 0, 0);

  return {
    temaId: tema.id,
    fonteId: (fontesDoGrupo(tipo.grupo)[0] ?? FONTE_PADRAO).id,
    tipoEventoId: tipo.id,
    ornamentoId: ornamentoPadraoDoTipo(tipo.id),
    anfitrioes: {
      exibicao: '',
      iniciais: '',
    },
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

export function criarEstadoInicial(tipoEventoId = TIPO_PADRAO.id): EstadoWizard {
  return {
    etapa: 0,
    cfg: configInicial(tipoEventoId),
  };
}

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
  | { tipo: 'alternarPresente'; presente: PresenteEscolhido }
  | { tipo: 'editarPresente'; catalogoId: string; campos: Partial<PresenteEscolhido> }
  | { tipo: 'removerPresente'; catalogoId: string }
  | { tipo: 'hidratar'; estado: EstadoWizard };

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
      return {
        ...estado,
        etapa: Math.max(0, Math.min(ETAPAS.length - 1, acao.etapa)),
      };

    case 'avancar':
      return {
        ...estado,
        etapa: Math.min(ETAPAS.length - 1, estado.etapa + 1),
      };

    case 'voltar':
      return {
        ...estado,
        etapa: Math.max(0, estado.etapa - 1),
      };

    case 'trocarTipoEvento': {
      if (acao.id === estado.cfg.tipoEventoId) return estado;

      const tipo = acharTipo(acao.id);
      const permitidas = fontesDoGrupo(tipo.grupo);

      const fonteId = permitidas.some((f) => f.id === estado.cfg.fonteId)
        ? estado.cfg.fonteId
        : (permitidas[0] ?? FONTE_PADRAO).id;

      return {
        ...estado,
        cfg: {
          ...estado.cfg,
          tipoEventoId: tipo.id,
          temaId: temaPadraoDoTipo(tipo.id).id,
          ornamentoId: ornamentoPadraoDoTipo(tipo.id),
          fonteId,
          secoes: secoesDe(tipo.id),
          evento: {
            ...estado.cfg.evento,
            convocacao: tipo.rotulos.convocacao,
          },
        },
      };
    }

    case 'trocarTema':
      return {
        ...estado,
        cfg: { ...estado.cfg, temaId: acao.id },
      };

    case 'trocarFonte':
      return {
        ...estado,
        cfg: { ...estado.cfg, fonteId: acao.id },
      };

    case 'campo':
      return {
        ...estado,
        cfg: definir(estado.cfg, acao.caminho, acao.valor),
      };

    case 'alternarSecao':
      return {
        ...estado,
        cfg: {
          ...estado.cfg,
          secoes: estado.cfg.secoes.map((s) =>
            s.tipo === acao.secao
              ? { ...s, ativo: !s.ativo }
              : s
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
          secoes: lista.map((s, k) => ({
            ...s,
            ordem: (k + 1) * 10,
          })),
        },
      };
    }

    case 'alternarPresente': {
      const atuais = estado.cfg.presentesEscolhidos ?? [];
      const jaTem = atuais.some(
        (p) => p.catalogoId === acao.presente.catalogoId
      );

      return {
        ...estado,
        cfg: {
          ...estado.cfg,
          presentesEscolhidos: jaTem
            ? atuais.filter(
                (p) => p.catalogoId !== acao.presente.catalogoId
              )
            : [...atuais, acao.presente],
        },
      };
    }

    case 'editarPresente': {
      // Edita SO a copia dentro deste convite. `presentesEscolhidos` e um
      // snapshot no config do evento, nao uma referencia ao catalogo — entao
      // renomear ou trocar o preco aqui nunca afeta outro usuario.
      //
      // Na primeira edicao de cada campo, guarda o valor original para o
      // botao "restaurar" funcionar sem consultar a API de novo.
      const atuais = estado.cfg.presentesEscolhidos ?? [];

      return {
        ...estado,
        cfg: {
          ...estado.cfg,
          presentesEscolhidos: atuais.map((p) => {
            if (p.catalogoId !== acao.catalogoId) return p;

            const original: Partial<PresenteEscolhido> = {};
            if (
              acao.campos.titulo !== undefined &&
              p.tituloOriginal === undefined &&
              !p.personalizado
            ) {
              original.tituloOriginal = p.titulo;
            }
            if (
              acao.campos.valorCentavos !== undefined &&
              p.valorOriginalCentavos === undefined &&
              !p.personalizado
            ) {
              original.valorOriginalCentavos = p.valorCentavos;
            }
            if (
              acao.campos.imagemUrl !== undefined &&
              p.imagemOriginalUrl === undefined &&
              !p.personalizado
            ) {
              original.imagemOriginalUrl = p.imagemUrl ?? null;
            }

            return { ...p, ...original, ...acao.campos };
          }),
        },
      };
    }

    case 'removerPresente':
      return {
        ...estado,
        cfg: {
          ...estado.cfg,
          presentesEscolhidos: (estado.cfg.presentesEscolhidos ?? []).filter(
            (p) => p.catalogoId !== acao.catalogoId
          ),
        },
      };

    case 'configSecao':
      return {
        ...estado,
        cfg: {
          ...estado.cfg,
          secoes: estado.cfg.secoes.map((s) =>
            s.tipo === acao.secao
              ? {
                  ...s,
                  config: {
                    ...s.config,
                    [acao.chave]: acao.valor,
                  },
                }
              : s
          ),
        },
      };

    default:
      return estado;
  }
}

export function pendencias(
  estado: EstadoWizard,
  etapa = estado.etapa,
): string[] {
  const { cfg } = estado;
  const faltas: string[] = [];

  switch (ETAPAS[etapa]?.id) {
    case 'dados':
      if (!cfg.anfitrioes.exibicao.trim()) {
        faltas.push('Preencha os nomes.');
      }
      if (!cfg.evento.dataExtenso.trim()) {
        faltas.push('Escolha a data.');
      }
      break;

    case 'local':
      if (
        cfg.secoes.some((s) => s.tipo === 'local' && s.ativo) &&
        !cfg.local?.logradouro?.trim()
      ) {
        faltas.push('Preencha o endereço ou desligue a seção de local.');
      }
      break;

    default:
      break;
  }

  return faltas;
}
