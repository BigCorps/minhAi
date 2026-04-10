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
        {/* maximum-scale=1 evita zoom acidental que desorganiza o layout   */}
        {/* viewport-fit=cover cobre o notch em iPhones                      */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
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
