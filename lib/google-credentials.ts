// lib/google-credentials.ts

/**
 * Gerencia credenciais Google Cloud
 * Funciona em desenvolvimento (arquivo) e produção (JSON env var)
 */

export interface GoogleCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

/**
 * Retorna credenciais Google Cloud
 * - Local: usa GOOGLE_APPLICATION_CREDENTIALS (arquivo)
 * - Vercel: usa GOOGLE_CREDENTIALS_JSON (variável)
 */
export function getGoogleCredentials(): GoogleCredentials | undefined {
  // Vercel/Produção: JSON direto
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    try {
      return JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    } catch (e) {
      console.error('❌ Erro ao parsear GOOGLE_CREDENTIALS_JSON:', e);
      throw new Error('GOOGLE_CREDENTIALS_JSON inválido');
    }
  }
  
  // Local: arquivo (SDK lê automaticamente)
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // Retornar undefined para SDK usar arquivo
    return undefined;
  }
  
  throw new Error(
    'Google credentials não configuradas. ' +
    'Configure GOOGLE_APPLICATION_CREDENTIALS (local) ou ' +
    'GOOGLE_CREDENTIALS_JSON (Vercel)'
  );
}

/**
 * Retorna Project ID do Google Cloud
 */
export function getGoogleProjectId(): string {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  
  if (!projectId) {
    throw new Error('GOOGLE_CLOUD_PROJECT_ID não configurado');
  }
  
  return projectId;
}

/**
 * Retorna Location do Google Cloud
 */
export function getGoogleLocation(): string {
  return process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
}

/**
 * Verifica se está em ambiente Vercel
 */
export function isVercel(): boolean {
  return !!process.env.GOOGLE_CREDENTIALS_JSON;
}

/**
 * Verifica se credenciais estão configuradas
 */
export function hasGoogleCredentials(): boolean {
  return !!(
    process.env.GOOGLE_CREDENTIALS_JSON ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS
  );
}