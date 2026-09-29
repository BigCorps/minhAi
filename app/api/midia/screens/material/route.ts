import fs from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { PDFDocument, StandardFonts, rgb, type PDFImage } from 'pdf-lib';
import { getUser } from '@/lib/supabase-server';
import { adminMidia } from '@/lib/midia/server';

export const runtime = 'nodejs';

const BLUE = rgb(0 / 255, 50 / 255, 149 / 255);
const RED = rgb(234 / 255, 13 / 255, 22 / 255);
const INK = rgb(15 / 255, 23 / 255, 42 / 255);
const MUTED = rgb(100 / 255, 116 / 255, 139 / 255);
const SOFT = rgb(247 / 255, 249 / 255, 255 / 255);
const BORDER = rgb(220 / 255, 228 / 255, 242 / 255);

function mm(value: number) {
  return value * 72 / 25.4;
}

function isPng(bytes: Uint8Array) {
  return bytes.length >= 8
    && bytes[0] === 0x89
    && bytes[1] === 0x50
    && bytes[2] === 0x4e
    && bytes[3] === 0x47
    && bytes[4] === 0x0d
    && bytes[5] === 0x0a
    && bytes[6] === 0x1a
    && bytes[7] === 0x0a;
}

function isJpeg(bytes: Uint8Array) {
  return bytes.length >= 3
    && bytes[0] === 0xff
    && bytes[1] === 0xd8
    && bytes[2] === 0xff;
}

async function embedBrandImage(pdf: PDFDocument, bytes: Buffer): Promise<PDFImage> {
  const raw = new Uint8Array(bytes);

  // O arquivo atual public/brands/midia/logo.png é, na prática, um JPEG.
  // Detectar pelo conteúdo evita que pdf-lib tente tratá-lo como PNG só
  // por causa da extensão do arquivo.
  if (isPng(raw)) return pdf.embedPng(raw);
  if (isJpeg(raw)) return pdf.embedJpg(raw);

  throw new Error('Logo Midia.Pro precisa ser PNG ou JPEG válido.');
}

function drawWrappedText({
  page,
  text,
  x,
  y,
  maxWidth,
  font,
  size,
  color,
  lineHeight,
}: {
  page: any;
  text: string;
  x: number;
  y: number;
  maxWidth: number;
  font: any;
  size: number;
  color: any;
  lineHeight: number;
}) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);

  lines.forEach((item, index) => {
    page.drawText(item, {
      x,
      y: y - index * lineHeight,
      size,
      font,
      color,
    });
  });

  return y - Math.max(0, lines.length - 1) * lineHeight;
}

export async function GET(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Faça login para continuar.' }, { status: 401 });

  const url = new URL(request.url);
  const screenId = String(url.searchParams.get('screenId') || '').trim();
  const format = url.searchParams.get('format') === 'a4' ? 'a4' : 'a5';

  if (!screenId) {
    return NextResponse.json({ error: 'Tela não informada.' }, { status: 400 });
  }

  const admin = adminMidia();

  const { data: publisher } = await admin
    .from('publishers')
    .select('id,slug,display_name,status')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!publisher) {
    return NextResponse.json({ error: 'Conta Midia.Pro não encontrada.' }, { status: 404 });
  }

  const { data: screen } = await admin
    .from('screens')
    .select('id,public_code,name,commercial_mode')
    .eq('id', screenId)
    .eq('publisher_id', publisher.id)
    .maybeSingle();

  if (!screen || !['partner', 'hybrid'].includes(screen.commercial_mode)) {
    return NextResponse.json(
      { error: 'Esta tela não participa da rede de anúncios.' },
      { status: 404 },
    );
  }

  try {
    const target = `https://${publisher.slug}.midia.pro/anuncie/${screen.public_code}`;

    const [qrPng, logoBytes] = await Promise.all([
      QRCode.toBuffer(target, {
        type: 'png',
        width: 1200,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: { dark: '#003295', light: '#FFFFFF' },
      }),
      fs.readFile(path.join(process.cwd(), 'public', 'brands', 'midia', 'logo.png')),
    ]);

    const pdf = await PDFDocument.create();

    // Ambos os materiais são horizontais/deitados:
    // A4 = 297 x 210 mm
    // A5 = 210 x 148 mm
    const pageSize = format === 'a4'
      ? [mm(297), mm(210)] as const
      : [mm(210), mm(148)] as const;

    const page = pdf.addPage(pageSize);
    const { width, height } = page.getSize();

    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const qr = await pdf.embedPng(qrPng);
    const logo = await embedBrandImage(pdf, logoBytes);

    const isA4 = format === 'a4';
    const margin = mm(isA4 ? 18 : 12);
    const topBar = mm(isA4 ? 10 : 8);
    const bottomBar = mm(isA4 ? 6 : 5);
    const gap = mm(isA4 ? 16 : 10);
    const qrSize = mm(isA4 ? 78 : 58);

    page.drawRectangle({ x: 0, y: 0, width, height, color: SOFT });
    page.drawRectangle({ x: 0, y: height - topBar, width, height: topBar, color: BLUE });
    page.drawRectangle({ x: 0, y: 0, width, height: bottomBar, color: RED });

    const qrX = width - margin - qrSize;
    const qrY = (height - qrSize) / 2 - mm(isA4 ? 2 : 1);

    const leftX = margin;
    const leftWidth = qrX - gap - leftX;

    // Logo no bloco esquerdo, sem competir com o QR.
    const logoMaxWidth = mm(isA4 ? 62 : 44);
    const logoMaxHeight = mm(isA4 ? 36 : 26);
    const logoScale = Math.min(
      logoMaxWidth / logo.width,
      logoMaxHeight / logo.height,
      1,
    );
    const logoWidth = logo.width * logoScale;
    const logoHeight = logo.height * logoScale;

    page.drawImage(logo, {
      x: leftX,
      y: height - topBar - margin - logoHeight + mm(isA4 ? 4 : 3),
      width: logoWidth,
      height: logoHeight,
    });

    const titleSize = isA4 ? 31 : 22;
    const priceSize = isA4 ? 18 : 13;
    const bodySize = isA4 ? 12 : 9;
    const detailSize = isA4 ? 10 : 7.5;

    const titleY = height - topBar - margin - logoHeight - mm(isA4 ? 13 : 9);

    page.drawText('ANUNCIE NESTA TELA', {
      x: leftX,
      y: titleY,
      size: titleSize,
      font: bold,
      color: INK,
    });

    page.drawText('A partir de R$ 4,90', {
      x: leftX,
      y: titleY - mm(isA4 ? 11 : 8),
      size: priceSize,
      font: bold,
      color: RED,
    });

    const bodyY = titleY - mm(isA4 ? 28 : 20);

    const lastBodyY = drawWrappedText({
      page,
      text: 'Escaneie o QR Code, escolha quando quer aparecer e acompanhe suas exibições.',
      x: leftX,
      y: bodyY,
      maxWidth: leftWidth,
      font: regular,
      size: bodySize,
      color: MUTED,
      lineHeight: mm(isA4 ? 6.2 : 4.8),
    });

    const badgeY = lastBodyY - mm(isA4 ? 13 : 9);
    const badgeHeight = mm(isA4 ? 14 : 10);
    const badgeWidth = Math.min(leftWidth, mm(isA4 ? 112 : 82));

    page.drawRectangle({
      x: leftX,
      y: badgeY - mm(isA4 ? 3 : 2),
      width: badgeWidth,
      height: badgeHeight,
      color: rgb(1, 1, 1),
      borderColor: BORDER,
      borderWidth: 1,
      borderRadius: mm(3),
    });

    const screenLine = `${screen.name} - ${publisher.display_name}`.slice(0, 76);
    page.drawText(screenLine, {
      x: leftX + mm(isA4 ? 5 : 3.5),
      y: badgeY + mm(isA4 ? 1.4 : 1),
      size: detailSize,
      font: bold,
      color: BLUE,
    });

    // QR com moldura branca.
    page.drawRectangle({
      x: qrX - mm(3),
      y: qrY - mm(3),
      width: qrSize + mm(6),
      height: qrSize + mm(6),
      color: rgb(1, 1, 1),
      borderColor: BORDER,
      borderWidth: 1.2,
      borderRadius: mm(3),
    });

    page.drawImage(qr, {
      x: qrX,
      y: qrY,
      width: qrSize,
      height: qrSize,
    });

    const qrLabel = 'APONTE A CÂMERA';
    const qrLabelWidth = bold.widthOfTextAtSize(qrLabel, detailSize);
    page.drawText(qrLabel, {
      x: qrX + (qrSize - qrLabelWidth) / 2,
      y: qrY - mm(isA4 ? 9 : 7),
      size: detailSize,
      font: bold,
      color: BLUE,
    });

    const hostLine = `${publisher.slug}.midia.pro/anuncie/${screen.public_code}`;
    const hostSize = isA4 ? 9.5 : 7;
    const hostWidth = regular.widthOfTextAtSize(hostLine, hostSize);

    page.drawText(hostLine, {
      x: Math.max(margin, width - margin - hostWidth),
      y: bottomBar + mm(isA4 ? 5 : 3.5),
      size: hostSize,
      font: regular,
      color: MUTED,
    });

    const bytes = await pdf.save();
    const filename = `midia-pro-anuncie-${screen.public_code}-${format}-horizontal.pdf`;

    return new NextResponse(Buffer.from(bytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('[midia/screens/material]', error);
    return NextResponse.json(
      { error: 'Não foi possível gerar o material desta tela.' },
      { status: 500 },
    );
  }
}
