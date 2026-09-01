export type PreparedImage = {
  file: File;
  previewUrl: string;
};

function loadImage(file: File): Promise<{ image: HTMLImageElement; objectUrl: string }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => resolve({ image, objectUrl });
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Imagem inválida. Use PNG, JPG ou WebP.'));
    };
    image.src = objectUrl;
  });
}

export async function prepareFuncionarIALogo(file: File): Promise<PreparedImage> {
  if (!file.type.startsWith('image/')) throw new Error('Selecione uma imagem para o logo.');
  if (file.size > 5 * 1024 * 1024) throw new Error('O logo deve ter no máximo 5 MB.');

  const { image, objectUrl } = await loadImage(file);
  try {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas indisponível neste navegador.');

    ctx.clearRect(0, 0, size, size);
    const ratio = Math.min(size / image.naturalWidth, size / image.naturalHeight);
    const drawW = image.naturalWidth * ratio;
    const drawH = image.naturalHeight * ratio;
    ctx.drawImage(image, (size - drawW) / 2, (size - drawH) / 2, drawW, drawH);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(value => value ? resolve(value) : reject(new Error('Não foi possível preparar o logo.')), 'image/png');
    });
    return {
      file: new File([blob], 'funcionaria-uniform-logo.png', { type: 'image/png' }),
      previewUrl: URL.createObjectURL(blob),
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function prepareFuncionarIABackground(file: File): Promise<PreparedImage> {
  if (!file.type.startsWith('image/')) throw new Error('Selecione uma imagem para o fundo.');
  if (file.size > 8 * 1024 * 1024) throw new Error('O fundo deve ter no máximo 8 MB.');

  const { image, objectUrl } = await loadImage(file);
  try {
    const maxWidth = 1920;
    const maxHeight = 1280;
    const ratio = Math.min(1, maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
    const width = Math.max(1, Math.round(image.naturalWidth * ratio));
    const height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas indisponível neste navegador.');
    ctx.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(value => value ? resolve(value) : reject(new Error('Não foi possível preparar o fundo.')), 'image/webp', 0.86);
    });
    return {
      file: new File([blob], 'funcionaria-background.webp', { type: 'image/webp' }),
      previewUrl: URL.createObjectURL(blob),
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function uploadFuncionarIAAsset(
  supabase: any,
  companyId: string,
  kind: 'uniform-logo' | 'background',
  file: File,
): Promise<string> {
  // Reaproveita o bucket/política existente da minhAi. A policy atual permite
  // uploads autenticados cujo primeiro diretório é `logos`.
  const extension = kind === 'uniform-logo' ? 'png' : 'webp';
  const contentType = kind === 'uniform-logo' ? 'image/png' : 'image/webp';
  const path = `logos/${companyId}/funcionaria/${kind}.${extension}`;

  const { error } = await supabase.storage
    .from('company-assets')
    .upload(path, file, {
      upsert: true,
      contentType,
      cacheControl: '3600',
    });
  if (error) throw error;

  const { data } = supabase.storage.from('company-assets').getPublicUrl(path);
  if (!data?.publicUrl) throw new Error('Não foi possível obter a URL pública do arquivo.');
  return `${data.publicUrl}?v=${Date.now()}`;
}
