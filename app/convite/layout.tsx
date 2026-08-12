import type { Metadata } from 'next';

// Metadados específicos para a marca ConviteIA
export const metadata: Metadata = {
  title: 'Convite IA | Crie seu convite com IA!',
  description: 'Crie convites digitais elegantes, gerencie confirmações de presença e encante seus convidados com IA.',
  icons: {
    icon: '/icones/marca-256.png', // Puxando do padrão que você definiu no brand.ts
  },
};

export default function ConviteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Um fundo neutro e limpo, isolando a interface da minhAi
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 antialiased">
      {/* Aqui você pode adicionar um Header fixo no futuro, se quiser */}
      <div className="flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
}