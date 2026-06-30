'use client'
// app/tour/export/page.tsx
// Abre no Chrome desktop → aguarda verde → Ctrl+P → A4 Paisagem → Gráficos de fundo ativado

import { useState, useEffect } from 'react'

// ── Stage 1 — Apresentação ─────────────────────────────────────
import SceneIntro from '@/components/tour/scenes/SceneIntro'
import SceneAssistente from '@/components/tour/scenes/SceneAssistente'
import SceneWidget from '@/components/tour/scenes/SceneWidget'
import SceneWhatsApp from '@/components/tour/scenes/SceneWhatsApp'
import SceneInstagram from '@/components/tour/scenes/SceneInstagram'
import SceneMercadoLivre from '@/components/tour/scenes/SceneMercadoLivre'
import SceneMCP from '@/components/tour/scenes/SceneMCP'
import SceneWhatsAppMCP from '@/components/tour/scenes/SceneWhatsAppMCP'

// ── Stage 2 — Página do Assistente ────────────────────────────
import SceneCarrossel from '@/components/tour/scenes/SceneCarrossel'
import SceneQRCode from '@/components/tour/scenes/SceneQRCode'
import SceneVendas from '@/components/tour/scenes/SceneVendas'
import SceneFila from '@/components/tour/scenes/SceneFila'
import SceneTotem from '@/components/tour/scenes/SceneTotem'

// ── Stage 3 — Auxiliares de IA ────────────────────────────────
import SceneAuxiliaresIntro from '@/components/tour/scenes/SceneAuxiliaresIntro'
import SceneVendasAux from '@/components/tour/scenes/SceneVendasAux'
import SceneFiscal from '@/components/tour/scenes/SceneFiscal'
import SceneAgenda from '@/components/tour/scenes/SceneAgenda'
import SceneMidia from '@/components/tour/scenes/SceneMidia'
import SceneProducaoOrcamentos from '@/components/tour/scenes/SceneProducaoOrcamentos'
import SceneExtrasAux from '@/components/tour/scenes/SceneExtrasAux'

// ── Stage 4 — Do Zero ao Ar ───────────────────────────────────
import SceneCadastro from '@/components/tour/scenes/SceneCadastro'
import SceneWizard from '@/components/tour/scenes/SceneWizard'
import ScenePublicar from '@/components/tour/scenes/ScenePublicar'
import SceneConfig from '@/components/tour/scenes/SceneConfig'
import SceneWebApp from '@/components/tour/scenes/SceneWebApp'
import SceneIndicacao from '@/components/tour/scenes/SceneIndicacao'
import SceneConclusaoZero from '@/components/tour/scenes/SceneConclusaoZero'

// ── Stage 5 — Meu Dashboard ───────────────────────────────────
import SceneDashboardVisao from '@/components/tour/scenes/SceneDashboardVisao'
import SceneDashboardFuncoes from '@/components/tour/scenes/SceneDashboardFuncoes'
import SceneDashboardIntegracoes from '@/components/tour/scenes/SceneDashboardIntegracoes'
import SceneDashboardGestao from '@/components/tour/scenes/SceneDashboardGestao'
import SceneDashboardPerfil from '@/components/tour/scenes/SceneDashboardPerfil'
import SceneDashboardConclusao from '@/components/tour/scenes/SceneDashboardConclusao'

// ── Stage 6 — Modos de Cobrança ───────────────────────────────
import SceneCobrancaIntro from '@/components/tour/scenes/SceneCobrancaIntro'
import SceneCobrancaPix from '@/components/tour/scenes/SceneCobrancaPix'
import SceneCobrancaTef from '@/components/tour/scenes/SceneCobrancaTef'
import SceneCobrancaNfc from '@/components/tour/scenes/SceneCobrancaNfc'
import SceneCobrancaLink from '@/components/tour/scenes/SceneCobrancaLink'
import SceneCobrancaRecebimentos from '@/components/tour/scenes/SceneCobrancaRecebimentos'
import SceneCobrancaConclusao from '@/components/tour/scenes/SceneCobrancaConclusao'

// ── Stage 7 — Funções e Habilidades ──────────────────────────
import SceneFuncoesIntro from '@/components/tour/scenes/SceneFuncoesIntro'
import SceneFuncoesConhecimento from '@/components/tour/scenes/SceneFuncoesConhecimento'
import SceneFuncoesComercial from '@/components/tour/scenes/SceneFuncoesComercial'
import SceneFuncoesAgenda from '@/components/tour/scenes/SceneFuncoesAgenda'
import SceneFuncoesContato from '@/components/tour/scenes/SceneFuncoesContato'
import SceneFuncoesArquivos from '@/components/tour/scenes/SceneFuncoesArquivos'
import SceneFuncoesMidia from '@/components/tour/scenes/SceneFuncoesMidia'
import SceneFuncoesLocalizacao from '@/components/tour/scenes/SceneFuncoesLocalizacao'
import SceneFuncoesConclusao from '@/components/tour/scenes/SceneFuncoesConclusao'

// ── Stage 8 — Planos e Valores ────────────────────────────────
import ScenePlanosIntro from '@/components/tour/scenes/ScenePlanosIntro'
import ScenePlanosSmartMensal from '@/components/tour/scenes/ScenePlanosSmartMensal'
import ScenePlanosSmartCreditos from '@/components/tour/scenes/ScenePlanosSmartCreditos'
import ScenePlanosFullPlan from '@/components/tour/scenes/ScenePlanosFullPlan'
import ScenePlanosVendas from '@/components/tour/scenes/ScenePlanosVendas'
import ScenePlanosConclusao from '@/components/tour/scenes/ScenePlanosConclusao'

// ─────────────────────────────────────────────────────────────
// ESTRUTURA DO TOUR
// ─────────────────────────────────────────────────────────────
const STAGES = [
  {
    number: 1,
    title: 'Apresentação',
    subtitle: 'Multifuncional e Multicanal',
    color: '#3b82f6',
    scenes: [
      { id: 'intro',        label: 'Intro',         node: <SceneIntro isSpeaking={false} theme="light" /> },
      { id: 'assistente',   label: 'Assistente',    node: <SceneAssistente isSpeaking={false} theme="light" /> },
      { id: 'widget',       label: 'Widget Web',    node: <SceneWidget /> },
      { id: 'whatsapp',     label: 'WhatsApp',      node: <SceneWhatsApp /> },
      { id: 'instagram',    label: 'Instagram',     node: <SceneInstagram /> },
      { id: 'mercadolivre', label: 'Mercado Livre', node: <SceneMercadoLivre /> },
      { id: 'mcp',          label: 'Servidor MCP',  node: <SceneMCP /> },
      { id: 'whatsapp-mcp', label: 'WhatsApp MCP',  node: <SceneWhatsAppMCP /> },
      { id: 'outro',        label: 'Conclusão',     node: <SceneIntro isOutro isSpeaking={false} theme="light" /> },
    ],
  },
  {
    number: 2,
    title: 'Página do Assistente',
    subtitle: 'Apresentação, Modos e Funções',
    color: '#8b5cf6',
    scenes: [
      { id: 'assistente-intro',     label: 'Intro',     node: <SceneAssistente isSpeaking={false} theme="light" /> },
      { id: 'assistente-carrossel', label: 'Carrossel', node: <SceneCarrossel /> },
      { id: 'assistente-qrcode',    label: 'QR Code',   node: <SceneQRCode /> },
      { id: 'assistente-vendas',    label: 'Vendas',    node: <SceneVendas /> },
      { id: 'assistente-fila',      label: 'Fila',      node: <SceneFila /> },
      { id: 'assistente-totem',     label: 'Totem',     node: <SceneTotem isSpeaking={false} /> },
      { id: 'assistente-outro',     label: 'Conclusão', node: <SceneAssistente isSpeaking={false} theme="light" /> },
    ],
  },
  {
    number: 3,
    title: 'Auxiliares de IA',
    subtitle: 'Os 10 especialistas do seu negócio',
    color: '#10b981',
    scenes: [
      { id: 'auxiliares-intro',     label: 'Intro',     node: <SceneAuxiliaresIntro /> },
      { id: 'auxiliares-vendas',    label: 'Vendas',    node: <SceneVendasAux /> },
      { id: 'auxiliares-fiscal',    label: 'Fiscal',    node: <SceneFiscal /> },
      { id: 'auxiliares-agenda',    label: 'Agenda',    node: <SceneAgenda /> },
      { id: 'auxiliares-midia',     label: 'Mídia',     node: <SceneMidia /> },
      { id: 'auxiliares-producao',  label: 'Produção',  node: <SceneProducaoOrcamentos /> },
      { id: 'auxiliares-extras',    label: 'Extras',    node: <SceneExtrasAux /> },
      { id: 'auxiliares-conclusao', label: 'Conclusão', node: <SceneAuxiliaresIntro /> },
    ],
  },
  {
    number: 4,
    title: 'Do Zero ao Ar',
    subtitle: 'Crie e publique em minutos',
    color: '#f59e0b',
    scenes: [
      { id: 'zeroaoar-cadastro',  label: 'Cadastro',  node: <SceneCadastro /> },
      { id: 'zeroaoar-wizard',    label: 'Wizard',    node: <SceneWizard /> },
      { id: 'zeroaoar-publicar',  label: 'Publicar',  node: <ScenePublicar /> },
      { id: 'zeroaoar-config',    label: 'Config',    node: <SceneConfig /> },
      { id: 'zeroaoar-webapp',    label: 'Web App',   node: <SceneWebApp /> },
      { id: 'zeroaoar-indicacao', label: 'Indicação', node: <SceneIndicacao /> },
      { id: 'zeroaoar-conclusao', label: 'Conclusão', node: <SceneConclusaoZero /> },
    ],
  },
  {
    number: 5,
    title: 'Meu Dashboard',
    subtitle: 'Configurações, integrações e mais',
    color: '#06b6d4',
    scenes: [
      { id: 'dashboard-visao',       label: 'Visão Geral', node: <SceneDashboardVisao /> },
      { id: 'dashboard-funcoes',     label: 'Funções',     node: <SceneDashboardFuncoes /> },
      { id: 'dashboard-integracoes', label: 'Integrações', node: <SceneDashboardIntegracoes /> },
      { id: 'dashboard-gestao',      label: 'Gestão',      node: <SceneDashboardGestao /> },
      { id: 'dashboard-perfil',      label: 'Perfil',      node: <SceneDashboardPerfil /> },
      { id: 'dashboard-conclusao',   label: 'Conclusão',   node: <SceneDashboardConclusao /> },
    ],
  },
  {
    number: 6,
    title: 'Modos de Cobrança',
    subtitle: 'PIX, links e pagamentos',
    color: '#32bcad',
    scenes: [
      { id: 'cobranca-intro',        label: 'Intro',        node: <SceneCobrancaIntro /> },
      { id: 'cobranca-pix',          label: 'PIX',          node: <SceneCobrancaPix /> },
      { id: 'cobranca-tef',          label: 'TEF',          node: <SceneCobrancaTef /> },
      { id: 'cobranca-nfc',          label: 'NFC',          node: <SceneCobrancaNfc /> },
      { id: 'cobranca-link',         label: 'Links',        node: <SceneCobrancaLink /> },
      { id: 'cobranca-recebimentos', label: 'Recebimentos', node: <SceneCobrancaRecebimentos /> },
      { id: 'cobranca-conclusao',    label: 'Conclusão',    node: <SceneCobrancaConclusao /> },
    ],
  },
  {
    number: 7,
    title: 'Funções e Habilidades',
    subtitle: 'Conheça as categorias e funções',
    color: '#ec4899',
    scenes: [
      { id: 'funcoes-intro',        label: 'Intro',        node: <SceneFuncoesIntro /> },
      { id: 'funcoes-conhecimento', label: 'Conhecimento', node: <SceneFuncoesConhecimento /> },
      { id: 'funcoes-comercial',    label: 'Comercial',    node: <SceneFuncoesComercial /> },
      { id: 'funcoes-agenda',       label: 'Agenda',       node: <SceneFuncoesAgenda /> },
      { id: 'funcoes-contato',      label: 'Contato',      node: <SceneFuncoesContato /> },
      { id: 'funcoes-arquivos',     label: 'Arquivos',     node: <SceneFuncoesArquivos /> },
      { id: 'funcoes-midia',        label: 'Mídia',        node: <SceneFuncoesMidia /> },
      { id: 'funcoes-localizacao',  label: 'Localização',  node: <SceneFuncoesLocalizacao /> },
      { id: 'funcoes-conclusao',    label: 'Conclusão',    node: <SceneFuncoesConclusao /> },
    ],
  },
  {
    number: 8,
    title: 'Planos e Valores',
    subtitle: 'Smart, Vendas, Full e Créditos',
    color: '#b0cb1f',
    scenes: [
      { id: 'planos-intro',          label: 'Intro',        node: <ScenePlanosIntro /> },
      { id: 'planos-smart-mensal',   label: 'Smart Mensal', node: <ScenePlanosSmartMensal /> },
      { id: 'planos-smart-creditos', label: 'Créditos',     node: <ScenePlanosSmartCreditos /> },
      { id: 'planos-full',           label: 'Plano Full',   node: <ScenePlanosFullPlan /> },
      { id: 'planos-vendas',         label: 'Vendas',       node: <ScenePlanosVendas /> },
      { id: 'planos-conclusao',      label: 'Conclusão',    node: <ScenePlanosConclusao /> },
    ],
  },
]

// ─────────────────────────────────────────────────────────────
// COMPONENTE DE CENA INDIVIDUAL
// zoom (não transform: scale) → respeitado pelo print do browser
// A cena só entra no DOM depois de 5s para garantir animações completas
// ─────────────────────────────────────────────────────────────

// Scale: as cenas foram desenhadas para 800×450px
// Queremos que caibam em ~50% da largura A4 landscape (≈137mm ≈ 518px)
// 518 / 800 = 0.6475 → zoom: 0.648
// Altura resultante: 450 × 0.648 = 291.6px ≈ 292px
const SCENE_ZOOM = 0.648
const SCENE_H = Math.round(450 * SCENE_ZOOM)   // 292px

function ExportScene({
  node,
  label,
  stageNumber,
  sceneNumber,
  stageColor,
}: {
  node: React.ReactNode
  label: string
  stageNumber: number
  sceneNumber: number
  stageColor: string
}) {
  const [mounted, setMounted] = useState(false)

  // Monta a cena no DOM imediatamente, mas só "exibe" (remove o overlay)
  // após 5s — garante que as animações de entrada terminaram
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 5200)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      style={{
        width: '50%',
        padding: '3mm 4mm',
        boxSizing: 'border-box',
        pageBreakInside: 'avoid',
        breakInside: 'avoid',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Label ── sempre visível, nunca afetado por opacity */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          marginBottom: '2mm',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          fontSize: '7pt',
          color: '#374151',
          lineHeight: 1,
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: stageColor,
            color: 'white',
            borderRadius: '4px',
            padding: '2px 6px',
            fontSize: '6.5pt',
            fontWeight: 800,
            letterSpacing: '0.02em',
            flexShrink: 0,
          }}
        >
          {stageNumber}.{sceneNumber}
        </span>
        <span style={{ fontWeight: 600, color: '#1e293b' }}>{label}</span>
        {!mounted && (
          <span
            style={{
              marginLeft: 'auto',
              color: '#94a3b8',
              fontSize: '6pt',
              fontStyle: 'italic',
            }}
          >
            carregando...
          </span>
        )}
      </div>

      {/* ── Container da cena ── */}
      <div
        style={{
          width: '100%',
          height: `${SCENE_H}px`,
          borderRadius: '8px',
          overflow: 'hidden',
          border: `1.5px solid ${mounted ? '#e2e8f0' : '#f1f5f9'}`,
          background: '#f8fafc',
          position: 'relative',
          flexShrink: 0,
        }}
      >
        {/* Overlay de espera — some após 5s */}
        {!mounted && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(248,250,252,0.92)',
              zIndex: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                border: '3px solid #e2e8f0',
                borderTopColor: stageColor,
                animation: 'tourSpin 0.9s linear infinite',
              }}
            />
          </div>
        )}

        {/*
         * A cena usa CSS zoom (não transform: scale).
         * zoom reduz o espaço ocupado no layout e é respeitado pelo Chrome print.
         * transform: scale NÃO é respeitado na impressão.
         *
         * A cena interna assume 800px de largura. Com zoom: SCENE_ZOOM
         * ela ocupa 800 × SCENE_ZOOM px no layout = ≈518px (cabe em 50% A4 landscape).
         */}
        <div
          style={{
            width: '800px',
            height: '450px',
            // @ts-ignore — zoom é propriedade CSS válida mas não tipada no React
            zoom: SCENE_ZOOM,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          {node}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────────────────────
const TOTAL_SCENES = STAGES.reduce((acc, s) => acc + s.scenes.length, 0)
const READY_AFTER_MS = 5500

export default function TourExportPage() {
  const [allReady, setAllReady] = useState(false)
  const [countdown, setCountdown] = useState(6)

  useEffect(() => {
    // Countdown visual
    const interval = setInterval(() => {
      setCountdown(c => Math.max(0, c - 1))
    }, 1000)
    // Sinaliza pronto após READY_AFTER_MS
    const done = setTimeout(() => {
      setAllReady(true)
      clearInterval(interval)
    }, READY_AFTER_MS)
    return () => { clearInterval(interval); clearTimeout(done) }
  }, [])

  return (
    <>
      <style>{`
        /* ── Reset mínimo ── */
        *, *::before, *::after {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          padding: 0;
          background: #f1f5f9;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        /* ── Spinner ── */
        @keyframes tourSpin {
          to { transform: rotate(360deg); }
        }

        /* ── Configuração de impressão ── */
        @page {
          size: A4 landscape;
          margin: 8mm 6mm;
        }

        @media print {
          /* Remove barra de status */
          .no-print { display: none !important; }

          /* Remove padding de tela */
          body { background: white !important; padding-top: 0 !important; }
          .screen-padding { padding-top: 0 !important; }

          /* Cada bloco de stage começa em nova página */
          .stage-block { break-before: page; }
          .stage-block:first-child { break-before: avoid; }

          /* Cenas não quebram no meio */
          .scene-wrapper { break-inside: avoid; }

          /* Garante cores de fundo impressas */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          /* Remove overlay de loading na impressão */
          .loading-overlay { display: none !important; }

          /* zoom funciona no print do Chrome/Edge/Safari */
        }

        /* ── Layout de tela ── */
        @media screen {
          .page-sheet {
            background: white;
            margin: 12px auto;
            box-shadow: 0 2px 16px rgba(0,0,0,0.10);
            border-radius: 6px;
            /* A4 landscape: 297mm × 210mm → em tela mostramos proporcional */
            width: 1050px;
          }
        }
      `}</style>

      {/* ── Barra de status (só na tela) ── */}
      <div
        className="no-print"
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0,
          zIndex: 9999,
          height: '48px',
          background: allReady ? '#10b981' : '#3b82f6',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          fontSize: '13px',
          fontWeight: 600,
          transition: 'background 0.6s ease',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {allReady ? (
            <>
              <span style={{ fontSize: '16px' }}>✅</span>
              <span>
                Todas as {TOTAL_SCENES} cenas prontas —
                use <kbd style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '4px', padding: '1px 6px', fontSize: '12px' }}>Ctrl+P</kbd>,
                selecione <strong>A4 Paisagem</strong> e ative <strong>Gráficos de fundo</strong>
              </span>
            </>
          ) : (
            <>
              <span style={{ fontSize: '16px' }}>⏳</span>
              <span>
                Aguardando animações renderizarem... {countdown > 0 ? `(${countdown}s)` : 'finalizando...'}
              </span>
            </>
          )}
        </div>
        <button
          onClick={() => window.print()}
          disabled={!allReady}
          style={{
            background: allReady ? 'white' : 'rgba(255,255,255,0.4)',
            color: allReady ? '#10b981' : 'rgba(255,255,255,0.6)',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 20px',
            fontWeight: 800,
            fontSize: '13px',
            cursor: allReady ? 'pointer' : 'not-allowed',
            transition: 'all 0.3s ease',
            letterSpacing: '0.02em',
          }}
        >
          {allReady ? '🖨️ Imprimir PDF' : `Aguarde ${countdown}s...`}
        </button>
      </div>

      {/* ── Conteúdo ── */}
      <div
        className="screen-padding"
        style={{ paddingTop: '60px' }}
      >
        {STAGES.map((stage) => {
          // Agrupa cenas em pares (2 por folha)
          const pairs: (typeof stage.scenes)[] = []
          for (let i = 0; i < stage.scenes.length; i += 2) {
            pairs.push(stage.scenes.slice(i, i + 2))
          }

          return (
            <div key={stage.number} className="stage-block">
              {pairs.map((pair, pi) => (
                <div
                  key={pi}
                  className="page-sheet"
                  style={{
                    padding: '5mm 4mm 4mm',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* ── Cabeçalho ── */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginBottom: '3mm',
                      paddingBottom: '3mm',
                      borderBottom: `2px solid ${stage.color}30`,
                    }}
                  >
                    {/* Número do stage */}
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: stage.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 900,
                        fontSize: '15px',
                        flexShrink: 0,
                      }}
                    >
                      {stage.number}
                    </div>

                    {/* Título */}
                    <div>
                      <div
                        style={{
                          fontSize: '13pt',
                          fontWeight: 800,
                          color: '#0f172a',
                          lineHeight: 1.2,
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                        }}
                      >
                        {stage.title}
                        {pi > 0 && (
                          <span
                            style={{
                              fontSize: '8pt',
                              fontWeight: 500,
                              color: '#94a3b8',
                              marginLeft: '8px',
                            }}
                          >
                            (cont.)
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: '8pt',
                          color: '#64748b',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                        }}
                      >
                        {stage.subtitle}
                      </div>
                    </div>

                    {/* Logo / rodapé direito */}
                    <div
                      style={{
                        marginLeft: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: '2px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '9pt',
                          fontWeight: 800,
                          color: stage.color,
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                          letterSpacing: '-0.02em',
                        }}
                      >
                        minhAi
                      </span>
                      <span
                        style={{
                          fontSize: '6.5pt',
                          color: '#94a3b8',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                        }}
                      >
                        minhai.app · Tour Interativo
                      </span>
                    </div>
                  </div>

                  {/* ── Par de cenas ── */}
                  <div
                    className="scene-wrapper"
                    style={{
                      display: 'flex',
                      flex: 1,
                      alignItems: 'flex-start',
                    }}
                  >
                    {pair.map((scene) => (
                      <ExportScene
                        key={scene.id}
                        node={scene.node}
                        label={scene.label}
                        stageNumber={stage.number}
                        sceneNumber={stage.scenes.indexOf(scene) + 1}
                        stageColor={stage.color}
                      />
                    ))}
                    {/* Célula vazia se par ímpar (última cena sem par) */}
                    {pair.length === 1 && (
                      <div
                        style={{
                          width: '50%',
                          padding: '3mm 4mm',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <div
                          style={{
                            width: '100%',
                            height: `${SCENE_H}px`,
                            borderRadius: '8px',
                            border: '1.5px dashed #e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <span style={{ fontSize: '8pt', color: '#cbd5e1' }}>—</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        })}

        {/* ── Rodapé final (só na tela) ── */}
        <div
          className="no-print"
          style={{
            textAlign: 'center',
            padding: '24px',
            color: '#94a3b8',
            fontSize: '13px',
          }}
        >
          {TOTAL_SCENES} cenas · 8 stages · Tour Interativo minhAi
        </div>
      </div>
    </>
  )
}
