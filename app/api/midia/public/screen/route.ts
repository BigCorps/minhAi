import { NextResponse } from 'next/server';
import { adminMidia, getPublicMidiaScreen } from '@/lib/midia/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = (url.searchParams.get('slug') || '').trim().toLowerCase();
  const code = (url.searchParams.get('code') || '').trim().toUpperCase();
  const context = await getPublicMidiaScreen(slug, code);
  if (!context) return NextResponse.json({ error: 'Tela indisponível.' }, { status: 404 });

  const admin = adminMidia();
  const { data: products, error } = await admin
    .from('ad_product_catalog')
    .select('product_key,name,description,base_price_cents,schedule_kind,campaign_days,occurrences_per_day,interval_minutes,window_minutes,requires_date,requires_time,flexible_within_days,sort_order')
    .eq('active', true)
    .order('sort_order');

  if (error) {
    console.error('[midia/public/screen] products:', error);
    return NextResponse.json({ error: 'Não foi possível carregar os planos.' }, { status: 500 });
  }

  return NextResponse.json({
    publisher: {
      slug: context.publisher.slug,
      displayName: context.publisher.display_name,
    },
    screen: {
      publicCode: context.screen.public_code,
      name: context.screen.name,
      screenType: context.screen.screen_type,
      inventoryClass: context.screen.inventory_class,
      locationName: context.location.name,
      city: context.location.city,
      state: context.location.state,
      bookingHorizonDays: Number(context.settings.booking_horizon_days),
      minNoticeMinutes: Number(context.settings.min_notice_minutes),
    },
    durations: [30, 45, 60],
    products: (products ?? []).map((product) => ({
      productKey: product.product_key,
      name: product.name,
      description: product.description,
      basePriceCents: Number(product.base_price_cents),
      startingPriceCents: Math.round(Number(product.base_price_cents) * Number(context.screen.price_factor)),
      scheduleKind: product.schedule_kind,
      campaignDays: Number(product.campaign_days),
      occurrencesPerDay: product.occurrences_per_day == null ? null : Number(product.occurrences_per_day),
      intervalMinutes: product.interval_minutes == null ? null : Number(product.interval_minutes),
      windowMinutes: product.window_minutes == null ? null : Number(product.window_minutes),
      requiresDate: Boolean(product.requires_date),
      requiresTime: Boolean(product.requires_time),
      flexibleWithinDays: product.flexible_within_days == null ? null : Number(product.flexible_within_days),
    })),
  }, { headers: { 'Cache-Control': 'no-store' } });
}
