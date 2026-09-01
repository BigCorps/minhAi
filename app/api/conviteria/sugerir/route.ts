import { NextResponse, type NextRequest } from 'next/server';
import {
  TEMAS,
  catalogoTemasParaIA,
} from '@/lib/conviteria/temas';
import {
  FONTES,
  fontesDoGrupo,
} from '@/lib/conviteria/fontes';
import {
  ORNAMENTOS_IDS,
  catalogoOrnamentosParaIA,
} from '@/lib/conviteria/ornamentos';
import { acharTipo } from '@/lib/conviteria/tiposEvento';
import { ipDaRequisicao } from '@/lib/conviteria/servidor';

export const runtime = 'nodejs';

const limite = new Map<
  string,
  { n: number; ate: number }
>();

function passou(ip: string) {
  const agora = Date.now();
  const e = limite.get(ip);

  if (!e || agora > e.ate) {
    limite.set(ip, {
      n: 1,
      ate: agora + 3_600_000,
    });

    return true;
  }

  if (e.n >= 30) return false;

  e.n++;
  return true;
}

type Pedido =
  | {
      tipo: 'frase';
      tipoEventoId: string;
      nomes?: string;
      contexto?: string;
    }
  | {
      tipo: 'convocacao';
      tipoEventoId: string;
      nomes?: string;
      contexto?: string;
    }
  | {
      tipo: 'estilo';
      tipoEventoId: string;
      contexto: string;
    };

async function chamarModelo(
  sistema: string,
  usuario: string,
  maxTokens: number
) {
  const r = await fetch(
    'https://api.openai.com/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:
          `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: maxTokens,
        temperature: 0.6,
        response_format: {
          type: 'json_object',
        },
        messages: [
          {
            role: 'system',
            content: sistema,
          },
          {
            role: 'user',
            content: usuario,
          },
        ],
      }),
    }
  );

  if (!r.ok) {
    throw new Error(
      'modelo indisponivel'
    );
  }

  const j = (await r.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };

  return JSON.parse(
    j.choices?.[0]?.message?.content ??
      '{}'
  ) as Record<string, unknown>;
}

export async function POST(
  req: NextRequest
) {
  if (!passou(ipDaRequisicao(req))) {
    return NextResponse.json(
      {
        erro: 'Muitas sugestões. Tente daqui a pouco.',
      },
      {
        status: 429,
      }
    );
  }

  const p = (
    await req
      .json()
      .catch(() => null)
  ) as Pedido | null;

  if (!p?.tipo || !p.tipoEventoId) {
    return NextResponse.json(
      {
        erro: 'Pedido inválido.',
      },
      {
        status: 400,
      }
    );
  }

  const tipo =
    acharTipo(p.tipoEventoId);

  try {
    if (p.tipo === 'frase') {
      const j = await chamarModelo(
        `Você escreve frases curtas para convites brasileiros. Responda em JSON:
{"opcoes":[{"texto":"...","autor":"..."}]}
Regras: 3 opções. Português do Brasil. Máximo 20 palavras cada.
"autor" só quando for citação real e conhecida (versículo, poema, provérbio);
caso contrário, string vazia. Nunca invente autor nem referência bíblica.
Use \\n para quebrar a linha em no máximo um ponto.`,
        `Evento: ${tipo.nome}. Nomes: ${
          p.nomes ||
          'não informado'
        }. ${p.contexto ?? ''}`,
        400
      );

      const opcoes =
        Array.isArray(j.opcoes)
          ? j.opcoes.slice(0, 3)
          : [];

      return NextResponse.json({
        opcoes,
      });
    }

    if (p.tipo === 'convocacao') {
      const j = await chamarModelo(
        `Você escreve a linha curta que aparece sob os nomes em um convite.
Responda em JSON: {"opcoes":["...","...","..."]}
Regras: 3 opções, português do Brasil, máximo 8 palavras cada, sem ponto final.
Exemplo para casamento: "Convidam para a cerimônia de casamento".`,
        `Evento: ${tipo.nome}. Nomes: ${
          p.nomes ||
          'não informado'
        }. ${p.contexto ?? ''}`,
        200
      );

      const opcoes = (
        Array.isArray(j.opcoes)
          ? j.opcoes
          : []
      )
        .filter(
          (o): o is string =>
            typeof o === 'string'
        )
        .slice(0, 3);

      return NextResponse.json({
        opcoes,
      });
    }

    const permitidas =
      fontesDoGrupo(tipo.grupo);

    const catalogoFontes = (
      permitidas.length
        ? permitidas
        : FONTES
    )
      .map(
        (f) =>
          `${f.id}: ${f.nome}`
      )
      .join('; ');

    const j = await chamarModelo(
      `Escolha tema de cor, tipografia e estilo visual para um convite brasileiro.

Responda SOMENTE em JSON:
{"temaId":"...","fonteId":"...","ornamentoId":"...","porque":"..."}

Use apenas ids dos catálogos abaixo.
Leve em conta primeiro o TIPO DO EVENTO e depois a descrição.
Não force estética de casamento em aniversário, festa infantil, formatura,
happy hour ou evento corporativo.

ORIENTAÇÃO DOS NOVOS ORNAMENTOS:
- casamento-original: use quando for casamento romântico, rosas, delicado ou
  quando a pessoa quiser uma composição floral clássica e completa.
- alta-costura: use para algo chique, sofisticado, fashion, feminino elegante
  ou luxo contemporâneo.
- imperial: use para algo muito clássico, formal, tradicional, barroco ou bodas.
- art-deco: use para luxo geométrico, Gatsby, preto e dourado, formatura ou noite.
- organico-chic: use para contemporâneo, design, boho moderno, natureza sofisticada.
- radical: use para urbano, rock, esporte, gamer, jovem, masculino ou energético.

Para aniversários adultos masculinos, considere Carvão & Cobre,
Azul Marinho, Preto & Marfim ou Verde Noturno quando combinarem.
Para aniversário infantil, prefira Confete, Candy Pastel, Céu Azul ou Verde Aventura.
Para formatura, considere Preto & Marfim, Dourado & Marfim, Royal & Prata,
Azul Marinho ou Azul Executivo conforme curso, horário e formalidade.
Para Happy Hour, considere Grafite & Âmbar, Tropical, Marinho ou temas escuros.
Para confraternização empresarial, considere Azul Executivo, Grafite Minimal ou Marinho.
Para vaquinha, considere Azul Confiança ou Verde Esperança.

"porque" deve ser uma frase curta em português do Brasil.

TEMAS:
${catalogoTemasParaIA(tipo.id)}

FONTES:
${catalogoFontes}

ORNAMENTOS:
${catalogoOrnamentosParaIA()}`,
      `Evento: ${tipo.nome}. Descrição: ${p.contexto}`,
      260
    );

    const temaId =
      TEMAS.some(
        (t) => t.id === j.temaId
      )
        ? (j.temaId as string)
        : null;

    const fonteId =
      FONTES.some(
        (f) => f.id === j.fonteId
      )
        ? (j.fonteId as string)
        : null;

    const ornamentoId =
      typeof j.ornamentoId ===
        'string' &&
      ORNAMENTOS_IDS.includes(
        j.ornamentoId as
          (typeof ORNAMENTOS_IDS)[number]
      )
        ? j.ornamentoId
        : null;

    if (
      !temaId ||
      !fonteId ||
      !ornamentoId
    ) {
      return NextResponse.json(
        {
          erro: 'Não consegui sugerir. Escolha manualmente.',
        },
        {
          status: 422,
        }
      );
    }

    return NextResponse.json({
      temaId,
      fonteId,
      ornamentoId,
      porque:
        typeof j.porque === 'string'
          ? j.porque.slice(0, 180)
          : '',
    });
  } catch {
    return NextResponse.json(
      {
        erro: 'Sugestão indisponível agora.',
      },
      {
        status: 503,
      }
    );
  }
}
