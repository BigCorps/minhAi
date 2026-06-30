'use client'
// app/tour/export/page.tsx
// Abre no browser → Ctrl+P → Salvar como PDF → A4 Paisagem

import { useState, useEffect } from 'react'

// ── Cenas ──────────────────────────────────────────────────────
// Stage 1 — Apresentação
import SceneIntro from '@/components/tour/scenes/SceneIntro'
import SceneAssistente from '@/components/tour/scenes/SceneAssistente'
import SceneWidget from '@/components/tour/scenes/SceneWidget'
import SceneWhatsApp from '@/components/tour/scenes/SceneWhatsApp'
import SceneInstagram from '@/components/tour/scenes/SceneInstagram'
import SceneMercadoLivre from '@/components/tour/scenes/SceneMercadoLivre'
import SceneMCP from '@/components/tour/scenes/SceneMCP'
import SceneWhatsAppMCP from '@/components/tour/scenes/SceneWhatsAppMCP'

// Stage 2 — Página do Assistente
import SceneCarrossel from '@/components/tour/scenes/SceneCarrossel'
import SceneQRCode from '@/components/tour/scenes/SceneQRCode'
import SceneVendas from '@/components/tour/scenes/SceneVendas'
import SceneFila from '@/components/tour/scenes/SceneFila'
import SceneTotem from '@/components/tour/scenes/SceneTotem'

// Stage 3 — Auxiliares de IA
import SceneAuxiliaresIntro from '@/components/tour/scenes/SceneAuxiliaresIntro'
import SceneVendasAux from '@/components/tour/scenes/SceneVendasAux'
import SceneFiscal from '@/components/tour/scenes/SceneFiscal'
import SceneAgenda from '@/components/tour/scenes/SceneAgenda'
import SceneMidia from '@/components/tour/scenes/SceneMidia'
import SceneProducaoOrcamentos from '@/components/tour/scenes/SceneProducaoOrcamentos'
import SceneExtrasAux from '@/components/tour/scenes/SceneExtrasAux'

// Stage 4 — Do Zero ao Ar
import SceneCadastro from '@/components/tour/scenes/SceneCadastro'
import SceneWizard from '@/components/tour/scenes/SceneWizard'
import ScenePublicar from '@/components/tour/scenes/ScenePublicar'
import SceneConfig from '@/components/tour/scenes/SceneConfig'
import SceneWebApp from '@/components/tour/scenes/SceneWebApp'
import SceneIndicacao from '@/components/tour/scenes/SceneIndicacao'
import SceneConclusaoZero from '@/components/tour/scenes/SceneConclusaoZero'

// Stage 5 — Meu Dashboard
import SceneDashboardVisao from '@/components/tour/scenes/SceneDashboardVisao'
import SceneDashboardFuncoes from '@/components/tour/scenes/SceneDashboardFuncoes'
import SceneDashboardIntegracoes from '@/components/tour/scenes/SceneDashboardIntegracoes'
import SceneDashboardGestao from '@/components/tour/scenes/SceneDashboardGestao'
import SceneDashboardPerfil from '@/components/tour/scenes/SceneDashboardPerfil'
import SceneDashboardConclusao from '@/components/tour/scenes/SceneDashboardConclusao'

// Stage 6 — Modos de Cobrança
import SceneCobrancaIntro from '@/components/tour/scenes/SceneCobrancaIntro'
import SceneCobrancaPix from '@/components/tour/scenes/SceneCobrancaPix'
import SceneCobrancaTef from '@/components/tour/scenes/SceneCobrancaTef'
import SceneCobrancaNfc from '@/components/tour/scenes/SceneCobrancaNfc'
import SceneCobrancaLink from '@/components/tour/scenes/SceneCobrancaLink'
import SceneCobrancaRecebimentos from '@/components/tour/scenes/SceneCobrancaRecebimentos'
import SceneCobrancaConclusao from '@/components/tour/scenes/SceneCobrancaConclusao'

// Stage 7 — Funções e Habilidades
import SceneFuncoesIntro from '@/components/tour/scenes/SceneFuncoesIntro'
import SceneFuncoesConhecimento from '@/components/tour/scenes/SceneFuncoesConhecimento'
import SceneFuncoesComercial from '@/components/tour/scenes/SceneFuncoesComercial'
import SceneFuncoesAgenda from '@/components/tour/scenes/SceneFuncoesAgenda'
import SceneFuncoesContato from '@/components/tour/scenes/SceneFuncoesContato'
import SceneFuncoesArquivos from '@/components/tour/scenes/SceneFuncoesArquivos'
import SceneFuncoesMidia from '@/components/tour/scenes/SceneFuncoesMidia'
import SceneFuncoesLocalizacao from '@/components/tour/scenes/SceneFuncoesLocalizacao'
import SceneFuncoesConclusao from '@/components/tour/scenes/SceneFuncoesConclusao'

// Stage 8 — Planos e Valores
import ScenePlanosIntro from '@/components/tour/scenes/ScenePlanosIntro'
import ScenePlanosSmartMensal from '@/components/tour/scenes/ScenePlanosSmartMensal'
import ScenePlanosSmartCreditos from '@/components/tour/scenes/ScenePlanosSmartCreditos'
import ScenePlanosFullPlan from '@/components/tour/scenes/ScenePlanosFullPlan'
import ScenePlanosVendas from '@/components/tour/scenes/ScenePlanosVendas'
import ScenePlanosConclusao from '@/components/tour/scenes/ScenePlanosConclusao'

// ── Estrutura do tour ──────────────────────────────────────────
const STAGES = [
  {
    number: 1,
    title: 'Apresentação',
    subtitle: 'Multifuncional e Multicanal',
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
    scenes: [
      { id: 'assistente-intro',     label: 'Intro',      node: <SceneAssistente isSpeaking={false} theme="light" /> },
      { id: 'assistente-carrossel', label: 'Carrossel',  node: <SceneCarrossel /> },
      { id: 'assistente-qrcode',    label: 'QR Code',    node: <SceneQRCode /> },
      { id: 'assistente-vendas',    label: 'Vendas',     node: <SceneVendas /> },
      { id: 'assistente-fila',      label: 'Fila',       node: <SceneFila /> },
      { id: 'assistente-totem',     label: 'Totem',      node: <SceneTotem isSpeaking={false} /> },
      { id: 'assistente-outro',     label: 'Conclusão',  node: <SceneAssistente isSpeaking={false} theme="light" /> },
    ],
  },
  {
    number: 3,
    title: 'Auxiliares de IA',
    subtitle: 'Os 10 especialistas do seu negócio',
    scenes: [
      { id: 'auxiliares-intro',     label: 'Intro',       node: <SceneAuxiliaresIntro /> },
      { id: 'auxiliares-vendas',    label: 'Vendas',      node: <SceneVendasAux /> },
      { id: 'auxiliares-fiscal',    label: 'Fiscal',      node: <SceneFiscal /> },
      { id: 'auxiliares-agenda',    label: 'Agenda',      node: <SceneAgenda /> },
      { id: 'auxiliares-midia',     label: 'Mídia',       node: <SceneMidia /> },
      { id: 'auxiliares-producao',  label: 'Produção',    node: <SceneProducaoOrcamentos /> },
      { id: 'auxiliares-extras',    label: 'Extras',      node: <SceneExtrasAux /> },
      { id: 'auxiliares-conclusao', label: 'Conclusão',   node: <SceneAuxiliaresIntro /> },
    ],
  },
  {
    number: 4,
    title: 'Do Zero ao Ar',
    subtitle: 'Crie e publique em minutos',
    scenes: [
      { id: 'zeroaoar-cadastro',  label: 'Cadastro',   node: <SceneCadastro /> },
      { id: 'zeroaoar-wizard',    label: 'Wizard',     node: <SceneWizard /> },
      { id: 'zeroaoar-publicar',  label: 'Publicar',   node: <ScenePublicar /> },
      { id: 'zeroaoar-config',    label: 'Config',     node: <SceneConfig /> },
      { id: 'zeroaoar-webapp',    label: 'Web App',    node: <SceneWebApp /> },
      { id: 'zeroaoar-indicacao', label: 'Indicação',  node: <SceneIndicacao /> },
      { id: 'zeroaoar-conclusao', label: 'Conclusão',  node: <SceneConclusaoZero /> },
    ],
  },
  {
    number: 5,
    title: 'Meu Dashboard',
    subtitle: 'Configurações, integrações e mais',
    scenes: [
      { id: 'dashboard-visao',       label: 'Visão Geral',   node: <SceneDashboardVisao /> },
      { id: 'dashboard-funcoes',     label: 'Funções',       node: <SceneDashboardFuncoes /> },
      { id: 'dashboard-integracoes', label: 'Integrações',   node: <SceneDashboardIntegracoes /> },
      { id: 'dashboard-gestao',      label: 'Gestão',        node: <SceneDashboardGestao /> },
      { id: 'dashboard-perfil',      label: 'Perfil',        node: <SceneDashboardPerfil /> },
      { id: 'dashboard-conclusao',   label: 'Conclusão',     node: <SceneDashboardConclusao /> },
    ],
  },
  {
    number: 6,
    title: 'Modos de Cobrança',
    subtitle: 'PIX, links e pagamentos',
    scenes: [
      { id: 'cobranca-intro',        label: 'Intro',         node: <SceneCobrancaIntro /> },
      { id: 'cobranca-pix',          label: 'PIX',           node: <SceneCobrancaPix /> },
      { id: 'cobranca-tef',          label: 'TEF',           node: <SceneCobrancaTef /> },
      { id: 'cobranca-nfc',          label: 'NFC',           node: <SceneCobrancaNfc /> },
      { id: 'cobranca-link',         label: 'Links',         node: <SceneCobrancaLink /> },
      { id: 'cobranca-recebimentos', label: 'Recebimentos',  node: <SceneCobrancaRecebimentos /> },
      { id: 'cobranca-conclusao',    label: 'Conclusão',     node: <SceneCobrancaConclusao /> },
    ],
  },
  {
    number: 7,
    title: 'Funções e Habilidades',
    subtitle: 'Conheça as categorias e funções',
    scenes: [
      { id: 'funcoes-intro',        label: 'Intro',         node: <SceneFuncoesIntro /> },
      { id: 'funcoes-conhecimento', label: 'Conhecimento',  node: <SceneFuncoesConhecimento /> },
      { id: 'funcoes-comercial',    label: 'Comercial',     node: <SceneFuncoesComercial /> },
      { id: 'funcoes-agenda',       label: 'Agenda',        node: <SceneFuncoesAgenda /> },
      { id: 'funcoes-contato',      label: 'Contato',       node: <SceneFuncoesContato /> },
      { id: 'funcoes-arquivos',     label: 'Arquivos',      node: <SceneFuncoesArquivos /> },
      { id: 'funcoes-midia',        label: 'Mídia',         node: <SceneFuncoesMidia /> },
      { id: 'funcoes-localizacao',  label: 'Localização',   node: <SceneFuncoesLocalizacao /> },
      { id: 'funcoes-conclusao',    label: 'Conclusão',     node: <SceneFuncoesConclusao /> },
    ],
  },
  {
    number: 8,
    title: 'Planos e Valores',
    subtitle: 'Smart, Vendas, Full e Créditos',
    scenes: [
      { id: 'planos-intro',          label: 'Intro',         node: <ScenePlanosIntro /> },
      { id: 'planos-smart-mensal',   label: 'Smart Mensal',  node: <ScenePlanosSmartMensal /> },
      { id: 'planos-smart-creditos', label: 'Créditos',      node: <ScenePlanosSmartCreditos /> },
      { id: 'planos-full',           label: 'Plano Full',    node: <ScenePlanosFullPlan /> },
      { id: 'planos-vendas',         label: 'Vendas',        node: <ScenePlanosVendas /> },
      { id: 'planos-conclusao',      label: 'Conclusão',     node: <ScenePlanosConclusao /> },
    ],
  },
]

// ── Componente de cena individual ──────────────────────────────
// Monta a cena, aguarda 5s, então sinaliza "pronto"
function ExportScene({ node, label, stageNumber, sceneNumber }: {
  node: React.ReactNode
  label: string
  stageNumber: number
  sceneNumber: number
}) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 5000)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      className="export-scene"
      style={{
        width: '50%',
        padding: '6mm',
        boxSizing: 'border-box',
        pageBreakInside: 'avoid',
        breakInside: 'avoid',
      }}
    >
      {/* Label da cena */}
      <div style={{
        fontSize: '7pt',
        color: '#64748b',
        marginBottom: '3mm',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
      }}>
        <span style={{
          background: '#e2e8f0',
          borderRadius: '4px',
          padding: '1px 5px',
          fontSize: '6pt',
          fontWeight: 700,
          color: '#475569',
        }}>
          {stageNumber}.{sceneNumber}
        </span>
        {label}
        {!ready && (
          <span style={{ color: '#94a3b8', fontSize: '6pt', marginLeft: 'auto' }}>
            aguardando animação...
          </span>
        )}
      </div>

      {/* Wrapper da cena com proporção fixa */}
      <div style={{
        width: '100%',
        height: '90mm',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid #e2e8f0',
        background: '#f8fafc',
        opacity: ready ? 1 : 0.3,
        transition: 'opacity 0.5s ease',
      }}>
        {/* Escala para caber na caixa: as cenas foram feitas para ~800px de largura */}
        <div style={{
          width: '800px',
          height: '450px',
          transformOrigin: 'top left',
          transform: 'scale(0.42)',
          // 800 * 0.42 = 336px → cabe em 50% de A4 landscape (~420px úteis)
        }}>
          {node}
        </div>
      </div>
    </div>
  )
}

// ── Página de exportação ───────────────────────────────────────
export default function TourExportPage() {
  const [readyCount, setReadyCount] = useState(0)
  const totalScenes = STAGES.reduce((acc, s) => acc + s.scenes.length, 0)

  // Conta cenas prontas a cada segundo para mostrar progresso
  useEffect(() => {
    const interval = setInterval(() => {
      const els = document.querySelectorAll('.export-scene')
      let count = 0
      els.forEach(el => {
        const box = el.querySelector('[style*="opacity: 1"]') ||
          el.querySelector('div[style*="opacity:1"]')
        // Fallback: depois de 5s todas estão prontas
        count++
      })
    }, 1000)
    const done = setTimeout(() => {
      setReadyCount(totalScenes)
      clearInterval(interval)
    }, 6000)
    return () => { clearInterval(interval); clearTimeout(done) }
  }, [totalScenes])

  return (
    <>
      <style>{`
        @page {
          size: A4 landscape;
          margin: 0;
        }

        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }

        body {
          margin: 0;
          padding: 0;
          background: white;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        /* Barra de progresso — some na impressão */
        @media print {
          .no-print { display: none !important; }
          .stage-block { page-break-before: always; break-before: page; }
          .stage-block:first-child { page-break-before: avoid; break-before: avoid; }
        }

        @media screen {
          body { background: #f1f5f9; }
          .page-sheet {
            width: 297mm;
            min-height: 210mm;
            background: white;
            margin: 16px auto;
            box-shadow: 0 4px 24px rgba(0,0,0,0.12);
            border-radius: 4px;
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
          background: readyCount >= totalScenes ? '#10b981' : '#3b82f6',
          color: 'white',
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '13px',
          fontWeight: 600,
          transition: 'background 0.5s ease',
        }}
      >
        <span>
          {readyCount >= totalScenes
            ? `✓ Todas as ${totalScenes} cenas prontas — use Ctrl+P, selecione "A4 Paisagem"`
            : `Aguardando animações... (${totalScenes} cenas)`
          }
        </span>
        <button
          onClick={() => window.print()}
          style={{
            background: 'white',
            color: readyCount >= totalScenes ? '#10b981' : '#3b82f6',
            border: 'none',
            borderRadius: '6px',
            padding: '6px 16px',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          Imprimir PDF
        </button>
      </div>

      {/* ── Conteúdo ── */}
      <div style={{ paddingTop: '44px' }} className="no-print-padding">

        {STAGES.map((stage, si) => {
          // Agrupa as cenas em pares (2 por linha/página)
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
                    width: '297mm',
                    minHeight: '210mm',
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '6mm 4mm 4mm',
                  }}
                >
                  {/* Cabeçalho do stage — só na primeira pair */}
                  {pi === 0 && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginBottom: '4mm',
                      paddingBottom: '3mm',
                      borderBottom: '1.5px solid #e2e8f0',
                    }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 800,
                        fontSize: '13px',
                        flexShrink: 0,
                      }}>
                        {stage.number}
                      </div>
                      <div>
                        <div style={{ fontSize: '12pt', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
                          {stage.title}
                        </div>
                        <div style={{ fontSize: '8pt', color: '#64748b' }}>
                          {stage.subtitle}
                        </div>
                      </div>
                      <div style={{
                        marginLeft: 'auto',
                        fontSize: '7pt',
                        color: '#94a3b8',
                      }}>
                        Tour Interativo minhAi · minhai.app
                      </div>
                    </div>
                  )}

                  {/* Continuação na segunda pair em diante */}
                  {pi > 0 && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginBottom: '4mm',
                      paddingBottom: '3mm',
                      borderBottom: '1px solid #e2e8f0',
                    }}>
                      <span style={{ fontSize: '8pt', color: '#94a3b8', fontWeight: 600 }}>
                        Stage {stage.number} — {stage.title} (cont.)
                      </span>
                      <span style={{ marginLeft: 'auto', fontSize: '7pt', color: '#cbd5e1' }}>
                        Tour Interativo minhAi · minhai.app
                      </span>
                    </div>
                  )}

                  {/* Par de cenas */}
                  <div style={{ display: 'flex', flex: 1 }}>
                    {pair.map((scene, sci) => (
                      <ExportScene
                        key={scene.id}
                        node={scene.node}
                        label={scene.label}
                        stageNumber={stage.number}
                        sceneNumber={stage.scenes.indexOf(scene) + 1}
                      />
                    ))}
                    {/* Célula vazia se par ímpar */}
                    {pair.length === 1 && (
                      <div style={{ width: '50%', padding: '6mm' }} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        })}

      </div>
    </>
  )
}
