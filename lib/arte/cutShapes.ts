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

// ── Versões em curva Bézier real (para a LINHA DE CORTE, não para bounding box) ──
// rectPoints/ellipsePoints acima continuam intactas (usadas no cálculo de bounding box e
// em qualquer outro consumidor existente). As funções abaixo geram strings de path SVG com
// curvas Bézier matemáticas reais — sem aproximação por polígono — para uso exclusivo com
// page.drawSvgPath() ao desenhar a linha de corte. Isso evita que softwares de vetor (Corel)
// ou plotters de corte exibam/processem os ~120 vértices de um polígono como pontos de
// inflexão visíveis na curva, mesmo quando já é um único stroke contínuo.
//
// IMPORTANTE: como page.drawSvgPath() do pdf-lib espera coordenadas no sistema SVG nativo
// (Y cresce para BAIXO — o oposto do PDF, que cresce para cima), os valores de cy/y0/y1
// devem ser passados já invertidos pelo chamador (ex: ellipseSvgPath(w, h, cx, -cyPdf)),
// exatamente como já era feito ao montar manualmente a string a partir de ellipsePoints.
const BEZIER_KAPPA = 0.5522847498307936; // 4/3 * (√2 - 1) — aproximação padrão de 1/4 de círculo

export function ellipseSvgPath(wmm: number, hmm: number, cx: number, cy: number): string {
  const rx = wmm / 2, ry = hmm / 2;
  const ox = rx * BEZIER_KAPPA, oy = ry * BEZIER_KAPPA;
  return [
    `M ${cx + rx} ${cy}`,
    `C ${cx + rx} ${cy + oy} ${cx + ox} ${cy + ry} ${cx} ${cy + ry}`,
    `C ${cx - ox} ${cy + ry} ${cx - rx} ${cy + oy} ${cx - rx} ${cy}`,
    `C ${cx - rx} ${cy - oy} ${cx - ox} ${cy - ry} ${cx} ${cy - ry}`,
    `C ${cx + ox} ${cy - ry} ${cx + rx} ${cy - oy} ${cx + rx} ${cy}`,
    'Z',
  ].join(' ');
}

export function rectSvgPath(wmm: number, hmm: number, cx: number, cy: number, radiusMm = 0): string {
  const x0 = cx - wmm / 2, y0 = cy - hmm / 2, x1 = cx + wmm / 2, y1 = cy + hmm / 2;
  const r = Math.min(Math.max(0, radiusMm), wmm / 2, hmm / 2);
  if (r <= 0.001) return `M ${x0} ${y0} L ${x1} ${y0} L ${x1} ${y1} L ${x0} ${y1} Z`;
  const o = r * BEZIER_KAPPA;
  return [
    `M ${x0 + r} ${y0}`,
    `L ${x1 - r} ${y0}`,
    `C ${x1 - r + o} ${y0} ${x1} ${y0 + r - o} ${x1} ${y0 + r}`,
    `L ${x1} ${y1 - r}`,
    `C ${x1} ${y1 - r + o} ${x1 - r + o} ${y1} ${x1 - r} ${y1}`,
    `L ${x0 + r} ${y1}`,
    `C ${x0 + r - o} ${y1} ${x0} ${y1 - r + o} ${x0} ${y1 - r}`,
    `L ${x0} ${y0 + r}`,
    `C ${x0} ${y0 + r - o} ${x0 + r - o} ${y0} ${x0 + r} ${y0}`,
    'Z',
  ].join(' ');
}

export type CutPathCommand =
  | { type: 'M' | 'L'; x: number; y: number }
  | { type: 'C'; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
  | { type: 'Z' };

export function ellipseEpsCommands(wmm: number, hmm: number, cx: number, cy: number): CutPathCommand[] {
  const rx = wmm / 2, ry = hmm / 2;
  const ox = rx * BEZIER_KAPPA, oy = ry * BEZIER_KAPPA;
  return [
    { type: 'M', x: cx + rx, y: cy },
    { type: 'C', x1: cx + rx, y1: cy - oy, x2: cx + ox, y2: cy - ry, x: cx, y: cy - ry },
    { type: 'C', x1: cx - ox, y1: cy - ry, x2: cx - rx, y2: cy - oy, x: cx - rx, y: cy },
    { type: 'C', x1: cx - rx, y1: cy + oy, x2: cx - ox, y2: cy + ry, x: cx, y: cy + ry },
    { type: 'C', x1: cx + ox, y1: cy + ry, x2: cx + rx, y2: cy + oy, x: cx + rx, y: cy },
    { type: 'Z' },
  ];
}

export function rectEpsCommands(wmm: number, hmm: number, cx: number, cy: number, radiusMm = 0): CutPathCommand[] {
  const x0 = cx - wmm / 2, y0 = cy - hmm / 2, x1 = cx + wmm / 2, y1 = cy + hmm / 2;
  const r = Math.min(Math.max(0, radiusMm), wmm / 2, hmm / 2);
  if (r <= 0.001) {
    return [
      { type: 'M', x: x0, y: y0 },
      { type: 'L', x: x1, y: y0 },
      { type: 'L', x: x1, y: y1 },
      { type: 'L', x: x0, y: y1 },
      { type: 'Z' },
    ];
  }
  const o = r * BEZIER_KAPPA;
  return [
    { type: 'M', x: x0 + r, y: y0 },
    { type: 'L', x: x1 - r, y: y0 },
    { type: 'C', x1: x1 - r + o, y1: y0, x2: x1, y2: y0 + r - o, x: x1, y: y0 + r },
    { type: 'L', x: x1, y: y1 - r },
    { type: 'C', x1: x1, y1: y1 - r + o, x2: x1 - r + o, y2: y1, x: x1 - r, y: y1 },
    { type: 'L', x: x0 + r, y: y1 },
    { type: 'C', x1: x0 + r - o, y1: y1, x2: x0, y2: y1 - r + o, x: x0, y: y1 - r },
    { type: 'L', x: x0, y: y0 + r },
    { type: 'C', x1: x0, y1: y0 + r - o, x2: x0 + r - o, y2: y0, x: x0 + r, y: y0 },
    { type: 'Z' },
  ];
}
