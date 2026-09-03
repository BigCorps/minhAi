export default function AdminLoading() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="border-b border-white/10 px-6 py-4">
        <div className="mx-auto h-10 max-w-[1600px] animate-pulse rounded-xl bg-white/5" />
      </div>

      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 h-24 max-w-2xl animate-pulse rounded-2xl bg-white/[0.035]" />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-2xl border border-white/10 bg-white/[0.035]"
            />
          ))}
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <div className="h-80 animate-pulse rounded-3xl border border-white/10 bg-white/[0.035]" />
          <div className="h-80 animate-pulse rounded-3xl border border-white/10 bg-white/[0.035]" />
        </div>

        <div className="mt-6 h-[520px] animate-pulse rounded-3xl border border-white/10 bg-white/[0.035]" />
      </div>
    </main>
  );
}
