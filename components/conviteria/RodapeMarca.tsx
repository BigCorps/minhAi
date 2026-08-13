// components/conviteria/RodapeMarca.tsx
//
// Assinatura de rodape, no mesmo formato das outras marcas minhAi. Alem de
// credito, cumpre funcao pratica: e o que sinaliza ao cliente que a ConviteIA
// nao e um site solto, e sim parte de uma plataforma com empresa por tras.

export default function RodapeMarca({ claro = false }: { claro?: boolean }) {
  const cor = claro ? '#fff5f8' : '#7c5560';
  const destaque = claro ? '#ffffff' : '#a04a63';

  return (
    <footer className="w-full py-6 px-4 text-center text-xs" style={{ color: cor }}>
      <p>
        <span style={{ color: destaque, fontWeight: 600 }}>ConviteIA</span>
        {' | '}
        Desenvolvido por{' '}
        <a
          href="https://www.bigcorps.com.br"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: destaque, fontWeight: 600 }}
        >
          BigCorps
        </a>
        {' | '}
        Tecnologia{' '}
        <a
          href="https://www.minhai.app"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: destaque, fontWeight: 600 }}
        >
          minhAi
        </a>
      </p>
    </footer>
  );
}
