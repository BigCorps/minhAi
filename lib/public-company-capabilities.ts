export type PublicPaymentCompanyConfig = {
  mp_access_token: string | null;
  mp_terminal_id: string | null;
  receiving_pix_key: string | null;
  infinitepay_handle: string | null;
};

export type PublicWifiCompanyConfig = {
  wifi_network_name: string;
  wifi_network_password: string;
  name: string;
};

export type PublicFiscalCompanyConfig = {
  brasilnfe_token: string | null;
  nfe_ativo: boolean;
  nfe_plano: string | null;
};

export async function getPublicPaymentCompanyConfig(
  companyId: string,
): Promise<PublicPaymentCompanyConfig> {
  try {
    const response = await fetch(
      `/api/public/payment-capabilities?company_id=${encodeURIComponent(companyId)}`,
      { cache: 'no-store' },
    );

    if (!response.ok) {
      return {
        mp_access_token: null,
        mp_terminal_id: null,
        receiving_pix_key: null,
        infinitepay_handle: null,
      };
    }

    const data = await response.json().catch(() => ({}));
    return {
      // Sentinelas de configuração: nunca são os segredos reais.
      mp_access_token: data?.mp_point_configured ? '__configured__' : null,
      mp_terminal_id: data?.mp_point_configured ? '__configured__' : null,
      receiving_pix_key: data?.pix_configured ? '__configured__' : null,
      infinitepay_handle: data?.infinitepay_configured ? '__configured__' : null,
    };
  } catch {
    return {
      mp_access_token: null,
      mp_terminal_id: null,
      receiving_pix_key: null,
      infinitepay_handle: null,
    };
  }
}

export async function getPublicWifiConfig(
  companyId: string,
): Promise<PublicWifiCompanyConfig | null> {
  try {
    const response = await fetch(
      `/api/public/wifi?company_id=${encodeURIComponent(companyId)}`,
      { cache: 'no-store' },
    );
    if (!response.ok) return null;

    const data = await response.json().catch(() => ({}));
    if (!data?.wifi_network_name) return null;

    return {
      wifi_network_name: String(data.wifi_network_name),
      wifi_network_password: String(data.wifi_network_password || ''),
      name: String(data.name || ''),
    };
  } catch {
    return null;
  }
}

export async function getPublicFiscalCompanyConfig(
  companyId: string,
): Promise<PublicFiscalCompanyConfig> {
  try {
    const response = await fetch(
      `/api/public/fiscal-capabilities?company_id=${encodeURIComponent(companyId)}`,
      { cache: 'no-store' },
    );

    if (!response.ok) {
      return {
        brasilnfe_token: null,
        nfe_ativo: false,
        nfe_plano: null,
      };
    }

    const data = await response.json().catch(() => ({}));
    return {
      // Sentinela apenas; o token Brasil NFE nunca é enviado ao navegador.
      brasilnfe_token: data?.configured ? '__configured__' : null,
      nfe_ativo: data?.active === true,
      nfe_plano: data?.plan ? String(data.plan) : null,
    };
  } catch {
    return {
      brasilnfe_token: null,
      nfe_ativo: false,
      nfe_plano: null,
    };
  }
}
