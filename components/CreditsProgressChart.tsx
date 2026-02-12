'use client';

import { useState, useEffect } from 'react';

console.log('📦 [TestComponent] Módulo carregado - VERSÃO ULTRA SIMPLIFICADA');

export function CreditsProgressChartTest({ userId }: { userId: string }) {
  console.log('🧪 [TestComponent] Componente inicializado para userId:', userId);
  
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    console.log('🔌 [TestComponent] Componente montado no cliente');
    setMounted(true);
    
    // Detectar tema
    const isDark = document.documentElement.classList.contains('dark');
    console.log('🌓 [TestComponent] Tema atual:', isDark ? 'DARK' : 'LIGHT');
    console.log('📋 [TestComponent] Classes do html:', document.documentElement.className);
    
    // Monitorar mudanças
    const observer = new MutationObserver(() => {
      const isDarkNow = document.documentElement.classList.contains('dark');
      console.log('🔄 [TestComponent] MUDANÇA DE TEMA DETECTADA:', isDarkNow ? 'DARK' : 'LIGHT');
      console.log('📋 [TestComponent] Classes atuais:', document.documentElement.className);
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => {
      console.log('🔌 [TestComponent] Desmontando');
      observer.disconnect();
    };
  }, []);

  console.log('🎨 [TestComponent] Renderizando - mounted:', mounted);

  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
        🧪 Componente de Teste (versão simplificada)
      </h3>
      
      <div className="space-y-3">
        <div className="p-4 bg-gray-100 dark:bg-slate-700 rounded-lg">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            Status: {mounted ? '✅ Montado' : '⏳ Aguardando...'}
          </p>
        </div>
        
        <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
            User ID: {userId}
          </p>
        </div>
        
        <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-lg">
          <p className="text-sm font-medium text-green-900 dark:text-green-100">
            Este é um teste simples SEM bibliotecas externas
          </p>
        </div>
        
        <div className="p-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
          <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
            ⚠️ Verifique o console (F12) para ver os logs de debug
          </p>
        </div>

        <div className="p-4 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
          <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
            🔄 Troque o tema e observe os logs no console
          </p>
        </div>
      </div>
    </div>
  );
}
