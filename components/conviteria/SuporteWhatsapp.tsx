'use client';

// components/conviteria/SuporteWhatsapp.tsx
//
// Mesmo padrao do ArteFinal e da min.IA: numero unico do suporte minhAi com
// texto pre-preenchido por produto. O texto importa — sem ele o atendente
// recebe "oi" e gasta duas mensagens descobrindo de qual app a pessoa fala.

import { MessageCircle } from 'lucide-react';

const NUMERO = '5511926828418';

export default function SuporteWhatsapp({
  assunto = 'Preciso de suporte na ConviteIA',
  variante = 'botao',
}: {
  assunto?: string;
  variante?: 'botao' | 'link';
}) {
  const href = `https://api.whatsapp.com/send/?phone=${NUMERO}&text=${encodeURIComponent(
    assunto
  )}&type=phone_number&app_absent=0`;

  if (variante === 'link') {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: '#a04a63', textDecoration: 'underline', fontWeight: 600 }}
      >
        falar com o suporte
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold border"
      style={{ borderColor: '#c0607855', color: '#a04a63', backgroundColor: '#ffffff' }}
    >
      <MessageCircle className="w-4 h-4" />
      Suporte
    </a>
  );
}
