// ARQUIVO: app/dashboard/atendimentos/page.tsx
import { ConnectionManager } from './_components/ConnectionManager';
import { QuickActionsPanel } from './_components/QuickActionsPanel';

export const metadata = {
  title: 'Atendimentos Meta | eAi',
  description: 'Gerencie suas conexões com WhatsApp, Instagram e Facebook',
};

export default function AtendimentosPage() {
  return (
    <div className="container max-w-3xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Serviços Meta</h1>
        <p className="text-muted-foreground mt-1">
          Configure seus assistentes ao WhatsApp, Instagram e Facebook.
        </p>
      </div>
      <div className="space-y-6">
        <ConnectionManager />
        <QuickActionsPanel />
      </div>
    </div>
  );
}
