// ============================================================
// types.ts
// Caminho: components/assistant/VoiceAssistant/types.ts
// ============================================================

export interface VoiceAssistantProps {
  companyId: string;
  companyName: string;
  wakeWord: string;
  greetingMessage: string;
  theme?: 'dark' | 'light';
  onAssistantStart?: () => void;
  onExitMaximized?: () => void;  // ← adicionar aqui
  hideDisabledFunctions?: boolean;
  autoScroll?: boolean;
}

export interface QRCodeData {
  type: 'whatsapp' | 'instagram' | 'pix' | 'website' | 'facebook' | 'email' | 'linkedin' | 'tiktok' | 'twitter' | 'telefone';
  qrCodeUrl: string;
  qrContent: string;
  displayText: string;
  amount?: string;
  companyName?: string;
}

export interface PixConfirmationData {
  transactionId: string;
  amount: string;
  qrCodeUrl: string;
  pixCode: string;
}

export interface NossaMarcaData {
  companyName: string;
  logoUrl?: string;
  brandDescription?: string;
  businessHours?: string;
  businessAddress?: string;
  qrContent?: string;
  isAddress?: boolean;
  autoCloseDuration?: number;
}

export interface EnderecoData {
  companyName: string;
  address: string;
  mapsUrl: string;
  qrContent: string;
}

export interface FunctionSettings {
  saveToHistory: boolean;
  creditsPerUse: number;
  isEnabled: boolean;
}

export interface ActiveFunctionContext {
  functionKey: string;
  activatedAt: number;
  expiresIn: number;
}

// ── Estado unificado de modal (alimenta o ActionModals.tsx) ──
// Para abrir qualquer modal, use:
// setActiveModal({ type: 'NomeDoComponenteDisplay', data: { ... } })
export interface ActiveModal {
  type: string;
  data: any;
}

export interface PIXConfirmationData {
  transactionId: string;
  amount: string;
  qrCodeUrl: string;
  pixCode: string;
}
