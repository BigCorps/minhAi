// components/ui/DigitalClock.tsx

import React, { useState, useEffect } from 'react';

interface DigitalClockProps {
  className?: string;
}

export default function DigitalClock({ className }: DigitalClockProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timerId = setInterval(() => {
      setTime(new Date());
    }, 1000); // Atualiza a cada segundo para precisão, mas só mostra minutos

    return () => clearInterval(timerId);
  }, []);

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  return (
    <div className={className}>
      {formatTime(time)}
    </div>
  );
}
