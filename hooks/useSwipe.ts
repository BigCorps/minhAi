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
  const isExcluded = useRef<boolean>(false); // ← novo

  useEffect(() => {
    const isInExcludedElement = (target: EventTarget | null): boolean => {
      if (!target) return false;
      let el = target as HTMLElement;
      while (el && el !== document.body) {
        if (el.dataset?.noSwipe !== undefined) return true;
        el = el.parentElement as HTMLElement;
      }
      return false;
    };

    const isInHeader = (y: number): boolean => y < 72;

    // ===== TOUCH (Mobile) =====
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (isInHeader(touch.clientY) || isInExcludedElement(e.target)) {
        isExcluded.current = true;
        return;
      }
      isExcluded.current = false;
      touchStartX.current = touch.clientX;
      touchStartY.current = touch.clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (isExcluded.current) return;

      const touch = e.changedTouches[0];
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

    const handleTouchCancel = () => {
      isExcluded.current = false;
      touchStartX.current = 0;
      touchStartY.current = 0;
    };

    // ===== MOUSE (Desktop) =====
    const handleMouseDown = (e: MouseEvent) => {
      if (isInHeader(e.clientY) || isInExcludedElement(e.target)) {
        isExcluded.current = true;
        return;
      }
      isExcluded.current = false;
      isDragging.current = true;
      mouseStartX.current = e.clientX;
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!isDragging.current || isExcluded.current) {
        isDragging.current = false;
        return;
      }

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
      isExcluded.current = false;
    };

    // Adicionar listeners
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    document.addEventListener('touchcancel', handleTouchCancel);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseleave', handleMouseLeave);

    // Cleanup
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchCancel);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [onSwipeLeft, onSwipeRight, threshold, thresholdDesktop]);
}