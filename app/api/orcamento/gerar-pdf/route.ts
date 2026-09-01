// app/api/orcamento/gerar-pdf/route.ts
// Recebe dados do orçamento, gera PDF com jsPDF e salva em companion_downloads
// Chamada pela edge meta-flow-orcamento quando completo=true

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { generateOrcamentoPDF } from '@/lib/generateOrcamentoPDF'

export async function POST(req: NextRequest) {
  try {
    const { company_id, company, orcamento } = await req.json()

    if (!company_id || !orcamento) {
      return NextResponse.json({ error: 'company_id e orcamento são obrigatórios' }, { status: 400 })
    }

    const supabase = createClient()

    // Busca company se não veio completo
    let companyInfo = company
    if (!companyInfo?.name) {
      const { data: c } = await supabase
        .from('companies')
        .select('name, slug, logo_url, webapp_theme_color')
        .eq('id', company_id)
        .single()
      companyInfo = c
    }

    if (!companyInfo) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })
    }

   // Gera QR Code PIX server-side usando qrcode + sharp (mesma lib da /api/qrcode)
    let pixQrBase64: string | undefined
    try {
      if (companyInfo.slug && orcamento.total > 0) {
        const QRCode = (await import('qrcode')).default
        const sharp = (await import('sharp')).default
        const pixUrl = `https://minhai.app/pix/${companyInfo.slug}/${Number(orcamento.total).toFixed(2)}`
        
        const qrSvg = await QRCode.toString(pixUrl, {
          type: 'svg', margin: 2,
          color: { dark: '#000000', light: '#ffffff' },
          errorCorrectionLevel: 'H', width: 150,
        })
        const qrBuffer = await sharp(Buffer.from(qrSvg)).resize(150, 150).png().toBuffer()
        pixQrBase64 = `data:image/png;base64,${qrBuffer.toString('base64')}`
      }
    } catch (qrErr: any) {
      console.warn('[GERAR PDF] QR Code falhou, continuando sem ele:', qrErr.message)
    }

    // Busca logo server-side para evitar falha do loadImageAsBase64 no servidor
    let logoBase64: string | undefined
    try {
      if (companyInfo.logo_url) {
        const logoRes = await fetch(companyInfo.logo_url, { redirect: 'follow' })
        if (logoRes.ok) {
          const logoBuffer = await logoRes.arrayBuffer()
          const ext = companyInfo.logo_url.match(/\.(png|jpg|jpeg|webp)/i)?.[1]?.toLowerCase() ?? 'png'
          const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : 'image/png'
          logoBase64 = `data:${mime};base64,${Buffer.from(logoBuffer).toString('base64')}`
        }
      }
    } catch (logoErr: any) {
      console.warn('[GERAR PDF] Logo falhou, continuando sem ela:', logoErr.message)
    }
    console.log('[GERAR PDF] logo_url recebida:', companyInfo.logo_url?.substring(0, 50))
    console.log('[GERAR PDF] logoBase64 gerado:', !!logoBase64, logoBase64?.substring(0, 30))

    const pdfDataUrl = await generateOrcamentoPDF(orcamento, {
      name:        companyInfo.name,
      slug:        companyInfo.slug,
      logo_url:    logoBase64 ?? companyInfo.logo_url,
      theme_color: companyInfo.webapp_theme_color || companyInfo.theme_color || '#3b82f6',
    }, pixQrBase64)

    console.log('[GERAR PDF] PDF gerado, tamanho:', pdfDataUrl?.length)

    // Nome do arquivo
    const clienteNome = orcamento.cliente?.nome
      ? orcamento.cliente.nome.toLowerCase().replace(/\s+/g, '-')
      : 'cliente'
    const data = new Date().toISOString().slice(0, 10)
    const fileName = `orcamento-${clienteNome}-${data}.pdf`

    // Salva em companion_downloads (expira em 1 hora — mais tempo que o padrão de 10min)
    const { data: download, error } = await supabase
      .from('companion_downloads')
      .insert({
        company_id:  company_id,
        file_name:   fileName,
        file_type:   'application/pdf',
        file_base64: pdfDataUrl,
        status:      'pending',
        expires_at:  new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hora
      })
      .select('token')
      .single()

    if (error || !download) {
      console.error('[ORCAMENTO GERAR PDF]', error?.message)
      return NextResponse.json({ error: 'Erro ao salvar PDF' }, { status: 500 })
    }

    return NextResponse.json({ token: download.token, fileName })

  } catch (err: any) {
    console.error('[ORCAMENTO GERAR PDF]', err.message)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
