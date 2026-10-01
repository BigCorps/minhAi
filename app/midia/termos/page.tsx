'use client';

// app/midia/termos/page.tsx
//
// Termos de Uso do Midia.Pro (midia.pro).
//
// Três cláusulas aqui não são boilerplate:
//
//   4. Remuneração e saque. O usuário RECEBE dinheiro. Sem definir como o
//      crédito é apurado, quando fica disponível e o que acontece em caso de
//      fraude de exibição, qualquer divergência de saldo vira disputa sem
//      regra escrita.
//
//   5. Conteúdo exibido. A tela é pública e fica num espaço físico do
//      usuário. Ele responde pelo que exibe e nós precisamos do direito de
//      recusar anúncio — e ele, o de recusar categorias que não quer na tela
//      dele (o caso clássico é o estabelecimento familiar).
//
//   6. Disponibilidade da tela. A remuneração depende da tela estar ligada.
//      Sem isso escrito, o usuário espera receber por tempo em que a tela
//      esteve offline.

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

const T = LEGAL_THEMES.midia;

export default function TermosMidiaPro() {
  return (
    <LegalShell theme={T} title="Termos de Uso" updatedAt="1º de outubro de 2026">
      <P>
        Estes Termos regem o uso do <strong>Midia.Pro</strong> (midia.pro), plataforma de gestão de
        telas e monetização de espaços de mídia, operada pela BigCorps Tecnologia LTDA. Ao criar
        conta ou usar o serviço, você concorda com eles.
      </P>

      <H2>1. O que é o serviço</H2>
      <P>
        O Midia.Pro permite cadastrar telas, programar a exibição das suas próprias mídias e,
        opcionalmente, aderir à rede para exibir anúncios de terceiros e receber parte do valor
        pago por eles.
      </P>

      <H2>2. Conta</H2>
      <UL>
        <LI>É necessário ter 18 anos ou mais e capacidade para contratar</LI>
        <LI>As informações de cadastro devem ser verdadeiras e mantidas atualizadas</LI>
        <LI>
          Você é responsável por tudo que acontecer na sua conta, inclusive pelo acesso da sua
          equipe
        </LI>
        <LI>A conta é a mesma em todos os produtos da plataforma minhAi</LI>
      </UL>

      <H2>3. Suas telas</H2>
      <UL>
        <LI>
          Você declara ter direito de instalar e operar a tela no local informado
        </LI>
        <LI>
          O hardware, a energia e a conexão de internet são por sua conta
        </LI>
        <LI>
          Cada tela é pareada por um token próprio. Mantenha-o em sigilo: quem tiver o token pode
          exibir conteúdo na sua tela
        </LI>
      </UL>

      <H2>4. Remuneração e saque</H2>
      <P>
        Ao aderir à rede, você recebe uma parte do valor pago pelos anunciantes cujas peças forem
        exibidas nas suas telas.
      </P>
      <UL>
        <LI>
          <strong>Apuração:</strong> o crédito é calculado pelas exibições efetivamente
          registradas pela plataforma
        </LI>
        <LI>
          <strong>Percentual e condições:</strong> ficam disponíveis na plataforma e podem mudar,
          com aviso prévio, valendo para o período seguinte
        </LI>
        <LI>
          <strong>Saque:</strong> feito para a chave PIX que você cadastrar, respeitando o valor
          mínimo e o prazo informados na plataforma
        </LI>
        <LI>
          <strong>Tributos:</strong> a responsabilidade pelos tributos sobre os valores recebidos é
          sua
        </LI>
      </UL>

      <Box variant="warn">
        <P>
          <strong>Exibição fraudulenta.</strong> Simular exibições — tela desligada reportando
          reprodução, automação, tela sem público real, repetição artificial — resulta em estorno
          dos créditos correspondentes e pode levar ao encerramento da conta. Reservamo-nos o
          direito de auditar os registros antes de liberar saque.
        </P>
      </Box>

      <H2>5. Conteúdo exibido</H2>
      <P>
        <strong>Sobre as suas mídias:</strong> você declara ter direito sobre tudo que enviar.
        É vedado exibir conteúdo ilegal, discriminatório, enganoso, que viole direito de imagem ou
        propriedade intelectual de terceiro, ou que seja inadequado ao público do local.
      </P>
      <P>
        <strong>Sobre os anúncios da rede:</strong> você pode recusar categorias de anúncio que não
        queira na sua tela, pelas configurações da plataforma. Podemos recusar ou remover qualquer
        peça publicitária a nosso critério, inclusive após veiculada.
      </P>
      <Box>
        <P>
          A tela fica num espaço físico seu e é vista por quem passa. Avalie se o conteúdo é
          adequado ao público daquele local — um estabelecimento frequentado por crianças pede
          critério diferente de um ambiente adulto.
        </P>
      </Box>

      <H2>6. Disponibilidade</H2>
      <P>
        Trabalhamos para manter a plataforma disponível, mas ela pode ficar indisponível por
        manutenção, falha de terceiro ou evento fora do nosso controle. Não garantimos operação
        ininterrupta nem ausência de erros.
      </P>
      <Box variant="warn">
        <P>
          <strong>Tela offline não gera crédito.</strong> A remuneração depende de exibição
          efetivamente registrada. Período em que a tela estiver desligada, sem internet ou com
          falha de reprodução não é remunerado, e não garantimos volume mínimo de anúncios.
        </P>
      </Box>

      <H2>7. Uso aceitável</H2>
      <P>É vedado usar o Midia.Pro para:</P>
      <UL>
        <LI>Qualquer finalidade ilegal, fraudulenta ou enganosa</LI>
        <LI>Simular ou inflar exibições, conforme a seção 4</LI>
        <LI>Exibir conteúdo que viole a seção 5</LI>
        <LI>
          Instalar tela em local onde você não tenha autorização para isso
        </LI>
        <LI>
          Tentar burlar limites técnicos, fazer engenharia reversa ou sobrecarregar a
          infraestrutura
        </LI>
        <LI>Revender ou sublicenciar o serviço sem autorização por escrito</LI>
      </UL>

      <H2>8. Propriedade</H2>
      <UL>
        <LI>As mídias que você envia continuam suas. Você nos concede a licença necessária para
          exibi-las nas suas telas e operar o serviço</LI>
        <LI>As peças dos anunciantes são deles e não podem ser reutilizadas por você</LI>
        <LI>A plataforma, o código e a marca continuam nossos</LI>
      </UL>

      <H2>9. Limitação de responsabilidade</H2>
      <P>
        Na máxima extensão permitida pela lei, nossa responsabilidade fica limitada ao valor que
        você recebeu ou pagou pela plataforma nos 12 meses anteriores ao fato. Não respondemos por
        lucro cessante, perda de oportunidade ou dano indireto, nem pelo conteúdo ou pelas ofertas
        dos anunciantes.
      </P>
      <P>
        Nada aqui afasta direito que o Código de Defesa do Consumidor garanta de forma
        irrenunciável.
      </P>

      <H2>10. Encerramento</H2>
      <P>
        Você pode encerrar sua conta a qualquer momento em <strong>midia.pro/exclusao</strong>.
        Saque o saldo antes: valores remanescentes não são devolvidos automaticamente no
        encerramento. Podemos encerrar ou suspender a conta em caso de violação destes Termos, de
        fraude de exibição ou de exigência legal.
      </P>

      <H2>11. Mudanças nos Termos</H2>
      <P>
        Mudanças relevantes são comunicadas por e-mail ou dentro da plataforma antes de valer. Se
        você não concordar, pode encerrar a conta.
      </P>

      <H2>12. Lei aplicável e foro</H2>
      <P>
        Estes Termos são regidos pela lei brasileira. Fica eleito o foro do domicílio do consumidor
        para as relações de consumo; nas demais, o da comarca da sede da BigCorps Tecnologia LTDA.
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
