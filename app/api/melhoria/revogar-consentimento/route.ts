// app/api/melhoria/revogar-consentimento/route.ts
// Revoga apenas o consentimento específico de saúde do MelhorIA.
// NÃO apaga auth.users, company, créditos, contatos de emergência ou outros
// produtos da mesma conta. A operação é idempotente e só aceita a sessão dona
// do perfil.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.confirmacao !== 'RETIRAR AUTORIZAÇÃO') {
      return NextResponse.json({ erro: 'confirmação inválida' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const comoUsuario = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
    );

    const { data: sessao } = await comoUsuario.auth.getUser();
    if (!sessao?.user) {
      return NextResponse.json({ erro: 'não autenticado' }, { status: 401 });
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );
    const mel = admin.schema('melhoria');

    const { data: companies, error: erroCompany } = await admin
      .from('companies')
      .select('id')
      .eq('user_id', sessao.user.id)
      .eq('segment_key', 'melhoria')
      .limit(1);

    if (erroCompany) throw erroCompany;
    const companyId = companies?.[0]?.id;
    if (!companyId) {
      return NextResponse.json({ erro: 'conta MelhorIA não encontrada' }, { status: 404 });
    }

    const { data: perfis, error: erroPerfil } = await mel
      .from('perfis')
      .select('id')
      .eq('company_id', companyId)
      .eq('user_id', sessao.user.id)
      .limit(1);

    if (erroPerfil) throw erroPerfil;
    const perfilId = perfis?.[0]?.id;
    if (!perfilId) {
      return NextResponse.json({ erro: 'perfil não encontrado' }, { status: 404 });
    }

    // Captura IDs do Google antes de apagar as linhas locais.
    const [{ data: agendamentos }, { data: medicamentos }, { data: documentos }] = await Promise.all([
      mel.from('agendamentos').select('id, google_event_id').eq('perfil_id', perfilId),
      mel.from('medicamentos').select('id, doses ( id, google_event_id )').eq('perfil_id', perfilId),
      mel.from('documentos').select('id, storage_path').eq('perfil_id', perfilId),
    ]);

    // Impede uma fila antiga de recriar compromissos depois da revogação.
    await mel
      .from('google_fila')
      .update({
        status: 'desistiu',
        ultimo_erro: 'consentimento de saúde revogado',
        processado_em: new Date().toISOString(),
      })
      .eq('perfil_id', perfilId)
      .eq('status', 'pendente');

    const apagarGoogle: Array<Record<string, unknown>> = [];

    for (const ag of agendamentos ?? []) {
      if ((ag as any).google_event_id) {
        apagarGoogle.push({
          perfil_id: perfilId,
          acao: 'apagar',
          origem: 'agendamento',
          origem_id: (ag as any).id,
          google_event_id: (ag as any).google_event_id,
        });
      }
    }

    for (const med of medicamentos ?? []) {
      for (const dose of ((med as any).doses ?? [])) {
        if (dose.google_event_id) {
          apagarGoogle.push({
            perfil_id: perfilId,
            acao: 'apagar',
            origem: 'dose',
            origem_id: dose.id,
            google_event_id: dose.google_event_id,
          });
        }
      }
    }

    if (apagarGoogle.length) {
      const { error } = await mel.from('google_fila').insert(apagarGoogle);
      if (error) {
        // Não bloqueia a revogação local por falha do Google. O consentimento
        // do app precisa poder ser retirado mesmo se um terceiro estiver fora.
        console.error('[revogar-consentimento] fila Google:', error);
      }
    }

    const paths = (documentos ?? [])
      .map((d: any) => d.storage_path)
      .filter((p: unknown): p is string => typeof p === 'string' && p.length > 0);

    if (paths.length) {
      const { error: erroStorage } = await admin.storage
        .from('melhoria-documentos')
        .remove(paths);
      if (erroStorage) throw erroStorage;
    }

    // A partir daqui tudo é idempotente: se houver falha de rede no meio,
    // repetir a operação apenas apaga o que ainda existir.
    const { error: erroAgenda } = await mel.from('agendamentos').delete().eq('perfil_id', perfilId);
    if (erroAgenda) throw erroAgenda;

    const { error: erroDocs } = await mel.from('documentos').delete().eq('perfil_id', perfilId);
    if (erroDocs) throw erroDocs;

    const { error: erroMeds } = await mel.from('medicamentos').delete().eq('perfil_id', perfilId);
    if (erroMeds) throw erroMeds;

    const { error: erroGoogle } = await mel
      .from('google_conexoes')
      .update({ espelhar_remedios: false, espelhar_agenda: false })
      .eq('perfil_id', perfilId);
    if (erroGoogle) throw erroGoogle;

    const { error: erroConsentimento } = await mel
      .from('perfis')
      .update({ consentiu_saude_em: null, consentiu_agenda_em: null })
      .eq('id', perfilId)
      .eq('user_id', sessao.user.id);
    if (erroConsentimento) throw erroConsentimento;

    return NextResponse.json({
      ok: true,
      mensagem: 'Autorização retirada e dados de saúde apagados do MelhorIA.',
    });
  } catch (e) {
    console.error('/api/melhoria/revogar-consentimento:', e);
    return NextResponse.json(
      { erro: 'Não consegui concluir agora. Tente novamente; a operação pode ser repetida com segurança.' },
      { status: 500 },
    );
  }
}
