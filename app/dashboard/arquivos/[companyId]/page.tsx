'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import ArquivosCompanyClient from './ArquivosCompanyClient';

export default function ArquivosCompanyPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.companyId as string;
  const supabase = createClient();

  const [company, setCompany]   = useState<any>(null);
  const [cupons, setCupons]     = useState<any[]>([]);
  const [consultas, setConsultas] = useState<any[]>([]);
  const [enviados, setEnviados] = useState<any[]>([]);
  const [stats, setStats]       = useState({
    totalCupons: 0,
    totalConsultas: 0,
    totalEnviados: 0,
    totalArquivos: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: companyData } = await supabase
        .from('companies')
        .select('id, name, slug')
        .eq('id', companyId)
        .eq('user_id', user.id)
        .single();

      if (!companyData) { router.push('/dashboard/arquivos'); return; }
      setCompany(companyData);

      // ── Cupons ──────────────────────────────────────────────────────────────
      const { data: cuponsData } = await supabase
        .from('cupons')
        .select('id, code, type, discount_type, discount_value, times_used, max_uses, is_active, expires_at, created_at, metadata')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      const listaCupons = cuponsData || [];
      setCupons(listaCupons);

      // ── Consultas ───────────────────────────────────────────────────────────
      const { data: consultasData } = await supabase
        .from('historico_consultas')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      const now = new Date();

      const { data: downloads } = await supabase
        .from('companion_downloads')
        .select('id, expires_at, status, token, file_base64, file_name, file_type, created_at')
        .eq('company_id', companyId)
        .gte('expires_at', now.toISOString())
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      const consultasProcessadas = (consultasData || []).map((c) => {
        const download = downloads?.find(d => {
          const diffMinutes = Math.abs(
            (new Date(d.created_at).getTime() - new Date(c.created_at).getTime()) / (1000 * 60)
          );
          return diffMinutes < 15;
        });
        const temDownloadAtivo = !!download;
        return {
          ...c,
          pdf_disponivel: temDownloadAtivo,
          minutos_restantes: temDownloadAtivo
            ? Math.max(0, Math.floor((new Date(download.expires_at).getTime() - now.getTime()) / (1000 * 60)))
            : 0,
          download_token: download?.token || null,
          file_base64: download?.file_base64 || null,
          file_name: download?.file_name || null,
          file_type: download?.file_type || null,
        };
      });
      setConsultas(consultasProcessadas);

      // ── Arquivos Enviados (companion_uploads) ───────────────────────────────
      const { data: uploadsData } = await supabase
        .from('companion_uploads')
        .select('id, token, storage_path, status, file_name, file_type, file_size, created_at, expires_at')
        .eq('company_id', companyId)
        .eq('status', 'uploaded')
        .order('created_at', { ascending: false });

      const listaEnviados = uploadsData || [];
      setEnviados(listaEnviados);

      // ── Stats ───────────────────────────────────────────────────────────────
      const totalCupons     = listaCupons.length;
      const totalConsultas  = consultasData?.length || 0;
      const totalEnviados   = listaEnviados.length;

      setStats({
        totalCupons,
        totalConsultas,
        totalEnviados,
        totalArquivos: totalCupons + totalConsultas + totalEnviados,
      });

      setLoading(false);
    };

    load();
  }, [companyId]); // eslint-disable-line

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse p-8">
        <div className="h-12 rounded-xl bg-gray-200 dark:bg-slate-800/50 w-48" />
        <div className="h-32 rounded-xl bg-gray-200 dark:bg-slate-800/50" />
        <div className="h-96 rounded-xl bg-gray-200 dark:bg-slate-800/50" />
      </div>
    );
  }

  if (!company) return null;

  return (
    <ArquivosCompanyClient
      company={company}
      cupons={cupons}
      consultas={consultas}
      enviados={enviados}
      stats={stats}
    />
  );
}
