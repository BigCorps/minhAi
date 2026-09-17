import { NextResponse, type NextRequest } from 'next/server';
import sharp from 'sharp';
import { adminConviteria } from '@/lib/conviteria/servidor';

export const runtime = 'nodejs';
const BUCKET = 'conviteria-midia';
const REGRAS = {
  foto: { limite: 5 * 1024 * 1024, mimes: ['image/jpeg','image/png','image/webp','image/heic'], ext: { 'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/heic':'heic' } },
  musica: { limite: 8 * 1024 * 1024, mimes: ['audio/mpeg','audio/mp3'], ext: { 'audio/mpeg':'mp3','audio/mp3':'mp3' } },
  logo: { limite: 1024 * 1024, mimes: ['image/png','image/webp','image/svg+xml'], ext: { 'image/png':'png','image/webp':'webp','image/svg+xml':'svg' } },
  presente: { limite: 2 * 1024 * 1024, mimes: ['image/jpeg','image/png','image/webp'], ext: { 'image/jpeg':'jpg','image/png':'png','image/webp':'webp' } },
  padrinho: { limite: 3 * 1024 * 1024, mimes: ['image/jpeg','image/png','image/webp'], ext: { 'image/jpeg':'jpg','image/png':'png','image/webp':'webp' } },
} as const;
type Tipo = keyof typeof REGRAS;

export async function POST(req: NextRequest) {
  let form: FormData; try { form = await req.formData(); } catch { return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 }); }
  const token = (form.get('token') as string | null)?.trim(); const eventoId = (form.get('eventoId') as string | null)?.trim(); const tipo = form.get('tipo') as string | null; const arquivo = form.get('arquivo');
  if (!token && !eventoId) return NextResponse.json({ erro: 'Destino não informado.' }, { status: 400 });
  if (token && token.length > 100) return NextResponse.json({ erro: 'Token inválido.' }, { status: 400 });
  if (!tipo || !(tipo in REGRAS)) return NextResponse.json({ erro: 'Tipo inválido.' }, { status: 400 });
  if (!(arquivo instanceof File)) return NextResponse.json({ erro: 'Arquivo ausente.' }, { status: 400 });
  const regra = REGRAS[tipo as Tipo];
  if (arquivo.size > regra.limite) return NextResponse.json({ erro: `Arquivo maior que ${Math.max(1, Math.floor(regra.limite / (1024 * 1024)))} MB.` }, { status: 413 });
  if (!(regra.mimes as readonly string[]).includes(arquivo.type)) return NextResponse.json({ erro: 'Formato não aceito.' }, { status: 415 });
  const admin = adminConviteria(); let pasta: string;
  if (eventoId) {
    const acesso = req.headers.get('authorization')?.replace('Bearer ', ''); if (!acesso) return NextResponse.json({ erro: 'Faça login para continuar.' }, { status: 401 });
    const { data: auth, error: erroAuth } = await admin.auth.getUser(acesso); if (erroAuth || !auth.user) return NextResponse.json({ erro: 'Sessão inválida.' }, { status: 401 });
    const { data: evento } = await admin.from('eventos').select('id, contas!inner(user_id)').eq('id', eventoId).maybeSingle();
    const dono = (evento as unknown as { contas: { user_id: string } } | null)?.contas?.user_id;
    if (!evento || dono !== auth.user.id) return NextResponse.json({ erro: 'Convite não encontrado.' }, { status: 404 });
    pasta = `eventos/${eventoId}`;
  } else {
    const { data: rascunho } = await admin.from('rascunhos').select('token, expires_at').eq('token', token).maybeSingle();
    if (!rascunho || new Date(rascunho.expires_at as string) < new Date()) return NextResponse.json({ erro: 'Rascunho não encontrado.' }, { status: 404 });
    pasta = `rascunhos/${token}`;
  }
  let conteudo: Buffer | ArrayBuffer = await arquivo.arrayBuffer(); let contentType = arquivo.type; let ext = (regra.ext as Record<string,string>)[arquivo.type] ?? 'bin';
  if (tipo === 'presente' || tipo === 'padrinho') {
    try {
      conteudo = await sharp(Buffer.from(conteudo)).rotate().resize({ width: tipo === 'padrinho' ? 1200 : 720, height: tipo === 'padrinho' ? 1200 : 720, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82, effort: 4 }).toBuffer();
      contentType = 'image/webp'; ext = 'webp';
    } catch { return NextResponse.json({ erro: 'Não foi possível processar esta imagem. Tente outro JPG, PNG ou WebP.' }, { status: 415 }); }
  }
  const caminho = `${pasta}/${tipo}-${Date.now()}.${ext}`;
  const { error: erroUpload } = await admin.storage.from(BUCKET).upload(caminho, conteudo, { contentType, upsert: true, cacheControl: '31536000' });
  if (erroUpload) return NextResponse.json({ erro: 'Falha ao enviar o arquivo.' }, { status: 500 });
  const { data: publico } = admin.storage.from(BUCKET).getPublicUrl(caminho);
  return NextResponse.json({ tipo, url: publico.publicUrl });
}
