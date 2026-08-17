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

const T = LEGAL_THEMES.consultatec;

export default function TermosConsultaTec() {
  return (
    <LegalShell theme={T} title="Termos de Uso" updatedAt="17 de agosto de 2026">
      <P>
        Estes Termos regem o uso do <strong>ConsultaTec</strong> (consulta.tec.br). Ao realizar uma
        consulta, com ou sem cadastro, você concorda com eles.
      </P>

      <H2>1. O que o serviço faz</H2>
      <P>
        O ConsultaTec intermedeia consultas de CPF e CNPJ. Você informa o documento, o sistema
        identifica automaticamente o tipo pelos dígitos, exibe as opções disponíveis com o preço de
        cada uma, e após o pagamento retorna o resultado obtido junto aos fornecedores de dados.
      </P>
      <P>Conforme o tipo de documento, estão disponíveis consultas de:</P>
      <UL>
        <LI>
          <strong>Dados cadastrais</strong> &mdash; nome ou razão social, filiação ou sócios, data de
          nascimento ou abertura, situação cadastral
        </LI>
        <LI>
          <strong>Restrições</strong> &mdash; score e pendências financeiras
        </LI>
        <LI>
          <strong>Protestos</strong> &mdash; protestos em cartório e pendências tributárias,
          disponível apenas para CPF
        </LI>
        <LI>
          <strong>Completa</strong> &mdash; as três anteriores em um único pagamento, apenas para CPF
        </LI>
      </UL>
      <P>
        A ausência de algumas modalidades para CNPJ é limitação das fontes de dados utilizadas, não
        falha do serviço. Os preços vigentes são sempre os exibidos na tela no momento da consulta.
      </P>

      <H2>2. Sua responsabilidade ao consultar</H2>
      <Box variant="warn">
        <P>
          Esta é a cláusula mais importante destes Termos. Ao consultar um documento que não é seu,
          você declara ter finalidade legítima e base legal para fazê-lo &mdash; por exemplo,
          análise de crédito de um cliente, verificação de contraparte em negócio ou conferência de
          fornecedor.
        </P>
        <P>
          <strong>É proibido</strong> usar o ConsultaTec para curiosidade sobre a vida de terceiros,
          perseguição, constrangimento, discriminação, cobrança irregular, montagem de base para
          revenda ou qualquer finalidade vedada pela LGPD.
        </P>
        <P>
          Registramos qual documento foi consultado, por qual conta e quando. Esse registro pode ser
          fornecido às autoridades competentes quando exigido por lei.
        </P>
      </Box>

      <H2>3. Precisão dos resultados</H2>
      <UL>
        <LI>
          Os dados vêm de fontes externas, incluindo bureaus de crédito e bases públicas. Nós não
          produzimos, editamos nem validamos esse conteúdo
        </LI>
        <LI>
          Não garantimos que a informação esteja completa, atualizada ou correta &mdash; a exatidão é
          responsabilidade da fonte
        </LI>
        <LI>
          Divergências de score, pendência ou protesto devem ser contestadas junto ao bureau que
          originou o dado. Podemos indicar o caminho, mas não temos poder de alterar o registro
        </LI>
        <LI>
          Uma consulta que retorna &ldquo;nada consta&rdquo; é um resultado válido e não gera
          reembolso: o serviço contratado foi a consulta, não a existência de apontamento
        </LI>
      </UL>

      <H2>4. Pagamento</H2>
      <UL>
        <LI>
          <strong>Sem cadastro:</strong> cada consulta gera uma cobrança PIX na hora. O resultado é
          liberado após a confirmação automática do pagamento
        </LI>
        <LI>
          <strong>Com cadastro:</strong> você adiciona saldo à conta por PIX e as consultas seguintes
          debitam automaticamente, sem gerar nova cobrança
        </LI>
        <LI>Não trabalhamos com cartão de crédito e não coletamos dados de cartão</LI>
        <LI>
          O saldo adicionado é crédito para uso no serviço, não é conta de pagamento, não rende
          juros e não pode ser transferido a terceiros
        </LI>
      </UL>

      <Box variant="info">
        <P>
          <strong>Conta e saldo unificados.</strong> A conta do ConsultaTec é a mesma do ecossistema
          minhAi. Se você usa outro produto nosso com o mesmo e-mail, o saldo é compartilhado entre
          eles. Se preferir separar, use e-mails distintos.
        </P>
      </Box>

      <H2>5. Reembolso</H2>
      <P>Reembolsamos integralmente quando:</P>
      <UL>
        <LI>O pagamento foi confirmado e o resultado não foi entregue por falha nossa</LI>
        <LI>Houve cobrança duplicada da mesma consulta</LI>
        <LI>A consulta retornou erro técnico do fornecedor, sem dado útil</LI>
      </UL>
      <P>Não há reembolso quando:</P>
      <UL>
        <LI>O resultado foi entregue, mas não continha a informação que você esperava</LI>
        <LI>Você digitou o documento errado e a consulta foi processada</LI>
        <LI>Você discorda do conteúdo informado pela fonte de dados</LI>
      </UL>
      <P>
        Como se trata de conteúdo digital entregue de imediato, o direito de arrependimento do artigo
        49 do Código de Defesa do Consumidor se esgota com a exibição do resultado. Saldo não
        utilizado pode ser devolvido a pedido, dentro de 7 dias da recarga.
      </P>
      <P>
        Pedidos: <strong>contato@bigcorps.com.br</strong>, com data e valor da transação.
      </P>

      <H2>6. Uso proibido</H2>
      <UL>
        <LI>Automatizar consultas em massa, raspagem ou revenda dos resultados</LI>
        <LI>Compartilhar credenciais de acesso</LI>
        <LI>Contornar a cobrança ou explorar falhas de saldo</LI>
        <LI>Usar o serviço para as finalidades vedadas descritas na seção 2</LI>
      </UL>
      <P>
        Contas com indício desses usos podem ser suspensas imediatamente, sem reembolso do saldo
        remanescente quando a suspensão decorrer de uso ilegal comprovado.
      </P>

      <H2>7. Disponibilidade e limitação de responsabilidade</H2>
      <P>
        O serviço é fornecido no estado em que se encontra e depende da disponibilidade dos
        fornecedores de dados e do banco. Não garantimos operação ininterrupta.
      </P>
      <P>Não nos responsabilizamos por:</P>
      <UL>
        <LI>Decisões de negócio que você tome com base em um resultado de consulta</LI>
        <LI>Prejuízo decorrente de dado incorreto fornecido pela fonte</LI>
        <LI>Indisponibilidade de fornecedor externo ou força maior</LI>
        <LI>Consequências do uso indevido das consultas por você</LI>
      </UL>
      <P>
        Nossa responsabilidade total fica limitada ao valor pago pela consulta em questão, sem
        prejuízo dos direitos irrenunciáveis do consumidor.
      </P>

      <H2>8. Encerramento</H2>
      <P>
        Você pode encerrar a conta a qualquer momento pela página de exclusão de dados. Saldo
        remanescente pode ser devolvido, mediante solicitação, antes do encerramento. Podemos
        suspender contas que violem estes Termos.
      </P>

      <H2>9. Alterações</H2>
      <P>
        Podemos alterar estes Termos e os preços. Alterações de preço valem para consultas futuras e
        nunca retroagem. Mudanças relevantes são comunicadas por e-mail ou aviso na plataforma.
      </P>

      <H2>10. Lei aplicável e foro</H2>
      <P>
        Estes Termos são regidos pelas leis brasileiras. Fica eleito o foro da Comarca de São
        Paulo/SP, sem prejuízo do direito do consumidor de demandar no foro do seu domicílio.
      </P>

      <H2>11. Quem somos</H2>
      <ControladorBox produto="ConsultaTec" />

      <div className="mt-6 pt-5 border-t border-[#C9BFA0]">
        <P>
          <strong>
            Ao usar o ConsultaTec, você confirma que leu e concorda com estes Termos de Uso.
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
