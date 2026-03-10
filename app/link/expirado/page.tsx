// app/link/expirado/page.tsx
// Página estática mostrada quando o link curto já expirou.

export default function LinkExpiradoPage() {
  return (
    <div className="min-h-[100dvh] bg-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-sm flex flex-col items-center gap-4 text-center">
        <h2 className="text-xl font-bold text-white">Link expirado</h2>
        <p className="text-slate-400 text-sm max-w-xs">
          Este link expirou. Volte ao assistente e gere um novo.
        </p>
      </div>
    </div>
  );
}
