'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {Activity,ArrowRight,Bell,BriefcaseBusiness,CalendarDays,Check,CheckCheck,ChevronDown,CircleCheck,ClipboardCheck,FileText,Goal,LayoutDashboard,LockKeyhole,LogOut,Menu,Plus,Settings2,Target,TrendingUp,Users,Wallet, X, Zap} from 'lucide-react';
import {ResponsiveContainer,AreaChart,Area,CartesianGrid,XAxis,YAxis,Tooltip,BarChart,Bar} from 'recharts';
import {supabase} from '@/lib/supabase';
import CRMWorkspace from '@/components/crm/CRMWorkspace';
import type {User} from '@supabase/supabase-js';
type GoalRow={contracts_target:number;setup_revenue_target:number;new_mrr_target:number};
type ResultRow={month:string;contracts_count:number;setup_revenue:number;new_mrr:number;leads_count:number|null;meetings_count:number|null;proposals_count:number|null;notes?:string|null};
type ActionRow={id:string;title:string;completed:boolean};
type Tab='Métricas e Metas'|'Comercial'|'Clientes'|'Atividades'|'Contratos'|'Financeiro'|'Projetos'|'Equipe'|'Relatórios'|'Configurações';
const nav: {label:Tab;Icon:typeof Target}[]=[{label:'Métricas e Metas',Icon:LayoutDashboard},{label:'Comercial',Icon:Target},{label:'Clientes',Icon:Users},{label:'Atividades',Icon:CalendarDays},{label:'Contratos',Icon:FileText},{label:'Financeiro',Icon:Wallet},{label:'Projetos',Icon:BriefcaseBusiness},{label:'Equipe',Icon:Users},{label:'Relatórios',Icon:TrendingUp},{label:'Configurações',Icon:Settings2}];
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
 const [month,setMonth]=useState(getMonth()),[goals,setGoals]=useState<GoalRow>(blankGoal),[result,setResult]=useState<ResultRow>(blankResult(getMonth())),[manualResult,setManualResult]=useState<ResultRow>(blankResult(getMonth())),[history,setHistory]=useState<ResultRow[]>([]),[actions,setActions]=useState<ActionRow[]>([]);
 const [cumulativeRevenue,setCumulativeRevenue]=useState<{setup:number;paid:number;total:number}|null>(null);
 const [editOpen,setEditOpen]=useState(false),[goalDraft,setGoalDraft]=useState<GoalRow>(blankGoal),[resultDraft,setResultDraft]=useState<ResultRow>(blankResult(getMonth())),[actionText,setActionText]=useState('');
 const [activeTab,setActiveTab]=useState<Tab>('Métricas e Metas'),[sidebarOpen,setSidebarOpen]=useState(false),[sidebarHidden,setSidebarHidden]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const alert=(message:string)=>setNotice(message);
 useEffect(()=>{try{setSidebarHidden(window.localStorage.getItem('liderapp-sidebar-hidden')==='true')}catch{}},[]);
 const toggleSidebar=()=>{const next=!sidebarHidden;setSidebarHidden(next);try{window.localStorage.setItem('liderapp-sidebar-hidden',String(next))}catch{}};
 const load=useCallback(async(u:User|null,m:string)=>{
  if(!supabase||!u){setGoals(blankGoal);setHistory([]);setActions([]);setManualResult(blankResult(m));setResult(blankResult(m));setCumulativeRevenue(null);return}
  const [goalResponse,resultResponse,actionResponse,winsResponse,revenueResponse]=await Promise.all([
   supabase.from('monthly_goals').select('contracts_target,setup_revenue_target,new_mrr_target').eq('user_id',u.id).eq('month',m).maybeSingle(),
   supabase.from('monthly_results').select('month,contracts_count,setup_revenue,new_mrr,leads_count,meetings_count,proposals_count,notes').eq('user_id',u.id).lte('month',m).gte('month',previous(m,11)).order('month',{ascending:true}),
   supabase.from('action_items').select('id,title,completed').eq('user_id',u.id).eq('month',m).order('created_at',{ascending:true}),
   supabase.from('crm_monthly_wins').select('month,contracts_count,setup_revenue,new_mrr').eq('user_id',u.id).lte('month',m).gte('month',previous(m,11)),
   supabase.from('crm_monthly_revenue').select('month,setups_won,recurring_paid,revenue_total').eq('user_id',u.id).lte('month',m)
  ]);
  if(goalResponse.error||resultResponse.error||actionResponse.error||winsResponse.error||revenueResponse.error){alert('Não foi possível atualizar as métricas: '+(goalResponse.error||resultResponse.error||actionResponse.error||winsResponse.error||revenueResponse.error)?.message);return}
  const revenueRows=(revenueResponse.data||[]) as {month:string;setups_won:number;recurring_paid:number;revenue_total:number}[];
  setCumulativeRevenue(revenueRows.length?{
   setup:revenueRows.reduce((n,r)=>n+Number(r.setups_won),0),
   paid:revenueRows.reduce((n,r)=>n+Number(r.recurring_paid),0),
   total:revenueRows.reduce((n,r)=>n+Number(r.revenue_total),0)
  }:null);
  const manualRows=(resultResponse.data||[]) as ResultRow[];
  const wins=(winsResponse.data||[]) as {month:string;contracts_count:number;setup_revenue:number;new_mrr:number}[];
  const rowMap=new Map<string,ResultRow>(manualRows.map(r=>[r.month,{...r,contracts_count:Number(r.contracts_count),setup_revenue:Number(r.setup_revenue),new_mrr:Number(r.new_mrr)}]));
  for(const w of wins){
   const old=rowMap.get(w.month)||blankResult(w.month);
   rowMap.set(w.month,{...old,contracts_count:Number(old.contracts_count)+Number(w.contracts_count),setup_revenue:Number(old.setup_revenue)+Number(w.setup_revenue),new_mrr:Number(old.new_mrr)+Number(w.new_mrr)});
  }
  const rows=Array.from(rowMap.values()).sort((a,b)=>a.month.localeCompare(b.month));
  setGoals(goalResponse.data?{contracts_target:goalResponse.data.contracts_target,setup_revenue_target:Number(goalResponse.data.setup_revenue_target),new_mrr_target:Number(goalResponse.data.new_mrr_target)}:blankGoal);
  setHistory(rows);
  setActions((actionResponse.data||[]) as ActionRow[]);
  setManualResult(manualRows.find(r=>r.month===m)||blankResult(m));
  setResult(rows.find(r=>r.month===m)||blankResult(m));
 },[]);
 useEffect(()=>{if(!supabase){setAuthChecking(false);return}supabase.auth.getUser().then(({data})=>{setUser(data.user);setAuthChecking(false)});const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>setUser(s?.user||null));return()=>subscription.unsubscribe()},[]);
 useEffect(()=>{if(!authChecking&&activeTab==='Métricas e Metas')void load(user,month)},[user,month,authChecking,load,activeTab]);
 const isLogged=!!user;const periodOptions=Array.from({length:15},(_,i)=>previous(getMonth(),i));
 const saveGoal=async()=>{if(!user||!supabase){alert('Entre para salvar suas metas.');return}if(!Number.isFinite(goalDraft.contracts_target)||goalDraft.contracts_target<=0||!Number.isFinite(goalDraft.setup_revenue_target)||goalDraft.setup_revenue_target<0||!Number.isFinite(goalDraft.new_mrr_target)||goalDraft.new_mrr_target<0){alert('Informe uma meta de contratos maior que zero. Metas financeiras não podem ser negativas.');return}setBusy(true);const {error}=await supabase.from('monthly_goals').upsert({...goalDraft,user_id:user.id,month,updated_at:new Date().toISOString()},{onConflict:'user_id,month'});setBusy(false);if(error){alert(error.message);return}setEditOpen(false);alert('Metas salvas com sucesso.');await load(user,month)};
 const saveResult=async(payload=resultDraft)=>{if(!user||!supabase){alert('Entre na sua conta para salvar resultados.');setAuthOpen(true);return}setBusy(true);const{error}=await supabase.from('monthly_results').upsert({...payload,user_id:user.id,month,updated_at:new Date().toISOString()},{onConflict:'user_id,month'});setBusy(false);if(error){alert(error.message);return}setEditOpen(false);alert('Resultados gravados com sucesso.');await load(user,month)};
 const authenticate=async(e:React.FormEvent)=>{e.preventDefault();if(!supabase){alert('Supabase não está configurado.');return}setBusy(true);const{error,data}=authMode==='signup'?await supabase.auth.signUp({email,password}):await supabase.auth.signInWithPassword({email,password});setBusy(false);if(error){alert(error.message);return}if(authMode==='signup'&&!data.session){alert('Conta criada. Verifique o e-mail para confirmar o cadastro antes de entrar.');return}setAuthOpen(false);setPassword('');alert('Acesso autorizado.')};
 const addAction=async()=>{if(!user||!supabase){setAuthOpen(true);return}if(!actionText.trim())return;const{error}=await supabase.from('action_items').insert({user_id:user.id,month,title:actionText.trim()});if(error){alert(error.message);return}setActionText('');await load(user,month)};
 const toggleAction=async(a:ActionRow)=>{if(!user||!supabase)return;const{error}=await supabase.from('action_items').update({completed:!a.completed}).eq('id',a.id).eq('user_id',user.id);if(error){alert(error.message);return}await load(user,month)};
 const chart=useMemo(()=>Array.from({length:6},(_,i)=>previous(month,5-i)).map(key=>{const current=history.find(r=>r.month===key);const older=history.filter(r=>r.month<=key);return {name:monthLabel(key).split(' ')[0],full:monthLabel(key),receita:current?Number(current.setup_revenue):null,mrr:older.length?older.reduce((sum,r)=>sum+Number(r.new_mrr),0):null,hasData:!!current}}),[month,history]);
 const hasFunnel=result.leads_count!==null&&result.meetings_count!==null&&result.proposals_count!==null;
 const existingRevenue=history.reduce((sum,r)=>sum+Number(r.new_mrr),0);
 const displayedMRR=existingRevenue;
 const hasResult=history.some(r=>r.month===month);
 const pct=percent(result.contracts_count,goals.contracts_target);
 const noData=!hasResult;
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
      <label className="period"><CalendarDays size={18}/><select aria-label="Selecionar mês" value={month} onChange={e=>setMonth(e.target.value)}>{periodOptions.map(m=><option key={m} value={m}>{new Date(m+'T12:00:00').toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}</option>)}</select><ChevronDown size={14}/></label>
      <button className="btn purple-btn" onClick={()=>{setGoalDraft({...goals});setResultDraft({...manualResult});setEditOpen(true)}}><Settings2 size={17}/> Gerenciar metas</button>
     </div>}
     <span className="live-indicator"><i/> Banco conectado</span>
     <button className="icon-btn" onClick={()=>alert('Suas notificações aparecerão aqui.')} aria-label="Notificações"><Bell size={19}/></button>
     <button className="avatar top-avatar" onClick={()=>supabase?.auth.signOut()} aria-label="Sair da conta" title="Sair da conta">{user?.email?.slice(0,2).toUpperCase()||'AG'}</button>
    </div>
   </header>
   <div className="page-body">
   {activeTab==='Métricas e Metas'?<>
   {notice&&<div className="notice"><span>{notice}</span><button onClick={()=>setNotice('')} aria-label="Fechar aviso"><X size={16}/></button></div>}
      <div className="metrics-grid"><section className="card kpi kpi-total"><div className="kpi-top"><span className="muted">Faturamento total</span><Wallet size={22} className="purple"/></div><strong>{cumulativeRevenue?formatMoney(cumulativeRevenue.total):'—'}</strong><div className="kpi-total-breakdown">{cumulativeRevenue?<><span>Setups ganhos: <b>{formatMoney(cumulativeRevenue.setup)}</b></span><span>Mensalidades pagas: <b>{formatMoney(cumulativeRevenue.paid)}</b></span></>:'Sem setups ganhos ou mensalidades pagas até este mês'}</div><div className="kpi-total-month">Acumulado até {monthLabel(month)}</div></section><Kpi title="Contratos fechados" value={hasResult?String(result.contracts_count):'—'} sub={'No período selecionado'} Icon={FileText}/><Kpi title="Receita de implantação" value={hasResult?formatMoney(result.setup_revenue):'—'} sub="Valor contratado no mês" Icon={Wallet}/><Kpi title="Novo MRR" value={hasResult?formatMoney(result.new_mrr):'—'} sub="Recorrência adicionada no mês" Icon={TrendingUp}/><Kpi title="ARR equivalente do novo MRR" value={hasResult?formatMoney(result.new_mrr*12):'—'} sub="Anualização, não garantida" Icon={Activity}/></div>
   <section className="card goals-card"><div className="section-heading"><div className="heading-icon"><Target size={22}/></div><div><h2>Metas do mês</h2><p>Acompanhe seu progresso em direção aos objetivos.</p></div><button className="link-btn" onClick={()=>{setGoalDraft({...goals});setResultDraft({...manualResult});setEditOpen(true)}}>Editar metas <ArrowRight size={15}/></button></div><div className="goals-inner"><div className="donut-section"><div className="donut" style={{background:goals.contracts_target>0?'conic-gradient(#9162ff 0% '+Math.min(100,pct)+'%,#29243f '+Math.min(100,pct)+'% 100%)':'#29243f'}}><div><strong>{goals.contracts_target>0?pct+'%':'—'}</strong><small>{goals.contracts_target>0?'da meta de contratos':'Meta não definida'}</small></div></div></div><div className="goal-items"><MiniProgress name="Contratos" value={result.contracts_count} target={goals.contracts_target}/><MiniProgress name="Faturamento de implantação" value={result.setup_revenue} target={goals.setup_revenue_target} unit="R$"/><MiniProgress name="Novo MRR" value={result.new_mrr} target={goals.new_mrr_target} unit="R$"/></div></div></section>
   <div className="charts-grid"><section className="card chart-card"><div className="chart-title"><div><h2>Receita de implantação</h2><p>Evolução mensal da receita contratada</p></div><div className="round-icon"><Wallet size={18}/></div></div><div className="chart-summary">{hasResult?formatMoney(result.setup_revenue):'—'}<span>no mês</span></div><div className="chart-container"><ResponsiveContainer width="100%" height="100%"><BarChart data={chart} margin={{top:18,right:3,left:-24,bottom:0}}><CartesianGrid stroke="#25243b" vertical={false}/><XAxis dataKey="name" stroke="#777b91" tickLine={false} axisLine={false} tick={{fontSize:13}}/><YAxis stroke="#777b91" tickLine={false} axisLine={false} tick={{fontSize:13}} tickFormatter={v=>v>=1000?v/1000+'k':String(v)}/><Tooltip formatter={(v)=>formatMoney(Number(v))} contentStyle={{background:'#1c1b30',border:'1px solid #393450',borderRadius:10,color:'#fff'}}/><Bar dataKey="receita" radius={[6,6,0,0]} fill="#9162ff" maxBarSize={43}/></BarChart></ResponsiveContainer></div></section>
   <section className="card chart-card"><div className="chart-title"><div><h2>Evolução do MRR</h2><p>Acúmulo de nova receita recorrente registrada</p></div><div className="round-icon"><TrendingUp size={18}/></div></div><div className="chart-summary">{history.length?formatMoney(displayedMRR):'—'}<span>Soma do MRR registrado no histórico</span></div><div className="chart-container"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chart} margin={{top:18,right:3,left:-24,bottom:0}}><defs><linearGradient id="mrrFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#9061ff" stopOpacity={.36}/><stop offset="100%" stopColor="#9061ff" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#25243b" vertical={false}/><XAxis dataKey="name" stroke="#777b91" tickLine={false} axisLine={false} tick={{fontSize:13}}/><YAxis stroke="#777b91" tickLine={false} axisLine={false} tick={{fontSize:13}} tickFormatter={v=>v>=1000?v/1000+'k':String(v)}/><Tooltip formatter={v=>formatMoney(Number(v))} contentStyle={{background:'#1c1b30',border:'1px solid #393450',borderRadius:10,color:'#fff'}}/><Area type="monotone" dataKey="mrr" stroke="#9162ff" strokeWidth={3} fill="url(#mrrFill)" dot={{fill:'#9162ff',strokeWidth:2,r:3}}/></AreaChart></ResponsiveContainer></div></section>
   <section className="card funnel-card"><div className="chart-title"><div><h2>Funil comercial</h2><p>Conversão entre as etapas do mês</p></div><div className="round-icon"><Target size={18}/></div></div>{hasFunnel?<><div className="funnel"><div className="funnel-row"><div style={{width:'100%'}}>Leads <b>{result.leads_count}</b></div></div><div className="funnel-row"><div style={{width:'82%'}}>Reuniões <b>{result.meetings_count}</b></div></div><div className="funnel-row"><div style={{width:'67%'}}>Propostas <b>{result.proposals_count}</b></div></div><div className="funnel-row"><div style={{width:'53%'}}>Contratos <b>{result.contracts_count}</b></div></div></div><div className="funnel-total"><TrendingUp size={16}/> Conversão geral: <b>{percent(result.contracts_count,result.leads_count||0)}%</b></div></>:<div className="funnel-empty"><Target size={34}/><b>Seu funil começa aqui</b><p>Cadastre leads, reuniões e propostas para acompanhar sua conversão real.</p><button onClick={()=>{setGoalDraft({...goals});setResultDraft({...manualResult});setEditOpen(true)}}>Preencher indicadores <ArrowRight size={15}/></button></div>}</section></div>
   <div className="bottom-grid"><section className="card bottom-card"><div className="small-heading"><Zap size={20}/><h2>Principais insights</h2></div>{hasResult?<><div className="insight-row"><CircleCheck size={17}/><span>{result.contracts_count} contratos cadastrados no período.</span></div><div className="insight-row"><CircleCheck size={17}/><span>{formatMoney(result.setup_revenue)} de receita de implantação registrada.</span></div><div className="insight-row"><CircleCheck size={17}/><span>{goals.contracts_target>0?'Meta de contratos atingida em '+pct+'%.':'Meta de contratos ainda não definida.'}</span></div></>:<p className="empty-task">Cadastre resultados do mês para visualizar insights reais.</p>}</section>
   <section className="card bottom-card"><div className="small-heading"><TrendingUp size={20}/><h2>Histórico registrado</h2></div><p className="small-copy">Dados efetivamente salvos na sua conta.</p><div className="projection"><div><small>Meses com dados</small><b>{history.length}</b></div><div><small>Contratos no mês</small><b>{hasResult?result.contracts_count:'—'}</b></div><div><small>Novo MRR no mês</small><b>{hasResult?formatMoney(result.new_mrr):'—'}</b></div></div></section>
   <section className="card bottom-card"><div className="small-heading"><ClipboardCheck size={20}/><h2>Próximas ações</h2></div><div className="action-list">{actions.length?actions.map(a=><button key={a.id} className={'task '+(a.completed?'done':'')} onClick={()=>toggleAction(a)}><span className="check-square">{a.completed&&<Check size={13}/>}</span><span>{a.title}</span></button>):<p className="empty-task">Adicione tarefas para acompanhar suas prioridades neste mês.</p>}</div><div className="add-task"><input value={actionText} onChange={e=>setActionText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')addAction()}} placeholder="Adicionar próxima ação..." maxLength={180}/><button onClick={addAction} aria-label="Adicionar tarefa"><Plus size={19}/></button></div></section></div>
   {noData&&<p className="footer-tip">Nenhum resultado salvo para este período. Clique em “Gerenciar metas” para começar.</p>}
   </>:activeTab==='Comercial'||activeTab==='Clientes'||activeTab==='Atividades'?<CRMWorkspace view={activeTab} userId={user.id} onMetricsChanged={()=>{void load(user,month)}}/>:<div className="other-section card"><div className="icon-large"><BriefcaseBusiness size={35}/></div><div className="eyebrow">PRÓXIMAS ETAPAS</div><h1>{activeTab}</h1><p>O módulo de {activeTab.toLowerCase()} será conectado ao seu painel de metas. A primeira versão já está pronta para crescer com a agência.</p><button className="btn purple-btn" onClick={()=>setActiveTab('Métricas e Metas')}><LayoutDashboard size={17}/> Voltar ao painel</button></div>}
   <footer className="app-footer">Liderapp · Dados protegidos por usuário · {new Date().getFullYear()}</footer>
   </div>
  </main>
  {authOpen&&<div className="modal-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setAuthOpen(false)}}><div className="modal auth-modal"><button className="modal-close" onClick={()=>setAuthOpen(false)} aria-label="Fechar"><X size={20}/></button><div className="modal-badge"><LockKeyhole size={23}/></div><h2>{authMode==='login'?'Acesse seu workspace':'Crie seu acesso'}</h2><p>Entre para proteger e sincronizar os dados da sua agência.</p><form onSubmit={authenticate}><label>E-mail<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@agencia.com.br"/></label><label>Senha<input type="password" required minLength={6} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mínimo de 6 caracteres"/></label><button className="btn purple-btn full" disabled={busy||authChecking} type="submit">{busy?'Aguarde...':authMode==='login'?'Entrar no painel':'Criar minha conta'}</button></form><button className="auth-switch" onClick={()=>setAuthMode(authMode==='login'?'signup':'login')}>{authMode==='login'?'Ainda não tem uma conta? Cadastre-se':'Já tem uma conta? Entrar'}</button></div></div>}
  {editOpen&&<div className="modal-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setEditOpen(false)}}><div className="modal edit-modal"><button className="modal-close" onClick={()=>setEditOpen(false)} aria-label="Fechar"><X size={20}/></button><h2>Gerenciar metas e resultados</h2><p>Período: {monthLabel(month)}. Defina objetivos e preencha indicadores com valores reais.</p><div className="form-sections"><h3><Goal size={17}/> Metas do mês</h3><div className="form-grid"><label>Meta de contratos<input type="number" min={1} value={goalDraft.contracts_target||''} onChange={e=>setGoalDraft({...goalDraft,contracts_target:Number(e.target.value)})}/></label><label>Meta implantação (R$)<input type="number" min={0} value={goalDraft.setup_revenue_target||''} onChange={e=>setGoalDraft({...goalDraft,setup_revenue_target:Number(e.target.value)})}/></label><label>Meta novo MRR (R$)<input type="number" min={0} value={goalDraft.new_mrr_target||''} onChange={e=>setGoalDraft({...goalDraft,new_mrr_target:Number(e.target.value)})}/></label></div><button className="btn ghost-btn" disabled={busy} onClick={saveGoal}>Salvar metas</button><div className="form-divider"></div><h3><Activity size={17}/> Resultados adicionais fora do CRM</h3><div className="form-grid">{([{label:'Contratos fechados',key:'contracts_count'},{label:'Implantação (R$)',key:'setup_revenue'},{label:'Novo MRR (R$)',key:'new_mrr'},{label:'Leads gerados',key:'leads_count'},{label:'Reuniões',key:'meetings_count'},{label:'Propostas',key:'proposals_count'}] as {label:string;key:keyof ResultRow}[]).map(f=><label key={f.key}>{f.label}<input type="number" min={0} value={resultDraft[f.key]??''} placeholder="Não informado" onChange={e=>setResultDraft({...resultDraft,[f.key]:e.target.value===''?null:Number(e.target.value)})}/></label>)}</div><button className="btn purple-btn full" disabled={busy} onClick={()=>saveResult()}><CheckCheck size={16}/>{busy?'Salvando...':'Salvar resultados'}</button><p className="field-note">Os negócios marcados como ganhos no Comercial já entram automaticamente nas métricas. Não registre essas vendas novamente aqui. Leads, reuniões e propostas são opcionais. Para um funil válido, cada etapa deve ter volume igual ou menor que a anterior.</p></div></div></div>}
 </div>
}
