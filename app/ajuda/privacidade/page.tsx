import Image from 'next/image';
import Link from 'next/link';

export const metadata = {
  title: 'Política de Privacidade | BigCorps',
  description: 'Como a BigCorps usa os dados enviados no diagnóstico gratuito.',
};

export default function BigCorpsHelpPrivacyPage() {
  return (
    <main className="min-h-screen bg-white px-4 py-8 text-[#1F1F1F] sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="inline-flex min-h-11 items-center text-sm font-bold text-[#C76600] hover:underline">
          ← Voltar para a análise
        </Link>

        <div className="mt-5 flex items-center gap-3">
          <Image src="/brands/bigcorps/logo-mark.png" alt="BigCorps" width={48} height={48} className="h-12 w-12 object-contain" />
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[.16em] text-[#FD9219]">BigCorps</p>
            <h1 className="text-3xl font-black tracking-tight">Política de Privacidade — Diagnóstico</h1>
          </div>
        </div>

        <article className="mt-8 space-y-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <p className="text-sm leading-6 text-slate-600">Última atualização: 7 de outubro de 2026.</p>

          <section className="space-y-2">
            <h2 className="text-xl font-black">1. Dados coletados</h2>
            <p className="leading-7 text-slate-700">
              No diagnóstico gratuito, coletamos as respostas sobre o perfil e as necessidades da empresa, além de nome,
              nome da empresa, WhatsApp, cidade/UF, melhor horário para contato e, se você informar, e-mail. Também podemos
              registrar parâmetros de campanha (UTMs, fbclid, fbc e fbp), navegador e informações técnicas necessárias para
              segurança, prevenção de abuso e medição de anúncios.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-black">2. Para que usamos esses dados</h2>
            <p className="leading-7 text-slate-700">
              Usamos os dados para preparar o diagnóstico, identificar áreas em que tecnologia e IA podem ajudar o negócio e
              entrar em contato comercial sobre essa análise. Também usamos dados de campanha para medir a origem dos leads,
              entender a efetividade dos anúncios e melhorar nossas páginas e comunicações.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-black">3. Medição de anúncios e cookies</h2>
            <p className="leading-7 text-slate-700">
              Ferramentas de medição no navegador, como Meta Pixel e analytics, só são ativadas após o consentimento de cookies
              não essenciais. O evento de lead enviado pelo navegador não contém nome, telefone, e-mail ou respostas. Quando
              configurada, a API de Conversões da Meta recebe no servidor identificadores técnicos e dados de contato normalizados
              e protegidos por hash SHA-256 para deduplicação e atribuição do anúncio.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-black">4. Compartilhamento e proteção</h2>
            <p className="leading-7 text-slate-700">
              Não vendemos os dados deste diagnóstico. Eles ficam restritos à operação da BigCorps e aos provedores necessários
              para hospedagem, banco de dados, comunicação e medição, de acordo com as finalidades acima. Aplicamos controles de
              acesso e não disponibilizamos a lista de leads publicamente.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-black">5. Seus direitos</h2>
            <p className="leading-7 text-slate-700">
              Você pode solicitar confirmação, acesso, correção ou exclusão dos seus dados e revogar consentimentos quando
              aplicável, conforme a LGPD. Para exercer esses direitos, utilize um dos canais oficiais de atendimento da BigCorps.
            </p>
          </section>

          <section className="rounded-2xl bg-[#FFF7ED] p-4 text-sm leading-6 text-[#7A3E00]">
            <strong>Responsável:</strong> BigCorps · atendimento pelos canais oficiais da marca
          </section>
        </article>
      </div>
    </main>
  );
}
