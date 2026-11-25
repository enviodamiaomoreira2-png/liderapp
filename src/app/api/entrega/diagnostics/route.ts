import {NextRequest,NextResponse} from 'next/server';
import {ApiError,authorized,ghHeaders,responseError,vercelHeaders} from '@/lib/delivery-server';

export const runtime='nodejs';
export const maxDuration=30;

type Check={ok:boolean;status:number;message:string};
async function testEndpoint(url:string,headers:Record<string,string>,label:string):Promise<Check>{
 try{
  const res=await fetch(url,{headers,cache:'no-store',signal:AbortSignal.timeout(12000)});
  if(res.ok)return{ok:true,status:res.status,message:'Acesso confirmado.'};
  const j=await res.json().catch(()=>({}));
  const reason=String(j?.message||j?.error?.message||'Resposta HTTP '+res.status).slice(0,220);
  return{ok:false,status:res.status,message:label+': '+reason};
 }catch{
  return{ok:false,status:0,message:label+': não foi possível estabelecer conexão com a API.'};
 }
}
export async function GET(req:NextRequest){
 try{
  const {user}=await authorized(req);
  if(!process.env.DELIVERY_ADMIN_EMAIL||user.email?.toLowerCase()!==process.env.DELIVERY_ADMIN_EMAIL.toLowerCase())
   throw new ApiError(403,'Apenas a conta proprietária pode testar as credenciais de publicação.');
  if(!process.env.DELIVERY_GITHUB_TOKEN||!process.env.DELIVERY_VERCEL_TOKEN||!process.env.DELIVERY_VERCEL_TEAM_ID){
   return NextResponse.json({ok:false,github:{ok:false,status:0,message:!process.env.DELIVERY_GITHUB_TOKEN?'Token ausente':'Não testado'},vercel:{ok:false,status:0,message:!process.env.DELIVERY_VERCEL_TOKEN?'Token ausente':'Configuração de equipe ausente'}});
  }
  const team=process.env.DELIVERY_VERCEL_TEAM_ID;
  const [githubAuth,githubRepos,vercelAuth]=await Promise.all([
   testEndpoint('https://api.github.com/user',ghHeaders(),'GitHub'),
   testEndpoint('https://api.github.com/user/repos?per_page=1&visibility=private',ghHeaders(),'GitHub repositórios'),
   testEndpoint('https://api.vercel.com/v9/projects?limit=1&teamId='+encodeURIComponent(team),vercelHeaders(),'Vercel')
  ]);
  const github={ok:githubAuth.ok&&githubRepos.ok,status:githubAuth.status,message:githubAuth.ok?githubRepos.ok?'Autenticação e acesso a repositórios confirmados.':githubRepos.message:githubAuth.message};
  const vercel={ok:vercelAuth.ok,status:vercelAuth.status,message:vercelAuth.message};
  return NextResponse.json({ok:github.ok&&vercel.ok,github,vercel,checkedAt:new Date().toISOString(),
   note:'A leitura das APIs foi testada. A criação de um repositório e projeto será validada no teste completo, mediante sua confirmação. Nenhuma compra de domínio foi realizada.'});
 }catch(e){return responseError(e)}
}
