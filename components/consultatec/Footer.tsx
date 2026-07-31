// components/consultatec/Footer.tsx
// Mesmo padrão do Footer do Pix Wiki — usar em toda página do ConsultaTec
// (página principal, login, dashboard).

const cor = {
  tintaMuted: '#6B6350',
  destaque: '#2F4F3A',
};

export default function Footer() {
  return (
    <footer className="mt-8 text-center flex flex-col gap-1 text-xs" style={{ color: cor.tintaMuted }}>
      <p>
        <a href="https://consulta.tec.br" className="transition-opacity hover:opacity-70" style={{ color: cor.tintaMuted }}>
          ConsultaTec
        </a>
        {' '}|{' '}
        Desenvolvido por{' '}
        <a href="https://bigcorps.com.br" className="transition-opacity hover:opacity-70" style={{ color: cor.tintaMuted }}>
          BigCorps
        </a>
        {' '}| Tecnologia{' '}
        <a href="https://minhai.app" className="transition-opacity hover:opacity-70 font-semibold" style={{ color: cor.destaque }}>
          minhAi
        </a>
      </p>
    </footer>
  );
}
