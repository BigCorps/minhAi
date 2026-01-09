'use client';

interface CopyLinkButtonProps {
  slug: string;
}

export function CopyLinkButton({ slug }: CopyLinkButtonProps) {
  function handleCopy() {
    const url = `https://itend.com.br/oi/${slug}`;
    navigator.clipboard.writeText(url);
    alert('Link copiado!');
  }

  return (
    <button
      onClick={handleCopy}
      className="w-full text-xs text-gray-500 hover:text-gray-700 transition"
    >
      📋 Copiar Link Público
    </button>
  );
}
