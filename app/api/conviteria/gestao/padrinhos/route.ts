import { NextResponse, type NextRequest } from 'next/server';
import { exigirEventoDoUsuario, slugSeguro, texto } from '@/lib/conviteria/gestao-servidor';

export const runtime = 'nodejs';

function cores(valor: unknown) {
  if (!Array.isArray(valor)) return [];
  return valor.map((x) => texto(x, 30)).filter((x) => /^#[0-9a-f]{6}$/i.test(x)).slice(0, 8);
}

function caminhoStorage(url?: string | null) {
  if (!url) return null;
  const marcador = '/storage/v1/object/public/conviteria-midia/';
  const i = url.indexOf(marcador);
  return i >= 0 ? decodeURIComponent(url.slice(i + marcador.length)) : null;
}

export async function GET(req: NextRequest) {
  const eventoId = new URL(req.url).searchParams.get('eventoId')?.trim();
  if (!eventoId) return NextResponse.json({ erro: 'Convite não informado.' }, { status: 400 });
  const r = await exigirEventoDoUsuario(req, eventoId);
  if ('erro' in r) return NextResponse.json({ erro: r.erro }, { status: r.status });
  const { data, error } = await r.admin.from('padrinhos_convites').select('*').eq('evento_id', eventoId).order('created_at');
  if (error) return NextResponse.json({ erro: 'Não foi possível carregar os padrinhos.' }, { status: 500 });
  return NextResponse.json({ padrinhos: data ?? [] });
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null) as any;
  const eventoId = texto(b?.eventoId, 80); const nome = texto(b?.nome, 140);
  if (!eventoId || !nome) return NextResponse.json({ erro: 'Informe o nome.' }, { status: 400 });
  const r = await exigirEventoDoUsuario(req, eventoId); if ('erro' in r) return NextResponse.json({ erro: r.erro }, { status: r.status });
  let slug = slugSeguro(b?.slug || nome) || 'padrinhos';
  for (let n = 1; n <= 30; n++) {
    const candidato = n === 1 ? slug : `${slug}-${n}`;
    const { data: existe } = await r.admin.from('padrinhos_convites').select('id').eq('evento_id', eventoId).eq('slug', candidato).maybeSingle();
    if (!existe) { slug = candidato; break; }
  }
  const { data, error } = await r.admin.from('padrinhos_convites').insert({
    evento_id: eventoId, slug, nome, papel: texto(b?.papel, 100) || null, mensagem: texto(b?.mensagem, 2000) || null,
    foto_url: texto(b?.fotoUrl, 1000) || null, dress_code: texto(b?.dressCode, 500) || null, cores_recomendadas: cores(b?.cores),
  }).select('*').single();
  if (error) return NextResponse.json({ erro: 'Não foi possível criar o convite individual.' }, { status: 500 });
  return NextResponse.json({ ok: true, padrinho: data });
}

export async function PATCH(req: NextRequest) {
  const b = await req.json().catch(() => null) as any; const eventoId = texto(b?.eventoId, 80); const id = texto(b?.id, 80); const nome = texto(b?.nome, 140);
  if (!eventoId || !id || !nome) return NextResponse.json({ erro: 'Dados incompletos.' }, { status: 400 });
  const r = await exigirEventoDoUsuario(req, eventoId); if ('erro' in r) return NextResponse.json({ erro: r.erro }, { status: r.status });
  const { data: atual } = await r.admin.from('padrinhos_convites').select('foto_url').eq('evento_id', eventoId).eq('id', id).maybeSingle();
  const fotoNova = texto(b?.fotoUrl, 1000) || null;
  const { data, error } = await r.admin.from('padrinhos_convites').update({ nome, papel: texto(b?.papel, 100) || null, mensagem: texto(b?.mensagem, 2000) || null, foto_url: fotoNova, dress_code: texto(b?.dressCode, 500) || null, cores_recomendadas: cores(b?.cores) }).eq('evento_id', eventoId).eq('id', id).select('*').single();
  if (error) return NextResponse.json({ erro: 'Não foi possível atualizar.' }, { status: 500 });
  if (atual?.foto_url && atual.foto_url !== fotoNova) {
    const caminho = caminhoStorage(atual.foto_url as string); if (caminho) void r.admin.storage.from('conviteria-midia').remove([caminho]);
  }
  return NextResponse.json({ ok: true, padrinho: data });
}

export async function DELETE(req: NextRequest) {
  const u = new URL(req.url); const eventoId = u.searchParams.get('eventoId')?.trim(); const id = u.searchParams.get('id')?.trim();
  if (!eventoId || !id) return NextResponse.json({ erro: 'Dados inválidos.' }, { status: 400 });
  const r = await exigirEventoDoUsuario(req, eventoId); if ('erro' in r) return NextResponse.json({ erro: r.erro }, { status: r.status });
  const { data: atual } = await r.admin.from('padrinhos_convites').select('foto_url').eq('evento_id', eventoId).eq('id', id).maybeSingle();
  const { error } = await r.admin.from('padrinhos_convites').delete().eq('evento_id', eventoId).eq('id', id);
  if (error) return NextResponse.json({ erro: 'Não foi possível excluir.' }, { status: 500 });
  const caminho = caminhoStorage(atual?.foto_url as string | null); if (caminho) void r.admin.storage.from('conviteria-midia').remove([caminho]);
  return NextResponse.json({ ok: true });
}
