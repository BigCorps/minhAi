export type SupportProduct =
  | 'minhai'
  | 'conviteia'
  | 'pixwiki'
  | 'midia'
  | 'artefinal'
  | 'consultatec'
  | 'melhoria'
  | 'funcionaria'
  | 'minia'
  | 'other';

export const SUPPORT_PRODUCTS: Record<SupportProduct, { label: string; accent: string }> = {
  minhai: { label: 'minhAi', accent: '#bef264' },
  conviteia: { label: 'ConviteIA', accent: '#c06078' },
  pixwiki: { label: 'PixWiki', accent: '#22c55e' },
  midia: { label: 'Midia.Pro', accent: '#ef4444' },
  artefinal: { label: 'ArteFinal', accent: '#2563eb' },
  consultatec: { label: 'ConsultaTec', accent: '#d4af37' },
  melhoria: { label: 'MelhorIA', accent: '#16a34a' },
  funcionaria: { label: 'FuncionarIA', accent: '#84cc16' },
  minia: { label: 'min.IA', accent: '#8b5cf6' },
  other: { label: 'BigCorps', accent: '#f97316' },
};

export function resolveSupportProduct(host: string, path = '/'): SupportProduct {
  const h = String(host || '').split(':')[0].toLowerCase();
  const p = String(path || '/').toLowerCase();

  if (h.includes('conviteia.com') || p.startsWith('/convite')) return 'conviteia';
  if (h === 'pix.wiki' || h === 'www.pix.wiki' || p.startsWith('/pix')) return 'pixwiki';
  if (h.endsWith('midia.pro') || p.startsWith('/midia')) return 'midia';
  if (h.includes('artefinal.app') || p.startsWith('/arte')) return 'artefinal';
  if (h.includes('consulta.tec.br') || p.startsWith('/consultatec')) return 'consultatec';
  if (h.includes('melhoria.org') || p.startsWith('/melhoria')) return 'melhoria';
  if (h.includes('funcionaria.net') || p.startsWith('/funcionaria')) return 'funcionaria';
  if (h.includes('min.ia.br') || p.startsWith('/min')) return 'minia';
  if (h.includes('minhai.') || h.includes('minhaia.app') || h.includes('nossaia.app') || h.includes('suaia.app')) return 'minhai';
  return 'other';
}

export function supportWidgetHidden(host: string, path: string) {
  const h = String(host || '').split(':')[0].toLowerCase();
  const p = String(path || '/').toLowerCase();
  const clientSuffixes = [
    '.minhai.com.br',
    '.minhaia.app',
    '.nossaia.app',
    '.suaia.app',
    '.minhai.app',
    '.conviteia.com',
    '.funcionaria.net',
    '.midia.pro',
  ];
  const clientSubdomain = clientSuffixes.some((suffix) => {
    if (!h.endsWith(suffix)) return false;
    const apex = suffix.slice(1);
    return h !== apex && h !== `www.${apex}` && h !== 'admin.minhai.app';
  });

  return (
    clientSubdomain ||
    h === 'admin.minhai.app' ||
    h === 'ajuda.bigcorps.com.br' ||
    p.startsWith('/admin') ||
    p.startsWith('/api') ||
    p.startsWith('/ajuda') ||
    p.startsWith('/tour') ||
    p.startsWith('/kiosk')
  );
}
