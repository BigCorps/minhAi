'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Pill, CalendarDays, ShoppingCart, ShieldCheck, Plus, Users, UserCog, Sparkles,
} from 'lucide-react';
import { melhoriaAuth, createMelhoriaClient } from '@/lib/melhoria/supabase';
import CartaoDose, { type DoseDoDia } from '@/components/melhoria/CartaoDose';
import { Pagina, IconeCentral, Carregando } from '@/components/melhoria/Chrome';
import PushNotificationSetup from '@/components/melhoria/PushNotificationSetup';
import PrimeirosSeteDias from '@/components/melhoria/PrimeirosSeteDias';
import { R } from '@/lib/melhoria/rotas';
import { melhoriaAnalyticsOnce } from '@/lib/melhoria/analytics';
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
  consentiu_saude_em: string | null;
  created_at: string;
  lembrete_diario_ativo?: boolean;
  lembrete_diario_horario?: string | null;
}

type Progresso = {
  temMedicamento: boolean;
  temContato: boolean;
  temAgendamento: boolean;
};

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

function dataNoFuso(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(iso));
}

export default function MeuDiaPage() {
  const router = useRouter();
  const supabase = melhoriaAuth();
  const mel = createMelhoriaClient();

  const [carregando, setCarregando] = useState(true);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [doses, setDoses] = useState<DoseDoDia[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [notificacoesAtivas, setNotificacoesAtivas] = useState(false);
  const [progresso, setProgresso] = useState<Progresso>({
    temMedicamento: false,
    temContato: false,
    temAgendamento: false,
  });

  const escala: TamanhoFonte = perfil?.tamanho_fonte ?? 'grande';
  const tz = perfil?.timezone ?? 'America/Sao_Paulo';

  const carregar = useCallback(async () => {
    const { data: sessao } = await supabase.auth.getUser();
    if (!sessao?.user) {
      const jaEntrou = typeof window !== 'undefined' && localStorage.getItem('melhoria:ja-entrou') === '1';
      router.replace(jaEntrou ? R.login() : `${R.login()}?mode=cadastro`);
      return;
    }
    setUserId(sessao.user.id);
    try { localStorage.setItem('melhoria:ja-entrou', '1'); } catch {}

    const { error: erroRpc } = await supabase.rpc('ensure_my_melhoria_company');
    if (erroRpc) {
      setErro('Não consegui abrir sua conta. Toque em atualizar em instantes.');
      setCarregando(false);
      return;
    }

    let p: Perfil | null = null;
    for (let tentativa = 1; tentativa <= 3 && !p; tentativa++) {
      const { data } = await mel
        .from('perfis')
        .select('id, nome, timezone, tamanho_fonte, falar_confirmacoes, onboarding_completo, consentiu_saude_em, created_at, lembrete_diario_ativo, lembrete_diario_horario')
        .limit(1);
      if (data?.length) { p = data[0] as Perfil; break; }
      if (tentativa < 3) await espera(400 * tentativa);
    }

    if (!p) {
      setErro('Estou terminando de preparar sua conta. Toque em atualizar em alguns segundos.');
      setCarregando(false);
      return;
    }

    if (!p.consentiu_saude_em) {
      router.replace(R.consentimento());
      return;
    }

    setPerfil(p);
    setErro(null);

    const [{ data: meds }, { data: contatos }, { data: agenda }] = await Promise.all([
      mel.from('medicamentos').select('id').eq('perfil_id', p.id).eq('ativo', true).limit(1),
      mel.from('contatos_emergencia').select('id').eq('perfil_id', p.id).limit(1),
      mel.from('agendamentos').select('id').eq('perfil_id', p.id).limit(1),
    ]);

    const novoProgresso = {
      temMedicamento: Boolean(meds?.length),
      temContato: Boolean(contatos?.length),
      temAgendamento: Boolean(agenda?.length),
    };
    setProgresso(novoProgresso);

    if (typeof Notification !== 'undefined') {
      setNotificacoesAtivas(Notification.permission === 'granted');
    }

    const agora = new Date();
    const hojeLocal = dataNoFuso(agora.toISOString(), p.timezone);
    const de = new Date(agora.getTime() - 36 * 60 * 60_000).toISOString();
    const ate = new Date(agora.getTime() + 36 * 60 * 60_000).toISOString();

    const { data, error: erroDoses } = await mel
      .from('dose_eventos')
      .select(`
        id, previsto_para, status, confirmado_em,
        doses!inner (
          quantidade,
          medicamentos!inner ( nome, dosagem, forma )
        )
      `)
      .gte('previsto_para', de)
      .lt('previsto_para', ate)
      .order('previsto_para', { ascending: true });

    if (erroDoses) {
      setErro('Não consegui atualizar os remédios de hoje. Toque em atualizar.');
      setCarregando(false);
      return;
    }

    const doDia = (data ?? []).filter((d: any) =>
      dataNoFuso(d.previsto_para, p!.timezone) === hojeLocal
    );

    setDoses(doDia.map((d: any) => ({
      id: d.id,
      previsto_para: d.previsto_para,
      status: d.status,
      confirmado_em: d.confirmado_em,
      quantidade: d.doses?.quantidade ?? 1,
      medicamento_nome: d.doses?.medicamentos?.nome ?? 'Remédio',
      medicamento_dosagem: d.doses?.medicamentos?.dosagem ?? null,
      medicamento_forma: d.doses?.medicamentos?.forma ?? null,
    })));

    if (novoProgresso.temMedicamento) {
      melhoriaAnalyticsOnce('first-reminder-created', 'first_reminder_created');
    }

    setCarregando(false);
  }, [supabase, mel, router]);

  useEffect(() => { carregar(); }, [carregar]);

  const confirmar = useCallback(
    async (id: string, status: 'tomado' | 'pulado') => {
      const antes = doses;
      const confirmadoEm = new Date().toISOString();

      setDoses((atual) =>
        atual.map((d) => d.id === id ? { ...d, status, confirmado_em: confirmadoEm } : d)
      );

      const { error } = await mel
        .from('dose_eventos')
        .update({ status, confirmado_em: confirmadoEm, canal: 'app' })
        .eq('id', id);

      if (error) {
        setDoses(antes);
        setErro('Não consegui salvar. Verifique a internet e tente de novo.');
      } else if (status === 'tomado') {
        melhoriaAnalyticsOnce('first-dose-confirmed', 'first_dose_confirmed');
      }
    },
    [doses, mel]
  );

  if (carregando) return <Pagina semRodape><Carregando /></Pagina>;

  const pendentes = doses.filter((d) => d.status === 'pendente' || d.status === 'notificado');
  const tomadas = doses.filter((d) => d.status === 'tomado');

  return (
    <Pagina>
      {userId && (
        <PushNotificationSetup
          userId={userId}
          perfilId={perfil?.id}
          mostrarConvite={progresso.temMedicamento}
          onPermissionChange={setNotificacoesAtivas}
        />
      )}

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

      {erro && (
        <div role="status" style={{
          background: cor.atencaoBg, color: cor.atencaoTexto,
          border: '2px solid #D97706', borderRadius: raio.card,
          padding: espaco.md, marginBottom: espaco.md,
        }}>
          <p style={{ fontSize: px(fonte.corpo, escala), fontWeight: 600, margin: 0, lineHeight: 1.45 }}>{erro}</p>
          <button
            type="button" onClick={() => { setCarregando(true); carregar(); }}
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

      {!progresso.temMedicamento && !erro && (
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
            Vamos fazer seu primeiro lembrete funcionar
          </p>
          <p style={{
            fontSize: px(fonte.corpo, escala), color: cor.tintaMuted,
            margin: `0 0 ${espaco.lg}px`, lineHeight: 1.4,
          }}>
            Para começar, precisamos apenas do nome do remédio e do horário. O resto você completa depois, se quiser.
          </p>
          <button
            type="button"
            onClick={() => router.push(`${R.remedioNovo()}?primeiro=1`)}
            style={{
              minHeight: toque.critico, width: '100%',
              borderRadius: raio.botao, border: 'none',
              background: cor.destaque, color: '#FFFFFF',
              fontSize: px(fonte.titulo, escala), fontWeight: 800,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: espaco.xs,
            }}
          >
            <Plus size={36} strokeWidth={3} aria-hidden="true" />
            Criar meu primeiro lembrete
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

      {perfil && (
        <PrimeirosSeteDias
          perfilId={perfil.id}
          criadoEm={perfil.created_at}
          temMedicamento={progresso.temMedicamento}
          temContato={progresso.temContato}
          temAgendamento={progresso.temAgendamento}
          notificacoesAtivas={notificacoesAtivas}
          lembreteDiarioAtivo={Boolean(perfil.lembrete_diario_ativo)}
          lembreteDiarioHorario={perfil.lembrete_diario_horario || '09:00'}
          aoSalvarLembrete={(ativo, horario) => setPerfil((atual) => atual ? {
            ...atual,
            lembrete_diario_ativo: ativo,
            lembrete_diario_horario: horario,
          } : atual)}
        />
      )}

      <nav aria-label="Atalhos" style={{ display: 'grid', gap: espaco.sm }}>
        <Atalho escala={escala} icone={<Pill size={34} />} rotulo="Meus remédios" destino={R.remedios()} />
        <Atalho escala={escala} icone={<CalendarDays size={34} />} rotulo="Consultas e exames" destino={R.agenda()} />
        <Atalho escala={escala} icone={<ShoppingCart size={34} />} rotulo="Lista de compras" destino={R.compras()} />
        <Atalho escala={escala} icone={<ShieldCheck size={34} />} rotulo="Verificar boleto ou link" destino={R.verificar()} />
        <Atalho escala={escala} icone={<Sparkles size={34} />} rotulo="Conversar com a MelhorIA" destino={R.conversa()} />
        <Atalho escala={escala} icone={<Users size={34} />} rotulo="Minha família" destino={R.familia()} />
        <Atalho escala={escala} icone={<UserCog size={34} />} rotulo="Meus dados" destino={R.perfil()} />
      </nav>
    </Pagina>
  );
}

function Atalho({ icone, rotulo, destino, escala }: {
  icone: React.ReactNode; rotulo: string; destino: string; escala: TamanhoFonte;
}) {
  const router = useRouter();
  return (
    <button
      type="button" onClick={() => router.push(destino)}
      style={{
        minHeight: toque.confortavel,
        display: 'flex', alignItems: 'center', gap: espaco.md,
        padding: `${espaco.sm}px ${espaco.md}px`, borderRadius: raio.botao,
        border: `2px solid ${cor.borda}`, background: cor.fundo, color: cor.tinta,
        fontSize: px(fonte.corpo, escala), fontWeight: 700, textAlign: 'left',
        cursor: 'pointer', width: '100%',
      }}
    >
      <span style={{ color: cor.destaque, display: 'flex' }} aria-hidden="true">{icone}</span>
      {rotulo}
    </button>
  );
}

function estiloSecao(escala: TamanhoFonte): React.CSSProperties {
  return {
    fontSize: px(fonte.titulo, escala), fontWeight: 700,
    color: cor.tinta, margin: `0 0 ${espaco.md}px`,
  };
}
