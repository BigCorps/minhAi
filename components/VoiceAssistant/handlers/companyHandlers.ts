// ============================================================
// handlers/companyHandlers.ts
// Caminho: components/assistant/VoiceAssistant/handlers/companyHandlers.ts
//
// CORREÇÃO: deps passaram a usar setActiveModal (state unificado)
// ao invés de setNossaMarcaData / setEnderecoModalData separados.
// ============================================================

import { createClient } from '@/lib/supabase-browser';
import { ActiveModal, NossaMarcaData, EnderecoData } from '../types';
import { saveInteractionToHistory } from './functionUsage';

// ── Deps compartilhados ───────────────────────────────────────
interface CompanyHandlerDeps {
  companyId: string;
  setIsProcessing: (v: boolean) => void;
  setActiveModal: (modal: ActiveModal | null) => void;
  playText: (text: string) => Promise<void>;
}

// ──────────────────────────────────────────────────────────────
// handleNossaMarcaCommand
// Busca e exibe informações de marca da empresa.
// ──────────────────────────────────────────────────────────────
export async function handleNossaMarcaCommand({
  companyId,
  setIsProcessing,
  setActiveModal,
  playText,
}: CompanyHandlerDeps): Promise<void> {
  try {
    setIsProcessing(true);

    const supabase = createClient();
    const { data: company, error } = await supabase
      .from('companies')
      .select('name, logo_url, brand_description, business_hours, business_address')
      .eq('id', companyId)
      .single();

    if (error || !company) {
      await playText('Desculpe, não consegui acessar as informações.');
      return;
    }

    if (!company.brand_description && !company.business_hours && !company.business_address) {
      await playText('As informações ainda não foram configuradas.');
      return;
    }

    const isAddress =
      company.business_address &&
      !company.business_address.startsWith('http') &&
      !company.business_address.includes('www.');

    let qrContent = '';
    if (isAddress) {
      qrContent = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(company.business_address)}`;
    } else if (company.business_address) {
      qrContent = company.business_address.startsWith('http')
        ? company.business_address
        : `https://${company.business_address}`;
    }

    const modalData: NossaMarcaData = {
      companyName: company.name,
      logoUrl: company.logo_url,
      brandDescription: company.brand_description,
      businessHours: company.business_hours,
      businessAddress: company.business_address,
      qrContent,
      isAddress,
      autoCloseDuration: 20000,
    };

    // ✅ Usa setActiveModal (state unificado do ActionModals)
    setActiveModal({ type: 'NossaMarcaDisplay', data: modalData });

    // Montar texto TTS (limite seguro: 200 chars)
    let speechText = '';

    if (company.brand_description) {
      speechText =
        company.brand_description.length > 150
          ? company.brand_description.substring(0, 147) + '...'
          : company.brand_description;
    }

    if (company.business_hours) {
      const horaTexto = `. Horário: ${company.business_hours}`;
      if ((speechText + horaTexto).length <= 200) speechText += horaTexto;
    }

    if (company.business_address && speechText.length < 180) {
      speechText += isAddress
        ? '. Veja a localização no QR Code.'
        : '. Acesse nosso site pelo QR Code.';
    }

    if (!speechText) speechText = 'Aqui estão nossas informações.';
    if (speechText.length > 200) speechText = speechText.substring(0, 197) + '...';

    console.log(`🔊 TTS (${speechText.length} chars):`, speechText);

    // Fala em paralelo com o modal
    playText(speechText).catch(err => console.error('Erro ao falar:', err));

    await saveInteractionToHistory(companyId, 'Informações da marca', speechText);
  } catch (error) {
    console.error('🏢 [NOSSA MARCA] ERRO:', error);
    playText('Erro ao buscar dados.').catch(() => {});
  } finally {
    setIsProcessing(false);
  }
}

export async function handleCadastro({
  companyId, setIsProcessing, setActiveModal, playText,
}: CompanyHandlerDeps) {
  try {
    setIsProcessing(true);
    setActiveModal({ type: 'RegistrationDisplay', data: { companyId } });
    playText('Abrindo cadastro.').catch(() => {});
  } catch (error) {
    await playText('Erro ao abrir o cadastro. Tente novamente.');
  } finally {
    setIsProcessing(false);
  }
}

export async function handleLerQRCode({ companyId, setIsProcessing, setActiveModal, playText }: CompanyHandlerDeps): Promise<void> {
  try {
    setIsProcessing(true);
    setActiveModal({ type: 'LerQRCodeDisplay', data: { companyId } });
    playText('Abrindo leitura de QR Code.').catch(() => {});
  } catch (error) {
    await playText('Erro ao abrir. Tente novamente.');
  } finally { setIsProcessing(false); }
}

export async function handleLerCodigoBarras({ companyId, setIsProcessing, setActiveModal, playText }: CompanyHandlerDeps): Promise<void> {
  try {
    setIsProcessing(true);
    setActiveModal({ type: 'LerCodigoBarrasDisplay', data: { companyId } });
    playText('Abrindo leitura de código de barras.').catch(() => {});
  } catch (error) {
    await playText('Erro ao abrir. Tente novamente.');
  } finally { setIsProcessing(false); }
}

export async function handleValidarCupom({ companyId, setIsProcessing, setActiveModal, playText }: CompanyHandlerDeps): Promise<void> {
  try {
    setIsProcessing(true);
    setActiveModal({ type: 'ValidarCupomDisplay', data: { companyId } });
    playText('Abrindo validação de cupom.').catch(() => {});
  } catch (error) {
    await playText('Erro ao abrir. Tente novamente.');
  } finally { setIsProcessing(false); }
}

export async function handleImagemEmTexto({ companyId, setIsProcessing, setActiveModal, playText }: CompanyHandlerDeps): Promise<void> {
  try {
    setIsProcessing(true);
    setActiveModal({ type: 'ImagemEmTextoDisplay', data: { companyId } });
    playText('Abrindo extração de texto.').catch(() => {});
  } catch (error) {
    await playText('Erro ao abrir. Tente novamente.');
  } finally { setIsProcessing(false); }
}

export async function handleTabelaEmTexto({ companyId, setIsProcessing, setActiveModal, playText }: CompanyHandlerDeps): Promise<void> {
  try {
    setIsProcessing(true);
    setActiveModal({ type: 'TabelaEmTextoDisplay', data: { companyId } });
    playText('Abrindo conversor de tabela.').catch(() => {});
  } catch (error) {
    await playText('Erro ao abrir. Tente novamente.');
  } finally { setIsProcessing(false); }
}

export async function handleContratoEmTexto({ companyId, setIsProcessing, setActiveModal, playText }: CompanyHandlerDeps): Promise<void> {
  try {
    setIsProcessing(true);
    setActiveModal({ type: 'ContratoEmTextoDisplay', data: { companyId } });
    playText('Abrindo digitalização de contrato.').catch(() => {});
  } catch (error) {
    await playText('Erro ao abrir. Tente novamente.');
  } finally { setIsProcessing(false); }
}

export async function handleVideoInstrucoesCommand({
  companyId,
  setIsProcessing,
  setActiveModal,
  playText,
}: CompanyHandlerDeps): Promise<void> {
  try {
    console.log('🎬 Executando: Vídeo de Instruções (via carrossel)');
    setIsProcessing(true);
    
    // Buscar URL do vídeo configurado
    const supabase = createClient();
    
    const { data: company, error } = await supabase
      .from('companies')
      .select('video_instrucoes_url')
      .eq('id', companyId)
      .single();
    
    if (error) {
      console.error('Erro ao buscar vídeo:', error);
      await playText('Desculpe, não consegui acessar o vídeo de instruções.');
      return;
    }
    
    // Verificar se tem vídeo configurado
    if (!company || !company.video_instrucoes_url) {
      await playText('Ainda não temos um vídeo de instruções configurado. Entre em contato com o suporte.');
      return;
    }
    
    // Abrir modal do vídeo
    setActiveModal({
      type: 'VideoInstrucoesDisplay',
      data: {
        companyId,
        videoUrl: company.video_instrucoes_url,
      },
    });
    
    // Falar em paralelo
    playText('Abrindo vídeo de instruções.').catch(err => {
      console.error('Erro ao falar:', err);
    });
    
  } catch (error) {
    console.error('🎬 [VÍDEO INSTRUÇÕES] ERRO:', error);
    await playText('Ocorreu um erro ao tentar abrir o vídeo.');
  } finally {
    setIsProcessing(false);
  }
}

export async function handleSequenciaVideosCommand({
  companyId,
  setIsProcessing,
  setActiveModal,
  playText,
}: CompanyHandlerDeps): Promise<void> {
  try {
    console.log('🎬 Executando: Sequência de Vídeos (via carrossel)');
    setIsProcessing(true);
    
    // Buscar vídeos configurados
    const supabase = createClient();
    
    const { data: company, error } = await supabase
      .from('companies')
      .select('sequencia_videos_urls')
      .eq('id', companyId)
      .single();
    
    if (error) {
      console.error('Erro ao buscar sequência:', error);
      await playText('Desculpe, não consegui acessar a sequência de vídeos.');
      return;
    }
    
    // Verificar se tem vídeos configurados
    const videos = company?.sequencia_videos_urls || [];
    
    if (!Array.isArray(videos) || videos.length === 0) {
      await playText('Ainda não temos vídeos configurados na sequência. Entre em contato com o suporte.');
      return;
    }
    
    // Abrir modal da sequência
    setActiveModal({
      type: 'SequenciaVideosDisplay',
      data: {
        companyId,
        videos,
      },
    });
    
    // Falar em paralelo
    playText(`Abrindo sequência com ${videos.length} vídeos.`).catch(err => {
      console.error('Erro ao falar:', err);
    });
    
  } catch (error) {
    console.error('🎬 [SEQUÊNCIA VÍDEOS] ERRO:', error);
    await playText('Ocorreu um erro ao tentar abrir a sequência de vídeos.');
  } finally {
    setIsProcessing(false);
  }
}

export async function handleWifiQRCode({ companyId, setIsProcessing, setActiveModal, playText }: CompanyHandlerDeps): Promise<void> {
  try {
    setIsProcessing(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('companies')
      .select('wifi_network_name, wifi_network_password, name')
      .eq('id', companyId)
      .single();
    if (!data?.wifi_network_name) {
      await playText('O Wi-Fi ainda não foi configurado. Configure no painel.');
      return;
    }
    setActiveModal({
      type: 'WifiQRCodeDisplay',
      data: {
        networkName: data.wifi_network_name,
        networkPassword: data.wifi_network_password ?? '',
        companyName: data.name,
      },
    });
    playText(`Aqui está o QR Code do Wi-Fi.`).catch(() => {});
  } catch {
    await playText('Erro ao carregar o Wi-Fi. Tente novamente.');
  } finally {
    setIsProcessing(false);
  }
}

export async function handleCardapio({ companyId, setIsProcessing, setActiveModal, playText }: CompanyHandlerDeps): Promise<void> {
  try {
    setIsProcessing(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('companies')
      .select('cardapio_url, cardapio_description, name')
      .eq('id', companyId)
      .single();
    if (!data?.cardapio_url) {
      await playText('O cardápio ainda não foi configurado. Configure no painel.');
      return;
    }
    setActiveModal({
      type: 'CardapioDisplay',
      data: {
        menuUrl: data.cardapio_url,
        menuDescription: data.cardapio_description ?? '',
        companyName: data.name,
      },
    });
    playText(
      data.cardapio_description
        ? `Aqui está o cardápio. ${data.cardapio_description}`
        : 'Aqui está o nosso cardápio.'
    ).catch(() => {});
  } catch {
    await playText('Erro ao carregar o cardápio. Tente novamente.');
  } finally {
    setIsProcessing(false);
  }
}

export async function handleNossoQRCode({ companyId, setIsProcessing, setActiveModal, playText }: CompanyHandlerDeps): Promise<void> {
  try {
    setIsProcessing(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('companies')
      .select('qrcode_content, qrcode_label, name')
      .eq('id', companyId)
      .single();
    if (!data?.qrcode_content) {
      await playText('O QR Code ainda não foi configurado. Configure no painel.');
      return;
    }
    setActiveModal({
      type: 'NossoQRCodeDisplay',
      data: {
        qrContent: data.qrcode_content,
        qrLabel: data.qrcode_label,
        companyName: data.name,
      },
    });
    playText(data.qrcode_label).catch(() => {});
  } catch {
    await playText('Erro ao carregar o QR Code. Tente novamente.');
  } finally {
    setIsProcessing(false);
  }
}

// ──────────────────────────────────────────────────────────────
// handleEnderecoCommand
// Busca e exibe o endereço físico com link para Google Maps.
// ──────────────────────────────────────────────────────────────
export async function handleEnderecoCommand({
  companyId,
  setIsProcessing,
  setActiveModal,
  playText,
}: CompanyHandlerDeps): Promise<void> {
  try {
    setIsProcessing(true);

    const supabase = createClient();
    const { data: company } = await supabase
      .from('companies')
      .select('name, business_address')
      .eq('id', companyId)
      .single();

    if (!company || !company.business_address) {
      await playText('O endereço ainda não foi configurado. Por favor, configure no painel administrativo.');
      return;
    }

    const isAddress =
      !company.business_address.startsWith('http') &&
      !company.business_address.includes('www.');

    if (!isAddress) {
      await playText('Esta empresa não possui um endereço físico configurado, apenas um site.');
      return;
    }

    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(company.business_address)}`;

    const modalData: EnderecoData = {
      companyName: company.name,
      address: company.business_address,
      mapsUrl,
      qrContent: mapsUrl,
    };

    // ✅ Usa setActiveModal (state unificado do ActionModals)
    setActiveModal({ type: 'EnderecoDisplay', data: modalData });

    playText(
      `Estamos localizados em: ${company.business_address}. Você pode copiar o link ou escanear o QR Code para abrir no Google Maps.`
    ).catch(err => console.error('Erro ao falar:', err));
  } catch (error) {
    console.error('Erro endereço:', error);
    await playText('Erro ao buscar endereço.');
  } finally {
    setIsProcessing(false);
  }
}
