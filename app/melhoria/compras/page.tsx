'use client';

// app/melhoria/compras/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Lista de compras. Grátis, sem crédito.
//
// ⚠️ ESTA PÁGINA FALTAVA. `R.compras()` era referenciada em três lugares — o
// atalho da tela inicial, o menu lateral e o botão "colocar na lista de
// compras" do aviso de estoque — e todos davam 404. Encontrado na auditoria
// comparando as rotas declaradas com as páginas existentes.
//
// ── O QUE FOI REAPROVEITADO ─────────────────────────────────────────────────
// O `parsearItens` é cópia do ListaComprasDisplay da minhAi: quebra em
// vírgula, " e " e " mais ", e separa a quantidade do nome. É o que faz
// "2 litros de leite, pão e café" virar três itens direito — inclusive quando
// vem do microfone.
//
// As tabelas são as mesmas: public.lista_compras e lista_compras_itens. Nada
// de tabela nova, e a lista continua visível na minhAi.
//
// ── O QUE MUDOU ─────────────────────────────────────────────────────────────
// Sem `playText` a cada item marcado. Numa lista de 20 itens, o aplicativo
// falando a cada toque vira tortura.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Check, Trash2, ShoppingCart, Loader2, RotateCcw } from 'lucide-react';
import { melhoriaAuth } from '@/lib/melhoria/supabase';
import CampoComDitado from '@/components/melhoria/CampoComDitado';
import { Pagina, IconeCentral, Carregando } from '@/components/melhoria/Chrome';
import { R } from '@/lib/melhoria/rotas';
import { cor, toque, raio, espaco } from '@/lib/melhoria/tema';

interface Item {
  id: string;
  nome: string;
  quantidade: string | null;
  pego: boolean;
  ordem: number;
}

/** Cópia do parsearItens do ListaComprasDisplay da minhAi. */
function parsearItens(texto: string): { nome: string; quantidade?: string }[] {
  const limpo = texto
    .replace(/\b(adicionar?|adiciona|coloca|inclui|incluir|quero|preciso de)\b/gi, '')
    .trim();

  const partes = limpo
    .split(/,|\se\s|\smais\s/i)
    .map((p) => p.trim())
    .filter(Boolean);

  return partes.map((parte) => {
    const m = parte.match(
      /^(\d+\s*(?:litros?|kg|g|gramas?|unidades?|dúzias?|pacotes?|caixas?)\s+(?:de\s+)?)?(.+)$/i,
    );
    return {
      nome: (m?.[2] ?? parte).trim(),
      quantidade: m?.[1]?.trim() || undefined,
    };
  });
}

export default function ComprasPage() {
  const router   = useRouter();
  const supabase = melhoriaAuth();

  const [carregando, setCarregando] = useState(true);
  const [listaId, setListaId]       = useState<string | null>(null);
  const [itens, setItens]           = useState<Item[]>([]);
  const [novo, setNovo]             = useState('');
  const [salvando, setSalvando]     = useState(false);
  const [erro, setErro]             = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const { data: sessao } = await supabase.auth.getUser();
    if (!sessao?.user) { router.replace(R.login()); return; }

    const { data: comp, error: erroRpc } = await supabase.rpc('ensure_my_melhoria_company');
    if (erroRpc) {
      setErro('Não consegui abrir sua conta. Tente de novo em instantes.');
      setCarregando(false);
      return;
    }
    const companyId = comp as unknown as string;

    // Uma lista aberta por vez. Criar lista nova a cada item deixaria a
    // pessoa com dez listas de um item — foi por isso que o botão de estoque
    // reaproveita a lista existente.
    let { data: listas } = await supabase
      .from('lista_compras')
      .select('id')
      .eq('company_id', companyId)
      .eq('status', 'aberta')
      .order('created_at', { ascending: false })
      .limit(1);

    let id = listas?.[0]?.id as string | undefined;

    if (!id) {
      const { data: nova } = await supabase
        .from('lista_compras')
        .insert({ company_id: companyId, nome: 'Minhas compras', status: 'aberta' })
        .select('id')
        .single();
      id = nova?.id;
    }

    if (!id) {
      setErro('Não consegui abrir sua lista. Tente de novo.');
      setCarregando(false);
      return;
    }

    setListaId(id);

    const { data: linhas } = await supabase
      .from('lista_compras_itens')
      .select('id, nome, quantidade, pego, ordem')
      .eq('lista_id', id)
      .order('ordem', { ascending: true });

    setItens((linhas as any) ?? []);
    setCarregando(false);
  }, [supabase, router]);

  useEffect(() => { carregar(); }, [carregar]);

  async function adicionar() {
    const texto = novo.trim();
    if (!texto || !listaId) return;

    setSalvando(true);
    setErro(null);

    const novos = parsearItens(texto);
    const base = itens.length;

    const { data, error } = await supabase
      .from('lista_compras_itens')
      .insert(
        novos.map((n, i) => ({
          lista_id: listaId,
          nome: n.nome,
          quantidade: n.quantidade ?? null,
          pego: false,
          ordem: base + i + 1,
        })),
      )
      .select('id, nome, quantidade, pego, ordem');

    if (error) {
      setErro('Não consegui salvar. Verifique a internet e tente de novo.');
    } else {
      setItens([...itens, ...((data as any) ?? [])]);
      setNovo('');
    }
    setSalvando(false);
  }

  async function alternar(item: Item) {
    // Otimista: numa rede ruim de interior, esperar o servidor faz a pessoa
    // tocar de novo achando que não pegou.
    const antes = itens;
    setItens(itens.map((i) => (i.id === item.id ? { ...i, pego: !i.pego } : i)));

    const { error } = await supabase
      .from('lista_compras_itens')
      .update({ pego: !item.pego })
      .eq('id', item.id);

    if (error) setItens(antes);
  }

  async function remover(id: string) {
    const antes = itens;
    setItens(itens.filter((i) => i.id !== id));
    const { error } = await supabase.from('lista_compras_itens').delete().eq('id', id);
    if (error) setItens(antes);
  }

  async function limparPegos() {
    const pegos = itens.filter((i) => i.pego).map((i) => i.id);
    if (pegos.length === 0) return;

    const antes = itens;
    setItens(itens.filter((i) => !i.pego));

    const { error } = await supabase.from('lista_compras_itens').delete().in('id', pegos);
    if (error) setItens(antes);
  }

  if (carregando) {
    return <Pagina voltarPara={R.app()} semRodape><Carregando /></Pagina>;
  }

  const pendentes = itens.filter((i) => !i.pego);
  const pegos     = itens.filter((i) => i.pego);

  return (
    <Pagina voltarPara={R.app()}>
      <h1 style={{
        fontSize: 34, fontWeight: 800, color: cor.tinta,
        margin: `0 0 ${espaco.xs}px`, lineHeight: 1.2,
      }}>
        Lista de compras
      </h1>

      <p style={{ fontSize: 19, color: cor.tintaMuted, margin: `0 0 ${espaco.lg}px` }}>
        {itens.length === 0
          ? 'Escreva ou fale o que precisa comprar.'
          : `${pegos.length} de ${itens.length} já no carrinho`}
      </p>

      {/* Adicionar */}
      <CampoComDitado
        rotulo="O que comprar"
        ajuda="Pode escrever vários de uma vez: “leite, pão e café”."
        exemplo="2 litros de leite"
        valor={novo}
        aoMudar={setNovo}
      />

      <button
        type="button"
        onClick={adicionar}
        disabled={!novo.trim() || salvando}
        style={{
          minHeight: toque.confortavel, width: '100%',
          borderRadius: raio.botao, border: 'none',
          background: novo.trim() ? cor.destaque : cor.borda,
          color: '#FFFFFF', fontSize: 23, fontWeight: 800,
          cursor: novo.trim() ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: espaco.xs,
          marginBottom: espaco.lg,
        }}
      >
        {salvando
          ? <><Loader2 size={28} className="animate-spin" aria-hidden="true" /> Salvando...</>
          : <><Plus size={30} strokeWidth={3} aria-hidden="true" /> Adicionar</>}
      </button>

      {erro && (
        <p role="alert" style={{
          background: cor.perigoBg, color: cor.perigoTexto,
          border: `2px solid ${cor.perigo}`, borderRadius: raio.card,
          padding: espaco.md, fontSize: 20, fontWeight: 600,
          lineHeight: 1.4, marginBottom: espaco.md,
        }}>
          {erro}
        </p>
      )}

      {itens.length === 0 && (
        <div style={{
          background: cor.fundoCard, border: `2px dashed ${cor.borda}`,
          borderRadius: raio.card, padding: espaco.xl, marginBottom: espaco.lg,
        }}>
          <IconeCentral margemAbaixo={0}>
            <ShoppingCart size={64} style={{ color: cor.destaque }} />
          </IconeCentral>
          <p style={{
            fontSize: 24, fontWeight: 700, color: cor.tinta,
            margin: `${espaco.md}px 0 0`, lineHeight: 1.3,
          }}>
            Sua lista está vazia
          </p>
        </div>
      )}

      {/* A comprar */}
      {pendentes.map((item) => (
        <ItemLinha key={item.id} item={item} aoAlternar={alternar} aoRemover={remover} />
      ))}

      {/* No carrinho */}
      {pegos.length > 0 && (
        <>
          <h2 style={{
            fontSize: 24, fontWeight: 700, color: cor.tintaMuted,
            margin: `${espaco.lg}px 0 ${espaco.md}px`,
          }}>
            Já peguei
          </h2>

          {pegos.map((item) => (
            <ItemLinha key={item.id} item={item} aoAlternar={alternar} aoRemover={remover} />
          ))}

          <button
            type="button"
            onClick={limparPegos}
            style={{
              minHeight: toque.confortavel, width: '100%', marginTop: espaco.md,
              borderRadius: raio.botao, border: `2px solid ${cor.borda}`,
              background: cor.fundo, color: cor.tintaMuted,
              fontSize: 20, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: espaco.xs,
            }}
          >
            <RotateCcw size={26} aria-hidden="true" />
            Tirar da lista o que já peguei
          </button>
        </>
      )}
    </Pagina>
  );
}

function ItemLinha({
  item, aoAlternar, aoRemover,
}: {
  item: Item;
  aoAlternar: (i: Item) => void;
  aoRemover: (id: string) => void;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: espaco.xs,
      marginBottom: espaco.sm,
    }}>
      <button
        type="button"
        onClick={() => aoAlternar(item)}
        aria-pressed={item.pego}
        style={{
          flex: 1, minHeight: toque.confortavel,
          display: 'flex', alignItems: 'center', gap: espaco.sm,
          padding: `${espaco.xs}px ${espaco.md}px`,
          borderRadius: raio.card,
          border: `3px solid ${item.pego ? '#16A34A' : cor.borda}`,
          background: item.pego ? cor.okBg : cor.fundo,
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{
          flexShrink: 0, width: 40, height: 40, borderRadius: 10,
          border: `3px solid ${item.pego ? '#16A34A' : cor.bordaForte}`,
          background: item.pego ? '#16A34A' : cor.fundo,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {item.pego && <Check size={26} strokeWidth={4} color="#FFFFFF" />}
        </span>

        <span style={{
          fontSize: 22, fontWeight: 600,
          color: item.pego ? cor.okTexto : cor.tinta,
          textDecoration: item.pego ? 'line-through' : 'none',
          lineHeight: 1.3,
        }}>
          {item.quantidade ? `${item.quantidade} ` : ''}{item.nome}
        </span>
      </button>

      <button
        type="button"
        onClick={() => aoRemover(item.id)}
        aria-label={`Remover ${item.nome}`}
        style={{
          minWidth: toque.min, minHeight: toque.min, flexShrink: 0,
          borderRadius: raio.botao, border: `2px solid ${cor.borda}`,
          background: cor.fundo, color: cor.perigo, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 0,
        }}
      >
        <Trash2 size={26} />
      </button>
    </div>
  );
}
