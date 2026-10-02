import Image from 'next/image';
import type { ReactNode } from 'react';

type Props = {
  eyebrow: string;
  title: string;
  intro?: string;
  children: ReactNode;
};

export default function PixWikiPublicPage({ eyebrow, title, intro, children }: Props) {
  return (
    <main className="min-h-screen bg-[#020617] text-white">
      <header className="border-b border-white/10 bg-[#020617]/95">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <a href="https://pix.wiki" className="flex items-center gap-2">
            <Image src="/brands/pix/pixwiki.png" alt="PixWiki" width={40} height={40} className="rounded-xl" priority />
            <span className="font-black">PixWiki</span>
          </a>
          <a href="https://pix.wiki" className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-white/70">Voltar</a>
        </div>
      </header>
      <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-400">{eyebrow}</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
        {intro ? <p className="mt-4 max-w-3xl text-sm leading-7 text-white/60">{intro}</p> : null}
        <div className="mt-9 space-y-8 text-sm leading-7 text-white/70 [&_a]:font-bold [&_a]:text-emerald-400 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-black [&_h2]:text-white [&_h3]:mb-2 [&_h3]:font-black [&_h3]:text-white [&_li]:mb-1 [&_strong]:text-white [&_ul]:list-disc [&_ul]:pl-5">
          {children}
        </div>
      </article>
    </main>
  );
}
