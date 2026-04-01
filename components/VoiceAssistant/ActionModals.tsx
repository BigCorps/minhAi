// ============================================================
// ActionModals.tsx  ← ARQUIVO NOVO (não existia antes)
// Caminho: components/assistant/VoiceAssistant/ActionModals.tsx
//
// Substitui os ~300 linhas de condicionais de modal que estavam
// no VoiceAssistantWithWakeWord.tsx. Para adicionar uma nova
// função com modal, basta: importar o componente + adicionar
// UMA linha no MODAL_COMPONENTS abaixo.
// ============================================================

import React from 'react';
import MeuSistemaDisplay from '@/components/assistant/MeuSistemaDisplay';
import NossaMarcaDisplay from '@/components/assistant/NossaMarcaDisplay';
import EnderecoDisplay from '@/components/assistant/EnderecoDisplay';
import QRCodeDisplay from '@/components/assistant/QRCodeDisplay';
import PIXConfirmationModal from '@/components/assistant/PixConfirmationModal';
import VideoInstrucoesDisplay from '@/components/assistant/VideoInstrucoesDisplay';
import SendEmailModal from '@/components/assistant/SendEmailModal';
import CreateEventModal from '@/components/assistant/CreateEventModal';
import ViewAgendaModal from '@/components/assistant/ViewAgendaModal';
import SequenciaVideosDisplay from '@/components/assistant/SequenciaVideosDisplay';
import InfinitePayDisplay from '@/components/assistant/InfinitePayDisplay';
import CriarLembreteDisplay from '@/components/assistant/CriarLembreteDisplay';
import CronometroDisplay from '@/components/assistant/CronometroDisplay';
import TemporizadorDisplay from '@/components/assistant/TemporizadorDisplay';
import RelogioMundialDisplay from '@/components/assistant/RelogioMundialDisplay';
import AlarmeDisplay from '@/components/assistant/AlarmeDisplay';
import WifiQRCodeDisplay from '@/components/assistant/WifiQRCodeDisplay';
import CardapioDisplay from '@/components/assistant/CardapioDisplay';
import NossoQRCodeDisplay from '@/components/assistant/NossoQRCodeDisplay';
import LerQRCodeDisplay from '@/components/assistant/LerQRCodeDisplay';
import LerCodigoBarrasDisplay from '@/components/assistant/LerCodigoBarrasDisplay';
import ValidarCupomDisplay from '@/components/assistant/ValidarCupomDisplay';
import ImagemEmTextoDisplay from '@/components/assistant/ImagemEmTextoDisplay';
import TabelaEmTextoDisplay from '@/components/assistant/TabelaEmTextoDisplay';
import ContratoEmTextoDisplay from '@/components/assistant/ContratoEmTextoDisplay';
import FichaProducaoDisplay from '@/components/assistant/FichaProducaoDisplay';
import MeuCupomDisplay from '@/components/assistant/MeuCupomDisplay';
import ConfirmPresenceModal from '@/components/assistant/ConfirmPresenceModal';
import RescheduleModal from '@/components/assistant/RescheduleModal';
import CancelAppointmentModal from '@/components/assistant/CancelAppointmentModal';
import EnviarArquivoDisplay from '@/components/assistant/EnviarArquivoDisplay';
import GerarQRCodeDisplay       from '@/components/assistant/GerarQRCodeDisplay';
import GerarCodigoBarrasDisplay  from '@/components/assistant/GerarCodigoBarrasDisplay';
import FichaConversacionalDisplay from '@/components/assistant/FichaConversacionalDisplay';
import RegistrationDisplay from '@/components/assistant/RegistrationDisplay';
import ConsultarCpfModal from '@/components/assistant/ConsultarCpfModal';
import ConsultarCnpjModal from '@/components/assistant/ConsultarCnpjModal';
import ConsultarPlacaModal from '@/components/assistant/ConsultarPlacaModal';
import ConsultarLeilaoModal from '@/components/assistant/ConsultarLeilaoModal';
import CotacaoMoedasDisplay from '@/components/assistant/CotacaoMoedasDisplay';
import ConsultarCEPDisplay from '@/components/assistant/ConsultarCEPDisplay';
import RestricoesCPFDisplay from '@/components/assistant/RestricoesCPFDisplay';
import RestricoesCNPJDisplay from '@/components/assistant/RestricoesCNPJDisplay';
import FeriadosNacionaisDisplay from '@/components/assistant/FeriadosNacionaisDisplay';
import ConsultarDDDDisplay from '@/components/assistant/ConsultarDDDDisplay';
import MercadoPagoPointDisplay from '@/components/assistant/MercadoPagoPointDisplay';
import ClimaTempoDisplay from '@/components/assistant/ClimaTempoDisplay';
import TocarVideoDisplay from '@/components/assistant/TocarVideoDisplay';
import SaleModeModal from '@/components/VoiceAssistant/modals/SaleModeModal';
import CadastrarProdutoDisplay from '@/components/assistant/CadastrarProdutoDisplay';
import VerProdutoDisplay from '@/components/assistant/VerProdutoDisplay';
import TocarMusicaDisplay from '@/components/assistant/TocarMusicaDisplay';
import ImpressaoLocalDisplay from '@/components/assistant/ImpressaoLocalDisplay';
import ImpressaoRemotaDisplay from '@/components/assistant/ImpressaoRemotaDisplay';
import ImpressaoReciboDisplay from '@/components/assistant/ImpressaoReciboDisplay';
import PlaylistDisplay from '@/components/assistant/PlaylistDisplay';
import PortaRetratoDisplay from '@/components/assistant/PortaRetratoDisplay';
import PainelOfertasDisplay from '@/components/assistant/PainelOfertasDisplay';
import AparelhosSmartDisplay from '@/components/assistant/AparelhosSmartDisplay';
import CanalYoutubeDisplay from '@/components/assistant/CanalYoutubeDisplay';
import IdentificarFraudeDisplay from '@/components/assistant/IdentificarFraudeDisplay';
import LoginClienteDisplay from '@/components/assistant/LoginClienteDisplay';
import TranslateTextModal from '@/components/assistant/TranslateTextModal';
import TranscribeAudioModal from '@/components/assistant/TranscribeAudioModal';
import SegundaViaBoletoDisplay from '@/components/assistant/SegundaViaBoletoDisplay';
import RastreioCorreiosDisplay from '@/components/assistant/RastreioCorreiosDisplay';
import BuscarEnderecoDisplay from '@/components/assistant/BuscarEnderecoDisplay';
import TracarRotaDisplay from '@/components/assistant/TracarRotaDisplay';
import CriarNotaDisplay from '@/components/assistant/CriarNotaDisplay';
import LembreteRemediosDisplay from '@/components/assistant/LembreteRemediosDisplay';
import ConverterArquivoDisplay from '@/components/assistant/ConverterArquivoDisplay';
import DuplicarImagemDisplay from '@/components/assistant/DuplicarImagemDisplay';
import EditarImagemDisplay from '@/components/assistant/EditarImagemDisplay';
import RemoverFundoDisplay from '@/components/assistantRemoverFundoDisplay';

// ⬇️ Importe aqui cada novo componente Display criado para novas funções
// import MinhaNovaFuncaoDisplay from '@/components/assistant/MinhaNovaFuncaoDisplay';

// ── Mapa de Componentes ───────────────────────────────────────
// Para adicionar nova função com modal: inclua UMA linha aqui.
// A chave (string) deve ser EXATAMENTE o valor passado em:
//   setActiveModal({ type: 'ESSA_CHAVE_AQUI', data: {...} })
// E deve coincidir com o campo ui_component no SQL do Supabase.
const MODAL_COMPONENTS: Record<string, React.ComponentType<any>> = {
  'MeuSistemaDisplay': MeuSistemaDisplay,
  'NossaMarcaDisplay': NossaMarcaDisplay,
  'EnderecoDisplay': EnderecoDisplay,
  'QRCodeDisplay': QRCodeDisplay,
  'PIXConfirmationModal': PIXConfirmationModal,
  'VideoInstrucoesDisplay': VideoInstrucoesDisplay,
  'SendEmailModal': SendEmailModal,
  'CreateEventModal': CreateEventModal,
  'ViewAgendaModal': ViewAgendaModal, 
  'SequenciaVideosDisplay': SequenciaVideosDisplay, 
  'InfinitePayDisplay': InfinitePayDisplay,
  'CriarLembreteDisplay': CriarLembreteDisplay,
  'CronometroDisplay': CronometroDisplay,
  'TemporizadorDisplay': TemporizadorDisplay,
  'RelogioMundialDisplay': RelogioMundialDisplay,
  'AlarmeDisplay': AlarmeDisplay,
  'WifiQRCodeDisplay': WifiQRCodeDisplay,
  'CardapioDisplay': CardapioDisplay,
  'NossoQRCodeDisplay': NossoQRCodeDisplay,
  'LerQRCodeDisplay': LerQRCodeDisplay,
  'LerCodigoBarrasDisplay': LerCodigoBarrasDisplay,
  'ValidarCupomDisplay': ValidarCupomDisplay,
  'ImagemEmTextoDisplay': ImagemEmTextoDisplay,
  'TabelaEmTextoDisplay': TabelaEmTextoDisplay,
  'ContratoEmTextoDisplay': ContratoEmTextoDisplay,
  'FichaProducaoDisplay': FichaProducaoDisplay,
  'MeuCupomDisplay': MeuCupomDisplay,
  'ConfirmPresenceModal': ConfirmPresenceModal,
  'RescheduleModal': RescheduleModal,
  'CancelAppointmentModal': CancelAppointmentModal,
  'EnviarArquivoDisplay': EnviarArquivoDisplay,
  'GerarQRCodeDisplay':      GerarQRCodeDisplay,
  'GerarCodigoBarrasDisplay': GerarCodigoBarrasDisplay,
  'fichas_producao_conversacional': FichaConversacionalDisplay,
  'FichaProducaoConversacionalDisplay': FichaConversacionalDisplay,
  'RegistrationDisplay': RegistrationDisplay,
  'ConsultarCpfModal': ConsultarCpfModal,
  'ConsultarCnpjModal': ConsultarCnpjModal,
  'ConsultarPlacaModal': ConsultarPlacaModal,
  'ConsultarLeilaoModal': ConsultarLeilaoModal,
  'CotacaoMoedasDisplay': CotacaoMoedasDisplay,
  'ConsultarCEPDisplay': ConsultarCEPDisplay,
  'RestricoesCPFDisplay': RestricoesCPFDisplay,
  'RestricoesCNPJDisplay': RestricoesCNPJDisplay,
  'FeriadosNacionaisDisplay': FeriadosNacionaisDisplay,
  'ConsultarDDDDisplay': ConsultarDDDDisplay,
  'ClimaTempoDisplay': ClimaTempoDisplay,
  'TocarVideoDisplay': TocarVideoDisplay,
  'TocarMusicaDisplay': TocarMusicaDisplay,
  'ImpressaoLocalDisplay': ImpressaoLocalDisplay,
  'ImpressaoRemotaDisplay': ImpressaoRemotaDisplay,
  'ImpressaoReciboDisplay': ImpressaoReciboDisplay,
  'PlaylistDisplay': PlaylistDisplay,
  'PortaRetratoDisplay': PortaRetratoDisplay,
  'PainelOfertasDisplay': PainelOfertasDisplay,
  'AparelhosSmartDisplay': AparelhosSmartDisplay,
  'CanalYoutubeDisplay': CanalYoutubeDisplay,
  'IdentificarFraudeDisplay': IdentificarFraudeDisplay,
  'LoginClienteDisplay': LoginClienteDisplay,
  'TranslateTextModal': TranslateTextModal,
  'TranscribeAudioModal': TranscribeAudioModal,
  'SegundaViaBoletoDisplay': SegundaViaBoletoDisplay,
  'RastreioCorreiosDisplay': RastreioCorreiosDisplay,
  'BuscarEnderecoDisplay': BuscarEnderecoDisplay,
  'TracarRotaDisplay': TracarRotaDisplay,
  'CriarNotaDisplay': CriarNotaDisplay,
  'LembreteRemediosDisplay': LembreteRemediosDisplay,
  'ConverterArquivoDisplay': ConverterArquivoDisplay,
  'DuplicarImagemDisplay': DuplicarImagemDisplay,
  'EditarImagemDisplay': EditarImagemDisplay,
  'RemoverFundoDisplay': RemoverFundoDisplay,
  'SaleModeModal': ({ data, onClose, theme, playText }: any) => (
  <SaleModeModal
    companyId={data.companyId}
    theme={theme}
    onClose={onClose}
    playText={playText}
    produtoDestaque={data.produtoDestaque}
    isListening={data.isListening}
    isProcessing={data.isProcessing}
    isPlayingAudio={data.isPlayingAudio}
    isTranscribing={data.isTranscribing}
    onMicDown={data.onMicDown}
    onMicUp={data.onMicUp}
    onTextMessage={data.onTextMessage}
    isMaximized={data.isMaximized}
    profile={data.profile}
  />
),
'VerProdutoDisplay': ({ data, onClose, theme, playText }: any) => (
  <VerProdutoDisplay
    data={data}
    onClose={onClose}
    theme={theme}
    playText={playText}

    // PIX direto: gera cobrança com o produto sem passar pelo carrinho
    onComprarPix={(produto, opcoes, totalAdicional) => {
      onClose();
      // Dispara o modal PIX com o valor total (produto + adicionais) × quantidade
      const quantidade = (produto as any)._quantidade ?? 1;
      const valorCents = Math.round(produto.preco_venda * quantidade * 100);
      window.dispatchEvent(new CustomEvent('verProdutoPix', {
        detail: {
          companyId: data.companyId,
          produto,
          opcoes,
          quantidade,
          valorCents,
        },
      }));
    }}

    // Carrinho: abre SaleModeModal com produto pré-adicionado
    onAdicionarCarrinho={(produto, opcoes, totalAdicional) => {
      onClose();
      const quantidade = (produto as any)._quantidade ?? 1;
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('voiceAssistantFunctionClick', {
          detail: {
            functionKey: 'modo_venda',
            produtoInicial: produto,
            quantidadeInicial: quantidade,
            opcoesIniciais: opcoes,
          },
        }));
      }, 150);
    }}
  />
),
'CadastrarProdutoDisplay': ({ data, onClose, theme, playText }: any) => (
  <CadastrarProdutoDisplay
    data={data}
    onClose={onClose}
    theme={theme}
    playText={playText}
    onSalvo={(produto) => {
      // Crédito cobrado aqui, após salvar com sucesso
      import('@/components/VoiceAssistant/handlers/functionUsage').then(({ registerFunctionUsage }) => {
        registerFunctionUsage(data.companyId, 'cadastrar_produto', 1);
      });
    }}
  />
),
  'MercadoPagoPointDisplay': ({ data, onClose, playText }: any) => (
  <MercadoPagoPointDisplay
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
),
  // ⬇️ Novas funções — adicione aqui
  // 'MinhaNovaFuncaoDisplay': MinhaNovaFuncaoDisplay,
};

// ── Props ─────────────────────────────────────────────────────
interface ActionModalsProps {
  activeModal: {
    type: string;
    data: any;
  } | null;
  onClose: () => void;
  theme: 'dark' | 'light';
  // Handlers de PIX (passados diretamente pois têm lógica própria)
  onConfirmPix?: (data: any) => void;
  onCancelPix?: () => void;
  playText?: (text: string) => Promise<void>;
}

// ── Componente ────────────────────────────────────────────────
export function ActionModals({
  activeModal,
  onClose,
  theme,
  onConfirmPix,
  onCancelPix,
  playText,
}: ActionModalsProps) {
  if (!activeModal) return null;

  const Component = MODAL_COMPONENTS[activeModal.type];

  if (!Component) {
    console.warn(`⚠️ ActionModals: componente não encontrado para tipo "${activeModal.type}".`);
    return null;
  }

  return (
    <Component
      data={activeModal.data}
      onClose={onClose}
      theme={theme}
      playText={playText}
      onConfirmPix={onConfirmPix}
      onCancelPix={onCancelPix}
    />
  );
}
