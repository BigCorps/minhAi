import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import QRCodeStyling from 'qr-code-styling'
import { createCanvas } from 'canvas'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MINHAI_LOGO_URL = 'https://minhai.app/icons/icon-192x192.png'

async function fetchImageAsBase64(url: string): Promise<string> {
  const res = await fetch(url)
  const buffer = await res.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')
  const mime = res.headers.get('content-type') || 'image/png'
  return `data:${mime};base64,${base64}`
}

async function getLogoForCompany(companyId: string | null): Promise<string> {
  if (!companyId) return await fetchImageAsBase64(MINHAI_LOGO_URL)

  const { data } = await supabase
    .from('companies')
    .select('logo_url, plan')
    .eq('id', companyId)
    .single()

  const isPaidPlan = data?.plan === 'top' || data?.plan === 'consulting'

  if (isPaidPlan && data?.logo_url) {
    return await fetchImageAsBase64(data.logo_url)
  }

  return await fetchImageAsBase64(MINHAI_LOGO_URL)
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const data     = searchParams.get('data')
  const color    = searchParams.get('color')    || '#000000'
  const bgColor  = searchParams.get('bg')       || '#ffffff'
  const size     = parseInt(searchParams.get('size') || '300')
  const companyId = searchParams.get('company_id') || null

  if (!data) {
    return NextResponse.json({ error: 'Parâmetro data é obrigatório' }, { status: 400 })
  }

  try {
    const logoBase64 = await getLogoForCompany(companyId)

    const qrCode = new QRCodeStyling({
      width: size,
      height: size,
      type: 'canvas',
      data: data,
      image: logoBase64,
      dotsOptions: {
        color: color,
        type: 'rounded',
      },
      cornersSquareOptions: {
        type: 'extra-rounded',
      },
      cornersDotOptions: {
        type: 'dot',
      },
      backgroundOptions: {
        color: bgColor,
      },
      imageOptions: {
        crossOrigin: 'anonymous',
        margin: 4,
        imageSize: 0.3,
      },
    })

    // qr-code-styling no Node precisa de canvas global
    const nodeCanvas = createCanvas(size, size)
    // @ts-ignore
    await qrCode.applyTo(nodeCanvas)

    const buffer = nodeCanvas.toBuffer('image/png')

    return new NextResponse(buffer, {
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