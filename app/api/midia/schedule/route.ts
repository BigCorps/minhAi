import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase-server';
import { adminMidia } from '@/lib/midia/server';

export const dynamic = 'force-dynamic';

function safeDate(value: string | null, fallback: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  return value;
}

function addDays(iso: string, amount: number) {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount));
  return date.toISOString().slice(0, 10);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function isoDateInTimezone(value: string, timeZone: string) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value));
    const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${map.year}-${map.month}-${map.day}`;
  } catch {
    return String(value).slice(0, 10);
  }
}

export async function GET(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const today = todayIso();
  const from = safeDate(url.searchParams.get('from'), addDays(today, -7));
  const to = safeDate(url.searchParams.get('to'), addDays(today, 35));
  const requestedScreenId = String(url.searchParams.get('screenId') || '').trim();

  const admin = adminMidia();
  const { data: publisher, error: publisherError } = await admin
    .from('publishers')
    .select('id,slug,display_name,status')
    .eq('user_id', user.id)
    .maybeSingle();

  if (publisherError) {
    console.error('[midia/schedule] publisher:', publisherError);
    return NextResponse.json({ error: 'Não foi possível carregar sua conta.' }, { status: 500 });
  }
  if (!publisher) return NextResponse.json({ screens: [], events: [], dailyStats: {}, range: { from, to } });

  const { data: screens, error: screensError } = await admin
    .from('screens')
    .select('id,location_id,name,screen_type,commercial_mode,network_inventory_percent,inventory_class,status')
    .eq('publisher_id', publisher.id)
    .order('created_at');

  if (screensError) {
    console.error('[midia/schedule] screens:', screensError);
    return NextResponse.json({ error: 'Não foi possível carregar suas telas.' }, { status: 500 });
  }

  const allScreens = screens ?? [];
  const filteredScreens = requestedScreenId
    ? allScreens.filter((screen) => screen.id === requestedScreenId)
    : allScreens;
  const screenIds = filteredScreens.map((screen) => screen.id);

  if (requestedScreenId && !screenIds.length) {
    return NextResponse.json({ error: 'Tela não encontrada.' }, { status: 404 });
  }

  const locationIds = [...new Set(allScreens.map((screen) => screen.location_id).filter(Boolean))];
  const [{ data: locations, error: locationsError }, settingsResult, playlistResult] = await Promise.all([
    locationIds.length
      ? admin.from('locations').select('id,name,timezone,venue_type,city,state').in('id', locationIds)
      : Promise.resolve({ data: [], error: null }),
    screenIds.length
      ? admin.from('screen_ad_settings').select('screen_id,active_minutes_per_day,active_start_time,active_end_time,accepting_ads').in('screen_id', screenIds)
      : Promise.resolve({ data: [], error: null }),
    screenIds.length
      ? admin.from('screen_playlist_items').select('screen_id,id').in('screen_id', screenIds).eq('active', true)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (locationsError || settingsResult.error || playlistResult.error) {
    console.error('[midia/schedule] metadata:', locationsError || settingsResult.error || playlistResult.error);
    return NextResponse.json({ error: 'Não foi possível carregar a configuração das telas.' }, { status: 500 });
  }

  // Consulta uma margem de um dia em cada lado para não perder eventos de telas
  // em fusos diferentes do UTC. O calendário recorta visualmente o período atual.
  const rangeStart = `${addDays(from, -1)}T00:00:00.000Z`;
  const rangeEnd = `${addDays(to, 2)}T00:00:00.000Z`;

  const { data: occurrences, error: occurrencesError } = screenIds.length
    ? await admin
        .from('campaign_occurrences')
        .select('id,campaign_id,screen_id,creative_id,planned_at,window_end_at,display_seconds,status,played_at,proof_validated_at,publisher_earned_cents')
        .in('screen_id', screenIds)
        .gte('planned_at', rangeStart)
        .lt('planned_at', rangeEnd)
        .order('planned_at')
    : { data: [], error: null };

  if (occurrencesError) {
    console.error('[midia/schedule] occurrences:', occurrencesError);
    return NextResponse.json({ error: 'Não foi possível carregar a programação.' }, { status: 500 });
  }

  const campaignIds = [...new Set((occurrences ?? []).map((item) => item.campaign_id))];
  const { data: campaigns, error: campaignsError } = campaignIds.length
    ? await admin
        .from('campaigns')
        .select('id,buyer_name,product_key,status,total_price_cents,duration_seconds')
        .in('id', campaignIds)
    : { data: [], error: null };

  if (campaignsError) {
    console.error('[midia/schedule] campaigns:', campaignsError);
    return NextResponse.json({ error: 'Não foi possível carregar as campanhas.' }, { status: 500 });
  }

  const productKeys = [...new Set((campaigns ?? []).map((item) => item.product_key).filter(Boolean))];
  const { data: products, error: productsError } = productKeys.length
    ? await admin.from('ad_product_catalog').select('product_key,name').in('product_key', productKeys)
    : { data: [], error: null };

  if (productsError) {
    console.error('[midia/schedule] products:', productsError);
    return NextResponse.json({ error: 'Não foi possível carregar os produtos de mídia.' }, { status: 500 });
  }

  const locationById = new Map((locations ?? []).map((location) => [location.id, location]));
  const settingsByScreen = new Map((settingsResult.data ?? []).map((setting) => [setting.screen_id, setting]));
  const playlistCount = new Map<string, number>();
  for (const item of playlistResult.data ?? []) {
    playlistCount.set(item.screen_id, (playlistCount.get(item.screen_id) || 0) + 1);
  }
  const campaignById = new Map((campaigns ?? []).map((campaign) => [campaign.id, campaign]));
  const productByKey = new Map((products ?? []).map((product) => [product.product_key, product.name]));
  const screenById = new Map(allScreens.map((screen) => [screen.id, screen]));

  const events = (occurrences ?? []).map((occurrence) => {
    const campaign = campaignById.get(occurrence.campaign_id);
    const screen = screenById.get(occurrence.screen_id);
    const productName = campaign?.product_key ? productByKey.get(campaign.product_key) : null;
    return {
      id: occurrence.id,
      campaignId: occurrence.campaign_id,
      screenId: occurrence.screen_id,
      screenName: screen?.name || 'Tela',
      title: campaign?.buyer_name || productName || 'Anúncio pago',
      subtitle: productName || campaign?.product_key || 'Campanha',
      plannedAt: occurrence.planned_at,
      windowEndAt: occurrence.window_end_at,
      displaySeconds: Number(occurrence.display_seconds || 30),
      status: occurrence.status,
      playedAt: occurrence.played_at,
      proofValidatedAt: occurrence.proof_validated_at,
      publisherEarnedCents: Number(occurrence.publisher_earned_cents || 0),
      campaignStatus: campaign?.status || null,
      totalPriceCents: Number(campaign?.total_price_cents || 0),
    };
  });

  const dailyStats: Record<string, { reservedSeconds: number; capacitySeconds: number; occupancyPercent: number; occurrences: number }> = {};
  const capacityByScreen = new Map<string, number>();
  for (const screen of filteredScreens) {
    const settings = settingsByScreen.get(screen.id);
    const activeMinutes = Math.max(1, Number(settings?.active_minutes_per_day || 720));
    const networkPercent = Math.max(0, Number(screen.network_inventory_percent || 0));
    capacityByScreen.set(screen.id, Math.max(1, Math.round(activeMinutes * 60 * (networkPercent / 100))));
  }

  for (const event of events) {
    const screen = screenById.get(event.screenId);
    const location = screen ? locationById.get(screen.location_id) : null;
    const date = isoDateInTimezone(event.plannedAt, location?.timezone || 'America/Sao_Paulo');
    const row = dailyStats[date] || { reservedSeconds: 0, capacitySeconds: 0, occupancyPercent: 0, occurrences: 0 };
    row.reservedSeconds += event.displaySeconds;
    row.occurrences += 1;
    dailyStats[date] = row;
  }

  for (const date of Object.keys(dailyStats)) {
    const row = dailyStats[date];
    row.capacitySeconds = [...capacityByScreen.values()].reduce((sum, value) => sum + value, 0);
    row.occupancyPercent = row.capacitySeconds > 0
      ? Math.min(100, Math.round((row.reservedSeconds / row.capacitySeconds) * 100))
      : 0;
  }

  return NextResponse.json({
    publisher: { slug: publisher.slug, displayName: publisher.display_name },
    range: { from, to },
    screens: allScreens.map((screen) => {
      const location = locationById.get(screen.location_id);
      const settings = settingsByScreen.get(screen.id);
      return {
        id: screen.id,
        name: screen.name,
        screenType: screen.screen_type,
        commercialMode: screen.commercial_mode,
        networkInventoryPercent: Number(screen.network_inventory_percent || 0),
        inventoryClass: screen.inventory_class,
        status: screen.status,
        locationName: location?.name || null,
        city: location?.city || null,
        state: location?.state || null,
        timezone: location?.timezone || 'America/Sao_Paulo',
        ownPlaylistItems: playlistCount.get(screen.id) || 0,
        activeMinutesPerDay: Number(settings?.active_minutes_per_day || 720),
        activeStartTime: settings?.active_start_time || null,
        activeEndTime: settings?.active_end_time || null,
        acceptingAds: settings?.accepting_ads !== false,
      };
    }),
    events,
    dailyStats,
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}
