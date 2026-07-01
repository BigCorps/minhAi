'use client'
// app/landing-export/page.tsx
// Exportação da Landing Page em PDF via html2canvas + jsPDF
// Mesmo padrão do app/tour/export/page.tsx: captura cada seção como
// imagem depois de um breve tempo de estabilização, monta um PDF A4
// paisagem com uma seção por folha — mas aqui SEM cabeçalho colorido,
// SEM legenda lateral e SEM texto de narração: cada folha é só a seção
// da landing em si, em tela cheia, no mesmo formato do site (tema claro).

import { useState, useEffect, useRef } from 'react'

import InicioSection from '@/components/landing/InicioSection'
import { StaticAvatarFace } from '@/components/landing/StaticAvatarFace'
import RecursoImageSlide from '@/components/landing/RecursoImageSlide'
import VantagensInfoSlide from '@/components/landing/VantagensInfoSlide'
import FuncaoCardsCarousel from '@/components/landing/FuncaoCardsCarousel'
import AssistentesSection from '@/components/landing/AssistentesSection'
import ProvasSociaisSection from '@/components/landing/ProvasSociaisSection'
import DepoimentosFaqSection from '@/components/landing/DepoimentosFaqSection'
import PrecosSection from '@/components/landing/PrecosSection'
import ContatoSection from '@/components/landing/ContatoSection'
import { DomainPreviewPicker } from '@/components/landing/DomainPreviewPicker'

// Dados reaproveitados diretamente da landing real — evita duplicar
// textos/ícones e garante que o PDF nunca fique desatualizado em
// relação ao site.
import {
  RECURSO_VANTAGENS_SLIDE,
  FUNCAO_TITULO,
  FUNCAO_DESCRICAO,
  FUNCAO_GRUPOS,
  INFO_COMPATIBILIDADE_SLIDE,
  VANTAGENS_INFO_SLIDE,
  VANTAGENS_INFO_CARDS,
} from '../page'

// ─────────────────────────────────────────────────────────────
// PÁGINAS DO PDF — uma seção da landing por folha, nessa ordem
// (mesma ordem física do scroll real do site)
// ─────────────────────────────────────────────────────────────
interface PdfPage {
  id: string
  node: React.ReactNode
}

const PDF_PAGES: PdfPage[] = [
  {
    id: 'inicio',
    node: (
      <InicioSection
        theme="light"
        staticCarouselWord="Aplicativo"
        avatarOverride={<StaticAvatarFace />}
      />
    ),
  },
  {
    id: 'recurso-vantagens',
    node: (
      <RecursoImageSlide
        theme="light"
        label={RECURSO_VANTAGENS_SLIDE.label}
        title={RECURSO_VANTAGENS_SLIDE.title}
        description={RECURSO_VANTAGENS_SLIDE.description}
        imageSrc={RECURSO_VANTAGENS_SLIDE.imageSrc}
        imageAlt={RECURSO_VANTAGENS_SLIDE.imageAlt}
        color={RECURSO_VANTAGENS_SLIDE.color}
        currentIndex={0}
        totalCount={1}
        hideDots
        extraContent={<DomainPreviewPicker isDark={false} />}
      />
    ),
  },
  {
    id: 'funcao-cards',
    node: (
      <FuncaoCardsCarousel
        theme="light"
        title={FUNCAO_TITULO}
        description={FUNCAO_DESCRICAO}
        groups={FUNCAO_GRUPOS}
      />
    ),
  },
  { id: 'assistentes', node: <AssistentesSection theme="light" /> },
  {
    id: 'info-compatibilidade',
    node: (
      <RecursoImageSlide
        theme="light"
        label={INFO_COMPATIBILIDADE_SLIDE.label}
        title={INFO_COMPATIBILIDADE_SLIDE.title}
        description={INFO_COMPATIBILIDADE_SLIDE.description}
        imageSrc={INFO_COMPATIBILIDADE_SLIDE.images}
        imageAlt={INFO_COMPATIBILIDADE_SLIDE.imageAlt}
        color={INFO_COMPATIBILIDADE_SLIDE.color}
        currentIndex={0}
        totalCount={1}
        hideDots
      />
    ),
  },
  {
    id: 'info-vantagens',
    node: (
      <VantagensInfoSlide
        theme="light"
        label={VANTAGENS_INFO_SLIDE.label}
        title={VANTAGENS_INFO_SLIDE.title}
        description={VANTAGENS_INFO_SLIDE.description}
        imageSrc={VANTAGENS_INFO_SLIDE.imageSrc}
        imageAlt={VANTAGENS_INFO_SLIDE.imageAlt}
        cards={VANTAGENS_INFO_CARDS}
      />
    ),
  },
  { id: 'provas-sociais', node: <ProvasSociaisSection theme="light" /> },
  { id: 'depoimentos-faq', node: <DepoimentosFaqSection theme="light" faqTitlesOnly /> },
  // Preços — 4 folhas: o estado inicial (título+imagem+frase+abas), e
  // cada uma das 3 versões com o overlay já aberto (initialPlan força o
  // estado sem precisar de clique).
  { id: 'precos', node: <PrecosSection theme="light" /> },
  { id: 'precos-smart', node: <PrecosSection theme="light" initialPlan="smart" /> },
  { id: 'precos-vendas', node: <PrecosSection theme="light" initialPlan="vendas" /> },
  { id: 'precos-full', node: <PrecosSection theme="light" initialPlan="full" /> },
  { id: 'contato', node: <ContatoSection theme="light" /> },
]

// ─────────────────────────────────────────────────────────────
// CONSTANTES DE LAYOUT — A4 paisagem, full-bleed (sem margens)
// ─────────────────────────────────────────────────────────────
const PDF_W_MM = 297
const PDF_H_MM = 210

// Tamanho de captura em pixels, na mesma proporção do A4 paisagem
// (297:210 ≈ 1.4142:1) — largo o suficiente para garantir que os
// estilos `md:`/`lg:` (versão desktop) do site sejam aplicados.
const CAPTURE_W = 1700
const CAPTURE_H = Math.round(CAPTURE_W * (PDF_H_MM / PDF_W_MM)) // 1202

export default function LandingExportPage() {
  const [status, setStatus] = useState<'waiting' | 'ready' | 'capturing' | 'done'>('waiting')
  const [countdown, setCountdown] = useState(2)
  const [progress, setProgress] = useState(0)
  const sectionRefsMap = useRef<Map<string, HTMLDivElement>>(new Map())

  // Tempo de estabilização curto (2s) — propositalmente MENOR que os
  // 5000ms de rotação automática das seções com imagem/carrossel
  // alternando (recurso-vantagens, info-compatibilidade, info-vantagens,
  // funcao-cards). Isso garante que a captura sempre pega o primeiro
  // quadro/grupo de cada uma, de forma previsível — nunca um estado
  // "no meio" da transição.
  useEffect(() => {
    const iv = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000)
    const t = setTimeout(() => { setStatus('ready'); clearInterval(iv) }, 2000)
    return () => { clearInterval(iv); clearTimeout(t) }
  }, [])

  const handleExport = async () => {
    setStatus('capturing')
    setProgress(0)

    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ])

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const total = PDF_PAGES.length

    for (let i = 0; i < total; i++) {
      const page = PDF_PAGES[i]
      const el = sectionRefsMap.current.get(page.id)
      if (!el) continue

      const canvas = await html2canvas(el, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        scale: 1.5,
        logging: false,
        imageTimeout: 0,
      })

      const imgData = canvas.toDataURL('image/jpeg', 0.92)

      if (i > 0) pdf.addPage()

      // Fundo branco de segurança (caso a imagem tenha alguma
      // transparência nas bordas)
      pdf.setFillColor(255, 255, 255)
      pdf.rect(0, 0, PDF_W_MM, PDF_H_MM, 'F')

      // Imagem full-bleed — cobre a folha inteira, sem margem,
      // sem cabeçalho, sem legenda. Só a seção da landing.
      pdf.addImage(imgData, 'JPEG', 0, 0, PDF_W_MM, PDF_H_MM)

      setProgress(Math.round(((i + 1) / total) * 100))
    }

    pdf.save('minhai-landing.pdf')
    setStatus('done')
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; padding: 0; background: #0f172a; font-family: system-ui, sans-serif; color: white; }
        .capture-zone { position: fixed; top: -9999px; left: -9999px; pointer-events: none; }

        /* Fundo 100% branco na captura — sem gradientes nem manchas decorativas.
           Cada seção da landing tem, como primeiro filho, um <div> com essa
           combinação exata de classes só pros círculos/gradientes de fundo
           (padrão consistente em todos os componentes). O seletor é
           propositalmente específico — NÃO usar [aria-hidden="true"] sozinho,
           que também pega spans de medida (ex: WordCarousel) e ícones SVG
           decorativos usados em várias seções, quebrando o layout deles. */
        .capture-zone div.pointer-events-none.overflow-hidden[aria-hidden="true"] { display: none !important; }
        .capture-zone > div > div {
          background: #ffffff !important;
          background-image: none !important;
        }
      `}</style>

      {/* ── Zona de captura — seções renderizadas fora da tela, sempre em tema claro ── */}
      <div className="capture-zone">
        {PDF_PAGES.map(page => (
          <div
            key={page.id}
            ref={el => { if (el) sectionRefsMap.current.set(page.id, el) }}
            style={{ width: `${CAPTURE_W}px`, height: `${CAPTURE_H}px`, overflow: 'hidden', background: '#ffffff' }}
          >
            {page.node}
          </div>
        ))}
      </div>

      {/* ── UI principal ── */}
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        gap: '32px',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '36pt', fontWeight: 900, color: '#3b82f6', letterSpacing: '-0.04em', lineHeight: 1 }}>
            minhAi
          </div>
          <div style={{ fontSize: '11pt', color: '#64748b', marginTop: '6px' }}>
            Landing Page — Exportar PDF
          </div>
        </div>

        <div style={{
          background: '#1e293b',
          borderRadius: '16px',
          padding: '32px 40px',
          width: '100%',
          maxWidth: '480px',
          textAlign: 'center',
          border: '1px solid #334155',
        }}>
          {status === 'waiting' && (
            <>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
              <div style={{ fontSize: '14pt', fontWeight: 700, marginBottom: '8px' }}>
                Aguardando estabilização
              </div>
              <div style={{ fontSize: '10pt', color: '#94a3b8', marginBottom: '24px' }}>
                As {PDF_PAGES.length} seções estão renderizando em segundo plano.
                <br />Aguarde {countdown}s.
              </div>
              <div style={{ background: '#0f172a', borderRadius: '99px', height: '6px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  background: '#3b82f6',
                  borderRadius: '99px',
                  width: `${((2 - countdown) / 2) * 100}%`,
                  transition: 'width 1s linear',
                }} />
              </div>
            </>
          )}

          {status === 'ready' && (
            <>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
              <div style={{ fontSize: '14pt', fontWeight: 700, marginBottom: '8px' }}>
                Pronto para exportar!
              </div>
              <div style={{ fontSize: '10pt', color: '#94a3b8', marginBottom: '28px' }}>
                {PDF_PAGES.length} folhas · A4 Paisagem · Tema claro
                <br />O PDF será gerado e baixado automaticamente.
              </div>
              <button
                onClick={handleExport}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '14px 36px',
                  fontSize: '13pt',
                  fontWeight: 800,
                  cursor: 'pointer',
                  width: '100%',
                  letterSpacing: '0.01em',
                  boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
                }}
              >
                🖨️ Exportar PDF
              </button>
            </>
          )}

          {status === 'capturing' && (
            <>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📸</div>
              <div style={{ fontSize: '14pt', fontWeight: 700, marginBottom: '8px' }}>
                Capturando seções...
              </div>
              <div style={{ fontSize: '10pt', color: '#94a3b8', marginBottom: '24px' }}>
                {progress}% concluído — não feche esta janela
              </div>
              <div style={{ background: '#0f172a', borderRadius: '99px', height: '8px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #3b82f6, #6366f1)',
                  borderRadius: '99px',
                  width: `${progress}%`,
                  transition: 'width 0.3s ease',
                }} />
              </div>
            </>
          )}

          {status === 'done' && (
            <>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
              <div style={{ fontSize: '14pt', fontWeight: 700, marginBottom: '8px' }}>
                PDF gerado com sucesso!
              </div>
              <div style={{ fontSize: '10pt', color: '#94a3b8', marginBottom: '28px' }}>
                O arquivo <strong style={{ color: '#e2e8f0' }}>minhai-landing.pdf</strong> foi baixado.
              </div>
              <button
                onClick={() => { setStatus('ready'); setProgress(0) }}
                style={{
                  background: '#1e293b',
                  color: '#94a3b8',
                  border: '1px solid #334155',
                  borderRadius: '10px',
                  padding: '10px 24px',
                  fontSize: '10pt',
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                Exportar novamente
              </button>
            </>
          )}
        </div>

        <div style={{ fontSize: '9pt', color: '#334155', textAlign: 'center', maxWidth: '400px' }}>
          Cada folha é uma seção da landing capturada com html2canvas — sem cabeçalho, sem legenda, só o formato real do site em tema claro.
        </div>
      </div>
    </>
  )
}