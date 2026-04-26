'use client';
 
// ============================================================
// SlugHeaderWrapper.tsx
// FIX 1: lê sessionStorage no mount → kiosk persiste ao navegar
// FIX 2: mini-overlay de senha aqui → funciona em qualquer página
// FIX 3: ícone de saída = 4 setas em vermelho (igual ao de entrada)
// ============================================================
 
import { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { useWakeLock } from '@/hooks/useWakeLock';
import SlugHeader from '@/components/slug/SlugHeader';
 
const KIOSK_STORAGE_KEY = 'eai:kioskSession';
 
interface KioskSession {
  active: boolean;
  password: string;
}
 
function readKioskSession(): KioskSession | null {
  try {
    const raw = sessionStorage.getItem(KIOSK_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
 
function writeKioskSession(session: KioskSession | null) {
  try {
    if (session) {
      sessionStorage.setItem(KIOSK_STORAGE_KEY, JSON.stringify(session));
    } else {
      sessionStorage.removeItem(KIOSK_STORAGE_KEY);
    }
  } catch { /* silencioso */ }
}
 
interface SlugHeaderWrapperProps {
  company: {
    id: string;
    name: string;
    logo_url?: string | null;
    assistant_role?: string | null;
    webapp_theme_color?: string | null;
    webapp_enabled?: boolean;
    modo_vendas_enabled?: boolean;
    modo_fila_enabled?: boolean;
    modo_links_enabled?: boolean;
  };
  slug?: string;
  pageType?: 'ia' | 'vendas' | 'fila' | 'cliente' | 'link';
  overlayMode?: boolean;
  forceTheme?: 'dark' | 'light';
  onClose?: () => void;
  showControls?: boolean;
}
 
export default function SlugHeaderWrapper({
  company,
  slug,
  pageType,
  overlayMode = false,
  forceTheme,
  onClose,
  showControls = false,
}: SlugHeaderWrapperProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [isKioskMode, setIsKioskMode] = useState(false);
  const isKioskModeRef = useRef(false);
 
  // mini-overlay de saída do kiosk (próprio deste componente)
  const [showExitOverlay, setShowExitOverlay] = useState(false);
  const [exitPasswordInput, setExitPasswordInput] = useState('');
  const [exitPasswordError, setExitPasswordError] = useState(false);
  const kioskPasswordRef = useRef<string | null>(null);
 
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'warning' | 'error';
  } | null>(null);
 
  const { isSupported, isActive, requestWakeLock, releaseWakeLock } = useWakeLock();
 
  const showToast = (message: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
 
  // Mantém ref sincronizado com state e sessionStorage
  const setKioskActive = (active: boolean, password?: string) => {
    isKioskModeRef.current = active;
    setIsKioskMode(active);
    if (active && password !== undefined) {
      kioskPasswordRef.current = password;
      writeKioskSession({ active: true, password });
    } else if (!active) {
      kioskPasswordRef.current = null;
      writeKioskSession(null);
    }
  };
 
  useEffect(() => {
    setMounted(true);
 
    // FIX 1: lê estado do sessionStorage ao montar
    // Cobre navegação entre /ia, /vendas, /fila, /link sem precisar do evento
    const saved = readKioskSession();
    if (saved?.active) {
      isKioskModeRef.current = true;
      setIsKioskMode(true);
      kioskPasswordRef.current = saved.password;
    }
 
    const checkOrientation = () => setIsPortrait(window.innerHeight > window.innerWidth);
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
 
    // Sincroniza quando AssistenteClient ativa/desativa kiosk (mesma página /ia)
    // O evento agora carrega a senha para que o wrapper possa verificá-la
    const handleKioskChange = (e: CustomEvent) => {
      const active = e.detail?.active ?? false;
      const password: string | undefined = e.detail?.password;
      isKioskModeRef.current = active;
      setIsKioskMode(active);
      if (active && password) {
        kioskPasswordRef.current = password;
        writeKioskSession({ active: true, password });
      } else if (!active) {
        kioskPasswordRef.current = null;
        writeKioskSession(null);
      }
    };
    window.addEventListener('eai:kioskModeChange', handleKioskChange as EventListener);
 
    // AssistenteClient confirma saída (loop de sincronização reverso)
    const handleExitConfirmed = () => {
      setKioskActive(false);
      setShowExitOverlay(false);
    };
    window.addEventListener('eai:kioskExitConfirmed', handleExitConfirmed);
 
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('eai:kioskModeChange', handleKioskChange as EventListener);
      window.removeEventListener('eai:kioskExitConfirmed', handleExitConfirmed);
    };
  }, []);
 
  const theme = forceTheme ?? (mounted ? (resolvedTheme as 'dark' | 'light' ?? 'dark') : 'dark');
 
  const handleToggleTheme = () => {
    if (forceTheme) return;
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };
 
  const handleToggleWakeLock = async () => {
    if (isActive) {
      await releaseWakeLock();
      showToast('Tela sempre ligada desativada', 'warning');
    } else {
      const activated = await requestWakeLock();
      showToast(
        activated ? 'Tela sempre ligada ativada!' : 'Erro ao ativar wake lock',
        activated ? 'success' : 'error',
      );
    }
  };
 
  // Solicita entrada no kiosk → AssistenteClient cuida do setup de senha
  const handleEnterKioskMode = () => {
    window.dispatchEvent(new CustomEvent('eai:requestKioskMode'));
  };
 
  // FIX 2: saída gerenciada aqui — funciona em qualquer página
  const handleExitKioskMode = () => {
    if (!isKioskModeRef.current) return;
    setShowExitOverlay(true);
    window.dispatchEvent(new CustomEvent('eai:modalOpen'));
  };
 
  const handleConfirmExit = async () => {
    const storedPassword = kioskPasswordRef.current ?? readKioskSession()?.password ?? null;
    if (exitPasswordInput !== storedPassword) {
      setExitPasswordError(true);
      setExitPasswordInput('');
      setTimeout(() => setExitPasswordError(false), 2000);
      return;
    }
 
    setExitPasswordInput('');
    setExitPasswordError(false);
    setShowExitOverlay(false);
    window.dispatchEvent(new CustomEvent('eai:modalClose'));
 
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch { /* silencioso */ }
 
    setKioskActive(false);
    // Notifica AssistenteClient para sincronizar seu state interno
    window.dispatchEvent(new CustomEvent('eai:kioskExitConfirmed'));
    showToast('Modo Kiosk desativado', 'success');
  };
 
  const handleCancelExit = () => {
    setShowExitOverlay(false);
    setExitPasswordInput('');
    setExitPasswordError(false);
    window.dispatchEvent(new CustomEvent('eai:modalClose'));
  };
 
  const handleToggleModoVenda = () => {
    window.dispatchEvent(new CustomEvent('voiceAssistantFunctionClick', {
      detail: { functionKey: 'modo_venda' },
    }));
  };
 
  if (!mounted) {
    return (
      <header className={`w-full border-b ${
        overlayMode
          ? 'bg-transparent border-transparent'
          : 'bg-gradient-to-r from-slate-950/80 via-slate-900/70 to-slate-950/80 border-white/5 backdrop-blur-xl'
      }`}>
        <div className={`${overlayMode ? 'px-6 py-4' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4'} h-[72px]`} />
      </header>
    );
  }
 
  return (
    <>
      <SlugHeader
        company={company}
        slug={slug}
        pageType={pageType}
        theme={theme}
        overlayMode={overlayMode}
        isKioskMode={isKioskMode}
        isWakeLockActive={isActive}
        isWakeLockSupported={isSupported}
        isPortrait={isPortrait}
        showControls={showControls}
        onEnterKioskMode={handleEnterKioskMode}
        onExitKioskMode={handleExitKioskMode}
        onToggleWakeLock={handleToggleWakeLock}
        onToggleModoVenda={handleToggleModoVenda}
        onToggleTheme={forceTheme ? undefined : handleToggleTheme}
        onClose={overlayMode ? onClose : undefined}
      />
 
      {/* ── Mini-overlay de saída do kiosk ──────────────────── */}
      {showExitOverlay && (
        <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`rounded-2xl shadow-2xl overflow-hidden w-full max-w-sm ${
            theme === 'dark'
              ? 'bg-slate-800 border border-white/10'
              : 'bg-white border border-gray-200'
          }`}>
 
            {/* Cabeçalho */}
            <div className={`px-6 py-5 border-b flex items-center gap-3 ${
              theme === 'dark' ? 'border-white/10 bg-red-500/10' : 'border-gray-100 bg-red-50'
            }`}>
              {/* FIX 3: ícone = 4 setas do kiosk em vermelho */}
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </div>
              <div>
                <h3 className={`font-semibold text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Sair do Modo Kiosk
                </h3>
                <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-white/50' : 'text-gray-500'}`}>
                  Digite a senha para desativar
                </p>
              </div>
            </div>
 
            {/* Formulário */}
            <div className="px-6 py-5 space-y-4">
              <input
                type="password"
                value={exitPasswordInput}
                onChange={(e) => setExitPasswordInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConfirmExit()}
                autoFocus
                placeholder="••••••••"
                className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none transition-colors text-base ${
                  exitPasswordError
                    ? 'border-red-500 focus:border-red-500'
                    : 'focus:border-blue-500'
                } ${
                  theme === 'dark'
                    ? 'bg-slate-700 border-white/10 text-white placeholder-white/30'
                    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                }`}
              />
              {exitPasswordError && (
                <p className="text-red-500 text-sm flex items-center gap-1.5">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Senha incorreta
                </p>
              )}
 
              <div className="flex gap-3">
                <button
                  onClick={handleCancelExit}
                  className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                    theme === 'dark'
                      ? 'bg-white/5 hover:bg-white/10 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmExit}
                  className="flex-1 py-2.5 rounded-lg font-medium text-sm bg-red-500 hover:bg-red-600 text-white transition-colors active:scale-95"
                >
                  Confirmar saída
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
 
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9998] pointer-events-none">
          <div className={`px-6 py-3 rounded-lg shadow-lg backdrop-blur-xl border flex items-center space-x-3 ${
            theme === 'dark'
              ? 'bg-slate-800/95 border-white/10 text-white'
              : 'bg-white/95 border-gray-200 text-gray-900'
          }`}>
            {toast.type === 'success' && (
              <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {toast.type === 'warning' && (
              <svg className="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
            {toast.type === 'error' && (
              <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        </div>
      )}
    </>
  );
}
