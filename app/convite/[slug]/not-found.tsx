import Image from 'next/image';

export default function ConviteNaoEncontrado() {
  return (
    <main className="cv-nao-encontrado">
      <div className="cv-nao-encontrado-fundo" aria-hidden="true" />

      <section className="cv-nao-encontrado-card">
        <Image
          src="/brands/convite/icone-512.png"
          alt="Convite IA"
          width={104}
          height={104}
          className="cv-nao-encontrado-logo"
          priority
        />

        <span className="cv-nao-encontrado-selo">ConviteIA</span>

        <h1>Este convite não foi encontrado</h1>

        <p>
          O endereço pode estar incorreto, o convite ainda não foi publicado
          ou este subdomínio ainda está disponível.
        </p>

        <p className="cv-nao-encontrado-chamada">
          Que tal criar o seu convite digital agora?
        </p>

        <a
          className="cv-nao-encontrado-principal"
          href="https://conviteia.com"
        >
          Criar meu convite
          <span aria-hidden="true">→</span>
        </a>

        <a
          className="cv-nao-encontrado-secundario"
          href="https://conviteia.com/convite/entrar"
        >
          Já tenho uma conta
        </a>
      </section>

      <style>{`
        .cv-nao-encontrado {
          position: relative;
          min-height: 100svh;
          display: grid;
          place-items: center;
          overflow: hidden;
          padding: 24px;
          background: #fdf0f3;
          color: #40232c;
          font-family: Arial, Helvetica, sans-serif;
        }

        .cv-nao-encontrado-fundo {
          position: fixed;
          inset: 0;
          pointer-events: none;
          opacity: .48;
          background-image:
            radial-gradient(circle at 10px 10px, rgba(192, 96, 120, .18) 1.6px, transparent 1.8px),
            radial-gradient(circle at 30px 30px, rgba(192, 96, 120, .12) 1.6px, transparent 1.8px);
          background-size: 40px 40px;
          transform: rotate(-5deg) scale(1.08);
        }

        .cv-nao-encontrado-card {
          position: relative;
          z-index: 1;
          width: min(100%, 520px);
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: clamp(28px, 6vw, 46px);
          border: 1px solid rgba(192, 96, 120, .20);
          border-radius: 28px;
          background: rgba(255, 255, 255, .94);
          box-shadow: 0 22px 60px rgba(74, 41, 51, .12);
          text-align: center;
          backdrop-filter: blur(8px);
        }

        .cv-nao-encontrado-logo {
          width: 92px;
          height: 92px;
          object-fit: contain;
          margin-bottom: 8px;
        }

        .cv-nao-encontrado-selo {
          display: inline-flex;
          margin-bottom: 16px;
          padding: 6px 11px;
          border-radius: 999px;
          background: #fdf0f3;
          color: #a04a63;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: .02em;
        }

        .cv-nao-encontrado-card h1 {
          margin: 0;
          color: #40232c;
          font-size: clamp(28px, 6vw, 38px);
          line-height: 1.05;
          letter-spacing: -.035em;
        }

        .cv-nao-encontrado-card p {
          max-width: 410px;
          margin: 16px 0 0;
          color: #7c6a70;
          font-size: 15px;
          line-height: 1.55;
        }

        .cv-nao-encontrado-card .cv-nao-encontrado-chamada {
          margin-top: 12px;
          color: #5d3c46;
          font-weight: 700;
        }

        .cv-nao-encontrado-principal {
          min-height: 50px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-top: 24px;
          padding: 13px 24px;
          border-radius: 999px;
          background: #d86090;
          color: #fff;
          box-shadow: 0 9px 24px rgba(216, 96, 144, .23);
          font-size: 14px;
          font-weight: 750;
          text-decoration: none;
          transition: transform .18s ease, filter .18s ease;
        }

        .cv-nao-encontrado-principal:hover {
          filter: brightness(.96);
          transform: translateY(-1px);
        }

        .cv-nao-encontrado-secundario {
          margin-top: 15px;
          color: #7c5560;
          font-size: 13px;
          font-weight: 650;
          text-decoration: none;
        }

        .cv-nao-encontrado-secundario:hover {
          color: #a04a63;
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        @media (max-width: 520px) {
          .cv-nao-encontrado {
            padding: 16px;
          }

          .cv-nao-encontrado-card {
            padding: 28px 20px;
            border-radius: 22px;
          }

          .cv-nao-encontrado-logo {
            width: 78px;
            height: 78px;
          }

          .cv-nao-encontrado-card p {
            font-size: 14px;
          }

          .cv-nao-encontrado-principal {
            width: min(100%, 280px);
          }
        }
      `}</style>
    </main>
  );
}
