import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import QRCode from 'qrcode'
import sharp from 'sharp'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MINHAI_LOGO_URL = 'https://minhai.app/icons/icon-192x192.png'

async function fetchImageBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url)
  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

async function getLogoBuffer(companyId: string | null): Promise<Buffer | null> {
  try {
    let url = MINHAI_LOGO_URL

    if (companyId) {
      const { data } = await supabase
        .from('companies')
        .select('logo_url, plan')
        .eq('id', companyId)
        .single()

      const isPaidPlan = data?.plan === 'top' || data?.plan === 'consulting'
      if (isPaidPlan && data?.logo_url) {
        url = data.logo_url
      }
    }

    const res = await fetch(url, { redirect: 'follow' })
    if (!res.ok) return null
    const arrayBuffer = await res.arrayBuffer()
    const raw = Buffer.from(arrayBuffer)

    // Força conversão para PNG via sharp independente do formato original
    const png = await sharp(raw).png().toBuffer()
    return png
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const data      = searchParams.get('data')
  const color     = searchParams.get('color')  || '#000000'
  const bgColor   = searchParams.get('bg')     || '#ffffff'
  const size      = parseInt(searchParams.get('size') || '300')
  const companyId = searchParams.get('company_id') || null

  if (!data) {
    return NextResponse.json({ error: 'Parâmetro data é obrigatório' }, { status: 400 })
  }

  try {
    // Gera QR como PNG buffer
    const qrBuffer = await QRCode.toBuffer(data, {
      width: size,
      margin: 2,
      color: {
        dark: color,
        light: bgColor,
      },
      errorCorrectionLevel: 'H', // Alto — necessário para logo no meio
    })

    // Redimensiona o logo para 25% do tamanho do QR
    const logoSize = Math.floor(size * 0.25)
    const logoBuffer = await getLogoBuffer(companyId)

    const logoResized = await sharp(logoBuffer)
      .resize(logoSize, logoSize, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toBuffer()

    // Centraliza o logo sobre o QR
    const offset = Math.floor((size - logoSize) / 2)

    const finalBuffer = await sharp(qrBuffer)
      .composite([{
        input: logoResized,
        top: offset,
        left: offset,
      }])
      .png()
      .toBuffer()

    return new NextResponse(finalBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (err) {
    console.error('QR Code generation error:', err)
    return NextResponse.json({ error: 'Erro ao gerar QR code' }, { status: 500 })
  }
}