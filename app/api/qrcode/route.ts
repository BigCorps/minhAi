import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import QRCode from 'qrcode'
import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getLogoBuffer(companyId: string | null): Promise<Buffer | null> {
  try {
    let logoUrl: string | null = null

    if (companyId) {
      // Busca empresa + user_id
      const { data: company } = await supabase
        .from('companies')
        .select('webapp_logo_url, user_id')
        .eq('id', companyId)
        .single()

      if (company?.user_id) {
        // Busca plano pelo user_id
        const { data: credits } = await supabase
          .from('user_credits')
          .select('has_active_plan, active_plan_name, plan_expires_at')
          .eq('user_id', company.user_id)
          .single()

        const isPaidPlan =
          credits?.has_active_plan === true &&
          credits?.active_plan_name !== 'Trial' &&
          credits?.plan_expires_at != null &&
          new Date(credits.plan_expires_at) > new Date()

        console.log('QR DEBUG:', {
          companyId,
          user_id: company.user_id,
          active_plan_name: credits?.active_plan_name,
          isPaidPlan,
          webapp_logo_url: company.webapp_logo_url,
        })

        if (isPaidPlan && company.webapp_logo_url) {
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
    // Gera QR como SVG
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

    // Arredonda os pontos via rx/ry no SVG
    const qrSvgRounded = qrSvg.replace(
      /<rect([^/]*)\/>/g,
      (match, attrs) => {
        if (attrs.includes(`fill="${bgColor}"`) || attrs.includes(`width="${size}`)) {
          return match
        }
        return `<rect${attrs} rx="0.4" ry="0.4"/>`
      }
    )

    // Converte SVG para PNG
    const qrBuffer = await sharp(Buffer.from(qrSvgRounded))
      .resize(size, size)
      .png()
      .toBuffer()

    const logoBuffer = await getLogoBuffer(companyId)

    let finalBuffer: Buffer

    if (logoBuffer) {
      const logoSize = Math.floor(size * 0.25)
      const padding = 6

      // Fundo branco com padding
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

      // Logo redimensionado
      const logoResized = await sharp(logoBuffer)
        .resize(logoSize, logoSize, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .png()
        .toBuffer()

      // Logo sobre fundo branco
      const logoWithBg = await sharp(whiteBg)
        .composite([{ input: logoResized, top: padding, left: padding }])
        .png()
        .toBuffer()

      // Máscara circular
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

      // Centraliza logo sobre o QR
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
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (err) {
    console.error('QR Code generation error:', err)
    return NextResponse.json({ error: 'Erro ao gerar QR code' }, { status: 500 })
  }
}
