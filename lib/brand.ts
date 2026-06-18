// lib/brand.ts

export type BrandKey = 'minhai' | 'artefinal';

export function getBrandByHost(hostname: string): BrandKey {
  const cleanHost = hostname.split(':')[0].toLowerCase();

  if (cleanHost === 'ia.artefinal.app') {
    return 'artefinal';
  }

  return 'minhai';
}

export const BRANDS = {
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
};
