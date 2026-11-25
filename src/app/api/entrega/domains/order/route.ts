
import {NextRequest,NextResponse} from 'next/server';
import {ApiError,authorized,jsonResult,responseError,siteForOwner,teamQuery,vercelHeaders} from '@/lib/delivery-server';
export const runtime='nodejs';
export async function GET(req:NextRequest){
 try{
  const {db,user}=await authorized(req);
  const site=await siteForOwner(db,user.id,req.nextUrl.searchParams.get('siteId')||'');
  if(!site.domain_order_id)return NextResponse.json({status:'none',domain:site.domain||null});
  if(!process.env.DELIVERY_VERCEL_TOKEN)throw new ApiError(412,'Configure a Vercel para consultar a compra.');
  const response=await fetch('https://api.vercel.com/v1/registrar/orders/'+encodeURIComponent(site.domain_order_id)+teamQuery(),
   {headers:vercelHeaders(),cache:'no-store'});
  const order=await jsonResult(response,'Vercel (pedido de domínio)');
  const record=(order.domains||[])[0];
  const domain=String(record?.domainName||'');
  const domainStatus=String(record?.status||order.status||'pending');
  const confirmed=domain&&['completed','registered','success','active'].includes(domainStatus.toLowerCase());
  let attached=false,attachError:string|null=null;
  if(confirmed&&site.vercel_project_id){
   const path='/v10/projects/'+encodeURIComponent(site.vercel_project_id)+'/domains'+teamQuery();
   const attach=await fetch('https://api.vercel.com'+path,{method:'POST',headers:vercelHeaders(),body:JSON.stringify({name:domain}),cache:'no-store'});
   const attachData=await attach.json().catch(()=>({}));
   attached=attach.ok||String(attachData?.error?.code||'').includes('existing')||attach.status===409;
   if(!attached)attachError=String(attachData?.error?.message||'Configure o DNS e conecte o domínio nas configurações do projeto.');
   await db.from('delivery_sites').update({domain,updated_at:new Date().toISOString()}).eq('id',site.id).eq('user_id',user.id);
  }
  return NextResponse.json({status:domainStatus,domain:confirmed?domain:null,orderId:site.domain_order_id,attached,attachError,
   message:confirmed?'Domínio registrado. '+(attached?'Conectado ao projeto; verifique o DNS.':'Verifique a associação com o projeto.'):'Aguardando resultado do registrador. Consulte novamente.'});
 }catch(e){return responseError(e)}
}
