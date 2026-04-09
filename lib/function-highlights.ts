import { createClient } from './supabase-browser';

interface AssistantFunctionHighlight {
  function_name: string;
  short_description: string;
}

export async function getRandomActiveFunctionHighlight(): Promise<AssistantFunctionHighlight | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('assistant_functions')
    .select('function_name, short_description')
    .eq('is_active', true)
    .not('short_description', 'is', null);

  if (error) {
    console.error('Erro ao buscar função aleatória:', error);
    return null;
  }

  if (!data || data.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * data.length);
  return data[randomIndex];
}
