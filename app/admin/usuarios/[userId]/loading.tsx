export default function AdminUserLoading() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="border-b border-white/10 px-6 py-4">
        <div className="mx-auto h-10 max-w-[1500px] animate-pulse rounded-xl bg-white/5" />
      </div>

      <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-40 animate-pulse rounded-3xl border border-white/10 bg-white/[0.035]" />

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-2xl border border-white/10 bg-white/[0.035]"
            />
          ))}
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="h-64 animate-pulse rounded-3xl border border-white/10 bg-white/[0.035]"
            />
          ))}
        </div>
      </div>
    </main>
  );
}
