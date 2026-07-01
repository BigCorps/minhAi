// components/landing/StaticAvatarFace.tsx
// Versão estática do avatar, usada SOMENTE na exportação em PDF.
// Reproduz a mesma estrutura visual do LandingAvatarFace (halos em
// camadas, gradientes cônicos, rosto com olhos e boca em gradiente),
// travada no estado "idle" (parada, sem piscar, sem fala).
//
// O que foi removido, e por quê:
// - Filtros SVG (<filter> com feGaussianBlur/feMerge/feOffset): categoria
//   de CSS pouco confiável no html2canvas — diferente do blur simples em
//   CSS (filter: blur() num <div>), que é mais bem suportado e foi mantido.
// - Canvas de partículas (requestAnimationFrame): não tem estado "parado"
//   sensato pra capturar — depende de desenhar quadro a quadro.
// - Animações CSS (spin, pulse, ping, float): sem efeito numa captura
//   estática — os elementos ficam, só sem o movimento.

const COLORS = {
  primary: '#3b82f6',
  secondary: '#60a5fa',
  glow: 'rgba(34, 197, 94, 0.4)',
  ring: '#22c55e',
  halo: '#22c55e',
};

export function StaticAvatarFace() {
  const { primary, glow, ring, halo } = COLORS;

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-visible bg-transparent">

      {/* ── Halos em camadas (estáticos) ──────────────────────── */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Anéis-onda */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="absolute rounded-full border-2" style={{ width: '75%', aspectRatio: '1 / 1', borderColor: ring, opacity: 0.2 }} />
          <div className="absolute rounded-full border-2" style={{ width: '90%', aspectRatio: '1 / 1', borderColor: ring, opacity: 0.2 }} />
        </div>

        {/* Halo cônico 1 */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="rounded-full opacity-20" style={{
            width: '95%', aspectRatio: '1 / 1',
            background: `conic-gradient(from 0deg, transparent 0%, ${halo} 25%, transparent 50%, ${halo} 75%, transparent 100%)`,
            filter: 'blur(20px)',
          }} />
        </div>

        {/* Halo cônico 2 */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="rounded-full opacity-30" style={{
            width: '90%', aspectRatio: '1 / 1',
            background: `conic-gradient(from 45deg, transparent 0%, ${halo} 20%, transparent 40%, ${halo} 60%, transparent 80%, ${halo} 100%)`,
            filter: 'blur(15px)',
          }} />
        </div>

        {/* Halo radial */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="rounded-full opacity-40" style={{
            width: '85%', aspectRatio: '1 / 1',
            background: `radial-gradient(circle at center, transparent 60%, ${halo}40 70%, ${halo}20 80%, transparent 90%)`,
            filter: 'blur(10px)',
          }} />
        </div>

        {/* Glow central */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="rounded-full" style={{
            width: '80%', aspectRatio: '1 / 1',
            background: `radial-gradient(circle at center, ${glow} 0%, transparent 70%)`,
            opacity: 0.5,
          }} />
        </div>
      </div>

      {/* ── Container principal (círculo com o rosto) ───────────── */}
      <div
        className="absolute inset-0 m-auto flex items-center justify-center overflow-hidden w-[70%] rounded-full"
        style={{
          background: 'rgba(248, 250, 252, 0.9)',
          boxShadow: `0 0 40px ${glow}`,
          backdropFilter: 'blur(8px)',
          aspectRatio: '1 / 1',
        }}
      >
        <svg viewBox="0 0 200 200" className="w-full h-full absolute z-20" style={{ overflow: 'visible' }}>
          <defs>
            <radialGradient id="static-avatar-eyeGradient">
              <stop offset="0%" stopColor={primary} stopOpacity="0.9" />
              <stop offset="100%" stopColor={primary} stopOpacity="0.3" />
            </radialGradient>
            <radialGradient id="static-avatar-glowGradient">
              <stop offset="0%" stopColor="white" stopOpacity="0.8" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="static-avatar-mouthDepth" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={primary} stopOpacity="0.3" />
              <stop offset="50%" stopColor={primary} stopOpacity="0.8" />
              <stop offset="100%" stopColor={primary} stopOpacity="0.4" />
            </linearGradient>
          </defs>

          {/* Olho esquerdo — estado idle */}
          <ellipse cx="76" cy="85" rx="14.4" ry="17.6" fill="url(#static-avatar-eyeGradient)" opacity="0.85" />
          <ellipse cx="73" cy="79" rx="6.4" ry="8" fill="url(#static-avatar-glowGradient)" opacity="0.6" />
          <circle cx="74" cy="81" r="3.2" fill="white" opacity="0.7" />

          {/* Olho direito — estado idle */}
          <ellipse cx="124" cy="85" rx="14.4" ry="17.6" fill="url(#static-avatar-eyeGradient)" opacity="0.85" />
          <ellipse cx="121" cy="79" rx="6.4" ry="8" fill="url(#static-avatar-glowGradient)" opacity="0.6" />
          <circle cx="122" cy="81" r="3.2" fill="white" opacity="0.7" />

          {/* Boca */}
          <path d="M 66 137 Q 100 152 134 137" stroke="rgba(0,0,0,0.2)" strokeWidth="10" fill="none" strokeLinecap="round" opacity="0.6" />
          <path d="M 68 136 Q 100 150 132 136" stroke="url(#static-avatar-mouthDepth)" strokeWidth="8" fill="none" strokeLinecap="round" />
          <path d="M 70 135 Q 100 147 130 135" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.6" />
        </svg>
      </div>
    </div>
  );
}