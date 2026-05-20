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

    // Gera o PDF usando a função existente (já inclui QR Code PIX no rodapé)
    const pdfDataUrl = await generateOrcamentoPDF(orcamento, {
      name:        companyInfo.name,
      slug:        companyInfo.slug,
      logo_url:    companyInfo.logo_url,
      theme_color: companyInfo.webapp_theme_color || companyInfo.theme_color || '#3b82f6',
    })

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
