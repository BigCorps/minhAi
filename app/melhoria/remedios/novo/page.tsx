'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, Loader2, Plus, Trash2 } from 'lucide-react';
import { melhoriaAuth, createMelhoriaClient } from '@/lib/melhoria/supabase';
import CampoComDitado from '@/components/melhoria/CampoComDitado';
import {
  cor, fonte, px, toque, raio, espaco,
  NOMES_DIAS_CURTO, descreverDias, NOMES_DIAS,
} from '@/lib/melhoria/tema';
import { R } from '@/lib/melhoria/rotas';
import { Pagina, Carregando } from '@/components/melhoria/Chrome';
import { melhoriaAnalytics, melhoriaAnalyticsOnce } from '@/lib/melhoria/analytics';

type Passo = 'nome' | 'dosagem' | 'horarios' | 'duracao' | 'salvando';
type PassoRapido = 'nome' | 'horario' | 'salvando';
const TODOS_OS_DIAS = [0, 1, 2, 3, 4, 5, 6];

function NovoRemedioConteudo() {
  const router = useRouter();
  const params = useSearchParams();
  const primeiro = params.get('primeiro') === '1';
  const supabase = melhoriaAuth();
  const mel = createMelhoriaClient();

  const [passo, setPasso] = useState<Passo>('nome');
  const [passoRapido, setPassoRapido] = useState<PassoRapido>('nome');
  const [erro, setErro] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [dosagem, setDosagem] = useState('');
  const [forma, setForma] = useState('comprimido');
  const [horarios, setHorarios] = useState<string[]>(['08:00']);
  const [dias, setDias] = useState<number[]>(TODOS_OS_DIAS);
  const [estoque, setEstoque] = useState('');
  const [continuo, setContinuo] = useState(true);
  const [totalDias, setTotalDias] = useState('');

  async function salvar() {
    setErro(null);
    primeiro ? setPassoRapido('salvando') : setPasso('salvando');

    try {
      const { data: sessao } = await supabase.auth.getUser();
      if (!sessao?.user) { router.replace(`${R.login()}?mode=cadastro`); return; }

      const { data: perfis } = await mel.from('perfis').select('id').limit(1);
      const perfilId = perfis?.[0]?.id;
      if (!perfilId) throw new Error('perfil não encontrado');

      const dataFim = continuo || !totalDias
        ? null
        : new Date(Date.now() + Number(totalDias) * 86_400_000).toISOString().slice(0, 10);

      const { data: med, error: erroMed } = await mel
        .from('medicamentos')
        .insert({
          perfil_id: perfilId,
          nome: nome.trim(),
          dosagem: primeiro ? null : (dosagem.trim() || null),
          forma: primeiro ? 'comprimido' : forma,
          estoque_atual: primeiro ? null : (estoque ? Number(estoque) : null),
          data_fim: primeiro ? null : dataFim,
          origem: 'manual',
          revisado: true,
        })
        .select('id')
        .single();
      if (erroMed || !med) throw erroMed ?? new Error('falha ao salvar');

      const { error: erroDoses } = await mel.from('doses').insert(
        horarios.map((h) => ({
          medicamento_id: med.id,
          horario: h.length === 5 ? `${h}:00` : h,
          dias_semana: dias,
          quantidade: 1,
        }))
      );
      if (erroDoses) throw erroDoses;

      // Agora onboarding_completo representa o primeiro valor configurado,
      // não apenas o fato de ter aberto/salvo a tela de perfil.
      await mel.from('perfis').update({ onboarding_completo: true }).eq('id', perfilId);

      melhoriaAnalytics('first_reminder_created', { source: primeiro ? 'quick_onboarding' : 'full_form' });
      melhoriaAnalyticsOnce('first-reminder-created', 'first_reminder_created');
      router.replace(`${R.app()}?cadastrado=1${primeiro ? '&primeiro=1' : ''}`);
    } catch (e) {
      console.error(e);
      setErro('Não consegui salvar. Verifique a internet e tente de novo.');
      primeiro ? setPassoRapido('horario') : setPasso('duracao');
    }
  }

  if (primeiro) {
    const pode = passoRapido === 'nome' ? nome.trim().length >= 2 : horarios[0]?.length >= 5;
    return (
      <Pagina>
        <p style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: cor.destaqueSuave, color: cor.destaqueTexto,
          borderRadius: 999, padding: '7px 12px', fontSize: 18, fontWeight: 800,
          margin: `0 auto ${espaco.md}px`,
        }}>
          Primeiro lembrete · menos de 1 minuto
        </p>

        {passoRapido === 'nome' && (
          <>
            <h1 style={estiloTitulo}>Qual remédio você quer lembrar?</h1>
            <CampoComDitado
              rotulo="Nome do remédio" ajuda="Pode ser só o nome escrito na caixa."
              exemplo="Losartana" valor={nome} aoMudar={setNome} obrigatorio
            />
          </>
        )}

        {(passoRapido === 'horario' || passoRapido === 'salvando') && (
          <>
            <button
              type="button" onClick={() => setPassoRapido('nome')}
              style={{
                minHeight: toque.min, display: 'inline-flex', alignItems: 'center', gap: 6,
                border: 'none', background: 'transparent', color: cor.destaqueTexto,
                fontSize: 20, fontWeight: 700, cursor: 'pointer',
              }}
            ><ArrowLeft size={28} /> Voltar</button>

            <h1 style={estiloTitulo}>Que horas devemos avisar?</h1>
            <CampoComDitado
              rotulo="Horário" tipo="time" semDitado
              valor={horarios[0]} aoMudar={(v) => setHorarios([v])}
            />
            <div style={{
              background: cor.okBg, border: '2px solid #16A34A', borderRadius: raio.card,
              padding: espaco.md, marginBottom: espaco.lg,
            }}>
              <strong style={{ display: 'block', fontSize: 20, color: cor.okTexto }}>Pronto para começar.</strong>
              <span style={{ display: 'block', marginTop: 5, fontSize: 18, lineHeight: 1.5, color: cor.okTexto }}>
                Vamos repetir este lembrete todos os dias. Dosagem, estoque e duração podem ser completados depois em “Meus remédios”.
              </span>
            </div>
          </>
        )}

        {erro && <p role="alert" style={{ background: cor.perigoBg, color: cor.perigoTexto, border: `2px solid ${cor.perigo}`, borderRadius: raio.card, padding: espaco.md, fontSize: 20, fontWeight: 700 }}>{erro}</p>}

        <button
          type="button"
          onClick={() => {
            if (passoRapido === 'nome') {
              melhoriaAnalytics('first_reminder_started');
              setPassoRapido('horario');
            } else if (passoRapido !== 'salvando') salvar();
          }}
          disabled={!pode || passoRapido === 'salvando'}
          style={{
            minHeight: toque.critico, width: '100%', borderRadius: raio.botao, border: 'none',
            background: pode ? cor.destaque : cor.borda, color: '#fff', fontSize: 26, fontWeight: 800,
            cursor: pode ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: espaco.xs,
          }}
        >
          {passoRapido === 'salvando'
            ? <><Loader2 size={32} className="animate-spin" /> Criando...</>
            : passoRapido === 'nome'
              ? <>Continuar <ArrowRight size={32} /></>
              : <><Check size={34} /> Criar meu lembrete</>}
        </button>
      </Pagina>
    );
  }

  const podeAvancar =
    passo === 'nome' ? nome.trim().length >= 2
      : passo === 'dosagem' ? true
        : passo === 'horarios' ? horarios.length > 0 && dias.length > 0
          : true;

  function avancar() {
    if (!podeAvancar) return;
    if (passo === 'nome') return setPasso('dosagem');
    if (passo === 'dosagem') return setPasso('horarios');
    if (passo === 'horarios') return setPasso('duracao');
    if (passo === 'duracao') return salvar();
  }

  function voltar() {
    if (passo === 'nome') return router.back();
    if (passo === 'dosagem') return setPasso('nome');
    if (passo === 'horarios') return setPasso('dosagem');
    if (passo === 'duracao') return setPasso('horarios');
  }

  const numeroPasso = { nome: 1, dosagem: 2, horarios: 3, duracao: 4, salvando: 4 }[passo];

  return (
    <Pagina>
      <button type="button" onClick={voltar} style={{
        display: 'flex', alignItems: 'center', gap: espaco.xs, minHeight: toque.min,
        background: 'none', border: 'none', color: cor.destaqueTexto,
        fontSize: px(fonte.corpo, 'grande'), fontWeight: 700, cursor: 'pointer', padding: 0, marginBottom: espaco.md,
      }}><ArrowLeft size={30} /> Voltar</button>

      <p style={{ fontSize: px(fonte.rotulo, 'grande'), color: cor.tintaMuted, margin: 0 }}>Passo {numeroPasso} de 4</p>

      {passo === 'nome' && <><h1 style={estiloTitulo}>Qual é o remédio?</h1><CampoComDitado rotulo="Nome do remédio" ajuda="Está escrito na caixa. Pode ditar pelo microfone." exemplo="Losartana" valor={nome} aoMudar={setNome} obrigatorio /></>}

      {passo === 'dosagem' && (
        <>
          <h1 style={estiloTitulo}>Quanto você toma?</h1>
          <CampoComDitado rotulo="Dosagem" ajuda="Como está na receita. Se não souber, pode deixar em branco." exemplo="50mg — ou meio comprimido" valor={dosagem} aoMudar={setDosagem} />
          <fieldset style={{ border: 'none', padding: 0, margin: `0 0 ${espaco.lg}px` }}>
            <legend style={{ fontSize: px(fonte.corpo, 'grande'), fontWeight: 700, color: cor.tinta, marginBottom: espaco.xs, padding: 0 }}>Como é o remédio?</legend>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: espaco.sm }}>
              {['comprimido', 'gota', 'xarope', 'injeção'].map((f) => (
                <button key={f} type="button" onClick={() => setForma(f)} aria-pressed={forma === f} style={{
                  minHeight: toque.min, borderRadius: raio.botao, border: `3px solid ${forma === f ? cor.destaque : cor.borda}`,
                  background: forma === f ? cor.destaqueSuave : cor.fundo, color: forma === f ? cor.destaqueTexto : cor.tinta,
                  fontSize: px(fonte.corpo, 'grande'), fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize',
                }}>{f}</button>
              ))}
            </div>
          </fieldset>
        </>
      )}

      {passo === 'horarios' && (
        <>
          <h1 style={estiloTitulo}>A que horas?</h1>
          {horarios.map((h, i) => (
            <div key={i} style={{ display: 'flex', gap: espaco.sm, alignItems: 'flex-end', marginBottom: espaco.sm }}>
              <div style={{ flex: 1 }}><CampoComDitado rotulo={`Horário ${i + 1}`} tipo="time" semDitado valor={h} aoMudar={(v) => setHorarios(horarios.map((x, j) => j === i ? v : x))} /></div>
              {horarios.length > 1 && <button type="button" onClick={() => setHorarios(horarios.filter((_, j) => j !== i))} aria-label={`Remover horário ${i + 1}`} style={{ minWidth: toque.min, minHeight: toque.min, marginBottom: espaco.lg, borderRadius: raio.botao, border: `2px solid ${cor.borda}`, background: cor.fundo, color: cor.perigo, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={28} /></button>}
            </div>
          ))}
          <button type="button" onClick={() => setHorarios([...horarios, '20:00'])} style={{ minHeight: toque.min, width: '100%', marginBottom: espaco.lg, borderRadius: raio.botao, border: `2px dashed ${cor.borda}`, background: 'transparent', color: cor.destaqueTexto, fontSize: px(fonte.corpo, 'grande'), fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: espaco.xs }}><Plus size={30} /> Outro horário</button>
          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend style={{ fontSize: px(fonte.corpo, 'grande'), fontWeight: 700, color: cor.tinta, marginBottom: espaco.xs, padding: 0 }}>Em quais dias?</legend>
            <div style={{ display: 'flex', gap: 6, marginBottom: espaco.sm }}>
              {NOMES_DIAS_CURTO.map((letra, d) => {
                const ativo = dias.includes(d);
                return <button key={d} type="button" aria-label={NOMES_DIAS[d]} aria-pressed={ativo} onClick={() => setDias(ativo ? dias.filter((x) => x !== d) : [...dias, d].sort())} style={{ flex: 1, minHeight: toque.min, borderRadius: raio.botao, border: `3px solid ${ativo ? cor.destaque : cor.borda}`, background: ativo ? cor.destaque : cor.fundo, color: ativo ? '#FFFFFF' : cor.tintaMuted, fontSize: px(fonte.corpo, 'grande'), fontWeight: 800, cursor: 'pointer' }}>{letra}</button>;
              })}
            </div>
            <p style={{ fontSize: px(fonte.corpo, 'grande'), color: cor.destaqueTexto, fontWeight: 700, margin: 0 }}>{descreverDias(dias)}</p>
          </fieldset>
        </>
      )}

      {(passo === 'duracao' || passo === 'salvando') && (
        <>
          <h1 style={estiloTitulo}>Por quanto tempo?</h1>
          <div style={{ display: 'grid', gap: espaco.sm, marginBottom: espaco.lg }}>
            {[{ v: true, r: 'Uso contínuo', a: 'Tomo todo dia, sem data para parar' }, { v: false, r: 'Por alguns dias', a: 'Tratamento com data para terminar' }].map((op) => (
              <button key={String(op.v)} type="button" onClick={() => setContinuo(op.v)} aria-pressed={continuo === op.v} style={{ minHeight: toque.confortavel, textAlign: 'left', padding: espaco.md, borderRadius: raio.botao, border: `3px solid ${continuo === op.v ? cor.destaque : cor.borda}`, background: continuo === op.v ? cor.destaqueSuave : cor.fundo, cursor: 'pointer' }}>
                <span style={{ display: 'block', fontSize: px(fonte.corpo, 'grande'), fontWeight: 700, color: cor.tinta }}>{op.r}</span>
                <span style={{ display: 'block', fontSize: px(fonte.rotulo, 'grande'), color: cor.tintaMuted, marginTop: 4 }}>{op.a}</span>
              </button>
            ))}
          </div>
          {!continuo && <CampoComDitado rotulo="Quantos dias de tratamento?" tipo="number" semDitado exemplo="7" valor={totalDias} aoMudar={setTotalDias} />}
          <CampoComDitado rotulo="Quantos comprimidos você tem em casa?" ajuda="Opcional. Serve para eu avisar quando estiver acabando." tipo="number" semDitado exemplo="30" valor={estoque} aoMudar={setEstoque} />
        </>
      )}

      {erro && <p role="alert" style={{ background: cor.perigoBg, color: cor.perigoTexto, border: `2px solid ${cor.perigo}`, borderRadius: raio.card, padding: espaco.md, fontSize: px(fonte.corpo, 'grande'), fontWeight: 600, marginBottom: espaco.md }}>{erro}</p>}

      <button type="button" onClick={avancar} disabled={!podeAvancar || passo === 'salvando'} style={{ minHeight: toque.critico, width: '100%', marginTop: espaco.md, borderRadius: raio.botao, border: 'none', background: podeAvancar ? cor.destaque : cor.borda, color: '#FFFFFF', fontSize: px(fonte.titulo, 'grande'), fontWeight: 800, cursor: podeAvancar ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: espaco.xs }}>
        {passo === 'salvando' ? <><Loader2 size={34} className="animate-spin" /> Salvando...</> : passo === 'duracao' ? <><Check size={36} strokeWidth={3} /> Salvar remédio</> : <>Continuar <ArrowRight size={34} /></>}
      </button>
    </Pagina>
  );
}

export default function NovoRemedioPage() {
  return <Suspense fallback={<Pagina semRodape><Carregando /></Pagina>}><NovoRemedioConteudo /></Suspense>;
}

const estiloTitulo: React.CSSProperties = {
  fontSize: 38, fontWeight: 800, color: cor.tinta,
  margin: `${espaco.xs}px 0 ${espaco.lg}px`, lineHeight: 1.2,
};
