'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CalendarDays, Check, ChevronRight, Clock3, Pill, Users } from 'lucide-react';
import { createMelhoriaClient } from '@/lib/melhoria/supabase';
import { R } from '@/lib/melhoria/rotas';
import { cor, toque, raio, espaco } from '@/lib/melhoria/tema';
import { melhoriaAnalytics } from '@/lib/melhoria/analytics';

type Props = {
  perfilId: string;
  criadoEm: string;
  temMedicamento: boolean;
  temContato: boolean;
  temAgendamento: boolean;
  notificacoesAtivas: boolean;
  lembreteDiarioAtivo: boolean;
  lembreteDiarioHorario: string;
  aoSalvarLembrete: (ativo: boolean, horario: string) => void;
};

function diasDesde(iso: string) {
  const inicio = new Date(iso).getTime();
  if (!Number.isFinite(inicio)) return 99;
  return Math.max(0, Math.floor((Date.now() - inicio) / 86_400_000));
}

export default function PrimeirosSeteDias(props: Props) {
  const router = useRouter();
  const mel = createMelhoriaClient();
  const dia = diasDesde(props.criadoEm) + 1;
  const [salvando, setSalvando] = useState(false);
  const [horario, setHorario] = useState((props.lembreteDiarioHorario || '09:00').slice(0, 5));
  const [ativo, setAtivo] = useState(props.lembreteDiarioAtivo);
  const [erro, setErro] = useState<string | null>(null);

  const tarefas = useMemo(() => [
    {
      chave: 'remedio', pronto: props.temMedicamento, Icone: Pill,
      titulo: 'Deixe pelo menos um lembrete funcionando',
      texto: 'É o principal: nome + horário já bastam para começar.',
      acao: () => router.push(`${R.remedioNovo()}?primeiro=1`),
    },
    {
      chave: 'notificacoes', pronto: props.notificacoesAtivas, Icone: Bell,
      titulo: 'Ative os avisos no aparelho',
      texto: 'Assim a MelhorIA consegue chamar você mesmo com o app fechado.',
      acao: () => {
        melhoriaAnalytics('guide_notification_needed');
        document.getElementById('melhoria-notificacoes')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      },
    },
    {
      chave: 'familia', pronto: props.temContato, Icone: Users,
      titulo: 'Escolha quem pode ajudar',
      texto: 'Cadastre um contato para os recursos de apoio e emergência.',
      acao: () => router.push(R.emergencia()),
    },
    {
      chave: 'agenda', pronto: props.temAgendamento, Icone: CalendarDays,
      titulo: 'Anote a próxima consulta ou exame',
      texto: 'A MelhorIA organiza os próximos compromissos e os avisos.',
      acao: () => router.push(R.agendaNova()),
    },
  ], [props.temMedicamento, props.notificacoesAtivas, props.temContato, props.temAgendamento, router]);

  async function salvarLembreteDiario(novoAtivo = ativo) {
    setSalvando(true);
    setErro(null);
    const { error } = await mel.from('perfis').update({
      lembrete_diario_ativo: novoAtivo,
      lembrete_diario_horario: horario.length === 5 ? `${horario}:00` : horario,
    }).eq('id', props.perfilId);

    if (error) {
      setErro('Não consegui salvar o lembrete diário agora.');
    } else {
      setAtivo(novoAtivo);
      props.aoSalvarLembrete(novoAtivo, horario);
      melhoriaAnalytics(novoAtivo ? 'daily_checkin_enabled' : 'daily_checkin_disabled', { time: horario });
    }
    setSalvando(false);
  }

  if (dia > 7) {
    return (
      <section style={{
        background: cor.fundoCard, border: `2px solid ${cor.borda}`,
        borderRadius: raio.card, padding: espaco.md, marginBottom: espaco.xl, textAlign: 'left',
      }}>
        <h2 style={{ fontSize: 22, margin: 0, color: cor.tinta }}>Lembrete diário</h2>
        <p style={{ fontSize: 18, color: cor.tintaMuted, lineHeight: 1.5, margin: `${espaco.xs}px 0 ${espaco.sm}px` }}>
          Opcional. É uma mensagem genérica para você abrir a MelhorIA e conferir o dia.
        </p>
        <input
          type="time" value={horario} onChange={(e) => setHorario(e.target.value)}
          style={{ minHeight: toque.min, width: '100%', border: `2px solid ${cor.borda}`, borderRadius: raio.campo, padding: `0 ${espaco.md}px`, fontSize: 22, color: cor.tinta, background: cor.fundo }}
        />
        <button
          type="button" disabled={salvando} onClick={() => salvarLembreteDiario(!ativo)}
          style={{ marginTop: espaco.sm, minHeight: toque.min, width: '100%', borderRadius: raio.botao, border: `2px solid ${cor.destaque}`, background: ativo ? cor.fundo : cor.destaque, color: ativo ? cor.destaqueTexto : '#fff', fontSize: 20, fontWeight: 800, cursor: salvando ? 'wait' : 'pointer' }}
        >
          {salvando ? 'Salvando...' : ativo ? 'Desativar lembrete diário' : `Lembrar todos os dias às ${horario}`}
        </button>
        {erro && <p role="status" style={{ color: cor.perigoTexto, fontSize: 18, fontWeight: 700 }}>{erro}</p>}
      </section>
    );
  }

  return (
    <section style={{
      background: cor.fundoCard, border: `2px solid ${cor.borda}`,
      borderRadius: raio.card, padding: espaco.lg, marginBottom: espaco.xl,
      textAlign: 'left',
    }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        background: cor.destaqueSuave, color: cor.destaqueTexto,
        borderRadius: 999, padding: '7px 12px', fontWeight: 800, fontSize: 17,
      }}>
        <Clock3 size={20} /> Primeiros 7 dias · dia {Math.min(dia, 7)}
      </span>

      <h2 style={{ fontSize: 28, lineHeight: 1.2, color: cor.tinta, margin: `${espaco.md}px 0 ${espaco.xs}px`, fontWeight: 800 }}>
        Configure a MelhorIA no seu ritmo
      </h2>
      <p style={{ fontSize: 19, lineHeight: 1.5, color: cor.tintaMuted, margin: `0 0 ${espaco.md}px` }}>
        Não é uma competição e você não precisa completar tudo. Estes são apenas recursos que podem deixar o dia mais organizado.
      </p>

      <div style={{ display: 'grid', gap: espaco.sm }}>
        {tarefas.map(({ chave, pronto, Icone, titulo, texto, acao }) => (
          <button
            type="button" key={chave} onClick={() => {
              melhoriaAnalytics('first_7_days_item_click', { item: chave, completed: pronto });
              acao();
            }}
            style={{
              minHeight: toque.min, width: '100%', textAlign: 'left',
              display: 'grid', gridTemplateColumns: '48px 1fr 26px', alignItems: 'center', gap: espaco.sm,
              padding: espaco.sm, borderRadius: raio.botao,
              border: `2px solid ${pronto ? '#86EFAC' : cor.borda}`,
              background: pronto ? cor.okBg : cor.fundo,
              cursor: 'pointer', color: cor.tinta,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: pronto ? cor.okTexto : cor.destaqueTexto }}>
              {pronto ? <Check size={30} strokeWidth={3} /> : <Icone size={30} />}
            </span>
            <span>
              <strong style={{ display: 'block', fontSize: 19, lineHeight: 1.3 }}>{titulo}</strong>
              <span style={{ display: 'block', marginTop: 4, fontSize: 17, lineHeight: 1.4, color: cor.tintaMuted }}>{texto}</span>
            </span>
            <ChevronRight size={24} style={{ color: cor.tintaMuted }} />
          </button>
        ))}
      </div>

      <div style={{
        marginTop: espaco.lg, paddingTop: espaco.md,
        borderTop: `2px solid ${cor.borda}`,
      }}>
        <h3 style={{ fontSize: 22, margin: 0, color: cor.tinta }}>Quer um lembrete diário para abrir a MelhorIA?</h3>
        <p style={{ fontSize: 18, color: cor.tintaMuted, lineHeight: 1.5, margin: `${espaco.xs}px 0 ${espaco.sm}px` }}>
          É opcional e não mostra nome de remédio. A mensagem só convida você a conferir o seu dia.
        </p>
        <label style={{ display: 'block', fontSize: 18, fontWeight: 700, color: cor.tinta, marginBottom: 6 }}>Horário</label>
        <input
          type="time" value={horario} onChange={(e) => setHorario(e.target.value)}
          style={{
            minHeight: toque.min, width: '100%', border: `2px solid ${cor.borda}`,
            borderRadius: raio.campo, padding: `0 ${espaco.md}px`, fontSize: 22,
            color: cor.tinta, background: cor.fundo,
          }}
        />

        <button
          type="button" disabled={salvando}
          onClick={() => salvarLembreteDiario(!ativo)}
          style={{
            marginTop: espaco.sm, minHeight: toque.min, width: '100%',
            borderRadius: raio.botao, border: `2px solid ${cor.destaque}`,
            background: ativo ? cor.fundo : cor.destaque,
            color: ativo ? cor.destaqueTexto : '#fff', fontSize: 20, fontWeight: 800,
            cursor: salvando ? 'wait' : 'pointer',
          }}
        >
          {salvando ? 'Salvando...' : ativo ? 'Desativar lembrete diário' : `Lembrar todos os dias às ${horario}`}
        </button>
        {erro && <p role="status" style={{ color: cor.perigoTexto, fontSize: 18, fontWeight: 700 }}>{erro}</p>}
      </div>
    </section>
  );
}
