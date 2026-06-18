// lib/arte/cutShapes.ts
// Pontos da linha de corte (em mm, y p/ cima) para formas geométricas, no tamanho EXATO.
// Centradas em (cx, cy). O modo 'auto' (silhueta) usa traceContour, não estas funções.

export type CutShape = 'square' | 'rounded' | 'circle' | 'auto';

export function rectPoints(wmm: number, hmm: number, cx: number, cy: number, radiusMm = 0): [number, number][] {
  const x0 = cx - wmm / 2, y0 = cy - hmm / 2, x1 = cx + wmm / 2, y1 = cy + hmm / 2;
  if (radiusMm <= 0) return [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];
  const r = Math.min(radiusMm, wmm / 2, hmm / 2), k = 24;
  const pts: [number, number][] = [];
  const corner = (ccx: number, ccy: number, a0: number) => {
    for (let i = 0; i <= k; i++) { const a = a0 + (Math.PI / 2) * (i / k); pts.push([ccx + r * Math.cos(a), ccy + r * Math.sin(a)]); }
  };
  corner(x0 + r, y0 + r, Math.PI);     // inf-esq
  corner(x1 - r, y0 + r, -Math.PI / 2); // inf-dir
  corner(x1 - r, y1 - r, 0);            // sup-dir
  corner(x0 + r, y1 - r, Math.PI / 2);  // sup-esq
  pts.push(pts[0]);
  return pts;
}

export function ellipsePoints(wmm: number, hmm: number, cx: number, cy: number): [number, number][] {
  const rx = wmm / 2, ry = hmm / 2, k = 120;
  const pts: [number, number][] = [];
  for (let i = 0; i <= k; i++) { const a = (2 * Math.PI) * (i / k); pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); }
  return pts;
}
