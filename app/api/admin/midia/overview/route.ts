import { getPlatformAdminAccess } from '@/lib/platform-admin';
import { platformAdminAccessError, platformAdminJson, platformAdminUnavailable } from '@/lib/platform-admin-http';
import { adminMidia, adminMidiaStorage } from '@/lib/midia/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const access = await getPlatformAdminAccess();
  if (!access.ok) return platformAdminAccessError(access.reason);

  const admin = adminMidia();
  const now = new Date();
  const onlineSince = new Date(now.getTime() - 2 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    publishersResult,
    screensResult,
    devicesResult,
    campaignsResult,
    paymentsResult,
    planPaymentsResult,
    walletsResult,
    withdrawalsResult,
    profilesResult,
    settlementsResult,
    missedResult,
    settingsResult,
    locationsResult,
    houseResult,
  ] = await Promise.all([
    admin.from('publishers').select('id,slug,display_name,status,created_at').order('created_at', { ascending: false }).limit(500),
    admin.from('screens').select('id,publisher_id,location_id,public_code,name,screen_type,commercial_mode,network_inventory_percent,billing_status,inventory_class,price_factor,status,last_seen_at,playlist_version,created_at').order('created_at', { ascending: false }).limit(1000),
    admin.from('devices').select('id,screen_id,last_seen_at,capabilities,app_version,paired_at,revoked_at').is('revoked_at', null).limit(1500),
    admin.from('campaigns').select('id,publisher_id,screen_id,product_key,buyer_name,buyer_email,duration_seconds,total_price_cents,estimated_occurrences,status,origin_kind,paid_at,created_at,rejection_reason').order('created_at', { ascending: false }).limit(300),
    admin.from('campaign_payments').select('campaign_id,amount_cents,provider_fee_cents,status,confirmed_at,created_at').eq('status', 'confirmed').gte('confirmed_at', thirtyDaysAgo).limit(2000),
    admin.from('screen_plan_payments').select('screen_id,amount_cents,status,confirmed_at').eq('status', 'confirmed').gte('confirmed_at', thirtyDaysAgo).limit(2000),
    admin.from('publisher_wallets').select('publisher_id,pending_cents,available_cents,withdrawal_pending_cents,withdrawn_cents,total_earned_cents'),
    admin.from('withdrawals').select('id,publisher_id,payout_profile_id,amount_cents,status,error,requested_at,processed_at,completed_at').in('status', ['pending','processing']).order('requested_at').limit(100),
    admin.from('payout_profiles').select('id,publisher_id,full_name,document_type,document_digits,email,pix_key,pix_key_type,verified'),
    admin.from('campaign_settlements').select('campaign_id,publisher_id,gross_cents,net_cents,publisher_total_cents,publisher_earned_cents,bigcorps_total_cents,bigcorps_earned_cents,total_occurrences,delivered_occurrences,status').limit(1000),
    admin.from('campaign_occurrences').select('id,campaign_id,screen_id,status,recovery_attempt,missed_at,window_end_at').eq('status', 'missed').order('missed_at', { ascending: false }).limit(500),
    admin.from('screen_ad_settings').select('screen_id,accepting_ads,active_start_time,active_end_time,active_minutes_per_day,min_notice_minutes,booking_horizon_days').limit(1000),
    admin.from('locations').select('id,publisher_id,name,venue_type,city,state,timezone,active').limit(1000),
    admin.from('house_creatives').select('id,name,advertiser_label,kind,file_name,mime_type,storage_path,size_bytes,duration_seconds,width,height,display_seconds,priority,status,starts_at,ends_at,target_inventory_classes,target_venue_types,created_at,updated_at').neq('status','deleted').order('priority', { ascending: false }).order('created_at', { ascending: false }).limit(100),
  ]);

  const firstError = [publishersResult, screensResult, devicesResult, campaignsResult, paymentsResult, planPaymentsResult, walletsResult, withdrawalsResult, profilesResult, settlementsResult, missedResult, settingsResult, locationsResult, houseResult].find((result) => result.error)?.error;
  if (firstError) {
    console.error('[admin/midia/overview]', firstError);
    return platformAdminUnavailable('midia_admin_unavailable');
  }

  const publishers = publishersResult.data ?? [];
  const screens = screensResult.data ?? [];
  const devices = devicesResult.data ?? [];
  const campaigns = campaignsResult.data ?? [];
  const payments = paymentsResult.data ?? [];
  const planPayments = planPaymentsResult.data ?? [];
  const wallets = walletsResult.data ?? [];
  const withdrawals = withdrawalsResult.data ?? [];
  const profiles = profilesResult.data ?? [];
  const settlements = settlementsResult.data ?? [];
  const missed = missedResult.data ?? [];
  const settings = settingsResult.data ?? [];
  const locations = locationsResult.data ?? [];
  const house = houseResult.data ?? [];

  const publisherById = new Map(publishers.map((row: any) => [row.id, row]));
  const screenById = new Map(screens.map((row: any) => [row.id, row]));
  const locationById = new Map(locations.map((row: any) => [row.id, row]));
  const settingByScreen = new Map(settings.map((row: any) => [row.screen_id, row]));
  const profileById = new Map(profiles.map((row: any) => [row.id, row]));
  const deviceByScreen = new Map<string, any>();
  for (const device of devices as any[]) {
    const current = deviceByScreen.get(device.screen_id);
    if (!current || String(device.last_seen_at || '') > String(current.last_seen_at || '')) deviceByScreen.set(device.screen_id, device);
  }

  const reviewCampaigns = campaigns.filter((row: any) => row.status === 'under_review').slice(0, 40);
  const reviewIds = reviewCampaigns.map((row: any) => row.id);
  const productKeys = [...new Set(reviewCampaigns.map((row: any) => row.product_key))];
  const [creativeResult, productResult] = await Promise.all([
    reviewIds.length
      ? admin.from('ad_creatives').select('id,campaign_id,kind,file_name,mime_type,storage_path,size_bytes,duration_seconds,width,height,status,created_at').in('campaign_id', reviewIds).eq('status','ready').order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    productKeys.length
      ? admin.from('ad_product_catalog').select('product_key,name').in('product_key', productKeys)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (creativeResult.error || productResult.error) {
    console.error('[admin/midia/overview] campaign details', creativeResult.error || productResult.error);
    return platformAdminUnavailable('midia_campaign_details_unavailable');
  }

  const latestCreative = new Map<string, any>();
  for (const row of creativeResult.data ?? []) if (!latestCreative.has(row.campaign_id)) latestCreative.set(row.campaign_id, row);
  const productByKey = new Map((productResult.data ?? []).map((row: any) => [row.product_key, row.name]));

  const previewPaths = [
    ...[...latestCreative.values()].map((row: any) => row.storage_path),
    ...house.map((row: any) => row.storage_path),
  ].filter(Boolean);
  const previewByPath = new Map<string,string>();
  if (previewPaths.length) {
    const storage = adminMidiaStorage();
    const { data: signed, error: signedError } = await storage.storage.from('midia-assets').createSignedUrls([...new Set(previewPaths)], 60 * 60);
    if (!signedError) for (const row of signed ?? []) if (row.path && row.signedUrl) previewByPath.set(row.path, row.signedUrl);
  }

  const sum = (rows: any[], key: string) => rows.reduce((total, row) => total + Number(row?.[key] ?? 0), 0);
  const onlineScreens = screens.filter((screen: any) => {
    const device = deviceByScreen.get(screen.id);
    return Boolean(device?.last_seen_at && device.last_seen_at >= onlineSince);
  }).length;

  const campaignRevenue30d = sum(payments as any[], 'amount_cents');
  const screenPlanRevenue30d = sum(planPayments as any[], 'amount_cents');
  const revenue30d = campaignRevenue30d + screenPlanRevenue30d;
  const providerFees30d = sum(payments as any[], 'provider_fee_cents');
  const openWithdrawalCents = sum(withdrawals as any[], 'amount_cents');

  return platformAdminJson({
    ok: true,
    data: {
      generatedAt: new Date().toISOString(),
      summary: {
        publishers: publishers.filter((row: any) => row.status === 'active').length,
        screens: screens.filter((row: any) => row.status !== 'archived').length,
        activeScreens: screens.filter((row: any) => row.status === 'active').length,
        onlineScreens,
        offlineScreens: Math.max(0, screens.filter((row: any) => row.status === 'active').length - onlineScreens),
        campaignsUnderReview: campaigns.filter((row: any) => row.status === 'under_review').length,
        campaignsRunning: campaigns.filter((row: any) => row.status === 'running').length,
        revenue30dCents: revenue30d,
        campaignRevenue30dCents: campaignRevenue30d,
        screenPlanRevenue30dCents: screenPlanRevenue30d,
        paidScreens: screens.filter((row: any) => row.billing_status === 'active').length,
        providerFees30dCents: providerFees30d,
        partnerPendingCents: sum(wallets as any[], 'pending_cents'),
        partnerAvailableCents: sum(wallets as any[], 'available_cents'),
        withdrawalPendingCents: openWithdrawalCents,
        missedOccurrences: missed.length,
        houseActive: house.filter((row: any) => row.status === 'ready').length,
      },
      campaigns: reviewCampaigns.map((campaign: any) => {
        const creative = latestCreative.get(campaign.id);
        const screen = screenById.get(campaign.screen_id);
        const publisher = publisherById.get(campaign.publisher_id);
        return {
          id: campaign.id,
          buyerName: campaign.buyer_name,
          buyerEmail: campaign.buyer_email,
          productKey: campaign.product_key,
          productName: productByKey.get(campaign.product_key) ?? campaign.product_key,
          durationSeconds: Number(campaign.duration_seconds),
          totalPriceCents: Number(campaign.total_price_cents),
          estimatedOccurrences: Number(campaign.estimated_occurrences),
          originKind: campaign.origin_kind,
          paidAt: campaign.paid_at,
          createdAt: campaign.created_at,
          screenName: screen?.name ?? 'Tela',
          publisherName: publisher?.display_name ?? 'Parceiro',
          publisherSlug: publisher?.slug ?? null,
          creative: creative ? {
            kind: creative.kind,
            fileName: creative.file_name,
            previewUrl: previewByPath.get(creative.storage_path) ?? null,
            width: creative.width,
            height: creative.height,
          } : null,
        };
      }),
      withdrawals: withdrawals.map((withdrawal: any) => {
        const publisher = publisherById.get(withdrawal.publisher_id);
        const profile = profileById.get(withdrawal.payout_profile_id);
        return {
          id: withdrawal.id,
          amountCents: Number(withdrawal.amount_cents),
          status: withdrawal.status,
          error: withdrawal.error,
          requestedAt: withdrawal.requested_at,
          processedAt: withdrawal.processed_at,
          publisherName: publisher?.display_name ?? 'Parceiro',
          publisherSlug: publisher?.slug ?? null,
          payout: profile ? {
            fullName: profile.full_name,
            documentType: profile.document_type,
            documentFinal: String(profile.document_digits || '').slice(-4),
            email: profile.email,
            pixKey: profile.pix_key,
            pixKeyType: profile.pix_key_type,
            verified: Boolean(profile.verified),
          } : null,
        };
      }),
      screens: screens.slice(0, 200).map((screen: any) => {
        const publisher = publisherById.get(screen.publisher_id);
        const location = locationById.get(screen.location_id);
        const device = deviceByScreen.get(screen.id);
        const ad = settingByScreen.get(screen.id);
        return {
          id: screen.id,
          name: screen.name,
          publicCode: screen.public_code,
          publisherName: publisher?.display_name ?? 'Parceiro',
          publisherSlug: publisher?.slug ?? null,
          locationName: location?.name ?? null,
          venueType: location?.venue_type ?? null,
          city: location?.city ?? null,
          state: location?.state ?? null,
          screenType: screen.screen_type,
          commercialMode: screen.commercial_mode,
          networkInventoryPercent: Number(screen.network_inventory_percent),
          billingStatus: screen.billing_status,
          inventoryClass: screen.inventory_class,
          priceFactor: Number(screen.price_factor),
          status: screen.status,
          playlistVersion: Number(screen.playlist_version),
          lastSeenAt: device?.last_seen_at ?? screen.last_seen_at,
          online: Boolean(device?.last_seen_at && device.last_seen_at >= onlineSince),
          pendingProofs: Number(device?.capabilities?.pending_proofs ?? 0),
          appVersion: device?.app_version ?? null,
          acceptingAds: Boolean(ad?.accepting_ads),
          activeStartTime: ad?.active_start_time ?? '08:00:00',
          activeEndTime: ad?.active_end_time ?? '20:00:00',
        };
      }),
      house: house.map((row: any) => ({
        id: row.id,
        name: row.name,
        advertiserLabel: row.advertiser_label,
        kind: row.kind,
        fileName: row.file_name,
        displaySeconds: Number(row.display_seconds),
        priority: Number(row.priority),
        status: row.status,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        targetInventoryClasses: row.target_inventory_classes ?? [],
        targetVenueTypes: row.target_venue_types ?? [],
        previewUrl: previewByPath.get(row.storage_path) ?? null,
        createdAt: row.created_at,
      })),
      settlement: {
        grossCents: sum(settlements as any[], 'gross_cents'),
        publisherContractedCents: sum(settlements as any[], 'publisher_total_cents'),
        publisherEarnedCents: sum(settlements as any[], 'publisher_earned_cents'),
        bigcorpsContractedCents: sum(settlements as any[], 'bigcorps_total_cents'),
        bigcorpsEarnedCents: sum(settlements as any[], 'bigcorps_earned_cents'),
        deliveredOccurrences: sum(settlements as any[], 'delivered_occurrences'),
        contractedOccurrences: sum(settlements as any[], 'total_occurrences'),
      },
    },
  });
}
