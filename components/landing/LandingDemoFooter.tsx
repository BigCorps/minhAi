'use client';

// components/landing/LandingDemoFooter.tsx
// Footer fixo da landing — só a frase centralizada, sem carrossel.

interface LandingDemoFooterProps {
  theme?: 'dark' | 'light';
}

export function LandingDemoFooter({ theme = 'dark' }: LandingDemoFooterProps) {
  const isDark = theme === 'dark';

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-[50] h-7 border-t backdrop-blur-xl flex items-center justify-center ${
      isDark
        ? 'bg-slate-950/90 border-white/5'
        : 'bg-slate-50/90 border-slate-200'
    }`}>
      <span className={`text-[10px] font-medium tracking-wide ${
        isDark ? 'text-white/25' : 'text-slate-400'
      }`}>
        minhAi.app — Uma IA pra chamar de sua!
      </span>
    </div>
  );
}
