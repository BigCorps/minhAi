// app/api/setup/apply/route.ts
// Ativa/desativa funções e salva dados da empresa após o setup conversacional

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const maxDuration = 30;

interface FunctionToApply {
  function_key: string;
  enabled: boolean;
}

interface CompanyData {
  name?: string;
  whatsapp_number?: string;
  instagram_username?: string;
  business_address?: string;
  business_hours?: string;
  brand_description?: string;
  system_prompt?: string;
  greeting_message?: string;
  wake_word?: string;
  website?: string;
  email_contato?: string;
  facebook?: string;
  linkedin?: string;
  tiktok?: string;
  twitter?: string;
  telefone_fixo?: string;
  receiving_pix_key?: string;
  receiving_pix_key_type?: string;
}

export async function POST(request: NextRequest) {
  try {
    const {
      companyId,
      functions,
      companyData,
    } = await request.json();

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId é obrigatório' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    const results: {
      functions: { success: number; failed: string[] };
      company: boolean;
    } = {
      functions: { success: 0, failed: [] },
      company: false,
    };

    // ── 1. Ativar / desativar funções ────────────────────────────────
    // Usa upsert para não quebrar se initialize_company_functions já inseriu
    // os registros padrão — apenas atualiza o is_enabled sem erro de duplicata
    if (functions && functions.length > 0) {
      for (const item of functions as FunctionToApply[]) {
        try {
          const { error } = await supabase
            .from('company_function_settings')
            .upsert(
              {
                company_id: companyId,
                function_key: item.function_key,
                is_enabled: item.enabled,
                updated_at: new Date().toISOString(),
                ...(item.enabled
                  ? { enabled_at: new Date().toISOString() }
                  : { disabled_at: new Date().toISOString() }),
              },
              { onConflict: 'company_id,function_key' }
            );

          if (error) {
            console.error(`Erro ao aplicar ${item.function_key}:`, error);
            results.functions.failed.push(item.function_key);
          } else {
            results.functions.success++;
          }
        } catch (err) {
          console.error(`Erro inesperado em ${item.function_key}:`, err);
          results.functions.failed.push(item.function_key);
        }
      }
    }

    // ── 2. Salvar dados da empresa ───────────────────────────────────
    if (companyData && Object.keys(companyData).length > 0) {
      const dataToSave: Record<string, any> = {};
      for (const [key, value] of Object.entries(companyData as CompanyData)) {
        if (value !== undefined && value !== null && value !== '') {
          dataToSave[key] = value;
        }
      }

      if (Object.keys(dataToSave).length > 0) {
        dataToSave.updated_at = new Date().toISOString();

        const { error } = await supabase
          .from('companies')
          .update(dataToSave)
          .eq('id', companyId);

        if (error) {
          console.error('Erro ao salvar dados da empresa:', error);
          results.company = false;
        } else {
          results.company = true;
        }
      }
    }

    // ── 3. Retornar resultado ────────────────────────────────────────
    const success = results.functions.failed.length === 0;

    return NextResponse.json({
      success,
      results,
      message: success
        ? `${results.functions.success} função(ões) configurada(s) com sucesso!`
        : `${results.functions.success} função(ões) configurada(s). Falha em: ${results.functions.failed.join(', ')}`,
    });

  } catch (error: any) {
    console.error('Erro no apply:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
