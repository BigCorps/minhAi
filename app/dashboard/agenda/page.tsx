
'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { useAssistant } from '@/contexts/AssistantContext';
import DrivePickerButton from '@/components/ui/DrivePickerButton';
import {
  Calendar as CalendarIcon,
  Mail,
  Link2,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Settings,
  RefreshCw,
  Clock,
  User,
  Paperclip,
  ChevronDown,
  ChevronUp,
  Send,
  HardDrive,
  Folder,
  Image as ImageIcon,
  Wifi,
  WifiOff,
  Home,
  Mic,
  X,
} from 'lucide-react';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  extendedProps?: {
    description?: string;
    location?: string;
    attendees?: string[];
  };
}

interface Email {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string[];
  date: string;
  snippet: string;
  body?: string;
  hasAttachments: boolean;
  isRead: boolean;
}

interface DriveFolder {
  id: string;
  name: string;
}

interface DriveImage {
  id: string;
  name: string;
  url: string;
  thumb: string;
}

interface SmartDevice {
  id: string;
  type: string;
  displayName: string;
  online: boolean;
  traits: Record<string, any>;
  // Tuya extras
  provider?: 'google' | 'tuya';
  icon?: string;
  category?: string;
  status?: any[];
}

interface GoogleAccount {
  id: string;
  google_email: string;
  is_active: boolean;
}

type ActiveTab = 'calendar' | 'email' | 'drive' | 'smarthome';

function AgendaPageContent() {
  const [googleAccount, setGoogleAccount] = useState<GoogleAccount | null>(null);
  const { selectedAssistantId: selectedCompanyId } = useAssistant();

  // Calendar
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [currentTitle, setCurrentTitle] = useState('Calendário');
  const [activeView, setActiveView] = useState<'dayGridMonth' | 'timeGridWeek' | 'listWeek'>('dayGridMonth');
  const calendarRef = useRef<FullCalendar>(null);

  // Email (sent only)
  const [sentEmails, setSentEmails] = useState<Email[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);

  // Drive
  const [driveFolders, setDriveFolders] = useState<DriveFolder[]>([]);
  const [driveImages, setDriveImages] = useState<DriveImage[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<{ id: string; name: string } | null>(null);
  const [loadingImages, setLoadingImages] = useState(false);
  const [folderPath, setFolderPath] = useState<DriveFolder[]>([]);
  const [loadingDrive, setLoadingDrive] = useState(false);

  // Smart Home — Google
  const [smartDevices, setSmartDevices] = useState<SmartDevice[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [deviceAction, setDeviceAction] = useState<string | null>(null);
  const [quickFaqDevice, setQuickFaqDevice] = useState<SmartDevice | null>(null);
  const [quickFaqAlias, setQuickFaqAlias] = useState('');
  const [savingFaqs, setSavingFaqs] = useState(false);

  // Smart Home — Tuya
  const [tuyaConnected, setTuyaConnected] = useState(false);
  const [tuyaDevices, setTuyaDevices] = useState<SmartDevice[]>([]);
  const [loadingTuyaDevices, setLoadingTuyaDevices] = useState(false);

  // General
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('calendar');

  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const theme = (resolvedTheme as 'dark' | 'light') || 'dark';
  const supabase = createClient();

  // ── Detectar retorno do OAuth Tuya ───────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('tuya') === 'success') {
      setTuyaConnected(true);
      setActiveTab('smarthome');
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (params.get('tuya') === 'error') {
      alert(`Erro ao conectar Tuya: ${params.get('msg') ?? 'desconhecido'}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      loadGoogleAccount(selectedCompanyId);
      checkTuyaConnection(selectedCompanyId);
    } else {
      setGoogleAccount(null);
      setEvents([]);
      setSentEmails([]);
      setTuyaConnected(false);
      setTuyaDevices([]);
    }
  }, [selectedCompanyId]);

  // Reload data when tab changes
  useEffect(() => {
    if (!selectedCompanyId || !googleAccount) return;
    if (activeTab === 'smarthome' && smartDevices.length === 0) loadSmartDevices();
  }, [activeTab, googleAccount]);

  // ── Verificar se Tuya já está conectado ──────────────────────
  async function checkTuyaConnection(companyId: string) {
    const { data } = await supabase
      .from('companies')
      .select('tuya_access_token')
      .eq('id', companyId)
      .single();
    if (data?.tuya_access_token) setTuyaConnected(true);
  }

  async function loadGoogleAccount(companyId: string) {
    try {
      setLoading(true);
      const { data } = await supabase
        .from('google_accounts')
        .select('id, google_email, is_active')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .maybeSingle();

      setGoogleAccount(data);
      if (data) {
        await Promise.all([
          loadGoogleEvents(companyId),
          loadSentEmails(companyId),
        ]);
      }
    } catch (error) {
      console.error('Erro ao carregar conta Google:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadGoogleEvents(companyId: string) {
    try {
      setLoadingEvents(true);
      const { data, error } = await supabase.functions.invoke('listar-eventos-google', {
        body: { company_id: companyId, max_results: 500 },
      });
      if (error) throw error;
      const calendarEvents: CalendarEvent[] = (data?.events || []).map((event: any) => ({
        id: event.id,
        title: event.summary || 'Sem título',
        start: event.start.dateTime || event.start.date,
        end: event.end?.dateTime || event.end?.date,
        allDay: !event.start.dateTime,
        backgroundColor: '#4285F4',
        borderColor: '#4285F4',
        textColor: '#FFFFFF',
        extendedProps: {
          description: event.description,
          location: event.location,
          attendees: event.attendees?.map((a: any) => a.email) || [],
        },
      }));
      setEvents(calendarEvents);
    } catch (error) {
      console.error('Erro ao carregar eventos:', error);
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
      console.error('Erro ao carregar emails enviados:', error);
    } finally {
      setLoadingEmails(false);
    }
  }

  async function loadDriveFolders(parentId: string | null) {
    if (!selectedCompanyId) return;
    setLoadingDrive(true);
    setDriveImages([]);
    setSelectedFolder(null);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/google-drive-folders`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ company_id: selectedCompanyId, parent_id: parentId }),
        }
      );
      const json = await res.json();
      setDriveFolders(json.folders || []);
    } catch { setDriveFolders([]); }
    finally { setLoadingDrive(false); }
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
      setSmartDevices((json.devices || []).map((d: any) => ({ ...d, provider: 'google' })));
    } catch { setSmartDevices([]); }
    finally { setLoadingDevices(false); }
  }

  async function sendDeviceCommand(deviceId: string, command: string, params: any = {}) {
    if (!selectedCompanyId) return;
    setDeviceAction(deviceId);
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/smart-home-devices`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ company_id: selectedCompanyId, action: 'command', device_id: deviceId, command, params }),
        }
      );
      setTimeout(loadSmartDevices, 1500);
    } catch { }
    finally { setDeviceAction(null); }
  }

  // ── Tuya: iniciar OAuth ───────────────────────────────────────
function connectTuya() {
  if (!selectedCompanyId) return;

  const state = encodeURIComponent(`${selectedCompanyId}:us-east`);

  const redirect = encodeURIComponent(
    'https://minhai.app/api/tuya/callback'
  );

  window.location.href =
    `https://app-h5-ue.iot787.com/d/login` +
    `?response_type=code` +
    `&client_id=${process.env.NEXT_PUBLIC_TUYA_CLIENT_ID}` +
    `&redirect_uri=${redirect}` +
    `&state=${state}`;
}

  // ── Tuya: listar dispositivos ─────────────────────────────────
  async function loadTuyaDevices() {
    if (!selectedCompanyId) return;
    setLoadingTuyaDevices(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/tuya-smart-home`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ action: 'list', company_id: selectedCompanyId }),
        }
      );
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setTuyaDevices(json.devices ?? []);
    } catch (err: any) {
      alert(`Erro ao buscar dispositivos Tuya: ${err.message}`);
    } finally {
      setLoadingTuyaDevices(false);
    }
  }

  async function createQuickFAQs() {
    if (!quickFaqDevice || !quickFaqAlias.trim()) return;
    setSavingFaqs(true);
    try {
      const alias    = quickFaqAlias.trim();
      const provider = quickFaqDevice.provider ?? 'google';
      const faqs = [
        {
          company_id:    selectedCompanyId,
          question:      `Ligar ${alias}`,
          answer:        `Ligando ${alias} para você.`,
          variations:    [`liga ${alias}`, `acende ${alias}`, `turn on ${alias}`],
          is_active:     true,
          function_key:  'aparelhos_smart',
          function_params: {
            action:      'smart_home_command',
            provider,
            device_id:   quickFaqDevice.id,
            device_name: alias,
            command:     'turnOn',
            ...(provider === 'tuya' && { commands: [{ code: 'switch_1', value: true }] }),
          },
        },
        {
          company_id:    selectedCompanyId,
          question:      `Desligar ${alias}`,
          answer:        `Desligando ${alias}.`,
          variations:    [`desliga ${alias}`, `apaga ${alias}`, `turn off ${alias}`],
          is_active:     true,
          function_key:  'aparelhos_smart',
          function_params: {
            action:      'smart_home_command',
            provider,
            device_id:   quickFaqDevice.id,
            device_name: alias,
            command:     'turnOff',
            ...(provider === 'tuya' && { commands: [{ code: 'switch_1', value: false }] }),
          },
        },
      ];

      const { error } = await supabase.from('faq_entries').insert(faqs);
      if (error) throw error;

      setQuickFaqDevice(null);
      setQuickFaqAlias('');
      alert(`✅ Comandos criados: "Ligar ${alias}" e "Desligar ${alias}"`);
    } catch (err) {
      console.error('Erro ao criar FAQs:', err);
      alert('Erro ao criar comandos. Tente novamente.');
    } finally {
      setSavingFaqs(false);
    }
  }

  function handleGoToConnect() {
    router.push(`/dashboard/google-connect${selectedCompanyId ? `?companyId=${selectedCompanyId}` : ''}`);
  }

  async function handleRefresh() {
    if (!selectedCompanyId) return;
    if (activeTab === 'calendar') await loadGoogleEvents(selectedCompanyId);
    else if (activeTab === 'email') await loadSentEmails(selectedCompanyId);
    else if (activeTab === 'drive') loadDriveFolders(folderPath.length > 0 ? folderPath[folderPath.length - 1].id : null);
    else if (activeTab === 'smarthome') loadSmartDevices();
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
    const now = new Date();
    const diffDays = Math.ceil(Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
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
    if (t.includes('tv') || t.includes('display') || t.includes('infrared')) return '📺';
    if (t.includes('speaker')) return '🔊';
    if (t.includes('air_conditioner')) return '❄️';
    if (t.includes('curtain')) return '🪟';
    if (t.includes('sensor')) return '📡';
    return '🔌';
  }

  // ── Tab config ───────────────────────────────────────────
  const tabs: { key: ActiveTab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'calendar', label: 'Calendário', icon: <CalendarIcon className="w-4 h-4" />, count: events.length },
    { key: 'email', label: 'Emails Enviados', icon: <Send className="w-4 h-4" />, count: sentEmails.length },
    { key: 'drive', label: 'Google Drive', icon: <HardDrive className="w-4 h-4" /> },
    { key: 'smarthome', label: 'Smart Home', icon: <Home className="w-4 h-4" />, count: smartDevices.length + tuyaDevices.length },
  ];

  return (
    <div className="min-h-screen bg-transparent">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Serviços Google</h1>
            <p className="text-gray-600 dark:text-gray-400">Gerencie seu Calendário, Emails, Drive e dispositivos Smart Home</p>
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
                Conecte uma conta Google para usar calendário, emails, Drive e Smart Home.
              </p>
              <button onClick={handleGoToConnect} className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                <Settings className="w-5 h-5" />
                Conectar Conta Google
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
                    <button
                      onClick={handleRefresh}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Atualizar
                    </button>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-white/10">
                  {tabs.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex items-center gap-2 py-3 px-6 text-sm font-medium ${activeTab === tab.key
                          ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}
                      `}
                    >
                      {tab.icon}
                      {tab.label}
                      {tab.count !== undefined && (
                        <span className="ml-1 px-2 py-0.5 bg-gray-200 dark:bg-white/10 rounded-full text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conteúdo das Tabs */}
              <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 p-6">
                {activeTab === 'calendar' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{currentTitle}</h2>
                      <div className="flex space-x-2">
                        <button onClick={() => handleNav('prev')} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-white/10">
                          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </button>
                        <button onClick={() => handleNav('today')} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium">
                          Hoje
                        </button>
                        <button onClick={() => handleNav('next')} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-white/10">
                          <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </button>
                        <select
                          value={activeView}
                          onChange={(e) => handleViewChange(e.target.value as 'dayGridMonth' | 'timeGridWeek' | 'listWeek')}
                          className="bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium py-2 pl-3 pr-8"
                        >
                          <option value="dayGridMonth">Mês</option>
                          <option value="timeGridWeek">Semana</option>
                          <option value="listWeek">Lista</option>
                        </select>
                      </div>
                    </div>
                    {loadingEvents ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                      </div>
                    ) : (
                      <FullCalendar
                        ref={calendarRef}
                        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                        initialView="dayGridMonth"
                        events={events}
                        locale={ptBrLocale}
                        headerToolbar={false}
                        height="auto"
                        dayMaxEvents={true}
                        eventTimeFormat={{
                          hour: '2-digit',
                          minute: '2-digit',
                          meridiem: false,
                          hour12: false,
                        }}
                        eventClick={(info) => {
                          alert(`Evento: ${info.event.title}\nDescrição: ${info.event.extendedProps.description || 'N/A'}\nLocal: ${info.event.extendedProps.location || 'N/A'}`);
                        }}
                        datesSet={(dateInfo) => {
                          setCurrentTitle(dateInfo.view.title);
                        }}
                        themeSystem={theme === 'dark' ? 'standard' : 'bootstrap5'}
                      />
                    )}
                  </div>
                )}

                {activeTab === 'email' && (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Emails Enviados</h2>
                    {loadingEmails ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                      </div>
                    ) : sentEmails.length === 0 ? (
                      <p className="text-gray-600 dark:text-gray-400">Nenhum email enviado encontrado.</p>
                    ) : (
                      <div className="space-y-4">
                        {sentEmails.map((email) => (
                          <div key={email.id} className="bg-gray-50 dark:bg-white/5 rounded-lg p-4 border border-gray-200 dark:border-white/10">
                            <div
                              className="flex justify-between items-center cursor-pointer"
                              onClick={() => setExpandedEmail(expandedEmail === email.id ? null : email.id)}
                            >
                              <div>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">Assunto: {email.subject || '(Sem Assunto)'}</p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">Para: {email.to.join(', ')}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(email.date)}</p>
                                {expandedEmail === email.id ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                              </div>
                            </div>
                            {expandedEmail === email.id && (
                              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/10 text-sm text-gray-700 dark:text-gray-300">
                                <p className="mb-2">De: {email.from}</p>
                                <p className="mb-2">Snippet: {email.snippet}</p>
                                {email.hasAttachments && (
                                  <p className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                                    <Paperclip className="w-4 h-4" /> Anexos
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'drive' && (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Google Drive</h2>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            const newPath = [...folderPath];
                            newPath.pop();
                            setFolderPath(newPath);
                            const parentId = newPath.length > 0 ? newPath[newPath.length - 1].id : null;
                            loadDriveFolders(parentId);
                          }}
                          disabled={folderPath.length === 0}
                          className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </button>
                        <span className="text-gray-600 dark:text-gray-400">
                          {folderPath.length === 0 ? 'Meu Drive' : folderPath.map(f => f.name).join(' / ')}
                        </span>
                      </div>
                      <DrivePickerButton companyId={selectedCompanyId} />
                    </div>

                    {loadingDrive ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {driveFolders.map((folder) => (
                          <div
                            key={folder.id}
                            onClick={() => {
                              setFolderPath([...folderPath, folder]);
                              loadDriveFolders(folder.id);
                            }}
                            className="flex items-center gap-3 bg-gray-50 dark:bg-white/5 rounded-lg p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                          >
                            <Folder className="w-6 h-6 text-blue-500" />
                            <span className="text-gray-900 dark:text-white font-medium">{folder.name}</span>
                          </div>
                        ))}
                        {driveImages.map((image) => (
                          <a
                            key={image.id}
                            href={image.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 bg-gray-50 dark:bg-white/5 rounded-lg p-3 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                          >
                            <ImageIcon className="w-6 h-6 text-green-500" />
                            <span className="text-gray-900 dark:text-white font-medium">{image.name}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'smarthome' && (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Smart Home</h2>

                    {!tuyaConnected && (
                      <div className="bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200 p-4 rounded-lg mb-4 flex items-center justify-between">
                        <p className="flex items-center gap-2">
                          <AlertCircle className="w-5 h-5" />
                          Sua conta Tuya não está conectada. Conecte para gerenciar dispositivos.
                        </p>
                        <button
                          onClick={connectTuya}
                          className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          Conectar Tuya
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {loadingDevices || loadingTuyaDevices ? (
                        <div className="flex items-center justify-center py-12 col-span-full">
                          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        </div>
                      ) : (
                        <>
                          {smartDevices.map((device) => (
                            <div key={device.id} className="bg-gray-50 dark:bg-white/5 rounded-lg p-4 border border-gray-200 dark:border-white/10 flex flex-col">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-2xl">{getDeviceIcon(device.type)}</span>
                                {device.online ? (
                                  <Wifi className="w-5 h-5 text-green-500" />
                                ) : (
                                  <WifiOff className="w-5 h-5 text-red-500" />
                                )}
                              </div>
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{device.displayName}</h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Google Home</p>
                              <div className="mt-auto flex space-x-2">
                                <button
                                  onClick={() => sendDeviceCommand(device.id, 'turnOn')}
                                  disabled={deviceAction === device.id}
                                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Ligar
                                </button>
                                <button
                                  onClick={() => sendDeviceCommand(device.id, 'turnOff')}
                                  disabled={deviceAction === device.id}
                                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Desligar
                                </button>
                              </div>
                              <button
                                onClick={() => {
                                  setQuickFaqDevice(device);
                                  setQuickFaqAlias(device.displayName);
                                }}
                                className="mt-2 w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
                              >
                                Criar Comandos Rápidos
                              </button>
                            </div>
                          ))}

                          {tuyaDevices.map((device) => (
                            <div key={device.id} className="bg-gray-50 dark:bg-white/5 rounded-lg p-4 border border-gray-200 dark:border-white/10 flex flex-col">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-2xl">{device.icon}</span>
                                {device.online ? (
                                  <Wifi className="w-5 h-5 text-green-500" />
                                ) : (
                                  <WifiOff className="w-5 h-5 text-red-500" />
                                )}
                              </div>
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{device.displayName}</h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Tuya</p>
                              <div className="mt-auto flex space-x-2">
                                <button
                                  onClick={() => sendDeviceCommand(device.id, 'turnOn', { provider: 'tuya', commands: [{ code: 'switch_1', value: true }] })}
                                  disabled={deviceAction === device.id}
                                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Ligar
                                </button>
                                <button
                                  onClick={() => sendDeviceCommand(device.id, 'turnOff', { provider: 'tuya', commands: [{ code: 'switch_1', value: false }] })}
                                  disabled={deviceAction === device.id}
                                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Desligar
                                </button>
                              </div>
                              <button
                                onClick={() => {
                                  setQuickFaqDevice(device);
                                  setQuickFaqAlias(device.displayName);
                                }}
                                className="mt-2 w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
                              >
                                Criar Comandos Rápidos
                              </button>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {quickFaqDevice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg max-w-md w-full">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Criar Comandos Rápidos para {quickFaqDevice.displayName}</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Defina um apelido para o dispositivo para criar comandos de voz como "Ligar [Apelido]" e "Desligar [Apelido]".</p>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              placeholder="Ex: Luz da Sala"
              value={quickFaqAlias}
              onChange={(e) => setQuickFaqAlias(e.target.value)}
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setQuickFaqDevice(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={createQuickFAQs}
                disabled={savingFaqs || !quickFaqAlias.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingFaqs ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Criar Comandos'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AgendaPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <AgendaPageContent />
    </Suspense>
  );
}
