'use client';

import {
  LEGAL_THEMES,
  LegalShell,
  LegalFooterLinks,
  ControladorBox,
  H2,
  P,
  UL,
  LI,
  Box,
} from '@/components/legal/legal-doc';

const T = LEGAL_THEMES.conviteia;

export default function TermosConviteIA() {
  return (
    <LegalShell theme={T} title="Termos de Uso" updatedAt="17 de agosto de 2026">
      <P>
        Estes Termos regem o uso do <strong>Convite IA</strong> (conviteia.com). Ao criar uma conta
        ou publicar um convite, você concorda com eles.
      </P>

      <H2>1. O que o serviço faz</H2>
      <P>
        O Convite IA cria sites de convite para eventos. Você monta o convite por um assistente
        guiado, escolhe as seções que quer exibir, publica em um endereço próprio e compartilha o
        link com seus convidados. O convite pode incluir confirmação de presença, mural de recados,
        contagem regressiva, galeria de fotos, lista de presentes e convite automático na agenda dos
        convidados.
      </P>

      <H2>2. Conta</H2>
      <UL>
        <LI>Você deve ter 18 anos ou mais para criar uma conta</LI>
        <LI>As informações de cadastro devem ser verdadeiras</LI>
        <LI>Você é responsável por manter a confidencialidade da sua senha</LI>
        <LI>
          É responsável por toda atividade realizada na sua conta, inclusive por terceiros a quem
          você der acesso
        </LI>
      </UL>

      <H2>3. Pagamento e publicação</H2>
      <UL>
        <LI>
          O convite é cobrado por unidade, com o valor informado na tela antes da geração da
          cobrança
        </LI>
        <LI>
          O pagamento é feito por PIX. A publicação é liberada após a confirmação automática do
          pagamento junto ao banco
        </LI>
        <LI>
          Não trabalhamos com cartão de crédito, e portanto não coletamos nem armazenamos dados de
          cartão
        </LI>
        <LI>
          Enquanto o pagamento não é confirmado, o convite fica salvo e não publicado &mdash; você
          não perde o que já montou
        </LI>
      </UL>

      <H2>4. Reembolso e direito de arrependimento</H2>
      <Box variant="info">
        <P>
          Nos termos do artigo 49 do Código de Defesa do Consumidor, você pode desistir da compra em
          até <strong>7 dias corridos</strong> contados do pagamento, com devolução integral do
          valor, desde que o convite ainda não tenha sido enviado ou divulgado aos convidados.
        </P>
        <P>
          Depois desse prazo, ou se o convite já tiver sido compartilhado, o serviço é considerado
          prestado. Falhas técnicas de nossa parte que impeçam a publicação são exceção e geram
          reembolso integral independentemente de prazo.
        </P>
        <P>
          Pedidos de reembolso: <strong>contato@bigcorps.com.br</strong>, com o endereço do convite.
        </P>
      </Box>

      <H2>5. Conteúdo que você publica</H2>
      <UL>
        <LI>
          O conteúdo do convite é seu. Não reivindicamos propriedade sobre fotos, textos ou músicas
          que você envia
        </LI>
        <LI>
          Você declara ter os direitos necessários sobre o que publica, inclusive autorização das
          pessoas retratadas nas fotos
        </LI>
        <LI>
          Você nos concede apenas a licença técnica necessária para armazenar, processar e exibir o
          conteúdo no convite &mdash; nada além disso
        </LI>
        <LI>
          Podemos remover conteúdo que viole a lei ou estes Termos, com aviso a você sempre que
          possível
        </LI>
      </UL>

      <H2>6. Convite publicado é público</H2>
      <P>
        Convites são acessíveis por link, sem senha, porque é assim que os convidados os abrem.
        Endereço do evento, fotos e demais informações do convite ficam visíveis a qualquer pessoa
        com o link. Avalie isso antes de incluir informações sensíveis. Confirmações de presença e
        recados permanecem restritos ao seu painel.
      </P>

      <H2>7. Dados dos seus convidados</H2>
      <P>
        Ao coletar confirmações, você atua como controlador dos dados dos seus convidados e nós como
        operadores. Cabe a você:
      </P>
      <UL>
        <LI>Informar seus convidados de que os dados serão tratados por esta plataforma</LI>
        <LI>Usar os dados coletados apenas para organizar o evento</LI>
        <LI>Não repassar a lista de convidados a terceiros para finalidade alheia ao evento</LI>
      </UL>

      <H2>8. Lista de presentes</H2>
      <P>
        A lista de presentes é um recurso de exibição e organização. O valor de presentes enviados
        por convidados vai para você, não para a BigCorps, e a relação de presente entre convidado e
        anfitrião não nos envolve. Não intermediamos, garantimos ou nos responsabilizamos por
        presentes prometidos e não entregues.
      </P>

      <H2>9. Uso proibido</H2>
      <P>Você concorda em não usar o Convite IA para:</P>
      <UL>
        <LI>Atividade ilegal, fraude ou golpe</LI>
        <LI>Publicar conteúdo que viole direitos autorais ou de imagem de terceiros</LI>
        <LI>
          Publicar conteúdo discriminatório, difamatório, sexualmente explícito ou que exponha
          pessoas sem autorização
        </LI>
        <LI>Coletar dados de pessoas para finalidade diferente da organização do evento</LI>
        <LI>Tentar burlar mecanismos de pagamento, cotas ou controles de acesso</LI>
        <LI>Sobrecarregar a infraestrutura ou automatizar acesso sem autorização</LI>
      </UL>

      <H2>10. Disponibilidade e limitação de responsabilidade</H2>
      <P>
        O serviço é fornecido no estado em que se encontra. Não garantimos operação ininterrupta ou
        livre de erros. Fazemos o possível para manter o convite disponível na data do seu evento,
        mas dependemos de provedores de infraestrutura, banco e Google.
      </P>
      <P>Não nos responsabilizamos por:</P>
      <UL>
        <LI>Indisponibilidade causada por falha de terceiros ou força maior</LI>
        <LI>
          Consequências de informação incorreta que você tenha publicado no convite (data, horário
          ou endereço errados)
        </LI>
        <LI>Convidados que não compareçam, confirmem indevidamente ou não recebam lembretes</LI>
        <LI>Presentes prometidos por convidados e não entregues</LI>
      </UL>
      <P>
        Nossa responsabilidade total, em qualquer hipótese, fica limitada ao valor que você pagou
        pelo convite. Esta limitação não afasta direitos que a legislação consumerista brasileira
        reconheça como irrenunciáveis.
      </P>

      <H2>11. Encerramento</H2>
      <P>
        Você pode encerrar sua conta a qualquer momento pela página de exclusão de dados. Podemos
        suspender contas que violem estes Termos, com aviso prévio quando a situação permitir. Se a
        suspensão ocorrer por violação e um convite pago estiver publicado, avaliaremos reembolso
        proporcional caso a caso.
      </P>

      <H2>12. Alterações</H2>
      <P>
        Podemos alterar estes Termos. Mudanças relevantes serão comunicadas por e-mail ou aviso na
        plataforma. O uso continuado após a comunicação significa aceitação. Convites já pagos
        seguem as condições comerciais vigentes na data do pagamento.
      </P>

      <H2>13. Lei aplicável e foro</H2>
      <P>
        Estes Termos são regidos pelas leis brasileiras. Fica eleito o foro da Comarca de São
        Paulo/SP, sem prejuízo do direito do consumidor de demandar no foro do seu domicílio. Em
        caso de divergência entre versões em idiomas diferentes, prevalece a versão em português.
      </P>

      <H2>14. Quem somos</H2>
      <ControladorBox produto="Convite IA" />

      <div className="mt-6 pt-5 border-t border-rose-100">
        <P>
          <strong>
            Ao usar o Convite IA, você confirma que leu e concorda com estes Termos de Uso.
          </strong>
        </P>
      </div>

      <div className="mt-6">
        <LegalFooterLinks
          theme={T}
          links={[
            { href: '/aviso', label: 'Aviso de Privacidade' },
            { href: '/exclusao', label: 'Excluir meus dados', danger: true },
            { href: 'mailto:contato@bigcorps.com.br', label: 'Falar com a gente' },
          ]}
        />
      </div>
    </LegalShell>
  );
}
