import fs from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { getUser } from '@/lib/supabase-server';
import { adminMidia } from '@/lib/midia/server';

export const runtime = 'nodejs';

const BLUE = rgb(0 / 255, 50 / 255, 149 / 255);
const RED = rgb(234 / 255, 13 / 255, 22 / 255);
const INK = rgb(15 / 255, 23 / 255, 42 / 255);
const MUTED = rgb(100 / 255, 116 / 255, 139 / 255);

function mm(value: number) {
  return value * 72 / 25.4;
}

function centeredX(text: string, font: any, size: number, width: number) {
  return Math.max(0, (width - font.widthOfTextAtSize(text, size)) / 2);
}

export async function GET(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Faça login para continuar.' }, { status: 401 });

  const url = new URL(request.url);
  const screenId = String(url.searchParams.get('screenId') || '').trim();
  const format = url.searchParams.get('format') === 'a4' ? 'a4' : 'a5';
  if (!screenId) return NextResponse.json({ error: 'Tela não informada.' }, { status: 400 });

  const admin = adminMidia();
  const { data: publisher } = await admin
    .from('publishers')
    .select('id,slug,display_name,status')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();
  if (!publisher) return NextResponse.json({ error: 'Conta Midia.Pro não encontrada.' }, { status: 404 });

  const { data: screen } = await admin
    .from('screens')
    .select('id,public_code,name,commercial_mode')
    .eq('id', screenId)
    .eq('publisher_id', publisher.id)
    .maybeSingle();
  if (!screen || !['partner', 'hybrid'].includes(screen.commercial_mode)) {
    return NextResponse.json({ error: 'Esta tela não participa da rede de anúncios.' }, { status: 404 });
  }

  const target = `https://${publisher.slug}.midia.pro/anuncie/${screen.public_code}`;
  const [qrPng, logoPng] = await Promise.all([
    QRCode.toBuffer(target, {
      type: 'png',
      width: 1000,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: { dark: '#003295', light: '#FFFFFF' },
    }),
    fs.readFile(path.join(process.cwd(), 'public', 'brands', 'midia', 'logo.png')),
  ]);

  const pdf = await PDFDocument.create();
  const pageSize = format === 'a4' ? [mm(210), mm(297)] as const : [mm(148), mm(210)] as const;
  const page = pdf.addPage(pageSize);
  const { width, height } = page.getSize();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const qr = await pdf.embedPng(qrPng);
  const logo = await pdf.embedPng(logoPng);

  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(1, 1, 1) });
  page.drawRectangle({ x: 0, y: height - mm(12), width, height: mm(12), color: BLUE });
  page.drawRectangle({ x: 0, y: 0, width, height: mm(8), color: RED });

  const margin = format === 'a4' ? mm(24) : mm(15);
  const contentWidth = width - margin * 2;
  const logoWidth = Math.min(contentWidth * 0.46, format === 'a4' ? mm(68) : mm(54));
  const logoHeight = logo.height / logo.width * logoWidth;
  page.drawImage(logo, {
    x: (width - logoWidth) / 2,
    y: height - mm(18) - logoHeight,
    width: logoWidth,
    height: logoHeight,
  });

  const titleSize = format === 'a4' ? 30 : 23;
  const subtitleSize = format === 'a4' ? 16 : 12;
  const smallSize = format === 'a4' ? 11 : 9;
  const title = 'ANUNCIE NESTA TELA';
  const price = 'A partir de R$ 4,90';
  const titleY = height - mm(format === 'a4' ? 72 : 55);

  page.drawText(title, { x: centeredX(title, bold, titleSize, width), y: titleY, size: titleSize, font: bold, color: INK });
  page.drawText(price, { x: centeredX(price, bold, subtitleSize, width), y: titleY - mm(10), size: subtitleSize, font: bold, color: RED });

  const qrSize = format === 'a4' ? mm(88) : mm(72);
  const qrY = titleY - mm(format === 'a4' ? 110 : 88);
  page.drawRectangle({
    x: (width - qrSize) / 2 - mm(3),
    y: qrY - mm(3),
    width: qrSize + mm(6),
    height: qrSize + mm(6),
    color: rgb(1,1,1),
    borderColor: rgb(0.85,0.89,0.96),
    borderWidth: 1,
  });
  page.drawImage(qr, { x: (width - qrSize) / 2, y: qrY, width: qrSize, height: qrSize });

  const scanText = 'Aponte a camera do celular e crie sua propaganda.';
  page.drawText(scanText, {
    x: centeredX(scanText, regular, smallSize, width),
    y: qrY - mm(9),
    size: smallSize,
    font: regular,
    color: MUTED,
  });

  const screenLine = `${screen.name} · ${publisher.display_name}`.slice(0, 80);
  page.drawText(screenLine, {
    x: centeredX(screenLine, bold, smallSize, width),
    y: qrY - mm(17),
    size: smallSize,
    font: bold,
    color: BLUE,
  });

  const hostLine = `${publisher.slug}.midia.pro/anuncie/${screen.public_code}`;
  const hostSize = format === 'a4' ? 9.5 : 7.5;
  page.drawText(hostLine, {
    x: centeredX(hostLine, regular, hostSize, width),
    y: mm(13),
    size: hostSize,
    font: regular,
    color: MUTED,
  });

  const bytes = await pdf.save();
  const filename = `midia-pro-anuncie-${screen.public_code}-${format}.pdf`;
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
