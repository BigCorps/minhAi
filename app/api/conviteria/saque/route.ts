import { NextResponse, type NextRequest } from 'next/server';
import { adminConviteria } from '@/lib/conviteria/servidor';
import { cpfValido, SAQUE_MINIMO_CENTAVOS, somenteDigitos, tipoChavePix } from '@/lib/conviteria/saque';
export const runtime = 'nodejs';

async function dono(req: NextRequest, eventoId: string) {
  const token = req.headers.get('authorization')?.replace('Bearer ','');
  if (!token) return { erro:'Faça login para continuar.', status:401 as const };
  const admin = adminConviteria();
  const { data: auth } = await admin.auth.getUser(token);
  if (!auth.user) return { erro:'Sessão inválida.', status:401 as const };
  const { data: evento } = await admin.from('eventos')
    .select('id, contas!inner(user_id)').eq('id',eventoId).maybeSingle();
  const userId = (evento as any)?.contas?.user_id;
  if (!evento || userId !== auth.user.id) return { erro:'Convite não encontrado.', status:404 as const };
  return { admin };
}

export async function GET(req: NextRequest) {
  const eventoId = new URL(req.url).searchParams.get('evento')?.trim();
  if (!eventoId) return NextResponse.json({erro:'Convite não informado.'},{status:400});
  const ctx = await dono(req, eventoId);
  if ('erro' in ctx) return NextResponse.json({erro:ctx.erro},{status:ctx.status});
  const { admin } = ctx;
  const [{data:saldo},{data:recebedor},{data:repasses}] = await Promise.all([
    admin.from('evento_saldo').select('disponivel_centavos,repassado_centavos').eq('evento_id',eventoId).maybeSingle(),
    admin.from('recebedores').select('id,nome_completo,cpf,chave_pix,tipo_chave,verificado').eq('evento_id',eventoId).order('created_at').limit(1).maybeSingle(),
    admin.from('repasses').select('id,valor_centavos,status,erro,solicitado_em,concluido_em').eq('evento_id',eventoId).order('solicitado_em',{ascending:false}).limit(10)
  ]);
  return NextResponse.json({
    saldo:{disponivelCentavos:Number(saldo?.disponivel_centavos??0),repassadoCentavos:Number(saldo?.repassado_centavos??0)},
    recebedor:recebedor?{id:recebedor.id,nomeCompleto:recebedor.nome_completo,cpfFinal:String(recebedor.cpf).slice(-4),chavePix:recebedor.chave_pix,tipoChave:recebedor.tipo_chave,verificado:!!recebedor.verificado}:null,
    repasses:(repasses??[]).map((r:any)=>({id:r.id,valorCentavos:Number(r.valor_centavos),status:r.status,erro:r.erro,solicitadoEm:r.solicitado_em,concluidoEm:r.concluido_em})),
    saqueMinimoCentavos:SAQUE_MINIMO_CENTAVOS
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(()=>null);
  if (!body) return NextResponse.json({erro:'Dados inválidos.'},{status:400});
  const eventoId=String(body.eventoId??'').trim(), nomeCompleto=String(body.nomeCompleto??'').trim();
  const cpf=somenteDigitos(String(body.cpf??'')), chavePix=String(body.chavePix??'').trim();
  const valorCentavos=Math.floor(Number(body.valorCentavos??0)), tipo=tipoChavePix(chavePix);
  if (!eventoId || nomeCompleto.length<5 || !cpfValido(cpf) || !tipo || !Number.isSafeInteger(valorCentavos) || valorCentavos<SAQUE_MINIMO_CENTAVOS)
    return NextResponse.json({erro:'Confira nome, CPF, chave PIX e valor do saque.'},{status:400});

  const ctx = await dono(req, eventoId);
  if ('erro' in ctx) return NextResponse.json({erro:ctx.erro},{status:ctx.status});
  const { admin } = ctx;

  let {data:recebedor}=await admin.from('recebedores').select('id').eq('evento_id',eventoId).order('created_at').limit(1).maybeSingle();
  if (recebedor) {
    const {error}=await admin.from('recebedores').update({nome_completo:nomeCompleto,cpf,chave_pix:chavePix,tipo_chave:tipo,verificado:false,verificado_em:null}).eq('id',recebedor.id);
    if(error) return NextResponse.json({erro:'Falha ao atualizar recebedor.'},{status:500});
  } else {
    const {data,error}=await admin.from('recebedores').insert({evento_id:eventoId,papel:'anfitriao',nome_completo:nomeCompleto,cpf,chave_pix:chavePix,tipo_chave:tipo,verificado:false}).select('id').single();
    if(error||!data) return NextResponse.json({erro:'Falha ao salvar recebedor.'},{status:500});
    recebedor=data;
  }

  const {data:repasseId,error}=await admin.rpc('solicitar_repasse_evento',{p_evento_id:eventoId,p_recebedor_id:recebedor.id,p_valor_centavos:valorCentavos});
  if(error){
    if(error.message.includes('saldo_insuficiente')) return NextResponse.json({erro:'Saldo insuficiente.'},{status:409});
    if(error.message.includes('repasse_pendente')) return NextResponse.json({erro:'Já existe um saque em andamento.'},{status:409});
    return NextResponse.json({erro:'Não foi possível solicitar o saque.'},{status:500});
  }
  return NextResponse.json({ok:true,repasseId});
}
