import Image from 'next/image';
import Link from 'next/link';
import { Check, MonitorSmartphone, Puzzle, Shirt, Sparkles } from 'lucide-react';

export default function FuncionarIALandingPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] text-slate-950">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
        <div className="flex items-center gap-2"><Image src="/brands/funcionaria/logo.png" alt="FuncionarIA" width={50} height={50} className="h-12 w-12 object-contain"/><span className="text-lg font-black">FuncionarIA</span></div>
        <div className="flex items-center gap-2"><Link href="/login" className="rounded-xl px-4 py-2.5 text-sm font-black text-slate-600 hover:bg-white">Entrar</Link><Link href="/onboarding?new=1" className="rounded-xl bg-[#6D28D9] px-4 py-2.5 text-sm font-black text-white">Criar grátis</Link></div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:py-20">
        <div><div className="inline-flex items-center gap-2 rounded-full bg-lime-100 px-3 py-1.5 text-xs font-black text-lime-800"><Sparkles className="h-4 w-4"/> Comece grátis</div><h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">A funcionária IA que <span className="text-[#6D28D9]">veste a camisa</span> da sua empresa, no presencial e no online.</h1><p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">Escolha onde ela trabalha, o que ela sabe fazer e pague somente pelas habilidades que sua empresa precisa.</p><div className="mt-7 flex flex-wrap gap-3"><Link href="/onboarding?new=1" className="rounded-2xl bg-[#6D28D9] px-6 py-4 text-sm font-black text-white shadow-xl shadow-violet-900/15">Contrate sua FuncionarIA grátis agora mesmo</Link><a href="#como-funciona" className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-black text-slate-700">Como funciona</a></div><div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-slate-500">{['Subdomínio próprio','FAQ e recepção grátis','Widget no site','Use no seu equipamento'].map(item=><span key={item} className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-lime-600"/>{item}</span>)}</div></div>
        <div className="rounded-[36px] border border-violet-100 bg-white p-6 shadow-2xl shadow-violet-950/10"><div className="flex min-h-[430px] items-center justify-center rounded-[28px] bg-gradient-to-br from-violet-50 via-white to-lime-50 p-8 text-center"><div><Image src="/brands/funcionaria/logo-512.png" alt="FuncionarIA" width={260} height={260} className="mx-auto h-56 w-56 object-contain"/><div className="mt-4 text-sm font-black text-[#6D28D9]">Na próxima etapa: funcionária visual personalizável</div><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">Camiseta, gola, mangas, logo e fundo nas cores da empresa, com movimento de boca sincronizado à fala.</p></div></div></div>
      </section>

      <section id="como-funciona" className="border-y border-violet-100 bg-white"><div className="mx-auto max-w-7xl px-4 py-14 sm:px-6"><div className="text-center"><div className="text-xs font-black uppercase tracking-[.18em] text-[#6D28D9]">Uma funcionária. Várias habilidades.</div><h2 className="mt-3 text-3xl font-black">O sistema cresce só quando sua empresa precisa</h2></div><div className="mt-9 grid gap-4 md:grid-cols-3">{[
        [Shirt,'Vista a camisa','Personalize cores, logo e fundo da sua FuncionarIA.'],
        [Puzzle,'Escolha habilidades','Fila, agenda, vendas, caixa, canais e fiscal entram conforme a necessidade.'],
        [MonitorSmartphone,'Use em qualquer lugar','Tablet, computador, terminal touch, subdomínio e widget no site.'],
      ].map(([Icon,title,desc]:any)=><div key={title} className="rounded-3xl border border-slate-100 bg-slate-50 p-6"><Icon className="h-7 w-7 text-[#6D28D9]"/><h3 className="mt-4 text-lg font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{desc}</p></div>)}</div></div></section>

      <footer className="mx-auto max-w-7xl px-4 py-8 text-center text-xs font-bold text-slate-400 sm:px-6">FuncionarIA · BigCorps</footer>
    </main>
  );
}