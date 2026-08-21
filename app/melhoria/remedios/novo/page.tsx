'use client';

// app/melhoria/remedios/novo/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Cadastro de remédio. Grátis, sem crédito, digitando ou ditando.
//
// Uma pergunta por vez. O formulário inteiro numa tela só é o que faz a pessoa
// desistir no meio — e desistir aqui significa não ser lembrada do remédio.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, Loader2, Plus, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { createMelhoriaClient } from '@/lib/melhoria/supabase';
import CampoComDitado from '@/components/melhoria/CampoComDitado';
import {
  cor, fonte, px, toque, raio, espaco,
  NOMES_DIAS_CURTO, descreverDias, NOMES_DIAS,
} from '@/lib/melhoria/tema';

type Passo = 'nome' | 'dosagem' | 'horarios' | 'duracao' | 'salvando';

const TODOS_OS_DIAS = [0, 1, 2, 3, 4, 5, 6];

export default function NovoRemedioPage() {
  const router   = useRouter();
  const supabase = createClient();
  const mel      = createMelhoriaClient();

  const [passo, setPasso]     = useState<Passo>('nome');
  const [erro, setErro]       = useState<string | null>(null);

  const [nome, setNome]       = useState('');
  const [dosagem, setDosagem] = useState('');
  const [forma, setForma]     = useState('comprimido');
  const [horarios, setHorarios] = useState<string[]>(['08:00']);
  const [dias, setDias]       = useState<number[]>(TODOS_OS_DIAS);
  const [estoque, setEstoque] = useState('');
  const [continuo, setContinuo] = useState(true);
  const [totalDias, setTotalDias] = useState('');

  // ── Salvar ────────────────────────────────────────────────────────────────
  async function salvar() {
    setErro(null);
    setPasso('salvando');

    try {
      const { data: sessao } = await supabase.auth.getUser();
      if (!sessao?.user) { router.replace('/melhoria/login'); return; }

      const { data: perfis } = await mel.from('perfis').select('id').limit(1);
      const perfilId = perfis?.[0]?.id;
      if (!perfilId) throw new Error('perfil não encontrado');

      const dataFim = continuo || !totalDias
        ? null
        : new Date(Date.now() + Number(totalDias) * 86_400_000)
            .toISOString().slice(0, 10);

      const { data: med, error: erroMed } = await mel
        .from('medicamentos')
        .insert({
          perfil_id: perfilId,
          nome: nome.trim(),
          dosagem: dosagem.trim() || null,
          forma,
          estoque_atual: estoque ? Number(estoque) : null,
          data_fim: dataFim,
          origem: 'manual',
          revisado: true,      // cadastro manual já nasce revisado
        })
        .select('id')
        .single();

      if (erroMed || !med) throw erroMed ?? new Error('falha ao salvar');

      // O trigger trg_melhoria_materializar gera as ocorrências dos próximos
      // 7 dias no INSERT — inclusive as de hoje. Sem ele, quem cadastra às
      // 7h50 um remédio das 8h só seria lembrado amanhã.
      const { error: erroDoses } = await mel.from('doses').insert(
        horarios.map((h) => ({
          medicamento_id: med.id,
          horario: h.length === 5 ? `${h}:00` : h,
          dias_semana: dias,
          quantidade: 1,
        }))
      );

      if (erroDoses) throw erroDoses;

      router.push('/melhoria?cadastrado=1');
    } catch (e) {
      console.error(e);
      setErro('Não consegui salvar. Verifique a internet e tente de novo.');
      setPasso('duracao');
    }
  }

  // ── Navegação ─────────────────────────────────────────────────────────────
  const podeAvancar =
    passo === 'nome'     ? nome.trim().length >= 2
  : passo === 'dosagem'  ? true
  : passo === 'horarios' ? horarios.length > 0 && dias.length > 0
  : true;

  function avancar() {
    if (!podeAvancar) return;
    if (passo === 'nome')     return setPasso('dosagem');
    if (passo === 'dosagem')  return setPasso('horarios');
    if (passo === 'horarios') return setPasso('duracao');
    if (passo === 'duracao')  return salvar();
  }

  function voltar() {
    if (passo === 'nome')     return router.back();
    if (passo === 'dosagem')  return setPasso('nome');
    if (passo === 'horarios') return setPasso('dosagem');
    if (passo === 'duracao')  return setPasso('horarios');
  }

  const numeroPasso = { nome: 1, dosagem: 2, horarios: 3, duracao: 4, salvando: 4 }[passo];

  return (
    <main style={{
      background: cor.fundo, minHeight: '100dvh', maxWidth: 640,
      margin: '0 auto', padding: `${espaco.lg}px ${espaco.md}px`, color: cor.tinta,
    }}>
      <button
        type="button"
        onClick={voltar}
        style={{
          display: 'flex', alignItems: 'center', gap: espaco.xs,
          minHeight: toque.min, background: 'none', border: 'none',
          color: cor.destaqueTexto, fontSize: px(fonte.corpo, 'grande'),
          fontWeight: 700, cursor: 'pointer', padding: 0,
          marginBottom: espaco.md,
        }}
      >
        <ArrowLeft size={30} aria-hidden="true" /> Voltar
      </button>

      <p style={{ fontSize: px(fonte.rotulo, 'grande'), color: cor.tintaMuted, margin: 0 }}>
        Passo {numeroPasso} de 4
      </p>

      {/* ── Passo 1 ── */}
      {passo === 'nome' && (
        <>
          <h1 style={estiloTitulo}>Qual é o remédio?</h1>
          <CampoComDitado
            rotulo="Nome do remédio"
            ajuda="Está escrito na caixa. Pode ditar pelo microfone."
            exemplo="Losartana"
            valor={nome}
            aoMudar={setNome}
            obrigatorio
          />
        </>
      )}

      {/* ── Passo 2 ── */}
      {passo === 'dosagem' && (
        <>
          <h1 style={estiloTitulo}>Quanto você toma?</h1>
          <CampoComDitado
            rotulo="Dosagem"
            ajuda="Como está na receita. Se não souber, pode deixar em branco."
            exemplo="50mg — ou meio comprimido"
            valor={dosagem}
            aoMudar={setDosagem}
          />

          <fieldset style={{ border: 'none', padding: 0, margin: `0 0 ${espaco.lg}px` }}>
            <legend style={{
              fontSize: px(fonte.corpo, 'grande'), fontWeight: 700,
              color: cor.tinta, marginBottom: espaco.xs, padding: 0,
            }}>
              Como é o remédio?
            </legend>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: espaco.sm }}>
              {['comprimido', 'gota', 'xarope', 'injeção'].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setForma(f)}
                  aria-pressed={forma === f}
                  style={{
                    minHeight: toque.min, borderRadius: raio.botao,
                    border: `3px solid ${forma === f ? cor.destaque : cor.borda}`,
                    background: forma === f ? cor.destaqueSuave : cor.fundo,
                    color: forma === f ? cor.destaqueTexto : cor.tinta,
                    fontSize: px(fonte.corpo, 'grande'), fontWeight: 700,
                    cursor: 'pointer', textTransform: 'capitalize',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </fieldset>
        </>
      )}

      {/* ── Passo 3 ── */}
      {passo === 'horarios' && (
        <>
          <h1 style={estiloTitulo}>A que horas?</h1>

          {horarios.map((h, i) => (
            <div key={i} style={{ display: 'flex', gap: espaco.sm, alignItems: 'flex-end', marginBottom: espaco.sm }}>
              <div style={{ flex: 1 }}>
                <CampoComDitado
                  rotulo={`Horário ${i + 1}`}
                  tipo="time"
                  semDitado
                  valor={h}
                  aoMudar={(v) => setHorarios(horarios.map((x, j) => (j === i ? v : x)))}
                />
              </div>
              {horarios.length > 1 && (
                <button
                  type="button"
                  onClick={() => setHorarios(horarios.filter((_, j) => j !== i))}
                  aria-label={`Remover horário ${i + 1}`}
                  style={{
                    minWidth: toque.min, minHeight: toque.min,
                    marginBottom: espaco.lg,
                    borderRadius: raio.botao, border: `2px solid ${cor.borda}`,
                    background: cor.fundo, color: cor.perigo, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Trash2 size={28} />
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={() => setHorarios([...horarios, '20:00'])}
            style={{
              minHeight: toque.min, width: '100%', marginBottom: espaco.lg,
              borderRadius: raio.botao, border: `2px dashed ${cor.borda}`,
              background: 'transparent', color: cor.destaqueTexto,
              fontSize: px(fonte.corpo, 'grande'), fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: espaco.xs,
            }}
          >
            <Plus size={30} aria-hidden="true" /> Outro horário
          </button>

          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend style={{
              fontSize: px(fonte.corpo, 'grande'), fontWeight: 700,
              color: cor.tinta, marginBottom: espaco.xs, padding: 0,
            }}>
              Em quais dias?
            </legend>

            <div style={{ display: 'flex', gap: 6, marginBottom: espaco.sm }}>
              {NOMES_DIAS_CURTO.map((letra, d) => {
                const ativo = dias.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    aria-label={NOMES_DIAS[d]}
                    aria-pressed={ativo}
                    onClick={() =>
                      setDias(ativo ? dias.filter((x) => x !== d) : [...dias, d].sort())
                    }
                    style={{
                      flex: 1, minHeight: toque.min,
                      borderRadius: raio.botao,
                      border: `3px solid ${ativo ? cor.destaque : cor.borda}`,
                      background: ativo ? cor.destaque : cor.fundo,
                      color: ativo ? '#FFFFFF' : cor.tintaMuted,
                      fontSize: px(fonte.corpo, 'grande'), fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    {letra}
                  </button>
                );
              })}
            </div>

            {/* Português claro, nunca "1,3,5" */}
            <p style={{
              fontSize: px(fonte.corpo, 'grande'), color: cor.destaqueTexto,
              fontWeight: 700, margin: 0,
            }}>
              {descreverDias(dias)}
            </p>
          </fieldset>
        </>
      )}

      {/* ── Passo 4 ── */}
      {(passo === 'duracao' || passo === 'salvando') && (
        <>
          <h1 style={estiloTitulo}>Por quanto tempo?</h1>

          <div style={{ display: 'grid', gap: espaco.sm, marginBottom: espaco.lg }}>
            {[
              { v: true,  r: 'Uso contínuo',        a: 'Tomo todo dia, sem data para parar' },
              { v: false, r: 'Por alguns dias',      a: 'Tratamento com data para terminar' },
            ].map((op) => (
              <button
                key={String(op.v)}
                type="button"
                onClick={() => setContinuo(op.v)}
                aria-pressed={continuo === op.v}
                style={{
                  minHeight: toque.confortavel, textAlign: 'left',
                  padding: espaco.md, borderRadius: raio.botao,
                  border: `3px solid ${continuo === op.v ? cor.destaque : cor.borda}`,
                  background: continuo === op.v ? cor.destaqueSuave : cor.fundo,
                  cursor: 'pointer',
                }}
              >
                <span style={{
                  display: 'block', fontSize: px(fonte.corpo, 'grande'),
                  fontWeight: 700, color: cor.tinta,
                }}>
                  {op.r}
                </span>
                <span style={{
                  display: 'block', fontSize: px(fonte.rotulo, 'grande'),
                  color: cor.tintaMuted, marginTop: 4,
                }}>
                  {op.a}
                </span>
              </button>
            ))}
          </div>

          {!continuo && (
            <CampoComDitado
              rotulo="Quantos dias de tratamento?"
              tipo="number"
              semDitado
              exemplo="7"
              valor={totalDias}
              aoMudar={setTotalDias}
            />
          )}

          <CampoComDitado
            rotulo="Quantos comprimidos você tem em casa?"
            ajuda="Opcional. Serve para eu avisar quando estiver acabando."
            tipo="number"
            semDitado
            exemplo="30"
            valor={estoque}
            aoMudar={setEstoque}
          />
        </>
      )}

      {erro && (
        <p role="alert" style={{
          background: cor.perigoBg, color: cor.perigoTexto,
          border: `2px solid ${cor.perigo}`, borderRadius: raio.card,
          padding: espaco.md, fontSize: px(fonte.corpo, 'grande'),
          fontWeight: 600, marginBottom: espaco.md,
        }}>
          {erro}
        </p>
      )}

      <button
        type="button"
        onClick={avancar}
        disabled={!podeAvancar || passo === 'salvando'}
        style={{
          minHeight: toque.critico, width: '100%', marginTop: espaco.md,
          borderRadius: raio.botao, border: 'none',
          background: podeAvancar ? cor.destaque : cor.borda,
          color: '#FFFFFF', fontSize: px(fonte.titulo, 'grande'), fontWeight: 800,
          cursor: podeAvancar ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: espaco.xs,
        }}
      >
        {passo === 'salvando' ? (
          <><Loader2 size={34} className="animate-spin" aria-hidden="true" /> Salvando...</>
        ) : passo === 'duracao' ? (
          <><Check size={36} strokeWidth={3} aria-hidden="true" /> Salvar remédio</>
        ) : (
          <>Continuar <ArrowRight size={34} aria-hidden="true" /></>
        )}
      </button>
    </main>
  );
}

const estiloTitulo: React.CSSProperties = {
  fontSize: 38, fontWeight: 800, color: cor.tinta,
  margin: `${espaco.xs}px 0 ${espaco.lg}px`, lineHeight: 1.2,
};
