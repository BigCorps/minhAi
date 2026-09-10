'use client';

// app/funcionaria/termos/page.tsx
//
// Termos de Uso da FuncionarIA (funcionaria.net).
//
// Duas cláusulas aqui não são boilerplate e existem por motivo concreto:
//
//   1. Seção 4 (papel de operador). A FuncionarIA atende clientes DA EMPRESA
//      contratante. Sem deixar explícito que o usuário é controlador desses
//      dados, a responsabilidade por um vazamento de conversa fica ambígua.
//
//   2. Seção 6 (limites da IA). A assistente conversa com cliente final e pode
//      afirmar preço, prazo ou condição errada. Sem a ressalva de que a palavra
//      final é do contratante, cria-se expectativa de que a plataforma responde
//      por compromisso gerado automaticamente.

import {
  LEGAL_THEMES,
  LegalShell,
  LegalFooterLinks,
  H2,
  P,
  UL,
  LI,
  Box,
} from '@/components/legal/legal-doc';

const T = LEGAL_THEMES.funcionaria;

export default function TermosFuncionarIA() {
  return (
    <LegalShell theme={T} title="Termos de Uso" updatedAt="10 de setembro de 2026">
      <P>
        Estes Termos regem o uso da <strong>FuncionarIA</strong> (funcionaria.net), plataforma de
        assistente de inteligência artificial para empresas, operada pela BigCorps Tecnologia LTDA.
        Ao criar conta ou usar o serviço, você concorda com eles.
      </P>

      <H2>1. O que é o serviço</H2>
      <P>
        A FuncionarIA permite criar uma assistente de IA configurável para atender, informar e
        apoiar o relacionamento com seus clientes, no presencial e no online. Você define a
        identidade, as habilidades e o conteúdo que ela usa para responder.
      </P>

      <H2>2. Conta</H2>
      <UL>
        <LI>É necessário ter 18 anos ou mais e capacidade para contratar</LI>
        <LI>
          As informações de cadastro devem ser verdadeiras e mantidas atualizadas
        </LI>
        <LI>
          Você é responsável por tudo que acontecer na sua conta, inclusive pelo acesso de pessoas
          da sua equipe
        </LI>
        <LI>
          A conta é a mesma em todos os produtos da plataforma minhAi
        </LI>
      </UL>

      <H2>3. Planos e pagamento</H2>
      <P>
        As condições comerciais vigentes, incluindo o que é gratuito e o que é cobrado, ficam
        disponíveis na plataforma. Alterações de preço são comunicadas com antecedência e valem para
        o ciclo seguinte.
      </P>
      <Box>
        <P>
          Você pode cancelar quando quiser. O cancelamento encerra a renovação; o período já pago
          segue até o fim. Valores de período já usado não são devolvidos, salvo quando a lei exigir.
        </P>
      </Box>

      <H2>4. Dados dos seus clientes: seu papel e o nosso</H2>
      <Box variant="warn">
        <P>
          Sobre os dados das pessoas que conversam com a sua assistente, <strong>você é o
          controlador</strong> e nós somos o <strong>operador</strong>, nos termos da LGPD. Tratamos
          esses dados apenas por sua conta e ordem, para operar o atendimento.
        </P>
      </Box>
      <P>Isso significa que é sua responsabilidade:</P>
      <UL>
        <LI>
          Ter base legal válida para tratar os dados dos seus clientes
        </LI>
        <LI>
          <strong>Informar seus clientes</strong> de que o atendimento é feito por assistente de IA
          e de que a conversa é registrada
        </LI>
        <LI>
          Responder aos pedidos de acesso, correção e exclusão que os titulares fizerem a você
        </LI>
        <LI>
          Não usar a plataforma para tratar dado sensível sem base legal adequada
        </LI>
      </UL>

      <H2>5. Uso aceitável</H2>
      <P>É vedado usar a FuncionarIA para:</P>
      <UL>
        <LI>Qualquer finalidade ilegal, fraudulenta ou enganosa</LI>
        <LI>
          Fazer a assistente se passar por pessoa humana quando o cliente perguntar diretamente se
          está falando com uma máquina
        </LI>
        <LI>
          Enviar mensagem não solicitada em massa, ou violar as regras do canal usado, inclusive as
          políticas do WhatsApp Business
        </LI>
        <LI>
          Praticar discriminação, assédio, ameaça ou constrangimento
        </LI>
        <LI>
          Coletar dado de terceiro sem base legal, ou inserir na base de conhecimento informação
          sigilosa de outra pessoa
        </LI>
        <LI>
          Tentar burlar limites técnicos, fazer engenharia reversa ou sobrecarregar a
          infraestrutura
        </LI>
        <LI>
          Revender ou sublicenciar o serviço sem autorização por escrito
        </LI>
      </UL>
      <P>
        O descumprimento pode levar à suspensão ou encerramento da conta, sem prejuízo das medidas
        legais aplicáveis.
      </P>

      <H2>6. Limites da inteligência artificial</H2>
      <Box variant="danger">
        <P>
          <strong>A assistente pode errar.</strong> As respostas são geradas automaticamente e podem
          conter informação incorreta, incompleta ou desatualizada. A palavra final sobre preço,
          prazo, condição contratual e qualquer compromisso com cliente é <strong>sua</strong>, não
          da assistente.
        </P>
        <P>
          Não nos responsabilizamos por compromisso, oferta ou informação que a assistente
          transmita ao seu cliente. Se a precisão for crítica no seu negócio, revise as
          configurações e supervisione os atendimentos.
        </P>
      </Box>
      <P>
        A FuncionarIA não é serviço jurídico, contábil, médico ou financeiro, e não substitui
        profissional habilitado.
      </P>

      <H2>7. Conteúdo e propriedade</H2>
      <UL>
        <LI>
          O conteúdo que você cadastra continua seu. Você nos concede apenas a licença necessária
          para operar o serviço
        </LI>
        <LI>
          A plataforma, o código e a marca continuam nossos
        </LI>
        <LI>
          Você declara ter direito sobre o material que enviar à base de conhecimento
        </LI>
      </UL>

      <H2>8. Disponibilidade</H2>
      <P>
        Trabalhamos para manter o serviço disponível, mas ele pode ficar indisponível por
        manutenção, falha de terceiro ou evento fora do nosso controle. Não garantimos operação
        ininterrupta nem ausência de erros.
      </P>

      <H2>9. Limitação de responsabilidade</H2>
      <P>
        Na máxima extensão permitida pela lei, nossa responsabilidade fica limitada ao valor pago
        por você nos 12 meses anteriores ao fato. Não respondemos por lucro cessante, perda de
        oportunidade ou dano indireto.
      </P>
      <P>
        Nada aqui afasta direito que o Código de Defesa do Consumidor garanta de forma
        irrenunciável.
      </P>

      <H2>10. Encerramento</H2>
      <P>
        Você pode encerrar sua conta a qualquer momento em{' '}
        <strong>funcionaria.net/exclusao</strong>. Podemos encerrar ou suspender a conta em caso de
        violação destes Termos, de risco à plataforma ou de exigência legal, com aviso quando
        possível.
      </P>

      <H2>11. Mudanças nos Termos</H2>
      <P>
        Mudanças relevantes são comunicadas por e-mail ou dentro da plataforma antes de valer. Se
        você não concordar, pode encerrar a conta.
      </P>

      <H2>12. Lei aplicável e foro</H2>
      <P>
        Estes Termos são regidos pela lei brasileira. Fica eleito o foro do domicílio do
        consumidor para as relações de consumo; nas demais, o da comarca da sede da BigCorps
        Tecnologia LTDA.
      </P>

      <Box>
        <P>
          Dúvidas sobre estes Termos: <strong>contato@bigcorps.com.br</strong>
        </P>
      </Box>

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
