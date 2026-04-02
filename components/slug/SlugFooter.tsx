// components/slug/SlugFooter.tsx

'use client';

import { useState, useEffect } from 'react';

interface SlugFooterProps {
  theme: 'dark' | 'light';
}

export default function SlugFooter({ theme }: SlugFooterProps) {
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
        {/* Esquerda: Logo/Nome clicável */}
        <a
          href="https://minhai.app"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium hover:underline"
        >
          minhAi.app
        </a>

        {/* Centro: Slogan */}
        <div className="text-center opacity-70">Uma IA pra chamar de sua!</div>

        {/* Direita: Relógio */}
        <div className="font-mono text-sm tabular-nums">{time}</div>
      </div>

      {/* Layout Mobile */}
      <div className="flex md:hidden h-full items-center justify-center px-4 text-xs">
        <a
          href="https://minhai.app"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium hover:underline text-center"
        >
          minhAi.app — Uma IA pra chamar de sua!
        </a>
      </div>
    </div>
  );
}
