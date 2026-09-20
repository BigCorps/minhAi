'use client';

import type { ConviteConfig } from './tipos';
import { acharTema } from './temas';
import { acharFonte } from './fontes';
import { familiasGoogle, urlGoogleFonts } from './tokens';
import { ORNAMENTOS_ASSETS } from './ornamentos';

export type FormatoPapelariaId = 'a3' | 'a4' | 'a5' | '15x21' | '10x15' | 'a4-horizontal';
export type PecaEventoId = 'boas-vindas' | 'numero-mesa' | 'cartao-mesa' | 'qr-convite' | 'menu' | 'agradecimento';
export type PaletaPapelariaId = 'convite' | 'rose' | 'sage' | 'noite';

export type FormatoPapelaria = {
  id: FormatoPapelariaId;
  nome: string;
  detalhe: string;
  larguraMm: number;
  alturaMm: number;
};

export type EstiloPapelaria = {
  paletaId?: PaletaPapelariaId;
  ornamentoId?: string;
};

export const FORMATOS_PAPELARIA: FormatoPapelaria[] = [
  { id: 'a3', nome: 'A3 vertical', detalhe: '29,7 × 42 cm', larguraMm: 297, alturaMm: 420 },
  { id: 'a4', nome: 'A4 vertical', detalhe: '21 × 29,7 cm', larguraMm: 210, alturaMm: 297 },
  { id: 'a5', nome: 'A5 vertical', detalhe: '14,8 × 21 cm', larguraMm: 148, alturaMm: 210 },
  { id: '15x21', nome: '15 × 21 cm', detalhe: 'plaquinha / mesa', larguraMm: 150, alturaMm: 210 },
  { id: '10x15', nome: '10 × 15 cm', detalhe: 'card / porta-retrato', larguraMm: 100, alturaMm: 150 },
  { id: 'a4-horizontal', nome: 'A4 horizontal', detalhe: '29,7 × 21 cm', larguraMm: 297, alturaMm: 210 },
];

export const PECAS_EVENTO: Record<PecaEventoId, { nome: string; descricao: string; formato: FormatoPapelariaId }> = {
  'boas-vindas': { nome: 'Placa de boas-vindas', descricao: 'Para recepção, hall ou entrada do evento.', formato: 'a3' },
  'numero-mesa': { nome: 'Número de mesa', descricao: 'Identificação elegante para cada mesa.', formato: '10x15' },
  'cartao-mesa': { nome: 'Cartão de mesa', descricao: 'Mensagem com QR do convite para deixar sobre a mesa.', formato: '15x21' },
  'qr-convite': { nome: 'QR do convite', descricao: 'Plaquinha com acesso rápido ao convite publicado.', formato: '15x21' },
  menu: { nome: 'Menu', descricao: 'Cardápio no mesmo visual do convite.', formato: '15x21' },
  agradecimento: { nome: 'Agradecimento', descricao: 'Uma lembrança impressa para convidados e mesas.', formato: '10x15' },
};

export const MODELOS_PAPELARIA = ORNAMENTOS_ASSETS;

export const PALETAS_PAPELARIA: Array<{ id: PaletaPapelariaId; nome: string; descricao: string }> = [
  { id: 'convite', nome: 'Cores do convite', descricao: 'Usa exatamente a paleta escolhida no convite.' },
  { id: 'rose', nome: 'Rosé clássico', descricao: 'Rosé suave e elegante, como nas artes de Memórias.' },
  { id: 'sage', nome: 'Sálvia & creme', descricao: 'Verde sálvia com fundo creme e leitura delicada.' },
  { id: 'noite', nome: 'Noite elegante', descricao: 'Fundo escuro com detalhes dourados e contraste alto.' },
];

export function formatoPapelaria(id: FormatoPapelariaId) {
  return FORMATOS_PAPELARIA.find((f) => f.id === id) ?? FORMATOS_PAPELARIA[1];
}

export function nomeSeguro(valor: string) {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'evento';
}

type Visual = {
  fundo: string;
  papelQr: string;
  tinta: string;
  suave: string;
  acento: string;
  detalhe: string;
  folha: string;
  display: string;
  corpo: string;
  displayFamilia: string;
  corpoFamilia: string;
  pesoDisplay: number;
  escalaDisplay: number;
  ornamentoId: string;
};

const PALETAS_FIXAS: Record<Exclude<PaletaPapelariaId, 'convite'>, {
  fundo: string; papelQr: string; tinta: string; suave: string; acento: string; detalhe: string; folha: string;
}> = {
  rose: { fundo: '#fffaf8', papelQr: '#ffffff', tinta: '#40232c', suave: '#7c5560', acento: '#b75d78', detalhe: '#e8bdc9', folha: '#74806b' },
  sage: { fundo: '#fbfaf5', papelQr: '#ffffff', tinta: '#3f4436', suave: '#66705a', acento: '#7d8b6a', detalhe: '#cdd0bb', folha: '#718062' },
  noite: { fundo: '#171416', papelQr: '#fffdf8', tinta: '#fff8ec', suave: '#d3c7b7', acento: '#c9a86a', detalhe: '#66553a', folha: '#9c885f' },
};

function primeiraFamilia(css: string) {
  return css.split(',')[0].replace(/["']/g, '').trim();
}

function pilhaCanvas(css: string, fallback: string) {
  const principal = css.split(',')[0].trim();
  return `${principal}, ${fallback}`;
}

function modeloValido(id?: string | null) {
  return Boolean(id && ORNAMENTOS_ASSETS.some((o) => o.id === id));
}

function visualDoConvite(cfg: ConviteConfig, estilo?: EstiloPapelaria): Visual {
  const tema = acharTema(cfg.temaId);
  const fonte = acharFonte(cfg.fonteId);
  const paletaId = estilo?.paletaId ?? 'convite';
  const fixa = paletaId === 'convite' ? null : PALETAS_FIXAS[paletaId];
  const ornamentoPadrao = cfg.ornamentoId || tema.ornamentoSugerido || 'floral';
  const ornamentoId = modeloValido(estilo?.ornamentoId)
    ? estilo!.ornamentoId!
    : (modeloValido(ornamentoPadrao) ? ornamentoPadrao : 'floral');

  return {
    fundo: fixa?.fundo ?? tema.papel,
    papelQr: fixa?.papelQr ?? '#ffffff',
    tinta: fixa?.tinta ?? tema.tinta,
    suave: fixa?.suave ?? tema.tintaSuave,
    acento: fixa?.acento ?? tema.acento,
    detalhe: fixa?.detalhe ?? tema.floral.petalaClara,
    folha: fixa?.folha ?? tema.floral.folha,
    // Não usamos mais o fallback genérico "cursive" no canvas. Em Android ele
    // frequentemente vira uma fonte parecida com Comic Sans. A fonte real do
    // convite é carregada abaixo; caso a rede falhe, o fallback continua elegante.
    display: pilhaCanvas(fonte.display, 'Georgia, serif'),
    corpo: pilhaCanvas(fonte.corpo, 'Arial, sans-serif'),
    displayFamilia: primeiraFamilia(fonte.display),
    corpoFamilia: primeiraFamilia(fonte.corpo),
    pesoDisplay: fonte.pesoDisplay,
    escalaDisplay: fonte.escalaDisplay,
    ornamentoId,
  };
}

const fontesCarregadas = new Map<string, Promise<void>>();

async function garantirFontesPapelaria(fonteId: string, v: Visual) {
  if (typeof document === 'undefined' || !('fonts' in document)) return;
  if (fontesCarregadas.has(fonteId)) return fontesCarregadas.get(fonteId)!;

  const promessa = (async () => {
    const familias = familiasGoogle(fonteId);
    if (familias.length) {
      const id = `cv-papelaria-fontes-${fonteId.replace(/[^a-z0-9_-]/gi, '-')}`;
      let link = document.getElementById(id) as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = urlGoogleFonts(familias);
        document.head.appendChild(link);
      }
      if (!link.sheet) {
        await new Promise<void>((resolve) => {
          let finalizado = false;
          const terminar = () => { if (!finalizado) { finalizado = true; resolve(); } };
          link!.addEventListener('load', terminar, { once: true });
          link!.addEventListener('error', terminar, { once: true });
          window.setTimeout(terminar, 4500);
        });
      }
    }

    try {
      await Promise.all([
        document.fonts.load(`${v.pesoDisplay} 32px "${v.displayFamilia}"`),
        document.fonts.load(`400 18px "${v.corpoFamilia}"`),
        document.fonts.load(`500 18px "${v.corpoFamilia}"`),
        document.fonts.load(`600 18px "${v.corpoFamilia}"`),
        document.fonts.load(`700 18px "${v.corpoFamilia}"`),
        document.fonts.ready,
      ]);
    } catch {
      // O canvas usa os fallbacks seguros definidos em visualDoConvite.
    }
  })();

  fontesCarregadas.set(fonteId, promessa);
  return promessa;
}

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function linhas(ctx: CanvasRenderingContext2D, texto: string, max: number, maxLinhas = 8) {
  const out: string[] = [];
  for (const par of String(texto || '').replace(/\r/g, '').split('\n')) {
    const palavras = par.trim().split(/\s+/).filter(Boolean);
    if (!palavras.length) { if (out.length < maxLinhas) out.push(''); continue; }
    let atual = '';
    for (const palavra of palavras) {
      const teste = atual ? `${atual} ${palavra}` : palavra;
      if (!atual || ctx.measureText(teste).width <= max) atual = teste;
      else {
        out.push(atual);
        atual = palavra;
        if (out.length >= maxLinhas) break;
      }
    }
    if (out.length >= maxLinhas) break;
    if (atual) out.push(atual);
  }
  return out.slice(0, maxLinhas);
}

function path(ctx: CanvasRenderingContext2D, d: string, cor: string, largura = 1.2, alpha = 0.65) {
  ctx.save();
  ctx.strokeStyle = cor;
  ctx.lineWidth = largura;
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke(new Path2D(d));
  ctx.restore();
}

function folha(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot: number, cor: string, alpha = 0.65) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot * Math.PI / 180);
  ctx.fillStyle = cor;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function rosa(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, v: Visual) {
  ctx.save();
  ctx.translate(x, y);
  for (let camada = 0; camada < 3; camada++) {
    const n = 7 - camada;
    for (let i = 0; i < n; i++) {
      const ang = (Math.PI * 2 * i) / n + camada * .35;
      ctx.save();
      ctx.rotate(ang);
      ctx.fillStyle = camada === 0 ? v.detalhe : v.acento;
      ctx.globalAlpha = camada === 0 ? .58 : .42 + camada * .12;
      ctx.beginPath();
      ctx.ellipse(0, -r * (.42 - camada * .05), r * (.22 - camada * .025), r * (.48 - camada * .08), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.fillStyle = v.acento;
  ctx.globalAlpha = .85;
  ctx.beginPath();
  ctx.arc(0, 0, r * .14, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function ornamentoBase(ctx: CanvasRenderingContext2D, id: string, v: Visual) {
  const a = v.acento;
  const d = v.detalhe;
  const f = v.folha;
  if (id === 'casamento-original') {
    path(ctx, 'M4 118 C40 112 66 92 84 62 C96 42 104 24 106 6', a, 1.35, .62);
    path(ctx, 'M2 74 C30 70 52 54 64 30 C70 18 74 10 76 2', a, 1, .38);
    [[22,108,-30],[43,98,-42],[65,78,-52],[86,50,-65],[98,27,-72]].forEach(([x,y,r]) => folha(ctx,x,y,5.5,11,r,f,.62));
    rosa(ctx, 34, 38, 25, v); rosa(ctx, 75, 82, 18, v); rosa(ctx, 16, 92, 13, v);
  } else if (id === 'alta-costura') {
    path(ctx, 'M8 104 C27 94 38 72 41 48 C44 25 57 12 78 8', a, 1.1, .62);
    path(ctx, 'M18 108 C44 92 58 67 61 39 C63 23 74 14 98 8', a, .75, .3);
    path(ctx, 'M34 75 C41 59 50 49 64 42 C74 37 82 28 86 16', a, .9, .55);
    folha(ctx, 58, 34, 8, 14, 28, d, .6); folha(ctx, 82, 22, 6, 11, 44, a, .45);
  } else if (id === 'imperial') {
    path(ctx, 'M9 104 C18 82 23 59 20 40 C19 27 27 19 39 22 C51 25 50 41 39 43 C30 45 27 35 33 31 M20 61 C39 58 54 45 59 27 C63 14 75 9 87 13 C101 18 99 35 88 38 C77 41 73 29 80 24', a, 1.25, .72);
    path(ctx, 'M18 92 C40 84 58 72 73 55', a, .85, .4);
    folha(ctx, 60, 60, 10, 18, 42, d, .52);
  } else if (id === 'art-deco') {
    path(ctx, 'M10 104 L10 56 L56 10 M21 104 L21 63 L63 21 M33 104 L33 71 L71 33 M13 70 L42 70 L70 42 L70 13', a, 1.15, .62);
    ctx.save(); ctx.translate(65,52); ctx.rotate(Math.PI/4); ctx.fillStyle=d; ctx.globalAlpha=.65; ctx.fillRect(-9,-9,18,18); ctx.restore();
  } else if (id === 'organico-chic') {
    path(ctx, 'M-3 94 C23 70 20 43 47 26 C64 15 77 12 101 4', a, 1.2, .55);
    path(ctx, 'M8 113 C37 91 47 70 49 45 C51 24 67 17 92 15', a, .8, .3);
    folha(ctx,26,67,12,17,-42,f,.55); folha(ctx,57,42,10,14,35,a,.45); folha(ctx,80,20,7,11,50,d,.5);
  } else if (id === 'radical') {
    path(ctx, 'M8 103 L31 73 L23 66 L56 31 L48 23 L83 8', a, 2, .72);
    path(ctx, 'M17 108 L45 76 L37 68 L73 34', a, .8, .35);
    path(ctx, 'M34 88 L47 65 L57 70 L69 48 L77 53 L91 29', d, 3.1, .55);
  } else if (id === 'geometrico') {
    path(ctx, 'M8 72 L38 18 L64 64 L92 12', a, 1.45, .68);
    ctx.save(); ctx.fillStyle=d; ctx.globalAlpha=.75; ctx.beginPath(); ctx.arc(38,18,5,0,Math.PI*2); ctx.fill(); ctx.restore();
  } else if (id === 'minimal') {
    path(ctx, 'M12 62 C34 44 45 26 56 8 M24 74 C47 61 67 43 84 18', a, 1.2, .48);
  } else if (id === 'festivo') {
    path(ctx, 'M12 30 Q32 55 54 26 T98 28', a, 1.35, .58);
    [20,38,58,78,96].forEach((x,i) => { ctx.save(); ctx.fillStyle=i%2?d:a; ctx.globalAlpha=.72; ctx.beginPath(); ctx.arc(x,28+(i%2)*11,3+(i%3),0,Math.PI*2); ctx.fill(); ctx.restore(); });
  } else if (id === 'classico') {
    path(ctx, 'M10 82 C26 31 66 26 74 8 C76 36 58 53 30 61 C54 62 78 49 98 27', a, 1.35, .68);
    path(ctx, 'M29 60 C20 50 20 40 28 34 M51 48 C43 37 45 27 54 21', a, 1, .45);
  } else if (id === 'rustico') {
    path(ctx, 'M8 88 C31 59 51 43 90 18', a, 1.35, .62);
    [[26,74,-35],[42,61,-35],[58,48,-35],[73,35,-35]].forEach(([x,y,r]) => folha(ctx,x,y,9,4.5,r,f,.72));
  } else {
    path(ctx, 'M10 92 C31 66 42 45 72 20', a, 1.3, .62);
    folha(ctx,38,63,10,5,-38,f,.72); folha(ctx,56,45,10,5,25,f,.72);
    ctx.save(); ctx.fillStyle=a; ctx.globalAlpha=.64; ctx.beginPath(); ctx.arc(74,20,11,0,Math.PI*2); ctx.fill(); ctx.restore();
  }
}

function canto(ctx: CanvasRenderingContext2D, id: string, v: Visual, x: number, y: number, tamanho: number, flipX = false, flipY = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale((flipX ? -1 : 1) * tamanho / 120, (flipY ? -1 : 1) * tamanho / 120);
  ornamentoBase(ctx, id, v);
  ctx.restore();
}

function divisor(ctx: CanvasRenderingContext2D, v: Visual, x: number, y: number, largura: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = v.acento;
  ctx.fillStyle = v.acento;
  ctx.lineWidth = Math.max(1, largura * .005);
  ctx.globalAlpha = .52;
  ctx.beginPath();
  ctx.moveTo(-largura / 2, 0); ctx.lineTo(-largura * .12, 0);
  ctx.moveTo(largura * .12, 0); ctx.lineTo(largura / 2, 0);
  ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, largura * .022, 0, Math.PI * 2); ctx.fill();
  folha(ctx, -largura * .055, 0, largura * .024, largura * .011, -25, v.folha, .72);
  folha(ctx, largura * .055, 0, largura * .024, largura * .011, 25, v.folha, .72);
  ctx.restore();
}

function texturaDoConvite(ctx: CanvasRenderingContext2D, texturaId: string | undefined, v: Visual, largura: number, altura: number, base: number) {
  const id = texturaId || 'nenhuma';
  if (id === 'nenhuma') return;
  const passo = Math.max(52, base * .105);
  const escala = passo / 40;
  ctx.save();
  ctx.strokeStyle = v.acento;
  ctx.fillStyle = v.acento;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = .085;

  for (let y = -passo; y < altura + passo; y += passo) {
    for (let x = -passo; x < largura + passo; x += passo) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(8 * Math.PI / 180);
      ctx.scale(escala, escala);
      ctx.lineWidth = .7;
      if (id === 'renda') {
        ctx.beginPath();
        ctx.moveTo(0, 12); ctx.arc(10, 12, 10, Math.PI, 0); ctx.arc(30, 12, 10, Math.PI, 0); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-20, 32); ctx.arc(-10, 32, 10, Math.PI, 0); ctx.arc(10, 32, 10, Math.PI, 0); ctx.arc(30, 32, 10, Math.PI, 0); ctx.stroke();
        [[10,7],[30,7],[0,27],[20,27],[40,27]].forEach(([cx,cy]) => { ctx.beginPath(); ctx.arc(cx,cy,1.1,0,Math.PI*2); ctx.fill(); });
      } else if (id === 'pontos') {
        [[10,10,2.2],[30,30,2.2],[30,10,1],[10,30,1]].forEach(([cx,cy,r]) => { ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill(); });
      } else if (id === 'folhagem') {
        ctx.beginPath(); ctx.moveTo(8,36); ctx.bezierCurveTo(20,28,27,16,29,6); ctx.stroke();
        [[12,31,-32],[18,24,-46],[24,16,-60],[27,9,-74],[15,33,140],[21,25,132]].forEach(([cx,cy,r]) => folha(ctx,cx,cy,3,6,r,v.acento,.085));
      } else if (id === 'linhas') {
        ctx.beginPath(); ctx.moveTo(0,40); ctx.lineTo(40,0); ctx.moveTo(0,20); ctx.lineTo(20,0); ctx.moveTo(20,40); ctx.lineTo(40,20); ctx.stroke();
      } else if (id === 'losango') {
        ctx.beginPath(); ctx.moveTo(20,6); ctx.lineTo(34,20); ctx.lineTo(20,34); ctx.lineTo(6,20); ctx.closePath(); ctx.stroke();
        ctx.beginPath(); ctx.arc(20,20,1.4,0,Math.PI*2); ctx.fill();
      } else if (id === 'confete') {
        [[7,9,24],[28,6,-38],[34,24,62],[13,30,-18],[22,18,78],[3,22,-66]].forEach(([cx,cy,r]) => {
          ctx.save(); ctx.translate(cx,cy); ctx.rotate(r*Math.PI/180); rounded(ctx,0,0,5.5,1.8,.9); ctx.fill(); ctx.restore();
        });
      }
      ctx.restore();
    }
  }
  ctx.restore();
}

function prepararBase(cfg: ConviteConfig, formato: FormatoPapelaria, dpi: number, estilo?: EstiloPapelaria) {
  const pxMm = dpi / 25.4;
  const largura = Math.round(formato.larguraMm * pxMm);
  const altura = Math.round(formato.alturaMm * pxMm);
  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Seu navegador não conseguiu montar a arte.');
  const v = visualDoConvite(cfg, estilo);
  const base = Math.min(largura, altura);
  const margem = base * .07;

  ctx.fillStyle = v.fundo;
  ctx.fillRect(0, 0, largura, altura);
  const ondeTextura = cfg.texturaOnde ?? 'papel';
  if (ondeTextura === 'papel' || ondeTextura === 'ambas') texturaDoConvite(ctx, cfg.texturaId, v, largura, altura, base);
  ctx.strokeStyle = v.acento;
  ctx.lineWidth = Math.max(2, base * .003);
  ctx.globalAlpha = .55;
  rounded(ctx, margem * .48, margem * .48, largura - margem * .96, altura - margem * .96, base * .025);
  ctx.stroke();
  ctx.strokeStyle = v.detalhe;
  ctx.lineWidth = Math.max(1, base * .0015);
  ctx.globalAlpha = .7;
  rounded(ctx, margem * .72, margem * .72, largura - margem * 1.44, altura - margem * 1.44, base * .018);
  ctx.stroke();
  ctx.globalAlpha = 1;

  const orn = base * (altura >= largura ? .31 : .27);
  canto(ctx, v.ornamentoId, v, margem * .45, margem * .45, orn, false, false);
  canto(ctx, v.ornamentoId, v, largura - margem * .45, altura - margem * .45, orn, true, true);

  return { canvas, ctx, v, largura, altura, base, margem };
}

async function imagemQr(valor: string, tamanho = 1200) {
  const QRCode = (await import('qrcode')).default;
  const src = await QRCode.toDataURL(valor, { width: tamanho, margin: 2, errorCorrectionLevel: 'H', color: { dark: '#151515', light: '#ffffff' } });
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Não foi possível montar o QR Code.'));
    img.src = src;
  });
}

function fonteDisplay(v: Visual, px: number) {
  return `${v.pesoDisplay} ${Math.max(12, Math.round(px * v.escalaDisplay))}px ${v.display}`;
}

function fonteCorpo(v: Visual, peso: number, px: number) {
  return `${peso} ${Math.round(px)}px ${v.corpo}`;
}

function rodapeEvento(ctx: CanvasRenderingContext2D, cfg: ConviteConfig, v: Visual, largura: number, altura: number, base: number, margem: number) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = v.tinta;
  ctx.font = fonteCorpo(v, 600, base * .027);
  const evento = linhas(ctx, cfg.anfitrioes.exibicao, largura - margem * 2.5, 2);
  const y = altura * .915 - (evento.length - 1) * base * .018;
  evento.forEach((l, i) => ctx.fillText(l, largura / 2, y + i * base * .038));
  ctx.fillStyle = v.suave;
  ctx.font = fonteCorpo(v, 400, base * .017);
  const data = [cfg.evento.dataExtenso, cfg.evento.horario].filter(Boolean).join(' · ');
  if (data) ctx.fillText(data, largura / 2, Math.min(altura - margem * .72, y + evento.length * base * .042));
}

export async function renderizarArteCheckin({
  cfg,
  slug,
  qrToken,
  nome,
  formato = formatoPapelaria('10x15'),
  dpi = 300,
  estilo,
}: {
  cfg: ConviteConfig;
  slug: string;
  qrToken: string;
  nome: string;
  formato?: FormatoPapelaria;
  dpi?: number;
  estilo?: EstiloPapelaria;
}) {
  const baseDados = prepararBase(cfg, formato, dpi, estilo);
  const { canvas, ctx, v, largura, altura, base, margem } = baseDados;
  await garantirFontesPapelaria(cfg.fonteId, v);
  const vertical = altura >= largura;
  const url = `https://${slug}.conviteia.com/entrada/${qrToken}`;
  const qr = await imagemQr(url);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = v.acento;
  ctx.font = fonteCorpo(v, 700, base * .018);
  ctx.fillText('CHECK-IN DO EVENTO', largura / 2, altura * (vertical ? .115 : .15));

  ctx.fillStyle = v.tinta;
  ctx.font = fonteDisplay(v, base * (vertical ? .07 : .062));
  const nomes = linhas(ctx, nome, largura - margem * 2.3, 2);
  const nomeY = altura * (vertical ? .19 : .25) - (nomes.length - 1) * base * .032;
  nomes.forEach((l, i) => ctx.fillText(l, largura / 2, nomeY + i * base * .077));
  divisor(ctx, v, largura / 2, altura * (vertical ? .29 : .37), base * .34);

  const qrTam = Math.min(base * (vertical ? .54 : .45), altura * (vertical ? .36 : .50));
  const qrX = largura / 2 - qrTam / 2;
  const qrY = altura * (vertical ? .37 : .43);
  ctx.save();
  ctx.shadowColor = 'rgba(25,15,18,.14)';
  ctx.shadowBlur = base * .022;
  ctx.shadowOffsetY = base * .009;
  ctx.fillStyle = v.papelQr;
  rounded(ctx, qrX - base * .03, qrY - base * .03, qrTam + base * .06, qrTam + base * .06, base * .025);
  ctx.fill();
  ctx.restore();
  ctx.drawImage(qr, qrX, qrY, qrTam, qrTam);

  ctx.fillStyle = v.suave;
  ctx.font = fonteCorpo(v, 500, base * .021);
  ctx.fillText('Apresente este QR Code na entrada', largura / 2, qrY + qrTam + base * .07);
  ctx.font = fonteCorpo(v, 400, base * .016);
  ctx.fillText('A equipe fará a conferência pelo check-in do ConviteIA', largura / 2, qrY + qrTam + base * .108);

  rodapeEvento(ctx, cfg, v, largura, altura, base, margem);
  return canvas;
}

export async function renderizarPecaEvento({
  cfg,
  slug,
  peca,
  formato,
  titulo,
  texto,
  numero,
  menu,
  dpi = 300,
  estilo,
}: {
  cfg: ConviteConfig;
  slug: string;
  peca: PecaEventoId;
  formato: FormatoPapelaria;
  titulo: string;
  texto: string;
  numero: string;
  menu: string;
  dpi?: number;
  estilo?: EstiloPapelaria;
}) {
  const { canvas, ctx, v, largura, altura, base, margem } = prepararBase(cfg, formato, dpi, estilo);
  await garantirFontesPapelaria(cfg.fonteId, v);
  const vertical = altura >= largura;
  const centro = largura / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  let chamada = titulo.trim() || 'Sejam bem-vindos';
  const corpo = texto.trim();
  if (peca === 'numero-mesa') chamada = 'Mesa';
  if (peca === 'cartao-mesa') chamada = `Mesa ${numero || '01'}`;
  if (peca === 'menu') chamada = 'Menu';
  if (peca === 'agradecimento') chamada = titulo.trim() || 'Obrigado!';
  if (peca === 'qr-convite') chamada = titulo.trim() || 'Nosso convite';

  ctx.fillStyle = v.tinta;
  const tituloPx = base * (peca === 'numero-mesa' ? .115 : vertical ? .073 : .064);
  ctx.font = fonteDisplay(v, tituloPx);
  const tituloLinhas = linhas(ctx, chamada, largura - margem * 2.35, peca === 'numero-mesa' ? 1 : 3);
  const inicio = altura * (vertical ? .19 : .24) - (tituloLinhas.length - 1) * base * .035;
  tituloLinhas.forEach((l, i) => ctx.fillText(l, centro, inicio + i * tituloPx * .95));
  divisor(ctx, v, centro, altura * (vertical ? .31 : .38), base * .35);

  if (peca === 'qr-convite' || peca === 'cartao-mesa') {
    const qr = await imagemQr(`https://${slug}.conviteia.com`);
    const qrTam = Math.min(base * (vertical ? .43 : .38), altura * .37);
    const qrY = altura * (vertical ? .40 : .43);
    ctx.save();
    ctx.shadowColor = 'rgba(25,15,18,.13)';
    ctx.shadowBlur = base * .02;
    ctx.shadowOffsetY = base * .008;
    ctx.fillStyle = v.papelQr;
    rounded(ctx, centro - qrTam / 2 - base * .025, qrY - base * .025, qrTam + base * .05, qrTam + base * .05, base * .022);
    ctx.fill();
    ctx.restore();
    ctx.drawImage(qr, centro - qrTam / 2, qrY, qrTam, qrTam);
    ctx.fillStyle = v.suave;
    ctx.font = fonteCorpo(v, 500, base * .019);
    ctx.fillText(peca === 'cartao-mesa' ? 'Acesse os detalhes do evento' : 'Aponte a câmera para abrir o convite', centro, qrY + qrTam + base * .058);
    ctx.font = fonteCorpo(v, 400, base * .016);
    ctx.fillText(`${slug}.conviteia.com`, centro, qrY + qrTam + base * .095);
  } else if (peca === 'numero-mesa') {
    ctx.fillStyle = v.acento;
    ctx.font = fonteDisplay(v, base * .23);
    ctx.fillText(numero || '01', centro, altura * .50);
    ctx.fillStyle = v.suave;
    ctx.font = fonteCorpo(v, 400, base * .026);
    ctx.fillText('Bem-vindos à nossa mesa', centro, altura * .66);
  } else {
    const conteudo = peca === 'menu'
      ? menu.trim() || 'Entrada\nPrato principal\nSobremesa\nBebidas'
      : corpo || (peca === 'agradecimento' ? 'Obrigado por fazer parte deste momento especial.' : 'Que alegria ter você conosco neste dia especial.');
    ctx.fillStyle = v.suave;
    ctx.font = fonteCorpo(v, 400, base * (vertical ? .03 : .027));
    const maxLinhas = peca === 'menu' ? 9 : 6;
    const corpoLinhas = linhas(ctx, conteudo, largura - margem * 2.5, maxLinhas);
    const espacamento = base * (peca === 'menu' ? .057 : .048);
    const corpoY = altura * (vertical ? .42 : .47);
    corpoLinhas.forEach((l, i) => {
      if (l === '') return;
      ctx.fillText(l, centro, corpoY + i * espacamento);
    });
  }

  rodapeEvento(ctx, cfg, v, largura, altura, base, margem);
  return canvas;
}

export function baixarCanvasPng(canvas: HTMLCanvasElement, nome: string) {
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png', 1);
  a.download = nome;
  a.click();
}
