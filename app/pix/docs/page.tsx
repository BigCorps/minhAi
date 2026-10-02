import PixWikiPublicPage from '@/components/pix/PixWikiPublicPage';

function Code({ children }: { children: string }) { return <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-black/30 p-4 text-xs leading-6 text-emerald-200"><code>{children}</code></pre>; }

export default function PixWikiDocsPage() {
  return <PixWikiPublicPage eyebrow="API V2" title="Documentação de integração PixWiki" intro="Base URL: https://pix.wiki/api/v1. A API lê empresas/recebimentos e cria Checkouts Pix vinculados ao seu sistema.">
    <section><h2>Autenticação</h2><p>Envie sua chave no cabeçalho Authorization. Guarde <strong>pw_live_…</strong> somente no backend.</p><Code>{`Authorization: Bearer pw_live_...`}</Code></section>
    <section><h2>Endpoints</h2><ul><li>GET /companies</li><li>GET /summary</li><li>GET /receipts</li><li>GET /receipts/:id</li><li>GET /checkouts</li><li>POST /checkouts</li><li>GET /checkouts/:id</li><li>POST /checkouts/:id/cancel</li></ul></section>
    <section><h2>Criar Checkout</h2><p>POST /checkouts exige <strong>Idempotency-Key</strong>. Repetir a mesma chave para o mesmo usuário devolve o mesmo Checkout, evitando duplicidade em retries.</p><Code>{`POST /api/v1/checkouts\nAuthorization: Bearer pw_live_...\nIdempotency-Key: pedido-8742\nContent-Type: application/json\n\n{\n  "company_id": "...",\n  "amount_cents": 14990,\n  "external_id": "pedido-8742",\n  "description": "Pedido 8742",\n  "customer": { "name": "Cliente" },\n  "metadata": { "erp": "meu-sistema" },\n  "success_url": "https://exemplo.com/pago"\n}`}</Code></section>
    <section><h2>Webhook pix.received</h2><p>O contrato atual usa versão <strong>2026-10-01</strong>. O payload mantém os campos básicos do recebimento e, quando houver Checkout/API, inclui contexto com checkout_id, external_id, customer e metadata.</p><p>Cabeçalhos relevantes: X-PixWiki-Event, X-PixWiki-Event-Id, X-PixWiki-Timestamp, X-PixWiki-Version, X-PixWiki-Signature e Idempotency-Key.</p></section>
    <section><h2>Validação da assinatura</h2><p>Calcule HMAC SHA-256 usando o segredo do Webhook sobre <strong>&lt;timestamp&gt;.&lt;raw_body&gt;</strong> e compare em tempo constante com o valor <strong>v1=&lt;hex&gt;</strong> recebido.</p></section>
    <section><h2>Retries e idempotência</h2><p>Falhas temporárias podem gerar novas tentativas aproximadamente em 1, 5, 30 e 120 minutos, até cinco tentativas no total. Trate o X-PixWiki-Event-Id/Idempotency-Key como chave de deduplicação.</p></section>
    <section><h2>Modelo de consumo</h2><p>GETs não consomem Automação PixWiki. Criar um Checkout que não é pago também não consome. Quando um pagamento automatizado é concluído, ele gera no máximo uma unidade de uso, independentemente da quantidade de canais usados no mesmo recebimento.</p></section>
  </PixWikiPublicPage>;
}
