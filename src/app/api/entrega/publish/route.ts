
import {NextRequest,NextResponse} from 'next/server';
import {ApiError,authorized,ghHeaders,jsonResult,responseError,siteForOwner,teamQuery,vercelHeaders} from '@/lib/delivery-server';
import {renderClientSite,type SiteBrief,slug} from '@/lib/delivery-site';
export const runtime='nodejs';
export const maxDuration=60;
const gitUrl='https://api.github.com';
const vercelUrl='https://api.vercel.com';
const gh=async(path:string,method='GET',body?:unknown)=>fetch(gitUrl+path,{method,headers:ghHeaders(),body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
const vercel=async(path:string,method='GET',body?:unknown)=>fetch(vercelUrl+path,{method,headers:vercelHeaders(),body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
export async function POST(req:NextRequest){
 let db:Awaited<ReturnType<typeof authorized>>['db']|null=null;
 let userId='',siteId='';
 try{
  const a=await authorized(req);db=a.db;userId=a.user.id;
  if(!process.env.DELIVERY_GITHUB_TOKEN||!process.env.DELIVERY_VERCEL_TOKEN||!process.env.DELIVERY_VERCEL_TEAM_ID||!process.env.DELIVERY_ADMIN_EMAIL)
   throw new ApiError(412,'Configure as credenciais da automação no ambiente seguro da Vercel. O login do ChatGPT não transfere tokens para o aplicativo.');
  if(a.user.email?.toLowerCase()!==process.env.DELIVERY_ADMIN_EMAIL.toLowerCase())
   throw new ApiError(403,'Sua conta não está autorizada a criar recursos externos.');
  const input=await req.json().catch(()=>({}));
  siteId=String(input.siteId||'');
  const site=await siteForOwner(db,userId,siteId);
  if(!site.site_data?.clientName||String(site.site_data.clientName).length>160)throw new ApiError(400,'Preencha as informações básicas do site e salve antes de publicar.');
  if(site.status==='publishing')throw new ApiError(409,'Este site já está sendo publicado. Confira o status antes de repetir.');
  const {data:locked,error:lockError}=await db.from('delivery_sites').update({status:'publishing',last_error:null,updated_at:new Date().toISOString()})
    .eq('id',siteId).eq('user_id',userId).neq('status','publishing').select('id').maybeSingle();
  if(lockError||!locked)throw new ApiError(409,'Publicação já iniciada. Atualize o status do projeto.');
  const content=renderClientSite(site.site_data as SiteBrief);
  const repoName='site-'+slug(site.project_slug||site.client_name).slice(0,35)+'-'+site.id.slice(0,6);
  let repoFull=String(site.github_repo||'');
  let repoUrl=String(site.github_url||'');
  if(!repoFull){
   const response=await gh('/user/repos','POST',{name:repoName,private:true,auto_init:true,description:'Site de '+site.client_name+' criado pelo Liderapp'});
   const repo=await jsonResult(response,'GitHub (criar repositório)');
   repoFull=String(repo.full_name);
   repoUrl=String(repo.html_url);
   if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repoFull))throw new ApiError(502,'O GitHub não confirmou o identificador do repositório.');
   const {error}=await db.from('delivery_sites').update({github_repo:repoFull,github_url:repoUrl}).eq('id',siteId).eq('user_id',userId);
   if(error)throw new ApiError(500,'Repositório criado, mas não foi possível salvar o vínculo: '+error.message);
  }
  const [owner,name]=repoFull.split('/');
  const existingResponse=await gh('/repos/'+encodeURIComponent(owner)+'/'+encodeURIComponent(name)+'/contents/index.html');
  let sha:string|undefined;
  if(existingResponse.status===200){
   const existing=await existingResponse.json();sha=existing.sha;
  }else if(existingResponse.status!==404){await jsonResult(existingResponse,'GitHub (verificar versão anterior)')}
  const put=await gh('/repos/'+encodeURIComponent(owner)+'/'+encodeURIComponent(name)+'/contents/index.html','PUT',
    {message:'build: publicar site de '+site.client_name,content:Buffer.from(content,'utf8').toString('base64'),...(sha?{sha}:{})});
  await jsonResult(put,'GitHub (enviar arquivos)');
  const vercelName=repoName.slice(0,60);
  let projectId=String(site.vercel_project_id||'');
  if(!projectId){
   const newProject=await vercel('/v11/projects'+teamQuery(),'POST',{
    name:vercelName,framework:null,gitRepository:{type:'github',repo:repoFull},rootDirectory:null
   });
   if(newProject.status===409){
    const existing=await vercel('/v9/projects/'+encodeURIComponent(vercelName)+teamQuery());
    const project=await jsonResult(existing,'Vercel (projeto existente)');
    projectId=String(project.id);
   }else{
    const project=await jsonResult(newProject,'Vercel (criar projeto GitHub)');
    projectId=String(project.id);
   }
   if(!projectId)throw new ApiError(502,'A Vercel não confirmou o identificador do projeto.');
   const {error}=await db.from('delivery_sites').update({vercel_project_id:projectId}).eq('id',siteId).eq('user_id',userId);
   if(error)throw new ApiError(500,'Projeto Vercel criado, mas falhou ao salvar o vínculo: '+error.message);
  }
  await db.from('delivery_sites').update({status:'publishing',updated_at:new Date().toISOString(),last_error:null}).eq('id',siteId).eq('user_id',userId);
  return NextResponse.json({ok:true,repoUrl,projectId,status:'publishing',
   note:'Arquivos enviados ao GitHub e projeto conectado à Vercel. Aguarde confirmação do deploy na tela.'});
 }catch(e){
  if(db&&siteId){await db.from('delivery_sites').update({status:'error',last_error:e instanceof Error?e.message:'Falha na publicação',updated_at:new Date().toISOString()}).eq('id',siteId).eq('user_id',userId)}
  return responseError(e);
 }
}
