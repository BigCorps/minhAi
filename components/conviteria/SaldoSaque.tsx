'use client';
import { useCallback, useEffect, useState } from 'react';
import { Banknote, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { brlSaque } from '@/lib/conviteria/saque';

export default function SaldoSaque({eventoId}:{eventoId:string}) {
  const [aberto,setAberto]=useState(false), [dados,setDados]=useState<any>(null), [erro,setErro]=useState('');
  const [enviando,setEnviando]=useState(false), [nomeCompleto,setNomeCompleto]=useState(''), [cpf,setCpf]=useState(''), [chavePix,setChavePix]=useState(''), [valor,setValor]=useState('');
  const token=useCallback(async()=> (await createClient().auth.getSession()).data.session?.access_token??'',[]);
  const carregar=useCallback(async()=>{
    setErro('');
    try{
      const r=await fetch(`/api/conviteria/saque?evento=${encodeURIComponent(eventoId)}`,{headers:{Authorization:`Bearer ${await token()}`}});
      const d=await r.json(); if(!r.ok) throw new Error(d.erro); setDados(d);
      if(d.recebedor?.nomeCompleto) setNomeCompleto(d.recebedor.nomeCompleto);
      if(d.recebedor?.chavePix) setChavePix(d.recebedor.chavePix);
      if(!valor && d.saldo.disponivelCentavos>0) setValor((d.saldo.disponivelCentavos/100).toFixed(2).replace('.',','));
    }catch(e:any){setErro(e.message||'Falha ao carregar saldo.')}
  },[eventoId,token,valor]);
  useEffect(()=>{if(aberto&&!dados) void carregar()},[aberto,dados,carregar]);

  async function solicitar(){
    setEnviando(true); setErro('');
    try{
      const valorCentavos=Math.round(Number(valor.replace(/\./g,'').replace(',','.'))*100);
      const r=await fetch('/api/conviteria/saque',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${await token()}`},body:JSON.stringify({eventoId,nomeCompleto,cpf,chavePix,valorCentavos})});
      const d=await r.json(); if(!r.ok) throw new Error(d.erro);
      setCpf(''); setDados(null); await carregar(); alert('Solicitação registrada para processamento manual.');
    }catch(e:any){setErro(e.message||'Falha ao solicitar saque.')} finally{setEnviando(false)}
  }

  return <div className="mt-3 pt-3 border-t border-rose-100">
    <button type="button" onClick={()=>setAberto(v=>!v)} className="inline-flex items-center gap-1.5 text-sm font-medium text-[#a04a63]"><Banknote className="w-4 h-4"/>{aberto?'Fechar saldo':'Saldo e saque'}</button>
    {aberto&&<div className="mt-4 rounded-xl bg-[#fdf7f9] border border-[#c0607833] p-4">
      {!dados&&!erro?<div className="flex gap-2 text-sm"><Loader2 className="w-4 h-4 animate-spin"/>Carregando…</div>:dados&&<>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-lg bg-white p-3 border"><p className="text-xs text-[#7c5560]">Disponível</p><p className="font-semibold">{brlSaque(dados.saldo.disponivelCentavos)}</p></div>
          <div className="rounded-lg bg-white p-3 border"><p className="text-xs text-[#7c5560]">Já repassado</p><p className="font-semibold">{brlSaque(dados.saldo.repassadoCentavos)}</p></div>
        </div>
        <p className="text-xs text-[#7c5560] mb-3">Saque mínimo: {brlSaque(dados.saqueMinimoCentavos)}. O repasse é conferido e feito manualmente nesta fase.</p>
        <div className="grid gap-2">
          <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Nome completo do titular" value={nomeCompleto} onChange={e=>setNomeCompleto(e.target.value)}/>
          <input className="border rounded-lg px-3 py-2 text-sm" placeholder="CPF do titular" value={cpf} onChange={e=>setCpf(e.target.value)}/>
          <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Chave PIX" value={chavePix} onChange={e=>setChavePix(e.target.value)}/>
          <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Valor do saque (R$)" value={valor} onChange={e=>setValor(e.target.value)}/>
          <button disabled={enviando||dados.saldo.disponivelCentavos<dados.saqueMinimoCentavos} onClick={solicitar} className="rounded-full bg-[#c06078] text-white px-4 py-2.5 text-sm font-semibold disabled:opacity-50">{enviando?'Solicitando…':'Solicitar saque'}</button>
        </div>
        {dados.repasses?.length>0&&<div className="mt-4"><p className="text-xs font-semibold mb-2">Últimas solicitações</p><ul className="space-y-1">{dados.repasses.map((r:any)=><li key={r.id} className="flex justify-between text-xs bg-white rounded-lg p-2 border"><span>{brlSaque(r.valorCentavos)}</span><strong>{r.status}</strong></li>)}</ul></div>}
      </>}
      {erro&&<p className="mt-3 text-xs text-red-700">{erro}</p>}
    </div>}
  </div>;
}
