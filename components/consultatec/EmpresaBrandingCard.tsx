'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, Check, ImagePlus, Loader2, Palette, Pencil, Power, Save, Upload, X } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { documentoValido } from '@/lib/validateDocumento';
import type { ConsultaTecBranding } from '@/types/consultatec';

const DEFAULT_PRIMARY = '#7A6142';
const DEFAULT_SECONDARY = '#F2EAD3';

const cor = {
  fundoCard: '#FBF6E9',
  borda: '#C9BFA0',
  tinta: '#1C1A14',
  tintaMuted: '#6B6350',
  tintaFaint: '#8A8168',
  destaque: '#7A6142',
  erroTexto: '#7A2E2E',
  sucesso: '#486447',
};

function cleanCnpj(value: string) {
  return value.replace(/\D/g, '').slice(0, 14);
}

function formatCnpj(value: string) {
  const digits = cleanCnpj(value);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

function contrastColor(hex: string) {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return '#FFFFFF';
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? '#1C1A14' : '#FFFFFF';
}

interface Props {
  companyId: string;
}

export default function EmpresaBrandingCard({ companyId }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const fileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [branding, setBranding] = useState<ConsultaTecBranding | null>(null);
  const [cnpj, setCnpj] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY);
  const [secondaryColor, setSecondaryColor] = useState(DEFAULT_SECONDARY);
  const [enabled, setEnabled] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyBranding = (data: ConsultaTecBranding | null) => {
    setBranding(data);
    setCnpj(data?.cnpj ? formatCnpj(data.cnpj) : '');
    setCompanyName(data?.company_name ?? '');
    setLogoUrl(data?.logo_url ?? null);
    setPrimaryColor(data?.primary_color ?? DEFAULT_PRIMARY);
    setSecondaryColor(data?.secondary_color ?? DEFAULT_SECONDARY);
    setEnabled(data?.enabled ?? true);
    setAuthorized(Boolean(data?.attested_at));
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      const { data, error: loadError } = await supabase
        .from('consultatec_branding')
        .select('company_id, cnpj, company_name, logo_url, primary_color, secondary_color, enabled, attested_at')
        .eq('company_id', companyId)
        .maybeSingle();

      if (cancelled) return;
      if (loadError) {
        setError('Não foi possível carregar a personalização dos relatórios.');
      } else {
        applyBranding((data as ConsultaTecBranding | null) ?? null);
        setEditing(!data);
      }
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [companyId, supabase]);

  const uploadLogo = async (file: File) => {
    setError(null);
    setMessage(null);

    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      setError('Envie o logo em PNG ou JPG.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('O logo deve ter no máximo 2 MB.');
      return;
    }

    setSaving(true);
    try {
      const ext = file.type === 'image/jpeg' ? 'jpg' : 'png';
      const path = `logos/${companyId}/consultatec/logo.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(path, file, {
          upsert: true,
          contentType: file.type,
          cacheControl: '3600',
        });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('company-assets').getPublicUrl(path);
      if (!data?.publicUrl) throw new Error('Não foi possível obter a URL pública do logo.');
      setLogoUrl(`${data.publicUrl}?v=${Date.now()}`);
      setMessage('Logo carregado. Salve para aplicar aos relatórios.');
    } catch (err: any) {
      setError(err?.message || 'Não foi possível enviar o logo.');
    } finally {
      setSaving(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const save = async () => {
    setError(null);
    setMessage(null);
    const digits = cleanCnpj(cnpj);

    if (!documentoValido(digits) || digits.length !== 14) {
      setError('Informe um CNPJ válido.');
      return;
    }
    if (companyName.trim().length < 2) {
      setError('Informe o nome que deve aparecer nos relatórios.');
      return;
    }
    if (!authorized) {
      setError('Confirme que você tem autorização para usar este CNPJ e esta marca.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        company_id: companyId,
        cnpj: digits,
        company_name: companyName.trim(),
        logo_url: logoUrl,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        enabled,
        attested_at: branding?.attested_at || new Date().toISOString(),
      };

      const { data, error: upsertError } = await supabase
        .from('consultatec_branding')
        .upsert(payload, { onConflict: 'company_id' })
        .select('company_id, cnpj, company_name, logo_url, primary_color, secondary_color, enabled, attested_at')
        .single();

      if (upsertError) throw upsertError;
      applyBranding(data as ConsultaTecBranding);
      setEditing(false);
      setMessage('Identidade visual salva. As próximas consultas em PDF já usarão sua marca.');
    } catch (err: any) {
      setError(err?.message || 'Não foi possível salvar a identidade visual.');
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async () => {
    if (!branding) return;
    const next = !branding.enabled;
    setSaving(true);
    setError(null);
    try {
      const { data, error: updateError } = await supabase
        .from('consultatec_branding')
        .update({ enabled: next })
        .eq('company_id', companyId)
        .select('company_id, cnpj, company_name, logo_url, primary_color, secondary_color, enabled, attested_at')
        .single();
      if (updateError) throw updateError;
      applyBranding(data as ConsultaTecBranding);
      setMessage(next ? 'Sua marca voltou a ser usada nos relatórios.' : 'Os relatórios voltarão a usar a identidade ConsultaTec.');
    } catch (err: any) {
      setError(err?.message || 'Não foi possível alterar a personalização.');
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    applyBranding(branding);
    setEditing(false);
    setError(null);
    setMessage(null);
  };

  if (loading) {
    return (
      <div className="rounded-2xl border p-5" style={{ backgroundColor: cor.fundoCard, borderColor: cor.borda }}>
        <div className="flex items-center gap-2 text-sm" style={{ color: cor.tintaMuted }}>
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando identidade visual...
        </div>
      </div>
    );
  }

  const previewText = contrastColor(primaryColor);

  return (
    <div className="rounded-2xl border p-5" style={{ backgroundColor: cor.fundoCard, borderColor: cor.borda }}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-4 h-4" style={{ color: cor.destaque }} />
            <p className="text-sm font-bold" style={{ color: cor.tinta }}>Relatórios com sua marca</p>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: cor.tintaMuted }}>
            Para empresas: salve seu CNPJ, logo e duas cores. Seus PDFs passam a sair personalizados automaticamente.
          </p>
        </div>
        {branding && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="p-2 rounded-lg border flex-shrink-0"
            style={{ borderColor: cor.borda, color: cor.tintaMuted }}
            title="Editar identidade visual"
          >
            <Pencil className="w-4 h-4" />
          </button>
        )}
      </div>

      {message && (
        <div className="mb-3 px-3 py-2 rounded-lg border text-xs flex items-start gap-2" style={{ borderColor: '#9DB49B', backgroundColor: '#EEF4EC', color: cor.sucesso }}>
          <Check className="w-4 h-4 flex-shrink-0" /> {message}
        </div>
      )}
      {error && (
        <div className="mb-3 px-3 py-2 rounded-lg border text-xs" style={{ borderColor: '#C9A09A', backgroundColor: '#F4E4E0', color: cor.erroTexto }}>
          {error}
        </div>
      )}

      {!editing && branding ? (
        <>
          <div className="rounded-xl overflow-hidden border mb-3" style={{ borderColor: cor.borda }}>
            <div className="h-2" style={{ backgroundColor: branding.primary_color }} />
            <div className="p-4 flex items-center gap-3" style={{ backgroundColor: branding.secondary_color }}>
              {branding.logo_url ? (
                <div className="w-12 h-12 rounded-lg bg-white/90 border flex items-center justify-center overflow-hidden flex-shrink-0" style={{ borderColor: cor.borda }}>
                  <img src={branding.logo_url} alt="Logo da empresa" className="max-w-full max-h-full object-contain" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-lg bg-white/70 border flex items-center justify-center flex-shrink-0" style={{ borderColor: cor.borda }}>
                  <Building2 className="w-5 h-5" style={{ color: branding.primary_color }} />
                </div>
              )}
              <div className="min-w-0">
                <p className="font-bold text-sm truncate" style={{ color: contrastColor(branding.secondary_color) }}>{branding.company_name}</p>
                <p className="text-[11px]" style={{ color: contrastColor(branding.secondary_color), opacity: 0.78 }}>{formatCnpj(branding.cnpj)}</p>
                <p className="text-[10px] mt-1" style={{ color: branding.enabled ? cor.sucesso : cor.tintaFaint }}>
                  {branding.enabled ? 'Personalização ativa' : 'Usando identidade ConsultaTec'}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={toggleEnabled}
            disabled={saving}
            className="w-full py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2"
            style={{ borderColor: cor.borda, color: cor.tinta }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
            {branding.enabled ? 'Usar padrão ConsultaTec' : 'Usar minha marca nos PDFs'}
          </button>
        </>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold mb-1" style={{ color: cor.tintaMuted }}>CNPJ da empresa</label>
            <input
              value={cnpj}
              onChange={(e) => setCnpj(formatCnpj(e.target.value))}
              maxLength={18}
              inputMode="numeric"
              placeholder="00.000.000/0000-00"
              className="w-full px-3 py-2.5 rounded-xl border bg-transparent text-sm outline-none"
              style={{ borderColor: cor.borda, color: cor.tinta }}
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold mb-1" style={{ color: cor.tintaMuted }}>Nome exibido no relatório</label>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value.slice(0, 120))}
              placeholder="Nome da sua empresa"
              className="w-full px-3 py-2.5 rounded-xl border bg-transparent text-sm outline-none"
              style={{ borderColor: cor.borda, color: cor.tinta }}
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold mb-1" style={{ color: cor.tintaMuted }}>Logo</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-16 h-16 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden flex-shrink-0"
                style={{ borderColor: cor.borda, color: cor.tintaMuted }}
              >
                {logoUrl ? <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" /> : <ImagePlus className="w-5 h-5" />}
              </button>
              <div className="flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold"
                  style={{ borderColor: cor.borda, color: cor.tinta }}
                >
                  <Upload className="w-3.5 h-3.5" /> {logoUrl ? 'Trocar logo' : 'Enviar logo'}
                </button>
                <p className="text-[10px] mt-1" style={{ color: cor.tintaFaint }}>PNG ou JPG, até 2 MB.</p>
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadLogo(file);
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold mb-1 flex items-center gap-1" style={{ color: cor.tintaMuted }}>
                <Palette className="w-3 h-3" /> Cor principal
              </label>
              <div className="flex items-center gap-2 rounded-xl border px-2 py-2" style={{ borderColor: cor.borda }}>
                <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value.toUpperCase())} className="w-8 h-8 border-0 bg-transparent cursor-pointer" />
                <span className="font-mono text-[10px] truncate" style={{ color: cor.tintaMuted }}>{primaryColor}</span>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold mb-1 flex items-center gap-1" style={{ color: cor.tintaMuted }}>
                <Palette className="w-3 h-3" /> Cor secundária
              </label>
              <div className="flex items-center gap-2 rounded-xl border px-2 py-2" style={{ borderColor: cor.borda }}>
                <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value.toUpperCase())} className="w-8 h-8 border-0 bg-transparent cursor-pointer" />
                <span className="font-mono text-[10px] truncate" style={{ color: cor.tintaMuted }}>{secondaryColor}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl overflow-hidden border" style={{ borderColor: cor.borda }}>
            <div className="h-2" style={{ backgroundColor: primaryColor }} />
            <div className="p-3" style={{ backgroundColor: secondaryColor }}>
              <div className="inline-flex px-3 py-1.5 rounded-lg text-xs font-bold" style={{ backgroundColor: primaryColor, color: previewText }}>
                Prévia do relatório
              </div>
              <p className="mt-2 text-sm font-bold" style={{ color: contrastColor(secondaryColor) }}>{companyName || 'Nome da sua empresa'}</p>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: cor.tintaMuted }}>
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            Usar minha identidade visual nos relatórios
          </label>

          <label className="flex items-start gap-2 text-[11px] leading-relaxed cursor-pointer" style={{ color: cor.tintaMuted }}>
            <input type="checkbox" checked={authorized} onChange={(e) => setAuthorized(e.target.checked)} className="mt-0.5" />
            Declaro que tenho autorização para utilizar este CNPJ, nome e logotipo nos relatórios gerados pela minha conta.
          </label>

          <div className="flex gap-2">
            {branding && (
              <button
                type="button"
                onClick={cancelEdit}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2"
                style={{ borderColor: cor.borda, color: cor.tintaMuted }}
              >
                <X className="w-4 h-4" /> Cancelar
              </button>
            )}
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
              style={{ backgroundColor: cor.destaque, color: '#F2EAD3' }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar identidade
            </button>
          </div>

          <p className="text-[10px] leading-relaxed" style={{ color: cor.tintaFaint }}>
            O cadastro é opcional. Consultas avulsas sem conta continuam disponíveis normalmente.
          </p>
        </div>
      )}
    </div>
  );
}
