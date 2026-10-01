'use client';

// app/midia/aviso/page.tsx
//
// Aviso de Privacidade do Midia.Pro (midia.pro).
//
// Dois pontos tornam este produto diferente dos outros do monorepo e são a
// razão das seções 4 e 5 existirem:
//
//   1. O proprietário RECEBE dinheiro (saldo + saque por chave PIX). Isso traz
//      informação de pagamento para dentro do escopo e obriga a declarar
//      "Informações financeiras" na Segurança dos Dados do Play Console.
//
//   2. O app exibe anúncios de TERCEIROS. É o único produto da casa onde
//      "Publicidade ou marketing" é finalidade legítima de coleta. Por isso a
//      seção 5 descreve métricas de exibição com nome e explica que elas são
//      agregadas, não individuais — é o que sustenta não precisarmos declarar
//      perfilamento de quem passa na frente da tela.
//
// Se o produto passar a identificar a PESSOA em frente à tela (câmera,
// reconhecimento, captura de MAC de Wi-Fi), este Aviso fica incorreto e o
// formulário de Segurança dos Dados também. Revise os dois juntos.

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

const T = LEGAL_THEMES.midia;

export default function AvisoPrivacidadeMidiaPro() {
  return (
    <LegalShell theme={T} title="Aviso de Privacidade" updatedAt="1º de outubro de 2026">
      <P>
        Este Aviso descreve como o <strong>Midia.Pro</strong> (midia.pro) trata dados pessoais.
        O Midia.Pro permite gerenciar telas, exibir suas próprias mídias e monetizar esses espaços
        com anúncios da rede.
      </P>

      <Box variant="info">
        <P>
          <strong>O que o Midia.Pro não faz:</strong> não usa câmera, não identifica quem passa em
          frente à tela, não captura rostos, não lê dispositivos próximos e não monta perfil de
          público. As telas apenas exibem conteúdo.
        </P>
      </Box>

      <ControladorBox produto="Midia.Pro" />

      <P>
        O Midia.Pro faz parte da plataforma minhAi, da mesma empresa. Sua conta é a mesma em todos
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
          <strong>CPF ou CNPJ:</strong> necessário para repasse de valores e emissão fiscal
        </LI>
        <LI>
          <strong>Dados do estabelecimento:</strong> nome, endereço e descrição do espaço onde a
          tela fica
        </LI>
        <LI>
          <strong>Dados técnicos:</strong> endereço IP, navegador, dispositivo e registros de acesso
        </LI>
        <LI>
          <strong>Identificador de dispositivo:</strong> para enviar notificação, se você ativar.
          É opcional
        </LI>
      </UL>

      <H2>2. Suas telas e suas mídias</H2>
      <P>
        Guardamos o cadastro de cada tela (nome, local, horários de funcionamento, orientação) e as
        mídias que você envia para exibição: imagens, vídeos e textos.
      </P>
      <P>
        Cada tela é pareada por um token próprio do dispositivo. Esse token identifica{' '}
        <strong>a tela</strong>, não a pessoa que a opera nem quem passa perto dela.
      </P>

      <Box variant="warn">
        <P>
          <strong>Você responde pelo conteúdo que envia.</strong> Se a mídia contiver foto de uma
          pessoa, marca de terceiro ou obra protegida, a responsabilidade por ter autorização é
          sua. Exibir imagem de alguém em tela pública sem consentimento pode violar a LGPD e o
          direito de imagem.
        </P>
      </Box>

      <H2>3. Informações financeiras</H2>
      <P>
        Quando sua tela exibe anúncios da rede, você recebe uma parte do valor. Para isso
        guardamos:
      </P>
      <UL>
        <LI>
          <strong>Sua chave PIX de saque</strong> e o tipo da chave
        </LI>
        <LI>
          <strong>Saldo disponível</strong> e o total já recebido e transferido
        </LI>
        <LI>
          <strong>Histórico de transações:</strong> cada crédito por exibição e cada saque, com
          valor, data e descrição
        </LI>
      </UL>
      <Box>
        <P>
          A chave PIX é usada <strong>apenas</strong> para transferir o seu dinheiro. Não
          compartilhamos com anunciantes e não usamos para nenhuma outra finalidade.
        </P>
      </Box>

      <H2>4. Anúncios exibidos nas suas telas</H2>
      <P>
        As telas exibem mídias suas, anúncios da BigCorps e anúncios de terceiros que contratam a
        rede Midia.Pro.
      </P>

      <H3>O que medimos</H3>
      <UL>
        <LI>
          Quantas vezes cada anúncio foi exibido, em qual tela e em que horário
        </LI>
        <LI>
          Duração da exibição e se o conteúdo foi reproduzido até o fim
        </LI>
        <LI>
          Status técnico da tela: se estava online, resolução e erros de reprodução
        </LI>
      </UL>

      <Box variant="info">
        <P>
          <strong>Essas métricas são sobre a tela, não sobre pessoas.</strong> O anunciante recebe
          números agregados de exibição e o perfil declarado do ponto (tipo de estabelecimento,
          cidade, horário). Ele não recebe dado pessoal seu nem de quem frequenta o local.
        </P>
      </Box>

      <H3>Se o anúncio tiver QR Code</H3>
      <P>
        Quando alguém escaneia um QR Code exibido, essa pessoa é levada a um endereço do anunciante
        ou a uma página do Midia.Pro. Registramos o acesso de forma agregada, para contagem. Se a
        pessoa preencher algum formulário depois disso, aqueles dados passam a ser tratados pelo
        anunciante, sob a política dele.
      </P>

      <H2>5. Com quem compartilhamos</H2>
      <P>
        Apenas com prestadores que operam a plataforma por nossa conta, cada um limitado ao que
        precisa:
      </P>
      <UL>
        <LI>
          <strong>Infraestrutura e banco de dados:</strong> hospedagem e armazenamento
        </LI>
        <LI>
          <strong>Processador de pagamento:</strong> para executar os saques
        </LI>
        <LI>
          <strong>Envio de notificação e e-mail:</strong> para avisos do sistema
        </LI>
        <LI>
          <strong>Anunciantes:</strong> recebem apenas métricas agregadas de exibição, nunca seus
          dados pessoais nem sua chave PIX
        </LI>
      </UL>
      <P>
        Também podemos compartilhar quando houver obrigação legal ou ordem de autoridade
        competente. Nunca vendemos dados.
      </P>

      <H2>6. Por quanto tempo guardamos</H2>
      <UL>
        <LI>
          <strong>Cadastro, telas e mídias:</strong> enquanto sua conta existir
        </LI>
        <LI>
          <strong>Métricas de exibição:</strong> mantidas de forma agregada para comprovação aos
          anunciantes
        </LI>
        <LI>
          <strong>Registros técnicos:</strong> prazo curto, para segurança e diagnóstico
        </LI>
        <LI>
          <strong>Movimentações financeiras e documentos fiscais:</strong> pelo prazo que a
          legislação fiscal exige, isolados e usados só para essa finalidade
        </LI>
      </UL>

      <H2>7. Segurança</H2>
      <P>
        Todo o tráfego é criptografado em trânsito. O acesso aos dados é restrito por conta e
        controlado no banco. Senhas nunca são armazenadas em texto legível. Nenhum sistema é
        infalível — se houver incidente relevante, comunicamos você e a ANPD conforme a lei.
      </P>

      <H2>8. Seus direitos</H2>
      <P>
        A LGPD garante que você peça confirmação de tratamento, acesso, correção, portabilidade,
        anonimização e exclusão dos seus dados, além de informação sobre compartilhamento.
      </P>
      <Box>
        <P>
          Escreva para <strong>contato@bigcorps.com.br</strong>. Respondemos em até 15 dias. Para
          exclusão, o caminho mais rápido é <strong>midia.pro/exclusao</strong>, que funciona
          direto pela plataforma.
        </P>
      </Box>

      <H2>9. Menores de idade</H2>
      <P>
        O Midia.Pro é um produto para empresas e não é destinado a menores de 18 anos. Não criamos
        conta para menores.
      </P>

      <H2>10. Mudanças neste Aviso</H2>
      <P>
        Se este Aviso mudar de forma relevante, avisamos por e-mail ou dentro da plataforma antes
        de a mudança valer. A data no topo indica a última revisão.
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
