import type { Metadata } from 'next';
import Link from 'next/link';
import { Camera, Check, Film, Monitor, QrCode, Smartphone, Users } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Memórias do Evento | Convite IA',
  description: 'Seus convidados enviam fotos e vídeos por QR Code e você acompanha tudo em um álbum com slideshow ao vivo.',
  icons: { icon: '/brands/convite/favicon.png' },
};

const itens = [
  ['Arte de QR Code para convidados', QrCode],
  ['Até 300 fotos e imagens', Camera],
  ['30 vídeos de até 30 segundos', Film],
  ['Sem aplicativo e sem cadastro', Users],
  ['Slideshow horizontal para TV e telão', Monitor],
  ['Slideshow vertical para painel e totem', Smartphone],
];

export default function MemoriasComercial() {
  return (
    <main className="min-h-screen bg-[#fff9fb] text-[#40232c]">
      <section className="mx-auto max-w-5xl px-5 pb-12 pt-10 sm:pt-16">
        <div className="text-center">
          <img src="/brands/convite/icone-512.png" alt="Convite IA" className="mx-auto h-16 w-16 rounded-full" />
          <p className="mt-5 text-xs font-semibold uppercase tracking-[.22em] text-[#a04a63]">Memórias em Slideshow</p>
          <h1 className="mx-auto mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">Cada convidado vê um momento diferente. Guarde todos.</h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#7c5560] sm:text-lg">Com as Memórias do Evento, seus convidados apontam a câmera para um QR Code, enviam fotos e vídeos e tudo aparece no seu álbum. No dia do evento, o slideshow se atualiza sozinho em tempo real.</p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3"><span className="rounded-full bg-[#c06078] px-6 py-3 text-lg font-semibold text-white">R$ 19,90 por evento</span><span className="text-sm text-[#7c5560]">pago uma única vez</span></div>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {itens.map(([texto, Icon]: any) => <div key={texto} className="rounded-3xl border border-[#c060782b] bg-white p-6 shadow-sm"><Icon className="h-7 w-7 text-[#c06078]" /><p className="mt-4 font-semibold">{texto}</p></div>)}
        </div>

        <section className="mt-12 rounded-[2rem] bg-[#40232c] p-7 text-white sm:p-10">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center"><div><p className="text-xs font-semibold uppercase tracking-[.2em] text-[#e9a9b9]">No dia do evento</p><h2 className="mt-2 text-3xl font-semibold">Modo Festa em tempo real</h2><p className="mt-4 leading-7 text-white/75">Abra <strong className="text-white">seuconvite.conviteia.com/album</strong> em uma TV, projetor ou painel. Durante o dia do evento e a madrugada seguinte, novas memórias aprovadas entram automaticamente na apresentação.</p></div><div className="rounded-3xl border border-white/15 bg-white/10 p-6"><div className="aspect-video rounded-2xl bg-black/50 p-5"><div className="grid h-full place-items-center rounded-xl border border-white/10 text-center"><div><Camera className="mx-auto h-9 w-9 text-[#e9a9b9]" /><p className="mt-3 font-semibold">foto → foto → vídeo → foto…</p><p className="mt-1 text-xs text-white/60">sem atualizar a página</p></div></div></div></div></div>
        </section>

        <section className="mt-12 grid gap-8 lg:grid-cols-2">
          <div><h2 className="text-3xl font-semibold">Como funciona</h2><ol className="mt-6 space-y-4">{['Adicione Memórias do Evento antes de pagar seu convite.', 'Você recebe um QR Code e o link /memorias.', 'Os convidados enviam fotos e vídeos sem criar conta.', 'Os envios entram automaticamente no álbum — ou você pode ligar a aprovação manual.', 'Depois da festa, baixe tudo em um arquivo ZIP.'].map((x,i)=><li key={x} className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#f7e2e6] text-sm font-semibold text-[#a04a63]">{i+1}</span><span className="pt-0.5 text-[#7c5560]">{x}</span></li>)}</ol></div>
          <div className="rounded-3xl border border-[#c0607830] bg-white p-7"><h3 className="text-xl font-semibold">O pacote inclui</h3><ul className="mt-5 space-y-3 text-sm text-[#7c5560]">{['300 fotos compactadas automaticamente','30 vídeos de até 30 s com compactação automática','300 MB de espaço por evento','Convidados ilimitados','Álbum e slideshow em pé ou deitado','Moderação opcional','Download em ZIP','Disponível até 90 dias após o evento'].map(x=><li key={x} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{x}</li>)}</ul><p className="mt-6 rounded-2xl bg-[#fff5f8] p-4 text-sm text-[#7c5560]">No plano mensal, o convite continua incluído normalmente. O Memórias é um opcional de <strong className="text-[#40232c]">R$ 19,90 para cada convite</strong> em que você quiser ativá-lo.</p></div>
        </section>

        <div className="mt-12 text-center"><Link href="/convite/criar" className="inline-flex rounded-full bg-[#c06078] px-7 py-3.5 font-semibold text-white shadow-sm">Criar meu convite</Link><p className="mt-3 text-xs text-[#7c5560]">Você escolhe o Memórias somente no final, antes do pagamento.</p></div>
      </section>
    </main>
  );
}
