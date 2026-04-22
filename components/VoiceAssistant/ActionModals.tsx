// ============================================================
// ActionModals.tsx
// Caminho: components/assistant/VoiceAssistant/ActionModals.tsx
//
// ✅ Todos os modais usam dynamic() — carregam apenas quando abertos.
// Isso reduz o bundle inicial e o CPU spike no carregamento da página.
//
// Para adicionar nova função com modal:
//   1. Adicionar UMA linha no MODAL_COMPONENTS com dynamic()
//   2. NÃO adicionar import estático no topo — usar o padrão abaixo
//
// Padrão para nova função:
//   'MinhaNovaFuncaoDisplay': dynamic(
//     () => import('@/components/assistant/MinhaNovaFuncaoDisplay'),
//     { ssr: false }
//   ),
// ============================================================

'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';

// ── Mapa de Componentes (todos lazy loaded) ───────────────────
const MODAL_COMPONENTS: Record<string, React.ComponentType<any>> = {

  // ── Informações da empresa ────────────────────────────────
  'MeuSistemaDisplay': dynamic(() => import('@/components/assistant/MeuSistemaDisplay'), { ssr: false }),
  'NossaMarcaDisplay': dynamic(() => import('@/components/assistant/NossaMarcaDisplay'), { ssr: false }),
  'EnderecoDisplay': dynamic(() => import('@/components/assistant/EnderecoDisplay'), { ssr: false }),
  'VideoInstrucoesDisplay': dynamic(() => import('@/components/assistant/VideoInstrucoesDisplay'), { ssr: false }),

  // ── QR Codes e contato ────────────────────────────────────
  'QRCodeDisplay': dynamic(() => import('@/components/assistant/QRCodeDisplay'), { ssr: false }),
  'WifiQRCodeDisplay': dynamic(() => import('@/components/assistant/WifiQRCodeDisplay'), { ssr: false }),
  'NossoQRCodeDisplay': dynamic(() => import('@/components/assistant/NossoQRCodeDisplay'), { ssr: false }),
  'GerarQRCodeDisplay': dynamic(() => import('@/components/assistant/GerarQRCodeDisplay'), { ssr: false }),
  'GerarCodigoBarrasDisplay': dynamic(() => import('@/components/assistant/GerarCodigoBarrasDisplay'), { ssr: false }),
  'CanalYoutubeDisplay': dynamic(() => import('@/components/assistant/CanalYoutubeDisplay'), { ssr: false }),

  // ── Pagamentos ────────────────────────────────────────────
  'PIXConfirmationModal': dynamic(() => import('@/components/assistant/PixConfirmationModal'), { ssr: false }),
  'InfinitePayDisplay': dynamic(() => import('@/components/assistant/InfinitePayDisplay'), { ssr: false }),
  'ImpressaoLocalDisplay': dynamic(() => import('@/components/assistant/ImpressaoLocalDisplay'), { ssr: false }),
  'ImpressaoRemotaDisplay': dynamic(() => import('@/components/assistant/ImpressaoRemotaDisplay'), { ssr: false }),
  'ImpressaoReciboDisplay': dynamic(() => import('@/components/assistant/ImpressaoReciboDisplay'), { ssr: false }),

  // ── Agenda e email ────────────────────────────────────────
  'SendEmailModal': dynamic(() => import('@/components/assistant/SendEmailModal'), { ssr: false }),
  'CreateEventModal': dynamic(() => import('@/components/assistant/CreateEventModal'), { ssr: false }),
  'ViewAgendaModal': dynamic(() => import('@/components/assistant/ViewAgendaModal'), { ssr: false }),
  'ConfirmPresenceModal': dynamic(() => import('@/components/assistant/ConfirmPresenceModal'), { ssr: false }),
  'RescheduleModal': dynamic(() => import('@/components/assistant/RescheduleModal'), { ssr: false }),
  'CancelAppointmentModal': dynamic(() => import('@/components/assistant/CancelAppointmentModal'), { ssr: false }),

  // ── Utilitários de tempo ──────────────────────────────────
  'CriarLembreteDisplay': dynamic(() => import('@/components/assistant/CriarLembreteDisplay'), { ssr: false }),
  'CronometroDisplay': dynamic(() => import('@/components/assistant/CronometroDisplay'), { ssr: false }),
  'TemporizadorDisplay': dynamic(() => import('@/components/assistant/TemporizadorDisplay'), { ssr: false }),
  'RelogioMundialDisplay': dynamic(() => import('@/components/assistant/RelogioMundialDisplay'), { ssr: false }),
  'AlarmeDisplay': dynamic(() => import('@/components/assistant/AlarmeDisplay'), { ssr: false }),
  'LembreteRemediosDisplay': dynamic(() => import('@/components/assistant/LembreteRemediosDisplay'), { ssr: false }),
  'CriarNotaDisplay': dynamic(() => import('@/components/assistant/CriarNotaDisplay'), { ssr: false }),

  // ── Câmera e leitura ──────────────────────────────────────
  'LerQRCodeDisplay': dynamic(() => import('@/components/assistant/LerQRCodeDisplay'), { ssr: false }),
  'LerCodigoBarrasDisplay': dynamic(() => import('@/components/assistant/LerCodigoBarrasDisplay'), { ssr: false }),
  'ValidarCupomDisplay': dynamic(() => import('@/components/assistant/ValidarCupomDisplay'), { ssr: false }),
  'ImagemEmTextoDisplay': dynamic(() => import('@/components/assistant/ImagemEmTextoDisplay'), { ssr: false }),
  'TabelaEmTextoDisplay': dynamic(() => import('@/components/assistant/TabelaEmTextoDisplay'), { ssr: false }),
  'ContratoEmTextoDisplay': dynamic(() => import('@/components/assistant/ContratoEmTextoDisplay'), { ssr: false }),
  'IdentificarFraudeDisplay': dynamic(() => import('@/components/assistant/IdentificarFraudeDisplay'), { ssr: false }),

  // ── Imagem e arquivo ──────────────────────────────────────
  'EnviarArquivoDisplay': dynamic(() => import('@/components/assistant/EnviarArquivoDisplay'), { ssr: false }),
  'ConverterArquivoDisplay': dynamic(() => import('@/components/assistant/ConverterArquivoDisplay'), { ssr: false }),
  'DuplicarImagemDisplay': dynamic(() => import('@/components/assistant/DuplicarImagemDisplay'), { ssr: false }),
  'EditarImagemDisplay': dynamic(() => import('@/components/assistant/EditarImagemDisplay'), { ssr: false }),
  'RemoverFundoDisplay': dynamic(() => import('@/components/assistant/RemoverFundoDisplay'), { ssr: false }),
  'AnalisarPlanilhaDisplay': dynamic(
  () => import('@/components/assistant/AnalisarPlanilhaDisplay'),
  { ssr: false }
),
 'JuntarPdfsDisplay': dynamic(
    () => import('@/components/assistant/JuntarPdfsDisplay'),
    { ssr: false }
  ),

  // ── Consultas ─────────────────────────────────────────────
  'ConsultarCpfModal': dynamic(() => import('@/components/assistant/ConsultarCpfModal'), { ssr: false }),
  'ConsultarCnpjModal': dynamic(() => import('@/components/assistant/ConsultarCnpjModal'), { ssr: false }),
  'ConsultarPlacaModal': dynamic(() => import('@/components/assistant/ConsultarPlacaModal'), { ssr: false }),
  'ConsultarLeilaoModal': dynamic(() => import('@/components/assistant/ConsultarLeilaoModal'), { ssr: false }),
  'CotacaoMoedasDisplay': dynamic(() => import('@/components/assistant/CotacaoMoedasDisplay'), { ssr: false }),
  'ConsultarCEPDisplay': dynamic(() => import('@/components/assistant/ConsultarCEPDisplay'), { ssr: false }),
  'RestricoesCPFDisplay': dynamic(() => import('@/components/assistant/RestricoesCPFDisplay'), { ssr: false }),
  'RestricoesCNPJDisplay': dynamic(() => import('@/components/assistant/RestricoesCNPJDisplay'), { ssr: false }),
  'FeriadosNacionaisDisplay': dynamic(() => import('@/components/assistant/FeriadosNacionaisDisplay'), { ssr: false }),
  'ConsultarDDDDisplay': dynamic(() => import('@/components/assistant/ConsultarDDDDisplay'), { ssr: false }),
  'ClimaTempoDisplay': dynamic(() => import('@/components/assistant/ClimaTempoDisplay'), { ssr: false }),
  'SegundaViaBoletoDisplay': dynamic(() => import('@/components/assistant/SegundaViaBoletoDisplay'), { ssr: false }),
  'RastreioCorreiosDisplay': dynamic(() => import('@/components/assistant/RastreioCorreiosDisplay'), { ssr: false }),
  'BuscarEnderecoDisplay': dynamic(() => import('@/components/assistant/BuscarEnderecoDisplay'), { ssr: false }),
  'TracarRotaDisplay': dynamic(() => import('@/components/assistant/TracarRotaDisplay'), { ssr: false }),
  'VerNoticiasDisplay': dynamic(() => import('@/components/assistant/VerNoticiasDisplay'), { ssr: false }),

  // ── Mídia ─────────────────────────────────────────────────
  'TocarVideoDisplay': dynamic(() => import('@/components/assistant/TocarVideoDisplay'), { ssr: false }),
  'TocarMusicaDisplay': dynamic(() => import('@/components/assistant/TocarMusicaDisplay'), { ssr: false }),
  'PlaylistDisplay': dynamic(() => import('@/components/assistant/PlaylistDisplay'), { ssr: false }),
  'PortaRetratoDisplay': dynamic(() => import('@/components/assistant/PortaRetratoDisplay'), { ssr: false }),
  'PainelOfertasDisplay': dynamic(() => import('@/components/assistant/PainelOfertasDisplay'), { ssr: false }),
  'SequenciaVideosDisplay': dynamic(() => import('@/components/assistant/SequenciaVideosDisplay'), { ssr: false }),
  'CardapioDisplay': dynamic(() => import('@/components/assistant/CardapioDisplay'), { ssr: false }),

  // ── Smart home ────────────────────────────────────────────
  'AparelhosSmartDisplay': dynamic(() => import('@/components/assistant/AparelhosSmartDisplay'), { ssr: false }),

  // ── Fichas de produção ────────────────────────────────────
  'FichaProducaoDisplay': dynamic(() => import('@/components/assistant/FichaProducaoDisplay'), { ssr: false }),
  'fichas_producao_conversacional': dynamic(() => import('@/components/assistant/FichaConversacionalDisplay'), { ssr: false }),
  'FichaProducaoConversacionalDisplay': dynamic(() => import('@/components/assistant/FichaConversacionalDisplay'), { ssr: false }),

// ── Vídeo Chamada ─────────────────────────────────────────
'VideoCallRequestDisplay': dynamic(
  () => import('@/components/assistant/VideoCallRequestDisplay'),
  { ssr: false }
),
'VideoCallIncomingDisplay': dynamic(
  () => import('@/components/assistant/VideoCallIncomingDisplay'),
  { ssr: false }
),
  
// ── Calculadoras e conversão ──────────────────────────────
  'ConverterMedidasDisplay': dynamic(() => import('@/components/assistant/ConverterMedidasDisplay'), { ssr: false }),
  'CalculadoraJurosDisplay': dynamic(() => import('@/components/assistant/CalculadoraJurosDisplay'), { ssr: false }),
  'CalculadoraIMCDisplay': dynamic(() => import('@/components/assistant/CalculadoraIMCDisplay'), { ssr: false }),

  // ── Cadastro e perfil ─────────────────────────────────────
  'RegistrationDisplay': dynamic(() => import('@/components/assistant/RegistrationDisplay'), { ssr: false }),
  'LoginClienteDisplay': dynamic(() => import('@/components/assistant/LoginClienteDisplay'), { ssr: false }),
  'MeuCupomDisplay': dynamic(() => import('@/components/assistant/MeuCupomDisplay'), { ssr: false }),
  'EnviarSmsDisplay': dynamic(() => import('@/components/assistant/EnviarSmsDisplay'), { ssr: false }),
  
  // ── Tradução e transcrição ────────────────────────────────
  'TranslateTextModal': dynamic(() => import('@/components/assistant/TranslateTextModal'), { ssr: false }),
  'TranscribeAudioModal': dynamic(() => import('@/components/assistant/TranscribeAudioModal'), { ssr: false }),

  // ── Vendas e estoque ──────────────────────────────────────
  'ProcurarProdutoDisplay': dynamic(() => import('@/components/assistant/ProcurarProdutoDisplay'), { ssr: false }),
  'ListaComprasDisplay': dynamic(() => import('@/components/assistant/ListaComprasDisplay'), { ssr: false }),
  'RegistrarVendaDisplay': dynamic(() => import('@/components/assistant/RegistrarVendaDisplay'), { ssr: false }),
  'VerClientesDisplay': dynamic(() => import('@/components/assistant/VerClientesDisplay'), { ssr: false }),
  'FecharCaixaDisplay': dynamic(() => import('@/components/assistant/FecharCaixaDisplay'), { ssr: false }),
  'TrocarTurnoDisplay': dynamic(() => import('@/components/assistant/TrocarTurnoDisplay'), { ssr: false }),
  'RelatorioVendasDisplay': dynamic(() => import('@/components/assistant/RelatorioVendasDisplay'), { ssr: false }),
  'MinhasComprasDisplay': dynamic(() => import('@/components/assistant/MinhasComprasDisplay'), { ssr: false }),
  'ChamarGerenteDisplay': dynamic(() => import('@/components/assistant/ChamarGerenteDisplay'), { ssr: false }),
  
  // ── Fila de Atendimento ───────────────────────────────────
  'FilaAtendimentoDisplay': dynamic(() => import('@/components/VoiceAssistant/modals/FilaAtendimentoDisplay'), { ssr: false }),
  'GerarSenhaDisplay': dynamic(() => import('@/components/VoiceAssistant/modals/FilaAtendimentoDisplay/GerarSenhaDisplay'), { ssr: false }),
  'PainelFilaDisplay': dynamic(() => import('@/components/VoiceAssistant/modals/FilaAtendimentoDisplay/PainelFilaDisplay'), { ssr: false }),
  'ResponderPesquisaDisplay': dynamic(() => import('@/components/VoiceAssistant/modals/ResponderPesquisaDisplay'), { ssr: false }),
  'PreAtendimentoDisplay': dynamic(() => import('@/components/VoiceAssistant/modals/PreAtendimentoDisplay'), { ssr: false }),
  
  // ── Modais com props customizadas ─────────────────────────
  // Estes precisam de wrapper inline pois recebem props além do padrão
  'VerProdutoDisplay': dynamic(
    () => import('@/components/assistant/VerProdutoDisplay').then(mod => ({
      default: ({ data, onClose, theme, playText }: any) => (
        <mod.default
          data={data}
          onClose={onClose}
          theme={theme}
          playText={playText}
          onComprarPix={(produto: any, opcoes: any) => {
            onClose();
            const quantidade = (produto as any)._quantidade ?? 1;
            const valorCents = Math.round(produto.preco_venda * quantidade * 100);
            window.dispatchEvent(new CustomEvent('verProdutoPix', {
              detail: { companyId: data.companyId, produto, opcoes, quantidade, valorCents },
            }));
          }}
          onAdicionarCarrinho={(produto: any, opcoes: any) => {
            onClose();
            const quantidade = (produto as any)._quantidade ?? 1;
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('voiceAssistantFunctionClick', {
                detail: { functionKey: 'modo_venda', produtoInicial: produto, quantidadeInicial: quantidade, opcoesIniciais: opcoes },
              }));
            }, 150);
          }}
        />
      )
    })),
    { ssr: false }
  ),

  'CadastrarProdutoDisplay': dynamic(
    () => import('@/components/assistant/CadastrarProdutoDisplay').then(mod => ({
      default: ({ data, onClose, theme, playText }: any) => (
        <mod.default
          data={data}
          onClose={onClose}
          theme={theme}
          playText={playText}
          onSalvo={() => {
            import('@/components/VoiceAssistant/handlers/functionUsage').then(({ registerFunctionUsage }) => {
              registerFunctionUsage(data.companyId, 'cadastrar_produto', 1);
            });
          }}
        />
      )
    })),
    { ssr: false }
  ),

  'MercadoPagoPointDisplay': dynamic(
    () => import('@/components/assistant/MercadoPagoPointDisplay').then(mod => ({
      default: ({ data, onClose, playText }: any) => (
        <mod.default
          companyId={data.companyId}
          paymentType={data.paymentType}
          initialAmount={data.initialAmount}
          initialInstallments={data.initialInstallments}
          maxInstallments={data.maxInstallments}
          minInstallmentValueCents={data.minInstallmentValueCents}
          installmentsCost={data.installmentsCost}
          playText={playText}
          onClose={onClose}
        />
      )
    })),
    { ssr: false }
  ),

  // ⬇️ NOVAS FUNÇÕES — adicione aqui seguindo o padrão:
  // 'MinhaNovaFuncaoDisplay': dynamic(
  //   () => import('@/components/assistant/MinhaNovaFuncaoDisplay'),
  //   { ssr: false }
  // ),
};

// ── Props ─────────────────────────────────────────────────────
interface ActionModalsProps {
  activeModal: { type: string; data: any } | null;
  onClose: () => void;
  theme: 'dark' | 'light';
  onConfirmPix?: (data: any) => void;
  onCancelPix?: () => void;
  playText?: (text: string) => Promise<void>;
  // ✅ ADICIONAR
  printConfig?: {
    print_on_purchase: boolean;
    print_on_queue: boolean;
    print_on_payment: boolean;
    hasActivePlan: boolean;
  };
}

// ── Componente ────────────────────────────────────────────────
export function ActionModals({
  activeModal,
  onClose,
  theme,
  onConfirmPix,
  onCancelPix,
  playText,
  printConfig,
}: ActionModalsProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ✅ CORREÇÃO: Disparar eventos globais para ocultar/mostrar o carrossel
  // Isso garante que QUALQUER modal aberto via ActionModals oculte o carrossel automaticamente.
  useEffect(() => {
    if (activeModal) {
      // Dispara evento de abertura
      window.dispatchEvent(new CustomEvent('eai:modalOpen'));
    } else {
      // Dispara evento de fechamento (com pequeno delay para suavizar transições se necessário)
      window.dispatchEvent(new CustomEvent('eai:modalClose'));
    }

    // Cleanup: garante que o carrossel volte se o componente for desmontado inesperadamente
    return () => {
      if (activeModal) {
        window.dispatchEvent(new CustomEvent('eai:modalClose'));
      }
    };
  }, [activeModal]);

  if (!activeModal || !mounted) return null;

  const Component = MODAL_COMPONENTS[activeModal.type];

  if (!Component) {
    console.warn(`⚠️ ActionModals: componente não encontrado para tipo "${activeModal.type}".`);
    return null;
  }

  return createPortal(
    <Component
      data={activeModal.data}
      onClose={onClose}
      theme={theme}
      playText={playText}
      onConfirmPix={onConfirmPix}
      onCancelPix={onCancelPix}
      printOnQueue={printConfig?.print_on_queue}
      printOnPayment={printConfig?.print_on_payment}
      hasActivePlan={printConfig?.hasActivePlan}
    />,
    document.body
  );
}
