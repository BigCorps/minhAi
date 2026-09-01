// Server component só para marcar a rota como dinâmica.
//
// Não dá para colocar `export const dynamic` no arquivo do client component:
// opções de segmento de rota só valem em server component. E sem isso o Next
// pré-renderiza a página no build, o createClient() do Supabase roda no
// servidor e o _recoverAndRefresh tenta ler cookie fora de uma requisição.
//
// Página de dashboard autenticada nunca deveria ser estática mesmo.
export const dynamic = 'force-dynamic';

import AgendaClient from './AgendaClient';

export default function Page() {
  return <AgendaClient />;
}