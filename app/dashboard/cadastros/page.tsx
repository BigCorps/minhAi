'use client';

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useAssistant } from '@/contexts/AssistantContext';
import ModoToggle from '@/components/dashboard/ModoToggle';
import PesquisasTab from '@/components/dashboard/PesquisasTab';
import PreAtendimentoTab from '@/components/dashboard/PreAtendimentoTab';
import EditarPesquisaModal from '@/components/dashboard/EditarPesquisaModal';
import EditarPreAtendimentoModal from '@/components/dashboard/EditarPreAtendimentoModal';
import {
  UserPlus, Users, Loader2, Search, Download, RefreshCw,
  Fingerprint, Camera, ChevronDown, ChevronUp, Shield,
  Monitor, Briefcase, Plus, Trash2, Save, X,
  AlertCircle, MapPin, Phone,
} from 'lucide-react';

// ── Tipos ─────────────────────────────────────────────────────────────────────

type Aba = 'cadastros' | 'clientes' | 'colaboradores' | 'totens' | 'pesquisas' | 'pre-atendimento';

interface Registration {
  id: string;
  company_id: string;
  fields: Record<string, string>;
  biometry_data: any;
  facial_id: string | null;
  created_at: string;
}

interface CompanyProfile {
  id: string;
  company_id: string;
  tipo: string;
  nome: string;
  email: string | null;
  identificador: string | null;
  endereco: string | null;
  telefone: string | null;
  pin: string | null;
  latitude: number | null;
  longitude: number | null;
  metadata: Record<string, any>;
  is_active: boolean;
  ultimo_acesso: string | null;
  created_at: string;
}

// ── Constantes ────────────────────────────────────────────────────────────────

const FIELD_LABELS: Record<string, string> = {
  nome: 'Nome', telefone: 'Telefone', email: 'E-mail',
  cpf: 'CPF', endereco: 'Endereço', empresa: 'Empresa',
  cargo: 'Cargo', observacoes: 'Observações',
};

const TIPOS_COLABORADOR = ['frentista', 'atendente', 'caixa', 'gerente', 'colaborador'];
const TIPOS_LABEL: Record<string, string> = {
  frentista: 'Frentista', atendente: 'Atendente', caixa: 'Caixa',
  gerente: 'Gerente', colaborador: 'Colaborador', totem: 'Totem',
  cliente: 'Cliente', administrador: 'Administrador',
};

const TIPOS_COR: Record<string, string> = {
  frentista:   'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
  atendente:   'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  caixa:       'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400',
  gerente:     'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
  colaborador: 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300',
  totem:       'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400',
  cliente:     'bg-pink-100 text-pink-700 dark:bg-pink-500/10 dark:text-pink-400',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) return `Hoje, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  if (diffDays === 1) return `Ontem, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  if (diffDays < 7)  return `${diffDays} dias atrás`;
  return date.toLocaleDateString('pt-BR');
}

/** Extrai telefone da coluna direta */
function getTelefone(p: CompanyProfile): string {
  return p.telefone ?? '';
}

function TipoBadge({ tipo }: { tipo: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${TIPOS_COR[tipo] ?? 'bg-gray-100 text-gray-600'}`}>
      {TIPOS_LABEL[tipo] ?? tipo}
    </span>
  );
}

function Dash() {
  return <span className="text-gray-300 dark:text-gray-600">—</span>;
}

// ── Modal de Colaborador/Totem ────────────────────────────────────────────────

function ProfileModal({
  companyId, profile, tiposDisponiveis, onClose, onSalvo,
}: {
  companyId: string;
  profile: CompanyProfile | null;
  tiposDisponiveis: string[];
  onClose: () => void;
  onSalvo: () => void;
}) {
  const supabase = createClient();
  const [form, setForm] = useState({
    tipo:          profile?.tipo                ?? tiposDisponiveis[0] ?? 'colaborador',
    nome:          profile?.nome                ?? '',
    email:         profile?.email               ?? '',
    identificador: profile?.identificador       ?? '',
    pin:           profile?.pin                 ?? '',
    endereco:      profile?.endereco            ?? '',
    telefone:      profile?.telefone            ?? '',
    is_active:     profile?.is_active           ?? true,
  });
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isTotem = form.tipo === 'totem';

  async function handleSalvar() {
    if (!form.nome.trim()) { setError('Nome é obrigatório'); return; }
    if (!form.email.trim() && !form.identificador.trim()) {
      setError('Informe pelo menos um E-mail ou Identificador para que o perfil consiga fazer login.');
      return;
    }
    setSaving(true); setError('');
    try {
      const payload = {
        company_id:    companyId,
        tipo:          form.tipo,
        nome:          form.nome.trim(),
        email:         form.email.trim()         || null,
        identificador: form.identificador.trim() || null,
        pin:           form.pin.trim()           || null,
        endereco:      form.endereco.trim()      || null,
        telefone:      form.telefone.trim()      || null,
        is_active:     form.is_active,
      };
      if (profile) {
        const { error: err } = await supabase.from('company_profiles').update(payload).eq('id', profile.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('company_profiles').insert(payload);
        if (err) throw err;
      }
      onSalvo(); onClose();
    } catch (e: any) {
      setError(e.message ?? 'Erro ao salvar');
    } finally { setSaving(false); }
  }

  async function handleDeletar() {
    setSaving(true);
    try {
      await supabase.from('company_profiles').delete().eq('id', profile!.id);
      onSalvo(); onClose();
    } catch (e: any) {
      setError(e.message ?? 'Erro ao excluir');
      setSaving(false);
    }
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500';
  const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-white/10 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{profile ? 'Editar perfil' : 'Novo perfil'}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-500/10 rounded-xl text-red-700 dark:text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}

          {tiposDisponiveis.length > 1 && (
            <div>
              <label className={labelCls}>Tipo</label>
              <select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))} className={inputCls}>
                {tiposDisponiveis.map(t => <option key={t} value={t}>{TIPOS_LABEL[t] ?? t}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className={labelCls}>Nome <span className="text-red-500">*</span></label>
            <input type="text" value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
              placeholder={isTotem ? 'Ex: Bomba 3, Caixa 1' : 'Nome completo'} className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>
              E-mail{!form.identificador.trim() && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="email@exemplo.com" className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>
              Identificador{!form.email.trim() && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input type="text" value={form.identificador} onChange={e => setForm(p => ({ ...p, identificador: e.target.value }))}
              placeholder={isTotem ? 'Ex: Bomba 3, Loja Centro' : 'Matrícula, usuário ou telefone'} className={inputCls} />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Usado no login junto com o PIN.
            </p>
          </div>

          {!isTotem && (
            <div>
              <label className={labelCls}>Telefone</label>
              <input
                type="tel"
                value={form.telefone}
                onChange={e => setForm(p => ({ ...p, telefone: e.target.value }))}
                placeholder="(XX) XXXXX-XXXX"
                className={inputCls}
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Usado para notificações e chamada de gerente via SMS.
              </p>
            </div>
          )}

          <div>
            <label className={labelCls}>PIN — Senha de acesso ao painel</label>
            <input type="text" inputMode="numeric" maxLength={6} value={form.pin}
              onChange={e => setForm(p => ({ ...p, pin: e.target.value.replace(/\D/g, '') }))}
              placeholder="4 a 6 dígitos" className={inputCls + ' font-mono tracking-widest'} />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              O perfil usará o identificador (ou e-mail) + este PIN para entrar em{' '}
              <span className="font-mono">/cliente/[slug]</span>.
            </p>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Perfil ativo</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Perfis inativos não conseguem fazer login</p>
            </div>
            <button type="button" onClick={() => setForm(p => ({ ...p, is_active: !p.is_active }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_active ? 'bg-blue-500' : 'bg-gray-300 dark:bg-slate-600'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-white/10 flex items-center justify-between sticky bottom-0 bg-white dark:bg-slate-900">
          {profile && (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-500">Confirmar exclusão?</span>
                <button onClick={handleDeletar} disabled={saving} className="text-xs px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition disabled:opacity-50">Sim, excluir</button>
                <button onClick={() => setConfirmDelete(false)} className="text-xs px-3 py-1.5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-600 dark:text-gray-400 transition">Cancelar</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 transition">
                <Trash2 className="w-3.5 h-3.5" />Excluir
              </button>
            )
          )}
          <div className="flex items-center gap-3 ml-auto">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition">Cancelar</button>
            <button onClick={handleSalvar} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition disabled:opacity-60">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ABA: Cadastros ────────────────────────────────────────────────────────────

function AbaCadastros({ companyId, assistantName }: { companyId: string; assistantName: string }) {
  const supabase = createClient();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [customLabels, setCustomLabels] = useState<Record<string, string>>({});

  useEffect(() => { load(); }, [companyId]);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('registrations').select('*').eq('company_id', companyId)
      .order('created_at', { ascending: sortOrder === 'asc' });
    setRegistrations(data ?? []);
    const { data: config } = await supabase.from('registration_configs').select('custom_fields')
      .eq('company_id', companyId).maybeSingle();
    if (config?.custom_fields) {
      const labels: Record<string, string> = {};
      (config.custom_fields as { key: string; label: string }[]).forEach(cf => { labels[cf.key] = cf.label || cf.key; });
      setCustomLabels(labels);
    }
    setLoading(false);
  }

  const allFieldKeys = [...new Set(registrations.flatMap(r => Object.keys(r.fields ?? {})))];
  const filtered = registrations.filter(r => {
    if (!search.trim()) return true;
    return Object.values(r.fields ?? {}).join(' ').toLowerCase().includes(search.toLowerCase());
  }).sort((a, b) => {
    const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return sortOrder === 'desc' ? -diff : diff;
  });

  function exportCSV() {
    if (!filtered.length) return;
    const headers = ['Data', ...allFieldKeys.map(k => FIELD_LABELS[k] ?? k), 'Biometria', 'Facial'];
    const rows = filtered.map(r => [
      new Date(r.created_at).toLocaleString('pt-BR'),
      ...allFieldKeys.map(k => r.fields?.[k] ?? ''),
      r.biometry_data ? 'Sim' : 'Pendente',
      r.facial_id ?? 'Pendente',
    ]);
    const csv = [headers, ...rows].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `cadastros_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, telefone, e-mail..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{filtered.length} registro{filtered.length !== 1 ? 's' : ''}</span>
          <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={exportCSV} disabled={filtered.length === 0} className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg border border-gray-200 dark:border-white/10 transition disabled:opacity-40">
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
        </div>
      </div>

      {loading && <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>}

      {!loading && filtered.length === 0 && (
        <div className="bg-white/50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 p-12 text-center">
          <UserPlus className="w-16 h-16 mx-auto mb-4 text-gray-400 opacity-40" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{search ? 'Nenhum resultado' : 'Nenhum cadastro ainda'}</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {search ? 'Tente outros termos' : `Os cadastros coletados pelo assistente ${assistantName} aparecerão aqui`}
          </p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="bg-white/50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200"
                    onClick={() => setSortOrder(s => s === 'desc' ? 'asc' : 'desc')}>
                    <span className="flex items-center gap-1">Data {sortOrder === 'desc' ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}</span>
                  </th>
                  {allFieldKeys.map(k => (
                    <th key={k} className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {FIELD_LABELS[k] ?? customLabels[k] ?? k}
                    </th>
                  ))}
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    <span className="flex items-center gap-1"><Fingerprint className="w-3.5 h-3.5" />Biometria</span>
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    <span className="flex items-center gap-1"><Camera className="w-3.5 h-3.5" />Facial</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition">
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(r.created_at)}</td>
                    {allFieldKeys.map(k => (
                      <td key={k} className="px-4 py-3 text-gray-900 dark:text-white max-w-[200px] truncate">
                        {r.fields?.[k] ?? <Dash />}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      {r.biometry_data
                        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"><Fingerprint className="w-3 h-3" />Registrada</span>
                        : <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-white/10 text-gray-400">Pendente</span>}
                    </td>
                    <td className="px-4 py-3">
                      {r.facial_id
                        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"><Camera className="w-3 h-3" />Registrada</span>
                        : <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-white/10 text-gray-400">Pendente</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
            <p className="text-xs text-gray-400 dark:text-gray-500">{filtered.length} de {registrations.length} cadastro{registrations.length !== 1 ? 's' : ''}</p>
            <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
              <span className="flex items-center gap-1 opacity-50"><Fingerprint className="w-3 h-3" />Biometria — em breve</span>
              <span className="flex items-center gap-1 opacity-50"><Camera className="w-3 h-3" />Facial — em breve</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ABA: Clientes ─────────────────────────────────────────────────────────────

function AbaClientes({ companyId }: { companyId: string }) {
  const supabase = createClient();
  const [profiles, setProfiles] = useState<CompanyProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    load();

    const channel = supabase
      .channel(`clientes-${companyId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'company_profiles',
        filter: `company_id=eq.${companyId}`,
      }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          const updated = payload.new as CompanyProfile;
          if (updated.tipo === 'cliente') {
            setProfiles(prev =>
              prev.map(p => p.id === updated.id ? { ...p, ...updated } : p)
            );
          }
        }
        if (payload.eventType === 'INSERT') {
          const inserted = payload.new as CompanyProfile;
          if (inserted.tipo === 'cliente') {
            setProfiles(prev => [inserted, ...prev]);
          }
        }
        if (payload.eventType === 'DELETE') {
          setProfiles(prev => prev.filter(p => p.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [companyId]);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('company_profiles').select('*')
      .eq('company_id', companyId).eq('tipo', 'cliente')
      .order('created_at', { ascending: false });
    setProfiles(data ?? []);
    setLoading(false);
  }

  async function toggleAtivo(id: string, atual: boolean) {
    await supabase.from('company_profiles').update({ is_active: !atual }).eq('id', id);
    setProfiles(p => p.map(pr => pr.id === id ? { ...pr, is_active: !atual } : pr));
  }

  const filtered = profiles.filter(p => {
    if (!search.trim()) return true;
    const tel = getTelefone(p);
    return `${p.nome} ${p.email ?? ''} ${p.identificador ?? ''} ${tel}`.toLowerCase().includes(search.toLowerCase());
  }).sort((a, b) => {
    const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return sortOrder === 'desc' ? -diff : diff;
  });

  function exportCSV() {
    const headers = ['Data', 'Nome', 'E-mail', 'Telefone', 'Endereço', 'Último acesso', 'Ativo'];
    const rows = filtered.map(p => [
      new Date(p.created_at).toLocaleString('pt-BR'),
      p.nome,
      p.email ?? '',
      getTelefone(p),
      p.endereco ?? '',
      p.ultimo_acesso ? new Date(p.ultimo_acesso).toLocaleString('pt-BR') : '',
      p.is_active ? 'Sim' : 'Não',
    ]);
    const csv = [headers, ...rows].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `clientes_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="bg-white/50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, e-mail ou telefone..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{filtered.length} cliente{filtered.length !== 1 ? 's' : ''}</span>
          <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={exportCSV} disabled={filtered.length === 0} className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg border border-gray-200 dark:border-white/10 transition disabled:opacity-40">
            <Download className="w-4 h-4" /> CSV
          </button>
        </div>
      </div>

      {loading && <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>}

      {!loading && filtered.length === 0 && (
        <div className="bg-white/50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 p-12 text-center">
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {search ? 'Nenhum resultado' : 'Nenhum cliente cadastrado ainda'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Clientes aparecem aqui após se cadastrarem via função "Minha Conta" no slug.</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="bg-white/50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 cursor-pointer select-none"
                    onClick={() => setSortOrder(s => s === 'desc' ? 'asc' : 'desc')}>
                    <span className="flex items-center gap-1">Data {sortOrder === 'desc' ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}</span>
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Nome</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">E-mail</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />Telefone</span>
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />Endereço</span>
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Último acesso</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const tel = getTelefone(p);
                  return (
                    <tr key={p.id} className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition">
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(p.created_at)}</td>
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{p.nome}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{p.email ?? <Dash />}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{tel || <Dash />}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-[180px] truncate">{p.endereco || <Dash />}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {p.ultimo_acesso ? formatDate(p.ultimo_acesso) : <Dash />}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleAtivo(p.id, p.is_active)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase transition-colors ${
                            p.is_active
                              ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400'
                          }`}>
                          {p.is_active ? 'Ativo' : 'Inativo'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 dark:border-white/5">
            <p className="text-xs text-gray-400 dark:text-gray-500">{filtered.length} cliente{filtered.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ABA: Colaboradores ────────────────────────────────────────────────────────

function AbaColaboradores({ companyId }: { companyId: string }) {
  const supabase = createClient();
  const [profiles, setProfiles] = useState<CompanyProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<CompanyProfile | null>(null);

  useEffect(() => {
    load();

    const channel = supabase
      .channel(`colaboradores-${companyId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'company_profiles',
        filter: `company_id=eq.${companyId}`,
      }, (payload) => {
        const updated = payload.new as CompanyProfile;
        if (TIPOS_COLABORADOR.includes(updated.tipo)) {
          setProfiles(prev =>
            prev.map(p => p.id === updated.id ? { ...p, ...updated } : p)
          );
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [companyId]);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('company_profiles').select('*')
      .eq('company_id', companyId).in('tipo', TIPOS_COLABORADOR)
      .order('created_at', { ascending: false });
    setProfiles(data ?? []);
    setLoading(false);
  }

  const filtered = profiles.filter(p => {
    if (tipoFiltro && p.tipo !== tipoFiltro) return false;
    if (!search.trim()) return true;
    const tel = getTelefone(p);
    return `${p.nome} ${p.email ?? ''} ${p.identificador ?? ''} ${tel}`.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-4">
      <div className="bg-white/50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar colaborador..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <select value={tipoFiltro} onChange={e => setTipoFiltro(e.target.value)}
            className="py-2 px-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Todos os tipos</option>
            {TIPOS_COLABORADOR.map(t => <option key={t} value={t}>{TIPOS_LABEL[t]}</option>)}
          </select>
          <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{filtered.length} colaborador{filtered.length !== 1 ? 'es' : ''}</span>
          <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => { setEditando(null); setModalAberto(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition shadow-sm">
            <Plus className="w-4 h-4" /> Novo colaborador
          </button>
        </div>
      </div>

      {loading && <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>}

      {!loading && filtered.length === 0 && (
        <div className="bg-white/50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 p-12 text-center">
          <Briefcase className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {search || tipoFiltro ? 'Nenhum resultado' : 'Nenhum colaborador cadastrado'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Cadastre frentistas, atendentes, caixas e gerentes aqui.</p>
          {!search && !tipoFiltro && (
            <button onClick={() => { setEditando(null); setModalAberto(true); }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition">
              <Plus className="w-4 h-4" /> Cadastrar colaborador
            </button>
          )}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="bg-white/50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Nome</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Tipo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">E-mail</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Identificador</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />Telefone</span>
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">PIN</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Último acesso</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const tel = getTelefone(p);
                  return (
                    <tr key={p.id} className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{p.nome}</td>
                      <td className="px-4 py-3"><TipoBadge tipo={p.tipo} /></td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{p.email ?? <Dash />}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{p.identificador ?? <Dash />}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{tel || <Dash />}</td>
                      <td className="px-4 py-3">
                        {p.pin ? <span className="font-mono text-gray-400">••••</span> : <Dash />}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {p.ultimo_acesso ? formatDate(p.ultimo_acesso) : <Dash />}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          p.is_active ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400'
                        }`}>{p.is_active ? 'Ativo' : 'Inativo'}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => { setEditando(p); setModalAberto(true); }}
                          className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition">
                          Editar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 dark:border-white/5">
            <p className="text-xs text-gray-400 dark:text-gray-500">{filtered.length} colaborador{filtered.length !== 1 ? 'es' : ''}</p>
          </div>
        </div>
      )}

      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-500/10 rounded-xl border border-blue-200 dark:border-blue-500/20">
        <Shield className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Quer definir quais funções cada tipo pode acessar?</p>
          <p className="text-xs text-blue-600/80 dark:text-blue-400/80 mt-0.5">
            Acesse <a href="/dashboard/functions" className="underline font-semibold">Funções do Assistente</a> e use o seletor de perfil no topo para configurar permissões por tipo.
          </p>
        </div>
      </div>

      {modalAberto && (
        <ProfileModal companyId={companyId} profile={editando} tiposDisponiveis={TIPOS_COLABORADOR}
          onClose={() => { setModalAberto(false); setEditando(null); }} onSalvo={load} />
      )}
    </div>
  );
}

// ── ABA: Totens ───────────────────────────────────────────────────────────────

function AbaTotens({ companyId }: { companyId: string }) {
  const supabase = createClient();
  const [profiles, setProfiles] = useState<CompanyProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<CompanyProfile | null>(null);

  useEffect(() => {
    load();

    const channel = supabase
      .channel(`totens-${companyId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'company_profiles',
        filter: `company_id=eq.${companyId}`,
      }, (payload) => {
        const updated = payload.new as CompanyProfile;
        if (updated.tipo === 'totem') {
          setProfiles(prev =>
            prev.map(p => p.id === updated.id ? { ...p, ...updated } : p)
          );
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [companyId]);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('company_profiles').select('*')
      .eq('company_id', companyId).eq('tipo', 'totem')
      .order('created_at', { ascending: false });
    setProfiles(data ?? []);
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div className="bg-white/50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 p-4">
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-600 dark:text-gray-400 flex-1">Totens são dispositivos físicos fixos (tablets, quiosques).</p>
          <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => { setEditando(null); setModalAberto(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold rounded-lg transition shadow-sm">
            <Plus className="w-4 h-4" /> Novo totem
          </button>
        </div>
      </div>

      {loading && <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-cyan-500" /></div>}

      {!loading && profiles.length === 0 && (
        <div className="bg-white/50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 p-12 text-center">
          <Monitor className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Nenhum totem cadastrado</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Cadastre totens para identificar dispositivos fixos como bombas de posto, caixas de restaurante, etc.</p>
          <button onClick={() => { setEditando(null); setModalAberto(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold rounded-lg transition">
            <Plus className="w-4 h-4" /> Cadastrar totem
          </button>
        </div>
      )}

      {!loading && profiles.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles.map(p => (
            <div key={p.id}
              className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all cursor-pointer ${
                p.is_active ? 'border-gray-100 dark:border-white/5' : 'border-gray-200 dark:border-white/10 opacity-60'
              }`}
              onClick={() => { setEditando(p); setModalAberto(true); }}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-500/10 flex items-center justify-center">
                  <Monitor className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  p.is_active ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400' : 'bg-gray-100 text-gray-500'
                }`}>{p.is_active ? 'Ativo' : 'Inativo'}</span>
              </div>
              <p className="font-semibold text-gray-900 dark:text-white mb-1">{p.nome}</p>
              {p.identificador && <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{p.identificador}</p>}
              {(p.latitude && p.longitude) && (
                <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">{p.latitude.toFixed(4)}, {p.longitude.toFixed(4)}</p>
              )}
              {p.ultimo_acesso && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Último acesso: {formatDate(p.ultimo_acesso)}</p>
              )}
            </div>
          ))}
          <div onClick={() => { setEditando(null); setModalAberto(true); }}
            className="bg-white/50 dark:bg-white/5 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 hover:border-cyan-400 dark:hover:border-cyan-500 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2 p-8 min-h-[160px]">
            <Plus className="w-8 h-8 text-gray-300 dark:text-gray-600" />
            <span className="text-sm text-gray-400 dark:text-gray-500">Novo totem</span>
          </div>
        </div>
      )}

      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-500/10 rounded-xl border border-blue-200 dark:border-blue-500/20">
        <Shield className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Quer definir quais funções cada tipo pode acessar?</p>
          <p className="text-xs text-blue-600/80 dark:text-blue-400/80 mt-0.5">
            Acesse <a href="/dashboard/functions" className="underline font-semibold">Funções do Assistente</a> e use o seletor de perfil no topo para configurar permissões por tipo.
          </p>
        </div>
      </div>

      {modalAberto && (
        <ProfileModal companyId={companyId} profile={editando} tiposDisponiveis={['totem']}
          onClose={() => { setModalAberto(false); setEditando(null); }} onSalvo={load} />
      )}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

function CadastrosPageContent() {
  const { selectedAssistantId: companyId, selectedAssistantName } = useAssistant();
  const [aba, setAba] = useState<Aba>('cadastros');
  const [modalPesquisaId, setModalPesquisaId] = useState<string | null | undefined>(undefined);
  const [modalFormId, setModalFormId] = useState<string | null | undefined>(undefined);

  const abas: { key: Aba; label: string; icon: any }[] = [
    { key: 'cadastros',        label: 'Cadastros',        icon: UserPlus },
    { key: 'clientes',         label: 'Clientes',         icon: Users },
    { key: 'colaboradores',    label: 'Colaboradores',    icon: Briefcase },
    { key: 'totens',           label: 'Totens',           icon: Monitor },
    { key: 'pesquisas',        label: 'Pesquisas',        icon: Search },
    { key: 'pre-atendimento',  label: 'Pré-Atendimento',  icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-transparent">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Controle de Usuários</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Gerencie cadastros, perfis e permissões do assistente
              {selectedAssistantName && <span className="font-medium text-gray-900 dark:text-white"> {selectedAssistantName}</span>}
            </p>
          </div>

          {companyId && (
            <div className="mb-8">
              <ModoToggle companyId={companyId} modoType="fila" initialEnabled={false}
                onToggle={(enabled) => { console.log('Modo Fila atualizado:', enabled); }} />
            </div>
          )}

          {!companyId && (
            <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 p-12 text-center">
              <UserPlus className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Selecione um Assistente</h3>
              <p className="text-gray-600 dark:text-gray-400">Escolha um assistente acima para visualizar os cadastros</p>
            </div>
          )}

          {companyId && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow border border-gray-100 dark:border-white/5 overflow-hidden">
              <div className="grid grid-cols-6 sm:flex border-b border-gray-200 dark:border-white/10">
                {abas.map(({ key, label, icon: Icon }) => (
                  <button key={key} onClick={() => setAba(key)}
                    className={`sm:flex-1 px-3 py-3 text-sm font-medium transition flex items-center justify-center gap-2 border-b sm:border-b-0 ${
                      aba === key
                        ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border-b-transparent'
                    }`}>
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{label}</span>
                    <span className="sm:hidden text-xs">{label}</span>
                  </button>
                ))}
              </div>
              <div className="p-6">
                {aba === 'cadastros'        && <AbaCadastros companyId={companyId} assistantName={selectedAssistantName ?? ''} />}
                {aba === 'clientes'         && <AbaClientes companyId={companyId} />}
                {aba === 'colaboradores'    && <AbaColaboradores companyId={companyId} />}
                {aba === 'totens'           && <AbaTotens companyId={companyId} />}
                {aba === 'pesquisas'        && <PesquisasTab companyId={companyId} onOpenModal={setModalPesquisaId} />}
                {aba === 'pre-atendimento'  && <PreAtendimentoTab companyId={companyId} onOpenModal={setModalFormId} />}
              </div>
            </div>
          )}

          {modalPesquisaId !== undefined && (
            <EditarPesquisaModal
              pesquisaId={modalPesquisaId}
              companyId={companyId!}
              onClose={() => setModalPesquisaId(undefined)}
              onSave={() => { setModalPesquisaId(undefined); }}
            />
          )}
          {modalFormId !== undefined && (
            <EditarPreAtendimentoModal
              formId={modalFormId}
              companyId={companyId!}
              onClose={() => setModalFormId(undefined)}
              onSave={() => { setModalFormId(undefined); }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function CadastrosPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>}>
      <CadastrosPageContent />
    </Suspense>
  );
}
