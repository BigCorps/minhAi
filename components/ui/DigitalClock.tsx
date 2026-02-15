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
    <div className={`${className}`}>
      <div className={`
        inline-flex items-center justify-center
        px-6 py-3 rounded-xl
        border-2 shadow-lg
        ${theme === 'dark' 
          ? 'bg-slate-900/90 border-slate-700/50 shadow-slate-900/50' 
          : 'bg-gray-800/90 border-gray-700/50 shadow-gray-900/50'
        }
      `}>
        <div 
          className="text-4xl font-bold tracking-wider relative"
          style={{
            fontFamily: '"Orbitron", "DS-Digital", "Courier New", monospace',
            textShadow: theme === 'dark' 
              ? '0 0 10px rgba(34, 211, 238, 0.8), 0 0 20px rgba(34, 211, 238, 0.4)' 
              : '0 0 10px rgba(239, 68, 68, 0.8), 0 0 20px rgba(239, 68, 68, 0.4)',
            color: theme === 'dark' ? '#22d3ee' : '#ef4444', // cyan para dark, red para light
            letterSpacing: '0.15em'
          }}
        >
          {formatTime(time)}
        </div>
      </div>
      
      {/* Adicionar fonte Orbitron do Google Fonts */}
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&display=swap');
      `}</style>
    </div>
  );
}
