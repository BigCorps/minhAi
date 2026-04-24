'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { useAssistant } from '@/contexts/AssistantContext';
import {
  Calendar as CalendarIcon, Mail, Link2, Loader2, AlertCircle,
  ChevronLeft, ChevronRight, Settings, RefreshCw, Clock, User,
  Paperclip, ChevronDown, ChevronUp, Send, HardDrive, Home,
  Star, TrendingUp, Phone, Globe, MapPin, MessageSquare, PhoneCall,
  CheckCircle, XCircle, BarChart2, Search, Navigation,
} from 'lucide-react';
import DrivePickerButton from '@/components/ui/DrivePickerButton';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';

// ── Types ────────────────────────────────────────────────────

interface CalendarEvent {
  id: string; title: string; start: string; end?: string;
  allDay?: boolean; backgroundColor?: string; borderColor?: string; textColor?: string;
  extendedProps?: { description?: string; location?: string; attendees?: string[] };
}

interface Email {
  id: string; threadId: string; subject: string; from: string; to: string[];
  date: string; snippet: string; body?: string; hasAttachments: boolean; isRead: boolean;
}

interface DriveImage { id: string; name: string; url: string; thumb: string; }

interface SmartDevice {
  id: string; type: string; displayName: string; online: boolean; traits: Record<string, any>;
}

interface GoogleAccount { id: string; google_email: string; is_active: boolean; }

interface GBPLocation {
  account_name: string; location_name: string; title: string;
  address: string | null; phone: string | null; website: string | null;
}

interface GBPReview {
  name: string; google_review_id: string; reviewer_name: string;
  reviewer_photo: string | null; rating: number; comment: string | null;
  reply: string | null; reply_updated_at: string | null; review_date: string;
}

interface GBPInsights {
  period: { start: string; end: string };
  totals: {
    views_search: number; views_maps: number;
    clicks_phone: number; clicks_website: number; clicks_directions: number;
  };
  daily: Record<string, Record<string, number>>;
}

type ActiveTab = 'calendar' | 'email' | 'drive' | 'smarthome' | 'gbp' | 'meet';
type GBPSubTab = 'info' | 'reviews' | 'insights';

// ── Stars helper ─────────────────────────────────────────────

function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`w-4 h-4 ${i <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
          style={{ width: size, height: size }} />
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────

function AgendaPageContent() {
  const [googleAccount, setGoogleAccount] = useState<GoogleAccount | null>(null);
  const { selectedAssistantId: selectedCompanyId } = useAssistant();

  // Calendar
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [currentTitle, setCurrentTitle] = useState('Calendário');
  const [activeView, setActiveView] = useState<'dayGridMonth' | 'timeGridWeek' | 'listWeek'>('dayGridMonth');
  const calendarRef = useRef<FullCalendar>(null);

  // Email
  const [sentEmails, setSentEmails] = useState<Email[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);

  // Drive
  const [driveImages, setDriveImages] = useState<DriveImage[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<{ id: string; name: string } | null>(null);
  const [loadingImages, setLoadingImages] = useState(false);

  // Smart Home
  const [smartDevices, setSmartDevices] = useState<SmartDevice[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [deviceAction, setDeviceAction] = useState<string | null>(null);

  // GBP — Informações
  const [gbpLinked, setGbpLinked] = useState(false);
  const [gbpLocations, setGbpLocations] = useState<GBPLocation[]>([]);
  const [loadingGbpLocations, setLoadingGbpLocations] = useState(false);
  const [gbpMinhAi, setGbpMinhAi] = useState<Record<string, string>>({});
  const [gbpGoogle, setGbpGoogle] = useState<Record<string, string | null>>({});
  const [loadingGbpInfo, setLoadingGbpInfo] = useState(false);
  const [syncingGbp, setSyncingGbp] = useState(false);
  const [gbpChoices, setGbpChoices] = useState<Record<string, 'minhai' | 'google'>>({});

  // GBP — Avaliações
  const [gbpReviews, setGbpReviews] = useState<GBPReview[]>([]);
  const [gbpAvgRating, setGbpAvgRating] = useState(0);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // GBP — Insights
  const [gbpInsights, setGbpInsights] = useState<GBPInsights | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  // Meet
  const [meetTitle, setMeetTitle]     = useState('Reunião');
  const [meetDate, setMeetDate]       = useState('');
  const [meetTime, setMeetTime]       = useState('');
  const [meetEmail, setMeetEmail]     = useState('');
  const [meetLoading, setMeetLoading] = useState(false);
  const [meetError, setMeetError]     = useState<string | null>(null);
  const [meetSuccess, setMeetSuccess] = useState<string | null>(null);

  // General
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('calendar');
  const [gbpSubTab, setGbpSubTab] = useState<GBPSubTab>('info');

  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const supabase = createClient();

  useEffect(() => {
    if (selectedCompanyId) {
      loadGoogleAccount(selectedCompanyId);
    } else {
      setGoogleAccount(null);
      setEvents([]);
      setSentEmails([]);
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    if (!selectedCompanyId || !googleAccount) return;
    if (activeTab === 'drive' && driveImages.length === 0 && selectedFolder) loadDriveImages(selectedFolder.id);
    if (activeTab === 'smarthome' && smartDevices.length === 0) loadSmartDevices();
    if (activeTab === 'gbp') loadGbpState();
  }, [activeTab, googleAccount]);

  useEffect(() => {
    if (activeTab === 'gbp' && gbpLinked) {
      if (gbpSubTab === 'reviews' && gbpReviews.length === 0) loadGbpReviews();
      if (gbpSubTab === 'insights' && !gbpInsights) loadGbpInsights();
    }
  }, [gbpSubTab, gbpLinked]);

useEffect(() => {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 30);
  const pad = (n: number) => String(n).padStart(2, '0');
  setMeetDate(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`);
  setMeetTime(`${pad(now.getHours())}:${pad(now.getMinutes())}`);
}, []);

  // ── Loaders ───────────────────────────────────────────────

  async function loadGoogleAccount(companyId: string) {
    try {
      setLoading(true);
      const { data } = await supabase
        .from('google_accounts')
        .select('id, google_email, is_active, gbp_location_name')
        .eq('company_id', companyId).eq('is_active', true).maybeSingle();
      setGoogleAccount(data);
      if (data) {
        setGbpLinked(!!data.gbp_location_name);
        await Promise.all([loadGoogleEvents(companyId), loadSentEmails(companyId)]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

async function loadGoogleEvents(companyId: string) {
  try {
    setLoadingEvents(true);
    const { data, error } = await supabase.functions.invoke('listar-eventos-google', {
      body: {
        company_id: companyId,
        max_results: 500,
        // 1 ano atrás até 1 ano à frente
        time_min: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        time_max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      },
    });
    if (error) throw error;
    setEvents((data?.events || []).map((event: any) => ({
      id: event.id, title: event.summary || 'Sem título',
      start: event.start.dateTime || event.start.date,
      end: event.end?.dateTime || event.end?.date,
      allDay: !event.start.dateTime,
      backgroundColor: '#4285F4', borderColor: '#4285F4', textColor: '#FFFFFF',
      extendedProps: {
        description: event.description, location: event.location,
        attendees: event.attendees?.map((a: any) => a.email) || [],
      },
    })));
  } catch (error) {
    console.error(error);
  } finally {
    setLoadingEvents(false);
  }
}

  async function loadSentEmails(companyId: string) {
    try {
      setLoadingEmails(true);
      const { data, error } = await supabase.functions.invoke('listar-emails-google', {
        body: { company_id: companyId, type: 'sent', max_results: 20 },
      });
      if (!error) setSentEmails(data?.emails || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingEmails(false);
    }
  }

  async function loadDriveImages(folderId: string) {
    if (!selectedCompanyId) return;
    setLoadingImages(true);
    setDriveImages([]);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/google-drive-images`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ company_id: selectedCompanyId, folder_id: folderId }),
        }
      );
      const json = await res.json();
      setDriveImages(json.images || []);
    } catch { setDriveImages([]); }
    finally { setLoadingImages(false); }
  }

  async function loadSmartDevices() {
    if (!selectedCompanyId) return;
    setLoadingDevices(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/smart-home-devices`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ company_id: selectedCompanyId, action: 'list' }),
        }
      );
      const json = await res.json();
      setSmartDevices(json.devices || []);
    } catch { setSmartDevices([]); }
    finally { setLoadingDevices(false); }
  }

  // ── GBP loaders ───────────────────────────────────────────

  async function loadGbpState() {
    if (!selectedCompanyId) return;
    const { data } = await supabase
      .from('google_accounts')
      .select('gbp_location_name')
      .eq('company_id', selectedCompanyId).single();

    if (data?.gbp_location_name) {
      setGbpLinked(true);
      loadGbpInfo();
    } else {
      setGbpLinked(false);
      loadGbpLocations();
    }
  }

  async function loadGbpLocations() {
    if (!selectedCompanyId) return;
    setLoadingGbpLocations(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/gbp-get-locations`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ company_id: selectedCompanyId }),
        }
      );
      const json = await res.json();
      setGbpLocations(json.locations || []);
    } catch { setGbpLocations([]); }
    finally { setLoadingGbpLocations(false); }
  }

  async function linkGbpLocation(location: GBPLocation) {
    if (!selectedCompanyId) return;
    await supabase.from('google_accounts')
      .update({
        gbp_location_name: location.location_name,
        gbp_account_name: location.account_name,
      })
      .eq('company_id', selectedCompanyId);
    setGbpLinked(true);
    loadGbpInfo();
  }

  async function loadGbpInfo() {
    if (!selectedCompanyId) return;
    setLoadingGbpInfo(true);
    try {
      // Dados do minhAi
      const { data: company } = await supabase
        .from('companies')
        .select('name, telefone_fixo, website, brand_description, business_address')
        .eq('id', selectedCompanyId).single();

      setGbpMinhAi({
        name: company?.name || '',
        phone: company?.telefone_fixo || '',
        website: company?.website || '',
        description: company?.brand_description || '',
        address: company?.business_address || '',
      });

      // Dados do Google
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/gbp-sync-info`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ company_id: selectedCompanyId, action: 'read' }),
        }
      );
      const json = await res.json();
      if (json.google) {
        setGbpGoogle({
          name: json.google.name || '',
          phone: json.google.phone || '',
          website: json.google.website || '',
          description: json.google.description || '',
          address: json.google.address || '',
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingGbpInfo(false);
    }
  }

  async function applyGbpSync() {
    if (!selectedCompanyId) return;
    setSyncingGbp(true);
    try {
      const toMinhAi: Record<string, string> = {};
      const toGoogle: Record<string, string> = {};
      const fields = ['name', 'phone', 'website', 'description', 'address'];

      for (const field of fields) {
        const choice = gbpChoices[field];
        if (choice === 'google' && gbpGoogle[field]) {
          toMinhAi[field] = gbpGoogle[field]!;
        } else if (choice === 'minhai' && gbpMinhAi[field]) {
          toGoogle[field] = gbpMinhAi[field];
        }
      }

      // Atualizar minhAi
      if (Object.keys(toMinhAi).length > 0) {
        const dbMap: Record<string, string> = {
          name: 'name', phone: 'telefone_fixo', website: 'website',
          description: 'brand_description', address: 'business_address',
        };
        const update: Record<string, string> = {};
        for (const [k, v] of Object.entries(toMinhAi)) update[dbMap[k]] = v;
        await supabase.from('companies').update(update).eq('id', selectedCompanyId);
      }

      // Atualizar Google
      if (Object.keys(toGoogle).length > 0) {
        await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/gbp-sync-info`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
            body: JSON.stringify({ company_id: selectedCompanyId, action: 'write', data: toGoogle }),
          }
        );
      }

      setGbpChoices({});
      await loadGbpInfo();
      alert('Sincronização aplicada com sucesso!');
    } catch (error) {
      console.error(error);
      alert('Erro ao sincronizar.');
    } finally {
      setSyncingGbp(false);
    }
  }

  async function loadGbpReviews() {
    if (!selectedCompanyId) return;
    setLoadingReviews(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/gbp-reviews`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ company_id: selectedCompanyId, action: 'list' }),
        }
      );
      const json = await res.json();
      setGbpReviews(json.reviews || []);
      setGbpAvgRating(json.average_rating || 0);
    } catch { setGbpReviews([]); }
    finally { setLoadingReviews(false); }
  }

  async function sendGbpReply(reviewName: string) {
    if (!replyText.trim() || !selectedCompanyId) return;
    setSendingReply(true);
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/gbp-reviews`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ company_id: selectedCompanyId, action: 'reply', review_name: reviewName, reply_text: replyText }),
        }
      );
      setReplyingTo(null);
      setReplyText('');
      loadGbpReviews();
    } catch (error) {
      console.error(error);
    } finally {
      setSendingReply(false);
    }
  }

  async function loadGbpInsights() {
    if (!selectedCompanyId) return;
    setLoadingInsights(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/gbp-insights`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ company_id: selectedCompanyId }),
        }
      );
      const json = await res.json();
      if (!json.error) setGbpInsights(json);
    } catch { }
    finally { setLoadingInsights(false); }
  }

  // ── Helpers ───────────────────────────────────────────────

  function handleGoToConnect() {
    router.push(`/dashboard/google-connect${selectedCompanyId ? `?companyId=${selectedCompanyId}` : ''}`);
  }

  async function handleRefresh() {
    if (!selectedCompanyId) return;
    if (activeTab === 'calendar') await loadGoogleEvents(selectedCompanyId);
    else if (activeTab === 'email') await loadSentEmails(selectedCompanyId);
    else if (activeTab === 'drive' && selectedFolder) loadDriveImages(selectedFolder.id);
    else if (activeTab === 'smarthome') loadSmartDevices();
    else if (activeTab === 'gbp') {
      if (gbpSubTab === 'info') loadGbpInfo();
      else if (gbpSubTab === 'reviews') loadGbpReviews();
      else if (gbpSubTab === 'insights') loadGbpInsights();
    }
  }

  function handleNav(action: 'prev' | 'next' | 'today') {
    const api = calendarRef.current?.getApi();
    if (api) { api[action](); setCurrentTitle(api.view.title); }
  }

  function handleViewChange(view: 'dayGridMonth' | 'timeGridWeek' | 'listWeek') {
    const api = calendarRef.current?.getApi();
    if (api) { api.changeView(view); setActiveView(view); setCurrentTitle(api.view.title); }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    const diffDays = Math.ceil(Math.abs(new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `${diffDays} dias atrás`;
    return date.toLocaleDateString('pt-BR');
  }

  function getDeviceIcon(type: string) {
    const t = type.toLowerCase();
    if (t.includes('light') || t.includes('lamp')) return '💡';
    if (t.includes('thermostat')) return '🌡️';
    if (t.includes('fan')) return '🌀';
    if (t.includes('tv') || t.includes('display')) return '📺';
    return '🔌';
  }

  const GBP_FIELD_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
    name:        { label: 'Nome da empresa',  icon: <MessageSquare className="w-4 h-4" /> },
    phone:       { label: 'Telefone',         icon: <Phone className="w-4 h-4" /> },
    website:     { label: 'Site',             icon: <Globe className="w-4 h-4" /> },
    description: { label: 'Descrição',        icon: <MessageSquare className="w-4 h-4" /> },
    address:     { label: 'Endereço',         icon: <MapPin className="w-4 h-4" /> },
  };

  // ── Tabs config ───────────────────────────────────────────

  const tabs: { key: ActiveTab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'calendar',  label: 'Calendário',       icon: <CalendarIcon className="w-4 h-4" />, count: events.length },
    { key: 'email',     label: 'Emails Enviados',  icon: <Send className="w-4 h-4" />,         count: sentEmails.length },
    { key: 'drive',     label: 'Google Drive',     icon: <HardDrive className="w-4 h-4" /> },
    { key: 'smarthome', label: 'Smart Home',       icon: <Home className="w-4 h-4" />,         count: smartDevices.length },
    { key: 'gbp',       label: 'Meu Negócio',      icon: <Star className="w-4 h-4" /> },
    { key: 'meet',      label: 'Google Meet',      icon: <PhoneCall className="w-4 h-4" /> },
  ];

  const isLoading = loadingEvents || loadingEmails || loadingImages || loadingDevices || loadingGbpInfo || loadingReviews || loadingInsights;

  return (
    <div className="min-h-screen bg-transparent">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Serviços Google</h1>
            <p className="text-gray-600 dark:text-gray-400">Calendário, emails, Drive, Smart Home, Google Meu Negócio e Meet</p>
          </div>

          {loading && selectedCompanyId && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          )}

          {!selectedCompanyId && !loading && (
            <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 p-12 text-center">
              <CalendarIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Selecione um Assistente</h3>
              <p className="text-gray-600 dark:text-gray-400">Escolha um assistente para visualizar os serviços Google</p>
            </div>
          )}

          {!loading && selectedCompanyId && !googleAccount && (
            <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 p-12 text-center">
              <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Conta Google Não Conectada</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                Conecte uma conta Google para usar calendário, emails, Drive, Smart Home e Google Meu Negócio.
              </p>
              <button onClick={handleGoToConnect} className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                <Settings className="w-5 h-5" /> Conectar Conta Google
              </button>
            </div>
          )}

          {!loading && selectedCompanyId && googleAccount && (
            <>
              {/* Header da conta */}
              <div className="mb-4 bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                        <Link2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Conectado como</p>
                        <p className="text-sm text-green-600 dark:text-green-400 font-semibold">{googleAccount.google_email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={handleRefresh} disabled={isLoading}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition disabled:opacity-50">
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Atualizar
                      </button>
                      <button onClick={handleGoToConnect}
                        className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition">
                        Gerenciar
                      </button>
                    </div>
                  </div>
                </div>

                {/* Tabs — 2 por linha mobile, 6 desktop */}
                <div className="grid grid-cols-2 md:grid-cols-6">
                  {tabs.map((tab, i) => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                      className={`px-3 py-3 text-xs sm:text-sm font-medium transition flex items-center justify-center gap-1.5 border-b-2 ${
                        activeTab === tab.key
                          ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                          : 'text-gray-600 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5'
                      } ${
                        // Borda direita: sempre exceto último de cada linha
                        // Mobile (2 cols): sem borda no índice 1, 3, 5 (últimos da linha)
                        // Desktop (6 cols): sem borda no índice 5 (último)
                        i % 2 !== 1 ? 'border-r border-r-gray-200 dark:border-r-white/10' : ''
                      } ${
                        // Borda inferior da primeira linha no mobile
                        i < 2 ? 'md:border-b-0' : ''
                      }`}
                    >
                      {tab.icon}
                      <span className="truncate hidden sm:inline">{tab.label}</span>
                      {tab.count !== undefined && tab.count > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full hidden sm:inline">
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── CALENDÁRIO ── */}
              {activeTab === 'calendar' && (
                <>
                  <div className="mb-4 p-3 bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleNav('prev')} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition text-gray-700 dark:text-gray-300"><ChevronLeft className="w-5 h-5" /></button>
                        <button onClick={() => handleNav('today')} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition">Hoje</button>
                        <button onClick={() => handleNav('next')} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition text-gray-700 dark:text-gray-300"><ChevronRight className="w-5 h-5" /></button>
                      </div>
                      <div className="text-lg font-semibold text-gray-900 dark:text-white capitalize">{currentTitle}</div>
                      <div className="flex gap-1 bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
                        {(['dayGridMonth', 'timeGridWeek', 'listWeek'] as const).map((v, i) => (
                          <button key={v} onClick={() => handleViewChange(v)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${activeView === v ? 'bg-blue-500 text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10'}`}>
                            {['Mês', 'Semana', 'Lista'][i]}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 p-4">
                    {loadingEvents ? (
                      <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
                    ) : (
                      <FullCalendar ref={calendarRef} plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                        initialView="dayGridMonth" headerToolbar={false} events={events} locale={ptBrLocale} height="auto"
                        datesSet={(info) => { setCurrentTitle(info.view.title); setActiveView(info.view.type as any); }} />
                    )}
                  </div>
                </>
              )}

              {/* ── EMAILS ── */}
              {activeTab === 'email' && (
                <>
                  <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2">
                      <Send className="w-4 h-4 text-blue-500" />
                      <p className="text-sm text-blue-800 dark:text-blue-200">Exibindo apenas emails enviados pelo assistente.</p>
                    </div>
                  </div>
                  {loadingEmails ? (
                    <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
                  ) : sentEmails.length === 0 ? (
                    <div className="bg-white/50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 p-12 text-center">
                      <Mail className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Nenhum email enviado</h3>
                      <p className="text-gray-600 dark:text-gray-400">Os emails enviados pelo assistente aparecerão aqui.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sentEmails.map((email) => (
                        <div key={email.id} className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden hover:border-blue-500/30 transition">
                          <button onClick={() => setExpandedEmail(expandedEmail === email.id ? null : email.id)} className="w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-white/5 transition">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">Para: {email.to.join(', ')}</p>
                                  {email.hasAttachments && <Paperclip className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                                </div>
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 truncate">{email.subject || '(Sem assunto)'}</h3>
                                <p className="text-sm text-gray-500 truncate">{email.snippet}</p>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <div className="flex items-center gap-1 text-xs text-gray-500"><Clock className="w-3 h-3" />{formatDate(email.date)}</div>
                                {expandedEmail === email.id ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                              </div>
                            </div>
                          </button>
                          {expandedEmail === email.id && email.body && (
                            <div className="p-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
                              <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: email.body }} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* ── DRIVE ── */}
              {activeTab === 'drive' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      {selectedFolder
                        ? <p className="text-sm text-gray-600 dark:text-gray-400">📁 <strong>{selectedFolder.name}</strong> — {driveImages.length} imagem{driveImages.length !== 1 ? 's' : ''}</p>
                        : <p className="text-sm text-gray-400">Selecione uma pasta para ver as imagens</p>
                      }
                    </div>
                    <DrivePickerButton companyId={selectedCompanyId!}
                      onFilesSelected={() => {}}
                      label={selectedFolder ? 'Trocar pasta' : 'Selecionar pasta'}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium transition" />
                  </div>
                  {loadingImages ? (
                    <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
                  ) : !selectedFolder ? (
                    <div className="bg-white/50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 p-12 text-center">
                      <HardDrive className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-500 dark:text-gray-400">Clique em "Selecionar pasta" para começar</p>
                    </div>
                  ) : driveImages.length === 0 ? (
                    <p className="text-center py-12 text-sm text-gray-400">Nenhuma imagem encontrada nesta pasta</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {driveImages.map(img => (
                        <div key={img.id} className="aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-slate-800 group relative">
                          <img src={img.thumb} alt={img.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" title={img.name} />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-end p-2 opacity-0 group-hover:opacity-100">
                            <p className="text-white text-xs truncate">{img.name.replace(/\.[^/.]+$/, '')}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── SMART HOME ── */}
              {activeTab === 'smarthome' && (
                <>
                  {loadingDevices ? (
                    <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-green-500" /></div>
                  ) : smartDevices.length === 0 ? (
                    <div className="bg-white/50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 p-12 text-center">
                      <Home className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Nenhum dispositivo encontrado</h3>
                      <button onClick={loadSmartDevices} className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition">Tentar novamente</button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {smartDevices.map(device => (
                        <div key={device.id} className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{getDeviceIcon(device.type)}</span>
                              <div>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">{device.displayName}</p>
                                <p className="text-xs text-gray-500">{device.type.split('.').pop()}</p>
                              </div>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${device.online ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-gray-100 dark:bg-slate-700 text-gray-400'}`}>
                              {device.online ? '● Online' : '○ Offline'}
                            </span>
                          </div>
                          {device.online && (
                            <div className="flex gap-2">
                              <button onClick={async () => { setDeviceAction(device.id); await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/smart-home-devices`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` }, body: JSON.stringify({ company_id: selectedCompanyId, action: 'command', device_id: device.id, command: 'sdm.devices.commands.ThermostatMode.SetMode', params: { mode: 'HEAT' } }) }); setDeviceAction(null); }} disabled={deviceAction === device.id}
                                className="flex-1 py-1.5 text-xs rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium transition disabled:opacity-50">
                                {deviceAction === device.id ? '...' : 'Ligar'}
                              </button>
                              <button onClick={async () => { setDeviceAction(device.id); await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/smart-home-devices`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` }, body: JSON.stringify({ company_id: selectedCompanyId, action: 'command', device_id: device.id, command: 'sdm.devices.commands.ThermostatMode.SetMode', params: { mode: 'OFF' } }) }); setDeviceAction(null); }} disabled={deviceAction === device.id}
                                className="flex-1 py-1.5 text-xs rounded-lg bg-red-500/80 hover:bg-red-600 text-white font-medium transition disabled:opacity-50">
                                Desligar
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* ── GOOGLE MEU NEGÓCIO ── */}
              {activeTab === 'gbp' && (
                <div className="space-y-4">

                  {/* Vincular localização */}
                  {!gbpLinked && (
                    <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                          <Star className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Vincular Google Meu Negócio</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Selecione qual localização vincular ao minhAi</p>
                        </div>
                      </div>

                      {loadingGbpLocations ? (
                        <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
                      ) : gbpLocations.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-gray-500 dark:text-gray-400 mb-2">Nenhuma localização encontrada.</p>
                          <p className="text-xs text-gray-400">Certifique-se de ter um perfil no Google Meu Negócio vinculado a esse email.</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {gbpLocations.map((loc) => (
                            <div key={loc.location_name} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-white/10">
                              <div>
                                <p className="font-semibold text-gray-900 dark:text-white">{loc.title}</p>
                                {loc.address && <p className="text-sm text-gray-500 dark:text-gray-400">{loc.address}</p>}
                                {loc.phone && <p className="text-xs text-gray-400">{loc.phone}</p>}
                              </div>
                              <button onClick={() => linkGbpLocation(loc)}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium transition flex-shrink-0 ml-4">
                                Vincular
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sub-tabs */}
                  {gbpLinked && (
                    <>
                      <div className="flex bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
                        {(['info', 'reviews', 'insights'] as GBPSubTab[]).map((sub) => (
                          <button key={sub} onClick={() => setGbpSubTab(sub)}
                            className={`flex-1 py-3 text-sm font-medium transition border-b-2 ${
                              gbpSubTab === sub
                                ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                                : 'text-gray-600 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-white'
                            }`}>
                            {sub === 'info' && '📋 Informações'}
                            {sub === 'reviews' && '⭐ Avaliações'}
                            {sub === 'insights' && '📊 Insights'}
                          </button>
                        ))}
                      </div>

                      {/* ── Sub-tab: Informações ── */}
                      {gbpSubTab === 'info' && (
                        <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
                          {loadingGbpInfo ? (
                            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
                          ) : (
                            <>
                              {/* Header da tabela */}
                              <div className="grid grid-cols-4 gap-0 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-slate-800/50 px-4 py-2">
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase col-span-1">Campo</p>
                                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase col-span-1">minhAi</p>
                                <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase col-span-1">Google</p>
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase col-span-1 text-center">Usar</p>
                              </div>

                              {Object.entries(GBP_FIELD_LABELS).map(([field, { label, icon }]) => {
                                const minhAiVal = gbpMinhAi[field] || '—';
                                const googleVal = gbpGoogle[field] || '—';
                                const isEqual = minhAiVal === googleVal || (minhAiVal === '—' && googleVal === '—');
                                const choice = gbpChoices[field];

                                return (
                                  <div key={field} className={`grid grid-cols-4 gap-0 px-4 py-3 border-b border-gray-100 dark:border-white/5 ${!isEqual ? 'bg-yellow-50/30 dark:bg-yellow-900/10' : ''}`}>
                                    {/* Campo */}
                                    <div className="flex items-center gap-2 col-span-1">
                                      <span className="text-gray-400">{icon}</span>
                                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</span>
                                    </div>

                                    {/* minhAi */}
                                    <div className="col-span-1 pr-4">
                                      <p className={`text-xs truncate ${choice === 'minhai' ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-700 dark:text-gray-300'}`}>
                                        {minhAiVal}
                                      </p>
                                    </div>

                                    {/* Google */}
                                    <div className="col-span-1 pr-4">
                                      <p className={`text-xs truncate ${choice === 'google' ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-gray-700 dark:text-gray-300'}`}>
                                        {googleVal}
                                      </p>
                                    </div>

                                    {/* Escolha */}
                                    <div className="col-span-1 flex items-center justify-center gap-2">
                                      {isEqual ? (
                                        <span className="text-xs text-gray-400 flex items-center gap-1">
                                          <CheckCircle className="w-3.5 h-3.5 text-green-500" /> Iguais
                                        </span>
                                      ) : (
                                        <>
                                          <button onClick={() => setGbpChoices(p => ({ ...p, [field]: 'minhai' }))}
                                            title="Usar minhAi → Google"
                                            className={`p-1.5 rounded-lg text-xs transition ${choice === 'minhai' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-500 hover:bg-blue-100'}`}>
                                            →G
                                          </button>
                                          <button onClick={() => setGbpChoices(p => ({ ...p, [field]: 'google' }))}
                                            title="Usar Google → minhAi"
                                            className={`p-1.5 rounded-lg text-xs transition ${choice === 'google' ? 'bg-green-500 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-500 hover:bg-green-100'}`}>
                                            →M
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}

                              {/* Legenda + botão */}
                              <div className="px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
                                <div className="flex items-center gap-4 text-xs text-gray-400">
                                  <span><span className="font-bold text-blue-500">→G</span> Enviar minhAi → Google</span>
                                  <span><span className="font-bold text-green-500">→M</span> Puxar Google → minhAi</span>
                                </div>
                                <button onClick={applyGbpSync}
                                  disabled={syncingGbp || Object.keys(gbpChoices).length === 0}
                                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded-lg font-medium transition flex items-center gap-2">
                                  {syncingGbp ? <><Loader2 className="w-4 h-4 animate-spin" /> Sincronizando...</> : `Aplicar (${Object.keys(gbpChoices).length})`}
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {/* ── Sub-tab: Avaliações ── */}
                      {gbpSubTab === 'reviews' && (
                        <div className="space-y-4">
                          {/* Média */}
                          {gbpAvgRating > 0 && (
                            <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 p-4 flex items-center gap-4">
                              <div className="text-4xl font-bold text-gray-900 dark:text-white">{gbpAvgRating.toFixed(1)}</div>
                              <div>
                                <Stars rating={Math.round(gbpAvgRating)} size={20} />
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{gbpReviews.length} avaliação{gbpReviews.length !== 1 ? 'ões' : ''} no Google</p>
                              </div>
                            </div>
                          )}

                          {loadingReviews ? (
                            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-yellow-500" /></div>
                          ) : gbpReviews.length === 0 ? (
                            <div className="bg-white/50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 p-12 text-center">
                              <Star className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                              <p className="text-gray-500">Nenhuma avaliação encontrada.</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {gbpReviews.map((review) => (
                                <div key={review.google_review_id} className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 p-4">
                                  <div className="flex items-start justify-between gap-3 mb-2">
                                    <div className="flex items-center gap-3">
                                      {review.reviewer_photo ? (
                                        <img src={review.reviewer_photo} alt="" className="w-9 h-9 rounded-full flex-shrink-0" />
                                      ) : (
                                        <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                                          <User className="w-4 h-4 text-gray-400" />
                                        </div>
                                      )}
                                      <div>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{review.reviewer_name}</p>
                                        <Stars rating={review.rating} size={12} />
                                      </div>
                                    </div>
                                    <p className="text-xs text-gray-400 flex-shrink-0">{formatDate(review.review_date)}</p>
                                  </div>

                                  {review.comment && (
                                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{review.comment}</p>
                                  )}

                                  {/* Resposta existente */}
                                  {review.reply && (
                                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-3 mb-3">
                                      <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">Sua resposta:</p>
                                      <p className="text-sm text-gray-700 dark:text-gray-300">{review.reply}</p>
                                    </div>
                                  )}

                                  {/* Campo de resposta */}
                                  {replyingTo === review.name ? (
                                    <div className="space-y-2">
                                      <textarea
                                        value={replyText}
                                        onChange={e => setReplyText(e.target.value)}
                                        placeholder="Escreva sua resposta..."
                                        rows={3}
                                        className="w-full px-3 py-2 text-sm border rounded-lg resize-none outline-none bg-white dark:bg-slate-800 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white"
                                      />
                                      <div className="flex gap-2 justify-end">
                                        <button onClick={() => { setReplyingTo(null); setReplyText(''); }}
                                          className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition">
                                          Cancelar
                                        </button>
                                        <button onClick={() => sendGbpReply(review.name)} disabled={sendingReply || !replyText.trim()}
                                          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs rounded-lg font-medium transition flex items-center gap-1">
                                          {sendingReply ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                                          Enviar
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button onClick={() => { setReplyingTo(review.name); setReplyText(review.reply || ''); }}
                                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                                      {review.reply ? '✏️ Editar resposta' : '💬 Responder'}
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* ── Sub-tab: Insights ── */}
                      {gbpSubTab === 'insights' && (
                        <div className="space-y-4">
                          {loadingInsights ? (
                            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
                          ) : !gbpInsights ? (
                            <div className="bg-white/50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 p-12 text-center">
                              <BarChart2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                              <p className="text-gray-500 mb-4">Clique para carregar os insights</p>
                              <button onClick={loadGbpInsights} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition">
                                Carregar Insights
                              </button>
                            </div>
                          ) : (
                            <>
                              <p className="text-xs text-gray-400 text-right">
                                Período: {new Date(gbpInsights.period.start).toLocaleDateString('pt-BR')} – {new Date(gbpInsights.period.end).toLocaleDateString('pt-BR')}
                              </p>

                              {/* Cards de métricas */}
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                                {[
                                  { label: 'Buscas Google', value: gbpInsights.totals.views_search, icon: <Search className="w-5 h-5" />, color: 'blue' },
                                  { label: 'Vistas no Maps', value: gbpInsights.totals.views_maps, icon: <MapPin className="w-5 h-5" />, color: 'green' },
                                  { label: 'Cliques no Site', value: gbpInsights.totals.clicks_website, icon: <Globe className="w-5 h-5" />, color: 'purple' },
                                  { label: 'Ligações', value: gbpInsights.totals.clicks_phone, icon: <Phone className="w-5 h-5" />, color: 'yellow' },
                                  { label: 'Rotas', value: gbpInsights.totals.clicks_directions, icon: <Navigation className="w-5 h-5" />, color: 'orange' },
                                ].map(({ label, value, icon, color }) => (
                                  <div key={label} className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 p-4">
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 bg-${color}-100 dark:bg-${color}-900/20 text-${color}-600 dark:text-${color}-400`}>
                                      {icon}
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{value.toLocaleString('pt-BR')}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
                                  </div>
                                ))}
                              </div>

                              {/* Total de interações */}
                              <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 p-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Total de interações nos últimos 30 dias</p>
                                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                                      {Object.values(gbpInsights.totals).reduce((a, b) => a + b, 0).toLocaleString('pt-BR')}
                                    </p>
                                  </div>
                                  <TrendingUp className="w-12 h-12 text-blue-300 dark:text-blue-600" />
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
              {/* ── GOOGLE MEET ── */}
              {activeTab === 'meet' && (
                <div className="max-w-lg mx-auto">
                  <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 p-6">

                    {/* Header */}
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                          <path d="M21.5 7.5L17 12l4.5 4.5V7.5z" fill="#00832d"/>
                          <path d="M3 7.5A1.5 1.5 0 014.5 6h9A1.5 1.5 0 0115 7.5v9A1.5 1.5 0 0113.5 18h-9A1.5 1.5 0 013 16.5v-9z" fill="#0066da"/>
                          <path d="M15 10.5v3L17 15v-6l-2 1.5z" fill="#e94235"/>
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Agendar reunião via Google Meet</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">O convite será enviado automaticamente pelo Google Calendar</p>
                      </div>
                    </div>

                    {/* Feedback */}
                    {meetError && (
                      <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                        {meetError}
                      </div>
                    )}

                    {meetSuccess ? (
                      <div className="text-center py-6">
                        <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                          <CheckCircle className="w-7 h-7 text-green-600 dark:text-green-400" />
                        </div>
                        <p className="font-semibold text-gray-900 dark:text-white mb-1">Reunião agendada!</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{meetSuccess}</p>
                        <button
                          onClick={() => { setMeetSuccess(null); setMeetError(null); }}
                          className="px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Agendar outra reunião
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Título */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Título da reunião</label>
                          <input
                            type="text"
                            value={meetTitle}
                            onChange={e => setMeetTitle(e.target.value)}
                            placeholder="Ex: Alinhamento semanal"
                            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                          />
                        </div>

                        {/* Data + Hora */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Data</label>
                            <input
                              type="date"
                              value={meetDate}
                              onChange={e => setMeetDate(e.target.value)}
                              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Hora</label>
                            <input
                              type="time"
                              value={meetTime}
                              onChange={e => setMeetTime(e.target.value)}
                              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                            />
                          </div>
                        </div>

                        {/* Email */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Email do participante</label>
                          <input
                            type="email"
                            value={meetEmail}
                            onChange={e => setMeetEmail(e.target.value)}
                            placeholder="participante@email.com"
                            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                          />
                          <p className="text-xs text-gray-400 mt-1">O Google Calendar envia o convite com o link automaticamente.</p>
                        </div>

                        {/* Botão */}
                        <button
onClick={async () => {
  if (!meetDate || !meetTime || !meetEmail) {
    setMeetError('Preencha data, hora e email do participante.');
    return;
  }
  setMeetLoading(true);
  setMeetError(null);
  try {
    const startDateTime = new Date(`${meetDate}T${meetTime}:00`).toISOString();
    const endDateTime   = new Date(new Date(`${meetDate}T${meetTime}:00`).getTime() + 60 * 60 * 1000).toISOString();

    const { data: eventData, error: eventError } = await supabase.functions.invoke('criar-evento-calendario', {
      body: {
        company_id:        selectedCompanyId,
        summary:           meetTitle || 'Reunião',
        start_time:        startDateTime,
        end_time:          endDateTime,
        attendees:         [meetEmail],
        create_conference: true,   // ← flag nova
      },
    });

    if (eventError || !eventData?.success) {
      throw new Error(eventData?.error ?? 'Erro ao criar evento no calendário');
    }

    const meetUrl = eventData?.meetUrl ?? eventData?.hangoutLink;
    if (!meetUrl) throw new Error('Link do Meet não retornado');

    setMeetSuccess(`Convite enviado para ${meetEmail}. Link: ${meetUrl}`);
    if (selectedCompanyId) loadGoogleEvents(selectedCompanyId);
  } catch (err: any) {
    setMeetError(err.message ?? 'Erro ao agendar reunião');
  } finally {
    setMeetLoading(false);
  }
}}
                          disabled={meetLoading}
                          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-semibold text-sm transition flex items-center justify-center gap-2"
                        >
                          {meetLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                              <path d="M21.5 7.5L17 12l4.5 4.5V7.5z" fill="#fff" opacity=".9"/>
                              <path d="M3 7.5A1.5 1.5 0 014.5 6h9A1.5 1.5 0 0115 7.5v9A1.5 1.5 0 0113.5 18h-9A1.5 1.5 0 013 16.5v-9z" fill="#fff"/>
                            </svg>
                          )}
                          {meetLoading ? 'Agendando...' : 'Agendar e enviar convite'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AgendaPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    }>
      <AgendaPageContent />
    </Suspense>
  );
}
