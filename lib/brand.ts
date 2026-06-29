export type BrandKey = 'minhai' | 'artefinal' | 'pix' | 'minia';

export function getBrandByHost(hostname: string): BrandKey {
  const cleanHost = hostname.split(':')[0].toLowerCase();

  if (cleanHost === 'ia.artefinal.app') {
    return 'artefinal';
  }

  if (cleanHost === 'pix.wiki' || cleanHost === 'www.pix.wiki') {
    return 'pix';
  }

  if (
    cleanHost === 'app.min.ia.br' ||
    cleanHost === 'min.ia.br' ||
    cleanHost === 'www.min.ia.br'
  ) {
    return 'minia';
  }

  return 'minhai';
}

interface BrandInfo {
  name: string;
  logo: string;
  title: string;
  description: string;
}

export const BRANDS: Record<BrandKey, BrandInfo> = {
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
    description: 'Seu arte-finalista com IA.',
  },

  pix: {
    name: 'pix.wiki',
    logo: '/brands/pix/pixwiki.png',
    title: 'Pix.Wiki',
    description: 'Link e QR Code Pix com confirmação automática.',
  },

  minia: {
    name: 'min.IA',
    logo: '/brands/minia/logo.png',
    title: 'min.ia.br',
    description: 'A versão mini e pessoal da minhAi!',
  },
};
