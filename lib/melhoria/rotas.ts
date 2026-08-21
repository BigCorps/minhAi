// lib/melhoria/rotas.ts
// ─────────────────────────────────────────────────────────────────────────────
// Em melhoria.org o middleware reescreve TODOS os caminhos, então o link é
// `/remedios` e a barra de endereço mostra `melhoria.org/remedios`.
//
// Mas os arquivos continuam em `app/melhoria/…`. Se alguém abrir o app por
// outro host — `localhost:3000/melhoria`, uma preview da Vercel, ou
// `minhai.app/melhoria` — o caminho limpo não existe e todo link quebra.
//
// Esta função resolve o prefixo em tempo de execução: se a URL atual já está
// sob /melhoria, mantém o prefixo; se não, usa o caminho limpo. Assim o mesmo
// código funciona em produção e em desenvolvimento, sem variável de ambiente.
// ─────────────────────────────────────────────────────────────────────────────

/** Monta um caminho interno da MelhorIA. Use SEMPRE isto em vez de string. */
export function rota(caminho: string): string {
  const limpo = caminho.startsWith('/') ? caminho : `/${caminho}`;

  // No servidor não há como saber o host aqui; o caminho limpo é o de
  // produção, e é o que vai para o HTML inicial.
  if (typeof window === 'undefined') return limpo;

  const atual = window.location.pathname;
  const sobPrefixo = atual === '/melhoria' || atual.startsWith('/melhoria/');

  if (!sobPrefixo) return limpo;
  return limpo === '/' ? '/melhoria' : `/melhoria${limpo}`;
}

// Atalhos nomeados: evita espalhar strings soltas pelo código e deixa a
// renomeação de uma tela ser um único ponto de edição.
export const R = {
  landing:      () => rota('/'),
  app:          () => rota('/app'),
  login:        () => rota('/login'),
  consentimento:() => rota('/consentimento'),
  perfil:       () => rota('/perfil'),
  remedios:     () => rota('/remedios'),
  remedioNovo:  () => rota('/remedios/novo'),
  receita:      () => rota('/receita'),
  agenda:       () => rota('/agenda'),
  agendaNova:   () => rota('/agenda/novo'),
  compras:      () => rota('/compras'),
  verificar:    () => rota('/verificar'),
  emergencia:   () => rota('/emergencia'),
  creditos:     () => rota('/creditos'),
  familia:      () => rota('/familia'),
  conversa:     () => rota('/conversa'),
  convite:      () => rota('/convite'),
  termos:       () => rota('/termos'),
  aviso:        () => rota('/aviso'),
  exclusao:     () => rota('/exclusao'),
} as const;
