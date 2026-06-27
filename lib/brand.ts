// lib/brand.ts

export type BrandKey = 'minhai' | 'artefinal' | 'pix';

export function getBrandByHost(hostname: string): BrandKey {
  const cleanHost = hostname.split(':')[0].toLowerCase();

  if (cleanHost === 'ia.artefinal.app') {
    return 'artefinal';
  }

  if (cleanHost === 'pix.wiki' || cleanHost === 'www.pix.wiki') {
    return 'pix';
  }

  return 'minhai';
}

export const BRANDS: Record<
  BrandKey,
  {
    name: string;
    logo: string;
    title: string;
    description: string;
  }
> = {
  minhai: {
    name: 'minhAi',
    logo: '/logo.png',
    title: 'minhAi',
    description: 'Uma IA pra chamar de sua!',
  },

  artefinal: {
    name: 'ArteFinal.app',
    logo: '/brands/artefinal/logo.png',
    title: 'ArteFinal.app',
    description: 'Sua arte pronta para impressão com IA.',
  },

  pix: {
    name: 'pix.wiki',
    logo: '/brands/pix/pixwiki.png',
    title: 'Pix.Wiki',
    description: 'Link e QR Code Pix com confirmação automática.',
  },
};