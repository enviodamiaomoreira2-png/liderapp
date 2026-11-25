'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Activity,ArrowRight,Bell,BriefcaseBusiness,CalendarDays,Check,CheckCheck,ChevronDown,ChevronLeft,ChevronRight,CircleCheck,ClipboardCheck,FileText,Goal,LayoutDashboard,LockKeyhole,LogOut,Menu,Plus,Settings2,Target,TrendingUp,Users,Wallet, X, Zap} from 'lucide-react';
import {ResponsiveContainer,AreaChart,Area,CartesianGrid,XAxis,YAxis,Tooltip,BarChart,Bar} from 'recharts';
import {supabase} from '@/lib/supabase';
import CRMWorkspace from '@/components/crm/CRMWorkspace';
import FinanceiroWorkspace from '@/components/FinanceiroWorkspace';
import EntregaWorkspace from '@/components/EntregaWorkspace';
import {type PeriodUnit,type DealMetric,type PaidMetric,type ManualMetric,getPeriod,stepPeriod,saoPauloDate,monthOf,startTimestamp,localDay,inWindow,groupTimeline,num} from '@/lib/periods';
import type {User} from '@supabase/supabase-js';
type GoalRow={contracts_target:number;setup_revenue_target:number;new_mrr_target:number};
type ResultRow={month:string;contracts_count:number;setup_revenue:number;new_mrr:number;leads_count:number|null;meetings_count:number|null;proposals_count:number|null;notes?:string|null};
type ActionRow={id:string;title:string;completed:boolean};
type Tab='Métricas e Metas'|'Comercial'|'Clientes'|'Atividades'|'Contratos'|'Financeiro'|'Entrega'|'Projetos'|'Equipe'|'Relatórios'|'Configurações';
const nav: {label:Tab;Icon:typeof Target}[]=[{label:'Métricas e Metas',Icon:LayoutDashboard},{label:'Comercial',Icon:Target},{label:'Clientes',Icon:Users},{label:'Atividades',Icon:CalendarDays},{label:'Contratos',Icon:FileText},{label:'Financeiro',Icon:Wallet},{label:'Entrega',Icon:ClipboardCheck},{label:'Projetos',Icon:BriefcaseBusiness},{label:'Equipe',Icon:Users},{label:'Relatórios',Icon:TrendingUp},{label:'Configurações',Icon:Settings2}];
const formatMoney=(x:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}).format(x);
const getMonth=(offset=0)=>{const d=new Date();const m=new Date(d.getFullYear(),d.getMonth()+offset,1);return monthKey(m.getFullYear(),m.getMonth())};
const monthKey=(y:number,m:number)=>y+'-'+String(m+1).padStart(2,'0')+'-01';
const previous=(month:string,n:number)=>{const [y,m]=month.split('-').map(Number);const d=new Date(y,m-1-n,1);return monthKey(d.getFullYear(),d.getMonth())};
const monthLabel=(month:string)=>new Date(month+'T12:00:00').toLocaleDateString('pt-BR',{month:'short',year:'numeric'});
const blankGoal:GoalRow={contracts_target:0,setup_revenue_target:0,new_mrr_target:0};
const blankResult=(month:string):ResultRow=>({month,contracts_count:0,setup_revenue:0,new_mrr:0,leads_count:null,meetings_count:null,proposals_count:null});
const percent=(a:number,b:number)=>b>0?Math.round(a/b*100):0;
const clampPercent=(a:number,b:number)=>Math.min(100,percent(a,b));
function Kpi({title,value,sub,Icon}:{title:string;value:string;sub:string;Icon:typeof Target}){return <div className="card kpi"><div className="kpi-top"><span className="muted">{title}</span><Icon size={22} className="purple"/></div><strong>{value}</strong><div className="kpi-bottom"><span className="dot"></span>{sub}</div></div>}
function MiniProgress({name,value,target,unit=''}:{name:string;value:number;target:number;unit?:string}){
 const configured=target>0;
 return <div className="goal-item"><div className="goal-item-top"><b>{name}</b><span>{configured?(unit==='R$'?formatMoney(value)+' / '+formatMoney(target):value+' / '+target):'Meta não definida'}</span></div><div className="progress">{configured&&<div style={{width:clampPercent(value,target)+'%'}}/>}</div><div className="goal-item-footer"><small>{!configured?'Defina uma meta para acompanhar':target>value?unit==='R$'?'Faltam '+formatMoney(target-value):'Faltam '+(target-value)+' contratos':'Meta atingida'}</small><b>{configured?percent(value,target)+'%':'—'}</b></div></div>
}
export default function Home(){
 const [user,setUser]=useState<User|null>(null),[authChecking,setAuthChecking]=useState(true),[authOpen,setAuthOpen]=useState(false),[authMode,setAuthMode]=useState<'login'|'signup'>('login'),[email,setEmail]=useState(''),[password,setPassword]=useState('');
 const [periodUnit,setPeriodUnit]=useState<PeriodUnit>('month'),[anchorDay,setAnchorDay]=useState(saoPauloDate()),[yearDraft,setYearDraft]=useState(saoPauloDate().slice(0,4));
 const month=monthOf(anchorDay);
 const period=useMemo(()=>getPeriod(periodUnit,anchorDay),[periodUnit,anchorDay]);
 const [goals,setGoals]=useState<GoalRow>(blankGoal),[result,setResult]=useState<ResultRow>(blankResult(getMonth())),[manualResult,setManualResult]=useState<ResultRow>(blankResult(getMonth())),[history,setHistory]=useState<ResultRow[]>([]),[actions,setActions]=useState<ActionRow[]>([]);
 const [monthlyGoals,setMonthlyGoals]=useState<(GoalRow&{month:string})[]>([]);
 const [monthlyManual,setMonthlyManual]=useState<ResultRow[]>([]);
 const [rawWins,setRawWins]=useState<DealMetric[]>([]);
 const [rawPayments,setRawPayments]=useState<PaidMetric[]>([]);
 const [receivedMrr,setReceivedMrr]=useState<number|null>(null),[scheduledRevenue,setScheduledRevenue]=useState<number|null>(null);
 const [hasPeriodData,setHasPeriodData]=useState(false);
 const [configuredMonths,setConfiguredMonths]=useState(0);
 const [metricsLoading,setMetricsLoading]=useState(false);
 const metricsRequestId=useRef(0);
 const [periodRevenue,setPeriodRevenue]=useState<{setup:number;paid:number;total:number}|null>(null);
 const [editOpen,setEditOpen]=useState(false),[goalDraft,setGoalDraft]=useState<GoalRow>(blankGoal),[resultDraft,setResultDraft]=useState<ResultRow>(blankResult(getMonth())),[actionText,setActionText]=useState('');
 const [activeTab,setActiveTab]=useState<Tab>('Métricas e Metas'),[sidebarOpen,setSidebarOpen]=useState(false),[sidebarHidden,setSidebarHidden]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const alert=(message:string)=>setNotice(message);
 useEffect(()=>{try{setSidebarHidden(window.localStorage.getItem('liderapp-sidebar-hidden')==='true')}catch{}},[]);
 const toggleSidebar=()=>{const next=!sidebarHidden;setSidebarHidden(next);try{window.localStorage.setItem('liderapp-sidebar-hidden',String(next))}catch{}};

 const load=useCallback(async(u:User|null,m:string)=>{
  const requestId=++metricsRequestId.current;
  if(!supabase||!u){
   setGoals(blankGoal);setHistory([]);setActions([]);setManualResult(blankResult(m));setResult(blankResult(m));
   setMonthlyGoals([]);setMonthlyManual([]);setRawWins([]);setRawPayments([]);setHasPeriodData(false);setReceivedMrr(null);setScheduledRevenue(null);
   setPeriodRevenue(null);setConfiguredMonths(0);setMetricsLoading(false);return;
  }
  setMetricsLoading(true);
  const beforeEnd=periodUnit==='all'?null:startTimestamp(period.end);
  const [goalsResponse,resultsResponse,actionsResponse]=await Promise.all([
   supabase.from('monthly_goals').select('month,contracts_target,setup_revenue_target,new_mrr_target').eq('user_id',u.id).order('month'),
   supabase.from('monthly_results').select('month,contracts_count,setup_revenue,new_mrr,leads_count,meetings_count,proposals_count,notes').eq('user_id',u.id).order('month'),
   supabase.from('action_items').select('id,title,completed').eq('user_id',u.id).eq('month',m).order('created_at',{ascending:true})
  ]);
  const firstError=goalsResponse.error||resultsResponse.error||actionsResponse.error;
  if(firstError){if(requestId===metricsRequestId.current){alert('Não foi possível consultar as métricas: '+firstError.message);setMetricsLoading(false)}return}
  // Fetch the complete historical ledger (Supabase's Data API may cap each page at 1000 rows).
  const wins:DealMetric[]=[];
  const payments:PaidMetric[]=[];
  const scheduled:{deal_id:string;reference_month:string;due_on:string;amount:number}[]=[];
  for(let offset=0;offset<1000000;offset+=1000){
   let query=supabase.from('crm_deals').select('won_at,setup_value,monthly_value').eq('user_id',u.id).eq('status','won').not('won_at','is',null).order('won_at').range(offset,offset+999);
   if(beforeEnd)query=query.lt('won_at',beforeEnd);
   const r=await query;
   if(r.error){if(requestId===metricsRequestId.current){alert('Não foi possível consultar os negócios ganhos: '+r.error.message);setMetricsLoading(false)}return}
   wins.push(...((r.data||[]) as DealMetric[]));
   if(!r.data||r.data.length<1000)break;
  }
  for(let offset=0;offset<1000000;offset+=1000){
   let query=supabase.from('crm_recurring_payments').select('deal_id,reference_month,paid_at,amount').eq('user_id',u.id).order('paid_at').range(offset,offset+999);
   if(periodUnit!=='all')query=query.lt('paid_at',period.end);
   const r=await query;
   if(r.error){if(requestId===metricsRequestId.current){alert('Não foi possível consultar as mensalidades pagas: '+r.error.message);setMetricsLoading(false)}return}
   payments.push(...((r.data||[]) as PaidMetric[]));
   if(!r.data||r.data.length<1000)break;
  }
  for(let offset=0;offset<1000000;offset+=1000){
   let query=supabase.from('crm_recurring_charges').select('deal_id,reference_month,due_on,amount').eq('user_id',u.id).order('due_on').range(offset,offset+999);
   if(periodUnit!=='all')query=query.lt('due_on',period.end);
   const r=await query;
   if(r.error){if(requestId===metricsRequestId.current){alert('Não foi possível consultar cobranças previstas: '+r.error.message);setMetricsLoading(false)}return}
   scheduled.push(...((r.data||[]) as typeof scheduled));
   if(!r.data||r.data.length<1000)break;
  }
  if(requestId!==metricsRequestId.current)return;
  const allManual=((resultsResponse.data||[]) as ResultRow[]).map(r=>({
   ...r,contracts_count:num(r.contracts_count),setup_revenue:num(r.setup_revenue),new_mrr:num(r.new_mrr)
  }));
  const allGoals=(goalsResponse.data||[]).map(r=>({month:r.month,contracts_target:num(r.contracts_target),setup_revenue_target:num(r.setup_revenue_target),new_mrr_target:num(r.new_mrr_target)}));
  setMonthlyGoals(allGoals);setMonthlyManual(allManual);setRawWins(wins);setRawPayments(payments);
  const selectedManual=periodUnit==='all'?allManual:periodUnit==='month'?allManual.filter(r=>r.month===period.start):periodUnit==='year'?allManual.filter(r=>r.month>=period.start&&r.month<period.end):[];
  const selectedWins=wins.filter(d=>inWindow(localDay(d.won_at),period));
  const selectedPayments=payments.filter(p=>inWindow(p.paid_at,period));
  const selectedCharges=scheduled.filter(c=>inWindow(c.due_on,period));
  const firstPaidByDeal=new Map<string,PaidMetric>();
  for(const payment of [...payments].sort((a,b)=>a.paid_at.localeCompare(b.paid_at)||a.reference_month.localeCompare(b.reference_month))){if(!firstPaidByDeal.has(payment.deal_id))firstPaidByDeal.set(payment.deal_id,payment)}
  const firstPaymentsInPeriod=[...firstPaidByDeal.values()].filter(p=>inWindow(p.paid_at,period));
  const firstPaidTotal=firstPaymentsInPeriod.reduce((sum,p)=>sum+num(p.amount),0);
  setReceivedMrr(selectedPayments.length?selectedPayments.reduce((sum,p)=>sum+num(p.amount),0):null);
  setScheduledRevenue(selectedCharges.length?selectedCharges.reduce((sum,c)=>sum+num(c.amount),0):null);
  const manualTotal=(field:keyof ResultRow)=>selectedManual.reduce((sum,r)=>sum+num(r[field]),0);
  const selectedResult:ResultRow={
   month:m,
   contracts_count:selectedWins.length+manualTotal('contracts_count'),
   setup_revenue:selectedWins.reduce((sum,d)=>sum+num(d.setup_value),0)+manualTotal('setup_revenue'),
   new_mrr:firstPaidTotal,
   leads_count:periodUnit==='month'&&selectedManual.length&&selectedManual[0].leads_count!==null?selectedManual[0].leads_count:null,
   meetings_count:periodUnit==='month'&&selectedManual.length&&selectedManual[0].meetings_count!==null?selectedManual[0].meetings_count:null,
   proposals_count:periodUnit==='month'&&selectedManual.length&&selectedManual[0].proposals_count!==null?selectedManual[0].proposals_count:null
  };
  if((periodUnit==='all'||(periodUnit==='year'&&selectedManual.length===12))&&selectedManual.length>0&&selectedManual.every(r=>r.leads_count!==null&&r.meetings_count!==null&&r.proposals_count!==null)){
   selectedResult.leads_count=manualTotal('leads_count');selectedResult.meetings_count=manualTotal('meetings_count');selectedResult.proposals_count=manualTotal('proposals_count');
  }
  const selectedGoalRows=periodUnit==='all'?allGoals:periodUnit==='year'?allGoals.filter(r=>r.month>=period.start&&r.month<period.end):
   periodUnit==='month'?allGoals.filter(r=>r.month===period.start):[];
  const currentGoals:GoalRow=selectedGoalRows.reduce((sum,r)=>({
   contracts_target:sum.contracts_target+r.contracts_target,
   setup_revenue_target:sum.setup_revenue_target+r.setup_revenue_target,
   new_mrr_target:sum.new_mrr_target+r.new_mrr_target
  }),{...blankGoal});
  const inSetup=selectedWins.reduce((sum,d)=>sum+num(d.setup_value),0);
  const inPaid=selectedPayments.reduce((sum,p)=>sum+num(p.amount),0);
  setPeriodRevenue(selectedWins.length||selectedPayments.length?{setup:inSetup,paid:inPaid,total:inSetup+inPaid}:null);
  setGoals(currentGoals);setConfiguredMonths(selectedGoalRows.length);
  setHasPeriodData(selectedWins.length>0||selectedPayments.length>0||selectedManual.length>0||selectedCharges.length>0);
  setManualResult(allManual.find(r=>r.month===m)||blankResult(m));
  setResult(selectedResult);setActions((actionsResponse.data||[]) as ActionRow[]);
  const monthlyMap=new Map<string,ResultRow>(allManual.map(r=>[r.month,{...r}]));
  for(const d of wins){
   const target=monthOf(localDay(d.won_at)),r=monthlyMap.get(target)||blankResult(target);
   monthlyMap.set(target,{...r,contracts_count:r.contracts_count+1,setup_revenue:r.setup_revenue+num(d.setup_value),new_mrr:r.new_mrr+num(d.monthly_value)});
  }
  setHistory(Array.from(monthlyMap.values()).sort((a,b)=>a.month.localeCompare(b.month)));
  setMetricsLoading(false);
 },[period,periodUnit]);
 useEffect(()=>{if(!supabase){setAuthChecking(false);return}supabase.auth.getUser().then(({data})=>{setUser(data.user);setAuthChecking(false)});const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>setUser(s?.user||null));return()=>subscription.unsubscribe()},[]);
 useEffect(()=>{if(!authChecking&&activeTab==='Métricas e Metas')void load(user,month)},[user,month,authChecking,load,activeTab]);
 const isLogged=!!user;
 useEffect(()=>{setYearDraft(anchorDay.slice(0,4))},[anchorDay]);
 const commitYear=()=>{const y=Number(yearDraft);if(Number.isInteger(y)&&y>=1&&y<=9998)setAnchorDay(String(y).padStart(4,'0')+anchorDay.slice(4));else setYearDraft(anchorDay.slice(0,4))};
 const choosePeriod=(unit:PeriodUnit)=>{setPeriodUnit(unit)};
 const movePeriod=(direction:number)=>setAnchorDay(day=>stepPeriod(periodUnit,day,direction));
 const jumpToday=()=>setAnchorDay(saoPauloDate());
 const saveGoal=async()=>{if(!user||!supabase){alert('Entre para salvar suas metas.');return}if(!Number.isFinite(goalDraft.contracts_target)||goalDraft.contracts_target<=0||!Number.isFinite(goalDraft.setup_revenue_target)||goalDraft.setup_revenue_target<0||!Number.isFinite(goalDraft.new_mrr_target)||goalDraft.new_mrr_target<0){alert('Informe uma meta de contratos maior que zero. Metas financeiras não podem ser negativas.');return}setBusy(true);const {error}=await supabase.from('monthly_goals').upsert({...goalDraft,user_id:user.id,month,updated_at:new Date().toISOString()},{onConflict:'user_id,month'});setBusy(false);if(error){alert(error.message);return}setEditOpen(false);alert('Metas salvas com sucesso.');await load(user,month)};
 const saveResult=async(payload=resultDraft)=>{if(!user||!supabase){alert('Entre na sua conta para salvar resultados.');setAuthOpen(true);return}setBusy(true);const{error}=await supabase.from('monthly_results').upsert({...payload,user_id:user.id,month,updated_at:new Date().toISOString()},{onConflict:'user_id,month'});setBusy(false);if(error){alert(error.message);return}setEditOpen(false);alert('Resultados gravados com sucesso.');await load(user,month)};
 const authenticate=async(e:React.FormEvent)=>{e.preventDefault();if(!supabase){alert('Supabase não está configurado.');return}setBusy(true);const{error,data}=authMode==='signup'?await supabase.auth.signUp({email,password}):await supabase.auth.signInWithPassword({email,password});setBusy(false);if(error){alert(error.message);return}if(authMode==='signup'&&!data.session){alert('Conta criada. Verifique o e-mail para confirmar o cadastro antes de entrar.');return}setAuthOpen(false);setPassword('');alert('Acesso autorizado.')};
 const addAction=async()=>{if(!user||!supabase){setAuthOpen(true);return}if(!actionText.trim())return;const{error}=await supabase.from('action_items').insert({user_id:user.id,month,title:actionText.trim()});if(error){alert(error.message);return}setActionText('');await load(user,month)};
 const toggleAction=async(a:ActionRow)=>{if(!user||!supabase)return;const{error}=await supabase.from('action_items').update({completed:!a.completed}).eq('id',a.id).eq('user_id',user.id);if(error){alert(error.message);return}await load(user,month)};
 const chart=useMemo(()=>groupTimeline(periodUnit,period,rawWins,monthlyManual),[periodUnit,period,rawWins,monthlyManual]);
 // Receipts have calendar dates, not timestamps; do not fabricate an hourly distribution.
 const receiptChart=useMemo(()=>{
  const hits=rawPayments.filter(p=>inWindow(p.paid_at,period));
  if(periodUnit==='day')return [{name:'Dia',key:period.start,mrr:hits.reduce((sum,p)=>sum+num(p.amount),0)}];
  return chart.map(slot=>{
   const key=slot.key;
   const sum=hits.filter(p=>periodUnit==='week'||periodUnit==='month'?p.paid_at===key:
    periodUnit==='year'?p.paid_at.slice(0,7)===key:
    p.paid_at.startsWith(key)).reduce((total,p)=>total+num(p.amount),0);
   return {...slot,mrr:sum};
  });
 },[chart,rawPayments,period,periodUnit]);
 const hasFunnel=result.leads_count!==null&&result.meetings_count!==null&&result.proposals_count!==null;
 const displayedMRR=receivedMrr;
 const hasResult=hasPeriodData;
 const pct=percent(result.contracts_count,goals.contracts_target);
 // Monthly targets cannot be compared with wins from months that have no target.
 const yearlyGoals=monthlyGoals.filter(g=>g.month>=period.start&&g.month<period.end);
 const comparableGoals=periodUnit==='month'
  ?monthlyGoals.some(g=>g.month===period.start&&g.contracts_target>0)
  :periodUnit==='year'&&yearlyGoals.length===12&&yearlyGoals.every(g=>g.contracts_target>0);
 const noData=!hasResult;
 // Monthly recurring estimate based on currently won deals, not cash received or an ARR conversion.
 const forecastCutoff=periodUnit==='all'?getPeriod('day',saoPauloDate()).end:period.end;
 const recurringDeals=rawWins.filter(d=>localDay(d.won_at)<forecastCutoff&&num(d.monthly_value)>0);
 const monthlyForecast=recurringDeals.reduce((sum,d)=>sum+num(d.monthly_value),0);
 const forecastSubtitle=periodUnit==='all'?'Base mensal dos contratos ganhos'
  :periodUnit==='year'?'Base mensal ao final do ano'
  :periodUnit==='month'?'Base mensal até o fim do mês'
  :'Base mensal vigente no período';
 if(authChecking)return <main className="auth-screen"><div className="auth-loading"><div className="brand-mark">Λ</div><p>Verificando sua sessão...</p></div></main>;
 if(!user)return <main className="auth-screen">
  <div className="auth-layout">
   <section className="auth-hero">
    <div className="auth-hero-brand"><div className="brand-mark">Λ</div><strong>LIDER<span>APP</span></strong></div>
    <div className="eyebrow">CENTRAL DE GESTÃO</div>
    <h1>Resultados claros.<br/><span>Decisões melhores.</span></h1>
    <p>Gerencie metas, contratos, receita e crescimento da sua agência com dados reais e acesso protegido.</p>
    <div className="auth-features"><span><Target size={20}/> Metas e resultados reais</span><span><TrendingUp size={20}/> Gráficos de performance</span><span><LockKeyhole size={20}/> Informações privadas</span></div>
   </section>
   <section className="auth-panel">
    <div className="auth-panel-mark"><LockKeyhole size={24}/></div><div className="eyebrow">ACESSO AO WORKSPACE</div>
    <h2>{authMode==='login'?'Bem-vindo de volta':'Crie sua conta'}</h2><p>{authMode==='login'?'Entre para acessar o painel da agência.':'Cadastre-se para começar a acompanhar seus resultados.'}</p>
    {notice&&<div className="auth-notice" role="status">{notice}<button onClick={()=>setNotice('')} aria-label="Fechar aviso"><X size={16}/></button></div>}
    {!supabase?<div className="auth-notice">Não foi possível conectar ao banco de dados. Verifique a configuração do Supabase.</div>:<form className="auth-gate-form" onSubmit={authenticate}>
    <label>E-mail<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="seuemail@agencia.com.br"/></label>
    <label>Senha<input type="password" autoComplete={authMode==='signup'?'new-password':'current-password'} required minLength={6} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Sua senha"/></label>
    <button className="btn purple-btn full" type="submit" disabled={busy}>{busy?'Aguarde...':authMode==='login'?'Entrar no painel':'Cadastrar e continuar'}<ArrowRight size={18}/></button>
    </form>}
    <button className="auth-switch" onClick={()=>{setNotice('');setAuthMode(authMode==='login'?'signup':'login')}}>{authMode==='login'?'Não tem uma conta? Cadastre-se':'Já tem uma conta? Entrar'}</button>
    <div className="auth-security"><LockKeyhole size={15}/> Login obrigatório para visualizar indicadores</div>
   </section>
  </div>
 </main>;
 return <div className={"app-shell"+(sidebarHidden?" sidebar-hidden":"")}>
  <aside className={'sidebar '+(sidebarOpen?'is-open':'')}>
    <div className="brand"><div className="brand-mark">Λ</div><div>LIDER<span>APP</span><small>GESTÃO DE AGÊNCIA</small></div><button className="mobile-close" onClick={()=>setSidebarOpen(false)} aria-label="Fechar menu"><X size={20}/></button></div>
    <div className="nav-title">WORKSPACE</div>
    <nav>{nav.map(({label,Icon})=><button key={label} onClick={()=>{setActiveTab(label);setSidebarOpen(false)}} className={'nav-item '+(label===activeTab?'selected':'')}><Icon size={19}/>{label}{label==='Métricas e Metas'&&<span className="selected-tiny"></span>}</button>)}</nav>
    <div className="sidebar-footer"><div className="help-box"><Zap size={18}/><b>Seu crescimento começa aqui.</b><small>Controle seus números e tome decisões melhores.</small></div><button className="profile" onClick={()=>supabase?.auth.signOut()}><div className="avatar">{user?.email?.slice(0,2).toUpperCase()||'AG'}</div><span>{user?.email?.split('@')[0]||'Minha Agência'}<small>{user?'Sair da conta':'Entrar na conta'}</small></span>{user?<LogOut size={16}/>:<ArrowRight size={16}/>}</button></div>
  </aside>
  {sidebarOpen&&<div className="backdrop" onClick={()=>setSidebarOpen(false)}/>}
  <main className="main">
   <header className="topbar">
    <div className="topbar-left">
     <button className="sidebar-toggle" onClick={toggleSidebar} aria-label={sidebarHidden?'Mostrar menu lateral':'Ocultar menu lateral'} title={sidebarHidden?'Mostrar menu lateral':'Ocultar menu lateral'} aria-expanded={!sidebarHidden}><Menu size={21}/></button>
     <button className="hamburger" onClick={()=>setSidebarOpen(true)} aria-label="Abrir menu lateral"><Menu size={21}/></button>
     <div className="breadcrumb">Visão geral <span>/</span> <b>{activeTab}</b></div>
    </div>
    <div className="topbar-right">
          {activeTab==='Métricas e Metas'&&<div className="topbar-controls">
      <div className="period-filter" aria-label="Filtro de período">
       <label className={"period-granularity"+(periodUnit==='all'?' is-all':'')} title="Agrupamento das métricas">
        <select aria-label="Tipo de período" value={periodUnit} onChange={e=>choosePeriod(e.target.value as PeriodUnit)}>
         <option value="day">Dia</option><option value="week">Semana</option><option value="month">Mês</option><option value="year">Ano</option><option value="all">Todo o período</option>
        </select><ChevronDown size={14}/>
       </label>
       {periodUnit!=='all'&&<>
       <button className="period-arrow" onClick={()=>movePeriod(-1)} aria-label="Período anterior" title="Período anterior"><ChevronLeft size={19}/></button>
       <label className="period-date-entry" title={period.label}>
        <CalendarDays size={17}/>
        {periodUnit==='year'?
          <input className="period-year-input" type="text" inputMode="numeric" maxLength={4} aria-label="Selecionar ano" value={yearDraft} onChange={e=>setYearDraft(e.target.value.replace(/\D/g,'').slice(0,4))} onBlur={commitYear} onKeyDown={e=>{if(e.key==='Enter'){e.currentTarget.blur()}}}/>:
         <input type={periodUnit==='month'?'month':'date'} aria-label={periodUnit==='month'?'Selecionar mês':'Selecionar data'} value={periodUnit==='month'?month.slice(0,7):anchorDay} onChange={e=>{const next=e.target.value;if(next)setAnchorDay(periodUnit==='month'?next+'-01':next)}}/>
        }
       </label>
       <button className="period-arrow" onClick={()=>movePeriod(1)} aria-label="Próximo período" title="Próximo período"><ChevronRight size={19}/></button>
       <button className="period-today" onClick={jumpToday}>Hoje</button>
       </>}
       <span className="period-readable" title={period.label}>{period.label}</span>
      </div>
      <button className="btn purple-btn" onClick={()=>{setGoalDraft(monthlyGoals.find(r=>r.month===month)||{...blankGoal});setResultDraft({...manualResult});setEditOpen(true)}}><Settings2 size={17}/> Gerenciar metas</button>
     </div>}
     <span className="live-indicator"><i/> Banco conectado</span>
     <button className="icon-btn" onClick={()=>alert('Suas notificações aparecerão aqui.')} aria-label="Notificações"><Bell size={19}/></button>
     <button className="avatar top-avatar" onClick={()=>supabase?.auth.signOut()} aria-label="Sair da conta" title="Sair da conta">{user?.email?.slice(0,2).toUpperCase()||'AG'}</button>
    </div>
   </header>
   <div className="page-body">
   {activeTab==='Métricas e Metas'?<>
   {metricsLoading&&<div className="metric-fetch-status" role="status"><Activity size={15}/> Atualizando indicadores para {period.label}…</div>}
   {notice&&<div className="notice"><span>{notice}</span><button onClick={()=>setNotice('')} aria-label="Fechar aviso"><X size={16}/></button></div>}
      <div className="metrics-grid"><section className="card kpi kpi-total"><div className="kpi-top"><span className="muted">Faturamento total</span><Wallet size={22} className="purple"/></div><strong>{periodRevenue?formatMoney(periodRevenue.total):'—'}</strong><div className="kpi-total-breakdown">{periodRevenue?<><span>Setups ganhos: <b>{formatMoney(periodRevenue.setup)}</b></span><span>Mensalidades pagas: <b>{formatMoney(periodRevenue.paid)}</b></span></>:'Nenhum recebimento ou setup ganho neste período'}</div><div className="kpi-total-month">Período: {period.label}</div></section><Kpi title="Contratos fechados" value={hasResult?String(result.contracts_count):'—'} sub={'No período selecionado'} Icon={FileText}/><Kpi title="Receita de implantação" value={hasResult?formatMoney(result.setup_revenue):'—'} sub="Valor contratado no período" Icon={Wallet}/><Kpi title="Novo MRR recebido" value={hasResult?formatMoney(result.new_mrr):'—'} sub="Primeira mensalidade efetivamente paga" Icon={TrendingUp}/><Kpi title="MRR recebido" value={receivedMrr!==null?formatMoney(receivedMrr):'—'} sub="Mensalidades recebidas no período" Icon={Wallet}/><Kpi title="MRR contratado" value={recurringDeals.length?formatMoney(monthlyForecast):'—'} sub={forecastSubtitle} Icon={TrendingUp}/><Kpi title="Mensalidades previstas" value={scheduledRevenue!==null?formatMoney(scheduledRevenue):'—'} sub="Cobranças com vencimento no período" Icon={CalendarDays}/></div>
   {!comparableGoals?<section className="card goals-card period-no-target"><div className="section-heading"><div className="heading-icon"><Target size={22}/></div><div>
    <h2>{periodUnit==='all'?'Metas — Todo o período':periodUnit==='year'?'Metas anuais':periodUnit==='month'?'Meta do mês não configurada':'Metas mensais'}</h2>
    <p>{periodUnit==='all'?'As metas são mensais. Não existe uma meta geral configurada; por isso, o sistema não exibe percentual acumulado.'
     :periodUnit==='year'?'Para calcular o atingimento anual corretamente, configure uma meta de contratos válida em cada um dos 12 meses. '+configuredMonths+' de 12 meses configurados.'
     :periodUnit==='month'?'Defina uma meta para '+period.label+' antes de calcular o percentual de atingimento.'
     :'As metas são mensais; uma meta do mês não é rateada artificialmente por dia ou semana.'}</p></div>
    {periodUnit==='month'?<button className="link-btn" onClick={()=>{setGoalDraft({...monthlyGoals.find(g=>g.month===month)||blankGoal});setResultDraft({...manualResult});setEditOpen(true)}}>Definir meta <ArrowRight size={15}/></button>:
    <button className="link-btn" onClick={()=>setPeriodUnit('month')}>Ver metas mensais <ArrowRight size={15}/></button>}
    </div></section>:
   <section className="card goals-card"><div className="section-heading"><div className="heading-icon"><Target size={22}/></div><div>
    <h2>{periodUnit==='year'?'Metas do ano':'Metas do mês'}</h2>
    <p>{periodUnit==='year'?'Consolidação das 12 metas mensais configuradas.':'Acompanhe seu progresso em direção aos objetivos.'}</p>
    </div><button className="link-btn" onClick={()=>{setGoalDraft({...monthlyGoals.find(g=>g.month===month)||blankGoal});setResultDraft({...manualResult});setEditOpen(true)}}>Editar metas <ArrowRight size={15}/></button></div>
    <div className="goals-inner">
     <div className="donut-section">
      <div className="donut" role="progressbar" aria-label="Atingimento da meta de contratos" aria-valuenow={Math.min(100,Math.max(0,pct))} aria-valuemin={0} aria-valuemax={100} style={{background:'conic-gradient(#9162ff 0% '+Math.min(100,Math.max(0,pct))+'%,#29243f '+Math.min(100,Math.max(0,pct))+'% 100%)'}}>
       <div className="donut-value"><strong>{pct}%</strong></div>
      </div>
      <div className="donut-caption"><span>Meta de contratos</span><b>{result.contracts_count} de {goals.contracts_target} contratos</b></div>
     </div>
     <div className="goal-items"><MiniProgress name="Contratos" value={result.contracts_count} target={goals.contracts_target}/><MiniProgress name="Faturamento de implantação" value={result.setup_revenue} target={goals.setup_revenue_target} unit="R$"/><MiniProgress name="Novo MRR recebido" value={result.new_mrr} target={goals.new_mrr_target} unit="R$"/></div>
    </div></section>}
    <div className="charts-grid"><section className="card chart-card"><div className="chart-title"><div><h2>Receita de implantação</h2><p>{periodUnit==='day'?'Receita contratada por hora':periodUnit==='year'?'Receita contratada por mês':periodUnit==='all'?'Evolução ao longo de todo o histórico':'Receita contratada por dia'}</p></div><div className="round-icon"><Wallet size={18}/></div></div><div className="chart-summary">{hasResult?formatMoney(result.setup_revenue):'—'}<span>no período</span></div><div className="chart-container"><ResponsiveContainer width="100%" height="100%"><BarChart data={chart} margin={{top:18,right:3,left:-24,bottom:0}}><CartesianGrid stroke="#25243b" vertical={false}/><XAxis dataKey="name" stroke="#777b91" tickLine={false} axisLine={false} tick={{fontSize:13}}/><YAxis stroke="#777b91" tickLine={false} axisLine={false} tick={{fontSize:13}} tickFormatter={v=>v>=1000?v/1000+'k':String(v)}/><Tooltip formatter={(v)=>formatMoney(Number(v))} contentStyle={{background:'#1c1b30',border:'1px solid #393450',borderRadius:10,color:'#fff'}}/><Bar dataKey="receita" radius={[6,6,0,0]} fill="#9162ff" maxBarSize={43}/></BarChart></ResponsiveContainer></div></section>
   <section className="card chart-card"><div className="chart-title"><div><h2>MRR recebido</h2><p>Mensalidades efetivamente pagas no período de recebimento</p></div><div className="round-icon"><TrendingUp size={18}/></div></div><div className="chart-summary">{displayedMRR!==null?formatMoney(displayedMRR):'—'}<span>Recebido no período selecionado</span></div><div className="chart-container"><ResponsiveContainer width="100%" height="100%"><AreaChart data={receiptChart} margin={{top:18,right:3,left:-24,bottom:0}}><defs><linearGradient id="mrrFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#9061ff" stopOpacity={.36}/><stop offset="100%" stopColor="#9061ff" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#25243b" vertical={false}/><XAxis dataKey="name" stroke="#777b91" tickLine={false} axisLine={false} tick={{fontSize:13}}/><YAxis stroke="#777b91" tickLine={false} axisLine={false} tick={{fontSize:13}} tickFormatter={v=>v>=1000?v/1000+'k':String(v)}/><Tooltip formatter={v=>formatMoney(Number(v))} contentStyle={{background:'#1c1b30',border:'1px solid #393450',borderRadius:10,color:'#fff'}}/><Area type="monotone" dataKey="mrr" stroke="#9162ff" strokeWidth={3} fill="url(#mrrFill)" dot={{fill:'#9162ff',strokeWidth:2,r:3}}/></AreaChart></ResponsiveContainer></div></section>
   <section className="card funnel-card"><div className="chart-title"><div><h2>Funil comercial</h2><p>{periodUnit==='day'||periodUnit==='week'?'O funil é preenchido mensalmente':'Conversão entre as etapas do período'}</p></div><div className="round-icon"><Target size={18}/></div></div>{hasFunnel?<><div className="funnel"><div className="funnel-row"><div style={{width:'100%'}}>Leads <b>{result.leads_count}</b></div></div><div className="funnel-row"><div style={{width:'82%'}}>Reuniões <b>{result.meetings_count}</b></div></div><div className="funnel-row"><div style={{width:'67%'}}>Propostas <b>{result.proposals_count}</b></div></div><div className="funnel-row"><div style={{width:'53%'}}>Contratos <b>{result.contracts_count}</b></div></div></div><div className="funnel-total"><TrendingUp size={16}/> Conversão geral: <b>{percent(result.contracts_count,result.leads_count||0)}%</b></div></>:<div className="funnel-empty"><Target size={34}/><b>Seu funil começa aqui</b><p>{periodUnit==='day'||periodUnit==='week'?'Os indicadores de leads, reuniões e propostas são registrados por mês. Selecione Mês ou Ano para consultá-los.':'Cadastre leads, reuniões e propostas mensais para acompanhar sua conversão real.'}</p><button onClick={()=>{if(periodUnit==='day'||periodUnit==='week'){setPeriodUnit('month');return}setGoalDraft({...monthlyGoals.find(r=>r.month===month)||blankGoal});setResultDraft({...manualResult});setEditOpen(true)}}>{periodUnit==='day'||periodUnit==='week'?'Ver funil mensal':'Preencher indicadores'} <ArrowRight size={15}/></button></div>}</section></div>
   <div className="bottom-grid"><section className="card bottom-card"><div className="small-heading"><Zap size={20}/><h2>Principais insights</h2></div>{hasResult?<><div className="insight-row"><CircleCheck size={17}/><span>{result.contracts_count} contratos cadastrados no período.</span></div><div className="insight-row"><CircleCheck size={17}/><span>{formatMoney(result.setup_revenue)} de receita de implantação registrada.</span></div><div className="insight-row"><CircleCheck size={17}/><span>{comparableGoals?'Meta de contratos atingida em '+pct+'%.':'Meta não comparável neste período; consulte ou configure as metas mensais.'}</span></div></>:<p className="empty-task">Cadastre resultados do mês para visualizar insights reais.</p>}</section>
   <section className="card bottom-card"><div className="small-heading"><TrendingUp size={20}/><h2>Resumo do período</h2></div><p className="small-copy">Dados referentes a {period.label}.</p><div className="projection"><div><small>Contratos ganhos</small><b>{hasResult?result.contracts_count:'—'}</b></div><div><small>Setups contratados</small><b>{hasResult?formatMoney(result.setup_revenue):'—'}</b></div><div><small>Novo MRR recebido</small><b>{hasResult?formatMoney(result.new_mrr):'—'}</b></div></div></section>
   <section className="card bottom-card"><div className="small-heading"><ClipboardCheck size={20}/><h2>Ações de {monthLabel(month)}</h2></div><div className="action-list">{actions.length?actions.map(a=><button key={a.id} className={'task '+(a.completed?'done':'')} onClick={()=>toggleAction(a)}><span className="check-square">{a.completed&&<Check size={13}/>}</span><span>{a.title}</span></button>):<p className="empty-task">Adicione tarefas para acompanhar suas prioridades neste mês.</p>}</div><div className="add-task"><input value={actionText} onChange={e=>setActionText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')addAction()}} placeholder="Adicionar próxima ação..." maxLength={180}/><button onClick={addAction} aria-label="Adicionar tarefa"><Plus size={19}/></button></div></section></div>
   {noData&&<p className="footer-tip">Não há negócios ganhos nem mensalidades pagas registrados para este período. Para períodos diários e semanais, resultados lançados apenas por mês não são distribuídos entre os dias.</p>}
   </>:activeTab==='Comercial'||activeTab==='Clientes'||activeTab==='Atividades'?<CRMWorkspace view={activeTab} userId={user.id} onMetricsChanged={()=>{void load(user,month)}}/>:activeTab==='Financeiro'?<FinanceiroWorkspace userId={user.id} onMetricsChanged={()=>{void load(user,month)}}/>:activeTab==='Entrega'?<EntregaWorkspace userId={user.id}/>:<div className="other-section card"><div className="icon-large"><BriefcaseBusiness size={35}/></div><div className="eyebrow">PRÓXIMAS ETAPAS</div><h1>{activeTab}</h1><p>O módulo de {activeTab.toLowerCase()} será conectado ao seu painel de metas. A primeira versão já está pronta para crescer com a agência.</p><button className="btn purple-btn" onClick={()=>setActiveTab('Métricas e Metas')}><LayoutDashboard size={17}/> Voltar ao painel</button></div>}
   <footer className="app-footer">Liderapp · Dados protegidos por usuário · {new Date().getFullYear()}</footer>
   </div>
  </main>
  {authOpen&&<div className="modal-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setAuthOpen(false)}}><div className="modal auth-modal"><button className="modal-close" onClick={()=>setAuthOpen(false)} aria-label="Fechar"><X size={20}/></button><div className="modal-badge"><LockKeyhole size={23}/></div><h2>{authMode==='login'?'Acesse seu workspace':'Crie seu acesso'}</h2><p>Entre para proteger e sincronizar os dados da sua agência.</p><form onSubmit={authenticate}><label>E-mail<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@agencia.com.br"/></label><label>Senha<input type="password" required minLength={6} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mínimo de 6 caracteres"/></label><button className="btn purple-btn full" disabled={busy||authChecking} type="submit">{busy?'Aguarde...':authMode==='login'?'Entrar no painel':'Criar minha conta'}</button></form><button className="auth-switch" onClick={()=>setAuthMode(authMode==='login'?'signup':'login')}>{authMode==='login'?'Ainda não tem uma conta? Cadastre-se':'Já tem uma conta? Entrar'}</button></div></div>}
  {editOpen&&<div className="modal-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setEditOpen(false)}}><div className="modal edit-modal"><button className="modal-close" onClick={()=>setEditOpen(false)} aria-label="Fechar"><X size={20}/></button><h2>Gerenciar metas e resultados</h2><p>Você está editando os registros mensais de {monthLabel(month)}. Os filtros Dia/Semana/Ano são de consulta; metas e lançamentos manuais permanecem mensais.</p><div className="form-sections"><h3><Goal size={17}/> Metas do mês</h3><div className="form-grid"><label>Meta de contratos<input type="number" min={1} value={goalDraft.contracts_target||''} onChange={e=>setGoalDraft({...goalDraft,contracts_target:Number(e.target.value)})}/></label><label>Meta implantação (R$)<input type="number" min={0} value={goalDraft.setup_revenue_target||''} onChange={e=>setGoalDraft({...goalDraft,setup_revenue_target:Number(e.target.value)})}/></label><label>Meta novo MRR recebido (R$)<input type="number" min={0} value={goalDraft.new_mrr_target||''} onChange={e=>setGoalDraft({...goalDraft,new_mrr_target:Number(e.target.value)})}/></label></div><button className="btn ghost-btn" disabled={busy} onClick={saveGoal}>Salvar metas</button><div className="form-divider"></div><h3><Activity size={17}/> Resultados adicionais fora do CRM</h3><div className="form-grid">{([{label:'Contratos fechados',key:'contracts_count'},{label:'Implantação (R$)',key:'setup_revenue'},{label:'Leads gerados',key:'leads_count'},{label:'Reuniões',key:'meetings_count'},{label:'Propostas',key:'proposals_count'}] as {label:string;key:keyof ResultRow}[]).map(f=><label key={f.key}>{f.label}<input type="number" min={0} value={resultDraft[f.key]??''} placeholder="Não informado" onChange={e=>setResultDraft({...resultDraft,[f.key]:e.target.value===''?null:Number(e.target.value)})}/></label>)}</div><button className="btn purple-btn full" disabled={busy} onClick={()=>saveResult()}><CheckCheck size={16}/>{busy?'Salvando...':'Salvar resultados'}</button><p className="field-note">Novo MRR recebido e MRR recebido vêm exclusivamente dos pagamentos confirmados no Financeiro, sem lançamentos manuais. Os negócios marcados como ganhos no Comercial já entram automaticamente nas métricas. Não registre essas vendas novamente aqui. Leads, reuniões e propostas são opcionais. Para um funil válido, cada etapa deve ter volume igual ou menor que a anterior.</p></div></div></div>}
 </div>
}
