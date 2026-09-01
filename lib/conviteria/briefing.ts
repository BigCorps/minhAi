import type {
  ConviteConfig,
  SecaoConfig,
  TipoSecao,
} from './tipos';
import type { EstadoWizard } from './wizard';
import { criarEstadoInicial } from './wizard';
import { TEMAS } from './temas';
import { TIPOS_EVENTO } from './tiposEvento';
import {
  ORNAMENTOS_ASSETS,
  ehOrnamentoId,
  type OrnamentoCatalogoId,
} from './ornamentos';

export const ORNAMENTOS_BRIEFING =
  ORNAMENTOS_ASSETS.map((o) => o.id);

export type OrnamentoBriefing = OrnamentoCatalogoId;

export interface BriefingExtraido {
  tipoEventoId: string | null;
  nomes: string | null;
  nomesCompletos: string | null;
  data: string | null;
  hora: string | null;
  horarioTexto: string | null;
  local: {
    nome: string | null;
    logradouro: string | null;
    bairro: string | null;
    cidade: string | null;
    cep: string | null;
  };
  temaId: string | null;
  ornamentoId: string | null;
  recursos: {
    rsvp: boolean | null;
    presentes: boolean | null;
    recados: boolean | null;
    foto: boolean | null;
    musica: boolean | null;
    logo: boolean | null;
  };
  fraseExata: string | null;
  pendencias: string[];
  pedidosEspeciais: string[];
}

export interface ResumoBriefing {
  titulo: string;
  mensagem: string;
  adiantados: string[];
  sugestoes: string[];
  pendencias: string[];
  pedidosEspeciais: string[];
}

export interface PacoteBriefing {
  estado: EstadoWizard;
  resumo: ResumoBriefing;
}

const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

const DIAS = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

function unicos(lista: Array<string | null | undefined>) {
  return [
    ...new Set(
      lista
        .map((x) => x?.trim())
        .filter((x): x is string => Boolean(x))
    ),
  ];
}

function iniciaisDe(nome: string) {
  return nome
    .split(/\s+e\s+|\s*&\s*|\s+/i)
    .filter((p) => p.length > 2)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function dataDoBriefing(
  data: string,
  hora?: string | null
) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data);
  if (!m) return null;

  const ano = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);

  if (
    ano < 2024 ||
    ano > 2100 ||
    mes < 1 ||
    mes > 12 ||
    dia < 1 ||
    dia > 31
  ) {
    return null;
  }

  const calendario = new Date(
    Date.UTC(ano, mes - 1, dia, 12, 0, 0)
  );

  if (
    calendario.getUTCFullYear() !== ano ||
    calendario.getUTCMonth() !== mes - 1 ||
    calendario.getUTCDate() !== dia
  ) {
    return null;
  }

  const h =
    /^\d{2}:\d{2}$/.test(hora ?? '')
      ? hora!
      : '19:00';

  return {
    dataIso: `${data}T${h}:00-03:00`,
    dataExtenso: `${dia} de ${MESES[mes - 1]} de ${ano}`,
    diaSemana: DIAS[calendario.getUTCDay()],
  };
}

function horarioAmigavel(hora: string) {
  const [h, m] = hora.split(':').map(Number);

  if (!Number.isFinite(h) || !Number.isFinite(m)) {
    return '';
  }

  if (m === 0) return `às ${h}h`;

  return `às ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function ajustarSecao(
  secoes: SecaoConfig[],
  tipo: TipoSecao,
  ativo: boolean | null | undefined
) {
  if (ativo == null) return secoes;

  const existe = secoes.some((s) => s.tipo === tipo);

  if (existe) {
    return secoes.map((s) =>
      s.tipo === tipo ? { ...s, ativo } : s
    );
  }

  if (!ativo) return secoes;

  const maior = secoes.reduce(
    (m, s) => Math.max(m, s.ordem),
    0
  );

  return [
    ...secoes,
    {
      tipo,
      ordem: maior + 10,
      ativo: true,
    },
  ];
}

function aplicarRecursos(
  cfg: ConviteConfig,
  b: BriefingExtraido
) {
  let secoes = [...cfg.secoes];

  secoes = ajustarSecao(
    secoes,
    'rsvp',
    b.recursos.rsvp
  );

  secoes = ajustarSecao(
    secoes,
    'presentes',
    b.recursos.presentes
  );

  secoes = ajustarSecao(
    secoes,
    'recados',
    b.recursos.recados
  );

  secoes = ajustarSecao(
    secoes,
    'foto',
    b.recursos.foto
  );

  secoes = ajustarSecao(
    secoes,
    'musica',
    b.recursos.musica
  );

  if (b.fraseExata) {
    secoes = ajustarSecao(
      secoes,
      'frase',
      true
    );
  }

  return {
    ...cfg,
    secoes,
  };
}

export function aplicarBriefing(
  b: BriefingExtraido
): PacoteBriefing {
  const tipoValido =
    TIPOS_EVENTO.some(
      (t) => t.id === b.tipoEventoId
    )
      ? b.tipoEventoId!
      : undefined;

  const estado =
    criarEstadoInicial(tipoValido);

  let cfg: ConviteConfig = {
    ...estado.cfg,
  };

  const adiantados: string[] = [];
  const sugestoes: string[] = [];
  const pendencias: string[] = [
    ...(b.pendencias ?? []),
  ];

  if (b.nomes) {
    cfg = {
      ...cfg,
      anfitrioes: {
        ...cfg.anfitrioes,
        exibicao: b.nomes,
        completo:
          b.nomesCompletos ||
          cfg.anfitrioes.completo,
        iniciais: iniciaisDe(b.nomes),
      },
    };

    adiantados.push(
      `Nomes: ${b.nomes}`
    );
  }

  if (tipoValido) {
    const tipo = TIPOS_EVENTO.find(
      (t) => t.id === tipoValido
    )!;

    adiantados.push(
      `Tipo: ${tipo.nome}`
    );
  }

  if (b.data) {
    const d = dataDoBriefing(
      b.data,
      b.hora
    );

    if (d) {
      cfg = {
        ...cfg,
        evento: {
          ...cfg.evento,
          ...d,
          horario:
            b.horarioTexto ||
            (b.hora
              ? horarioAmigavel(b.hora)
              : cfg.evento.horario),
        },
      };

      adiantados.push(
        `Data: ${d.dataExtenso}`
      );

      if (b.hora) {
        adiantados.push(
          `Horário: ${
            b.horarioTexto ||
            horarioAmigavel(b.hora)
          }`
        );
      } else {
        pendencias.push(
          'Confirme o horário do evento.'
        );
      }
    }
  }

  const temLocal =
    Object.values(b.local ?? {}).some(Boolean);

  if (temLocal) {
    cfg = {
      ...cfg,
      local: {
        ...cfg.local,
        ...(b.local.nome
          ? { nome: b.local.nome }
          : {}),
        ...(b.local.logradouro
          ? {
              logradouro:
                b.local.logradouro,
            }
          : {}),
        ...(b.local.bairro
          ? { bairro: b.local.bairro }
          : {}),
        ...(b.local.cidade
          ? { cidade: b.local.cidade }
          : {}),
        ...(b.local.cep
          ? { cep: b.local.cep }
          : {}),
      },
    };

    const localResumo =
      b.local.nome ||
      b.local.logradouro ||
      b.local.cidade;

    if (localResumo) {
      adiantados.push(
        `Local: ${localResumo}`
      );
    }
  }

  if (
    b.temaId &&
    TEMAS.some(
      (t) => t.id === b.temaId
    )
  ) {
    cfg = {
      ...cfg,
      temaId: b.temaId,
    };

    const tema = TEMAS.find(
      (t) => t.id === b.temaId
    )!;

    sugestoes.push(
      `Cores: ${tema.nome}`
    );
  }

  if (
    b.ornamentoId &&
    ehOrnamentoId(b.ornamentoId)
  ) {
    cfg = {
      ...cfg,
      ornamentoId: b.ornamentoId,
    };

    const ornamento =
      ORNAMENTOS_ASSETS.find(
        (o) => o.id === b.ornamentoId
      );

    if (ornamento) {
      sugestoes.push(
        `Estilo visual: ${ornamento.nome}`
      );
    }
  }

  cfg = aplicarRecursos(cfg, b);

  if (b.recursos.rsvp === true) {
    adiantados.push(
      'Confirmação de presença ativada'
    );
  }

  if (b.recursos.presentes === true) {
    adiantados.push(
      'Lista de presentes ativada'
    );
  }

  if (b.recursos.recados === true) {
    adiantados.push('Recados ativados');
  }

  if (b.recursos.foto === true) {
    adiantados.push(
      'Seção de foto ativada'
    );

    pendencias.push(
      'Envie a foto que deseja usar.'
    );
  }

  if (b.recursos.musica === true) {
    adiantados.push('Música ativada');

    pendencias.push(
      'Escolha a música ou informe o link do YouTube.'
    );
  }

  if (b.recursos.logo === true) {
    pendencias.push(
      'Envie seu logo na etapa “Logo e selo”.'
    );
  }

  if (b.fraseExata) {
    cfg = {
      ...cfg,
      textos: {
        ...cfg.textos,
        frase: b.fraseExata,
      },
    };

    adiantados.push('Frase informada');
  }

  const pedidosEspeciais =
    unicos(
      (b.pedidosEspeciais ?? [])
        .slice(0, 8)
    );

  const adiantadosFinais =
    unicos(adiantados);

  const sugestoesFinais =
    unicos(sugestoes);

  const pendenciasFinais =
    unicos(pendencias).slice(0, 10);

  const temAlgo =
    adiantadosFinais.length +
      sugestoesFinais.length >
    0;

  return {
    estado: {
      etapa: 0,
      cfg,
    },
    resumo: {
      titulo: temAlgo
        ? 'Já comecei seu convite ✨'
        : 'Entendi sua ideia ✨',

      mensagem: temAlgo
        ? 'Algumas coisas eu já consegui adiantar. Outras têm diferentes possibilidades, então deixei as melhores opções para você escolher e personalizar nas próximas etapas.'
        : 'Não quis adivinhar informações importantes. Preparei o convite para você escolher os detalhes com segurança nas próximas etapas.',

      adiantados:
        adiantadosFinais,

      sugestoes:
        sugestoesFinais,

      pendencias:
        pendenciasFinais,

      pedidosEspeciais,
    },
  };
}
