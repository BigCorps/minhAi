// app/api/update-profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Campos que o próprio usuário pode atualizar.
// Campos críticos como tipo, company_id, is_active, senha_hash
// ficam fora da whitelist intencionalmente.
const ALLOWED_FIELDS = ['nome', 'email', 'identificador', 'endereco', 'metadata'];

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
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
    const { token, updates } = body;

    // 1. Token obrigatório — sem token, sem acesso
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token de sessão obrigatório' }, { status: 401 });
    }

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json({ error: 'updates obrigatório' }, { status: 400 });
    }

    // 2. Validar token na tabela profile_sessions
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('profile_sessions')
      .select('profile_id, expires_at')
      .eq('token', token)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Token inválido ou sessão não encontrada' }, { status: 401 });
    }

    // 3. Verificar expiração da sessão
    if (session.expires_at && new Date(session.expires_at) < new Date()) {
      await supabaseAdmin.from('profile_sessions').delete().eq('token', token);
      return NextResponse.json({ error: 'Sessão expirada' }, { status: 401 });
    }

    // 4. Whitelist de campos — apenas campos permitidos passam
    const safeUpdates: Record<string, any> = {};
    for (const field of ALLOWED_FIELDS) {
      if (field in updates) {
        safeUpdates[field] = updates[field];
      }
    }

    if (Object.keys(safeUpdates).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo válido para atualizar' }, { status: 400 });
    }

    console.log('🔧 API update-profile:', {
      profile_id: session.profile_id,
      fields: Object.keys(safeUpdates),
    });

    // 5. Atualizar APENAS o perfil dono do token
    // O profile_id vem do token validado, não do body da requisição
    const { data, error } = await supabaseAdmin
      .from('company_profiles')
      .update({
        ...safeUpdates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.profile_id)
      .select('id, nome, email, identificador, endereco, metadata')
      .single();

    if (error) {
      console.error('❌ Erro no UPDATE:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✅ Profile atualizado com sucesso:', data);

    return NextResponse.json({ success: true, profile: data });

  } catch (error: any) {
    console.error('❌ Erro na API update-profile:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}