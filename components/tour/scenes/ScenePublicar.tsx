'use client'
// components/tour/scenes/ScenePublicar.tsx

import Image from 'next/image'
import { useEffect, useRef, useState, useCallback } from 'react'

// ─── Base sizes ──────────────────────────────────────────────────────────────
const BASE_W = 900
const BASE_H = 540

// ─── Ícones ──────────────────────────────────────────────────────────────────
const IconCopy     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" style={{width:13,height:13,flexShrink:0}}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
const IconQR       = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" style={{width:13,height:13,flexShrink:0}}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h2v2h-2z"/><path d="M18 14h2v2h-2z"/><path d="M14 18h2v2h-2z"/><path d="M18 18h2v2h-2z"/></svg>
const IconGoogle   = () => <svg viewBox="0 0 24 24" fill="currentColor" style={{width:13,height:13,flexShrink:0}}><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
const IconMeta     = () => <svg viewBox="0 0 287.56 191" fill="currentColor" style={{width:13,height:13,flexShrink:0}}><path d="M31.06,126c0,11,2.41,19.41,5.56,24.51A19,19,0,0,0,53.19,160c8.1,0,15.51-2,29.79-21.76,11.44-15.83,24.92-38,34-52l15.36-23.6c10.67-16.39,23-34.61,37.18-47C181.07,5.6,193.54,0,206.09,0c21.07,0,41.14,12.21,56.5,35.11,16.81,25.08,25,56.67,25,89.27,0,19.38-3.82,33.62-10.32,44.87C271,180.13,258.72,191,238.13,191V160c17.63,0,22-16.2,22-34.74,0-26.42-6.16-55.74-19.73-76.69-9.63-14.86-22.11-23.94-35.84-23.94-14.85,0-26.8,11.2-40.23,31.17-7.14,10.61-14.47,23.54-22.7,38.13l-9.06,16c-18.2,32.27-22.81,39.62-31.91,51.75C84.74,183,71.12,191,53.19,191c-21.27,0-34.72-9.21-43-23.09C3.34,156.6,0,141.76,0,124.85Z"/><path d="M24.49,37.3C38.73,15.35,59.28,0,82.85,0c13.65,0,27.22,4,41.39,15.61,15.5,12.65,32,33.48,52.63,67.81l7.39,12.32c17.84,29.72,28,45,33.93,52.22,7.64,9.26,13,12,19.94,12,17.63,0,22-16.2,22-34.74l27.4-.86c0,19.38-3.82,33.62-10.32,44.87C271,180.13,258.72,191,238.13,191c-12.8,0-24.14-2.78-36.68-14.61-9.64-9.08-20.91-25.21-29.58-39.71L146.08,93.6c-12.94-21.62-24.81-37.74-31.68-45C107,40.71,97.51,31.23,82.35,31.23c-12.27,0-22.69,8.61-31.41,21.78Z"/><path d="M82.35,31.23c-12.27,0-22.69,8.61-31.41,21.78C38.61,71.62,31.06,99.34,31.06,126c0,11,2.41,19.41,5.56,24.51L10.14,167.91C3.34,156.6,0,141.76,0,124.85,0,94.1,8.44,62.05,24.49,37.3,38.73,15.35,59.28,0,82.85,0Z"/></svg>
const IconUsers    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" style={{width:13,height:13,flexShrink:0}}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
const IconBot      = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" style={{width:13,height:13,flexShrink:0}}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/><circle cx="12" cy="16" r="1" fill="currentColor"/></svg>
const IconDup      = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" style={{width:13,height:13,flexShrink:0}}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
const IconZap      = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" style={{width:13,height:13,flexShrink:0}}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
const IconSettings = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" style={{width:13,height:13,flexShrink:0}}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
const IconTrash    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" style={{width:13,height:13,flexShrink:0}}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
const IconExternal = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" style={{width:13,height:13,flexShrink:0}}><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
const IconX        = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" style={{width:15,height:15}}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
const IconDownload = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" style={{width:13,height:13,flexShrink:0}}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
const IconGlobe    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" style={{width:9,height:9,flexShrink:0}}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
const IconZapSm    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" style={{width:9,height:9,flexShrink:0}}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
const IconStar     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" style={{width:9,height:9,flexShrink:0}}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>

// ─── Botão base ───────────────────────────────────────────────────────────────
const BTN_BASE: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 5,
  padding: '5px 9px', borderRadius: 7, cursor: 'pointer',
  fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap', userSelect: 'none',
}
function Btn({ children, bg, color, border, onClick }: {
  children: React.ReactNode; bg: string; color: string; border?: string; onClick?: () => void
}) {
  return (
    <div onClick={onClick} style={{ ...BTN_BASE, background: bg, color, border: border ?? 'none' }}>
      {children}
    </div>
  )
}

// ─── Grid de botões 2 por linha ───────────────────────────────────────────────
function BtnGrid({ items }: { items: React.ReactNode[] }) {
  // Agrupa de 2 em 2
  const rows: React.ReactNode[][] = []
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-end' }}>
      {rows.map((row, ri) => (
        <div key={ri} style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
          {row.map((btn, bi) => (
            <div key={bi}>{btn}</div>
          ))}
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function ScenePublicar() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [modalOpacity, setModalOpacity] = useState(0)
  const [cycle, setCycle] = useState(0)

  // ── Escala responsiva — NUNCA cresce, só diminui ─────────────────────────
  const recalc = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const { width: cw, height: ch } = el.getBoundingClientRect()
    const s = Math.min(1, (cw - 24) / BASE_W, (ch - 24) / BASE_H)
    setScale(s)
  }, [])

  useEffect(() => {
    recalc()
    const ro = new ResizeObserver(recalc)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [recalc])

  // ── Sequência QR: abre 1.8s → fecha 6.5s → repete ────────────────────────
  useEffect(() => {
    const open  = setTimeout(() => { setShowModal(true); setTimeout(() => setModalOpacity(1), 30) }, 1800)
    const close = setTimeout(() => { setModalOpacity(0); setTimeout(() => { setShowModal(false); setCycle(c => c + 1) }, 350) }, 6500)
    return () => { clearTimeout(open); clearTimeout(close) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycle])

  const openModal  = () => { setShowModal(true);  setTimeout(() => setModalOpacity(1), 30) }
  const closeModal = () => { setModalOpacity(0);  setTimeout(() => setShowModal(false), 300) }

  const GRAY  = { bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.75)', border: '0.5px solid rgba(255,255,255,0.12)' }
  const RED   = { bg: '#dc2626', color: '#fff' }
  const BLUE  = { bg: '#2563eb', color: '#fff' }
  const PURP  = { bg: 'rgba(168,85,247,0.12)', color: '#c084fc', border: '0.5px solid rgba(168,85,247,0.25)' }
  const INDG  = { bg: 'rgba(99,102,241,0.12)',  color: '#818cf8', border: '0.5px solid rgba(99,102,241,0.25)' }
  const AMBER = { bg: 'rgba(245,158,11,0.1)',   color: '#fbbf24', border: '0.5px solid rgba(245,158,11,0.25)' }

  const row1 = [
    <Btn key="copy"   {...GRAY}  onClick={openModal}><IconCopy /> Copiar Link</Btn>,
    <Btn key="qr"     {...GRAY}  onClick={openModal}><IconQR /> QR Code</Btn>,
    <Btn key="google" {...GRAY}><IconGoogle /> Serviços Google</Btn>,
  ]
  const row1Extra = <Btn key="meta" {...GRAY}><IconMeta /> WhatsApp / Instagram / Facebook</Btn>
  const row2 = [
    <Btn key="users"  {...INDG}><IconUsers /> Usuários / Totens</Btn>,
    <Btn key="bot"    {...INDG}><IconBot /> Funções</Btn>,
    <Btn key="dup"    {...GRAY}><IconDup /> Duplicar</Btn>,
    <Btn key="switch" {...PURP}><IconZap /> Trocar para Smart</Btn>,
    <Btn key="cfg"    {...GRAY}><IconSettings /> Configurar</Btn>,
    <Btn key="del"    {...RED}><IconTrash /></Btn>,
    <Btn key="abrir"  {...BLUE}><IconExternal /> Abrir</Btn>,
  ]

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%', height: '100%',
        background: 'linear-gradient(135deg,#020617 0%,#0f172a 50%,#020617 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', position: 'relative',
      }}
    >
      {/* Wrapper de tamanho fixo + scale — position absolute para não empurrar o container */}
      <div style={{
        position: 'absolute',
        width: BASE_W, height: BASE_H,
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
      }}>

        {/* ── Shell da página ── */}
        <div style={{
          width: '100%', height: '100%',
          background: '#0f172a',
          borderRadius: 16,
          border: '0.5px solid rgba(255,255,255,0.08)',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}>

          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 20px',
            borderBottom: '0.5px solid rgba(255,255,255,0.08)', flexShrink: 0,
          }}>
            <div>
              <div style={{ color: '#fff', fontSize: 20, fontWeight: 800 }}>Assistentes</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 2 }}>
                Gerencie seus assistentes virtuais e configurações personalizadas
              </div>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#2563eb', borderRadius: 10, padding: '8px 16px',
              color: '#fff', fontSize: 12, fontWeight: 700,
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" style={{width:13,height:13}}>
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Novo Assistente
            </div>
          </div>

          {/* Body */}
          <div style={{ flex: 1, padding: '14px 20px', overflow: 'hidden' }}>

            {/* Card */}
            <div style={{
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(255,255,255,0.1)',
              borderRadius: 14, padding: '14px 18px',
            }}>

              {/* Linha principal */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>

                {/* Esquerda: avatar + nome + badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 13, background: '#de691b',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '54%', height: '54%' }}>
                      <path d="M4 8h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8z"/>
                      <path d="M16 9h2.5a2.5 2.5 0 0 1 0 5H16"/>
                      <path d="M6 2v2"/><path d="M10 2v2"/><path d="M14 2v2"/>
                      <path d="M3 21h18"/>
                    </svg>
                  </div>
                  {/* Nome + badges em coluna */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <span style={{ color: '#fff', fontSize: 16, fontWeight: 800, lineHeight: 1 }}>Café Exemplo</span>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      <span style={{ display:'flex', alignItems:'center', gap:3, fontSize:9, padding:'2px 7px', borderRadius:99, background:'rgba(34,197,94,0.15)', color:'#4ade80', border:'1px solid rgba(34,197,94,0.3)', fontWeight:600 }}>
                        <IconGlobe /> Público
                      </span>
                      <span style={{ display:'flex', alignItems:'center', gap:3, fontSize:9, padding:'2px 7px', borderRadius:99, background:'rgba(168,85,247,0.15)', color:'#c084fc', border:'1px solid rgba(168,85,247,0.3)', fontWeight:700 }}>
                        <IconZapSm /> Versão Vendas · 10% comissão
                      </span>
                    </div>
                  </div>
                </div>

                {/* Direita: 2 grupos de botões, 2 por linha */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                  <BtnGrid items={row1} />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>{row1Extra}</div>
                  <BtnGrid items={row2} />
                </div>
              </div>

              {/* Rodapé webapp */}
              <div style={{
                marginTop: 12, paddingTop: 10,
                borderTop: '0.5px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:9, padding:'3px 9px', borderRadius:99, background:'rgba(245,158,11,0.1)', color:'#fbbf24', border:'1px solid rgba(245,158,11,0.25)', fontWeight:600 }}>
                  <IconStar /> WebApp disponível
                </span>
                <span style={{ color:'rgba(255,255,255,0.35)', fontSize:9 }}>Ative seu subdomínio próprio</span>
                <div style={{ marginLeft:'auto' }}>
                  <Btn {...AMBER}><IconStar /> Configurar WebApp</Btn>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ── Modal QR ── */}
        {showModal && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            borderRadius: 16,
            opacity: modalOpacity, transition: 'opacity 300ms ease',
            zIndex: 10,
          }}>
            <div style={{
              background: '#1e293b',
              border: '0.5px solid rgba(255,255,255,0.12)',
              borderRadius: 20, padding: '26px 30px', width: 290,
              boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              position: 'relative',
            }}>
              <button
                onClick={closeModal}
                style={{
                  position: 'absolute', top: 12, right: 12,
                  width: 26, height: 26, borderRadius: 7,
                  background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'rgba(255,255,255,0.5)',
                }}
              >
                <IconX />
              </button>
              <div style={{ color: '#fff', fontSize: 14, fontWeight: 700, marginBottom: 3 }}>QR Code do Assistente</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginBottom: 16 }}>Café Exemplo</div>
              <div style={{
                background: '#fff', borderRadius: 10, padding: 10, marginBottom: 14,
                border: '1px solid rgba(0,0,0,0.08)',
              }}>
                <Image src="/qrcode.png" alt="QR Code" width={150} height={150} style={{ display:'block', borderRadius:4 }} />
              </div>
              <div style={{ color:'rgba(255,255,255,0.4)', fontSize:10, textAlign:'center', marginBottom:18, lineHeight:1.5 }}>
                Aponte a câmera para o código<br />para abrir o assistente.
              </div>
              <div style={{ display:'flex', gap:8, width:'100%' }}>
                <button onClick={closeModal} style={{
                  flex:1, padding:'8px 0', borderRadius:9,
                  background:'rgba(255,255,255,0.06)', border:'0.5px solid rgba(255,255,255,0.1)',
                  color:'rgba(255,255,255,0.7)', fontSize:11, fontWeight:600, cursor:'pointer',
                }}>Fechar</button>
                <button style={{
                  flex:1, padding:'8px 0', borderRadius:9,
                  background:'#2563eb', border:'none',
                  color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:5,
                }}>
                  <IconDownload /> Baixar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
