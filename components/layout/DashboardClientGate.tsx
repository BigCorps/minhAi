// components/layout/DashboardClientGate.tsx
'use client';
import { useAssistant } from '@/contexts/AssistantContext';

export function DashboardClientGate({ children }: { children: React.ReactNode }) {
  const { loadingAssistants } = useAssistant();

  if (loadingAssistants) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
