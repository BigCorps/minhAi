export type FuncionarIABackgroundPreset = 'escritorio' | 'corporativo' | 'coworking' | 'executivo' | 'openspace' | 'marca' | 'custom';

export interface FuncionarIAVisualConfig {
  primaryColor: string;
  secondaryColor: string;
  shirtColor: string;
  shirtDetailColor: string;
  uniformLogoUrl?: string | null;
  companyLogoUrl?: string | null;
  backgroundPreset: FuncionarIABackgroundPreset | string;
  backgroundUrl?: string | null;

  /** Balcao na frente da atendente. Ver COUNTERS em lib/funcionaria-avatar. */
  counter?: string | null;

  /** Onde o logo aparece. Ver LOGO_PLACEMENTS em lib/funcionaria-avatar. */
  logoPlacement?: string | null;
}

export const FUNCIONARIA_BACKGROUND_PRESETS: Array<{
  key: Exclude<FuncionarIABackgroundPreset, 'custom'>;
  label: string;
  description: string;
}> = [
  { key: 'escritorio', label: 'Escritório', description: 'Mesa e janelas ao fundo.' },
  { key: 'corporativo', label: 'Corporativo', description: 'Andar amplo e envidraçado.' },
  { key: 'coworking', label: 'Coworking', description: 'Estações claras e plantas.' },
  { key: 'executivo', label: 'Executivo', description: 'Ambiente escuro e sóbrio.' },
  { key: 'openspace', label: 'Open space', description: 'Estações abertas e claras.' },
  { key: 'marca', label: 'Cores da marca', description: 'Acompanha as cores da empresa.' },
];

export function normalizeHexColor(value: string | null | undefined, fallback: string): string {
  const normalized = String(value || '').trim();
  return /^#[0-9a-f]{6}$/i.test(normalized) ? normalized.toUpperCase() : fallback;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = normalizeHexColor(hex, '#6D28D9').slice(1);
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

export function contrastTextColor(background: string): '#0F172A' | '#FFFFFF' {
  const { r, g, b } = hexToRgb(background);
  const channels = [r, g, b].map(channel => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  return luminance > 0.46 ? '#0F172A' : '#FFFFFF';
}

export function rgbaFromHex(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

export function mouthStageFromAmplitude(amplitude: number): 0 | 1 | 2 | 3 {
  const value = Math.max(0, Math.min(1, Number(amplitude) || 0));
  if (value < 0.08) return 0;
  if (value < 0.24) return 1;
  if (value < 0.48) return 2;
  return 3;
}
