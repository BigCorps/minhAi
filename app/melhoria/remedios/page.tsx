'use client';

// app/melhoria/remedios/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Lista dos remédios cadastrados. Fecha a Fase 1.
//
// O aviso de estoque acabando leva direto para a lista de compras — é o ciclo
// que não existe em nenhum outro lugar: o aplicativo percebe que vai faltar e
// resolve num toque. A lista de compras vive em public.lista_compras (núcleo
// compartilhado), não no schema melhoria, então usa o cliente padrão.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Plus, Pill, Clock, PackageOpen, ShoppingCart, Loader2, Check,
} from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { createMelhoriaClient } from '@/lib/melhoria/supabase';
import {
  cor, fonte, px, toque, raio, espaco, descreverDias,
  type TamanhoFonte,
} from '@/lib/melhoria/tema';

interface Remedio {
  id: string;
  nome: string;
  dosagem: string | null;
  forma: string | null;
  estoque_atual: number | null;
  estoque_alerta: number | null;
  ativo: boolean;
  revisado: boolean;
  origem: string;
  doses: { horario: string; dias_semana: number[]; ativo: boolean }[];
}

export default function RemediosPage() {
  const router   = useRouter();
  const supabase = createClient();
  const mel      = createMelhoriaClient();

  const [carregando, setCarregando] = useState(true);
  const [remedios, setRemedios]     = useState<Remedio[]>([]);
  const [addLista, setAddLista]     = useState<string | null>(null);
  const [addOk, setAddOk]           = useState<string | null>(null);
  const escala: TamanhoFonte = 'grande';

  const carregar = useCallback(async () => {
    const { data: sessao } = await supabase.auth.getUser();
    if (!sessao?.user) { router.replace('/melhoria/login'); return; }

    const { data } = await mel
      .from('medicamentos')
      .select(`
        id, nome, dosagem, forma, estoque_atual, estoque_alerta,
        ativo, revisado, origem,
        doses ( horario, dias_semana, ativo )
      `)
      .eq('ativo', true)
      .order('nome');

    setRemedios((data as any as Remedio[]) ?? []);
    setCarregando(false);
  }, [supabase, mel, router]);

  useEffect(() => { carregar(); }, [carregar]);

  // ── Estoque acabando → lista de compras ───────────────────────────────────
  async function adicionarNaLista(r: Remedio) {
    setAddLista(r.id);
    try {
      const { data: comp } = await supabase.rpc('ensure_my_melhoria_company');
      const companyId = comp as unknown as string;

      // Reaproveita a lista aberta, se houver. Criar uma lista nova a cada
      // remédio deixaria a pessoa com dez listas de um item.
      let { data: listas } = await supabase
        .from('lista_compras')
        .select('id')
        .eq('company_id', companyId)
        .eq('status', 'aberta')
        .limit(1);

      let listaId = listas?.[0]?.id;

      if (!listaId) {
        const { data: nova } = await supabase
          .from('lista_compras')
          .insert({ company_id: companyId, nome: 'Minhas compras', status: 'aberta' })
          .select('id')
          .single();
        listaId = nova?.id;
      }

      if (!listaId) throw new Error('sem lista');

      await supabase.from('lista_compras_itens').insert({
        lista_id: listaId,
        nome: [r.nome, r.dosagem].filter(Boolean).join(' '),
        quantidade: '1 caixa',
        pego: false,
      });

      setAddOk(r.id);
      setTimeout(() => setAddOk(null), 4000);
    } catch (e) {
      console.error(e);
    } finally {
      setAddLista(null);
    }
  }

  if (carregando) {
    return (
      <main style={pagina}>
        <div style={{ textAlign: 'center', paddingTop: 80 }}>
          <Loader2 size={56} className="animate-spin" style={{ color: cor.destaque }} />
        </div>
      </main>
    );
  }

  return (
    <main style={pagina}>
      <button type="button" onClick={() => router.push('/melhoria')} style={btnVoltar}>
        <ArrowLeft size={30} aria-hidden="true" /> Voltar
      </button>

      <h1 style={{ fontSize: 38, fontWeight: 800, color: cor.tinta, margin: `0 0 ${espaco.lg}px` }}>
        Meus remédios
      </h1>

      {remedios.length === 0 && (
        <div style={{
          background: cor.fundoCard, border: `2px dashed ${cor.borda}`,
          borderRadius: raio.card, padding: espaco.xl, textAlign: 'center',
          marginBottom: espaco.lg,
        }}>
          <Pill size={64} style={{ color: cor.destaque }} aria-hidden="true" />
          <p style={{ fontSize: 26, fontWeight: 700, color: cor.tinta, margin: `${espaco.md}px 0 0` }}>
            Nenhum remédio cadastrado ainda
          </p>
        </div>
      )}

      {remedios.map((r) => {
        const doses = (r.doses ?? []).filter((d) => d.ativo);
        const horarios = doses.map((d) => d.horario.slice(0, 5)).sort();
        const dias = doses[0]?.dias_semana ?? [];

        const acabando =
          r.estoque_atual != null &&
          r.estoque_alerta != null &&
          r.estoque_atual <= r.estoque_alerta;

        return (
          <article key={r.id} style={{
            background: cor.fundoCard, border: `3px solid ${acabando ? '#D97706' : cor.borda}`,
            borderRadius: raio.card, padding: espaco.md, marginBottom: espaco.md,
          }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: cor.tinta, margin: 0, lineHeight: 1.25 }}>
              {r.nome}
              {r.dosagem && (
                <span style={{ fontWeight: 600, color: cor.tintaMuted }}> {r.dosagem}</span>
              )}
            </h2>

            {/* Remédio vindo de foto de receita e ainda não conferido não
                gera lembrete — a materialização exige revisado = true. */}
            {!r.revisado && r.origem === 'receita_ia' && (
              <p style={{
                background: cor.atencaoBg, color: cor.atencaoTexto,
                border: '2px solid #D97706', borderRadius: raio.campo,
                padding: espaco.sm, fontSize: 19, fontWeight: 700,
                margin: `${espaco.sm}px 0 0`, lineHeight: 1.4,
              }}>
                Este remédio foi lido de uma foto e ainda não foi conferido.
                Enquanto isso, não vamos avisar nos horários.
              </p>
            )}

            {horarios.length > 0 && (
              <p style={{
                display: 'flex', alignItems: 'center', gap: espaco.xs,
                fontSize: px(fonte.corpo, escala), color: cor.tinta,
                margin: `${espaco.sm}px 0 0`, fontWeight: 600,
              }}>
                <Clock size={26} style={{ color: cor.destaque }} aria-hidden="true" />
                {horarios.join(', ')} — {descreverDias(dias)}
              </p>
            )}

            {r.estoque_atual != null && (
              <p style={{
                display: 'flex', alignItems: 'center', gap: espaco.xs,
                fontSize: px(fonte.corpo, escala),
                color: acabando ? cor.atencaoTexto : cor.tintaMuted,
                fontWeight: acabando ? 700 : 500,
                margin: `${espaco.xs}px 0 0`,
              }}>
                <PackageOpen size={26} aria-hidden="true" />
                {acabando
                  ? `Está acabando: restam ${r.estoque_atual}`
                  : `Você tem ${r.estoque_atual} em casa`}
              </p>
            )}

            {acabando && (
              <button
                type="button"
                onClick={() => adicionarNaLista(r)}
                disabled={addLista === r.id || addOk === r.id}
                style={{
                  minHeight: toque.min, width: '100%', marginTop: espaco.md,
                  borderRadius: raio.botao, border: 'none',
                  background: addOk === r.id ? cor.okBg : cor.destaque,
                  color: addOk === r.id ? cor.okTexto : '#FFFFFF',
                  fontSize: 21, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: espaco.xs,
                }}
              >
                {addLista === r.id ? (
                  <><Loader2 size={26} className="animate-spin" aria-hidden="true" /> Adicionando...</>
                ) : addOk === r.id ? (
                  <><Check size={28} strokeWidth={3} aria-hidden="true" /> Está na lista de compras</>
                ) : (
                  <><ShoppingCart size={26} aria-hidden="true" /> Colocar na lista de compras</>
                )}
              </button>
            )}
          </article>
        );
      })}

      <button
        type="button"
        onClick={() => router.push('/melhoria/remedios/novo')}
        style={{
          minHeight: toque.critico, width: '100%', marginTop: espaco.md,
          borderRadius: raio.botao, border: 'none',
          background: cor.destaque, color: '#FFFFFF',
          fontSize: 26, fontWeight: 800, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: espaco.xs,
        }}
      >
        <Plus size={34} strokeWidth={3} aria-hidden="true" />
        Cadastrar remédio
      </button>
    </main>
  );
}

const pagina: React.CSSProperties = {
  background: cor.fundo, minHeight: '100dvh', maxWidth: 640,
  margin: '0 auto', padding: `${espaco.lg}px ${espaco.md}px ${espaco.xl}px`,
  color: cor.tinta,
};

const btnVoltar: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: espaco.xs,
  minHeight: toque.min, background: 'none', border: 'none',
  color: cor.destaqueTexto, fontSize: 21, fontWeight: 700,
  cursor: 'pointer', padding: 0, marginBottom: espaco.md,
};
