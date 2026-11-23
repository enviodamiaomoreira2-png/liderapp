'use client';
import {useEffect,useMemo,useState} from 'react';
import type {FormEvent} from 'react';
import {ArrowLeft,ArrowRight,BadgeCheck,Banknote,CalendarDays,Check,CheckCircle2,ChevronLeft,ChevronRight,CircleAlert,Clock,FilePlus2,Plus,RefreshCw,Search,Settings2,Trash2,Wallet,X} from 'lucide-react';
import {supabase} from '@/lib/supabase';
import {currency,dealDay,currentSaoPauloDay} from './crm/types';

type Deal={id:string;title:string;status:'open'|'won'|'lost';organization_id:string|null;person_id:string|null;won_at:string|null;monthly_value:number;billing_day:number|null;billing_start_month:string|null};
type Org={id:string;name:string};
type Person={id:string;name:string};
type Charge={id:string;user_id:string;deal_id:string;reference_month:string;due_on:string;amount:number;notes:string|null};
type Payment={id:string;deal_id:string;reference_month:string;paid_at:string;amount:number;notes:string|null};
type Row={deal_id:string;reference_month:string;due_on:string;amount:number;id:string|null;synthetic:boolean;payment:Payment|null};
type Filter='all'|'pending'|'late'|'partial'|'paid';
const round=(v:number)=>Math.round((Number(v)||0)*100)/100;
const money=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(round(v));
const monthKey=(date:string)=>date.slice(0,7)+'-01';
const dateDisplay=(day:string)=>day?new Date(day+'T12:00:00-03:00').toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}):'—';
const monthDisplay=(day:string)=>new Date(day+'T12:00:00-03:00').toLocaleDateString('pt-BR',{month:'long',year:'numeric',timeZone:'America/Sao_Paulo'});
const shift=(iso:string,steps:number)=>{const y=Number(iso.slice(0,4)),m=Number(iso.slice(5,7));const d=new Date(Date.UTC(y,m-1+steps,1,12));return d.toISOString().slice(0,7)+'-01'};
const statusFor=(r:Row,today:string)=>r.payment&&Number(r.payment.amount)>=Number(r.amount)?'paid':r.payment?'partial':r.due_on<today?'late':'pending';
const labels:Record<Filter,string>={all:'Todas',pending:'Pendentes',late:'Atrasadas',partial:'Parciais',paid:'Pagas'};
const value=(v:string)=>Number.isFinite(Number(v))?Number(v):0;
const initialBilling={value:'',day:'',start:''};
const initialCharge={deal_id:'',reference_month:'',due_on:'',amount:'',notes:''};

export default function FinanceiroWorkspace({userId,onMetricsChanged}:{userId:string;onMetricsChanged:()=>void}){
 const today=currentSaoPauloDay();
 const [month,setMonth]=useState(monthKey(today));
 const [deals,setDeals]=useState<Deal[]>([]),[orgs,setOrgs]=useState<Org[]>([]),[people,setPeople]=useState<Person[]>([]);
 const [charges,setCharges]=useState<Charge[]>([]),[payments,setPayments]=useState<Payment[]>([]);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const [query,setQuery]=useState(''),[filter,setFilter]=useState<Filter>('all');
 const [termsDeal,setTermsDeal]=useState<Deal|null>(null),[terms,setTerms]=useState({...initialBilling});
 const [invoice,setInvoice]=useState<Charge|null|'new'>(null),[invoiceForm,setInvoiceForm]=useState({...initialCharge});
 const [payRow,setPayRow]=useState<Row|null>(null),[paidAmount,setPaidAmount]=useState(''),[paidDate,setPaidDate]=useState(today),[paidNotes,setPaidNotes]=useState('');
 const name=(d:Deal)=>orgs.find(o=>o.id===d.organization_id)?.name||people.find(p=>p.id===d.person_id)?.name||d.title;
 const deal=(id:string)=>deals.find(d=>d.id===id);
 const refresh=async()=>{
  if(!supabase)return;
  setLoading(true);
  const [a,b,c,d,e]=await Promise.all([
   supabase.from('crm_deals').select('id,title,status,organization_id,person_id,won_at,monthly_value,billing_day,billing_start_month').eq('user_id',userId).order('created_at',{ascending:false}),
   supabase.from('crm_organizations').select('id,name').eq('user_id',userId),
   supabase.from('crm_people').select('id,name').eq('user_id',userId),
   supabase.from('crm_recurring_charges').select('*').eq('user_id',userId).order('due_on'),
   supabase.from('crm_recurring_payments').select('id,deal_id,reference_month,paid_at,amount,notes').eq('user_id',userId).order('paid_at')
  ]);
  const error=a.error||b.error||c.error||d.error||e.error;
  if(error)setNotice('Não foi possível carregar os dados financeiros: '+error.message);
  else{setDeals((a.data||[]) as Deal[]);setOrgs((b.data||[]) as Org[]);setPeople((c.data||[]) as Person[]);setCharges((d.data||[]) as Charge[]);setPayments((e.data||[]) as Payment[])}
  setLoading(false);
 };
 useEffect(()=>{void refresh()},[userId]);
 const updated=async()=>{await refresh();onMetricsChanged()};
 const rows=useMemo(()=>{
  const payMap=new Map(payments.map(p=>[p.deal_id+'|'+p.reference_month,p]));
  const registered:Row[]=charges.filter(c=>c.reference_month===month).map(c=>({id:c.id,deal_id:c.deal_id,reference_month:c.reference_month,due_on:c.due_on,amount:Number(c.amount),synthetic:false,payment:payMap.get(c.deal_id+'|'+c.reference_month)||null}));
  const seen=new Set(registered.map(x=>x.deal_id+'|'+x.reference_month));
  // Keep legacy received installments visible, even when entered from a deal without an invoice.
  for(const p of payments.filter(p=>p.reference_month===month))if(!seen.has(p.deal_id+'|'+p.reference_month)){
   registered.push({id:null,deal_id:p.deal_id,reference_month:p.reference_month,due_on:p.paid_at,amount:Number(p.amount),synthetic:true,payment:p});
  }
  return registered.sort((a,b)=>a.due_on.localeCompare(b.due_on)||((deal(a.deal_id)?.title||'').localeCompare(deal(b.deal_id)?.title||'')));
 },[charges,payments,month,deals]);
 const filtered=rows.filter(r=>(filter==='all'||statusFor(r,today)===filter)&&([deal(r.deal_id)?.title,name(deal(r.deal_id)||{id:'',title:'',status:'open',organization_id:null,person_id:null,won_at:null,monthly_value:0,billing_day:null,billing_start_month:null})].some(x=>(x||'').toLowerCase().includes(query.toLowerCase()))));
 const receiptMonth=payments.filter(p=>p.paid_at.slice(0,7)===month.slice(0,7));
 const paidTotal=receiptMonth.reduce((sum,p)=>sum+Number(p.amount),0);
 const firstByDeal=new Map<string,Payment>();
 for(const p of [...payments].sort((a,b)=>a.paid_at.localeCompare(b.paid_at)||a.reference_month.localeCompare(b.reference_month)))if(!firstByDeal.has(p.deal_id))firstByDeal.set(p.deal_id,p);
 const newMRR=[...firstByDeal.values()].filter(p=>p.paid_at.slice(0,7)===month.slice(0,7)).reduce((s,p)=>s+Number(p.amount),0);
 const dueAmount=rows.filter(r=>statusFor(r,today)!=='paid').reduce((s,r)=>s+Math.max(0,Number(r.amount)-Number(r.payment?.amount||0)),0);
 const lateAmount=rows.filter(r=>statusFor(r,today)==='late').reduce((s,r)=>s+Number(r.amount),0);
 const active=deals.filter(d=>d.status==='won'&&Number(d.monthly_value)>0);
 const unconfigured=active.filter(d=>!d.billing_day||!d.billing_start_month);
 const openTerms=(d:Deal)=>{setTermsDeal(d);setTerms({value:String(Number(d.monthly_value)||''),day:d.billing_day?String(d.billing_day):'',start:d.billing_start_month?.slice(0,7)||''})};
 const saveTerms=async(e:FormEvent)=>{
  e.preventDefault();if(!supabase||!termsDeal)return;
  const amount=value(terms.value),day=Number(terms.day);
  if(!Number.isFinite(amount)||amount<0||!Number.isInteger(day)||day<1||day>28||!terms.start){setNotice('Preencha mensalidade, dia de vencimento (1 a 28) e mês de início.');return}
  setBusy(true);const {error}=await supabase.from('crm_deals').update({monthly_value:amount,billing_day:day,billing_start_month:terms.start+'-01',updated_at:new Date().toISOString()}).eq('id',termsDeal.id).eq('user_id',userId);
  setBusy(false);if(error){setNotice(error.message);return}setTermsDeal(null);setNotice('Condições de cobrança atualizadas.');await updated();
 };
 const generate=async()=>{
  if(!supabase||busy)return;
  const eligible=active.filter(d=>d.billing_day&&d.billing_start_month&&month>=d.billing_start_month);
  if(!eligible.length){setNotice('Nenhum contrato elegível. Configure mensalidade, vencimento e mês inicial antes de gerar cobranças.');return}
  const fresh=eligible.filter(d=>!charges.some(c=>c.deal_id===d.id&&c.reference_month===month)&&!payments.some(p=>p.deal_id===d.id&&p.reference_month===month));
  if(!fresh.length){setNotice('Todas as cobranças deste mês já existem ou já foram pagas.');return}
  setBusy(true);
  const entries=fresh.map(d=>({user_id:userId,deal_id:d.id,reference_month:month,due_on:month.slice(0,8)+String(d.billing_day).padStart(2,'0'),amount:round(Number(d.monthly_value))}));
  const {error}=await supabase.from('crm_recurring_charges').upsert(entries,{onConflict:'user_id,deal_id,reference_month',ignoreDuplicates:true});
  setBusy(false);
  if(error){setNotice('Não foi possível gerar as cobranças: '+error.message);return}
  setNotice(fresh.length+' cobrança(s) criada(s) para '+monthDisplay(month)+'. Nenhum pagamento foi registrado automaticamente.');await updated();
 };
 const newCharge=()=>{
  setInvoice('new');setInvoiceForm({...initialCharge,reference_month:month.slice(0,7),due_on:month.slice(0,8)+'10'});
 };
 const editCharge=(row:Row)=>{
  if(!row.id){setNotice('Pagamento sem cobrança correspondente. Registre a cobrança para editar o vencimento.');return}
  const charge=charges.find(c=>c.id===row.id);if(!charge)return;
  setInvoice(charge);setInvoiceForm({deal_id:charge.deal_id,reference_month:charge.reference_month.slice(0,7),due_on:charge.due_on,amount:String(charge.amount),notes:charge.notes||''});
 };
 const saveCharge=async(e:FormEvent)=>{
  e.preventDefault();if(!supabase||!invoice)return;
  const amount=value(invoiceForm.amount),monthKeyValue=invoiceForm.reference_month+'-01';
  if(!invoiceForm.deal_id||!invoiceForm.reference_month||!invoiceForm.due_on||!Number.isFinite(amount)||amount<=0){setNotice('Informe cliente, mês, vencimento e valor válido.');return}
  if(!deals.some(d=>d.id===invoiceForm.deal_id&&d.status==='won')){setNotice('Escolha um negócio ganho.');return}
  if(invoiceForm.due_on.slice(0,7)!==invoiceForm.reference_month){setNotice('O vencimento deve estar no mês de referência.');return}
  const other=charges.some(c=>c.deal_id===invoiceForm.deal_id&&c.reference_month===monthKeyValue&&(invoice==='new'||c.id!==invoice.id));
  if(other){setNotice('Já existe cobrança para esse cliente no mês. Abra-a para editar.');return}
  setBusy(true);
  const payload={user_id:userId,deal_id:invoiceForm.deal_id,reference_month:monthKeyValue,due_on:invoiceForm.due_on,amount:round(amount),notes:invoiceForm.notes||null,updated_at:new Date().toISOString()};
  const {error}=invoice==='new'?await supabase.from('crm_recurring_charges').insert(payload):await supabase.from('crm_recurring_charges').update(payload).eq('id',invoice.id).eq('user_id',userId);
  setBusy(false);if(error){setNotice(error.message);return}
  setInvoice(null);setNotice('Cobrança salva. O pagamento continua pendente até confirmação.');await updated();
 };
 const deleteCharge=async(c:Charge)=>{
  if(!supabase||payments.some(p=>p.deal_id===c.deal_id&&p.reference_month===c.reference_month)){setNotice('Exclua primeiro o pagamento registrado, se precisar remover esta cobrança.');return}
  if(!window.confirm('Excluir esta cobrança?'))return;
  const {error}=await supabase.from('crm_recurring_charges').delete().eq('id',c.id).eq('user_id',userId);
  if(error){setNotice(error.message);return}setInvoice(null);await updated();
 };
 const openPayment=(r:Row)=>{setPayRow(r);setPaidAmount(r.payment?String(r.payment.amount):String(r.amount));setPaidDate(r.payment?.paid_at||today);setPaidNotes(r.payment?.notes||'')};
 const savePayment=async(e:FormEvent)=>{
  e.preventDefault();if(!supabase||!payRow||busy)return;
  const amount=value(paidAmount);
  if(!Number.isFinite(amount)||amount<=0||!paidDate||paidDate>today){setNotice('Informe valor recebido e data de pagamento válida (não futura).');return}
  setBusy(true);
  const {error}=await supabase.from('crm_recurring_payments').upsert({user_id:userId,deal_id:payRow.deal_id,reference_month:payRow.reference_month,paid_at:paidDate,amount:round(amount),notes:paidNotes||null,updated_at:new Date().toISOString()},{onConflict:'user_id,deal_id,reference_month'});
  setBusy(false);if(error){setNotice(error.message);return}
  setPayRow(null);setNotice('Recebimento confirmado; os indicadores foram atualizados.');await updated();
 };
 const reversePayment=async(r:Row)=>{
  if(!supabase||!r.payment||!window.confirm('Estornar o registro de pagamento? O faturamento e o MRR recebido serão recalculados.'))return;
  const {error}=await supabase.from('crm_recurring_payments').delete().eq('id',r.payment.id).eq('user_id',userId);
  if(error){setNotice(error.message);return}setNotice('Pagamento estornado.');await updated();
 };
 const inMoney=(n:number)=>money(n);
 return <div className="fin-root">
  <div className="fin-header"><div><span className="fin-eyebrow">FINANCEIRO / RECEBÍVEIS</span><h1>Financeiro</h1><p>Controle mensal das cobranças, vencimentos e pagamentos realmente recebidos.</p></div><div className="fin-actions"><button className="fin-button secondary" onClick={()=>void refresh()}><RefreshCw size={16}/> Atualizar</button><button className="fin-button secondary" onClick={newCharge}><FilePlus2 size={17}/> Nova cobrança</button><button className="fin-button primary" onClick={()=>void generate()} disabled={busy}><Plus size={17}/> Gerar cobranças</button></div></div>
  {notice&&<div role="status" className="fin-notice"><span>{notice}</span><button onClick={()=>setNotice('')} aria-label="Fechar aviso"><X size={16}/></button></div>}
  <div className="fin-month"><button onClick={()=>setMonth(m=>shift(m,-1))} title="Mês anterior"><ChevronLeft size={20}/></button><label><CalendarDays size={18}/><input aria-label="Selecionar mês financeiro" type="month" value={month.slice(0,7)} onChange={e=>{if(e.target.value)setMonth(e.target.value+'-01')}}/></label><button onClick={()=>setMonth(m=>shift(m,1))} title="Próximo mês"><ChevronRight size={20}/></button><span>{monthDisplay(month)}</span></div>
  {loading?<div className="fin-loading">Carregando recebíveis...</div>:<>
   <div className="fin-kpis">
    <div><small>MRR recebido</small><strong>{inMoney(paidTotal)}</strong><span>Pagamentos confirmados neste mês</span></div>
    <div><small>Novo MRR recebido</small><strong>{inMoney(newMRR)}</strong><span>Primeiro pagamento de cada cliente</span></div>
    <div><small>Em aberto (referência)</small><strong>{inMoney(dueAmount)}</strong><span>Cobranças ainda não quitadas</span></div>
    <div><small>Em atraso</small><strong className="fin-red">{inMoney(lateAmount)}</strong><span>Cobranças vencidas sem pagamento</span></div>
   </div>
   {active.length>0&&<div className="fin-setup"><div><b><Settings2 size={18}/> Contratos recorrentes</b><p>Configure mensalidade, dia de vencimento e mês inicial antes de gerar as cobranças. Nenhuma cobrança ou pagamento é inventado.</p></div><div className="fin-contract-list">{active.map(d=><button key={d.id} className="fin-contract" onClick={()=>openTerms(d)}><span><b>{d.title}</b><small>{name(d)}</small></span><span><b>{currency(Number(d.monthly_value))}/mês</b><small>{d.billing_day&&d.billing_start_month?'Dia '+d.billing_day+' · início '+d.billing_start_month.slice(0,7):'Configurar vencimento'}</small></span><Settings2 size={16}/></button>)}</div></div>}
   {!active.length&&<div className="fin-empty-contract"><CircleAlert size={20}/><span>Seus negócios ganhos ainda não têm mensalidades contratadas. Abra um negócio no <b>Comercial</b>, informe a mensalidade e configure a cobrança aqui. Nenhum valor será criado automaticamente.</span></div>}
   <div className="fin-section-head"><div><h2>Cobranças de {monthDisplay(month)}</h2><p>O recebimento é contabilizado no dia do pagamento; o vencimento determina a situação da cobrança.</p></div><div className="fin-filter"><div className="fin-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar cliente..." aria-label="Buscar cliente"/></div><select aria-label="Filtrar status de cobranças" value={filter} onChange={e=>setFilter(e.target.value as Filter)}>{(Object.keys(labels) as Filter[]).map(k=><option key={k} value={k}>{labels[k]}</option>)}</select></div></div>
   {filtered.length?<div className="fin-table-wrap"><table className="fin-table"><thead><tr><th>Cliente / negociação</th><th>Vencimento</th><th>Previsto</th><th>Recebido</th><th>Status</th><th>Ação</th></tr></thead><tbody>{filtered.map(r=>{const d=deal(r.deal_id),state=statusFor(r,today);return <tr key={r.deal_id+'|'+r.reference_month}><td><b>{d?.title||'Negócio removido'}</b><small>{d?name(d):''}</small>{r.synthetic&&<small>Pagamento anterior, sem cobrança gerada</small>}</td><td>{dateDisplay(r.due_on)}</td><td>{inMoney(r.amount)}</td><td>{r.payment?inMoney(Number(r.payment.amount)):'—'}</td><td><span className={'fin-status '+state}>{state==='paid'?'Pago':state==='late'?'Atrasado':state==='partial'?'Parcial':'Pendente'}</span></td><td><div className="fin-row-actions">{state!=='paid'?<button className="fin-button success small" onClick={()=>openPayment(r)}><Check size={15}/> Recebido</button>:<button className="fin-button secondary small" onClick={()=>openPayment(r)}>Ver pagamento</button>}{!r.synthetic&&<button title="Editar cobrança" className="fin-icon" onClick={()=>editCharge(r)}><Settings2 size={16}/></button>}{r.payment&&<button title="Estornar pagamento" className="fin-icon danger" onClick={()=>void reversePayment(r)}><RefreshCw size={16}/></button>}</div></td></tr>})}</tbody></table></div>:<div className="fin-empty"><Wallet size={30}/><b>Nenhuma cobrança neste filtro</b><p>Você pode gerar cobranças dos contratos configurados ou cadastrar uma cobrança manualmente.</p><button className="fin-button primary" onClick={newCharge}><Plus size={16}/> Nova cobrança</button></div>}
   {unconfigured.length>0&&<p className="fin-tip">{unconfigured.length} contrato(s) com mensalidade precisam de vencimento e mês inicial para geração automática de cobranças.</p>}
  </>}
  {termsDeal&&<div className="fin-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setTermsDeal(null)}}><section className="fin-dialog" role="dialog" aria-modal="true" aria-label="Configurar mensalidade"><header><div><h2>Configurar mensalidade</h2><p>{termsDeal.title}</p></div><button onClick={()=>setTermsDeal(null)} aria-label="Fechar"><X size={19}/></button></header><form onSubmit={saveTerms}><label>Mensalidade contratada (R$)<input type="number" step=".01" min="0" required value={terms.value} onChange={e=>setTerms({...terms,value:e.target.value})}/></label><label>Dia do vencimento (1 a 28)<input type="number" min="1" max="28" required value={terms.day} onChange={e=>setTerms({...terms,day:e.target.value})}/></label><label>Primeiro mês de cobrança<input type="month" required value={terms.start} onChange={e=>setTerms({...terms,start:e.target.value})}/></label><p className="fin-footnote">Ajustar o contrato não marca mensalidades como pagas. Cobranças existentes não são alteradas automaticamente.</p><button type="submit" className="fin-button primary" disabled={busy}><Check size={17}/> Salvar condições</button></form></section></div>}
  {invoice&&<div className="fin-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setInvoice(null)}}><section className="fin-dialog" role="dialog" aria-modal="true" aria-label="Editar cobrança"><header><div><h2>{invoice==='new'?'Nova cobrança':'Editar cobrança'}</h2><p>Defina o vencimento e o valor previsto.</p></div><button onClick={()=>setInvoice(null)} aria-label="Fechar"><X size={19}/></button></header><form onSubmit={saveCharge}><label>Negócio ganho<select required value={invoiceForm.deal_id} disabled={invoice!=='new'} onChange={e=>{const d=deal(e.target.value);setInvoiceForm({...invoiceForm,deal_id:e.target.value,amount:d?String(d.monthly_value):invoiceForm.amount})}}><option value="">Selecione</option>{deals.filter(d=>d.status==='won').map(d=><option key={d.id} value={d.id}>{d.title}</option>)}</select></label><label>Mês de referência<input type="month" required disabled={invoice!=='new'} value={invoiceForm.reference_month} onChange={e=>setInvoiceForm({...invoiceForm,reference_month:e.target.value})}/></label><label>Vencimento<input type="date" required value={invoiceForm.due_on} onChange={e=>setInvoiceForm({...invoiceForm,due_on:e.target.value})}/></label><label>Valor previsto (R$)<input type="number" step=".01" min=".01" required value={invoiceForm.amount} onChange={e=>setInvoiceForm({...invoiceForm,amount:e.target.value})}/></label><label>Observações<textarea rows={3} value={invoiceForm.notes} onChange={e=>setInvoiceForm({...invoiceForm,notes:e.target.value})}/></label><div className="fin-form-actions">{invoice!=='new'&&<button type="button" className="fin-button danger" onClick={()=>void deleteCharge(invoice)}><Trash2 size={16}/> Excluir</button>}<button type="submit" className="fin-button primary" disabled={busy}><Check size={16}/> Salvar cobrança</button></div></form></section></div>}
  {payRow&&<div className="fin-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setPayRow(null)}}><section className="fin-dialog" role="dialog" aria-modal="true" aria-label="Registrar recebimento"><header><div><h2>Confirmar recebimento</h2><p>{deal(payRow.deal_id)?.title} · {monthDisplay(payRow.reference_month)}</p></div><button onClick={()=>setPayRow(null)} aria-label="Fechar"><X size={19}/></button></header><form onSubmit={savePayment}><p className="fin-footnote">O pagamento só será contabilizado depois que você confirmar. Se o valor for inferior ao previsto, a cobrança ficará como parcial.</p><label>Valor efetivamente recebido (R$)<input required type="number" step=".01" min=".01" value={paidAmount} onChange={e=>setPaidAmount(e.target.value)}/></label><label>Data do recebimento<input required type="date" max={today} value={paidDate} onChange={e=>setPaidDate(e.target.value)}/></label><label>Observações<textarea rows={3} value={paidNotes} onChange={e=>setPaidNotes(e.target.value)}/></label><button type="submit" disabled={busy} className="fin-button success"><BadgeCheck size={17}/> Confirmar pagamento</button></form></section></div>}
 </div>;
}
