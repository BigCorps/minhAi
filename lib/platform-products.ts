export const PLATFORM_APP_KEYS = [
  'minhai',
  'minia',
  'artefinal',
  'pixwiki',
  'consultatec',
  'conviteia',
  'melhoria',
  'funcionaria',
] as const;

export type PlatformAppKey = (typeof PLATFORM_APP_KEYS)[number];

export type PlatformActivityKind = 'pageview' | 'heartbeat' | 'login';

export const PLATFORM_APPS: Record<
  PlatformAppKey,
  { label: string; shortLabel: string }
> = {
  minhai: { label: 'minhAi', shortLabel: 'minhAi' },
  minia: { label: 'min.IA', shortLabel: 'min.IA' },
  artefinal: { label: 'ArteFinal.app', shortLabel: 'ArteFinal' },
  pixwiki: { label: 'Pix.Wiki', shortLabel: 'PixWiki' },
  consultatec: { label: 'ConsultaTec', shortLabel: 'ConsultaTec' },
  conviteia: { label: 'Convite IA', shortLabel: 'ConviteIA' },
  melhoria: { label: 'MelhorIA', shortLabel: 'MelhorIA' },
  funcionaria: { label: 'FuncionarIA', shortLabel: 'FuncionarIA' },
};

export function normalizePlatformHostname(hostname: string): string {
  return hostname.split(':')[0].trim().toLowerCase();
}

export function sanitizePlatformPath(pathname: string | null | undefined): string {
  if (!pathname) return '/';

  let value = pathname.trim();

  // Nunca persistimos query string nem hash. Eles podem carregar documentos,
  // tokens, parâmetros de pagamento ou outras informações que não pertencem
  // à telemetria operacional.
  if (/^https?:\/\//i.test(value)) {
    try {
      value = new URL(value).pathname;
    } catch {
      value = '/';
    }
  }

  value = value.split('?')[0].split('#')[0] || '/';
  if (!value.startsWith('/')) value = `/${value}`;

  return value.slice(0, 512);
}

export function resolvePlatformApp(
  hostname: string,
  pathname: string | null | undefined,
): PlatformAppKey | null {
  const host = normalizePlatformHostname(hostname);
  const path = sanitizePlatformPath(pathname);

  // O painel administrativo é infraestrutura da plataforma, não um produto
  // utilizado por clientes e, portanto, não entra nas métricas de apps.
  if (host === 'admin.minhai.app' || path === '/admin' || path.startsWith('/admin/')) {
    return null;
  }

  // Hosts dedicados têm precedência. Isso permite URLs limpas como
  // funcionaria.net/dashboard e pix.wiki/dashboard sem depender do rewrite
  // interno usado pelo Next.js.
  if (
    host === 'funcionaria.net' ||
    host === 'www.funcionaria.net' ||
    host.endsWith('.funcionaria.net')
  ) {
    return 'funcionaria';
  }

  if (
    host === 'conviteia.com' ||
    host === 'www.conviteia.com' ||
    host.endsWith('.conviteia.com')
  ) {
    return 'conviteia';
  }

  if (host === 'ia.artefinal.app') {
    return 'artefinal';
  }

  if (
    host === 'pix.wiki' ||
    host === 'www.pix.wiki' ||
    host.endsWith('.pix.wiki')
  ) {
    return 'pixwiki';
  }

  if (host === 'consulta.tec.br' || host === 'www.consulta.tec.br') {
    return 'consultatec';
  }

  if (
    host === 'app.min.ia.br' ||
    host === 'min.ia.br' ||
    host === 'www.min.ia.br'
  ) {
    return 'minia';
  }

  if (host === 'melhoria.org' || host === 'www.melhoria.org') {
    return 'melhoria';
  }

  // Infra que usa o domínio minhAi mas não representa uso da aplicação.
  if (host === 'mcp.minhai.app') {
    return null;
  }

  // Rotas internas/preview/local. São importantes porque os mesmos apps
  // podem ser testados em localhost e em previews da Vercel.
  if (path === '/funcionaria' || path.startsWith('/funcionaria/')) {
    return 'funcionaria';
  }

  if (path === '/convite' || path.startsWith('/convite/')) {
    return 'conviteia';
  }

  if (path === '/arte' || path.startsWith('/arte/')) {
    return 'artefinal';
  }

  if (path === '/pix' || path.startsWith('/pix/')) {
    return 'pixwiki';
  }

  if (path === '/consultatec' || path.startsWith('/consultatec/')) {
    return 'consultatec';
  }

  if (path === '/min' || path.startsWith('/min/')) {
    return 'minia';
  }

  if (path === '/melhoria' || path.startsWith('/melhoria/')) {
    return 'melhoria';
  }

  return 'minhai';
}

export function isPlatformAuthPath(pathname: string | null | undefined): boolean {
  const path = sanitizePlatformPath(pathname);

  return (
    path === '/login' ||
    path === '/entrar' ||
    path === '/cadastro' ||
    path.endsWith('/login') ||
    path.endsWith('/entrar') ||
    path.endsWith('/cadastro')
  );
}
