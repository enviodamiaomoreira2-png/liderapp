'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import type {DragEvent,FormEvent,ReactNode} from 'react';
import {Activity,ArrowRight,Building2,Calendar,CalendarDays,Check,CheckCircle2,ChevronLeft,ChevronRight,CircleDollarSign,Clock,Edit3,GripVertical,History,LayoutGrid,List,Mail,Phone,Plus,RefreshCw,Search,Settings2,Target,Trash2,TrendingUp,UserRound,Users,X,XCircle} from 'lucide-react';
import {supabase} from '@/lib/supabase';
import {type CRMView,type CRMStage,type CRMOrganization,type CRMPerson,type CRMDeal,type CRMActivity,type CRMDealEvent,type ActivityType,type DealStatus,type DealDraft,type ActivityDraft,stageDefaults,types,emptyDeal,emptyOrg,emptyPerson,emptyActivity,currency,dateFmt,localInput,localTomorrow,isLate,isToday,dealDay,dayToIso,currentSaoPauloDay} from './types';

type Props={view:CRMView;userId:string;onMetricsChanged:()=>void};
type ContactKind='organizations'|'people';
type ActivityFilter='pending'|'today'|'overdue'|'week'|'done'|'all';
const labelType=(kind:ActivityType)=>types.find(t=>t.key===kind)?.label||'Atividade';
const selectValue=(x:string)=>x||null;
function Empty({title,subtitle,icon,action,onAction}:{title:string;subtitle:string;icon:ReactNode;action?:string;onAction?:()=>void}){return <div className="crm-empty"><div className="crm-empty-symbol">{icon}</div><b>{title}</b><p>{subtitle}</p>{onAction&&<button onClick={onAction} className="crm-button primary"><Plus size={17}/>{action}</button>}</div>}
function Modal({title,subtitle,onClose,children}:{title:string;subtitle?:string;onClose:()=>void;children:ReactNode}){return <div className="crm-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div role="dialog" aria-label={title} aria-modal="true" className="crm-modal"><div className="crm-modal-head"><div><h2>{title}</h2><p>{subtitle}</p></div><button className="crm-icon-button" onClick={onClose} aria-label="Fechar"><X size={20}/></button></div><div className="crm-modal-content">{children}</div></div></div>}
function Drawer({title,subtitle,onClose,children}:{title:string;subtitle?:string;onClose:()=>void;children:ReactNode}){return <div className="crm-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><aside role="dialog" aria-label={title} aria-modal="true" className="crm-drawer"><div className="crm-modal-head"><div><h2>{title}</h2><p>{subtitle}</p></div><button className="crm-icon-button" onClick={onClose} aria-label="Fechar"><X size={20}/></button></div><div className="crm-modal-content">{children}</div></aside></div>}
function Field({name,children,full=false}:{name:string;children:ReactNode;full?:boolean}){return <label className={'crm-field '+(full?'full':'')}><span>{name}</span>{children}</label>}
function Tag({children,variant='purple'}:{children:ReactNode;variant?:'purple'|'red'|'green'|'amber'}){return <span className={'crm-tag '+variant}>{children}</span>}
function ActivityTypeIcon({type}:{type:ActivityType}){return type==='call'?<Phone size={16}/>:type==='email'?<Mail size={16}/>:type==='meeting'?<Users size={16}/>:type==='deadline'?<Clock size={16}/>:type==='followup'?<RefreshCw size={16}/>:<CheckCircle2 size={16}/>}
function initialDeal():DealDraft{return {...emptyDeal}}
function initialActivity():ActivityDraft{return {...emptyActivity,due_at:localTomorrow()}}
function weekDate(d:Date){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}

export default function CRMWorkspace({view,userId,onMetricsChanged}:Props){
 const [stages,setStages]=useState<CRMStage[]>([]),[organizations,setOrganizations]=useState<CRMOrganization[]>([]),[people,setPeople]=useState<CRMPerson[]>([]),[deals,setDeals]=useState<CRMDeal[]>([]),[activities,setActivities]=useState<CRMActivity[]>([]),[events,setEvents]=useState<CRMDealEvent[]>([]);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const [query,setQuery]=useState(''),[status,setStatus]=useState<DealStatus>('open'),[dragId,setDragId]=useState(''),[dragOver,setDragOver]=useState('');
 const [dealOpen,setDealOpen]=useState(false),[editingDeal,setEditingDeal]=useState<CRMDeal|null>(null),[dealForm,setDealForm]=useState<DealDraft>(initialDeal());
 const [contactKind,setContactKind]=useState<ContactKind>('organizations'),[contactDetail,setContactDetail]=useState<{kind:ContactKind;id:string}|null>(null);
 const [contactModal,setContactModal]=useState<ContactKind|null>(null),[contactEditId,setContactEditId]=useState<string|null>(null),[orgForm,setOrgForm]=useState({...emptyOrg}),[personForm,setPersonForm]=useState({...emptyPerson});
 const [activityModal,setActivityModal]=useState(false),[editingActivity,setEditingActivity]=useState<CRMActivity|null>(null),[activityForm,setActivityForm]=useState<ActivityDraft>(initialActivity()),[activityFilter,setActivityFilter]=useState<ActivityFilter>('pending'),[calendarMode,setCalendarMode]=useState(false),[calendarDate,setCalendarDate]=useState(new Date());
 const [stageModal,setStageModal]=useState(false),[stageEdit,setStageEdit]=useState<CRMStage|null>(null),[stageTitle,setStageTitle]=useState(''),[stageProbability,setStageProbability]=useState(50);
 const [lostDeal,setLostDeal]=useState<CRMDeal|null>(null),[lostReason,setLostReason]=useState(''),[lostDate,setLostDate]=useState(currentSaoPauloDay());
 const [wonDeal,setWonDeal]=useState<CRMDeal|null>(null),[wonDate,setWonDate]=useState(currentSaoPauloDay());
 const reload=useCallback(async()=>{
  if(!supabase)return;
  setLoading(true);
  const [s,o,p,d,a,h]=await Promise.all([
   supabase.from('crm_stages').select('*').order('position'),
   supabase.from('crm_organizations').select('*').order('name'),
   supabase.from('crm_people').select('*').order('name'),
   supabase.from('crm_deals').select('*').order('created_at',{ascending:false}),
   supabase.from('crm_activities').select('*').order('due_at'),
   supabase.from('crm_deal_events').select('*').order('created_at',{ascending:false}).limit(300)
  ]);
  const error=s.error||o.error||p.error||d.error||a.error||h.error;
  if(error){setNotice('Falha ao carregar o CRM: '+error.message);setLoading(false);return}
  let stageList=(s.data||[]) as CRMStage[];
  if(!stageList.length){
   await supabase.from('crm_stages').upsert(stageDefaults.map((x,i)=>({...x,user_id:userId,position:i})),{onConflict:'user_id,position'});
   const again=await supabase.from('crm_stages').select('*').order('position');
   if(again.error)setNotice('Não foi possível criar as etapas: '+again.error.message);
   stageList=(again.data||[]) as CRMStage[];
  }
  setStages(stageList);setOrganizations((o.data||[]) as CRMOrganization[]);setPeople((p.data||[]) as CRMPerson[]);setDeals((d.data||[]) as CRMDeal[]);setActivities((a.data||[]) as CRMActivity[]);setEvents((h.data||[]) as CRMDealEvent[]);setLoading(false);
 },[userId]);
 useEffect(()=>{void reload()},[reload]);
 useEffect(()=>{setQuery('')},[view]);
 const updated=async()=>{await reload();onMetricsChanged()};
 const org=(id:string|null)=>organizations.find(x=>x.id===id);
 const person=(id:string|null)=>people.find(x=>x.id===id);
 const deal=(id:string|null)=>deals.find(x=>x.id===id);
 const nextActivity=(id:string)=>activities.filter(a=>a.deal_id===id&&!a.done).sort((a,b)=>a.due_at.localeCompare(b.due_at))[0];
 const linkedActivity=(id:string)=>activities.filter(a=>a.deal_id===id).sort((a,b)=>Number(a.done)-Number(b.done)||a.due_at.localeCompare(b.due_at));
 const who=(d:CRMDeal)=>org(d.organization_id)?.name||person(d.person_id)?.name||'Contato não vinculado';
 const logEvent=async(id:string,kind:string,detail:string)=>{if(supabase)await supabase.from('crm_deal_events').insert({user_id:userId,deal_id:id,kind,detail})};
 const createDeal=(stageId?:string)=>{setEditingDeal(null);setDealForm({...initialDeal(),stage_id:stageId||stages[0]?.id||''});setDealOpen(true)};
 const askWon=(d:CRMDeal)=>{setWonDeal(d);setWonDate(currentSaoPauloDay())};
 const askLost=(d:CRMDeal)=>{setLostDeal(d);setLostReason('');setLostDate(currentSaoPauloDay())};
 const openDeal=(d:CRMDeal)=>{setEditingDeal(d);setDealForm({title:d.title,stage_id:d.stage_id,organization_id:d.organization_id||'',person_id:d.person_id||'',setup_value:String(d.setup_value),monthly_value:String(d.monthly_value),expected_close:d.expected_close||'',won_date:dealDay(d.won_at),lost_date:dealDay(d.lost_at),meeting_scheduled_at:d.meeting_scheduled_at?localInput(d.meeting_scheduled_at):'',meeting_held_at:d.meeting_held_at?localInput(d.meeting_held_at):'',label:d.label||'',notes:d.notes||''});setDealOpen(true)};
 const saveDeal=async(e:FormEvent)=>{
  e.preventDefault();if(!supabase||busy)return;
  if(!dealForm.title.trim()||!dealForm.stage_id){setNotice('Preencha o título e a etapa.');return}
  if([dealForm.setup_value,dealForm.monthly_value].some(x=>Number.isNaN(Number(x||0))||Number(x||0)<0)){setNotice('Valores devem ser positivos.');return}
  if(editingDeal?.status==='won'&&!dealForm.won_date){setNotice('Informe a data do ganho antes de salvar.');return}
  if(editingDeal?.status==='lost'&&!dealForm.lost_date){setNotice('Informe a data da perda antes de salvar.');return}
  setBusy(true);
  const payload={user_id:userId,title:dealForm.title.trim(),stage_id:dealForm.stage_id,organization_id:selectValue(dealForm.organization_id),person_id:selectValue(dealForm.person_id),setup_value:Number(dealForm.setup_value||0),monthly_value:Number(dealForm.monthly_value||0),expected_close:selectValue(dealForm.expected_close),meeting_scheduled_at:dealForm.meeting_scheduled_at?new Date(dealForm.meeting_scheduled_at).toISOString():null,meeting_held_at:dealForm.meeting_held_at?new Date(dealForm.meeting_held_at).toISOString():null,label:selectValue(dealForm.label),notes:selectValue(dealForm.notes),updated_at:new Date().toISOString(),
    ...(editingDeal?.status==='won'?{won_at:dayToIso(dealForm.won_date)}:{}),
    ...(editingDeal?.status==='lost'?{lost_at:dayToIso(dealForm.lost_date)}:{})
  };
  const result=editingDeal?await supabase.from('crm_deals').update(payload).eq('id',editingDeal.id).select('*').single():await supabase.from('crm_deals').insert(payload).select('*').single();
  setBusy(false);if(result.error||!result.data){setNotice('Erro ao salvar negócio: '+result.error?.message);return}
  await logEvent(result.data.id,editingDeal?'updated':'created',editingDeal?'Dados e datas do negócio atualizados':'Negócio criado');
  setEditingDeal(result.data as CRMDeal);setNotice('Negócio salvo com sucesso.');await updated();
 };
 const changeStatus=async(d:CRMDeal,next:DealStatus,reason='',selectedDay='')=>{
  if(!supabase||busy)return;
  const closeDay=selectedDay||currentSaoPauloDay();
  if((next==='won'||next==='lost')&&!/^\d{4}-\d{2}-\d{2}$/.test(closeDay)){setNotice('Selecione uma data de fechamento válida.');return}
  setBusy(true);
  const now=new Date().toISOString();
  const result=await supabase.from('crm_deals').update({
   status:next,
   won_at:next==='won'?dayToIso(closeDay):null,
   lost_at:next==='lost'?dayToIso(closeDay):null,
   lost_reason:next==='lost'?reason:null,
   updated_at:now
  }).eq('id',d.id).eq('user_id',userId);
  setBusy(false);
  if(result.error){setNotice('Não foi possível alterar o negócio: '+result.error.message);return}
  await logEvent(d.id,next==='won'?'won':next==='lost'?'lost':'reopened',next==='won'?'Negócio ganho em '+closeDay:next==='lost'?'Negócio perdido em '+closeDay+(reason?' — '+reason:''):'Negócio reaberto');
  setLostDeal(null);setWonDeal(null);setDealOpen(false);setDragId('');
  setStatus(next);
  setNotice(next==='won'?'Negócio ganho! As métricas considerarão a data escolhida.':next==='lost'?'Negócio registrado como perdido.':'Negócio reaberto.');
  await updated();
 };
 const moveDeal=async(d:CRMDeal,target:string)=>{
  setDragId('');setDragOver('');if(!supabase||d.status!=='open'||d.stage_id===target)return;
  const {error}=await supabase.from('crm_deals').update({stage_id:target,updated_at:new Date().toISOString()}).eq('id',d.id);
  if(error){setNotice(error.message);return}
  await logEvent(d.id,'stage','Movido para '+(stages.find(s=>s.id===target)?.name||'etapa'));
  await updated();
 };
 const onDropStage=async(e:DragEvent<HTMLElement>,target:string)=>{e.preventDefault();const d=deal(e.dataTransfer.getData('text/plain')||dragId);if(d)await moveDeal(d,target)};
 const onDropStatus=async(e:DragEvent<HTMLElement>,s:'won'|'lost')=>{e.preventDefault();const d=deal(e.dataTransfer.getData('text/plain')||dragId);setDragId('');if(!d)return;if(s==='won')askWon(d);else askLost(d)};
 const deleteDeal=async(d:CRMDeal)=>{if(!supabase||!window.confirm('Excluir definitivamente "'+d.title+'"?'))return;const{error}=await supabase.from('crm_deals').delete().eq('id',d.id);if(error){setNotice(error.message);return}setDealOpen(false);await updated()};
 const newContact=(kind:ContactKind)=>{setContactModal(kind);setContactEditId(null);setOrgForm({...emptyOrg});setPersonForm({...emptyPerson})};
 const editContact=(kind:ContactKind,id:string)=>{setContactModal(kind);setContactEditId(id);if(kind==='organizations'){const c=org(id);if(c)setOrgForm({name:c.name,email:c.email||'',phone:c.phone||'',website:c.website||'',industry:c.industry||'',notes:c.notes||''})}else{const p=person(id);if(p)setPersonForm({name:p.name,email:p.email||'',phone:p.phone||'',role:p.role||'',notes:p.notes||'',organization_id:p.organization_id||''})}};
 const saveContact=async(e:FormEvent)=>{
  e.preventDefault();if(!supabase||!contactModal||busy)return;
  setBusy(true);
  const table=contactModal==='organizations'?'crm_organizations':'crm_people';
  const payload=contactModal==='organizations'?{...orgForm,user_id:userId,updated_at:new Date().toISOString()}:{...personForm,organization_id:selectValue(personForm.organization_id),user_id:userId,updated_at:new Date().toISOString()};
  const res=contactEditId?await supabase.from(table).update(payload).eq('id',contactEditId).select('id').single():await supabase.from(table).insert(payload).select('id').single();
  setBusy(false);if(res.error){setNotice(res.error.message);return}
  if(res.data&&!contactEditId){if(contactModal==='organizations')setDealForm(f=>({...f,organization_id:res.data.id}));else setDealForm(f=>({...f,person_id:res.data.id}))}
  setContactModal(null);setNotice('Contato salvo.');await updated();
 };
 const deleteContact=async()=>{
  if(!supabase||!contactDetail||!window.confirm('Excluir este contato? As negociações permanecem, mas o vínculo será removido.'))return;
  const table=contactDetail.kind==='organizations'?'crm_organizations':'crm_people';const{error}=await supabase.from(table).delete().eq('id',contactDetail.id);
  if(error){setNotice(error.message);return}setContactDetail(null);await updated();
 };
 const newActivity=(rel:{deal?:CRMDeal;person?:CRMPerson;org?:CRMOrganization}={})=>{setEditingActivity(null);setActivityForm({...initialActivity(),deal_id:rel.deal?.id||'',person_id:rel.person?.id||rel.deal?.person_id||'',organization_id:rel.org?.id||rel.deal?.organization_id||''});setActivityModal(true)};
 const editActivity=(a:CRMActivity)=>{setEditingActivity(a);setActivityForm({title:a.title,type:a.type,due_at:localInput(a.due_at),duration_minutes:String(a.duration_minutes),description:a.description||'',deal_id:a.deal_id||'',person_id:a.person_id||'',organization_id:a.organization_id||''});setActivityModal(true)};
 const saveActivity=async(e:FormEvent)=>{
  e.preventDefault();if(!supabase||busy)return;const when=new Date(activityForm.due_at);
  if(!activityForm.title.trim()||Number.isNaN(when.getTime())){setNotice('Informe nome, data e horário válidos.');return}
  setBusy(true);const payload={user_id:userId,title:activityForm.title.trim(),type:activityForm.type,due_at:when.toISOString(),duration_minutes:Number(activityForm.duration_minutes||30),description:selectValue(activityForm.description),deal_id:selectValue(activityForm.deal_id),person_id:selectValue(activityForm.person_id),organization_id:selectValue(activityForm.organization_id),updated_at:new Date().toISOString()};
  const {error}=editingActivity?await supabase.from('crm_activities').update(payload).eq('id',editingActivity.id):await supabase.from('crm_activities').insert(payload);
  setBusy(false);if(error){setNotice(error.message);return}setActivityModal(false);setNotice('Atividade salva.');await updated();
 };
 const toggleActivity=async(a:CRMActivity)=>{if(!supabase)return;const {error}=await supabase.from('crm_activities').update({done:!a.done,done_at:a.done?null:new Date().toISOString()}).eq('id',a.id);if(error){setNotice(error.message);return}await updated()};
 const deleteActivity=async(a:CRMActivity)=>{if(!supabase||!window.confirm('Excluir atividade "'+a.title+'"?'))return;const {error}=await supabase.from('crm_activities').delete().eq('id',a.id);if(error){setNotice(error.message);return}setActivityModal(false);await updated()};
 const saveStage=async(e:FormEvent)=>{
  e.preventDefault();if(!supabase||busy||!stageTitle.trim())return;setBusy(true);
  const payload={name:stageTitle.trim(),probability:stageProbability};const {error}=stageEdit?await supabase.from('crm_stages').update(payload).eq('id',stageEdit.id):await supabase.from('crm_stages').insert({...payload,user_id:userId,position:Math.max(-1,...stages.map(x=>x.position))+1,color:'#9874f7'});
  setBusy(false);if(error){setNotice(error.message);return}setStageEdit(null);setStageTitle('');setStageProbability(50);await updated();
 };
 const deleteStage=async(s:CRMStage)=>{if(!supabase)return;if(stages.length<2||deals.some(d=>d.stage_id===s.id)){setNotice('Mova os negócios para outra etapa antes de excluir.');return}if(!window.confirm('Excluir etapa "'+s.name+'"?'))return;const{error}=await supabase.from('crm_stages').delete().eq('id',s.id);if(error){setNotice(error.message);return}await updated()};
 const matches=(...parts:(string|null|undefined)[])=>parts.some(v=>(v||'').toLowerCase().includes(query.trim().toLowerCase()));
 const visibleDeals=deals.filter(d=>d.status===status&&matches(d.title,org(d.organization_id)?.name,person(d.person_id)?.name,d.label)).sort((a,b)=>status==='open'?0:new Date((status==='won'?b.won_at:b.lost_at)||0).getTime()-new Date((status==='won'?a.won_at:a.lost_at)||0).getTime());
 const contactList=(contactKind==='organizations'?organizations:people).filter(c=>matches(c.name,c.email,c.phone));
 const activityList=activities.filter(a=>{
  if(!matches(a.title,a.description,deal(a.deal_id)?.title,org(a.organization_id)?.name,person(a.person_id)?.name))return false;
  const due=new Date(a.due_at).getTime(),now=Date.now();
  if(activityFilter==='pending')return !a.done;if(activityFilter==='today')return !a.done&&isToday(a.due_at);if(activityFilter==='overdue')return isLate(a);if(activityFilter==='week')return !a.done&&due>=now&&due<=now+7*86400000;if(activityFilter==='done')return a.done;return true;
 }).sort((a,b)=>Number(a.done)-Number(b.done)||a.due_at.localeCompare(b.due_at));
 const overdue=activities.filter(isLate).length,openDeals=deals.filter(d=>d.status==='open'),wonDeals=deals.filter(d=>d.status==='won');
 const selectedOrg=contactDetail?.kind==='organizations'?org(contactDetail.id):undefined,selectedPerson=contactDetail?.kind==='people'?person(contactDetail.id):undefined;
 const relatedDeals=deals.filter(d=>selectedOrg?d.organization_id===selectedOrg.id:selectedPerson?d.person_id===selectedPerson.id:false);
 const relatedActivities=activities.filter(a=>selectedOrg?(a.organization_id===selectedOrg.id||relatedDeals.some(d=>d.id===a.deal_id)):(selectedPerson?(a.person_id===selectedPerson.id||relatedDeals.some(d=>d.id===a.deal_id)):false));
 const week=useMemo(()=>{const start=new Date(calendarDate);start.setDate(start.getDate()-(start.getDay()+6)%7);start.setHours(12,0,0,0);return Array.from({length:7},(_,i)=>{const d=new Date(start);d.setDate(d.getDate()+i);return d})},[calendarDate]);
 const sectionTitle=view==='Comercial'?'Funil comercial':view==='Clientes'?'Clientes e contatos':'Central de atividades';
 return <div className="crm-root">
  <div className="crm-head"><div><span className="crm-eyebrow">LIDERAPP / CRM</span><h1>{sectionTitle}</h1><p>{view==='Comercial'?'Acompanhe oportunidades, avance negociações e feche vendas.':view==='Clientes'?'Pessoas, empresas e histórico de relacionamento.':'Todas as ligações, reuniões e tarefas em uma única agenda.'}</p></div>
   <div className="crm-head-actions"><button className="crm-icon-button" title="Atualizar informações" onClick={()=>void reload()}><RefreshCw size={18}/></button>{view==='Comercial'?<><button className="crm-button secondary" onClick={()=>setStageModal(true)}><Settings2 size={17}/> Etapas</button><button className="crm-button primary" onClick={()=>createDeal()}><Plus size={18}/> Novo negócio</button></>:view==='Clientes'?<><button className="crm-button secondary" onClick={()=>newContact('people')}><Plus size={17}/> Pessoa</button><button className="crm-button primary" onClick={()=>newContact('organizations')}><Plus size={18}/> Empresa</button></>:<button className="crm-button primary" onClick={()=>newActivity()}><Plus size={18}/> Nova atividade</button>}</div>
  </div>
  {notice&&<div role="status" className="crm-notice"><span>{notice}</span><button onClick={()=>setNotice('')} aria-label="Fechar aviso"><X size={17}/></button></div>}
  {loading?<div className="crm-loading"><RefreshCw size={22}/> Carregando CRM...</div>:view==='Comercial'?<>
   <div className="crm-kpis"><div><small>Negócios em aberto</small><strong>{openDeals.length}</strong></div><div><small>Valor de implantação no funil</small><strong>{currency(openDeals.reduce((n,d)=>n+Number(d.setup_value),0))}</strong></div><div><small>Negócios ganhos</small><strong>{wonDeals.length}</strong></div><div><small>Atividades atrasadas</small><strong className={overdue?'text-danger':''}>{overdue}</strong></div></div>
   <div className="crm-toolbar"><div className="crm-pills">{(['open','won','lost'] as DealStatus[]).map(s=><button key={s} className={status===s?'active':''} onClick={()=>setStatus(s)}>{s==='open'?'Em aberto':s==='won'?'Ganhos':'Perdidos'} <span>{deals.filter(d=>d.status===s).length}</span></button>)}</div><div className="crm-search"><Search size={17}/><input placeholder="Buscar negócios ou contatos..." value={query} onChange={e=>setQuery(e.target.value)}/></div></div>
   {status==='open'?<><div className="crm-board-scroll"><div className="crm-board">{stages.map(s=>{
    const cards=visibleDeals.filter(d=>d.stage_id===s.id).sort((a,b)=>{const x=nextActivity(a.id),y=nextActivity(b.id);return x&&!y?-1:!x&&y?1:x&&y?x.due_at.localeCompare(y.due_at):a.position-b.position});
    return <div key={s.id} className={'crm-column '+(dragOver===s.id?'dragover':'')} onDragOver={e=>{e.preventDefault();setDragOver(s.id)}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setDragOver('')}} onDrop={e=>void onDropStage(e,s.id)}>
      <div className="crm-column-head"><div><i style={{background:s.color}}/><b>{s.name}</b><span>{cards.length}</span></div><p>{currency(cards.reduce((v,d)=>v+Number(d.setup_value),0))} <small>· {s.probability}%</small></p></div>
      <div className="crm-column-cards">{cards.map(d=>{const a=nextActivity(d.id);return <article key={d.id} draggable onDragStart={e=>{e.dataTransfer.setData('text/plain',d.id);e.dataTransfer.effectAllowed='move';setDragId(d.id)}} onDragEnd={()=>{setDragId('');setDragOver('')}} onClick={()=>openDeal(d)} onKeyDown={e=>{if(e.key==='Enter')openDeal(d)}} role="button" tabIndex={0} className={'crm-deal '+(dragId===d.id?'moving':'')}>
       <div className="crm-deal-tools"><GripVertical size={15}/>{d.label&&<span>{d.label}</span>}<button onClick={e=>{e.stopPropagation();newActivity({deal:d})}} title="Agendar atividade"><Plus size={17}/></button></div>
       <h3>{d.title}</h3><p className="crm-deal-contact"><Building2 size={14}/>{who(d)}</p>
       <div className="crm-deal-values"><b>{currency(Number(d.setup_value))}</b><small>{Number(d.monthly_value)>0?'+'+currency(Number(d.monthly_value))+'/mês':'Sem recorrência'}</small></div>
       <div className="crm-deal-activity">{a?<span className={isLate(a)?'late':isToday(a.due_at)?'today':''}><ActivityTypeIcon type={a.type}/>{isLate(a)?'Atrasada · ':''}{dateFmt(a.due_at,{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</span>:<span><Calendar size={15}/> Sem atividade</span>}<ChevronRight size={17}/></div>
      </article>})}{!cards.length&&<div className="crm-column-empty">Arraste negócios para esta etapa</div>}<button className="crm-column-add" onClick={()=>createDeal(s.id)}><Plus size={17}/> Adicionar negócio</button></div>
    </div>})}</div></div>
    {dragId&&<div className="crm-drop-results"><div className="won" onDragOver={e=>e.preventDefault()} onDrop={e=>void onDropStatus(e,'won')}><CheckCircle2 size={18}/> Solte para marcar como GANHO</div><div className="lost" onDragOver={e=>e.preventDefault()} onDrop={e=>void onDropStatus(e,'lost')}><XCircle size={18}/> Solte para marcar como PERDIDO</div></div>}
   </>:visibleDeals.length?<div className="crm-archive">{visibleDeals.map(d=><button key={d.id} onClick={()=>openDeal(d)}><div><Tag variant={status==='won'?'green':'red'}>{status==='won'?'Ganho':'Perdido'}</Tag><h3>{d.title}</h3><p>{who(d)}</p></div><div><b>{currency(Number(d.setup_value))}</b><small>{dateFmt(status==='won'?d.won_at:d.lost_at,{day:'2-digit',month:'short',year:'numeric'})}</small></div></button>)}</div>:<Empty icon={<Target size={30}/>} title="Nenhuma negociação encontrada" subtitle={query?'Tente pesquisar por outro termo.':'Negócios finalizados aparecerão aqui.'}/>}
   <p className="crm-footnote">Arraste os negócios entre as etapas. Clique no card para registrar atividades, marcar como ganho/perdido e atualizar as métricas.</p>
  </>:view==='Clientes'?<>
   <div className="crm-toolbar"><div className="crm-pills"><button className={contactKind==='organizations'?'active':''} onClick={()=>setContactKind('organizations')}><Building2 size={16}/> Empresas <span>{organizations.length}</span></button><button className={contactKind==='people'?'active':''} onClick={()=>setContactKind('people')}><UserRound size={16}/> Pessoas <span>{people.length}</span></button></div><div className="crm-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar nome, telefone ou e-mail..."/></div></div>
   {contactList.length?<div className="crm-table-box"><table className="crm-table"><thead><tr><th>{contactKind==='organizations'?'Empresa':'Nome'}</th><th>{contactKind==='organizations'?'Segmento':'Empresa'}</th><th>E-mail</th><th>Telefone</th><th>Negócios</th><th/></tr></thead><tbody>{contactList.map(c=>{const related=deals.filter(d=>contactKind==='organizations'?d.organization_id===c.id:d.person_id===c.id);return <tr key={c.id} tabIndex={0} onClick={()=>setContactDetail({kind:contactKind,id:c.id})} onKeyDown={e=>{if(e.key==='Enter')setContactDetail({kind:contactKind,id:c.id})}}><td><div className="crm-contact-name"><i>{c.name.charAt(0).toUpperCase()}</i><b>{c.name}</b>{related.some(d=>d.status==='won')&&<Tag variant="green">Cliente</Tag>}</div></td><td>{contactKind==='organizations'?(c as CRMOrganization).industry||'—':org((c as CRMPerson).organization_id)?.name||'—'}</td><td>{c.email||'—'}</td><td>{c.phone||'—'}</td><td>{related.length}</td><td><ChevronRight size={17}/></td></tr>})}</tbody></table></div>:<Empty icon={<Users size={30}/>} title={query?'Nenhum contato encontrado':'Sua carteira começa aqui'} subtitle="Cadastre empresas e pessoas e vincule-as aos seus negócios." action={contactKind==='organizations'?'Nova empresa':'Nova pessoa'} onAction={()=>newContact(contactKind)}/>}
  </>:<>
   <div className="crm-kpis"><div><small>Pendentes</small><strong>{activities.filter(a=>!a.done).length}</strong></div><div><small>Para hoje</small><strong>{activities.filter(a=>!a.done&&isToday(a.due_at)).length}</strong></div><div><small>Atrasadas</small><strong className={overdue?'text-danger':''}>{overdue}</strong></div><div><small>Concluídas</small><strong>{activities.filter(a=>a.done).length}</strong></div></div>
   <div className="crm-toolbar"><div className="crm-pills"><button className={!calendarMode?'active':''} onClick={()=>setCalendarMode(false)}><List size={16}/> Lista</button><button className={calendarMode?'active':''} onClick={()=>setCalendarMode(true)}><CalendarDays size={16}/> Semana</button></div><div className="crm-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar todas as atividades..."/></div></div>
   <div className="crm-activity-filters">{([{v:'pending',t:'Pendentes'},{v:'today',t:'Hoje'},{v:'overdue',t:'Atrasadas'},{v:'week',t:'Próximos 7 dias'},{v:'done',t:'Concluídas'},{v:'all',t:'Todas'}] as {v:ActivityFilter;t:string}[]).map(x=><button key={x.v} onClick={()=>setActivityFilter(x.v)} className={activityFilter===x.v?'active':''}>{x.t}</button>)}</div>
   {!calendarMode?activityList.length?<div className="crm-table-box"><table className="crm-table"><thead><tr><th>Feita</th><th>Atividade</th><th>Data</th><th>Vínculo</th><th>Situação</th><th/></tr></thead><tbody>{activityList.map(a=><tr key={a.id}><td><button className={'crm-checkbox '+(a.done?'checked':'')} onClick={()=>void toggleActivity(a)} title={a.done?'Reabrir':'Concluir'}>{a.done&&<Check size={15}/>}</button></td><td className="clickable" onClick={()=>editActivity(a)}><div className="crm-activity-title"><span><ActivityTypeIcon type={a.type}/></span><div><b className={a.done?'struck':''}>{a.title}</b><small>{labelType(a.type)}</small></div></div></td><td>{dateFmt(a.due_at,{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</td><td>{deal(a.deal_id)?.title||org(a.organization_id)?.name||person(a.person_id)?.name||'Sem vínculo'}</td><td><Tag variant={a.done?'green':isLate(a)?'red':isToday(a.due_at)?'amber':'purple'}>{a.done?'Concluída':isLate(a)?'Atrasada':isToday(a.due_at)?'Hoje':'Agendada'}</Tag></td><td><button className="crm-icon-button" onClick={()=>editActivity(a)}><Edit3 size={17}/></button></td></tr>)}</tbody></table></div>:<Empty icon={<CalendarDays size={29}/>} title="Nenhuma atividade" subtitle="Agende tarefas e compromissos para acompanhar seus próximos passos." action="Nova atividade" onAction={()=>newActivity()}/>:
    <div className="crm-calendar"><header><b>Agenda da semana</b><div><button onClick={()=>setCalendarDate(new Date())}>Hoje</button><button onClick={()=>setCalendarDate(new Date(calendarDate.getFullYear(),calendarDate.getMonth(),calendarDate.getDate()-7))}><ChevronLeft size={18}/></button><span>{dateFmt(week[0].toISOString(),{day:'2-digit',month:'short'})} – {dateFmt(week[6].toISOString(),{day:'2-digit',month:'short',year:'numeric'})}</span><button onClick={()=>setCalendarDate(new Date(calendarDate.getFullYear(),calendarDate.getMonth(),calendarDate.getDate()+7))}><ChevronRight size={18}/></button></div></header><div className="crm-week">{week.map(day=><div key={weekDate(day)} className={weekDate(day)===weekDate(new Date())?'current':''}><header><span>{day.toLocaleDateString('pt-BR',{weekday:'short'})}</span><b>{day.getDate()}</b></header>{activityList.filter(a=>weekDate(new Date(a.due_at))===weekDate(day)).map(a=><button key={a.id} onClick={()=>editActivity(a)} className={'crm-calendar-event '+(a.done?'done':'')}><small>{dateFmt(a.due_at,{hour:'2-digit',minute:'2-digit'})}</small><b>{a.title}</b><span>{labelType(a.type)}</span></button>)}</div>)}</div></div>}
  </>}
  {dealOpen&&<Drawer title={editingDeal?'Detalhes do negócio':'Novo negócio'} subtitle={editingDeal?who(editingDeal):'Crie sua próxima oportunidade'} onClose={()=>setDealOpen(false)}>
    {editingDeal&&<div className="crm-detail-meta"><Tag variant={editingDeal.status==='won'?'green':editingDeal.status==='lost'?'red':'purple'}>{editingDeal.status==='won'?'Ganho':editingDeal.status==='lost'?'Perdido':'Em aberto'}</Tag><span>Criado {dateFmt(editingDeal.created_at,{day:'2-digit',month:'short',year:'numeric'})}</span></div>}
    <form onSubmit={saveDeal} className="crm-form"><h3>Informações comerciais</h3><div className="crm-form-grid">
     <Field full name="Nome do negócio"><input required maxLength={180} value={dealForm.title} onChange={e=>setDealForm({...dealForm,title:e.target.value})} placeholder="Ex.: Implantação comercial — Empresa"/></Field>
     <Field name="Etapa"><select value={dealForm.stage_id} required onChange={e=>setDealForm({...dealForm,stage_id:e.target.value})}><option value="">Selecionar...</option>{stages.map(s=><option key={s.id} value={s.id}>{s.name} ({s.probability}%)</option>)}</select></Field>
     <Field name="Fechamento previsto"><input type="date" value={dealForm.expected_close} onChange={e=>setDealForm({...dealForm,expected_close:e.target.value})}/></Field>
     <Field name="Implantação (R$)"><input type="number" min={0} step="0.01" placeholder="0" value={dealForm.setup_value} onChange={e=>setDealForm({...dealForm,setup_value:e.target.value})}/></Field>
     <Field name="Mensalidade (R$)"><input type="number" min={0} step="0.01" placeholder="0" value={dealForm.monthly_value} onChange={e=>setDealForm({...dealForm,monthly_value:e.target.value})}/></Field>
     <Field name="Empresa"><select value={dealForm.organization_id} onChange={e=>setDealForm({...dealForm,organization_id:e.target.value,person_id:person(dealForm.person_id)?.organization_id===e.target.value?dealForm.person_id:''})}><option value="">Sem empresa</option>{organizations.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><button type="button" className="crm-text-button" onClick={()=>newContact('organizations')}><Plus size={14}/> Nova empresa</button></Field>
     <Field name="Pessoa"><select value={dealForm.person_id} onChange={e=>{const p=person(e.target.value);setDealForm({...dealForm,person_id:e.target.value,organization_id:p?.organization_id||dealForm.organization_id})}}><option value="">Sem pessoa</option>{people.filter(p=>!dealForm.organization_id||!p.organization_id||p.organization_id===dealForm.organization_id).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select><button type="button" className="crm-text-button" onClick={()=>newContact('people')}><Plus size={14}/> Nova pessoa</button></Field>
     <Field name="Etiqueta"><input value={dealForm.label} onChange={e=>setDealForm({...dealForm,label:e.target.value})} placeholder="Ex.: Prospecção"/></Field>
     <Field full name="Observações"><textarea rows={4} value={dealForm.notes} onChange={e=>setDealForm({...dealForm,notes:e.target.value})} placeholder="Necessidades, objeções e próximos passos..."/></Field>
    </div><div className="crm-form-actions"><button type="submit" className="crm-button primary" disabled={busy}><Check size={17}/>{editingDeal?'Salvar negócio':'Criar negócio'}</button></div></form>
    {editingDeal&&<><div className="crm-result-actions">{editingDeal.status==='open'?<><button className="crm-button success" onClick={()=>void changeStatus(editingDeal,'won')}><CheckCircle2 size={17}/> Ganho</button><button className="crm-button danger" onClick={()=>{setLostDeal(editingDeal);setLostReason('')}}><XCircle size={17}/> Perdido</button></>:<button className="crm-button secondary" onClick={()=>void changeStatus(editingDeal,'open')}><RefreshCw size={17}/> Reabrir</button>}<button className="crm-icon-button destructive" onClick={()=>void deleteDeal(editingDeal)}><Trash2 size={18}/></button></div>
     <section className="crm-detail-section"><header><h3><CalendarDays size={18}/> Atividades ({linkedActivity(editingDeal.id).length})</h3><button className="crm-button primary small" onClick={()=>newActivity({deal:editingDeal})}><Plus size={16}/> Nova atividade</button></header>{linkedActivity(editingDeal.id).length?linkedActivity(editingDeal.id).map(a=><div className="crm-linked" key={a.id}><button className={'crm-checkbox '+(a.done?'checked':'')} onClick={()=>void toggleActivity(a)}>{a.done&&<Check size={13}/>}</button><button onClick={()=>editActivity(a)}><b className={a.done?'struck':''}>{a.title}</b><span><ActivityTypeIcon type={a.type}/>{labelType(a.type)} · {dateFmt(a.due_at,{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</span></button><ChevronRight size={16}/></div>):<p className="crm-mini-empty">Nenhuma atividade cadastrada para este negócio.</p>}</section>
     <section className="crm-detail-section"><header><h3><History size={18}/> Histórico</h3></header>{events.filter(x=>x.deal_id===editingDeal.id).length?events.filter(x=>x.deal_id===editingDeal.id).map(x=><div className="crm-event" key={x.id}><i/><div><b>{x.detail||x.kind}</b><small>{dateFmt(x.created_at,{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</small></div></div>):<p className="crm-mini-empty">As movimentações aparecerão aqui.</p>}</section>
    </>}
   </Drawer>}
  {contactModal&&<Modal title={contactModal==='organizations'?(contactEditId?'Editar empresa':'Nova empresa'):(contactEditId?'Editar pessoa':'Nova pessoa')} subtitle="Dados vinculados aos negócios e atividades" onClose={()=>setContactModal(null)}><form onSubmit={saveContact} className="crm-form"><div className="crm-form-grid">{contactModal==='organizations'?<>
    <Field full name="Nome da empresa"><input required value={orgForm.name} onChange={e=>setOrgForm({...orgForm,name:e.target.value})}/></Field>
    <Field name="E-mail"><input type="email" value={orgForm.email} onChange={e=>setOrgForm({...orgForm,email:e.target.value})}/></Field>
    <Field name="Telefone / WhatsApp"><input value={orgForm.phone} onChange={e=>setOrgForm({...orgForm,phone:e.target.value})}/></Field>
    <Field name="Site"><input value={orgForm.website} onChange={e=>setOrgForm({...orgForm,website:e.target.value})}/></Field>
    <Field name="Segmento"><input value={orgForm.industry} onChange={e=>setOrgForm({...orgForm,industry:e.target.value})}/></Field>
    <Field full name="Notas"><textarea rows={4} value={orgForm.notes} onChange={e=>setOrgForm({...orgForm,notes:e.target.value})}/></Field>
   </>:<>
    <Field full name="Nome"><input required value={personForm.name} onChange={e=>setPersonForm({...personForm,name:e.target.value})}/></Field>
    <Field name="E-mail"><input type="email" value={personForm.email} onChange={e=>setPersonForm({...personForm,email:e.target.value})}/></Field>
    <Field name="Telefone / WhatsApp"><input value={personForm.phone} onChange={e=>setPersonForm({...personForm,phone:e.target.value})}/></Field>
    <Field name="Cargo"><input value={personForm.role} onChange={e=>setPersonForm({...personForm,role:e.target.value})}/></Field>
    <Field full name="Empresa"><select value={personForm.organization_id} onChange={e=>setPersonForm({...personForm,organization_id:e.target.value})}><option value="">Sem empresa</option>{organizations.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>
    <Field full name="Notas"><textarea rows={4} value={personForm.notes} onChange={e=>setPersonForm({...personForm,notes:e.target.value})}/></Field>
   </>}</div><div className="crm-form-actions"><button className="crm-button primary" disabled={busy} type="submit"><Check size={17}/> Salvar contato</button></div></form></Modal>}
  {contactDetail&&(selectedOrg||selectedPerson)&&<Drawer title={selectedOrg?.name||selectedPerson?.name||'Contato'} subtitle={selectedOrg?'Empresa':'Pessoa'} onClose={()=>setContactDetail(null)}>
   <div className="crm-contact-detail"><div className="crm-big-avatar">{(selectedOrg?.name||selectedPerson?.name||'?')[0]}</div><div><h3>{selectedOrg?.name||selectedPerson?.name}</h3><p>{selectedOrg?.industry||selectedPerson?.role||'Contato'}</p></div></div>
   <div className="crm-info-list">{(selectedOrg?.email||selectedPerson?.email)&&<p><Mail size={17}/>{selectedOrg?.email||selectedPerson?.email}</p>}{(selectedOrg?.phone||selectedPerson?.phone)&&<p><Phone size={17}/>{selectedOrg?.phone||selectedPerson?.phone}</p>}{selectedPerson?.organization_id&&<p><Building2 size={17}/>{org(selectedPerson.organization_id)?.name}</p>}{selectedOrg?.website&&<p><Building2 size={17}/>{selectedOrg.website}</p>}</div>
   <div className="crm-result-actions"><button className="crm-button secondary" onClick={()=>contactDetail&&editContact(contactDetail.kind,contactDetail.id)}><Edit3 size={17}/> Editar</button><button className="crm-button primary" onClick={()=>newActivity(selectedOrg?{org:selectedOrg}:{person:selectedPerson})}><Plus size={17}/> Atividade</button><button className="crm-icon-button destructive" onClick={()=>void deleteContact()}><Trash2 size={17}/></button></div>
   {selectedOrg&&<section className="crm-detail-section"><header><h3><Users size={17}/> Pessoas</h3><button className="crm-text-button" onClick={()=>{newContact('people');setPersonForm({...emptyPerson,organization_id:selectedOrg.id})}}><Plus size={15}/> Adicionar</button></header>{people.filter(p=>p.organization_id===selectedOrg.id).map(p=><button className="crm-detail-link" key={p.id} onClick={()=>setContactDetail({kind:'people',id:p.id})}><UserRound size={16}/><span>{p.name}<small>{p.role||p.email||''}</small></span><ChevronRight size={16}/></button>)}</section>}
   <section className="crm-detail-section"><header><h3><Target size={17}/> Negócios ({relatedDeals.length})</h3></header>{relatedDeals.length?relatedDeals.map(d=><button className="crm-detail-link" key={d.id} onClick={()=>{setContactDetail(null);openDeal(d)}}><CircleDollarSign size={18}/><span>{d.title}<small>{currency(Number(d.setup_value))} · {d.status==='won'?'Ganho':d.status==='lost'?'Perdido':'Aberto'}</small></span><ChevronRight size={16}/></button>):<p className="crm-mini-empty">Nenhum negócio vinculado.</p>}</section>
   <section className="crm-detail-section"><header><h3><CalendarDays size={17}/> Atividades ({relatedActivities.length})</h3></header>{relatedActivities.length?relatedActivities.map(a=><button className="crm-detail-link" key={a.id} onClick={()=>editActivity(a)}><ActivityTypeIcon type={a.type}/><span>{a.title}<small>{dateFmt(a.due_at,{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</small></span><ChevronRight size={16}/></button>):<p className="crm-mini-empty">Sem atividades vinculadas.</p>}</section>
   {(selectedOrg?.notes||selectedPerson?.notes)&&<section className="crm-detail-section"><h3>Notas</h3><p>{selectedOrg?.notes||selectedPerson?.notes}</p></section>}
  </Drawer>}
  {activityModal&&<Modal title={editingActivity?'Editar atividade':'Nova atividade'} subtitle="Associe ao negócio ou contato e programe o próximo passo" onClose={()=>setActivityModal(false)}><form onSubmit={saveActivity} className="crm-form"><div className="crm-form-grid">
    <Field full name="Nome da atividade"><input required value={activityForm.title} onChange={e=>setActivityForm({...activityForm,title:e.target.value})} placeholder="Ex.: Ligar para confirmar proposta"/></Field>
    <Field name="Tipo"><select value={activityForm.type} onChange={e=>setActivityForm({...activityForm,type:e.target.value as ActivityType})}>{types.map(t=><option key={t.key} value={t.key}>{t.label}</option>)}</select></Field>
    <Field name="Data e hora"><input required type="datetime-local" value={activityForm.due_at} onChange={e=>setActivityForm({...activityForm,due_at:e.target.value})}/></Field>
    <Field name="Duração (minutos)"><input type="number" min={0} max={1440} value={activityForm.duration_minutes} onChange={e=>setActivityForm({...activityForm,duration_minutes:e.target.value})}/></Field>
    <Field name="Negócio"><select value={activityForm.deal_id} onChange={e=>{const d=deal(e.target.value);setActivityForm({...activityForm,deal_id:e.target.value,person_id:d?.person_id||activityForm.person_id,organization_id:d?.organization_id||activityForm.organization_id})}}><option value="">Sem negócio</option>{deals.map(d=><option value={d.id} key={d.id}>{d.title}</option>)}</select></Field>
    <Field name="Empresa"><select value={activityForm.organization_id} onChange={e=>setActivityForm({...activityForm,organization_id:e.target.value})}><option value="">Sem empresa</option>{organizations.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>
    <Field name="Pessoa"><select value={activityForm.person_id} onChange={e=>setActivityForm({...activityForm,person_id:e.target.value})}><option value="">Sem pessoa</option>{people.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
    <Field full name="Descrição"><textarea rows={4} value={activityForm.description} onChange={e=>setActivityForm({...activityForm,description:e.target.value})} placeholder="Pauta, objetivo, anotações..."/></Field>
   </div><div className="crm-form-actions">{editingActivity&&<button type="button" className="crm-button danger-outline" onClick={()=>void deleteActivity(editingActivity)}><Trash2 size={16}/> Excluir</button>}<button className="crm-button primary" disabled={busy} type="submit"><Check size={16}/> Salvar atividade</button></div></form></Modal>}
  {stageModal&&<Modal title="Etapas do funil" subtitle="Crie etapas e personalize probabilidades" onClose={()=>setStageModal(false)}><div className="crm-stage-list">{stages.map(s=><div className="crm-stage-row" key={s.id}><i style={{background:s.color}}/><b>{s.name}</b><small>{s.probability}%</small><button className="crm-icon-button" onClick={()=>{setStageEdit(s);setStageTitle(s.name);setStageProbability(s.probability)}} title="Editar etapa"><Edit3 size={16}/></button><button className="crm-icon-button destructive" onClick={()=>void deleteStage(s)} title="Excluir etapa vazia"><Trash2 size={16}/></button></div>)}</div><form className="crm-form" onSubmit={saveStage}><h3>{stageEdit?'Editar etapa':'Adicionar etapa'}</h3><div className="crm-form-grid"><Field name="Nome"><input required maxLength={80} value={stageTitle} onChange={e=>setStageTitle(e.target.value)}/></Field><Field name="Probabilidade (%)"><input type="number" min={0} max={100} value={stageProbability} onChange={e=>setStageProbability(Number(e.target.value))}/></Field></div><div className="crm-form-actions">{stageEdit&&<button className="crm-button secondary" type="button" onClick={()=>{setStageEdit(null);setStageTitle('');setStageProbability(50)}}>Cancelar edição</button>}<button className="crm-button primary" disabled={busy} type="submit">{stageEdit?'Salvar':'Adicionar'}</button></div></form></Modal>}
  {lostDeal&&<Modal title="Marcar como perdido" subtitle={lostDeal.title} onClose={()=>setLostDeal(null)}><Field name="Motivo da perda"><textarea rows={4} value={lostReason} onChange={e=>setLostReason(e.target.value)} placeholder="Orçamento, concorrente, momento..."/></Field><div className="crm-form-actions"><button className="crm-button secondary" onClick={()=>setLostDeal(null)}>Cancelar</button><button className="crm-button danger" disabled={busy} onClick={()=>void changeStatus(lostDeal,'lost',lostReason)}><XCircle size={16}/> Confirmar perda</button></div></Modal>}
 </div>
}
