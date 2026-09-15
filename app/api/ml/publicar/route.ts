import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { cleanUuid } from '@/lib/orders-server';

const ALLOWED_LISTING_TYPES = new Set([
  'free',
  'bronze',
  'gold',
  'gold_special',
  'gold_pro',
  'gold_premium',
]);

async function userCanManageCompany(admin: ReturnType<typeof createAdminClient>, userId: string, companyId: string) {
  const { data: company, error } = await admin
    .from('companies')
    .select('id,user_id,is_active')
    .eq('id', companyId)
    .maybeSingle();

  if (error || !company || company.is_active === false) return { allowed: false, company: null };
  if (company.user_id === userId) return { allowed: true, company };

  const { data: adminRow } = await admin
    .from('company_admins')
    .select('role')
    .eq('company_id', companyId)
    .eq('user_id', userId)
    .maybeSingle();

  return { allowed: !!adminRow, company };
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const produtoId = cleanUuid(body?.produto_id);
  const companyId = cleanUuid(body?.company_id);
  const categoryId = String(body?.ml_category_id || '').trim().slice(0, 64);
  const listingTypeRaw = String(body?.ml_listing_type || 'free').trim();
  const listingType = ALLOWED_LISTING_TYPES.has(listingTypeRaw) ? listingTypeRaw : 'free';

  if (!produtoId || !companyId || !categoryId || !/^[A-Za-z0-9_-]+$/.test(categoryId)) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  }

  const admin = createAdminClient();
  const access = await userCanManageCompany(admin, user.id, companyId);
  if (!access.company) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });
  if (!access.allowed) return NextResponse.json({ error: 'Sem permissão para esta empresa' }, { status: 403 });

  const { data: product } = await admin
    .from('produtos_venda')
    .select('id')
    .eq('id', produtoId)
    .eq('company_id', companyId)
    .maybeSingle();

  if (!product) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });

  // Worker interno: o admin client envia a service role. A Edge Function será
  // fechada para aceitar somente esse token depois que esta rota estiver em produção.
  const res = await admin.functions.invoke('ml-publicar-produto', {
    body: {
      produto_id: produtoId,
      company_id: companyId,
      ml_category_id: categoryId,
      ml_listing_type: listingType,
    },
  });

  if (res.error) {
    return NextResponse.json({ error: res.error.message ?? 'Erro interno' }, { status: 500 });
  }

  return NextResponse.json(res.data);
}
