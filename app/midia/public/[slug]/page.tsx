import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, MonitorSmartphone, QrCode, ArrowRight } from 'lucide-react';
import { notFound } from 'next/navigation';
import { adminMidia } from '@/lib/midia/server';
import { MIDIA_BRAND } from '@/lib/midia/constants';

async function publisherPublic(slug: string) {
  const admin = adminMidia();
  const { data: publisher } = await admin
    .from('publishers')
    .select('id,slug,display_name,status')
    .eq('slug', slug.toLowerCase())
    .eq('status', 'active')
    .maybeSingle();

  if (!publisher) return null;

  const { data: screens } = await admin
    .from('screens')
    .select('id,location_id,public_code,name,screen_type,commercial_mode,status,billing_status')
    .eq('publisher_id', publisher.id)
    .eq('status', 'active')
    .in('commercial_mode', ['partner', 'hybrid'])
    .in('billing_status', ['not_required', 'active']);

  const candidates = screens ?? [];
  const screenIds = candidates.map((screen) => screen.id);
  const { data: settings } = screenIds.length
    ? await admin.from('screen_ad_settings').select('screen_id,accepting_ads').in('screen_id', screenIds)
    : { data: [] };
  const accepting = new Set((settings ?? []).filter((row) => row.accepting_ads).map((row) => row.screen_id));
  const publicScreens = candidates.filter((screen) => accepting.has(screen.id));

  const locationIds = Array.from(new Set(publicScreens.map((screen) => screen.location_id)));
  const { data: locations } = locationIds.length
    ? await admin
        .from('locations')
        .select('id,name,city,state,active')
        .eq('publisher_id', publisher.id)
        .eq('active', true)
        .in('id', locationIds)
    : { data: [] };

  return { publisher, screens: publicScreens, locations: locations ?? [] };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await publisherPublic(slug);
  return {
    title: data ? `${data.publisher.display_name} · Midia.Pro` : 'Ponto indisponível · Midia.Pro',
    description: data
      ? `Anuncie nas telas de ${data.publisher.display_name} pela Midia.Pro.`
      : 'Este endereço Midia.Pro não está disponível.',
    robots: { index: false, follow: false },
  };
}

export default async function MidiaPublisherPublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await publisherPublic(slug);
  if (!data) notFound();

  const locationById = new Map(data.locations.map((location) => [location.id, location]));
  const publicCities = Array.from(new Set(
    data.locations
      .filter((location) => location.city)
      .map((location) => `${location.city}${location.state ? `/${location.state}` : ''}`)
  ));

  return (
    <main className="min-h-screen bg-[#F7F9FF] px-4 py-8 text-slate-950 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <Link href="https://midia.pro" className="inline-block">
            <Image src="/brands/midia/logo.png" alt="Midia.Pro" width={180} height={180} priority className="mx-auto h-24 w-auto object-contain" />
          </Link>
          <div className="mt-5 text-xs font-black uppercase tracking-[.18em]" style={{ color: MIDIA_BRAND.red }}>Ponto Midia.Pro</div>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{data.publisher.display_name}</h1>
          {publicCities.length > 0 && (
            <div className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-slate-400">
              <MapPin className="h-4 w-4" /> {publicCities.slice(0, 3).join(' · ')}
            </div>
          )}
        </div>

        <section className="mt-8 rounded-[32px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-950/5 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl bg-blue-50 p-5">
              <MonitorSmartphone className="h-7 w-7" style={{ color: MIDIA_BRAND.blue }} />
              <div className="mt-4 text-3xl font-black">{data.screens.length}</div>
              <div className="mt-1 text-sm font-bold text-slate-500">{data.screens.length === 1 ? 'tela disponível para anunciar' : 'telas disponíveis para anunciar'}</div>
            </div>
            <div className="rounded-3xl bg-red-50 p-5">
              <QrCode className="h-7 w-7" style={{ color: MIDIA_BRAND.red }} />
              <div className="mt-4 text-lg font-black">A partir de R$ 4,90</div>
              <div className="mt-1 text-sm font-bold text-slate-500">Escolha a tela, frequência e horário antes de pagar.</div>
            </div>
          </div>

          {data.screens.length > 0 ? (
            <div className="mt-6 border-t border-slate-100 pt-5">
              <div className="text-xs font-black uppercase tracking-[.16em] text-slate-400">Escolha onde anunciar</div>
              <div className="mt-3 space-y-3">
                {data.screens.map((screen) => {
                  const location = locationById.get(screen.location_id);
                  return (
                    <div key={screen.id} className="rounded-2xl border border-slate-100 p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-black">{screen.name}</div>
                        <div className="mt-1 truncate text-xs font-medium text-slate-400">{location?.name ?? 'Local Midia.Pro'}{location?.city ? ` · ${location.city}${location.state ? `/${location.state}` : ''}` : ''}</div>
                      </div>
                      <Link href={`/anuncie/${screen.public_code}`} className="mt-3 inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black text-white sm:mt-0 sm:w-auto" style={{ backgroundColor: MIDIA_BRAND.red }}>
                        Anunciar nesta tela <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 p-5 text-center text-sm font-bold text-slate-400">Este parceiro ainda não liberou uma tela para publicidade.</div>
          )}
        </section>

        <p className="mt-6 text-center text-xs font-bold text-slate-400">Desenvolvido por BigCorps | Tecnologia minhAi</p>
      </div>
    </main>
  );
}
