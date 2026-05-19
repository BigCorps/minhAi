import { NextRequest, NextResponse } from 'next/server';
import { createClient, getUser } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { companyId, newType } = await req.json();
  if (!companyId || !['smart', 'vendas'].includes(newType)) {
    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });
  }

  const supabase = createClient();

  const { error } = await supabase
    .from('companies')
    .update({ assistant_type: newType })
    .eq('id', companyId)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
