import { getUser } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { ThemeProvider } from '@/contexts/ThemeContext'; // Certifique-se que o caminho está correto

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  
  if (!user) {
    redirect('/login');
  }

  return (
    <ThemeProvider>
      {children}
    </ThemeProvider>
  );
}