// app/dashboard/assistentes/novo/page.tsx
import { AssistantOnboarding } from '@/components/dashboard/onboarding/AssistantOnboarding';

export const metadata = {
  title: 'Criar Assistente — minhAi',
};

export default function NovoAssistentePage() {
  return (
    <div className="min-h-screen bg-transparent">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Criar novo assistente
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Leva menos de 5 minutos e não precisa saber nada de tecnologia.
          </p>
        </div>
        <AssistantOnboarding />
      </div>
    </div>
  );
}
