'use client';

import { useParams } from 'next/navigation';
import FuncionarIAPublicShell from '@/components/funcionaria/public/FuncionarIAPublicShell';

export default function FuncionarIAPublicPage() {
  const params = useParams<{ slug: string }>();
  const slug = String(params.slug || '');
  return <FuncionarIAPublicShell slug={slug} />;
}
