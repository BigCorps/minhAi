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

  // Smart Home
  const [smartDevices, setSmartDevices] = useState<SmartDevice[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [deviceAction, setDeviceAction] = useState<string | null>(null);

  // General
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('calendar');

  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const theme = (resolvedTheme as 'dark' | 'light') || 'dark';
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

  // Reload data when tab changes
  useEffect(() => {
    if (!selectedCompanyId || !googleAccount) return;
    if (activeTab === 'smarthome' && smartDevices.length === 0) loadSmartDevices();
  }, [activeTab, googleAccount]);

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
        body: { company_id: companyId },
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
      setSmartDevices(json.devices || []);
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
    if (t.includes('tv') || t.includes('display')) return '📺';
    if (t.includes('speaker')) return '🔊';
    return '🔌';
  }

  // ── Tab config ───────────────────────────────────────────
  const tabs: { key: ActiveTab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'calendar', label: 'Calendário', icon: <CalendarIcon className="w-4 h-4" />, count: events.length },
    { key: 'email', label: 'Emails Enviados', icon: <Send className="w-4 h-4" />, count: sentEmails.length },
    { key: 'drive', label: 'Google Drive', icon: <HardDrive className="w-4 h-4" /> },
    { key: 'smarthome', label: 'Smart Home', icon: <Home className="w-4 h-4" />, count: smartDevices.length },
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
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleRefresh}
                        disabled={loadingEvents || loadingEmails || loadingDrive || loadingDevices}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition disabled:opacity-50"
                      >
                        <RefreshCw className={`w-4 h-4 ${(loadingEvents || loadingEmails || loadingDrive || loadingDevices) ? 'animate-spin' : ''}`} />
                        Atualizar
                      </button>
                      <button onClick={handleGoToConnect} className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition">
                        Gerenciar
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── Tabs: 2 por linha no mobile, 4 no desktop ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 border-b border-gray-200 dark:border-white/10">
                  {tabs.map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`px-3 py-3 text-xs sm:text-sm font-medium transition flex items-center justify-center gap-1.5 border-b-2 ${
                        activeTab === tab.key
                          ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                          : 'text-gray-600 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5'
                      } ${
                        // Borda direita entre colunas no mobile
                        tab.key === 'calendar' || tab.key === 'drive'
                          ? 'border-r border-r-gray-200 dark:border-r-white/10'
                          : ''
                      }`}
                    >
                      {tab.icon}
                      <span className="truncate">{tab.label}</span>
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
                        <button onClick={() => handleNav('prev')} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition text-gray-700 dark:text-gray-300">
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleNav('today')} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition">
                          Hoje
                        </button>
                        <button onClick={() => handleNav('next')} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition text-gray-700 dark:text-gray-300">
                          <ChevronRight className="w-5 h-5" />
                        </button>
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
                      <FullCalendar
                        ref={calendarRef}
                        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                        initialView="dayGridMonth"
                        headerToolbar={false}
                        events={events}
                        locale={ptBrLocale}
                        height="auto"
                        allDayText="Dia inteiro"
                        datesSet={(info) => { setCurrentTitle(info.view.title); setActiveView(info.view.type as any); }}
                      />
                    )}
                  </div>
                </>
              )}

              {/* ── EMAILS ENVIADOS ── */}
              {activeTab === 'email' && (
                <>
                  
                  {loadingEmails ? (
                    <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
                  ) : sentEmails.length === 0 ? (
                    <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 p-12 text-center">
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
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <Clock className="w-3 h-3" />{formatDate(email.date)}
                                </div>
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

              {/* ── GOOGLE DRIVE ── */}
{activeTab === 'drive' && (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <div>
        {selectedFolder
          ? <p className="text-sm text-gray-600 dark:text-gray-400">📁 <strong>{selectedFolder.name}</strong> — {driveImages.length} imagem{driveImages.length !== 1 ? 'ns' : ''}</p>
          : <p className="text-sm text-gray-400">Selecione uma pasta para ver as imagens</p>
        }
      </div>
      <DrivePickerButton
        companyId={selectedCompanyId!}
        onFolderSelected={(id, name) => {
          setSelectedFolder({ id, name });
          loadDriveImages(id);
        }}
        label={selectedFolder ? 'Trocar pasta' : 'Selecionar pasta'}
        className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium transition"
      />
    </div>

    {loadingImages ? (
      <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
    ) : !selectedFolder ? (
      <div className="bg-white/50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 p-12 text-center">
        <HardDrive className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <p className="text-gray-500">Clique em "Selecionar pasta" para começar</p>
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
                    <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 p-12 text-center">
                      <Home className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Nenhum dispositivo encontrado</h3>
                      <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                        Certifique-se de ter dispositivos Google Home/Nest vinculados à conta conectada e o Device Access ativado.
                      </p>
                      <button onClick={loadSmartDevices} className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition">
                        Tentar novamente
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                        <p className="text-sm text-green-800 dark:text-green-200">
                          🏠 {smartDevices.length} dispositivo{smartDevices.length !== 1 ? 's' : ''} encontrado{smartDevices.length !== 1 ? 's' : ''} · {smartDevices.filter(d => d.online).length} online
                        </p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {smartDevices.map(device => (
                          <div key={device.id} className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-2xl">{getDeviceIcon(device.type)}</span>
                                <div>
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{device.displayName}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">{device.type.split('.').pop()}</p>
                                </div>
                              </div>
                              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${device.online ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-gray-100 dark:bg-slate-700 text-gray-400'}`}>
                                {device.online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                                {device.online ? 'Online' : 'Offline'}
                              </div>
                            </div>
                            {device.online && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => sendDeviceCommand(device.id, 'sdm.devices.commands.ThermostatMode.SetMode', { mode: 'HEAT' })}
                                  disabled={deviceAction === device.id}
                                  className="flex-1 py-1.5 text-xs rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium transition disabled:opacity-50"
                                >
                                  {deviceAction === device.id ? '...' : 'Ligar'}
                                </button>
                                <button
                                  onClick={() => sendDeviceCommand(device.id, 'sdm.devices.commands.ThermostatMode.SetMode', { mode: 'OFF' })}
                                  disabled={deviceAction === device.id}
                                  className="flex-1 py-1.5 text-xs rounded-lg bg-red-500/80 hover:bg-red-600 text-white font-medium transition disabled:opacity-50"
                                >
                                  Desligar
                                </button>
                              </div>
                            )}
                            {!device.online && (
                              <p className="text-xs text-gray-400 text-center">Dispositivo offline</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
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
