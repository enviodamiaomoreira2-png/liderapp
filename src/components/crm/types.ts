export type CRMView='Comercial'|'Clientes'|'Atividades';
export type DealStatus='open'|'won'|'lost';
export type ActivityType='call'|'meeting'|'task'|'email'|'followup'|'deadline'|'other';
export type CRMStage={id:string;user_id:string;name:string;position:number;probability:number;color:string};
export type CRMOrganization={id:string;user_id:string;name:string;email:string|null;phone:string|null;website:string|null;industry:string|null;notes:string|null;created_at:string};
export type CRMPerson={id:string;user_id:string;organization_id:string|null;name:string;email:string|null;phone:string|null;role:string|null;notes:string|null;created_at:string};
export type CRMDeal={id:string;user_id:string;title:string;stage_id:string;organization_id:string|null;person_id:string|null;setup_value:number;monthly_value:number;status:DealStatus;won_at:string|null;lost_at:string|null;lost_reason:string|null;meeting_scheduled_at:string|null;meeting_held_at:string|null;expected_close:string|null;label:string|null;notes:string|null;position:number;created_at:string;updated_at:string};
export type CRMActivity={id:string;user_id:string;title:string;type:ActivityType;description:string|null;due_at:string;duration_minutes:number;done:boolean;done_at:string|null;deal_id:string|null;person_id:string|null;organization_id:string|null;created_at:string};
export type CRMDealEvent={id:string;user_id:string;deal_id:string;kind:string;detail:string|null;created_at:string};
export type CRMRecurringPayment={id:string;user_id:string;deal_id:string;reference_month:string;paid_at:string;amount:number;notes:string|null;created_at:string};
export const types:{key:ActivityType;label:string;icon:string}[]=[
 {key:'call',label:'Ligação',icon:'phone'},
 {key:'meeting',label:'Reunião',icon:'users'},
 {key:'task',label:'Tarefa',icon:'check'},
 {key:'email',label:'E-mail',icon:'mail'},
 {key:'followup',label:'Follow-up',icon:'refresh-cw'},
 {key:'deadline',label:'Prazo',icon:'clock'},
 {key:'other',label:'Outro',icon:'calendar'}
];
export const stageDefaults=[
 {name:'Qualificação',probability:10,color:'#7472e6'},
 {name:'Contato feito',probability:25,color:'#599de9'},
 {name:'Diagnóstico',probability:45,color:'#6fb6cf'},
 {name:'Proposta enviada',probability:65,color:'#d7a54d'},
 {name:'Negociação',probability:85,color:'#9e77f5'}
];
export const emptyDeal={title:'',stage_id:'',organization_id:'',person_id:'',setup_value:'',monthly_value:'',expected_close:'',label:'',notes:''};
export type DealDraft=typeof emptyDeal;
export const emptyOrg={name:'',email:'',phone:'',website:'',industry:'',notes:''};
export const emptyPerson={name:'',email:'',phone:'',role:'',notes:'',organization_id:''};
export const emptyActivity={title:'',type:'task' as ActivityType,due_at:'',duration_minutes:'30',description:'',deal_id:'',person_id:'',organization_id:''};
export type ActivityDraft=typeof emptyActivity;
export const currency=(amount:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}).format(amount);
export const money=(amount:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2,maximumFractionDigits:2}).format(amount);
export const dateFmt=(value?:string|null,opts:Intl.DateTimeFormatOptions={day:'2-digit',month:'short'})=>value?new Intl.DateTimeFormat('pt-BR',opts).format(new Date(value)): '—';
export const localInput=(iso:string)=>{const d=new Date(iso);if(Number.isNaN(d.getTime()))return '';const pad=(n:number)=>String(n).padStart(2,'0');return [d.getFullYear(),'-',pad(d.getMonth()+1),'-',pad(d.getDate()),'T',pad(d.getHours()),':',pad(d.getMinutes())].join('')};
export const localTomorrow=()=>{const d=new Date();d.setDate(d.getDate()+1);d.setHours(9,0,0,0);return localInput(d.toISOString())};
export const isLate=(a:CRMActivity)=>!a.done&&new Date(a.due_at).getTime()<Date.now();
export const isToday=(v:string)=>new Date(v).toDateString()===new Date().toDateString();

/** Date-only wins are normalized to 12:00 in Sao Paulo so historical month reporting is stable. */
export const dealDay=(iso?:string|null):string=>{
 if(!iso)return '';
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(iso));
 const pick=(name:string)=>parts.find(p=>p.type===name)?.value||'';
 return pick('year')+'-'+pick('month')+'-'+pick('day');
};
export const dayToIso=(day:string):string|null=>day?new Date(day+'T12:00:00-03:00').toISOString():null;
export const currentSaoPauloDay=():string=>dealDay(new Date().toISOString());
