import { NextResponse, type NextRequest } from 'next/server';
import { TEMAS } from '@/lib/conviteria/temas';
import { FONTES, fontesDoGrupo } from '@/lib/conviteria/fontes';
import { acharTipo } from '@/lib/conviteria/tiposEvento';
import { ipDaRequisicao } from '@/lib/conviteria/servidor';

export const runtime = 'nodejs';

// Limite por IP. IA e o unico ponto do produto com custo por chamada:
// sem teto, uma aba aberta com script vira conta no fim do mes.
const limite = new Map<string, { n: number; ate: number }>();
function passou(ip: string) {
  const agora = Date.now();
  const e = limite.get(ip);
  if (!e || agora > e.ate) { limite.set(ip, { n: 1, ate: agora + 3_600_000 }); return true; }
  if (e.n >= 30) return false;
  e.n++; return true;
}

type Pedido =
  | { tipo: 'frase'; tipoEventoId: string; nomes?: string; contexto?: string }
  | { tipo: 'convocacao'; tipoEventoId: string; nomes?: string; contexto?: string }
  | { tipo: 'estilo'; tipoEventoId: string; contexto: string };

async function chamarModelo(sistema: string, usuario: string, maxTokens: number) {
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: maxTokens,
      temperature: 0.8,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: sistema },
        { role: 'user', content: usuario },
      ],
    }),
  });
  if (!r.ok) throw new Error('modelo indisponivel');
  const j = (await r.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return JSON.parse(j.choices?.[0]?.message?.content ?? '{}') as Record<string, unknown>;
}

export async function POST(req: NextRequest) {
  if (!passou(ipDaRequisicao(req))) {
    return NextResponse.json({ erro: 'Muitas sugestões. Tente daqui a pouco.' }, { status: 429 });
  }

  const p = (await req.json().catch(() => null)) as Pedido | null;
  if (!p?.tipo || !p.tipoEventoId) {
    return NextResponse.json({ erro: 'Pedido inválido.' }, { status: 400 });
  }

  const tipo = acharTipo(p.tipoEventoId);

  try {
    // -----------------------------------------------------------------------
    if (p.tipo === 'frase') {
      const j = await chamarModelo(
        `Você escreve frases curtas para convites brasileiros. Responda em JSON:
{"opcoes":[{"texto":"...","autor":"..."}]}
Regras: 3 opções. Português do Brasil. Máximo 20 palavras cada.
"autor" só quando for citação real e conhecida (versículo, poema, provérbio);
caso contrário, string vazia. Nunca invente autor nem referência bíblica.
Use \\n para quebrar a linha em no máximo um ponto.`,
        `Evento: ${tipo.nome}. Nomes: ${p.nomes || 'não informado'}. ${p.contexto ?? ''}`,
        400
      );
      const opcoes = Array.isArray(j.opcoes) ? j.opcoes.slice(0, 3) : [];
      return NextResponse.json({ opcoes });
    }

    // -----------------------------------------------------------------------
    if (p.tipo === 'convocacao') {
      const j = await chamarModelo(
        `Você escreve a linha curta que aparece sob os nomes em um convite.
Responda em JSON: {"opcoes":["...","...","..."]}
Regras: 3 opções, português do Brasil, máximo 8 palavras cada, sem ponto final.
Exemplo para casamento: "Convidam para a cerimônia de casamento".`,
        `Evento: ${tipo.nome}. Nomes: ${p.nomes || 'não informado'}. ${p.contexto ?? ''}`,
        200
      );
      const opcoes = (Array.isArray(j.opcoes) ? j.opcoes : [])
        .filter((o): o is string => typeof o === 'string')
        .slice(0, 3);
      return NextResponse.json({ opcoes });
    }

    // -----------------------------------------------------------------------
    // Estilo: o modelo escolhe de um catálogo fechado. Nunca inventa cor nem
    // fonte — só devolve id, e o id é validado abaixo.
    const permitidas = fontesDoGrupo(tipo.grupo);
    const catalogoTemas = TEMAS.map((t) => `${t.id}: ${t.nome}`).join('; ');
    const catalogoFontes = (permitidas.length ? permitidas : FONTES)
      .map((f) => `${f.id}: ${f.nome}`).join('; ');

    const j = await chamarModelo(
      `Escolha um tema de cor e um par tipográfico para um convite, a partir da
descrição do usuário. Responda em JSON: {"temaId":"...","fonteId":"...","porque":"..."}
Use APENAS ids das listas. "porque" em uma frase curta, português do Brasil.
Temas: ${catalogoTemas}
Fontes: ${catalogoFontes}`,
      `Evento: ${tipo.nome}. Descrição: ${p.contexto}`,
      200
    );

    // Validação: id inventado cai no padrão em vez de quebrar a prévia.
    const temaId = TEMAS.some((t) => t.id === j.temaId) ? (j.temaId as string) : null;
    const fonteId = FONTES.some((f) => f.id === j.fonteId) ? (j.fonteId as string) : null;
    if (!temaId || !fonteId) {
      return NextResponse.json({ erro: 'Não consegui sugerir. Escolha manualmente.' }, { status: 422 });
    }

    return NextResponse.json({
      temaId,
      fonteId,
      porque: typeof j.porque === 'string' ? j.porque.slice(0, 160) : '',
    });
  } catch {
    // Falha de IA nunca pode travar o wizard: o usuário escolhe à mão.
    return NextResponse.json({ erro: 'Sugestão indisponível agora.' }, { status: 503 });
  }
}
