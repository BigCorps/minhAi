'use client';

import {
  LEGAL_THEMES,
  LegalShell,
  LegalFooterLinks,
  ControladorBox,
  H2,
  H3,
  P,
  UL,
  LI,
  OL,
  Box,
} from '@/components/legal/legal-doc';

const T = LEGAL_THEMES.pix;

export default function AvisoPrivacidadePixWiki() {
  return (
    <LegalShell theme={T} title="Aviso de Privacidade" updatedAt="20 de agosto de 2026">
      <P>
        Este Aviso explica como o <strong>PixWiki</strong> trata dados pessoais de recebedores e,
        quando fornecidos pelo provedor financeiro, dados mínimos relacionados aos pagamentos.
      </P>

      <H2>1. Dados do recebedor</H2>
      <UL>
        <LI><strong>Conta:</strong> nome, e-mail e identificadores de autenticação</LI>
        <LI><strong>Contato:</strong> e-mail e telefone/WhatsApp usados para notificações</LI>
        <LI><strong>Recebedor:</strong> nome, logo e outros dados de identificação informados</LI>
        <LI><strong>Pix:</strong> chave Pix e tipo da chave</LI>
        <LI>
          <strong>Mercado Pago:</strong> identificadores da conexão e credenciais OAuth necessárias
          para consultar recebimentos e criar cobranças; esses segredos ficam no backend e não são
          expostos publicamente
        </LI>
        <LI>
          <strong>Recebimentos:</strong> valor, valor líquido informado, eventual tarifa do provedor,
          status, data, identificadores da transação e metadados necessários à conciliação
        </LI>
        <LI><strong>Notificações:</strong> preferências e identificadores de dispositivos Push</LI>
        <LI><strong>Dados técnicos:</strong> registros de segurança, acesso e diagnóstico</LI>
      </UL>

      <Box variant="warn">
        <P>
          <strong>A página Pix Link é pública.</strong> Nome e identidade visual do recebedor podem
          aparecer para quem acessar o endereço. Chaves privadas, tokens e histórico do painel não
          são publicados.
        </P>
      </Box>

      <H2>2. Dados do pagador</H2>
      <P>
        O pagador não precisa criar conta PixWiki. O pagamento é realizado pelo aplicativo bancário
        do próprio pagador e processado pelo Mercado Pago. O PixWiki pode receber do provedor dados
        mínimos de conciliação associados à transação.
      </P>
      <UL>
        <LI>O PixWiki não solicita senha bancária do pagador</LI>
        <LI>O PixWiki não coleta dados de cartão nesse fluxo</LI>
        <LI>Não vendemos dados pessoais</LI>
        <LI>Não usamos dados de transação para criar perfil publicitário do pagador</LI>
      </UL>

      <H2>3. Finalidades</H2>
      <UL>
        <LI>manter a conta e os recebedores cadastrados</LI>
        <LI>conectar e consultar a conta Mercado Pago autorizada</LI>
        <LI>identificar e organizar recebimentos Pix</LI>
        <LI>criar Pix Link e QR Code quando contratados</LI>
        <LI>enviar e-mail, Push e WhatsApp conforme plano e preferência</LI>
        <LI>produzir histórico, relatórios e exportações</LI>
        <LI>oferecer API e Webhooks no Pix Pro</LI>
        <LI>proteger contas, prevenir fraude e investigar falhas</LI>
        <LI>cumprir obrigações legais e exercer direitos em processos administrativos ou judiciais</LI>
      </UL>

      <H2>4. Como funciona a confirmação</H2>
      <P>
        O PixWiki consulta dados autorizados da conta Mercado Pago e registra recebimentos detectados.
        O dinheiro não passa pelo PixWiki: ele permanece na conta Mercado Pago do recebedor.
      </P>

      <H2>5. Compartilhamentos</H2>
      <UL>
        <LI><strong>Mercado Pago:</strong> conexão financeira e dados de recebimentos/cobranças</LI>
        <LI><strong>Supabase:</strong> banco de dados, autenticação e backend</LI>
        <LI><strong>Vercel:</strong> hospedagem e entrega da aplicação web</LI>
        <LI><strong>OneSignal:</strong> notificações Push</LI>
        <LI><strong>Google:</strong> autenticação quando escolhida e infraestrutura de e-mail usada pelo serviço</LI>
        <LI><strong>Meta/WhatsApp:</strong> envio de avisos do Pix Pro</LI>
        <LI><strong>Autoridades:</strong> quando houver obrigação legal ou ordem válida</LI>
      </UL>
      <P>Não vendemos dados pessoais.</P>

      <H3>Processamento por terceiros</H3>
      <P>
        Alguns provedores podem processar dados em infraestrutura localizada fora do Brasil, conforme
        seus próprios contratos e políticas, observados os mecanismos legais aplicáveis.
      </P>

      <H2>6. Retenção</H2>
      <UL>
        <LI><strong>Conta e configurações:</strong> enquanto necessárias para prestar o serviço</LI>
        <LI>
          <strong>Histórico de recebimentos:</strong> pelo período necessário para prestação do
          serviço, auditoria, prevenção a fraude, exercício de direitos e obrigações legais aplicáveis
        </LI>
        <LI><strong>Logs de segurança:</strong> por período compatível com sua finalidade</LI>
        <LI>
          <strong>Credenciais Mercado Pago:</strong> removidas ou desativadas conforme o encerramento
          da conexão e as rotinas de segurança
        </LI>
      </UL>

      <H2>7. Segurança</H2>
      <UL>
        <LI>HTTPS/TLS na aplicação</LI>
        <LI>autenticação e isolamento de dados por usuário</LI>
        <LI>tokens financeiros mantidos no backend</LI>
        <LI>controles de acesso para áreas administrativas</LI>
        <LI>proteção contra releitura mover recebimentos entre recebedores</LI>
      </UL>

      <H2>8. Direitos pela LGPD</H2>
      <P>
        Você pode solicitar confirmação, acesso, correção, informação sobre compartilhamento e,
        quando aplicável, exclusão ou anonimização de dados.
      </P>
      <OL>
        <LI>Use a página de exclusão de dados para solicitar encerramento</LI>
        <LI>
          Ou escreva para <strong>contato@bigcorps.com.br</strong>, assunto “LGPD — PixWiki”
        </LI>
      </OL>

      <H2>9. Menores</H2>
      <P>
        O PixWiki não é direcionado a crianças. Contas de recebimento devem ser usadas por pessoas
        com capacidade legal para contratar ou por representantes autorizados.
      </P>

      <H2>10. Alterações</H2>
      <P>
        Este Aviso pode ser atualizado para refletir mudanças no produto, nos provedores ou na
        legislação. A data no topo identifica a versão vigente.
      </P>

      <H2>11. Controlador</H2>
      <ControladorBox produto="PixWiki" />

      <div className="mt-6">
        <LegalFooterLinks
          theme={T}
          links={[
            { href: '/termos', label: 'Termos de Uso' },
            { href: '/exclusao', label: 'Excluir meus dados', danger: true },
            { href: 'mailto:contato@bigcorps.com.br', label: 'Falar com a gente' },
          ]}
        />
      </div>
    </LegalShell>
  );
}
