import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { AssistantProvider } from '@/contexts/AssistantContext';
import RegisterSW from '@/components/RegisterSW';
import './globals.css';
import 'react-image-crop/dist/ReactCrop.css';

export const metadata: Metadata = {
  title: 'minhAi - Uma IA pra chamar de sua!',
  description: 'Funcionários de IA',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <AssistantProvider>
            {children}
          </AssistantProvider>
        </ThemeProvider>
        <RegisterSW />
      </body>
    </html>
  );
}
