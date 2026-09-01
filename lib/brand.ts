export type BrandKey =
  | 'minhai'
  | 'artefinal'
  | 'pix'
  | 'minia'
  | 'consultatec'
  | 'conviteia'
  | 'melhoria'
  | 'funcionaria';

export function getBrandByHost(hostname: string): BrandKey {
  const cleanHost = hostname.split(':')[0].toLowerCase();

  if (cleanHost === 'funcionaria.net' || cleanHost === 'www.funcionaria.net') {
    return 'funcionaria';
  }

  if (cleanHost === 'conviteia.com' || cleanHost === 'www.conviteia.com') {
    return 'conviteia';
  }

  if (cleanHost === 'ia.artefinal.app') {
    return 'artefinal';
  }

  // O PixWiki também vive em subdomínios de cobrança, ex. loja.pix.wiki.
  // Tratar o wildcard como marca Pix evita metadata/branding da minhAi nas
  // páginas públicas do Pix Link.
  if (
    cleanHost === 'pix.wiki' ||
    cleanHost === 'www.pix.wiki' ||
    cleanHost.endsWith('.pix.wiki')
  ) {
    return 'pix';
  }

  if (cleanHost === 'consulta.tec.br' || cleanHost === 'www.consulta.tec.br') {
    return 'consultatec';
  }

  if (
    cleanHost === 'app.min.ia.br' ||
    cleanHost === 'min.ia.br' ||
    cleanHost === 'www.min.ia.br'
  ) {
    return 'minia';
  }

  if (
    cleanHost === 'melhoria.org' ||
    cleanHost === 'www.melhoria.org'
  ) {
    return 'melhoria';
  }

  return 'minhai';
}

interface BrandInfo {
  name: string;
  logo: string;
  title: string;
  description: string;

  // ── Cores da marca ────────────────────────────────────────────────────────
  // Usadas por componentes COMPARTILHADOS entre as marcas — banner de
  // cookies, toasts, modais de sistema. Não substituem o CSS de cada app.
  //
  // Os três valores foram validados em contraste WCAG (mínimo 4,5:1 para
  // texto normal). Se trocar alguma, recalcule as outras duas: a cor de
  // marca crua quase nunca atende sozinha.

  /** Fundo de botão primário. */
  cor: string;
  /** Texto SOBRE `cor`. Nem toda marca comporta branco. */
  corTextoBotao: string;
  /** A cor como TEXTO sobre fundo claro (link). */
  corTexto: string;
  /** Acento secundário opcional da marca. */
  accent?: string;
}

export const BRANDS: Record<BrandKey, BrandInfo> = {
  minhai: {
    name: 'minhAi',
    logo: '/logo.png',
    title: 'minhAi',
    description: 'Uma IA pra chamar de sua!',
    cor: '#a4c61e',
    corTextoBotao: '#1a1a1a',
    corTexto: '#687e13',
  },

  conviteia: {
    name: 'Convite IA',
    logo: '/brands/convite/icone-512.png',
    title: 'Convite IA',
    description: 'Crie seu convite com IA!',
    cor: '#b45a70',
    corTextoBotao: '#ffffff',
    corTexto: '#a04a63',
  },

  artefinal: {
    name: 'ArteFinal.app',
    logo: '/brands/artefinal/logo.png',
    title: 'ArteFinal.app',
    description: 'Seu arte-finalista com IA.',
    cor: '#d1007d',
    corTextoBotao: '#ffffff',
    corTexto: '#c20074',
  },

  pix: {
    name: 'pix.wiki',
    logo: '/brands/pix/pixwiki.png',
    title: 'Pix.Wiki',
    description: 'Confirmação automática de Pix, links profissionais e notificações.',
    cor: '#22c55e',
    corTextoBotao: '#1a1a1a',
    corTexto: '#178740',
  },

  consultatec: {
    name: 'ConsultaTec',
    logo: '/brands/consultatec/logo.png',
    title: 'ConsultaTec',
    description: 'Consulta de CPF e CNPJ, sem burocracia.',
    cor: '#7a2e2e',
    corTextoBotao: '#ffffff',
    corTexto: '#7a2e2e',
  },

  melhoria: {
    name: 'MelhorIA',
    logo: '/brands/melhoria/logo.png',
    title: 'MelhorIA',
    description: 'a IA da Melhor Idade!',
    cor: '#0f766e',
    corTextoBotao: '#ffffff',
    corTexto: '#115e59',
  },

  minia: {
    name: 'min.IA',
    logo: '/brands/minia/logo.png',
    title: 'min.ia.br',
    description: 'A versão mini e pessoal da minhAi!',
    cor: '#a4c61e',
    corTextoBotao: '#1a1a1a',
    corTexto: '#687e13',
  },

  funcionaria: {
    name: 'FuncionarIA',
    logo: '/brands/funcionaria/logo.png',
    title: 'FuncionarIA',
    description: 'A funcionária IA que veste a camisa da sua empresa, no presencial e no online.',
    // Roxo principal: contraste alto com branco. O verde-limão fica como
    // acento visual, sem ser usado como texto pequeno sobre fundo claro.
    cor: '#6D28D9',
    corTextoBotao: '#ffffff',
    corTexto: '#5B21B6',
    accent: '#A3E635',
  },
};
