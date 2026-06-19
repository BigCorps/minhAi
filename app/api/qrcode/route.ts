import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import QRCode from 'qrcode'
import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

// ✅ Anon key — respeita RLS, não expõe dados sensíveis
const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function getDefaultLogoBuffer(): Buffer {
  // Tenta o logo da ArteFinal primeiro, cai no minhAi como segurança
  const artePath = path.join(process.cwd(), 'public', 'arte', 'arte.png')
  if (fs.existsSync(artePath)) return fs.readFileSync(artePath)
  const fallbackPath = path.join(process.cwd(), 'public', 'icon192.png')
  return fs.readFileSync(fallbackPath)
}

async function getLogoBuffer(companyId: string | null, overrideUrl?: string | null): Promise<Buffer | null> {
  try {
    let logoUrl: string | null = overrideUrl ?? null

    if (!logoUrl && companyId) {
      const { data: company } = await supabaseAnon
        .from('companies_qr_info')
        .select('webapp_logo_url, user_id')
        .eq('id', companyId)
        .single()

      if (company?.user_id) {
        const { data: isPaidResult } = await supabaseAnon
          .rpc('get_is_paid_plan', { p_user_id: company.user_id })

        const isPaid = isPaidResult === true

        if (isPaid && company.webapp_logo_url) {
          logoUrl = company.webapp_logo_url
        }
      }
    }

    if (logoUrl) {
      const res = await fetch(logoUrl, { redirect: 'follow' })
      if (res.ok) {
        const raw = Buffer.from(await res.arrayBuffer())
        return await sharp(raw).png().toBuffer()
      }
    }

    const raw = getDefaultLogoBuffer()
    return await sharp(raw).png().toBuffer()
  } catch {
    return null
  }
}

// ✅ Rate limiting simples por IP via cache em memória
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 30
const RATE_WINDOW = 60 * 1000

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW })
    return true
  }

  if (entry.count >= RATE_LIMIT) return false

  entry.count++
  return true
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!checkRateLimit(ip)) {
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: { 'Retry-After': '60' },
    })
  }

  const { searchParams } = new URL(req.url)

  const data      = searchParams.get('data')
  const color     = searchParams.get('color')  || '#000000'
  const bgColor   = searchParams.get('bg')     || '#ffffff'
  const size      = Math.min(parseInt(searchParams.get('size') || '300'), 500)
  const companyId = searchParams.get('company_id') || null
  const noLogo    = searchParams.get('no_logo') === '1'
  const logoUrl   = searchParams.get('logo_url') || null
  
  if (!data) {
    return NextResponse.json({ error: 'Parâmetro data é obrigatório' }, { status: 400 })
  }

  if (data.length > 2000) {
    return NextResponse.json({ error: 'Conteúdo muito longo' }, { status: 400 })
  }

  if (companyId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(companyId)) {
    return NextResponse.json({ error: 'company_id inválido' }, { status: 400 })
  }

  try {
    const qrSvg = await QRCode.toString(data, {
      type: 'svg',
      margin: 2,
      color: {
        dark: color,
        light: bgColor,
      },
      errorCorrectionLevel: 'H',
      width: size,
    })

    const qrSvgRounded = qrSvg.replace(
      /<rect([^/]*)\/>/g,
      (match, attrs) => {
        if (attrs.includes(`fill="${bgColor}"`) || attrs.includes(`width="${size}`)) {
          return match
        }
        return `<rect${attrs} rx="0.4" ry="0.4"/>`
      }
    )

    const qrBuffer = await sharp(Buffer.from(qrSvgRounded))
      .resize(size, size)
      .png()
      .toBuffer()

    const logoBuffer = noLogo ? null : await getLogoBuffer(companyId, logoUrl)

    let finalBuffer: Buffer

    if (logoBuffer) {
      const logoSize = Math.floor(size * 0.25)
      const padding = 6

      const whiteBg = await sharp({
        create: {
          width: logoSize + padding * 2,
          height: logoSize + padding * 2,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        }
      })
      .png()
      .toBuffer()

      const logoResized = await sharp(logoBuffer)
        .resize(logoSize, logoSize, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .png()
        .toBuffer()

      const logoWithBg = await sharp(whiteBg)
        .composite([{ input: logoResized, top: padding, left: padding }])
        .png()
        .toBuffer()

      const totalSize = logoSize + padding * 2
      const circleMask = Buffer.from(
        `<svg width="${totalSize}" height="${totalSize}">
          <circle cx="${totalSize / 2}" cy="${totalSize / 2}" r="${totalSize / 2}" fill="white"/>
        </svg>`
      )

      const logoRounded = await sharp(logoWithBg)
        .composite([{ input: circleMask, blend: 'dest-in' }])
        .png()
        .toBuffer()

      const offset = Math.floor((size - totalSize) / 2)

      finalBuffer = await sharp(qrBuffer)
        .composite([{ input: logoRounded, top: offset, left: offset }])
        .png()
        .toBuffer()
    } else {
      finalBuffer = qrBuffer
    }

    return new NextResponse(finalBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (err) {
    console.error('QR Code generation error:', err)
    return NextResponse.json({ error: 'Erro ao gerar QR code' }, { status: 500 })
  }
}
