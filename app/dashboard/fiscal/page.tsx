'use client';

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useAssistant } from '@/contexts/AssistantContext';
import { useRouter } from 'next/navigation';
import {
  Receipt,
  Loader2,
  FileText,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  Upload,
  Settings,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import EmitirNotaModal from '@/components/assistant/EmitirNotaModal'; // ajuste o path se necessário

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Aba = 'visao_geral' | 'configuracao' | 'historico';

type SituacaoNota = 'autorizada' | 'rejeitada' | 'cancelada' | 'processando';

interface FiscalDocument {
  id: string;
  tipo: string;
  chave_acesso: string | null;
  numero: string | null;
  situacao: string | null;
  valor_total: number;
  destinatario_nome: string | null;
  destinatario_cpf_cnpj: string | null;
  created_at: string;
}

interface Company {
  id: string;
  name: string;
  assistant_type: string;
  brasilnfe_token: string | null;
  brasilnfe_ambiente: string;
  nfe_plano: string | null;
  nfe_ativo: boolean;
  nfe_cert_expiracao: string | null;
  nfe_cnpj: string | null;
  nfe_crt: number | null;
  nfe_cnae: string | null;
  nfe_ie: string | null;
  nfe_im: string | null;
  nfe_csc_identificador: string | null;
  nfe_csc_codigo: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0)
    return `Hoje, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `${diffDays} dias atrás`;
  return date.toLocaleDateString('pt-BR');
}

function formatarPreco(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function SituacaoBadge({ situacao }: { situacao: string | null }) {
  const map: Record<string, { label: string; cls: string; Icon: any }> = {
    autorizada:   { label: 'Autorizada',   cls: 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400',   Icon: CheckCircle2 },
    rejeitada:    { label: 'Rejeitada',    cls: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400',           Icon: XCircle },
    cancelada:    { label: 'Cancelada',    cls: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400',          Icon: XCircle },
    processando:  { label: 'Processando',  cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400', Icon: Clock },
  };
  const config = map[situacao ?? ''] ?? map.processando;
  const { label, cls, Icon } = config;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight ${cls}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

function TipoLabel({ tipo }: { tipo: string }) {
  const map: Record<string, string> = {
    nfse: 'NFS-e',
    nfe: 'NF-e',
    nfce: 'NFC-e',
  };
  return <span className="text-xs font-mono font-semibold text-blue-500">{map[tipo] ?? tipo.toUpperCase()}</span>;
}

// ─── Aba: Visão Geral ─────────────────────────────────────────────────────────

function VisaoGeral({
  companyId,
  company,
  onIrParaConfig,
  onIrParaHistorico,
}: {
  companyId: string;
  company: Company | null;
  onIrParaConfig: () => void;
  onIrParaHistorico: () => void;
}) {
  const supabase = createClient();
  const [stats, setStats] = useState({ total: 0, autorizadas: 0, rejeitadas: 0, valorTotal: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from('fiscal_documents')
        .select('situacao, valor_total')
        .eq('company_id', companyId);

      const docs = data ?? [];
      setStats({
        total: docs.length,
        autorizadas: docs.filter(d => d.situacao === 'autorizada').length,
        rejeitadas: docs.filter(d => d.situacao === 'rejeitada').length,
        valorTotal: docs.filter(d => d.situacao === 'autorizada').reduce((acc, d) => acc + Number(d.valor_total ?? 0), 0),
      });
      setLoading(false);
    }
    load();
  }, [companyId]);

  const certOk = company?.nfe_cert_expiracao && new Date(company.nfe_cert_expiracao) > new Date();
  const diasCert = company?.nfe_cert_expiracao
    ? Math.ceil((new Date(company.nfe_cert_expiracao).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;
  }

  const cards = [
    {
      label: 'Valor total emitido',
      value: formatarPreco(stats.valorTotal),
      sub: `${stats.autorizadas} notas autorizadas`,
      icon: Receipt,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-500/10',
      onClick: onIrParaHistorico,
    },
    {
      label: 'Autorizadas',
      value: stats.autorizadas.toString(),
      sub: `${stats.total} no total`,
      icon: CheckCircle2,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-500/10',
      onClick: onIrParaHistorico,
    },
    {
      label: 'Rejeitadas',
      value: stats.rejeitadas.toString(),
      sub: stats.rejeitadas > 0 ? 'Verifique os dados' : 'Tudo em ordem',
      icon: XCircle,
      color: stats.rejeitadas > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-gray-500',
      bg: stats.rejeitadas > 0 ? 'bg-red-50 dark:bg-red-500/10' : 'bg-gray-50 dark:bg-white/5',
      onClick: stats.rejeitadas > 0 ? onIrParaHistorico : undefined,
    },
    {
      label: 'Certificado digital',
      value: !company?.nfe_cert_expiracao ? '—' : certOk ? `${diasCert}d` : 'Expirado',
      sub: !company?.nfe_cert_expiracao
        ? 'Não enviado'
        : certOk
          ? `Válido até ${new Date(company.nfe_cert_expiracao).toLocaleDateString('pt-BR')}`
          : 'Renovação necessária',
      icon: ShieldCheck,
      color: !company?.nfe_cert_expiracao || !certOk
        ? 'text-red-600 dark:text-red-400'
        : diasCert! <= 30
          ? 'text-lime-600 dark:text-lime-400'
          : 'text-green-600 dark:text-green-400',
      bg: !company?.nfe_cert_expiracao || !certOk
        ? 'bg-red-50 dark:bg-red-500/10'
        : diasCert! <= 30
          ? 'bg-lime-50 dark:bg-lime-500/10'
          : 'bg-green-50 dark:bg-green-500/10',
      onClick: onIrParaConfig,
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
              className={`bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-100 dark:border-white/5 shadow-sm ${card.onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
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

      {/* Status de configuração */}
      {!company?.brasilnfe_token && (
        <div className="flex items-start gap-3 p-4 bg-lime-50 dark:bg-lime-500/10 rounded-xl border border-lime-200 dark:border-lime-500/20">
          <AlertCircle className="w-4 h-4 text-lime-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-lime-800 dark:text-lime-200">Emissão fiscal não configurada</p>
            <p className="text-xs text-lime-600 dark:text-lime-400 mt-0.5">Configure o CNPJ, regime tributário e certificado digital para começar a emitir notas.</p>
          </div>
          <button onClick={onIrParaConfig} className="text-xs px-3 py-1.5 bg-lime-500 hover:bg-lime-600 text-white rounded-lg transition whitespace-nowrap">
            Configurar
          </button>
        </div>
      )}

      {company?.brasilnfe_token && !company?.nfe_ativo && (
        <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-500/10 rounded-xl border border-blue-200 dark:border-blue-500/20">
          <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Aguardando ativação em produção</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">Empresa cadastrada em homologação. Ative para produção para emitir notas fiscais reais.</p>
          </div>
          <button onClick={onIrParaConfig} className="text-xs px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition whitespace-nowrap">
            Ativar
          </button>
        </div>
      )}

      {company?.nfe_ativo && (
        <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-500/10 rounded-xl border border-green-200 dark:border-green-500/20">
          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800 dark:text-green-200">Emissão fiscal ativa em produção</p>
            <p className="text-xs text-green-600 dark:text-green-400">
              {company.nfe_plano === 'nfse' ? 'NFS-e (Nota de Serviço)' : 'NF-e + NFC-e (Produto / Consumidor)'}
              {' · '}CNPJ {company.nfe_cnpj?.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Aba: Configuração ────────────────────────────────────────────────────────

function AbaConfiguracao({
  companyId,
  company,
  onAtualizar,
}: {
  companyId: string;
  company: Company | null;
  onAtualizar: () => void;
}) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [detectando, setDetectando] = useState(false);
  const [uploadingCert, setUploadingCert] = useState(false);
  const [ativando, setAtivando] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [linkAtivacao, setLinkAtivacao] = useState('');
  const [senhaCert, setSenhaCert] = useState('');
  const [arquivoCert, setArquivoCert] = useState<File | null>(null);

  const [form, setForm] = useState({
    nfe_cnpj: company?.nfe_cnpj ?? '',
    nfe_crt: company?.nfe_crt?.toString() ?? '1',
    nfe_cnae: company?.nfe_cnae ?? '',
    nfe_ie: company?.nfe_ie ?? '',
    nfe_im: company?.nfe_im ?? '',
    nfe_plano: company?.nfe_plano ?? '',
    nfe_csc_identificador: company?.nfe_csc_identificador ?? '',
    nfe_csc_codigo: company?.nfe_csc_codigo ?? '',
    brasilnfe_ambiente: company?.brasilnfe_ambiente ?? 'homologacao',
    nfe_ultimo_rps: (company as any)?.nfe_ultimo_rps?.toString() ?? '0',
    nfe_serie_rps: (company as any)?.nfe_serie_rps ?? 'A',
  });

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const showToast = (msg: string, type: 'success' | 'error' | 'warning' = 'success') => setToast({ msg, type });

  const handleDetectar = async () => {
    if (!form.nfe_cnpj.replace(/\D/g, '')) {
      showToast('Informe o CNPJ antes de detectar', 'warning');
      return;
    }
    setDetectando(true);
    try {
      const { data, error } = await supabase.functions.invoke('detectar-cnae-fiscal', {
        body: { cnpj: form.nfe_cnpj },
      });
      if (error) throw error;
      setForm(f => ({
        ...f,
        nfe_cnae: data.cnae ?? f.nfe_cnae,
        nfe_crt: data.crt_sugerido?.toString() ?? f.nfe_crt,
        nfe_plano: data.nfe_plano ?? f.nfe_plano,
      }));
      showToast(`Detectado: ${data.cnae_descricao} → ${data.nfe_plano === 'nfse' ? 'NFS-e' : 'NF-e/NFC-e'}`, 'success');
    } catch {
      showToast('Erro ao consultar CNPJ na Receita Federal', 'error');
    } finally {
      setDetectando(false);
    }
  };

  const handleSalvarDados = async () => {
    setSalvando(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          nfe_cnpj: form.nfe_cnpj.replace(/\D/g, ''),
          nfe_crt: parseInt(form.nfe_crt),
          nfe_cnae: form.nfe_cnae.replace(/\D/g, ''),
          nfe_ie: form.nfe_ie || null,
          nfe_im: form.nfe_im || null,
          nfe_plano: form.nfe_plano || null,
          nfe_csc_identificador: form.nfe_csc_identificador || null,
          nfe_csc_codigo: form.nfe_csc_codigo || null,
          brasilnfe_ambiente: form.brasilnfe_ambiente,
          nfe_ultimo_rps: parseInt(form.nfe_ultimo_rps) || 0,
          nfe_serie_rps: form.nfe_serie_rps || 'A',
        })
        .eq('id', companyId);
      if (error) throw error;
      showToast('Dados fiscais salvos com sucesso', 'success');
      onAtualizar();
    } catch {
      showToast('Erro ao salvar dados fiscais', 'error');
    } finally {
      setSalvando(false);
    }
  };

  const handleCadastrarBrasilNfe = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('cadastrar-empresa-brasilnfe', {
        body: { company_id: companyId },
      });
      if (error) throw error;
      showToast('Empresa cadastrada na Brasil NFE com sucesso!', 'success');
      onAtualizar();
    } catch (err: any) {
      showToast(err?.message ?? 'Erro ao cadastrar na Brasil NFE', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadCertificado = async () => {
    if (!arquivoCert || !senhaCert) {
      showToast('Selecione o arquivo .pfx e informe a senha', 'warning');
      return;
    }
    setUploadingCert(true);
    try {
      const pfx_base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(arquivoCert);
      });

      const { data, error } = await supabase.functions.invoke('upload-certificado-nfe', {
        body: { company_id: companyId, pfx_base64, senha: senhaCert },
      });
      if (error) throw error;
      showToast(`Certificado enviado! Válido até ${data.cert_expiracao}`, 'success');
      setSenhaCert('');
      setArquivoCert(null);
      onAtualizar();
    } catch (err: any) {
      showToast(err?.message ?? 'Erro ao enviar certificado', 'error');
    } finally {
      setUploadingCert(false);
    }
  };

  const handleAtivarHomologacao = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({ nfe_ativo: true, brasilnfe_ambiente: 'homologacao' })
        .eq('id', companyId);
      if (error) throw error;
      showToast('Ambiente de homologação ativado. Agora você pode testar a emissão.', 'success');
      onAtualizar();
    } catch {
      showToast('Erro ao ativar homologação', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGerarLinkAtivacao = async () => {
    setAtivando(true);
    try {
      const { data, error } = await supabase.functions.invoke('ativar-empresa-brasilnfe', {
        body: { company_id: companyId },
      });
      if (error) throw error;
      setLinkAtivacao(data.link_ativacao);
      showToast('Link de ativação gerado. Realize o pagamento para ativar em produção.', 'success');
    } catch (err: any) {
      showToast(err?.message ?? 'Erro ao gerar link de ativação', 'error');
    } finally {
      setAtivando(false);
    }
  };

  const handleVerificarAtivacao = async () => {
    setVerificando(true);
    try {
      const { data, error } = await supabase.functions.invoke('verificar-ativacao-nfe', {
        body: { company_id: companyId },
      });
      if (error) throw error;
      if (data.ativo) {
        showToast('Empresa ativada em produção com sucesso!', 'success');
        onAtualizar();
      } else {
        showToast('Pagamento ainda não confirmado. Tente novamente em alguns minutos.', 'warning');
      }
    } catch {
      showToast('Erro ao verificar ativação', 'error');
    } finally {
      setVerificando(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent';
  const labelCls = 'block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1';
  const sectionCls = 'bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden';
  const sectionHeaderCls = 'flex items-center gap-3 px-5 py-3 border-b border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-slate-800/60';

  const passo1Ok = !!company?.nfe_cnpj && !!company?.nfe_crt && !!company?.nfe_plano;
  const passo2Ok = !!company?.brasilnfe_token;
  const passo3Ok = !!company?.nfe_cert_expiracao;
  const passo4Ok = !!company?.nfe_ativo;

  return (
    <div className="space-y-6">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3
          ${toast.type === 'success' ? 'bg-green-500' : toast.type === 'error' ? 'bg-red-500' : 'bg-lime-400'}
          animate-in slide-in-from-top duration-300`}>
          <p className="text-white font-semibold text-sm">{toast.msg}</p>
        </div>
      )}

      {/* Progress steps */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { n: 1, label: 'Dados Fiscais', ok: passo1Ok },
          { n: 2, label: 'Cadastro Brasil NFE', ok: passo2Ok },
          { n: 3, label: 'Certificado Digital', ok: passo3Ok },
          { n: 4, label: 'Ativação', ok: passo4Ok },
        ].map(step => (
          <div key={step.n} className={`flex items-center gap-2 p-3 rounded-xl border ${step.ok ? 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30' : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10'}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${step.ok ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-gray-400'}`}>
              {step.ok ? '✓' : step.n}
            </div>
            <span className={`text-xs font-medium ${step.ok ? 'text-green-700 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>{step.label}</span>
          </div>
        ))}
      </div>

      {/* Passo 1: Dados Fiscais */}
      <div className={sectionCls}>
        <div className={sectionHeaderCls}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${passo1Ok ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'}`}>{passo1Ok ? '✓' : '1'}</div>
          <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-100">Dados Fiscais</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>CNPJ *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.nfe_cnpj}
                  onChange={e => setForm(f => ({ ...f, nfe_cnpj: e.target.value }))}
                  placeholder="00.000.000/0001-00"
                  className={inputCls}
                />
                <button
                  onClick={handleDetectar}
                  disabled={detectando}
                  className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50 whitespace-nowrap flex items-center gap-1"
                >
                  {detectando ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  Detectar
                </button>
              </div>
            </div>
            <div>
              <label className={labelCls}>Tipo de Nota *</label>
              <select value={form.nfe_plano} onChange={e => setForm(f => ({ ...f, nfe_plano: e.target.value }))} className={inputCls}>
                <option value="">Selecione...</option>
                <option value="nfse">NFS-e — Nota Fiscal de Serviço</option>
                <option value="nfe">NF-e / NFC-e — Nota Fiscal de Produto</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Regime Tributário (CRT) *</label>
              <select value={form.nfe_crt} onChange={e => setForm(f => ({ ...f, nfe_crt: e.target.value }))} className={inputCls}>
                <option value="1">1 — Simples Nacional</option>
                <option value="2">2 — Simples Nacional (Excesso)</option>
                <option value="3">3 — Lucro Presumido</option>
                <option value="4">4 — MEI</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>CNAE *</label>
              <input
                type="text"
                value={form.nfe_cnae}
                onChange={e => setForm(f => ({ ...f, nfe_cnae: e.target.value }))}
                placeholder="Ex: 6201501"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Inscrição Estadual</label>
              <input type="text" value={form.nfe_ie} onChange={e => setForm(f => ({ ...f, nfe_ie: e.target.value }))} placeholder="ISENTO ou número" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Inscrição Municipal</label>
              <input type="text" value={form.nfe_im} onChange={e => setForm(f => ({ ...f, nfe_im: e.target.value }))} placeholder="Número" className={inputCls} />
            </div>
          </div>

          {form.nfe_plano === 'nfe' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100 dark:border-white/10">
              <div>
                <label className={labelCls}>CSC Identificador (NFC-e)</label>
                <input type="text" value={form.nfe_csc_identificador} onChange={e => setForm(f => ({ ...f, nfe_csc_identificador: e.target.value }))} placeholder="Ex: 000001" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>CSC Código (NFC-e)</label>
                <input type="text" value={form.nfe_csc_codigo} onChange={e => setForm(f => ({ ...f, nfe_csc_codigo: e.target.value }))} placeholder="Código SEFAZ" className={inputCls} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100 dark:border-white/10">
            <div>
              <label className={labelCls}>Último RPS emitido</label>
              <input
                type="number"
                min="0"
                value={form.nfe_ultimo_rps}
                onChange={e => setForm(f => ({ ...f, nfe_ultimo_rps: e.target.value }))}
                className={inputCls}
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Informe o número da última nota emitida antes de migrar para o minhAi. Se for sua primeira nota, deixe 0.
              </p>
            </div>
            <div>
              <label className={labelCls}>Série RPS</label>
              <input
                type="text"
                value={form.nfe_serie_rps}
                onChange={e => setForm(f => ({ ...f, nfe_serie_rps: e.target.value.toUpperCase() }))}
                maxLength={2}
                placeholder="A"
                className={inputCls}
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Série padrão é A. Altere somente se seu sistema anterior usava série diferente.
              </p>
            </div>
          </div>

          <div>
            <label className={labelCls}>Ambiente</label>
            <select value={form.brasilnfe_ambiente} onChange={e => setForm(f => ({ ...f, brasilnfe_ambiente: e.target.value }))} className={inputCls}>
              <option value="homologacao">Homologação (testes, sem efeito fiscal)</option>
              <option value="producao">Produção (notas reais)</option>
            </select>
          </div>

          <button onClick={handleSalvarDados} disabled={salvando} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50 flex items-center gap-2">
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Salvar Dados Fiscais
          </button>
        </div>
      </div>

      {/* Passo 2: Cadastro Brasil NFE */}
      <div className={sectionCls}>
        <div className={sectionHeaderCls}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${passo2Ok ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'}`}>{passo2Ok ? '✓' : '2'}</div>
          <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-100">Cadastro na Brasil NFE</h3>
        </div>
        <div className="p-5 space-y-3">
          {passo2Ok ? (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="w-4 h-4" />
              Empresa cadastrada — Token salvo
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 dark:text-gray-400">Cadastra sua empresa na plataforma Brasil NFE usando os dados fiscais acima. Necessário para emissão.</p>
              {!passo1Ok && (
                <p className="text-xs text-lime-600 dark:text-lime-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />Complete o Passo 1 primeiro</p>
              )}
              <button onClick={handleCadastrarBrasilNfe} disabled={loading || !passo1Ok} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50 flex items-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />}
                Cadastrar na Brasil NFE
              </button>
            </>
          )}
        </div>
      </div>

      {/* Passo 3: Certificado Digital */}
      <div className={sectionCls}>
        <div className={sectionHeaderCls}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${passo3Ok ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'}`}>{passo3Ok ? '✓' : '3'}</div>
          <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-100">Certificado Digital A1</h3>
        </div>
        <div className="p-5 space-y-4">
          {passo3Ok && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <ShieldCheck className="w-4 h-4" />
              Certificado válido até {new Date(company!.nfe_cert_expiracao!).toLocaleDateString('pt-BR')}
            </div>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400">Certificado A1 (.pfx ou .p12) emitido por autoridade certificadora ICP-Brasil. A senha não é armazenada.</p>
          {!passo2Ok && (
            <p className="text-xs text-lime-600 dark:text-lime-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />Complete o Passo 2 primeiro</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Arquivo .pfx / .p12</label>
              <input
                type="file"
                accept=".pfx,.p12"
                onChange={e => setArquivoCert(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-600 dark:file:bg-blue-500/10 dark:file:text-blue-400 hover:file:bg-blue-100"
              />
            </div>
            <div>
              <label className={labelCls}>Senha do certificado</label>
              <input type="password" value={senhaCert} onChange={e => setSenhaCert(e.target.value)} placeholder="Senha do .pfx" className={inputCls} />
            </div>
          </div>
          <button onClick={handleUploadCertificado} disabled={uploadingCert || !passo2Ok || !arquivoCert || !senhaCert} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50 flex items-center gap-2">
            {uploadingCert ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {passo3Ok ? 'Renovar Certificado' : 'Enviar Certificado'}
          </button>
        </div>
      </div>

      {/* Passo 4: Ativação */}
      <div className={sectionCls}>
        <div className={sectionHeaderCls}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${passo4Ok ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'}`}>{passo4Ok ? '✓' : '4'}</div>
          <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-100">Ativação</h3>
        </div>
        <div className="p-5 space-y-4">
          {!passo3Ok && (
            <p className="text-xs text-lime-600 dark:text-lime-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />Complete o Passo 3 primeiro</p>
          )}

          {/* Homologação */}
          <div className="p-4 rounded-xl border border-gray-200 dark:border-white/10 space-y-2">
            <p className="text-sm font-medium text-gray-900 dark:text-white">Homologação (testes gratuitos)</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Emite notas de teste sem efeito fiscal. Ative para começar a testar a integração.</p>
            <button onClick={handleAtivarHomologacao} disabled={loading || !passo3Ok || passo4Ok} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50">
              {passo4Ok && company?.brasilnfe_ambiente === 'homologacao' ? 'Ativo em homologação' : 'Ativar Homologação'}
            </button>
          </div>

          {/* Produção */}
          <div className="p-4 rounded-xl border border-gray-200 dark:border-white/10 space-y-2">
            <p className="text-sm font-medium text-gray-900 dark:text-white">Produção (notas reais)</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Requer pagamento da assinatura Brasil NFE ({form.nfe_plano === 'nfse' ? 'R$ 99,90/mês' : 'R$ 49,90/mês'}).
            </p>
            <div className="flex flex-wrap gap-2">
              <button onClick={handleGerarLinkAtivacao} disabled={ativando || !passo3Ok} className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50 flex items-center gap-1">
                {ativando ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                Gerar Link de Pagamento
              </button>
              {linkAtivacao && (
                <a href={linkAtivacao} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" />
                  Abrir Link de Pagamento
                </a>
              )}
              <button onClick={handleVerificarAtivacao} disabled={verificando || !passo3Ok} className="px-3 py-1.5 border border-gray-300 dark:border-white/20 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg text-xs font-semibold transition disabled:opacity-50 flex items-center gap-1">
                {verificando ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Verificar Ativação
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Aba: Histórico ───────────────────────────────────────────────────────────

function AbaHistorico({ companyId }: { companyId: string }) {
  const supabase = createClient();
  const [docs, setDocs] = useState<FiscalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroSituacao, setFiltroSituacao] = useState('todos');

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from('fiscal_documents')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(100);
      setDocs(data ?? []);
      setLoading(false);
    }
    load();
  }, [companyId]);

  const filtered = docs.filter(d => {
    if (filtroTipo !== 'todos' && d.tipo !== filtroTipo) return false;
    if (filtroSituacao !== 'todos' && d.situacao !== filtroSituacao) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm">
          <option value="todos">Todos os tipos</option>
          <option value="nfse">NFS-e</option>
          <option value="nfce">NFC-e</option>
          <option value="nfe">NF-e</option>
        </select>
        <select value={filtroSituacao} onChange={e => setFiltroSituacao(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm">
          <option value="todos">Todas as situações</option>
          <option value="autorizada">Autorizada</option>
          <option value="rejeitada">Rejeitada</option>
          <option value="processando">Processando</option>
          <option value="cancelada">Cancelada</option>
        </select>
      </div>

      {loading && <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>}

      {!loading && filtered.length === 0 && (
        <div className="bg-white/50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 p-12 text-center">
          <FileText className="w-14 h-14 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Nenhuma nota emitida</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">As notas emitidas pelo assistente aparecerão aqui</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Tipo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Número</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Destinatário</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Valor</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Situação</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Data</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(doc => (
                  <tr key={doc.id} className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition">
                    <td className="px-4 py-3"><TipoLabel tipo={doc.tipo} /></td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white font-mono text-xs">{doc.numero ?? '—'}</td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900 dark:text-white text-xs">{doc.destinatario_nome ?? 'Consumidor Final'}</p>
                      {doc.destinatario_cpf_cnpj && <p className="text-gray-400 text-xs font-mono">{doc.destinatario_cpf_cnpj}</p>}
                    </td>
                    <td className="px-4 py-3 font-semibold text-blue-600 dark:text-blue-400">
                      {formatarPreco(Number(doc.valor_total))}
                    </td>
                    <td className="px-4 py-3"><SituacaoBadge situacao={doc.situacao} /></td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{formatDate(doc.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

function FiscalPageContent() {
  const supabase = createClient();
  const { selectedAssistantId: companyId, selectedAssistantName } = useAssistant();
  const [aba, setAba] = useState<Aba>('visao_geral');
  const [company, setCompany] = useState<Company | null>(null);
  const [isVendas, setIsVendas] = useState(false);

  // ── NOVO: estado do modal Emitir Nota ──────────────────────────────
  const [showEmitirNota, setShowEmitirNota] = useState(false);
  const [pageTheme, setPageTheme] = useState<'dark' | 'light'>('light');

  // Detecta tema dark/light automaticamente
  useEffect(() => {
    const detectTheme = () => {
      setPageTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    };
    detectTheme();
    const observer = new MutationObserver(detectTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const loadCompany = async () => {
    if (!companyId) return;
    const { data } = await supabase
      .from('companies')
      .select(`
        id, name, assistant_type,
        brasilnfe_token, brasilnfe_ambiente,
        nfe_plano, nfe_ativo, nfe_cert_expiracao,
        nfe_cnpj, nfe_crt, nfe_cnae,
        nfe_ie, nfe_im, nfe_csc_identificador, nfe_csc_codigo
      `)
      .eq('id', companyId)
      .single();

    if (data) {
      setCompany(data as Company);
      setIsVendas(data.assistant_type === 'vendas');
    }
  };

  useEffect(() => {
    loadCompany();
  }, [companyId]);

  const abas: { key: Aba; label: string; icon: any }[] = [
    { key: 'visao_geral',   label: 'Visão Geral',   icon: Receipt },
    { key: 'configuracao',  label: 'Configuração',   icon: Settings },
    { key: 'historico',     label: 'Histórico',      icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-transparent">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Notas Fiscais</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Emissão fiscal integrada ao assistente
                {selectedAssistantName && (
                  <span className="font-medium text-gray-900 dark:text-white"> {selectedAssistantName}</span>
                )}
              </p>
            </div>

            {/* ── NOVO: Botão Emitir Nota (só aparece se nfe_ativo) ── */}
            {companyId && company?.nfe_ativo && (
              <button
                onClick={() => setShowEmitirNota(true)}
                className="flex items-center gap-2 px-4 py-2 bg-lime-500 hover:bg-lime-600 text-white rounded-xl font-semibold text-sm transition shadow-sm whitespace-nowrap"
              >
                <Receipt className="w-4 h-4" />
                Emitir Nota
              </button>
            )}
          </div>

          {/* Banner modelo de cobrança */}
          {companyId && (
            <div className={`flex items-center justify-between gap-4 px-4 py-2.5 rounded-xl border ${
              isVendas
                ? 'border-lime-200 dark:border-lime-500/30 bg-lime-50 dark:bg-lime-900/10'
                : 'border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-900/10'
            }`}>
              <div className="flex items-center gap-2">
                <Receipt className={`w-4 h-4 flex-shrink-0 ${isVendas ? 'text-lime-500' : 'text-blue-500'}`} />
                <span className={`text-sm font-medium ${isVendas ? 'text-lime-800 dark:text-lime-200' : 'text-blue-800 dark:text-blue-200'}`}>
                  {isVendas ? 'minhAi Vendas — emissão de nota incluída na comissão' : 'minhAi Smart — 2 créditos por nota emitida'}
                </span>
              </div>
            </div>
          )}

          {/* Sem assistente */}
          {!companyId && (
            <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 p-12 text-center">
              <Receipt className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Selecione um Assistente</h3>
              <p className="text-gray-500 dark:text-gray-400">Escolha um assistente no topo da página para configurar a emissão fiscal</p>
            </div>
          )}

          {/* Conteúdo principal */}
          {companyId && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow border border-gray-100 dark:border-white/5 overflow-hidden">
              {/* Tabs */}
              <div className="grid grid-cols-3 border-b border-gray-200 dark:border-white/10">
                {abas.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setAba(key)}
                    className={`px-4 py-3 text-sm font-medium transition flex items-center justify-center gap-2
                      ${aba === key
                        ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border-b-transparent'
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
                    company={company}
                    onIrParaConfig={() => setAba('configuracao')}
                    onIrParaHistorico={() => setAba('historico')}
                  />
                )}
                {aba === 'configuracao' && (
                  <AbaConfiguracao
                    companyId={companyId}
                    company={company}
                    onAtualizar={loadCompany}
                  />
                )}
                {aba === 'historico' && <AbaHistorico companyId={companyId} />}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── NOVO: Modal Emitir Nota ── */}
      {showEmitirNota && companyId && (
        <EmitirNotaModal
          data={{
            companyId: companyId,
            nfe_plano: company?.nfe_plano,
          }}
          onClose={() => setShowEmitirNota(false)}
          theme={pageTheme}
          playText={playText} 
        />
      )}
    </div>
  );
}

export default function FiscalPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      }
    >
      <FiscalPageContent />
    </Suspense>
  );
}
