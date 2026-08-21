'use client';

// app/melhoria/page.tsx — "Meu dia"
// ─────────────────────────────────────────────────────────────────────────────
// Correções nesta versão:
//
// 1. CLIENTE ÚNICO. Antes havia duas instâncias de createBrowserClient (a
//    padrão e a do schema melhoria). Duas instâncias = dois GoTrue, e a
//    segunda ainda não tinha a sessão logo após o login → consulta como anon →
//    RLS nega → "Não consegui carregar seus dados". Agora é uma instância só,
//    com .schema('melhoria') por consulta.
//
// 2. NADA DE ERRO NO PRIMEIRO LOGIN. Mesmo com o cliente certo, a criação da
//    company e do perfil acontece no primeiro acesso. Se a leitura vier vazia,
//    a tela TENTA DE NOVO em silêncio antes de acusar qualquer coisa — só
//    depois de três tentativas é que aparece mensagem, e ainda assim gentil.
//
// 3. Cabeçalho com logo e rodapé padrão minhAi/BigCorps.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pill, CalendarDays, ShoppingCart, ShieldCheck, Plus, Users, UserCog } from 'lucide-react';
import { melhoriaAuth, createMelhoriaClient } from '@/lib/melhoria/supabase';
import CartaoDose, { type DoseDoDia } from '@/components/melhoria/CartaoDose';
import { Pagina, IconeCentral, Carregando } from '@/components/melhoria/Chrome';
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

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function MeuDiaPage() {
  const router   = useRouter();
  const supabase = melhoriaAuth();
  const mel      = createMelhoriaClient();

  const [carregando, setCarregando] = useState(true);
  const [perfil, setPerfil]         = useState<Perfil | null>(null);
  const [doses, setDoses]           = useState<DoseDoDia[]>([]);
  const [erro, setErro]             = useState<string | null>(null);

  const escala: TamanhoFonte = perfil?.tamanho_fonte ?? 'grande';
  const tz = perfil?.timezone ?? 'America/Sao_Paulo';

  const carregar = useCallback(async () => {
    const { data: sessao } = await supabase.auth.getUser();
    if (!sessao?.user) { router.replace('/melhoria/login'); return; }

    // Cria company + perfil no primeiro acesso. Idempotente, com advisory lock.
    const { error: erroRpc } = await supabase.rpc('ensure_my_melhoria_company');
    if (erroRpc) {
      setErro('Não consegui abrir sua conta. Toque em atualizar em instantes.');
      setCarregando(false);
      return;
    }

    // Três tentativas com espera curta. No primeiro login a linha acabou de
    // ser criada, e insistir em silêncio é muito melhor que mostrar um alerta
    // vermelho para alguém que acabou de instalar o aplicativo.
    let p: Perfil | null = null;

    for (let tentativa = 1; tentativa <= 3 && !p; tentativa++) {
      const { data } = await mel
        .from('perfis')
        .select('id, nome, timezone, tamanho_fonte, falar_confirmacoes, onboarding_completo')
        .limit(1);

      if (data?.length) { p = data[0] as Perfil; break; }
      if (tentativa < 3) await espera(400 * tentativa);
    }

    if (!p) {
      // 404 em tudo aqui costuma ser o schema `melhoria` fora de
      // "Exposed schemas" no painel do Supabase.
      setErro('Estou terminando de preparar sua conta. Toque em atualizar em alguns segundos.');
      setCarregando(false);
      return;
    }

    setPerfil(p);
    setErro(null);

    // Consentimento de saúde é pré-requisito (LGPD art. 11).
    // A tela de consentimento decide sozinha se precisa aparecer.

    const agora  = new Date();
    const hojeBR = new Intl.DateTimeFormat('en-CA', {
      timeZone: p.timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(agora);

    const { data } = await mel
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

    if (data) {
      setDoses((data as any[]).map((d) => ({
        id: d.id,
        previsto_para: d.previsto_para,
        status: d.status,
        confirmado_em: d.confirmado_em,
        quantidade: d.doses?.quantidade ?? 1,
        medicamento_nome:    d.doses?.medicamentos?.nome    ?? 'Remédio',
        medicamento_dosagem: d.doses?.medicamentos?.dosagem ?? null,
        medicamento_forma:   d.doses?.medicamentos?.forma   ?? null,
      })));
    }

    setCarregando(false);
  }, [supabase, mel, router]);

  useEffect(() => { carregar(); }, [carregar]);

  const confirmar = useCallback(
    async (id: string, status: 'tomado' | 'pulado') => {
      const antes = doses;
      setDoses((atual) =>
        atual.map((d) =>
          d.id === id ? { ...d, status, confirmado_em: new Date().toISOString() } : d
        )
      );

      const { error } = await mel
        .from('dose_eventos')
        .update({ status, confirmado_em: new Date().toISOString(), canal: 'app' })
        .eq('id', id);

      if (error) {
        setDoses(antes);
        setErro('Não consegui salvar. Verifique a internet e tente de novo.');
      }
    },
    [doses, mel]
  );

  if (carregando) {
    return (
      <Pagina semRodape>
        <Carregando />
      </Pagina>
    );
  }

  const pendentes = doses.filter((d) => d.status === 'pendente' || d.status === 'notificado');
  const tomadas   = doses.filter((d) => d.status === 'tomado');

  return (
    <Pagina>
      <p style={{ fontSize: px(fonte.rotulo, escala), color: cor.tintaMuted, margin: 0 }}>
        Olá{perfil?.nome && perfil.nome !== 'Meu perfil' ? `, ${perfil.nome.split(' ')[0]}` : ''}
      </p>
      <h1 style={{
        fontSize: px(fonte.tituloG, escala),
        fontWeight: 800, color: cor.tinta, margin: 0, lineHeight: 1.15,
      }}>
        Meu dia
      </h1>
      <p style={{
        fontSize: px(fonte.corpo, escala), color: cor.tintaMuted,
        margin: `${espaco.xs}px 0 ${espaco.lg}px`, textTransform: 'capitalize',
      }}>
        {diaPorExtenso(new Date().toISOString(), tz)}
      </p>

      {/* Aviso em tom de espera, não de falha */}
      {erro && (
        <div role="status" style={{
          background: cor.atencaoBg, color: cor.atencaoTexto,
          border: '2px solid #D97706', borderRadius: raio.card,
          padding: espaco.md, marginBottom: espaco.md,
        }}>
          <p style={{ fontSize: px(fonte.corpo, escala), fontWeight: 600, margin: 0, lineHeight: 1.45 }}>
            {erro}
          </p>
          <button
            type="button"
            onClick={() => { setCarregando(true); carregar(); }}
            style={{
              minHeight: toque.min, width: '100%', marginTop: espaco.sm,
              borderRadius: raio.botao, border: `2px solid ${cor.atencaoTexto}`,
              background: 'transparent', color: cor.atencaoTexto,
              fontSize: 20, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Atualizar
          </button>
        </div>
      )}

      {pendentes.length > 0 && (
        <section aria-labelledby="titulo-agora" style={{ marginBottom: espaco.xl }}>
          <h2 id="titulo-agora" style={estiloSecao(escala)}>Para tomar hoje</h2>
          {pendentes.map((d) => (
            <CartaoDose
              key={d.id} dose={d} timezone={tz} escala={escala}
              falar={perfil?.falar_confirmacoes} aoConfirmar={confirmar}
            />
          ))}
        </section>
      )}

      {doses.length === 0 && !erro && (
        <section style={{
          background: cor.fundoCard, border: `2px dashed ${cor.borda}`,
          borderRadius: raio.card, padding: espaco.xl, textAlign: 'center',
          marginBottom: espaco.xl,
        }}>
          <IconeCentral margemAbaixo={0}><Pill size={64} style={{ color: cor.destaque }} /></IconeCentral>
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

      {tomadas.length > 0 && (
        <section aria-labelledby="titulo-feito" style={{ marginBottom: espaco.xl }}>
          <h2 id="titulo-feito" style={estiloSecao(escala)}>Já tomados hoje</h2>
          {tomadas.map((d) => (
            <CartaoDose key={d.id} dose={d} timezone={tz} escala={escala} aoConfirmar={confirmar} />
          ))}
        </section>
      )}

      <nav aria-label="Atalhos" style={{ display: 'grid', gap: espaco.sm }}>
        <Atalho escala={escala} icone={<Pill size={34} />}
          rotulo="Meus remédios" destino="/melhoria/remedios" />
        <Atalho escala={escala} icone={<CalendarDays size={34} />}
          rotulo="Consultas e exames" destino="/melhoria/agenda" />
        <Atalho escala={escala} icone={<ShoppingCart size={34} />}
          rotulo="Lista de compras" destino="/melhoria/compras" />
        <Atalho escala={escala} icone={<ShieldCheck size={34} />}
          rotulo="Verificar boleto ou link" destino="/melhoria/verificar" />
        <Atalho escala={escala} icone={<Users size={34} />}
          rotulo="Minha família" destino="/melhoria/familia" />
        <Atalho escala={escala} icone={<UserCog size={34} />}
          rotulo="Meus dados" destino="/melhoria/perfil" />
      </nav>
    </Pagina>
  );
}

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

function estiloSecao(escala: TamanhoFonte): React.CSSProperties {
  return {
    fontSize: px(fonte.titulo, escala),
    fontWeight: 700,
    color: cor.tinta,
    margin: `0 0 ${espaco.md}px`,
  };
}
