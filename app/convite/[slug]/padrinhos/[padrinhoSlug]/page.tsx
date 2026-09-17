import { notFound } from 'next/navigation';
import { MapPin, Shirt } from 'lucide-react';
import { buscarEventoPublicado, adminConviteria } from '@/lib/conviteria/servidor';
import { acharTema } from '@/lib/conviteria/temas';
import AceitarPadrinhos from '@/components/conviteria/gestao/AceitarPadrinhos';

type Props = { params: Promise<{ slug: string; padrinhoSlug: string }> };
export const revalidate = 60;

export default async function Pagina({ params }: Props) {
  const { slug, padrinhoSlug } = await params;
  const evento = await buscarEventoPublicado(slug); if (!evento) notFound();
  const admin = adminConviteria();
  const { data: p } = await admin.from('padrinhos_convites').select('*').eq('evento_id', evento.id).eq('slug', padrinhoSlug).maybeSingle();
  if (!p) notFound();
  const t = acharTema(evento.cfg.temaId);
  const cores = Array.isArray(p.cores_recomendadas) ? p.cores_recomendadas as string[] : [];
  const endereco = [evento.cfg.local?.nome, evento.cfg.local?.logradouro, evento.cfg.local?.cidade].filter(Boolean).join(' · ');
  return (
    <main className="min-h-screen px-4 py-10" style={{ background: t.fora, color: t.tinta }}>
      <article className="mx-auto max-w-xl overflow-hidden rounded-[28px] border bg-white shadow-xl" style={{ borderColor: `${t.acento}44`, background: t.papel }}>
        {p.foto_url && <img src={p.foto_url as string} alt="" className="h-72 w-full object-cover" />}
        <div className="p-7 text-center">
          <p className="text-xs font-bold uppercase tracking-[.2em]" style={{ color: t.acentoTexto }}>Um convite especial</p>
          <h1 className="mt-3 text-3xl font-semibold">{p.nome}</h1>
          {p.papel && <p className="mt-1 text-sm" style={{ color: t.tintaSuave }}>{p.papel}</p>}
          <p className="mt-6 whitespace-pre-wrap leading-7" style={{ color: t.tintaSuave }}>{p.mensagem || 'Vocês fazem parte da nossa história e queremos muito tê-los ao nosso lado neste dia.'}</p>
          <div className="mt-6 rounded-2xl border p-4 text-left" style={{ borderColor: `${t.acento}33` }}>
            <p className="font-semibold">{evento.cfg.evento.dataExtenso} · {evento.cfg.evento.horario}</p>
            {endereco && <p className="mt-2 flex gap-2 text-sm" style={{ color: t.tintaSuave }}><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{endereco}</p>}
            {p.dress_code && <p className="mt-3 flex gap-2 text-sm" style={{ color: t.tintaSuave }}><Shirt className="mt-0.5 h-4 w-4 shrink-0" />{p.dress_code}</p>}
            {cores.length > 0 && <div className="mt-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wide">Cores sugeridas</p><div className="flex gap-2">{cores.map((c) => <span key={c} title={c} className="h-8 w-8 rounded-full border border-black/10" style={{ backgroundColor: c }} />)}</div></div>}
          </div>
          <AceitarPadrinhos eventoId={evento.id} slug={padrinhoSlug} aceito={p.resposta === 'aceito'} />
        </div>
      </article>
    </main>
  );
}
