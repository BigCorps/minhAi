'use client';

import { useParams } from 'next/navigation';
import IngredientesClient from '@/components/dashboard/producao/IngredientesClient';
import { useTheme } from '@/contexts/ThemeContext';

export default function IngredientesPage() {
  const params = useParams();
  const { theme } = useTheme();
  const companyId = params.companyId as string;

  return <IngredientesClient companyId={companyId} theme={theme} />;
}
