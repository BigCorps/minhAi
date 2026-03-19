'use client';

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useAssistant } from '@/contexts/AssistantContext';
import { useRouter } from 'next/navigation';
import {
  ShoppingCart,
  Package,
  TrendingUp,
  ClipboardList,
  Loader2,
  RefreshCw,
  Plus,
  Search,
  Download,
  ChevronDown,
  ChevronUp,
  Filter,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  BarChart2,
} from 'lucide-react';
import type { ProdutoVenda, Pedido } from '@/lib/produtos-venda';
import { formatarPreco } from '@/lib/produtos-venda';

// ─── Tipos locais ─────────────────────────────────────────────────────────────

type Aba = 'visao_geral' | 'produtos' | 'pedidos';

type StatusPedido = Pedido['status'] | 'todos';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0)
    return `Hoje, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  if (diffDays === 1)
    return `Ontem, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  if (diffDays < 7) return `${diffDays} dias atrás`;
  return date.toLocaleDateString('pt-BR');
}

function StatusBadge({ status }: { status: Pedido['status'] }) {
  const map: Record<Pedido['status'], { label: string; cls: string; Icon: any }> = {
    aberto:               { label: 'Aberto',              cls: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300',             Icon: Clock },
    aguardando_pagamento: { label: 'Aguard. Pagamento',   cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400',   Icon: Clock },
    pago:                 { label: 'Pago',                cls: 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400',       Icon: CheckCircle2 },
    cancelado:            { label: 'Cancelado',           cls: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400',               Icon: XCircle },
    entregue:             { label: 'Entregue',            cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',           Icon: CheckCircle2 },
  };
  const { label, cls, Icon } = map[status] ?? map.aberto;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight ${cls}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

// ─── Aba: Visão Geral ─────────────────────────────────────────────────────────

function VisaoGeral({
  companyId,
  onIrParaProdutos,
  onIrParaPedidos,
}: {
  companyId: string;
  onIrParaProdutos: () => void;
  onIrParaPedidos: () => void;
}) {
  const supabase = createClient();
  const [stats, setStats] = useState({
    totalProdutos: 0,
    produtosAtivos: 0,
    produtosEstoqueBaixo: 0,
    totalPedidos: 0,
    pedidosPagos: 0,
    receitaTotal: 0,
    receitaHoje: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [{ data: prods }, { data: pedidos }] = await Promise.all([
          supabase.from('produtos_venda').select('*').eq('company_id', companyId),
          supabase.from('pedidos').select('*').eq('company_id', companyId),
        ]);

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const pedidosPagos = (pedidos ?? []).filter((p: any) => p.status === 'pago');
        const receitaTotal = pedidosPagos.reduce((acc: number, p: any) => acc + Number(p.total), 0);
        const receitaHoje = pedidosPagos
          .filter((p: any) => new Date(p.paid_at) >= hoje)
          .reduce((acc: number, p: any) => acc + Number(p.total), 0);

        setStats({
          totalProdutos: (prods ?? []).length,
          produtosAtivos: (prods ?? []).filter((p: any) => p.is_active).length,
          produtosEstoqueBaixo: (prods ?? []).filter(
            (p: any) => p.controla_estoque && p.estoque_atual <= p.estoque_minimo,
          ).length,
          totalPedidos: (pedidos ?? []).length,
          pedidosPagos: pedidosPagos.length,
          receitaTotal,
          receitaHoje,
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [companyId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  const cards = [
    {
      label: 'Receita hoje',
      value: formatarPreco(stats.receitaHoje),
      sub: `Total: ${formatarPreco(stats.receitaTotal)}`,
      icon: TrendingUp,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    },
    {
      label: 'Pedidos pagos',
      value: stats.pedidosPagos.toString(),
      sub: `${stats.totalPedidos} no total`,
      icon: ClipboardList,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-500/10',
      onClick: onIrParaPedidos,
    },
    {
      label: 'Produtos ativos',
      value: stats.produtosAtivos.toString(),
      sub: `${stats.totalProdutos} cadastrados`,
      icon: Package,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-500/10',
      onClick: onIrParaProdutos,
    },
    {
      label: 'Estoque baixo',
      value: stats.produtosEstoqueBaixo.toString(),
      sub: stats.produtosEstoqueBaixo > 0 ? 'Produtos precisam de reposição' : 'Tudo em ordem',
      icon: AlertCircle,
      color:
        stats.produtosEstoqueBaixo > 0
          ? 'text-amber-600 dark:text-amber-400'
          : 'text-gray-400 dark:text-gray-500',
      bg:
        stats.produtosEstoqueBaixo > 0
          ? 'bg-amber-50 dark:bg-amber-500/10'
          : 'bg-gray-50 dark:bg-white/5',
      onClick: stats.produtosEstoqueBaixo > 0 ? onIrParaProdutos : undefined,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              onClick={card.onClick}
              className={`bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-100 dark:border-white/5 shadow-sm ${
                card.onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${card.bg}`}>
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">{card.label}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{card.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Atalhos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={onIrParaProdutos}
          className="flex items-center gap-4 p-5 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all text-left group"
        >
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-500/20 transition-colors">
            <Package className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">Gerenciar Produtos</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Cadastrar, editar preços e controlar estoque
            </p>
          </div>
        </button>

        <button
          onClick={onIrParaPedidos}
          className="flex items-center gap-4 p-5 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all text-left group"
        >
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 group-hover:bg-blue-100 dark:group-hover:bg-blue-500/20 transition-colors">
            <ClipboardList className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">Ver Pedidos</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Histórico, status e detalhes de cada venda
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}

// ─── Aba: Produtos ────────────────────────────────────────────────────────────

function AbaProducts({ companyId }: { companyId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [produtos, setProdutos] = useState<ProdutoVenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [apenasAtivos, setApenasAtivos] = useState(false);
  const [sortField, setSortField] = useState<'nome' | 'preco_venda' | 'estoque_atual'>('nome');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    load();
  }, [companyId]);

  async function load() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('produtos_venda')
        .select('*')
        .eq('company_id', companyId)
        .order('display_order', { ascending: true });
      setProdutos(data ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function toggleAtivo(id: string, atual: boolean) {
    await supabase.from('produtos_venda').update({ is_active: !atual }).eq('id', id);
    setProdutos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, is_active: !atual } : p)),
    );
  }

  const categorias = [...new Set(produtos.map((p) => p.categoria).filter(Boolean))] as string[];

  const filtered = produtos
    .filter((p) => {
      if (apenasAtivos && !p.is_active) return false;
      if (categoriaFiltro && p.categoria !== categoriaFiltro) return false;
      if (search) {
        const hay = `${p.nome} ${p.descricao ?? ''} ${p.ean ?? ''}`.toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const va = a[sortField] ?? '';
      const vb = b[sortField] ?? '';
      if (sortDir === 'asc') return va > vb ? 1 : -1;
      return va < vb ? 1 : -1;
    });

  function exportCSV() {
    const headers = ['Nome', 'Categoria', 'Preço Custo', 'Preço Venda', 'Estoque', 'Ativo'];
    const rows = filtered.map((p) => [
      p.nome,
      p.categoria ?? '',
      p.preco_custo.toFixed(2),
      p.preco_venda.toFixed(2),
      p.estoque_atual,
      p.is_active ? 'Sim' : 'Não',
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `produtos_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggleSort(field: typeof sortField) {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('asc'); }
  }

  function SortIcon({ field }: { field: typeof sortField }) {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Busca */}
          <div className="flex-1 min-w-[200px] relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar produto, EAN..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Categoria */}
          {categorias.length > 0 && (
            <select
              value={categoriaFiltro}
              onChange={(e) => setCategoriaFiltro(e.target.value)}
              className="py-2 px-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Todas categorias</option>
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}

          {/* Toggle ativos */}
          <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-600 dark:text-gray-400">
            <div
              onClick={() => setApenasAtivos((v) => !v)}
              className={`w-9 h-5 rounded-full transition-colors ${apenasAtivos ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-white/10'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white shadow mt-0.5 transition-all ${apenasAtivos ? 'ml-4.5' : 'ml-0.5'}`} style={{ marginLeft: apenasAtivos ? '18px' : '2px' }} />
            </div>
            Só ativos
          </label>

          <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {filtered.length} produto{filtered.length !== 1 ? 's' : ''}
          </span>

          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={exportCSV}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg border border-gray-200 dark:border-white/10 transition disabled:opacity-40"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>

          {/* Botão novo produto */}
          <button
            onClick={() => router.push(`/dashboard/vendas/produtos?company=${companyId}`)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Novo produto
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
        </div>
      )}

      {/* Vazio */}
      {!loading && filtered.length === 0 && (
        <div className="bg-white/50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 p-12 text-center">
          <Package className="w-14 h-14 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
            {search || categoriaFiltro ? 'Nenhum resultado' : 'Nenhum produto cadastrado'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {search || categoriaFiltro
              ? 'Tente outros filtros'
              : 'Cadastre seu primeiro produto para começar a vender'}
          </p>
          {!search && !categoriaFiltro && (
            <button
              onClick={() => router.push(`/dashboard/vendas/produtos?company=${companyId}`)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition"
            >
              <Plus className="w-4 h-4" />
              Cadastrar produto
            </button>
          )}
        </div>
      )}

      {/* Tabela */}
      {!loading && filtered.length > 0 && (
        <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 w-16">
                    Foto
                  </th>
                  <th
                    className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none"
                    onClick={() => toggleSort('nome')}
                  >
                    <span className="flex items-center gap-1">
                      Nome <SortIcon field="nome" />
                    </span>
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">
                    Categoria
                  </th>
                  <th
                    className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none"
                    onClick={() => toggleSort('preco_venda')}
                  >
                    <span className="flex items-center gap-1">
                      Preço <SortIcon field="preco_venda" />
                    </span>
                  </th>
                  <th
                    className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none"
                    onClick={() => toggleSort('estoque_atual')}
                  >
                    <span className="flex items-center gap-1">
                      Estoque <SortIcon field="estoque_atual" />
                    </span>
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">
                    Status
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition"
                  >
                    {/* Imagem */}
                    <td className="px-4 py-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-white/5 flex items-center justify-center flex-shrink-0">
                        {p.imagem_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.imagem_url} alt={p.nome} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                        )}
                      </div>
                    </td>

                    {/* Nome */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">{p.nome}</p>
                      {p.ean && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">{p.ean}</p>
                      )}
                    </td>

                    {/* Categoria */}
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {p.categoria ?? <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </td>

                    {/* Preço */}
                    <td className="px-4 py-3">
                      <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatarPreco(p.preco_venda)}
                      </p>
                      {p.preco_custo > 0 && (
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          Custo: {formatarPreco(p.preco_custo)}
                        </p>
                      )}
                    </td>

                    {/* Estoque */}
                    <td className="px-4 py-3">
                      {p.controla_estoque ? (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                            p.estoque_atual <= 0
                              ? 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400'
                              : p.estoque_atual <= p.estoque_minimo
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                              : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300'
                          }`}
                        >
                          {p.estoque_atual <= 0
                            ? '⚠ Sem estoque'
                            : p.estoque_atual <= p.estoque_minimo
                            ? `⚠ ${p.estoque_atual} ${p.unidade}`
                            : `${p.estoque_atual} ${p.unidade}`}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500">Não controlado</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleAtivo(p.id, p.is_active)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight transition-colors ${
                          p.is_active
                            ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400 hover:bg-gray-200'
                        }`}
                      >
                        {p.is_active ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>

                    {/* Ações */}
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() =>
                          router.push(`/dashboard/vendas/produtos?company=${companyId}&edit=${p.id}`)
                        }
                        className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Rodapé */}
          <div className="px-4 py-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {filtered.length} de {produtos.length} produto{produtos.length !== 1 ? 's' : ''}
              {(search || categoriaFiltro) && ` · filtrado`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Aba: Pedidos ─────────────────────────────────────────────────────────────

function AbaPedidos({ companyId }: { companyId: string }) {
  const supabase = createClient();
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<StatusPedido>('todos');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    load();
  }, [companyId]);

  async function load() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('pedidos')
        .select('*, pedido_itens(*)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: sortOrder === 'asc' });
      setPedidos(data ?? []);
    } finally {
      setLoading(false);
    }
  }

  const statusCounts = {
    todos: pedidos.length,
    pago: pedidos.filter((p) => p.status === 'pago').length,
    aguardando_pagamento: pedidos.filter((p) => p.status === 'aguardando_pagamento').length,
    cancelado: pedidos.filter((p) => p.status === 'cancelado').length,
    aberto: pedidos.filter((p) => p.status === 'aberto').length,
    entregue: pedidos.filter((p) => p.status === 'entregue').length,
  };

  const filtered = pedidos
    .filter((p) => {
      if (statusFiltro !== 'todos' && p.status !== statusFiltro) return false;
      if (search) {
        const hay =
          `${p.cliente_nome ?? ''} ${p.cliente_telefone ?? ''} ${p.id}`.toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortOrder === 'desc' ? -diff : diff;
    });

  function exportCSV() {
    const headers = ['Data', 'Cliente', 'Total', 'Método', 'Status'];
    const rows = filtered.map((p) => [
      new Date(p.created_at).toLocaleString('pt-BR'),
      p.cliente_nome ?? '—',
      formatarPreco(p.total),
      p.metodo_pagamento ?? '—',
      p.status,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pedidos_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const statusFilterButtons: { key: StatusPedido; label: string; cls: string }[] = [
    { key: 'todos', label: 'Todos', cls: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300' },
    { key: 'pago', label: 'Pagos', cls: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' },
    { key: 'aguardando_pagamento', label: 'Aguardando', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400' },
    { key: 'cancelado', label: 'Cancelados', cls: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' },
  ];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por cliente..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <span className="text-sm text-gray-500 dark:text-gray-400">
            {filtered.length} pedido{filtered.length !== 1 ? 's' : ''}
          </span>

          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={exportCSV}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg border border-gray-200 dark:border-white/10 transition disabled:opacity-40"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
        </div>

        {/* Filtros de status */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <Filter className="w-4 h-4 text-gray-400" />
          {statusFilterButtons.map(({ key, label, cls }) => (
            <button
              key={key}
              onClick={() => setStatusFiltro(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFiltro === key
                  ? `${cls} ring-2 ring-current ring-offset-1`
                  : 'bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
              }`}
            >
              {label} ({statusCounts[key]})
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
        </div>
      )}

      {/* Vazio */}
      {!loading && filtered.length === 0 && (
        <div className="bg-white/50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 p-12 text-center">
          <ClipboardList className="w-14 h-14 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
            {search || statusFiltro !== 'todos' ? 'Nenhum resultado' : 'Nenhum pedido ainda'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {search || statusFiltro !== 'todos'
              ? 'Tente outros filtros'
              : 'Os pedidos feitos no kiosk aparecerão aqui'}
          </p>
        </div>
      )}

      {/* Tabela */}
      {!loading && filtered.length > 0 && (
        <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
                  <th
                    className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none"
                    onClick={() => setSortOrder((s) => (s === 'desc' ? 'asc' : 'desc'))}
                  >
                    <span className="flex items-center gap-1">
                      Data
                      {sortOrder === 'desc' ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                    </span>
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Cliente</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Itens</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Total</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Método</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <>
                    <tr
                      key={p.id}
                      onClick={() => setExpandedRow(expandedRow === p.id ? null : p.id)}
                      className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition cursor-pointer"
                    >
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {formatDate(p.created_at)}
                      </td>
                      <td className="px-4 py-3 text-gray-900 dark:text-white">
                        {p.cliente_nome ?? <span className="text-gray-300 dark:text-gray-600">—</span>}
                        {p.cliente_telefone && (
                          <p className="text-xs text-gray-400 dark:text-gray-500">{p.cliente_telefone}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                        {(p.pedido_itens ?? []).length} iten{(p.pedido_itens ?? []).length !== 1 ? 's' : ''}
                      </td>
                      <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">
                        {formatarPreco(p.total)}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 capitalize">
                        {p.metodo_pagamento ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={p.status} />
                      </td>
                    </tr>

                    {/* Detalhe expandido */}
                    {expandedRow === p.id && (
                      <tr key={`${p.id}-detail`} className="bg-gray-50 dark:bg-white/3">
                        <td colSpan={6} className="px-6 py-4">
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                            Itens do pedido
                          </p>
                          <div className="space-y-1">
                            {(p.pedido_itens ?? []).map((item: any) => (
                              <div key={item.id} className="flex items-center justify-between text-sm">
                                <span className="text-gray-700 dark:text-gray-300">
                                  {item.quantidade}× {item.nome_snapshot}
                                </span>
                                <span className="font-semibold text-gray-900 dark:text-white">
                                  {formatarPreco(item.subtotal)}
                                </span>
                              </div>
                            ))}
                          </div>
                          {p.desconto > 0 && (
                            <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t border-gray-200 dark:border-white/10">
                              <span className="text-amber-600 dark:text-amber-400">Desconto</span>
                              <span className="text-amber-600 dark:text-amber-400">
                                − {formatarPreco(p.desconto)}
                              </span>
                            </div>
                          )}
                          {p.observacoes && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                              Obs: {p.observacoes}
                            </p>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t border-gray-100 dark:border-white/5">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {filtered.length} de {pedidos.length} pedido{pedidos.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

function VendasPageContent() {
  const { selectedAssistantId: companyId, selectedAssistantName } = useAssistant();
  const [aba, setAba] = useState<Aba>('visao_geral');

  const abas: { key: Aba; label: string; icon: any }[] = [
    { key: 'visao_geral', label: 'Visão Geral', icon: BarChart2 },
    { key: 'produtos',    label: 'Produtos',    icon: Package },
    { key: 'pedidos',     label: 'Pedidos',     icon: ClipboardList },
  ];

  return (
    <div className="min-h-screen bg-transparent">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Vendas</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Gerencie a loja virtual do assistente
                {selectedAssistantName && (
                  <span className="font-medium text-gray-900 dark:text-white"> {selectedAssistantName}</span>
                )}
              </p>
            </div>
          </div>

          {/* Sem assistente */}
          {!companyId && (
            <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 p-12 text-center">
              <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Selecione um Assistente
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Escolha um assistente no topo da página para ver a seção de vendas
              </p>
            </div>
          )}

          {/* Conteúdo principal */}
          {companyId && (
            <>
              {/* Tabs — padrão Saldo */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow border border-gray-100 dark:border-white/5 overflow-hidden">
                <div className="flex border-b border-gray-200 dark:border-white/10">
                  {abas.map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => setAba(key)}
                      className={`flex-1 px-4 py-3 text-sm font-medium transition flex items-center justify-center gap-2 ${
                        aba === key
                          ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 dark:border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>

                <div className="p-6">
                  {aba === 'visao_geral' && (
                    <VisaoGeral
                      companyId={companyId}
                      onIrParaProdutos={() => setAba('produtos')}
                      onIrParaPedidos={() => setAba('pedidos')}
                    />
                  )}
                  {aba === 'produtos' && <AbaProducts companyId={companyId} />}
                  {aba === 'pedidos' && <AbaPedidos companyId={companyId} />}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VendasPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      }
    >
      <VendasPageContent />
    </Suspense>
  );
}
