import { uploadFuncionarIAAsset } from '@/lib/funcionaria-assets';
import type {
  FuncionarIAEquipmentMode,
  FuncionarIAWhatsAppMode,
  FuncionarIAWorkplaceMode,
} from '@/lib/funcionaria-skills';

const DB_NAME = 'funcionaria-onboarding';
const DB_VERSION = 1;
const STORE_NAME = 'drafts';
const DRAFT_KEY = 'pending';
const META_KEY = 'funcionaria:onboarding:draft';

export type FuncionarIAOnboardingDraft = {
  version: 1;
  step: number;
  workplace: FuncionarIAWorkplaceMode;
  companyName: string;
  companySlug: string;
  businessType: string;
  selected: string[];
  primaryColor: string;
  secondaryColor: string;
  shirtColor: string;
  shirtDetailColor: string;
  backgroundPreset: string;

  /**
   * Balcao na frente da atendente. Ver COUNTERS em lib/funcionaria-avatar.
   */
  counter?: string;

  /** Personalidade de voz. Ver FUNCIONARIA_VOICES em lib/funcionaria-voices. */
  voiceId?: string;

  /** Onde o logo aparece. Ver LOGO_PLACEMENTS em lib/funcionaria-avatar. */
  logoPlacement?: string;

  /**
   * Legado. Nao existe mais escolha de aparencia — uma atendente so. O campo
   * continua no tipo porque rascunhos salvos antes da mudanca ainda o trazem,
   * e derrubar o parse por causa dele seria pior do que ignora-lo.
   */
  avatarOptionId?: string;
  companyLogoUrl?: string | null;
  uniformLogoUrl?: string | null;
  backgroundUrl?: string | null;
  uniformLogoFile?: File | Blob | null;
  backgroundFile?: File | Blob | null;
  aiEnabled: boolean;
  voiceEnabled: boolean;
  whatsappMode: FuncionarIAWhatsAppMode;
  equipmentMode: FuncionarIAEquipmentMode;
  savedAt: string;
};

type DraftMetadata = Omit<FuncionarIAOnboardingDraft, 'uniformLogoFile' | 'backgroundFile'>;

function normalizeStep(step: unknown) {
  const value = Number(step || 1);
  return Math.max(1, Math.min(7, Number.isFinite(value) ? Math.round(value) : 1));
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('indexeddb_unavailable'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('indexeddb_open_failed'));
  });
}

function withoutFiles(draft: FuncionarIAOnboardingDraft): DraftMetadata {
  const { uniformLogoFile: _uniform, backgroundFile: _background, ...metadata } = draft;
  return metadata;
}

function restoreFile(value: File | Blob | null | undefined, name: string, type: string): File | null {
  if (!value) return null;
  if (typeof File !== 'undefined' && value instanceof File) return value;
  if (typeof Blob !== 'undefined' && value instanceof Blob) {
    return new File([value], name, { type: value.type || type });
  }
  return null;
}

export async function saveFuncionarIAOnboardingDraft(draft: FuncionarIAOnboardingDraft) {
  if (typeof window === 'undefined') return;

  const normalized: FuncionarIAOnboardingDraft = {
    ...draft,
    version: 1,
    step: normalizeStep(draft.step),
    selected: Array.from(new Set(draft.selected || [])),
    counter: draft.counter || 'nenhum',
    voiceId: draft.voiceId || 'clara',
    logoPlacement: draft.logoPlacement || 'cracha',
    savedAt: new Date().toISOString(),
  };

  // Fallback leve: mesmo se o navegador bloquear IndexedDB, as escolhas de
  // texto/cores/habilidades continuam recuperáveis. Os arquivos ficam no IDB.
  try {
    sessionStorage.setItem(META_KEY, JSON.stringify(withoutFiles(normalized)));
  } catch {
    // Não bloqueia o onboarding por quota/storage privado.
  }

  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(normalized, DRAFT_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('indexeddb_write_failed'));
      tx.onabort = () => reject(tx.error || new Error('indexeddb_write_aborted'));
    });
    db.close();
  } catch {
    // sessionStorage acima continua sendo o fallback.
  }
}

export async function loadFuncionarIAOnboardingDraft(): Promise<FuncionarIAOnboardingDraft | null> {
  if (typeof window === 'undefined') return null;

  try {
    const db = await openDatabase();
    const value = await new Promise<FuncionarIAOnboardingDraft | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).get(DRAFT_KEY);
      request.onsuccess = () => resolve((request.result as FuncionarIAOnboardingDraft | undefined) || null);
      request.onerror = () => reject(request.error || new Error('indexeddb_read_failed'));
    });
    db.close();

    if (value) {
      return {
        ...value,
        version: 1,
        step: normalizeStep(value.step),
        selected: Array.from(new Set(value.selected || [])),
        counter: value.counter || 'nenhum',
        voiceId: value.voiceId || 'clara',
        logoPlacement: value.logoPlacement || 'cracha',
        uniformLogoFile: restoreFile(value.uniformLogoFile, 'funcionaria-uniform-logo.png', 'image/png'),
        backgroundFile: restoreFile(value.backgroundFile, 'funcionaria-background.webp', 'image/webp'),
      };
    }
  } catch {
    // Cai para o metadata fallback.
  }

  try {
    const raw = sessionStorage.getItem(META_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as DraftMetadata;
    return {
      ...value,
      version: 1,
      step: normalizeStep(value.step),
      selected: Array.from(new Set(value.selected || [])),
      counter: value.counter || 'nenhum',
      voiceId: value.voiceId || 'clara',
      uniformLogoFile: null,
      backgroundFile: null,
    };
  } catch {
    return null;
  }
}

export async function clearFuncionarIAOnboardingDraft() {
  if (typeof window === 'undefined') return;
  try { sessionStorage.removeItem(META_KEY); } catch {}

  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(DRAFT_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('indexeddb_delete_failed'));
    });
    db.close();
  } catch {
    // Nada a fazer: o rascunho já não interfere no fluxo principal.
  }
}

export async function completeFuncionarIAOnboardingDraft(
  supabase: any,
  draft: FuncionarIAOnboardingDraft,
  existingCompanyId?: string | null,
): Promise<{ companyId: string; companyName: string }> {
  let companyId = existingCompanyId || null;

  if (!companyId) {
    // Idempotência do pós-cadastro: se a empresa foi criada e um upload falhou
    // depois, a próxima tentativa reutiliza a empresa do próprio usuário em vez
    // de acusar o slug como ocupado.
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id || null;
    if (userId) {
      const { data: existing } = await supabase
        .from('companies')
        .select('id')
        .eq('slug', draft.companySlug.trim())
        .eq('user_id', userId)
        .maybeSingle();
      if (existing?.id) companyId = String(existing.id);
    }
  }

  if (!companyId) {
    const { data: createdId, error: createError } = await supabase.rpc('funcionaria_create_company', {
      p_name: draft.companyName.trim(),
      p_slug: draft.companySlug.trim(),
      p_business_type: draft.businessType,
    });

    if (createError) {
      if (String(createError.message || '').includes('slug_unavailable')) {
        throw new Error('Este subdomínio já está em uso. Volte ao onboarding e escolha outro.');
      }
      throw createError;
    }
    companyId = String(createdId);
  }

  if (!companyId) throw new Error('Não foi possível criar a empresa.');

  const uniformFile = restoreFile(
    draft.uniformLogoFile,
    'funcionaria-uniform-logo.png',
    'image/png',
  );
  const backgroundFile = restoreFile(
    draft.backgroundFile,
    'funcionaria-background.webp',
    'image/webp',
  );

  const savedUniformLogoUrl = uniformFile
    ? await uploadFuncionarIAAsset(supabase, companyId, 'uniform-logo', uniformFile)
    : (draft.uniformLogoUrl || null);

  const savedBackgroundUrl = backgroundFile
    ? await uploadFuncionarIAAsset(supabase, companyId, 'background', backgroundFile)
    : (draft.backgroundPreset === 'custom' ? (draft.backgroundUrl || null) : null);

  const { error: saveError } = await supabase.rpc('funcionaria_save_onboarding', {
    p_company_id: companyId,
    p_workplace_mode: draft.workplace,
    p_business_type: draft.businessType,
    p_selected_skill_keys: draft.selected,
    p_primary_color: draft.primaryColor,
    p_secondary_color: draft.secondaryColor,
    p_shirt_color: draft.shirtColor,
    p_shirt_detail_color: draft.shirtDetailColor,
    p_background_preset: draft.backgroundPreset,
    p_ai_enabled: draft.aiEnabled,
    p_voice_input_enabled: draft.voiceEnabled,
    p_equipment_mode: draft.equipmentMode,
    p_terminal_rental_requested: draft.equipmentMode === 'rental',
    p_whatsapp_mode: draft.whatsappMode,
    p_complete: true,
  });
  if (saveError) throw saveError;

  const { error: visualError } = await supabase.rpc('funcionaria_save_visual', {
    p_company_id: companyId,
    p_primary_color: draft.primaryColor,
    p_secondary_color: draft.secondaryColor,
    p_shirt_color: draft.shirtColor,
    p_shirt_detail_color: draft.shirtDetailColor,
    p_uniform_logo_url: savedUniformLogoUrl,
    p_background_preset: draft.backgroundPreset === 'custom' ? 'custom' : draft.backgroundPreset,
    p_background_url: savedBackgroundUrl,
    p_counter: draft.counter || 'nenhum',
    p_voice_id: draft.voiceId || 'clara',
    p_logo_placement: draft.logoPlacement || 'cracha',
  });
  if (visualError) throw visualError;

  return { companyId, companyName: draft.companyName.trim() };
}
