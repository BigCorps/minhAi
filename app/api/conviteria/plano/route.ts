import { NextResponse, type NextRequest } from 'next/server';
import { adminConviteria } from '@/lib/conviteria/servidor';
import { PLANOS } from '@/lib/conviteria/precos';
import { diasRestantes, planoMensalAtivo } from '@/lib/conviteria/plano';

export const runtime = 'nodejs';

async function sessao(req: NextRequest) {
  const token=req.headers.get('authorization')?.replace('Bearer ','');
  if(!token) return {erro:'Faça login para continuar.',status:401 as const};
  const admin=adminConviteria();
  const {data:auth}=await admin.auth.getUser(token);
  if(!auth.user) return {erro:'Sessão inválida.',status:401 as const};
  const {data:conta}=await admin.from('contas').select('id,plano,plano_expira_em,email,nome').eq('user_id',auth.user.id).maybeSingle();
  return {admin,auth,conta};
}

async function reconciliar(admin:any, conta:any) {
  if(!conta) return conta;
  const {data:pendentes}=await admin.from('mensalidades').select('id,pix_transaction_id').eq('conta_id',conta.id).eq('status','pendente').order('created_at',{ascending:false}).limit(5);
  for(const m of pendentes??[]) {
    const {data:tx}=await admin.from('pix_transactions').select('status,confirmed_at,expires_at').eq('id',m.pix_transaction_id).maybeSingle();
    if(tx?.status==='confirmed') {
      await admin.from('mensalidades').update({status:'pago',pago_em:tx.confirmed_at??new Date().toISOString()}).eq('id',m.id).eq('status','pendente');
      await admin.rpc('processar_mensalidade',{p_mensalidade_id:m.id});
    } else if(tx?.expires_at && new Date(tx.expires_at).getTime()<Date.now()) {
      await admin.from('mensalidades').update({status:'expirado'}).eq('id',m.id).eq('status','pendente');
    }
  }
  const {data:atual}=await admin.from('contas').select('id,plano,plano_expira_em,email,nome').eq('id',conta.id).single();
  return atual;
}

export async function GET(req:NextRequest) {
  const ctx=await sessao(req);
  if('erro' in ctx) return NextResponse.json({erro:ctx.erro},{status:ctx.status});
  const conta=await reconciliar(ctx.admin,ctx.conta);
  const mensal=PLANOS.find(p=>p.id==='mensal')!;
  if(!conta) return NextResponse.json({plano:'avulso',ativo:false,diasRestantes:0,expiraEm:null,mensalidadeCentavos:mensal.centavos});
  return NextResponse.json({plano:conta.plano,ativo:planoMensalAtivo(conta.plano,conta.plano_expira_em),diasRestantes:diasRestantes(conta.plano_expira_em),expiraEm:conta.plano_expira_em,mensalidadeCentavos:mensal.centavos});
}

export async function POST(req:NextRequest) {
  const ctx=await sessao(req);
  if('erro' in ctx) return NextResponse.json({erro:ctx.erro},{status:ctx.status});
  const {admin,auth}=ctx;
  let conta=ctx.conta;
  if(!conta) {
    const {data,error}=await admin.from('contas').insert({user_id:auth.user.id,nome:(auth.user.user_metadata?.nome as string)??auth.user.email??'Sem nome',email:auth.user.email,plano:'avulso'}).select('id,plano,plano_expira_em,email,nome').single();
    if(error||!data) return NextResponse.json({erro:'Não foi possível preparar sua conta.'},{status:500});
    conta=data;
  }
  await reconciliar(admin,conta);
  const {data:existente}=await admin.from('mensalidades').select('id,pix_transaction_id,valor_centavos').eq('conta_id',conta.id).eq('status','pendente').order('created_at',{ascending:false}).limit(1).maybeSingle();
  if(existente) {
    const {data:tx}=await admin.from('pix_transactions').select('pix_code,expires_at,txid').eq('id',existente.pix_transaction_id).maybeSingle();
    if(tx && (!tx.expires_at || new Date(tx.expires_at).getTime()>Date.now())) return NextResponse.json({mensalidadeId:existente.id,valorCentavos:existente.valor_centavos,transactionId:existente.pix_transaction_id,txid:tx.txid,copiaECola:tx.pix_code,expiresAt:tx.expires_at});
  }
  const mensal=PLANOS.find(p=>p.id==='mensal')!;
  const r=await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/gerar-pix-assistente`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`},body:JSON.stringify({origem:'conviteria',referencia_id:conta.id,valor_centavos:mensal.centavos,descricao:'Mensalidade ConviteIA',purpose:'conviteria_mensalidade',tipo:'convite'})});
  const pix=await r.json().catch(()=>null);
  if(!r.ok||!pix?.transaction_id) return NextResponse.json({erro:'Não foi possível gerar o PIX da mensalidade.'},{status:502});
  const {data:mensalidade,error}=await admin.from('mensalidades').insert({conta_id:conta.id,pix_transaction_id:pix.transaction_id,txid:pix.txid??null,valor_centavos:mensal.centavos}).select('id').single();
  if(error||!mensalidade) return NextResponse.json({erro:'PIX gerado, mas não foi possível registrar a mensalidade.'},{status:500});
  return NextResponse.json({mensalidadeId:mensalidade.id,valorCentavos:mensal.centavos,transactionId:pix.transaction_id,txid:pix.txid,qrcode:pix.qrcode??pix.qr_code_url,copiaECola:pix.copia_e_cola??pix.pix_code,expiresAt:pix.expires_at});
}
