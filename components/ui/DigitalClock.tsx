// components/ui/DigitalClock.tsx

import React, { useState, useEffect } from 'react';

interface DigitalClockProps {
  className?: string;
  theme?: 'dark' | 'light';
}

export default function DigitalClock({ className, theme = 'dark' }: DigitalClockProps) {
  const [time, setTime] = useState<Date | null>(null); // Começa null para evitar erro de hidratação no Next.js

  useEffect(() => {
    // Define a hora inicial apenas no cliente
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

  // Se a hora ainda não carregou (server-side), retorna null ou um esqueleto
  if (!time) return null;

  return (
    <div className={className}>
      <div 
        className={`digital-clock-text ${
          theme === 'dark' ? 'theme-dark' : 'theme-light'
        }`}
      >
        {formatTime(time)}
      </div>
      
      <style jsx>{`
        /* Importando a fonte Orbitron do Google Fonts */
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700&display=swap');
        
        .digital-clock-text {
          font-family: 'Orbitron', sans-serif; /* Fonte moderna e limpa */
          font-weight: 700;
          letter-spacing: 0.15em; /* Espaçamento levemente maior */
          line-height: 1;
          display: inline-block;
          transition: all 0.3s ease;
        }

        /* Estilo para modo escuro (Efeito Neon) */
        .theme-dark {
          color: #00f0ff; /* Ciano Neon */
          text-shadow: 
            0 0 5px rgba(0, 240, 255, 0.4),
            0 0 10px rgba(0, 240, 255, 0.3),
            0 0 20px rgba(0, 240, 255, 0.2);
        }

        /* Estilo para modo claro (Estilo LCD desligado/escuro) */
        .theme-light {
          color: #2d3748;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
        }
      `}</style>
    </div>
  );
}
