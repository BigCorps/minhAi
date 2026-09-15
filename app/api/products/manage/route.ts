import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { cleanText, cleanUuid, resolveCompanyActor } from '@/lib/orders-server';

const OPERATIONAL_PROFILE_TYPES = [
  'frentista',
  'atendente',
  'caixa',
  'gerente',
  'colaborador',
  'administrador',
];

const MAX_BULK = 100;

type Json = Record<string, unknown>;

type SanitizedProduct = {
  ingrediente_id?: string | null;
  ficha_id?: string | null;
  nome?: string;
  descricao?: string | null;
  categoria?: string | null;
  marca?: string | null;
  imagem_url?: string | null;
  ean?: string | null;
  preco_custo?: number;
  preco_venda?: number;
  unidade?: string;
  estoque_atual?: number;
  estoque_minimo?: number;
  controla_estoque?: boolean;
  is_active?: boolean;
  is_favorito?: boolean;
  display_order?: number;
  ml_category_id?: string | null;
  ml_listing_type?: string | null;
};

function optionalText(value: unknown, max: number): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const text = cleanText(value, max);
  return text || null;
}

function finiteNumber(value: unknown, field: string, min = 0): number | undefined {
  if (value === undefined) return undefined;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < min) throw new Error(`invalid_${field}`);
  return n;
}

function integerNumber(value: unknown, field: string, min = 0): number | undefined {
  const n = finiteNumber(value, field, min);
  if (n === undefined) return undefined;
  if (!Number.isInteger(n)) throw new Error(`invalid_${field}`);
  return n;
}

function optionalBoolean(value: unknown, field: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') throw new Error(`invalid_${field}`);
  return value;
}

function sanitizeProduct(input: unknown, mode: 'create' | 'update'): SanitizedProduct {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('invalid_product');
  const raw = input as Json;
  const out: SanitizedProduct = {};

  if (raw.ingrediente_id !== undefined) {
    if (raw.ingrediente_id === null || raw.ingrediente_id === '') out.ingrediente_id = null;
    else {
      const id = cleanUuid(raw.ingrediente_id);
      if (!id) throw new Error('invalid_ingrediente_id');
      out.ingrediente_id = id;
    }
  }
  if (raw.ficha_id !== undefined) {
    if (raw.ficha_id === null || raw.ficha_id === '') out.ficha_id = null;
    else {
      const id = cleanUuid(raw.ficha_id);
      if (!id) throw new Error('invalid_ficha_id');
      out.ficha_id = id;
    }
  }

  if (raw.nome !== undefined) {
    const nome = cleanText(raw.nome, 200);
    if (!nome) throw new Error('invalid_nome');
    out.nome = nome;
  }
  out.descricao = optionalText(raw.descricao, 2000);
  out.categoria = optionalText(raw.categoria, 160);
  out.marca = optionalText(raw.marca, 160);
  out.imagem_url = optionalText(raw.imagem_url, 2048);
  out.ean = optionalText(raw.ean, 64);

  out.preco_custo = finiteNumber(raw.preco_custo, 'preco_custo', 0);
  if (raw.preco_venda !== undefined) {
    const preco = finiteNumber(raw.preco_venda, 'preco_venda', 0);
    if (preco === undefined || preco <= 0) throw new Error('invalid_preco_venda');
    out.preco_venda = preco;
  }

  if (raw.unidade !== undefined) {
    const unidade = cleanText(raw.unidade, 32);
    if (!unidade) throw new Error('invalid_unidade');
    out.unidade = unidade;
  }

  out.estoque_atual = finiteNumber(raw.estoque_atual, 'estoque_atual', 0);
  out.estoque_minimo = finiteNumber(raw.estoque_minimo, 'estoque_minimo', 0);
  out.controla_estoque = optionalBoolean(raw.controla_estoque, 'controla_estoque');
  out.is_active = optionalBoolean(raw.is_active, 'is_active');
  out.is_favorito = optionalBoolean(raw.is_favorito, 'is_favorito');
  out.display_order = integerNumber(raw.display_order, 'display_order', 0);
  out.ml_category_id = optionalText(raw.ml_category_id, 128);
  out.ml_listing_type = optionalText(raw.ml_listing_type, 64);

  // Remove chaves undefined para impedir que o cliente zere campos sem querer.
  for (const key of Object.keys(out) as (keyof SanitizedProduct)[]) {
    if (out[key] === undefined) delete out[key];
  }

  if (mode === 'create') {
    if (!out.nome) throw new Error('invalid_nome');
    if (out.preco_venda === undefined || out.preco_venda <= 0) throw new Error('invalid_preco_venda');
    if (!out.unidade) out.unidade = 'un';
    if (out.preco_custo === undefined) out.preco_custo = 0;
    if (out.estoque_atual === undefined) out.estoque_atual = 0;
    if (out.estoque_minimo === undefined) out.estoque_minimo = 0;
    if (out.controla_estoque === undefined) out.controla_estoque = false;
    if (out.is_active === undefined) out.is_active = true;
    if (out.is_favorito === undefined) out.is_favorito = false;
    if (out.display_order === undefined) out.display_order = 0;
  } else if (Object.keys(out).length === 0) {
    throw new Error('empty_product_patch');
  }

  return out;
}

async function validateProductReferences(
  admin: ReturnType<typeof createAdminClient>,
  companyId: string,
  products: SanitizedProduct[],
) {
  const ingredientIds = [...new Set(products.map((p) => p.ingrediente_id).filter((v): v is string => !!v))];
  if (ingredientIds.length) {
    const { data, error } = await admin
      .from('producao_ingredientes')
      .select('id')
      .eq('company_id', companyId)
      .in('id', ingredientIds);
    if (error) throw new Error(error.message || 'ingredient_reference_lookup_failed');
    if ((data?.length ?? 0) !== ingredientIds.length) throw new Error('invalid_ingrediente_scope');
  }

  const fichaIds = [...new Set(products.map((p) => p.ficha_id).filter((v): v is string => !!v))];
  if (fichaIds.length) {
    const { data, error } = await admin
      .from('producao_fichas')
      .select('id')
      .eq('company_id', companyId)
      .in('id', fichaIds);
    if (error) throw new Error(error.message || 'ficha_reference_lookup_failed');
    if ((data?.length ?? 0) !== fichaIds.length) throw new Error('invalid_ficha_scope');
  }
}

async function authorize(
  request: NextRequest,
  body: Json,
  companyId: string,
) {
  return resolveCompanyActor(request, body, companyId, OPERATIONAL_PROFILE_TYPES);
}

export async function POST(request: NextRequest) {
  let body: Json;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const action = cleanText(body.action, 32);
  const admin = createAdminClient();

  try {
    if (action === 'create') {
      const companyId = cleanUuid(body.company_id);
      if (!companyId) return NextResponse.json({ error: 'invalid_company_id' }, { status: 400 });
      const auth = await authorize(request, body, companyId);
      if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.error === 'unauthorized' ? 401 : 403 });

      const product = sanitizeProduct(body.product, 'create');
      await validateProductReferences(admin, companyId, [product]);
      const { data, error } = await admin
        .from('produtos_venda')
        .insert({ company_id: companyId, ...product })
        .select('*')
        .single();
      if (error || !data) throw new Error(error?.message || 'product_create_failed');
      return NextResponse.json({ product: data });
    }

    if (action === 'bulk_create') {
      const companyId = cleanUuid(body.company_id);
      if (!companyId) return NextResponse.json({ error: 'invalid_company_id' }, { status: 400 });
      const auth = await authorize(request, body, companyId);
      if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.error === 'unauthorized' ? 401 : 403 });
      if (!Array.isArray(body.products) || body.products.length < 1 || body.products.length > MAX_BULK) {
        return NextResponse.json({ error: 'invalid_products_batch' }, { status: 400 });
      }

      const products = body.products.map((item) => sanitizeProduct(item, 'create'));
      await validateProductReferences(admin, companyId, products);
      const rows = products.map((product) => ({ company_id: companyId, ...product }));
      const { data, error } = await admin.from('produtos_venda').insert(rows).select('*');
      if (error) throw new Error(error.message || 'products_bulk_create_failed');
      return NextResponse.json({ products: data ?? [], count: data?.length ?? 0 });
    }

    if (action === 'update' || action === 'delete') {
      const productId = cleanUuid(body.product_id);
      if (!productId) return NextResponse.json({ error: 'invalid_product_id' }, { status: 400 });

      const { data: existing, error: readError } = await admin
        .from('produtos_venda')
        .select('id,company_id')
        .eq('id', productId)
        .maybeSingle();
      if (readError) throw new Error(readError.message);
      if (!existing) return NextResponse.json({ error: 'product_not_found' }, { status: 404 });

      const requestedCompanyId = cleanUuid(body.company_id);
      if (requestedCompanyId && requestedCompanyId !== existing.company_id) {
        return NextResponse.json({ error: 'company_mismatch' }, { status: 403 });
      }

      const auth = await authorize(request, body, existing.company_id);
      if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.error === 'unauthorized' ? 401 : 403 });

      if (action === 'delete') {
        const { error } = await admin
          .from('produtos_venda')
          .delete()
          .eq('id', productId)
          .eq('company_id', existing.company_id);
        if (error) throw new Error(error.message || 'product_delete_failed');
        return NextResponse.json({ success: true });
      }

      const patch = sanitizeProduct(body.patch, 'update');
      await validateProductReferences(admin, existing.company_id, [patch]);
      const { data, error } = await admin
        .from('produtos_venda')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', productId)
        .eq('company_id', existing.company_id)
        .select('*')
        .single();
      if (error || !data) throw new Error(error?.message || 'product_update_failed');
      return NextResponse.json({ product: data });
    }

    return NextResponse.json({ error: 'invalid_action' }, { status: 400 });
  } catch (error: any) {
    console.error('[products/manage]', error?.message || error);
    const message = typeof error?.message === 'string' ? error.message : 'product_mutation_failed';
    const badInput = /^(invalid_|empty_)/.test(message);
    return NextResponse.json({ error: message }, { status: badInput ? 400 : 500 });
  }
}
