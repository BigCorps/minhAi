'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase-browser';

function pixPath(path:string){
  if(typeof window==='undefined')return `/pix${path}`;
  const host=window.location.hostname.toLowerCase();
  return host==='pix.wiki'||host==='www.pix.wiki'?path:`/pix${path}`;
}

export default function PixWikiLoginPage(){
  const supabase=useMemo(()=>createClient(),[]);
  const [dark,setDark]=useState(true);const [email,setEmail]=useState('');const [senha,setSenha]=useState('');const [error,setError]=useState('');const [loading,setLoading]=useState(false);

  async function destination(){
    try{const pending=JSON.parse(localStorage.getItem('pixWikiPendingSignupV2')||'null');if(pending?.nome)return pixPath('/onboarding');}catch{/* ignore */}
    try{
      const {data}=await supabase.rpc('pixwiki_v2_my_access_context');
      if(Number(data?.pending_invites||0)>0)return pixPath('/equipe/aceitar');
      if(data?.has_management===true)return pixPath('/dashboard');
      if(data?.has_cashier===true)return pixPath('/caixa');
    }catch{/* compatibilidade durante deploy */}
    return pixPath('/dashboard');
  }

  useEffect(()=>{
    const saved=localStorage.getItem('publicTheme');if(saved==='light'||saved==='dark')setDark(saved==='dark');else setDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
    supabase.auth.getUser().then(async({data})=>{if(data.user)window.location.replace(await destination());});
  },[supabase]); // eslint-disable-line react-hooks/exhaustive-deps

  const page=dark?'bg-[#020617] text-white':'bg-white text-slate-900';const card=dark?'border-white/10 bg-white/[0.035]':'border-black/10 bg-white shadow-sm';const input=dark?'border-white/10 bg-white/[0.055] text-white placeholder:text-white/25':'border-black/10 bg-white text-slate-900 placeholder:text-slate-400';const muted=dark?'text-white/55':'text-slate-500';

  async function google(){
    setError('');
    // Usuários Caixa que usam Google e acessam /dashboard serão redirecionados pelo próprio dashboard Gate 7.
    const next=pixPath('/dashboard');
    const {error:e}=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:`${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,queryParams:{access_type:'offline',prompt:'consent'}}});
    if(e)setError('Não foi possível entrar com Google agora.');
  }

  async function emailLogin(event:React.FormEvent){
    event.preventDefault();setError('');if(!email.includes('@')||senha.length<6)return setError('Preencha e-mail e senha.');setLoading(true);
    const {error:e}=await supabase.auth.signInWithPassword({email,password:senha});setLoading(false);if(e)return setError('E-mail ou senha incorretos.');window.location.replace(await destination());
  }

  return <main className={`min-h-screen flex items-center justify-center px-4 py-12 ${page}`}><div className="w-full max-w-sm"><div className="mb-6 flex items-center justify-center gap-3"><Image src="/brands/pix/pixwiki.png" alt="PixWiki" width={90} height={36} className="h-9 w-auto object-contain"/><span className={muted}>|</span><Image src="/logo-circle.png" alt="minhAi" width={36} height={36} className="rounded-xl"/></div><h1 className="text-center text-xl font-black">Entrar na sua conta</h1><div className={`mt-6 rounded-2xl border p-5 ${card}`}><button onClick={google} className="w-full rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-800">Continuar com Google</button><div className="my-4 flex items-center gap-3"><div className="h-px flex-1 bg-white/10"/><span className={`text-xs ${muted}`}>ou</span><div className="h-px flex-1 bg-white/10"/></div><form onSubmit={emailLogin} className="space-y-3"><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Seu e-mail" className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${input}`}/><input type="password" value={senha} onChange={e=>setSenha(e.target.value)} placeholder="Senha" className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${input}`}/>{error&&<p className="text-xs text-red-400">{error}</p>}<button disabled={loading} className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-50">{loading?'Entrando…':'Entrar'}</button></form></div><p className={`mt-4 text-center text-xs ${muted}`}>Ainda não tem conta? <a href={pixPath('/')} className="font-bold text-emerald-400 hover:underline">Começar grátis</a></p><p className={`mt-6 text-center text-[11px] ${muted}`}>PixWiki · Desenvolvido por BigCorps · Tecnologia minhAi</p></div><button onClick={()=>{setDark(v=>{const n=!v;localStorage.setItem('publicTheme',n?'dark':'light');return n;});}} className={`fixed right-5 top-5 h-10 w-10 rounded-full border ${card}`}>{dark?'☀':'☾'}</button></main>;
}
