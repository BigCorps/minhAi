import CheckinAcessoCliente from './CheckinAcessoCliente';

export default async function CheckinExternoPage({
  params,
}: {
  params: Promise<{ eventoId: string }>;
}) {
  const { eventoId } = await params;
  return <CheckinAcessoCliente eventoId={eventoId} />;
}
