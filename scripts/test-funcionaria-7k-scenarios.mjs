import assert from 'node:assert/strict';

// Cenários sintéticos: verificam as propriedades esperadas do contrato 7K.
// Não acessam provedores, banco, clientes ou saldos reais.
const cents = value => {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('invalid_cents');
  return value;
};
function breakdown({merchandise, deliveryCharge=0, deliveryCost=0, providerFee=0, mode='commission'}) {
  [merchandise,deliveryCharge,deliveryCost,providerFee].forEach(cents);
  if(mode==='monthly_direct')return {gross:merchandise+deliveryCharge,commission:0,balanceCredit:0,providerFee,mode};
  if(mode!=='commission')throw new Error('invalid_mode');
  if(providerFee>merchandise)throw new Error('provider_fee_exceeds_merchandise');
  const commission=Math.floor((merchandise*500)/10000+0.5); // SQL round() positive
  const net=merchandise-commission-providerFee;
  if(net<0)throw new Error('negative_merchant_net');
  return {gross:merchandise+deliveryCharge,commission,balanceCredit:net,
    margin:commission+Math.max(0,deliveryCharge-deliveryCost),providerFee,mode};
}
function createHarness() {
  const records=new Map(),stockDebits=new Map(),balances=new Map();
  function settle(input) {
    const {orderId,companyId,provider,ref,mode,evidence,paid=true}=input;
    const existing=records.get(orderId);
    if(existing){
      if(existing.provider!==provider || existing.ref!==ref)
        throw new Error('settlement_evidence_conflict');
      return {duplicate:true,...existing};
    }
    if(!paid)throw new Error('payment_not_confirmed');
    if(!evidence || evidence.companyId!==companyId || evidence.orderId!==orderId ||
       evidence.provider!==provider || evidence.ref!==ref || evidence.status!=='confirmed' ||
       evidence.amountCents!==input.amountCents)throw new Error('evidence_mismatch');
    const parts=breakdown({merchandise:input.merchandise,
      deliveryCharge:input.deliveryCharge||0,
      deliveryCost:input.deliveryCost||0,
      providerFee:input.providerFee||0,mode});
    if(parts.gross!==input.amountCents)throw new Error('total_breakdown_mismatch');
    const record={orderId,companyId,provider,ref,mode,...parts};
    records.set(orderId,record);
    balances.set(companyId,(balances.get(companyId)||0)+parts.balanceCredit);
    stockDebits.set(orderId,(stockDebits.get(orderId)||0)+1);
    return {duplicate:false,...record};
  }
  return {settle,records,stockDebits,balances};
}
function evidence(input){return {companyId:input.companyId,orderId:input.orderId,
  provider:input.provider,ref:input.ref,status:'confirmed',amountCents:input.amountCents}}
const sample={companyId:'company-a',orderId:'order-1',provider:'inter_bigcorps',ref:'tx-ok',
  mode:'commission',amountCents:10000,merchandise:10000,providerFee:98};
sample.evidence=evidence(sample);
const h=createHarness();
const paid=h.settle(sample);
assert.equal(paid.duplicate,false);
assert.equal(paid.commission,500);
assert.equal(paid.balanceCredit,9402);
assert.equal(h.stockDebits.get('order-1'),1);
assert.equal(h.balances.get('company-a'),9402);
assert.equal(h.settle(sample).duplicate,true);
assert.equal(h.stockDebits.get('order-1'),1);
assert.equal(h.balances.get('company-a'),9402);

const direct={...sample,orderId:'order-2',provider:'mercadopago_direct',ref:'mp-2',
  mode:'monthly_direct',providerFee:175};
direct.evidence=evidence(direct);
const result=h.settle(direct);
assert.equal(result.commission,0);
assert.equal(result.balanceCredit,0);
assert.equal(h.balances.get('company-a'),9402);
assert.equal(h.stockDebits.get('order-2'),1);
assert.equal(h.settle(direct).duplicate,true);
assert.equal(h.stockDebits.get('order-2'),1);

for(const altered of [
  {...direct,orderId:'order-3',evidence:{...direct.evidence,orderId:'order-3',amountCents:9999}},
  {...direct,orderId:'order-4',evidence:{...direct.evidence,orderId:'order-4',companyId:'company-b'}},
  {...direct,orderId:'order-5',evidence:{...direct.evidence,orderId:'order-5',status:'pending'}},
  {...direct,orderId:'order-6',paid:false,evidence:{...direct.evidence,orderId:'order-6'}},
]){
  assert.throws(()=>h.settle(altered),/evidence_mismatch|payment_not_confirmed/);
}
assert.throws(()=>h.settle({...direct,ref:'conflict'}),/settlement_evidence_conflict/);
assert.equal(h.records.size,2);
assert.equal(h.stockDebits.size,2);
assert.equal(breakdown({merchandise:101,mode:'commission'}).commission,5);
assert.equal(breakdown({merchandise:110,mode:'commission'}).commission,6);
assert.equal(breakdown({merchandise:10000,deliveryCharge:3000,deliveryCost:2000,providerFee:300}).margin,1500);
assert.equal(breakdown({merchandise:10000,deliveryCharge:3000,deliveryCost:2000,providerFee:300}).balanceCredit,9200);
assert.throws(()=>breakdown({merchandise:100,providerFee:101}),/provider_fee_exceeds_merchandise/);

// Cancelamento: não tratar comprovante pendente ou pagamento confirmado como pedido cancelável.
const mayCancel=(checkout,providerStatus)=>checkout==='aguardando_pagamento' &&
  (providerStatus==='cancelled'||providerStatus==='canceled');
assert.equal(mayCancel('aguardando_pagamento','cancelled'),true);
assert.equal(mayCancel('pago','cancelled'),false);
assert.equal(mayCancel('aguardando_pagamento','approved'),false);
assert.equal(mayCancel('aguardando_pagamento','pending'),false);

// Despacho: nunca abrir segundo pedido se provedor criou ou resultado ficou incerto.
function deliveryDecision({paid,requested,state,orderId}){
  if(orderId)return 'already_created';
  if(!requested)return 'delivery_not_requested';
  if(!paid)return 'payment_not_confirmed';
  if(state==='uncertain')return 'dispatch_uncertain';
  if(state==='creating')return 'dispatch_in_progress';
  return 'create';
}
assert.equal(deliveryDecision({paid:true,requested:true,state:'ready'}),'create');
assert.equal(deliveryDecision({paid:false,requested:true,state:'ready'}),'payment_not_confirmed');
assert.equal(deliveryDecision({paid:true,requested:true,state:'uncertain'}),'dispatch_uncertain');
assert.equal(deliveryDecision({paid:true,requested:true,state:'creating'}),'dispatch_in_progress');
assert.equal(deliveryDecision({paid:true,requested:true,state:'created',orderId:'ll-1'}),'already_created');
assert.equal(deliveryDecision({paid:true,requested:false,state:'ready'}),'delivery_not_requested');

console.log('FuncionarIA 7K: synthetic finance, replay, cancellation, stock and delivery scenarios PASS');
