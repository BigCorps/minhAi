'use client';

// components/assistant/FullModeLayout.tsx
// Wrapper puramente visual do modo full.
// NÃO contém VoiceAssistant, CategoryCarousel nem SlugFooter —
// esses ficam no AssistenteClient para nunca serem desmontados.

import { useState, useRef } from 'react';
import Image from 'next/image';
import SlugHeaderWrapper from '@/app/ia/[slug]/SlugHeaderWrapper';

interface FullModeLayoutProps {
  company: {
    id: string;
    name: string;
    slug: string;
    logo_url?: string;
    assistant_role?: string;
    webapp_enabled?: boolean;
  };
  theme: 'dark' | 'light';
  showToast: boolean;
  toastMessage: string;
  toastType: 'success' | 'error' | 'warning';
  isKioskMode: boolean;
  // Slot para o VoiceAssistant (passado como children)
  children: React.ReactNode;
}

export default function FullModeLayout({
  company,
  theme,
  showToast,
  toastMessage,
  toastType,
  isKioskMode,
  children,
}: FullModeLayoutProps) {
  const [showControls, setShowControls] = useState(false);
  const [showCloseButton, setShowCloseButton] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showZoomControl, setShowZoomControl] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showControlsTemporarily = () => {
    setShowControls(true);
    setShowCloseButton(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
      setShowCloseButton(false);
    }, 5000);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col transition-colors duration-500 ${
        theme === 'dark'
          ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950'
          : 'bg-gradient-to-br from-slate-100 via-gray-100 to-slate-200'
      }`}
      onMouseMove={(e) => {
        const isNearTop = e.clientY < 100;
        setShowControls(isNearTop);
        setShowCloseButton(isNearTop);
        if (isNearTop && controlsTimeoutRef.current) {
          clearTimeout(controlsTimeoutRef.current);
          controlsTimeoutRef.current = null;
        }
      }}
      onMouseLeave={() => {
        setShowControls(false);
        setShowCloseButton(false);
      }}
      onTouchStart={(e) => {
        const touch = e.touches[0];
        if (touch.clientY < 100) showControlsTemporarily();
      }}
    >
      {/* Header overlay minimalista */}
      <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
        <div className={`max-w-7xl mx-auto flex items-center px-6 py-4 pointer-events-auto ${
          company.logo_url ? 'justify-between' : 'justify-end'
        }`}>

          {/* ESQUERDA: Logo + Zoom */}
          <div className="flex items-center space-x-3 flex-shrink-0">
            {company.logo_url && (
              <img
                src={company.logo_url}
                alt={`${company.name} logo`}
                className="rounded-lg object-contain"
                style={{ maxHeight: '36px', height: 'auto', width: 'auto' }}
              />
            )}

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowZoomControl(!showZoomControl)}
                className={`p-2 rounded-lg transition-all duration-300 ${
                  showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
                } ${
                  theme === 'dark'
                    ? 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white'
                    : 'bg-black/5 hover:bg-black/10 text-gray-600 hover:text-gray-900'
                }`}
                title="Zoom"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                </svg>
              </button>

              <div className={`flex items-center space-x-2 transition-all duration-300 ${
                showZoomControl && showControls
                  ? 'opacity-100 scale-100'
                  : 'opacity-0 scale-95 pointer-events-none'
              }`}>
                <input
                  type="range"
                  min="50"
                  max="500"
                  step="10"
                  value={zoomLevel}
                  onChange={(e) => setZoomLevel(Number(e.target.value))}
                  className="w-24 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:w-3
                    [&::-webkit-slider-thumb]:h-3
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:bg-blue-500
                    hover:[&::-webkit-slider-thumb]:bg-blue-600"
                />
                <span className={`text-xs font-mono min-w-[3rem] text-right ${
                  theme === 'dark' ? 'text-white/70' : 'text-gray-600'
                }`}>
                  {zoomLevel}%
                </span>
              </div>
            </div>
          </div>

          {/* DIREITA: Botões de controle via SlugHeaderWrapper */}
          <div className="flex-shrink-0">
            <SlugHeaderWrapper
              company={company}
              overlayMode={true}
              onClose={undefined}
              showControls={showCloseButton}
            />
          </div>
        </div>
      </div>

      {/* Slot do VoiceAssistant com zoom aplicado */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-16 pb-24">
        <div
          className="relative"
          style={{
            transform: `scale(${zoomLevel / 100})`,
            transition: 'transform 0.2s ease-out',
          }}
        >
          {children}
        </div>
      </div>

      {/* Toast */}
      {showToast && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 animate-slide-down">
          <div className={`px-6 py-3 rounded-lg shadow-lg backdrop-blur-xl border flex items-center space-x-3 ${
            theme === 'dark'
              ? 'bg-slate-800/95 border-white/10 text-white'
              : 'bg-white/95 border-gray-200 text-gray-900'
          }`}>
            {toastType === 'success' && (
              <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {toastType === 'warning' && (
              <svg className="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
            {toastType === 'error' && (
              <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span className="text-sm font-medium">{toastMessage}</span>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-down {
          from { transform: translate(-50%, -100%); opacity: 0; }
          to   { transform: translate(-50%, 0);    opacity: 1; }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translate(-50%, -10px); }
          to   { opacity: 1; transform: translate(-50%, 0);     }
        }
        .animate-slide-down { animation: slide-down 0.3s ease-out; }
        .animate-fade-in    { animation: fade-in    0.3s ease-out; }
      `}</style>
    </div>
  );
}
