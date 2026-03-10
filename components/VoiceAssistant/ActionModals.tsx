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
