// components/dashboard/onboarding/steps/types.ts
// Tipos compartilhados entre todos os Steps.

import type { OnboardingState } from '../AssistantOnboarding';

export interface StepProps {
  state:    OnboardingState;
  update:   (patch: Partial<OnboardingState>) => void;
  onNext:   () => void;
  onBack:   () => void;
}
