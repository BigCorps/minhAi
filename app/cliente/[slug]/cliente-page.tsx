'use client';

// ============================================================
// app/cliente/[slug]/cliente-page.tsx
// Client Component com sistema de modais integrado
// ============================================================

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import dynamic from 'next/dynamic';
import { useProfile } from '@/hooks/useProfile';
import SlugHeaderWrapper from '@/app/ia/[slug]/SlugHeaderWrapper';
import { ActionModals } from '@/components/VoiceAssistant/ActionModals';

const ClienteDashboard     = dynamic(() => import('@/components/cliente/dashboards/ClienteDashboard'));
const ColaboradorDashboard = dynamic(() => import('@/components/cliente/dashboards/ColaboradorDashboard'));
const FrentistaDashboard   = dynamic(() => import('@/components/cliente/dashboards/FrentistaDashboard'));
const AtendenteDashboard   = dynamic(() => import('@/components/cliente/dashboards/AtendenteDashboard'));
const CaixaDashboard       = dynamic(() => import('@/components/cliente/dashboards/CaixaDashboard'));
const GerenteDashboard     = dynamic(() => import('@/components/cliente/dashboards/GerenteDashboard'));
const TotemDashboard       = dynamic(() => import('@/components/cliente/dashboards/TotemDashboard'));

const DASHBOARD_MAP: Record<string, React.ComponentType<any>> = {
  cliente:       ClienteDashboard,
  colaborador:   ColaboradorDashboard,
  frentista:     FrentistaDashboard,
  atendente:     AtendenteDashboard,
  caixa:         CaixaDashboard,
  gerente:       GerenteDashboard,
  administrador: GerenteDashboard,
  totem:         TotemDashboard,
};

// Mapeia functionKey (snake_case) → nome do componente no MODAL_COMPONENTS
const FUNCTION_KEY_TO_MODAL: Record<string, string> = {
  registrar_venda:   'RegistrarVendaDisplay',
  ver_clientes:      'VerClientesDisplay',
  validar_cupom:     'ValidarCupomDisplay',
  chamar_gerente:    'ChamarGerenteDisplay',
  fechar_caixa:      'FecharCaixaDisplay',
  trocar_turno:      'TrocarTurnoDisplay',
  relatorio_vendas:  'RelatorioVendasDisplay',
  minhas_compras:    'MinhasComprasDisplay',
  meu_cupom:         'MeuCupomDisplay',
  procurar_produto:  'ProcurarProdutoDisplay',
  lista_compras:     'ListaComprasDisplay',
  ver_produto:       'VerProdutoDisplay',
  pix_generate:      'PIXConfirmationModal',
  send_email:        'SendEmailModal',
  create_event:      'CreateEventModal',
  view_agenda:       'ViewAgendaModal',
  ler_qrcode:        'LerQRCodeDisplay',
  ler_codigo_barras: 'LerCodigoBarrasDisplay',
  clima_tempo:       'ClimaTempoDisplay',
  consultar_cep:     'ConsultarCEPDisplay',
  consultar_cpf:     'ConsultarCpfModal',
  consultar_cnpj:    'ConsultarCnpjModal',
  consultar_placa:   'ConsultarPlacaModal',
  cotacao_moedas:    'CotacaoMoedasDisplay',
  cronometro:        'CronometroDisplay',
  temporizador:      'TemporizadorDisplay',
  relogio_mundial:   'RelogioMundialDisplay',
  alarme:            'AlarmeDisplay',
  lembrete_remedios: 'LembreteRemediosDisplay',
  criar_nota:        'CriarNotaDisplay',
  criar_lembrete:    'CriarLembreteDisplay',
  enviar_arquivo:    'EnviarArquivoDisplay',
  converter_arquivo: 'ConverterArquivoDisplay',
  editar_imagem:     'EditarImagemDisplay',
  remover_fundo:     'RemoverFundoDisplay',
  ver_noticias:      'VerNoticiasDisplay',
  rastreio_correios: 'RastreioCorreiosDisplay',
  tracar_rota:       'TracarRotaDisplay',
  tocar_video:       'TocarVideoDisplay',
  tocar_musica:      'TocarMusicaDisplay',
  cardapio:          'CardapioDisplay',
  painel_ofertas:    'PainelOfertasDisplay',
  qrcode:            'QRCodeDisplay',
  wifi_qrcode:       'WifiQRCodeDisplay',
  gerar_qrcode:      'GerarQRCodeDisplay',
  nosso_qrcode:      'NossoQRCodeDisplay',
  endereco:          'EnderecoDisplay',
  nossa_marca:       'NossaMarcaDisplay',
  meu_sistema:       'MeuSistemaDisplay',
  video_instrucoes:  'VideoInstrucoesDisplay',
  translate_text:    'TranslateTextModal',
  transcribe_audio:  'TranscribeAudioModal',
  login_cliente:     'LoginClienteDisplay',
  registration:      'RegistrationDisplay',
  fichas_producao:   'FichaProducaoDisplay',
  fila_atendimento:  'FilaAtendimentoDisplay',
  gerar_senha:       'GerarSenhaDisplay',
  painel_fila:       'PainelFilaDisplay',
};

interface ClientePageProps {
  company: {
    id: string;
    slug: string;
    name: string;
    logo_url?: string | null;
    assistant_role?: string | null;
    webapp_enabled?: boolean;
    modo_vendas_enabled?: boolean;
    modo_fila_enabled?: boolean;
  };
}

export default function ClientePage({ company }: ClientePageProps) {
  const router = useRouter();
  const { profile, loading } = useProfile(company.slug);

  // ── Estado para controle de modais ──
  const [activeModal, setActiveModal] = useState<{ type: string; data: any } | null>(null);

  // ── Tema dinâmico via next-themes ──
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const theme: 'dark' | 'light' = mounted
    ? (resolvedTheme as 'dark' | 'light' ?? 'dark')
    : 'dark';
  const isDark = theme === 'dark';

  // ── Listener do evento voiceAssistantFunctionClick ──
  useEffect(() => {
    const handleFunctionClick = (e: CustomEvent) => {
      const { functionKey, ...rest } = e.detail;

      // Traduz functionKey → nome do componente no MODAL_COMPONENTS
      const modalType = FUNCTION_KEY_TO_MODAL[functionKey] ?? functionKey;

      console.log('[ClientePage] Função chamada:', functionKey, '→', modalType, rest);

      setActiveModal({ type: modalType, data: { companyId: company.id, ...rest } });
    };

    window.addEventListener('voiceAssistantFunctionClick', handleFunctionClick as EventListener);
    return () => {
      window.removeEventListener('voiceAssistantFunctionClick', handleFunctionClick as EventListener);
    };
  }, [company.id]);

  // ── Redirecionar se não estiver logado ──
  useEffect(() => {
    if (!loading && !profile) {
      router.replace(`/ia/${company.slug}`);
    }
  }, [loading, profile, router, company.slug]);

  const bgPage = isDark
    ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950'
    : 'bg-gradient-to-br from-slate-100 via-gray-100 to-slate-200';

  // ── Loading state ──
  if (loading) {
    return (
      <div className={`min-h-screen flex flex-col ${bgPage}`}>
        <SlugHeaderWrapper
          company={company}
          slug={company.slug}
          pageType="cliente"
          overlayMode={false}
        />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
          <p className="text-sm" style={{ color: isDark ? 'rgb(148,163,184)' : 'rgb(100,116,139)' }}>
            Verificando sessão...
          </p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const Dashboard = DASHBOARD_MAP[profile.tipo] ?? ColaboradorDashboard;

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${bgPage}`}>
      <SlugHeaderWrapper
        company={company}
        slug={company.slug}
        pageType="cliente"
        overlayMode={false}
      />

      <main className="flex-1">
        <Dashboard
          profile={profile}
          company={company}
          theme={theme}
        />
      </main>

      {/* ── Sistema de Modais ── */}
      <ActionModals
        activeModal={activeModal}
        onClose={() => setActiveModal(null)}
        theme={theme}
        playText={async () => {}}
      />
    </div>
  );
}
