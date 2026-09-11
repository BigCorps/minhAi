import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const PUBLIC_PRODUCT_FIELDS =
  'id,company_id,nome,descricao,categoria,imagem_url,preco_venda,unidade,estoque_atual,controla_estoque,is_active,display_order,marca';

function clampLimit(value: string | null) {
  const parsed = Number(value || 30);
  if (!Number.isFinite(parsed)) return 30;
  return Math.max(1, Math.min(100, Math.floor(parsed)));
}

function mapPublicProduct(row: any) {
  const stock = Number(row.estoque_atual || 0);
  return {
    id: row.id,
    company_id: row.company_id,
    nome: row.nome,
    descricao: row.descricao,
    categoria: row.categoria,
    imagem_url: row.imagem_url,
    preco_venda: Number(row.preco_venda || 0),
    unidade: row.unidade,
    controla_estoque: row.controla_estoque === true,
    disponivel: row.controla_estoque !== true || stock > 0,
    display_order: Number(row.display_order || 0),
    marca: row.marca,
  };
}

export async function GET(request: NextRequest) {
  const companyId = String(request.nextUrl.searchParams.get('company_id') || '').trim();
  const productId = String(request.nextUrl.searchParams.get('id') || '').trim();
  const term = String(request.nextUrl.searchParams.get('q') || '').trim().slice(0, 100);
  const ean = String(request.nextUrl.searchParams.get('ean') || '').replace(/\D/g, '').slice(0, 32);
  const limit = clampLimit(request.nextUrl.searchParams.get('limit'));

  if (!companyId) {
    return NextResponse.json({ error: 'company_id_required' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: company } = await supabase
    .from('companies')
    .select('id,is_active,is_public')
    .eq('id', companyId)
    .eq('is_active', true)
    .maybeSingle();

  if (!company) return NextResponse.json({ error: 'company_not_found' }, { status: 404 });
  if (company.is_public !== true) {
    const { data: funcionaria } = await supabase
      .from('funcionaria_company_settings')
      .select('company_id')
      .eq('company_id', companyId)
      .maybeSingle();
    if (!funcionaria) return NextResponse.json({ error: 'company_not_found' }, { status: 404 });
  }

  let query = supabase
    .from('produtos_venda')
    .select(PUBLIC_PRODUCT_FIELDS)
    .eq('company_id', companyId)
    .eq('is_active', true);

  if (productId) query = query.eq('id', productId);
  if (ean) query = query.eq('ean', ean);
  if (term) query = query.ilike('nome', `%${term.replace(/[%_]/g, '')}%`);

  const { data, error } = await query
    .order('display_order', { ascending: true })
    .order('nome', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('[public/products]', error.message);
    return NextResponse.json({ error: 'products_lookup_failed' }, { status: 500 });
  }

  const products = (data || []).map(mapPublicProduct);
  return NextResponse.json(
    { products },
    { headers: { 'Cache-Control': 'public, max-age=20, stale-while-revalidate=60' } },
  );
}
