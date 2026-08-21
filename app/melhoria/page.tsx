'use client';

// app/melhoria/page.tsx — LANDING
// ─────────────────────────────────────────────────────────────────────────────
// melhoria.org agora abre numa landing, não na tela de login.
//
// Mesma estrutura das outras verticais: a raiz do domínio é a página pública
// (indexável, com o grafo de SEO do layout) e a ferramenta fica em /app.
// Antes, quem chegava pelo Google caía direto num formulário de login sem
// saber o que era o produto.
//
// ── PARA QUEM ESTA PÁGINA FALA ──────────────────────────────────────────────
// Para o FILHO, não para o idoso. Quem pesquisa "app para lembrar remédio do
// meu pai" é ele, e é ele que instala, configura e paga. O idoso recebe o
// telefone já pronto. Por isso o texto trata o leitor como quem cuida de
// alguém — e o botão principal diz "Começar agora", não "Entrar".
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  Pill, CalendarDays, ShieldCheck, Bell, Users, ShoppingCart,
  ArrowRight, Check,
} from 'lucide-react';
import { melhoriaAuth } from '@/lib/melhoria/supabase';
import { R } from '@/lib/melhoria/rotas';
import { Rodape } from '@/components/melhoria/Chrome';
import { cor, toque, raio, espaco } from '@/lib/melhoria/tema';

const RECURSOS = [
  {
    Icone: Bell,
    titulo: 'O lembrete funciona com o celular guardado',
    texto: 'O horário fica no nosso servidor, não no aparelho. O aviso chega mesmo com o aplicativo fechado — e se ninguém confirmar em 30 minutos, avisamos você.',
  },
  {
    Icone: Pill,
    titulo: 'Você vê se o remédio foi tomado',
    texto: 'Cada confirmação fica registrada e vira um relatório em PDF para levar ao médico. Também avisamos quando o remédio está acabando.',
  },
  {
    Icone: CalendarDays,
    titulo: 'Consultas e exames sem esquecimento',
    texto: 'Avisos em 7 dias, 1 dia, 3 horas e 1 hora. E o alerta de jejum chega na hora exata de parar de comer, não na véspera.',
  },
  {
    Icone: ShieldCheck,
    titulo: 'Confere boleto e link de graça',
    texto: 'Digite os números do boleto e conferimos banco, vencimento, valor e os dígitos de segurança. Sem custo e sem limite.',
  },
  {
    Icone: Users,
    titulo: 'A família acompanha de longe',
    texto: 'Você recebe aviso se uma dose não for confirmada, e vê tudo pelo seu próprio celular.',
  },
  {
    Icone: ShoppingCart,
    titulo: 'Lista de compras que se preenche sozinha',
    texto: 'Quando o remédio está acabando, ele entra na lista com um toque.',
  },
];

const GRATIS = [
  'Cadastrar remédios, consultas e exames',
  'Receber todos os lembretes, sempre',
  'Confirmar as doses e ver o histórico',
  'Relatório em PDF para o médico',
  'Conferir boleto pelos números',
  'Lista de compras',
];

export default function LandingMelhorIA() {
  const router = useRouter();
  const [verificando, setVerificando] = useState(true);

  // Quem já entrou não deveria reler a propaganda toda vez.
  useEffect(() => {
    (async () => {
      const { data } = await melhoriaAuth().auth.getUser();
      if (data?.user) { router.replace(R.app()); return; }
      setVerificando(false);
    })();
  }, [router]);

  return (
    <main className="mel-centro" style={{
      background: cor.fundo, minHeight: '100dvh', maxWidth: 720,
      margin: '0 auto', padding: `${espaco.lg}px ${espaco.md}px 0`,
      color: cor.tinta, textAlign: 'center',
    }}>
      {/* ── Topo ── */}
      <header style={{
        display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center',
        gap: espaco.sm, marginBottom: espaco.xl,
      }}>
        <span style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
          gap: espaco.xs, minWidth: 0,
        }}>
          <Image src="/brands/melhoria/logo.png" alt="" width={48} height={48}
                 style={{ borderRadius: 12, display: 'block', flexShrink: 0 }} priority />
          <span className="mel-marca" style={{
            fontSize: 24, fontWeight: 800, color: cor.tinta, whiteSpace: 'nowrap',
          }}>
            MelhorIA
          </span>
        </span>

        <Link
          href={R.login()}
          style={{
            minHeight: toque.min,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            padding: `0 ${espaco.md}px`, borderRadius: raio.botao,
            border: `2px solid ${cor.borda}`, color: cor.destaqueTexto,
            fontSize: 19, fontWeight: 700, textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          Entrar
        </Link>
      </header>

      {/* ── Chamada ── */}
      <section style={{ marginBottom: espaco.xl }}>
        <h1 style={{
          fontSize: 40, fontWeight: 800, color: cor.tinta,
          margin: `0 0 ${espaco.md}px`, lineHeight: 1.15,
        }}>
          Seu pai esqueceu o remédio de novo?
        </h1>

        <p style={{
          fontSize: 23, color: cor.tintaMuted, lineHeight: 1.5,
          margin: `0 0 ${espaco.lg}px`,
        }}>
          A <strong style={{ color: cor.tinta }}>MelhorIA</strong> avisa na hora
          certa, registra o que foi tomado e chama você quando algo falha.
          Feito para quem já não tem paciência com aplicativo complicado.
        </p>

        <button
          type="button"
          onClick={() => router.push(R.login())}
          disabled={verificando}
          style={{
            minHeight: toque.critico, width: '100%',
            borderRadius: raio.botao, border: 'none',
            background: cor.destaque, color: '#FFFFFF',
            fontSize: 26, fontWeight: 800, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: espaco.xs,
          }}
        >
          Começar agora
          <ArrowRight size={32} aria-hidden="true" />
        </button>

        <p style={{
          fontSize: 19, color: cor.tintaMuted, textAlign: 'center',
          margin: `${espaco.sm}px 0 0`, lineHeight: 1.4,
        }}>
          Grátis. Não pedimos cartão e não existe período de teste — o que é
          grátis é grátis para sempre.
        </p>
      </section>

      {/* ── Grátis ── */}
      <section style={{
        background: cor.okBg, border: '2px solid #16A34A',
        borderRadius: raio.card, padding: espaco.lg, marginBottom: espaco.xl,
      }}>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: cor.okTexto, margin: `0 0 ${espaco.md}px` }}>
          O que é grátis para sempre
        </h2>

        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {GRATIS.map((t) => (
            <li key={t} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: espaco.xs, fontSize: 20, color: cor.okTexto,
              lineHeight: 1.5, marginBottom: 10, textAlign: 'center',
            }}>
              <Check size={26} strokeWidth={3} aria-hidden="true" style={{ flexShrink: 0 }} />
              {t}
            </li>
          ))}
        </ul>

        <p style={{
          fontSize: 19, color: cor.okTexto, lineHeight: 1.5,
          margin: `${espaco.md}px 0 0`,
        }}>
          Nunca cobramos para lembrar alguém de tomar remédio, e nada disso
          acaba depois de um tempo. Créditos existem só para quatro coisas:
          ler receita pela câmera, analisar foto de boleto, conversar com a
          inteligência artificial e enviar mensagem de celular. Você ganha
          alguns ao criar a conta.
        </p>
      </section>

      {/* ── Recursos ── */}
      <section style={{ marginBottom: espaco.xl }}>
        <h2 style={{ fontSize: 30, fontWeight: 800, color: cor.tinta, margin: `0 0 ${espaco.lg}px` }}>
          Como funciona
        </h2>

        {RECURSOS.map(({ Icone, titulo, texto }) => (
          <article key={titulo} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: espaco.sm, marginBottom: espaco.lg,
          }}>
            <span aria-hidden="true" style={{
              flexShrink: 0, width: 60, height: 60, borderRadius: 15,
              background: cor.destaqueSuave, color: cor.destaqueTexto,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icone size={32} />
            </span>
            <div>
              <h3 style={{ fontSize: 22, fontWeight: 700, color: cor.tinta, margin: 0, lineHeight: 1.3 }}>
                {titulo}
              </h3>
              <p style={{ fontSize: 19, color: cor.tintaMuted, margin: '6px 0 0', lineHeight: 1.5 }}>
                {texto}
              </p>
            </div>
          </article>
        ))}
      </section>

      {/* ── Acessibilidade ── */}
      <section style={{
        background: cor.fundoCard, border: `2px solid ${cor.borda}`,
        borderRadius: raio.card, padding: espaco.lg, marginBottom: espaco.xl,
      }}>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: cor.tinta, margin: `0 0 ${espaco.sm}px` }}>
          Feito para ser usado, não decifrado
        </h2>
        <p style={{ fontSize: 20, color: cor.tintaMuted, lineHeight: 1.55, margin: 0 }}>
          Letra grande de verdade, com três tamanhos. Botões que o dedo acerta.
          Uma coisa por tela, sem menu escondido. E microfone para ditar em vez
          de digitar — o texto aparece na tela para conferir antes de salvar.
        </p>
      </section>

      {/* ── Limites, ditos antes de a pessoa entrar ── */}
      <section style={{
        background: cor.perigoBg, border: `2px solid ${cor.perigo}`,
        borderRadius: raio.card, padding: espaco.lg, marginBottom: espaco.xl,
      }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: cor.perigoTexto, margin: `0 0 ${espaco.sm}px` }}>
          O que a MelhorIA não faz
        </h2>
        <p style={{ fontSize: 19, color: cor.perigoTexto, lineHeight: 1.55, margin: 0 }}>
          Ela lembra, organiza e registra. Não indica dose, não diz para que
          serve um remédio e não interpreta exame — isso é com o médico. E o
          botão de ajuda avisa os contatos cadastrados; ele não aciona SAMU
          (192) nem Polícia (190).
        </p>
      </section>

      <button
        type="button"
        onClick={() => router.push(R.login())}
        style={{
          minHeight: toque.critico, width: '100%',
          borderRadius: raio.botao, border: 'none',
          background: cor.destaque, color: '#FFFFFF',
          fontSize: 26, fontWeight: 800, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: espaco.xs,
        }}
      >
        Criar minha conta grátis
        <ArrowRight size={32} aria-hidden="true" />
      </button>

      <Rodape />
    </main>
  );
}
