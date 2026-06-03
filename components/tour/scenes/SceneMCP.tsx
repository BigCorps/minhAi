'use client'
// components/tour/scenes/SceneMCP.tsx
// Chat branco genérico com card de tool call MCP.
// Os logos de Claude, ChatGPT, Cursor e Manus aparecem em rotação.

import { useEffect, useState } from 'react'

const LOGOS = [
  {
    name: 'Claude',
    color: '#D4A574',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
      </svg>
    ),
  },
  {
    name: 'ChatGPT',
    color: '#10a37f',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.896zm16.597 3.868l-5.843-3.367L15.115 7.23a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.403-.684zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08-4.778 2.758a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
      </svg>
    ),
  },
  {
    name: 'Cursor',
    color: '#6366f1',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
      </svg>
    ),
  },
  {
    name: 'Manus',
    color: '#f59e0b',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 2a10 10 0 110 20A10 10 0 0112 2zm0 2a8 8 0 100 16A8 8 0 0012 4zm0 3a1 1 0 011 1v3.586l2.707 2.707a1 1 0 01-1.414 1.414l-3-3A1 1 0 0111 12V10a1 1 0 011-1z" />
      </svg>
    ),
  },
]

export default function SceneMCP() {
  const [activeLogo, setActiveLogo] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveLogo((prev) => (prev + 1) % LOGOS.length)
    }, 1800)
    return () => clearInterval(interval)
  }, [])

  const logo = LOGOS[activeLogo]

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none"
      style={{ background: '#fafafa' }}
    >
      {/* ── Header com logo rotativo ── */}
      <div
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0 border-b"
        style={{ borderColor: '#e5e7eb', background: '#fff' }}
      >
        <div
          className="rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-500"
          style={{ width: 32, height: 32, background: logo.color, color: 'white' }}
        >
          {logo.svg}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-semibold leading-none transition-all duration-300"
            style={{ color: '#111' }}
          >
            {logo.name}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">minhAi MCP conectado</p>
        </div>
        {/* Badge MCP */}
        <div
          className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium flex-shrink-0"
          style={{ background: '#ecfdf5', color: '#059669' }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          MCP ativo
        </div>
      </div>

      {/* ── Conversa ── */}
      <div className="flex-1 flex flex-col justify-end gap-3 px-4 py-4 overflow-hidden">
        {/* Mensagem do usuário */}
        <div className="flex justify-end">
          <div
            className="rounded-2xl rounded-tr-sm px-3 py-2 max-w-[75%]"
            style={{ background: '#e5e7eb', fontSize: 'clamp(0.7rem, 1.8vw, 0.82rem)', color: '#111' }}
          >
            Consulte o estoque do produto SKU-441 e me dê o saldo atual.
          </div>
        </div>

        {/* Tool call card */}
        <div
          className="rounded-xl border px-3 py-2.5 flex flex-col gap-1.5"
          style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}
        >
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth={2} className="w-3.5 h-3.5 flex-shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-xs font-mono text-green-700">minhai · consultar_estoque</span>
          </div>
          <div className="font-mono text-xs text-gray-500 pl-5">
            SKU: <span className="text-gray-800">441</span>
          </div>
        </div>

        {/* Resposta do assistente */}
        <div className="flex justify-start">
          <div
            className="rounded-2xl rounded-tl-sm px-3 py-2 max-w-[80%]"
            style={{ background: '#fff', border: '1px solid #e5e7eb', fontSize: 'clamp(0.7rem, 1.8vw, 0.82rem)', color: '#111' }}
          >
            O produto SKU-441 tem <strong>47 unidades</strong> em estoque. Deseja criar uma ordem de reposição?
          </div>
        </div>
      </div>

      {/* ── Logos dos outros apps embaixo ── */}
      <div
        className="flex items-center justify-center gap-3 px-4 py-3 border-t flex-shrink-0"
        style={{ borderColor: '#e5e7eb', background: '#fff' }}
      >
        {LOGOS.map((l, i) => (
          <div
            key={l.name}
            className="flex flex-col items-center gap-1 transition-all duration-300"
            style={{ opacity: i === activeLogo ? 1 : 0.3 }}
          >
            <div
              className="rounded-lg flex items-center justify-center"
              style={{ width: 28, height: 28, background: l.color, color: 'white' }}
            >
              {l.svg}
            </div>
            <span className="text-xs text-gray-400" style={{ fontSize: '0.6rem' }}>
              {l.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
