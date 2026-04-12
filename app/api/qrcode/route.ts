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
  const logoPath = path.join(process.cwd(), 'public', 'icon192.png')
  return fs.readFileSync(logoPath)
}

async function getLogoBuffer(companyId: string | null): Promise<Buffer | null> {
  try {
    let logoUrl: string | null = null

    if (companyId) {
      // ✅ View pública — só expõe webapp_logo_url e user_id
      const { data: company } = await supabaseAnon
        .from('companies_qr_info')
        .select('webapp_logo_url, user_id')
        .eq('id', companyId)
        .single()

      if (company?.user_id) {
        // ✅ View pública de créditos — só expõe o necessário
        const { data: credits } = await supabaseAnon
          .from('user_credits_qr_info')
          .select('is_paid_plan')
          .eq('user_id', company.user_id)
          .single()

        if (credits?.is_paid_plan && company.webapp_logo_url) {
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
const RATE_LIMIT = 30 // requests
const RATE_WINDOW = 60 * 1000 // 1 minuto

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
  // ✅ Rate limiting por IP
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
  const size      = Math.min(parseInt(searchParams.get('size') || '300'), 500) // ✅ Limita tamanho máximo
  const companyId = searchParams.get('company_id') || null

  if (!data) {
    return NextResponse.json({ error: 'Parâmetro data é obrigatório' }, { status: 400 })
  }

  // ✅ Limita tamanho do conteúdo do QR
  if (data.length > 2000) {
    return NextResponse.json({ error: 'Conteúdo muito longo' }, { status: 400 })
  }

  // ✅ Valida companyId como UUID para evitar injeção
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

    const logoBuffer = await getLogoBuffer(companyId)

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
        'Cache-Control': 'no-store', // ✅ Sem cache público
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (err) {
    console.error('QR Code generation error:', err)
    return NextResponse.json({ error: 'Erro ao gerar QR code' }, { status: 500 })
  }
}