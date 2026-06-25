/**
 * lib/arte/epsExport.ts — ArteFinal
 *
 * Gera arquivos .eps (Encapsulated PostScript) com imagem CMYK embutida +
 * linha de corte vetorial (curvas Bézier exatas), para uso NO SERVIDOR
 * (dentro das mesmas rotas de API que já geram o PDF — ex: /api/arte/adesivo).
 *
 * POR QUE NO SERVIDOR: o pipeline de produção do Adesivo/Folha de Recorte já
 * vive inteiramente no servidor (upload → Sharp → drawImageCmyk → PDF). Gerar
 * o EPS lá reaproveita os MESMOS dados de alta resolução e as MESMAS curvas
 * exatas que já alimentam o PDF — sem duplicar lógica de cálculo no cliente,
 * que só tem acesso a uma versão reduzida da imagem (art.previewDataUrl).
 *
 * Por isso este módulo usa `sharp` para amostragem/conversão de imagem, em
 * vez de HTMLCanvasElement/document (APIs de DOM que não existem em Node.js
 * puro) — sharp já está instalado e configurado no projeto
 * (serverExternalPackages no next.config.js).
 *
 * POR QUE EPS E NÃO CDR: o formato .cdr é proprietário e fechado — não há
 * especificação pública, e nenhuma biblioteca de terceiros consegue GRAVAR
 * um .cdr válido, só ler. EPS é aberto e documentado pela Adobe há décadas —
 * texto puro (PostScript), gerável sem libs externas nem licenças de
 * terceiros.
 *
 * Limitação aceita: EPS é página única — a imagem (arte) e a linha de corte
 * ficam sobrepostas no MESMO arquivo (confirmado como aceitável).
 *
 * Resolução da imagem embutida: 150 DPI (vs. 300 DPI do PDF) — decisão
 * deliberada porque os dados de imagem em PostScript puro são codificados
 * como STRING HEXADECIMAL no próprio texto do arquivo (sem compressão
 * binária possível) — 300 DPI geraria um arquivo ~4x maior. A linha de
 * corte permanece sempre vetorial e exata, independente da imagem.
 *
 * Sintaxe PostScript confirmada contra a especificação oficial da Adobe
 * (PostScript Language Reference Manual) e contra exemplos reais
 * funcionais da comunidade Adobe:
 *  - Cabeçalho DSC: %!PS-Adobe-3.0 EPSF-3.0 + %%BoundingBox
 *  - setcmykcolor: cor nativa CMYK para a linha de corte
 *  - image (com dicionário ImageType 1 + DeviceCMYK) para a imagem embutida
 *    — preferido sobre o operador legado "colorimage" por recomendação
 *    direta de consultoria especializada em PostScript ("using image with
 *    a dictionary is a much better approach than the colorimage operator")
 *  - ImageMatrix [width 0 0 -height 0 height]: inverte o eixo Y da imagem
 *    (dados vêm "de cima para baixo", espaço de imagem do PS é "de baixo
 *    para cima") — confirmado contra exemplo real funcional
 *  - ASCIIHexDecode: dados de imagem como hex, terminados por ">"
 *  - moveto / lineto / curveto: curveto recebe exatamente 6 números (2
 *    pontos de controle + 1 ponto final) — mesmo formato matemático das
 *    curvas Bézier cúbicas já usadas no drawSvgPath do PDF
 *
 * IMPORTANTE — eixo Y da PÁGINA: PostScript usa Y crescendo PARA CIMA,
 * origem no canto INFERIOR-esquerdo — o oposto do jsPDF (Y para baixo,
 * origem no canto superior-esquerdo). Todas as coordenadas Y são invertidas
 * (pageHeightPt - y) ao portar do sistema do PDF para o EPS.
 *
 * NÃO VALIDADO POR RENDERIZAÇÃO REAL — sem Ghostscript disponível no
 * ambiente de desenvolvimento. A sintaxe segue a especificação oficial,
 * mas a validação final só ocorre ao abrir o .eps num programa real
 * (Illustrator, Photoshop, CorelDRAW).
 */

import sharp from 'sharp';

const EPS_IMAGE_DPI = 150; // resolução da imagem embutida (corte permanece vetorial)
const PT_PER_MM = 72 / 25.4;

export interface EpsCutPath {
  /** Mesmo formato de comandos usado para montar o "d" do drawSvgPath:
   *  M = moveto absoluto, L = lineto absoluto, C = curveto absoluto (6 números),
   *  Z = closepath. Coordenadas em mm, no sistema do PDF (Y para baixo). */
  commands: Array<
    | { type: 'M' | 'L'; x: number; y: number }
    | { type: 'C'; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
    | { type: 'Z' }
  >;
  strokeColorCmyk: { c: number; m: number; y: number; k: number }; // 0–1
  strokeWidthMm: number;
}

export interface EpsImagePlacement {
  /** Buffer da imagem original (mesmo buffer já usado para drawImageCmyk no
   *  PDF) — qualquer formato que o sharp leia (PNG, JPEG, etc). */
  imageBuffer: Buffer;
  xMm: number; yMm: number; // canto superior-esquerdo, sistema do PDF (Y para baixo)
  widthMm: number; heightMm: number;
}

export interface EpsDocumentSpec {
  pageWidthMm: number;
  pageHeightMm: number;
  images: EpsImagePlacement[];
  cutPaths: EpsCutPath[];
}

// ─── Conversão RGB → CMYK (mesma fórmula simples já usada no resto do app) ──

function rgbToCmyk(r: number, g: number, b: number): [number, number, number, number] {
  if (r === 0 && g === 0 && b === 0) return [0, 0, 0, 1];
  const rf = r / 255, gf = g / 255, bf = b / 255;
  const k = 1 - Math.max(rf, gf, bf);
  const c = k === 1 ? 0 : (1 - rf - k) / (1 - k);
  const m = k === 1 ? 0 : (1 - gf - k) / (1 - k);
  const y = k === 1 ? 0 : (1 - bf - k) / (1 - k);
  return [c, m, y, k];
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const toHexByte = (v: number) => Math.round(clamp01(v) * 255).toString(16).padStart(2, '0');

// ─── Amostra a imagem (via sharp) em EPS_IMAGE_DPI e devolve os 4 planos CMYK em hex ──

async function sampleImageToHexCmyk(imageBuffer: Buffer, widthMm: number, heightMm: number) {
  const targetW = Math.max(1, Math.round((widthMm / 25.4) * EPS_IMAGE_DPI));
  const targetH = Math.max(1, Math.round((heightMm / 25.4) * EPS_IMAGE_DPI));

  // .raw() devolve pixels RGB(A) interleaved, left-to-right, top-to-bottom,
  // sem padding (confirmado na documentação oficial do sharp) — mesmo layout
  // do ImageData.data do canvas do navegador, então a conversão é idêntica.
  const { data, info } = await sharp(imageBuffer)
    .resize(targetW, targetH, { fit: 'fill' })
    .removeAlpha() // fundo já deve estar resolvido antes de chegar aqui (mesmo pipeline do PDF)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels; // 3 (RGB) após removeAlpha()
  let hex = '';
  for (let i = 0; i < data.length; i += channels) {
    const [c, m, y, k] = rgbToCmyk(data[i], data[i + 1], data[i + 2]);
    hex += toHexByte(c) + toHexByte(m) + toHexByte(y) + toHexByte(k);
  }
  return { width: targetW, height: targetH, hex };
}

// ─── Conversão de mm (sistema PDF, Y para baixo) para pt (sistema EPS, Y para cima) ──

function mmToEpsPt(xMm: number, yMm: number, pageHeightMm: number) {
  return {
    x: xMm * PT_PER_MM,
    y: (pageHeightMm - yMm) * PT_PER_MM, // inversão do eixo Y
  };
}

// ─── Path de corte → operadores PostScript ──────────────────────────────────

function cutPathToPostScript(path: EpsCutPath, pageHeightMm: number): string {
  const lines: string[] = [];
  const { c, m, y, k } = path.strokeColorCmyk;
  lines.push(`${c.toFixed(4)} ${m.toFixed(4)} ${y.toFixed(4)} ${k.toFixed(4)} setcmykcolor`);
  lines.push(`${(path.strokeWidthMm * PT_PER_MM).toFixed(3)} setlinewidth`);
  lines.push('newpath');

  for (const cmd of path.commands) {
    if (cmd.type === 'M') {
      const p = mmToEpsPt(cmd.x, cmd.y, pageHeightMm);
      lines.push(`${p.x.toFixed(3)} ${p.y.toFixed(3)} moveto`);
    } else if (cmd.type === 'L') {
      const p = mmToEpsPt(cmd.x, cmd.y, pageHeightMm);
      lines.push(`${p.x.toFixed(3)} ${p.y.toFixed(3)} lineto`);
    } else if (cmd.type === 'C') {
      const p1 = mmToEpsPt(cmd.x1, cmd.y1, pageHeightMm);
      const p2 = mmToEpsPt(cmd.x2, cmd.y2, pageHeightMm);
      const p = mmToEpsPt(cmd.x, cmd.y, pageHeightMm);
      lines.push(`${p1.x.toFixed(3)} ${p1.y.toFixed(3)} ${p2.x.toFixed(3)} ${p2.y.toFixed(3)} ${p.x.toFixed(3)} ${p.y.toFixed(3)} curveto`);
    } else if (cmd.type === 'Z') {
      lines.push('closepath');
    }
  }

  lines.push('stroke');
  return lines.join('\n');
}

// ─── Imagem → operador image (dicionário ImageType 1, DeviceCMYK) ──────────

async function imageToPostScript(img: EpsImagePlacement, pageHeightMm: number): Promise<string> {
  const { width, height, hex } = await sampleImageToHexCmyk(img.imageBuffer, img.widthMm, img.heightMm);

  const origin = mmToEpsPt(img.xMm, img.yMm + img.heightMm, pageHeightMm); // canto inferior-esquerdo da imagem no EPS
  const wPt = img.widthMm * PT_PER_MM;
  const hPt = img.heightMm * PT_PER_MM;

  const lines: string[] = [];
  lines.push('gsave');
  lines.push('/DeviceCMYK setcolorspace');
  lines.push(`[${wPt.toFixed(3)} 0 0 ${hPt.toFixed(3)} ${origin.x.toFixed(3)} ${origin.y.toFixed(3)}] concat`);
  lines.push('<<');
  lines.push('  /ImageType 1');
  lines.push(`  /Width ${width}`);
  lines.push(`  /Height ${height}`);
  lines.push('  /BitsPerComponent 8');
  lines.push(`  /ImageMatrix [${width} 0 0 -${height} 0 ${height}]`);
  lines.push('  /Decode [0 1 0 1 0 1 0 1]');
  lines.push('  /DataSource currentfile /ASCIIHexDecode filter');
  lines.push('>> image');
  lines.push(wrapHexData(hex));
  lines.push('>');
  lines.push('grestore');
  return lines.join('\n');
}

function wrapHexData(hex: string, lineLength = 200): string {
  const lines: string[] = [];
  for (let i = 0; i < hex.length; i += lineLength) {
    lines.push(hex.slice(i, i + lineLength));
  }
  return lines.join('\n');
}

// ─── Documento completo ──────────────────────────────────────────────────────

export async function buildEpsDocument(spec: EpsDocumentSpec): Promise<string> {
  const wPt = spec.pageWidthMm * PT_PER_MM;
  const hPt = spec.pageHeightMm * PT_PER_MM;

  const header = [
    '%!PS-Adobe-3.0 EPSF-3.0',
    `%%BoundingBox: 0 0 ${Math.ceil(wPt)} ${Math.ceil(hPt)}`,
    `%%HiResBoundingBox: 0 0 ${wPt.toFixed(3)} ${hPt.toFixed(3)}`,
    '%%Creator: ArteFinal',
    `%%CreationDate: ${new Date().toISOString()}`,
    '%%EndComments',
  ].join('\n');

  const body: string[] = [];
  for (const img of spec.images) body.push(await imageToPostScript(img, spec.pageHeightMm));
  for (const cut of spec.cutPaths) body.push(cutPathToPostScript(cut, spec.pageHeightMm));

  return [header, ...body, '%%EOF'].join('\n\n');
}

// ─── Helper para resposta da API: base64 do EPS, mesmo padrão usado pro PDF ──

export async function buildEpsBase64(spec: EpsDocumentSpec): Promise<string> {
  const epsText = await buildEpsDocument(spec);
  return Buffer.from(epsText, 'utf-8').toString('base64');
}