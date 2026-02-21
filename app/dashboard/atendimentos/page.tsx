// ARQUIVO: app/dashboard/atendimentos/page.tsx

import { ConnectionManager } from './_components/ConnectionManager';

export const metadata = {
  title: 'Atendimentos Meta | eAi',
  description: 'Gerencie suas conexões com WhatsApp Business, Instagram e Facebook Messenger',
};

export default function AtendimentosPage() {
  return (
    <div className="container max-w-3xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Atendimentos Meta</h1>
        <p className="text-muted-foreground mt-1">
          Conecte seus assistentes ao WhatsApp Business, Instagram e Facebook Messenger.
        </p>
      </div>

      <ConnectionManager />
    </div>
  );
}
