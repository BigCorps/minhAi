'use client';

// app/melhoria/familia/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Painel da família. É a tela do CUIDADOR, não do idoso.
//
// O que faz alguém pagar todo mês não é o alarme — é o "papai tomou 94% dos
// remédios essa semana". Por isso a aderência vem em cima de tudo, e o
// relatório em PDF fica a um toque.
//
// Duas coisas ficam de fora de propósito:
//   · nenhuma interpretação do número. O painel não diz "adesão ruim" nem
//     "atenção ao tratamento" — mostra o dado e para por aí. Quem interpreta é
//     o médico.
//   · nenhuma comparação entre pessoas ou com "a média". Transformar cuidado
//     em placar é o caminho mais curto para culpa.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Loader2, UserPlus, Copy, Check, TrendingUp, CalendarDays } from 'lucide-react';
import { melhoriaAuth, createMelhoriaClient } from '@/lib/melhoria/supabase';
import CampoComDitado from '@/components/melhoria/CampoComDitado';
import { gerarRelatorioAdesao, type DoseRegistro } from '@/lib/melhoria/relatorioPDF';
import { cor, toque, raio, espaco, descreverDias } from '@/lib/melhoria/tema';
import { Pagina } from '@/components/melhoria/Chrome';

interface Acompanhado {
  perfil_id: string;
  nome: string;
  eh_dono: boolean;
  pode_editar: boolean;
}

interface Aderencia {
  total: number; tomados: number; pulados: number;
  perdidos: number; pendentes: number; percentual: number;
}

const PERIODOS = [7, 30, 90] as const;

export default function FamiliaPage() {
  const router   = useRouter();
  const supabase = melhoriaAuth();
  const mel      = createMelhoriaClient();

  const [carregando, setCarregando] = useState(true);
  const [acompanhados, setAcompanhados] = useState<Acompanhado[]>([]);
  const [ativo, setAtivo]         = useState<Acompanhado | null>(null);
  const [periodo, setPeriodo]     = useState<number>(7);
  const [aderencia, setAderencia] = useState<Aderencia | null>(null);
  const [proximos, setProximos]   = useState<any[]>([]);
  const [gerando, setGerando]     = useState(false);

  const [nomeConvite, setNomeConvite] = useState('');
  const [parentesco, setParentesco]   = useState('');
  const [linkConvite, setLinkConvite] = useState<string | null>(null);
  const [copiado, setCopiado]         = useState(false);
  const [erro, setErro]               = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const { data: sessao } = await supabase.auth.getUser();
    if (!sessao?.user) { router.replace('/melhoria/login'); return; }

    const { data } = await supabase.rpc('melhoria_meus_acompanhados');
    const lista = (data as Acompanhado[]) ?? [];
    setAcompanhados(lista);
    setAtivo((a) => a ?? lista[0] ?? null);
    setCarregando(false);
  }, [supabase, router]);

  useEffect(() => { carregar(); }, [carregar]);

  // Aderência + próximos compromissos do perfil selecionado
  useEffect(() => {
    if (!ativo) return;

    (async () => {
      const [{ data: ad }, { data: ag }] = await Promise.all([
        supabase.rpc('melhoria_aderencia', { p_perfil_id: ativo.perfil_id, p_dias: periodo }),
        mel.from('agendamentos')
           .select('id, titulo, tipo, data_hora, local')
           .eq('perfil_id', ativo.perfil_id)
           .gte('data_hora', new Date().toISOString())
           .neq('status', 'cancelado')
           .order('data_hora', { ascending: true })
           .limit(3),
      ]);

      setAderencia(Array.isArray(ad) ? ad[0] : ad);
      setProximos((ag as any) ?? []);

      // LGPD: acesso de terceiro a dado de saúde fica registrado. A função
      // ignora sozinha quando é o próprio dono olhando.
      if (!ativo.eh_dono) {
        supabase.rpc('melhoria_registrar_acesso', {
          p_perfil_id: ativo.perfil_id,
          p_recurso: 'painel_familia',
          p_acao: 'visualizou',
        });
      }
    })();
  }, [ativo, periodo, supabase, mel]);

  async function gerarPDF() {
    if (!ativo) return;
    setGerando(true);
    setErro(null);

    try {
      const inicio = new Date(Date.now() - periodo * 86_400_000);

      const [{ data: eventos }, { data: meds }, { data: perfil }] = await Promise.all([
        mel.from('dose_eventos')
           .select(`previsto_para, status, confirmado_em,
                    doses!inner ( medicamentos!inner ( nome, dosagem ) )`)
           .eq('perfil_id', ativo.perfil_id)
           .gte('previsto_para', inicio.toISOString())
           .lte('previsto_para', new Date().toISOString())
           .order('previsto_para', { ascending: true }),
        mel.from('medicamentos')
           .select('nome, dosagem, doses ( horario, dias_semana, ativo )')
           .eq('perfil_id', ativo.perfil_id).eq('ativo', true),
        mel.from('perfis').select('nome, data_nascimento').eq('id', ativo.perfil_id).single(),
      ]);

      const registros: DoseRegistro[] = ((eventos as any[]) ?? []).map((e) => ({
        previsto_para: e.previsto_para,
        status: e.status,
        confirmado_em: e.confirmado_em,
        medicamento_nome: e.doses?.medicamentos?.nome ?? 'Remédio',
        medicamento_dosagem: e.doses?.medicamentos?.dosagem ?? null,
      }));

      const medicamentosAtivos = ((meds as any[]) ?? []).map((m) => {
        const ativas = (m.doses ?? []).filter((d: any) => d.ativo);
        return {
          nome: m.nome,
          dosagem: m.dosagem,
          horarios: ativas.map((d: any) => String(d.horario).slice(0, 5)).sort(),
          dias: descreverDias(ativas[0]?.dias_semana ?? []),
        };
      });

      const uri = gerarRelatorioAdesao({
        nomePaciente: perfil?.nome ?? ativo.nome,
        dataNascimento: perfil?.data_nascimento ?? null,
        periodoInicio: inicio,
        periodoFim: new Date(),
        registros,
        medicamentosAtivos,
      });

      // Mesmo padrão de download do ConsultarCpfModal.
      const link = document.createElement('a');
      link.href = uri;
      link.download = `medicacao-${ativo.nome.split(' ')[0].toLowerCase()}-${periodo}dias.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (!ativo.eh_dono) {
        supabase.rpc('melhoria_registrar_acesso', {
          p_perfil_id: ativo.perfil_id,
          p_recurso: 'relatorio_pdf',
          p_acao: 'baixou',
        });
      }
    } catch (e) {
      console.error(e);
      setErro('Não consegui gerar o relatório. Tente de novo.');
    } finally {
      setGerando(false);
    }
  }

  async function convidar() {
    if (nomeConvite.trim().length < 2) {
      setErro('Escreva o nome de quem você quer convidar.');
      return;
    }
    setErro(null);

    const { data, error } = await supabase.rpc('melhoria_criar_convite', {
      p_nome: nomeConvite.trim(),
      p_parentesco: parentesco.trim() || null,
      p_pode_editar: true,
    });

    if (error) { setErro('Não consegui criar o convite.'); return; }

    const linha = Array.isArray(data) ? data[0] : data;
    setLinkConvite(`https://melhoria.org/melhoria/convite?t=${linha.token}`);
    setNomeConvite('');
    setParentesco('');
  }

  async function copiarLink() {
    if (!linkConvite) return;
    await navigator.clipboard.writeText(linkConvite);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  }

  if (carregando) {
    return (
      <Pagina voltarPara="/melhoria">
        <div style={{ textAlign: 'center', paddingTop: 80 }}>
          <Loader2 size={56} className="animate-spin" style={{ color: cor.destaque }} />
        </div>
      </Pagina>
    );
  }

  return (
    <Pagina voltarPara="/melhoria">
      <h1 style={{ fontSize: 34, fontWeight: 800, color: cor.tinta, margin: `0 0 ${espaco.md}px`, lineHeight: 1.2 }}>
        Acompanhamento
      </h1>

      {/* Seletor de pessoa — só aparece com mais de uma */}
      {acompanhados.length > 1 && (
        <div style={{ display: 'flex', gap: espaco.sm, marginBottom: espaco.lg, flexWrap: 'wrap' }}>
          {acompanhados.map((a) => (
            <button
              key={a.perfil_id}
              type="button"
              onClick={() => setAtivo(a)}
              aria-pressed={ativo?.perfil_id === a.perfil_id}
              style={{
                minHeight: toque.min, padding: `0 ${espaco.md}px`,
                borderRadius: raio.botao,
                border: `3px solid ${ativo?.perfil_id === a.perfil_id ? cor.destaque : cor.borda}`,
                background: ativo?.perfil_id === a.perfil_id ? cor.destaqueSuave : cor.fundo,
                color: cor.tinta, fontSize: 20, fontWeight: 700, cursor: 'pointer',
              }}
            >
              {a.nome.split(' ')[0]}
            </button>
          ))}
        </div>
      )}

      {/* Período */}
      <div style={{ display: 'flex', gap: espaco.sm, marginBottom: espaco.lg }}>
        {PERIODOS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setPeriodo(d)}
            aria-pressed={periodo === d}
            style={{
              flex: 1, minHeight: toque.min, borderRadius: raio.botao,
              border: `3px solid ${periodo === d ? cor.destaque : cor.borda}`,
              background: periodo === d ? cor.destaque : cor.fundo,
              color: periodo === d ? '#FFFFFF' : cor.tintaMuted,
              fontSize: 19, fontWeight: 700, cursor: 'pointer',
            }}
          >
            {d} dias
          </button>
        ))}
      </div>

      {/* Aderência — sem juízo de valor */}
      {aderencia && (
        <section style={{
          background: cor.fundoCard, border: `3px solid ${cor.borda}`,
          borderRadius: raio.card, padding: espaco.lg, marginBottom: espaco.lg,
        }}>
          {aderencia.total === 0 ? (
            <p style={{ fontSize: 21, color: cor.tintaMuted, textAlign: 'center', margin: 0, lineHeight: 1.5 }}>
              Ainda não há doses registradas neste período.
            </p>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: espaco.sm, justifyContent: 'center' }}>
                <span style={{ fontSize: 64, fontWeight: 800, color: cor.destaqueTexto, lineHeight: 1 }}>
                  {aderencia.percentual}%
                </span>
                <TrendingUp size={34} style={{ color: cor.destaque }} aria-hidden="true" />
              </div>

              <p style={{
                fontSize: 22, fontWeight: 700, color: cor.tinta,
                textAlign: 'center', margin: `${espaco.sm}px 0 0`, lineHeight: 1.4,
              }}>
                {aderencia.tomados} de {aderencia.total} doses marcadas como tomadas
              </p>

              {(aderencia.perdidos > 0 || aderencia.pulados > 0) && (
                <p style={{
                  fontSize: 20, color: cor.tintaMuted,
                  textAlign: 'center', margin: `${espaco.xs}px 0 0`, lineHeight: 1.4,
                }}>
                  {aderencia.pulados > 0 && `${aderencia.pulados} marcadas como não tomadas`}
                  {aderencia.pulados > 0 && aderencia.perdidos > 0 && ' · '}
                  {aderencia.perdidos > 0 && `${aderencia.perdidos} sem confirmação`}
                </p>
              )}
            </>
          )}
        </section>
      )}

      <button
        type="button"
        onClick={gerarPDF}
        disabled={gerando || !aderencia?.total}
        style={{
          minHeight: toque.critico, width: '100%',
          borderRadius: raio.botao, border: 'none',
          background: aderencia?.total ? cor.destaque : cor.borda,
          color: '#FFFFFF', fontSize: 23, fontWeight: 800,
          cursor: aderencia?.total ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: espaco.xs,
        }}
      >
        {gerando
          ? <><Loader2 size={30} className="animate-spin" aria-hidden="true" /> Gerando...</>
          : <><FileText size={32} aria-hidden="true" /> Relatório para o médico</>}
      </button>

      {/* Próximos compromissos */}
      {proximos.length > 0 && (
        <section style={{ marginTop: espaco.xl }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: cor.tinta, margin: `0 0 ${espaco.md}px` }}>
            Próximos compromissos
          </h2>
          {proximos.map((c) => (
            <div key={c.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: espaco.sm,
              background: cor.fundoSuave, border: `2px solid ${cor.borda}`,
              borderRadius: raio.card, padding: espaco.md, marginBottom: espaco.sm,
            }}>
              <CalendarDays size={28} style={{ color: cor.destaque, flexShrink: 0 }} aria-hidden="true" />
              <div>
                <p style={{ fontSize: 21, fontWeight: 700, color: cor.tinta, margin: 0 }}>
                  {c.titulo}
                </p>
                <p style={{ fontSize: 19, color: cor.tintaMuted, margin: '2px 0 0' }}>
                  {new Intl.DateTimeFormat('pt-BR', {
                    day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit',
                    timeZone: 'America/Sao_Paulo',
                  }).format(new Date(c.data_hora))}
                  {c.local && ` — ${c.local}`}
                </p>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Convidar — só quem é dono do perfil */}
      {ativo?.eh_dono && (
        <section style={{
          background: cor.fundoSuave, border: `2px dashed ${cor.borda}`,
          borderRadius: raio.card, padding: espaco.md, marginTop: espaco.xl,
        }}>
          <h2 style={{
            display: 'flex', alignItems: 'center', gap: espaco.xs,
            fontSize: 24, fontWeight: 700, color: cor.tinta, margin: `0 0 ${espaco.xs}px`,
          }}>
            <UserPlus size={30} style={{ color: cor.destaque }} aria-hidden="true" />
            Convidar alguém da família
          </h2>
          <p style={{ fontSize: 19, color: cor.tintaMuted, margin: `0 0 ${espaco.md}px`, lineHeight: 1.45 }}>
            A pessoa convidada vai ver seus remédios e seus compromissos, e será
            avisada se você não confirmar uma dose. Você pode remover o acesso
            quando quiser.
          </p>

          {linkConvite ? (
            <>
              <p style={{
                background: cor.destaqueSuave, color: cor.destaqueTexto,
                borderRadius: raio.campo, padding: espaco.md,
                fontSize: 19, fontWeight: 600, lineHeight: 1.45, margin: `0 0 ${espaco.sm}px`,
              }}>
                Convite criado. Mande este link para a pessoa. Ele vale 7 dias e
                só pode ser usado uma vez.
              </p>

              <button type="button" onClick={copiarLink} style={{
                minHeight: toque.confortavel, width: '100%',
                borderRadius: raio.botao, border: `2px solid ${cor.borda}`,
                background: copiado ? cor.okBg : cor.fundo,
                color: copiado ? cor.okTexto : cor.tinta,
                fontSize: 21, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: espaco.xs,
              }}>
                {copiado
                  ? <><Check size={28} strokeWidth={3} aria-hidden="true" /> Link copiado</>
                  : <><Copy size={28} aria-hidden="true" /> Copiar o link</>}
              </button>

              <button type="button" onClick={() => setLinkConvite(null)} style={{
                minHeight: toque.min, width: '100%', marginTop: espaco.sm,
                background: 'none', border: 'none', color: cor.destaqueTexto,
                fontSize: 20, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline',
              }}>
                Convidar outra pessoa
              </button>
            </>
          ) : (
            <>
              <CampoComDitado rotulo="Nome" exemplo="João" valor={nomeConvite} aoMudar={setNomeConvite} />
              <CampoComDitado rotulo="Quem é" ajuda="Opcional." exemplo="Meu filho"
                              valor={parentesco} aoMudar={setParentesco} />
              <button type="button" onClick={convidar} style={{
                minHeight: toque.confortavel, width: '100%',
                borderRadius: raio.botao, border: 'none',
                background: cor.destaque, color: '#FFFFFF',
                fontSize: 22, fontWeight: 800, cursor: 'pointer',
              }}>
                Criar convite
              </button>
            </>
          )}
        </section>
      )}

      {erro && (
        <p role="alert" style={{
          background: cor.perigoBg, color: cor.perigoTexto,
          border: `2px solid ${cor.perigo}`, borderRadius: raio.card,
          padding: espaco.md, fontSize: 20, fontWeight: 600,
          lineHeight: 1.4, marginTop: espaco.md,
        }}>
          {erro}
        </p>
      )}

      <p style={{
        fontSize: 19, color: cor.tintaFraca, textAlign: 'center',
        lineHeight: 1.5, margin: `${espaco.xl}px 0 0`,
      }}>
        Uma dose marcada como tomada quer dizer que alguém confirmou no
        aplicativo. Doses sem confirmação podem ter sido tomadas sem ninguém
        marcar.
      </p>
    </Pagina>
  );
}


