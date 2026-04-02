// hooks/useSwipe.ts

import { useEffect, useRef } from 'react';

interface UseSwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  thresholdDesktop?: number;
}

export function useSwipe({
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,        // mobile
  thresholdDesktop = 80  // desktop (drag)
}: UseSwipeOptions) {
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const mouseStartX = useRef<number>(0);
  const isDragging = useRef<boolean>(false);

  useEffect(() => {
    // Ignorar eventos em áreas específicas
    const isInExcludedArea = (y: number): boolean => {
      const viewportHeight = window.innerHeight;
      // Primeiros 72px (header) e últimos 80px (carrossel)
      return y < 72 || y > (viewportHeight - 80);
    };

    // ===== TOUCH (Mobile) =====
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (isInExcludedArea(touch.clientY)) return;
      
      touchStartX.current = touch.clientX;
      touchStartY.current = touch.clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      if (isInExcludedArea(touchStartY.current)) return;

      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = Math.abs(touch.clientY - touchStartY.current);

      // Garantir que é um swipe horizontal (não scroll vertical)
      if (deltaY > 50) return;

      if (Math.abs(deltaX) > threshold) {
        if (deltaX > 0) {
          onSwipeRight?.();
        } else {
          onSwipeLeft?.();
        }
      }
    };

    // ===== MOUSE (Desktop) =====
    const handleMouseDown = (e: MouseEvent) => {
      if (isInExcludedArea(e.clientY)) return;
      
      isDragging.current = true;
      mouseStartX.current = e.clientX;
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!isDragging.current) return;
      
      const deltaX = e.clientX - mouseStartX.current;

      if (Math.abs(deltaX) > thresholdDesktop) {
        if (deltaX > 0) {
          onSwipeRight?.();
        } else {
          onSwipeLeft?.();
        }
      }

      isDragging.current = false;
    };

    const handleMouseLeave = () => {
      isDragging.current = false;
    };

    // Adicionar listeners
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseleave', handleMouseLeave);

    // Cleanup
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [onSwipeLeft, onSwipeRight, threshold, thresholdDesktop]);
}
