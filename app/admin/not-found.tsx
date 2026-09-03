import { headers } from 'next/headers';
import { ShieldX } from 'lucide-react';

function cleanHostname(value: string | null) {
  return (value ?? '').split(',')[0].trim().split(':')[0].toLowerCase();
}

export default async function AdminNotFound() {
  const requestHeaders = await headers();
  const hostname = cleanHostname(
    requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host'),
  );

  const home = hostname === 'admin.minhai.app' ? '/' : '/admin';

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-lg items-center justify-center">
        <section className="w-full rounded-3xl border border-white/10 bg-white/[0.04] p-7 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-slate-400">
            <ShieldX className="h-6 w-6" />
          </div>

          <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-lime-300">
            Área administrativa
          </p>
          <h1 className="mt-2 text-2xl font-black">Página não encontrada</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Esta rota não faz parte do painel administrativo.
          </p>

          <a
            href={home}
            className="mt-6 inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-950"
          >
            Voltar ao Admin
          </a>
        </section>
      </div>
    </main>
  );
}
