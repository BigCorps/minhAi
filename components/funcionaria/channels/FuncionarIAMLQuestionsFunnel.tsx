'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, MessageSquare, RefreshCw, ShoppingBag } from 'lucide-react';
import { invokeFuncionarIAEdge } from '@/lib/funcionaria-api';
import FuncionarIAMLOrdersPreview from './FuncionarIAMLOrdersPreview';

type SavedQuestion = {
  id: string; ml_question_id: string; ml_item_id?: string | null;
  produto_nome?: string | null; texto_pergunta?: string | null;
  resposta_gerada?: string | null; status?: string | null; created_at?: string | null;
};
type LiveQuestion = {
  id: string; item_id: string; status: string; text: string; date_created: string | null;
};
type DisplayQuestion = {
  id: string; itemId: string; title: string; question: string; answer: string;
  status: string; createdAt: string | null; source: 'saved' | 'live';
};

const ACTIVE = new Set(['pending','pending_manual','pending_send','error','unanswered']);
const ANSWERED = new Set(['sent','answered','answer_sent']);
function intent(text: string) {
  const s = String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  if (/frete|entrega|enviar|chegar|prazo|cep/.test(s)) return 'Entrega';
  if (/preco|valor|desconto|parcela|pix|pagamento/.test(s)) return 'Pagamento';
  if (/tem |disponivel|estoque|pronta entrega|possui/.test(s)) return 'Disponibilidade';
  if (/tamanho|medida|cor |modelo|garantia|original|material/.test(s)) return 'Produto';
  return 'Outros';
}
function normalizedStatus(q: DisplayQuestion) {
  const raw=q.status.toLowerCase();
  if(ANSWERED.has(raw))return 'responded';
  if(ACTIVE.has(raw))return 'attention';
  return 'other';
}
function fmt(iso: string|null) {
  if(!iso)return '';
  const date=new Date(iso);
  return Number.isNaN(date.getTime())?'':date.toLocaleDateString('pt-BR');
}

export default function FuncionarIAMLQuestionsFunnel({
  companyId, saved,
}: {
  companyId: string; saved: SavedQuestion[];
}) {
  const [live,setLive]=useState<LiveQuestion[]|null>(null);
  const [fetching,setFetching]=useState(false);
  const [problem,setProblem]=useState<string|null>(null);
  const [filter,setFilter]=useState<'all'|'attention'|'responded'>('all');

  async function fetchLive(){
    if(fetching || !companyId)return;
    setFetching(true);setProblem(null);
    try{
      const response=await invokeFuncionarIAEdge<any>('funcionaria-ml-sync',{
        action:'questions_preview',company_id:companyId,limit:50,offset:0,
      });
      setLive(Array.isArray(response.items)?response.items:[]);
    }catch(error:any){
      setProblem(error?.message || 'Não foi possível consultar as perguntas.');
    }finally{setFetching(false)}
  }

  const questions=useMemo(()=>{
    const found=new Map<string,DisplayQuestion>();
    for(const q of saved){
      const id=String(q.ml_question_id || '').trim();
      if(!/^\d{1,30}$/.test(id))continue;
      found.set(id,{
        id,itemId:String(q.ml_item_id || ''),title:String(q.produto_nome || ''),
        question:String(q.texto_pergunta || ''),answer:String(q.resposta_gerada || ''),
        status:String(q.status || 'pending'),createdAt:q.created_at || null,source:'saved',
      });
    }
    for(const q of live || []){
      const id=String(q.id || '').trim();
      if(!/^\d{1,30}$/.test(id))continue;
      const existing=found.get(id);
      found.set(id,{
        id,itemId:q.item_id || existing?.itemId || '',
        title:existing?.title || '',question:q.text || existing?.question || '',
        answer:existing?.answer || '',
        // O status consultado no ML prevalece sobre o status do cache local.
        status:q.status || existing?.status || 'unknown',
        createdAt:q.date_created || existing?.createdAt || null,
        source:'live',
      });
    }
    return [...found.values()].sort((a,b)=>
      (b.createdAt || '').localeCompare(a.createdAt || ''));
  },[saved,live]);

  const attention=questions.filter(q=>normalizedStatus(q)==='attention').length;
  const responded=questions.filter(q=>normalizedStatus(q)==='responded').length;
  const visible=questions.filter(q=>filter==='all'||normalizedStatus(q)===filter).slice(0,70);

  return (
    <section className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-violet-600"/>
            <h2 className="text-lg font-black">Funil comercial · Mercado Livre</h2>
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Interesse inferido pelas perguntas, sem identificar compradores nem atribuir vendas sem confirmação.
          </p>
        </div>
        <button type="button" onClick={()=>void fetchLive()} disabled={fetching || !companyId}
          className="inline-flex items-center gap-2 rounded-xl border border-violet-200 px-3 py-2 text-xs font-bold text-violet-800 disabled:opacity-40">
          <RefreshCw className={`h-4 w-4 ${fetching?'animate-spin':''}`}/>
          {fetching?'Consultando…':'Consultar Mercado Livre'}
        </button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <div className="rounded-xl bg-slate-50 p-3"><div className="text-[11px] text-slate-500">Perguntas observadas</div><div className="text-xl font-black">{questions.length}</div></div>
        <div className="rounded-xl bg-amber-50 p-3"><div className="text-[11px] text-amber-700">Precisam de atenção</div><div className="text-xl font-black text-amber-900">{attention}</div></div>
        <div className="rounded-xl bg-lime-50 p-3"><div className="text-[11px] text-lime-700">Respondidas</div><div className="text-xl font-black text-lime-900">{responded}</div></div>
        <div className="rounded-xl bg-violet-50 p-3"><div className="flex items-center gap-1 text-[11px] text-violet-800"><ShoppingBag className="h-3 w-3"/> Pedidos ML pagos</div><div className="mt-1 text-xs font-bold text-violet-800">Consulta separada abaixo</div></div>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        Cada pergunta é uma oportunidade de contato, não um comprador único.
        {live===null ? ' Exibindo registros locais; consulte o ML para comparar.' : ' Consulta ML somente leitura, primeiros 50 resultados; não envia respostas.'}
        {saved.length>=250 ? ' O histórico local foi limitado aos 250 registros recentes.' : ''}
      </p>
      {problem && <div role="alert" className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800"><AlertTriangle className="h-4 w-4 shrink-0"/>{problem}</div>}
      <div className="mt-4 flex flex-wrap gap-2">
        {([
          ['all','Todas'],['attention','Precisam de atenção'],['responded','Respondidas']
        ] as const).map(([id,label])=>(
          <button type="button" key={id} onClick={()=>setFilter(id)}
            className={`rounded-full border px-3 py-1.5 text-[11px] font-bold ${filter===id?'border-violet-700 bg-violet-700 text-white':'border-slate-200 text-slate-600'}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="mt-3 max-h-[580px] space-y-2 overflow-y-auto">
        {!visible.length ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Nenhuma pergunta nesta categoria.</p> :
          visible.map(q=>(
            <article key={q.id} className="rounded-xl border border-slate-100 p-3">
              <div className="flex flex-wrap justify-between gap-2 text-[11px] font-bold text-slate-500">
                <span>{q.title || q.itemId || 'Anúncio'} · {intent(q.question)} (estimado)</span>
                <span>{fmt(q.createdAt)} · {normalizedStatus(q)==='attention'?'ATENÇÃO':normalizedStatus(q)==='responded'?'RESPONDIDA':q.status.toUpperCase()}</span>
              </div>
              <p className="mt-1 text-sm font-semibold text-slate-800">{q.question || 'Texto não disponível'}</p>
              {!!q.answer && <p className="mt-2 text-xs leading-5 text-slate-500">Resposta registrada: {q.answer}</p>}
            </article>
          ))}
      </div>
      <p className="mt-3 text-[11px] text-slate-500">
        Perguntas e pedidos são apresentados separadamente. Não há atribuição confiável de conversão entre eles.
      </p>
      <FuncionarIAMLOrdersPreview companyId={companyId} />
    </section>
  );
}
