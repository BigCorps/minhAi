// app/api/check-links/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  try {
    const { companyId } = await req.json();
    if (!companyId) return NextResponse.json({ error: 'companyId obrigatório' }, { status: 400 });

    const supabase = createAdminClient();

    const { data: links, error } = await supabase
      .from('company_links')
      .select('id, url, is_broken')
      .eq('company_id', companyId)
      .eq('is_active', true);

    if (error) return NextResponse.json({ error: 'Erro ao buscar links' }, { status: 500 });

    let ok = 0;
    let broken = 0;

    for (const link of links ?? []) {
      let isBroken = false;
      let status = 0;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const res = await fetch(link.url, {
          method: 'HEAD',
          signal: controller.signal,
          redirect: 'follow',
        });
        clearTimeout(timeout);

        status = res.status;
        isBroken = res.status >= 400;
      } catch {
        isBroken = true;
        status = 0;
      }

      await supabase.from('company_links').update({
        last_checked_at: new Date().toISOString(),
        last_status: status,
        is_broken: isBroken,
        broken_since: isBroken && !link.is_broken ? new Date().toISOString() : undefined,
        notified_at: !isBroken ? null : undefined,
      }).eq('id', link.id);

      isBroken ? broken++ : ok++;
    }

    return NextResponse.json({ ok, broken });
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
