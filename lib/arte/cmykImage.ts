// lib/arte/cmykImage.ts
//
// Embute uma imagem no PDF como DeviceCMYK CRU (FlateDecode), sem passar por JPEG.
// Motivo: o Sharp grava JPEG CMYK com marcador Adobe (invertido); ao embutir via
// pdf-lib.embedJpg, o pdf-lib adiciona /Decode [1 0 1 0 1 0 1 0] p/ compensar. Leitores
// de PDF lidam, mas o Corel inverte DE NOVO (inversão dupla) → branco vira preto, cor desanda.
// Embutindo CMYK cru (branco = 0,0,0,0, sem /Decode), a cor sai correta em todo lugar.

import sharp from 'sharp';
import zlib from 'node:zlib';
import {
  PDFDocument, PDFPage, PDFName, PDFNumber, PDFRawStream, PDFDict,
  pushGraphicsState, popGraphicsState, concatTransformationMatrix, drawObject,
} from 'pdf-lib';

export async function drawImageCmyk(
  doc: PDFDocument,
  page: PDFPage,
  srcBuf: Buffer,
  opts: { x: number; y: number; width: number; height: number; resizeWidth?: number },
): Promise<void> {
  let pipe = sharp(srcBuf).flatten({ background: '#ffffff' });
  if (opts.resizeWidth) pipe = pipe.resize({ width: opts.resizeWidth, withoutEnlargement: true });
  const { data, info } = await pipe.toColourspace('cmyk').raw().toBuffer({ resolveWithObject: true });

  const comp = zlib.deflateSync(data);
  const m = new Map<PDFName, any>();
  m.set(PDFName.of('Type'), PDFName.of('XObject'));
  m.set(PDFName.of('Subtype'), PDFName.of('Image'));
  m.set(PDFName.of('Width'), PDFNumber.of(info.width));
  m.set(PDFName.of('Height'), PDFNumber.of(info.height));
  m.set(PDFName.of('ColorSpace'), PDFName.of('DeviceCMYK'));
  m.set(PDFName.of('BitsPerComponent'), PDFNumber.of(8));
  m.set(PDFName.of('Filter'), PDFName.of('FlateDecode'));
  const stream = PDFRawStream.of(PDFDict.fromMapWithContext(m, doc.context), comp);
  const ref = doc.context.register(stream);

  const name = page.node.newXObject('Img', ref);
  page.pushOperators(
    pushGraphicsState(),
    concatTransformationMatrix(opts.width, 0, 0, opts.height, opts.x, opts.y),
    drawObject(name),
    popGraphicsState(),
  );
}
