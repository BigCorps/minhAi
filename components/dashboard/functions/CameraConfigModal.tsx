'use client';

// ============================================================
// Config Modals das funções de câmera
// Arquivo: components/dashboard/functions/CameraConfigModals.tsx
// ============================================================

import { X, Plus, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';

type Tab = 'companion' | 'webcam' | 'mobile' | 'upload';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId?: string;
  onUpdate?: () => void;
}

// ── Checkboxes de abas ────────────────────────────────────────

const ALL_TABS: { id: Tab; label: string; desc: string }[] = [
  { id: 'companion', label: 'Celular (QR Code)',  desc: 'Usuário envia foto pelo celular via QR Code' },
  { id: 'webcam',    label: 'Webcam',             desc: 'Câmera do computador/totem' },
  { id: 'mobile',    label: 'Câmera (mobile)',    desc: 'Câmera nativa do celular' },
  { id: 'upload',    label: 'Upload de arquivo',  desc: 'Selecionar imagem ou PDF do dispositivo' },
];

interface TabCheckboxesProps {
  enabledTabs: Tab[];
  onChange: (tabs: Tab[]) => void;
}

function TabCheckboxes({ enabledTabs, onChange }: TabCheckboxesProps) {
  return (
    <div className="flex flex-col gap-3 mt-4">
      <p className="text-sm font-semibold dark:text-white">Abas disponíveis para o usuário</p>
      {ALL_TABS.map(tab => {
        const isChecked = enabledTabs.includes(tab.id);
        const isLast = enabledTabs.length === 1 && isChecked;
        return (
          <label key={tab.id} className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isChecked}
              disabled={isLast}
              onChange={(e) => {
                onChange(
                  e.target.checked
                    ? [...enabledTabs, tab.id]
                    : enabledTabs.filter(t => t !== tab.id)
                );
              }}
              className="mt-1 accent-indigo-600"
            />
            <div>
              <p className={`text-sm font-medium ${isLast ? 'opacity-50' : 'dark:text-white'}`}>{tab.label}</p>
              <p className="text-xs text-slate-400">{tab.desc}</p>
            </div>
          </label>
        );
      })}
      {enabledTabs.length === 1 && (
        <p className="text-xs text-amber-400">Pelo menos uma aba deve estar ativa.</p>
      )}
    </div>
  );
}

// ── Hook para ler/salvar enabledTabs ─────────────────────────

function useEnabledTabs(companyId: string | undefined, functionKey: string, isOpen: boolean) {
  const [enabledTabs, setEnabledTabs] = useState<Tab[]>(['companion', 'webcam', 'mobile', 'upload']);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!isOpen || !companyId) return;
    supabase
      .from('company_function_settings')
      .select('config')
      .eq('company_id', companyId)
      .eq('function_key', functionKey)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.config?.enabled_tabs) {
          setEnabledTabs(data.config.enabled_tabs);
        }
      });
  }, [isOpen, companyId, functionKey]); // eslint-disable-line

  const save = async (onUpdate?: () => void, onClose?: () => void) => {
    if (!companyId) return;
    setSaving(true);
    try {
      await supabase
        .from('company_function_settings')
        .upsert(
          {
            company_id: companyId,
            function_key: functionKey,
            config: { enabled_tabs: enabledTabs },
          },
          { onConflict: 'company_id,function_key' }
        );
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onUpdate?.();
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return { enabledTabs, setEnabledTabs, save, saving, saved };
}

// ── Modal simples com checkboxes de abas ─────────────────────

interface CameraConfigModalProps extends ConfigModalProps {
  title: string;
  description: string;
  functionKey: string;
}

function CameraConfigModal({ isOpen, onClose, companyId, onUpdate, title, description, functionKey }: CameraConfigModalProps) {
  const { enabledTabs, setEnabledTabs, save, saving, saved } = useEnabledTabs(companyId, functionKey, isOpen);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold dark:text-white">{title}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <p className="text-sm text-gray-500 dark:text-slate-400">{description}</p>

        <TabCheckboxes enabledTabs={enabledTabs} onChange={setEnabledTabs} />

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2 border rounded-xl text-sm dark:border-slate-700 dark:text-slate-300"
          >
            Cancelar
          </button>
          <button
            onClick={() => save(onUpdate, onClose)}
            disabled={saving}
            className={`flex-1 py-2 rounded-xl font-bold transition-all disabled:opacity-50 ${
              saved ? 'bg-green-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {saving ? 'Salvando...' : saved ? '✓ Salvo!' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Exports por função ────────────────────────────────────────

export function LerQRCodeConfigModal({ isOpen, onClose, companyId, onUpdate }: ConfigModalProps) {
  return (
    <CameraConfigModal
      isOpen={isOpen} onClose={onClose} companyId={companyId} onUpdate={onUpdate}
      title="Ler QR Code"
      description="Processamento feito diretamente no dispositivo (sem custo de API). Configure quais abas de captura estarão disponíveis."
      functionKey="ler_qrcode"
    />
  );
}

export function LerCodigoBarrasConfigModal({ isOpen, onClose, companyId, onUpdate }: ConfigModalProps) {
  return (
    <CameraConfigModal
      isOpen={isOpen} onClose={onClose} companyId={companyId} onUpdate={onUpdate}
      title="Ler Código de Barras"
      description="Usa a BarcodeDetector API nativa quando disponível, com fallback via IA. Configure quais abas de captura estarão disponíveis."
      functionKey="ler_codigo_barras"
    />
  );
}

export function ImagemEmTextoConfigModal({ isOpen, onClose, companyId, onUpdate }: ConfigModalProps) {
  return (
    <CameraConfigModal
      isOpen={isOpen} onClose={onClose} companyId={companyId} onUpdate={onUpdate}
      title="Imagem em Texto (OCR)"
      description="Usa IA para extrair texto de imagens. Cada uso consome 3 créditos. Configure quais abas de captura estarão disponíveis."
      functionKey="imagem_em_texto"
    />
  );
}

export function TabelaEmTextoConfigModal({ isOpen, onClose, companyId, onUpdate }: ConfigModalProps) {
  return (
    <CameraConfigModal
      isOpen={isOpen} onClose={onClose} companyId={companyId} onUpdate={onUpdate}
      title="Tabela em Texto"
      description="Converte tabelas fotografadas para CSV usando IA. Cada uso consome 3 créditos. Configure quais abas de captura estarão disponíveis."
      functionKey="tabela_em_texto"
    />
  );
}

export function ContratoEmTextoConfigModal({ isOpen, onClose, companyId, onUpdate }: ConfigModalProps) {
  return (
    <CameraConfigModal
      isOpen={isOpen} onClose={onClose} companyId={companyId} onUpdate={onUpdate}
      title="Contrato em Texto"
      description="Digitaliza contratos e documentos legais com IA. Cada uso consome 5 créditos. Configure quais abas de captura estarão disponíveis."
      functionKey="contrato_em_texto"
    />
  );
}

// ── Form variants (sem modal wrapper) ────────────────────────

interface CameraFormProps {
  companyId?: string;
  functionKey?: string;
}

function CameraTabsForm({ companyId, functionKey }: CameraFormProps) {
  const key = functionKey ?? '';
  const { enabledTabs, setEnabledTabs, save, saving, saved } = useEnabledTabs(companyId, key, true);

  return (
    <div>
      <TabCheckboxes enabledTabs={enabledTabs} onChange={setEnabledTabs} />
      <button
        onClick={() => save()}
        disabled={saving}
        className={`mt-6 w-full py-2 rounded-xl font-bold transition-all disabled:opacity-50 ${
          saved ? 'bg-green-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
        }`}
      >
        {saving ? 'Salvando...' : saved ? '✓ Salvo com sucesso!' : 'Salvar configurações de abas'}
      </button>
    </div>
  );
}

export function LerQRCodeConfigForm(props: CameraFormProps) {
  return <CameraTabsForm {...props} functionKey="ler_qrcode" />;
}
export function LerCodigoBarrasConfigForm(props: CameraFormProps) {
  return <CameraTabsForm {...props} functionKey="ler_codigo_barras" />;
}
export function ImagemEmTextoConfigForm(props: CameraFormProps) {
  return <CameraTabsForm {...props} functionKey="imagem_em_texto" />;
}
export function TabelaEmTextoConfigForm(props: CameraFormProps) {
  return <CameraTabsForm {...props} functionKey="tabela_em_texto" />;
}
export function ContratoEmTextoConfigForm(props: CameraFormProps) {
  return <CameraTabsForm {...props} functionKey="contrato_em_texto" />;
}

// ── ValidarCupom mantém configuração adicional ────────────────

interface Cupom {
  id?: string;
  code: string;
  discount: number;
  expires_at: string;
  is_active: boolean;
}

export function ValidarCupomConfigModal({ isOpen, onClose, companyId, onUpdate }: ConfigModalProps) {
  const [cupons, setCupons] = useState<Cupom[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newCupom, setNewCupom] = useState<Cupom>({ code: '', discount: 10, expires_at: '', is_active: true });
  const { enabledTabs, setEnabledTabs, save: saveTabs, saving: savingTabs, saved: savedTabs } = useEnabledTabs(companyId, 'validar_cupom', isOpen);
  const supabase = createClient();

  useEffect(() => {
    if (!isOpen || !companyId) return;
    setLoading(true);
    supabase
      .from('cupons')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setCupons(data ?? []);
        setLoading(false);
      });
  }, [isOpen, companyId]); // eslint-disable-line

  const handleAddCupom = async () => {
    if (!newCupom.code.trim()) return;
    setSaving(true);
    try {
      await supabase.from('cupons').insert({
        company_id: companyId,
        code: newCupom.code.trim().toUpperCase(),
        discount: newCupom.discount,
        expires_at: newCupom.expires_at || null,
        is_active: newCupom.is_active,
      });
      setNewCupom({ code: '', discount: 10, expires_at: '', is_active: true });
      const { data } = await supabase.from('cupons').select('*').eq('company_id', companyId).order('created_at', { ascending: false });
      setCupons(data ?? []);
      onUpdate?.();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('cupons').delete().eq('id', id);
    setCupons(prev => prev.filter(c => c.id !== id));
  };

  const handleToggle = async (id: string, is_active: boolean) => {
    await supabase.from('cupons').update({ is_active: !is_active }).eq('id', id);
    setCupons(prev => prev.map(c => c.id === id ? { ...c, is_active: !is_active } : c));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold dark:text-white">Gerenciar Cupons</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        <TabCheckboxes enabledTabs={enabledTabs} onChange={setEnabledTabs} />

        <div className="border-t dark:border-slate-700 my-6" />

        <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-4 mb-6">
          <h4 className="text-sm font-semibold dark:text-white mb-3">Novo Cupom</h4>
          <div className="flex flex-col gap-3">
            <input
              value={newCupom.code}
              onChange={e => setNewCupom(p => ({ ...p, code: e.target.value.toUpperCase() }))}
              placeholder="CÓDIGO (ex: DESCONTO10)"
              className="w-full border rounded-lg px-3 py-2 text-sm font-mono dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            />
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-500 dark:text-slate-400 mb-1 block">Desconto (%)</label>
                <input
                  type="number" min={1} max={100} value={newCupom.discount}
                  onChange={e => setNewCupom(p => ({ ...p, discount: Number(e.target.value) }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 dark:text-slate-400 mb-1 block">Expira em</label>
                <input
                  type="date" value={newCupom.expires_at}
                  onChange={e => setNewCupom(p => ({ ...p, expires_at: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                />
              </div>
            </div>
            <button
              onClick={handleAddCupom}
              disabled={saving || !newCupom.code.trim()}
              className="flex items-center justify-center gap-2 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {saving ? 'Adicionando...' : 'Adicionar Cupom'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-4 text-sm text-gray-500">Carregando...</div>
        ) : cupons.length === 0 ? (
          <div className="text-center py-4 text-sm text-gray-400 dark:text-slate-500">Nenhum cupom cadastrado.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {cupons.map(cupom => (
              <div key={cupom.id} className={`flex items-center justify-between p-3 rounded-xl border ${cupom.is_active ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' : 'border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800'}`}>
                <div className="flex flex-col">
                  <span className="font-mono font-bold text-sm dark:text-white">{cupom.code}</span>
                  <span className="text-xs text-gray-500 dark:text-slate-400">
                    {cupom.discount}% off{cupom.expires_at ? ` · expira ${new Date(cupom.expires_at).toLocaleDateString('pt-BR')}` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggle(cupom.id!, cupom.is_active)}
                    className={`text-xs px-2 py-1 rounded-lg font-medium ${cupom.is_active ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-600'}`}
                  >
                    {cupom.is_active ? 'Ativo' : 'Inativo'}
                  </button>
                  <button onClick={() => handleDelete(cupom.id!)} className="text-red-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 py-2 border rounded-xl text-sm dark:border-slate-700 dark:text-slate-300">
            Cancelar
          </button>
          <button
            onClick={() => saveTabs(onUpdate, onClose)}
            disabled={savingTabs}
            className={`flex-1 py-2 rounded-xl font-bold transition-all disabled:opacity-50 ${
              savedTabs ? 'bg-green-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {savingTabs ? 'Salvando...' : savedTabs ? '✓ Salvo!' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ValidarCupomConfigForm (sem modal wrapper) ────────────────
export function ValidarCupomConfigForm({ companyId, functionKey }: CameraFormProps) {
  const [cupons, setCupons] = useState<Cupom[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newCupom, setNewCupom] = useState<Cupom>({ code: '', discount: 10, expires_at: '', is_active: true });
  const { enabledTabs, setEnabledTabs, save: saveTabs, saving: savingTabs, saved: savedTabs } = useEnabledTabs(companyId, 'validar_cupom', true);
  const supabase = createClient();

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    supabase
      .from('cupons')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setCupons(data ?? []); setLoading(false); });
  }, [companyId]); // eslint-disable-line

  const handleAddCupom = async () => {
    if (!newCupom.code.trim()) return;
    setSaving(true);
    try {
      await supabase.from('cupons').insert({
        company_id: companyId,
        code: newCupom.code.trim().toUpperCase(),
        discount: newCupom.discount,
        expires_at: newCupom.expires_at || null,
        is_active: newCupom.is_active,
      });
      setNewCupom({ code: '', discount: 10, expires_at: '', is_active: true });
      const { data } = await supabase.from('cupons').select('*').eq('company_id', companyId).order('created_at', { ascending: false });
      setCupons(data ?? []);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('cupons').delete().eq('id', id);
    setCupons(prev => prev.filter(c => c.id !== id));
  };

  const handleToggle = async (id: string, is_active: boolean) => {
    await supabase.from('cupons').update({ is_active: !is_active }).eq('id', id);
    setCupons(prev => prev.map(c => c.id === id ? { ...c, is_active: !is_active } : c));
  };

  return (
    <div>
      <TabCheckboxes enabledTabs={enabledTabs} onChange={setEnabledTabs} />

      <div className="border-t dark:border-slate-700 my-6" />

      <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-4 mb-4">
        <h4 className="text-sm font-semibold dark:text-white mb-3">Novo Cupom</h4>
        <div className="flex flex-col gap-3">
          <input
            value={newCupom.code}
            onChange={e => setNewCupom(p => ({ ...p, code: e.target.value.toUpperCase() }))}
            placeholder="CÓDIGO (ex: DESCONTO10)"
            className="w-full border rounded-lg px-3 py-2 text-sm font-mono dark:bg-slate-700 dark:border-slate-600 dark:text-white"
          />
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-500 dark:text-slate-400 mb-1 block">Desconto (%)</label>
              <input type="number" min={1} max={100} value={newCupom.discount}
                onChange={e => setNewCupom(p => ({ ...p, discount: Number(e.target.value) }))}
                className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500 dark:text-slate-400 mb-1 block">Expira em</label>
              <input type="date" value={newCupom.expires_at}
                onChange={e => setNewCupom(p => ({ ...p, expires_at: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
            </div>
          </div>
          <button onClick={handleAddCupom} disabled={saving || !newCupom.code.trim()}
            className="flex items-center justify-center gap-2 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            <Plus className="w-4 h-4" />
            {saving ? 'Adicionando...' : 'Adicionar Cupom'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-4 text-sm text-gray-500">Carregando...</div>
      ) : cupons.length === 0 ? (
        <div className="text-center py-4 text-sm text-gray-400 dark:text-slate-500">Nenhum cupom cadastrado.</div>
      ) : (
        <div className="flex flex-col gap-2 mb-4">
          {cupons.map(cupom => (
            <div key={cupom.id} className={`flex items-center justify-between p-3 rounded-xl border ${cupom.is_active ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' : 'border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800'}`}>
              <div className="flex flex-col">
                <span className="font-mono font-bold text-sm dark:text-white">{cupom.code}</span>
                <span className="text-xs text-gray-500 dark:text-slate-400">
                  {cupom.discount}% off{cupom.expires_at ? ` · expira ${new Date(cupom.expires_at).toLocaleDateString('pt-BR')}` : ''}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleToggle(cupom.id!, cupom.is_active)}
                  className={`text-xs px-2 py-1 rounded-lg font-medium ${cupom.is_active ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
                  {cupom.is_active ? 'Ativo' : 'Inativo'}
                </button>
                <button onClick={() => handleDelete(cupom.id!)} className="text-red-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => saveTabs()}
        disabled={savingTabs}
        className={`w-full py-2 rounded-xl font-bold transition-all disabled:opacity-50 ${
          savedTabs ? 'bg-green-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
        }`}
      >
        {savingTabs ? 'Salvando...' : savedTabs ? '✓ Salvo com sucesso!' : 'Salvar configurações de abas'}
      </button>
    </div>
  );
}