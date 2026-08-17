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
    <LegalShell theme={T} title="Aviso de Privacidade" updatedAt="17 de agosto de 2026">
      <P>
        Este Aviso descreve como o <strong>Pix Wiki</strong> (pix.wiki) trata dados pessoais. Há dois
        públicos aqui, com tratamentos diferentes: quem <strong>recebe</strong> pagamentos (o
        comerciante, que cria uma conta) e quem <strong>paga</strong> (o cliente, que só abre um link
        de cobrança).
      </P>

      <H2>1. Se você recebe pagamentos</H2>
      <P>Ao criar seu link de cobrança, tratamos:</P>
      <UL>
        <LI>
          <strong>Identificação e acesso:</strong> nome, e-mail e senha (armazenada apenas como
          hash). Se você usa Google, Facebook ou biometria do aparelho, recebemos apenas o necessário
          para autenticar &mdash; a biometria nunca sai do seu dispositivo
        </LI>
        <LI>
          <strong>Contato:</strong> telefone e WhatsApp, usados para enviar as notificações de
          pagamento recebido
        </LI>
        <LI>
          <strong>Documento:</strong> CPF ou CNPJ, exigido pelas regras do arranjo de pagamentos PIX
          para identificar o recebedor
        </LI>
        <LI>
          <strong>Chave PIX e dados de saque:</strong> a chave para onde o valor é enviado
        </LI>
        <LI>
          <strong>Dados do negócio:</strong> nome do negócio e o endereço curto escolhido para o seu
          link
        </LI>
        <LI>
          <strong>Recebimentos:</strong> valor, data, horário e situação de cada cobrança, além do
          histórico de saques e taxas
        </LI>
        <LI>
          <strong>Dados técnicos:</strong> endereço IP, navegador, dispositivo e registros de acesso
        </LI>
      </UL>

      <Box variant="warn">
        <P>
          <strong>Seu link é público.</strong> O endereço que você escolhe fica acessível a qualquer
          pessoa, e a página exibe o nome do negócio. Não coloque no nome do link informação que você
          não queira pública. Sua chave PIX, seu CPF ou CNPJ e seu histórico de recebimentos{' '}
          <strong>não</strong> aparecem nessa página.
        </P>
      </Box>

      <H2>2. Se você está pagando</H2>
      <P>
        Ao abrir um link de cobrança e pagar, tratamos o mínimo indispensável: valor, horário e a
        confirmação recebida do banco. Os dados que identificam você como pagador vêm do próprio
        arranjo PIX no momento da liquidação e são usados para uma única finalidade: mostrar ao
        recebedor que aquele pagamento entrou, evitando o golpe do comprovante falso.
      </P>
      <UL>
        <LI>Você não precisa criar conta nem cadastro para pagar</LI>
        <LI>Não pedimos e não recebemos dados de cartão de crédito &mdash; o serviço só opera PIX</LI>
        <LI>Não usamos seus dados de pagador para publicidade e não os vendemos</LI>
        <LI>
          Não montamos perfil de consumo seu entre comerciantes diferentes
        </LI>
      </UL>

      <H2>3. Para que usamos os dados</H2>
      <UL>
        <LI>Criar e manter o link de cobrança e a página pública do recebedor</LI>
        <LI>Emitir cobranças PIX e confirmar automaticamente a liquidação junto ao banco</LI>
        <LI>Notificar o recebedor por painel, e-mail e WhatsApp quando um pagamento entra</LI>
        <LI>Processar saques e calcular a taxa de serviço</LI>
        <LI>Autenticar o acesso e proteger a conta</LI>
        <LI>Prevenir fraude e uso abusivo</LI>
        <LI>Cumprir obrigações legais, fiscais e regulatórias</LI>
      </UL>

      <H3>Assistente de voz incluído</H3>
      <P>
        Toda conta do Pix Wiki nasce com um assistente da minhAi habilitado, que também gera cobranças
        por comando de voz. Se você usar esse recurso, o áudio é transcrito para texto por serviço de
        terceiro e o texto é processado por modelo de linguagem apenas para executar o comando. Se
        você nunca usar o assistente, nenhum áudio seu é enviado a lugar algum.
      </P>

      <H2>4. Confirmação automática: como funciona</H2>
      <P>
        A confirmação não depende de comprovante enviado pelo cliente. O sistema consulta a
        liquidação diretamente na instituição financeira parceira e só marca a cobrança como paga
        quando o banco confirma. É o que torna o comprovante falsificado inútil aqui.
      </P>

      <H2>5. Com quem compartilhamos</H2>
      <UL>
        <LI>
          <strong>Banco Inter</strong> &mdash; emissão de cobranças, confirmação de liquidação e
          execução de saques
        </LI>
        <LI>
          <strong>Supabase</strong> &mdash; banco de dados, autenticação e armazenamento
        </LI>
        <LI>
          <strong>Vercel</strong> &mdash; hospedagem
        </LI>
        <LI>
          <strong>Meta</strong> &mdash; envio das notificações por WhatsApp e login social, quando
          usado
        </LI>
        <LI>
          <strong>Google</strong> &mdash; login social, quando usado
        </LI>
        <LI>
          <strong>Provedor de e-mail transacional</strong> &mdash; envio dos avisos de recebimento
        </LI>
        <LI>
          <strong>Autoridades públicas e órgãos reguladores</strong> &mdash; mediante obrigação legal
          ou ordem judicial
        </LI>
      </UL>
      <P>Não vendemos dados pessoais a ninguém, em nenhuma hipótese.</P>

      <H2>6. Retenção</H2>
      <UL>
        <LI>
          <strong>Conta e configurações:</strong> enquanto a conta existir
        </LI>
        <LI>
          <strong>Histórico de recebimentos e saques:</strong> pelo prazo exigido pela legislação
          fiscal e pelas regras do arranjo de pagamentos, mesmo após a exclusão da conta
        </LI>
        <LI>
          <strong>Registros de prevenção a fraude:</strong> pelo tempo necessário à finalidade
        </LI>
        <LI>
          <strong>Dados técnicos:</strong> período limitado, para segurança e diagnóstico
        </LI>
      </UL>
      <Box variant="info">
        <P>
          Dados de movimentação financeira têm retenção obrigatória por lei. Isso não é uma escolha
          nossa e não pode ser dispensado a pedido &mdash; vale para qualquer serviço que
          intermedeie pagamento.
        </P>
      </Box>

      <H2>7. Segurança</H2>
      <UL>
        <LI>Tráfego criptografado (HTTPS/TLS) em toda a aplicação</LI>
        <LI>Senhas armazenadas apenas como hash</LI>
        <LI>
          Isolamento por conta no banco de dados: um recebedor não acessa os recebimentos, a chave
          PIX ou os clientes de outro
        </LI>
        <LI>Autenticação por biometria disponível, processada apenas no seu dispositivo</LI>
        <LI>Acesso administrativo restrito e registrado</LI>
      </UL>

      <H2>8. Seus direitos (LGPD)</H2>
      <P>
        A Lei 13.709/2018 garante confirmação de tratamento, acesso, correção, anonimização,
        exclusão, portabilidade e informação sobre compartilhamento.
      </P>
      <OL>
        <LI>Use a página de exclusão de dados para encerrar a conta</LI>
        <LI>
          Ou escreva para <strong>contato@bigcorps.com.br</strong>, assunto &ldquo;LGPD &mdash; Pix
          Wiki&rdquo;
        </LI>
      </OL>
      <P>
        <strong>Se você apenas pagou</strong> por um link e quer saber o que existe sobre você, use o
        mesmo e-mail informando data e valor do pagamento. Lembre que registros de transação têm
        retenção obrigatória.
      </P>

      <H2>9. Menores de idade</H2>
      <P>
        Criar conta e receber pagamentos é restrito a maiores de 18 anos. Não coletamos dados de
        menores de forma intencional.
      </P>

      <H2>10. Alterações</H2>
      <P>
        Podemos atualizar este Aviso. Mudanças relevantes são comunicadas por e-mail ou aviso na
        plataforma, e a data no topo é sempre a vigente.
      </P>

      <H2>11. Controlador dos dados</H2>
      <ControladorBox produto="Pix Wiki" />

      <div className="mt-6 pt-5 border-t border-slate-800">
        <P>
          <strong>
            Ao usar o Pix Wiki, você confirma que leu e compreendeu este Aviso de Privacidade.
          </strong>
        </P>
      </div>

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
