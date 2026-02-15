// components/ui/DigitalClock.tsx

import React, { useState, useEffect } from 'react';

interface DigitalClockProps {
  className?: string;
  theme?: 'dark' | 'light';
}

export default function DigitalClock({ className, theme = 'dark' }: DigitalClockProps) {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const timerId = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timerId);
  }, []);

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  if (!time) return null;

  return (
    <div className={className}>
      <div 
        className={`digital-clock-container ${
          theme === 'dark' ? 'theme-dark' : 'theme-light'
        }`}
      >
        {formatTime(time)}
      </div>
      
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@600&display=swap');
        
        .digital-clock-container {
          font-family: 'Orbitron', sans-serif;
          /* AJUSTE DE TAMANHO: text-sm ou text-xs equivalente */
          font-size: 0.875rem; 
          font-weight: 600;
          letter-spacing: 0.05em; /* Reduzi o espaçamento para ficar melhor em tamanho menor */
          line-height: 1;
          display: inline-block;
          padding: 2px 4px;
        }

        /* Verde Limão Neon */
        .theme-dark {
          color: #adff2f; /* GreenYellow */
          text-shadow: 
            0 0 4px rgba(173, 255, 47, 0.5),
            0 0 8px rgba(173, 255, 47, 0.3);
        }

        .theme-light {
          color: #1a202c;
          text-shadow: none;
        }
      `}</style>
    </div>
  );
}
