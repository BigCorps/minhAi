import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { getPlatformAdminAccess } from '@/lib/platform-admin';
import { platformAdminAccessError, platformAdminJson } from '@/lib/platform-admin-http';
import { auditMidiaAdmin } from '@/lib/midia/admin';
import { adminMidia, adminMidiaStorage } from '@/lib/midia/server';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 50 * 1024 * 1024;
const MIME_KIND: Record<string, 'image' | 'video'> = {
  'image/jpeg': 'image', 'image/png': 'image', 'image/webp': 'image',
  'video/mp4': 'video', 'video/webm': 'video',
};
const EXT_BY_MIME: Record<string,string> = {
  'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp',
  'video/mp4': '.mp4', 'video/webm': '.webm',
};
const CLASSES = new Set(['standard','movement','premium','led']);
const VENUES = new Set(['store','restaurant','gym','clinic','office','residential_elevator','commercial_elevator','vehicle','outdoor','other']);

function optionalIsoDate(value: unknown): string | null | 'invalid' {
  if (value == null || String(value).trim() === '') return null;
  const date = new Date(String(value));
  if (!Number.isFinite(date.getTime())) return 'invalid';
  return date.toISOString();
}

export async function POST(request: Request) {
  const access = await getPlatformAdminAccess();
  if (!access.ok) return platformAdminAccessError(access.reason);

  const body = await request.json().catch(() => null) as any;
  const name = String(body?.name || '').trim().replace(/\s+/g,' ').slice(0,140);
  const advertiserLabel = String(body?.advertiserLabel || 'Midia.Pro').trim().replace(/\s+/g,' ').slice(0,100);
  const fileName = String(body?.fileName || '').trim().replace(/[\r\n]/g,'').slice(0,180);
  const providedMime = String(body?.mimeType || '').toLowerCase();
  const extension = extname(fileName).toLowerCase();
  const mimeType = providedMime || ({ '.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.mp4':'video/mp4','.webm':'video/webm' } as Record<string,string>)[extension] || '';
  const kind = MIME_KIND[mimeType];
  const sizeBytes = Math.floor(Number(body?.sizeBytes || 0));
  const width = Math.floor(Number(body?.width || 0));
  const height = Math.floor(Number(body?.height || 0));
  const durationSeconds = body?.durationSeconds == null ? null : Number(body.durationSeconds);
  const displaySeconds = Math.floor(Number(body?.displaySeconds || 30));
  const priority = Math.floor(Number(body?.priority || 100));
  const startsAt = optionalIsoDate(body?.startsAt);
  const endsAt = optionalIsoDate(body?.endsAt);
  const targetInventoryClasses = Array.isArray(body?.targetInventoryClasses)
    ? body.targetInventoryClasses.map(String).filter((value: string) => CLASSES.has(value))
    : ['standard','movement','premium','led'];
  const targetVenueTypes = Array.isArray(body?.targetVenueTypes)
    ? body.targetVenueTypes.map(String).filter((value: string) => VENUES.has(value))
    : [];
  const destinationUrl = String(body?.destinationUrl || '').trim().slice(0, 1000) || null;

  if (name.length < 2 || advertiserLabel.length < 2 || !fileName || !kind) return platformAdminJson({ ok:false, error:'Dados da campanha institucional inválidos.' }, 400);
  if (startsAt === 'invalid' || endsAt === 'invalid') return platformAdminJson({ ok:false, error:'Data de veiculação inválida.' }, 400);
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_BYTES) return platformAdminJson({ ok:false, error:'O arquivo deve ter no máximo 50 MB.' }, 400);
  if (width <= 0 || height <= width) return platformAdminJson({ ok:false, error:'Use uma peça vertical.' }, 400);
  if (![30,45,60].includes(displaySeconds)) return platformAdminJson({ ok:false, error:'Use 30, 45 ou 60 segundos.' }, 400);
  if (kind === 'video' && (!Number.isFinite(durationSeconds) || durationSeconds < 29.5 || durationSeconds > 60.5)) return platformAdminJson({ ok:false, error:'O vídeo precisa ter entre 30 e 60 segundos.' }, 400);
  if (!Number.isSafeInteger(priority) || priority < 1 || priority > 10000) return platformAdminJson({ ok:false, error:'Prioridade inválida.' }, 400);
  if (!targetInventoryClasses.length) return platformAdminJson({ ok:false, error:'Selecione ao menos uma classe de tela.' }, 400);
  if (destinationUrl && !/^https?:\/\//i.test(destinationUrl)) return platformAdminJson({ ok:false, error:'O link do QR precisa começar com http:// ou https://.' }, 400);
  if (startsAt && endsAt && endsAt <= startsAt) return platformAdminJson({ ok:false, error:'Período de veiculação inválido.' }, 400);

  const id = randomUUID();
  const storagePath = `house/${id}/original${EXT_BY_MIME[mimeType]}`;
  const admin = adminMidia();
  const { error: insertError } = await admin.from('house_creatives').insert({
    id, name, advertiser_label: advertiserLabel, kind, file_name: fileName,
    mime_type: mimeType, storage_path: storagePath, size_bytes: sizeBytes,
    duration_seconds: kind === 'video' ? durationSeconds : null,
    width, height, display_seconds: displaySeconds, priority,
    status: 'uploading', starts_at: startsAt, ends_at: endsAt,
    destination_url: destinationUrl,
    target_inventory_classes: targetInventoryClasses,
    target_venue_types: targetVenueTypes.length ? targetVenueTypes : null,
    created_by_user_id: access.user.id,
  });
  if (insertError) {
    console.error('[admin/midia/house/upload-url]', insertError);
    return platformAdminJson({ ok:false, error:'Não foi possível preparar o filler.' }, 500);
  }

  const storage = adminMidiaStorage();
  const { data: signed, error: signedError } = await storage.storage.from('midia-assets').createSignedUploadUrl(storagePath);
  if (signedError || !signed?.token) {
    await admin.from('house_creatives').update({ status:'failed' }).eq('id',id);
    return platformAdminJson({ ok:false, error:'Não foi possível preparar o upload.' }, 500);
  }

  await auditMidiaAdmin({ adminUserId: access.user.id, action:'house_upload_prepared', entityType:'house_creative', entityId:id, after:{ name, advertiserLabel, displaySeconds, priority, destinationUrl } });
  return platformAdminJson({ ok:true, id, bucket:'midia-assets', path:storagePath, token:signed.token });
}
