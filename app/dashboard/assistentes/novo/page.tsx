// app/dashboard/assistentes/novo/page.tsx
// Rota do novo fluxo de criação de assistente via onboarding.

import { AssistantOnboarding } from '@/components/dashboard/onboarding/AssistantOnboarding';

export const metadata = {
  title: 'Criar Assistente — minhAi',
};

export default function NovoAssistentePage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px 16px' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <img
          src="https://minhai.app/icons/icon-192x192.png"
          alt="minhAi"
          style={{ width: 44, marginBottom: 12 }}
        />
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#000080', margin: '0 0 8px' }}>
          Criar novo assistente
        </h1>
        <p style={{ color: '#64748b', fontSize: 15, margin: 0 }}>
          Leva menos de 5 minutos e não precisa saber nada de tecnologia.
        </p>
      </div>

      <AssistantOnboarding />
    </div>
  );
}
