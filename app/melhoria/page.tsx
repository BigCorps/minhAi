'use client';

// app/melhoria/page.tsx — "Meu dia"
// ─────────────────────────────────────────────────────────────────────────────
// A tela que a pessoa abre. Uma coisa só: o que tomar hoje.
//
// Sem abas, sem menu hambúrguer, sem gesto de swipe, sem carrossel. Tudo o que
// existe está visível ou a um toque de distância, em botão grande e com texto.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Pill, CalendarDays, ShoppingCart, ShieldCheck, Plus, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { createMelhoriaClient } from '@/lib/melhoria/supabase';
import CartaoDose, { type DoseDoDia } from '@/components/melhoria/CartaoDose';
import {
  cor, fonte, px, toque, raio, espaco, diaPorExtenso,
  type TamanhoFonte,
} from '@/lib/melhoria/tema';

interface Perfil {
  id: string;
  nome: string;
  timezone: string;
  tamanho_fonte: TamanhoFonte;
  falar_confirmacoes: boolean;
  onboarding_completo: boolean;
}

export default function MeuDiaPage() {
  const router   = useRouter();
  const supabase = createClient();
  const mel      = createMelhoriaClient();

  const [carregando, setCarregando] = useState(true);
  const [perfil, setPerfil]         = useState<Perfil | null>(null);
  const [doses, setDoses]           = useState<DoseDoDia[]>([]);
  const [erro, setErro]             = useState<string | null>(null);

  const escala: TamanhoFonte = perfil?.tamanho_fonte ?? 'grande';
  const tz = perfil?.timezone ?? 'America/Sao_Paulo';

  // ── Carrega perfil e doses do dia ──────────────────────────────────────────
  const carregar = useCallback(async () => {
    const { data: sessao } = await supabase.auth.getUser();
    if (!sessao?.user) { router.replace('/melhoria/login'); return; }

    // Cria company + perfil no primeiro acesso. Idempotente, com advisory lock.
    const { error: erroRpc } = await supabase.rpc('ensure_my_melhoria_company');
    if (erroRpc) {
      setErro('Não consegui abrir sua conta. Tente de novo em instantes.');
      setCarregando(false);
      return;
    }

    const { data: perfis, error: erroPerfil } = await mel
      .from('perfis')
      .select('id, nome, timezone, tamanho_fonte, falar_confirmacoes, onboarding_completo')
      .limit(1);

    if (erroPerfil || !perfis?.length) {
      // 404 aqui quase sempre = schema `melhoria` fora de "Exposed schemas".
      setErro('Não consegui carregar seus dados. Tente de novo em instantes.');
      setCarregando(false);
      return;
    }

    const p = perfis[0] as Perfil;
    setPerfil(p);

    // Janela do dia no fuso do perfil: de 00h de hoje até 00h de amanhã.
    const agora  = new Date();
    const hojeBR = new Intl.DateTimeFormat('en-CA', {
      timeZone: p.timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(agora);

    const { data, error } = await mel
      .from('dose_eventos')
      .select(`
        id, previsto_para, status, confirmado_em,
        doses!inner (
          quantidade,
          medicamentos!inner ( nome, dosagem, forma )
        )
      `)
      .gte('previsto_para', `${hojeBR}T00:00:00`)
      .lt('previsto_para',  `${hojeBR}T23:59:59`)
      .order('previsto_para', { ascending: true });

    if (!error && data) {
      setDoses(
        (data as any[]).map((d) => ({
          id: d.id,
          previsto_para: d.previsto_para,
          status: d.status,
          confirmado_em: d.confirmado_em,
          quantidade: d.doses?.quantidade ?? 1,
          medicamento_nome:    d.doses?.medicamentos?.nome    ?? 'Remédio',
          medicamento_dosagem: d.doses?.medicamentos?.dosagem ?? null,
          medicamento_forma:   d.doses?.medicamentos?.forma   ?? null,
        }))
      );
    }

    setCarregando(false);
  }, [supabase, mel, router]);

  useEffect(() => { carregar(); }, [carregar]);

  // ── Confirmar dose ─────────────────────────────────────────────────────────
  const confirmar = useCallback(
    async (id: string, status: 'tomado' | 'pulado') => {
      // Otimista: o cartão responde na hora. Numa rede ruim de interior,
      // esperar o servidor faz a pessoa tocar de novo achando que não pegou.
      const antes = doses;
      setDoses((atual) =>
        atual.map((d) =>
          d.id === id
            ? { ...d, status, confirmado_em: new Date().toISOString() }
            : d
        )
      );

      const { error } = await mel
        .from('dose_eventos')
        .update({
          status,
          confirmado_em: new Date().toISOString(),
          canal: 'app',
        })
        .eq('id', id);

      if (error) {
        setDoses(antes);
        setErro('Não consegui salvar. Verifique a internet e tente de novo.');
      }
    },
    [doses, mel]
  );

  // ── Estados de tela ────────────────────────────────────────────────────────
  if (carregando) {
    return (
      <main style={estiloPagina}>
        <div style={{ textAlign: 'center', paddingTop: 80 }}>
          <Loader2 size={56} className="animate-spin" style={{ color: cor.destaque }} />
          <p style={{ fontSize: px(fonte.corpo, 'grande'), color: cor.tintaMuted, marginTop: espaco.md }}>
            Carregando...
          </p>
        </div>
      </main>
    );
  }

  const pendentes = doses.filter((d) => d.status === 'pendente' || d.status === 'notificado');
  const tomadas   = doses.filter((d) => d.status === 'tomado');

  return (
    <main style={estiloPagina}>
      {/* Cabeçalho */}
      <header style={{ marginBottom: espaco.lg }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: espaco.sm }}>
          <Image
            src="/brands/melhoria/logo.png"
            alt=""
            width={56}
            height={56}
            style={{ borderRadius: 12 }}
          />
          <div>
            <p style={{ fontSize: px(fonte.rotulo, escala), color: cor.tintaMuted, margin: 0 }}>
              Olá, {perfil?.nome?.split(' ')[0] ?? 'tudo bem'}
            </p>
            <h1 style={{
              fontSize: px(fonte.tituloG, escala),
              fontWeight: 800, color: cor.tinta, margin: 0, lineHeight: 1.15,
            }}>
              Meu dia
            </h1>
          </div>
        </div>
        <p style={{
          fontSize: px(fonte.corpo, escala),
          color: cor.tintaMuted,
          margin: `${espaco.xs}px 0 0`,
          textTransform: 'capitalize',
        }}>
          {diaPorExtenso(new Date().toISOString(), tz)}
        </p>
      </header>

      {erro && (
        <p role="alert" style={{
          background: cor.perigoBg, color: cor.perigoTexto,
          border: `2px solid ${cor.perigo}`, borderRadius: raio.card,
          padding: espaco.md, fontSize: px(fonte.corpo, escala), fontWeight: 600,
          marginBottom: espaco.md, lineHeight: 1.4,
        }}>
          {erro}
        </p>
      )}

      {/* Doses pendentes */}
      {pendentes.length > 0 && (
        <section aria-labelledby="titulo-agora" style={{ marginBottom: espaco.xl }}>
          <h2 id="titulo-agora" style={estiloSecao(escala)}>Para tomar hoje</h2>
          {pendentes.map((d) => (
            <CartaoDose
              key={d.id}
              dose={d}
              timezone={tz}
              escala={escala}
              falar={perfil?.falar_confirmacoes}
              aoConfirmar={confirmar}
            />
          ))}
        </section>
      )}

      {/* Vazio */}
      {doses.length === 0 && (
        <section style={{
          background: cor.fundoCard, border: `2px dashed ${cor.borda}`,
          borderRadius: raio.card, padding: espaco.xl, textAlign: 'center',
          marginBottom: espaco.xl,
        }}>
          <Pill size={64} style={{ color: cor.destaque }} aria-hidden="true" />
          <p style={{
            fontSize: px(fonte.titulo, escala), fontWeight: 700,
            color: cor.tinta, margin: `${espaco.md}px 0 ${espaco.xs}px`,
          }}>
            Nenhum remédio cadastrado
          </p>
          <p style={{
            fontSize: px(fonte.corpo, escala), color: cor.tintaMuted,
            margin: `0 0 ${espaco.lg}px`, lineHeight: 1.4,
          }}>
            Cadastre um remédio e eu aviso na hora certa, mesmo com o
            aplicativo fechado.
          </p>
          <button
            type="button"
            onClick={() => router.push('/melhoria/remedios/novo')}
            style={{
              minHeight: toque.critico, width: '100%',
              borderRadius: raio.botao, border: 'none',
              background: cor.destaque, color: '#FFFFFF',
              fontSize: px(fonte.titulo, escala), fontWeight: 800,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: espaco.xs,
            }}
          >
            <Plus size={36} strokeWidth={3} aria-hidden="true" />
            Cadastrar remédio
          </button>
        </section>
      )}

      {/* Já tomadas */}
      {tomadas.length > 0 && (
        <section aria-labelledby="titulo-feito" style={{ marginBottom: espaco.xl }}>
          <h2 id="titulo-feito" style={estiloSecao(escala)}>Já tomados hoje</h2>
          {tomadas.map((d) => (
            <CartaoDose
              key={d.id}
              dose={d}
              timezone={tz}
              escala={escala}
              aoConfirmar={confirmar}
            />
          ))}
        </section>
      )}

      {/* Atalhos — texto sempre, nunca só ícone */}
      <nav aria-label="Atalhos" style={{ display: 'grid', gap: espaco.sm }}>
        <Atalho escala={escala} icone={<Pill size={34} />}
          rotulo="Meus remédios" destino="/melhoria/remedios" />
        <Atalho escala={escala} icone={<CalendarDays size={34} />}
          rotulo="Consultas e exames" destino="/melhoria/agenda" />
        <Atalho escala={escala} icone={<ShoppingCart size={34} />}
          rotulo="Lista de compras" destino="/melhoria/compras" />
        <Atalho escala={escala} icone={<ShieldCheck size={34} />}
          rotulo="Verificar boleto ou link" destino="/melhoria/verificar" />
      </nav>

      <p style={{
        fontSize: px(fonte.rotulo, escala),
        color: cor.tintaFraca,
        textAlign: 'center',
        margin: `${espaco.xl}px 0 ${espaco.lg}px`,
        lineHeight: 1.5,
      }}>
        A MelhorIA lembra, organiza e registra.
        <br />
        Ela não substitui seu médico.
      </p>
    </main>
  );
}

// ── Peças ────────────────────────────────────────────────────────────────────

function Atalho({
  icone, rotulo, destino, escala,
}: {
  icone: React.ReactNode; rotulo: string; destino: string; escala: TamanhoFonte;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.push(destino)}
      style={{
        minHeight: toque.confortavel,
        display: 'flex', alignItems: 'center', gap: espaco.md,
        padding: `${espaco.sm}px ${espaco.md}px`,
        borderRadius: raio.botao,
        border: `2px solid ${cor.borda}`,
        background: cor.fundo,
        color: cor.tinta,
        fontSize: px(fonte.corpo, escala),
        fontWeight: 700,
        textAlign: 'left',
        cursor: 'pointer',
        width: '100%',
      }}
    >
      <span style={{ color: cor.destaque, display: 'flex' }} aria-hidden="true">{icone}</span>
      {rotulo}
    </button>
  );
}

const estiloPagina: React.CSSProperties = {
  background: cor.fundo,
  minHeight: '100dvh',
  maxWidth: 640,
  margin: '0 auto',
  padding: `${espaco.lg}px ${espaco.md}px ${espaco.xl}px`,
  color: cor.tinta,
  fontSize: 20,
};

function estiloSecao(escala: TamanhoFonte): React.CSSProperties {
  return {
    fontSize: px(fonte.titulo, escala),
    fontWeight: 700,
    color: cor.tinta,
    margin: `0 0 ${espaco.md}px`,
  };
}
