'use client';

// app/melhoria/receita/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Foto da receita → conferência obrigatória → cadastro.
//
// A tela de conferência não é uma formalidade que dá para pular depois. Ela é
// o que impede que um erro de OCR vire uma overdose programada — e é o que
// mantém o produto fora da classificação de dispositivo médico.
//
// Três decisões que parecem detalhe e não são:
//   1. Todo item começa DESMARCADO. Marcar por padrão transforma a conferência
//      num "avançar", que é exatamente o que não pode acontecer.
//   2. Item com confiança baixa aparece em destaque de atenção e com o campo
//      vazio, obrigando a digitar em vez de aceitar.
//   3. Os horários NUNCA vêm da IA. Ela lê "de 12 em 12 horas"; quem escolhe
//      8h e 20h é a pessoa.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Camera, Check, Loader2, AlertTriangle, X, Plus, Trash2,
} from 'lucide-react';
import { melhoriaAuth, createMelhoriaClient } from '@/lib/melhoria/supabase';
import CampoComDitado from '@/components/melhoria/CampoComDitado';
import { cor, toque, raio, espaco, descreverDias, NOMES_DIAS_CURTO, NOMES_DIAS } from '@/lib/melhoria/tema';
import { R } from '@/lib/melhoria/rotas';
import { Pagina } from '@/components/melhoria/Chrome';

type Etapa = 'foto' | 'lendo' | 'conferir' | 'salvando';

interface ItemProposto {
  nome: string;
  dosagem: string;
  forma: string;
  frequencia_texto: string;
  duracao_dias: number | null;
  confianca: 'alta' | 'media' | 'baixa';
  // preenchidos na conferência
  conferido: boolean;
  horarios: string[];
  dias: number[];
}

const TODOS = [0, 1, 2, 3, 4, 5, 6];

export default function ReceitaPage() {
  const router   = useRouter();
  const supabase = melhoriaAuth();
  const mel      = createMelhoriaClient();

  const [etapa, setEtapa]   = useState<Etapa>('foto');
  const [itens, setItens]   = useState<ItemProposto[]>([]);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [erro, setErro]     = useState<string | null>(null);

  async function aoEscolherFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    setErro(null);
    setEtapa('lendo');

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const leitor = new FileReader();
        leitor.onload = () => resolve(leitor.result as string);
        leitor.onerror = () => reject(new Error('leitura do arquivo'));
        leitor.readAsDataURL(arquivo);
      });

      setFotoUrl(base64);

      const r = await fetch('/api/melhoria/receita', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagemBase64: base64 }),
      });

      const dados = await r.json();

      if (!r.ok) {
        setErro(dados?.mensagem ?? 'Não consegui ler a receita.');
        setEtapa('foto');
        return;
      }

      setItens(
        (dados.proposta ?? []).map((p: any) => ({
          ...p,
          conferido: false,                  // sempre desmarcado
          // Dosagem de confiança baixa vem VAZIA: melhor obrigar a digitar
          // que oferecer um número possivelmente errado para aceitar.
          dosagem: p.confianca === 'baixa' ? '' : p.dosagem,
          horarios: ['08:00'],               // sugestão neutra, nunca da IA
          dias: TODOS,
        })),
      );
      setEtapa('conferir');
    } catch {
      setErro('Não consegui usar esta foto. Tente de novo.');
      setEtapa('foto');
    }
  }

  function atualizar(i: number, campo: keyof ItemProposto, valor: any) {
    setItens((atual) => atual.map((it, j) => (j === i ? { ...it, [campo]: valor } : it)));
  }

  async function salvar() {
    setEtapa('salvando');
    setErro(null);

    try {
      const { data: perfis } = await mel.from('perfis').select('id').limit(1);
      const perfilId = perfis?.[0]?.id;
      if (!perfilId) throw new Error('perfil');

      const { data: sessao } = await supabase.auth.getUser();

      const aprovados = itens.filter((i) => i.conferido);

      for (const item of aprovados) {
        const { data: med, error: e1 } = await mel.from('medicamentos').insert({
          perfil_id: perfilId,
          nome: item.nome.trim(),
          dosagem: item.dosagem.trim() || null,
          forma: item.forma,
          data_fim: item.duracao_dias
            ? new Date(Date.now() + item.duracao_dias * 86_400_000).toISOString().slice(0, 10)
            : null,
          origem: 'receita_ia',
          // Só vira true porque um adulto conferiu nesta tela. A
          // materializar_doses do banco exige m.revisado — sem isso, o
          // medicamento existe mas nenhum lembrete é gerado.
          revisado: true,
          revisado_por: sessao?.user?.id ?? null,
          revisado_em: new Date().toISOString(),
        }).select('id').single();

        if (e1 || !med) throw e1 ?? new Error('medicamento');

        const { error: e2 } = await mel.from('doses').insert(
          item.horarios.map((h) => ({
            medicamento_id: med.id,
            horario: h.length === 5 ? `${h}:00` : h,
            dias_semana: item.dias,
            quantidade: 1,
          })),
        );
        if (e2) throw e2;
      }

      router.push(R.remedios());
    } catch (e) {
      console.error(e);
      setErro('Não consegui salvar. Verifique a internet e tente de novo.');
      setEtapa('conferir');
    }
  }

  const conferidos = itens.filter((i) => i.conferido).length;

  return (
    <Pagina>
      <button type="button" onClick={() => router.back()} style={btnVoltar}>
        <ArrowLeft size={30} aria-hidden="true" /> Voltar
      </button>

      {/* ── Etapa 1: foto ── */}
      {etapa === 'foto' && (
        <>
          <h1 style={titulo}>Fotografar a receita</h1>

          <p style={{ fontSize: 21, color: cor.tinta, lineHeight: 1.5, margin: `0 0 ${espaco.md}px` }}>
            Tire uma foto da receita com boa luz, com o papel bem aberto e sem
            sombra. Depois você vai conferir tudo antes de salvar.
          </p>

          <p style={{
            background: cor.atencaoBg, color: cor.atencaoTexto,
            border: '2px solid #D97706', borderRadius: raio.card,
            padding: espaco.md, fontSize: 20, fontWeight: 700,
            lineHeight: 1.45, margin: `0 0 ${espaco.lg}px`,
          }}>
            A leitura por foto <strong>pode errar</strong>. Você vai conferir
            cada remédio com a receita na mão antes de qualquer coisa ser
            salva. Isto usa 3 usos.
          </p>

          <label style={{
            minHeight: toque.critico, width: '100%',
            borderRadius: raio.botao, border: 'none',
            background: cor.destaque, color: '#FFFFFF',
            fontSize: 26, fontWeight: 800, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: espaco.xs,
          }}>
            <Camera size={34} aria-hidden="true" />
            Tirar foto
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={aoEscolherFoto}
              style={{ display: 'none' }}
            />
          </label>

          <button
            type="button"
            onClick={() => router.push(R.remedioNovo())}
            style={{ ...botaoSecundario, marginTop: espaco.md }}
          >
            Prefiro digitar (é grátis)
          </button>

          {erro && <p role="alert" style={avisoErro}>{erro}</p>}
        </>
      )}

      {/* ── Etapa 2: lendo ── */}
      {etapa === 'lendo' && (
        <div style={{ textAlign: 'center', paddingTop: 60 }}>
          <Loader2 size={64} className="animate-spin" style={{ color: cor.destaque }} />
          <p style={{ fontSize: 26, fontWeight: 700, color: cor.tinta, marginTop: espaco.md }}>
            Lendo a receita...
          </p>
          <p style={{ fontSize: 20, color: cor.tintaMuted, marginTop: espaco.xs }}>
            Pode levar alguns segundos.
          </p>
        </div>
      )}

      {/* ── Etapa 3: conferência ── */}
      {(etapa === 'conferir' || etapa === 'salvando') && (
        <>
          <h1 style={titulo}>Confira com a receita na mão</h1>

          <p style={{
            background: cor.perigoBg, color: cor.perigoTexto,
            border: `2px solid ${cor.perigo}`, borderRadius: raio.card,
            padding: espaco.md, fontSize: 21, fontWeight: 700,
            lineHeight: 1.45, margin: `0 0 ${espaco.lg}px`,
          }}>
            Compare cada remédio e cada dose com o que está escrito na receita.
            <strong> Só marque o que estiver certo.</strong> O que não for
            marcado não será salvo.
          </p>

          {/* Foto original lado a lado com a conferência */}
          {fotoUrl && (
            <details style={{ marginBottom: espaco.lg }}>
              <summary style={{
                minHeight: toque.min, display: 'flex', alignItems: 'center',
                fontSize: 21, fontWeight: 700, color: cor.destaqueTexto,
                cursor: 'pointer',
              }}>
                Ver a foto da receita
              </summary>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fotoUrl}
                alt="Foto da receita enviada"
                style={{
                  width: '100%', borderRadius: raio.card,
                  border: `2px solid ${cor.borda}`, marginTop: espaco.sm,
                }}
              />
            </details>
          )}

          {itens.map((item, i) => (
            <article key={i} style={{
              background: item.conferido ? cor.okBg : cor.fundoCard,
              border: `3px solid ${item.conferido ? '#16A34A' : item.confianca === 'baixa' ? '#D97706' : cor.borda}`,
              borderRadius: raio.card, padding: espaco.md, marginBottom: espaco.md,
            }}>
              {item.confianca === 'baixa' && (
                <p style={{
                  display: 'flex', alignItems: 'flex-start', gap: espaco.xs,
                  fontSize: 19, fontWeight: 700, color: cor.atencaoTexto,
                  margin: `0 0 ${espaco.sm}px`, lineHeight: 1.4,
                }}>
                  <AlertTriangle size={26} aria-hidden="true" style={{ flexShrink: 0 }} />
                  Não consegui ler direito. Digite você mesmo olhando a receita.
                </p>
              )}

              <CampoComDitado
                rotulo="Nome do remédio"
                valor={item.nome}
                aoMudar={(v) => atualizar(i, 'nome', v)}
              />

              <CampoComDitado
                rotulo="Dosagem"
                ajuda={item.frequencia_texto ? `Na receita está: "${item.frequencia_texto}"` : undefined}
                exemplo="50mg"
                valor={item.dosagem}
                aoMudar={(v) => atualizar(i, 'dosagem', v)}
              />

              {/* Horários escolhidos pela pessoa, nunca pela IA */}
              <fieldset style={{ border: 'none', padding: 0, margin: `0 0 ${espaco.md}px` }}>
                <legend style={{ fontSize: 21, fontWeight: 700, color: cor.tinta, padding: 0, marginBottom: espaco.xs }}>
                  A que horas tomar?
                </legend>
                {item.horarios.map((h, k) => (
                  <div key={k} style={{ display: 'flex', gap: espaco.xs, marginBottom: espaco.xs }}>
                    <input
                      type="time"
                      value={h}
                      onChange={(e) =>
                        atualizar(i, 'horarios', item.horarios.map((x, y) => (y === k ? e.target.value : x)))
                      }
                      style={{
                        flex: 1, minHeight: toque.min, padding: `0 ${espaco.sm}px`,
                        borderRadius: raio.campo, border: `2px solid ${cor.borda}`,
                        fontSize: 22, color: cor.tinta, background: cor.fundo,
                      }}
                    />
                    {item.horarios.length > 1 && (
                      <button
                        type="button"
                        aria-label="Remover horário"
                        onClick={() => atualizar(i, 'horarios', item.horarios.filter((_, y) => y !== k))}
                        style={{
                          minWidth: toque.min, minHeight: toque.min,
                          borderRadius: raio.botao, border: `2px solid ${cor.borda}`,
                          background: cor.fundo, color: cor.perigo, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <Trash2 size={24} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => atualizar(i, 'horarios', [...item.horarios, '20:00'])}
                  style={{
                    minHeight: toque.min, width: '100%',
                    borderRadius: raio.botao, border: `2px dashed ${cor.borda}`,
                    background: 'transparent', color: cor.destaqueTexto,
                    fontSize: 20, fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  <Plus size={26} aria-hidden="true" /> Outro horário
                </button>
              </fieldset>

              <div style={{ display: 'flex', gap: 6, marginBottom: espaco.xs }}>
                {NOMES_DIAS_CURTO.map((letra, d) => {
                  const ativo = item.dias.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      aria-label={NOMES_DIAS[d]}
                      aria-pressed={ativo}
                      onClick={() =>
                        atualizar(i, 'dias',
                          ativo ? item.dias.filter((x) => x !== d) : [...item.dias, d].sort())
                      }
                      style={{
                        flex: 1, minHeight: 52, borderRadius: raio.botao,
                        border: `3px solid ${ativo ? cor.destaque : cor.borda}`,
                        background: ativo ? cor.destaque : cor.fundo,
                        color: ativo ? '#FFFFFF' : cor.tintaMuted,
                        fontSize: 20, fontWeight: 800, cursor: 'pointer',
                      }}
                    >
                      {letra}
                    </button>
                  );
                })}
              </div>
              <p style={{ fontSize: 19, color: cor.destaqueTexto, fontWeight: 700, margin: `0 0 ${espaco.md}px` }}>
                {descreverDias(item.dias)}
              </p>

              {/* Confirmação individual, sempre começando desmarcada */}
              <button
                type="button"
                onClick={() => atualizar(i, 'conferido', !item.conferido)}
                aria-pressed={item.conferido}
                style={{
                  minHeight: toque.critico, width: '100%',
                  borderRadius: raio.botao,
                  border: `3px solid ${item.conferido ? '#16A34A' : cor.bordaForte}`,
                  background: item.conferido ? '#16A34A' : cor.fundo,
                  color: item.conferido ? '#FFFFFF' : cor.tinta,
                  fontSize: 22, fontWeight: 800, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: espaco.xs,
                }}
              >
                {item.conferido
                  ? <><Check size={32} strokeWidth={3} aria-hidden="true" /> Conferi, está certo</>
                  : <><X size={30} aria-hidden="true" /> Ainda não conferi</>}
              </button>
            </article>
          ))}

          {erro && <p role="alert" style={avisoErro}>{erro}</p>}

          <button
            type="button"
            onClick={salvar}
            disabled={conferidos === 0 || etapa === 'salvando'}
            style={{
              minHeight: toque.critico, width: '100%', marginTop: espaco.md,
              borderRadius: raio.botao, border: 'none',
              background: conferidos > 0 ? cor.destaque : cor.borda,
              color: '#FFFFFF', fontSize: 24, fontWeight: 800,
              cursor: conferidos > 0 ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: espaco.xs,
            }}
          >
            {etapa === 'salvando'
              ? <><Loader2 size={30} className="animate-spin" aria-hidden="true" /> Salvando...</>
              : conferidos === 0
                ? 'Marque o que estiver certo'
                : <>Salvar {conferidos} {conferidos === 1 ? 'remédio' : 'remédios'}</>}
          </button>

          <p style={{
            fontSize: 19, color: cor.tintaFraca, textAlign: 'center',
            lineHeight: 1.5, marginTop: espaco.lg,
          }}>
            A MelhorIA copia o que está escrito na receita. Ela não indica dose
            nem substitui seu médico.
          </p>
        </>
      )}
    </Pagina>
  );
}


const btnVoltar: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: espaco.xs,
  minHeight: toque.min, background: 'none', border: 'none',
  color: cor.destaqueTexto, fontSize: 21, fontWeight: 700,
  cursor: 'pointer', padding: 0, marginBottom: espaco.md,
};

const titulo: React.CSSProperties = {
  fontSize: 34, fontWeight: 800, color: cor.tinta,
  margin: `0 0 ${espaco.md}px`, lineHeight: 1.2,
};

const botaoSecundario: React.CSSProperties = {
  minHeight: toque.confortavel, width: '100%',
  borderRadius: raio.botao, border: `2px solid ${cor.borda}`,
  background: cor.fundo, color: cor.destaqueTexto,
  fontSize: 21, fontWeight: 700, cursor: 'pointer',
};

const avisoErro: React.CSSProperties = {
  background: cor.perigoBg, color: cor.perigoTexto,
  border: `2px solid ${cor.perigo}`, borderRadius: raio.card,
  padding: espaco.md, fontSize: 20, fontWeight: 600,
  lineHeight: 1.4, marginTop: espaco.md,
};
