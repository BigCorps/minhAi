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

const T = LEGAL_THEMES.pix;

export default function TermosPixWiki() {
  return (
    <LegalShell theme={T} title="Termos de Uso" updatedAt="17 de agosto de 2026">
      <P>
        Estes Termos regem o uso do <strong>Pix Wiki</strong> (pix.wiki). Ao criar seu link de
        cobrança, você concorda com eles.
      </P>

      <H2>1. O que o serviço faz</H2>
      <P>
        O Pix Wiki cria um link curto de cobrança PIX para o seu negócio. Você envia o link ao
        cliente, ele paga, e a confirmação chega automaticamente &mdash; verificada diretamente na
        instituição financeira parceira, sem depender do comprovante que o cliente manda. O painel
        mostra o histórico de recebimentos e permite solicitar saque.
      </P>

      <H2>2. O que o Pix Wiki não é</H2>
      <Box variant="warn">
        <P>
          O Pix Wiki <strong>não é banco, não é instituição de pagamento e não é carteira digital</strong>.
          É uma ferramenta de software que organiza cobranças e confirmações sobre a infraestrutura de
          uma instituição financeira parceira, que é quem efetivamente movimenta o dinheiro e é
          regulada para isso.
        </P>
        <P>
          O saldo exibido no painel representa valores liquidados e disponíveis para saque, não um
          depósito bancário, não é conta de pagamento e não rende juros.
        </P>
      </Box>

      <H2>3. Conta</H2>
      <UL>
        <LI>Você deve ter 18 anos ou mais</LI>
        <LI>
          Os dados informados precisam ser verdadeiros, em especial CPF ou CNPJ e chave PIX &mdash;
          são eles que determinam quem recebe o dinheiro
        </LI>
        <LI>Você é responsável pela confidencialidade da senha e por tudo feito na sua conta</LI>
        <LI>
          A conta é a mesma do ecossistema minhAi. Se você já usa outro produto nosso com o mesmo
          e-mail, o acesso é compartilhado
        </LI>
      </UL>

      <H2>4. Sua responsabilidade sobre o que você vende</H2>
      <UL>
        <LI>
          O Pix Wiki é apenas o meio de cobrança. A relação comercial é exclusivamente entre você e
          seu cliente
        </LI>
        <LI>
          Você é responsável por entregar o produto ou serviço cobrado, pela nota fiscal, pelos
          tributos e pelo atendimento
        </LI>
        <LI>
          Não intermediamos, não garantimos e não arbitramos disputas entre você e seu cliente
        </LI>
        <LI>
          Reclamações e estornos referentes ao que foi vendido são resolvidos diretamente com o
          cliente
        </LI>
      </UL>

      <H2>5. Preço e taxa</H2>
      <UL>
        <LI>Criar o link e receber pagamentos não tem mensalidade nem custo por cobrança</LI>
        <LI>
          Sobre o <strong>saque</strong> incide taxa de serviço de <strong>1%</strong>, com valor
          mínimo de saque de R$ 1,00
        </LI>
        <LI>A taxa é calculada e exibida antes de você confirmar cada saque</LI>
        <LI>Não há taxa de cartão nem aluguel de equipamento, porque não usamos cartão</LI>
      </UL>
      <P>
        Podemos alterar a taxa mediante aviso prévio. A alteração vale para saques futuros e nunca
        retroage sobre valores já liquidados.
      </P>

      <H2>6. Saque</H2>
      <UL>
        <LI>Saques são enviados para a chave PIX cadastrada por você</LI>
        <LI>
          Chave incorreta é responsabilidade sua: PIX enviado é irreversível, e não temos como
          recuperar valor transferido para chave errada informada por você
        </LI>
        <LI>
          Podemos retardar um saque quando houver indício de fraude, até a devida verificação
        </LI>
        <LI>
          Podemos exigir confirmação de identidade antes de liberar saques, por obrigação regulatória
          de prevenção à lavagem de dinheiro
        </LI>
      </UL>

      <H2>7. Uso proibido</H2>
      <P>É vedado usar o Pix Wiki para cobrar por:</P>
      <UL>
        <LI>Atividade ilegal de qualquer natureza</LI>
        <LI>Jogos de azar não autorizados, pirâmides, esquemas de investimento irregulares</LI>
        <LI>Produtos falsificados, contrabandeados ou de origem ilícita</LI>
        <LI>Substâncias, armas ou serviços cuja comercialização seja restrita ou proibida</LI>
        <LI>Conteúdo sexual envolvendo menores ou material de exploração &mdash; sob qualquer forma</LI>
        <LI>Extorsão, chantagem, golpe ou qualquer forma de fraude contra o pagador</LI>
      </UL>
      <P>Também é vedado:</P>
      <UL>
        <LI>Se passar por outra pessoa ou empresa no nome do link</LI>
        <LI>Usar o serviço para lavar dinheiro ou dissimular origem de recursos</LI>
        <LI>Automatizar acesso ou sobrecarregar a infraestrutura</LI>
        <LI>Compartilhar credenciais de acesso</LI>
      </UL>
      <P>
        Contas com indício desses usos são suspensas imediatamente. Valores relacionados a atividade
        ilícita podem ser retidos e reportados às autoridades competentes, conforme obrigação legal.
      </P>

      <H2>8. Disponibilidade e limitação de responsabilidade</H2>
      <P>
        O serviço é fornecido no estado em que se encontra e depende da instituição financeira
        parceira e dos provedores de infraestrutura. Não garantimos operação ininterrupta.
      </P>
      <P>Não nos responsabilizamos por:</P>
      <UL>
        <LI>Indisponibilidade do PIX, do banco parceiro ou do Sistema de Pagamentos Brasileiro</LI>
        <LI>Atraso de liquidação atribuível à instituição financeira</LI>
        <LI>Valor enviado para chave PIX incorreta informada por você</LI>
        <LI>Notificação de WhatsApp ou e-mail não entregue por falha de terceiro</LI>
        <LI>Prejuízo decorrente da relação comercial entre você e seu cliente</LI>
        <LI>Uso do serviço para finalidade proibida pela seção 7</LI>
      </UL>
      <P>
        Nossa responsabilidade total fica limitada ao valor das taxas de serviço que você nos pagou
        nos 12 meses anteriores ao evento, sem prejuízo dos direitos irrenunciáveis do consumidor.
      </P>

      <H2>9. Assistente incluído</H2>
      <P>
        Toda conta nasce com um assistente da minhAi habilitado, que também gera cobranças por
        comando de voz. É um recurso adicional oferecido sem custo, sujeito a limites de uso e passível
        de alteração ou descontinuidade. Ele não é objeto da contratação principal, que é o link de
        cobrança.
      </P>

      <H2>10. Encerramento</H2>
      <P>
        Você pode encerrar a conta a qualquer momento pela página de exclusão de dados. Saque o saldo
        antes: valores remanescentes não são transferidos automaticamente no encerramento. Podemos
        suspender ou encerrar contas que violem estes Termos, e nesse caso os valores seguem o
        disposto na seção 7.
      </P>

      <H2>11. Alterações</H2>
      <P>
        Podemos alterar estes Termos. Mudanças relevantes são comunicadas por e-mail ou aviso na
        plataforma. O uso continuado após a comunicação significa aceitação.
      </P>

      <H2>12. Lei aplicável e foro</H2>
      <P>
        Estes Termos são regidos pelas leis brasileiras. Fica eleito o foro da Comarca de São
        Paulo/SP, sem prejuízo do direito do consumidor de demandar no foro do seu domicílio.
      </P>

      <H2>13. Quem somos</H2>
      <ControladorBox produto="Pix Wiki" />

      <div className="mt-6 pt-5 border-t border-slate-800">
        <P>
          <strong>
            Ao usar o Pix Wiki, você confirma que leu e concorda com estes Termos de Uso.
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
