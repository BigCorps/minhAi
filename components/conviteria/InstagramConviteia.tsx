// components/conviteria/InstagramConviteia.tsx
//
// Botão do Instagram oficial da ConviteIA, no mesmo estilo do botão de Suporte.
// Ícone em SVG próprio (o lucide deixou de manter ícones de marcas).

const PERFIL = 'appconviteia';

export default function InstagramConviteia() {
  return (
    <a
      href={`https://www.instagram.com/${PERFIL}/`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Instagram da ConviteIA (@appconviteia)"
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold border"
      style={{ borderColor: '#c0607855', color: '#a04a63', backgroundColor: '#ffffff' }}
    >
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
      @{PERFIL}
    </a>
  );
}
