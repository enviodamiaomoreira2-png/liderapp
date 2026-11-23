/** Períodos do painel. Datas civis do Brasil; intervalos [início, fim). */
export type PeriodUnit='day'|'week'|'month'|'year'|'all';
export type PeriodWindow={start:string;end:string;label:string};
const zone='America/Sao_Paulo';
const pad=(n:number)=>String(n).padStart(2,'0');
export const isoDate=(date:Date)=>[date.getFullYear(),pad(date.getMonth()+1),pad(date.getDate())].join('-');
export const dateAt=(day:string)=>new Date(day+'T12:00:00');
const offsetDay=(day:string,delta:number)=>{const d=dateAt(day);d.setDate(d.getDate()+delta);return isoDate(d)};
export const saoPauloDate=(iso=new Date().toISOString())=>{
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(iso));
 const val=(part:string)=>parts.find(p=>p.type===part)?.value||'';
 return val('year')+'-'+val('month')+'-'+val('day');
};
export const monthOf=(day:string)=>day.slice(0,7)+'-01';
const title=(day:string,options:Intl.DateTimeFormatOptions)=>new Intl.DateTimeFormat('pt-BR',{...options,timeZone:'UTC'}).format(new Date(day+'T12:00:00Z'));
export function getPeriod(unit:PeriodUnit,anchor:string):PeriodWindow{
 if(unit==='all')return {start:'0001-01-01',end:'9999-12-31',label:'Todo o período'};
 const dt=dateAt(anchor);
 if(unit==='day')return{start:anchor,end:offsetDay(anchor,1),label:title(anchor,{day:'2-digit',month:'long',year:'numeric'})};
 if(unit==='week'){
  const monday=offsetDay(anchor,-((dt.getDay()+6)%7));
  const end=offsetDay(monday,7);
  return{start:monday,end,label:title(monday,{day:'2-digit',month:'short',year:'numeric'})+' – '+title(offsetDay(end,-1),{day:'2-digit',month:'short',year:'numeric'})};
 }
 if(unit==='month'){
  const month=monthOf(anchor),y=Number(month.slice(0,4)),m=Number(month.slice(5,7));
  return{start:month,end:m===12?(y+1)+'-01-01':y+'-'+pad(m+1)+'-01',label:title(month,{month:'long',year:'numeric'})};
 }
 const year=Number(anchor.slice(0,4));
 return{start:year+'-01-01',end:(year+1)+'-01-01',label:String(year)};
}
export function stepPeriod(unit:PeriodUnit,anchor:string,delta:number){
 if(unit==='all')return anchor;
 if(unit==='day')return offsetDay(anchor,delta);
 if(unit==='week')return offsetDay(anchor,delta*7);
 const d=dateAt(anchor);
 if(unit==='month'){const shifted=new Date(d.getFullYear(),d.getMonth()+delta,Math.min(d.getDate(),28),12);return isoDate(shifted)}
 return isoDate(new Date(d.getFullYear()+delta,d.getMonth(),Math.min(d.getDate(),28),12));
}
/** Parsed at noon -03 so comparisons to PostgreSQL timestamptz are unambiguous. */
export const startTimestamp=(day:string)=>day+'T00:00:00-03:00';
/** Civil date for a timestamp, in America/Sao_Paulo. */
export const localDay=(timestamp:string)=>saoPauloDate(timestamp);
export const localHour=(timestamp:string)=>new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',hourCycle:'h23'}).format(new Date(timestamp));
export const inWindow=(day:string,period:PeriodWindow)=>day>=period.start&&day<period.end;
export type DealMetric={won_at:string;setup_value:number;monthly_value:number};
export type PaidMetric={deal_id:string;reference_month:string;paid_at:string;amount:number};
export type ManualMetric={month:string;contracts_count:number;setup_revenue:number;new_mrr:number;leads_count:number|null;meetings_count:number|null;proposals_count:number|null};
export const num=(v:unknown)=>Number(v)||0;
export function groupTimeline(unit:PeriodUnit,period:PeriodWindow,wins:DealMetric[],manual:ManualMetric[]){
 const slots:{key:string;name:string;receita:number|null;mrr:number;hasData:boolean}[]=[];
 const includedManual=unit==='year'?manual.filter(x=>x.month>=period.start&&x.month<period.end):
    unit==='month'?manual.filter(x=>x.month===period.start):[];
 const baseline=wins.filter(x=>localDay(x.won_at)<period.start).reduce((sum,d)=>sum+num(d.monthly_value),0)
  +manual.filter(x=>x.month<monthOf(period.start)).reduce((sum,d)=>sum+num(d.new_mrr),0);
 let cumulative=baseline;
 if(unit==='all'){
  // Aggregate all registered months; use years only when the history spans more than 24 months.
  const months=Array.from(new Set([
   ...wins.map(d=>monthOf(localDay(d.won_at)).slice(0,7)),
   ...manual.map(x=>x.month.slice(0,7))
  ])).sort();
  if(months.length===0)return slots;
  const first=months[0],last=months[months.length-1];
  const span=(Number(last.slice(0,4))-Number(first.slice(0,4)))*12+Number(last.slice(5,7))-Number(first.slice(5,7))+1;
  const byYear=span>24;
  const buckets:string[]=[];
  if(byYear){
   for(let y=Number(first.slice(0,4));y<=Number(last.slice(0,4));y++)buckets.push(String(y));
  }else{
   for(let y=Number(first.slice(0,4)),m=Number(first.slice(5,7));y<Number(last.slice(0,4))||(y===Number(last.slice(0,4))&&m<=Number(last.slice(5,7)));){
    buckets.push(String(y)+'-'+pad(m));
    if(++m===13){m=1;y++}
   }
  }
  for(const key of buckets){
   const entries=wins.filter(x=>byYear?localDay(x.won_at).startsWith(key):monthOf(localDay(x.won_at)).startsWith(key));
   const extra=manual.filter(x=>x.month.startsWith(key));
   const sumSetup=entries.reduce((v,x)=>v+num(x.setup_value),0)+extra.reduce((v,x)=>v+num(x.setup_revenue),0);
   cumulative+=entries.reduce((v,x)=>v+num(x.monthly_value),0)+extra.reduce((v,x)=>v+num(x.new_mrr),0);
   slots.push({key,name:byYear?key:title(key+'-01',{month:'short',year:'2-digit'}),receita:entries.length||extra.length?sumSetup:null,mrr:cumulative,hasData:entries.length+extra.length>0});
  }
  return slots;
 }
 if(unit==='day'){
  for(let h=0;h<24;h++){
   const hour=pad(h);const entries=wins.filter(x=>localDay(x.won_at)===period.start&&localHour(x.won_at)===hour);
   cumulative+=entries.reduce((s,x)=>s+num(x.monthly_value),0);
   slots.push({key:hour,name:hour+'h',receita:entries.length?entries.reduce((s,x)=>s+num(x.setup_value),0):null,mrr:cumulative,hasData:entries.length>0});
  }
 }else if(unit==='year'){
  for(let m=1;m<=12;m++){
   const key=period.start.slice(0,4)+'-'+pad(m);
   const entries=wins.filter(x=>localDay(x.won_at).startsWith(key));
   const extra=includedManual.filter(x=>x.month.startsWith(key));
   cumulative+=entries.reduce((s,x)=>s+num(x.monthly_value),0)+extra.reduce((s,x)=>s+num(x.new_mrr),0);
   const receita=entries.reduce((s,x)=>s+num(x.setup_value),0)+extra.reduce((s,x)=>s+num(x.setup_revenue),0);
   slots.push({key,name:title(key+'-01',{month:'short'}),receita:entries.length||extra.length?receita:null,mrr:cumulative,hasData:entries.length+extra.length>0});
  }
 }else{
  let day=period.start;
  while(day<period.end){
   const entries=wins.filter(x=>localDay(x.won_at)===day);
   cumulative+=entries.reduce((s,x)=>s+num(x.monthly_value),0);
   slots.push({key:day,name:unit==='week'?title(day,{weekday:'short',day:'2-digit'}):day.slice(8),receita:entries.length?entries.reduce((s,x)=>s+num(x.setup_value),0):null,mrr:cumulative,hasData:entries.length>0});
   day=offsetDay(day,1);
  }
  // Monthly-only figures cannot be allocated to a particular day.
  if(unit==='month'&&includedManual.length){
   const revenue=includedManual.reduce((s,x)=>s+num(x.setup_revenue),0);
   cumulative+=includedManual.reduce((s,x)=>s+num(x.new_mrr),0);
   slots.push({key:'not-dated',name:'Sem dia',receita:revenue,mrr:cumulative,hasData:true});
  }
 }
 return slots;
}
