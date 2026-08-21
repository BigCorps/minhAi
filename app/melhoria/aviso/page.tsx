'use client';

// app/melhoria/aviso/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ RASCUNHO PARA REVISÃO JURÍDICA — NÃO PUBLIQUE SEM ADVOGADO LER.
//
// Este texto foi escrito para ser tecnicamente correto quanto ao que o
// aplicativo faz, e cobre os pontos que a Play Store cobra na Data safety e
// que a LGPD exige para dado sensível de saúde. Mas ele NÃO é parecer
// jurídico. Três pontos merecem atenção específica de um advogado:
//
//   1. Dado de saúde é dado SENSÍVEL (LGPD art. 5º II e art. 11). A base legal
//      aqui é consentimento específico e destacado — e o texto abaixo assume
//      isso. Se a operação mudar, a base legal muda.
//   2. Consentimento de titular com declínio cognitivo. A seção 9 trata do
//      responsável legal, mas a redação precisa ser validada.
//   3. Compartilhamento com o cuidador. Um terceiro vê dado de saúde do
//      titular; isso precisa estar coberto de forma inequívoca.
//
// Prazos e endereços vieram do ControladorBox compartilhado, que já é usado
// pelas outras marcas.
// ─────────────────────────────────────────────────────────────────────────────

import {
  LEGAL_THEMES, LegalShell, LegalFooterLinks, ControladorBox,
  H2, H3, P, UL, LI, Box,
} from '@/components/legal/legal-doc';

const T = LEGAL_THEMES.melhoria;

export default function AvisoPrivacidadeMelhorIA() {
  return (
    <LegalShell
      theme={T}
      title="Aviso de Privacidade"
      updatedAt="20 de agosto de 2026"
      textoGrande
      scroll={false}
      footer={
        <LegalFooterLinks
          theme={T}
          links={[
            { href: '/termos', label: 'Termos de uso' },
            { href: '/exclusao', label: 'Apagar minha conta', danger: true },
            { href: 'mailto:contato@bigcorps.com.br', label: 'Falar com a gente' },
          ]}
        />
      }
    >
      <P>
        Este aviso explica, em linguagem simples, quais informações a{' '}
        <strong>MelhorIA</strong> guarda sobre você, por que guarda, e o que
        você pode fazer a respeito.
      </P>

      <Box variant="warn">
        <P>
          <strong>Leia com atenção a seção 2.</strong> A MelhorIA guarda
          informações sobre os remédios que você toma e sobre suas consultas e
          exames. Pela lei brasileira, isso é <strong>dado sensível de saúde</strong>,
          e precisa da sua autorização específica — separada dos termos de uso.
          Você dá essa autorização numa tela própria, e pode retirá-la quando
          quiser.
        </P>
      </Box>

      <H2>1. Quem somos</H2>
      <ControladorBox produto="MelhorIA" />
      <P>
        A MelhorIA faz parte da plataforma minhAi, da mesma empresa. Por isso,
        ao entrar com sua conta Google, a tela de permissão do Google pode
        mostrar o nome da plataforma minhAi — é a mesma empresa e o mesmo
        sistema.
      </P>

      <H2>2. Informações de saúde</H2>
      <P>
        Quando você cadastra um remédio, uma consulta ou um exame, guardamos:
      </P>
      <UL>
        <LI>o nome do remédio, a dosagem e os horários que você escolheu</LI>
        <LI>se você marcou que tomou, que não tomou, e a que horas marcou</LI>
        <LI>a data, o local e a especialidade das consultas e exames</LI>
        <LI>fotos de receitas e pedidos de exame, quando você envia alguma</LI>
      </UL>
      <P>
        <strong>Para que serve:</strong> exclusivamente para avisar você na hora
        certa, mostrar seu histórico e gerar o relatório que você pode levar ao
        médico.
      </P>

      <Box variant="info">
        <P>
          <strong>O que nós NÃO fazemos com isso:</strong> não vendemos essas
          informações, não compartilhamos com plano de saúde, farmácia,
          seguradora, empregador ou banco, e não usamos para escolher
          propaganda. Não fazemos nenhum tipo de perfil comercial a partir da
          sua saúde.
        </P>
      </Box>

      <H3>Autorização e como retirar</H3>
      <P>
        Pedimos sua autorização numa tela própria, antes de guardar qualquer
        informação de saúde. Você pode retirar essa autorização a qualquer
        momento, dentro do aplicativo. Ao retirar, apagamos os dados de saúde e
        os lembretes param de funcionar — porque sem eles não há como avisar.
      </P>

      <H2>3. Outras informações que guardamos</H2>
      <UL>
        <LI><strong>Sua conta:</strong> nome, e-mail e, se você informar, telefone</LI>
        <LI><strong>Contatos de emergência:</strong> nome e telefone de quem você cadastrar</LI>
        <LI><strong>Sua lista de compras</strong></LI>
        <LI>
          <strong>Localização:</strong> apenas no momento em que você aperta o
          botão de emergência, e apenas para enviar junto do aviso à sua
          família. Não acompanhamos onde você está em nenhum outro momento.
        </LI>
        <LI><strong>Informações técnicas:</strong> tipo de aparelho, navegador e registros de acesso, para segurança</LI>
        <LI><strong>Uso de créditos:</strong> quais funções pagas você usou e quando</LI>
      </UL>

      <H3>O que fica só no seu aparelho</H3>
      <P>
        Quando você usa o microfone para ditar, o reconhecimento de voz é feito
        pelo próprio navegador do seu celular. Nós não gravamos áudio, não
        enviamos sua voz para nenhum servidor e não guardamos nada além do texto
        que aparece na tela e que você decide salvar.
      </P>

      <H2>4. Quando alguém da sua família vê seus dados</H2>
      <P>
        Se você convidar um familiar como cuidador, essa pessoa passa a ver seus
        remédios, seus horários, se você confirmou as doses e seus compromissos
        de saúde. É você quem convida, e é você quem pode remover o acesso
        quando quiser.
      </P>
      <P>
        Registramos os acessos do cuidador aos seus dados, e você pode consultar
        esse registro.
      </P>

      <H2>5. Com quem compartilhamos</H2>
      <P>
        Apenas com empresas que fazem o serviço funcionar, e apenas com o
        mínimo necessário:
      </P>
      <UL>
        <LI><strong>Supabase</strong> — banco de dados e login</LI>
        <LI><strong>Vercel</strong> — hospedagem</LI>
        <LI><strong>OneSignal</strong> — envio das notificações</LI>
        <LI><strong>API Brasil</strong> — envio de SMS, quando você usa</LI>
        <LI><strong>Google</strong> — apenas se você conectar sua agenda, e apenas os compromissos que você mandar para lá</LI>
        <LI><strong>Mercado Pago</strong> — apenas se você comprar créditos</LI>
      </UL>
      <P>
        Também podemos compartilhar se a lei ou uma ordem judicial exigir.
      </P>

      <Box variant="warn">
        <P>
          <strong>Sobre a agenda do Google.</strong> Se você escolher enviar seus
          lembretes para a Agenda do Google, essas informações passam a ficar
          também com o Google, sob as regras deles, e ficam visíveis para quem
          tiver acesso àquela agenda. Por isso essa opção vem desligada, e os
          lembretes de remédio são gravados com o título neutro “Hora do
          remédio”, sem o nome do medicamento, a menos que você peça o
          contrário.
        </P>
      </Box>

      <H2>6. Por quanto tempo guardamos</H2>
      <UL>
        <LI><strong>Fotos de receitas e exames:</strong> 24 meses, e depois são apagadas automaticamente</LI>
        <LI><strong>Remédios, doses e histórico:</strong> enquanto sua conta existir</LI>
        <LI><strong>Registros financeiros:</strong> pelo prazo que a lei exige</LI>
      </UL>

      <H2>7. Seus direitos</H2>
      <P>
        Pela Lei Geral de Proteção de Dados, você pode pedir para: saber quais
        dados temos, corrigir o que estiver errado, apagar tudo, receber uma
        cópia, saber com quem compartilhamos e retirar sua autorização.
      </P>
      <P>
        Escreva para <strong>contato@bigcorps.com.br</strong>. Respondemos em
        até 15 dias. Para apagar a conta, existe também a página{' '}
        <strong>melhoria.org/exclusao</strong>, que funciona sem precisar falar
        com ninguém.
      </P>

      <H2>8. Segurança</H2>
      <P>
        As informações trafegam criptografadas, ficam guardadas em servidores
        com acesso controlado, e cada pessoa só enxerga os próprios dados e os
        de quem a autorizou. Fotos de receitas ficam em armazenamento privado,
        nunca em endereço público.
      </P>

      <H2>9. Crianças e pessoas que precisam de apoio para decidir</H2>
      <P>
        A MelhorIA não é para menores de 18 anos.
      </P>
      <P>
        Se a pessoa que vai usar o aplicativo não tiver condições de decidir
        sozinha sobre seus dados, quem faz o cadastro deve ser o responsável
        legal, e é ele quem autoriza o uso das informações de saúde. Essa
        indicação é feita no próprio cadastro.
      </P>

      <H2>10. Mudanças neste aviso</H2>
      <P>
        Se mudarmos algo importante, avisamos dentro do aplicativo antes de
        passar a valer. A data no topo da página mostra a última alteração.
      </P>

      <Box variant="danger">
        <P>
          <strong>A MelhorIA não é serviço médico nem serviço de emergência.</strong>{' '}
          Ela lembra, organiza e registra. Não indica dose, não diz para que
          serve um remédio e não interpreta exame. O botão de emergência avisa
          as pessoas que você cadastrou — ele não aciona SAMU (192), Polícia
          (190) nem Bombeiros (193). Em caso de urgência, ligue para esses
          números.
        </P>
      </Box>
    </LegalShell>
  );
}
