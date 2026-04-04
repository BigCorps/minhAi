'use client';

import { useState, useEffect } from 'react';

interface SlugFooterProps {
  theme: 'dark' | 'light';
  slug?: string;
  webapp_enabled?: boolean;
}

export default function SlugFooter({ theme, slug, webapp_enabled }: SlugFooterProps) {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setTime(`${hours}:${minutes}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  const isDark = theme === 'dark';

  // Se o webapp estiver ativo e o slug disponível, aponta para o subdomínio próprio
  const hasWebapp = webapp_enabled && slug;
  const href = hasWebapp ? `https://${slug}.minhai.app` : 'https://minhai.app';

  // Texto do link: "[slug].minhAi.app" ou "minhAi.app"
  const linkLabel = hasWebapp ? (
    <>
      <span className="opacity-50">{slug}</span>
      <span>.minhAi.app</span>
    </>
  ) : (
    'minhAi.app'
  );

  const styles = {
    container: {
      background: isDark
        ? 'linear-gradient(to right, rgba(2, 6, 23, 0.8), rgba(15, 23, 42, 0.7), rgba(2, 6, 23, 0.8))'
        : 'rgba(255, 255, 255, 0.8)',
      borderTopColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgb(229, 231, 235)',
      color: isDark ? 'rgb(226, 232, 240)' : 'rgb(30, 41, 59)',
    },
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-20 h-8 border-t backdrop-blur-xl"
      style={styles.container}
    >
      {/* Layout Desktop */}
      <div className="hidden md:flex h-full items-center justify-between px-4 text-xs">
        {/* Esquerda: Link clicável */}
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium hover:underline"
        >
          {linkLabel}
        </a>

        {/* Centro: Slogan */}
        <div className="text-center opacity-70">Uma IA pra chamar de sua!</div>

        {/* Direita: Relógio */}
        <div className="font-mono text-sm tabular-nums">{time}</div>
      </div>

      {/* Layout Mobile */}
      <div className="flex md:hidden h-full items-center justify-center px-4 text-xs">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium hover:underline text-center"
        >
          {linkLabel}
          <span className="opacity-70"> — Uma IA pra chamar de sua!</span>
        </a>
      </div>
    </div>
  );
}
