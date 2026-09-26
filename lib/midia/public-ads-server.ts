import { adminMidia, getPublicMidiaScreen } from './server';
import { isMidiaAdDuration } from './ads';

export type PublicQuoteInput = {
  slug?: string;
  code?: string;
  productKey?: string;
  durationSeconds?: number;
  scheduleDate?: string | null;
  scheduleTime?: string | null;
  startDate?: string | null;
};

function dateOrNull(value: unknown) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '__invalid__';
}

function timeOrNull(value: unknown) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(text) ? `${text}:00` : '__invalid__';
}

export function quoteErrorMessage(message: string) {
  if (message.includes('screen_unavailable')) return { status: 404, error: 'Esta tela não está disponível para anúncios.' };
  if (message.includes('invalid_product')) return { status: 400, error: 'Plano de publicidade inválido.' };
  if (message.includes('invalid_duration')) return { status: 400, error: 'Escolha 30, 45 ou 60 segundos.' };
  if (message.includes('date_required')) return { status: 400, error: 'Escolha a data da campanha.' };
  if (message.includes('time_required')) return { status: 400, error: 'Escolha o horário da campanha.' };
  if (message.includes('date_out_of_range')) return { status: 400, error: 'A data escolhida está fora da janela disponível para reserva.' };
  if (message.includes('time_too_soon')) return { status: 409, error: 'Escolha um horário com um pouco mais de antecedência.' };
  if (message.includes('inventory_unavailable')) return { status: 409, error: 'Esta tela não tem inventário suficiente para essa combinação. Escolha outra frequência, duração ou data.' };
  if (message.includes('content_terms_required')) return { status: 400, error: 'Confirme a declaração sobre o conteúdo do anúncio.' };
  if (message.includes('invalid_buyer_name')) return { status: 400, error: 'Informe o nome do anunciante.' };
  if (message.includes('invalid_buyer_email')) return { status: 400, error: 'Informe um e-mail válido.' };
  return { status: 500, error: 'Não foi possível calcular esta campanha agora.' };
}

export async function calculatePublicMidiaQuote(input: PublicQuoteInput) {
  const slug = String(input.slug ?? '').trim().toLowerCase();
  const code = String(input.code ?? '').trim().toUpperCase();
  const productKey = String(input.productKey ?? '').trim();
  const durationSeconds = Number(input.durationSeconds ?? 0);
  const scheduleDate = dateOrNull(input.scheduleDate);
  const scheduleTime = timeOrNull(input.scheduleTime);
  const startDate = dateOrNull(input.startDate);

  if (!slug || !code) throw new Error('screen_unavailable');
  if (!productKey) throw new Error('invalid_product');
  if (!isMidiaAdDuration(durationSeconds)) throw new Error('invalid_duration');
  if (scheduleDate === '__invalid__' || startDate === '__invalid__') throw new Error('date_required');
  if (scheduleTime === '__invalid__') throw new Error('time_required');

  const context = await getPublicMidiaScreen(slug, code);
  if (!context) throw new Error('screen_unavailable');

  const admin = adminMidia();
  const { data, error } = await admin.rpc('calculate_campaign_quote', {
    p_screen_id: context.screen.id,
    p_product_key: productKey,
    p_duration_seconds: durationSeconds,
    p_schedule_date: scheduleDate,
    p_schedule_time: scheduleTime,
    p_start_date: startDate,
  });

  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('inventory_unavailable');

  return {
    context,
    input: { slug, code, productKey, durationSeconds, scheduleDate, scheduleTime, startDate },
    quote: {
      productName: row.product_name as string,
      basePriceCents: Number(row.base_price_cents),
      durationMultiplier: Number(row.duration_multiplier),
      screenFactor: Number(row.screen_factor),
      totalPriceCents: Number(row.total_price_cents),
      reservedFrom: row.reserved_from as string,
      reservedUntil: row.reserved_until as string,
      estimatedOccurrences: Number(row.estimated_occurrences),
      requestedSecondsPerDay: Number(row.requested_seconds_per_day),
      capacitySecondsPerDay: Number(row.capacity_seconds_per_day),
      currentlyReservedSecondsPerDay: Number(row.currently_reserved_seconds_per_day),
    },
  };
}
