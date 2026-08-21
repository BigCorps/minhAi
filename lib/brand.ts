export type BrandKey =
  | 'minhai'
  | 'artefinal'
  | 'pix'
  | 'minia'
  | 'consultatec'
  | 'conviteia'
  | 'melhoria';

export function getBrandByHost(hostname: string): BrandKey {
  const cleanHost = hostname.split(':')[0].toLowerCase();

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
  /** A cor como TEXTO sobre fundo claro (link). Precisa ser mais escura
      que `cor`: 4,5:1 sobre branco é exigência maior que a do botão. */
  corTexto: string;
}

export const BRANDS: Record<BrandKey, BrandInfo> = {
  minhai: {
    name: 'minhAi',
    logo: '/logo.png',
    title: 'minhAi',
    description: 'Uma IA pra chamar de sua!',
    // verde da marca; branco daria 1,97:1, por isso texto escuro
    cor: '#a4c61e',
    corTextoBotao: '#1a1a1a',
    corTexto: '#687e13',
  },

  conviteia: {
    name: 'Convite IA',
    logo: '/brands/convite/icone-512.png',
    title: 'Convite IA',
    description: 'Crie seu convite com IA!',
    // rosa #c06078 escurecido: no original o branco dava 4,05:1
    cor: '#b45a70',
    corTextoBotao: '#ffffff',
    corTexto: '#a04a63',
  },

  artefinal: {
    name: 'ArteFinal.app',
    logo: '/brands/artefinal/logo.png',
    title: 'ArteFinal.app',
    description: 'Seu arte-finalista com IA.',
    // magenta #ec008c escurecido: no original o branco dava 4,25:1
    cor: '#d1007d',
    corTextoBotao: '#ffffff',
    corTexto: '#c20074',
  },

  pix: {
    name: 'pix.wiki',
    logo: '/brands/pix/pixwiki.png',
    title: 'Pix.Wiki',
    description: 'Confirmação automática de Pix, links profissionais e notificações.',
    // verde do app; branco daria 2,28:1, por isso texto escuro
    cor: '#22c55e',
    corTextoBotao: '#1a1a1a',
    corTexto: '#178740',
  },

  consultatec: {
    name: 'ConsultaTec',
    logo: '/brands/consultatec/logo.png',
    title: 'ConsultaTec',
    description: 'Consulta de CPF e CNPJ, sem burocracia.',
    // bordô da paleta; já passa com folga nos dois usos
    cor: '#7a2e2e',
    corTextoBotao: '#ffffff',
    corTexto: '#7a2e2e',
  },

  melhoria: {
    name: 'MelhorIA',
    logo: '/brands/melhoria/logo.png',
    title: 'MelhorIA',
    description: 'a IA da Melhor Idade!',
    // Turquesa da marca (#2dd4bf) dá 1,84:1 com branco — inaceitável aqui.
    // O público é presbita: a régua desta marca é 7:1 (WCAG AAA), não 4,5:1.
    // #0f766e sobre branco = 5,9:1 como botão; #115e59 como texto = 7,7:1.
    cor: '#0f766e',
    corTextoBotao: '#ffffff',
    corTexto: '#115e59',
  },

  minia: {
    name: 'min.IA',
    logo: '/brands/minia/logo.png',
    title: 'min.ia.br',
    description: 'A versão mini e pessoal da minhAi!',
    // variante da minhAi: herda a mesma paleta
    cor: '#a4c61e',
    corTextoBotao: '#1a1a1a',
    corTexto: '#687e13',
  },
};
