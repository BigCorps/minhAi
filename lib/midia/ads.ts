export const MIDIA_AD_DURATIONS = [30, 45, 60] as const;
export type MidiaAdDuration = (typeof MIDIA_AD_DURATIONS)[number];

export function isMidiaAdDuration(value: number): value is MidiaAdDuration {
  return MIDIA_AD_DURATIONS.includes(value as MidiaAdDuration);
}

/** Vídeo livre de 30–60 s entra na faixa comercial imediatamente superior. */
export function billingDurationForVideo(actualSeconds: number): MidiaAdDuration {
  if (actualSeconds <= 30.5) return 30;
  if (actualSeconds <= 45.5) return 45;
  return 60;
}

export function durationMultiplier(duration: MidiaAdDuration) {
  return duration === 30 ? 1 : duration === 45 ? 1.5 : 2;
}

export function normalizeAdMime(file: File) {
  if (['image/jpeg','image/png','image/webp','video/mp4','video/webm'].includes(file.type)) return file.type;
  const ext = file.name.toLowerCase().split('.').pop();
  return ({ jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png', webp:'image/webp', mp4:'video/mp4', webm:'video/webm' } as Record<string,string>)[ext || ''] || '';
}

export async function inspectAdMedia(file: File, mimeType: string): Promise<{
  kind: 'image' | 'video'; width: number; height: number; duration: number;
}> {
  if (mimeType.startsWith('image/')) {
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
        image.src = url;
      });
      return { kind: 'image', width: image.naturalWidth, height: image.naturalHeight, duration: 0 };
    } finally { URL.revokeObjectURL(url); }
  }

  if (mimeType.startsWith('video/')) {
    const url = URL.createObjectURL(file);
    try {
      const video = document.createElement('video');
      video.preload = 'metadata';
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error('Não foi possível ler o vídeo.'));
        video.src = url;
      });
      return { kind: 'video', width: video.videoWidth, height: video.videoHeight, duration: video.duration };
    } finally { URL.revokeObjectURL(url); }
  }

  throw new Error('Formato não suportado.');
}

export function formatMidiaAdSchedule(input: {
  productKey: string;
  scheduleDate?: string | null;
  scheduleTime?: string | null;
  startDate?: string | null;
}) {
  const date = input.scheduleDate || input.startDate;
  const dateLabel = date
    ? new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR')
    : null;
  const timeLabel = input.scheduleTime ? input.scheduleTime.slice(0, 5) : null;

  if (input.productKey === 'experiment') return '1 exibição em até 30 dias';
  if (input.productKey === 'day_once') return dateLabel ? `1 exibição em ${dateLabel}` : 'Dia escolhido';
  if (['hour_once','moment_once'].includes(input.productKey)) {
    return [dateLabel, timeLabel].filter(Boolean).join(' · ');
  }
  return [dateLabel ? `A partir de ${dateLabel}` : '30 dias', timeLabel].filter(Boolean).join(' · ');
}
