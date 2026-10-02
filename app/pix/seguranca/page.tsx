import PixWikiPublicPage from '@/components/pix/PixWikiPublicPage';

export default function PixWikiSecurityPage() {
  return <PixWikiPublicPage eyebrow="Segurança" title="Como a PixWiki protege sua operação" intro="A arquitetura foi desenhada para confirmar e automatizar Pix sem transformar a PixWiki em conta de pagamento ou ponto de custódia do dinheiro do cliente.">
    <section><h2>Dinheiro fora da PixWiki</h2><p>Os pagamentos permanecem na conta Mercado Pago do recebedor. A PixWiki consulta e organiza informações necessárias para confirmação e conciliação; não mantém saldo sacável do cliente.</p></section>
    <section><h2>Credenciais no servidor</h2><p>Tokens OAuth do Mercado Pago, credenciais privilegiadas do Supabase e segredos de assinatura ficam em ambiente de servidor. O navegador opera com sessão do usuário e permissões limitadas.</p></section>
    <section><h2>Checkout com token opaco</h2><p>URLs públicas de Checkout usam um token aleatório que não contém valor, empresa ou pedido. O valor e o contexto autoritativos ficam no servidor.</p></section>
    <section><h2>API e Webhooks</h2><p>A API exige chave dedicada e suporta idempotência. Webhooks são assinados com HMAC SHA-256, têm identificador único e podem ser entregues novamente em caso de falha; o destinatário deve deduplicar pelo ID do evento.</p></section>
    <section><h2>Equipe com menor privilégio</h2><p>Owner, manager e cashier têm superfícies diferentes. O Caixa recebe apenas informação operacional necessária e não ganha acesso a credenciais, billing ou configurações administrativas.</p></section>
    <section><h2>Relato de segurança</h2><p>Para comunicar uma vulnerabilidade ou comportamento inesperado, envie detalhes para <a href="mailto:contato@bigcorps.com.br">contato@bigcorps.com.br</a>. Evite incluir chaves, senhas ou dados de terceiros no primeiro contato.</p></section>
  </PixWikiPublicPage>;
}
