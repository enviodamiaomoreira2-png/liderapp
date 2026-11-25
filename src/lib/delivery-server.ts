
import {createClient,type SupabaseClient,type User} from '@supabase/supabase-js';
import {NextRequest,NextResponse} from 'next/server';
export class ApiError extends Error{constructor(public status:number,message:string){super(message)}}
export async function authorized(req:NextRequest):Promise<{db:SupabaseClient;user:User}>{
 const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'').trim();
 if(!token)throw new ApiError(401,'Faça login para continuar.');
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)throw new ApiError(503,'Supabase não está configurado.');
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:'Bearer '+token}}});
 const {data,error}=await db.auth.getUser(token);
 if(error||!data.user)throw new ApiError(401,'Sua sessão expirou. Entre novamente.');
 return{db,user:data.user};
}
export const config=()=>({
 github:!!process.env.DELIVERY_GITHUB_TOKEN,
 vercel:!!process.env.DELIVERY_VERCEL_TOKEN,
 team:!!process.env.DELIVERY_VERCEL_TEAM_ID,
 admin:!!process.env.DELIVERY_ADMIN_EMAIL
});
export function requiredKeys(){
 const c=config();
 return Object.entries({DELIVERY_GITHUB_TOKEN:c.github,DELIVERY_VERCEL_TOKEN:c.vercel,DELIVERY_VERCEL_TEAM_ID:c.team,DELIVERY_ADMIN_EMAIL:c.admin}).filter(([,v])=>!v).map(([k])=>k);
}
export function responseError(err:unknown){
 const status=err instanceof ApiError?err.status:500;
 const message=err instanceof Error?err.message:'Não foi possível concluir a operação.';
 return NextResponse.json({error:message},{status});
}
export const ghHeaders=()=>({Authorization:'Bearer '+process.env.DELIVERY_GITHUB_TOKEN,'Content-Type':'application/json',Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'});
export const vercelHeaders=()=>({Authorization:'Bearer '+process.env.DELIVERY_VERCEL_TOKEN,'Content-Type':'application/json'});
export const teamQuery=()=>process.env.DELIVERY_VERCEL_TEAM_ID?'?teamId='+encodeURIComponent(process.env.DELIVERY_VERCEL_TEAM_ID):'';
export async function jsonResult(resp:Response,service:string){
 const value=await resp.json().catch(()=>({}));
 if(!resp.ok){
  const message=typeof value?.error?.message==='string'?value.error.message:typeof value?.message==='string'?value.message:service+' retornou erro '+resp.status;
  throw new ApiError(resp.status===401||resp.status===403?503:502,service+': '+message);
 }
 return value;
}
export async function siteForOwner(db:SupabaseClient,userId:string,siteId:string){
 if(!/^[0-9a-f-]{36}$/i.test(siteId))throw new ApiError(400,'Identificador do site inválido.');
 const {data,error}=await db.from('delivery_sites').select('*').eq('id',siteId).eq('user_id',userId).maybeSingle();
 if(error)throw new ApiError(500,error.message);
 if(!data)throw new ApiError(404,'Projeto não encontrado.');
 return data;
}
export const validDomain=(value:string)=>/^(?=.{4,250}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/.test(value);
