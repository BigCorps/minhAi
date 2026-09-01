'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { LockKeyhole } from 'lucide-react';
import { useFuncionarIAState } from '@/components/funcionaria/FuncionarIADashboardShell';
import { FUNCIONARIA_MODULES } from '@/lib/funcionaria-skills';
import { FAQManagerClient } from '@/components/FAQManager';
import { FuncionarIAChannelsPanel } from '@/components/funcionaria/channels/FuncionarIAChannelsPanel';
import FuncionarIAMercadoLivrePanel from '@/components/funcionaria/channels/FuncionarIAMercadoLivrePanel';
import FuncionarIACreditsPanel from '@/components/funcionaria/credits/FuncionarIACreditsPanel';
import FuncionarIASkillsManager from '@/components/funcionaria/billing/FuncionarIASkillsManager';
import FuncionarIAProductsPanel from '@/components/funcionaria/management/FuncionarIAProductsPanel';
import FuncionarIAOrdersPanel from '@/components/funcionaria/management/FuncionarIAOrdersPanel';
import FuncionarIACashierPanel from '@/components/funcionaria/management/FuncionarIACashierPanel';
import FuncionarIAReceivablesPanel from '@/components/funcionaria/management/FuncionarIAReceivablesPanel';
import { GerarFilaConfigForm } from '@/components/dashboard/functions/GerarFilaConfigModal';
import AgendaClient from '@/app/dashboard/agenda/AgendaClient';
import FiscalPage from '@/app/dashboard/fiscal/page';
export default function Page(){const p=useParams<{module:string}>();const key=String(p.module||'');const {state,loading}=useFuncionarIAState();if(loading)return <div className="py-16 text-center text-sm font-bold text-slate-400">Carregando…</div>;
 if(key==='habilidades')return <Wrap t="Habilidades" s="Escolha o que sua FuncionarIA sabe fazer. O preço aparece na revisão e o painel cresce somente depois da contratação."><FuncionarIASkillsManager/></Wrap>;
 if(key==='conta')return <Wrap t="Conta e Créditos" s="Créditos são usados apenas quando existe custo variável: IA, voz, WhatsApp, SMS ou serviços externos.">{state.company?.id?<FuncionarIACreditsPanel companyId={state.company.id}/>:null}</Wrap>;
 if(!FUNCIONARIA_MODULES[key]||!state.active_modules.includes(key))return <Locked/>; if(!state.company)return null;
 if(key==='atendimentos')return <Wrap t="Respostas da sua FuncionarIA" s="FAQ e respostas rápidas são tentadas antes de qualquer IA."><FAQManagerClient companyId={state.company.id} isDark={false}/></Wrap>;
 if(key==='canais')return <Wrap t="Instagram e Facebook" s="A mesma conexão Meta da minhAi, simplificada para as habilidades contratadas."><FuncionarIAChannelsPanel mode="meta"/></Wrap>;
 if(key==='whatsapp')return <Wrap t="WhatsApp" s="Escolha entre direcionar, atender no WhatsApp ou usar o modo híbrido."><FuncionarIAChannelsPanel mode="whatsapp"/></Wrap>;
 if(key==='mercado_livre')return <Wrap t="Mercado Livre" s="FAQ e dados do anúncio vêm antes da IA."><FuncionarIAMercadoLivrePanel/></Wrap>;
 if(key==='fila')return <Wrap t="Fila & Atendimento" s="O mesmo motor de fila já maduro da minhAi, agora como habilidade da FuncionarIA."><div className="overflow-hidden rounded-3xl border bg-white"><GerarFilaConfigForm companyId={state.company.id}/></div></Wrap>;
 if(key==='agenda')return <Wrap t="Agenda & Reservas" s="Agenda e disponibilidade já existentes na minhAi."><AgendaClient/></Wrap>;
 if(key==='produtos')return <Wrap t="Produtos" s="Catálogo e estoque, sem expor módulos não contratados."><FuncionarIAProductsPanel companyId={state.company.id}/></Wrap>;
 if(key==='pedidos')return <Wrap t="Pedidos" s="Acompanhe pedidos presenciais e online."><FuncionarIAOrdersPanel companyId={state.company.id}/></Wrap>;
 if(key==='caixa')return <Wrap t="Caixa & Cobrança" s="Código/QR, Pix, cartão, dinheiro assistido e comprovante."><FuncionarIACashierPanel companyId={state.company.id}/></Wrap>;
 if(key==='recebimentos')return <Wrap t="Recebimentos" s="Pagamentos, dinheiro aguardando confirmação e comprovantes."><FuncionarIAReceivablesPanel companyId={state.company.id} slug={state.company.slug}/></Wrap>;
 if(key==='fiscal')return <Wrap t="Notas Fiscais" s="Reaproveita integralmente o módulo fiscal já existente na minhAi."><FiscalPage/></Wrap>; return <Locked/>}
function Wrap({t,s,children}:{t:string;s:string;children:React.ReactNode}){return <div><div className="text-xs font-black uppercase tracking-[.18em] text-[#6D28D9]">FuncionarIA</div><h1 className="mt-2 text-3xl font-black">{t}</h1><p className="mb-7 mt-2 max-w-3xl text-sm leading-6 text-slate-500">{s}</p>{children}</div>}
function Locked(){return <div className="mx-auto mt-12 max-w-xl rounded-3xl border border-amber-200 bg-white p-8 text-center"><LockKeyhole className="mx-auto h-9 w-9 text-amber-500"/><h1 className="mt-4 text-2xl font-black">Habilidade não contratada</h1><p className="mt-2 text-sm text-slate-500">Este módulo só aparece quando a habilidade correspondente está ativa.</p><Link href="/dashboard/habilidades" className="mt-6 inline-flex rounded-xl bg-[#6D28D9] px-5 py-3 text-sm font-black text-white">Ver habilidades</Link></div>}
