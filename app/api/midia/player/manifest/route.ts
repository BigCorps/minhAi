import { NextResponse } from 'next/server';
import {
  adminMidia,
  adminMidiaStorage,
  canMidiaScreenPlay,
  getMidiaDeviceContext,
  signMidiaProofToken,
} from '@/lib/midia/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const ctx = await getMidiaDeviceContext(request);
  if (!ctx) return NextResponse.json({ error: 'player_unauthorized' }, { status: 401 });

  const admin = adminMidia();
  const canPlay = canMidiaScreenPlay(ctx);

  // Sempre que uma tela volta a consultar o manifesto, aproveitamos para marcar
  // janelas pagas vencidas e reagendar a entrega. É limitado à própria tela,
  // idempotente e não aumenta o settlement contratado.
  if (canPlay) {
    const { error: recoveryError } = await admin.rpc('recover_missed_occurrences', {
      p_screen_id: ctx.screen.id,
      p_limit: 12,
    });
    if (recoveryError) console.error('[midia/player/manifest] recovery:', recoveryError);
  }

  const nowDate = new Date();
  const now = nowDate.toISOString();
  const horizon = new Date(nowDate.getTime() + 48 * 60 * 60 * 1000).toISOString();
  const recent = new Date(nowDate.getTime() - 2 * 60 * 60 * 1000).toISOString();

  const [{ data: items, error }, { data: occurrences, error: occurrenceError }, { data: location }] = await Promise.all([
    admin
      .from('screen_playlist_items')
      .select('id,creative_id,display_seconds,sort_order,source,active,valid_from,valid_until')
      .eq('screen_id', ctx.screen.id)
      .eq('active', true)
      .order('sort_order')
      .order('created_at'),
    admin
      .from('campaign_occurrences')
      .select('id,campaign_id,creative_id,planned_at,window_end_at,display_seconds,status,recovery_attempt')
      .eq('screen_id', ctx.screen.id)
      .eq('status', 'scheduled')
      .lte('planned_at', horizon)
      .gt('window_end_at', recent)
      .order('planned_at'),
    admin
      .from('locations')
      .select('venue_type')
      .eq('id', ctx.screen.location_id)
      .maybeSingle(),
  ]);

  if (error || occurrenceError) {
    console.error('[midia/player/manifest] playlist:', error || occurrenceError);
    return NextResponse.json({ error: 'manifest_unavailable' }, { status: 500 });
  }

  const activeItems = (items ?? []).filter((item) =>
    (!item.valid_from || item.valid_from <= now) && (!item.valid_until || item.valid_until > now)
  );
  const ownCreativeIds = [...new Set(activeItems.map((item) => item.creative_id))];
  const adCreativeIds = [...new Set((occurrences ?? []).map((item) => item.creative_id))];

  const houseEnabled = canPlay
    && ['partner', 'hybrid'].includes(ctx.screen.commercial_mode)
    && ctx.screen.network_inventory_percent > 0;

  const [{ data: creatives, error: creativesError }, { data: adCreatives, error: adCreativesError }, houseResult] = await Promise.all([
    ownCreativeIds.length
      ? admin.from('creatives').select('id,kind,file_name,mime_type,storage_path,size_bytes,duration_seconds,width,height,status,updated_at').in('id', ownCreativeIds).eq('status', 'ready')
      : Promise.resolve({ data: [], error: null }),
    adCreativeIds.length
      ? admin.from('ad_creatives').select('id,kind,file_name,mime_type,storage_path,size_bytes,duration_seconds,width,height,status,updated_at').in('id', adCreativeIds).eq('status', 'ready')
      : Promise.resolve({ data: [], error: null }),
    houseEnabled
      ? admin.from('house_creatives').select('id,name,advertiser_label,kind,file_name,mime_type,storage_path,size_bytes,duration_seconds,width,height,display_seconds,priority,starts_at,ends_at,target_inventory_classes,target_venue_types,updated_at').eq('status', 'ready').order('priority', { ascending: false }).order('created_at').limit(40)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (creativesError || adCreativesError || houseResult.error) {
    console.error('[midia/player/manifest] creatives:', creativesError || adCreativesError || houseResult.error);
    return NextResponse.json({ error: 'manifest_unavailable' }, { status: 500 });
  }

  const venueType = location?.venue_type ?? null;
  const eligibleHouse = (houseResult.data ?? []).filter((creative: any) => {
    if (creative.starts_at && creative.starts_at > now) return false;
    if (creative.ends_at && creative.ends_at <= now) return false;
    const classes = Array.isArray(creative.target_inventory_classes) ? creative.target_inventory_classes : [];
    if (classes.length && !classes.includes(ctx.screen.inventory_class)) return false;
    const venues = Array.isArray(creative.target_venue_types) ? creative.target_venue_types : [];
    if (venues.length && (!venueType || !venues.includes(venueType))) return false;
    return true;
  });

  const creativeById = new Map((creatives ?? []).map((creative) => [creative.id, creative]));
  const adCreativeById = new Map((adCreatives ?? []).map((creative) => [creative.id, creative]));
  const paths = [
    ...activeItems.map((item) => creativeById.get(item.creative_id)?.storage_path),
    ...(occurrences ?? []).map((item) => adCreativeById.get(item.creative_id)?.storage_path),
    ...eligibleHouse.map((item: any) => item.storage_path),
  ].filter((value): value is string => Boolean(value));

  const storage = adminMidiaStorage();
  const signedByPath = new Map<string, string>();
  if (paths.length) {
    const { data: signed, error: signedError } = await storage.storage.from('midia-assets').createSignedUrls([...new Set(paths)], 6 * 60 * 60);
    if (signedError) {
      console.error('[midia/player/manifest] signed urls:', signedError);
      return NextResponse.json({ error: 'media_unavailable' }, { status: 500 });
    }
    for (const row of signed ?? []) if (row.path && row.signedUrl) signedByPath.set(row.path, row.signedUrl);
  }

  const manifestItems = activeItems.flatMap((item) => {
    const creative = creativeById.get(item.creative_id);
    if (!creative) return [];
    const signedUrl = signedByPath.get(creative.storage_path);
    if (!signedUrl) return [];
    return [{
      id: item.id, creativeId: creative.id, kind: creative.kind, mimeType: creative.mime_type,
      fileName: creative.file_name, sizeBytes: Number(creative.size_bytes),
      durationSeconds: creative.duration_seconds == null ? null : Number(creative.duration_seconds),
      width: creative.width, height: creative.height, displaySeconds: Number(item.display_seconds),
      sortOrder: Number(item.sort_order), source: item.source,
      cacheKey: `own:${creative.id}:${creative.updated_at}`, signedUrl,
    }];
  });

  const paidCreatives = [...adCreativeById.values()].flatMap((creative) => {
    const signedUrl = signedByPath.get(creative.storage_path);
    if (!signedUrl) return [];
    return [{
      id: creative.id, creativeId: creative.id, kind: creative.kind, mimeType: creative.mime_type,
      fileName: creative.file_name, sizeBytes: Number(creative.size_bytes),
      durationSeconds: creative.duration_seconds == null ? null : Number(creative.duration_seconds),
      width: creative.width, height: creative.height, displaySeconds: 30, sortOrder: 0,
      source: 'network', cacheKey: `ad:${creative.id}:${creative.updated_at}`, signedUrl,
    }];
  });

  const houseItems = eligibleHouse.flatMap((creative: any, index: number) => {
    const signedUrl = signedByPath.get(creative.storage_path);
    if (!signedUrl) return [];
    return [{
      id: creative.id, creativeId: creative.id, kind: creative.kind, mimeType: creative.mime_type,
      fileName: creative.file_name, sizeBytes: Number(creative.size_bytes),
      durationSeconds: creative.duration_seconds == null ? null : Number(creative.duration_seconds),
      width: creative.width, height: creative.height, displaySeconds: Number(creative.display_seconds),
      sortOrder: index, source: 'house', advertiserLabel: creative.advertiser_label,
      cacheKey: `house:${creative.id}:${creative.updated_at}`, signedUrl,
    }];
  });

  return NextResponse.json({
    screen: {
      id: ctx.screen.id,
      name: ctx.screen.name,
      publicCode: ctx.screen.public_code,
      playlistVersion: ctx.screen.playlist_version,
      status: ctx.screen.status,
      billingStatus: ctx.screen.billing_status,
      canPlay,
      commercialMode: ctx.screen.commercial_mode,
      networkInventoryPercent: ctx.screen.network_inventory_percent,
      inventoryClass: ctx.screen.inventory_class,
      rotationDegrees: Number(ctx.screen.rotation_degrees ?? 0),
    },
    publisher: { slug: ctx.publisher.slug, displayName: ctx.publisher.display_name },
    generatedAt: new Date().toISOString(),
    scheduleHorizonAt: horizon,
    items: canPlay ? manifestItems : [],
    paidCreatives: canPlay ? paidCreatives : [],
    houseItems: canPlay ? houseItems : [],
    paidOccurrences: canPlay ? (occurrences ?? []).map((occurrence) => ({
      id: occurrence.id,
      campaignId: occurrence.campaign_id,
      creativeId: occurrence.creative_id,
      plannedAt: occurrence.planned_at,
      windowEndAt: occurrence.window_end_at,
      displaySeconds: Number(occurrence.display_seconds),
      recoveryAttempt: Number(occurrence.recovery_attempt ?? 0),
      proofToken: signMidiaProofToken({
        occurrenceId: occurrence.id,
        screenId: ctx.screen.id,
        deviceId: ctx.device.id,
        displaySeconds: Number(occurrence.display_seconds),
      }),
    })) : [],
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}
