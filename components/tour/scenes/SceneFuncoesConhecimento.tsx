'use client'
// components/tour/scenes/SceneFuncoesConhecimento.tsx
// Layout: carrossel de nomes acima | 4 modais em loop no meio | carrossel de nomes abaixo

import { useEffect, useState, useRef } from 'react'

// ─── Dados das categorias ────────────────────────────────────────────────────

const CAT1_NOME = 'Conhecimento'
const CAT1_COLOR = '#8b5cf6'
const CAT1_FUNCOES = [
  'Respostas Rápidas', 'Perguntas Gerais', 'Criador de Posts', 'Criar Orçamento',
  'Transcrever Áudio', 'Transcrever Vídeo', 'Texto em Áudio', 'Traduzir Texto', 'Clima e Tempo',
]

const CAT2_NOME = 'Consultas'
const CAT2_COLOR = '#fbbf24'
const CAT2_FUNCOES = [
  'Dados CPF', 'Dados CNPJ', 'Restrições CPF', 'Restrições CNPJ',
  'Consulta Protestos', 'Consultar Placa',
]

const BG = 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #020617 100%)'

// ─── Carrossel de nomes ──────────────────────────────────────────────────────

function NamesCarousel({ names, color }: { names: string[]; color: string }) {
  const [offset, setOffset] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setInterval(() => setOffset(v => v + 1), 40)
    return () => clearInterval(t)
  }, [])

  // Duplica para loop infinito
  const doubled = [...names, ...names, ...names]

  return (
    <div className="w-full overflow-hidden" style={{ maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)' }}>
      <div
        ref={ref}
        className="flex items-center whitespace-nowrap"
        style={{
          transform: `translateX(-${offset % (ref.current ? ref.current.scrollWidth / 3 : 9999)}px)`,
          transition: 'none',
          gap: 0,
        }}
      >
        {doubled.map((name, i) => (
          <span key={i} className="flex items-center flex-shrink-0">
            <span
              className="font-semibold"
              style={{ color: 'rgba(255,255,255,0.65)', fontSize: 'clamp(0.38rem, 0.9vw, 0.5rem)', padding: '0 clamp(6px, 1.5vw, 10px)' }}
            >
              {name}
            </span>
            <span style={{ color: color, opacity: 0.5, fontSize: 'clamp(0.5rem, 1.2vw, 0.65rem)' }}>·</span>
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Modais mockados ─────────────────────────────────────────────────────────

function ModalTranscreverVideo() {
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState<'upload' | 'processing' | 'result'>('upload')

  useEffect(() => {
    setProgress(0); setPhase('upload')
    const t1 = setTimeout(() => setPhase('processing'), 1200)
    const t2 = setInterval(() => setProgress(v => Math.min(v + 3, 100)), 50)
    const t3 = setTimeout(() => { setPhase('result'); clearInterval(t2) }, 3200)
    return () => { clearTimeout(t1); clearTimeout(t3); clearInterval(t2) }
  }, [])

  return (
    <div className="w-full h-full flex flex-col" style={{ background: '#0f172a', borderRadius: 12, border: '1px solid rgba(99,102,241,0.3)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '0.5rem', color: 'white', fontWeight: 700 }}>VID</span>
        </div>
        <div>
          <p style={{ color: 'white', fontSize: 'clamp(0.42rem, 1vw, 0.55rem)', fontWeight: 700, margin: 0 }}>Transcrever Vídeo</p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', margin: 0 }}>OpenAI Whisper · pt-BR · até 25MB</p>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden' }}>
        {phase === 'upload' && (
          <div style={{ flex: 1, border: '2px dashed rgba(99,102,241,0.3)', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'rgba(99,102,241,0.04)' }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(0.38rem, 0.9vw, 0.5rem)', fontWeight: 600 }}>Clique ou arraste o arquivo aqui</p>
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)' }}>MP4, MOV, WEBM, MP3, M4A, WAV · máx. 25MB</p>
            <div style={{ marginTop: 4, padding: '4px 12px', background: '#6366f1', borderRadius: 6 }}>
              <span style={{ color: 'white', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', fontWeight: 600 }}>Selecionar arquivo</span>
            </div>
          </div>
        )}

        {phase === 'processing' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Card do arquivo */}
            <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '0.45rem', color: '#818cf8', fontWeight: 700 }}>MP4</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: 'white', fontSize: 'clamp(0.35rem, 0.8vw, 0.46rem)', fontWeight: 600, margin: 0 }}>entrevista-cafe.mp4</p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', margin: 0 }}>12,4 MB · 8min 30s</p>
              </div>
            </div>
            {/* Custo */}
            <div style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)' }}>9 minutos de áudio</span>
              <span style={{ color: '#818cf8', fontWeight: 700, fontSize: 'clamp(0.38rem, 0.9vw, 0.5rem)' }}>9 créditos</span>
            </div>
            {/* Progresso */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)' }}>Transcrevendo...</span>
                <span style={{ color: '#818cf8', fontWeight: 700, fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)' }}>{progress}%</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: '#6366f1', borderRadius: 2, transition: 'width 50ms linear' }} />
              </div>
            </div>
          </div>
        )}

        {phase === 'result' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden' }}>
            <div style={{ padding: '5px 8px', borderRadius: 6, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <span style={{ color: '#34d399', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', fontWeight: 600 }}>Transcrição concluída</span>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)' }}>9 créditos utilizados</span>
            </div>
            <div style={{ flex: 1, padding: '6px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', lineHeight: 1.6, margin: 0 }}>
                Bom dia a todos! Hoje vamos falar sobre o nosso cardápio especial de inverno. Temos novidades incríveis, incluindo o cappuccino trufado e o bolo de laranja com especiarias que chegou por pedido dos nossos clientes...
              </p>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <div style={{ flex: 1, padding: '5px 8px', borderRadius: 6, border: '1px solid rgba(99,102,241,0.4)', textAlign: 'center' }}>
                <span style={{ color: '#818cf8', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', fontWeight: 600 }}>Copiar texto</span>
              </div>
              <div style={{ flex: 1, padding: '5px 8px', borderRadius: 6, background: '#6366f1', textAlign: 'center' }}>
                <span style={{ color: 'white', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', fontWeight: 600 }}>Baixar PDF</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ModalClimaTempo() {
  return (
    <div className="w-full h-full flex flex-col" style={{ background: '#0f172a', borderRadius: 12, border: '1px solid rgba(59,130,246,0.3)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.45rem', color: 'white', fontWeight: 700 }}>CLM</span>
          </div>
          <div>
            <p style={{ color: 'white', fontSize: 'clamp(0.42rem, 1vw, 0.55rem)', fontWeight: 700, margin: 0 }}>Clima e Tempo</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', margin: 0 }}>São Paulo, SP</p>
          </div>
        </div>
        <div style={{ padding: '3px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.08)' }}>
          <input
            style={{ background: 'transparent', border: 'none', outline: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', width: 80 }}
            placeholder='Ex: "Rio de Janeiro"'
            readOnly
          />
        </div>
      </div>

      {/* Body — 2 colunas */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '8px 12px', overflow: 'hidden' }}>
        {/* Atual */}
        <div style={{ borderRadius: 8, background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(59,130,246,0.2)', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ color: 'white', fontWeight: 800, fontSize: 'clamp(0.9rem, 2.5vw, 1.3rem)', margin: 0, lineHeight: 1 }}>22°</p>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', margin: '2px 0 0', textTransform: 'capitalize' }}>parcialmente nublado</p>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', margin: '1px 0 0' }}>Sensação: 20°</p>
            </div>
            <span style={{ fontSize: 'clamp(1.2rem, 3vw, 1.8rem)', lineHeight: 1 }}>⛅</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)' }}>↓ 18°</span>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)' }}>↑ 26°</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, marginTop: 'auto' }}>
            {[['Umidade','72%'],['Vento','18 km/h'],['Chuva','20%']].map(([l,v]) => (
              <div key={l} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 6, padding: '3px 4px', textAlign: 'center' }}>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 'clamp(0.25rem, 0.6vw, 0.32rem)', margin: 0 }}>{l}</p>
                <p style={{ color: 'white', fontWeight: 600, fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', margin: 0 }}>{v}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Previsão */}
        <div style={{ borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', fontWeight: 600, padding: '5px 8px', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Próximos dias</p>
          {[['Seg','26°','19°','☀️'],['Ter','23°','17°','🌧️'],['Qua','21°','16°','⛈️'],['Qui','25°','18°','🌤️']].map(([d,mx,mn,ic]) => (
            <div key={d} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 8px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', fontWeight: 500, width: 24 }}>{d}</span>
              <span style={{ fontSize: 'clamp(0.5rem, 1.2vw, 0.65rem)' }}>{ic}</span>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)' }}>{mn}/{mx}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ModalConsultarPlaca() {
  const [phase, setPhase] = useState<'input' | 'loading' | 'result'>('input')
  const [placa, setPlaca] = useState('')
  const PLACA = 'ABC-1D23'

  useEffect(() => {
    setPhase('input'); setPlaca('')
    let i = 0
    const typing = setInterval(() => {
      i++
      setPlaca(PLACA.slice(0, i))
      if (i >= PLACA.length) { clearInterval(typing); setTimeout(() => setPhase('loading'), 500) }
    }, 100)
    const result = setTimeout(() => setPhase('result'), PLACA.length * 100 + 1200)
    return () => { clearInterval(typing); clearTimeout(result) }
  }, [])

  return (
    <div className="w-full h-full flex flex-col" style={{ background: '#0f172a', borderRadius: 12, border: '1px solid rgba(234,179,8,0.3)', overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(234,179,8,0.1)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#eab308', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '0.4rem', color: 'black', fontWeight: 700 }}>PLACA</span>
        </div>
        <div>
          <p style={{ color: 'white', fontSize: 'clamp(0.42rem, 1vw, 0.55rem)', fontWeight: 700, margin: 0 }}>Consultar Placa</p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', margin: 0 }}>Dados cadastrais do veículo</p>
        </div>
      </div>

      <div style={{ flex: 1, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden' }}>
        {phase === 'input' && (
          <>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', margin: 0 }}>Digite o CNPJ para consultar restrições e pendências:</p>
            <div style={{ padding: '7px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(234,179,8,0.4)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700, letterSpacing: 2, fontSize: 'clamp(0.42rem, 1vw, 0.55rem)', fontFamily: 'monospace' }}>{placa}<span style={{ animation: 'pulse 1s infinite', opacity: 0.7 }}>|</span></span>
            </div>
            <div style={{ padding: '5px 8px', borderRadius: 6, background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
              <span style={{ color: '#fbbf24', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', lineHeight: 1.5 }}>Confira a placa com atenção antes de consultar.</span>
            </div>
          </>
        )}

        {phase === 'loading' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, border: '3px solid rgba(234,179,8,0.2)', borderTopColor: '#eab308', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(0.35rem, 0.8vw, 0.46rem)', margin: 0 }}>Consultando placa...</p>
          </div>
        )}

        {phase === 'result' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#34d399', fontSize: '0.4rem', fontWeight: 700 }}>✓</span>
              </div>
              <span style={{ color: 'white', fontWeight: 600, fontSize: 'clamp(0.35rem, 0.8vw, 0.46rem)' }}>Consulta realizada com sucesso</span>
            </div>
            <div style={{ flex: 1, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              {[['Placa','ABC-1D23 (Mercosul)'],['Marca/Modelo','FIAT / PULSE DRIVE'],['Cor','BRANCO'],['Ano','2022/2023'],['Município','SÃO PAULO - SP'],['Situação','REGULAR']].map(([l,v], i) => (
                <div key={l} style={{ display: 'grid', gridTemplateColumns: '90px 1fr', padding: '4px 8px', background: i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', fontWeight: 500 }}>{l}</span>
                  <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)' }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <div style={{ flex: 1, padding: '5px', borderRadius: 6, background: '#eab308', textAlign: 'center' }}>
                <span style={{ color: 'black', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', fontWeight: 700 }}>Baixar PDF</span>
              </div>
              <div style={{ flex: 1, padding: '5px', borderRadius: 6, background: '#2563eb', textAlign: 'center' }}>
                <span style={{ color: 'white', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', fontWeight: 700 }}>Enviar por e-mail</span>
              </div>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

function ModalRestricoesCNPJ() {
  const [phase, setPhase] = useState<'input' | 'processing' | 'result'>('input')
  const [cnpj, setCnpj] = useState('')
  const CNPJ = '14.282.244/0001-19'

  useEffect(() => {
    setPhase('input'); setCnpj('')
    let i = 0
    const typing = setInterval(() => {
      i++
      setCnpj(CNPJ.slice(0, i))
      if (i >= CNPJ.length) { clearInterval(typing); setTimeout(() => setPhase('processing'), 500) }
    }, 70)
    const result = setTimeout(() => setPhase('result'), CNPJ.length * 70 + 1200)
    return () => { clearInterval(typing); clearTimeout(result) }
  }, [])

  return (
    <div className="w-full h-full flex flex-col" style={{ background: '#0f172a', borderRadius: 12, border: '1px solid rgba(239,68,68,0.3)', overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '0.4rem', color: 'white', fontWeight: 700 }}>CNPJ</span>
        </div>
        <div>
          <p style={{ color: 'white', fontSize: 'clamp(0.42rem, 1vw, 0.55rem)', fontWeight: 700, margin: 0 }}>Restrições CNPJ</p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', margin: 0 }}>Score e pendências cadastrais</p>
        </div>
      </div>

      <div style={{ flex: 1, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden' }}>
        {phase === 'input' && (
          <>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', margin: 0 }}>Digite o CNPJ para consultar restrições:</p>
            <div style={{ padding: '7px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(239,68,68,0.4)' }}>
              <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600, fontSize: 'clamp(0.42rem, 1vw, 0.55rem)', fontFamily: 'monospace' }}>{cnpj}<span style={{ opacity: 0.7 }}>|</span></span>
            </div>
          </>
        )}

        {phase === 'processing' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, border: '3px solid rgba(239,68,68,0.2)', borderTopColor: '#ef4444', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(0.35rem, 0.8vw, 0.46rem)', margin: 0 }}>Consultando restrições...</p>
          </div>
        )}

        {phase === 'result' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden' }}>
            <div style={{ padding: '5px 8px', borderRadius: 6, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <span style={{ color: '#34d399', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', fontWeight: 600 }}>Nenhuma restrição encontrada</span>
            </div>
            <div style={{ flex: 1, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', margin: 0 }}>CNPJ Consultado</p>
                  <p style={{ color: 'white', fontWeight: 700, fontSize: 'clamp(0.38rem, 0.9vw, 0.5rem)', margin: '2px 0' }}>14.282.244/0001-19</p>
                  <span style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(16,185,129,0.15)', color: '#34d399', fontSize: 'clamp(0.25rem, 0.6vw, 0.32rem)', fontWeight: 600 }}>REGULAR</span>
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#34d399', fontSize: 'clamp(0.55rem, 1.3vw, 0.72rem)', fontWeight: 700 }}>✓</span>
                </div>
                <p style={{ color: '#34d399', fontWeight: 600, fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', margin: 0 }}>CNPJ sem pendências</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <div style={{ flex: 1, padding: '5px', borderRadius: 6, background: 'rgba(255,255,255,0.08)', textAlign: 'center' }}>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', fontWeight: 600 }}>Copiar</span>
              </div>
              <div style={{ flex: 1, padding: '5px', borderRadius: 6, background: '#dc2626', textAlign: 'center' }}>
                <span style={{ color: 'white', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', fontWeight: 700 }}>Baixar PDF</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────

const MODALS = [
  { key: 'video',    component: ModalTranscreverVideo  },
  { key: 'clima',    component: ModalClimaTempo        },
  { key: 'placa',    component: ModalConsultarPlaca    },
  { key: 'cnpj',     component: ModalRestricoesCNPJ    },
]

export default function SceneFuncoesConhecimento() {
  const [activeModal, setActiveModal] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setActiveModal(v => (v + 1) % MODALS.length), 4000)
    return () => clearInterval(t)
  }, [])

  const Modal = MODALS[activeModal].component

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none"
      style={{ background: BG }}
    >
      {/* Categoria 1 — carrossel acima */}
      <div
        className="flex-shrink-0 flex items-center py-1.5"
        style={{ borderBottom: `1px solid ${CAT1_COLOR}20` }}
      >
        <div className="flex items-center gap-1.5 px-3 flex-shrink-0">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: CAT1_COLOR }} />
          <span className="font-bold" style={{ color: CAT1_COLOR, fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
            {CAT1_NOME}
          </span>
        </div>
        <NamesCarousel names={CAT1_FUNCOES} color={CAT1_COLOR} />
      </div>

      {/* Modal em loop */}
      <div className="flex-1 min-h-0 px-3 py-2 flex flex-col gap-2">
        {/* Dots */}
        <div className="flex items-center justify-center gap-1.5 flex-shrink-0">
          {MODALS.map((m, i) => (
            <button
              key={m.key}
              onClick={() => setActiveModal(i)}
              style={{
                width: activeModal === i ? 16 : 5,
                height: 5,
                borderRadius: 3,
                background: activeModal === i ? CAT1_COLOR : 'rgba(255,255,255,0.2)',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                transition: 'all 300ms ease',
              }}
            />
          ))}
        </div>

        {/* Modal */}
        <div
          className="flex-1 min-h-0"
          key={activeModal}
          style={{ animation: 'fadeIn 300ms ease' }}
        >
          <Modal />
        </div>
      </div>

      {/* Categoria 2 — carrossel abaixo */}
      <div
        className="flex-shrink-0 flex items-center py-1.5"
        style={{ borderTop: `1px solid ${CAT2_COLOR}20` }}
      >
        <div className="flex items-center gap-1.5 px-3 flex-shrink-0">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: CAT2_COLOR }} />
          <span className="font-bold" style={{ color: CAT2_COLOR, fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
            {CAT2_NOME}
          </span>
        </div>
        <NamesCarousel names={CAT2_FUNCOES} color={CAT2_COLOR} />
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.98) } to { opacity: 1; transform: scale(1) } }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
