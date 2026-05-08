'use client';

// components/dashboard/vendas/ImportarCSVModal.tsx
//
// Modal de importação de produtos via CSV.
// Suporta: drag & drop, seleção de arquivo, preview com validação,
// download do CSV modelo, e importação em lote via Supabase.
//
// Colunas do CSV:
// nome*, descricao, categoria, preco_venda*, preco_custo, unidade,
// estoque_atual, estoque_minimo, controla_estoque, ean, imagem_url

import { useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { triggerBulkEmbeddingSync } from '@/lib/embeddings'; // PATCH 2.1
import {
  X, Upload, Download, AlertCircle, CheckCircle2,
  Loader2, FileText, Trash2, Eye, EyeOff,
} from 'lucide-react';

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface ProdutoCSV {
  _linha: number;
  _erros: string[];
  _valido: boolean;
  nome: string;
  descricao: string;
  categoria: string;
  preco_venda: number;
  preco_custo: number;
  unidade: string;
  estoque_atual: number;
  estoque_minimo: number;
  controla_estoque: boolean;
  ean: string;
  imagem_url: string;
}

interface ImportarCSVModalProps {
  companyId: string;
  onClose: () => void;
  onImportado: (quantidade: number) => void;
}

// ── Constantes ────────────────────────────────────────────────────────────────

const COLUNAS_OBRIGATORIAS = ['nome', 'preco_venda'];

const COLUNAS_ESPERADAS = [
  'nome', 'descricao', 'categoria', 'preco_venda', 'preco_custo',
  'unidade', 'estoque_atual', 'estoque_minimo', 'controla_estoque',
  'ean', 'imagem_url',
];

const CSV_MODELO = `nome,descricao,categoria,preco_venda,preco_custo,unidade,estoque_atual,estoque_minimo,controla_estoque,ean,imagem_url
Pizza de Calabresa 35cm,Pizza artesanal com calabresa e cebola,Pizzas Salgadas,45.90,18.00,un,20,5,true,7891234567890,https://exemplo.com/pizza.jpg
Suco de Laranja 500ml,Suco natural sem conservantes,Bebidas,12.00,4.50,un,50,10,true,,https://exemplo.com/suco.jpg
Pão de Queijo 100g,Pão de queijo mineiro tradicional,Salgados,6.50,2.00,un,100,20,true,,
Água Mineral 500ml,Água mineral sem gás,Bebidas,4.00,1.20,un,200,50,true,,
Hambúrguer Artesanal,Hambúrguer 180g com blend especial,Lanches,32.00,12.00,un,30,5,true,,`;

// ── Parser CSV ────────────────────────────────────────────────────────────────

function parseCSV(text: string): ProdutoCSV[] {
  const linhas = text
    .split('\n')
    .map(l => l.replace(/\r/g, '').trim())
    .filter(l => l.length > 0);

  if (linhas.length < 2) return [];

  // Detecta separador (vírgula ou ponto-e-vírgula)
  const header = linhas[0];
  const sep = header.includes(';') ? ';' : ',';

  const colunas = header.split(sep).map(c => c.trim().toLowerCase().replace(/['"]/g, ''));

  const produtos: ProdutoCSV[] = [];

  for (let i = 1; i < linhas.length; i++) {
    // Parser simples que respeita campos entre aspas
    const valores = parseCSVLinha(linhas[i], sep);
    const erros: string[] = [];
    const row: Record<string, string> = {};

    colunas.forEach((col, idx) => {
      row[col] = (valores[idx] ?? '').replace(/^["']|["']$/g, '').trim();
    });

    // Validações obrigatórias
    if (!row['nome']?.trim()) erros.push('Nome obrigatório');

    const precoVenda = parseFloat((row['preco_venda'] ?? '').replace(',', '.'));
    if (isNaN(precoVenda) || precoVenda <= 0) erros.push('Preço de venda inválido');

    // Normalizar campos
    const precoCusto = parseFloat((row['preco_custo'] ?? '').replace(',', '.')) || 0;
    const estoqueAtual = parseInt(row['estoque_atual'] ?? '0') || 0;
    const estoqueMinimo = parseInt(row['estoque_minimo'] ?? '0') || 0;
    const controlaEstoque = ['true', '1', 'sim', 'yes'].includes(
      (row['controla_estoque'] ?? 'true').toLowerCase()
    );
    const unidade = row['unidade']?.trim() || 'un';

    produtos.push({
      _linha: i + 1,
      _erros: erros,
      _valido: erros.length === 0,
      nome: row['nome']?.trim() ?? '',
      descricao: row['descricao']?.trim() ?? '',
      categoria: row['categoria']?.trim() ?? '',
      preco_venda: isNaN(precoVenda) ? 0 : precoVenda,
      preco_custo: precoCusto,
      unidade,
      estoque_atual: estoqueAtual,
      estoque_minimo: estoqueMinimo,
      controla_estoque: controlaEstoque,
      ean: row['ean']?.trim() ?? '',
      imagem_url: row['imagem_url']?.trim() ?? '',
    });
  }

  return produtos;
}

function parseCSVLinha(linha: string, sep: string): string[] {
  const resultado: string[] = [];
  let atual = '';
  let dentroAspas = false;

  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (c === '"') {
      dentroAspas = !dentroAspas;
    } else if (c === sep && !dentroAspas) {
      resultado.push(atual);
      atual = '';
    } else {
      atual += c;
    }
  }
  resultado.push(atual);
  return resultado;
}

function formatarPreco(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function ImportarCSVModal({
  companyId,
  onClose,
  onImportado,
}: ImportarCSVModalProps) {
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload');
  const [dragging, setDragging] = useState(false);
  const [produtos, setProdutos] = useState<ProdutoCSV[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [mostrarInvalidos, setMostrarInvalidos] = useState(true);
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [progresso, setProgresso] = useState(0);
  const [importados, setImportados] = useState(0);

  const validos   = produtos.filter(p => p._valido);
  const invalidos = produtos.filter(p => !p._valido);
  const selecionadosValidos = validos.filter(p => selecionados.has(p._linha));

  // ── Download CSV modelo ────────────────────────────────────────────────────
  function downloadModelo() {
    const blob = new Blob([CSV_MODELO], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'produtos_modelo.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Processar arquivo ──────────────────────────────────────────────────────
  function processarArquivo(file: File) {
    setErro(null);
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv' && file.type !== 'text/plain') {
      setErro('Arquivo deve ser .csv');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErro('Arquivo muito grande. Máximo 2MB.');
      return;
    }

    setNomeArquivo(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) { setErro('Arquivo vazio'); return; }

      const parsed = parseCSV(text);
      if (parsed.length === 0) { setErro('Nenhum produto encontrado no arquivo'); return; }

      setProdutos(parsed);
      // Seleciona todos os válidos por padrão
      setSelecionados(new Set(parsed.filter(p => p._valido).map(p => p._linha)));
      setStage('preview');
    };
    reader.onerror = () => setErro('Erro ao ler o arquivo');
    reader.readAsText(file, 'UTF-8');
  }

  // ── Drag & Drop ────────────────────────────────────────────────────────────
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processarArquivo(file);
  }, []);

  // ── Toggle seleção ─────────────────────────────────────────────────────────
  function toggleSelecionado(linha: number) {
    setSelecionados(prev => {
      const next = new Set(prev);
      next.has(linha) ? next.delete(linha) : next.add(linha);
      return next;
    });
  }

  function toggleTodos() {
    if (selecionados.size === validos.length) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(validos.map(p => p._linha)));
    }
  }

  // ── Importar ───────────────────────────────────────────────────────────────
  async function handleImportar() {
    if (selecionadosValidos.length === 0) return;

    setStage('importing');
    setProgresso(0);
    let count = 0;
    const errosImport: string[] = [];

    // Importa em lotes de 20
    const LOTE = 20;
    for (let i = 0; i < selecionadosValidos.length; i += LOTE) {
      const lote = selecionadosValidos.slice(i, i + LOTE);
      const rows = lote.map(p => ({
        company_id:       companyId,
        nome:             p.nome,
        descricao:        p.descricao || null,
        categoria:        p.categoria || null,
        preco_venda:      p.preco_venda,
        preco_custo:      p.preco_custo,
        unidade:          p.unidade,
        estoque_atual:    p.estoque_atual,
        estoque_minimo:   p.estoque_minimo,
        controla_estoque: p.controla_estoque,
        ean:              p.ean || null,
        imagem_url:       p.imagem_url || null,
        is_active:        true,
      }));

      const { error } = await supabase.from('produtos_venda').insert(rows);
      if (error) {
        errosImport.push(`Lote ${Math.floor(i / LOTE) + 1}: ${error.message}`);
      } else {
        count += lote.length;
      }

      setProgresso(Math.round(((i + LOTE) / selecionadosValidos.length) * 100));
    }

    // PATCH 2.2 — dispara reindexação bulk após importação CSV bem-sucedida
    setImportados(count);
    setStage('done');

    if (count > 0) {
      triggerBulkEmbeddingSync(companyId);
      onImportado(count);
    }
  }

  // ── RENDER ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Upload className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                Importar Produtos via CSV
              </h2>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {stage === 'upload'    && 'Faça upload do arquivo CSV'}
                {stage === 'preview'   && `${produtos.length} linhas encontradas · ${validos.length} válidas · ${invalidos.length} com erro`}
                {stage === 'importing' && `Importando... ${progresso}%`}
                {stage === 'done'      && `${importados} produto${importados !== 1 ? 's' : ''} importado${importados !== 1 ? 's' : ''} com sucesso`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition">
            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">

          {/* ── UPLOAD ── */}
          {stage === 'upload' && (
            <div className="p-6 space-y-5">

              {/* Download modelo */}
              <div className="flex items-start gap-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
                <FileText className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                    Baixe o modelo antes de começar
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                    O arquivo modelo contém todas as colunas com exemplos preenchidos. Edite no Excel, Google Planilhas ou qualquer editor de CSV.
                  </p>
                  <p className="text-xs text-blue-500/70 dark:text-blue-400/60 mt-1">
                    Colunas obrigatórias: <strong>nome</strong>, <strong>preco_venda</strong> — demais são opcionais.
                  </p>
                </div>
                <button
                  onClick={downloadModelo}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg transition flex-shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  Baixar modelo
                </button>
              </div>

              {/* Referência das colunas */}
              <div className="rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
                <div className="px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Colunas do CSV
                  </p>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-white/5">
                  {[
                    { col: 'nome',              tipo: 'Texto',    obrig: true,  ex: 'Pizza de Calabresa' },
                    { col: 'descricao',         tipo: 'Texto',    obrig: false, ex: 'Descrição exibida no kiosk' },
                    { col: 'categoria',         tipo: 'Texto',    obrig: false, ex: 'Pizzas, Bebidas...' },
                    { col: 'preco_venda',       tipo: 'Número',   obrig: true,  ex: '45.90' },
                    { col: 'preco_custo',       tipo: 'Número',   obrig: false, ex: '18.00' },
                    { col: 'unidade',           tipo: 'Texto',    obrig: false, ex: 'un, kg, g, l, ml' },
                    { col: 'estoque_atual',     tipo: 'Inteiro',  obrig: false, ex: '50' },
                    { col: 'estoque_minimo',    tipo: 'Inteiro',  obrig: false, ex: '10' },
                    { col: 'controla_estoque',  tipo: 'true/false', obrig: false, ex: 'true' },
                    { col: 'ean',               tipo: 'Texto',    obrig: false, ex: '7891234567890' },
                    { col: 'imagem_url',        tipo: 'URL',      obrig: false, ex: 'https://site.com/img.jpg' },
                  ].map(r => (
                    <div key={r.col} className="flex items-center gap-3 px-4 py-2 text-xs">
                      <code className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 w-36 flex-shrink-0">
                        {r.col}
                      </code>
                      <span className="text-gray-400 dark:text-gray-500 w-16 flex-shrink-0">{r.tipo}</span>
                      <span className="text-gray-500 dark:text-gray-400 flex-1 truncate">{r.ex}</span>
                      {r.obrig && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 flex-shrink-0">
                          obrigatório
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Dropzone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center gap-3 p-10 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                  dragging
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10'
                    : 'border-gray-300 dark:border-white/20 hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
              >
                <Upload className={`w-10 h-10 ${dragging ? 'text-emerald-500' : 'text-gray-300 dark:text-gray-600'}`} />
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Arraste o arquivo CSV aqui
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    ou clique para selecionar — máximo 2MB
                  </p>
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv,text/csv,text/plain"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) processarArquivo(f);
                  }}
                />
              </div>

              {erro && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-500/10 rounded-xl text-red-700 dark:text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {erro}
                </div>
              )}
            </div>
          )}

          {/* ── PREVIEW ── */}
          {stage === 'preview' && (
            <div className="flex flex-col h-full">

              {/* Barra de filtros */}
              <div className="flex items-center justify-between gap-3 px-6 py-3 border-b border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/3 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={selecionados.size === validos.length && validos.length > 0}
                      onChange={toggleTodos}
                      className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="font-medium">Selecionar todos válidos</span>
                  </label>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {selecionados.size} de {validos.length} selecionados
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {invalidos.length > 0 && (
                    <button
                      onClick={() => setMostrarInvalidos(!mostrarInvalidos)}
                      className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 transition"
                    >
                      {mostrarInvalidos ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {mostrarInvalidos ? 'Ocultar' : 'Mostrar'} {invalidos.length} com erro
                    </button>
                  )}
                  <button
                    onClick={() => { setStage('upload'); setProdutos([]); setErro(null); }}
                    className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 transition"
                  >
                    Trocar arquivo
                  </button>
                </div>
              </div>

              {/* Tabela */}
              <div className="flex-1 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-white dark:bg-slate-900 z-10">
                    <tr className="border-b border-gray-200 dark:border-white/10">
                      <th className="w-8 px-3 py-2.5" />
                      <th className="text-left px-3 py-2.5 font-semibold text-gray-500 dark:text-gray-400">Linha</th>
                      <th className="text-left px-3 py-2.5 font-semibold text-gray-500 dark:text-gray-400">Imagem</th>
                      <th className="text-left px-3 py-2.5 font-semibold text-gray-500 dark:text-gray-400">Nome</th>
                      <th className="text-left px-3 py-2.5 font-semibold text-gray-500 dark:text-gray-400">Categoria</th>
                      <th className="text-right px-3 py-2.5 font-semibold text-gray-500 dark:text-gray-400">Preço</th>
                      <th className="text-center px-3 py-2.5 font-semibold text-gray-500 dark:text-gray-400">Estoque</th>
                      <th className="text-left px-3 py-2.5 font-semibold text-gray-500 dark:text-gray-400">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {produtos
                      .filter(p => p._valido || mostrarInvalidos)
                      .map(p => (
                        <tr
                          key={p._linha}
                          className={`border-b border-gray-50 dark:border-white/5 transition-colors ${
                            !p._valido
                              ? 'bg-red-50/50 dark:bg-red-500/5'
                              : selecionados.has(p._linha)
                                ? 'bg-emerald-50/50 dark:bg-emerald-500/5'
                                : 'hover:bg-gray-50 dark:hover:bg-white/3'
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="px-3 py-2">
                            {p._valido && (
                              <input
                                type="checkbox"
                                checked={selecionados.has(p._linha)}
                                onChange={() => toggleSelecionado(p._linha)}
                                className="w-3.5 h-3.5 rounded text-emerald-500 focus:ring-emerald-500"
                              />
                            )}
                          </td>

                          {/* Linha */}
                          <td className="px-3 py-2 text-gray-400 dark:text-gray-600 font-mono">
                            {p._linha}
                          </td>

                          {/* Imagem preview */}
                          <td className="px-3 py-2">
                            {p.imagem_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={p.imagem_url}
                                alt=""
                                className="w-8 h-8 rounded-lg object-cover bg-gray-100 dark:bg-white/5"
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                                <span className="text-gray-300 dark:text-gray-600 text-[10px]">—</span>
                              </div>
                            )}
                          </td>

                          {/* Nome */}
                          <td className="px-3 py-2">
                            <p className="font-semibold text-gray-900 dark:text-white truncate max-w-[180px]">
                              {p.nome || <span className="text-red-400 italic">vazio</span>}
                            </p>
                            {p.descricao && (
                              <p className="text-gray-400 dark:text-gray-500 truncate max-w-[180px]">{p.descricao}</p>
                            )}
                          </td>

                          {/* Categoria */}
                          <td className="px-3 py-2 text-gray-500 dark:text-gray-400">
                            {p.categoria || '—'}
                          </td>

                          {/* Preço */}
                          <td className="px-3 py-2 text-right">
                            {p.preco_venda > 0
                              ? <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatarPreco(p.preco_venda)}</span>
                              : <span className="text-red-400 italic">inválido</span>
                            }
                            {p.preco_custo > 0 && (
                              <p className="text-gray-400">custo: {formatarPreco(p.preco_custo)}</p>
                            )}
                          </td>

                          {/* Estoque */}
                          <td className="px-3 py-2 text-center text-gray-500 dark:text-gray-400">
                            {p.controla_estoque ? `${p.estoque_atual} ${p.unidade}` : 'não ctrl.'}
                          </td>

                          {/* Status */}
                          <td className="px-3 py-2">
                            {p._valido ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                                <CheckCircle2 className="w-3 h-3" /> OK
                              </span>
                            ) : (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400">
                                  <AlertCircle className="w-3 h-3" /> Erro
                                </span>
                                {p._erros.map((e, i) => (
                                  <p key={i} className="text-[10px] text-red-400 mt-0.5">{e}</p>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── IMPORTING ── */}
          {stage === 'importing' && (
            <div className="flex flex-col items-center justify-center py-16 gap-5 px-6">
              <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
              <div className="w-full max-w-xs">
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                  <span>Importando produtos...</span>
                  <span>{progresso}%</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${progresso}%` }}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Importando {selecionadosValidos.length} produto{selecionadosValidos.length !== 1 ? 's' : ''}...
              </p>
            </div>
          )}

          {/* ── DONE ── */}
          {stage === 'done' && (
            <div className="flex flex-col items-center justify-center py-14 gap-4 px-6 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9 text-emerald-500" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {importados} produto{importados !== 1 ? 's' : ''} importado{importados !== 1 ? 's' : ''}!
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Os produtos já estão disponíveis no catálogo.
                </p>
              </div>
              <button
                onClick={onClose}
                className="mt-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition"
              >
                Fechar
              </button>
            </div>
          )}
        </div>

        {/* ── Footer (só no preview) ── */}
        {stage === 'preview' && (
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-200 dark:border-white/10 flex-shrink-0 bg-white dark:bg-slate-900">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{selecionados.size}</span> produto{selecionados.size !== 1 ? 's' : ''} será{selecionados.size !== 1 ? 'ão' : ''} importado{selecionados.size !== 1 ? 's' : ''}
              {invalidos.length > 0 && (
                <span className="ml-2 text-amber-500">· {invalidos.length} linha{invalidos.length !== 1 ? 's' : ''} com erro será{invalidos.length !== 1 ? 'ão' : ''} ignorada{invalidos.length !== 1 ? 's' : ''}</span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setStage('upload'); setProdutos([]); }}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition"
              >
                Voltar
              </button>
              <button
                onClick={handleImportar}
                disabled={selecionados.size === 0}
                className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="w-4 h-4" />
                Importar {selecionados.size > 0 ? `(${selecionados.size})` : ''}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
