// lib/arte/contour.ts
// Traça a linha de corte (die-cut) a partir do canal alfa de uma imagem.
// Porte em Node do trace_contorno.py (skimage+shapely → marchingsquares+clipper+simplify).
// Roda na rota Vercel (Node). Sem Python, sem binário extra.

import sharp from 'sharp';
import { isoLines } from 'marchingsquares';
import ClipperLib from 'clipper-lib';
import simplify from 'simplify-js';

const TRACE_MAX = 1000; // resolução máx p/ traçar (perf; o corte é suavizado de qualquer forma)
const CS = 100;         // escala de precisão p/ o Clipper (inteiro)

export interface ContourResult {
  /** pontos do corte em PIXEL no espaço de traçado (tw x th), anel fechado */
  outPx: [number, number][];
  tw: number; th: number;
  mmPerPxX: number; mmPerPxY: number;
  artHmm: number;
  hasAlpha: boolean; // false = imagem sem transparência (corte vira retângulo)
}

export async function traceContour(
  buf: Buffer,
  opts: { offsetMm: number; simplifyMm: number; artWmm: number }
): Promise<ContourResult> {
  const { offsetMm, simplifyMm, artWmm } = opts;

  const meta = await sharp(buf).metadata();
  const W = meta.width ?? 0, H = meta.height ?? 0;
  if (!W || !H) throw new Error('Imagem inválida.');

  const scale = Math.min(1, TRACE_MAX / Math.max(W, H));
  const tw = Math.max(1, Math.round(W * scale));
  const th = Math.max(1, Math.round(H * scale));
  const alpha = await sharp(buf).ensureAlpha().resize(tw, th, { fit: 'fill' }).extractChannel(3).raw().toBuffer();

  // há transparência real (silhueta)?
  let minA = 255;
  for (let i = 0; i < alpha.length; i++) if (alpha[i] < minA) { minA = alpha[i]; if (minA < 128) break; }
  const hasAlpha = minA < 128;

  const artHmm = artWmm * (H / W);
  const mmPerPxX = artWmm / tw, mmPerPxY = artHmm / th;

  // anel de partida (pixel)
  let ringPx: [number, number][];
  if (!hasAlpha) {
    ringPx = [[0, 0], [tw, 0], [tw, th], [0, th], [0, 0]];
  } else {
    const grid: number[][] = [];
    for (let y = 0; y < th; y++) {
      const row = new Array(tw);
      for (let x = 0; x < tw; x++) row[x] = alpha[y * tw + x] >= 128 ? 1 : 0;
      grid.push(row);
    }
    const lines = isoLines(grid, 0.5) as [number, number][][];
    if (!lines.length) throw new Error('Não foi possível detectar o contorno da arte.');
    lines.sort((a, b) => b.length - a.length);
    ringPx = lines[0];
  }

  // offset pra fora, cantos redondos (= shapely.buffer round)
  const path = ringPx.map(([x, y]) => ({ X: Math.round(x * CS), Y: Math.round(y * CS) }));
  const co = new ClipperLib.ClipperOffset(2, 0.25);
  co.AddPath(path, ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon);
  const sol = new ClipperLib.Paths();
  co.Execute(sol, (offsetMm / mmPerPxX) * CS);
  if (!sol.length) throw new Error('Falha ao calcular o recuo do corte.');
  sol.sort((a: any, b: any) => Math.abs(ClipperLib.Clipper.Area(b)) - Math.abs(ClipperLib.Clipper.Area(a)));
  let outPx: [number, number][] = sol[0].map((p: any) => [p.X / CS, p.Y / CS]);

  // simplifica
  const tolPx = simplifyMm / mmPerPxX;
  outPx = simplify(outPx.map(([x, y]) => ({ x, y })), tolPx, true).map((p: any) => [p.x, p.y]);

  // fecha o anel
  const f = outPx[0], l = outPx[outPx.length - 1];
  if (!f || !l || f[0] !== l[0] || f[1] !== l[1]) outPx.push(outPx[0]);

  return { outPx, tw, th, mmPerPxX, mmPerPxY, artHmm, hasAlpha };
}