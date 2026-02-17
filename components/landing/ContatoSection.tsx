'use client';

interface ContatoProps {
  theme?: 'dark' | 'light';
}

export default function ContatoSection({ theme = 'dark' }: ContatoProps) {
  const isDark = theme === 'dark';

  return (
    <div
      className={`relative flex flex-col items-center justify-center h-full w-full px-4 sm:px-6 lg:px-12 overflow-hidden transition-colors duration-500 ${
        isDark
          ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950'
          : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'
      }`}
    >
      {/* Fundo decorativo */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute bottom-1/3 left-1/2 -translate-x-1/2 w-[40%] h-[40%] rounded-full blur-[120px] ${
          isDark ? 'bg-blue-500/5' : 'bg-blue-200/15'
        }`} />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-2xl w-full">

        {/* Título */}
        <p className={`text-xs font-semibold uppercase tracking-widest mb-2 transition-colors ${
          isDark ? 'text-green-400/70' : 'text-green-600/70'
        }`}>
          Contato
        </p>
        <h2
          style={{ fontFamily: "'Nunito', sans-serif" }}
          className={`text-xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold mb-3 transition-colors ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}
        >
          Fale com a gente
        </h2>
        <p className={`text-sm sm:text-base mb-8 sm:mb-10 transition-colors ${
          isDark ? 'text-white/40' : 'text-gray-400'
        }`}>
          O eAi é desenvolvido por{' '}
          <a
            href="https://bigcorps.com.br"
            target="_blank"
            rel="noopener noreferrer"
            className={`font-semibold transition-colors hover:underline ${
              isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
            }`}
          >
            BigCorps
          </a>
        </p>

        {/* Cards de contato */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 w-full max-w-lg sm:max-w-3xl mb-10 sm:mb-12">

          {/* Site */}
          <a
            href="https://bigcorps.com.br"
            target="_blank"
            rel="noopener noreferrer"
            className={`group flex flex-col items-center justify-center gap-2 sm:gap-3 px-3 py-3.5 sm:py-6 rounded-xl border transition-all duration-300 hover:scale-[1.02] ${
              isDark
                ? 'bg-slate-800/30 border-white/5 hover:border-blue-500/30 hover:bg-slate-800/50'
                : 'bg-white/70 border-gray-100 hover:border-blue-200 hover:bg-white shadow-sm'
            }`}
          >
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
              isDark ? 'bg-blue-500/10 group-hover:bg-blue-500/20' : 'bg-blue-50 group-hover:bg-blue-100'
            }`}>
              <svg className={`w-5 h-5 sm:w-6 sm:h-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
              </svg>
            </div>
            <div className="text-center">
              <p className={`text-[10px] sm:text-xs font-medium mb-0.5 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>Site</p>
              <p className={`text-[11px] sm:text-xs font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>bigcorps.com.br</p>
            </div>
          </a>

          {/* WhatsApp */}
          <a
            href="https://wa.me/5511987311425"
            target="_blank"
            rel="noopener noreferrer"
            className={`group flex flex-col items-center justify-center gap-2 sm:gap-3 px-3 py-3.5 sm:py-6 rounded-xl border transition-all duration-300 hover:scale-[1.02] ${
              isDark
                ? 'bg-slate-800/30 border-white/5 hover:border-green-500/30 hover:bg-slate-800/50'
                : 'bg-white/70 border-gray-100 hover:border-green-200 hover:bg-white shadow-sm'
            }`}
          >
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
              isDark ? 'bg-green-500/10 group-hover:bg-green-500/20' : 'bg-green-50 group-hover:bg-green-100'
            }`}>
              <svg className={`w-5 h-5 sm:w-6 sm:h-6 ${isDark ? 'text-green-400' : 'text-green-600'}`} viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
            <div className="text-center">
              <p className={`text-[10px] sm:text-xs font-medium mb-0.5 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>WhatsApp</p>
              <p className={`text-[11px] sm:text-xs font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>(11) 98731-1425</p>
            </div>
          </a>

          {/* Instagram */}
          <a
            href="https://instagram.com/bigcorps"
            target="_blank"
            rel="noopener noreferrer"
            className={`group flex flex-col items-center justify-center gap-2 sm:gap-3 px-3 py-3.5 sm:py-6 rounded-xl border transition-all duration-300 hover:scale-[1.02] ${
              isDark
                ? 'bg-slate-800/30 border-white/5 hover:border-blue-500/30 hover:bg-slate-800/50'
                : 'bg-white/70 border-gray-100 hover:border-blue-200 hover:bg-white shadow-sm'
            }`}
          >
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
              isDark ? 'bg-blue-500/10 group-hover:bg-blue-500/20' : 'bg-blue-50 group-hover:bg-blue-100'
            }`}>
              <svg className={`w-5 h-5 sm:w-6 sm:h-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
            </div>
            <div className="text-center">
              <p className={`text-[10px] sm:text-xs font-medium mb-0.5 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>Instagram</p>
              <p className={`text-[11px] sm:text-xs font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>@bigcorps</p>
            </div>
          </a>

          {/* Email */}
          <a
            href="mailto:contato@bigcorps.com.br"
            className={`group flex flex-col items-center justify-center gap-2 sm:gap-3 px-3 py-3.5 sm:py-6 rounded-xl border transition-all duration-300 hover:scale-[1.02] ${
              isDark
                ? 'bg-slate-800/30 border-white/5 hover:border-green-500/30 hover:bg-slate-800/50'
                : 'bg-white/70 border-gray-100 hover:border-green-200 hover:bg-white shadow-sm'
            }`}
          >
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
              isDark ? 'bg-green-500/10 group-hover:bg-green-500/20' : 'bg-green-50 group-hover:bg-green-100'
            }`}>
              <svg className={`w-5 h-5 sm:w-6 sm:h-6 ${isDark ? 'text-green-400' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <div className="text-center">
              <p className={`text-[10px] sm:text-xs font-medium mb-0.5 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>Email</p>
              <p className={`text-[10px] sm:text-xs font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>contato@bigcorps.com.br</p>
            </div>
          </a>
        </div>

        {/* Rodapé legal */}
        <div className={`pt-6 sm:pt-8 border-t w-full transition-colors ${
          isDark ? 'border-white/5' : 'border-gray-100'
        }`}>
          <p className={`text-[10px] sm:text-xs mb-1 transition-colors ${
            isDark ? 'text-white/25' : 'text-gray-500'
          }`}>
            BIGCORPS TECNOLOGIA LTA
          </p>
          <p className={`text-[10px] sm:text-xs transition-colors ${
            isDark ? 'text-white/20' : 'text-gray-500'
          }`}>
            CNPJ: 14.282.244/0001-19
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 mt-6 sm:mt-8">
          <a
            href="/login"
            className="w-full sm:w-auto px-8 py-3 bg-[#A4C61E] text-white rounded-full hover:brightness-110 transition-all duration-300 font-bold text-sm text-center shadow-lg hover:shadow-xl hover:scale-105"
          >
            Comece Gratuitamente
          </a>
          <a
            href="/ia/suporte"
            className={`w-full sm:w-auto px-8 py-3 border-2 rounded-full transition-all duration-300 font-bold text-sm text-center hover:scale-105 ${
              isDark
                ? 'border-blue-400/50 text-blue-400 hover:bg-blue-400/10 hover:border-blue-400'
                : 'border-blue-600/50 text-blue-600 hover:bg-blue-50 hover:border-blue-600'
            }`}
          >
            Ver Demonstração
          </a>
        </div>
      </div>
    </div>
  );
}
