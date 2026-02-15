// components/ui/DigitalClock.tsx

import React, { useState, useEffect } from 'react';

interface DigitalClockProps {
  className?: string;
  theme?: 'dark' | 'light';
}

export default function DigitalClock({ className, theme = 'dark' }: DigitalClockProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timerId = setInterval(() => {
      setTime(new Date());
    }, 1000); // Atualiza a cada segundo para precisão

    return () => clearInterval(timerId);
  }, []);

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  return (
    <div className={className}>
      <div 
        className={`text-3xl font-bold tracking-widest ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}
        style={{
          fontFamily: '"DS-Digital", "Orbitron", "Courier New", monospace',
          letterSpacing: '0.1em'
        }}
      >
        {formatTime(time)}
      </div>
      
      {/* Adicionar fontes digitais */}
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&display=swap');
        
        @font-face {
          font-family: 'DS-Digital';
          src: url('https://cdn.jsdelivr.net/gh/duszekmestre/fonts@master/ds-digital/DSEG7Classic-Bold.woff2') format('woff2'),
               url('https://cdn.jsdelivr.net/gh/duszekmestre/fonts@master/ds-digital/DSEG7Classic-Bold.woff') format('woff');
          font-weight: bold;
          font-style: normal;
          font-display: swap;
        }
      `}</style>
    </div>
  );
}
