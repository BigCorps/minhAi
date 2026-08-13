import { NextResponse, type NextRequest } from 'next/server';
import { adminConviteria } from '@/lib/conviteria/servidor';

export const runtime = 'nodejs';

const BUCKET = 'conviteria-midia';

// Os limites espelham o que a etapa Midia promete ao usuario ("Máximo 5 MB",
// "Máximo 8 MB"). Se mudar um, mude o outro — texto que mente sobre o limite
// gera erro sem explicacao na cara de quem esta enviando.
const REGRAS = {
  foto: {
    limite: 5 * 1024 * 1024,
    mimes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
    ext: { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic' },
  },
  musica: {
    limite: 8 * 1024 * 1024,
    mimes: ['audio/mpeg', 'audio/mp3'],
    ext: { 'audio/mpeg': 'mp3', 'audio/mp3': 'mp3' },
  },
  // Logo do cliente: entra no miolo do lacre ou no corpo do convite. Aceita
  // SVG, que os outros tipos nao aceitam — logo e a unica midia aqui em que
  // vetor e o formato natural.
  //
  // Limite baixo de proposito: 1 MB e generoso para um logo, e o arquivo e
  // renderizado a 40px dentro do lacre. Alguem subindo um PNG de 8 MB nao
  // ganha nitidez, so faz o convite demorar a abrir.
  logo: {
    limite: 1024 * 1024,
    mimes: ['image/png', 'image/webp', 'image/svg+xml'],
    ext: { 'image/png': 'png', 'image/webp': 'webp', 'image/svg+xml': 'svg' },
  },
} as const;

type Tipo = keyof typeof REGRAS;

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 });
  }

  const token = (form.get('token') as string | null)?.trim();
  const eventoId = (form.get('eventoId') as string | null)?.trim();
  const tipo = form.get('tipo') as string | null;
  const arquivo = form.get('arquivo');

  // Dois donos possiveis para o arquivo: um rascunho anonimo (fluxo de
  // criacao) ou um evento ja publicado (fluxo de edicao). Exatamente um.
  if (!token && !eventoId) {
    return NextResponse.json({ erro: 'Destino não informado.' }, { status: 400 });
  }
  if (token && token.length > 100) {
    return NextResponse.json({ erro: 'Token inválido.' }, { status: 400 });
  }
  if (tipo !== 'foto' && tipo !== 'musica' && tipo !== 'logo') {
    return NextResponse.json({ erro: 'Tipo inválido.' }, { status: 400 });
  }
  if (!(arquivo instanceof File)) {
    return NextResponse.json({ erro: 'Arquivo ausente.' }, { status: 400 });
  }

  const regra = REGRAS[tipo as Tipo];

  if (arquivo.size > regra.limite) {
    const mb = Math.floor(regra.limite / (1024 * 1024));
    return NextResponse.json({ erro: `Arquivo maior que ${mb} MB.` }, { status: 413 });
  }

  // Allowlist de MIME, nunca blocklist. O `accept` do <input> e conveniencia
  // de interface, nao barreira: qualquer um posta direto na rota.
  if (!(regra.mimes as readonly string[]).includes(arquivo.type)) {
    return NextResponse.json({ erro: 'Formato não aceito.' }, { status: 415 });
  }

  const admin = adminConviteria();

  // O token precisa corresponder a um rascunho vivo. Sem isso a rota vira
  // hospedagem de arquivo aberta: qualquer um inventa um token e sobe o que
  // quiser, de graca, no seu bucket.
  let pasta: string;

  if (eventoId) {
    // Edicao: exige sessao e posse do evento. O token de rascunho nao serve
    // aqui — ele e anonimo, e o evento ja tem dono.
    const acesso = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!acesso) {
      return NextResponse.json({ erro: 'Faça login para continuar.' }, { status: 401 });
    }

    const { data: auth, error: erroAuth } = await admin.auth.getUser(acesso);
    if (erroAuth || !auth.user) {
      return NextResponse.json({ erro: 'Sessão inválida.' }, { status: 401 });
    }

    const { data: evento } = await admin
      .from('eventos')
      .select('id, contas!inner(user_id)')
      .eq('id', eventoId)
      .maybeSingle();

    const dono = (evento as unknown as { contas: { user_id: string } } | null)?.contas?.user_id;
    if (!evento || dono !== auth.user.id) {
      return NextResponse.json({ erro: 'Convite não encontrado.' }, { status: 404 });
    }

    pasta = `eventos/${eventoId}`;
  } else {
    // Criacao: o token precisa corresponder a um rascunho vivo. Sem isso a
    // rota vira hospedagem aberta — qualquer um inventa um token e sobe o que
    // quiser, de graca, no seu bucket.
    const { data: rascunho } = await admin
      .from('rascunhos')
      .select('token, expires_at')
      .eq('token', token)
      .maybeSingle();

    if (!rascunho || new Date(rascunho.expires_at as string) < new Date()) {
      return NextResponse.json({ erro: 'Rascunho não encontrado.' }, { status: 404 });
    }

    pasta = `rascunhos/${token}`;
  }

  const ext = (regra.ext as Record<string, string>)[arquivo.type] ?? 'bin';
  // Nome derivado do destino, nunca do nome original do arquivo:
  // `arquivo.name` vem do cliente e pode conter `../`.
  const caminho = `${pasta}/${tipo}-${Date.now()}.${ext}`;

  const { error: erroUpload } = await admin.storage
    .from(BUCKET)
    .upload(caminho, arquivo, {
      contentType: arquivo.type,
      upsert: true,
      cacheControl: '31536000',
    });

  if (erroUpload) {
    return NextResponse.json({ erro: 'Falha ao enviar o arquivo.' }, { status: 500 });
  }

  const { data: publico } = admin.storage.from(BUCKET).getPublicUrl(caminho);

  // A URL volta para o cliente colocar no estado do wizard. Deliberadamente
  // NAO gravamos em `rascunhos.config` aqui: o autosave do wizard reescreve o
  // config inteiro a cada 900 ms e apagaria esta gravacao na volta.
  return NextResponse.json({ tipo, url: publico.publicUrl });
}