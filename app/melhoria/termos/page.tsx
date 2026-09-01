'use client';

// app/melhoria/termos/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ RASCUNHO PARA REVISÃO JURÍDICA — NÃO PUBLIQUE SEM ADVOGADO LER.
//
// As seções 2 e 3 são as que sustentam a classificação do produto. Elas
// existem para deixar registrado que a MelhorIA:
//   - não é dispositivo médico (não diagnostica, não trata, não calcula dose)
//   - não é serviço de emergência
//
// Não é formalidade: é o que mantém o aplicativo fora da RDC 657/2022 da
// ANVISA (software como dispositivo médico) e fora da política de emergência
// da Play Store. Se alguém propuser adicionar "verificar interação entre
// remédios" ou "sugerir dose", estas seções deixam de ser verdadeiras e a
// classificação do produto muda.
// ─────────────────────────────────────────────────────────────────────────────

import {
  LEGAL_THEMES, LegalShell, LegalFooterLinks, ControladorBox,
  H2, P, UL, LI, Box,
} from '@/components/legal/legal-doc';

const T = LEGAL_THEMES.melhoria;

export default function TermosMelhorIA() {
  return (
    <LegalShell
      theme={T}
      title="Termos de Uso"
      updatedAt="20 de agosto de 2026"
      textoGrande
      scroll={false}
      footer={
        <LegalFooterLinks
          theme={T}
          links={[
            { href: '/aviso', label: 'Aviso de privacidade' },
            { href: '/exclusao', label: 'Apagar minha conta', danger: true },
            { href: 'mailto:contato@bigcorps.com.br', label: 'Falar com a gente' },
          ]}
        />
      }
    >
      <P>
        Ao usar a <strong>MelhorIA</strong>, você concorda com as regras abaixo.
        Escrevemos em linguagem simples de propósito.
      </P>

      <H2>1. O que a MelhorIA faz</H2>
      <P>
        A MelhorIA é um aplicativo de organização pessoal. Ela:
      </P>
      <UL>
        <LI>avisa na hora de tomar os remédios que <strong>você</strong> cadastrou</LI>
        <LI>guarda o registro de quando você confirmou cada dose</LI>
        <LI>lembra de consultas e exames</LI>
        <LI>avisa quando o remédio está acabando</LI>
        <LI>confere se um boleto ou link tem indícios de golpe</LI>
        <LI>avisa as pessoas que você cadastrou, quando você aperta o botão de emergência</LI>
        <LI>guarda sua lista de compras</LI>
      </UL>

      <Box variant="danger">
        <H2>2. A MelhorIA não é médico</H2>
        <P>
          A MelhorIA <strong>lembra, organiza e registra</strong>. Ela não faz
          nada além disso quando o assunto é saúde. Especificamente, ela{' '}
          <strong>não</strong>:
        </P>
        <UL>
          <LI>indica que remédio tomar, nem quanto tomar</LI>
          <LI>diz para que serve um medicamento</LI>
          <LI>avalia se um remédio combina com outro</LI>
          <LI>interpreta resultado de exame</LI>
          <LI>dá diagnóstico nem sugere tratamento</LI>
        </UL>
        <P>
          Toda informação sobre seu tratamento vem de você ou da sua receita.{' '}
          <strong>
            Nunca mude, interrompa ou comece um tratamento por causa do que este
            aplicativo mostrou. Fale com seu médico.
          </strong>
        </P>
        <P>
          Se você usar a câmera para ler uma receita, a MelhorIA apenas tenta
          copiar o que está escrito. Ela pode errar. Por isso,{' '}
          <strong>
            nenhum remédio lido por foto é ativado sem que uma pessoa confira e
            confirme
          </strong>
          . Confira sempre com a receita na mão.
        </P>
      </Box>

      <Box variant="danger">
        <H2>3. O botão de emergência não é o SAMU</H2>
        <P>
          O botão de emergência envia um aviso para as pessoas que{' '}
          <strong>você</strong> cadastrou, pelo aplicativo e por SMS.
        </P>
        <P>
          Ele <strong>não</strong> aciona SAMU (192), Polícia (190) nem
          Bombeiros (193). Ele não é serviço de monitoramento e ninguém da nossa
          equipe recebe o aviso.
        </P>
        <P>
          O aviso depende de internet, de bateria e da entrega pela operadora.
          Pode atrasar ou não chegar.{' '}
          <strong>Em uma emergência de verdade, ligue para 192 ou 190.</strong>
        </P>
      </Box>

      <H2>4. O que é grátis e o que usa créditos</H2>
      <P>
        <strong>Grátis, sem limite e para sempre:</strong> cadastrar remédios,
        consultas e exames; receber todos os lembretes; confirmar as doses; ver
        o histórico e o relatório; controlar o estoque; a lista de compras; e
        conferir boleto pela linha digitável.
      </P>
      <P>
        <strong>Usa créditos:</strong> ler receita ou pedido de exame por foto;
        analisar imagem de boleto ou comprovante; conversar com a inteligência
        artificial; e enviar SMS.
      </P>
      <Box variant="warn">
        <P>
          <strong>Quando os créditos acabam, o SMS deixa de funcionar</strong>{' '}
          até você recarregar — inclusive o SMS do botão de emergência. O aviso
          pelo aplicativo continua funcionando normalmente, sem créditos.
          Avisamos com antecedência quando o saldo estiver baixo.
        </P>
      </Box>
      <P>
        Créditos não expiram, não são transferíveis e não são reembolsáveis
        depois de usados. O preço de cada função aparece antes de você
        confirmar.
      </P>

      <H2>5. Sua responsabilidade</H2>
      <UL>
        <LI>informar corretamente os remédios, doses e horários</LI>
        <LI>conferir o que a câmera leu antes de confirmar</LI>
        <LI>manter as notificações ligadas no seu celular</LI>
        <LI>avisar seus contatos de emergência de que eles estão cadastrados</LI>
        <LI>não usar o aplicativo para organizar remédio de outra pessoa sem que ela saiba</LI>
      </UL>

      <H2>6. Limites do serviço</H2>
      <P>
        Fazemos o possível para que os lembretes cheguem sempre e na hora, mas
        não podemos garantir. O aviso depende do seu celular, da sua internet,
        das configurações de notificação do aparelho e de serviços de terceiros.
      </P>
      <P>
        <strong>
          A MelhorIA é um apoio à memória, não um substituto do cuidado médico
          nem da atenção de quem acompanha o tratamento.
        </strong>{' '}
        Não nos responsabilizamos por consequências de doses esquecidas,
        tomadas em dobro, compromissos perdidos ou avisos de emergência não
        entregues.
      </P>

      <H2>7. Verificação de boleto e link</H2>
      <P>
        A verificação aponta indícios. Quando nada de errado aparece, a resposta
        é <strong>“não encontramos indícios”</strong> — e isso{' '}
        <strong>não</strong> é o mesmo que dizer que é seguro. Golpes novos
        aparecem todo dia.
      </P>
      <P>
        <strong>
          Na dúvida, ligue para quem enviou a cobrança e confirme por telefone,
          usando um número que você já conhece.
        </strong>
      </P>

      <H2>8. Idade e conta</H2>
      <P>
        É preciso ter 18 anos ou mais. Se a pessoa que vai usar não tiver
        condições de decidir sozinha, quem cadastra deve ser o responsável
        legal.
      </P>
      <P>
        Sua conta é a mesma da plataforma minhAi. Se você já usa outro produto
        nosso, o mesmo e-mail serve, e os créditos são compartilhados entre
        eles.
      </P>

      <H2>9. Encerramento</H2>
      <P>
        Você pode apagar sua conta quando quiser, em{' '}
        <strong>melhoria.org/exclusao</strong>. Podemos encerrar contas que usem
        o serviço para fraude ou para prejudicar alguém.
      </P>

      <H2>10. Mudanças</H2>
      <P>
        Se mudarmos algo importante, avisamos dentro do aplicativo antes de
        passar a valer.
      </P>

      <H2>11. Quem somos</H2>
      <ControladorBox produto="MelhorIA" />
      <P>
        Foro da comarca de São Paulo/SP, sem prejuízo do direito do consumidor
        de escolher o foro do seu domicílio.
      </P>
    </LegalShell>
  );
}
