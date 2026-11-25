
import {NextRequest,NextResponse} from 'next/server';
import {ApiError,authorized,responseError,siteForOwner,teamQuery,vercelHeaders,jsonResult} from '@/lib/delivery-server';
export const runtime='nodejs';
export async function GET(req:NextRequest){
 try{
  const {db,user}=await authorized(req);
  const site=await siteForOwner(db,user.id,req.nextUrl.searchParams.get('siteId')||'');
  if(!site.vercel_project_id)return NextResponse.json({status:site.status,repoUrl:site.github_url||null,vercelUrl:site.vercel_url||null,error:site.last_error||null});
  if(!process.env.DELIVERY_VERCEL_TOKEN)return NextResponse.json({status:'needs_setup',repoUrl:site.github_url||null,error:'Configure DELIVERY_VERCEL_TOKEN na Vercel.'});
  const url='https://api.vercel.com/v6/deployments'+teamQuery()+
    (teamQuery()?'&':'?')+'projectId='+encodeURIComponent(site.vercel_project_id)+'&limit=1';
  const res=await fetch(url,{headers:vercelHeaders(),cache:'no-store'});
  const result=await jsonResult(res,'Vercel (verificar publicação)');
  const d=result?.deployments?.[0];
  if(!d)return NextResponse.json({status:'publishing',repoUrl:site.github_url||null,vercelUrl:null,note:'Projeto criado. Ainda não foi encontrado um deploy na Vercel; verifique a conexão com o GitHub no painel da Vercel.'});
  const state=d.readyState||d.state;
  if(state==='READY'){
   const vercelUrl=d.url?'https://'+String(d.url):null;
   if(vercelUrl)await db.from('delivery_sites').update({status:'published',vercel_url:vercelUrl,last_error:null,updated_at:new Date().toISOString()}).eq('id',site.id).eq('user_id',user.id);
   return NextResponse.json({status:'published',repoUrl:site.github_url,vercelUrl,projectId:site.vercel_project_id});
  }
  if(state==='ERROR'||state==='CANCELED'){
   await db.from('delivery_sites').update({status:'error',last_error:'A publicação na Vercel não concluiu: '+state}).eq('id',site.id).eq('user_id',user.id);
   return NextResponse.json({status:'error',error:'O deploy retornou '+state+'. Verifique os logs na Vercel.',repoUrl:site.github_url,projectId:site.vercel_project_id});
  }
  return NextResponse.json({status:'publishing',repoUrl:site.github_url,projectId:site.vercel_project_id,buildState:state});
 }catch(e){return responseError(e)}
}
