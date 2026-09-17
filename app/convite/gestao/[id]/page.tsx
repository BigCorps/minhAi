import GestaoEvento from '@/components/conviteria/gestao/GestaoEvento';

type Props = { params: Promise<{ id: string }> };
export default async function Pagina({ params }: Props) {
  const { id } = await params;
  return <GestaoEvento eventoId={id} />;
}
