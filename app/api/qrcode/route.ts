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

function getDefaultLogoBuffer(): Buffer {
  const logoPath = path.join(process.cwd(), 'public', 'icon192.png')
  return fs.readFileSync(logoPath)
}

async function getLogoBuffer(companyId: string | null): Promise<Buffer | null> {
  try {
    if (companyId) {
      const { data } = await supabase
        .from('companies')
        .select('logo_url, plan')
        .eq('id', companyId)
        .single()

      const isPaidPlan = data?.plan === 'top' || data?.plan === 'consulting'
      if (isPaidPlan && data?.logo_url) {
        const res = await fetch(data.logo_url, { redirect: 'follow' })
        if (res.ok) {
          const raw = Buffer.from(await res.arrayBuffer())
          return await sharp(raw).png().toBuffer()
        }
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
// Gera QR como SVG forçando rect
    const qrSvg = await QRCode.toString(data, {
      type: 'svg',
      margin: 2,
      color: {
        dark: color,
        light: bgColor,
      },
      errorCorrectionLevel: 'H',
      width: size,
      // @ts-ignore
      rendererOpts: { quality: 1 },
    })

    // O SVG usa viewBox "0 0 69 69" — unidade ~4.3px cada
    // Arredonda os paths convertendo para rect manualmente não é viável
    // Solução: pós-processar o SVG substituindo os <path stroke=...> por rect via regex no viewBox
    const unitSize = size / 69 // tamanho de cada célula em px reais

    // Extrai os pontos do path stroke e reconstrói como rects arredondados
    const qrSvgRounded = qrSvg
      .replace(/shape-rendering="crispEdges"/, '') // remove crisp para suavizar
      .replace(
        /<path stroke="([^"]+)" d="([^"]+)"\/>/g,
        (match, strokeColor, d) => {
          // Converte cada segmento "Mx y.5hN" em rects arredondados
          const rects: string[] = []
          const segments = d.match(/M(\d+) (\d+(?:\.\d+)?)h(\d+)/g) || []
          segments.forEach((seg: string) => {
            const m = seg.match(/M(\d+) (\d+(?:\.\d+)?)h(\d+)/)
            if (!m) return
            const x = parseFloat(m[1])
            const y = parseFloat(m[2]) - 0.5
            const w = parseFloat(m[3])
            // Gera um rect por célula
            for (let i = 0; i < w; i++) {
              rects.push(
                `<rect x="${x + i + 0.1}" y="${y + 0.1}" width="0.8" height="0.8" rx="0.2" ry="0.2" fill="${strokeColor}"/>`
              )
            }
          })
          return rects.join('')
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
