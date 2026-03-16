'use client';

import Link from 'next/link';
import Image from 'next/image';

interface Props {
  referralCode: string;
  referrerName: string;
}

export default function ReferralLandingPage({ referralCode, referrerName }: Props) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <Image src="/logo.png" alt="eAi" width={140} height={72} className="mx-auto mb-4" />
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">
            {referrerName} te convidou!
          </h1>
          <p className="text-slate-400 text-sm mb-8 leading-relaxed">
            Crie sua conta no <span className="text-blue-400 font-semibold">minhAi</span> e tenha seu próprio assistente de IA para automatizar seu negócio.
          </p>

          {/* Benefícios */}
          <div className="space-y-3 mb-8 text-left">
            {[
              'Assistente de voz e texto com IA para seu negócio',
              'Integração com WhatsApp, Instagram e Facebook',
              'Pagamentos PIX com confirmação automática integrados',
              'Prático e fácil de configurar, sem necessidade de programação',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-5 h-5 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-slate-300 text-sm">{item}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              document.cookie = `pendingRefCode=${referralCode}; path=/; max-age=3600; samesite=lax; secure`;
              window.location.href = '/login?mode=signup';
            }}
            className="block w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg transition-colors"
          >
            Criar minha conta grátis
          </button>

          <p className="text-slate-600 text-xs mt-4">
            Já tem conta?{' '}
            <Link href="/login" className="text-slate-400 hover:text-white transition-colors">
              Fazer login
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-slate-700 mt-6">
          minhAi — Uma IA pra chamar de sua!
        </p>
      </div>
    </div>
  );
}
