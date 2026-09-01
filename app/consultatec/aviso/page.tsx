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

const T = LEGAL_THEMES.consultatec;

export default function AvisoPrivacidadeConsultaTec() {
  return (
    <LegalShell theme={T} title="Aviso de Privacidade" updatedAt="17 de agosto de 2026">
      <P>
        Este Aviso descreve como o <strong>ConsultaTec</strong> (consulta.tec.br) trata dados
        pessoais. Leia com atenção a seção 2: este serviço processa dados de{' '}
        <strong>terceiros</strong>, e não apenas seus, o que cria obrigações para você como usuário.
      </P>

      <Box variant="warn">
        <P>
          <strong>Aviso essencial.</strong> Ao consultar um CPF ou CNPJ que não é seu, você está
          tratando dados pessoais de outra pessoa. A responsabilidade por ter uma base legal válida
          para essa consulta é <strong>sua</strong>, não nossa. Consultar documento de terceiro por
          curiosidade, para constranger, vigiar ou discriminar alguém é ilegal.
        </P>
      </Box>

      <H2>1. Dados que coletamos de você</H2>
      <H3>Se você usa sem cadastro (consulta avulsa)</H3>
      <UL>
        <LI>
          <strong>O documento consultado</strong> e qual tipo de consulta foi feita
        </LI>
        <LI>
          <strong>Dados da cobrança PIX:</strong> valor, horário, identificador da transação e status
        </LI>
        <LI>
          <strong>Dados técnicos:</strong> endereço IP, navegador, dispositivo e registros de acesso
        </LI>
      </UL>

      <H3>Se você cria conta e mantém saldo</H3>
      <UL>
        <LI>
          <strong>Identificação e acesso:</strong> nome, e-mail e senha (armazenada apenas como
          hash). Se você usa Google, Facebook ou biometria do aparelho, recebemos apenas o
          necessário para autenticar &mdash; a biometria nunca sai do seu dispositivo e não é
          transmitida a nós
        </LI>
        <LI>
          <strong>Saldo e movimentações:</strong> créditos adicionados e valores debitados por
          consulta
        </LI>
        <LI>
          <strong>Histórico de consultas:</strong> documento consultado, tipo de consulta, data e
          valor
        </LI>
      </UL>

      <Box variant="info">
        <P>
          <strong>Conta unificada.</strong> Sua conta no ConsultaTec é a mesma do ecossistema
          minhAi. Se você já tem conta em outro produto nosso com o mesmo e-mail, o acesso e o saldo
          são compartilhados entre eles. Isso é intencional. Se preferir contas separadas, use
          e-mails diferentes.
        </P>
      </Box>

      <H2>2. Dados de terceiros consultados</H2>
      <P>
        Quando você faz uma consulta, recebemos dos nossos fornecedores dados sobre o titular do
        documento &mdash; que pode ser você ou outra pessoa. Dependendo da consulta escolhida, esses
        dados incluem nome ou razão social, filiação ou quadro de sócios, data de nascimento ou de
        abertura, situação cadastral, score e pendências financeiras, protestos em cartório e
        pendências tributárias.
      </P>
      <P>Sobre esses dados:</P>
      <UL>
        <LI>
          Não montamos base própria de perfis. Os dados vêm dos fornecedores no momento da consulta
        </LI>
        <LI>
          Guardamos o resultado apenas o tempo necessário para você visualizá-lo e para atender a
          eventual contestação de cobrança
        </LI>
        <LI>
          O <strong>histórico</strong> registra que a consulta ocorreu, com o documento, o tipo e a
          data &mdash; é o que permite auditar quem consultou o quê, exigência da própria LGPD
        </LI>
        <LI>
          Não usamos esses dados para publicidade, não os vendemos e não os cruzamos com dados de
          outros usuários
        </LI>
      </UL>

      <H3>Se o seu documento foi consultado aqui</H3>
      <P>
        Se você é titular de um CPF ou CNPJ e quer saber se ele foi consultado nesta plataforma,
        escreva para <strong>contato@bigcorps.com.br</strong> com o assunto &ldquo;LGPD &mdash;
        titular consultado&rdquo;. Vamos pedir comprovação de identidade antes de responder,
        justamente para não expor dados a quem não é o titular.
      </P>

      <H2>3. Base legal</H2>
      <UL>
        <LI>
          <strong>Execução de contrato</strong> &mdash; para prestar a consulta que você contratou e
          processar o pagamento
        </LI>
        <LI>
          <strong>Obrigação legal</strong> &mdash; para guardar registros fiscais e o log de quem
          consultou o quê
        </LI>
        <LI>
          <strong>Legítimo interesse</strong> &mdash; para prevenir fraude e uso abusivo da
          plataforma
        </LI>
      </UL>
      <P>
        Para os dados de terceiros consultados, a base legal da consulta em si é de quem a solicita.
        Nós atuamos como intermediário técnico entre você e os fornecedores de dados.
      </P>

      <H2>4. Com quem compartilhamos</H2>
      <UL>
        <LI>
          <strong>Fornecedores de dados cadastrais e de crédito</strong> &mdash; recebem o documento
          consultado para retornar o resultado. Inclui o bureau Quod nas consultas de restrições e
          score
        </LI>
        <LI>
          <strong>Banco Inter</strong> &mdash; emissão e confirmação das cobranças PIX
        </LI>
        <LI>
          <strong>Supabase</strong> &mdash; banco de dados e autenticação
        </LI>
        <LI>
          <strong>Vercel</strong> &mdash; hospedagem
        </LI>
        <LI>
          <strong>Google e Meta</strong> &mdash; apenas quando você opta por login social
        </LI>
        <LI>
          <strong>Autoridades públicas</strong> &mdash; mediante obrigação legal ou ordem judicial
        </LI>
      </UL>
      <P>Não vendemos dados pessoais a ninguém, em nenhuma hipótese.</P>

      <H2>5. Retenção</H2>
      <UL>
        <LI>
          <strong>Conta e saldo:</strong> enquanto a conta existir
        </LI>
        <LI>
          <strong>Resultado da consulta:</strong> pelo tempo necessário à exibição e a eventual
          contestação
        </LI>
        <LI>
          <strong>Registro de que a consulta ocorreu:</strong> mantido para fins de auditoria e
          prestação de contas, mesmo após a exclusão da conta, na forma mínima necessária
        </LI>
        <LI>
          <strong>Registros fiscais de pagamento:</strong> pelo prazo legal, sem possibilidade de
          dispensa a pedido
        </LI>
      </UL>

      <H2>6. Segurança</H2>
      <UL>
        <LI>Tráfego criptografado (HTTPS/TLS) em toda a aplicação</LI>
        <LI>Senhas armazenadas apenas como hash</LI>
        <LI>Isolamento por conta no banco: um usuário não acessa o histórico de outro</LI>
        <LI>Acesso administrativo restrito e registrado</LI>
        <LI>Dados hospedados em infraestrutura com servidores no Brasil</LI>
      </UL>

      <H2>7. Seus direitos (LGPD)</H2>
      <P>
        A Lei 13.709/2018 garante confirmação de tratamento, acesso, correção, anonimização,
        exclusão, portabilidade, informação sobre compartilhamento e revisão de decisões
        automatizadas.
      </P>
      <P>
        <strong>Sobre decisões automatizadas:</strong> o ConsultaTec exibe score e informações de
        crédito produzidos por bureaus, mas não decide nada por você e não recusa crédito a ninguém.
        Se você discorda de um score ou de uma pendência apresentada, o pedido de correção precisa
        ser feito ao bureau que originou o dado &mdash; nós apenas repassamos o que ele informa, e
        podemos indicar o caminho.
      </P>
      <OL>
        <LI>Use a página de exclusão de dados para encerrar a conta</LI>
        <LI>
          Ou escreva para <strong>contato@bigcorps.com.br</strong>, assunto &ldquo;LGPD &mdash;
          ConsultaTec&rdquo;
        </LI>
      </OL>

      <H2>8. Uso proibido</H2>
      <P>
        Usar as consultas para perseguir, constranger, discriminar, cobrar irregularmente ou montar
        base de dados para revenda é proibido, além de ilegal. Contas com indício desse uso são
        suspensas, e informações podem ser fornecidas às autoridades competentes quando exigido.
      </P>

      <H2>9. Menores de idade</H2>
      <P>
        O serviço é destinado a maiores de 18 anos. Não permitimos criação de conta por menores.
      </P>

      <H2>10. Alterações</H2>
      <P>
        Podemos atualizar este Aviso. Mudanças relevantes são comunicadas por e-mail ou aviso na
        plataforma, e a data no topo é sempre a vigente.
      </P>

      <H2>11. Controlador dos dados</H2>
      <ControladorBox produto="ConsultaTec" />

      <div className="mt-6 pt-5 border-t border-[#C9BFA0]">
        <P>
          <strong>
            Ao usar o ConsultaTec, você confirma que leu este Aviso e que assume a responsabilidade
            pelas consultas que realizar.
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
