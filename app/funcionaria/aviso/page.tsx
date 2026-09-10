'use client';

// app/funcionaria/aviso/page.tsx
//
// Aviso de Privacidade da FuncionarIA (funcionaria.net).
//
// Escopo deliberado: a FuncionarIA NÃO expõe recebimento PIX ao usuário final.
// Ela usa o motor compartilhado (pix_direct_intents, pix-direct-reconcile)
// apenas internamente. Por isso este Aviso não declara "informações de
// pagamento do usuário" como dado coletado — diferente do Pix Wiki.
// Se isso mudar, este arquivo E o formulário de Segurança dos Dados no Play
// Console precisam ser revistos juntos.
//
// O ponto sensível deste produto é outro: a FuncionarIA atende clientes DA
// EMPRESA. Ou seja, o usuário é controlador dos dados de terceiros que passam
// pelas conversas, e nós somos operadores. A seção 3 existe para deixar isso
// explícito, porque é a obrigação que o usuário mais tende a ignorar.

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
  Box,
} from '@/components/legal/legal-doc';

const T = LEGAL_THEMES.funcionaria;

export default function AvisoPrivacidadeFuncionarIA() {
  return (
    <LegalShell theme={T} title="Aviso de Privacidade" updatedAt="10 de setembro de 2026">
      <P>
        Este Aviso descreve como a <strong>FuncionarIA</strong> (funcionaria.net) trata dados
        pessoais. Leia com atenção a seção 3: este serviço processa dados dos{' '}
        <strong>seus clientes</strong>, e não apenas seus, o que cria obrigações para você.
      </P>

      <Box variant="warn">
        <P>
          <strong>Aviso essencial.</strong> Quando um cliente seu conversa com a sua FuncionarIA,
          quem decide o que fazer com aquele dado é <strong>você</strong>, não nós. Perante a LGPD,
          você é o <em>controlador</em> desses dados e nós somos o <em>operador</em>. Isso significa
          que a obrigação de ter base legal, de informar seus clientes e de responder pedidos deles
          é sua.
        </P>
      </Box>

      <ControladorBox produto="FuncionarIA" />

      <P>
        A FuncionarIA faz parte da plataforma minhAi, da mesma empresa. Sua conta é a mesma em todos
        os produtos, e alguns dados de cadastro são compartilhados entre eles.
      </P>

      <H2>1. Dados que coletamos de você</H2>
      <UL>
        <LI>
          <strong>Identificação e acesso:</strong> nome, e-mail e senha (armazenada apenas como
          hash). Se você entra com Google, recebemos apenas o necessário para autenticar
        </LI>
        <LI>
          <strong>Telefone:</strong> quando você informa, para notificação e contato. É opcional
        </LI>
        <LI>
          <strong>CPF ou CNPJ:</strong> quando necessário para emissão fiscal e identificação do
          contratante
        </LI>
        <LI>
          <strong>Dados da empresa:</strong> nome, ramo, endereço e o que você cadastrar no perfil
        </LI>
        <LI>
          <strong>Dados técnicos:</strong> endereço IP, navegador, dispositivo e registros de acesso
        </LI>
        <LI>
          <strong>Identificador de dispositivo:</strong> para enviar notificação, se você ativar.
          É opcional e pode ser desligado a qualquer momento
        </LI>
      </UL>

      <H2>2. Configuração da sua FuncionarIA</H2>
      <P>
        Guardamos o que você configura: identidade e personalidade da assistente, habilidades
        ativadas, instruções, catálogo, horários e materiais que você enviar como base de
        conhecimento.
      </P>

      <Box variant="warn">
        <P>
          <strong>Não coloque na base de conhecimento o que você não quer que seja respondido.</strong>{' '}
          Tudo que você cadastra ali pode ser usado pela assistente para responder a quem conversar
          com ela. Se você inserir dado sigiloso, preço interno, documento de funcionário ou
          informação pessoal de terceiro, a assistente pode reproduzir isso numa conversa.
        </P>
      </Box>

      <H2>3. Dados dos seus clientes</H2>
      <P>
        Quando alguém conversa com a sua FuncionarIA, registramos o conteúdo da conversa e o que o
        cliente informar durante o atendimento &mdash; o que pode incluir nome, telefone, e-mail e o
        que ele escrever espontaneamente.
      </P>

      <H3>O que isso significa na prática</H3>
      <UL>
        <LI>
          Tratamos esses dados <strong>por sua conta e ordem</strong>, apenas para operar o
          atendimento. Não usamos para finalidade própria
        </LI>
        <LI>
          Não vendemos, não alugamos e não usamos as conversas dos seus clientes para publicidade
        </LI>
        <LI>
          <strong>É você quem deve informar seus clientes</strong> de que o atendimento é feito por
          assistente de IA e de que a conversa é registrada
        </LI>
        <LI>
          Se um cliente seu pedir acesso ou exclusão dos dados dele, o pedido é seu para responder.
          Nós apoiamos tecnicamente
        </LI>
      </UL>

      <H2>4. Inteligência artificial</H2>
      <P>
        As respostas da assistente são geradas por modelos de linguagem de terceiros. O conteúdo
        necessário para gerar a resposta é enviado ao provedor do modelo, sob contrato que veda uso
        para treinamento.
      </P>
      <Box>
        <P>
          <strong>A assistente pode errar.</strong> Ela pode dar informação incorreta, incompleta ou
          desatualizada. Revise o que for crítico &mdash; preço, prazo, condição contratual e
          qualquer compromisso assumido com cliente.
        </P>
      </Box>

      <H2>5. Com quem compartilhamos</H2>
      <P>
        Apenas com prestadores que operam a plataforma por nossa conta, cada um limitado ao que
        precisa:
      </P>
      <UL>
        <LI>
          <strong>Infraestrutura e banco de dados:</strong> hospedagem da aplicação e armazenamento
        </LI>
        <LI>
          <strong>Provedor de modelo de IA:</strong> para gerar as respostas
        </LI>
        <LI>
          <strong>Envio de notificação e e-mail:</strong> para avisos do sistema
        </LI>
        <LI>
          <strong>WhatsApp Business:</strong> quando você conecta esse canal, as mensagens trafegam
          pela infraestrutura da Meta, sujeita às políticas dela
        </LI>
      </UL>
      <P>
        Também podemos compartilhar quando houver obrigação legal ou ordem de autoridade competente.
        Nunca vendemos dados.
      </P>

      <H2>6. Por quanto tempo guardamos</H2>
      <UL>
        <LI>
          <strong>Cadastro e configuração:</strong> enquanto sua conta existir
        </LI>
        <LI>
          <strong>Conversas de atendimento:</strong> enquanto sua conta existir, ou até você apagar
        </LI>
        <LI>
          <strong>Registros técnicos:</strong> prazo curto, apenas para segurança e diagnóstico
        </LI>
        <LI>
          <strong>Documentos fiscais:</strong> pelo prazo que a legislação fiscal exige, isolados e
          usados só para essa finalidade
        </LI>
      </UL>

      <H2>7. Segurança</H2>
      <P>
        Todo o tráfego é criptografado em trânsito. O acesso aos dados é restrito por conta e
        controlado no banco. Senhas nunca são armazenadas em texto legível. Nenhum sistema é
        infalível &mdash; se houver incidente relevante, comunicamos você e a ANPD conforme a lei.
      </P>

      <H2>8. Seus direitos</H2>
      <P>
        A LGPD garante que você peça confirmação de tratamento, acesso, correção, portabilidade,
        anonimização e exclusão dos seus dados, além de informação sobre compartilhamento.
      </P>
      <Box>
        <P>
          Escreva para <strong>contato@bigcorps.com.br</strong>. Respondemos em até 15 dias. Para
          exclusão, o caminho mais rápido é <strong>funcionaria.net/exclusao</strong>, que funciona
          direto pela plataforma.
        </P>
      </Box>

      <H2>9. Menores de idade</H2>
      <P>
        A FuncionarIA é um produto para empresas e não é destinada a menores de 18 anos. Não criamos
        conta para menores. Se sua assistente atender público que inclua menores, a responsabilidade
        de obter consentimento do responsável é sua, como controlador.
      </P>

      <H2>10. Mudanças neste Aviso</H2>
      <P>
        Se este Aviso mudar de forma relevante, avisamos por e-mail ou dentro da plataforma antes de
        a mudança valer. A data no topo indica a última revisão.
      </P>

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
