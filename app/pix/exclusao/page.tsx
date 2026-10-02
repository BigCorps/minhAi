import PixWikiPublicPage from '@/components/pix/PixWikiPublicPage';

export default function PixWikiDeletionPage() {
  return <PixWikiPublicPage eyebrow="Dados" title="Exclusão de dados — PixWiki" intro="Você pode solicitar a exclusão da conta e dos dados associados à PixWiki. A revogação da autorização no Mercado Pago é uma etapa separada e também pode ser feita na própria conta do provedor.">
    <section><h2>Como solicitar</h2><p>Envie a solicitação usando o e-mail da conta PixWiki para <a href="mailto:contato@bigcorps.com.br">contato@bigcorps.com.br</a>, informando que deseja excluir os dados da PixWiki. Para proteger a conta, podemos pedir confirmação de identidade antes de executar a solicitação.</p></section>
    <section><h2>O que é removido</h2><p>Quando a solicitação é confirmada, removemos ou anonimizamos, conforme aplicável, configurações de empresa, equipe, notificações, chaves de integração e demais dados que não precisem permanecer por obrigação legal, cobrança, prevenção a fraude, segurança ou auditoria.</p></section>
    <section><h2>O que pode precisar permanecer</h2><p>Registros fiscais, financeiros, de segurança e de auditoria podem ser mantidos pelo período exigido pela legislação ou necessário para exercício regular de direitos. Esses dados deixam de ser usados para finalidades incompatíveis.</p></section>
    <section><h2>Mercado Pago</h2><p>A exclusão da PixWiki não encerra sua conta Mercado Pago. Se quiser revogar a autorização de acesso concedida à PixWiki, faça também a revogação nas configurações da própria conta Mercado Pago.</p></section>
  </PixWikiPublicPage>;
}
