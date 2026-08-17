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

const T = LEGAL_THEMES.conviteia;

export default function AvisoPrivacidadeConviteIA() {
  return (
    <LegalShell theme={T} title="Aviso de Privacidade" updatedAt="17 de agosto de 2026">
      <P>
        Este Aviso descreve como o <strong>Convite IA</strong> (conviteia.com) trata dados pessoais.
        O Convite IA tem uma particularidade importante: além dos seus dados como organizador, a
        plataforma recebe dados dos seus convidados. As duas situações são tratadas de forma
        diferente e estão descritas separadamente abaixo.
      </P>

      <Box variant="warn">
        <P>
          <strong>Se você organiza um evento:</strong> ao publicar um convite e coletar
          confirmações, você é responsável por informar seus convidados de que os dados serão
          tratados por esta plataforma. A BigCorps atua como operadora desses dados, seguindo suas
          instruções.
        </P>
      </Box>

      <H2>1. Dados do organizador</H2>
      <P>Se você cria uma conta para montar um convite, tratamos:</P>
      <UL>
        <LI>
          <strong>Identificação e acesso:</strong> nome, e-mail e senha (armazenada apenas como
          hash, nunca em texto legível). Se você entra com Google ou Facebook, recebemos desses
          provedores apenas nome, e-mail e foto de perfil.
        </LI>
        <LI>
          <strong>Conteúdo do convite:</strong> nomes dos noivos ou homenageados, data, horário,
          endereço do evento, fotos e galeria que você envia, frases, músicas, padrinhos e demais
          seções que você preenche no assistente de criação.
        </LI>
        <LI>
          <strong>Lista de presentes:</strong> descrição e valor dos presentes que você cadastra.
        </LI>
        <LI>
          <strong>Pagamento:</strong> registro da cobrança PIX do convite (valor, horário,
          identificador da transação e status de confirmação). Não recebemos nem armazenamos dados
          de cartão de crédito.
        </LI>
        <LI>
          <strong>Dados técnicos:</strong> endereço IP, tipo de dispositivo, navegador e registros
          de acesso.
        </LI>
      </UL>

      <H2>2. Dados dos convidados</H2>
      <P>
        Quando alguém confirma presença em um convite publicado nesta plataforma, recebemos:
      </P>
      <UL>
        <LI>
          <strong>Nome e e-mail</strong> de quem confirma.
        </LI>
        <LI>
          <strong>Nomes dos acompanhantes</strong> informados na confirmação.
        </LI>
        <LI>
          <strong>Recados</strong> deixados para os organizadores, com o nome de quem escreveu.
        </LI>
      </UL>
      <P>
        Esses dados são visíveis para o organizador do evento e usados exclusivamente para
        organizar a lista de presença. Não são usados para publicidade, não são vendidos e não são
        cruzados com dados de outros eventos.
      </P>

      <H3>Convite na agenda do convidado</H3>
      <P>
        Ao confirmar presença, o convidado pode receber um convite de calendário com data, horário e
        local do evento, e lembretes automáticos antes da data. Para isso, os dados necessários
        (nome do convidado, e-mail e informações do evento) são enviados à API do Google Calendar. O
        Google atua como operador nesse envio e trata esses dados conforme sua própria política.
      </P>

      <H2>3. Para que usamos os dados</H2>
      <UL>
        <LI>Montar, publicar e manter o site do convite no endereço escolhido</LI>
        <LI>Processar o pagamento do convite e liberar a publicação</LI>
        <LI>Registrar e organizar confirmações de presença, acompanhantes e recados</LI>
        <LI>Enviar o convite de calendário e os lembretes aos convidados que confirmaram</LI>
        <LI>Autenticar seu acesso e manter sua conta segura</LI>
        <LI>Cumprir obrigações legais, fiscais e contábeis relacionadas à cobrança</LI>
      </UL>

      <H2>4. Convites são públicos por natureza</H2>
      <Box variant="info">
        <P>
          O convite publicado fica acessível por link e endereço próprio, <strong>sem senha</strong>,
          para que os convidados possam abri-lo. Considere isso ao escolher o que incluir: fotos,
          endereço completo do evento e demais informações do convite ficam visíveis para qualquer
          pessoa que tenha o link.
        </P>
        <P>
          Confirmações de presença e recados <strong>não</strong> são públicos: ficam restritos ao
          painel do organizador.
        </P>
      </Box>

      <H2>5. Compartilhamento com terceiros</H2>
      <P>
        Não vendemos dados pessoais. Compartilhamos apenas o necessário para operar o serviço, com:
      </P>
      <UL>
        <LI>
          <strong>Supabase</strong> &mdash; banco de dados, autenticação e armazenamento de arquivos
        </LI>
        <LI>
          <strong>Vercel</strong> &mdash; hospedagem e entrega das páginas
        </LI>
        <LI>
          <strong>Banco Inter</strong> &mdash; emissão e confirmação das cobranças PIX
        </LI>
        <LI>
          <strong>Google</strong> &mdash; login social (quando usado) e criação do evento e
          lembretes no Google Calendar
        </LI>
        <LI>
          <strong>Meta</strong> &mdash; login social, quando você opta por entrar com Facebook
        </LI>
        <LI>
          <strong>Autoridades públicas</strong> &mdash; quando houver obrigação legal ou ordem
          judicial
        </LI>
      </UL>

      <H2>6. Por quanto tempo guardamos</H2>
      <UL>
        <LI>
          <strong>Conta e convites:</strong> enquanto sua conta existir, ou até você solicitar a
          exclusão
        </LI>
        <LI>
          <strong>Confirmações e recados:</strong> junto com o convite ao qual pertencem
        </LI>
        <LI>
          <strong>Registros de pagamento:</strong> pelo prazo exigido pela legislação fiscal
          brasileira, mesmo depois da exclusão da conta &mdash; é obrigação legal e não pode ser
          dispensada a pedido
        </LI>
      </UL>

      <H2>7. Segurança</H2>
      <UL>
        <LI>Tráfego criptografado de ponta a ponta (HTTPS/TLS)</LI>
        <LI>Senhas armazenadas apenas como hash, nunca em texto legível</LI>
        <LI>
          Isolamento por conta no banco de dados: um organizador não acessa os convites, as
          confirmações ou os recados de outro
        </LI>
        <LI>Acesso administrativo restrito e registrado</LI>
      </UL>

      <H2>8. Seus direitos (LGPD)</H2>
      <P>
        A Lei Geral de Proteção de Dados (Lei 13.709/2018) garante a você o direito de confirmar a
        existência de tratamento, acessar seus dados, corrigir dados incorretos, solicitar
        anonimização ou exclusão, pedir portabilidade, revogar consentimento e obter informação
        sobre com quem compartilhamos seus dados.
      </P>
      <P>Para exercer qualquer desses direitos:</P>
      <OL>
        <LI>
          Use a página de exclusão de dados, se o pedido for de exclusão da conta
        </LI>
        <LI>
          Ou escreva para <strong>contato@bigcorps.com.br</strong> com o assunto
          &ldquo;LGPD &mdash; Convite IA&rdquo;
        </LI>
      </OL>
      <P>
        <strong>Convidados:</strong> se você confirmou presença em um convite e quer que seus dados
        sejam removidos, pode pedir diretamente ao organizador do evento ou escrever para o e-mail
        acima informando qual convite.
      </P>

      <H2>9. Crianças e adolescentes</H2>
      <P>
        A criação de convites é destinada a maiores de 18 anos. Nomes de crianças podem aparecer em
        um convite ou em uma confirmação de presença por decisão do organizador ou do responsável
        que confirma &mdash; nesses casos, cabe a quem informa garantir que tem autorização dos
        responsáveis legais.
      </P>

      <H2>10. Alterações neste Aviso</H2>
      <P>
        Podemos atualizar este documento. Mudanças relevantes serão comunicadas por e-mail ou aviso
        na plataforma, e a data de última atualização no topo desta página é sempre a vigente.
      </P>

      <H2>11. Controlador dos dados</H2>
      <ControladorBox produto="Convite IA" />

      <div className="mt-6 pt-5 border-t border-rose-100">
        <P>
          <strong>
            Ao usar o Convite IA, você confirma que leu e compreendeu este Aviso de Privacidade.
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
