import type { User } from '@supabase/supabase-js';

import { createAdminClient } from '@/lib/supabase-admin';
import { createClient } from '@/lib/supabase-server';

export type PlatformAdminAccessReason =
  | 'unauthenticated'
  | 'google_required'
  | 'not_allowed'
  | 'configuration_error';

export type PlatformAdminAccess =
  | {
      ok: true;
      user: User;
      admin: {
        user_id: string;
        email: string;
        is_active: boolean;
      };
    }
  | {
      ok: false;
      reason: PlatformAdminAccessReason;
      user: User | null;
    };

function normalizeEmail(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

/**
 * O Admin é deliberadamente mais restrito que o restante da plataforma:
 * a conta precisa possuir SOMENTE identidade Google.
 *
 * Isso impede que uma conta administrativa que futuramente ganhe uma
 * identidade email/password vinculada consiga entrar no Admin por senha.
 */
function hasGoogleOnlyIdentity(user: User): boolean {
  const identities = user.identities;

  if (Array.isArray(identities) && identities.length > 0) {
    return identities.every((identity) => identity.provider === 'google');
  }

  const providers = user.app_metadata?.providers;
  if (Array.isArray(providers) && providers.length > 0) {
    return providers.every((provider) => provider === 'google');
  }

  return user.app_metadata?.provider === 'google';
}

export async function checkPlatformAdminUser(
  user: User,
): Promise<PlatformAdminAccess> {
  if (!hasGoogleOnlyIdentity(user)) {
    return {
      ok: false,
      reason: 'google_required',
      user,
    };
  }

  try {
    const admin = createAdminClient();

    const { data, error } = await admin
      .from('platform_admins')
      .select('user_id, email, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error(
        '[platform-admin] Falha ao consultar platform_admins:',
        error,
      );

      return {
        ok: false,
        reason: 'configuration_error',
        user,
      };
    }

    if (!data) {
      return {
        ok: false,
        reason: 'not_allowed',
        user,
      };
    }

    // O SQL final sempre grava o e-mail administrativo. Se a linha estiver
    // incompleta, tratamos como erro de configuração em vez de afrouxar a
    // autorização silenciosamente.
    const allowedEmail = normalizeEmail(data.email);
    if (!allowedEmail) {
      console.error(
        '[platform-admin] platform_admins sem e-mail configurado para:',
        data.user_id,
      );

      return {
        ok: false,
        reason: 'configuration_error',
        user,
      };
    }

    // A autorização exige simultaneamente o user_id e o e-mail cadastrado.
    // Assim o Admin permanece vinculado à conta Google esperada.
    if (normalizeEmail(user.email) !== allowedEmail) {
      return {
        ok: false,
        reason: 'not_allowed',
        user,
      };
    }

    return {
      ok: true,
      user,
      admin: {
        user_id: data.user_id,
        email: data.email,
        is_active: data.is_active === true,
      },
    };
  } catch (error) {
    console.error('[platform-admin] Erro inesperado na autorização:', error);

    return {
      ok: false,
      reason: 'configuration_error',
      user,
    };
  }
}

export async function getPlatformAdminAccess(): Promise<PlatformAdminAccess> {
  const supabase = createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // getUser() valida a sessão com o Auth server; não confiamos apenas no
  // conteúdo do cookie para autorizar acesso administrativo.
  if (error || !user) {
    return {
      ok: false,
      reason: 'unauthenticated',
      user: null,
    };
  }

  return checkPlatformAdminUser(user);
}

export function platformAdminHttpStatus(
  reason: PlatformAdminAccessReason,
): number {
  switch (reason) {
    case 'unauthenticated':
      return 401;
    case 'configuration_error':
      return 503;
    case 'google_required':
    case 'not_allowed':
    default:
      return 403;
  }
}
