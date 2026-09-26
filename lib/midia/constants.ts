export const MIDIA_BRAND = {
  blue: '#003295',
  blueDark: '#00246D',
  red: '#EA0D16',
  redDark: '#C60B13',
  ink: '#0F172A',
  paper: '#FFFFFF',
  soft: '#F5F8FF',
} as const;

export const MIDIA_BASE_URL = 'https://midia.pro';
export const MIDIA_WITHDRAWAL_MIN_CENTS = 5000;

export const MIDIA_RESERVED_SLUGS = [
  'www', 'app', 'api', 'admin', 'painel', 'dashboard', 'login', 'entrar',
  'cadastro', 'conta', 'suporte', 'ajuda', 'status', 'cdn', 'assets',
  'static', 'files', 'pay', 'pagar', 'pagamento', 'financeiro', 'saque',
  'anunciar', 'anuncie', 'publicidade', 'ads', 'midia', 'midiapro', 'bigcorps',
  'termos', 'privacidade', 'aviso', 'exclusao', 'robots', 'sitemap', 'null',
  'undefined', 'test', 'teste', 'demo', 'dev', 'staging', 'beta', 'mcp',
] as const;

export const MIDIA_VENUE_TYPES = [
  { key: 'store', label: 'Loja / comércio' },
  { key: 'restaurant', label: 'Restaurante / bar' },
  { key: 'gym', label: 'Academia' },
  { key: 'clinic', label: 'Clínica / consultório' },
  { key: 'office', label: 'Escritório / recepção' },
  { key: 'residential_elevator', label: 'Elevador residencial' },
  { key: 'commercial_elevator', label: 'Elevador comercial' },
  { key: 'vehicle', label: 'Carro / transporte' },
  { key: 'outdoor', label: 'Área externa' },
  { key: 'other', label: 'Outro' },
] as const;

export const MIDIA_SCREEN_TYPES = [
  { key: 'tv', label: 'TV' },
  { key: 'tablet', label: 'Tablet' },
  { key: 'led_panel', label: 'Painel LED' },
  { key: 'projector', label: 'Projetor / telão' },
  { key: 'other', label: 'Outro' },
] as const;

export function formatBrlCents(value: number) {
  return (value / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}
