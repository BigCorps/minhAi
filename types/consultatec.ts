export type ConsultaDocumentoTipo = 'cpf' | 'cnpj';

export type ConsultaAction =
  | 'dados_cpf'
  | 'dados_cnpj'
  | 'restricoes_cpf'
  | 'restricoes_cnpj'
  | 'consultar_protestos'
  | 'completa_cpf'
  | 'completa_cnpj';

export interface ConsultaOpcao {
  acao: ConsultaAction;
  titulo: string;
  descricao: string;
  precoCents: number;
  tipo: ConsultaDocumentoTipo;
}

export interface ResultadoFormatado {
  label: string;
  value: string;
}

export interface ConsultaTecApiResponse {
  success: boolean;
  error?: string;
  requires_payment?: boolean;
  amount_cents?: number;
  amount_brl?: string;
  current_balance_cents?: number;
  schema_version?: string;
  payment_method?: 'pix' | 'balance';
  result?: any;
  resultado_formatado?: ResultadoFormatado[] | [string, string][];
}

export interface ConsultaTecPixResponse {
  success: boolean;
  error?: string;
  transaction_id?: string;
  amount_cents?: number;
  amount_brl?: string;
  qr_code_url?: string;
  pix_code?: string;
  expires_at?: string;
}

export interface ConsultaTecConfirmacaoResponse {
  success: boolean;
  error?: string;
  status?: string;
  bank_status?: string;
  confirmed_at?: string;
  already_confirmed?: boolean;
}
