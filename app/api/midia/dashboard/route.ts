import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase-server';
import { adminMidia, adminMidiaStorage } from '@/lib/midia/server';
import { MIDIA_WITHDRAWAL_MIN_CENTS } from '@/lib/midia/constants';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const admin = adminMidia();

  const { data: plans, error: plansError } = await admin
    .from('screen_plan_catalog')
    .select('plan_key,name,description,monthly_price_cents,commercial_mode,default_network_inventory_percent,features,sort_order')
    .eq('active', true)
    .order('sort_order');

  if (plansError) {
    console.error('[midia/dashboard] plan catalog:', plansError);
    return NextResponse.json({ error: 'Não foi possível carregar os planos.' }, { status: 500 });
  }

  const { data: publisher, error: publisherError } = await admin
    .from('publishers')
    .select('id,slug,display_name,account_type,status,created_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (publisherError) {
    console.error('[midia/dashboard] publisher:', publisherError);
    return NextResponse.json({ error: 'Não foi possível carregar sua conta Midia.Pro.' }, { status: 500 });
  }

  if (!publisher) {
    return NextResponse.json({ publisher: null, locations: [], screens: [], plans: plans ?? [], playlist: [], devices: [], campaigns: [], finance: null });
  }

  const [{ data: locations, error: locationsError }, { data: screens, error: screensError }] = await Promise.all([
    admin
      .from('locations')
      .select('id,name,venue_type,city,state,active,created_at')
      .eq('publisher_id', publisher.id)
      .order('created_at'),
    admin
      .from('screens')
      .select('id,location_id,public_code,name,screen_type,orientation,aspect_ratio,plan_key,commercial_mode,network_inventory_percent,billing_status,billing_current_period_start,billing_current_period_end,inventory_class,price_factor,status,playlist_version,last_seen_at,created_at')
      .eq('publisher_id', publisher.id)
      .order('created_at'),
  ]);

  if (locationsError || screensError) {
    console.error('[midia/dashboard] inventory:', locationsError || screensError);
    return NextResponse.json({ error: 'Não foi possível carregar suas telas.' }, { status: 500 });
  }

  const screenIds = (screens ?? []).map((screen) => screen.id);
  const [{ data: devices, error: devicesError }, { data: playlist, error: playlistError }] = screenIds.length
    ? await Promise.all([
        admin
          .from('devices')
          .select('id,screen_id,device_name,paired_at,revoked_at,app_version,last_seen_at,last_playlist_version,capabilities,created_at')
          .in('screen_id', screenIds)
          .is('revoked_at', null)
          .order('created_at', { ascending: false }),
        admin
          .from('screen_playlist_items')
          .select('id,screen_id,creative_id,display_seconds,sort_order,source,active,created_at')
          .in('screen_id', screenIds)
          .eq('active', true)
          .order('sort_order'),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];

  if (devicesError || playlistError) {
    console.error('[midia/dashboard] player inventory:', devicesError || playlistError);
    return NextResponse.json({ error: 'Não foi possível carregar o estado dos players.' }, { status: 500 });
  }

  const creativeIds = [...new Set((playlist ?? []).map((item) => item.creative_id))];
  const { data: creatives, error: creativesError } = creativeIds.length
    ? await admin
        .from('creatives')
        .select('id,kind,file_name,mime_type,size_bytes,duration_seconds,width,height,status,created_at')
        .in('id', creativeIds)
        .neq('status', 'deleted')
    : { data: [], error: null };

  if (creativesError) {
    console.error('[midia/dashboard] creatives:', creativesError);
    return NextResponse.json({ error: 'Não foi possível carregar suas mídias.' }, { status: 500 });
  }

  const { data: campaigns, error: campaignsError } = await admin
    .from('campaigns')
    .select('id,screen_id,product_key,buyer_name,duration_seconds,total_price_cents,estimated_occurrences,status,schedule_date,schedule_time,start_date,end_date,paid_at,reviewed_at,approved_at,rejection_reason,created_at')
    .eq('publisher_id', publisher.id)
    .in('status', ['under_review','rejected','scheduled','running','completed'])
    .order('created_at', { ascending: false })
    .limit(40);

  if (campaignsError) {
    console.error('[midia/dashboard] campaigns:', campaignsError);
    return NextResponse.json({ error: 'Não foi possível carregar as campanhas.' }, { status: 500 });
  }

  const campaignIds = (campaigns ?? []).map((campaign) => campaign.id);
  const productKeys = [...new Set((campaigns ?? []).map((campaign) => campaign.product_key))];
  const [{ data: adCreatives, error: adCreativesError }, { data: products, error: productsError }] = await Promise.all([
    campaignIds.length
      ? admin
          .from('ad_creatives')
          .select('id,campaign_id,kind,file_name,mime_type,storage_path,size_bytes,duration_seconds,width,height,status,created_at,updated_at')
          .in('campaign_id', campaignIds)
          .eq('status', 'ready')
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    productKeys.length
      ? admin.from('ad_product_catalog').select('product_key,name').in('product_key', productKeys)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (adCreativesError || productsError) {
    console.error('[midia/dashboard] campaign details:', adCreativesError || productsError);
    return NextResponse.json({ error: 'Não foi possível carregar os detalhes das campanhas.' }, { status: 500 });
  }

  const latestAdCreative = new Map<string, any>();
  for (const creative of adCreatives ?? []) {
    if (!latestAdCreative.has(creative.campaign_id)) latestAdCreative.set(creative.campaign_id, creative);
  }
  const previewPaths = [...latestAdCreative.values()].map((creative: any) => creative.storage_path).filter(Boolean);
  const previewByPath = new Map<string, string>();
  if (previewPaths.length) {
    const storage = adminMidiaStorage();
    const { data: signed, error: signedError } = await storage.storage.from('midia-assets').createSignedUrls(previewPaths, 60 * 60);
    if (!signedError) {
      for (const row of signed ?? []) if (row.path && row.signedUrl) previewByPath.set(row.path, row.signedUrl);
    } else console.error('[midia/dashboard] campaign previews:', signedError);
  }

  const [{ data: wallet, error: walletError }, { data: payoutProfile, error: payoutError }, { data: withdrawals, error: withdrawalsError }, { data: ledger, error: ledgerError }, { data: settlements, error: settlementsError }] = await Promise.all([
    admin.from('publisher_wallets').select('pending_cents,available_cents,withdrawal_pending_cents,withdrawn_cents,total_earned_cents,updated_at').eq('publisher_id', publisher.id).maybeSingle(),
    admin.from('payout_profiles').select('id,full_name,document_type,document_digits,email,pix_key,pix_key_type,verified,updated_at').eq('publisher_id', publisher.id).maybeSingle(),
    admin.from('withdrawals').select('id,amount_cents,status,error,requested_at,processed_at,completed_at').eq('publisher_id', publisher.id).order('requested_at', { ascending: false }).limit(10),
    admin.from('publisher_ledger').select('id,campaign_id,occurrence_id,withdrawal_id,entry_type,pending_delta_cents,available_delta_cents,withdrawal_delta_cents,withdrawn_delta_cents,description,created_at').eq('publisher_id', publisher.id).order('created_at', { ascending: false }).limit(30),
    campaignIds.length ? admin.from('campaign_settlements').select('campaign_id,gross_cents,provider_fee_cents,net_cents,publisher_share_bps,publisher_total_cents,bigcorps_total_cents,total_occurrences,delivered_occurrences,publisher_earned_cents,bigcorps_earned_cents,status').in('campaign_id', campaignIds) : Promise.resolve({ data: [], error: null }),
  ]);

  if (walletError || payoutError || withdrawalsError || ledgerError || settlementsError) {
    console.error('[midia/dashboard] finance:', walletError || payoutError || withdrawalsError || ledgerError || settlementsError);
    return NextResponse.json({ error: 'Não foi possível carregar o financeiro.' }, { status: 500 });
  }

  const settlementByCampaign = new Map((settlements ?? []).map((row) => [row.campaign_id, row]));

  const creativeById = new Map((creatives ?? []).map((creative) => [creative.id, creative]));
  const screenById = new Map((screens ?? []).map((screen) => [screen.id, screen]));
  const productByKey = new Map((products ?? []).map((product) => [product.product_key, product.name]));

  return NextResponse.json({
    publisher: {
      id: publisher.id,
      slug: publisher.slug,
      displayName: publisher.display_name,
      accountType: publisher.account_type,
      status: publisher.status,
      publicUrl: `https://${publisher.slug}.midia.pro`,
      createdAt: publisher.created_at,
    },
    locations: (locations ?? []).map((location) => ({
      id: location.id,
      name: location.name,
      venueType: location.venue_type,
      city: location.city,
      state: location.state,
      active: location.active,
      createdAt: location.created_at,
    })),
    screens: (screens ?? []).map((screen) => ({
      id: screen.id,
      locationId: screen.location_id,
      publicCode: screen.public_code,
      name: screen.name,
      screenType: screen.screen_type,
      orientation: screen.orientation,
      aspectRatio: screen.aspect_ratio,
      planKey: screen.plan_key,
      commercialMode: screen.commercial_mode,
      networkInventoryPercent: Number(screen.network_inventory_percent),
      billingStatus: screen.billing_status,
      billingCurrentPeriodStart: screen.billing_current_period_start,
      billingCurrentPeriodEnd: screen.billing_current_period_end,
      inventoryClass: screen.inventory_class,
      priceFactor: Number(screen.price_factor),
      status: screen.status,
      playlistVersion: Number(screen.playlist_version),
      lastSeenAt: screen.last_seen_at,
      createdAt: screen.created_at,
    })),
    devices: (devices ?? []).map((device) => ({
      id: device.id,
      screenId: device.screen_id,
      deviceName: device.device_name,
      pairedAt: device.paired_at,
      appVersion: device.app_version,
      lastSeenAt: device.last_seen_at,
      lastPlaylistVersion: device.last_playlist_version == null ? null : Number(device.last_playlist_version),
      pendingProofs: Math.max(0, Number((device.capabilities as any)?.pending_proofs ?? 0)),
      cacheItems: Math.max(0, Number((device.capabilities as any)?.cache_items ?? 0)),
    })),
    playlist: (playlist ?? []).flatMap((item) => {
      const creative = creativeById.get(item.creative_id);
      if (!creative) return [];
      return [{
        id: item.id,
        screenId: item.screen_id,
        creativeId: creative.id,
        source: item.source,
        sortOrder: Number(item.sort_order),
        displaySeconds: Number(item.display_seconds),
        kind: creative.kind,
        fileName: creative.file_name,
        mimeType: creative.mime_type,
        sizeBytes: Number(creative.size_bytes),
        durationSeconds: creative.duration_seconds == null ? null : Number(creative.duration_seconds),
        width: creative.width,
        height: creative.height,
        status: creative.status,
        createdAt: item.created_at,
      }];
    }),
    campaigns: (campaigns ?? []).map((campaign) => {
      const creative = latestAdCreative.get(campaign.id);
      return {
        id: campaign.id,
        screenId: campaign.screen_id,
        screenName: screenById.get(campaign.screen_id)?.name ?? 'Tela',
        productKey: campaign.product_key,
        productName: productByKey.get(campaign.product_key) ?? campaign.product_key,
        buyerName: campaign.buyer_name,
        durationSeconds: Number(campaign.duration_seconds),
        totalPriceCents: Number(campaign.total_price_cents),
        estimatedOccurrences: Number(campaign.estimated_occurrences),
        status: campaign.status,
        scheduleDate: campaign.schedule_date,
        scheduleTime: campaign.schedule_time,
        startDate: campaign.start_date,
        endDate: campaign.end_date,
        paidAt: campaign.paid_at,
        reviewedAt: campaign.reviewed_at,
        approvedAt: campaign.approved_at,
        rejectionReason: campaign.rejection_reason,
        createdAt: campaign.created_at,
        settlement: settlementByCampaign.get(campaign.id) ? (() => {
          const settlement = settlementByCampaign.get(campaign.id)!;
          return {
            grossCents: Number(settlement.gross_cents),
            providerFeeCents: Number(settlement.provider_fee_cents),
            netCents: Number(settlement.net_cents),
            publisherShareBps: Number(settlement.publisher_share_bps),
            publisherTotalCents: Number(settlement.publisher_total_cents),
            publisherEarnedCents: Number(settlement.publisher_earned_cents),
            bigcorpsTotalCents: Number(settlement.bigcorps_total_cents),
            totalOccurrences: Number(settlement.total_occurrences),
            deliveredOccurrences: Number(settlement.delivered_occurrences),
            status: settlement.status,
          };
        })() : null,
        creative: creative ? {
          id: creative.id,
          kind: creative.kind,
          fileName: creative.file_name,
          mimeType: creative.mime_type,
          sizeBytes: Number(creative.size_bytes),
          durationSeconds: creative.duration_seconds == null ? null : Number(creative.duration_seconds),
          width: creative.width,
          height: creative.height,
          previewUrl: previewByPath.get(creative.storage_path) ?? null,
        } : null,
      };
    }),
    finance: {
      wallet: {
        pendingCents: Number(wallet?.pending_cents ?? 0),
        availableCents: Number(wallet?.available_cents ?? 0),
        withdrawalPendingCents: Number(wallet?.withdrawal_pending_cents ?? 0),
        withdrawnCents: Number(wallet?.withdrawn_cents ?? 0),
        totalEarnedCents: Number(wallet?.total_earned_cents ?? 0),
      },
      payoutProfile: payoutProfile ? {
        id: payoutProfile.id,
        fullName: payoutProfile.full_name,
        documentType: payoutProfile.document_type,
        documentFinal: String(payoutProfile.document_digits || '').slice(-4),
        email: payoutProfile.email,
        pixKey: payoutProfile.pix_key,
        pixKeyType: payoutProfile.pix_key_type,
        verified: Boolean(payoutProfile.verified),
      } : null,
      withdrawals: (withdrawals ?? []).map((row) => ({
        id: row.id, amountCents: Number(row.amount_cents), status: row.status, error: row.error,
        requestedAt: row.requested_at, processedAt: row.processed_at, completedAt: row.completed_at,
      })),
      ledger: (ledger ?? []).map((row) => ({
        id: row.id, campaignId: row.campaign_id, occurrenceId: row.occurrence_id, withdrawalId: row.withdrawal_id,
        entryType: row.entry_type, pendingDeltaCents: Number(row.pending_delta_cents), availableDeltaCents: Number(row.available_delta_cents),
        withdrawalDeltaCents: Number(row.withdrawal_delta_cents), withdrawnDeltaCents: Number(row.withdrawn_delta_cents),
        description: row.description, createdAt: row.created_at,
      })),
      withdrawalMinimumCents: MIDIA_WITHDRAWAL_MIN_CENTS,
    },
    plans: plans ?? [],
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}
