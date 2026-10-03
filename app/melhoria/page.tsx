'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  ArrowRight, BellRing, Check, HeartHandshake, ShieldCheck,
  Smartphone, Users, CalendarDays, FileText, ChevronRight,
} from 'lucide-react';
import { melhoriaAuth } from '@/lib/melhoria/supabase';
import { R } from '@/lib/melhoria/rotas';
import { Rodape } from '@/components/melhoria/Chrome';
import { cor, toque, raio, espaco } from '@/lib/melhoria/tema';
import { melhoriaAnalytics } from '@/lib/melhoria/analytics';

const MELHORIA_PLAY_URL = 'https://play.google.com/store/apps/details?id=org.melhoria.twa';

type Publico = 'eu' | 'familia';

function irComRecarga(destino: string) {
  window.location.assign(destino);
}

export default function LandingMelhorIA() {
  const [publico, setPublico] = useState<Publico>('familia');
  const [horarios, setHorarios] = useState(3);
  const [verificando, setVerificando] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await melhoriaAuth().auth.getUser();
      if (data?.user) { irComRecarga(R.app()); return; }
      setVerificando(false);
    })();
  }, []);

  const momentosMes = horarios * 30;
  const textoHero = publico === 'familia'
    ? {
        titulo: 'Você não precisa ligar todo dia só para perguntar: “Tomou o remédio?”',
        subtitulo: 'A MelhorIA lembra no horário, registra a confirmação e pode envolver a família quando algo precisa de atenção.',
      }
    : {
        titulo: 'Não deixe cada horário depender só da memória.',
        subtitulo: 'A MelhorIA lembra, organiza e registra sua rotina para você conferir o dia sem precisar guardar tudo na cabeça.',
      };

  const beneficios = publico === 'familia'
    ? ['Lembra no horário escolhido', 'Registra quando a dose é confirmada', 'Pode avisar a família se faltar confirmação']
    : ['Lembra no horário escolhido', 'Funciona mesmo com o app fechado', 'Guarda o histórico para você consultar depois'];

  function playClick(posicao: string) {
    melhoriaAnalytics('play_store_click', { position: posicao, audience: publico });
  }

  return (
    <main style={{ background: cor.fundo, color: cor.tinta, minHeight: '100dvh' }}>
      <header style={{
        position: 'sticky', top: 0, zIndex: 30,
        background: 'rgba(255,255,255,.96)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${cor.borda}`,
      }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Image src="/brands/melhoria/logo.png" alt="MelhorIA" width={46} height={46} style={{ borderRadius: 11 }} priority />
          <strong style={{ fontSize: 23 }}>MelhorIA</strong>
          <span style={{ flex: 1 }} />
          <a href={R.login()} style={{ minHeight: 48, display: 'inline-flex', alignItems: 'center', color: cor.destaqueTexto, fontWeight: 800, textDecoration: 'none' }}>Entrar</a>
        </div>
      </header>

      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '54px 20px 44px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: cor.destaqueSuave, color: cor.destaqueTexto, borderRadius: 999, padding: '8px 14px', fontSize: 17, fontWeight: 800 }}>
            <HeartHandshake size={20} /> Rotina mais tranquila para quem usa e para quem cuida
          </span>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, maxWidth: 520, margin: '22px auto 0' }}>
            <AudienceButton ativo={publico === 'eu'} onClick={() => setPublico('eu')}>Para mim</AudienceButton>
            <AudienceButton ativo={publico === 'familia'} onClick={() => setPublico('familia')}>Para meus pais ou avós</AudienceButton>
          </div>

          <h1 style={{ fontSize: 'clamp(38px, 7vw, 64px)', lineHeight: 1.04, letterSpacing: '-0.04em', margin: '28px 0 16px', fontWeight: 900 }}>
            {textoHero.titulo}
          </h1>
          <p style={{ maxWidth: 760, margin: '0 auto', fontSize: 'clamp(20px, 3vw, 25px)', color: cor.tintaMuted, lineHeight: 1.5 }}>
            {textoHero.subtitulo}
          </p>

          <div style={{ display: 'grid', gap: 10, margin: '28px auto 0', maxWidth: 690, textAlign: 'left' }}>
            {beneficios.map((b) => <Benefit key={b}>{b}</Benefit>)}
          </div>

          <a
            href={MELHORIA_PLAY_URL} target="_blank" rel="noopener noreferrer"
            onClick={() => playClick('hero')}
            style={{
              marginTop: 30, minHeight: 82, width: '100%', maxWidth: 620,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 14,
              borderRadius: 18, background: cor.destaque, color: '#fff', textDecoration: 'none',
              fontSize: 25, fontWeight: 900, boxShadow: '0 18px 45px rgba(15,118,110,.18)',
            }}
          >
            <Smartphone size={31} /> Baixar grátis no Google Play <ArrowRight size={28} />
          </a>
          <button
            type="button" disabled={verificando}
            onClick={() => { melhoriaAnalytics('web_signup_click', { position: 'hero' }); irComRecarga(`${R.login()}?mode=cadastro`); }}
            style={{ display: 'block', margin: '14px auto 0', border: 'none', background: 'transparent', color: cor.destaqueTexto, fontSize: 19, fontWeight: 800, textDecoration: 'underline', cursor: 'pointer' }}
          >
            Prefiro usar pelo navegador
          </button>
          <p style={{ fontSize: 18, color: cor.tintaMuted, marginTop: 14 }}>Grátis para cadastrar remédios, consultas, receber lembretes e acompanhar confirmações. Sem cartão.</p>
        </div>
      </section>

      <section style={{ background: '#F8FAFC', borderTop: `1px solid ${cor.borda}`, borderBottom: `1px solid ${cor.borda}` }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '50px 20px' }}>
          <SectionTitle eyebrow="Veja funcionando" title="Um horário deixa de ser uma coisa para lembrar e vira uma coisa para conferir." />
          <div style={{ maxWidth: 720, margin: '30px auto 0', display: 'grid', gap: 16 }}>
            <PhoneMoment time="08:00" title="Hora do remédio" state="A MelhorIA avisou no horário escolhido" tone="notice" />
            <PhoneMoment time="08:04" title="Confirmado" state="Registro salvo. Você não precisa guardar isso na cabeça." tone="ok" />
            {publico === 'familia' && <PhoneMoment time="20:30" title="Ainda não confirmado" state="Se configurado, a família pode ser avisada para conferir se está tudo bem." tone="attention" />}
          </div>
        </div>
      </section>

      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '56px 20px' }}>
        <SectionTitle eyebrow="Uma conta simples" title="Quantos momentos do mês hoje dependem da memória?" />
        <div style={{ maxWidth: 760, margin: '30px auto 0', background: cor.fundoCard, border: `2px solid ${cor.borda}`, borderRadius: 22, padding: 26, textAlign: 'center' }}>
          <p style={{ fontSize: 20, color: cor.tintaMuted, margin: 0 }}>Quantos horários de remédio existem por dia na rotina?</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, margin: '18px 0 24px' }}>
            {[1,2,3,4].map((n) => <button key={n} type="button" onClick={() => setHorarios(n)} style={{ minHeight: 64, borderRadius: 14, border: `3px solid ${horarios === n ? cor.destaque : cor.borda}`, background: horarios === n ? cor.destaqueSuave : '#fff', color: cor.tinta, fontSize: 23, fontWeight: 900, cursor: 'pointer' }}>{n === 4 ? '4+' : n}</button>)}
          </div>
          <strong style={{ display: 'block', fontSize: 'clamp(42px, 9vw, 72px)', color: cor.destaqueTexto, lineHeight: 1 }}>{momentosMes}+</strong>
          <p style={{ fontSize: 22, color: cor.tinta, lineHeight: 1.45, margin: '10px auto 0', maxWidth: 620 }}>
            momentos por mês que podem deixar de depender apenas da memória e passar a ter aviso + registro.
          </p>
        </div>
      </section>

      <section style={{ background: '#0F172A', color: '#fff' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '58px 20px' }}>
          <SectionTitle dark eyebrow="Depois do primeiro lembrete" title="Você ativa os outros recursos no seu ritmo." />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 14, marginTop: 30 }}>
            <Feature icon={<Users />} title="Família" text="Escolha quem pode acompanhar e receber avisos quando isso fizer sentido para sua rotina." />
            <Feature icon={<CalendarDays />} title="Consultas e exames" text="Organize os próximos compromissos e receba avisos antes de sair de casa." />
            <Feature icon={<FileText />} title="Histórico" text="As confirmações ficam registradas para você consultar e levar ao médico quando precisar." />
            <Feature icon={<ShieldCheck />} title="Ajuda contra golpes" text="Confira boleto ou link usando os recursos de verificação disponíveis no aplicativo." />
          </div>
        </div>
      </section>

      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '58px 20px' }}>
        <SectionTitle eyebrow="Sem complicar" title="O primeiro uso foi redesenhado para chegar ao valor antes das configurações." />
        <div style={{ maxWidth: 760, margin: '30px auto 0', display: 'grid', gap: 12 }}>
          {[
            ['1', 'Crie sua conta', 'Google ou e-mail. Sem cartão e sem formulário longo.'],
            ['2', 'Autorize o uso dos dados de saúde', 'Só o consentimento necessário para o recurso principal.'],
            ['3', 'Digite o nome e o horário', 'Dosagem, estoque e duração podem esperar.'],
            ['4', 'Ative os avisos', 'A permissão de notificação só é pedida depois de você entender por quê.'],
          ].map(([n,t,d]) => <Step key={n} n={n} title={t} text={d} />)}
        </div>
      </section>

      <section style={{ background: cor.destaqueSuave, borderTop: `2px solid ${cor.destaque}` }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '52px 20px', textAlign: 'center' }}>
          <BellRing size={56} style={{ color: cor.destaqueTexto, margin: '0 auto' }} />
          <h2 style={{ fontSize: 'clamp(34px,6vw,48px)', lineHeight: 1.08, margin: '14px 0 12px', fontWeight: 900 }}>Comece pelo próximo horário.</h2>
          <p style={{ fontSize: 21, color: cor.tintaMuted, lineHeight: 1.5, margin: '0 auto 24px', maxWidth: 680 }}>Você não precisa configurar tudo hoje. Crie o primeiro lembrete e deixe a MelhorIA provar o valor no uso real.</p>
          <a href={MELHORIA_PLAY_URL} target="_blank" rel="noopener noreferrer" onClick={() => playClick('final')} style={{ minHeight: 82, width: '100%', maxWidth: 620, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 12, background: cor.destaque, color: '#fff', borderRadius: 18, textDecoration: 'none', fontSize: 24, fontWeight: 900 }}>
            Baixar a MelhorIA grátis <ArrowRight size={28} />
          </a>
        </div>
      </section>

      <section style={{ maxWidth: 800, margin: '0 auto', padding: '44px 20px 0' }}>
        <div style={{ background: cor.perigoBg, border: `2px solid ${cor.perigo}`, borderRadius: raio.card, padding: espaco.lg, textAlign: 'center' }}>
          <h2 style={{ fontSize: 23, color: cor.perigoTexto, margin: '0 0 8px', fontWeight: 900 }}>O que a MelhorIA não faz</h2>
          <p style={{ fontSize: 18, color: cor.perigoTexto, lineHeight: 1.55, margin: 0 }}>Ela lembra, organiza e registra. Não indica dose, não substitui médico e o botão de ajuda não substitui serviços de emergência.</p>
        </div>
        <Rodape />
      </section>
    </main>
  );
}

function AudienceButton({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} style={{ minHeight: 58, borderRadius: 14, border: `2px solid ${ativo ? cor.destaque : cor.borda}`, background: ativo ? cor.destaqueSuave : '#fff', color: ativo ? cor.destaqueTexto : cor.tinta, fontSize: 17, fontWeight: 800, cursor: 'pointer', padding: '8px 10px' }}>{children}</button>;
}
function Benefit({ children }: { children: React.ReactNode }) {
  return <span style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 20, fontWeight: 700, lineHeight: 1.4 }}><Check size={26} color={cor.destaque} strokeWidth={3} style={{ flexShrink: 0, marginTop: 1 }} />{children}</span>;
}
function SectionTitle({ eyebrow, title, dark = false }: { eyebrow: string; title: string; dark?: boolean }) {
  return <div style={{ textAlign: 'center', maxWidth: 760, margin: '0 auto' }}><span style={{ color: dark ? '#5EEAD4' : cor.destaqueTexto, fontSize: 16, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.08em' }}>{eyebrow}</span><h2 style={{ fontSize: 'clamp(32px,5vw,46px)', lineHeight: 1.1, margin: '9px 0 0', fontWeight: 900, color: dark ? '#fff' : cor.tinta }}>{title}</h2></div>;
}
function PhoneMoment({ time, title, state, tone }: { time: string; title: string; state: string; tone: 'notice'|'ok'|'attention' }) {
  const palette = tone === 'ok' ? [cor.okBg, cor.okTexto] : tone === 'attention' ? [cor.atencaoBg, cor.atencaoTexto] : [cor.destaqueSuave, cor.destaqueTexto];
  return <article style={{ display: 'grid', gridTemplateColumns: '72px 1fr', gap: 14, alignItems: 'center', padding: 18, borderRadius: 18, background: '#fff', border: `2px solid ${cor.borda}`, boxShadow: '0 10px 24px rgba(15,23,42,.06)' }}><strong style={{ fontSize: 23, color: cor.tinta }}>{time}</strong><div><span style={{ display: 'inline-flex', borderRadius: 999, padding: '5px 9px', background: palette[0], color: palette[1], fontWeight: 900, fontSize: 16 }}>{title}</span><p style={{ margin: '7px 0 0', color: cor.tintaMuted, fontSize: 18, lineHeight: 1.45 }}>{state}</p></div></article>;
}
function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <article style={{ border: '1px solid #334155', background: '#111C2E', borderRadius: 18, padding: 20 }}><span style={{ width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#134E4A', color: '#5EEAD4' }}>{icon}</span><h3 style={{ fontSize: 22, margin: '14px 0 6px' }}>{title}</h3><p style={{ color: '#CBD5E1', fontSize: 18, lineHeight: 1.5, margin: 0 }}>{text}</p></article>;
}
function Step({ n, title, text }: { n: string; title: string; text: string }) {
  return <article style={{ display: 'grid', gridTemplateColumns: '48px 1fr 24px', gap: 12, alignItems: 'center', border: `2px solid ${cor.borda}`, borderRadius: 16, padding: 16, background: '#fff' }}><span style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 999, background: cor.destaque, color: '#fff', fontSize: 20, fontWeight: 900 }}>{n}</span><div><strong style={{ display: 'block', fontSize: 20 }}>{title}</strong><span style={{ display: 'block', marginTop: 4, fontSize: 17, color: cor.tintaMuted, lineHeight: 1.45 }}>{text}</span></div><ChevronRight size={23} color={cor.tintaMuted} /></article>;
}
