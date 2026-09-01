'use client';

import FuncionarIAAvatar from './FuncionarIAAvatar';

/**
 * Adaptador de compatibilidade.
 *
 * O avatar novo tem outra assinatura de props, e trocá-la em cada tela exigiria
 * mexer em quatro arquivos ao mesmo tempo. Este arquivo traduz o contrato
 * antigo para o novo, então widget, página pública e preview continuam
 * funcionando sem nenhuma alteração.
 *
 * `avatarOptionId` é aceito e ignorado: não existe mais escolha de aparência.
 * Uma atendente só, trabalhada até ficar convincente, em vez de três meio
 * prontas.
 *
 * Quando as telas forem migradas para `FuncionarIAAvatar` diretamente, este
 * arquivo pode ser apagado.
 */

type Props = {
  avatarOptionId?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  shirtColor?: string;
  shirtDetailColor?: string;
  uniformLogoUrl?: string | null;
  companyLogoUrl?: string | null;
  backgroundPreset?: string;
  backgroundUrl?: string | null;
  speaking?: boolean;
  audioElement?: HTMLAudioElement | null;
  speechText?: string | null;
  counter?: string | null;
  logoPlacement?: string | null;
  compact?: boolean;
  className?: string;
};

export default function FuncionarIAAvatarPhoto({
  primaryColor,
  secondaryColor,
  shirtColor,
  shirtDetailColor,
  uniformLogoUrl,
  companyLogoUrl,
  backgroundPreset,
  backgroundUrl,
  speaking,
  audioElement,
  speechText,
  counter,
  logoPlacement,
  compact,
  className,
}: Props) {
  return (
    <FuncionarIAAvatar
      primaryColor={primaryColor}
      secondaryColor={secondaryColor}
      shirtColor={shirtColor}
      trimColor={shirtDetailColor}
      companyLogoUrl={uniformLogoUrl || companyLogoUrl}
      backgroundPreset={backgroundPreset}
      backgroundUrl={backgroundUrl}
      speaking={speaking}
      audioElement={audioElement}
      speechText={speechText}
      counter={counter}
      logoPlacement={logoPlacement}
      compact={compact}
      className={className}
    />
  );
}
