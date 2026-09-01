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
    <LegalShell theme={T} title="Termos de Uso" updatedAt="20 de agosto de 2026">
      <P>
        Estes Termos regem o uso do <strong>PixWiki</strong> (pix.wiki). Ao criar uma conta,
        conectar uma conta Mercado Pago ou usar os recursos de cobrança, você concorda com eles.
      </P>

      <H2>1. O que o serviço faz</H2>
      <P>
        O PixWiki acompanha recebimentos Pix de uma conta Mercado Pago conectada, organiza o
        histórico, envia avisos e, conforme o plano, oferece página de cobrança, QR Code,
        WhatsApp, relatórios, API e Webhooks.
      </P>

      <H2>2. O que o PixWiki não é</H2>
      <Box variant="warn">
        <P>
          O PixWiki <strong>não é banco, instituição de pagamento ou carteira digital</strong>.
          O dinheiro não fica custodiado no PixWiki e não existe saldo PixWiki para saque.
        </P>
        <P>
          Os valores entram diretamente na conta Mercado Pago do recebedor. O painel apenas
          acompanha e organiza informações de recebimentos disponibilizadas pelo provedor.
        </P>
      </Box>

      <H2>3. Conta e conexão Mercado Pago</H2>
      <UL>
        <LI>Você deve ter capacidade legal para contratar e utilizar o serviço</LI>
        <LI>Os dados cadastrados devem ser verdadeiros e atualizados</LI>
        <LI>Você é responsável pela segurança da sua conta e dos dispositivos utilizados</LI>
        <LI>
          A conexão Mercado Pago é feita por autorização do próprio provedor; o PixWiki não solicita
          a senha da sua conta Mercado Pago
        </LI>
        <LI>
          Você pode desconectar uma conta Mercado Pago pelo painel; o histórico já registrado pode
          ser preservado para auditoria e suporte
        </LI>
      </UL>

      <H2>4. Sua relação com o pagador</H2>
      <UL>
        <LI>A venda de produto ou serviço é responsabilidade exclusiva do recebedor</LI>
        <LI>Você é responsável por entrega, atendimento, tributos e documentos fiscais aplicáveis</LI>
        <LI>O PixWiki não arbitra disputas comerciais entre recebedor e pagador</LI>
        <LI>Estornos e devoluções seguem as regras da instituição financeira utilizada</LI>
      </UL>

      <H2>5. Planos e preços</H2>
      <UL>
        <LI><strong>Pix Grátis:</strong> R$ 0</LI>
        <LI><strong>Pix Link:</strong> R$ 29,90 por mês</LI>
        <LI><strong>Pix Pro:</strong> R$ 99,90 por mês</LI>
        <LI>O PixWiki não cobra porcentagem própria sobre cada Pix recebido</LI>
        <LI>
          O Mercado Pago pode aplicar tarifas conforme o tipo de recebimento e as condições da conta
          do recebedor; essas tarifas não pertencem ao PixWiki
        </LI>
      </UL>
      <P>
        Preços e recursos dos planos podem ser alterados para períodos futuros mediante comunicação
        adequada. Condições já pagas são respeitadas durante o período contratado, salvo exigência
        legal ou situação excepcional prevista nestes Termos.
      </P>

      <H2>6. Confirmação de recebimentos</H2>
      <P>
        O PixWiki depende das informações disponibilizadas pelo Mercado Pago e de sua infraestrutura.
        Pode existir atraso entre a liquidação financeira e a atualização do painel. Recursos de
        atualização automática e manual reduzem esse intervalo, mas não substituem o extrato oficial
        da instituição financeira em situações de dúvida.
      </P>

      <H2>7. Uso proibido</H2>
      <P>É proibido utilizar o PixWiki para atividade ilícita ou fraudulenta, incluindo:</P>
      <UL>
        <LI>golpes, extorsão, falsidade ideológica ou tentativa de enganar pagadores</LI>
        <LI>lavagem de dinheiro ou ocultação da origem de recursos</LI>
        <LI>comercialização de produtos ou serviços proibidos por lei</LI>
        <LI>uso de identidade, marca ou nome de terceiro sem autorização</LI>
        <LI>tentativas de acessar dados de outras contas ou contornar controles de segurança</LI>
        <LI>automação abusiva que comprometa a disponibilidade da plataforma</LI>
      </UL>

      <H2>8. Disponibilidade e limitação de responsabilidade</H2>
      <P>
        O serviço depende de Mercado Pago, Supabase, Vercel, provedores de notificação e da
        infraestrutura da internet. Não garantimos funcionamento ininterrupto.
      </P>
      <P>Não nos responsabilizamos por:</P>
      <UL>
        <LI>indisponibilidade ou atraso causado por instituição financeira ou provedor terceiro</LI>
        <LI>tarifas, bloqueios ou decisões aplicadas pelo Mercado Pago à conta do recebedor</LI>
        <LI>notificação não entregue por falha de e-mail, Push, WhatsApp ou dispositivo</LI>
        <LI>prejuízos decorrentes da relação comercial entre recebedor e pagador</LI>
        <LI>uso indevido da conta por negligência na proteção das credenciais</LI>
      </UL>

      <H2>9. Notificações</H2>
      <P>
        E-mail e Push podem ser utilizados desde o plano gratuito. WhatsApp faz parte do Pix Pro.
        Notificações são conveniência operacional: para conferência financeira definitiva, prevalece
        a informação da instituição financeira.
      </P>

      <H2>10. Cancelamento e encerramento</H2>
      <P>
        O cancelamento de plano pago interrompe os recursos premium conforme as regras exibidas no
        momento da contratação. A exclusão da conta pode ser solicitada na página própria.
      </P>
      <Box variant="info">
        <P>
          Como o PixWiki não guarda seu dinheiro, encerrar a conta PixWiki não movimenta nem bloqueia
          valores existentes na sua conta Mercado Pago.
        </P>
      </Box>

      <H2>11. Alterações</H2>
      <P>
        Podemos atualizar estes Termos. Mudanças relevantes serão comunicadas pela plataforma,
        e-mail ou outro canal adequado.
      </P>

      <H2>12. Lei aplicável e foro</H2>
      <P>
        Estes Termos são regidos pelas leis brasileiras, preservados os direitos de foro previstos
        na legislação de proteção ao consumidor quando aplicáveis.
      </P>

      <H2>13. Quem somos</H2>
      <ControladorBox produto="PixWiki" />

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
