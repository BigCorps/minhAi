import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role bypassa RLS
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { profile_id, updates } = body;

    if (!profile_id) {
      return NextResponse.json({ error: 'profile_id obrigatório' }, { status: 400 });
    }

    console.log('🔧 API update-profile:', { profile_id, updates });

    // ✅ USA SERVICE ROLE - BYPASSA RLS
    const { data, error } = await supabaseAdmin
      .from('company_profiles')
      .update(updates)
      .eq('id', profile_id)
      .select('id, nome, email, telefone, endereco')
      .single();

    if (error) {
      console.error('❌ Erro no UPDATE:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✅ Profile atualizado com sucesso:', data);

    return NextResponse.json({ success: true, profile: data });
  } catch (error: any) {
    console.error('❌ Erro na API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
