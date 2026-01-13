import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// GET - Listar FAQs da empresa
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID é obrigatório' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    const { data: faqs, error } = await supabase
      .from('faq_entries')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ faqs });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Erro ao buscar FAQs', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Criar nova FAQ
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, question, answer, variations, category } = body;

    if (!companyId || !question || !answer) {
      return NextResponse.json(
        { error: 'Company ID, pergunta e resposta são obrigatórios' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    const { data: faq, error } = await supabase
      .from('faq_entries')
      .insert({
        company_id: companyId,
        question,
        answer,
        variations: variations || [],
        category: category || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ faq }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Erro ao criar FAQ', details: error.message },
      { status: 500 }
    );
  }
}

// PUT - Atualizar FAQ
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, question, answer, variations, category, is_active } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'FAQ ID é obrigatório' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    const updateData: any = {};
    if (question !== undefined) updateData.question = question;
    if (answer !== undefined) updateData.answer = answer;
    if (variations !== undefined) updateData.variations = variations;
    if (category !== undefined) updateData.category = category;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: faq, error } = await supabase
      .from('faq_entries')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ faq });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Erro ao atualizar FAQ', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Deletar FAQ
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'FAQ ID é obrigatório' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    const { error } = await supabase
      .from('faq_entries')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Erro ao deletar FAQ', details: error.message },
      { status: 500 }
    );
  }
}
