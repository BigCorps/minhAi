import { notFound } from 'next/navigation';
import { AlertTriangle, QrCode } from 'lucide-react';
import { buscarEventoPublicado, adminConviteria } from '@/lib/conviteria/servidor';

type Props = { params: Promise<{ slug: string; token: string }> };
export const revalidate = 30;

export default async function Entrada({ params }: Props) {
  const { slug, token } = await params;
  const evento = await buscarEventoPublicado(slug);
  if (!evento) notFound();

  const admin = adminConviteria();
  const [{ data: fam }, { data: pessoa }] = await Promise.all([
    admin.from('convidado_familias').select('id,nome').eq('evento_id', evento.id).eq('qr_token', token).maybeSingle(),
    admin.from('convidados_lista').select('id').eq('evento_id', evento.id).eq('qr_token', token).maybeSingle(),
  ]);
  if (!fam && !pessoa) notFound();

  if (fam) {
    const { count } = await admin.from('convidados_lista')
      .select('id', { count: 'exact', head: true })
      .eq('evento_id', evento.id)
      .eq('familia_id', fam.id)
      .eq('rsvp_extra', false);

    if ((count ?? 0) === 0) {
      return <main className="min-h-screen grid place-items-center bg-[#fff9fb] px-5 text-center text-[#40232c]"><div className="w-full max-w-md rounded-3xl border border-amber-300 bg-white p-7 shadow-xl"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-amber-50 text-amber-700"><AlertTriangle className="h-7 w-7" /></div><p className="mt-4 text-xs font-bold uppercase tracking-[.16em] text-amber-700">ConviteIA · entrada</p><h1 className="mt-2 text-2xl font-semibold">Grupo ainda sem membros cadastrados</h1><p className="mt-4 text-sm leading-6 text-[#7c5560]">Este QR pertence a uma família/grupo válido, mas os nomes das pessoas ainda não foram cadastrados pelos anfitriões. Entre em contato com eles antes do check-in.</p><p className="mt-5 font-semibold">{fam.nome}</p></div></main>;
    }
  }

  return <main className="min-h-screen grid place-items-center bg-[#fff9fb] px-5 text-center text-[#40232c]"><div className="w-full max-w-md rounded-3xl border border-[#c0607833] bg-white p-7 shadow-xl"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#fff0f4] text-[#a04a63]"><QrCode className="h-7 w-7" /></div><p className="mt-4 text-xs font-bold uppercase tracking-[.16em] text-[#a04a63]">ConviteIA · entrada</p><h1 className="mt-2 text-2xl font-semibold">QR de entrada do evento</h1><p className="mt-4 text-sm leading-6 text-[#7c5560]">Apresente este QR Code na entrada do evento. O check-in é realizado pela equipe do evento.</p><p className="mt-5 font-semibold">{evento.cfg.anfitrioes.exibicao}</p><p className="text-sm text-[#7c5560]">{evento.cfg.evento.dataExtenso}</p></div></main>;
}
