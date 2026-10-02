'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import PixWikiHeader, { type PixWikiPlanKey } from '@/components/pix/PixWikiHeader';
import PixWikiDashboardNav from '@/components/pix/PixWikiDashboardNav';

const FUNCTIONS_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

type Company = { id:string; name:string; slug:string; logo_url:string|null; role:'owner'|'manager' };
type Member = {
  row_kind:'member'|'invite'; user_id:string|null; email:string; role:string; status:string;
  created_at:string; expires_at:string|null; invite_id:string|null; push_devices:number;
};

function roleLabel(role:string) {
  if (role==='owner') return 'Proprietário';
  if (role==='manager') return 'Gerente';
  if (role==='cashier') return 'Caixa';
  if (role==='viewer') return 'Leitura (legado)';
  return role;
}
function date(value:string|null) { return value ? new Date(value).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—'; }

export default function PixWikiEquipePage() {
  const supabase = useMemo(()=>createClient(),[]);
  const [dark,setDark]=useState(true);
  const [loading,setLoading]=useState(true);
  const [companies,setCompanies]=useState<Company[]>([]);
  const [company,setCompany]=useState<Company|null>(null);
  const [team,setTeam]=useState<Member[]>([]);
  const [plan,setPlan]=useState<PixWikiPlanKey>('free');
  const [inviteEmail,setInviteEmail]=useState('');
  const [inviteRole,setInviteRole]=useState<'manager'|'cashier'>('cashier');
  const [busy,setBusy]=useState('');
  const [notice,setNotice]=useState('');
  const [error,setError]=useState('');

  const callTeam = useCallback(async(body:Record<string,unknown>)=>{
    const {data:{session}}=await supabase.auth.getSession();
    if(!session?.access_token) throw new Error('not_authenticated');
    const response=await fetch(`${FUNCTIONS_URL}/pixwiki-team-admin`,{
      method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`,apikey:ANON_KEY},
      body:JSON.stringify(body),cache:'no-store',
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok || data?.error) { const e=new Error(data?.error||`HTTP ${response.status}`) as Error & {payload?:any}; e.payload=data; throw e; }
    return data;
  },[supabase]);

  const loadTeam=useCallback(async(c:Company)=>{
    const [result,{data:snapshot}]=await Promise.all([
      callTeam({action:'list',company_id:c.id}),
      supabase.rpc('pixwiki_v2_dashboard_snapshot',{p_company_id:c.id}),
    ]);
    setTeam(result.team||[]);
    if(snapshot?.billing?.plan)setPlan(snapshot.billing.plan as PixWikiPlanKey);
  },[callTeam,supabase]);

  useEffect(()=>{
    const saved=localStorage.getItem('publicTheme');
    setDark(saved?saved==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches);
    (async()=>{
      const {data:{user}}=await supabase.auth.getUser();
      if(!user){window.location.replace('/login');return;}
      const {data:companyRows,error:companyError}=await supabase.rpc('pixwiki_v2_team_manageable_companies');
      if(companyError) throw companyError;
      const rows=(companyRows||[]) as Company[];
      if(!rows.length){
        const {data:ctx}=await supabase.rpc('pixwiki_v2_my_access_context');
        if(ctx?.has_cashier) window.location.replace('/caixa');
        else window.location.replace('/dashboard');
        return;
      }
      setCompanies(rows);
      const requested=new URL(window.location.href).searchParams.get('company')||localStorage.getItem('pixWikiActiveCompanyId');
      const selected=rows.find(x=>x.id===requested)||rows[0];
      setCompany(selected);
      await loadTeam(selected);
      setLoading(false);
    })().catch(()=>{setError('Não foi possível carregar a equipe.');setLoading(false);});
  },[loadTeam,supabase]);

  async function switchCompany(id:string){
    const next=companies.find(c=>c.id===id); if(!next)return;
    setCompany(next); setLoading(true); setError('');
    localStorage.setItem('pixWikiActiveCompanyId',next.id);
    const url=new URL(window.location.href);url.searchParams.set('company',next.id);window.history.replaceState({},'',url.toString());
    try{await loadTeam(next);}catch{setError('Não foi possível carregar a equipe.');}finally{setLoading(false);}
  }

  async function invite(){
    if(!company)return;
    setBusy('invite');setError('');setNotice('');
    try{
      const result=await callTeam({action:'invite',company_id:company.id,email:inviteEmail,role:inviteRole});
      setInviteEmail('');
      if(result.email_sent) setNotice('Convite enviado por e-mail. O acesso só é ativado depois que a pessoa aceitar.');
      else if(result.existing_account) setNotice('Convite criado. Como essa pessoa já tem conta PixWiki, o convite aparecerá no próximo acesso.');
      else setNotice('Convite salvo. O e-mail não pôde ser enviado agora, mas o acesso aparecerá quando a pessoa entrar com esse endereço.');
      await loadTeam(company);
    }catch(e:any){
      const msg=String(e?.message||'');
      if(msg.includes('already_member'))setError('Essa pessoa já faz parte da equipe.');
      else if(msg.includes('cannot_invite_self'))setError('Você já possui acesso a esta empresa.');
      else if(msg.includes('role_not_allowed'))setError('Gerentes podem convidar apenas usuários Caixa.');
      else if(msg.includes('invalid_email'))setError('Informe um e-mail válido.');
      else setError('Não foi possível criar o convite.');
    }finally{setBusy('');}
  }

  async function changeRole(member:Member,role:'manager'|'cashier'){
    if(!company||!member.user_id)return;
    setBusy(`role-${member.user_id}`);setError('');setNotice('');
    try{await callTeam({action:'change_role',company_id:company.id,user_id:member.user_id,role});setNotice('Papel atualizado.');await loadTeam(company);}
    catch(e:any){setError(String(e?.message||'').includes('owner_required')?'Somente o proprietário pode alterar papéis.':'Não foi possível alterar o papel.');}
    finally{setBusy('');}
  }

  async function remove(member:Member){
    if(!company||!member.user_id)return;
    if(!window.confirm(`Remover ${member.email} da equipe? O Push dessa empresa também será desativado nesse usuário.`))return;
    setBusy(`remove-${member.user_id}`);setError('');setNotice('');
    try{await callTeam({action:'remove',company_id:company.id,user_id:member.user_id});setNotice('Acesso removido e Push desativado para esta empresa.');await loadTeam(company);}
    catch(e:any){setError(String(e?.message||'').includes('role_not_allowed')?'Você não tem permissão para remover esse papel.':'Não foi possível remover o acesso.');}
    finally{setBusy('');}
  }

  async function revoke(member:Member){
    if(!company||!member.invite_id)return;
    setBusy(`invite-${member.invite_id}`);setError('');setNotice('');
    try{await callTeam({action:'revoke_invite',company_id:company.id,invite_id:member.invite_id});setNotice('Convite cancelado.');await loadTeam(company);}
    catch{setError('Não foi possível cancelar o convite.');}
    finally{setBusy('');}
  }

  if(loading)return <main className="min-h-screen bg-[#020617] text-white flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-emerald-400"/></main>;

  const page=dark?'bg-[#020617] text-white':'bg-[#f7f8fa] text-slate-900';
  const card=dark?'border-white/10 bg-white/[0.035]':'border-black/10 bg-white shadow-sm';
  const inner=dark?'border-white/10 bg-black/15':'border-black/10 bg-slate-50';
  const muted=dark?'text-white/55':'text-slate-500';
  const input=dark?'border-white/10 bg-white/[0.05] text-white':'border-black/10 bg-white text-slate-900';
  const isOwner=company?.role==='owner';

  return <main className={`min-h-screen pb-28 ${page}`}>
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <PixWikiHeader plan={plan} dark={dark} onThemeChange={setDark}/>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="text-3xl font-black">Equipe</h1><p className={`mt-2 text-sm ${muted}`}>Convide gerentes e caixas sem compartilhar sua conta ou acesso ao Mercado Pago.</p></div>
        {companies.length>1&&<select value={company?.id||''} onChange={e=>switchCompany(e.target.value)} className={`rounded-xl border px-3 py-2.5 text-sm outline-none ${input}`}>{companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>}
      </div>

      {(notice||error)&&<div className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${error?'border-red-500/25 bg-red-500/10 text-red-300':'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'}`}>{error||notice}</div>}

      <section className={`mt-5 rounded-3xl border p-5 sm:p-6 ${card}`}>
        <h2 className="text-lg font-black">Convidar pessoa</h2>
        <p className={`mt-1 text-xs ${muted}`}>{isOwner?'Gerente administra a operação. Caixa vê apenas totais e últimos recebimentos.':'Como gerente, você pode adicionar ou remover usuários Caixa.'}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px_auto]">
          <input type="email" value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} placeholder="pessoa@empresa.com" className={`rounded-xl border px-3 py-3 text-sm outline-none ${input}`}/>
          <select value={inviteRole} onChange={e=>setInviteRole(e.target.value as 'manager'|'cashier')} className={`rounded-xl border px-3 py-3 text-sm outline-none ${input}`}>
            {isOwner&&<option value="manager">Gerente</option>}<option value="cashier">Caixa</option>
          </select>
          <button onClick={invite} disabled={busy==='invite'||!inviteEmail.trim()} className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-50">{busy==='invite'?'Enviando…':'Convidar'}</button>
        </div>
      </section>

      <section className={`mt-4 overflow-hidden rounded-3xl border ${card}`}>
        <div className="border-b border-white/10 px-5 py-4"><h2 className="text-lg font-black">Acessos de {company?.name}</h2><p className={`mt-1 text-xs ${muted}`}>{team.length} registro(s)</p></div>
        <div className="divide-y divide-white/5">
          {team.length===0?<div className={`p-8 text-center text-sm ${muted}`}>Nenhum membro adicional.</div>:team.map((m,index)=><div key={m.invite_id||m.user_id||`${m.email}-${index}`} className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><p className="truncate font-black">{m.email}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${m.status==='active'?'bg-emerald-500/10 text-emerald-400':m.status==='expired'?'bg-red-500/10 text-red-300':'bg-amber-500/10 text-amber-300'}`}>{m.status==='active'?'ATIVO':m.status==='expired'?'EXPIRADO':'CONVITE PENDENTE'}</span></div>
              <p className={`mt-1 text-xs ${muted}`}>{roleLabel(m.role)} · {m.row_kind==='invite'?`convidado em ${date(m.created_at)}`:`acesso desde ${date(m.created_at)}`}</p>
              {m.row_kind==='member'&&m.role!=='owner'&&<p className={`mt-1 text-[11px] ${m.push_devices>0?'text-emerald-400':muted}`}>{m.push_devices>0?`Push ativo em ${m.push_devices} dispositivo(s)`:'Push ainda não ativado'}</p>}
              {m.row_kind==='invite'&&m.expires_at&&<p className={`mt-1 text-[11px] ${muted}`}>Expira em {date(m.expires_at)}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              {m.row_kind==='member'&&m.role!=='owner'&&m.user_id&&<>
                {isOwner&&<select value={m.role==='manager'?'manager':'cashier'} onChange={e=>changeRole(m,e.target.value as 'manager'|'cashier')} disabled={busy===`role-${m.user_id}`} className={`rounded-xl border px-3 py-2 text-xs font-bold ${input}`}><option value="manager">Gerente</option><option value="cashier">Caixa</option></select>}
                {(isOwner||m.role==='cashier')&&<button onClick={()=>remove(m)} disabled={busy===`remove-${m.user_id}`} className={`rounded-xl border px-3 py-2 text-xs font-black ${inner}`}>Remover</button>}
              </>}
              {m.row_kind==='invite'&&m.invite_id&&(isOwner||m.role==='cashier')&&<button onClick={()=>revoke(m)} disabled={busy===`invite-${m.invite_id}`} className={`rounded-xl border px-3 py-2 text-xs font-black ${inner}`}>Cancelar convite</button>}
            </div>
          </div>)}
        </div>
      </section>

      <section className={`mt-4 rounded-3xl border p-5 ${card}`}><h2 className="font-black">Permissões</h2><div className={`mt-3 grid gap-3 text-sm ${muted} sm:grid-cols-3`}><div><strong className={dark?'text-white':'text-slate-900'}>Proprietário</strong><p className="mt-1">Tudo: configurações, cobrança, API, equipe e Mercado Pago.</p></div><div><strong className={dark?'text-white':'text-slate-900'}>Gerente</strong><p className="mt-1">Dashboard e operação. Pode gerenciar Caixas, mas não altera o proprietário.</p></div><div><strong className={dark?'text-white':'text-slate-900'}>Caixa</strong><p className="mt-1">Somente última hora, hoje, últimos Pix e Push. Sem dados financeiros sensíveis ou configurações.</p></div></div></section>
    </div>
    <PixWikiDashboardNav dark={dark}/>
  </main>;
}
