'use client';

import { useState, useEffect } from 'react';
import CategoryCarousel from '@/components/assistant/CategoryCarousel';

interface CategoryCarouselWrapperProps {
  companyId: string;
  hideDisabledFunctions?: boolean;
  autoScroll?: boolean;
  onFunctionClick?: (functionKey: string) => void;
  theme?: 'dark' | 'light';
}

/**
 * Wrapper que esconde o CategoryCarousel quando o teclado virtual abre
 * Usa eventos customizados 'eai:virtualKeyboardOpen' e 'eai:virtualKeyboardClose'
 */
export default function CategoryCarouselWrapper({
  companyId,
  hideDisabledFunctions = false,
  autoScroll = true,
  onFunctionClick,
  theme = 'dark',
}: CategoryCarouselWrapperProps) {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    const handleKeyboardOpen = () => setIsKeyboardOpen(true);
    const handleKeyboardClose = () => setIsKeyboardOpen(false);
    
    window.addEventListener('eai:virtualKeyboardOpen', handleKeyboardOpen);
    window.addEventListener('eai:virtualKeyboardClose', handleKeyboardClose);
    
    return () => {
      window.removeEventListener('eai:virtualKeyboardOpen', handleKeyboardOpen);
      window.removeEventListener('eai:virtualKeyboardClose', handleKeyboardClose);
    };
  }, []);

  // Esconde completamente quando teclado está aberto
  if (isKeyboardOpen) {
    return null;
  }

  return (
    <CategoryCarousel
      companyId={companyId}
      hideDisabledFunctions={hideDisabledFunctions}
      autoScroll={autoScroll}
      onFunctionClick={onFunctionClick}
      theme={theme}
    />
  );
}
