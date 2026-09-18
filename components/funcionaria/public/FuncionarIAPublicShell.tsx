'use client';

import { Bot, MessageCircle, ShoppingBag, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import FuncionarIAPublicAssistant from '@/components/funcionaria/public/FuncionarIAPublicAssistant';
import FuncionarIAPublicSales from '@/components/funcionaria/public/FuncionarIAPublicSales';

type PublicView = 'store' | 'assistant';

export default function FuncionarIAPublicShell({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const forceAssistant = searchParams.get('view') === 'assistant';
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<PublicView>('assistant');
  const [widgetOpen, setWidgetOpen] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch(`/api/public/company?slug=${encodeURIComponent(slug)}`, {
          cache: 'no-store',
        });
        const data = await response.json().catch(() => ({}));
        if (!active) return;
        if (!response.ok || !data?.company?.id || !data?.is_funcionaria) {
          setProfile(null);
          return;
        }

        setProfile(data);
        const workplace = String(data?.settings?.workplace_mode || 'ambos');
        const home = String(data?.settings?.public_home_mode || 'assistant');
        if (forceAssistant) setView('assistant');
        else if (workplace === 'online') setView('store');
        else if (workplace === 'ambos' && home === 'store') setView('store');
        else setView('assistant');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [slug, forceAssistant]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.data === 'funcionaria:close') setWidgetOpen(false);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  if (loading) {
    return <main className="min-h-screen bg-slate-50 py-24 text-center text-sm font-bold text-slate-400">Carregando…</main>;
  }

  if (!profile?.company) {
    return <main className="min-h-screen bg-slate-50 py-24 text-center"><h1 className="text-2xl font-black">FuncionarIA não encontrada</h1></main>;
  }

  const settings = profile.settings || {};
  const workplace = String(settings.workplace_mode || 'ambos');
  const primary = settings.primary_color || '#6D28D9';
  const storefrontEnabled =
    workplace === 'online' ||
    workplace === 'ambos' ||
    settings.storefront_enabled === true;

  // ONLINE: loja é a experiência principal; a mesma FuncionarIA fica disponível
  // como widget flutuante no canto.
  if (workplace === 'online' && !forceAssistant) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <FuncionarIAPublicSales slug={slug} embedded />

        <button
          type="button"
          onClick={() => setWidgetOpen(true)}
          className="fixed bottom-4 right-4 z-[80] inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-black text-white shadow-2xl sm:bottom-6 sm:right-6"
          style={{ backgroundColor: primary }}
          aria-label="Falar com a FuncionarIA"
        >
          <MessageCircle className="h-5 w-5" />
          Falar com a FuncionarIA
        </button>

        {widgetOpen && (
          <div className="fixed inset-x-3 bottom-3 top-16 z-[100] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl sm:inset-auto sm:bottom-6 sm:right-6 sm:top-auto sm:h-[720px] sm:max-h-[86vh] sm:w-[410px]">
            <button
              type="button"
              onClick={() => setWidgetOpen(false)}
              className="absolute right-2 top-2 z-[110] rounded-full bg-white/95 p-2 text-slate-500 shadow"
              aria-label="Fechar atendimento"
            >
              <X className="h-4 w-4" />
            </button>
            <iframe
              src="/widget"
              title={`FuncionarIA da ${profile.company.name}`}
              className="h-full w-full border-0"
              allow="microphone"
            />
          </div>
        )}
      </div>
    );
  }

  // AMBOS e PRESENCIAL com loja ativada:
  // os dois painéis permanecem montados; trocar a aba não perde carrinho nem
  // estado da conversa.
  if (storefrontEnabled) {
    return (
      <main className="min-h-screen bg-[#F8FAFC]">
        <div className="sticky top-0 z-[70] border-b border-slate-200 bg-white/95 px-3 py-2 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setView('store')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition ${
                view === 'store' ? 'text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
              }`}
              style={view === 'store' ? { backgroundColor: primary } : undefined}
            >
              <ShoppingBag className="h-4 w-4" /> Loja
            </button>
            <button
              type="button"
              onClick={() => setView('assistant')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition ${
                view === 'assistant' ? 'text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
              }`}
              style={view === 'assistant' ? { backgroundColor: primary } : undefined}
            >
              <Bot className="h-4 w-4" /> FuncionarIA
            </button>
          </div>
        </div>

        <div className={view === 'store' ? 'block' : 'hidden'} aria-hidden={view !== 'store'}>
          <FuncionarIAPublicSales slug={slug} embedded />
        </div>
        <div className={view === 'assistant' ? 'block' : 'hidden'} aria-hidden={view !== 'assistant'}>
          <FuncionarIAPublicAssistant slug={slug} />
        </div>
      </main>
    );
  }

  // PRESENCIAL sem loja ativada: mantém exatamente o atendimento como home.
  return <FuncionarIAPublicAssistant slug={slug} />;
}
